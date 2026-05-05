"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hash, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId: string
  defaultCategoryId: string | null
  defaultKind?: 'text' | 'voice'
  categories: { id: string; name: string }[]
  onCreate: (params: {
    groupId: string
    name: string
    kind: 'text' | 'voice'
    categoryId: string | null
  }) => Promise<void>
}

export function CreateChannelDialog({
  open, onOpenChange, groupId, defaultCategoryId, defaultKind = 'text', categories, onCreate,
}: Props) {
  const [kind, setKind] = React.useState<'text' | 'voice'>(defaultKind)
  const [name, setName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [categoryId, setCategoryId] = React.useState<string | null>(defaultCategoryId)

  React.useEffect(() => {
    if (!open) { setName(''); setKind(defaultKind); setCategoryId(defaultCategoryId) }
  }, [open, defaultKind, defaultCategoryId])

  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await onCreate({ groupId, name: name.trim(), kind, categoryId })
      onOpenChange(false)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ds-bg-secondary border-ds-divider/60 text-ds-text-normal sm:max-w-[460px] rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-ds-interactive-active tracking-tight">Create Channel</DialogTitle>
        </DialogHeader>
        <div>
          <p className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted mb-2">Channel Type</p>
          <div className="space-y-1">
            <KindOption Icon={Hash} title="Text" description="Send messages, images, GIFs, and stickers" active={kind === 'text'} onClick={() => setKind('text')} />
            <KindOption Icon={Volume2} title="Voice" description="Hang out together with voice and video" active={kind === 'voice'} onClick={() => setKind('voice')} />
          </div>
        </div>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">Channel Name</span>
          <div className="mt-1 flex items-center gap-2 bg-ds-bg-tertiary rounded-md px-3">
            {kind === 'text' ? <Hash className="w-4 h-4 text-ds-channel-icon" /> : <Volume2 className="w-4 h-4 text-ds-channel-icon" />}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'text' ? 'new-channel' : 'New Voice Channel'}
              className="bg-transparent border-none text-ds-text-normal h-11 px-0"
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            />
          </div>
        </label>
        {categories.length > 0 && (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">Category</span>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="mt-1 w-full bg-ds-bg-tertiary text-ds-text-normal rounded-md h-11 px-3 outline-none"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-ds-text-muted hover:text-ds-interactive-active">Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || busy} className="bg-ds-blurple hover:bg-ds-blurple-hover text-white rounded-lg font-semibold">
            {busy ? 'Creating...' : 'Create Channel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function KindOption({ Icon, title, description, active, onClick }: {
  Icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-all',
        active ? 'bg-ds-bg-modifier-selected ring-2 ring-ds-blurple/70' : 'bg-ds-bg-secondary-alt hover:bg-ds-bg-modifier-hover hover:ring-1 hover:ring-ds-blurple/30',
      )}
    >
      <Icon className="w-6 h-6 text-ds-channel-icon" />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-[12px] text-ds-text-muted">{description}</p>
      </div>
      <div className={cn('w-4 h-4 rounded-full border-2', active ? 'border-ds-blurple bg-ds-blurple' : 'border-ds-text-muted')} />
    </button>
  )
}
