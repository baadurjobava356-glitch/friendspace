import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureGeneralConversation } from "@/lib/conversations/general"
import { MessagesClient } from "@/components/dashboard/messages/messages-client"
import type { Profile } from "@/types"

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ conversation?: string; call?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let generalConversationId: string | null = null
  if (user?.id) {
    generalConversationId = await ensureGeneralConversation(user.id)
  }
  const resolvedSearchParams = await searchParams
  const initialSelectedConversationId = resolvedSearchParams?.conversation ?? generalConversationId
  const initialAutoCall = resolvedSearchParams?.call === "1"

  const [{ data: conversations }, { data: profiles }] = await Promise.all([
    (async () => {
      if (!user?.id) return { data: [] as unknown[] }
      const admin = createAdminClient()
      const { data: memberships } = await admin
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id)

      const ids = (memberships ?? []).map((m) => m.conversation_id)
      if (ids.length === 0) return { data: [] as unknown[] }

      return admin
        .from("conversations")
        .select("*, conversation_participants(user_id, is_admin, last_read_at)")
        .in("id", ids)
        .order("updated_at", { ascending: false })
    })(),
    supabase
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true }),
  ])

  let mergedProfiles: Profile[] = (profiles ?? []) as Profile[]
  try {
    const admin = createAdminClient()
    const { data: usersPage, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (!error && usersPage?.users) {
      const byId = new Map(mergedProfiles.map((p) => [p.id, p]))
      for (const authUser of usersPage.users) {
        if (!byId.has(authUser.id)) {
          const fallbackName = authUser.email?.split("@")[0] ?? "User"
          mergedProfiles.push({
            id: authUser.id,
            display_name: fallbackName,
            avatar_url: null,
            bio: null,
            status: null,
            is_online: false,
            last_seen: new Date(0).toISOString(),
            created_at: authUser.created_at ?? new Date(0).toISOString(),
          })
        }
      }
      mergedProfiles = mergedProfiles.sort((a, b) =>
        (a.display_name ?? "").localeCompare(b.display_name ?? ""),
      )
    }
  } catch {
    // fallback to profiles table only
  }

  return (
    <MessagesClient
      currentUserId={user?.id ?? ""}
      initialConversations={conversations ?? []}
      allProfiles={mergedProfiles}
      initialSelectedConversationId={initialSelectedConversationId}
      initialAutoCall={initialAutoCall}
    />
  )
}
