"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Plus, Send, Users, MessageCircle, Search, PhoneOff,
  Mic, MicOff, Volume2, VolumeX, Check, CheckCheck, Hash, PhoneCall,
  Monitor, MonitorOff, Paperclip, X, Trash2, CornerUpLeft, PhoneIncoming,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useConversationStore } from "@/store/conversation-store"
import { useVoiceStore } from "@/store/voice-store"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"
import { useVoiceChannel } from "@/hooks/use-voice-channel"
import type { Conversation, Profile, Message, VoiceChannel } from "@/types"

interface MessagesClientProps {
  currentUserId: string
  initialConversations: Conversation[]
  allProfiles: Profile[]
  initialSelectedConversationId?: string | null
  initialAutoCall?: boolean
}

interface IncomingCallInvite {
  fromUserId: string
  fromName: string
  conversationId: string
  channelId: string
  channelName: string
}

interface MessageContextMenuState {
  message: Message
  x: number
  y: number
}

const DEFAULT_VOICE_CHANNELS: VoiceChannel[] = [
  { id: "vc-general", name: "General" },
  { id: "vc-gaming", name: "Gaming" },
  { id: "vc-chill", name: "Chill Zone" },
]

export function MessagesClient({
  currentUserId,
  initialConversations,
  allProfiles,
  initialSelectedConversationId,
  initialAutoCall = false,
}: MessagesClientProps) {
  const supabase = createClient()

  const {
    conversations, selectedConversation, messages,
    setConversations, addConversation, setSelectedConversation,
    addMessage, replaceOptimisticMessage, removeMessage, updateConversationTimestamp,
  } = useConversationStore()
  const voice = useVoiceStore()

  const [newMessage, setNewMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCallInvite | null>(null)
  const [ringingConversationIds, setRingingConversationIds] = useState<string[]>([])
  const [messageContextMenu, setMessageContextMenu] = useState<MessageContextMenuState | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesViewportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rootLayoutRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const sidebarScrollRef = useRef<HTMLDivElement>(null)
  const sidebarVoiceMiniRef = useRef<HTMLDivElement>(null)
  const mainPanelRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLFormElement>(null)
  const rightVoicePanelRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const autoCallTriggeredRef = useRef(false)
  const incomingCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!initialized.current) {
      setConversations(initialConversations)
      if (initialSelectedConversationId) {
        const selected = initialConversations.find((c) => c.id === initialSelectedConversationId) ?? null
        if (selected) setSelectedConversation(selected)
      }
      initialized.current = true
    }
  }, [initialConversations, initialSelectedConversationId, setConversations, setSelectedConversation])

  useEffect(() => {
    const end = messagesEndRef.current
    if (!end) return
    const viewport = messagesViewportRef.current
      ?? (end.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null)
    if (!viewport) {
      end.scrollIntoView({ behavior: "smooth" })
      return
    }
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    const isNearBottom = distanceFromBottom < 120
    if (isNearBottom) {
      end.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    if (!messageContextMenu) return

    const handleClose = () => setMessageContextMenu(null)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMessageContextMenu(null)
    }

    window.addEventListener("click", handleClose)
    window.addEventListener("scroll", handleClose, true)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("click", handleClose)
      window.removeEventListener("scroll", handleClose, true)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [messageContextMenu])

  useEffect(() => {
    const channel = supabase
      .channel(`pm-call:${currentUserId}`)
      .on("broadcast", { event: "incoming-call" }, ({ payload }) => {
        const invite = payload as IncomingCallInvite
        if (!invite || invite.fromUserId === currentUserId) return
        setIncomingCall(invite)
        setRingingConversationIds((prev) =>
          prev.includes(invite.conversationId) ? prev : [...prev, invite.conversationId],
        )
      })
      .subscribe()

    return () => {
      if (incomingCallTimeoutRef.current) {
        clearTimeout(incomingCallTimeoutRef.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase])

  const { loadOlderMessages, hasOlderMessages, isLoadingOlder } = useRealtimeMessages(selectedConversation?.id, currentUserId)

  useEffect(() => {
    if (!selectedConversation) return
    const viewport = messagesViewportRef.current
    if (!viewport) return

    const onScroll = () => {
      if (viewport.scrollTop <= 40 && hasOlderMessages && !isLoadingOlder) {
        const previousHeight = viewport.scrollHeight
        void loadOlderMessages().then(() => {
          requestAnimationFrame(() => {
            const newHeight = viewport.scrollHeight
            viewport.scrollTop += newHeight - previousHeight
          })
        })
      }
    }

    viewport.addEventListener("scroll", onScroll)
    return () => viewport.removeEventListener("scroll", onScroll)
  }, [selectedConversation, hasOlderMessages, isLoadingOlder, loadOlderMessages])

  const getDisplayName = useCallback(
    (id: string) => allProfiles.find((p) => p.id === id)?.display_name ?? "Unknown",
    [allProfiles]
  )

  const {
    joinVoiceChannel, leaveVoiceChannel, toggleMute, toggleDeafen, toggleScreenShare,
    getRemoteScreenStream, getLocalScreenStream, screenShareVersion,
  } =
    useVoiceChannel(currentUserId, getDisplayName)

  const getConversationName = useCallback((conv: Conversation) => {
    if (conv.name) return conv.name
    const other = conv.conversation_participants.find((p) => p.user_id !== currentUserId)
    return allProfiles.find((p) => p.id === other?.user_id)?.display_name || "Unknown"
  }, [allProfiles, currentUserId])

  function getProfileById(id: string) {
    return allProfiles.find((p) => p.id === id)
  }

  const getPrivateCallChannel = useCallback((conv: Conversation): VoiceChannel => {
    const label = conv.is_group ? conv.name || "Group" : getConversationName(conv)
    return {
      id: `vc-conv-${conv.id}`,
      name: `${label} Call`,
    }
  }, [getConversationName])

  async function notifyPrivateCall(conv: Conversation, channel: VoiceChannel) {
    const targets = conv.conversation_participants
      .map((p) => p.user_id)
      .filter((id) => id !== currentUserId)

    await Promise.all(targets.map(async (targetUserId) => {
      const callChannel = supabase.channel(`pm-call:${targetUserId}`)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 1200)
        callChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timeout)
            resolve()
          }
        })
      })
      await callChannel.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          fromUserId: currentUserId,
          fromName: getDisplayName(currentUserId),
          conversationId: conv.id,
          channelId: channel.id,
          channelName: channel.name,
        } satisfies IncomingCallInvite,
      })
      void supabase.removeChannel(callChannel)
    }))
  }

  function getMessageStatus(message: Message): "sending" | "sent" | "delivered" | "read" {
    if (message.id.startsWith("temp-")) return "sending"
    if (!selectedConversation) return "sent"
    const others = selectedConversation.conversation_participants.filter((p) => p.user_id !== currentUserId)
    const allRead = others.every((p) => p.last_read_at && p.last_read_at > message.created_at)
    return allRead ? "read" : "delivered"
  }

  function isImageAttachment(message: Message) {
    if (message.message_type !== "file" || !message.file_url) return false
    const value = `${message.file_name ?? ""} ${message.file_url}`.toLowerCase()
    return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) => value.includes(ext))
  }

  function renderTextWithLinks(text: string, isOwn: boolean) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, idx) => {
      if (!part) return null
      if (/^https?:\/\//.test(part)) {
        return (
          <a
            key={`${part}-${idx}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "underline underline-offset-2 break-all",
              isOwn ? "text-primary-foreground/90" : "text-primary",
            )}
          >
            {part}
          </a>
        )
      }
      return <span key={`${idx}-${part}`}>{part}</span>
    })
  }

  async function createConversation() {
    if (selectedUsers.length === 0) return
    if (selectedUsers.length === 1) {
      const response = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: selectedUsers[0] }),
      })
      const json = await response.json().catch(() => null) as { conversation?: Conversation } | null
      if (response.ok && json?.conversation) {
        addConversation(json.conversation)
        setSelectedConversation(json.conversation)
      }
      setIsCreating(false)
      setSelectedUsers([])
      setGroupName("")
      return
    }

    const isGroup = selectedUsers.length > 1
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({ name: isGroup ? groupName || "New Group" : null, is_group: isGroup, created_by: currentUserId })
      .select().single()
    if (error || !conversation) return
    const participants = [currentUserId, ...selectedUsers].map((userId) => ({
      conversation_id: conversation.id, user_id: userId, is_admin: userId === currentUserId,
    }))
    await supabase.from("conversation_participants").insert(participants)
    const newConv = { ...conversation, conversation_participants: participants } as Conversation
    addConversation(newConv)
    setSelectedConversation(newConv)
    setIsCreating(false)
    setSelectedUsers([])
    setGroupName("")
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedConversation) return
    if (!newMessage.trim() && !selectedFile) return
    setSendError(null)
    const content = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    let uploadedPath: string | null = null
    let uploadedName: string | null = null

    if (selectedFile) {
      const formData = new FormData()
      formData.append("file", selectedFile)
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = await uploadResponse.json().catch(() => ({}))
      if (!uploadResponse.ok || !uploadJson?.pathname) {
        setSendError((uploadJson?.error as string | undefined) ?? "Upload failed. Please try again.")
        return
      }
      uploadedPath = uploadJson.pathname as string
      uploadedName = selectedFile.name
    }

    const messageContent = content || (uploadedName ? `Shared a file: ${uploadedName}` : "")
    const messageType = uploadedPath ? "file" : "text"
    const optimistic: Message = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: currentUserId,
      content: messageContent,
      message_type: messageType,
      file_url: uploadedPath,
      file_name: uploadedName,
      reply_to_id: replyingTo?.id ?? null,
      is_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    addMessage(optimistic)
    setNewMessage("")
    setSelectedFile(null)
    setReplyingTo(null)
    const response = await fetch("/api/conversations/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: selectedConversation.id,
        content: messageContent,
        messageType,
        fileUrl: uploadedPath,
        fileName: uploadedName,
        replyToId: replyingTo?.id ?? null,
      }),
    })
    const json = await response.json().catch(() => null) as { message?: Message } | null
    const data = json?.message
    const error = response.ok ? null : new Error("Failed to send")

    if (!error && data) {
      replaceOptimisticMessage(tempId, data)
      updateConversationTimestamp(selectedConversation.id)
    } else {
      removeMessage(tempId)
      setNewMessage(messageContent)
      setSendError((json as { error?: string } | null)?.error ?? "Failed to send message")
    }
  }

  async function deleteMessage(messageId: string) {
    if (!selectedConversation) return
    const response = await fetch(
      `/api/conversations/messages?conversationId=${encodeURIComponent(selectedConversation.id)}&messageId=${encodeURIComponent(messageId)}`,
      { method: "DELETE" },
    )
    if (response.ok) {
      removeMessage(messageId)
    }
  }

  const filteredProfiles = allProfiles.filter(
    (p) => p.id !== currentUserId &&
      (p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery)
  )

  useEffect(() => {
    if (!selectedConversation || !initialAutoCall || autoCallTriggeredRef.current) return
    autoCallTriggeredRef.current = true
    void joinVoiceChannel(getPrivateCallChannel(selectedConversation))
  }, [selectedConversation, initialAutoCall, joinVoiceChannel, getPrivateCallChannel])

  useEffect(() => {
    if (!incomingCall) return
    if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current)
    incomingCallTimeoutRef.current = setTimeout(() => {
      setIncomingCall(null)
      setRingingConversationIds((prev) => prev.filter((id) => id !== incomingCall.conversationId))
    }, 30000)
    return () => {
      if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current)
    }
  }, [incomingCall])

  async function acceptIncomingCall() {
    if (!incomingCall) return
    const conv = conversations.find((c) => c.id === incomingCall.conversationId)
    if (conv) {
      setSelectedConversation(conv)
    }
    await joinVoiceChannel({ id: incomingCall.channelId, name: incomingCall.channelName })
    setRingingConversationIds((prev) => prev.filter((id) => id !== incomingCall.conversationId))
    setIncomingCall(null)
  }

  function dismissIncomingCall() {
    if (!incomingCall) return
    setRingingConversationIds((prev) => prev.filter((id) => id !== incomingCall.conversationId))
    setIncomingCall(null)
  }

  function handleMessageContextMenu(event: React.MouseEvent, message: Message) {
    event.preventDefault()
    setMessageContextMenu({
      message,
      x: event.clientX,
      y: event.clientY,
    })
  }

  return (
    <TooltipProvider>
      {incomingCall && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[320px] rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-full bg-amber-500 p-1 shadow-lg">
                  <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-card bg-amber-400 text-card">
                    <span className="text-3xl font-semibold">
                      {(incomingCall.fromName?.charAt(0) || "?").toUpperCase()}
                    </span>
                  </div>
                </div>
                <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
              </div>
              <p className="max-w-full truncate text-3xl font-semibold">{incomingCall.fromName}</p>
              <p className="mb-6 text-xl text-muted-foreground">Incoming Call...</p>
            </div>
            <div className="flex items-center justify-center gap-8">
              <Button
                type="button"
                onClick={dismissIncomingCall}
                className="h-16 w-16 rounded-full bg-red-500 p-0 text-white hover:bg-red-600"
              >
                <X className="h-7 w-7" />
              </Button>
              <Button
                type="button"
                onClick={acceptIncomingCall}
                className="h-16 w-16 rounded-full bg-green-500 p-0 text-white hover:bg-green-600"
              >
                <PhoneCall className="h-7 w-7" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {messageContextMenu && (
        <div
          className="fixed z-[90] min-w-36 rounded-md border bg-card p-1 shadow-xl"
          style={{ left: messageContextMenu.x, top: messageContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setReplyingTo(messageContextMenu.message)
              setMessageContextMenu(null)
            }}
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            Reply
          </button>
          {messageContextMenu.message.sender_id === currentUserId && !messageContextMenu.message.id.startsWith("temp-") && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              onClick={() => {
                void deleteMessage(messageContextMenu.message.id)
                setMessageContextMenu(null)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
      <div ref={rootLayoutRef} className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div ref={sidebarRef} className="w-72 border-r border-border flex flex-col bg-card shrink-0 min-h-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-lg">Messages</h2>
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost"><Plus className="w-4 h-4" /></Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Conversation</DialogTitle>
                    <DialogDescription>Select friends to start a conversation</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search friends..." value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                    {selectedUsers.length > 1 && (
                      <Input placeholder="Group name (optional)" value={groupName}
                        onChange={(e) => setGroupName(e.target.value)} />
                    )}
                    <ScrollArea className="h-64">
                      <div className="space-y-1">
                        {filteredProfiles.map((profile) => (
                          <button key={profile.id}
                            onClick={() => setSelectedUsers((prev) =>
                              prev.includes(profile.id) ? prev.filter((id) => id !== profile.id) : [...prev, profile.id]
                            )}
                            className={cn("w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                              selectedUsers.includes(profile.id) ? "bg-primary/10" : "hover:bg-muted")}
                          >
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {profile.display_name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              {profile.is_online && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">{profile.display_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{profile.is_online ? "Online" : "Offline"}</p>
                            </div>
                            {selectedUsers.includes(profile.id) && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button onClick={createConversation} disabled={selectedUsers.length === 0} className="w-full">
                      Start Conversation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div ref={sidebarScrollRef}>
            <div className="p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Start a chat with your friends</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button key={conv.id} onClick={() => setSelectedConversation(conv)}
                    className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                      selectedConversation?.id === conv.id ? "bg-primary/10" : "hover:bg-muted")}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {conv.is_group
                        ? <Users className="w-4 h-4 text-primary" />
                        : <span className="text-sm font-medium">{getConversationName(conv).charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{getConversationName(conv)}</p>
                      <p className="text-xs text-muted-foreground">
                        {conv.is_group ? `${conv.conversation_participants.length} members` : "Direct message"}
                      </p>
                    </div>
                    {ringingConversationIds.includes(conv.id) && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 border-green-500/50 text-green-600 dark:text-green-400">
                        Calling
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="p-2 pt-0">
              <div className="flex items-center gap-2 px-3 py-2">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Voice Channels</span>
              </div>
              {DEFAULT_VOICE_CHANNELS.map((channel) => (
                <button key={channel.id} onClick={() => joinVoiceChannel(channel)}
                  disabled={voice.isConnecting}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                    voice.activeChannel?.id === channel.id
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                >
                  <Volume2 className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{channel.name}</span>
                  {voice.activeChannel?.id === channel.id && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1 border-green-500/50 text-green-600 dark:text-green-400">
                      Live
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            </div>
          </ScrollArea>

          {voice.activeChannel && (
            <div ref={sidebarVoiceMiniRef} className="border-t border-border bg-muted/50 p-3 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 truncate">{voice.activeChannel.name}</p>
                    <p className="text-[10px] text-muted-foreground">Voice Connected · {voice.participants.length} online</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={leaveVoiceChannel}>
                  <PhoneOff className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant={voice.isMuted ? "destructive" : "ghost"} className="h-8 w-8" onClick={toggleMute}>
                      {voice.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{voice.isMuted ? "Unmute" : "Mute"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant={voice.isDeafened ? "destructive" : "ghost"} className="h-8 w-8" onClick={toggleDeafen}>
                      {voice.isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{voice.isDeafened ? "Undeafen" : "Deafen"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant={voice.isSharingScreen ? "secondary" : "ghost"} className="h-8 w-8" onClick={toggleScreenShare}>
                      {voice.isSharingScreen ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{voice.isSharingScreen ? "Stop sharing" : "Share screen"}</TooltipContent>
                </Tooltip>
                <div className="flex -space-x-2 ml-auto">
                  {voice.participants.slice(0, 4).map((p) => (
                    <Tooltip key={p.userId}>
                      <TooltipTrigger asChild>
                        <div className={cn("w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium border-2",
                          p.isSpeaking && !p.isMuted ? "border-green-500" : "border-card",
                          p.isMuted && "opacity-50")}>
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {p.displayName}
                        {p.isSharingScreen ? " (Sharing screen)" : ""}
                        {p.isMuted ? " (Muted)" : p.isSpeaking ? " (Speaking)" : ""}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main chat */}
        <div ref={mainPanelRef} className="flex-1 flex flex-col bg-background min-w-0 min-h-0 overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedConversation.is_group
                      ? <Users className="w-4 h-4 text-primary" />
                      : <span className="text-sm font-medium">{getConversationName(selectedConversation).charAt(0).toUpperCase()}</span>}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{getConversationName(selectedConversation)}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.is_group
                        ? `${selectedConversation.conversation_participants.length} members`
                        : "Online"}
                    </p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                      onClick={async () => {
                        if (!selectedConversation) return
                        const privateChannel = getPrivateCallChannel(selectedConversation)
                        await joinVoiceChannel(privateChannel)
                        await notifyPrivateCall(selectedConversation, privateChannel)
                      }}>
                      <PhoneCall className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start private call</TooltipContent>
                </Tooltip>
              </div>

              <div
                ref={messagesViewportRef}
                className="flex-1 overflow-y-scroll px-4 py-2 pr-3"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="space-y-0.5 pb-2 min-h-full">
                  {messages.map((message, index) => {
                    const isOwn = message.sender_id === currentUserId
                    const sender = getProfileById(message.sender_id)
                    const repliedMessage = message.reply_to_id
                      ? messages.find((m) => m.id === message.reply_to_id)
                      : null
                    const prevMsg = messages[index - 1]
                    const isGrouped = prevMsg && prevMsg.sender_id === message.sender_id &&
                      new Date(message.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000
                    const status = isOwn ? getMessageStatus(message) : null

                    return (
                      <div
                        key={message.id}
                        onContextMenu={(event) => handleMessageContextMenu(event, message)}
                        className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start", isGrouped ? "mt-0.5" : "mt-3")}
                      >
                        {!isOwn && (
                          <div className={cn("w-8 h-8 rounded-full shrink-0 mt-auto", isGrouped && "invisible")}>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {sender?.display_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                          </div>
                        )}
                        <div className={cn("max-w-[65%] flex flex-col", isOwn && "items-end")}>
                          {!isOwn && !isGrouped && selectedConversation.is_group && (
                            <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
                              {sender?.display_name || "Unknown"}
                            </p>
                          )}
                          <div
                            className={cn("rounded-2xl px-4 py-2 break-words relative group overflow-hidden",
                            isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
                            message.id.startsWith("temp-") && "opacity-60")}
                          >
                            {repliedMessage && (
                              <div className={cn(
                                "mb-2 rounded-lg border px-2 py-1 text-xs",
                                isOwn ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-background/60",
                              )}>
                                <p className="truncate opacity-80">
                                  Replying to {repliedMessage.sender_id === currentUserId ? "yourself" : (getProfileById(repliedMessage.sender_id)?.display_name || "message")}
                                </p>
                                <p className="truncate">
                                  {repliedMessage.content || repliedMessage.file_name || "Attachment"}
                                </p>
                              </div>
                            )}
                            <p className="text-sm leading-relaxed break-all whitespace-pre-wrap">
                              {renderTextWithLinks(message.content, isOwn)}
                            </p>
                            {message.message_type === "file" && message.file_url && (
                              <>
                                {isImageAttachment(message) && (
                                  <a
                                    href={message.file_url.startsWith("http")
                                      ? message.file_url
                                      : `/api/file?pathname=${encodeURIComponent(message.file_url)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 block"
                                  >
                                    <Image
                                      src={message.file_url.startsWith("http")
                                        ? message.file_url
                                        : `/api/file?pathname=${encodeURIComponent(message.file_url)}`}
                                      alt={message.file_name || "Uploaded image"}
                                      className="max-h-52 w-auto rounded-lg object-cover"
                                      width={320}
                                      height={208}
                                      loading="lazy"
                                      unoptimized
                                    />
                                  </a>
                                )}
                                <a
                                  href={message.file_url.startsWith("http")
                                    ? message.file_url
                                    : `/api/file?pathname=${encodeURIComponent(message.file_url)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "mt-2 inline-flex text-xs underline underline-offset-2",
                                    isOwn ? "text-primary-foreground/90" : "text-primary",
                                  )}
                                >
                                  {message.file_name || "Open attachment"}
                                </a>
                              </>
                            )}
                          </div>
                          <div className={cn("flex items-center gap-1 mt-0.5 px-1", isOwn && "flex-row-reverse")}>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(message.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                            {isOwn && (
                              <span className="text-muted-foreground">
                                {status === "sending" && <span className="text-[10px] opacity-50">···</span>}
                                {status === "sent" && <Check className="w-3 h-3" />}
                                {status === "delivered" && <CheckCheck className="w-3 h-3" />}
                                {status === "read" && <CheckCheck className="w-3 h-3 text-primary" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form ref={composerRef} onSubmit={sendMessage} className="p-4 border-t border-border bg-card shrink-0">
                {replyingTo && (
                  <div className="mb-2 flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium">Replying to {replyingTo.sender_id === currentUserId ? "yourself" : (getProfileById(replyingTo.sender_id)?.display_name || "message")}</p>
                      <p className="truncate text-muted-foreground">{replyingTo.content || replyingTo.file_name || "Attachment"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {selectedFile && (
                  <div className="mb-2 flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-xs">
                    <span className="truncate max-w-[85%]">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {sendError && (
                  <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {sendError}
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder={`Message ${getConversationName(selectedConversation)}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-muted/50 border-muted"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as React.FormEvent) }
                    }}
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() && !selectedFile}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="font-medium text-lg mb-1">Select a conversation</h3>
                <p className="text-sm">Choose a chat from the sidebar or join a voice channel</p>
              </div>
            </div>
          )}
        </div>

        {/* Voice participants panel */}
        {voice.activeChannel && voice.participants.length > 0 && (
          <div ref={rightVoicePanelRef} className="w-52 border-l border-border bg-card flex flex-col shrink-0">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">{voice.activeChannel.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {voice.participants.length} participant{voice.participants.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ScrollArea className="flex-1 p-2">
              {voice.participants.some((participant) => participant.isSharingScreen) && (
                <div className="mb-2 space-y-2">
                  {voice.participants
                    .filter((participant) => participant.isSharingScreen)
                    .map((participant) => (
                      <div key={`screen-${participant.userId}`} className="rounded-lg border overflow-hidden bg-black/80">
                        <video
                          autoPlay
                          playsInline
                          muted={participant.userId === currentUserId}
                          className="w-full h-24 object-cover"
                          ref={(el) => {
                            if (!el) return
                            const stream = participant.userId === currentUserId
                              ? getLocalScreenStream()
                              : getRemoteScreenStream(participant.userId)
                            if (stream && el.srcObject !== stream) {
                              el.srcObject = stream
                            }
                          }}
                          data-version={screenShareVersion}
                        />
                        <p className="px-2 py-1 text-[10px] text-muted-foreground bg-card">
                          {participant.userId === currentUserId ? "Your screen" : `${participant.displayName}'s screen`}
                        </p>
                      </div>
                    ))}
                </div>
              )}
              <div className="space-y-1">
                {voice.participants.map((participant) => (
                  <div key={participant.userId}
                    className={cn("flex items-center gap-2 p-2 rounded-lg transition-all",
                      participant.isSpeaking && !participant.isMuted ? "bg-green-500/10" : "hover:bg-muted")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all",
                      participant.isSpeaking && !participant.isMuted
                        ? "border-green-500 bg-green-500/10" : "border-transparent bg-primary/10")}>
                      {participant.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {participant.userId === currentUserId ? "You" : participant.displayName}
                      </p>
                      {participant.isSharingScreen && (
                        <p className="text-[10px] text-blue-500 truncate">Sharing screen</p>
                      )}
                    </div>
                    {participant.isMuted
                      ? <MicOff className="w-3 h-3 text-destructive shrink-0" />
                      : participant.isSpeaking
                      ? <Mic className="w-3 h-3 text-green-500 shrink-0" />
                      : <Mic className="w-3 h-3 text-muted-foreground/30 shrink-0" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
