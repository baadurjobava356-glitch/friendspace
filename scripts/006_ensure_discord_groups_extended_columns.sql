-- -----------------------------------------------------------------------------
-- Fix: "Could not find the 'description' column of 'discord_groups' in the schema cache"
--
-- Cause: Only 003_mini_discord_mvp.sql was applied; 005_discord_full.sql adds
--        icon_url, description, banner_url, system_channel_id on discord_groups.
--
-- Run this in Supabase → SQL Editor (safe to re-run).
-- -----------------------------------------------------------------------------

ALTER TABLE public.discord_groups
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS system_channel_id UUID;

-- Refresh PostgREST schema cache so the API sees new columns immediately
NOTIFY pgrst, 'reload schema';
