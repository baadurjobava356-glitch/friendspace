import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MembersClient } from "@/components/dashboard/members/members-client"
import type { Profile } from "@/types"

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("display_name", { ascending: true })

  let mergedProfiles: Profile[] = (profiles ?? []) as Profile[]
  try {
    const admin = createAdminClient()
    const { data: usersPage, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (!error && usersPage?.users) {
      const byId = new Map(mergedProfiles.map((p) => [p.id, p]))
      for (const authUser of usersPage.users) {
        if (!byId.has(authUser.id)) {
          const emailName = authUser.email?.split("@")[0] ?? "User"
          mergedProfiles.push({
            id: authUser.id,
            display_name: emailName,
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
    <MembersClient
      currentUserId={user?.id ?? ""}
      allProfiles={mergedProfiles}
    />
  )
}
