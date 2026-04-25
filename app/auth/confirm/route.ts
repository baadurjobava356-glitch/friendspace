import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/"

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    type: type as "signup" | "recovery" | "invite" | "email_change" | "email",
    token_hash: tokenHash,
  })

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
