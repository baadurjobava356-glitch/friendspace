"use client"

import * as React from 'react'
import { Mic, MicOff, Headphones, HeadphonesIcon, Settings, PhoneOff } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface Props {
  displayName: string | null
  email: string | null
  avatarUrl: string | null
  status: string | null
  customStatus: string | null
  voiceChannelName?: string | null
  voiceMuted?: boolean
  voiceDeafened?: boolean
  onToggleMute: () => void
  onToggleDeafen: () => void
  onOpenSettings: () => void
  onDisconnectVoice?: () => void
}

export function UserPanel({
  displayName,
  email,
  avatarUrl,
  status,
  customStatus,
  voiceChannelName,
  voiceMuted,
  voiceDeafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onDisconnectVoice,
}: Props) {
  return (
    <TooltipProvider delayDuration={120}>
      <div>
        {voiceChannelName && (
          <div className="px-2 py-2 bg-ds-bg-secondary-alt border-b border-black/40">
            <div className="px-2 py-1 flex items-center justify-between rounded-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-ds-online" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ds-online truncate">Voice Connected</p>
                  <p className="text-[11px] text-ds-text-muted truncate">{voiceChannelName}</p>
                </div>
              </div>
              {onDisconnectVoice && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onDisconnectVoice}
                      className="text-ds-text-muted hover:text-white p-1 rounded hover:bg-ds-bg-modifier-hover"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Disconnect</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        <div className="h-[52px] bg-ds-bg-secondary-alt px-2 flex items-center gap-2">
          <button className="flex items-center gap-2 hover:bg-ds-bg-modifier-hover rounded-md px-1 py-1 flex-1 min-w-0 text-left">
            <UserAvatar
              name={displayName ?? email}
              avatarUrl={avatarUrl}
              status={status}
              size={32}
              showStatus
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ds-interactive-active truncate leading-tight">
                {displayName ?? email ?? 'User'}
              </p>
              <p className="text-[11px] text-ds-text-muted truncate leading-tight">
                {customStatus || (status === 'dnd' ? 'Do Not Disturb' : status === 'idle' ? 'Idle' : status === 'invisible' || status === 'offline' ? 'Invisible' : 'Online')}
              </p>
            </div>
          </button>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleMute}
                className={cn(
                  'w-8 h-8 rounded flex items-center justify-center text-ds-text-muted hover:text-white hover:bg-ds-bg-modifier-hover',
                  voiceMuted && 'text-ds-dnd',
                )}
              >
                {voiceMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{voiceMuted ? 'Unmute' : 'Mute'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleDeafen}
                className={cn(
                  'w-8 h-8 rounded flex items-center justify-center text-ds-text-muted hover:text-white hover:bg-ds-bg-modifier-hover',
                  voiceDeafened && 'text-ds-dnd',
                )}
              >
                {voiceDeafened ? <HeadphonesIcon className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{voiceDeafened ? 'Undeafen' : 'Deafen'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenSettings}
                className="w-8 h-8 rounded flex items-center justify-center text-ds-text-muted hover:text-white hover:bg-ds-bg-modifier-hover"
              >
                <Settings className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>User Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
