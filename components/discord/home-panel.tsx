"use client"

import * as React from 'react'
import { UserPlus, Users, Inbox, Search, MessageSquare } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Profile, FriendRequest } from '@/types'

interface Props {
  currentUserId: string
  friends: Profile[]
  friendRequests: FriendRequest[]
  allProfiles: Profile[]
  onSendFriendRequest: (userId: string) => Promise<void>
  onAcceptFriendRequest: (requestId: string) => Promise<void>
  onDeclineFriendRequest: (requestId: string) => Promise<void>
  onMessageFriend: (userId: string) => void
}

type Tab = 'online' | 'all' | 'pending' | 'add'

export function HomePanel({
  currentUserId, friends, friendRequests, allProfiles,
  onSendFriendRequest, onAcceptFriendRequest, onDeclineFriendRequest, onMessageFriend,
}: Props) {
  const [tab, setTab] = React.useState<Tab>('online')
  const [search, setSearch] = React.useState('')
  const [addQuery, setAddQuery] = React.useState('')
  const [feedback, setFeedback] = React.useState<string | null>(null)

  const onlineFriends = friends.filter((f) => f.is_online)

  const visibleFriends = (tab === 'online' ? onlineFriends : friends).filter((f) => {
    if (!search) return true
    return (f.display_name ?? '').toLowerCase().includes(search.toLowerCase())
  })

  const matchingProfiles = addQuery
    ? allProfiles.filter(
        (p) =>
          p.id !== currentUserId &&
          ((p.display_name ?? '').toLowerCase().includes(addQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(addQuery.toLowerCase())) &&
          !friends.some((f) => f.id === p.id),
      )
    : []

  return (
    <div className="flex-1 flex flex-col bg-ds-bg-primary min-w-0">
      <header className="h-12 px-4 flex items-center gap-4 border-b border-black/40 shadow-sm">
        <Users className="w-6 h-6 text-ds-channel-icon" />
        <span className="font-bold text-ds-interactive-active">Friends</span>
        <span className="w-px h-5 bg-ds-divider" />
        <TabButton active={tab === 'online'} onClick={() => setTab('online')}>Online</TabButton>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>All</TabButton>
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pending {friendRequests.length > 0 && (
            <span className="ml-1 px-1.5 py-px rounded bg-ds-dnd text-white text-[11px]">{friendRequests.length}</span>
          )}
        </TabButton>
        <button
          onClick={() => setTab('add')}
          className={cn(
            'px-2 h-7 rounded font-medium text-sm',
            tab === 'add' ? 'bg-ds-online text-white' : 'bg-transparent text-ds-online border border-ds-online/40 hover:bg-ds-online/10',
          )}
        >
          Add Friend
        </button>
      </header>

      <div className="flex-1 ds-scrollbar overflow-y-auto px-8 py-5">
        {tab === 'add' ? (
          <div className="max-w-2xl">
            <h2 className="text-base font-extrabold text-ds-interactive-active uppercase tracking-wide">Add Friend</h2>
            <p className="text-ds-text-muted text-sm mb-3">
              You can add friends with their Friendspace username or user ID.
            </p>
            <div className="flex gap-2">
              <Input
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="You can add a friend with their Friendspace username."
                className="bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
              />
              <Button disabled={!matchingProfiles[0]} className="bg-ds-blurple hover:bg-ds-blurple-hover text-white">Send Request</Button>
            </div>
            {feedback && <p className="text-sm text-ds-online mt-2">{feedback}</p>}
            <div className="mt-6">
              <h3 className="text-[12px] font-bold uppercase text-ds-text-muted mb-2">Suggestions</h3>
              <div className="space-y-1">
                {matchingProfiles.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-ds-bg-modifier-hover">
                    <UserAvatar name={p.display_name} avatarUrl={p.avatar_url} status={p.is_online ? 'online' : 'offline'} showStatus />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ds-text-normal truncate">{p.display_name ?? 'User'}</p>
                      <p className="text-[12px] text-ds-text-muted truncate">{p.bio ?? 'New on Friendspace'}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-ds-blurple hover:bg-ds-blurple-hover text-white"
                      onClick={async () => {
                        try {
                          await onSendFriendRequest(p.id)
                          setFeedback(`Friend request sent to ${p.display_name ?? 'User'}`)
                          setTimeout(() => setFeedback(null), 3000)
                        } catch { /* ignore */ }
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-1" /> Add Friend
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : tab === 'pending' ? (
          <PendingTab
            requests={friendRequests}
            onAccept={onAcceptFriendRequest}
            onDecline={onDeclineFriendRequest}
          />
        ) : (
          <div className="max-w-3xl">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="bg-ds-bg-tertiary border-none text-ds-text-normal mb-4"
            />
            <h3 className="text-[12px] font-bold uppercase text-ds-text-muted mb-2">
              {tab === 'online' ? 'Online' : 'All Friends'} — {visibleFriends.length}
            </h3>
            {visibleFriends.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-1">
                {visibleFriends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2 rounded hover:bg-ds-bg-modifier-hover group cursor-pointer"
                    onClick={() => onMessageFriend(f.id)}
                  >
                    <UserAvatar name={f.display_name} avatarUrl={f.avatar_url} status={f.is_online ? 'online' : 'offline'} showStatus />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ds-text-normal truncate">{f.display_name ?? 'User'}</p>
                      <p className="text-[12px] text-ds-text-muted truncate">{f.is_online ? 'Online' : 'Offline'}</p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 w-9 h-9 rounded-full bg-ds-bg-secondary-alt text-ds-text-muted hover:text-ds-interactive-active flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 h-7 rounded text-sm font-medium',
        active
          ? 'bg-ds-bg-modifier-selected text-ds-interactive-active'
          : 'text-ds-text-muted hover:bg-ds-bg-modifier-hover hover:text-ds-text-normal',
      )}
    >
      {children}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-ds-text-muted">
      <Users className="w-14 h-14 mx-auto mb-3" />
      <p>No one&apos;s here yet... add a friend or start a conversation.</p>
    </div>
  )
}

function PendingTab({
  requests, onAccept, onDecline,
}: {
  requests: FriendRequest[]
  onAccept: (id: string) => Promise<void>
  onDecline: (id: string) => Promise<void>
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-ds-text-muted">
        <Inbox className="w-14 h-14 mx-auto mb-3" />
        <p>There are no pending friend requests.</p>
      </div>
    )
  }
  return (
    <div className="max-w-3xl">
      <h3 className="text-[12px] font-bold uppercase text-ds-text-muted mb-2">Pending — {requests.length}</h3>
      <div className="space-y-1">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-ds-bg-modifier-hover">
            <UserAvatar
              name={r.sender?.display_name ?? r.receiver?.display_name ?? 'User'}
              avatarUrl={r.sender?.avatar_url ?? r.receiver?.avatar_url ?? null}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ds-text-normal truncate">
                {r.sender?.display_name ?? r.receiver?.display_name ?? 'User'}
              </p>
              <p className="text-[12px] text-ds-text-muted truncate">Incoming friend request</p>
            </div>
            <Button size="icon" className="bg-ds-online text-white hover:bg-ds-online/80" onClick={() => onAccept(r.id)} title="Accept">
              ✓
            </Button>
            <Button size="icon" variant="outline" onClick={() => onDecline(r.id)} title="Decline" className="border-ds-text-muted text-ds-text-muted hover:bg-ds-bg-modifier-hover">
              ✕
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
