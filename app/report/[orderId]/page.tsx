'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, Download, Loader2, Search } from 'lucide-react'

interface OrderInfo {
  orderId: string
  patientName: string
  testName: string
  type: string
  slot: string
  amount: number
  status: string
  createdAt: number
  hasReport: boolean
}

const STEPS = ['Confirmed', 'Agent assigned', 'Sample collected', 'Report ready']

export default function ReportPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  // Real route params are resolved once on mount.
  useEffect(() => {
    params.then((value) => setOrderId(decodeURIComponent(value.orderId).toUpperCase()))
  }, [params])

  useEffect(() => {
    if (!orderId) return
    let active = true
    let timer: ReturnType<typeof setTimeout>

    const load = async () => {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!active) return
      setLoading(false)
      if (!response.ok) { setError(body.error ?? 'Order not found.'); return }
      setOrder(body)
      setError(null)
      // Keep polling until the lab releases the report.
      if (!body.hasReport) timer = setTimeout(load, 15_000)
    }

    void load()
    return () => { active = false; clearTimeout(timer) }
  }, [orderId])

  const download = async () => {
    if (!order) return
    setDownloading(true)
    const response = await fetch(`/api/reports/${order.orderId}`)
    setDownloading(false)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.error ?? 'Report is not ready yet.')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${order.orderId}-report.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  const activeStep = order ? STEPS.indexOf(order.status) : -1

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mesh-light min-h-screen">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-muted)] transition hover:text-foreground">
            <ArrowLeft size={15} /> Back to website
          </Link>

          <div className="surface mt-6 rounded-3xl p-7 sm:p-9">
            {loading && (
              <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-[var(--ink-muted)]" /></div>
            )}

            {!loading && error && (
              <div className="py-10 text-center">
                <Search size={24} className="mx-auto text-[var(--ink-muted)]" />
                <h1 className="mt-4 text-xl font-semibold">We couldn’t find that order</h1>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">{error} Check the order ID and try again.</p>
                <Link href="/#reports" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#12283d] px-4 py-2.5 text-sm font-semibold text-white">Search another order</Link>
              </div>
            )}

            {!loading && order && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Order</p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[#0b568f]">{order.orderId}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${order.hasReport ? 'bg-[#e6f6f2] text-[#0b7d6b]' : 'bg-[#fdf4e3] text-[#8a5a00]'}`}>
                    {order.hasReport ? <CheckCircle2 size={12} /> : <Clock3 size={12} />} {order.status}
                  </span>
                </div>

                <h1 className="mt-6 text-2xl font-semibold tracking-tight">{order.testName}</h1>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">For {order.patientName} · {order.type} · {order.slot}</p>

                <div className="mt-7">
                  <div className="flex items-center">
                    {STEPS.map((step, index) => (
                      <div key={step} className="flex flex-1 items-center last:flex-none">
                        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${index <= activeStep ? 'bg-[#0f6fb5] text-white' : 'bg-white text-[var(--ink-muted)] ring-1 ring-[var(--line)]'}`}>{index + 1}</span>
                        {index < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${index < activeStep ? 'bg-[#0f6fb5]' : 'bg-[var(--line)]'}`} />}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-[var(--ink-muted)]">
                    {STEPS.map((step, index) => <span key={step} className={index === activeStep ? 'font-bold text-[#0f6fb5]' : ''}>{step}</span>)}
                  </div>
                </div>

                <div className="mt-7 rounded-2xl bg-[var(--surface-sunken)] p-4 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Amount paid</span><b className="tabular">₹{order.amount.toLocaleString('en-IN')}</b></div>
                  <div className="mt-1.5 flex justify-between"><span className="text-[var(--ink-muted)]">Booked on</span><span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                </div>

                {order.hasReport ? (
                  <button onClick={download} disabled={downloading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f6fb5] to-[#0b5f9e] py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-110 disabled:opacity-60">
                    {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download PDF report
                  </button>
                ) : (
                  <p className="mt-6 rounded-xl bg-[#fdf4e3] p-3.5 text-xs leading-5 text-[#8a5a00]">
                    Your sample is still in the lab. This page refreshes automatically — and we will message you on WhatsApp as soon as the report is released.
                  </p>
                )}
              </>
            )}
          </div>

          <p className="mt-5 text-center text-[11px] text-[var(--ink-muted)]">Keep your order ID private — it is the key to your report.</p>
        </div>
      </div>
    </div>
  )
}
