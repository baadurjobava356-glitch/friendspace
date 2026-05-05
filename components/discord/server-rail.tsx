"use client"

import * as React from 'react'
import { Plus, Compass, MessageSquare, Download } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { avatarColor, avatarInitials } from '@/lib/mini-discord/colors'
import { cn } from '@/lib/utils'
import type { MiniGroup } from '@/types'

interface Props {
  groups: { role: string; group: MiniGroup }[]
  activeGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
  onCreateServer: () => void
  onJoinServer: () => void
  unreadGroupIds?: string[]
}

/** Server icon w/ Discord rounded-square → rounded-full hover transition + pill indicator. */
function ServerIcon({
  group,
  active,
  unread,
  onClick,
}: {
  group: MiniGroup
  active: boolean
  unread?: boolean
  onClick: () => void
}) {
  const initials = avatarInitials(group.name)
  const bg = avatarColor(group.id)

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <div className="relative">
          {/* coral accent pill indicator on the left (Stoat-style) */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-ds-blurple rounded-r-full transition-all"
            style={{
              height: active ? 32 : unread ? 8 : 0,
              opacity: active || unread ? 1 : 0,
            }}
          />
          <button
            onClick={onClick}
            className={cn(
              'mx-3 w-12 h-12 flex items-center justify-center text-white font-semibold transition-all overflow-hidden',
              // Stoat squircle: stays softly rounded, tightens on active/hover
              active ? 'rounded-[18px] ring-2 ring-ds-blurple/60 shadow-lg' : 'rounded-[22px] hover:rounded-[18px]',
            )}
            style={{ background: bg, fontSize: 16 }}
          >
            {group.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.icon_url} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-black text-white border-none">
        {group.name}
      </TooltipContent>
    </Tooltip>
  )
}

function PillButton({
  active,
  onClick,
  children,
  tooltip,
  accent,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  tooltip: string
  accent?: 'green' | 'blurple'
}) {
  const colorClass = accent === 'green'
    ? 'text-ds-online hover:bg-ds-online hover:text-white'
    : 'text-ds-blurple hover:bg-ds-blurple hover:text-white'

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <div className="relative">
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-ds-blurple rounded-r-full transition-all"
            style={{ height: active ? 32 : 0, opacity: active ? 1 : 0 }}
          />
          <button
            onClick={onClick}
            className={cn(
              'mx-3 w-12 h-12 rounded-[22px] hover:rounded-[18px] transition-all flex items-center justify-center bg-ds-bg-secondary-alt',
              active && 'rounded-[18px] bg-ds-blurple text-white',
              !active && colorClass,
            )}
          >
            {children}
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-black text-white border-none">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function ServerRail({
  groups,
  activeGroupId,
  onSelectGroup,
  onCreateServer,
  onJoinServer,
  unreadGroupIds,
}: Props) {
  const isHome = activeGroupId === null
  const unreadSet = React.useMemo(() => new Set(unreadGroupIds ?? []), [unreadGroupIds])

  return (
    <TooltipProvider>
      <aside className="w-[72px] bg-ds-bg-tertiary py-3 flex flex-col items-center gap-2 ds-scrollbar overflow-y-auto">
        <PillButton active={isHome} onClick={() => onSelectGroup(null)} tooltip="Direct Messages" accent="blurple">
          <MessageSquare className="w-6 h-6" />
        </PillButton>

        <div className="w-8 h-[2px] bg-ds-divider rounded-full my-1" />

        {groups.map(({ group }) => (
          <ServerIcon
            key={group.id}
            group={group}
            active={activeGroupId === group.id}
            unread={unreadSet.has(group.id)}
            onClick={() => onSelectGroup(group.id)}
          />
        ))}

        <PillButton onClick={onCreateServer} tooltip="Add a Server" accent="green">
          <Plus className="w-6 h-6" />
        </PillButton>
        <PillButton onClick={onJoinServer} tooltip="Discover & Join" accent="green">
          <Compass className="w-6 h-6" />
        </PillButton>

        <div className="w-8 h-[2px] bg-ds-divider rounded-full my-1" />

        <Tooltip delayDuration={120}>
          <TooltipTrigger asChild>
            <button className="mx-3 w-12 h-12 rounded-[22px] hover:rounded-[18px] transition-all flex items-center justify-center bg-ds-bg-secondary-alt text-ds-channel-default hover:bg-ds-blurple hover:text-white">
              <Download className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black text-white border-none">
            Download Apps
          </TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  )
}
