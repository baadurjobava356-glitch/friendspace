"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, RefreshCw, Trash2 } from 'lucide-react'
import type { MiniInvite } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId: string
  groupName: string
}

export function InviteDialog({ open, onOpenChange, groupId, groupName }: Props) {
  const [invites, setInvites] = React.useState<MiniInvite[]>([])
  const [creating, setCreating] = React.useState(false)
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  const loadInvites = React.useCallback(async () => {
    const res = await fetch(`/api/invites/list?groupId=${groupId}`)
    const json = await res.json()
    if (res.ok) setInvites(json.invites ?? [])
  }, [groupId])

  React.useEffect(() => {
    if (open) loadInvites()
  }, [open, loadInvites])

  async function generateInvite() {
    setCreating(true)
    try {
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, maxUses: 25, expiresInHours: 168 }),
      })
      if (res.ok) await loadInvites()
    } finally { setCreating(false) }
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/invites/list?inviteId=${id}`, { method: 'DELETE' })
    setInvites((prev) => prev.filter((i) => i.id !== id))
  }

  async function copy(code: string) {
    const url = `${window.location.origin}/discord?invite=${code}`
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopiedCode(code)
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ds-bg-secondary border-black/30 text-ds-text-normal sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-ds-interactive-active">
            Invite friends to {groupName}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ds-text-muted">
          Send a server invite link to a friend. Anyone with the link can join.
        </p>

        {invites[0] && (
          <div className="flex items-center gap-2 bg-ds-bg-tertiary rounded-md p-2">
            <Input
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/discord?invite=${invites[0].code}`}
              className="bg-transparent border-none text-ds-text-normal flex-1"
            />
            <Button
              size="sm"
              onClick={() => copy(invites[0].code)}
              className="bg-ds-blurple hover:bg-ds-blurple-hover text-white"
            >
              {copiedCode === invites[0].code ? (
                <><Check className="w-4 h-4 mr-1" />Copied</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" />Copy</>
              )}
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-black/30">
          <span className="text-[11px] uppercase tracking-wide text-ds-text-muted font-bold">Active invites</span>
          <Button size="sm" variant="ghost" onClick={generateInvite} disabled={creating}>
            <RefreshCw className="w-4 h-4 mr-1" /> Generate new
          </Button>
        </div>

        <div className="max-h-60 overflow-y-auto ds-scrollbar -mx-1 px-1">
          {invites.length === 0 ? (
            <p className="text-center text-sm text-ds-text-muted py-4">No active invites yet.</p>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-2 py-1.5 border-b border-black/20 last:border-none">
                <code className="bg-ds-bg-tertiary px-2 py-1 rounded text-sm">{inv.code}</code>
                <span className="text-xs text-ds-text-muted flex-1">
                  {inv.used_count}/{inv.max_uses} uses
                  {inv.expires_at && ` · expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                </span>
                <Button size="sm" variant="ghost" onClick={() => copy(inv.code)}>
                  {copiedCode === inv.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => revokeInvite(inv.id)} className="text-ds-dnd">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
