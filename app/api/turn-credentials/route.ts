import { NextResponse } from "next/server"

// Get free TURN credentials from https://www.metered.ca/tools/openrelay/
// Set env vars: METERED_API_KEY, METERED_APP_NAME
export async function GET() {
  const apiKey = process.env.METERED_API_KEY
  const appName = process.env.METERED_APP_NAME || "openrelay"

  if (!apiKey) {
    // Fallback: return only STUN
    return NextResponse.json({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })
  }

  try {
    const res = await fetch(
      `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    )
    if (!res.ok) throw new Error("Metered API error")
    const iceServers = await res.json()
    return NextResponse.json({ iceServers })
  } catch {
    return NextResponse.json({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })
  }
}
