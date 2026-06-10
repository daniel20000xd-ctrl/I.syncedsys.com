import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/not-you') ||
    pathname.startsWith('/api/health')

  // Server-to-server API calls (MCP) authenticate with a bearer token and need
  // no Supabase session. Check this before constructing the Supabase client so
  // machine callers keep working even if the session env is misconfigured.
  const authHeader = req.headers.get('authorization')
  const isBearerOk =
    pathname.startsWith('/api/') &&
    authHeader?.startsWith('Bearer ') &&
    !!process.env.MCP_SECRET &&
    authHeader.slice(7) === process.env.MCP_SECRET

  if (isPublicRoute || isBearerOk) {
    return NextResponse.next({ request: req })
  }

  // Session-based admin auth for everything else. A missing Supabase env used to
  // throw here and 500 *every* route; fail closed with a clean 503 instead.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'proxy: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set'
    )
    return new NextResponse('Service temporarily unavailable', { status: 503 })
  }

  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      domain: process.env.NODE_ENV === 'production' ? '.syncedsys.com' : undefined,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        )
      },
    },
  })

  // A transient Supabase/network failure shouldn't 500 the whole site either.
  let getUserResult
  try {
    getUserResult = await supabase.auth.getUser()
  } catch (err) {
    console.error('proxy: supabase.auth.getUser() failed', err)
    return new NextResponse('Service temporarily unavailable', { status: 503 })
  }
  const user = getUserResult.data.user

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/not-you', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
