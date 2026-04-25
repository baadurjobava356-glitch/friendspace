import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { requestId } = await req.json()
  if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 })

  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("receiver_id", user.id)

  if (error) {
    if (error.message.includes("does not exist")) {
      return NextResponse.json(
        { error: "Friends feature is not initialized yet. Please run database migrations." },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
