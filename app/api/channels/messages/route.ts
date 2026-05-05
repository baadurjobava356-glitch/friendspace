import { NextResponse } from 'next/server'
import { requireUser, getMembershipForChannel } from '@/lib/mini-discord/server'
import { extractMentions } from '@/lib/mini-discord/markdown'
import type { SupabaseClient } from '@supabase/supabase-js'

type RawMessage = Record<string, unknown> & {
  id: string
  channel_id: string
  sender_id: string
  reply_to_id?: string | null
}

function isMissingSchemaError(err: { code?: string; message?: string } | null | undefined) {
  if (!err) return false
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find')
  )
}

/**
 * Loads enriched messages.
 *
 *   1. Try `v_discord_messages_enriched` (created by 008/005). Fastest path.
 *   2. If the view is missing, fall back to a manual join — discord_messages
 *      + profiles + (optional) reactions table.
 */
async function loadEnrichedMessages(
  supabase: SupabaseClient,
  channelId: string,
  before: string | null,
  limit: number,
): Promise<{ data: RawMessage[]; error: { message: string } | null }> {
  let query = supabase
    .from('v_discord_messages_enriched')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) query = query.lt('created_at', before)
  const viewRes = await query

  if (!viewRes.error) {
    return { data: (viewRes.data ?? []) as RawMessage[], error: null }
  }
  if (!isMissingSchemaError(viewRes.error)) {
    return { data: [], error: { message: viewRes.error.message } }
  }

  // Fallback: raw join
  let raw = supabase
    .from('discord_messages')
    .select('*, sender:profiles(display_name, avatar_url, presence_status)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) raw = raw.lt('created_at', before)
  const rawRes = await raw

  if (rawRes.error) {
    return { data: [], error: { message: rawRes.error.message } }
  }

  const flattened = (rawRes.data ?? []).map((row) => {
    const sender = (row as { sender?: { display_name?: string | null; avatar_url?: string | null; presence_status?: string | null } | null }).sender
    return {
      ...row,
      sender_display_name: sender?.display_name ?? null,
      sender_avatar_url: sender?.avatar_url ?? null,
      sender_presence_status: sender?.presence_status ?? null,
      reactions: [],
    } as RawMessage
  })

  return { data: flattened, error: null }
}

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

  const { data, error } = await loadEnrichedMessages(auth.supabase, channelId, before, limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve reply targets in one go
  const replyIds = Array.from(new Set(data.map((m) => m.reply_to_id).filter(Boolean))) as string[]
  const repliesById: Record<string, RawMessage> = {}
  if (replyIds.length > 0) {
    let replyQuery = auth.supabase
      .from('v_discord_messages_enriched')
      .select('*')
      .in('id', replyIds)
    let replyRes = await replyQuery

    if (replyRes.error && isMissingSchemaError(replyRes.error)) {
      replyQuery = auth.supabase
        .from('discord_messages')
        .select('*, sender:profiles(display_name, avatar_url, presence_status)')
        .in('id', replyIds)
      replyRes = await replyQuery
    }

    for (const r of (replyRes.data ?? []) as RawMessage[]) {
      repliesById[r.id] = r
    }
  }

  const messages = data
    .map((m) => ({
      ...m,
      reply_to: m.reply_to_id ? repliesById[m.reply_to_id] ?? null : null,
    }))
    .reverse()

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

  // Try inserting with all extension columns first.
  const fullInsert = {
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

  let inserted = await auth.supabase.from('discord_messages').insert(fullInsert).select().single()

  if (inserted.error && isMissingSchemaError(inserted.error)) {
    // Older schema (003 only) — strip extension columns
    const minimalInsert = {
      channel_id: channelId,
      sender_id: auth.user.id,
      content: content.slice(0, 4000),
    }
    inserted = await auth.supabase.from('discord_messages').insert(minimalInsert).select().single()
  }

  if (inserted.error || !inserted.data) {
    return NextResponse.json(
      { error: inserted.error?.message ?? 'Failed to send message' },
      { status: 500 },
    )
  }

  // Best-effort mention persistence (table may not exist on minimal schema)
  try {
    const mentioned = extractMentions(content)
    if (mentioned.length > 0) {
      const rows = mentioned.map((uid) => ({ message_id: inserted.data!.id, user_id: uid }))
      await auth.supabase.from('discord_mentions').insert(rows)
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ message: inserted.data })
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

  const fullUpdate = {
    content: content.slice(0, 4000),
    edited_at: new Date().toISOString(),
  }
  let updated = await auth.supabase
    .from('discord_messages')
    .update(fullUpdate)
    .eq('id', messageId)
    .select()
    .single()

  if (updated.error && isMissingSchemaError(updated.error)) {
    updated = await auth.supabase
      .from('discord_messages')
      .update({ content: content.slice(0, 4000) })
      .eq('id', messageId)
      .select()
      .single()
  }

  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 })
  return NextResponse.json({ message: updated.data })
}
