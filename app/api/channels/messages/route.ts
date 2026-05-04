import { NextResponse } from 'next/server'
import { requireUser, getMembershipForChannel } from '@/lib/mini-discord/server'
import { extractMentions } from '@/lib/mini-discord/markdown'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  const before = url.searchParams.get('before')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 200)

  if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 })

  const member = await getMembershipForChannel(auth.supabase, channelId, auth.user.id)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let query = auth.supabase
    .from('v_discord_messages_enriched')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve replies (single fetch)
  const replyIds = Array.from(new Set((data ?? []).map((m) => m.reply_to_id).filter(Boolean))) as string[]
  const repliesById: Record<string, unknown> = {}
  if (replyIds.length > 0) {
    const { data: replies } = await auth.supabase
      .from('v_discord_messages_enriched')
      .select('*')
      .in('id', replyIds)
    for (const r of replies ?? []) repliesById[r.id] = r
  }

  const messages = (data ?? [])
    .map((m) => ({
      ...m,
      reply_to: m.reply_to_id ? repliesById[m.reply_to_id] ?? null : null,
    }))
    .reverse() // oldest first for the UI

  return NextResponse.json({ messages })
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | {
        channelId?: string
        content?: string
        replyToId?: string | null
        attachment?: {
          url: string
          name: string
          type?: string
          sizeBytes?: number
        } | null
      }
    | null

  const channelId = body?.channelId
  const content = (body?.content ?? '').trim()

  if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
  if (!content && !body?.attachment) {
    return NextResponse.json({ error: 'Message must have content or attachment' }, { status: 400 })
  }

  const member = await getMembershipForChannel(auth.supabase, channelId, auth.user.id)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const insert = {
    channel_id: channelId,
    sender_id: auth.user.id,
    content: content.slice(0, 4000),
    reply_to_id: body?.replyToId ?? null,
    message_type: body?.attachment ? 'file' : (body?.replyToId ? 'reply' : 'default'),
    attachment_url: body?.attachment?.url ?? null,
    attachment_name: body?.attachment?.name ?? null,
    attachment_type: body?.attachment?.type ?? null,
    attachment_size_bytes: body?.attachment?.sizeBytes ?? null,
  }

  const { data, error } = await auth.supabase
    .from('discord_messages')
    .insert(insert)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to send message' }, { status: 500 })
  }

  // Persist mentions
  const mentioned = extractMentions(content)
  if (mentioned.length > 0) {
    const rows = mentioned.map((uid) => ({ message_id: data.id, user_id: uid }))
    await auth.supabase.from('discord_mentions').insert(rows)
  }

  return NextResponse.json({ message: data })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const messageId = url.searchParams.get('messageId')
  if (!messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 })

  const { error } = await auth.supabase.from('discord_messages').delete().eq('id', messageId)
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { messageId?: string; content?: string }
    | null

  const messageId = body?.messageId
  const content = body?.content?.trim()
  if (!messageId || !content) {
    return NextResponse.json({ error: 'messageId and content required' }, { status: 400 })
  }

  const { data: existing } = await auth.supabase
    .from('discord_messages')
    .select('id, sender_id')
    .eq('id', messageId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.sender_id !== auth.user.id) {
    return NextResponse.json({ error: 'Only the author can edit this message' }, { status: 403 })
  }

  const { data, error } = await auth.supabase
    .from('discord_messages')
    .update({ content: content.slice(0, 4000), edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
