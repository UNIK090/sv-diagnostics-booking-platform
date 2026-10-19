'use client'

import { useState } from 'react'
import { Check, Download, Loader2, Pencil, Plus, Tag, Trash2, X } from 'lucide-react'
import type { Snapshot } from '@/lib/snapshot'

type TestRow = Snapshot['tests'][number]

const CATEGORIES = ['Blood', 'Diabetes', 'Thyroid', 'Heart', 'Vitamin', 'Liver', 'Kidney', 'Other']

interface Draft {
  id?: number
  name: string
  category: string
  description: string
  price: string
  discountType: 'none' | 'percent' | 'amount'
  discountValue: string
  reportHours: string
  prep: string
  active: boolean
}

const emptyDraft = (): Draft => ({
  name: '',
  category: 'Blood',
  description: '',
  price: '',
  discountType: 'none',
  discountValue: '',
  reportHours: '24 hours',
  prep: 'No fasting',
  active: true,
})

export function LivePrice({ price, discountType, discountValue }: { price: number; discountType: string; discountValue: number }) {
  const final =
    discountType === 'percent'
      ? Math.max(1, Math.round(price * (1 - Math.min(100, discountValue) / 100)))
      : discountType === 'amount'
        ? Math.max(1, price - discountValue)
        : price
  return (
    <span className="tabular">
      <b>₹{final.toLocaleString('en-IN')}</b>
      {final !== price && <del className="ml-1.5 text-[11px] font-normal text-[var(--ink-muted)]">₹{price.toLocaleString('en-IN')}</del>}
    </span>
  )
}

export function TestManager({ tests, onChanged }: { tests: TestRow[]; onChanged: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)

  const syncPriceList = async () => {
    setSyncing(true)
    setSyncNotice(null)
    const response = await fetch('/api/admin/tests/import', { method: 'POST' })
    const body = await response.json().catch(() => ({}))
    setSyncing(false)
    if (!response.ok) { setSyncNotice(body.error ?? 'Could not sync the price list.'); return }
    setSyncNotice(`Synced: ${body.inserted} added, ${body.updated} updated.`)
    onChanged()
  }

  const startNew = () => { setError(null); setDraft(emptyDraft()) }
  const startEdit = (test: TestRow) => {
    setError(null)
    setDraft({
      id: test.id,
      name: test.name,
      category: test.category,
      description: test.description,
      price: String(test.price),
      discountType: test.discountType,
      discountValue: test.discountType === 'none' ? '' : String(test.discountValue),
      reportHours: test.reportHours,
      prep: test.prep,
      active: true,
    })
  }

  const save = async () => {
    if (!draft) return
    setBusy(true)
    setError(null)
    const payload = {
      name: draft.name,
      category: draft.category,
      description: draft.description,
      price: Number(draft.price),
      discountType: draft.discountType,
      discountValue: draft.discountType === 'none' ? 0 : Number(draft.discountValue || 0),
      reportHours: draft.reportHours,
      prep: draft.prep,
      active: draft.active,
    }
    const response = await fetch(draft.id ? `/api/admin/tests/${draft.id}` : '/api/admin/tests', {
      method: draft.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { setError(body.error ?? 'Could not save the test.'); return }
    setDraft(null)
    onChanged()
  }

  const remove = async (test: TestRow) => {
    if (!window.confirm(`Delete “${test.name}”? Existing orders keep their details.`)) return
    await fetch(`/api/admin/tests/${test.id}`, { method: 'DELETE' })
    onChanged()
  }

  const quickDiscount = async (test: TestRow, value: number) => {
    await fetch(`/api/admin/tests/${test.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discountType: 'percent', discountValue: value }),
    })
    onChanged()
  }

  const clearDiscount = async (test: TestRow) => {
    await fetch(`/api/admin/tests/${test.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discountType: 'none', discountValue: 0 }),
    })
    onChanged()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tests & pricing</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{tests.length} bookable tests · changes publish to the website instantly{syncNotice ? ` · ${syncNotice}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={syncPriceList} disabled={syncing} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-2.5 text-[12.5px] font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Sync price list
          </button>
          <button onClick={startNew} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-3.5 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--brand-deep)]">
            <Plus size={15} /> Add test
          </button>
        </div>
      </div>

      <div className="surface overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-[1.6fr_.7fr_.9fr_.9fr_auto] gap-3 border-b border-[var(--line)] px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] md:grid">
          <span>Test</span><span>Price</span><span>Discount</span><span>Report</span><span className="w-24 text-right">Actions</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {tests.length === 0 && (
            <p className="p-8 text-center text-sm text-[var(--ink-muted)]">No tests yet. Add your first test to start taking bookings.</p>
          )}
          {tests.map((test) => (
            <div key={test.id} className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 md:grid-cols-[1.6fr_.7fr_.9fr_.9fr_auto] md:gap-3">
              <div className="min-w-0">
                <b className="block truncate text-[13px] font-medium">{test.name}</b>
                <span className="text-[11px] text-[var(--ink-muted)]">{test.category} · {test.prep}</span>
              </div>
              <LivePrice price={test.price} discountType={test.discountType} discountValue={test.discountValue} />
              <div>
                {test.discountLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f6f2] px-2 py-0.5 text-[10px] font-bold text-[#0b7d6b]"><Tag size={10} /> {test.discountLabel}</span>
                ) : (
                  <span className="text-[11px] text-[var(--ink-muted)]">None</span>
                )}
              </div>
              <span className="text-[11px] text-[var(--ink-muted)]">{test.reportHours}</span>
              <div className="flex items-center justify-start gap-1 md:justify-end">
                <span className="mr-0.5 hidden text-[9px] uppercase tracking-wide text-[var(--ink-muted)] lg:inline">Set</span>
                <button onClick={() => clearDiscount(test)} title="Remove the discount" className="rounded-lg border border-[var(--line)] px-2 py-1 text-[10px] font-bold transition hover:bg-[var(--muted)]">None</button>
                <button onClick={() => quickDiscount(test, 10)} title="Apply 10% off" className="rounded-lg border border-[var(--line)] px-2 py-1 text-[10px] font-bold transition hover:bg-[var(--muted)]">10%</button>
                <button onClick={() => quickDiscount(test, 20)} title="Apply 20% off" className="rounded-lg border border-[var(--line)] px-2 py-1 text-[10px] font-bold transition hover:bg-[var(--muted)]">20%</button>
                <button onClick={() => startEdit(test)} aria-label={`Edit ${test.name}`} className="grid size-7 place-items-center rounded-lg text-[var(--ink-muted)] transition hover:bg-[#e9f3fb] hover:text-[#0b568f]"><Pencil size={13} /></button>
                <button onClick={() => remove(test)} aria-label={`Delete ${test.name}`} className="grid size-7 place-items-center rounded-lg text-[var(--ink-muted)] transition hover:bg-[#fee2e2] hover:text-[#dc2626]"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#12283d]/45 p-4 backdrop-blur-sm" onClick={() => setDraft(null)}>
          <div onClick={(event) => event.stopPropagation()} className="animate-pop w-full max-w-lg rounded-2xl bg-white p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">{draft.id ? 'Edit test' : 'Add a new test'}</h3>
              <button onClick={() => setDraft(null)} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--muted)]"><X size={16} /></button>
            </div>

            <div className="mt-5 space-y-3.5">
              <label className="block text-xs font-medium">Test name
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus placeholder="e.g. Vitamin D (25-OH)" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium">Category
                  <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm">
                    {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium">List price (₹)
                  <input value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="1200" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
                </label>
              </div>

              <fieldset className="rounded-xl border border-[var(--line)] p-3">
                <legend className="px-1 text-xs font-semibold">Discount</legend>
                <div className="flex gap-1.5">
                  {(['none', 'percent', 'amount'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDraft({ ...draft, discountType: option, discountValue: option === 'none' ? '' : draft.discountValue })}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${draft.discountType === option ? 'bg-[#0f6fb5] text-white' : 'bg-[var(--muted)] text-[var(--ink-soft)]'}`}
                    >
                      {option === 'none' ? 'No discount' : option === 'percent' ? 'Percent %' : 'Flat ₹'}
                    </button>
                  ))}
                </div>
                {draft.discountType !== 'none' && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-muted)]">{draft.discountType === 'percent' ? '%' : '₹'}</span>
                      <input value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: event.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="10" className="w-full rounded-lg border border-[var(--line)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#0f6fb5]" />
                    </div>
                    <div className="text-right text-xs">
                      <span className="block text-[10px] text-[var(--ink-muted)]">Patient pays</span>
                      <LivePrice price={Number(draft.price) || 0} discountType={draft.discountType} discountValue={Number(draft.discountValue) || 0} />
                    </div>
                  </div>
                )}
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium">Report time
                  <input value={draft.reportHours} onChange={(event) => setDraft({ ...draft, reportHours: event.target.value })} placeholder="24 hours" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5]" />
                </label>
                <label className="block text-xs font-medium">Preparation
                  <input value={draft.prep} onChange={(event) => setDraft({ ...draft, prep: event.target.value })} placeholder="8–10 hr fasting" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5]" />
                </label>
              </div>

              <label className="block text-xs font-medium">Short description
                <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={2} placeholder="Shown on the website under the test name" className="mt-1.5 w-full resize-none rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5]" />
              </label>

              {error && <p className="rounded-lg bg-[#fdf4e3] px-3 py-2 text-[11px] font-medium text-[#8a5a00]">{error}</p>}
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setDraft(null)} className="flex-1 rounded-xl border border-[var(--line)] py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={save} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#12283d] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {draft.id ? 'Save changes' : 'Publish test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
