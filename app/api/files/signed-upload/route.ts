import { NextResponse } from 'next/server'
import { miniDiscordConfig, isAllowedMimeType } from '@/lib/mini-discord/config'
import { requireUser } from '@/lib/mini-discord/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | { groupId?: string; fileName?: string; contentType?: string; sizeBytes?: number }
    | null

  if (!body?.groupId || !body.fileName || !body.contentType || !body.sizeBytes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (body.sizeBytes > miniDiscordConfig.file.maxBytes) {
    return NextResponse.json({ error: 'File exceeds max size limit' }, { status: 400 })
  }

  if (!isAllowedMimeType(body.contentType)) {
    return NextResponse.json({ error: 'File type is not allowed' }, { status: 400 })
  }

  const { data: membership } = await auth.supabase
    .from('discord_group_members')
    .select('group_id')
    .eq('group_id', body.groupId)
    .eq('user_id', auth.user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: usageRows } = await auth.supabase
    .from('discord_attachments')
    .select('size_bytes')
    .eq('group_id', body.groupId)

  const usedBytes = (usageRows ?? []).reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)
  if (usedBytes + body.sizeBytes > miniDiscordConfig.file.maxStoragePerGroupBytes) {
    return NextResponse.json({ error: 'Group storage quota exceeded' }, { status: 400 })
  }

  const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${body.groupId}/${auth.user.id}/${Date.now()}-${safeName}`
  const bucket = process.env.MINI_DISCORD_STORAGE_BUCKET ?? 'discord-files'

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Upload URL failed' }, { status: 500 })

  return NextResponse.json({
    bucket,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    limits: {
      maxBytes: miniDiscordConfig.file.maxBytes,
      maxStoragePerGroupBytes: miniDiscordConfig.file.maxStoragePerGroupBytes,
    },
  })
}
