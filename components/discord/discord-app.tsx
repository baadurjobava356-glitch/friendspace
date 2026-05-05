"use client"

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ServerRail } from './server-rail'
import { ChannelSidebar } from './channel-sidebar'
import { ChatView } from './chat-view'
import { MemberSidebar } from './member-sidebar'
import { UserPanel } from './user-panel'
import { HomePanel } from './home-panel'
import { HomeSidebar } from './home-sidebar'
import { DmView } from './dm-view'
import { CreateServerDialog } from './dialogs/create-server-dialog'
import { JoinServerDialog } from './dialogs/join-server-dialog'
import { InviteDialog } from './dialogs/invite-dialog'
import { CreateChannelDialog } from './dialogs/create-channel-dialog'
import { EditChannelDialog } from './dialogs/edit-channel-dialog'
import { ServerSettingsDialog } from './dialogs/server-settings-dialog'
import { UserSettingsDialog } from './dialogs/user-settings-dialog'
import { useDiscordRealtime } from './hooks/use-discord-realtime'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type {
  MiniGroup, GroupRole, MiniChannel, MiniChannelCategory, MiniMessage,
  MiniGroupMemberWithProfile, MiniVoiceParticipant, MiniProfile, Profile, Message as DMMessage,
} from '@/types'
import { createClient } from '@/lib/supabase/client'

type GroupMembership = { role: GroupRole; group: MiniGroup }
type DMConversation = {
  id: string
  is_group: boolean
  name: string | null
  participants: Profile[]
  updated_at?: string
}

export type ProfileUpdateInput = {
  displayName?: string
  bio?: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  accentColor?: string | null
  presenceStatus?: MiniProfile['presence_status']
  customStatus?: string | null
  // tolerant snake_case aliases (in case callers pass them)
  banner_url?: string | null
  accent_color?: string | null
  presence_status?: MiniProfile['presence_status']
  custom_status?: string | null
}

interface Props {
  currentUserId: string
  email: string | null
  initialProfile: MiniProfile
  initialGroups: GroupMembership[]
  initialAllProfiles: Profile[]
  initialConversations: DMConversation[]
}

export function DiscordApp({
  currentUserId, email, initialProfile, initialGroups, initialAllProfiles, initialConversations,
}: Props) {
  const router = useRouter()
  const search = useSearchParams()

  // ---------- Servers ----------
  const [groups, setGroups] = React.useState(initialGroups)
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(initialGroups[0]?.group.id ?? null)
  const activeGroup = React.useMemo(
    () => groups.find((g) => g.group.id === activeGroupId)?.group ?? null,
    [groups, activeGroupId],
  )
  const myRole: GroupRole = React.useMemo(
    () => groups.find((g) => g.group.id === activeGroupId)?.role ?? 'member',
    [groups, activeGroupId],
  )

  // ---------- Channels ----------
  const [channels, setChannels] = React.useState<MiniChannel[]>([])
  const [categories, setCategories] = React.useState<MiniChannelCategory[]>([])
  const [activeChannelId, setActiveChannelId] = React.useState<string | null>(null)
  const activeChannel = React.useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  )

  // ---------- Messages ----------
  const [messages, setMessages] = React.useState<MiniMessage[]>([])
  const [pinned, setPinned] = React.useState<MiniMessage[]>([])

  // ---------- Members ----------
  const [members, setMembers] = React.useState<MiniGroupMemberWithProfile[]>([])
  const [showMembers, setShowMembers] = React.useState(true)

  // ---------- Voice ----------
  const [voiceParticipants, setVoiceParticipants] = React.useState<MiniVoiceParticipant[]>([])
  const [activeVoiceChannelId, setActiveVoiceChannelId] = React.useState<string | null>(null)
  const [voiceMuted, setVoiceMuted] = React.useState(false)
  const [voiceDeafened, setVoiceDeafened] = React.useState(false)
  const activeVoiceChannel = React.useMemo(
    () => channels.find((c) => c.id === activeVoiceChannelId) ?? null,
    [channels, activeVoiceChannelId],
  )

  // ---------- Profile + DMs ----------
  const [profile, setProfile] = React.useState<MiniProfile>(initialProfile)
  const [allProfiles, setAllProfiles] = React.useState(initialAllProfiles)
  const [conversations, setConversations] = React.useState<DMConversation[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [dmMessages, setDmMessages] = React.useState<DMMessage[]>([])
  const [friendsView, setFriendsView] = React.useState(false)
  const [uploadingDm, setUploadingDm] = React.useState(false)

  // ---------- Friends ----------
  const [friends, setFriends] = React.useState<Profile[]>([])
  const [friendRequests, setFriendRequests] = React.useState<{ id: string; sender_id: string; receiver_id: string; status: 'pending' | 'accepted' | 'declined'; created_at: string; sender?: Profile; receiver?: Profile }[]>([])

  // ---------- Dialogs ----------
  const [openCreateServer, setOpenCreateServer] = React.useState(false)
  const [openJoinServer, setOpenJoinServer] = React.useState(false)
  const [openInvite, setOpenInvite] = React.useState(false)
  const [openServerSettings, setOpenServerSettings] = React.useState(false)
  const [openUserSettings, setOpenUserSettings] = React.useState(false)
  const [createChannelState, setCreateChannelState] = React.useState<{ categoryId: string | null; kind: 'text' | 'voice' } | null>(null)
  const [editChannel, setEditChannel] = React.useState<MiniChannel | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<{ kind: 'server' | 'channel' | 'message' | 'leave-server' | 'kick'; payload?: any } | null>(null)

  // ============================================================
  //  REALTIME
  // ============================================================
  useDiscordRealtime(activeGroupId, activeChannelId, {
    onMessageChange: () => loadMessages(activeChannelId),
    onChannelChange: () => loadChannels(activeGroupId),
    onMemberChange: () => loadMembers(activeGroupId),
    onReactionChange: () => loadMessages(activeChannelId),
    onVoiceParticipantChange: () => loadVoice(activeGroupId),
  })

  // ============================================================
  //  LOADERS
  // ============================================================
  const refreshGroups = React.useCallback(async () => {
    const res = await fetch('/api/groups/list')
    const json = await res.json()
    if (res.ok) {
      setGroups(json.groups ?? [])
    }
  }, [])

  const loadChannels = React.useCallback(async (groupId: string | null) => {
    if (!groupId) { setChannels([]); setCategories([]); return }
    const res = await fetch(`/api/channels/list?groupId=${groupId}`)
    const json = await res.json()
    if (res.ok) {
      setChannels(json.channels ?? [])
      setCategories(json.categories ?? [])
    }
  }, [])

  const loadMessages = React.useCallback(async (channelId: string | null) => {
    if (!channelId) { setMessages([]); return }
    const res = await fetch(`/api/channels/messages?channelId=${channelId}`)
    const json = await res.json()
    if (res.ok) setMessages(json.messages ?? [])
  }, [])

  const loadPinned = React.useCallback(async (channelId: string | null) => {
    if (!channelId) { setPinned([]); return }
    const res = await fetch(`/api/messages/pin?channelId=${channelId}`)
    const json = await res.json()
    if (res.ok) setPinned(json.messages ?? [])
  }, [])

  const loadMembers = React.useCallback(async (groupId: string | null) => {
    if (!groupId) { setMembers([]); return }
    const res = await fetch(`/api/groups/members?groupId=${groupId}`)
    const json = await res.json()
    if (res.ok) setMembers(json.members ?? [])
  }, [])

  const loadVoice = React.useCallback(async (groupId: string | null) => {
    if (!groupId) { setVoiceParticipants([]); return }
    const res = await fetch(`/api/voice/participants?groupId=${groupId}`)
    const json = await res.json()
    if (res.ok) setVoiceParticipants(json.participants ?? [])
  }, [])

  const loadFriends = React.useCallback(async () => {
    try {
      const [friendsRes, sendRes] = await Promise.all([
        fetch('/api/friends/list'),
        fetch('/api/friends/list?type=requests').catch(() => null),
      ])
      const friendsJson = await friendsRes.json().catch(() => null)
      if (friendsRes.ok) setFriends(friendsJson?.friends ?? [])

      // Pull friend_requests directly via supabase to also fill sender profiles
      const supabase = createClient()
      const { data: requests } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')
      if (requests) {
        const senderIds = requests.map((r) => r.sender_id)
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', senderIds)
        const map = new Map((senderProfiles ?? []).map((p) => [p.id, p]))
        setFriendRequests(requests.map((r) => ({ ...r, sender: map.get(r.sender_id) })))
      }
      void sendRes
    } catch { /* friends table may not exist yet */ }
  }, [currentUserId])

  const loadConversations = React.useCallback(async () => {
    const supabase = createClient()
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId)
    const ids = (parts ?? []).map((p) => p.conversation_id)
    if (ids.length === 0) { setConversations([]); return }
    const { data: convs } = await supabase
      .from('conversations')
      .select('*, conversation_participants(user_id)')
      .in('id', ids)
      .order('updated_at', { ascending: false })

    const allUserIds = Array.from(new Set((convs ?? []).flatMap((c) =>
      (c.conversation_participants as { user_id: string }[]).map((p) => p.user_id),
    )))
    const { data: profs } = allUserIds.length > 0 ? await supabase
      .from('profiles')
      .select('*')
      .in('id', allUserIds) : { data: [] }
    const profMap = new Map((profs ?? []).map((p) => [p.id, p as Profile]))

    const enriched: DMConversation[] = (convs ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      is_group: !!c.is_group,
      participants: (c.conversation_participants as { user_id: string }[])
        .map((cp) => profMap.get(cp.user_id))
        .filter((x): x is Profile => !!x),
      updated_at: c.updated_at,
    }))
    setConversations(enriched)
  }, [currentUserId])

  const loadDmMessages = React.useCallback(async (conversationId: string | null) => {
    if (!conversationId) { setDmMessages([]); return }
    const res = await fetch(`/api/conversations/messages?conversationId=${conversationId}&limit=100`)
    const json = await res.json()
    if (res.ok) setDmMessages(json.messages ?? [])
  }, [])

  // ============================================================
  //  Effects: load on selection change
  // ============================================================
  React.useEffect(() => {
    if (activeGroupId) {
      loadChannels(activeGroupId)
      loadMembers(activeGroupId)
      loadVoice(activeGroupId)
    } else {
      setChannels([]); setCategories([]); setMembers([])
    }
  }, [activeGroupId, loadChannels, loadMembers, loadVoice])

  React.useEffect(() => {
    if (channels.length === 0) { setActiveChannelId(null); return }
    if (!activeChannelId || !channels.some((c) => c.id === activeChannelId)) {
      const firstText = channels.find((c) => c.kind === 'text')
      setActiveChannelId(firstText?.id ?? channels[0]?.id ?? null)
    }
  }, [channels, activeChannelId])

  React.useEffect(() => {
    if (activeChannel?.kind === 'text') {
      loadMessages(activeChannelId)
      loadPinned(activeChannelId)
    } else {
      setMessages([]); setPinned([])
    }
  }, [activeChannelId, activeChannel, loadMessages, loadPinned])

  React.useEffect(() => {
    if (activeConversationId) loadDmMessages(activeConversationId)
  }, [activeConversationId, loadDmMessages])

  React.useEffect(() => {
    loadConversations()
    loadFriends()
  }, [loadConversations, loadFriends])

  // Realtime DMs subscription
  React.useEffect(() => {
    if (!activeConversationId) return
    const supabase = createClient()
    const ch = supabase
      .channel(`dm-${activeConversationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, () => loadDmMessages(activeConversationId))
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [activeConversationId, loadDmMessages])

  // ============================================================
  //  Presence heartbeat
  // ============================================================
  React.useEffect(() => {
    if (!activeGroupId) return
    const beat = () =>
      fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroupId,
          channelId: activeChannelId,
          status: profile.presence_status,
        }),
      }).catch(() => null)
    beat()
    const t = setInterval(beat, 30000)
    return () => clearInterval(t)
  }, [activeGroupId, activeChannelId, profile.presence_status])

  // ============================================================
  //  Auto-handle ?invite= code in URL
  // ============================================================
  const inviteCode = search.get('invite')
  React.useEffect(() => {
    if (!inviteCode) return
    ;(async () => {
      const res = await fetch('/api/invites/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.groupId) {
        await refreshGroups()
        setActiveGroupId(json.groupId)
        toast.success('Joined server!')
      } else {
        toast.error(json?.error ?? 'Could not join with that invite')
      }
      router.replace('/')
    })()
  }, [inviteCode, refreshGroups, router])

  // ============================================================
  //  Actions
  // ============================================================
  async function createServer(name: string, description: string) {
    const res = await fetch('/api/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json?.error ?? 'Failed'); return }
    await refreshGroups()
    setActiveGroupId(json.group.id)
    toast.success(`Created ${name}`)
  }

  async function joinByInvite(code: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('/api/invites/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const json = await res.json().catch(() => null)
    if (res.ok && json?.groupId) {
      await refreshGroups()
      setActiveGroupId(json.groupId)
      toast.success('Joined server')
      return { ok: true }
    }
    return { ok: false, error: json?.error ?? 'Invite failed' }
  }

  async function createChannel(params: { groupId: string; name: string; kind: 'text' | 'voice'; categoryId: string | null }) {
    const res = await fetch('/api/channels/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json?.error ?? 'Failed'); return }
    await loadChannels(params.groupId)
    setActiveChannelId(json.channel.id)
    toast.success(`#${json.channel.name} created`)
  }

  async function saveChannel(channelId: string, name: string, topic: string) {
    const res = await fetch('/api/channels/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, name, topic }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json?.error ?? 'Failed'); return }
    await loadChannels(activeGroupId)
    toast.success('Channel updated')
  }

  async function deleteChannel(channel: MiniChannel) {
    const res = await fetch(`/api/channels/update?channelId=${channel.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Failed'); return
    }
    await loadChannels(activeGroupId)
    if (activeChannelId === channel.id) setActiveChannelId(null)
    toast.success(`Deleted #${channel.name}`)
  }

  async function saveServerSettings({ name, description, iconUrl }: { name: string; description: string; iconUrl?: string | null }) {
    if (!activeGroup) return
    const res = await fetch('/api/groups/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: activeGroup.id, name, description, iconUrl }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json?.error ?? 'Failed'); return }
    await refreshGroups()
    toast.success('Server updated')
  }

  async function deleteServer() {
    if (!activeGroup) return
    const res = await fetch(`/api/groups/update?groupId=${activeGroup.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => null)
    if (!res.ok) { toast.error(json?.error ?? 'Failed'); return }
    await refreshGroups()
    setActiveGroupId(null)
    toast.success('Server deleted')
  }

  async function leaveServer() {
    if (!activeGroup) return
    const res = await fetch('/api/groups/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: activeGroup.id }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { toast.error(json?.error ?? 'Failed'); return }
    await refreshGroups()
    setActiveGroupId(null)
    toast.success('Left the server')
  }

  async function sendMessage(content: string, replyToId?: string | null, attachment?: { url: string; name: string; type?: string; sizeBytes?: number } | null) {
    if (!activeChannelId) return
    const res = await fetch('/api/channels/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: activeChannelId, content, replyToId, attachment }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Could not send'); return
    }
    await loadMessages(activeChannelId)
  }

  async function editMessage(messageId: string, content: string) {
    const res = await fetch('/api/channels/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, content }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Could not edit'); return
    }
    await loadMessages(activeChannelId)
  }

  async function deleteMessage(messageId: string) {
    const res = await fetch(`/api/channels/messages?messageId=${messageId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Could not delete'); return
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  async function togglePin(messageId: string, pinned: boolean) {
    const res = await fetch('/api/messages/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, pinned }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Could not pin'); return
    }
    await Promise.all([loadMessages(activeChannelId), loadPinned(activeChannelId)])
  }

  async function react(messageId: string, emoji: string) {
    await fetch('/api/messages/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, emoji, toggle: true }),
    })
    await loadMessages(activeChannelId)
  }

  async function joinVoice(channelId: string) {
    setActiveVoiceChannelId(channelId)
    const res = await fetch('/api/voice/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, muted: voiceMuted, deafened: voiceDeafened }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Could not join voice'); return
    }
    await loadVoice(activeGroupId)
    toast.success('Connected to voice')
    // also try to issue a livekit token (best-effort)
    if (activeGroup) {
      const ch = channels.find((c) => c.id === channelId)
      if (ch) {
        await fetch('/api/voice/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: `${activeGroup.slug}-${ch.name}` }),
        }).catch(() => null)
      }
    }
  }

  async function leaveVoice() {
    if (!activeVoiceChannelId) return
    const res = await fetch(`/api/voice/participants?channelId=${activeVoiceChannelId}`, { method: 'DELETE' })
    if (!res.ok) toast.error('Could not disconnect')
    setActiveVoiceChannelId(null)
    await loadVoice(activeGroupId)
  }

  async function toggleVoiceMute() {
    const next = !voiceMuted
    setVoiceMuted(next)
    if (activeVoiceChannelId) {
      await fetch('/api/voice/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeVoiceChannelId, muted: next, deafened: voiceDeafened }),
      })
      await loadVoice(activeGroupId)
    }
  }

  async function toggleVoiceDeafen() {
    const nextDeafened = !voiceDeafened
    setVoiceDeafened(nextDeafened)
    // when deafened, also mute
    const newMuted = nextDeafened ? true : voiceMuted
    setVoiceMuted(newMuted)
    if (activeVoiceChannelId) {
      await fetch('/api/voice/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeVoiceChannelId, muted: newMuted, deafened: nextDeafened }),
      })
      await loadVoice(activeGroupId)
    }
  }

  function selectChannel(id: string) {
    const ch = channels.find((c) => c.id === id)
    if (!ch) return
    if (ch.kind === 'voice') {
      joinVoice(ch.id)
    } else {
      setActiveChannelId(ch.id)
    }
  }

  // ---------- Members management ----------
  async function changeMemberRole(userId: string, role: GroupRole) {
    if (!activeGroupId) return
    const res = await fetch('/api/groups/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: activeGroupId, userId, role }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Failed'); return
    }
    await loadMembers(activeGroupId)
    toast.success('Role updated')
  }

  async function kickMember(userId: string) {
    if (!activeGroupId) return
    const res = await fetch(`/api/groups/members?groupId=${activeGroupId}&userId=${userId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Failed'); return
    }
    await loadMembers(activeGroupId)
    toast.success('Member removed')
  }

  // ---------- DMs ----------
  async function openDmWith(userId: string) {
    const res = await fetch('/api/conversations/direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json?.error ?? 'Failed'); return }
    await loadConversations()
    setActiveGroupId(null)
    setActiveConversationId(json.conversationId)
    setFriendsView(false)
  }

  async function sendDm(content: string) {
    if (!activeConversationId) return
    const res = await fetch('/api/conversations/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeConversationId, content }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Failed'); return
    }
    await loadDmMessages(activeConversationId)
  }

  async function uploadAndSendDm(file: File) {
    if (!activeConversationId) return
    setUploadingDm(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const upRes = await fetch('/api/upload', { method: 'POST', body: form })
      const upJson = await upRes.json().catch(() => null)
      if (!upRes.ok || !upJson?.pathname) { toast.error(upJson?.error ?? 'Upload failed'); return }
      await fetch('/api/conversations/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          content: '',
          messageType: 'file',
          fileUrl: upJson.pathname,
          fileName: file.name,
        }),
      })
      await loadDmMessages(activeConversationId)
    } finally { setUploadingDm(false) }
  }

  // ---------- Friends ----------
  async function sendFriendRequest(userId: string) {
    const res = await fetch('/api/friends/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: userId }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Friend request failed')
      throw new Error(json?.error ?? 'failed')
    }
    toast.success('Friend request sent')
    loadFriends()
  }
  async function acceptFriendRequest(id: string) {
    const res = await fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id }),
    })
    if (!res.ok) { toast.error('Failed'); return }
    toast.success('Friend added')
    loadFriends()
  }
  async function declineFriendRequest(id: string) {
    const res = await fetch('/api/friends/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id }),
    })
    if (!res.ok) { toast.error('Failed'); return }
    loadFriends()
  }

  // ---------- Profile / sign out ----------
  async function saveProfile(update: ProfileUpdateInput) {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: update.displayName,
        avatarUrl: update.avatarUrl,
        bio: update.bio,
        bannerUrl: update.bannerUrl ?? update.banner_url,
        accentColor: update.accentColor ?? update.accent_color,
        presenceStatus: update.presenceStatus ?? update.presence_status,
        customStatus: update.customStatus ?? update.custom_status,
      }),
    })
    if (!res.ok) { toast.error('Could not save profile'); return }
    const json = await res.json()
    if (json.profile) setProfile(json.profile)
    setAllProfiles((prev) => prev.map((p) => (p.id === currentUserId
      ? { ...p, display_name: json.profile.display_name, avatar_url: json.profile.avatar_url } : p)))
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // ============================================================
  //  RENDER
  // ============================================================

  const onHome = activeGroupId === null
  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null
  const otherDmUser = activeConversation
    ? activeConversation.participants.find((p) => p.id !== currentUserId) ?? null
    : null
  const conversationLabel = activeConversation?.name
    ?? otherDmUser?.display_name
    ?? 'Direct Message'

  return (
    <div className="ds-app h-screen flex bg-ds-bg-tertiary text-ds-text-normal overflow-hidden">
      <ServerRail
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={(id) => {
          setActiveGroupId(id)
          if (id !== null) { setActiveConversationId(null); setFriendsView(false) }
        }}
        onCreateServer={() => setOpenCreateServer(true)}
        onJoinServer={() => setOpenJoinServer(true)}
      />

      <div className="w-60 flex flex-col">
        {onHome ? (
          <HomeSidebar
            currentUserId={currentUserId}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => { setActiveConversationId(id); setFriendsView(false) }}
            onSelectFriendsView={() => { setFriendsView(true); setActiveConversationId(null) }}
            friendsViewActive={friendsView}
          />
        ) : activeGroup ? (
          <ChannelSidebar
            group={activeGroup}
            role={myRole}
            channels={channels}
            categories={categories}
            voiceParticipants={voiceParticipants}
            activeChannelId={activeChannelId}
            onSelectChannel={selectChannel}
            onCreateChannel={(catId, kind) => setCreateChannelState({ categoryId: catId, kind: kind ?? 'text' })}
            onCreateCategory={() => toast.info('Create-category dialog coming soon — use channels for now.')}
            onOpenInvite={() => setOpenInvite(true)}
            onOpenServerSettings={() => setOpenServerSettings(true)}
            onLeaveServer={() => setConfirmDelete({ kind: 'leave-server' })}
            onDeleteServer={() => setConfirmDelete({ kind: 'server' })}
            onEditChannel={setEditChannel}
            onDeleteChannel={(ch) => setConfirmDelete({ kind: 'channel', payload: ch })}
          />
        ) : (
          <div className="flex-1 bg-ds-bg-secondary" />
        )}
        <UserPanel
          displayName={profile.display_name}
          email={email}
          avatarUrl={profile.avatar_url}
          status={profile.presence_status}
          customStatus={profile.custom_status}
          voiceChannelName={activeVoiceChannel?.name ?? null}
          voiceMuted={voiceMuted}
          voiceDeafened={voiceDeafened}
          onToggleMute={toggleVoiceMute}
          onToggleDeafen={toggleVoiceDeafen}
          onOpenSettings={() => setOpenUserSettings(true)}
          onDisconnectVoice={activeVoiceChannelId ? leaveVoice : undefined}
        />
      </div>

      {onHome ? (
        activeConversationId ? (
          <DmView
            conversationId={activeConversationId}
            otherUser={otherDmUser}
            conversationName={conversationLabel}
            messages={dmMessages}
            currentUserId={currentUserId}
            onSend={sendDm}
            onUploadAndSend={uploadAndSendDm}
            uploading={uploadingDm}
          />
        ) : (
          <HomePanel
            currentUserId={currentUserId}
            friends={friends}
            friendRequests={friendRequests}
            allProfiles={allProfiles}
            onSendFriendRequest={sendFriendRequest}
            onAcceptFriendRequest={acceptFriendRequest}
            onDeclineFriendRequest={declineFriendRequest}
            onMessageFriend={openDmWith}
          />
        )
      ) : activeChannel ? (
        <>
          <ChatView
            channel={activeChannel}
            messages={messages}
            pinnedMessages={pinned}
            channels={channels}
            members={members}
            currentUserId={currentUserId}
            myRole={myRole}
            showMembers={showMembers}
            onToggleMembers={() => setShowMembers((v) => !v)}
            onSend={sendMessage}
            onEdit={editMessage}
            onDelete={(id) => setConfirmDelete({ kind: 'message', payload: id })}
            onTogglePin={togglePin}
            onReact={react}
            onSelectChannel={selectChannel}
          />
          {showMembers && (
            <MemberSidebar
              members={members}
              currentUserId={currentUserId}
              myRole={myRole}
              onMessageMember={openDmWith}
              onPromote={(id) => changeMemberRole(id, 'admin')}
              onDemote={(id) => changeMemberRole(id, 'member')}
              onKick={(id) => setConfirmDelete({ kind: 'kick', payload: id })}
            />
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-ds-bg-primary text-ds-text-muted">
          <p>Select a channel to start chatting</p>
        </div>
      )}

      <Toaster theme="dark" position="bottom-right" richColors />

      {/* Dialogs */}
      <CreateServerDialog
        open={openCreateServer}
        onOpenChange={setOpenCreateServer}
        onCreate={createServer}
      />
      <JoinServerDialog
        open={openJoinServer}
        onOpenChange={setOpenJoinServer}
        onJoin={joinByInvite}
      />
      {activeGroup && (
        <>
          <InviteDialog
            open={openInvite}
            onOpenChange={setOpenInvite}
            groupId={activeGroup.id}
            groupName={activeGroup.name}
          />
          <ServerSettingsDialog
            open={openServerSettings}
            onOpenChange={setOpenServerSettings}
            group={activeGroup}
            onSave={saveServerSettings}
          />
          <CreateChannelDialog
            open={createChannelState !== null}
            onOpenChange={(v) => !v && setCreateChannelState(null)}
            groupId={activeGroup.id}
            defaultCategoryId={createChannelState?.categoryId ?? null}
            defaultKind={createChannelState?.kind ?? 'text'}
            categories={categories}
            onCreate={createChannel}
          />
        </>
      )}
      <EditChannelDialog
        open={editChannel !== null}
        onOpenChange={(v) => !v && setEditChannel(null)}
        channel={editChannel}
        onSave={saveChannel}
      />
      <UserSettingsDialog
        open={openUserSettings}
        onOpenChange={setOpenUserSettings}
        profile={profile}
        email={email}
        onSave={saveProfile}
        onSignOut={signOut}
      />

      {/* Confirmations */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-ds-bg-secondary border-black/30 text-ds-text-normal">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.kind === 'server' ? `Delete ${activeGroup?.name}?`
                : confirmDelete?.kind === 'leave-server' ? `Leave ${activeGroup?.name}?`
                : confirmDelete?.kind === 'channel' ? `Delete #${(confirmDelete.payload as MiniChannel)?.name}?`
                : confirmDelete?.kind === 'message' ? 'Delete this message?'
                : confirmDelete?.kind === 'kick' ? 'Kick this member?'
                : 'Confirm'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ds-text-muted">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-ds-text-normal hover:bg-ds-bg-modifier-hover border-ds-divider">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-ds-dnd hover:bg-ds-dnd/80 text-white"
              onClick={async () => {
                const c = confirmDelete
                setConfirmDelete(null)
                if (!c) return
                if (c.kind === 'server') await deleteServer()
                else if (c.kind === 'leave-server') await leaveServer()
                else if (c.kind === 'channel') await deleteChannel(c.payload as MiniChannel)
                else if (c.kind === 'message') await deleteMessage(c.payload as string)
                else if (c.kind === 'kick') await kickMember(c.payload as string)
              }}
            >
              {confirmDelete?.kind === 'leave-server' ? 'Leave' : confirmDelete?.kind === 'kick' ? 'Kick' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
