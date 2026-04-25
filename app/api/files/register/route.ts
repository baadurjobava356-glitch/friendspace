import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | {
        groupId?: string
        messageId?: string
        storagePath?: string
        originalName?: string
        contentType?: string
        sizeBytes?: number
      }
    | null

  if (
    !body?.groupId ||
    !body.messageId ||
    !body.storagePath ||
    !body.originalName ||
    !body.contentType ||
    !body.sizeBytes
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('discord_attachments')
    .insert({
      group_id: body.groupId,
      message_id: body.messageId,
      storage_path: body.storagePath,
      original_name: body.originalName,
      content_type: body.contentType,
      size_bytes: body.sizeBytes,
      uploaded_by: auth.user.id,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to register attachment' }, { status: 500 })
  }

  return NextResponse.json({ attachment: data })
}
