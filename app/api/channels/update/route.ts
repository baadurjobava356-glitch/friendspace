import { NextResponse } from 'next/server'
import { requireUser, getMembershipForChannel } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { channelId?: string; name?: string; topic?: string; categoryId?: string | null }
    | null

  const channelId = body?.channelId
  if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 })

  const member = await getMembershipForChannel(auth.supabase, channelId, auth.user.id)
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body?.name === 'string' && body.name.trim()) {
    update.name = body.name.trim().slice(0, 32)
  }
  if (typeof body?.topic === 'string') update.topic = body.topic.slice(0, 256)
  if ('categoryId' in (body ?? {})) update.category_id = body?.categoryId ?? null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('discord_channels')
    .update(update)
    .eq('id', channelId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ channel: data })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 })

  const member = await getMembershipForChannel(auth.supabase, channelId, auth.user.id)
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { error } = await auth.supabase.from('discord_channels').delete().eq('id', channelId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
