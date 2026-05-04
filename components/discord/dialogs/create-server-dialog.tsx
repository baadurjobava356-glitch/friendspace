"use client"

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (name: string, description: string) => Promise<void>
}

export function CreateServerDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [step, setStep] = React.useState<'choose' | 'create'>('choose')

  React.useEffect(() => {
    if (!open) { setName(''); setDescription(''); setStep('choose') }
  }, [open])

  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await onCreate(name.trim(), description.trim())
      onOpenChange(false)
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ds-bg-secondary border-black/30 text-ds-text-normal sm:max-w-[440px] p-0">
        {step === 'choose' ? (
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-center text-ds-interactive-active">
                Create your server
              </DialogTitle>
              <DialogDescription className="text-center text-ds-text-muted">
                Your server is where you and your friends hang out. Make yours and start talking.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-2">
              {[
                { label: 'For me and my friends', icon: '🎮' },
                { label: 'For a club or community', icon: '🌟' },
                { label: 'School club', icon: '🎓' },
                { label: 'Study group', icon: '📚' },
                { label: 'Gaming', icon: '🎯' },
                { label: 'Just create my own', icon: '✨' },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => setStep('create')}
                  className="w-full text-left px-4 py-3 bg-ds-bg-secondary-alt hover:bg-ds-bg-modifier-hover rounded-lg flex items-center gap-3"
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-[15px] font-semibold flex-1">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-center text-ds-interactive-active">
                Customize your server
              </DialogTitle>
              <DialogDescription className="text-center text-ds-text-muted">
                Give your server a personality with a name. You can always change it later.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-wide text-ds-text-muted">Server Name</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Server"
                  className="mt-1 bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-wide text-ds-text-muted">Description (optional)</span>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's it about?"
                  className="mt-1 bg-ds-bg-tertiary border-none text-ds-text-normal h-11"
                />
              </label>
            </div>
            <p className="mt-3 text-[11px] text-ds-text-muted">
              By creating a server, you agree to Friendspace&apos;s Community Guidelines.
            </p>
            <div className="mt-5 flex justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep('choose')}>Back</Button>
              <Button
                disabled={!name.trim() || busy}
                onClick={submit}
                className="bg-ds-blurple hover:bg-ds-blurple-hover text-white"
              >
                {busy ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
