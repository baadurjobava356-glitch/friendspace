import { NextResponse } from 'next/server'
import { randomInviteCode, requireUser } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { groupId?: string; maxUses?: number; expiresInHours?: number }
    | null

  if (!body?.groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
  }

  const { data: member } = await auth.supabase
    .from('discord_group_members')
    .select('role')
    .eq('group_id', body.groupId)
    .eq('user_id', auth.user.id)
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const maxUses = Math.min(Math.max(body.maxUses ?? 25, 1), 250)
  const expiresInHours = Math.min(Math.max(body.expiresInHours ?? 72, 1), 24 * 30)
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()

  const { data, error } = await auth.supabase
    .from('discord_invites')
    .insert({
      group_id: body.groupId,
      code: randomInviteCode(),
      created_by: auth.user.id,
      max_uses: maxUses,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create invite' }, { status: 500 })
  }

  return NextResponse.json({ invite: data })
}
