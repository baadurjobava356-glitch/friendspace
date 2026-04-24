import { createClient } from "@/lib/supabase/server"
import { MessagesClient } from "@/components/dashboard/messages/messages-client"

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: conversations }, { data: profiles }] = await Promise.all([
    supabase
      .from("conversations")
      .select("*, conversation_participants(user_id, is_admin, last_read_at)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true }),
  ])

  return (
    <MessagesClient
      currentUserId={user?.id ?? ""}
      initialConversations={conversations ?? []}
      allProfiles={profiles ?? []}
    />
  )
}
