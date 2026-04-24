"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
  Monitor, MonitorOff,
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
}

const DEFAULT_VOICE_CHANNELS: VoiceChannel[] = [
  { id: "vc-general", name: "General" },
  { id: "vc-gaming", name: "Gaming" },
  { id: "vc-chill", name: "Chill Zone" },
]

export function MessagesClient({ currentUserId, initialConversations, allProfiles }: MessagesClientProps) {
  const supabase = createClient()

  const {
    conversations, selectedConversation, messages, isTyping,
    setConversations, addConversation, setSelectedConversation,
    addMessage, replaceOptimisticMessage, removeMessage, updateConversationTimestamp,
  } = useConversationStore()
  const voice = useVoiceStore()

  const [newMessage, setNewMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      setConversations(initialConversations)
      initialized.current = true
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const { broadcastTyping } = useRealtimeMessages(selectedConversation?.id, currentUserId)

  const getDisplayName = useCallback(
    (id: string) => allProfiles.find((p) => p.id === id)?.display_name ?? "Unknown",
    [allProfiles]
  )

  const { joinVoiceChannel, leaveVoiceChannel, toggleMute, toggleDeafen, toggleScreenShare } =
    useVoiceChannel(currentUserId, getDisplayName)

  function getConversationName(conv: Conversation) {
    if (conv.name) return conv.name
    const other = conv.conversation_participants.find((p) => p.user_id !== currentUserId)
    return allProfiles.find((p) => p.id === other?.user_id)?.display_name || "Unknown"
  }

  function getProfileById(id: string) {
    return allProfiles.find((p) => p.id === id)
  }

  function getMessageStatus(message: Message): "sending" | "sent" | "delivered" | "read" {
    if (message.id.startsWith("temp-")) return "sending"
    if (!selectedConversation) return "sent"
    const others = selectedConversation.conversation_participants.filter((p) => p.user_id !== currentUserId)
    const allRead = others.every((p) => p.last_read_at && p.last_read_at > message.created_at)
    return allRead ? "read" : "delivered"
  }

  async function createConversation() {
    if (selectedUsers.length === 0) return
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
    if (!newMessage.trim() || !selectedConversation) return
    const content = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: currentUserId,
      content,
      message_type: "text",
      is_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    addMessage(optimistic)
    setNewMessage("")
    broadcastTyping(false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: selectedConversation.id, sender_id: currentUserId, content, message_type: "text" })
      .select().single()

    if (!error && data) {
      replaceOptimisticMessage(tempId, data as Message)
      updateConversationTimestamp(selectedConversation.id)
    } else {
      removeMessage(tempId)
      setNewMessage(content)
    }
  }

  function handleTyping(value: string) {
    setNewMessage(value)
    broadcastTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000)
  }

  const typingUsers = Object.entries(isTyping)
    .filter(([, v]) => v)
    .map(([uid]) => getProfileById(uid)?.display_name || "Someone")

  const filteredProfiles = allProfiles.filter(
    (p) => p.id !== currentUserId &&
      (p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery)
  )

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col bg-card shrink-0">
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

          <ScrollArea className="flex-1">
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
          </ScrollArea>

          {voice.activeChannel && (
            <div className="border-t border-border bg-muted/50 p-3">
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
        <div className="flex-1 flex flex-col bg-background min-w-0">
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
                      {typingUsers.length > 0 ? `${typingUsers[0]} is typing...` :
                        selectedConversation.is_group
                          ? `${selectedConversation.conversation_participants.length} members`
                          : "Online"}
                    </p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                      onClick={() => joinVoiceChannel(DEFAULT_VOICE_CHANNELS[0])}>
                      <PhoneCall className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Join voice channel</TooltipContent>
                </Tooltip>
              </div>

              <ScrollArea className="flex-1 px-4 py-2">
                <div className="space-y-0.5 pb-2">
                  {messages.map((message, index) => {
                    const isOwn = message.sender_id === currentUserId
                    const sender = getProfileById(message.sender_id)
                    const prevMsg = messages[index - 1]
                    const isGrouped = prevMsg && prevMsg.sender_id === message.sender_id &&
                      new Date(message.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000
                    const status = isOwn ? getMessageStatus(message) : null

                    return (
                      <div key={message.id} className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start", isGrouped ? "mt-0.5" : "mt-3")}>
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
                          <div className={cn("rounded-2xl px-4 py-2 break-words",
                            isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
                            message.id.startsWith("temp-") && "opacity-60")}>
                            <p className="text-sm leading-relaxed">{message.content}</p>
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

                  {typingUsers.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                        {typingUsers[0].charAt(0).toUpperCase()}
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <form onSubmit={sendMessage} className="p-4 border-t border-border bg-card shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder={`Message ${getConversationName(selectedConversation)}...`}
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    className="flex-1 bg-muted/50 border-muted"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as React.FormEvent) }
                    }}
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
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
          <div className="w-52 border-l border-border bg-card flex flex-col shrink-0">
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
