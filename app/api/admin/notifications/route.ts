import { NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { publish } from '@/lib/realtime'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  return NextResponse.json(listNotifications())
}

/** Body: { id } to mark one read, or { all: true } to clear the badge. */
export async function PATCH(request: Request) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (body.all) markAllNotificationsRead()
  else if (Number.isInteger(body.id)) markNotificationRead(body.id)
  else return NextResponse.json({ error: 'Provide an id or all:true' }, { status: 400 })

  publish('notifications', { unread: true })
  return NextResponse.json({ ok: true })
}
