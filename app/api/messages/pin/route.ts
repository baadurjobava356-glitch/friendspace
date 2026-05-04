import { NextResponse } from 'next/server'
import { requireUser, getMembershipForChannel } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as { messageId?: string; pinned?: boolean } | null
  const messageId = body?.messageId
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const { data: msg } = await auth.supabase
    .from('discord_messages')
    .select('id, channel_id')
    .eq('id', messageId)
    .maybeSingle()
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = await getMembershipForChannel(auth.supabase, msg.channel_id, auth.user.id)
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Only admins can pin messages' }, { status: 403 })
  }

  const { error } = await auth.supabase
    .from('discord_messages')
    .update({ pinned: body?.pinned ?? true })
    .eq('id', messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const member = await getMembershipForChannel(auth.supabase, channelId, auth.user.id)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await auth.supabase
    .from('v_discord_messages_enriched')
    .select('*')
    .eq('channel_id', channelId)
    .eq('pinned', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}
