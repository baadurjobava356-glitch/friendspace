export type GroupRole = 'owner' | 'admin' | 'member'
export type ChannelKind = 'text' | 'voice'
export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible'

export interface MiniGroup {
  id: string
  name: string
  slug: string
  icon_url?: string | null
  description?: string | null
  banner_url?: string | null
  system_channel_id?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface MiniGroupMember {
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
}

export interface MiniGroupMemberWithProfile extends MiniGroupMember {
  display_name: string | null
  avatar_url: string | null
  presence_status: PresenceStatus
  custom_status: string | null
  is_online?: boolean
}

export interface MiniChannelCategory {
  id: string
  group_id: string
  name: string
  position: number
  created_at: string
}

export interface MiniChannel {
  id: string
  group_id: string
  category_id: string | null
  name: string
  kind: ChannelKind
  topic: string | null
  position: number
  is_nsfw: boolean
  created_by: string
  created_at: string
}

export interface MiniReactionAggregate {
  emoji: string
  count: number
  mine: boolean
}

export interface MiniMessage {
  id: string
  channel_id: string
  sender_id: string
  content: string
  message_type: 'default' | 'system' | 'reply' | 'file' | 'call'
  reply_to_id: string | null
  pinned: boolean
  edited_at: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: string | null
  attachment_size_bytes: number | null
  created_at: string
  updated_at: string
  // From v_discord_messages_enriched
  sender_display_name?: string | null
  sender_avatar_url?: string | null
  sender_presence_status?: PresenceStatus | null
  reactions?: MiniReactionAggregate[]
  reply_to?: MiniMessage | null
}

export interface MiniInvite {
  id: string
  group_id: string
  code: string
  created_by: string
  max_uses: number
  used_count: number
  expires_at: string | null
  created_at: string
}

export interface MiniVoiceParticipant {
  channel_id: string
  user_id: string
  joined_at: string
  is_muted: boolean
  is_deafened: boolean
  is_video: boolean
  is_screen: boolean
  display_name?: string | null
  avatar_url?: string | null
}

export interface PresenceHeartbeatPayload {
  groupId: string
  channelId?: string | null
  status?: PresenceStatus
  customStatus?: string | null
}

export interface MiniProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  presence_status: PresenceStatus
  custom_status: string | null
  banner_url: string | null
  accent_color: string | null
}
