import { NextResponse } from 'next/server'
import { requireUser, getMembership, canActOnRole, ROLE_RANK } from '@/lib/mini-discord/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { GroupRole, MiniGroupMemberWithProfile } from '@/types'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const me = await getMembership(auth.supabase, groupId, auth.user.id)
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: members, error } = await auth.supabase
    .from('discord_group_members')
    .select('group_id, user_id, role, joined_at')
    .eq('group_id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with profiles
  const ids = (members ?? []).map((m) => m.user_id)
  const profilesById = new Map<string, { display_name: string | null; avatar_url: string | null; presence_status: string; custom_status: string | null; bio?: string | null }>()
  if (ids.length > 0) {
    const { data: profiles } = await auth.supabase
      .from('profiles')
      .select('id, display_name, avatar_url, presence_status, custom_status, bio')
      .in('id', ids)
    for (const p of profiles ?? []) profilesById.set(p.id, p)

    // Fill missing profiles via admin (for users without a profile row)
    if (profilesById.size < ids.length) {
      try {
        const admin = createAdminClient()
        const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        for (const u of usersPage?.users ?? []) {
          if (ids.includes(u.id) && !profilesById.has(u.id)) {
            profilesById.set(u.id, {
              display_name: u.user_metadata?.display_name ?? u.email?.split('@')[0] ?? 'User',
              avatar_url: null,
              presence_status: 'offline',
              custom_status: null,
            })
          }
        }
      } catch { /* ignore */ }
    }
  }

  // Determine recently-active members (heartbeats within 90s)
  const since = new Date(Date.now() - 90 * 1000).toISOString()
  const { data: heartbeats } = await auth.supabase
    .from('discord_presence_events')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('event_type', 'heartbeat')
    .gte('created_at', since)
  const onlineSet = new Set((heartbeats ?? []).map((h) => h.user_id))

  const enriched: MiniGroupMemberWithProfile[] = (members ?? []).map((m) => {
    const p = profilesById.get(m.user_id)
    return {
      group_id: m.group_id,
      user_id: m.user_id,
      role: m.role as GroupRole,
      joined_at: m.joined_at,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      presence_status: (p?.presence_status as MiniGroupMemberWithProfile['presence_status']) ?? 'offline',
      custom_status: p?.custom_status ?? null,
      is_online: onlineSet.has(m.user_id),
    }
  })

  enriched.sort((a, b) => {
    if (a.role !== b.role) return ROLE_RANK[b.role] - ROLE_RANK[a.role]
    return (a.display_name ?? '').localeCompare(b.display_name ?? '')
  })

  return NextResponse.json({ members: enriched, role: me.role })
}

// PATCH — change role
export async function PATCH(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { groupId?: string; userId?: string; role?: GroupRole }
    | null

  if (!body?.groupId || !body?.userId || !body?.role) {
    return NextResponse.json({ error: 'groupId, userId and role required' }, { status: 400 })
  }
  if (!['owner', 'admin', 'member'].includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const me = await getMembership(auth.supabase, body.groupId, auth.user.id)
  const target = await getMembership(auth.supabase, body.groupId, body.userId)
  if (!me || !target) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canActOnRole(me.role, target.role)) {
    return NextResponse.json({ error: 'Insufficient permissions to act on this member' }, { status: 403 })
  }
  if (body.role === 'owner') {
    if (me.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can transfer ownership' }, { status: 403 })
    }
    // Demote previous owner to admin
    await auth.supabase
      .from('discord_group_members')
      .update({ role: 'admin' })
      .eq('group_id', body.groupId)
      .eq('user_id', auth.user.id)
  }

  const { error } = await auth.supabase
    .from('discord_group_members')
    .update({ role: body.role })
    .eq('group_id', body.groupId)
    .eq('user_id', body.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — kick a member (admin/owner only, must outrank target)
export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  const userId = url.searchParams.get('userId')
  if (!groupId || !userId) return NextResponse.json({ error: 'groupId and userId required' }, { status: 400 })

  const me = await getMembership(auth.supabase, groupId, auth.user.id)
  const target = await getMembership(auth.supabase, groupId, userId)
  if (!me || !target) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canActOnRole(me.role, target.role)) {
    return NextResponse.json({ error: 'Cannot kick this member' }, { status: 403 })
  }

  const { error } = await auth.supabase
    .from('discord_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
