import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { appendFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const DEBUG_LOG_PATHS = [
    join("c:\\Users\\User\\Downloads\\friendspace-main", "debug-885107.log"),
    join("c:\\Users\\User\\Downloads\\friendspace-main\\friendspace-main", "debug-885107.log"),
  ]
  async function logLocal(hypothesisId: string, message: string, data: Record<string, unknown>) {
    try {
      const line = `${JSON.stringify({ sessionId: "885107", runId: "pre-fix", hypothesisId, location: "app/api/upload/route.ts", message, data, timestamp: Date.now() })}\n`
      await Promise.all(DEBUG_LOG_PATHS.map((p) => appendFile(p, line)))
    } catch {
      // ignore
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'885107'},body:JSON.stringify({sessionId:'885107',runId:'pre-fix',hypothesisId:'U1',location:'app/api/upload/route.ts:5',message:'upload_route_entry',data:{hasToken:!!process.env.BLOB_READ_WRITE_TOKEN,contentType:request.headers.get('content-type')},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log
  await logLocal("U1", "upload_route_entry", {
    hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    contentType: request.headers.get("content-type"),
  })

  // Guard: fail fast with a clear message if the token is missing
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local. " +
        "Create a Vercel Blob store at vercel.com/dashboard → Storage → Create Store."
    )
    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'885107'},body:JSON.stringify({sessionId:'885107',runId:'pre-fix',hypothesisId:'U1',location:'app/api/upload/route.ts:18',message:'upload_route_missing_token',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    await logLocal("U1", "upload_route_missing_token", {})
    return NextResponse.json(
      { error: "File storage is not configured. Contact the administrator.", debugLogPath: DEBUG_LOG_PATHS },
      { status: 503 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'885107'},body:JSON.stringify({sessionId:'885107',runId:'pre-fix',hypothesisId:'U2',location:'app/api/upload/route.ts:30',message:'upload_route_parsed_formdata',data:{hasFile:!!file,fileName:file?.name,fileSize:file?.size,fileType:file?.type},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    await logLocal("U2", "upload_route_parsed_formdata", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    })

    if (!file) {
      return NextResponse.json({ error: "No file provided", debugLogPath: DEBUG_LOG_PATHS }, { status: 400 })
    }

    const blob = await put(file.name, file, {
      access: "private",
    })

    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'885107'},body:JSON.stringify({sessionId:'885107',runId:'pre-fix',hypothesisId:'U3',location:'app/api/upload/route.ts:45',message:'upload_route_put_success',data:{pathname:blob?.pathname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    await logLocal("U3", "upload_route_put_success", { pathname: (blob as any)?.pathname })

    return NextResponse.json({ pathname: blob.pathname, debugLogPath: DEBUG_LOG_PATHS })
  } catch (error) {
    console.error("Upload error:", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'885107'},body:JSON.stringify({sessionId:'885107',runId:'pre-fix',hypothesisId:'U3',location:'app/api/upload/route.ts:54',message:'upload_route_error',data:{message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    await logLocal("U3", "upload_route_error", { message })
    return NextResponse.json({ error: message, debugLogPath: DEBUG_LOG_PATHS }, { status: 500 })
  }
}
