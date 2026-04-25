import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: friendships, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

  if (error) {
    // Allow Members page to render even before friendship tables are migrated.
    if (error.message.includes("does not exist")) {
      return NextResponse.json({ friends: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const friendIds = (friendships || []).map((f) =>
    f.user_a === user.id ? f.user_b : f.user_a
  )

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", friendIds)

  return NextResponse.json({ friends: profiles || [] })
}
