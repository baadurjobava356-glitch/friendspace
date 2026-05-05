-- =============================================================================
--  Friendspace / Mini-Discord — Fix infinite RLS recursion
-- =============================================================================
--
--  Symptom (from Supabase): "infinite recursion detected in policy for relation
--  'discord_group_members'"
--
--  Cause: policies on `discord_group_members` (and several other tables) check
--  membership by doing
--      EXISTS (SELECT 1 FROM public.discord_group_members WHERE ...)
--  which itself fires `discord_group_members` RLS, which contains the same
--  EXISTS clause → infinite recursion.
--
--  Fix: introduce two SECURITY DEFINER helper functions that bypass RLS for
--  the membership lookup, and rewrite every policy that previously referenced
--  `discord_group_members` to call those helpers instead.
--
--  Run this in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SECURITY DEFINER helpers — these bypass RLS internally so policy
--    evaluation never re-enters discord_group_members RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discord_group_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discord_group_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discord_group_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = _channel_id
      AND m.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid)  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid)   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid)   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_channel_member(uuid) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2. discord_group_members — the directly recursive table
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "dgm_select_member"          ON public.discord_group_members;
DROP POLICY IF EXISTS "dgm_insert_admin"           ON public.discord_group_members;
DROP POLICY IF EXISTS "dgm_delete_self_or_admin"   ON public.discord_group_members;
DROP POLICY IF EXISTS "dgm_update_admin"           ON public.discord_group_members;

CREATE POLICY "dgm_select_member" ON public.discord_group_members
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_group_member(group_id)
);

-- A user may insert themselves (e.g. when accepting an invite or creating a
-- new server) OR an admin/owner may add others.
CREATE POLICY "dgm_insert_admin" ON public.discord_group_members
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR public.is_group_admin(group_id)
);

CREATE POLICY "dgm_delete_self_or_admin" ON public.discord_group_members
FOR DELETE USING (
  user_id = auth.uid()
  OR public.is_group_admin(group_id)
);

CREATE POLICY "dgm_update_admin" ON public.discord_group_members
FOR UPDATE USING (
  public.is_group_admin(group_id)
);

-- ---------------------------------------------------------------------------
-- 3. discord_groups
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "dg_select_member"  ON public.discord_groups;
DROP POLICY IF EXISTS "dg_insert_owner"   ON public.discord_groups;
DROP POLICY IF EXISTS "dg_update_admin"   ON public.discord_groups;
DROP POLICY IF EXISTS "dg_delete_owner"   ON public.discord_groups;

CREATE POLICY "dg_select_member" ON public.discord_groups
FOR SELECT USING ( public.is_group_member(id) );

CREATE POLICY "dg_insert_owner" ON public.discord_groups
FOR INSERT WITH CHECK ( auth.uid() = created_by );

CREATE POLICY "dg_update_admin" ON public.discord_groups
FOR UPDATE USING ( public.is_group_admin(id) );

CREATE POLICY "dg_delete_owner" ON public.discord_groups
FOR DELETE USING ( public.is_group_owner(id) );

-- ---------------------------------------------------------------------------
-- 4. discord_channels
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "dc_select_member" ON public.discord_channels;
DROP POLICY IF EXISTS "dc_insert_admin"  ON public.discord_channels;
DROP POLICY IF EXISTS "dc_update_admin"  ON public.discord_channels;
DROP POLICY IF EXISTS "dc_delete_admin"  ON public.discord_channels;

CREATE POLICY "dc_select_member" ON public.discord_channels
FOR SELECT USING ( public.is_group_member(group_id) );

CREATE POLICY "dc_insert_admin" ON public.discord_channels
FOR INSERT WITH CHECK ( public.is_group_admin(group_id) );

CREATE POLICY "dc_update_admin" ON public.discord_channels
FOR UPDATE USING ( public.is_group_admin(group_id) );

CREATE POLICY "dc_delete_admin" ON public.discord_channels
FOR DELETE USING ( public.is_group_admin(group_id) );

-- ---------------------------------------------------------------------------
-- 5. discord_channel_categories (only exists if 005 ran)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'discord_channel_categories') THEN

    EXECUTE 'DROP POLICY IF EXISTS "dcc_select_member" ON public.discord_channel_categories';
    EXECUTE 'DROP POLICY IF EXISTS "dcc_insert_admin"  ON public.discord_channel_categories';
    EXECUTE 'DROP POLICY IF EXISTS "dcc_update_admin"  ON public.discord_channel_categories';
    EXECUTE 'DROP POLICY IF EXISTS "dcc_delete_admin"  ON public.discord_channel_categories';

    EXECUTE 'CREATE POLICY "dcc_select_member" ON public.discord_channel_categories FOR SELECT USING ( public.is_group_member(group_id) )';
    EXECUTE 'CREATE POLICY "dcc_insert_admin"  ON public.discord_channel_categories FOR INSERT WITH CHECK ( public.is_group_admin(group_id) )';
    EXECUTE 'CREATE POLICY "dcc_update_admin"  ON public.discord_channel_categories FOR UPDATE USING ( public.is_group_admin(group_id) )';
    EXECUTE 'CREATE POLICY "dcc_delete_admin"  ON public.discord_channel_categories FOR DELETE USING ( public.is_group_admin(group_id) )';

  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. discord_invites
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "di_select_member" ON public.discord_invites;
DROP POLICY IF EXISTS "di_insert_admin"  ON public.discord_invites;

CREATE POLICY "di_select_member" ON public.discord_invites
FOR SELECT USING ( public.is_group_member(group_id) );

CREATE POLICY "di_insert_admin" ON public.discord_invites
FOR INSERT WITH CHECK ( public.is_group_admin(group_id) );

-- ---------------------------------------------------------------------------
-- 7. discord_messages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "dm_select_member" ON public.discord_messages;
DROP POLICY IF EXISTS "dm_insert_member" ON public.discord_messages;

CREATE POLICY "dm_select_member" ON public.discord_messages
FOR SELECT USING ( public.is_channel_member(channel_id) );

CREATE POLICY "dm_insert_member" ON public.discord_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND public.is_channel_member(channel_id)
);

-- ---------------------------------------------------------------------------
-- 8. discord_attachments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "da_select_member" ON public.discord_attachments;
DROP POLICY IF EXISTS "da_insert_member" ON public.discord_attachments;

CREATE POLICY "da_select_member" ON public.discord_attachments
FOR SELECT USING ( public.is_group_member(group_id) );

CREATE POLICY "da_insert_member" ON public.discord_attachments
FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by AND public.is_group_member(group_id)
);

-- ---------------------------------------------------------------------------
-- 9. discord_presence_events
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'discord_presence_events') THEN

    EXECUTE 'DROP POLICY IF EXISTS "dpe_select_member" ON public.discord_presence_events';
    EXECUTE 'CREATE POLICY "dpe_select_member" ON public.discord_presence_events FOR SELECT USING ( public.is_group_member(group_id) )';

  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 10. Refresh PostgREST schema cache
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
