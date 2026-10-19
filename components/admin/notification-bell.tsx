'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Bell, CalendarDays, CheckCheck, ExternalLink, MessageCircle, Package, X } from 'lucide-react'
import type { Snapshot } from '@/lib/snapshot'

type Notification = Snapshot['notifications'][number]

const KIND_ICON: Record<string, typeof Bell> = {
  booking: CalendarDays,
  test: Package,
  report: MessageCircle,
  system: AlertCircle,
}

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

/**
 * Staff notification bell. The unread count comes from the shared snapshot, so
 * it updates over SSE the moment a patient books — no polling.
 */
export function NotificationBell({
  notifications,
  unread,
  onOpenOrder,
  onOpenSettings,
}: {
  notifications: Notification[]
  unread: number
  onOpenOrder: (orderId: string) => void
  onOpenSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const previousUnread = useRef(unread)
  const wrapper = useRef<HTMLDivElement>(null)

  // Brief highlight when the count increases (a booking just arrived).
  useEffect(() => {
    if (unread > previousUnread.current) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 2500)
      return () => clearTimeout(timer)
    }
    previousUnread.current = unread
  }, [unread])

  useEffect(() => { previousUnread.current = unread }, [unread])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const markAllRead = async () => {
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  const openNotification = async (notification: Notification) => {
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notification.id }),
    })
    setOpen(false)
    if (notification.order_id) onOpenOrder(notification.order_id)
    else onOpenSettings()
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className={`relative grid size-9 place-items-center rounded-lg border transition-all duration-300 ${pulse
            ? 'border-[var(--coral)] bg-[var(--coral-soft)] text-[var(--coral)]'
            : 'border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
          }`}
      >
        <Bell size={16} className={pulse ? 'animate-[wiggle_0.5s_ease-in-out_2]' : ''} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-[var(--coral)] px-1 text-[9.5px] font-bold leading-[17px] text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="anim-in absolute right-0 top-11 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[0_24px_60px_-20px_rgba(16,40,61,0.45),0_4px_14px_-6px_rgba(16,40,61,0.18)] ring-1 ring-black/[0.03]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <div>
              <b className="block text-[13px] font-bold">Notifications</b>
              <span className="text-[10.5px] text-[var(--ink-muted)]">{unread > 0 ? `${unread} unread` : 'All caught up'}</span>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)]">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid size-6 place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--muted)]"><X size={13} /></button>
            </div>
          </div>

          <div className="max-h-[min(560px,calc(100vh-160px))] overflow-y-auto overscroll-contain">
            {notifications.length === 0 && (
              <div className="p-10 text-center">
                <Bell size={20} className="mx-auto text-[var(--ink-muted)]" />
                <p className="mt-2 text-[12px] font-semibold">No notifications yet</p>
                <p className="mt-1 text-[11px] text-[var(--ink-muted)]">New patient bookings appear here instantly.</p>
              </div>
            )}
            {notifications.map((notification) => {
              const Icon = KIND_ICON[notification.kind] ?? Bell
              const whatsapp = notification.delivery?.whatsapp
              return (
                <div key={notification.id} className={`border-b border-[var(--line)] last:border-0 ${notification.read_at ? '' : 'bg-[var(--brand-soft)]/40'}`}>
                  <button onClick={() => openNotification(notification)} className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-[var(--surface-sunken)]">
                    <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-md ${notification.read_at ? 'bg-[var(--muted)] text-[var(--ink-muted)]' : 'bg-[var(--brand-soft)] text-[var(--brand)]'}`}>
                      <Icon size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <b className="block truncate text-[12px] font-semibold">{notification.title}</b>
                        <span className="shrink-0 text-[10px] text-[var(--ink-muted)]">{timeAgo(notification.created_at)}</span>
                      </div>
                      {notification.body && <p className="mt-0.5 truncate text-[11px] text-[var(--ink-muted)]">{notification.body}</p>}
                      {whatsapp && (
                        <span className={`mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold ${whatsapp.ok ? 'bg-[#e6f6f2] text-[#0b7d6b]' : 'bg-[#fdf4e3] text-[#8a5a00]'}`}>
                          <MessageCircle size={9} />
                          {whatsapp.ok ? 'WhatsApp sent' : whatsapp.detail.includes('No admin') ? 'WhatsApp not set up' : 'WhatsApp: action needed'}
                        </span>
                      )}
                    </div>
                    {!notification.read_at && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />}
                  </button>
                  {whatsapp?.link && !whatsapp.ok && (
                    <a href={whatsapp.link} target="_blank" rel="noreferrer" className="ml-[46px] mb-2 inline-flex items-center gap-1 rounded-md border border-[#bfe6da] bg-[#e6f6f2] px-2 py-1 text-[10px] font-bold text-[#0b7d6b] hover:bg-[#d3f0e9]">
                      <ExternalLink size={9} /> Open WhatsApp
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
