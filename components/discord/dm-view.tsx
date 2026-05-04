"use client"

import * as React from 'react'
import { AtSign, Phone, Video, Pin, UserPlus2 } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { Markdown } from '@/lib/mini-discord/markdown'
import { formatChatTime, shouldGroupMessages } from '@/lib/mini-discord/format'
import { MessageComposer } from './message-composer'
import type { Profile, Message as DMMessage } from '@/types'

interface Props {
  conversationId: string
  otherUser: Profile | null
  conversationName: string
  messages: DMMessage[]
  currentUserId: string
  onSend: (content: string) => Promise<void>
  onUploadAndSend: (file: File) => Promise<void>
  uploading: boolean
}

export function DmView({
  conversationId, otherUser, conversationName, messages,
  currentUserId, onSend, onUploadAndSend, uploading,
}: Props) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)

  React.useLayoutEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversationId, messages.length])

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-ds-bg-primary">
      <header className="h-12 px-4 flex items-center gap-3 border-b border-black/40 shadow-sm">
        <AtSign className="w-6 h-6 text-ds-channel-icon shrink-0" />
        <span className="font-bold text-[16px] text-ds-interactive-active truncate">{conversationName}</span>
        <div className="ml-auto flex items-center gap-3 text-ds-channel-default">
          <button title="Start Voice Call" className="hover:text-ds-interactive-active"><Phone className="w-5 h-5" /></button>
          <button title="Start Video Call" className="hover:text-ds-interactive-active"><Video className="w-5 h-5" /></button>
          <button title="Pinned Messages" className="hover:text-ds-interactive-active"><Pin className="w-5 h-5" /></button>
          <button title="Add Friends to DM" className="hover:text-ds-interactive-active"><UserPlus2 className="w-5 h-5" /></button>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto ds-scrollbar pb-4">
        <div className="px-4 pt-8 pb-4">
          <UserAvatar size={80} name={otherUser?.display_name ?? conversationName} avatarUrl={otherUser?.avatar_url} />
          <h2 className="text-[28px] font-extrabold text-ds-interactive-active mt-4">{conversationName}</h2>
          <p className="text-ds-text-muted">
            {otherUser
              ? `This is the beginning of your direct message history with @${otherUser.display_name ?? 'User'}.`
              : 'Start chatting!'}
          </p>
        </div>

        {messages.map((m, i) => {
          const grouped = shouldGroupMessages(messages[i - 1] ?? null, m)
          return (
            <div key={m.id} className={grouped ? 'mt-0' : 'mt-4'}>
              <div className="px-4 py-0.5 hover:bg-[rgba(4,4,5,0.20)] flex gap-3">
                {grouped ? (
                  <div className="w-10 shrink-0 text-[10px] text-ds-text-muted opacity-0 hover:opacity-100 leading-[22px] text-center">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </div>
                ) : (
                  <UserAvatar
                    size={40}
                    name={m.sender_id === currentUserId ? 'You' : (otherUser?.display_name ?? 'User')}
                    avatarUrl={m.sender_id === currentUserId ? null : (otherUser?.avatar_url ?? null)}
                  />
                )}
                <div className="flex-1 min-w-0">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-ds-interactive-active">
                        {m.sender_id === currentUserId ? 'You' : (otherUser?.display_name ?? 'User')}
                      </span>
                      <span className="text-[12px] text-ds-text-muted">{formatChatTime(m.created_at)}</span>
                    </div>
                  )}
                  <div className="text-[15px] text-ds-text-normal leading-[22px]">
                    <Markdown text={m.content} />
                  </div>
                  {m.file_url && (
                    <a
                      href={m.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-ds-text-link hover:underline mt-1"
                    >
                      📎 {m.file_name ?? 'file'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <MessageComposer
        channelName={conversationName}
        replyingTo={null}
        onCancelReply={() => undefined}
        onSend={onSend}
        onUploadAttachment={onUploadAndSend}
        uploading={uploading}
      />
    </div>
  )
}
