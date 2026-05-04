import { NextResponse } from 'next/server'
import { requireUser, getMembership } from '@/lib/mini-discord/server'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const me = await getMembership(auth.supabase, groupId, auth.user.id)
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await auth.supabase
    .from('discord_invites')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invites: data ?? [] })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const inviteId = url.searchParams.get('inviteId')
  if (!inviteId) return NextResponse.json({ error: 'inviteId required' }, { status: 400 })

  const { error } = await auth.supabase
    .from('discord_invites')
    .delete()
    .eq('id', inviteId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
