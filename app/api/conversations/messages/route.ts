import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const conversationId = url.searchParams.get("conversationId")
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: membership, error: membershipError } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: messages, error } = await admin
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ messages: messages ?? [] })
}

export async function POST(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as
    | {
        conversationId?: string
        content?: string
        messageType?: string
        fileUrl?: string | null
        fileName?: string | null
      }
    | null

  const conversationId = body?.conversationId
  const content = (body?.content ?? "").trim()
  const messageType = body?.messageType ?? "text"
  const fileUrl = body?.fileUrl ?? null
  const fileName = body?.fileName ?? null

  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  if (!content && !fileUrl) return NextResponse.json({ error: "Message is empty" }, { status: 400 })

  const admin = createAdminClient()
  const { data: membership, error: membershipError } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: message, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType,
      file_url: fileUrl,
      file_name: fileName,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)

  return NextResponse.json({ message })
}

export async function DELETE(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const conversationId = url.searchParams.get("conversationId")
  const messageId = url.searchParams.get("messageId")
  if (!conversationId || !messageId) {
    return NextResponse.json({ error: "Missing conversationId or messageId" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: membership, error: membershipError } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: existing, error: existingError } = await admin
    .from("messages")
    .select("id, sender_id, conversation_id")
    .eq("id", messageId)
    .maybeSingle()

  if (existingError || !existing || existing.conversation_id !== conversationId) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  if (existing.sender_id !== user.id) {
    return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 })
  }

  const { error } = await admin
    .from("messages")
    .delete()
    .eq("id", messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
