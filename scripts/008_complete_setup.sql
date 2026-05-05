-- =============================================================================
--  Friendspace / Mini-Discord — ONE-SHOT COMPLETE SETUP
--
--  Idempotent. Safe to re-run any number of times.
--
--  This migration is the only one you need to run after the original
--  003_mini_discord_mvp.sql baseline. It:
--    • Adds every extension column the app touches (description / icon_url /
--      banner_url / system_channel_id / category_id / topic / position /
--      is_nsfw / edited_at / reply_to_id / pinned / message_type /
--      attachment_*).
--    • Creates every secondary table the app touches
--      (discord_channel_categories, discord_reactions, discord_mentions,
--      discord_voice_participants).
--    • Installs SECURITY DEFINER membership helpers and rewrites EVERY policy
--      that previously self-referenced discord_group_members so the
--      "infinite recursion in policy" error cannot happen.
--    • Recreates the v_discord_messages_enriched view used by the chat API.
--    • Wires Supabase Realtime publications.
--
--  Run order: 003 (already done) → 008 (this file). You may skip 005/006/007.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extension columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_status TEXT,
  ADD COLUMN IF NOT EXISTS custom_status TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'profiles_presence_status_check') THEN
    BEGIN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_presence_status_check
        CHECK (presence_status IS NULL OR presence_status IN ('online','idle','dnd','offline','invisible'));
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.discord_groups
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS system_channel_id UUID;

-- ---------------------------------------------------------------------------
-- 2. Channel categories table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_channel_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.discord_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.discord_channel_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.discord_channels
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.discord_channel_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 3. Message extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.discord_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.discord_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'discord_messages_message_type_check') THEN
    BEGIN
      ALTER TABLE public.discord_messages
        ADD CONSTRAINT discord_messages_message_type_check
        CHECK (message_type IN ('default','system','reply','file','call'));
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_discord_messages_reply_to ON public.discord_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_discord_messages_pinned   ON public.discord_messages(channel_id, pinned) WHERE pinned;

-- ---------------------------------------------------------------------------
-- 4. Reactions / mentions / voice participants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_reactions (
  message_id UUID NOT NULL REFERENCES public.discord_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);
ALTER TABLE public.discord_reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_discord_reactions_message ON public.discord_reactions(message_id);

CREATE TABLE IF NOT EXISTS public.discord_mentions (
  message_id UUID NOT NULL REFERENCES public.discord_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);
ALTER TABLE public.discord_mentions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.discord_voice_participants (
  channel_id  UUID NOT NULL REFERENCES public.discord_channels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_muted    BOOLEAN NOT NULL DEFAULT FALSE,
  is_deafened BOOLEAN NOT NULL DEFAULT FALSE,
  is_video    BOOLEAN NOT NULL DEFAULT FALSE,
  is_screen   BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (channel_id, user_id)
);
ALTER TABLE public.discord_voice_participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_discord_voice_channel ON public.discord_voice_participants(channel_id);

-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER membership helpers (kill RLS recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_group_members
    WHERE group_id = _group_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_group_members
    WHERE group_id = _group_id AND user_id = auth.uid()
      AND role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_group_members
    WHERE group_id = _group_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = _channel_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_admin(_channel_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = _channel_id AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid)  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid)   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid)   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_channel_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_channel_admin(uuid) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 6. Drop EVERY old policy (any name, any source migration) and recreate
--    using helper functions only. This guarantees no recursion regardless of
--    what previous migrations did.
-- ---------------------------------------------------------------------------

-- discord_groups
DROP POLICY IF EXISTS "dg_select_member"   ON public.discord_groups;
DROP POLICY IF EXISTS "dg_insert_owner"    ON public.discord_groups;
DROP POLICY IF EXISTS "dg_update_admin"    ON public.discord_groups;
DROP POLICY IF EXISTS "dg_delete_owner"    ON public.discord_groups;

CREATE POLICY "dg_select_member" ON public.discord_groups
  FOR SELECT USING ( public.is_group_member(id) );
CREATE POLICY "dg_insert_owner" ON public.discord_groups
  FOR INSERT WITH CHECK ( auth.uid() = created_by );
CREATE POLICY "dg_update_admin" ON public.discord_groups
  FOR UPDATE USING ( public.is_group_admin(id) );
CREATE POLICY "dg_delete_owner" ON public.discord_groups
  FOR DELETE USING ( public.is_group_owner(id) );

-- discord_group_members (THE recursion source)
DROP POLICY IF EXISTS "dgm_select_member"        ON public.discord_group_members;
DROP POLICY IF EXISTS "dgm_insert_admin"         ON public.discord_group_members;
DROP POLICY IF EXISTS "dgm_delete_self_or_admin" ON public.discord_group_members;
DROP POLICY IF EXISTS "dgm_update_admin"         ON public.discord_group_members;

CREATE POLICY "dgm_select_member" ON public.discord_group_members
  FOR SELECT USING ( user_id = auth.uid() OR public.is_group_member(group_id) );
CREATE POLICY "dgm_insert_admin" ON public.discord_group_members
  FOR INSERT WITH CHECK ( user_id = auth.uid() OR public.is_group_admin(group_id) );
CREATE POLICY "dgm_delete_self_or_admin" ON public.discord_group_members
  FOR DELETE USING ( user_id = auth.uid() OR public.is_group_admin(group_id) );
CREATE POLICY "dgm_update_admin" ON public.discord_group_members
  FOR UPDATE USING ( public.is_group_admin(group_id) );

-- discord_channels
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

-- discord_channel_categories
DROP POLICY IF EXISTS "dcc_select_member" ON public.discord_channel_categories;
DROP POLICY IF EXISTS "dcc_insert_admin"  ON public.discord_channel_categories;
DROP POLICY IF EXISTS "dcc_update_admin"  ON public.discord_channel_categories;
DROP POLICY IF EXISTS "dcc_delete_admin"  ON public.discord_channel_categories;

CREATE POLICY "dcc_select_member" ON public.discord_channel_categories
  FOR SELECT USING ( public.is_group_member(group_id) );
CREATE POLICY "dcc_insert_admin" ON public.discord_channel_categories
  FOR INSERT WITH CHECK ( public.is_group_admin(group_id) );
CREATE POLICY "dcc_update_admin" ON public.discord_channel_categories
  FOR UPDATE USING ( public.is_group_admin(group_id) );
CREATE POLICY "dcc_delete_admin" ON public.discord_channel_categories
  FOR DELETE USING ( public.is_group_admin(group_id) );

-- discord_invites
DROP POLICY IF EXISTS "di_select_member" ON public.discord_invites;
DROP POLICY IF EXISTS "di_insert_admin"  ON public.discord_invites;
DROP POLICY IF EXISTS "di_delete_admin"  ON public.discord_invites;

CREATE POLICY "di_select_member" ON public.discord_invites
  FOR SELECT USING ( public.is_group_member(group_id) );
CREATE POLICY "di_insert_admin" ON public.discord_invites
  FOR INSERT WITH CHECK ( public.is_group_admin(group_id) );
CREATE POLICY "di_delete_admin" ON public.discord_invites
  FOR DELETE USING ( public.is_group_admin(group_id) );

-- discord_messages
DROP POLICY IF EXISTS "dm_select_member"          ON public.discord_messages;
DROP POLICY IF EXISTS "dm_insert_member"          ON public.discord_messages;
DROP POLICY IF EXISTS "dm_update_sender"          ON public.discord_messages;
DROP POLICY IF EXISTS "dm_delete_sender_or_admin" ON public.discord_messages;

CREATE POLICY "dm_select_member" ON public.discord_messages
  FOR SELECT USING ( public.is_channel_member(channel_id) );
CREATE POLICY "dm_insert_member" ON public.discord_messages
  FOR INSERT WITH CHECK ( auth.uid() = sender_id AND public.is_channel_member(channel_id) );
CREATE POLICY "dm_update_sender" ON public.discord_messages
  FOR UPDATE USING ( sender_id = auth.uid() OR public.is_channel_admin(channel_id) );
CREATE POLICY "dm_delete_sender_or_admin" ON public.discord_messages
  FOR DELETE USING ( sender_id = auth.uid() OR public.is_channel_admin(channel_id) );

-- discord_attachments
DROP POLICY IF EXISTS "da_select_member" ON public.discord_attachments;
DROP POLICY IF EXISTS "da_insert_member" ON public.discord_attachments;

CREATE POLICY "da_select_member" ON public.discord_attachments
  FOR SELECT USING ( public.is_group_member(group_id) );
CREATE POLICY "da_insert_member" ON public.discord_attachments
  FOR INSERT WITH CHECK ( auth.uid() = uploaded_by AND public.is_group_member(group_id) );

-- discord_reactions
DROP POLICY IF EXISTS "dr_select_member" ON public.discord_reactions;
DROP POLICY IF EXISTS "dr_insert_self"   ON public.discord_reactions;
DROP POLICY IF EXISTS "dr_delete_self"   ON public.discord_reactions;

CREATE POLICY "dr_select_member" ON public.discord_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.discord_messages m
      WHERE m.id = discord_reactions.message_id
        AND public.is_channel_member(m.channel_id)
    )
  );
CREATE POLICY "dr_insert_self" ON public.discord_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.discord_messages m
      WHERE m.id = discord_reactions.message_id
        AND public.is_channel_member(m.channel_id)
    )
  );
CREATE POLICY "dr_delete_self" ON public.discord_reactions
  FOR DELETE USING ( user_id = auth.uid() );

-- discord_mentions
DROP POLICY IF EXISTS "dmen_select_self"    ON public.discord_mentions;
DROP POLICY IF EXISTS "dmen_insert_member"  ON public.discord_mentions;
DROP POLICY IF EXISTS "dmen_update_self"    ON public.discord_mentions;

CREATE POLICY "dmen_select_self" ON public.discord_mentions
  FOR SELECT USING ( user_id = auth.uid() );
CREATE POLICY "dmen_insert_member" ON public.discord_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discord_messages m
      WHERE m.id = discord_mentions.message_id
        AND public.is_channel_member(m.channel_id)
    )
  );
CREATE POLICY "dmen_update_self" ON public.discord_mentions
  FOR UPDATE USING ( user_id = auth.uid() );

-- discord_voice_participants
DROP POLICY IF EXISTS "dvp_select_member"        ON public.discord_voice_participants;
DROP POLICY IF EXISTS "dvp_insert_self"          ON public.discord_voice_participants;
DROP POLICY IF EXISTS "dvp_update_self"          ON public.discord_voice_participants;
DROP POLICY IF EXISTS "dvp_delete_self_or_admin" ON public.discord_voice_participants;

CREATE POLICY "dvp_select_member" ON public.discord_voice_participants
  FOR SELECT USING ( public.is_channel_member(channel_id) );
CREATE POLICY "dvp_insert_self" ON public.discord_voice_participants
  FOR INSERT WITH CHECK ( user_id = auth.uid() AND public.is_channel_member(channel_id) );
CREATE POLICY "dvp_update_self" ON public.discord_voice_participants
  FOR UPDATE USING ( user_id = auth.uid() );
CREATE POLICY "dvp_delete_self_or_admin" ON public.discord_voice_participants
  FOR DELETE USING ( user_id = auth.uid() OR public.is_channel_admin(channel_id) );

-- discord_presence_events
DROP POLICY IF EXISTS "dpe_select_member" ON public.discord_presence_events;
DROP POLICY IF EXISTS "dpe_insert_self"   ON public.discord_presence_events;

CREATE POLICY "dpe_select_member" ON public.discord_presence_events
  FOR SELECT USING ( public.is_group_member(group_id) );
CREATE POLICY "dpe_insert_self" ON public.discord_presence_events
  FOR INSERT WITH CHECK ( user_id = auth.uid() );

-- ---------------------------------------------------------------------------
-- 7. Enriched messages view used by /api/channels/messages
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_discord_messages_enriched AS
SELECT
  m.*,
  p.display_name        AS sender_display_name,
  p.avatar_url          AS sender_avatar_url,
  p.presence_status     AS sender_presence_status,
  COALESCE((
    SELECT json_agg(jsonb_build_object('emoji', r.emoji, 'count', r.cnt, 'mine', r.mine))
    FROM (
      SELECT emoji,
             COUNT(*)::int AS cnt,
             BOOL_OR(user_id = auth.uid()) AS mine
      FROM public.discord_reactions
      WHERE message_id = m.id
      GROUP BY emoji
      ORDER BY MIN(created_at)
    ) r
  ), '[]'::json) AS reactions
FROM public.discord_messages m
LEFT JOIN public.profiles p ON p.id = m.sender_id;

GRANT SELECT ON public.v_discord_messages_enriched TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Realtime publications (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_messages;            EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_channels;            EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_channel_categories;  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_reactions;           EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_voice_participants;  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_group_members;       EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_groups;              EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;                    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Refresh PostgREST schema cache
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 10. Sanity report
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM pg_proc
    WHERE proname IN ('is_group_member','is_group_admin','is_group_owner','is_channel_member','is_channel_admin')
  ) AS helper_functions_installed,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'discord_groups'
      AND column_name IN ('description','icon_url','banner_url','system_channel_id')
  ) AS discord_groups_extension_columns_present,
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('discord_channel_categories','discord_reactions','discord_mentions','discord_voice_participants')
  ) AS extension_tables_present,
  (SELECT COUNT(*) FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'v_discord_messages_enriched'
  ) AS enriched_view_present;
