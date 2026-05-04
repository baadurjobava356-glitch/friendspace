"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onJoin: (code: string) => Promise<{ ok: boolean; error?: string }>
}

export function JoinServerDialog({ open, onOpenChange, onJoin }: Props) {
  const [code, setCode] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => { if (!open) { setCode(''); setError(null) } }, [open])

  async function submit() {
    if (!code.trim()) return
    setBusy(true); setError(null)
    try {
      const cleaned = code.trim().split('/').pop() ?? code.trim()
      const res = await onJoin(cleaned)
      if (!res.ok) setError(res.error ?? 'Could not join with that invite')
      else onOpenChange(false)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ds-bg-secondary border-black/30 text-ds-text-normal sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-ds-interactive-active">Join a Server</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ds-text-muted">
          Enter an invite below to join an existing server. Codes look like
          {' '}<code className="bg-ds-bg-tertiary px-1 py-0.5 rounded">a1b2c3</code>.
        </p>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite code"
          className="bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
        {error && <p className="text-sm text-ds-dnd">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Back</Button>
          <Button onClick={submit} disabled={!code.trim() || busy} className="bg-ds-blurple hover:bg-ds-blurple-hover text-white">
            {busy ? 'Joining...' : 'Join Server'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
