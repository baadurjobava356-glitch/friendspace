"use client"

import * as React from 'react'
import {
  Hash, Users as UsersIcon, Bell, Pin, Inbox, HelpCircle, Search, Volume2,
} from 'lucide-react'
import { Message } from './message'
import { MessageComposer } from './message-composer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { shouldGroupMessages } from '@/lib/mini-discord/format'
import type { MiniChannel, MiniMessage, GroupRole, MiniGroupMemberWithProfile } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  channel: MiniChannel
  messages: MiniMessage[]
  pinnedMessages: MiniMessage[]
  channels: MiniChannel[]
  members: MiniGroupMemberWithProfile[]
  currentUserId: string
  myRole: GroupRole
  showMembers: boolean
  onToggleMembers: () => void
  onSend: (content: string, replyToId?: string | null, attachment?: { url: string; name: string; type?: string; sizeBytes?: number } | null) => Promise<void>
  onEdit: (messageId: string, content: string) => Promise<void>
  onDelete: (messageId: string) => void | Promise<void>
  onTogglePin: (messageId: string, pinned: boolean) => Promise<void>
  onReact: (messageId: string, emoji: string) => Promise<void>
  onSelectChannel: (id: string) => void
}

export function ChatView({
  channel, messages, pinnedMessages, channels, members,
  currentUserId, myRole,
  showMembers, onToggleMembers,
  onSend, onEdit, onDelete, onTogglePin, onReact, onSelectChannel,
}: Props) {
  const isAdmin = myRole === 'owner' || myRole === 'admin'
  const [reply, setReply] = React.useState<MiniMessage | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [highlight, setHighlight] = React.useState<string | null>(null)
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)
  const messageRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const lastChannelIdRef = React.useRef<string | null>(null)

  React.useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    if (lastChannelIdRef.current !== channel.id) {
      lastChannelIdRef.current = channel.id
      el.scrollTop = el.scrollHeight
      return
    }
    // Auto-scroll to bottom only if user was already near the bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 200) el.scrollTop = el.scrollHeight
  }, [messages, channel.id])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return messages
    const q = search.trim().toLowerCase()
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  }, [messages, search])

  const memberMap = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const x of members) m.set(x.user_id, x.display_name ?? 'User')
    return m
  }, [members])

  const channelMap = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const c of channels) m.set(c.id, c.name)
    return m
  }, [channels])

  async function handleSend(content: string) {
    await onSend(content, reply?.id ?? null, null)
    setReply(null)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = (await res.json().catch(() => null)) as { pathname?: string; error?: string } | null
      if (!res.ok || !json?.pathname) {
        alert(json?.error ?? 'Upload failed')
        return
      }
      await onSend('', reply?.id ?? null, {
        url: json.pathname,
        name: file.name,
        type: file.type,
        sizeBytes: file.size,
      })
      setReply(null)
    } finally {
      setUploading(false)
    }
  }

  function jumpToMessage(id: string) {
    const node = messageRefs.current[id]
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlight(id)
      setTimeout(() => setHighlight((h) => (h === id ? null : h)), 1500)
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex-1 flex flex-col min-w-0 bg-ds-bg-primary">
        <header className="h-12 px-4 flex items-center gap-3 border-b border-ds-divider/60">
          {channel.kind === 'voice' ? (
            <Volume2 className="w-5 h-5 text-ds-channel-icon shrink-0" />
          ) : (
            <Hash className="w-5 h-5 text-ds-channel-icon shrink-0" />
          )}
          <span className="font-semibold text-[15px] text-ds-interactive-active truncate tracking-tight">{channel.name}</span>
          {channel.topic && (
            <>
              <span className="w-px h-5 bg-ds-divider" />
              <span className="text-[13px] text-ds-text-muted truncate">{channel.topic}</span>
            </>
          )}

          <div className="ml-auto flex items-center gap-3 text-ds-channel-default">
            <Popover>
              <PopoverTrigger asChild>
                <button title="Pinned Messages" className="hover:text-ds-interactive-active">
                  <Pin className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[420px] p-0 bg-ds-bg-floating border-black/30 text-ds-text-normal">
                <div className="px-4 h-12 border-b border-black/30 flex items-center font-bold">Pinned Messages</div>
                <div className="max-h-[60vh] overflow-y-auto ds-scrollbar p-2">
                  {pinnedMessages.length === 0 ? (
                    <div className="p-6 text-center text-ds-text-muted text-sm">
                      This channel doesn&apos;t have any pinned messages... yet.
                    </div>
                  ) : (
                    pinnedMessages.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-md p-2 mb-2 bg-ds-bg-secondary-alt cursor-pointer hover:bg-ds-bg-modifier-hover"
                        onClick={() => jumpToMessage(m.id)}
                      >
                        <div className="text-[13px] font-semibold">{m.sender_display_name ?? 'User'}</div>
                        <div className="text-[14px] truncate">{m.content || (m.attachment_name ? `📎 ${m.attachment_name}` : '')}</div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <button title="Notifications" className="hover:text-ds-interactive-active">
                  <Bell className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Notification Settings</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-[13px] hover:text-ds-interactive-active">
                  <Search className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 bg-ds-bg-floating border-black/30">
                <input
                  placeholder="Search this channel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-ds-bg-tertiary text-ds-text-normal rounded-md px-3 py-2 outline-none"
                />
                {search && (
                  <p className="text-[12px] text-ds-text-muted mt-2">
                    {filtered.length} match{filtered.length === 1 ? '' : 'es'}
                  </p>
                )}
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <button title="Inbox" className="hover:text-ds-interactive-active">
                  <Inbox className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Inbox</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  title="Member List"
                  onClick={onToggleMembers}
                  className={cn('hover:text-ds-interactive-active', showMembers && 'text-ds-interactive-active')}
                >
                  <UsersIcon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{showMembers ? 'Hide Member List' : 'Show Member List'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button title="Help" className="hover:text-ds-interactive-active">
                  <HelpCircle className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Help</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {channel.kind === 'voice' ? (
          <div className="flex-1 flex items-center justify-center text-ds-text-muted text-center px-6">
            <div>
              <Volume2 className="w-14 h-14 mx-auto mb-3 text-ds-blurple" />
              <h3 className="text-2xl font-bold text-ds-interactive-active mb-1">Voice connected</h3>
              <p className="text-sm">Use the voice controls in the user panel to mute, deafen, or disconnect.</p>
            </div>
          </div>
        ) : (
          <div ref={scrollerRef} className="flex-1 overflow-y-auto ds-scrollbar pb-4">
            <ChannelHero channel={channel} />
            {filtered.map((m, i) => {
              const grouped = shouldGroupMessages(filtered[i - 1] ?? null, m)
              return (
                <div
                  key={m.id}
                  ref={(el) => {
                    messageRefs.current[m.id] = el
                  }}
                  className="ds-fade-in"
                >
                  <Message
                    message={m}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    grouped={grouped}
                    resolveMention={(id) => memberMap.get(id)}
                    resolveChannel={(id) => channelMap.get(id)}
                    onReply={() => setReply(m)}
                    onEdit={(c) => onEdit(m.id, c)}
                    onDelete={() => onDelete(m.id)}
                    onTogglePin={() => onTogglePin(m.id, !m.pinned)}
                    onReact={(e) => onReact(m.id, e)}
                    onJumpToMessage={jumpToMessage}
                    highlight={highlight === m.id}
                  />
                </div>
              )
            })}
          </div>
        )}

        {channel.kind === 'text' && (
          <MessageComposer
            channelName={channel.name}
            replyingTo={reply}
            onCancelReply={() => setReply(null)}
            onSend={handleSend}
            onUploadAttachment={handleUpload}
            uploading={uploading}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

function ChannelHero({ channel }: { channel: MiniChannel }) {
  return (
    <div className="px-4 pt-10 pb-6">
      <div className="w-[72px] h-[72px] rounded-2xl bg-ds-blurple/15 flex items-center justify-center mb-5 ring-1 ring-ds-blurple/25">
        <Hash className="w-10 h-10 text-ds-blurple" />
      </div>
      <h2 className="text-[26px] font-bold text-ds-interactive-active tracking-tight">
        Welcome to #{channel.name}
      </h2>
      <p className="text-ds-text-muted mt-1.5 text-[15px] leading-relaxed">
        {channel.topic ? channel.topic : `This is the start of the #${channel.name} channel.`}
      </p>
    </div>
  )
}
