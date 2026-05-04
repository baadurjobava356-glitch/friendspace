import { NextResponse } from 'next/server'
import { requireUser, getMembership } from '@/lib/mini-discord/server'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId is required' }, { status: 400 })

  const membership = await getMembership(auth.supabase, groupId, auth.user.id)
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [channelsRes, categoriesRes] = await Promise.all([
    auth.supabase
      .from('discord_channels')
      .select('*')
      .eq('group_id', groupId)
      .order('position', { ascending: true })
      .order('name', { ascending: true }),
    auth.supabase
      .from('discord_channel_categories')
      .select('*')
      .eq('group_id', groupId)
      .order('position', { ascending: true }),
  ])

  if (channelsRes.error) return NextResponse.json({ error: channelsRes.error.message }, { status: 500 })

  return NextResponse.json({
    channels: channelsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    role: membership.role,
  })
}
