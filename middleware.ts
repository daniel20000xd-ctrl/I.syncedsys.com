import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute =
    req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/not-you') ||
    req.nextUrl.pathname.startsWith('/api/health')

  if (isPublicRoute) return res

  // Allow server-to-server API calls (MCP) authenticated with a bearer token.
  // Scoped to /api/ only — UI pages still require the admin session.
  const authHeader = req.headers.get('authorization')
  if (
    req.nextUrl.pathname.startsWith('/api/') &&
    authHeader?.startsWith('Bearer ') &&
    authHeader.slice(7) === process.env.MCP_SECRET
  ) {
    return res
  }

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
