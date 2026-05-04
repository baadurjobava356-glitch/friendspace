"use client"

import * as React from 'react'
import { avatarColor, avatarInitials, statusColor } from '@/lib/mini-discord/colors'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name?: string | null
  avatarUrl?: string | null
  status?: string | null
  size?: number
  showStatus?: boolean
  className?: string
}

export function UserAvatar({
  name,
  avatarUrl,
  status,
  size = 32,
  showStatus = false,
  className,
}: UserAvatarProps) {
  const bg = avatarColor(name ?? avatarUrl ?? 'user')
  const initials = avatarInitials(name)

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name ?? 'user avatar'}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-semibold text-white select-none"
          style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          aria-label={status ?? 'offline'}
          className="absolute right-0 bottom-0 rounded-full ring-[3px]"
          style={{
            width: Math.max(10, Math.round(size * 0.32)),
            height: Math.max(10, Math.round(size * 0.32)),
            background: statusColor(status),
            boxShadow: '0 0 0 0 transparent',
            // ring color matches whatever sits behind the avatar
            ['--tw-ring-color' as string]: 'var(--ds-bg-secondary)',
          }}
        />
      )}
    </div>
  )
}
