import { type NextRequest, NextResponse } from "next/server"
import { appendFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"

const DEBUG_LOG_PATHS = [
  join("c:\\Users\\User\\Downloads\\friendspace-main", "debug-885107.log"),
  join("c:\\Users\\User\\Downloads\\friendspace-main\\friendspace-main", "debug-885107.log"),
]

async function appendLocal(line: unknown) {
  try {
    const text = `${JSON.stringify(line)}\n`
    await Promise.all(DEBUG_LOG_PATHS.map((p) => appendFile(p, text)))
  } catch {
    // ignore
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const payload = {
    sessionId: "885107",
    runId: "pre-fix",
    hypothesisId: "DBG",
    location: "app/api/__debug/route.ts",
    message: "debug_ping",
    data: { q: Object.fromEntries(url.searchParams.entries()) },
    timestamp: Date.now(),
  }
  await appendLocal(payload)
  return NextResponse.json({ ok: true, debugLogPath: DEBUG_LOG_PATHS })
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null)
  // Also write directly to local NDJSON log so we always have evidence.
  // (Do not log secrets; payloads are controlled by our instrumentation.)
  await appendLocal(payload)
  try {
    await fetch("http://127.0.0.1:7282/ingest/b9ed78ab-557a-48a4-b579-b77a51563034", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "885107",
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true })
}

