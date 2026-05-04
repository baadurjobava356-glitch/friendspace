import { NextResponse } from 'next/server'
import { miniDiscordConfig } from '@/lib/mini-discord/config'
import { requireUser } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { roomName?: string; displayName?: string }
    | null

  const roomName = body?.roomName?.trim()
  if (!roomName) return NextResponse.json({ error: 'roomName is required' }, { status: 400 })

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: 'LiveKit is not configured in environment variables' },
      { status: 503 },
    )
  }

  const { AccessToken } = await import('livekit-server-sdk')
  const token = new AccessToken(apiKey, apiSecret, {
    identity: auth.user.id,
    name: body?.displayName || auth.user.email || 'Member',
    ttl: '30m',
  })

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  })

  return NextResponse.json({
    token: await token.toJwt(),
    wsUrl,
    limits: {
      maxParticipantsPerRoom: miniDiscordConfig.voice.maxParticipantsPerRoom,
    },
  })
}
