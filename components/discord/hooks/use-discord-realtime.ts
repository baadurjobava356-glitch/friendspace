"use client"

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Options {
  onMessageChange?: () => void
  onChannelChange?: () => void
  onMemberChange?: () => void
  onReactionChange?: () => void
  onVoiceParticipantChange?: () => void
}

/**
 * Subscribe to all Discord-relevant realtime topics for a given group/channel.
 * Falls back to polling if realtime is unavailable (handlers will still
 * run via the parent component's poll timers).
 */
export function useDiscordRealtime(
  groupId: string | null,
  channelId: string | null,
  opts: Options,
) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    if (!groupId) return
    const supabase = createClient()
    const channel = supabase.channel(`ds-group-${groupId}`)

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_channels', filter: `group_id=eq.${groupId}` },
        () => optsRef.current.onChannelChange?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_channel_categories', filter: `group_id=eq.${groupId}` },
        () => optsRef.current.onChannelChange?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_group_members', filter: `group_id=eq.${groupId}` },
        () => optsRef.current.onMemberChange?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_voice_participants' },
        () => optsRef.current.onVoiceParticipantChange?.())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [groupId])

  useEffect(() => {
    if (!channelId) return
    const supabase = createClient()
    const channel = supabase.channel(`ds-channel-${channelId}`)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_messages', filter: `channel_id=eq.${channelId}` },
        () => optsRef.current.onMessageChange?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discord_reactions' },
        () => optsRef.current.onReactionChange?.())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [channelId])
}
