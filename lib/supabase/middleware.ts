import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getSupabaseCredentials() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    ''
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    ''
  return { url, key }
}

/**
 * Refreshes the Supabase session on each request. Runs on the Edge runtime on Vercel.
 *
 * If env vars are missing or anything throws, we fall back to a plain passthrough
 * response so the site does not return MIDDLEWARE_INVOCATION_FAILED (500).
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabaseCredentials()
  if (!url || !key) {
    console.error(
      '[middleware] Missing Supabase URL or anon/publishable key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel.',
    )
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, cacheHeaders) {
          // 1) Mirror cookie mutations on the request (so Server Components see the session)
          for (const { name, value } of cookiesToSet) {
            try {
              if (!value) request.cookies.delete(name)
              else request.cookies.set(name, value)
            } catch (e) {
              console.error('[middleware] request cookie update failed', name, e)
            }
          }

          // 2) Fresh response carrying Set-Cookie + cache headers (CDN session leak prevention)
          supabaseResponse = NextResponse.next({
            request,
          })

          for (const { name, value, options } of cookiesToSet) {
            try {
              if (!value) supabaseResponse.cookies.delete(name)
              else supabaseResponse.cookies.set(name, value, options)
            } catch (e) {
              console.error('[middleware] response cookie update failed', name, e)
            }
          }

          if (cacheHeaders && typeof cacheHeaders === 'object') {
            for (const [headerName, headerValue] of Object.entries(cacheHeaders)) {
              if (typeof headerValue === 'string') {
                supabaseResponse.headers.set(headerName, headerValue)
              }
            }
          }
        },
      },
    })

    // IMPORTANT: Do not run code between createServerClient and getUser() (Supabase)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (request.nextUrl.pathname.startsWith('/protected') && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  } catch (e) {
    console.error('[middleware] updateSession error', e)
    return NextResponse.next({ request })
  }

  return supabaseResponse
}
