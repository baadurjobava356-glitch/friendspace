import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { messageId?: string; emoji?: string; toggle?: boolean }
    | null

  const messageId = body?.messageId
  const emoji = body?.emoji?.trim()
  if (!messageId || !emoji) return NextResponse.json({ error: 'messageId and emoji required' }, { status: 400 })

  if (body?.toggle) {
    const { data: existing } = await auth.supabase
      .from('discord_reactions')
      .select('emoji')
      .eq('message_id', messageId)
      .eq('user_id', auth.user.id)
      .eq('emoji', emoji)
      .maybeSingle()
    if (existing) {
      await auth.supabase
        .from('discord_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', auth.user.id)
        .eq('emoji', emoji)
      return NextResponse.json({ ok: true, removed: true })
    }
  }

  const { error } = await auth.supabase.from('discord_reactions').insert({
    message_id: messageId,
    user_id: auth.user.id,
    emoji: emoji.slice(0, 32),
  })
  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const messageId = url.searchParams.get('messageId')
  const emoji = url.searchParams.get('emoji')
  if (!messageId || !emoji) {
    return NextResponse.json({ error: 'messageId and emoji required' }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from('discord_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', auth.user.id)
    .eq('emoji', emoji)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
