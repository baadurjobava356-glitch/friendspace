export type GroupRole = 'owner' | 'admin' | 'member'

export interface MiniGroup {
  id: string
  name: string
  slug: string
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

export interface MiniChannel {
  id: string
  group_id: string
  name: string
  kind: 'text' | 'voice'
  created_by: string
  created_at: string
}

export interface MiniMessage {
  id: string
  channel_id: string
  sender_id: string
  content: string
  created_at: string
  updated_at: string
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

export interface PresenceHeartbeatPayload {
  groupId: string
  channelId?: string | null
}
