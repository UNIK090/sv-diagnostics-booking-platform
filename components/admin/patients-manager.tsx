'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Phone, Search, Users } from 'lucide-react'
import type { Snapshot } from '@/lib/snapshot'

type Patient = Snapshot['patients'][number]
type Order = Snapshot['orders'][number]

/** Patients grouped by phone number, with visit history and lifetime value. */
export function PatientsManager({ patients, orders }: { patients: Patient[]; orders: Order[] }) {
  const [query, setQuery] = useState('')
  const [openPhone, setOpenPhone] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return patients
    return patients.filter((patient) => `${patient.name} ${patient.phone}`.toLowerCase().includes(needle))
  }, [patients, query])

  const history = openPhone ? orders.filter((order) => order.phone === openPhone) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-[var(--ink-muted)]">{patients.length} unique patients · grouped by mobile number</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or phone…" className="w-full rounded-md border border-[var(--line)] bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none focus:border-[var(--brand)]" />
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_140px_90px_110px_120px_24px] gap-3 border-b border-[var(--line)] bg-[var(--surface-sunken)] px-4 py-2 text-[9.5px] font-bold uppercase tracking-wider text-[var(--ink-muted)] lg:grid">
          <span>Patient</span><span>Phone</span><span>Orders</span><span>Lifetime value</span><span>Last visit</span><span />
        </div>
        <div className="divide-y divide-[var(--line)]">
          {filtered.length === 0 && (
            <div className="p-10 text-center">
              <Users size={20} className="mx-auto text-[var(--ink-muted)]" />
              <p className="mt-2 text-[13px] font-semibold">{patients.length === 0 ? 'No patients yet' : 'No matches'}</p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">{patients.length === 0 ? 'A patient record is created automatically with the first booking.' : 'Try a different name or number.'}</p>
            </div>
          )}
          {filtered.map((patient) => (
            <div key={patient.phone}>
              <button onClick={() => setOpenPhone(openPhone === patient.phone ? null : patient.phone)} className="grid w-full grid-cols-1 items-center gap-2 px-4 py-3 text-left transition hover:bg-[var(--surface-sunken)] lg:grid-cols-[1.4fr_140px_90px_110px_120px_24px] lg:gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand-deep)]">
                    {patient.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <b className="truncate text-[12.5px] font-semibold">{patient.name}</b>
                </div>
                <span className="flex items-center gap-1 text-[11.5px] text-[var(--ink-muted)]"><Phone size={11} /> {patient.phone}</span>
                <span className="tabular text-[12px] font-semibold">{patient.orders}</span>
                <span className="tabular text-[12px] font-semibold">₹{Number(patient.spent).toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-[var(--ink-muted)]">{new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <ChevronRight size={15} className={`hidden text-[var(--ink-muted)] transition lg:block ${openPhone === patient.phone ? 'rotate-90' : ''}`} />
              </button>
              {openPhone === patient.phone && (
                <div className="animate-fade border-t border-[var(--line)] bg-[var(--surface-sunken)] px-4 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">Visit history</p>
                  <div className="space-y-1.5">
                    {history.map((order) => (
                      <div key={order.orderId} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[11.5px]">
                        <span className="font-mono text-[10px] text-[var(--brand)]">{order.orderId}</span>
                        <span className="min-w-0 flex-1 truncate">{order.testName}</span>
                        <span className="tabular font-semibold">₹{order.amount.toLocaleString('en-IN')}</span>
                        <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--ink-soft)]">{order.status}</span>
                        <span className="text-[10px] text-[var(--ink-muted)]">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
