import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSetting, verifyAdmin } from '@/lib/store'

/**
 * Admin session handling.
 *
 * Credentials live in the database and are editable from the console
 * (Settings -> Security). On first run the store initialises them from
 * ADMIN_PASSWORD, or the documented default for local use.
 */

export const SESSION_COOKIE = 'sv_admin_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 8

export interface AdminUser {
  id: string
  name: string
  role: 'Operations lead'
}

const secret = () =>
  process.env.ADMIN_SESSION_SECRET ?? `sv-diagnostics-dev-secret::${process.env.NODE_ENV ?? 'development'}`

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

export function verifyCredentials(id: string, password: string): AdminUser | null {
  if (!id.trim() || !password) return null
  const user = verifyAdmin(id, password)
  return user ? { id: user.id, name: user.name, role: 'Operations lead' } : null
}

/** Sessions minted before a password change stop working. */
function credentialFingerprint() {
  return sign(getSetting('admin_password_hash') || 'unset').slice(0, 12)
}

export interface Session {
  user: AdminUser
  expiresAt: number
  fp: string
}

export function createSessionToken(user: AdminUser) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  const payload = Buffer.from(JSON.stringify({ user, expiresAt, fp: credentialFingerprint() })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readSessionToken(token: string | undefined | null): Session | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = Buffer.from(sign(payload))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session
    if (!session.expiresAt || session.expiresAt < Date.now()) return null
    // Changing the password (or ID) invalidates every existing session.
    if (session.fp !== credentialFingerprint()) return null
    return session
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_TTL_SECONDS,
}

export function getSessionFromRequest(request: Request): Session | null {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.split(/;\s*/).find((part) => part.startsWith(`${SESSION_COOKIE}=`))
  if (!match) return null
  return readSessionToken(decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)))
}
