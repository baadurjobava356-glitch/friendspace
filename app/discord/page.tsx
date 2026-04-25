import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DiscordMvpClient } from '@/components/discord/discord-mvp-client'

export default async function DiscordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: memberships } = await supabase
    .from('discord_group_members')
    .select('role, discord_groups(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const initialGroups = (memberships ?? []).map((m) => ({
    role: m.role,
    group: m.discord_groups,
  }))

  return <DiscordMvpClient currentUserId={user.id} initialGroups={initialGroups} />
}
