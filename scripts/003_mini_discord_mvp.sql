-- Mini Discord MVP schema (groups/channels/invites/presence/files/voice)
-- Run after existing scripts.

CREATE TABLE IF NOT EXISTS public.discord_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2),
  slug TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discord_group_members (
  group_id UUID NOT NULL REFERENCES public.discord_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.discord_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.discord_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'voice')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, name, kind)
);

CREATE TABLE IF NOT EXISTS public.discord_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.discord_groups(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses INT NOT NULL DEFAULT 25 CHECK (max_uses > 0),
  used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discord_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.discord_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 4000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discord_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.discord_messages(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.discord_groups(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discord_presence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.discord_groups(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.discord_channels(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('heartbeat', 'typing_on', 'typing_off')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.discord_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_presence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dg_select_member" ON public.discord_groups
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_groups.id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dg_insert_owner" ON public.discord_groups
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "dgm_select_member" ON public.discord_group_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_group_members.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dgm_insert_admin" ON public.discord_group_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_group_members.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
  OR auth.uid() = user_id
);

CREATE POLICY "dc_select_member" ON public.discord_channels
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channels.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dc_insert_admin" ON public.discord_channels
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_channels.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

CREATE POLICY "di_select_member" ON public.discord_invites
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_invites.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "di_insert_admin" ON public.discord_invites
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_invites.group_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

CREATE POLICY "dm_select_member" ON public.discord_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = discord_messages.channel_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dm_insert_member" ON public.discord_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.discord_channels c
    JOIN public.discord_group_members m ON m.group_id = c.group_id
    WHERE c.id = discord_messages.channel_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "da_select_member" ON public.discord_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_attachments.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "da_insert_member" ON public.discord_attachments
FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_attachments.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dpe_select_member" ON public.discord_presence_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_presence_events.group_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "dpe_insert_self" ON public.discord_presence_events
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.discord_group_members m
    WHERE m.group_id = discord_presence_events.group_id AND m.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_discord_messages_channel_created
  ON public.discord_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discord_presence_group_created
  ON public.discord_presence_events(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discord_attachments_group_created
  ON public.discord_attachments(group_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.discord_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_groups_updated_at ON public.discord_groups;
CREATE TRIGGER discord_groups_updated_at
BEFORE UPDATE ON public.discord_groups
FOR EACH ROW EXECUTE FUNCTION public.discord_update_timestamp();

DROP TRIGGER IF EXISTS discord_messages_updated_at ON public.discord_messages;
CREATE TRIGGER discord_messages_updated_at
BEFORE UPDATE ON public.discord_messages
FOR EACH ROW EXECUTE FUNCTION public.discord_update_timestamp();
