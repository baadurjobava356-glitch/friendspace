import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
  }

  const { data: membership } = await auth.supabase
    .from('discord_group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', auth.user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await auth.supabase
    .from('discord_channels')
    .select('*')
    .eq('group_id', groupId)
    .order('kind', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ channels: data ?? [] })
}
