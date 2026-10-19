'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, BellRing, CheckCircle2, ExternalLink, Loader2, MessageCircle, Send, ShieldCheck, Smartphone } from 'lucide-react'

interface NotifySettings {
  adminWhatsapp: string
  phoneNumberId: string
  apiVersion: string
  hasToken: boolean
  notifyOnBooking: boolean
  recipients: string[]
  cloudApi: boolean
}

/**
 * Booking alerts configuration.
 * Shows plainly whether messages will be *delivered automatically* or require
 * a staff click — the console should never imply automation it doesn't have.
 */
export function NotificationSettings({ onChanged }: { onChanged: () => Promise<void> }) {
  const [settings, setSettings] = useState<NotifySettings | null>(null)
  const [adminWhatsapp, setAdminWhatsapp] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [apiVersion, setApiVersion] = useState('v21.0')
  const [accessToken, setAccessToken] = useState('')
  const [notifyOnBooking, setNotifyOnBooking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string; link?: string } | null>(null)

  const load = async () => {
    const response = await fetch('/api/admin/notifications/settings', { cache: 'no-store' })
    if (!response.ok) return
    const data = (await response.json()) as NotifySettings
    setSettings(data)
    setAdminWhatsapp(data.adminWhatsapp)
    setPhoneNumberId(data.phoneNumberId)
    setApiVersion(data.apiVersion)
    setNotifyOnBooking(data.notifyOnBooking)
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    setBusy(true)
    setNotice(null)
    const response = await fetch('/api/admin/notifications/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminWhatsapp,
        phoneNumberId,
        apiVersion,
        notifyOnBooking,
        ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
      }),
    })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { setNotice({ tone: 'error', text: data.error ?? 'Could not save.' }); return }
    setAccessToken('')
    setNotice({ tone: 'ok', text: data.cloudApi ? 'Saved. Automatic WhatsApp alerts are active.' : 'Saved. Alerts will open as a one-click WhatsApp message.' })
    await load()
    await onChanged()
  }

  const sendTest = async () => {
    setTesting(true)
    setNotice(null)
    const response = await fetch('/api/admin/notifications/settings', { method: 'POST' })
    const data = await response.json().catch(() => ({}))
    setTesting(false)
    if (!response.ok) { setNotice({ tone: 'error', text: data.error ?? 'Test failed.' }); return }
    setNotice(data.ok
      ? { tone: 'ok', text: `Test message delivered. ${data.detail}` }
      : { tone: 'warn', text: `${data.detail}${data.link ? ' Use the button below to send it.' : ''}`, link: data.link })
    await onChanged()
  }

  return (
    <section className="panel p-5">
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--coral-soft)] text-[var(--coral)]"><BellRing size={15} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13.5px] font-bold tracking-tight">Booking alerts</h2>
          <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">Notify staff the moment a patient books — in the console and on WhatsApp.</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[9.5px] font-bold ${settings?.cloudApi ? 'bg-[#e6f6f2] text-[#0b7d6b]' : 'bg-[#fdf4e3] text-[#8a5a00]'}`}>
          {settings?.cloudApi ? 'AUTO-SEND ON' : 'ONE-CLICK MODE'}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] px-3 py-2.5">
          <span>
            <b className="block text-[12px] font-semibold">Alert me on every booking</b>
            <span className="text-[10.5px] text-[var(--ink-muted)]">In-dashboard notification is always created; this controls WhatsApp.</span>
          </span>
          <input type="checkbox" checked={notifyOnBooking} onChange={(event) => setNotifyOnBooking(event.target.checked)} className="size-4 shrink-0 accent-[var(--brand)]" />
        </label>

        <label className="block text-[11.5px] font-semibold">
          Admin WhatsApp number(s)
          <input value={adminWhatsapp} onChange={(event) => setAdminWhatsapp(event.target.value)} placeholder="9876543210, 9123456780" className="mt-1.5 w-full rounded-md border border-[var(--line)] px-3 py-2 text-[12.5px] font-normal outline-none focus:border-[var(--brand)]" />
          <span className="mt-1 block text-[10.5px] font-normal text-[var(--ink-muted)]">Comma-separate for multiple staff. Include country code for non-Indian numbers.</span>
        </label>

        <div className="rounded-lg bg-[var(--surface-sunken)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-soft)]"><ShieldCheck size={12} /> Automatic sending (optional)</p>
          <p className="mt-1 text-[10.5px] leading-4 text-[var(--ink-muted)]">
            Add a Meta WhatsApp Cloud API phone-number ID and permanent token. Without them, the console prepares the message and a staff member presses send — nothing is marked as delivered until it is.
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <input value={phoneNumberId} onChange={(event) => setPhoneNumberId(event.target.value)} placeholder="Phone number ID" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--brand)]" />
            <input value={apiVersion} onChange={(event) => setApiVersion(event.target.value)} placeholder="v21.0" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--brand)]" />
          </div>
          <input
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder={settings?.hasToken ? 'Access token saved — enter a new one to replace' : 'Permanent access token'}
            className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--brand)]"
          />
        </div>

        {notice && (
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11.5px] ${notice.tone === 'ok' ? 'bg-[#e6f6f2] text-[#0b7d6b]' : notice.tone === 'warn' ? 'bg-[#fdf4e3] text-[#8a5a00]' : 'bg-[#fdeaea] text-[#b03030]'}`}>
            {notice.tone === 'ok' ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <AlertCircle size={13} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{notice.text}</span>
            {notice.link && (
              <a href={notice.link} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-bold underline"><ExternalLink size={10} /> Open</a>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--brand-deep)] disabled:opacity-60">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save alert settings
          </button>
          <button onClick={sendTest} disabled={testing || !settings?.recipients.length} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-4 py-2 text-[12px] font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-50">
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send test alert
          </button>
        </div>

        {settings && (
          <p className="flex items-center gap-1.5 text-[10.5px] text-[var(--ink-muted)]">
            <Smartphone size={11} />
            {settings.recipients.length === 0 ? 'No numbers saved yet.' : `Alerting ${settings.recipients.length} number${settings.recipients.length === 1 ? '' : 's'}: ${settings.recipients.join(', ')}`}
            {settings.cloudApi && <span className="ml-1 inline-flex items-center gap-0.5 font-semibold text-[#0b7d6b]"><MessageCircle size={10} /> automatic</span>}
          </p>
        )}
      </div>
    </section>
  )
}
