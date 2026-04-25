import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { groupId?: string; channelId?: string; typing?: boolean }
    | null

  if (!body?.groupId || !body?.channelId) {
    return NextResponse.json({ error: 'groupId and channelId are required' }, { status: 400 })
  }

  const { error } = await auth.supabase.from('discord_presence_events').insert({
    group_id: body.groupId,
    channel_id: body.channelId,
    user_id: auth.user.id,
    event_type: body.typing ? 'typing_on' : 'typing_off',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
