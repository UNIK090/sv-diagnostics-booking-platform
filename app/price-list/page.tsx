'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Clock3,
  Filter,
  MapPin,
  Phone,
  Search,
  TestTube2,
  X,
} from 'lucide-react'
import { PRICE_LIST_NOTE, priceList } from '@/lib/price-list'

const rupees = (value: number) => '₹' + value.toLocaleString('en-IN')

/* Sample-type families let the filter be useful without 60 checkboxes. */
function sampleFamily(sample: string) {
  const value = sample.toUpperCase()
  if (value.includes('URINE')) return 'Urine'
  if (value.includes('SERUM') || value.includes('SERRUM')) return 'Serum'
  if (value.includes('EDTA')) return 'Whole Blood (EDTA)'
  if (value.includes('CITRATE')) return 'Plasma (Citrate)'
  if (value.includes('HEPARIN')) return 'Plasma (Heparin)'
  if (value.includes('FLOURIDE') || value.includes('FLUORIDE')) return 'Fluoride Plasma'
  if (value.includes('SWAB')) return 'Swab'
  if (value.includes('STOOL')) return 'Stool'
  if (value.includes('SPUTUM')) return 'Sputum'
  if (value.includes('SEMEN')) return 'Semen'
  if (value.includes('PUS')) return 'Pus'
  if (value === 'NA') return 'Not applicable'
  if (value.includes('BLOOD')) return 'Blood'
  return 'Other'
}

const PRICE_BANDS = [
  { label: 'All prices', min: 0, max: Infinity },
  { label: 'Under ₹500', min: 0, max: 499 },
  { label: '₹500 – ₹999', min: 500, max: 999 },
  { label: '₹1,000 – ₹2,499', min: 1000, max: 2499 },
  { label: '₹2,500 & above', min: 2500, max: Infinity },
]

type SortKey = 'name' | 'price' | null
type SortDir = 'asc' | 'desc'

export default function PriceListPage() {
  const [query, setQuery] = useState('')
  const [sampleFilter, setSampleFilter] = useState('All sample types')
  const [band, setBand] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showFilters, setShowFilters] = useState(false)
  // Numbering always follows the original spreadsheet order.
  const numbered = useMemo(() => priceList.map((item, index) => ({ ...item, serial: index + 1 })), [])

  const samples = useMemo(
    () => [...new Set(numbered.map((item) => sampleFamily(item.sampleType)))].sort(),
    [numbered],
  )

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const { min, max } = PRICE_BANDS[band]
    const filtered = numbered.filter((item) => {
      const matchesName = !needle || item.name.toLowerCase().includes(needle)
      const matchesSample = sampleFilter === 'All sample types' || sampleFamily(item.sampleType) === sampleFilter
      const matchesPrice = item.price >= min && item.price <= max
      return matchesName && matchesSample && matchesPrice
    })

    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const result = sortKey === 'name' ? a.name.localeCompare(b.name) : a.price - b.price
      return sortDir === 'asc' ? result : -result
    })
  }, [numbered, query, sampleFilter, band, sortKey, sortDir])

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const reset = () => {
    setQuery('')
    setSampleFilter('All sample types')
    setBand(0)
    setSortKey(null)
    setSortDir('asc')
  }

  const filtersActive = query !== '' || sampleFilter !== 'All sample types' || band !== 0

  const sortIcon = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="opacity-40" />
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[var(--ink)]">
      <PageHeader />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        {/* Heading */}
        <div className="border-b border-[var(--line)] pb-5">
          <p className="eyebrow">Investigations &amp; packages</p>
          <h1 className="mt-1.5 text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--ink)] sm:text-[2.15rem]">SV Online Price List</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--ink-muted)]">
            Complete list of investigations, profiles and healthcare packages with sample requirements and current pricing.
          </p>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#f3ddb0] bg-[#fffbeb] px-4 py-3 text-[13px] leading-6 text-[#8a5a00]">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#f59e0b]/15 text-[10px] font-bold text-[#8a5a00]">i</span>
            {PRICE_LIST_NOTE}
          </p>
        </div>

        {/* Controls */}
        <div className="sticky top-0 z-20 -mx-4 mt-6 border-b border-[var(--line)] bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by investigation or test name…"
                aria-label="Search by test name"
                className="w-full rounded-xl border border-[var(--line)] bg-white py-3 pl-11 pr-10 text-sm shadow-[var(--shadow-xs)] outline-none transition focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--muted)]">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition lg:hidden ${filtersActive ? 'border-[#0f6fb5] bg-[#e9f3fb] text-[#0b568f]' : 'border-[var(--line)] bg-white text-[var(--ink-soft)]'}`}
            >
              <Filter size={15} /> Filters {filtersActive && '•'}
            </button>

            <div className={`${showFilters ? 'flex' : 'hidden'} flex-col gap-3 sm:flex-row lg:flex`}>
              <label className="relative">
                <span className="sr-only">Filter by sample type</span>
                <select
                  value={sampleFilter}
                  onChange={(event) => setSampleFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-[var(--line)] bg-white py-3 pl-4 pr-9 text-sm font-medium outline-none transition focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10 sm:w-52"
                >
                  <option>All sample types</option>
                  {samples.map((sample) => <option key={sample}>{sample}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
              </label>

              <label className="relative">
                <span className="sr-only">Filter by price range</span>
                <select
                  value={band}
                  onChange={(event) => setBand(Number(event.target.value))}
                  className="w-full appearance-none rounded-xl border border-[var(--line)] bg-white py-3 pl-4 pr-9 text-sm font-medium outline-none transition focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10 sm:w-48"
                >
                  {PRICE_BANDS.map((option, index) => <option key={option.label} value={index}>{option.label}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
            <p aria-live="polite">
              Showing <b className="text-[var(--ink)]">{rows.length}</b> of {numbered.length} investigations
              {sortKey && <> · sorted by {sortKey === 'name' ? 'name' : 'price'} ({sortDir === 'asc' ? 'low to high' : 'high to low'})</>}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition hover:bg-[var(--muted)] lg:hidden">
                Name {sortIcon('name')}
              </button>
              <button onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition hover:bg-[var(--muted)] lg:hidden">
                Price {sortIcon('price')}
              </button>
              {filtersActive && <button onClick={reset} className="font-semibold text-[#0b568f] hover:underline">Reset</button>}
            </div>
          </div>
        </div>

        {/* Desktop / tablet table */}
        <div className="mt-6 hidden overflow-hidden rounded-2xl border border-[var(--line)] md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[#f5f9fc] text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                <th scope="col" className="w-16 px-4 py-3.5 font-bold">S.No.</th>
                <th scope="col" className="px-4 py-3.5 font-bold">
                  <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider transition hover:text-[var(--ink)]">
                    Investigation / Test Name {sortIcon('name')}
                  </button>
                </th>
                <th scope="col" className="w-64 px-4 py-3.5 font-bold">Sample Type</th>
                <th scope="col" className="w-32 px-4 py-3.5 text-right font-bold">
                  <button onClick={() => toggleSort('price')} className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider transition hover:text-[var(--ink)]">
                    Price {sortIcon('price')}
                  </button>
                </th>
                <th scope="col" className="w-32 px-4 py-3.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.serial}-${row.name}`} className={`border-b border-[var(--line)] transition last:border-0 hover:bg-[#f5f9fc] ${row.package ? 'bg-[#fbfdff]' : ''}`}>
                  <td className="px-4 py-3.5 align-top text-[13px] tabular-nums text-[var(--ink-muted)]">{row.serial}</td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-start gap-2">
                      <span className="text-[13px] font-medium leading-6">{row.name}</span>
                      {row.package && <span className="mt-0.5 shrink-0 rounded bg-[#e9f3fb] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0b568f]">Package</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <span className="inline-block max-w-full break-words rounded-md bg-[var(--muted)] px-2 py-1 text-[11px] font-medium leading-5 text-[var(--ink-soft)]">{row.sampleType}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right align-top text-[14px] font-semibold tabular-nums">{rupees(row.price)}</td>
                  <td className="px-4 py-3.5 text-right align-top">
                    <BookButton name={row.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState onReset={reset} />}
        </div>

        {/* Mobile cards */}
        <div className="mt-6 space-y-3 md:hidden">
          {rows.map((row) => (
            <article key={`${row.serial}-${row.name}`} className={`rounded-2xl border border-[var(--line)] bg-white p-4 ${row.package ? 'border-[#bcd9ef] bg-[#fbfdff]' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-[var(--muted)] text-[11px] font-bold tabular-nums text-[var(--ink-muted)]">{row.serial}</span>
                  <h3 className="min-w-0 break-words text-[13px] font-semibold leading-5">{row.name}</h3>
                </div>
                {row.package && <span className="shrink-0 rounded bg-[#e9f3fb] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0b568f]">Package</span>}
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-3 text-[11px]">
                <dt className="font-semibold text-[var(--ink-muted)]">Sample</dt>
                <dd className="break-words text-[var(--ink-soft)]">{row.sampleType}</dd>
                <dt className="font-semibold text-[var(--ink-muted)]">Price</dt>
                <dd className="text-[14px] font-bold tabular-nums">{rupees(row.price)}</dd>
              </dl>
              <div className="mt-3"><BookButton name={row.name} full /></div>
            </article>
          ))}
          {rows.length === 0 && <div className="rounded-2xl border border-[var(--line)]"><EmptyState onReset={reset} /></div>}
        </div>

        <p className="mt-8 rounded-xl border border-[var(--line)] bg-[#f5f9fc] px-4 py-3 text-[12px] leading-6 text-[var(--ink-muted)]">
          <b className="text-[var(--ink)]">Note:</b> {PRICE_LIST_NOTE}
        </p>
      </main>
    </div>
  )
}

function BookButton({ name, full }: { name: string; full?: boolean }) {
  return (
    <Link
      href={`/?test=${encodeURIComponent(name)}#tests`}
      aria-label={`Book ${name}`}
      className={`inline-flex items-center justify-center gap-1 rounded-md bg-[var(--brand)] text-[11px] font-bold text-white transition hover:bg-[var(--brand-deep)] ${full ? 'w-full py-2.5 text-[12px]' : 'px-3 py-1.5'}`}
    >
      Book Now
    </Link>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="p-12 text-center">
      <Search size={22} className="mx-auto text-[var(--ink-muted)]" />
      <p className="mt-3 text-sm font-semibold">No investigations match your filters</p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">Try a different spelling or widen the price range.</p>
      <button onClick={onReset} className="mt-4 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--muted)]">Clear filters</button>
    </div>
  )
}

function PageHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-white">
      <div className="bg-[var(--brand-deep)] text-white">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4 text-[11px] sm:px-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Phone size={11} /> 1800 123 4567</span>
            <span className="hidden items-center gap-1.5 text-white/80 sm:flex"><Clock3 size={11} /> Mon–Sun · 7am to 9pm</span>
          </div>
          <span className="flex items-center gap-1.5 text-white/80"><MapPin size={11} /> Hyderabad &amp; nearby</span>
        </div>
      </div>
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-lg bg-[var(--brand)] text-white"><TestTube2 size={19} /></span>
          <span>
            <b className="block text-[15px] font-bold leading-tight tracking-tight">SV Diagnostics</b>
            <span className="block text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">Diagnostics &amp; Pathology</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden rounded-md px-3 py-2 text-[13.5px] font-medium text-[var(--ink-soft)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)] sm:block">Home</Link>
          <Link href="/" className="rounded-md bg-[var(--coral)] px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-95">Book a test</Link>
        </div>
      </div>
    </header>
  )
}
