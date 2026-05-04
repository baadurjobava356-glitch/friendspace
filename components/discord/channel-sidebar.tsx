"use client"

import * as React from 'react'
import {
  ChevronDown, Plus, Settings, Hash, Volume2, UserPlus, LogOut, Trash2,
  Bell, Pencil, Pin, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { MiniChannel, MiniChannelCategory, MiniGroup } from '@/types'
import type { MiniVoiceParticipant } from '@/types'
import { UserAvatar } from './user-avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  group: MiniGroup
  role: 'owner' | 'admin' | 'member'
  channels: MiniChannel[]
  categories: MiniChannelCategory[]
  voiceParticipants: MiniVoiceParticipant[]
  activeChannelId: string | null
  onSelectChannel: (id: string) => void
  onCreateChannel: (categoryId: string | null, kind?: 'text' | 'voice') => void
  onCreateCategory: () => void
  onOpenInvite: () => void
  onOpenServerSettings: () => void
  onLeaveServer: () => void
  onDeleteServer: () => void
  onEditChannel: (channel: MiniChannel) => void
  onDeleteChannel: (channel: MiniChannel) => void
}

export function ChannelSidebar({
  group, role, channels, categories, voiceParticipants,
  activeChannelId, onSelectChannel,
  onCreateChannel, onCreateCategory,
  onOpenInvite, onOpenServerSettings,
  onLeaveServer, onDeleteServer,
  onEditChannel, onDeleteChannel,
}: Props) {
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(new Set())
  const isAdmin = role === 'owner' || role === 'admin'

  const grouped = React.useMemo(() => {
    const byCat = new Map<string | null, MiniChannel[]>()
    for (const ch of channels) {
      const key = ch.category_id ?? null
      if (!byCat.has(key)) byCat.set(key, [])
      byCat.get(key)!.push(ch)
    }
    return byCat
  }, [channels])

  const voiceByChannel = React.useMemo(() => {
    const map = new Map<string, MiniVoiceParticipant[]>()
    for (const v of voiceParticipants) {
      if (!map.has(v.channel_id)) map.set(v.channel_id, [])
      map.get(v.channel_id)!.push(v)
    }
    return map
  }, [voiceParticipants])

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex-1 flex flex-col min-h-0 bg-ds-bg-secondary">
        {/* Server header */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-12 px-4 flex items-center justify-between border-b border-black/40 shadow-sm hover:bg-ds-bg-modifier-hover transition-colors">
              <span className="text-[15px] font-bold text-ds-interactive-active truncate">
                {group.name}
              </span>
              <ChevronDown className="w-4 h-4 text-ds-interactive-active shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-ds-bg-floating border-black/30 text-ds-text-normal">
            <DropdownMenuItem onClick={onOpenInvite} className="text-ds-blurple focus:bg-ds-blurple focus:text-white">
              <UserPlus className="w-4 h-4 mr-2" /> Invite People
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={onOpenServerSettings} className="focus:bg-ds-bg-modifier-hover">
                <Settings className="w-4 h-4 mr-2" /> Server Settings
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem onClick={() => onCreateChannel(null, 'text')} className="focus:bg-ds-bg-modifier-hover">
                <Plus className="w-4 h-4 mr-2" /> Create Channel
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem onClick={onCreateCategory} className="focus:bg-ds-bg-modifier-hover">
                <Plus className="w-4 h-4 mr-2" /> Create Category
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-black/30" />
            <DropdownMenuItem className="focus:bg-ds-bg-modifier-hover">
              <Bell className="w-4 h-4 mr-2" /> Notification Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black/30" />
            {role === 'owner' ? (
              <DropdownMenuItem onClick={onDeleteServer} className="text-ds-dnd focus:bg-ds-dnd focus:text-white">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Server
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onLeaveServer} className="text-ds-dnd focus:bg-ds-dnd focus:text-white">
                <LogOut className="w-4 h-4 mr-2" /> Leave Server
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Channel list */}
        <div className="flex-1 ds-scrollbar overflow-y-auto pt-2 pb-2">
          {/* Uncategorized */}
          {(grouped.get(null) ?? []).map((ch) => (
            <ChannelRow
              key={ch.id}
              channel={ch}
              active={activeChannelId === ch.id}
              voicers={voiceByChannel.get(ch.id) ?? []}
              isAdmin={isAdmin}
              onSelect={() => onSelectChannel(ch.id)}
              onEdit={() => onEditChannel(ch)}
              onDelete={() => onDeleteChannel(ch)}
            />
          ))}

          {categories.map((cat) => {
            const catChannels = grouped.get(cat.id) ?? []
            const collapsed = collapsedCategories.has(cat.id)
            return (
              <div key={cat.id} className="mt-2">
                <button
                  onClick={() =>
                    setCollapsedCategories((prev) => {
                      const next = new Set(prev)
                      if (next.has(cat.id)) next.delete(cat.id)
                      else next.add(cat.id)
                      return next
                    })
                  }
                  className="w-full px-2 h-6 flex items-center justify-between gap-1 group"
                >
                  <div className="flex items-center gap-1">
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 text-ds-channel-default transition-transform',
                        collapsed && '-rotate-90',
                      )}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ds-channel-default group-hover:text-ds-interactive-hover">
                      {cat.name}
                    </span>
                  </div>
                  {isAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            onCreateChannel(cat.id, 'text')
                          }}
                          className="text-ds-channel-default hover:text-ds-interactive-active opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="w-4 h-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Create Channel</TooltipContent>
                    </Tooltip>
                  )}
                </button>

                {!collapsed && catChannels.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    active={activeChannelId === ch.id}
                    voicers={voiceByChannel.get(ch.id) ?? []}
                    isAdmin={isAdmin}
                    onSelect={() => onSelectChannel(ch.id)}
                    onEdit={() => onEditChannel(ch)}
                    onDelete={() => onDeleteChannel(ch)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

function ChannelRow({
  channel, active, voicers, isAdmin, onSelect, onEdit, onDelete,
}: {
  channel: MiniChannel
  active: boolean
  voicers: MiniVoiceParticipant[]
  isAdmin: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = channel.kind === 'voice' ? Volume2 : Hash

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="px-2">
          <div
            onClick={onSelect}
            className={cn(
              'group rounded h-8 px-2 flex items-center gap-1.5 cursor-pointer mt-0.5',
              active
                ? 'bg-ds-bg-modifier-selected text-ds-interactive-active'
                : 'text-ds-channel-default hover:bg-ds-bg-modifier-hover hover:text-ds-interactive-hover',
            )}
          >
            <Icon className="w-5 h-5 text-ds-channel-icon shrink-0" />
            <span className="text-[15px] font-medium truncate flex-1">{channel.name}</span>

            <div className="hidden group-hover:flex items-center gap-1">
              {channel.kind === 'text' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-ds-channel-default hover:text-ds-interactive-active">
                      <Pencil className="w-4 h-4" onClick={(e) => { e.stopPropagation(); isAdmin && onEdit() }} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{isAdmin ? 'Edit Channel' : 'View only'}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {channel.kind === 'voice' && voicers.length > 0 && (
            <div className="ml-7 mt-1 space-y-0.5">
              {voicers.map((v) => (
                <div
                  key={v.user_id}
                  className="flex items-center gap-2 px-1 py-0.5 rounded text-ds-text-normal text-[13px] hover:bg-ds-bg-modifier-hover"
                >
                  <UserAvatar name={v.display_name ?? 'Member'} avatarUrl={v.avatar_url} size={20} />
                  <span className="truncate flex-1">{v.display_name ?? 'Member'}</span>
                  {v.is_muted && <span title="Muted" className="text-ds-dnd">🎙</span>}
                  {v.is_screen && <span title="Sharing screen" className="text-ds-streaming">▶</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-ds-bg-floating border-black/30 text-ds-text-normal w-56">
        <ContextMenuItem onClick={onSelect}>
          {channel.kind === 'voice' ? 'Connect' : 'Open Channel'}
        </ContextMenuItem>
        {channel.kind === 'text' && (
          <ContextMenuItem disabled>
            <Pin className="w-4 h-4 mr-2" /> View Pins (in chat header)
          </ContextMenuItem>
        )}
        {isAdmin && (
          <>
            <ContextMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" /> Edit Channel
            </ContextMenuItem>
            <ContextMenuItem onClick={onDelete} className="text-ds-dnd focus:bg-ds-dnd focus:text-white">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Channel
            </ContextMenuItem>
          </>
        )}
        {channel.is_nsfw && (
          <ContextMenuItem disabled>
            <Lock className="w-4 h-4 mr-2" /> Marked NSFW
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
