"use client"

import * as React from 'react'
import { Crown, Shield, MessageSquare, UserMinus, ArrowUp, ArrowDown } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { GroupRole, MiniGroupMemberWithProfile } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  members: MiniGroupMemberWithProfile[]
  currentUserId: string
  myRole: GroupRole
  onMessageMember: (userId: string) => void
  onPromote: (userId: string) => void
  onDemote: (userId: string) => void
  onKick: (userId: string) => void
}

export function MemberSidebar({
  members, currentUserId, myRole,
  onMessageMember, onPromote, onDemote, onKick,
}: Props) {
  const onlineMembers = members.filter((m) => m.is_online && m.presence_status !== 'invisible')
  const offlineMembers = members.filter((m) => !m.is_online || m.presence_status === 'invisible')

  const owners = members.filter((m) => m.role === 'owner')
  const admins = members.filter((m) => m.role === 'admin')

  return (
    <aside className="w-60 bg-ds-bg-secondary ds-scrollbar overflow-y-auto py-4 hidden lg:block">
      {owners.length > 0 && (
        <RoleGroup label="Owner" count={owners.length}>
          {owners.map((m) => (
            <MemberRow
              key={m.user_id}
              member={m}
              currentUserId={currentUserId}
              myRole={myRole}
              onMessageMember={onMessageMember}
              onPromote={onPromote}
              onDemote={onDemote}
              onKick={onKick}
            />
          ))}
        </RoleGroup>
      )}
      {admins.length > 0 && (
        <RoleGroup label="Admins" count={admins.length}>
          {admins.map((m) => (
            <MemberRow key={m.user_id} member={m} currentUserId={currentUserId} myRole={myRole} onMessageMember={onMessageMember} onPromote={onPromote} onDemote={onDemote} onKick={onKick} />
          ))}
        </RoleGroup>
      )}
      <RoleGroup label="Online" count={onlineMembers.filter((m) => m.role === 'member').length}>
        {onlineMembers.filter((m) => m.role === 'member').map((m) => (
          <MemberRow key={m.user_id} member={m} currentUserId={currentUserId} myRole={myRole} onMessageMember={onMessageMember} onPromote={onPromote} onDemote={onDemote} onKick={onKick} />
        ))}
      </RoleGroup>
      <RoleGroup label="Offline" count={offlineMembers.filter((m) => m.role === 'member').length}>
        {offlineMembers.filter((m) => m.role === 'member').map((m) => (
          <MemberRow key={m.user_id} member={m} currentUserId={currentUserId} myRole={myRole} onMessageMember={onMessageMember} onPromote={onPromote} onDemote={onDemote} onKick={onKick} dim />
        ))}
      </RoleGroup>
    </aside>
  )
}

function RoleGroup({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <div className="mb-4">
      <h4 className="px-4 mb-1 text-[12px] font-semibold uppercase tracking-wide text-ds-channel-default">
        {label} — {count}
      </h4>
      <div>{children}</div>
    </div>
  )
}

function MemberRow({
  member, currentUserId, myRole, dim,
  onMessageMember, onPromote, onDemote, onKick,
}: {
  member: MiniGroupMemberWithProfile
  currentUserId: string
  myRole: GroupRole
  dim?: boolean
  onMessageMember: (id: string) => void
  onPromote: (id: string) => void
  onDemote: (id: string) => void
  onKick: (id: string) => void
}) {
  const isMe = member.user_id === currentUserId
  const canManage = (myRole === 'owner' || myRole === 'admin') && !isMe && member.role !== 'owner'
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'mx-2 my-0.5 px-2 py-1.5 rounded flex items-center gap-2 cursor-pointer hover:bg-ds-bg-modifier-hover',
            dim && 'opacity-40 hover:opacity-100',
          )}
        >
          <UserAvatar
            name={member.display_name ?? 'User'}
            avatarUrl={member.avatar_url}
            status={member.is_online ? member.presence_status : 'offline'}
            size={32}
            showStatus
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-medium truncate text-ds-text-normal">
                {member.display_name ?? 'User'}
              </span>
              {member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-ds-idle" />}
              {member.role === 'admin' && <Shield className="w-3.5 h-3.5 text-ds-blurple" />}
            </div>
            {member.custom_status && (
              <p className="text-[12px] text-ds-text-muted truncate">{member.custom_status}</p>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-ds-bg-floating border-black/30 text-ds-text-normal w-56">
        <ContextMenuItem onClick={() => onMessageMember(member.user_id)} disabled={isMe}>
          <MessageSquare className="w-4 h-4 mr-2" /> Message
        </ContextMenuItem>
        {canManage && (
          <>
            <ContextMenuSeparator className="bg-black/30" />
            {member.role === 'member' && (
              <ContextMenuItem onClick={() => onPromote(member.user_id)}>
                <ArrowUp className="w-4 h-4 mr-2" /> Promote to Admin
              </ContextMenuItem>
            )}
            {member.role === 'admin' && myRole === 'owner' && (
              <ContextMenuItem onClick={() => onDemote(member.user_id)}>
                <ArrowDown className="w-4 h-4 mr-2" /> Demote to Member
              </ContextMenuItem>
            )}
            <ContextMenuItem
              onClick={() => onKick(member.user_id)}
              className="text-ds-dnd focus:bg-ds-dnd focus:text-white"
            >
              <UserMinus className="w-4 h-4 mr-2" /> Kick {member.display_name ?? 'Member'}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
