import { createClient } from "@/lib/supabase/server"
import { MembersClient } from "@/components/dashboard/members/members-client"

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("display_name", { ascending: true })

  return (
    <MembersClient
      currentUserId={user?.id ?? ""}
      allProfiles={profiles ?? []}
    />
  )
}
