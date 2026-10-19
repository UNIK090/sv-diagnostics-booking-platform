'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, FileText, MessageCircle, Search, Upload } from 'lucide-react'
import type { Snapshot } from '@/lib/snapshot'
import { OrderWorkspace } from '@/components/admin/order-workspace'

type Order = Snapshot['orders'][number]

const STATUS_TONE: Record<string, string> = {
  Confirmed: 'bg-[#e9f3fb] text-[#0b568f] ring-[#cfe3f5]',
  'Agent assigned': 'bg-[#fdf4e3] text-[#8a5a00] ring-[#f3ddb0]',
  'Sample collected': 'bg-[#e6f6f2] text-[#0b7d6b] ring-[#bfe6da]',
  'Report ready': 'bg-[#eae7f7] text-[#4d3bb0] ring-[#d7cef2]',
  Cancelled: 'bg-[#fdeaea] text-[#b03030] ring-[#f5c9c9]',
}

type Filter = 'All' | 'Needs report' | 'Ready to send' | 'Unpaid' | 'Cancelled'

const FILTERS: Filter[] = ['All', 'Needs report', 'Ready to send', 'Unpaid', 'Cancelled']

/** What this order needs next — the single most useful thing staff scan for. */
function nextAction(order: Order): { label: string; tone: 'warn' | 'info' | 'ok' | 'muted' } {
  if (order.status === 'Cancelled') return { label: 'Cancelled', tone: 'muted' }
  if (!order.hasReport) return { label: 'Upload report', tone: 'warn' }
  if (!order.whatsappSentAt) return { label: 'Send on WhatsApp', tone: 'info' }
  return { label: 'Complete', tone: 'ok' }
}

export function OrdersManager({ orders, onChanged, focusOrderId, onFocusHandled }: { orders: Order[]; onChanged: () => Promise<void>; focusOrderId?: string | null; onFocusHandled?: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [openId, setOpenId] = useState<string | null>(null)

  // A notification click asks this list to open a specific order.
  useEffect(() => {
    if (!focusOrderId) return
    setFilter('All')
    setQuery('')
    setOpenId(focusOrderId)
    onFocusHandled?.()
  }, [focusOrderId, onFocusHandled])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesQuery = !needle || `${order.orderId} ${order.patientName} ${order.phone} ${order.testName} ${order.status}`.toLowerCase().includes(needle)
      if (!matchesQuery) return false
      if (filter === 'Needs report') return !order.hasReport && order.status !== 'Cancelled'
      if (filter === 'Ready to send') return order.hasReport && !order.whatsappSentAt
      if (filter === 'Unpaid') return order.paymentStatus === 'Pending' && order.status !== 'Cancelled'
      if (filter === 'Cancelled') return order.status === 'Cancelled'
      return true
    })
  }, [orders, query, filter])

  const openOrder = orders.find((order) => order.orderId === openId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-[var(--ink-muted)]">Upload the lab PDF, then release it to the patient on WhatsApp.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order ID, patient, phone…" className="w-full rounded-md border border-[var(--line)] bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none focus:border-[var(--brand)]" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => {
          const count =
            item === 'All' ? orders.length
              : item === 'Needs report' ? orders.filter((order) => !order.hasReport && order.status !== 'Cancelled').length
                : item === 'Ready to send' ? orders.filter((order) => order.hasReport && !order.whatsappSentAt).length
                  : item === 'Unpaid' ? orders.filter((order) => order.paymentStatus === 'Pending' && order.status !== 'Cancelled').length
                    : orders.filter((order) => order.status === 'Cancelled').length
          return (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition ${filter === item ? 'bg-[var(--brand)] text-white' : 'border border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--brand)]'}`}>
              {item} <span className={filter === item ? 'text-white/70' : 'text-[var(--ink-muted)]'}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="panel overflow-hidden">
        <div className="hidden grid-cols-[110px_1.4fr_.9fr_110px_150px_24px] gap-3 border-b border-[var(--line)] bg-[var(--surface-sunken)] px-4 py-2 text-[9.5px] font-bold uppercase tracking-wider text-[var(--ink-muted)] lg:grid">
          <span>Order</span><span>Patient &amp; test</span><span>Report</span><span>Amount</span><span>Next step</span><span />
        </div>
        <div className="divide-y divide-[var(--line)]">
          {filtered.length === 0 && (
            <div className="p-10 text-center">
              <FileText size={20} className="mx-auto text-[var(--ink-muted)]" />
              <p className="mt-2 text-[13px] font-semibold">{orders.length === 0 ? 'No orders yet' : 'Nothing matches this view'}</p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">{orders.length === 0 ? 'Patient bookings appear here the moment they happen.' : 'Try another filter or clear the search.'}</p>
            </div>
          )}
          {filtered.map((order) => {
            const next = nextAction(order)
            return (
              <button key={order.orderId} onClick={() => setOpenId(order.orderId)} className="grid w-full grid-cols-1 items-center gap-2 px-4 py-3 text-left transition hover:bg-[var(--surface-sunken)] lg:grid-cols-[110px_1.4fr_.9fr_110px_150px_24px] lg:gap-3">
                <div>
                  <span className="block font-mono text-[10.5px] font-bold text-[var(--brand)]">{order.orderId}</span>
                  <span className="block text-[10px] text-[var(--ink-muted)]">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="min-w-0">
                  <b className="block truncate text-[12.5px] font-semibold">{order.patientName}</b>
                  <span className="block truncate text-[11px] text-[var(--ink-muted)]">{order.testName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold ring-1 ${STATUS_TONE[order.status] ?? STATUS_TONE.Confirmed}`}>{order.status}</span>
                  {order.hasReport && <span className="rounded bg-[#e6f6f2] px-1.5 py-0.5 text-[9.5px] font-bold text-[#0b7d6b]">PDF ✓</span>}
                </div>
                <span className="tabular text-[12.5px] font-semibold">₹{order.amount.toLocaleString('en-IN')}</span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10.5px] font-bold ${next.tone === 'warn' ? 'bg-[#fdf4e3] text-[#8a5a00]' : next.tone === 'info' ? 'bg-[#e9f3fb] text-[#0b568f]' : next.tone === 'ok' ? 'bg-[#e6f6f2] text-[#0b7d6b]' : 'bg-[var(--muted)] text-[var(--ink-muted)]'}`}>
                    {next.tone === 'warn' ? <Upload size={10} /> : next.tone === 'info' ? <MessageCircle size={10} /> : next.tone === 'ok' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                    {next.label}
                  </span>
                  {order.whatsappSentAt && <span className="text-[9.5px] text-[var(--ink-muted)]">sent</span>}
                </div>
                <ChevronRight size={15} className="hidden text-[var(--ink-muted)] lg:block" />
              </button>
            )
          })}
        </div>
      </div>

      {openOrder && <OrderWorkspace order={openOrder} onClose={() => setOpenId(null)} onChanged={onChanged} />}
    </div>
  )
}
