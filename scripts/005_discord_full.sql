-- =============================================================================
--  Friendspace / Mini-Discord — Discord-grade feature schema
--  Run AFTER 003_mini_discord_mvp.sql
--  Adds: channel categories, message edits/replies/pins/reactions, mentions,
--        voice participants, profile status, server icon/description, kicks
-- =============================================================================

-- ---------------------------------------------------------------------------
--  PROFILES — extend with online status (online/idle/dnd/offline) + banner
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_status TEXT
    NOT NULL DEFAULT 'online'
    CHECK (presence_status IN ('online','idle','dnd','offline','invisible')),
  ADD COLUMN IF NOT EXISTS custom_status TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- ---------------------------------------------------------------------------
--  GROUPS — extend with icon, description, system channel
-- ---------------------------------------------------------------------------
ALTER TABLE public.discord_groups
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS system_channel_id UUID;

-- Allow owners/admins to update their groups
DROP POLICY IF EXISTS "dg_update_admin" ON public.discord_groups;
CREATE POLICY "dg_update_admin" ON public.discord_groups
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_groups.id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

-- Allow owners to delete their groups
DROP POLICY IF EXISTS "dg_delete_owner" ON public.discord_groups;
CREATE POLICY "dg_delete_owner" ON public.discord_groups
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_groups.id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
  )
);

-- Members may delete their own membership (leave); admins may remove others
DROP POLICY IF EXISTS "dgm_delete_self_or_admin" ON public.discord_group_members;
CREATE POLICY "dgm_delete_self_or_admin" ON public.discord_group_members
FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_group_members.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

-- Admins/owners can promote / demote members
DROP POLICY IF EXISTS "dgm_update_admin" ON public.discord_group_members;
CREATE POLICY "dgm_update_admin" ON public.discord_group_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_group_members.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

-- ---------------------------------------------------------------------------
--  CHANNEL CATEGORIES (a.k.a. "channel groups" in Discord)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_channel_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.discord_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.discord_channel_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dcc_select_member" ON public.discord_channel_categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channel_categories.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dcc_insert_admin" ON public.discord_channel_categories
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channel_categories.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

CREATE POLICY "dcc_update_admin" ON public.discord_channel_categories
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channel_categories.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

CREATE POLICY "dcc_delete_admin" ON public.discord_channel_categories
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channel_categories.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

-- ---------------------------------------------------------------------------
--  CHANNELS — extend
-- ---------------------------------------------------------------------------
ALTER TABLE public.discord_channels
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.discord_channel_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow channels to be updated / deleted by admins
DROP POLICY IF EXISTS "dc_update_admin" ON public.discord_channels;
CREATE POLICY "dc_update_admin" ON public.discord_channels
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channels.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

DROP POLICY IF EXISTS "dc_delete_admin" ON public.discord_channels;
CREATE POLICY "dc_delete_admin" ON public.discord_channels
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channels.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

-- ---------------------------------------------------------------------------
--  MESSAGES — extend with edit / reply / pin / soft-delete / type
-- ---------------------------------------------------------------------------
ALTER TABLE public.discord_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.discord_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'default'
    CHECK (message_type IN ('default','system','reply','file','call')),
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT;

CREATE INDEX IF NOT EXISTS idx_discord_messages_reply_to ON public.discord_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_discord_messages_pinned ON public.discord_messages(channel_id, pinned) WHERE pinned;

-- Sender may edit / delete their own messages; admins may delete in their group
DROP POLICY IF EXISTS "dm_update_sender" ON public.discord_messages;
CREATE POLICY "dm_update_sender" ON public.discord_messages
FOR UPDATE USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = discord_messages.channel_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

DROP POLICY IF EXISTS "dm_delete_sender_or_admin" ON public.discord_messages;
CREATE POLICY "dm_delete_sender_or_admin" ON public.discord_messages
FOR DELETE USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = discord_messages.channel_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

-- ---------------------------------------------------------------------------
--  REACTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_reactions (
  message_id UUID NOT NULL REFERENCES public.discord_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

ALTER TABLE public.discord_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dr_select_member" ON public.discord_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.discord_messages msg
    JOIN public.discord_channels c ON c.id = msg.channel_id
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE msg.id = discord_reactions.message_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dr_insert_self" ON public.discord_reactions
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.discord_messages msg
    JOIN public.discord_channels c ON c.id = msg.channel_id
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE msg.id = discord_reactions.message_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dr_delete_self" ON public.discord_reactions
FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_discord_reactions_message ON public.discord_reactions(message_id);

-- ---------------------------------------------------------------------------
--  MENTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_mentions (
  message_id UUID NOT NULL REFERENCES public.discord_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.discord_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dmen_select_self" ON public.discord_mentions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "dmen_insert_member" ON public.discord_mentions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.discord_messages msg
    JOIN public.discord_channels c ON c.id = msg.channel_id
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE msg.id = discord_mentions.message_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dmen_update_self" ON public.discord_mentions
FOR UPDATE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
--  VOICE PARTICIPANTS — for showing who's in a voice channel right now
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_voice_participants (
  channel_id UUID NOT NULL REFERENCES public.discord_channels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_muted   BOOLEAN NOT NULL DEFAULT FALSE,
  is_deafened BOOLEAN NOT NULL DEFAULT FALSE,
  is_video   BOOLEAN NOT NULL DEFAULT FALSE,
  is_screen  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (channel_id, user_id)
);

ALTER TABLE public.discord_voice_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dvp_select_member" ON public.discord_voice_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = discord_voice_participants.channel_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dvp_insert_self" ON public.discord_voice_participants
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = discord_voice_participants.channel_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dvp_update_self" ON public.discord_voice_participants
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "dvp_delete_self_or_admin" ON public.discord_voice_participants
FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = discord_voice_participants.channel_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_discord_voice_channel ON public.discord_voice_participants(channel_id);

-- ---------------------------------------------------------------------------
--  REALTIME publication wiring (idempotent)
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
--  Helper view: enriched messages with sender profile & reaction counts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_discord_messages_enriched AS
SELECT
  m.*,
  p.display_name AS sender_display_name,
  p.avatar_url   AS sender_avatar_url,
  p.presence_status AS sender_presence_status,
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
--  Done
-- ---------------------------------------------------------------------------
