-- ─── FriendSpace Migration 002: Friendships & Friend Requests ────────────────
-- Run this in the Supabase SQL editor AFTER 001_create_tables.sql

-- Friend requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fr_select_own" ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "fr_insert_own" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "fr_update_receiver" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "fr_delete_own" ON public.friend_requests
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Friendships table (canonical; populated by trigger on accept)
CREATE TABLE IF NOT EXISTS public.friendships (
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)  -- canonical ordering prevents duplicate pairs
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_own" ON public.friendships
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "friendships_delete_own" ON public.friendships
  FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Trigger: auto-insert friendship row when a request is accepted
CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.friendships (user_a, user_b)
    VALUES (
      LEAST(NEW.sender_id, NEW.receiver_id),
      GREATEST(NEW.sender_id, NEW.receiver_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.friend_requests;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friend_request_accepted();

-- updated_at trigger for friend_requests
CREATE TRIGGER friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Group calls table (supports future group call features)
CREATE TABLE IF NOT EXISTS public.group_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  CONSTRAINT valid_end_time CHECK (ended_at IS NULL OR ended_at > started_at)
);

ALTER TABLE public.group_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_calls_select" ON public.group_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = group_calls.conversation_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "group_calls_insert" ON public.group_calls
  FOR INSERT WITH CHECK (auth.uid() = started_by);

CREATE POLICY "group_calls_update" ON public.group_calls
  FOR UPDATE USING (auth.uid() = started_by);

-- Enable Realtime for new tables
-- Run these separately in the Supabase dashboard if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.group_calls;
