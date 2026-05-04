import { NextResponse } from 'next/server'
import { requireUser, slugifyGroupName } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { name?: string; description?: string; iconUrl?: string }
    | null

  const name = body?.name?.trim()
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Group name must be at least 2 characters' }, { status: 400 })
  }

  const baseSlug = slugifyGroupName(name)
  const slug = `${baseSlug || 'server'}-${Math.floor(Math.random() * 100000)}`

  const { data: group, error } = await auth.supabase
    .from('discord_groups')
    .insert({
      name,
      slug,
      description: body?.description?.slice(0, 240) ?? null,
      icon_url: body?.iconUrl ?? null,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error || !group) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create group' }, { status: 500 })
  }

  await auth.supabase.from('discord_group_members').insert({
    group_id: group.id,
    user_id: auth.user.id,
    role: 'owner',
  })

  // Default "TEXT CHANNELS" + "VOICE CHANNELS" categories
  const { data: textCategory } = await auth.supabase
    .from('discord_channel_categories')
    .insert({ group_id: group.id, name: 'Text Channels', position: 0 })
    .select()
    .single()

  const { data: voiceCategory } = await auth.supabase
    .from('discord_channel_categories')
    .insert({ group_id: group.id, name: 'Voice Channels', position: 1 })
    .select()
    .single()

  // #general text channel
  const { data: defaultText } = await auth.supabase
    .from('discord_channels')
    .insert({
      group_id: group.id,
      name: 'general',
      kind: 'text',
      topic: 'Welcome to the server!',
      category_id: textCategory?.id ?? null,
      position: 0,
      created_by: auth.user.id,
    })
    .select()
    .single()

  // General voice channel
  await auth.supabase.from('discord_channels').insert({
    group_id: group.id,
    name: 'General',
    kind: 'voice',
    category_id: voiceCategory?.id ?? null,
    position: 0,
    created_by: auth.user.id,
  })

  if (defaultText?.id) {
    await auth.supabase
      .from('discord_groups')
      .update({ system_channel_id: defaultText.id })
      .eq('id', group.id)
  }

  // Auto-create a starter invite (7 days, 25 uses)
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  await auth.supabase.from('discord_invites').insert({
    group_id: group.id,
    code,
    created_by: auth.user.id,
    max_uses: 25,
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  })

  return NextResponse.json({ group, defaultTextChannelId: defaultText?.id ?? null })
}
