'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Snapshot } from '@/lib/snapshot'

type Event = Snapshot['recentEvents'][number]

const KIND_LABEL: Record<string, { label: string; className: string }> = {
  created: { label: 'Booking', className: 'bg-[#e9f3fb] text-[#0b568f]' },
  status: { label: 'Status', className: 'bg-[#fdf4e3] text-[#8a5a00]' },
  report: { label: 'Report', className: 'bg-[#eae7f7] text-[#4d3bb0]' },
  whatsapp: { label: 'WhatsApp', className: 'bg-[#e6f6f2] text-[#0b7d6b]' },
  payment: { label: 'Payment', className: 'bg-[#eef3f8] text-[#627687]' },
  note: { label: 'Note', className: 'bg-[var(--muted)] text-[var(--ink-soft)]' },
}

/** Append-only audit trail: who did what, to which order, and when. */
export function AuditLog({ events }: { events: Event[] }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('All')

  const kinds = useMemo(() => ['All', ...Array.from(new Set(events.map((event) => event.kind)))], [events])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return events.filter((event) => {
      const matchesKind = kind === 'All' || event.kind === kind
      const matchesQuery = !needle || `${event.text} ${event.order_id} ${event.patient_name ?? ''} ${event.actor}`.toLowerCase().includes(needle)
      return matchesKind && matchesQuery
    })
  }, [events, query, kind])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-[var(--ink-muted)]">Every operational action, permanently recorded for compliance.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions or orders…" className="w-full rounded-md border border-[var(--line)] bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none focus:border-[var(--brand)]" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {kinds.map((item) => (
          <button key={item} onClick={() => setKind(item)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition ${kind === item ? 'bg-[var(--brand)] text-white' : 'border border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--brand)]'}`}>{item}</button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          {filtered.length === 0 && <p className="p-10 text-center text-[12.5px] text-[var(--ink-muted)]">No audit entries match.</p>}
          {filtered.map((event) => {
            const meta = KIND_LABEL[event.kind] ?? { label: event.kind, className: 'bg-[var(--muted)] text-[var(--ink-soft)]' }
            return (
              <div key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className={`w-20 shrink-0 rounded px-1.5 py-0.5 text-center text-[9.5px] font-bold uppercase tracking-wide ${meta.className}`}>{meta.label}</span>
                <span className="font-mono text-[10.5px] text-[var(--brand)]">{event.order_id}</span>
                <span className="min-w-0 flex-1 text-[12px]">{event.text}</span>
                <span className="text-[10.5px] text-[var(--ink-muted)]">{event.actor}</span>
                <span className="w-32 text-right text-[10.5px] text-[var(--ink-muted)]">{new Date(event.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
