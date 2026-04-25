import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function GET() {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const { data, error } = await auth.supabase
    .from('discord_group_members')
    .select('role, discord_groups(*)')
    .eq('user_id', auth.user.id)
    .order('joined_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const groups = (data ?? []).map((row) => ({
    role: row.role,
    group: row.discord_groups,
  }))

  return NextResponse.json({ groups })
}
