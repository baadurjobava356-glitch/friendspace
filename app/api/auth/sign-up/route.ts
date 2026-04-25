import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendVerificationEmail } from "@/lib/email/resend"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string; password?: string; displayName?: string }
      | null
    const email = body?.email?.trim().toLowerCase()
    const password = body?.password ?? ""
    const displayName = body?.displayName?.trim() ?? ""

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: "Email, password and display name are required" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const admin = createAdminClient()
    const origin = new URL(req.url).origin
    const redirectTo = `${origin}/auth/confirm?next=/dashboard`

    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: { display_name: displayName },
        redirectTo,
      },
    })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message ?? "Failed to create signup link" }, { status: 400 })
    }

    await sendVerificationEmail({
      to: email,
      verifyUrl: data.properties.action_link,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
