"use client"

import * as React from 'react'
import {
  Reply, Pencil, Trash2, MoreHorizontal, Pin, Smile, Copy, Check,
} from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { Markdown, COMMON_EMOJIS } from '@/lib/mini-discord/markdown'
import { formatChatTime, formatRelative, formatFileSize, isImageType, isVideoType, isAudioType } from '@/lib/mini-discord/format'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { MiniMessage } from '@/types'

interface Props {
  message: MiniMessage
  currentUserId: string
  isAdmin: boolean
  grouped: boolean
  resolveMention: (userId: string) => string | undefined
  resolveChannel: (channelId: string) => string | undefined
  onReply: () => void
  onEdit: (newContent: string) => Promise<void>
  onDelete: () => void
  onTogglePin: () => void
  onReact: (emoji: string) => void
  onJumpToMessage?: (id: string) => void
  highlight?: boolean
}

export function Message({
  message, currentUserId, isAdmin, grouped,
  resolveMention, resolveChannel,
  onReply, onEdit, onDelete, onTogglePin, onReact, onJumpToMessage,
  highlight,
}: Props) {
  const isMine = message.sender_id === currentUserId
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(message.content)
  const [copied, setCopied] = React.useState(false)
  const [hover, setHover] = React.useState(false)

  React.useEffect(() => { setDraft(message.content) }, [message.content])

  async function saveEdit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === message.content) {
      setEditing(false)
      return
    }
    await onEdit(trimmed)
    setEditing(false)
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'group relative px-4 py-0.5 hover:bg-[rgba(4,4,5,0.07)] dark:hover:bg-[rgba(4,4,5,0.20)]',
        grouped ? 'mt-0' : 'mt-4',
        message.pinned && 'bg-[rgba(240,178,50,0.05)] hover:bg-[rgba(240,178,50,0.10)]',
        highlight && 'bg-ds-mention-bg',
      )}
    >
      {/* Reply preview */}
      {message.reply_to && (
        <div
          className="flex items-center gap-2 mb-1 ml-12 text-[13px] text-ds-text-muted hover:text-ds-text-normal cursor-pointer"
          onClick={() => message.reply_to && onJumpToMessage?.(message.reply_to.id)}
        >
          <div className="flex items-center gap-1">
            <span className="block w-6 h-2 border-l-2 border-t-2 border-ds-channel-default rounded-tl-md ml-2" />
            <UserAvatar
              size={16}
              name={message.reply_to.sender_display_name ?? 'User'}
              avatarUrl={message.reply_to.sender_avatar_url}
            />
            <span className="font-semibold">{message.reply_to.sender_display_name ?? 'User'}</span>
          </div>
          <span className="truncate">{message.reply_to.content || (message.reply_to.attachment_name ? `📎 ${message.reply_to.attachment_name}` : '')}</span>
        </div>
      )}

      <div className="flex gap-3">
        {grouped ? (
          <div className="w-10 shrink-0 flex justify-center">
            <span className="text-[10px] text-ds-text-muted opacity-0 group-hover:opacity-100 leading-[22px]">
              {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <UserAvatar
            size={40}
            name={message.sender_display_name ?? 'User'}
            avatarUrl={message.sender_avatar_url}
            status={message.sender_presence_status ?? 'offline'}
          />
        )}

        <div className="flex-1 min-w-0">
          {!grouped && (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-ds-interactive-active">
                {message.sender_display_name ?? 'User'}
              </span>
              <span
                className="text-[12px] text-ds-text-muted"
                title={formatRelative(message.created_at)}
              >
                {formatChatTime(message.created_at)}
              </span>
            </div>
          )}

          {editing ? (
            <div className="mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                }}
                className="w-full bg-ds-bg-tertiary text-ds-text-normal rounded-md px-3 py-2 outline-none resize-y min-h-[40px]"
                autoFocus
              />
              <div className="text-[11px] text-ds-text-muted mt-1">
                escape to <button className="text-ds-text-link" onClick={() => setEditing(false)}>cancel</button>
                {' • '}
                enter to <button className="text-ds-text-link" onClick={saveEdit}>save</button>
              </div>
            </div>
          ) : (
            <div className="text-[15px] text-ds-text-normal leading-[22px]">
              <Markdown
                text={message.content}
                ctx={{
                  resolveMention,
                  resolveChannel,
                }}
              />
              {message.edited_at && (
                <span className="text-[10px] text-ds-text-muted ml-1" title={`edited ${formatRelative(message.edited_at)}`}>(edited)</span>
              )}
            </div>
          )}

          {/* Attachment */}
          {message.attachment_url && (
            <Attachment
              url={message.attachment_url}
              name={message.attachment_name ?? 'attachment'}
              type={message.attachment_type ?? null}
              size={message.attachment_size_bytes ?? null}
            />
          )}

          {/* Reactions */}
          {(message.reactions ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(message.reactions ?? []).map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact(r.emoji)}
                  className={cn(
                    'h-7 px-2 rounded-md flex items-center gap-1 text-[13px] border',
                    r.mine
                      ? 'bg-[rgba(88,101,242,0.15)] border-ds-blurple text-ds-mention-fg'
                      : 'bg-ds-bg-tertiary/60 border-transparent text-ds-text-normal hover:border-ds-text-muted',
                  )}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              ))}
              <ReactPickerButton onPick={onReact} compact />
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hover && !editing && (
        <div className="absolute -top-3 right-4 bg-ds-bg-floating border border-black/30 rounded-md shadow-lg flex">
          <ReactPickerButton onPick={onReact} />
          <ToolbarButton title="Reply" onClick={onReply}><Reply className="w-4 h-4" /></ToolbarButton>
          {isMine && (
            <ToolbarButton title="Edit" onClick={() => setEditing(true)}><Pencil className="w-4 h-4" /></ToolbarButton>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 px-2 text-ds-text-muted hover:text-ds-interactive-active hover:bg-ds-bg-modifier-hover">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-ds-bg-floating border-black/30 text-ds-text-normal">
              <DropdownMenuItem onClick={copyMessage}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={onTogglePin}>
                  <Pin className="w-4 h-4 mr-2" /> {message.pinned ? 'Unpin' : 'Pin'} Message
                </DropdownMenuItem>
              )}
              {(isMine || isAdmin) && (
                <DropdownMenuItem onClick={onDelete} className="text-ds-dnd focus:bg-ds-dnd focus:text-white">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

function ToolbarButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="h-8 px-2 text-ds-text-muted hover:text-ds-interactive-active hover:bg-ds-bg-modifier-hover"
    >
      {children}
    </button>
  )
}

function ReactPickerButton({ onPick, compact }: { onPick: (e: string) => void; compact?: boolean }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title="Add reaction"
          className={cn(
            'text-ds-text-muted hover:text-ds-interactive-active hover:bg-ds-bg-modifier-hover',
            compact ? 'h-7 w-7 rounded-md flex items-center justify-center' : 'h-8 px-2',
          )}
        >
          <Smile className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-[260px] p-2 bg-ds-bg-floating border-black/30 text-ds-text-normal"
      >
        <div className="grid grid-cols-8 gap-1 max-h-[220px] overflow-y-auto ds-scrollbar">
          {COMMON_EMOJIS.map(([alias, char]) => (
            <button
              key={alias}
              title={`:${alias}:`}
              onClick={() => { onPick(char); setOpen(false) }}
              className="w-7 h-7 rounded hover:bg-ds-bg-modifier-hover text-lg leading-none"
            >
              {char}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Attachment({
  url, name, type, size,
}: {
  url: string
  name: string
  type: string | null
  size: number | null
}) {
  const sizeLabel = formatFileSize(size)

  if (isImageType(type)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mt-2 max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          className="rounded-md max-h-[400px] object-contain bg-ds-bg-tertiary"
        />
      </a>
    )
  }
  if (isVideoType(type)) {
    return (
      <video src={url} controls className="rounded-md max-h-[400px] mt-2 max-w-md bg-black" />
    )
  }
  if (isAudioType(type)) {
    return <audio src={url} controls className="mt-2 max-w-md w-full" />
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-3 px-3 py-2 rounded-md bg-ds-bg-secondary-alt border border-ds-divider text-ds-text-link hover:underline max-w-md"
    >
      <span className="w-8 h-8 rounded bg-ds-bg-tertiary flex items-center justify-center">📎</span>
      <span className="flex-1 min-w-0">
        <span className="block truncate">{name}</span>
        {sizeLabel && <span className="block text-xs text-ds-text-muted">{sizeLabel}</span>}
      </span>
    </a>
  )
}
