"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MiniChannel } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  channel: MiniChannel | null
  onSave: (channelId: string, name: string, topic: string) => Promise<void>
}

export function EditChannelDialog({ open, onOpenChange, channel, onSave }: Props) {
  const [name, setName] = React.useState('')
  const [topic, setTopic] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (channel) { setName(channel.name); setTopic(channel.topic ?? '') }
  }, [channel])

  if (!channel) return null

  async function submit() {
    if (!channel || !name.trim()) return
    setBusy(true)
    try {
      await onSave(channel.id, name.trim(), topic)
      onOpenChange(false)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ds-bg-secondary border-black/30 text-ds-text-normal sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-ds-interactive-active">
            Edit #{channel.name}
          </DialogTitle>
        </DialogHeader>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">Channel Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
          />
        </label>
        {channel.kind === 'text' && (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide font-bold text-ds-text-muted">Channel Topic</span>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Let people know what this channel is about"
              className="mt-1 bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
            />
          </label>
        )}
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
