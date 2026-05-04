"use client"

import * as React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '../user-avatar'
import { LogOut, User as UserIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MiniProfile, PresenceStatus } from '@/types'
import type { ProfileUpdateInput } from '../discord-app'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  profile: MiniProfile
  email: string | null
  onSave: (update: ProfileUpdateInput) => Promise<void>
  onSignOut: () => void
}

const SECTIONS = ['My Account', 'Profiles', 'Status', 'Notifications', 'Voice & Video', 'Appearance'] as const
type SectionId = typeof SECTIONS[number]

export function UserSettingsDialog({ open, onOpenChange, profile, email, onSave, onSignOut }: Props) {
  const [section, setSection] = React.useState<SectionId>('My Account')
  const [displayName, setDisplayName] = React.useState(profile.display_name ?? '')
  const [bio, setBio] = React.useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url ?? '')
  const [presenceStatus, setPresenceStatus] = React.useState<PresenceStatus>(profile.presence_status)
  const [customStatus, setCustomStatus] = React.useState(profile.custom_status ?? '')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio ?? '')
      setAvatarUrl(profile.avatar_url ?? '')
      setPresenceStatus(profile.presence_status)
      setCustomStatus(profile.custom_status ?? '')
    }
  }, [open, profile])

  async function saveProfile() {
    setBusy(true)
    try {
      await onSave({
        displayName: displayName.trim() || undefined,
        bio,
        avatarUrl: avatarUrl.trim() || null,
      })
    } finally { setBusy(false) }
  }

  async function saveStatus(next: PresenceStatus) {
    setPresenceStatus(next)
    await onSave({ presenceStatus: next as PresenceStatus })
  }

  async function saveCustomStatus() {
    await onSave({ customStatus: customStatus || null })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-ds-bg-primary border-none text-ds-text-normal sm:max-w-none w-screen h-screen max-h-screen rounded-none p-0 inset-0 left-0 top-0 translate-x-0 translate-y-0 grid grid-cols-[280px_1fr] overflow-hidden"
      >
        {/* Sidebar */}
        <aside className="bg-ds-bg-secondary p-4 ds-scrollbar overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted px-2 mb-2">User Settings</div>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-[15px]',
                section === s
                  ? 'bg-ds-bg-modifier-selected text-ds-interactive-active'
                  : 'text-ds-text-muted hover:bg-ds-bg-modifier-hover hover:text-ds-text-normal',
              )}
            >
              {s}
            </button>
          ))}
          <div className="my-2 h-px bg-ds-divider" />
          <button
            onClick={onSignOut}
            className="w-full text-left px-2 py-1.5 rounded text-[15px] text-ds-text-muted hover:bg-ds-bg-modifier-hover hover:text-ds-dnd flex items-center justify-between"
          >
            Log out <LogOut className="w-4 h-4" />
          </button>
        </aside>

        {/* Main */}
        <main className="ds-scrollbar overflow-y-auto p-10 relative">
          <button
            onClick={() => onOpenChange(false)}
            title="Close"
            className="absolute top-6 right-12 w-9 h-9 rounded-full border-2 border-ds-text-muted text-ds-text-muted hover:text-ds-interactive-active flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>

          {section === 'My Account' && (
            <div className="max-w-[660px] space-y-5">
              <h2 className="text-2xl font-bold text-ds-interactive-active">My Account</h2>
              <div className="bg-ds-bg-secondary rounded-lg overflow-hidden">
                <div className="bg-ds-blurple h-[60px]" />
                <div className="px-4 -mt-8 pb-4">
                  <UserAvatar name={displayName || email} avatarUrl={avatarUrl} size={80} status={presenceStatus} showStatus />
                  <div className="mt-3 grid sm:grid-cols-2 gap-4">
                    <ReadField label="Display Name" value={displayName || (email?.split('@')[0] ?? 'User')} />
                    <ReadField label="Email" value={email ?? '—'} />
                  </div>
                </div>
              </div>

              <div className="bg-ds-bg-secondary rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-ds-interactive-active">Edit profile</h3>
                <FieldLabel>Display Name</FieldLabel>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-ds-bg-tertiary border-none text-ds-text-normal" />
                <FieldLabel>Bio</FieldLabel>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-ds-bg-tertiary border-none text-ds-text-normal min-h-[80px]" />
                <FieldLabel>Avatar URL</FieldLabel>
                <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="bg-ds-bg-tertiary border-none text-ds-text-normal" />
                <Button onClick={saveProfile} disabled={busy} className="bg-ds-blurple hover:bg-ds-blurple-hover text-white">
                  {busy ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}

          {section === 'Status' && (
            <div className="max-w-[660px] space-y-5">
              <h2 className="text-2xl font-bold text-ds-interactive-active">Status</h2>
              <div className="bg-ds-bg-secondary rounded-lg p-4 space-y-2">
                {(['online', 'idle', 'dnd', 'invisible'] as PresenceStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => saveStatus(s)}
                    className={cn(
                      'w-full px-3 py-2 rounded flex items-center gap-3 hover:bg-ds-bg-modifier-hover',
                      presenceStatus === s && 'bg-ds-bg-modifier-selected',
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: statusToColor(s) }}
                    />
                    <span className="capitalize">{s === 'dnd' ? 'Do Not Disturb' : s}</span>
                  </button>
                ))}
              </div>
              <div className="bg-ds-bg-secondary rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-ds-interactive-active">Custom Status</h3>
                <Input
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="What's happening?"
                  className="bg-ds-bg-tertiary border-none text-ds-text-normal"
                />
                <Button onClick={saveCustomStatus} className="bg-ds-blurple hover:bg-ds-blurple-hover text-white">
                  Set Custom Status
                </Button>
              </div>
            </div>
          )}

          {(section === 'Profiles' || section === 'Notifications' || section === 'Voice & Video' || section === 'Appearance') && (
            <div className="max-w-[660px] space-y-5">
              <h2 className="text-2xl font-bold text-ds-interactive-active">{section}</h2>
              <p className="text-ds-text-muted">
                <UserIcon className="w-4 h-4 inline-block mr-1" /> This section is part of the upcoming Friendspace experience.
              </p>
            </div>
          )}
        </main>
      </DialogContent>
    </Dialog>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="block text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">{children}</span>
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">{label}</p>
      <p className="text-[15px] text-ds-text-normal mt-1">{value}</p>
    </div>
  )
}

function statusToColor(s: PresenceStatus) {
  switch (s) {
    case 'online': return 'var(--ds-online)'
    case 'idle':   return 'var(--ds-idle)'
    case 'dnd':    return 'var(--ds-dnd)'
    case 'invisible':
    case 'offline':
    default:       return 'var(--ds-offline)'
  }
}
