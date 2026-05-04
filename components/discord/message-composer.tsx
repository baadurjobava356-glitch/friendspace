"use client"

import * as React from 'react'
import { Plus, Send, Smile, Gift, Sticker, X } from 'lucide-react'
import { COMMON_EMOJIS } from '@/lib/mini-discord/markdown'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { MiniMessage } from '@/types'

interface Props {
  channelName: string
  disabled?: boolean
  replyingTo: MiniMessage | null
  onCancelReply: () => void
  onSend: (content: string) => Promise<void>
  onUploadAttachment: (file: File) => Promise<void>
  uploading: boolean
  onTyping?: () => void
}

export function MessageComposer({
  channelName, disabled, replyingTo, onCancelReply,
  onSend, onUploadAttachment, uploading, onTyping,
}: Props) {
  const [text, setText] = React.useState('')
  const taRef = React.useRef<HTMLTextAreaElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 240) + 'px'
  }, [text])

  async function submit() {
    const value = text.trim()
    if (!value || disabled) return
    setText('')
    await onSend(value)
  }

  function insertEmoji(emoji: string) {
    setText((prev) => prev + emoji)
    requestAnimationFrame(() => taRef.current?.focus())
  }

  return (
    <div className={cn('px-4 pb-6 pt-1', disabled && 'opacity-60')}>
      {replyingTo && (
        <div className="bg-ds-bg-secondary-alt rounded-t-md px-3 py-1.5 flex items-center justify-between text-[13px]">
          <span className="text-ds-text-muted">
            Replying to <span className="font-semibold text-ds-text-normal">{replyingTo.sender_display_name ?? 'User'}</span>
          </span>
          <button
            onClick={onCancelReply}
            className="text-ds-text-muted hover:text-ds-interactive-active"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-ds-bg-tertiary rounded-md flex items-end gap-2 px-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="text-ds-text-muted hover:text-ds-interactive-active px-2 h-11"
          title="Attach a file"
        >
          <Plus className="w-6 h-6" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUploadAttachment(f)
            e.currentTarget.value = ''
          }}
        />

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping?.() }}
          placeholder={`Message #${channelName}`}
          disabled={disabled}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          className="flex-1 min-h-[44px] max-h-[240px] py-3 bg-transparent resize-none outline-none text-ds-text-normal placeholder:text-ds-text-muted text-[15px] leading-[22px]"
        />

        <div className="flex items-center text-ds-text-muted">
          <button title="Send a gift" className="px-2 h-11 hover:text-ds-interactive-active"><Gift className="w-6 h-6" /></button>
          <button title="Stickers (coming soon)" className="px-2 h-11 hover:text-ds-interactive-active"><Sticker className="w-6 h-6" /></button>
          <Popover>
            <PopoverTrigger asChild>
              <button title="Emoji" className="px-2 h-11 hover:text-ds-interactive-active">
                <Smile className="w-6 h-6" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-[280px] p-2 bg-ds-bg-floating border-black/30">
              <div className="grid grid-cols-8 gap-1 max-h-[260px] overflow-y-auto ds-scrollbar">
                {COMMON_EMOJIS.map(([alias, char]) => (
                  <button
                    key={alias}
                    title={`:${alias}:`}
                    onClick={() => insertEmoji(char)}
                    className="w-7 h-7 rounded hover:bg-ds-bg-modifier-hover text-lg leading-none"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button
            onClick={submit}
            disabled={disabled || !text.trim()}
            title="Send message"
            className={cn(
              'px-2 h-11 disabled:opacity-30',
              text.trim() ? 'text-ds-blurple hover:text-ds-blurple-hover' : 'text-ds-text-muted',
            )}
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
