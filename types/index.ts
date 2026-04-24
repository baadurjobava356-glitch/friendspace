export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  status: string | null
  is_online: boolean
  last_seen: string
  created_at: string
}

export interface Conversation {
  id: string
  name: string | null
  is_group: boolean
  created_by: string
  avatar_url: string | null
  updated_at: string
  conversation_participants: ConversationParticipant[]
}

export interface ConversationParticipant {
  user_id: string
  is_admin: boolean
  last_read_at?: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  file_url?: string | null
  file_name?: string | null
  is_edited: boolean
  created_at: string
  updated_at: string
}

export interface VoiceParticipant {
  userId: string
  displayName: string
  isMuted: boolean
  isSpeaking: boolean
  isSharingScreen?: boolean
}

export interface VoiceChannel {
  id: string
  name: string
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: "pending" | "accepted" | "declined"
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Friendship {
  user_a: string
  user_b: string
  created_at: string
  friend?: Profile
}

export type MessageStatus = "sending" | "sent" | "delivered" | "read"
