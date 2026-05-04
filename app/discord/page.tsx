import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DiscordApp } from '@/components/discord/discord-app'
import type { Profile, MiniProfile } from '@/types'

export const dynamic = 'force-dynamic'

interface DMConversation {
  id: string
  name: string | null
  is_group: boolean
  participants: Profile[]
  updated_at?: string
}

export default async function DiscordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ---------- Profile (auto-create if missing) ----------
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, presence_status, custom_status, banner_url, accent_color')
    .eq('id', user.id)
    .maybeSingle()

  let profile: MiniProfile
  if (profileRow) {
    profile = {
      id: profileRow.id,
      display_name: profileRow.display_name,
      avatar_url: profileRow.avatar_url,
      bio: profileRow.bio,
      presence_status: (profileRow.presence_status ?? 'online') as MiniProfile['presence_status'],
      custom_status: profileRow.custom_status ?? null,
      banner_url: profileRow.banner_url ?? null,
      accent_color: profileRow.accent_color ?? null,
    }
  } else {
    const fallback = {
      id: user.id,
      display_name: user.email?.split('@')[0] ?? 'User',
      avatar_url: null as string | null,
      bio: null as string | null,
      presence_status: 'online' as const,
      custom_status: null as string | null,
      banner_url: null as string | null,
      accent_color: null as string | null,
    }
    await supabase.from('profiles').insert(fallback).select().single()
    profile = fallback as MiniProfile
  }

  // ---------- Servers (groups the user is a member of) ----------
  const { data: memberships } = await supabase
    .from('discord_group_members')
    .select('role, group:discord_groups(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  const initialGroups = (memberships ?? []).map((m: any) => ({
    role: m.role as 'owner' | 'admin' | 'member',
    group: m.group,
  }))

  // ---------- All profiles (for friend search + mention map) ----------
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name', { ascending: true })

  const allProfiles: Profile[] = (profilesData ?? []) as Profile[]

  // Backfill any auth users missing a profile (admin)
  try {
    const admin = createAdminClient()
    const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const ids = new Set(allProfiles.map((p) => p.id))
    for (const u of page?.users ?? []) {
      if (!ids.has(u.id)) {
        allProfiles.push({
          id: u.id,
          display_name: u.user_metadata?.display_name ?? u.email?.split('@')[0] ?? 'User',
          avatar_url: null,
          bio: null,
          status: null,
          is_online: false,
          last_seen: new Date(0).toISOString(),
          created_at: u.created_at ?? new Date(0).toISOString(),
        })
      }
    }
  } catch { /* ignore */ }

  // ---------- DM conversations (best effort via admin to avoid RLS recursion) ----------
  let initialConversations: DMConversation[] = []
  try {
    const admin = createAdminClient()
    const { data: parts } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)
    const ids = (parts ?? []).map((p) => p.conversation_id)
    if (ids.length > 0) {
      const { data: convs } = await admin
        .from('conversations')
        .select('*, conversation_participants(user_id)')
        .in('id', ids)
        .order('updated_at', { ascending: false })

      const allUserIds = Array.from(new Set((convs ?? []).flatMap((c: any) =>
        (c.conversation_participants as { user_id: string }[]).map((p) => p.user_id),
      )))
      const profMap = new Map(allProfiles.filter((p) => allUserIds.includes(p.id)).map((p) => [p.id, p]))
      initialConversations = (convs ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        is_group: !!c.is_group,
        participants: (c.conversation_participants as { user_id: string }[])
          .map((cp) => profMap.get(cp.user_id))
          .filter((x): x is Profile => !!x),
        updated_at: c.updated_at,
      }))
    }
  } catch { /* fine */ }

  return (
    <DiscordApp
      currentUserId={user.id}
      email={user.email ?? null}
      initialProfile={profile}
      initialGroups={initialGroups}
      initialAllProfiles={allProfiles}
      initialConversations={initialConversations}
    />
  )
}
