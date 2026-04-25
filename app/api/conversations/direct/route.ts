import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { targetUserId?: string } | null
  const targetUserId = body?.targetUserId
  if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 })
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot create a DM with yourself" }, { status: 400 })
  }

  const { data: myParticipants, error: myPartsError } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id)

  if (myPartsError) return NextResponse.json({ error: myPartsError.message }, { status: 400 })

  const myConversationIds = (myParticipants ?? []).map((r) => r.conversation_id)
  if (myConversationIds.length > 0) {
    const { data: candidateRows, error: candidateError } = await admin
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", myConversationIds)

    if (candidateError) {
      return NextResponse.json({ error: candidateError.message }, { status: 400 })
    }

    const byConversation = new Map<string, Set<string>>()
    for (const row of candidateRows ?? []) {
      if (!byConversation.has(row.conversation_id)) byConversation.set(row.conversation_id, new Set())
      byConversation.get(row.conversation_id)!.add(row.user_id)
    }

    for (const [conversationId, users] of byConversation.entries()) {
      if (users.size === 2 && users.has(user.id) && users.has(targetUserId)) {
        const { data: existingConversation } = await admin
          .from("conversations")
          .select("*, conversation_participants(user_id, is_admin, last_read_at)")
          .eq("id", conversationId)
          .single()

        if (existingConversation && !existingConversation.is_group) {
          return NextResponse.json({
            conversationId,
            conversation: existingConversation,
            created: false,
          })
        }
      }
    }
  }

  const { data: conversation, error: insertConversationError } = await admin
    .from("conversations")
    .insert({
      name: null,
      is_group: false,
      created_by: user.id,
    })
    .select()
    .single()

  if (insertConversationError || !conversation) {
    return NextResponse.json(
      { error: insertConversationError?.message ?? "Failed to create conversation" },
      { status: 400 },
    )
  }

  const participants = [
    { conversation_id: conversation.id, user_id: user.id, is_admin: true },
    { conversation_id: conversation.id, user_id: targetUserId, is_admin: false },
  ]

  const { error: participantsError } = await admin
    .from("conversation_participants")
    .insert(participants)

  if (participantsError) {
    return NextResponse.json({ error: participantsError.message }, { status: 400 })
  }

  const createdConversation = {
    ...conversation,
    conversation_participants: participants,
  }

  return NextResponse.json({
    conversationId: conversation.id,
    conversation: createdConversation,
    created: true,
  })
}
