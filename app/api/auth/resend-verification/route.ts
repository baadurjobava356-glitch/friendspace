import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { appendFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const DEBUG_LOG_PATHS = [
    join("c:\\Users\\User\\Downloads\\friendspace-main", "debug-885107.log"),
    join("c:\\Users\\User\\Downloads\\friendspace-main\\friendspace-main", "debug-885107.log"),
  ]
  async function logLocal(hypothesisId: string, message: string, data: Record<string, unknown>) {
    try {
      const line = `${JSON.stringify({ sessionId: "885107", runId: "pre-fix", hypothesisId, location: "app/api/auth/resend-verification/route.ts", message, data, timestamp: Date.now() })}\n`
      await Promise.all(DEBUG_LOG_PATHS.map((p) => appendFile(p, line)))
    } catch {
      // ignore
    }
  }

  try {
    const { email } = (await req.json().catch(() => ({}))) as { email?: string }
    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'885107'},body:JSON.stringify({sessionId:'885107',runId:'pre-fix',hypothesisId:'V2',location:'app/api/auth/resend-verification/route.ts:8',message:'resend_verification_entry',data:{hasEmail:!!email},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    await logLocal("V2", "resend_verification_entry", { hasEmail: !!email })

    if (!email) {
      return NextResponse.json({ error: "Missing email", debugLogPath: DEBUG_LOG_PATHS }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resend({ type: "signup", email })

    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'885107'},body:JSON.stringify({sessionId:'885107',runId:'pre-fix',hypothesisId:'V2',location:'app/api/auth/resend-verification/route.ts:23',message:'resend_verification_error',data:{message:error.message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
      await logLocal("V2", "resend_verification_error", { message: error.message })
      return NextResponse.json({ error: error.message, debugLogPath: DEBUG_LOG_PATHS }, { status: 400 })
    }

    await logLocal("V2", "resend_verification_success", {})
    return NextResponse.json({ ok: true, debugLogPath: DEBUG_LOG_PATHS })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    await logLocal("V2", "resend_verification_exception", { message })
    return NextResponse.json({ error: message, debugLogPath: DEBUG_LOG_PATHS }, { status: 500 })
  }
}
