import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendVerificationEmail } from "@/lib/email/resend"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string }
    const email = body.email?.trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    const admin = createAdminClient()
    const origin = new URL(req.url).origin
    const redirectTo = `${origin}/auth/confirm?next=/dashboard`

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message ?? "Could not generate verification link" }, { status: 400 })
    }

    await sendVerificationEmail({
      to: email,
      verifyUrl: data.properties.action_link,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
