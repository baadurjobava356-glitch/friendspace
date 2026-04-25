import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const payload = {
    sessionId: "89480e",
    runId: "post-fix",
    hypothesisId: "H6",
    location: "app/api/debug/route.ts:8",
    message: "debug_probe",
    data: { q: Object.fromEntries(url.searchParams.entries()) },
    timestamp: Date.now(),
  }
  console.error("CLIENT_DEBUG", JSON.stringify(payload))
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null)
  if (payload && typeof payload === "object") {
    console.error("CLIENT_DEBUG", JSON.stringify(payload))
  } else {
    console.error("CLIENT_DEBUG", "invalid_payload")
  }
  return NextResponse.json({ ok: true })
}
