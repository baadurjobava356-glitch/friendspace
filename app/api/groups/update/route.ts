import { NextResponse } from 'next/server'
import { requireUser, getMembership } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { groupId?: string; name?: string; description?: string; iconUrl?: string | null }
    | null

  const groupId = body?.groupId
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const member = await getMembership(auth.supabase, groupId, auth.user.id)
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body?.name === 'string' && body.name.trim().length >= 2) update.name = body.name.trim().slice(0, 80)
  if (typeof body?.description === 'string') update.description = body.description.slice(0, 240)
  if ('iconUrl' in (body ?? {})) update.icon_url = body?.iconUrl ?? null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('discord_groups')
    .update(update)
    .eq('id', groupId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group: data })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const member = await getMembership(auth.supabase, groupId, auth.user.id)
  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can delete the server' }, { status: 403 })
  }

  const { error } = await auth.supabase.from('discord_groups').delete().eq('id', groupId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
