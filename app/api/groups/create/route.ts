import { NextResponse } from 'next/server'
import { requireUser, slugifyGroupName } from '@/lib/mini-discord/server'

/**
 * Returns true if a Supabase/PostgREST error is caused by a missing column or
 * a missing table — i.e. the DB hasn't had migrations 005/006 applied yet.
 */
function isMissingSchemaError(err: { code?: string; message?: string } | null | undefined) {
  if (!err) return false
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()
  return (
    code === 'PGRST204' || // missing column in PostgREST schema cache
    code === '42703' || // undefined_column
    code === '42P01' || // undefined_table
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find')
  )
}

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

  // ---- 1. Insert the group, falling back to the minimal column set if extended
  //         columns (description / icon_url) aren't migrated yet (005/006).
  let group: { id: string; name: string; slug: string } | null = null
  {
    const insertExtended = await auth.supabase
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

    if (insertExtended.error && isMissingSchemaError(insertExtended.error)) {
      const insertMinimal = await auth.supabase
        .from('discord_groups')
        .insert({ name, slug, created_by: auth.user.id })
        .select()
        .single()
      if (insertMinimal.error || !insertMinimal.data) {
        return NextResponse.json(
          { error: insertMinimal.error?.message ?? 'Failed to create group' },
          { status: 500 },
        )
      }
      group = insertMinimal.data
    } else if (insertExtended.error || !insertExtended.data) {
      return NextResponse.json(
        { error: insertExtended.error?.message ?? 'Failed to create group' },
        { status: 500 },
      )
    } else {
      group = insertExtended.data
    }
  }

  if (!group) {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }

  // ---- 2. Owner membership (required, hard-fail if it errors)
  {
    const { error } = await auth.supabase.from('discord_group_members').insert({
      group_id: group.id,
      user_id: auth.user.id,
      role: 'owner',
    })
    if (error) {
      return NextResponse.json(
        { error: `Created group but failed to add owner membership: ${error.message}` },
        { status: 500 },
      )
    }
  }

  // ---- 3. Channel categories (optional — table only exists after 005)
  let textCategoryId: string | null = null
  let voiceCategoryId: string | null = null
  try {
    const { data: textCat, error: textErr } = await auth.supabase
      .from('discord_channel_categories')
      .insert({ group_id: group.id, name: 'Text Channels', position: 0 })
      .select()
      .single()
    if (!textErr && textCat) textCategoryId = textCat.id

    const { data: voiceCat, error: voiceErr } = await auth.supabase
      .from('discord_channel_categories')
      .insert({ group_id: group.id, name: 'Voice Channels', position: 1 })
      .select()
      .single()
    if (!voiceErr && voiceCat) voiceCategoryId = voiceCat.id
  } catch {
    /* table missing — fine, channels will just not be grouped. */
  }

  // ---- 4. #general text channel (best effort)
  let defaultTextId: string | null = null
  try {
    const { data: defaultText, error: textChErr } = await auth.supabase
      .from('discord_channels')
      .insert({
        group_id: group.id,
        name: 'general',
        kind: 'text',
        topic: 'Welcome to the server!',
        category_id: textCategoryId,
        position: 0,
        created_by: auth.user.id,
      })
      .select()
      .single()
    if (!textChErr && defaultText) defaultTextId = defaultText.id
  } catch {
    /* ignore — group still usable without channels created here */
  }

  // ---- 5. General voice channel (best effort)
  try {
    await auth.supabase.from('discord_channels').insert({
      group_id: group.id,
      name: 'General',
      kind: 'voice',
      category_id: voiceCategoryId,
      position: 0,
      created_by: auth.user.id,
    })
  } catch {
    /* ignore */
  }

  // ---- 6. Wire system_channel_id (only if extended column exists)
  if (defaultTextId) {
    const { error: sysErr } = await auth.supabase
      .from('discord_groups')
      .update({ system_channel_id: defaultTextId })
      .eq('id', group.id)
    if (sysErr && !isMissingSchemaError(sysErr)) {
      console.warn('[groups/create] system_channel_id update failed:', sysErr.message)
    }
  }

  // ---- 7. Starter invite (best effort — table may be missing)
  try {
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    await auth.supabase.from('discord_invites').insert({
      group_id: group.id,
      code,
      created_by: auth.user.id,
      max_uses: 25,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    })
  } catch {
    /* invites optional */
  }

  return NextResponse.json({ group, defaultTextChannelId: defaultTextId })
}
