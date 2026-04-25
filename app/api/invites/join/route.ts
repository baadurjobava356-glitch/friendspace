import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as { code?: string } | null
  const code = body?.code?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const { data: invite } = await auth.supabase
    .from('discord_invites')
    .select('*')
    .eq('code', code)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 400 })
  }
  if (invite.used_count >= invite.max_uses) {
    return NextResponse.json({ error: 'Invite usage limit reached' }, { status: 400 })
  }

  const { error: membershipError } = await auth.supabase
    .from('discord_group_members')
    .upsert({
      group_id: invite.group_id,
      user_id: auth.user.id,
      role: 'member',
    })

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  await auth.supabase
    .from('discord_invites')
    .update({ used_count: invite.used_count + 1 })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true, groupId: invite.group_id })
}
