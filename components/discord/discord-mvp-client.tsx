"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { MiniChannel, MiniGroup, MiniMessage } from "@/types"

type GroupMembership = { role: string; group: MiniGroup }

interface Props {
  currentUserId: string
  initialGroups: GroupMembership[]
}

export function DiscordMvpClient({ currentUserId, initialGroups }: Props) {
  const [groups, setGroups] = useState<GroupMembership[]>(initialGroups)
  const [activeGroupId, setActiveGroupId] = useState(initialGroups[0]?.group.id ?? "")
  const [channels, setChannels] = useState<MiniChannel[]>([])
  const [activeChannelId, setActiveChannelId] = useState("")
  const [messages, setMessages] = useState<MiniMessage[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [groupName, setGroupName] = useState("")
  const [inviteCodeInput, setInviteCodeInput] = useState("")
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const [voiceRoom, setVoiceRoom] = useState("")
  const [voiceStatus, setVoiceStatus] = useState<string>("Disconnected")
  const [uploadingFile, setUploadingFile] = useState(false)
  const [chatError, setChatError] = useState("")
  const screenTrackRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshGroups = useCallback(async () => {
    const res = await fetch("/api/groups/list")
    const json = await res.json()
    if (res.ok) {
      setGroups(json.groups ?? [])
      if (json.groups?.[0]?.group?.id) {
        setActiveGroupId((prev: string) => prev || json.groups[0].group.id)
      }
    }
  }, [])

  useEffect(() => {
    refreshGroups()
  }, [refreshGroups])

  useEffect(() => {
    if (!activeGroupId) return
    fetch(`/api/channels/list?groupId=${activeGroupId}`)
      .then((r) => r.json())
      .then((json) => {
        const nextChannels = json.channels ?? []
        setChannels(nextChannels)
        if (!activeChannelId) {
          const firstText = nextChannels.find((c: MiniChannel) => c.kind === "text")
          setActiveChannelId(firstText?.id ?? "")
        }
      })
  }, [activeGroupId, activeChannelId])

  useEffect(() => {
    if (!activeChannelId) return
    const loadMessages = () => {
      fetch(`/api/channels/messages?channelId=${activeChannelId}`)
        .then((r) => r.json())
        .then((json) => setMessages(json.messages ?? []))
    }
    loadMessages()
    const timer = setInterval(loadMessages, 2500)
    return () => clearInterval(timer)
  }, [activeChannelId])

  useEffect(() => {
    if (!activeGroupId) return
    const heartbeat = () =>
      fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: activeGroupId, channelId: activeChannelId || null }),
      })

    const loadPresence = () =>
      fetch(`/api/presence/heartbeat?groupId=${activeGroupId}`)
        .then((r) => r.json())
        .then((json) => setOnlineUserIds(json.onlineUserIds ?? []))

    heartbeat()
    loadPresence()
    const hb = setInterval(heartbeat, 30000)
    const prs = setInterval(loadPresence, 5000)
    return () => {
      clearInterval(hb)
      clearInterval(prs)
    }
  }, [activeGroupId, activeChannelId])

  const activeGroup = useMemo(
    () => groups.find((g) => g.group.id === activeGroupId)?.group ?? null,
    [groups, activeGroupId],
  )

  async function createGroup() {
    if (!groupName.trim()) return
    const res = await fetch("/api/groups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    })
    if (!res.ok) return
    setGroupName("")
    await refreshGroups()
  }

  async function joinByInvite() {
    if (!inviteCodeInput.trim()) return
    const res = await fetch("/api/invites/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCodeInput.trim() }),
    })
    if (!res.ok) return
    setInviteCodeInput("")
    await refreshGroups()
  }

  async function sendMessage() {
    if (!activeChannelId || !messageInput.trim()) return
    setChatError("")
    const content = messageInput.trim()
    setMessageInput("")
    const sent = await fetch("/api/channels/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: activeChannelId, content }),
    })
    if (!sent.ok) {
      setChatError("Failed to send message")
      return
    }
    const refreshed = await fetch(`/api/channels/messages?channelId=${activeChannelId}`)
    const json = await refreshed.json()
    setMessages(json.messages ?? [])
  }

  async function deleteMessage(messageId: string) {
    const res = await fetch(`/api/channels/messages?messageId=${encodeURIComponent(messageId)}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      setChatError("Could not delete this message")
      return
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  async function uploadAndSend(file: File) {
    if (!activeChannelId) return
    setUploadingFile(true)
    setChatError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = await uploadRes.json().catch(() => null) as { pathname?: string; error?: string } | null
      if (!uploadRes.ok || !uploadJson?.pathname) {
        setChatError(uploadJson?.error || "File upload failed")
        return
      }

      const msgRes = await fetch("/api/channels/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChannelId,
          content: `Shared file: ${file.name} ${uploadJson.pathname}`,
        }),
      })
      if (!msgRes.ok) {
        setChatError("File uploaded but message failed to send")
        return
      }
      const refreshed = await fetch(`/api/channels/messages?channelId=${activeChannelId}`)
      const json = await refreshed.json()
      setMessages(json.messages ?? [])
    } finally {
      setUploadingFile(false)
    }
  }

  async function joinVoice() {
    const selectedVoice = channels.find((c) => c.kind === "voice")
    if (!selectedVoice) return
    setVoiceStatus("Connecting...")
    const res = await fetch("/api/voice/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName: `${activeGroup?.slug}-${selectedVoice.name}` }),
    })
    if (!res.ok) {
      setVoiceStatus("Voice unavailable (configure LiveKit env)")
      return
    }
    setVoiceRoom(`${activeGroup?.name} / ${selectedVoice.name}`)
    setVoiceStatus("Connected (token issued)")
  }

  function leaveVoice() {
    setVoiceRoom("")
    setVoiceStatus("Disconnected")
  }

  async function startScreenShare() {
    if (!navigator.mediaDevices?.getDisplayMedia) return
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    screenTrackRef.current = stream
    setVoiceStatus((prev) => `${prev} + Sharing screen`)
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      stopScreenShare()
    })
  }

  function stopScreenShare() {
    screenTrackRef.current?.getTracks().forEach((t) => t.stop())
    screenTrackRef.current = null
    setVoiceStatus((prev) => prev.replace(" + Sharing screen", ""))
  }

  return (
    <div className="h-[calc(100vh-2rem)] p-4 flex gap-4">
      <div className="w-72 border rounded-lg p-3 flex flex-col gap-3">
        <h2 className="font-semibold">Mini Discord MVP</h2>
        <div className="space-y-2">
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="New group name" />
          <Button className="w-full" onClick={createGroup}>Create group</Button>
        </div>
        <div className="space-y-2">
          <Input value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} placeholder="Invite code" />
          <Button variant="secondary" className="w-full" onClick={joinByInvite}>Join by invite</Button>
        </div>
        <ScrollArea className="flex-1 border rounded-md p-2">
          <div className="space-y-1">
            {groups.map((g) => (
              <button
                key={g.group.id}
                className={`w-full text-left px-2 py-1.5 rounded ${activeGroupId === g.group.id ? "bg-primary/15" : "hover:bg-muted"}`}
                onClick={() => {
                  setActiveGroupId(g.group.id)
                  setActiveChannelId("")
                }}
              >
                <p className="text-sm font-medium">{g.group.name}</p>
                <p className="text-xs text-muted-foreground">{g.role}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="w-72 border rounded-lg p-3 flex flex-col gap-3">
        <h3 className="font-semibold">Channels</h3>
        <div className="text-xs text-muted-foreground">
          {activeGroup ? `${activeGroup.name} · ${onlineUserIds.length} online` : "No group selected"}
        </div>
        <ScrollArea className="flex-1 border rounded-md p-2">
          <div className="space-y-1">
            {channels.map((ch) => (
              <button
                key={ch.id}
                className={`w-full text-left px-2 py-1.5 rounded ${activeChannelId === ch.id ? "bg-primary/15" : "hover:bg-muted"}`}
                onClick={() => setActiveChannelId(ch.id)}
              >
                <p className="text-sm">{ch.kind === "text" ? "#" : "🔊"} {ch.name}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Voice: {voiceRoom || "none"}</p>
          <p className="text-xs text-muted-foreground">{voiceStatus}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={joinVoice}>Join voice</Button>
            <Button size="sm" variant="outline" onClick={leaveVoice}>Leave</Button>
            <Button size="sm" variant="secondary" onClick={startScreenShare}>Share screen</Button>
            <Button size="sm" variant="outline" onClick={stopScreenShare}>Stop share</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 border rounded-lg p-3 flex flex-col gap-3">
        <h3 className="font-semibold">Text chat</h3>
        <ScrollArea className="flex-1 border rounded-md p-3">
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={`group max-w-[75%] rounded-lg px-3 py-2 ${m.sender_id === currentUserId ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"}`}>
                <p className="text-sm">{m.content}</p>
                {m.sender_id === currentUserId && (
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={() => deleteMessage(m.id)}
                      className="text-[10px] opacity-70 hover:opacity-100 underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAndSend(file)
              e.currentTarget.value = ""
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!activeChannelId || uploadingFile}>
            {uploadingFile ? "Uploading..." : "Attach"}
          </Button>
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
        {chatError && <p className="text-xs text-destructive">{chatError}</p>}
      </div>
    </div>
  )
}
