import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: new Response('Unauthorized', { status: 401 }), supabase, user: null }
  }

  return { supabase, user, error: null }
}

export function slugifyGroupName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function randomInviteCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}
