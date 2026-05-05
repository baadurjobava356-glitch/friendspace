import { NextResponse } from 'next/server'
import { requireUser, getMembership } from '@/lib/mini-discord/server'

function isMissingSchemaError(err: { code?: string; message?: string } | null | undefined) {
  if (!err) return false
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find')
  )
}

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId is required' }, { status: 400 })

  const membership = await getMembership(auth.supabase, groupId, auth.user.id)
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Channels — try with extension columns (position, topic, category_id, is_nsfw),
  // fall back to base columns if the schema hasn't been migrated yet.
  let channelsRes = await auth.supabase
    .from('discord_channels')
    .select('*')
    .eq('group_id', groupId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (channelsRes.error && isMissingSchemaError(channelsRes.error)) {
    channelsRes = await auth.supabase
      .from('discord_channels')
      .select('*')
      .eq('group_id', groupId)
      .order('name', { ascending: true })
  }

  if (channelsRes.error) {
    return NextResponse.json({ error: channelsRes.error.message }, { status: 500 })
  }

  // Categories — optional, table only exists after 005/008
  let categoriesData: unknown[] = []
  try {
    const categoriesRes = await auth.supabase
      .from('discord_channel_categories')
      .select('*')
      .eq('group_id', groupId)
      .order('position', { ascending: true })
    if (!categoriesRes.error) categoriesData = categoriesRes.data ?? []
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    channels: channelsRes.data ?? [],
    categories: categoriesData,
    role: membership.role,
  })
}
