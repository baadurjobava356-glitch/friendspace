// Deterministic Discord-style colored avatars / accents
const AVATAR_PALETTE = [
  '#5865F2', // blurple
  '#3BA55D', // green
  '#FAA61A', // amber
  '#ED4245', // red
  '#EB459E', // pink
  '#9B59B6', // purple
  '#1ABC9C', // teal
  '#E67E22', // orange
  '#3498DB', // blue
  '#2ECC71', // emerald
  '#F1C40F', // yellow
  '#E91E63', // magenta
] as const

export function avatarColor(seed: string | null | undefined): string {
  if (!seed) return AVATAR_PALETTE[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

export function avatarInitials(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback
}

export function statusColor(status: string | null | undefined): string {
  switch (status) {
    case 'online':    return 'var(--ds-online)'
    case 'idle':      return 'var(--ds-idle)'
    case 'dnd':       return 'var(--ds-dnd)'
    case 'streaming': return 'var(--ds-streaming)'
    case 'invisible':
    case 'offline':
    default:          return 'var(--ds-offline)'
  }
}

export function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'online': return 'Online'
    case 'idle':   return 'Idle'
    case 'dnd':    return 'Do Not Disturb'
    case 'invisible': return 'Invisible'
    case 'offline':
    default:       return 'Offline'
  }
}
