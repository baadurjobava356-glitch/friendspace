import { NextResponse } from 'next/server'
import { requireUser, slugifyGroupName } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Group name must be at least 2 characters' }, { status: 400 })
  }

  const baseSlug = slugifyGroupName(name)
  const slug = `${baseSlug || 'group'}-${Math.floor(Math.random() * 10000)}`

  const { data: group, error } = await auth.supabase
    .from('discord_groups')
    .insert({
      name,
      slug,
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

  const { data: defaultText } = await auth.supabase
    .from('discord_channels')
    .insert({
      group_id: group.id,
      name: 'general',
      kind: 'text',
      created_by: auth.user.id,
    })
    .select()
    .single()

  await auth.supabase.from('discord_channels').insert({
    group_id: group.id,
    name: 'voice-general',
    kind: 'voice',
    created_by: auth.user.id,
  })

  return NextResponse.json({ group, defaultTextChannelId: defaultText?.id ?? null })
}
