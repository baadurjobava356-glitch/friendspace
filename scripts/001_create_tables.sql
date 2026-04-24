-- FriendSpace Database Schema
-- Run this script to create all necessary tables

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  status TEXT DEFAULT 'Hey there! I am using FriendSpace',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Conversations table (supports both DMs and group chats)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Events table (for calendar/event planning)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#ef4444',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Event participants/RSVPs
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, going, maybe, not_going
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Shared files table
CREATE TABLE IF NOT EXISTS public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  folder TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid() AND is_admin = true
  ));

-- RLS Policies for conversation_participants
CREATE POLICY "participants_select" ON public.conversation_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "participants_insert" ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid() AND cp.is_admin = true
  ));

-- RLS Policies for messages
CREATE POLICY "messages_select" ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update" ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "messages_delete" ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- RLS Policies for events (all authenticated users can see and participate)
CREATE POLICY "events_select" ON public.events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for event_participants
CREATE POLICY "event_participants_select" ON public.event_participants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_participants_insert" ON public.event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_participants_update" ON public.event_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "event_participants_delete" ON public.event_participants FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for shared_files (all authenticated users can access)
CREATE POLICY "files_select" ON public.shared_files FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "files_insert" ON public.shared_files FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "files_delete" ON public.shared_files FOR DELETE USING (auth.uid() = uploaded_by);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── Voice Channel Presence ──────────────────────────────────────────────────
-- Tracks who is currently in which voice channel (ephemeral via Supabase Realtime presence)
-- This table is used for persistence; real-time state is handled via Supabase Realtime presence channels.

CREATE TABLE IF NOT EXISTS public.voice_channel_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,           -- e.g. 'vc-general'
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.voice_channel_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_participants_select" ON public.voice_channel_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "voice_participants_insert" ON public.voice_channel_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "voice_participants_update" ON public.voice_channel_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "voice_participants_delete" ON public.voice_channel_participants
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Message Read Receipts ────────────────────────────────────────────────────
-- last_read_at on conversation_participants already tracks per-conversation read state.
-- For per-message read receipts, add a message_reads table:

CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_reads_select" ON public.message_reads
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "message_reads_insert" ON public.message_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for messages and conversation_participants
-- Run in Supabase dashboard or via CLI:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_channel_participants;
