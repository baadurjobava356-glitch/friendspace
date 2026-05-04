import { NextResponse } from 'next/server'
import { requireUser, getMembershipForChannel } from '@/lib/mini-discord/server'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  const groupId = url.searchParams.get('groupId')
  if (!channelId && !groupId) {
    return NextResponse.json({ error: 'channelId or groupId required' }, { status: 400 })
  }

  if (channelId) {
    const member = await getMembershipForChannel(auth.supabase, channelId, auth.user.id)
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await auth.supabase
      .from('discord_voice_participants')
      .select('*')
      .eq('channel_id', channelId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ participants: await enrich(auth.supabase, data ?? []) })
  }

  // groupId: aggregate across channels in this group
  const { data: channels } = await auth.supabase
    .from('discord_channels')
    .select('id')
    .eq('group_id', groupId!)
    .eq('kind', 'voice')

  const channelIds = (channels ?? []).map((c) => c.id)
  if (channelIds.length === 0) return NextResponse.json({ participants: [] })

  const { data: parts } = await auth.supabase
    .from('discord_voice_participants')
    .select('*')
    .in('channel_id', channelIds)

  return NextResponse.json({ participants: await enrich(auth.supabase, parts ?? []) })
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { channelId?: string; muted?: boolean; deafened?: boolean; video?: boolean; screen?: boolean }
    | null
  const channelId = body?.channelId
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const member = await getMembershipForChannel(auth.supabase, channelId, auth.user.id)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Remove the user from any other voice channels first (Discord-style: only one VC at a time)
  await auth.supabase
    .from('discord_voice_participants')
    .delete()
    .eq('user_id', auth.user.id)
    .neq('channel_id', channelId)

  const upsert = {
    channel_id: channelId,
    user_id: auth.user.id,
    is_muted: body?.muted ?? false,
    is_deafened: body?.deafened ?? false,
    is_video: body?.video ?? false,
    is_screen: body?.screen ?? false,
  }

  const { error } = await auth.supabase
    .from('discord_voice_participants')
    .upsert(upsert, { onConflict: 'channel_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const { error } = await auth.supabase
    .from('discord_voice_participants')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

async function enrich(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  rows: { user_id: string; [k: string]: unknown }[],
) {
  const ids = rows.map((r) => r.user_id)
  if (ids.length === 0) return []
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids)
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  return rows.map((r) => ({
    ...r,
    display_name: byId.get(r.user_id)?.display_name ?? null,
    avatar_url: byId.get(r.user_id)?.avatar_url ?? null,
  }))
}
