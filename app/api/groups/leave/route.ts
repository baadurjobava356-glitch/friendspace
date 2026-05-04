import { NextResponse } from 'next/server'
import { requireUser, getMembership } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as { groupId?: string } | null
  const groupId = body?.groupId
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const member = await getMembership(auth.supabase, groupId, auth.user.id)
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 404 })
  if (member.role === 'owner') {
    return NextResponse.json(
      { error: 'Owners must transfer ownership or delete the server before leaving' },
      { status: 400 },
    )
  }

  const { error } = await auth.supabase
    .from('discord_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
