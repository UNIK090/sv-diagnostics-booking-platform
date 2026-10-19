'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import type { Snapshot } from '@/lib/snapshot'

type Order = Snapshot['orders'][number]
type OrderEvent = { id: number; kind: string; text: string; actor: string; at: number }

const STATUS_TONE: Record<string, string> = {
  Confirmed: 'bg-[#e9f3fb] text-[#0b568f] ring-[#cfe3f5]',
  'Agent assigned': 'bg-[#fdf4e3] text-[#8a5a00] ring-[#f3ddb0]',
  'Sample collected': 'bg-[#e6f6f2] text-[#0b7d6b] ring-[#bfe6da]',
  'Report ready': 'bg-[#eae7f7] text-[#4d3bb0] ring-[#d7cef2]',
  Cancelled: 'bg-[#fdeaea] text-[#b03030] ring-[#f5c9c9]',
}
const PAYMENT_TONE: Record<string, string> = {
  Paid: 'bg-[#e6f6f2] text-[#0b7d6b] ring-[#bfe6da]',
  Pending: 'bg-[#fdf4e3] text-[#8a5a00] ring-[#f3ddb0]',
  Refunded: 'bg-[#eef3f8] text-[#627687] ring-[#dce7f0]',
}

const EVENT_ICON: Record<string, string> = {
  created: '📝', status: '🔄', report: '📄', whatsapp: '💬', payment: '💳', note: '🗒️',
}

export function OrderWorkspace({ order, onClose, onChanged }: { order: Order; onClose: () => void; onChanged: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState(order.reportNotes ?? '')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null)
  const [events, setEvents] = useState<OrderEvent[]>([])
  const [staffNote, setStaffNote] = useState(order.staffNote ?? '')
  const [dragOver, setDragOver] = useState(false)
  const [panel, setPanel] = useState<'report' | 'timeline' | 'notes'>('report')
  const inputRef = useRef<HTMLInputElement>(null)

  const loadEvents = useCallback(async () => {
    const response = await fetch(`/api/admin/orders/${order.orderId}`)
    if (response.ok) setEvents((await response.json()).events as OrderEvent[])
  }, [order.orderId])

  useEffect(() => { void loadEvents() }, [loadEvents])

  const chooseFile = (chosen: File | null) => {
    if (!chosen) return
    if (!chosen.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ tone: 'error', text: 'Please choose a PDF file.' })
      return
    }
    if (chosen.size > 10 * 1024 * 1024) {
      setMessage({ tone: 'error', text: 'PDF must be under 10 MB.' })
      return
    }
    setFile(chosen)
    setMessage(null)
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setMessage(null)
    const form = new FormData()
    form.append('file', file)
    form.append('notes', notes)
    const response = await fetch(`/api/admin/orders/${order.orderId}/report/upload`, { method: 'POST', body: form })
    const body = await response.json().catch(() => ({}))
    setUploading(false)
    if (!response.ok) { setMessage({ tone: 'error', text: body.error ?? 'Upload failed.' }); return }
    setFile(null)
    setMessage({ tone: 'ok', text: `Report uploaded (${(body.bytes / 1024).toFixed(0)} KB). Review it, then send on WhatsApp.` })
    await onChanged()
    await loadEvents()
  }

  const removeReport = async () => {
    if (!window.confirm('Remove this report? The patient will no longer be able to download it.')) return
    const response = await fetch(`/api/admin/orders/${order.orderId}/report/upload`, { method: 'DELETE' })
    if (response.ok) {
      setMessage({ tone: 'warn', text: 'Report removed. Upload a new one before messaging the patient.' })
      await onChanged()
      await loadEvents()
    }
  }

  const sendWhatsApp = async () => {
    if (!order.hasReport) {
      setMessage({ tone: 'error', text: 'Upload the report PDF first — patients must never receive a link to a missing report.' })
      return
    }
    const text = `Hello ${order.patientName}, your ${order.testName} report from SV Diagnostics is ready.\n\nOrder ID: ${order.orderId}\nDownload: ${window.location.origin}/report/${order.orderId}\n\nThank you.`
    const digits = order.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${digits.length > 10 ? digits : `91${digits}`}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    await fetch(`/api/admin/orders/${order.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'whatsapp:sent' }),
    })
    setMessage({ tone: 'ok', text: 'Marked as sent on WhatsApp.' })
    await onChanged()
    await loadEvents()
  }

  const patch = async (body: Record<string, unknown>, success: string) => {
    const response = await fetch(`/api/admin/orders/${order.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? { tone: 'ok', text: success } : { tone: 'error', text: data.error ?? 'Could not save.' })
    if (response.ok) { await onChanged(); await loadEvents() }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#12283d]/40 backdrop-blur-[2px]" onClick={onClose}>
      <aside onClick={(event) => event.stopPropagation()} className="anim-slide-right flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        {/* Header */}
        <header className="border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-bold text-[var(--brand)]">{order.orderId}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${STATUS_TONE[order.status] ?? STATUS_TONE.Confirmed}`}>{order.status}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${PAYMENT_TONE[order.paymentStatus ?? 'Pending'] ?? PAYMENT_TONE.Pending}`}>{order.paymentStatus ?? 'Pending'}</span>
              </div>
              <h2 className="mt-2 truncate text-lg font-bold tracking-tight">{order.patientName}</h2>
              <p className="mt-0.5 truncate text-[12.5px] text-[var(--ink-muted)]">{order.testName} · {order.type} · {order.slot}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--muted)]"><X size={17} /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-[var(--ink-muted)]">
            <span className="tabular font-semibold text-[var(--ink)]">₹{order.amount.toLocaleString('en-IN')}</span>
            {order.phone && <a href={`tel:${order.phone}`} className="hover:text-[var(--brand)]">{order.phone.replace(/^\+91/, '')}</a>}
            {order.pincode && <span>PIN {order.pincode}</span>}
            <span>Booked {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-[var(--line)] px-5">
          {([['report', 'Report'], ['timeline', 'Timeline'], ['notes', 'Internal notes']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setPanel(key)} className={`-mb-px border-b-2 px-3 py-2.5 text-[12.5px] font-semibold transition ${panel === key ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
              {label}
              {key === 'timeline' && events.length > 0 && <span className="ml-1.5 rounded bg-[var(--muted)] px-1 text-[10px] text-[var(--ink-muted)]">{events.length}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {message && (
            <div className={`mb-4 flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-[12px] ${message.tone === 'ok' ? 'bg-[#e6f6f2] text-[#0b7d6b]' : message.tone === 'warn' ? 'bg-[#fdf4e3] text-[#8a5a00]' : 'bg-[#fdeaea] text-[#b03030]'}`}>
              {message.tone === 'ok' ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
              {message.text}
            </div>
          )}

          {panel === 'report' && (
            <>
              {/* Current report */}
              {order.hasReport ? (
                <div className="rounded-lg border border-[#bfe6da] bg-[#f2fbf8] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white text-[#0b7d6b] ring-1 ring-[#bfe6da]"><FileText size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[13px]">{order.reportFilename || 'Report PDF'}</b>
                      <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
                        {(order.reportSize / 1024).toFixed(0)} KB
                        {order.reportUploadedAt ? ` · uploaded ${new Date(order.reportUploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#0b7d6b]"><Check size={11} /> Ready to release</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`/api/reports/${order.orderId}?view=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-[#bfe6da] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0b7d6b] hover:bg-[#e6f6f2]"><ExternalLink size={12} /> Preview</a>
                    <a href={`/api/reports/${order.orderId}`} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[11.5px] font-semibold hover:bg-[var(--muted)]"><Download size={12} /> Download</a>
                    <button onClick={removeReport} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#b03030] hover:bg-[#fdeaea]"><Trash2 size={12} /> Remove</button>
                    <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[11.5px] font-semibold hover:bg-[var(--muted)]"><RotateCcw size={12} /> Replace</button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(event) => { event.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(event) => { event.preventDefault(); setDragOver(false); chooseFile(event.dataTransfer.files?.[0] ?? null) }}
                  onClick={() => inputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${dragOver ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--line)] bg-[var(--surface-sunken)] hover:border-[var(--brand)]'}`}
                >
                  <span className="grid size-12 place-items-center rounded-full bg-white text-[var(--brand)] shadow-[var(--shadow-xs)]"><Upload size={20} /></span>
                  <p className="mt-3 text-[13px] font-bold">Upload the lab report PDF</p>
                  <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">Drag &amp; drop, or click to browse · PDF up to 10 MB</p>
                </div>
              )}

              {file && (
                <div className="mt-3 rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-[var(--brand)]" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{file.name}</span>
                    <span className="text-[11px] text-[var(--ink-muted)]">{(file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setFile(null)} aria-label="Remove file" className="text-[var(--ink-muted)] hover:text-[#b03030]"><X size={13} /></button>
                  </div>
                </div>
              )}

              <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />

              <label className="mt-4 block text-[11.5px] font-semibold text-[var(--ink-soft)]">
                Report remarks <span className="font-normal text-[var(--ink-muted)]">(optional — shown to the patient on their report page)</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="e.g. Fasting sample confirmed. Values within range." className="mt-1.5 w-full resize-none rounded-md border border-[var(--line)] px-3 py-2 text-[12px] font-normal outline-none focus:border-[var(--brand)]" />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={upload} disabled={!file || uploading} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--brand-deep)] disabled:opacity-50">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {order.hasReport ? 'Replace report' : 'Upload report'}
                </button>
                <button
                  onClick={sendWhatsApp}
                  disabled={!order.hasReport || !order.phone}
                  title={!order.hasReport ? 'Upload a report first' : !order.phone ? 'No phone number' : 'Send the report link on WhatsApp'}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#bfe6da] bg-[#e6f6f2] px-4 py-2.5 text-[12.5px] font-bold text-[#0b7d6b] transition hover:bg-[#d3f0e9] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <MessageCircle size={14} /> Send on WhatsApp
                </button>
              </div>
              {!order.hasReport && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]"><AlertCircle size={11} /> WhatsApp is locked until the report PDF is uploaded.</p>}

              {/* Status + payment */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--line)] p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">Workflow status</p>
                  <select
                    value={order.status === 'Cancelled' ? 'Cancelled' : order.status}
                    onChange={(event) => patch({ action: 'status', status: event.target.value }, 'Status updated.')}
                    className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-white px-2.5 py-2 text-[12px] font-medium outline-none focus:border-[var(--brand)]"
                  >
                    {['Confirmed', 'Agent assigned', 'Sample collected', 'Report ready'].map((item) => <option key={item}>{item}</option>)}
                    {order.status === 'Cancelled' && <option>Cancelled</option>}
                  </select>
                </div>
                <div className="rounded-lg border border-[var(--line)] p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">Payment</p>
                  <select
                    value={order.paymentStatus ?? 'Pending'}
                    onChange={(event) => patch({ action: 'payment', status: event.target.value, method: order.paymentMethod }, 'Payment updated.')}
                    className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-white px-2.5 py-2 text-[12px] font-medium outline-none focus:border-[var(--brand)]"
                  >
                    {['Pending', 'Paid', 'Refunded'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              {order.status !== 'Cancelled' && (
                <button onClick={() => patch({ action: 'cancel', reason: 'Cancelled by staff' }, 'Order cancelled.')} className="mt-3 text-[11.5px] font-semibold text-[#b03030] hover:underline">
                  Cancel this order
                </button>
              )}
            </>
          )}

          {panel === 'timeline' && (
            <ol className="relative space-y-3">
              <span aria-hidden className="absolute bottom-2 left-[13px] top-2 w-px bg-[var(--line)]" />
              {events.length === 0 && <p className="text-[12px] text-[var(--ink-muted)]">No activity recorded yet.</p>}
              {events.map((event) => (
                <li key={event.id} className="relative flex gap-3">
                  <span className="z-10 grid size-7 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[11px]">{EVENT_ICON[event.kind] ?? '•'}</span>
                  <div className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                    <p className="text-[12px] font-medium leading-5">{event.text}</p>
                    <p className="mt-0.5 text-[10.5px] text-[var(--ink-muted)]">
                      {new Date(event.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })} · {event.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {panel === 'notes' && (
            <div>
              <p className="text-[11.5px] text-[var(--ink-muted)]">Internal only — never shown to the patient.</p>
              <textarea value={staffNote} onChange={(event) => setStaffNote(event.target.value)} rows={6} placeholder="e.g. Patient called to reschedule to Friday. Difficult venous access — send senior phlebotomist." className="mt-2 w-full resize-none rounded-lg border border-[var(--line)] px-3 py-2.5 text-[12.5px] outline-none focus:border-[var(--brand)]" />
              <button onClick={() => patch({ action: 'note', note: staffNote }, 'Note saved.')} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-4 py-2 text-[12px] font-bold text-white hover:bg-[var(--brand-deep)]">
                <Check size={13} /> Save note
              </button>
              <div className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--surface-sunken)] p-3 text-[11px] text-[var(--ink-muted)]">
                <Clock3 size={13} /> Booking created {new Date(order.createdAt).toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
