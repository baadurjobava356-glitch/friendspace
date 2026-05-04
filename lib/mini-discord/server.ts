import { createClient } from '@/lib/supabase/server'
import type { GroupRole } from '@/types'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: new Response('Unauthorized', { status: 401 }), supabase, user: null }
  }
  return { supabase, user, error: null }
}

export function slugifyGroupName(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
}

export function randomInviteCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

export const ROLE_RANK: Record<GroupRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
}

export function canActOnRole(actor: GroupRole, target: GroupRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target]
}

/** Returns the membership row for (groupId, userId) — or null. */
export async function getMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('discord_group_members')
    .select('group_id, user_id, role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  return data as { group_id: string; user_id: string; role: GroupRole } | null
}

/** Returns the membership row reached via a channel id. */
export async function getMembershipForChannel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  channelId: string,
  userId: string,
) {
  const { data: ch } = await supabase
    .from('discord_channels')
    .select('id, group_id')
    .eq('id', channelId)
    .maybeSingle()
  if (!ch) return null
  const member = await getMembership(supabase, ch.group_id, userId)
  if (!member) return null
  return { ...member, channelGroupId: ch.group_id }
}
