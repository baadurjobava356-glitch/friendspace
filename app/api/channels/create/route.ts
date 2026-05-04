import { NextResponse } from 'next/server'
import { requireUser, getMembership } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { groupId?: string; name?: string; kind?: 'text' | 'voice'; categoryId?: string | null; topic?: string }
    | null

  if (!body?.groupId || !body?.name?.trim() || !body?.kind) {
    return NextResponse.json({ error: 'groupId, name and kind are required' }, { status: 400 })
  }
  if (body.kind !== 'text' && body.kind !== 'voice') {
    return NextResponse.json({ error: 'kind must be text or voice' }, { status: 400 })
  }

  const member = await getMembership(auth.supabase, body.groupId, auth.user.id)
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const cleanName = body.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_\-]/g, '')
    .slice(0, 32)

  if (!cleanName) {
    return NextResponse.json({ error: 'Channel name invalid' }, { status: 400 })
  }

  // pick the next position within the category
  const { data: positionRow } = await auth.supabase
    .from('discord_channels')
    .select('position')
    .eq('group_id', body.groupId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await auth.supabase
    .from('discord_channels')
    .insert({
      group_id: body.groupId,
      name: body.kind === 'voice' ? body.name.trim().slice(0, 32) : cleanName,
      kind: body.kind,
      category_id: body.categoryId ?? null,
      topic: body.topic?.slice(0, 256) ?? null,
      position: (positionRow?.position ?? 0) + 1,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create channel' }, { status: 500 })
  }
  return NextResponse.json({ channel: data })
}
