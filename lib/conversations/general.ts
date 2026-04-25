import { createAdminClient } from "@/lib/supabase/admin"

export async function ensureGeneralConversation(currentUserId: string) {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("conversations")
    .select("id, created_by")
    .eq("is_group", true)
    .eq("name", "General")
    .limit(1)
    .maybeSingle()

  const generalConversation =
    existing ??
    (
      await admin
        .from("conversations")
        .insert({
          name: "General",
          is_group: true,
          created_by: currentUserId,
        })
        .select("id, created_by")
        .single()
    ).data

  if (!generalConversation?.id) return null

  const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (usersError || !usersPage?.users) return generalConversation.id

  const { data: existingParticipants } = await admin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", generalConversation.id)

  const existingIds = new Set((existingParticipants ?? []).map((p) => p.user_id))

  const inserts = usersPage.users
    .filter((u) => !existingIds.has(u.id))
    .map((u) => ({
      conversation_id: generalConversation.id,
      user_id: u.id,
      is_admin: u.id === generalConversation.created_by,
    }))

  if (inserts.length > 0) {
    await admin.from("conversation_participants").insert(inserts)
  }

  return generalConversation.id
}
