'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Droplet,
  FileText,
  FlaskConical,
  HeartPulse,
  Home,
  Loader2,
  Lock,
  MapPin,
  Menu,
  MessageCircle,
  Microscope,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TestTube2,
  Users,
  X,
} from 'lucide-react'
import { useRealtime, type RealtimeApi } from '@/hooks/use-realtime'
import { priceList } from '@/lib/price-list'
import type { Snapshot } from '@/lib/snapshot'

type Test = Snapshot['tests'][number]
type Icon = typeof Activity

const ICONS: Record<string, Icon> = {
  Blood: Activity,
  Pathology: Activity,
  Diabetes: HeartPulse,
  Thyroid: Stethoscope,
  Heart: HeartPulse,
  'Imaging & Cardiology': HeartPulse,
  Vitamin: Sparkles,
  Liver: FlaskConical,
  Kidney: FlaskConical,
  Urine: Droplet,
  Microbiology: Microscope,
  'Health packages': Sparkles,
  Other: TestTube2,
}

/** Sample type shown to patients ("NA" in the lab sheet means none required). */
const sampleLabel = (sample?: string) => (!sample || sample.toUpperCase() === 'NA' ? 'No sample required' : sample)

const rupees = (value: number) => '₹' + value.toLocaleString('en-IN')

/** How many catalogue cards to render before asking for more. */
const PAGE_SIZE = 24

/** Size of the published investigations list (shown before the first import). */
const PRICE_LIST_SIZE = priceList.length

const SLOTS = [
  { label: '7:00 – 8:00 AM', windows: 7 },
  { label: '9:00 – 10:00 AM', windows: 9 },
  { label: '11:00 AM – 12:00 PM', windows: 11 },
  { label: '4:00 – 5:00 PM', windows: 16 },
]

export default function Page() {
  const realtime = useRealtime()
  const router = useRouter()
  const [booking, setBooking] = useState<{ open: boolean; testId?: number }>({ open: false })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header realtime={realtime} onBook={() => setBooking({ open: true })} onStaff={() => router.push('/admin')} />
      <HomePage realtime={realtime} onBook={(testId) => setBooking({ open: true, testId })} />
      <Footer realtime={realtime} />
      {booking.open && <BookingFlow realtime={realtime} presetTestId={booking.testId} onClose={() => setBooking({ open: false })} />}
      <Toasts realtime={realtime} />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Header({ realtime, onBook, onStaff }: { realtime: RealtimeApi; onBook: () => void; onStaff: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const data = realtime.data

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="sticky top-0 z-40">
      {/* Utility strip — the trust/contact band diagnostic chains lead with */}
      <div className="hidden bg-[var(--brand-deep)] text-white md:block">
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-between px-5 text-[11.5px] lg:px-6">
          <div className="flex items-center gap-5">
            <a href="tel:18001234567" className="flex items-center gap-1.5 transition hover:text-white/80"><Phone size={12} /> {data?.labPhone || '1800 123 4567'}</a>
            <span className="flex items-center gap-1.5 text-white/80"><Clock3 size={12} /> Mon–Sun · 7am to 9pm</span>
            <span className="hidden items-center gap-1.5 text-white/80 lg:flex"><MapPin size={12} /> Hyderabad &amp; nearby areas</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onStaff} className="flex items-center gap-1.5 transition hover:text-white/80"><Lock size={11} /> Staff login</button>
            <a href="/price-list" className="flex items-center gap-1.5 font-semibold transition hover:text-white/80"><FileText size={11} /> Price list</a>
          </div>
        </div>
      </div>

      <div className={`transition-all duration-300 ${scrolled ? 'border-b border-[var(--line)] bg-white/95 shadow-[var(--shadow-sm)] backdrop-blur-xl' : 'bg-white'}`}>
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-5 lg:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--brand)] text-white">
              {data?.logo ? <img src={data.logo} alt="" className="size-full bg-white object-contain p-1" /> : <TestTube2 size={19} />}
            </span>
            <span className="min-w-0">
              <b className="block truncate text-[15px] font-bold leading-tight tracking-tight">{data?.brandName ?? 'SV Diagnostics'}</b>
              <span className="hidden text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)] sm:block">Diagnostics &amp; Pathology</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 text-[13.5px] md:flex">
            {[['Tests', '#tests'], ['Price list', '/price-list'], ['How it works', '#how'], ['Reports', '#reports']].map(([label, href]) => (
              <a key={label} href={href} className="rounded-md px-3 py-2 font-medium text-[var(--ink-soft)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]">{label}</a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button onClick={onStaff} className="hidden items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-2 text-[13px] font-semibold text-[var(--ink-soft)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] sm:flex md:hidden lg:flex">
              <Lock size={13} /> Staff
            </button>
            <button onClick={onBook} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--coral)] px-4 py-2.5 text-[13px] font-bold text-white shadow-[var(--shadow-sm)] transition hover:brightness-95">
              Book a test <ArrowRight size={14} />
            </button>
            <button onClick={() => setMenu((open) => !open)} className="grid size-10 place-items-center rounded-md border border-[var(--line)] bg-white md:hidden" aria-label="Menu">
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="animate-pop border-t border-[var(--line)] bg-white p-4 md:hidden">
            {[['Tests', '#tests'], ['Price list', '/price-list'], ['How it works', '#how'], ['Reports', '#reports']].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMenu(false)} className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-[var(--brand-soft)]">{label}</a>
            ))}
            <button onClick={onStaff} className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-[var(--line)] px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--brand-soft)]"><Lock size={14} /> Staff login</button>
          </div>
        )}
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */

function HomePage({ realtime, onBook }: { realtime: RealtimeApi; onBook: (testId?: number) => void }) {
  const data = realtime.data
  const tests = data?.tests ?? []
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [importing, setImporting] = useState(false)
  const [importNotice, setImportNotice] = useState<string | null>(null)

  const categories = useMemo(() => {
    const found = Array.from(new Set(tests.map((test) => test.category)))
    // Packages last when browsing "All" — individual tests are what most people
    // are searching for, and package names are long enough to dominate a page.
    return ['All', ...found.filter((item) => item !== 'Health packages'), ...found.filter((item) => item === 'Health packages')]
  }, [tests])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tests.filter((test) => {
      const matchesCategory = category === 'All' || test.category === category
      const matchesQuery = !needle || `${test.name} ${test.description} ${test.sampleType ?? ''} ${test.category}`.toLowerCase().includes(needle)
      return matchesCategory && matchesQuery
    })
  }, [tests, query, category])

  /** Browsing "All" puts individual tests first, packages after. */
  const ordered = useMemo(() => {
    if (category !== 'All') return filtered
    return [...filtered].sort((a, b) => Number(a.category === 'Health packages') - Number(b.category === 'Health packages'))
  }, [filtered, category])

  // A long catalogue is paged rather than dumped on one page.
  useEffect(() => { setVisible(PAGE_SIZE) }, [query, category])
  const shown = ordered.slice(0, visible)

  const cheapest = tests.reduce<Test | null>((best, test) => (!best || test.finalPrice < best.finalPrice ? test : best), null)

  // Staff-only shortcut: publish the price list into the bookable catalogue.
  const importCatalogue = async () => {
    setImporting(true)
    setImportNotice(null)
    const response = await fetch('/api/admin/tests/import', { method: 'POST' })
    const body = await response.json().catch(() => ({}))
    setImporting(false)
    if (!response.ok) { setImportNotice(body.error ?? 'Could not import. Sign in as staff first.'); return }
    setImportNotice(`Imported ${body.inserted} new investigations · ${body.updated} updated · ${body.catalogueSize} bookable.`)
    await realtime.refresh()
  }

  return (
    <main id="top">
      <section className="relative overflow-hidden">
        <div aria-hidden className="mesh-light pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.08fr_.92fr] lg:px-6 lg:pb-24 lg:pt-20">
          <div>
            <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-[#bfe6da] bg-[var(--mint-soft)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--accent-foreground)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#14a08a] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#14a08a]" />
              </span>
              {realtime.connected ? `NABL-aligned · ${tests.length} test${tests.length === 1 ? '' : 's'} available today` : 'Connecting…'}
            </div>

            <h1 className="animate-rise delay-1 mt-5 text-[2.35rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--ink)] sm:text-[3.15rem]">
              Accurate diagnostics.<br />
              <span className="text-[var(--brand)]">Trusted care</span> for your family.
            </h1>
            <p className="animate-rise delay-2 mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--ink-muted)]">
              Blood tests, full-body health packages and home sample collection by trained phlebotomists. Secure digital reports delivered on WhatsApp and online.
            </p>

            <div className="animate-rise delay-3 mt-7 flex flex-wrap items-center gap-2.5">
              <button onClick={() => onBook()} className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-5 py-3 text-[13.5px] font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-[var(--brand-deep)]">
                Book a test <ArrowRight size={15} />
              </button>
              <a href="/price-list" className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-5 py-3 text-[13.5px] font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <FileText size={15} /> View price list
              </a>
              <a href="#reports" className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-5 py-3 text-[13.5px] font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Download size={15} /> Download report
              </a>
            </div>

            <dl className="animate-rise delay-4 mt-9 grid max-w-lg grid-cols-3 divide-x divide-[var(--line)] rounded-lg border border-[var(--line)] bg-white">
              {[[`${tests.length}`, tests.length === 1 ? 'Test & package' : 'Tests & packages'], ['6–24 hr', 'Report turnaround'], ['25k+', 'Families served']].map(([value, label]) => (
                <div key={label} className="px-3 py-3 text-center">
                  <dt className="text-[17px] font-bold leading-tight text-[var(--brand-deep)]">{value}</dt>
                  <dd className="mt-0.5 text-[10.5px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">{label}</dd>
                </div>
              ))}
            </dl>

            <div className="animate-rise delay-5 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[var(--ink-muted)]">
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--accent-foreground)]" /> NABL-aligned lab</span>
              {cheapest && <span className="flex items-center gap-1.5"><Clock3 size={14} className="text-[var(--accent-foreground)]" /> Reports from {cheapest.reportHours}</span>}
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[var(--accent-foreground)]" /> Home collection</span>
            </div>
          </div>

          {/* Clinical imagery + collection card */}
          <div className="animate-rise delay-2 relative pb-10">
            <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow-lg)]">
              <img
                src="https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=1000&q=85"
                alt="Laboratory technician processing a diagnostic blood sample"
                className="h-[300px] w-full rounded-lg object-cover sm:h-[360px]"
              />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 rounded-lg border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-md)] sm:left-6 sm:right-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]"><Home size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">Home sample collection</p>
                  <p className="text-[13.5px] font-semibold text-[var(--ink)]">Book a convenient slot · from {rupees(data?.collectionFee ?? 99)}</p>
                </div>
                <button onClick={() => onBook()} className="shrink-0 rounded-md bg-[var(--brand)] px-3 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--brand-deep)]">Book</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-[var(--line)] sm:grid-cols-4 sm:divide-y-0 lg:px-6">
          {([
            [Home, 'Home sample collection', 'Trained phlebotomists'],
            [BadgeCheck, 'NABL-aligned quality', 'Documented processes'],
            [FileText, 'Digital reports', 'WhatsApp + online'],
            [Users, 'Family packages', 'Men, women & seniors'],
          ] as [Icon, string, string][]).map(([Component, title, sub]) => (
            <div key={title} className="flex items-start gap-2.5 px-4 py-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-[var(--mint-soft)] text-[var(--accent-foreground)]"><Component size={15} /></span>
              <div>
                <b className="block text-[12.5px] font-semibold leading-tight text-[var(--ink)]">{title}</b>
                <span className="text-[11px] text-[var(--ink-muted)]">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="tests" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 lg:px-6">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Tests &amp; packages</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Book a lab test</h2>
            <p className="mt-1.5 text-[14px] text-[var(--ink-muted)]">Prices include any discount applied by the lab. Home collection available.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tests…" className="w-full rounded-xl border border-[var(--line)] bg-white py-3 pl-10 pr-4 text-sm shadow-[var(--shadow-xs)] outline-none transition focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
          </div>
        </div>

        {categories.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${category === item ? 'bg-[#12283d] text-white' : 'border border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[#bcd9ef] hover:text-[#0b568f]'}`}>{item}</button>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((test) => <TestCard key={test.id} test={test} onBook={() => onBook(test.id)} />)}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[12px] text-[var(--ink-muted)]">Showing {shown.length} of {filtered.length} {filtered.length === 1 ? 'test' : 'tests'}</p>
          {visible < filtered.length && (
            <button onClick={() => setVisible((count) => count + PAGE_SIZE)} className="rounded-md border border-[var(--brand)] px-5 py-2.5 text-[13px] font-bold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white">
              Load more tests
            </button>
          )}
        </div>

        {tests.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-[var(--line)] bg-white p-12 text-center">
            <FlaskConical size={24} className="mx-auto text-[var(--ink-muted)]" />
            <p className="mt-3 text-sm font-semibold">No tests are bookable yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--ink-muted)]">Staff can publish the full investigations price list into the catalogue with one click.</p>
            <button onClick={importCatalogue} disabled={importing} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Import price list ({PRICE_LIST_SIZE} tests)
            </button>
            {importNotice && <p className="mt-2 text-[11px] text-[var(--ink-muted)]">{importNotice}</p>}
          </div>
        )}
        {tests.length > 0 && filtered.length === 0 && (
          <p className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-white/60 p-10 text-center text-sm text-[var(--ink-muted)]">No tests match “{query}”.</p>
        )}
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 lg:px-6">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-1.5 max-w-sm text-2xl font-bold tracking-[-0.02em] sm:text-3xl">From booking to report, with one order ID.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['01', 'Choose a test', 'Live catalogue and prices set by the lab.'],
              ['02', 'Book a slot', 'Home collection or lab visit.'],
              ['03', 'Give your sample', 'A trained phlebotomist handles it.'],
              ['04', 'Download the report', 'Use your order ID on this website, or open the WhatsApp link we send.'],
            ].map(([step, title, desc]) => (
              <div key={step} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-xs)]">
                <span className="text-sm font-bold text-[#0f6fb5]">{step}</span>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-[var(--ink-muted)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reports" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-24 lg:px-6">
        <ReportLookup />
      </section>
    </main>
  )
}

function TestCard({ test, onBook }: { test: Test; onBook: () => void }) {
  const Icon = ICONS[test.category] ?? TestTube2
  return (
    <article className="animate-rise group flex flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[var(--shadow-xs)] transition duration-200 hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)]">
      <div className="h-1 bg-[var(--brand)] transition group-hover:bg-[var(--mint)]" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]"><Icon size={17} /></span>
          <span className="rounded-sm border border-[var(--line)] bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">{test.category}</span>
        </div>
        <h3 className="mt-3 min-w-0 break-words text-[13.5px] font-bold leading-snug text-[var(--ink)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">{test.name}</h3>
        {test.sampleType && (
          <p title={sampleLabel(test.sampleType)} className="mt-1.5 flex max-w-full items-center gap-1 truncate rounded-sm bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-deep)]">
            <TestTube2 size={10} className="shrink-0" /> <span className="truncate">{sampleLabel(test.sampleType)}</span>
          </p>
        )}
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-5 text-[var(--ink-muted)]">{test.description || test.prep}</p>
        <div className="mt-auto border-t border-[var(--line)] pt-3">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <b className="tabular text-[19px] font-bold leading-none text-[var(--ink)]">{rupees(test.finalPrice)}</b>
            {test.finalPrice !== test.price && <del className="text-[11px] text-[var(--ink-muted)]">{rupees(test.price)}</del>}
            {test.discountLabel && <span className="rounded-sm bg-[var(--mint-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-foreground)]">{test.discountLabel}</span>}
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-[10.5px] text-[var(--ink-muted)]"><Clock3 size={11} /> Report in {test.reportHours}</p>
            <button onClick={onBook} className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-[var(--brand-deep)]">Book Now</button>
          </div>
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */

function BookingFlow({ realtime, presetTestId, onClose }: { realtime: RealtimeApi; presetTestId?: number; onClose: () => void }) {
  const tests = realtime.data?.tests ?? []
  const collectionFee = realtime.data?.collectionFee ?? 0
  const [step, setStep] = useState(1)
  const [testId, setTestId] = useState<number | undefined>(presetTestId ?? tests[0]?.id)
  const [type, setType] = useState<'Home collection' | 'Lab visit'>('Home collection')
  const [slot, setSlot] = useState(SLOTS[1].label)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pincode, setPincode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const test = tests.find((item) => item.id === testId) ?? tests[0]
  const fee = type === 'Home collection' ? collectionFee : 0
  const total = (test?.finalPrice ?? 0) + fee

  const submit = async () => {
    if (!test) return
    setError(null)
    setBusy(true)
    const result = await realtime.book({ name, phone, testId: test.id, type, slot, pincode })
    setBusy(false)
    if (!result.ok) { setError(result.error); return }
    setOrderId(result.orderId)
    void realtime.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#12283d]/45 p-4 backdrop-blur-sm">
      <div className="animate-pop w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-lg)]">
        {orderId ? (
          <div className="p-8 text-center">
            <div className="animate-pulse-ring mx-auto grid size-16 place-items-center rounded-full bg-[#e6f6f2] text-[#0b7d6b]"><Check size={30} /></div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">Booking confirmed</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Please keep this order ID — it is all you need to download your report.</p>
            <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-sunken)] p-5">
              <p className="eyebrow">Your order ID</p>
              <p className="mt-1 font-mono text-xl font-bold tracking-wider text-[#0b568f]">{orderId}</p>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3 text-sm">
                <span className="text-[var(--ink-muted)]">{test?.name} · {slot}</span>
                <b className="tabular">{rupees(total)}</b>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <a href={`/report/${orderId}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] py-3 text-sm font-semibold"><Download size={15} /> Report page</a>
              <button onClick={onClose} className="flex-1 rounded-xl bg-[#12283d] py-3 text-sm font-semibold text-white">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
              <div>
                <p className="eyebrow">Book a test</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{step === 1 ? 'Choose a test' : step === 2 ? 'Collection & slot' : 'Your details'}</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--muted)]"><X size={18} /></button>
            </div>

            <div className="flex gap-1.5 px-6 pt-5">
              {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? 'bg-[#0f6fb5]' : 'bg-[var(--muted)]'}`} />)}
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-6">
              {step === 1 && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="eyebrow">Test</span>
                    <div className="relative mt-2">
                      <select value={testId} onChange={(event) => setTestId(Number(event.target.value))} className="w-full appearance-none rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 pr-9 text-sm font-medium outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10">
                        {tests.map((item) => <option key={item.id} value={item.id}>{item.name} — {rupees(item.finalPrice)}</option>)}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                    </div>
                  </label>
                  {test && (
                    <div className="rounded-2xl bg-[var(--surface-sunken)] p-4">
                      <p className="text-sm font-semibold">{test.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{test.description || 'No additional description.'}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2.5 text-sm">
                        <span className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]"><Clock3 size={12} /> Report in {test.reportHours} · {test.prep}</span>
                        <b className="tabular">{rupees(test.finalPrice)}</b>
                      </div>
                    </div>
                  )}
                  {tests.length === 0 && <p className="rounded-xl bg-[#fdf4e3] p-3 text-xs text-[#8a5a00]">No tests are published yet. Please check back shortly.</p>}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {(['Home collection', 'Lab visit'] as const).map((option) => (
                      <button key={option} onClick={() => setType(option)} className={`rounded-2xl border p-3.5 text-left transition ${type === option ? 'border-[#0f6fb5] bg-[#e9f3fb] ring-2 ring-[#0f6fb5]/20' : 'border-[var(--line)] hover:border-[#bcd9ef]'}`}>
                        <span className={`grid size-9 place-items-center rounded-xl ${type === option ? 'bg-[#0f6fb5] text-white' : 'bg-[var(--muted)] text-[var(--ink-soft)]'}`}>{option === 'Home collection' ? <Home size={16} /> : <MapPin size={16} />}</span>
                        <b className="mt-2.5 block text-[13px]">{option === 'Home collection' ? 'Home collection' : 'Visit a lab'}</b>
                        <small className="text-[11px] text-[var(--ink-muted)]">{option === 'Home collection' ? `We come to you${collectionFee ? ` · +${rupees(collectionFee)}` : ''}` : 'Collection fee free'}</small>
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="eyebrow">Pick a time</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {SLOTS.map((item) => (
                        <button key={item.label} onClick={() => setSlot(item.label)} className={`rounded-xl border p-3 text-left text-sm font-medium transition ${slot === item.label ? 'border-[#0f6fb5] bg-[#e9f3fb] ring-2 ring-[#0f6fb5]/20' : 'border-[var(--line)] hover:border-[#bcd9ef]'}`}>{item.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-sunken)] p-3.5 text-sm">
                    <div className="flex justify-between"><span>{test?.name}</span><b className="tabular">{rupees(test?.finalPrice ?? 0)}</b></div>
                    <div className="mt-1.5 flex justify-between text-[var(--ink-muted)]"><span>{type}</span><span>{fee ? rupees(fee) : 'Free'}</span></div>
                    <div className="mt-1.5 flex justify-between border-t border-[var(--line)] pt-1.5 font-semibold"><span>Total</span><b className="tabular">{rupees(total)}</b></div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium">Patient name
                    <input value={name} onChange={(event) => setName(event.target.value)} autoFocus placeholder="Full name" className="mt-2 w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">Mobile number <span className="text-[11px] font-normal text-[var(--ink-muted)]">(for WhatsApp)</span>
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="98765 43210" className="mt-2 w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
                    </label>
                    <label className="block text-sm font-medium">Pincode
                      <input value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="500001" className="mt-2 w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
                    </label>
                  </div>
                  <p className="rounded-xl bg-[#e9f3fb] p-3 text-[11px] leading-5 text-[#0b568f]">
                    Your report will be downloadable on this website with your order ID, and we will send the same link to your WhatsApp number.
                  </p>
                  {error && <p className="rounded-xl bg-[#fdf4e3] px-3.5 py-2.5 text-xs font-medium text-[#8a5a00]">{error}</p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--line)] p-4">
              {step > 1 && <button onClick={() => setStep(step - 1)} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold transition hover:bg-[var(--muted)]">Back</button>}
              <button
                onClick={() => (step < 3 ? setStep(step + 1) : submit())}
                disabled={busy || tests.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f6fb5] to-[#0b5f9e] py-3 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-110 disabled:opacity-50"
              >
                {step < 3 ? `Continue · ${rupees(total)}` : busy ? <><Loader2 size={16} className="animate-spin" /> Booking…</> : 'Confirm booking'}
                {!busy && <ArrowRight size={15} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ReportLookup() {
  const [orderId, setOrderId] = useState('')
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'found' | 'pending' | 'error'; message?: string; data?: { orderId: string; patientName: string; testName: string; status: string; hasReport: boolean; amount: number } }>({ status: 'idle' })

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = orderId.trim().toUpperCase()
    if (!value) return
    setState({ status: 'loading' })
    const response = await fetch(`/api/orders/${encodeURIComponent(value)}`, { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) { setState({ status: 'error', message: body.error ?? 'We could not find that order.' }); return }
    setState({ status: body.hasReport ? 'found' : 'pending', data: body })
  }

  const download = async () => {
    if (!state.data) return
    const response = await fetch(`/api/reports/${state.data.orderId}`)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setState({ status: 'pending', message: body.error ?? 'Report is not ready yet.', data: state.data })
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${state.data.orderId}-report.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="surface relative overflow-hidden rounded-3xl p-7 sm:p-9">
      <div aria-hidden className="absolute -right-20 -top-20 size-56 rounded-full bg-[#0f6fb5]/10 blur-3xl" />
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <span className="grid size-11 place-items-center rounded-2xl bg-[#e9f3fb] text-[#0f6fb5]"><FileText size={19} /></span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">Download your report</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ink-muted)]">Enter the order ID from your booking confirmation (for example <span className="font-mono text-xs">SV-2026-AB12CD</span>). No login needed.</p>
          <form onSubmit={lookup} className="mt-5 flex gap-2">
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value.toUpperCase())}
              placeholder="Enter your order ID"
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-mono text-sm uppercase outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10"
            />
            <button type="submit" className="rounded-xl bg-[#12283d] px-5 text-sm font-semibold text-white transition hover:bg-[#1e3a52]">Find</button>
          </form>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-sunken)] p-5">
          {state.status === 'idle' && (
            <div className="text-center">
              <FileText size={22} className="mx-auto text-[var(--ink-muted)]" />
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Your report appears here once the lab releases it.</p>
            </div>
          )}
          {state.status === 'loading' && <p className="flex items-center justify-center gap-2 text-xs text-[var(--ink-muted)]"><Loader2 size={14} className="animate-spin" /> Looking up your order…</p>}
          {(state.status === 'error' || state.status === 'pending') && (
            <div className="text-center">
              <Clock3 size={22} className="mx-auto text-[#8a5a00]" />
              <p className="mt-2 text-sm font-semibold">{state.status === 'pending' ? (state.data?.status ?? 'In progress') : 'Order not found'}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{state.message ?? 'Your sample is still being processed. Check back shortly or watch for the WhatsApp link.'}</p>
            </div>
          )}
          {state.status === 'found' && state.data && (
            <div>
              <div className="flex items-center gap-2 text-[#0b7d6b]"><CheckCircle2 size={16} /><b className="text-sm">Report ready</b></div>
              <p className="mt-3 text-sm font-semibold">{state.data.patientName}</p>
              <p className="text-xs text-[var(--ink-muted)]">{state.data.testName} · {state.data.orderId}</p>
              <button onClick={download} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f6fb5] to-[#0b5f9e] py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-110">
                <Download size={15} /> Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Footer({ realtime }: { realtime: RealtimeApi }) {
  const data = realtime.data
  return (
    <footer className="border-t border-[var(--line)] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#0f6fb5] to-[#14a08a] text-white">
                {data?.logo ? <img src={data.logo} alt="" className="size-full bg-white object-contain p-0.5" /> : <TestTube2 size={16} />}
              </span>
              <b className="text-sm font-semibold">{data?.brandName ?? 'SV Diagnostics'}</b>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-6 text-[var(--ink-muted)]">{data?.tagline ?? 'Accurate tests. Trusted care.'} Not an emergency medical service.</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-[var(--ink-soft)]">
            {data?.labPhone && <span className="flex items-center gap-2"><Phone size={14} className="text-[var(--ink-muted)]" /> {data.labPhone}</span>}
            <span className="flex items-center gap-2"><Clock3 size={14} className="text-[var(--ink-muted)]" /> Mon–Sun, 7am–9pm</span>
            <span className="flex items-center gap-2"><MapPin size={14} className="text-[var(--ink-muted)]" /> Hyderabad & nearby</span>
          </div>
        </div>
        <div className="mt-8 border-t border-[var(--line)] pt-5 text-center text-[11px] text-[var(--ink-muted)]">© {new Date().getFullYear()} {data?.brandName ?? 'SV Diagnostics'} · Privacy · Terms</div>
      </div>
    </footer>
  )
}

function Toasts({ realtime }: { realtime: RealtimeApi }) {
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex w-[min(320px,calc(100vw-2.5rem))] flex-col gap-2">
      {realtime.toasts.map((toast) => (
        <button key={toast.id} onClick={() => realtime.dismissToast(toast.id)} className="animate-pop flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left text-xs font-medium shadow-[var(--shadow-lg)]">
          <span className="size-1.5 rounded-full bg-[#14a08a]" /> {toast.text}
        </button>
      ))}
    </div>
  )
}
