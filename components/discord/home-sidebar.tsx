"use client"

import * as React from 'react'
import { Search, Users, ShieldCheck, Sparkles, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { UserAvatar } from './user-avatar'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface DMConversation {
  id: string
  is_group: boolean
  name: string | null
  participants: Profile[]
}

interface Props {
  conversations: DMConversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onSelectFriendsView: () => void
  friendsViewActive: boolean
  currentUserId: string
}

export function HomeSidebar({
  conversations, activeConversationId, onSelectConversation,
  onSelectFriendsView, friendsViewActive, currentUserId,
}: Props) {
  const [search, setSearch] = React.useState('')

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const others = c.participants.filter((p) => p.id !== currentUserId)
    const label = c.name ?? others.map((p) => p.display_name).filter(Boolean).join(', ')
    return label.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-ds-bg-secondary">
      <div className="h-12 px-2 flex items-center border-b border-black/40 shadow-sm">
        <div className="w-full px-2 h-7 rounded bg-ds-bg-tertiary flex items-center text-ds-text-muted text-[13px]">
          <Search className="w-3.5 h-3.5 mr-2" />
          Find or start a conversation
        </div>
      </div>

      <div className="flex-1 ds-scrollbar overflow-y-auto px-2 py-2">
        <SidebarRow active={friendsViewActive} icon={Users} label="Friends" onClick={onSelectFriendsView} />
        <SidebarRow icon={Sparkles} label="Nitro" disabled />
        <SidebarRow icon={ShieldCheck} label="Server Boost" disabled />

        <div className="mt-4 px-2 flex items-center justify-between text-ds-channel-default">
          <span className="text-[12px] font-bold uppercase tracking-wide">Direct Messages</span>
          <Plus className="w-4 h-4 cursor-pointer hover:text-ds-interactive-active" />
        </div>

        <div className="mt-1">
          {filtered.length === 0 && (
            <p className="px-2 py-2 text-[13px] text-ds-text-muted">
              {conversations.length === 0 ? 'Click "Friends" to start one.' : 'No matches.'}
            </p>
          )}
          {filtered.map((c) => {
            const others = c.participants.filter((p) => p.id !== currentUserId)
            const label = c.name ?? (others.map((p) => p.display_name).filter(Boolean).join(', ') || 'New DM')
            const avatar = others[0]
            return (
              <button
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className={cn(
                  'w-full mt-0.5 px-2 h-[42px] rounded flex items-center gap-3 text-left',
                  activeConversationId === c.id
                    ? 'bg-ds-bg-modifier-selected text-ds-interactive-active'
                    : 'text-ds-text-muted hover:bg-ds-bg-modifier-hover hover:text-ds-interactive-hover',
                )}
              >
                <UserAvatar
                  size={32}
                  name={c.is_group ? label : avatar?.display_name ?? '?'}
                  avatarUrl={avatar?.avatar_url ?? null}
                  status={avatar?.is_online ? 'online' : 'offline'}
                  showStatus={!c.is_group}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate">{label}</p>
                  {!c.is_group && avatar && (
                    <p className="text-[11px] truncate">{avatar.is_online ? 'Online' : 'Offline'}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SidebarRow({
  icon: Icon, label, active, onClick, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'mt-0.5 w-full px-2 h-10 rounded flex items-center gap-3 text-left',
        active
          ? 'bg-ds-bg-modifier-selected text-ds-interactive-active'
          : 'text-ds-text-muted hover:bg-ds-bg-modifier-hover hover:text-ds-interactive-hover',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[16px] font-semibold">{label}</span>
    </button>
  )
}
