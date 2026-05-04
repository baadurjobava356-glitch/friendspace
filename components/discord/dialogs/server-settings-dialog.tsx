"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MiniGroup } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  group: MiniGroup
  onSave: (params: { name: string; description: string; iconUrl?: string | null }) => Promise<void>
}

export function ServerSettingsDialog({ open, onOpenChange, group, onSave }: Props) {
  const [name, setName] = React.useState(group.name)
  const [description, setDescription] = React.useState(group.description ?? '')
  const [iconUrl, setIconUrl] = React.useState(group.icon_url ?? '')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(group.name); setDescription(group.description ?? ''); setIconUrl(group.icon_url ?? '')
    }
  }, [open, group])

  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSave({ name: name.trim(), description: description.trim(), iconUrl: iconUrl.trim() || null })
      onOpenChange(false)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ds-bg-secondary border-black/30 text-ds-text-normal sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-ds-interactive-active">Server Overview</DialogTitle>
        </DialogHeader>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">Server Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">Description</span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short blurb about this server..."
            className="mt-1 bg-ds-bg-tertiary border-none text-ds-text-normal min-h-[80px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">Icon URL</span>
          <Input
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://example.com/icon.png"
            className="mt-1 bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || busy} className="bg-ds-blurple hover:bg-ds-blurple-hover text-white">
            {busy ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
