import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/mini-discord/server'

export async function GET() {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) {
    // create on the fly
    const fallback = {
      id: auth.user.id,
      display_name: auth.user.email?.split('@')[0] ?? 'User',
      presence_status: 'online' as const,
    }
    await auth.supabase.from('profiles').insert(fallback)
    return NextResponse.json({ profile: fallback })
  }
  return NextResponse.json({ profile: data })
}

export async function PATCH(req: Request) {
  const auth = await requireUser()
  if (auth.error || !auth.user) return auth.error

  const body = (await req.json().catch(() => null)) as
    | {
        displayName?: string
        bio?: string
        avatarUrl?: string | null
        bannerUrl?: string | null
        accentColor?: string | null
        presenceStatus?: 'online' | 'idle' | 'dnd' | 'offline' | 'invisible'
        customStatus?: string | null
      }
    | null

  const update: Record<string, unknown> = {}
  if (typeof body?.displayName === 'string' && body.displayName.trim()) {
    update.display_name = body.displayName.trim().slice(0, 32)
  }
  if (typeof body?.bio === 'string') update.bio = body.bio.slice(0, 200)
  if ('avatarUrl' in (body ?? {})) update.avatar_url = body?.avatarUrl ?? null
  if ('bannerUrl' in (body ?? {})) update.banner_url = body?.bannerUrl ?? null
  if ('accentColor' in (body ?? {})) update.accent_color = body?.accentColor ?? null
  if (body?.presenceStatus) update.presence_status = body.presenceStatus
  if ('customStatus' in (body ?? {})) update.custom_status = body?.customStatus ?? null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: existing } = await auth.supabase
    .from('profiles')
    .select('id')
    .eq('id', auth.user.id)
    .maybeSingle()

  let res
  if (!existing) {
    res = await auth.supabase
      .from('profiles')
      .insert({ id: auth.user.id, ...update })
      .select()
      .single()
  } else {
    res = await auth.supabase
      .from('profiles')
      .update(update)
      .eq('id', auth.user.id)
      .select()
      .single()
  }

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
  return NextResponse.json({ profile: res.data })
}
