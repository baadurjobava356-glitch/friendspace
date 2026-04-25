import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPasswordResetEmail } from "@/lib/email/resend"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string } | null
    const email = body?.email?.trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 })

    const admin = createAdminClient()
    const origin = new URL(req.url).origin
    const redirectTo = `${origin}/auth/confirm?next=/auth/reset-password`

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message ?? "Could not generate reset link" }, { status: 400 })
    }

    await sendPasswordResetEmail({
      to: email,
      resetUrl: data.properties.action_link,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
