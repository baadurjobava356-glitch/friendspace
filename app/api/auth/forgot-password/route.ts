import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPasswordResetEmail } from "@/lib/email/resend"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string } | null
    const email = body?.email?.trim().toLowerCase()
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/e98abe5e-1ecf-45e8-bcf9-9333b078fd84',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5788ba'},body:JSON.stringify({sessionId:'5788ba',runId:'pre-fix',hypothesisId:'H1',location:'app/api/auth/forgot-password/route.ts:11',message:'forgot_password_request_received',data:{hasEmail:!!email},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 })

    const admin = createAdminClient()
    const origin = new URL(req.url).origin
    const redirectTo = `${origin}/auth/confirm?next=/auth/reset-password`
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/e98abe5e-1ecf-45e8-bcf9-9333b078fd84',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5788ba'},body:JSON.stringify({sessionId:'5788ba',runId:'pre-fix',hypothesisId:'H2',location:'app/api/auth/forgot-password/route.ts:19',message:'forgot_password_env_branch_check',data:{hasResendKey:!!process.env.RESEND_API_KEY,hasFromEmail:!!process.env.RESEND_FROM_EMAIL},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    if (process.env.RESEND_API_KEY) {
      // #region agent log
      fetch('http://127.0.0.1:7523/ingest/e98abe5e-1ecf-45e8-bcf9-9333b078fd84',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5788ba'},body:JSON.stringify({sessionId:'5788ba',runId:'pre-fix',hypothesisId:'H3',location:'app/api/auth/forgot-password/route.ts:23',message:'forgot_password_using_resend_path',data:{provider:'resend'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
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
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7523/ingest/e98abe5e-1ecf-45e8-bcf9-9333b078fd84',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5788ba'},body:JSON.stringify({sessionId:'5788ba',runId:'pre-fix',hypothesisId:'H4',location:'app/api/auth/forgot-password/route.ts:39',message:'forgot_password_using_supabase_fallback',data:{provider:'supabase'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/e98abe5e-1ecf-45e8-bcf9-9333b078fd84',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5788ba'},body:JSON.stringify({sessionId:'5788ba',runId:'pre-fix',hypothesisId:'H5',location:'app/api/auth/forgot-password/route.ts:50',message:'forgot_password_catch_error',data:{errorMessage:error instanceof Error ? error.message : 'Unknown error'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
