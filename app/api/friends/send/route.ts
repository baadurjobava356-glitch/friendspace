import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { receiverId } = await req.json()
  if (!receiverId) return NextResponse.json({ error: "Missing receiverId" }, { status: 400 })
  if (receiverId === user.id) return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 })

  // Check not already friends
  const { data: existing } = await supabase
    .from("friend_requests")
    .select("id, status")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`
    )
    .single()

  if (existing) {
    if (existing.status === "accepted") return NextResponse.json({ error: "Already friends" }, { status: 400 })
    if (existing.status === "pending") return NextResponse.json({ error: "Request already sent" }, { status: 400 })
  }

  const { error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: user.id, receiver_id: receiverId, status: "pending" })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
