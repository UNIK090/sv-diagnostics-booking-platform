import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'sv_admin_session'

/**
 * Fast reject for admin APIs when no session cookie is present, so stray
 * requests never reach the database. Signature verification still happens
 * server-side in every route — presence of a cookie is not authentication.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
