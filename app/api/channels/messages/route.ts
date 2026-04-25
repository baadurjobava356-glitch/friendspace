import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('discord_messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { channelId?: string; content?: string }
    | null
  const channelId = body?.channelId
  const content = body?.content?.trim()
  if (!channelId || !content) {
    return NextResponse.json({ error: 'channelId and content are required' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('discord_messages')
    .insert({
      channel_id: channelId,
      sender_id: auth.user.id,
      content: content.slice(0, 4000),
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ message: data })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const url = new URL(req.url)
  const messageId = url.searchParams.get("messageId")
  if (!messageId) return NextResponse.json({ error: "messageId is required" }, { status: 400 })

  const { data: existing, error: lookupError } = await auth.supabase
    .from("discord_messages")
    .select("id, sender_id")
    .eq("id", messageId)
    .maybeSingle()

  if (lookupError || !existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }
  if (existing.sender_id !== auth.user.id) {
    return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 })
  }

  const { error } = await auth.supabase
    .from("discord_messages")
    .delete()
    .eq("id", messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
