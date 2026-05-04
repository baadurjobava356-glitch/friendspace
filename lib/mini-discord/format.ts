// Time + filesize helpers for Discord-style UI

export function formatChatTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (sameDay) return `Today at ${time}`
  if (isYesterday) return `Yesterday at ${time}`
  return date.toLocaleDateString([], { year: 'numeric', month: 'numeric', day: 'numeric' }) + ` ${time}`
}

export function formatRelative(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function shouldGroupMessages(prev: { sender_id: string; created_at: string } | null, curr: { sender_id: string; created_at: string }): boolean {
  if (!prev) return false
  if (prev.sender_id !== curr.sender_id) return false
  const dt = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
  return dt < 7 * 60 * 1000 // 7-minute clustering window like Discord
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function isImageType(type: string | null | undefined): boolean {
  if (!type) return false
  return type.startsWith('image/')
}

export function isVideoType(type: string | null | undefined): boolean {
  if (!type) return false
  return type.startsWith('video/')
}

export function isAudioType(type: string | null | undefined): boolean {
  if (!type) return false
  return type.startsWith('audio/')
}
