import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'
import type { PresenceHeartbeatPayload } from '@/types'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as PresenceHeartbeatPayload | null
  if (!body?.groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
  }

  const { error } = await auth.supabase.from('discord_presence_events').insert({
    group_id: body.groupId,
    channel_id: body.channelId ?? null,
    user_id: auth.user.id,
    event_type: 'heartbeat',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId is required' }, { status: 400 })

  const since = new Date(Date.now() - 90 * 1000).toISOString()

  const { data, error } = await auth.supabase
    .from('discord_presence_events')
    .select('user_id, created_at')
    .eq('group_id', groupId)
    .eq('event_type', 'heartbeat')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const activeByUser = new Map<string, string>()
  for (const item of data ?? []) {
    if (!activeByUser.has(item.user_id)) activeByUser.set(item.user_id, item.created_at)
  }

  return NextResponse.json({
    onlineUserIds: Array.from(activeByUser.keys()),
  })
}
