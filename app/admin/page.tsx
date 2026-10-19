'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  FlaskConical,
  Home,
  Inbox,
  Loader2,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  TestTube2,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { useAdminAuth, useRealtime, type AdminAuthApi, type RealtimeApi } from '@/hooks/use-realtime'
import { AdminLogin } from '@/components/admin-login'
import { TestManager } from '@/components/admin/test-manager'
import { OrdersManager } from '@/components/admin/orders-manager'
import { SettingsPanel } from '@/components/admin/settings-panel'
import { NotificationSettings } from '@/components/admin/notification-settings'
import { PatientsManager } from '@/components/admin/patients-manager'
import { AuditLog } from '@/components/admin/audit-log'
import { ConsoleShell, type NavItem, type Tab } from '@/components/admin/console-shell'

const NAV_ITEMS: NavItem[] = [
  { name: 'Overview', icon: Activity, group: 'Workspace' },
  { name: 'Orders', icon: Inbox, group: 'Workspace' },
  { name: 'Patients', icon: Users, group: 'Workspace' },
  { name: 'Tests & pricing', icon: FlaskConical, group: 'Catalogue' },
  { name: 'Audit log', icon: ShieldCheck, group: 'Compliance' },
  { name: 'Activity', icon: Bell, group: 'Compliance' },
  { name: 'Settings', icon: Settings, group: 'Account' },
]

const rupees = (value: number) => '₹' + value.toLocaleString('en-IN')

export default function Page() {
  const realtime = useRealtime()
  const auth = useAdminAuth()
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (auth.user) setEntered(true)
    if (!auth.user && !auth.checking) setEntered(false)
  }, [auth.user, auth.checking])

  if (auth.checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#070b14]">
        <Loader2 className="animate-spin text-white/40" />
      </div>
    )
  }

  if (!auth.user || !entered) return <AdminLogin auth={auth} onBack={() => setEntered(false)} />

  return <Console realtime={realtime} auth={auth} />
}

function Console({ realtime, auth }: { realtime: RealtimeApi; auth: AdminAuthApi }) {
  const [tab, setTab] = useState<Tab>('Overview')
  const [focusOrder, setFocusOrder] = useState<string | null>(null)
  const data = realtime.data
  const orders = data?.orders ?? []
  const tests = data?.tests ?? []
  const stats = data?.stats

  const refreshSettings = async () => {
    await realtime.refresh()
    await auth.refresh()
  }

  const initials = (auth.user?.name ?? 'Staff').split(' ').map((part) => part[0]).join('').slice(0, 2)

  const kpis = [
    { label: 'Orders today', value: String(stats?.todayBookings ?? 0), sub: `${orders.length} total orders`, icon: CalendarDays, tint: '#0f6fb5' },
    { label: 'Revenue today', value: rupees(stats?.todayRevenue ?? 0), sub: 'From confirmed orders', icon: Wallet, tint: '#14a08a' },
    { label: 'In collection', value: String(stats?.inCollection ?? 0), sub: `${stats?.reportsPending ?? 0} samples awaiting report`, icon: FileText, tint: '#4d3bb0' },
    { label: 'Live tests', value: String(tests.length), sub: 'Editable in Tests & pricing', icon: FlaskConical, tint: '#e8864a' },
  ]

  return (
    <ConsoleShell
      tab={tab}
      setTab={setTab}
      navItems={NAV_ITEMS}
      realtime={realtime}
      auth={auth}
      orders={orders.length}
      pendingReports={data?.pending.readyToSend ?? 0}
      onOpenOrder={(orderId) => {
        setTab('Orders')
        setFocusOrder(orderId)
      }}
    >
      {!data && (
              <div className="panel grid place-items-center p-16"><Loader2 className="animate-spin text-[var(--ink-muted)]" /></div>
            )}

            {data && tab === 'Overview' && (
              <>
                {/* What needs attention right now */}
                <section className="stagger mb-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  {([
                    { key: 'sampleCollection', label: 'Sample collection due', count: data.pending.sampleCollection, icon: CalendarDays, tone: 'warn' },
                    { key: 'awaitingUpload', label: 'Report to upload', count: data.pending.awaitingUpload, icon: Upload, tone: 'warn' },
                    { key: 'readyToSend', label: 'Ready for WhatsApp', count: data.pending.readyToSend, icon: MessageCircle, tone: 'info' },
                    { key: 'unpaid', label: 'Payment pending', count: data.pending.unpaid, icon: Wallet, tone: 'muted' },
                  ] as const).map((item) => {
                    const ItemIcon = item.icon
                    const active = item.count > 0
                    return (
                      <button
                        key={item.key}
                        onClick={() => setTab('Orders')}
                        className={`panel panel-hover group flex items-center gap-3 px-4 py-3.5 text-left ${active ? '' : 'border-dashed bg-[var(--surface-sunken)] shadow-none'}`}
                      >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-105 ${active ? (item.tone === 'info' ? 'bg-[#e9f3fb] text-[#0b568f]' : item.tone === 'warn' ? 'bg-[#fdf4e3] text-[#8a5a00]' : 'bg-[var(--muted)] text-[var(--ink-soft)]') : 'bg-[var(--muted)] text-[var(--ink-muted)]'}`}>
                          {active ? <ItemIcon size={17} /> : <CheckCircle2 size={17} />}
                        </span>
                        <div className="min-w-0">
                          <b className="tabular block text-[1.4rem] font-bold leading-none tracking-tight">{item.count}</b>
                          <span className="mt-1 block truncate text-[11.5px] font-medium text-[var(--ink-muted)]">{item.label}</span>
                        </div>
                        {active && <ChevronRight size={15} className="ml-auto shrink-0 text-[var(--ink-muted)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" />}
                      </button>
                    )
                  })}
                </section>

                <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {kpis.map(({ label, value, sub, icon: KpiIcon, tint }) => (
                    <div key={label} className="panel panel-hover group p-4">
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">{label}</span>
                        <span className="grid size-7 place-items-center rounded-md transition-transform duration-300 group-hover:scale-110" style={{ background: `${tint}14`, color: tint }}><KpiIcon size={14} /></span>
                      </div>
                      <p className="tabular mt-3 text-[1.6rem] font-bold leading-none tracking-[-0.02em]">{value}</p>
                      <span className="mt-1.5 block text-[11px] text-[var(--ink-muted)]">{sub}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
                  <section className="panel overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                      <div>
                        <h2 className="text-[13.5px] font-bold tracking-tight">Recent orders</h2>
                        <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Straight from the database · updates live</p>
                      </div>
                      <button onClick={() => setTab('Orders')} className="group flex items-center gap-1 rounded-md border border-[var(--line)] px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)]">View all <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" /></button>
                    </div>
                    {orders.length === 0 ? (
                      <div className="p-10 text-center">
                        <TestTube2 size={22} className="mx-auto text-[var(--ink-muted)]" />
                        <p className="mt-3 text-sm font-medium">No orders yet</p>
                        <p className="mt-1 text-xs text-[var(--ink-muted)]">Patient bookings will appear here the moment they happen — no sample data is shown.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--line)]">
                        {orders.slice(0, 6).map((order) => (
                          <div key={order.orderId} className="flex items-center gap-3 px-5 py-3">
                            <span className="font-mono text-[11px] text-[var(--ink-muted)]">{order.orderId}</span>
                            <div className="min-w-0 flex-1">
                              <b className="block truncate text-[13px] font-medium">{order.patientName}</b>
                              <span className="text-[11px] text-[var(--ink-muted)]">{order.testName}</span>
                            </div>
                            <span className="tabular text-[13px] font-semibold">{rupees(order.amount)}</span>
                            <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ink-soft)]">{order.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="surface overflow-hidden rounded-2xl">
                    <div className="border-b border-[var(--line)] px-5 py-4">
                      <h2 className="text-sm font-semibold">Activity</h2>
                    </div>
                    {data.activity.length === 0 ? (
                      <p className="p-6 text-xs text-[var(--ink-muted)]">Nothing logged yet.</p>
                    ) : (
                      <div className="max-h-80 divide-y divide-[var(--line)] overflow-y-auto">
                        {data.activity.slice(0, 8).map((item) => (
                          <div key={item.id} className="flex items-start gap-2.5 px-5 py-3">
                            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.kind === 'booking' ? 'bg-[#0f6fb5]' : item.kind === 'report' ? 'bg-[#7c5cff]' : 'bg-[#14a08a]'}`} />
                            <div className="min-w-0">
                              <p className="text-[13px] leading-5">{item.text}</p>
                              <p className="text-[10px] text-[var(--ink-muted)]">{new Date(item.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <section className="surface mt-5 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">Bookings · last 7 days</h2>
                      <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Real orders from the database</p>
                    </div>
                    <TrendingUp size={16} className="text-[var(--ink-muted)]" />
                  </div>
                  <div className="mt-6 flex h-40 items-end gap-3">
                    {data.stats.analytics.map((point) => {
                      const max = Math.max(...data.stats.analytics.map((item) => item.bookings), 1)
                      return (
                        <div key={point.date} className="group flex flex-1 flex-col items-center gap-2">
                          <div className="relative flex h-full w-full items-end justify-center">
                            <div className="absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#12283d] px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">{point.bookings} orders · {rupees(point.revenue)}</div>
                            <div style={{ height: `${(point.bookings / max) * 100}%` }} className="w-2/3 max-w-9 rounded-t-md bg-[var(--brand)] transition-all duration-500" />
                          </div>
                          <span className="text-[10px] font-medium text-[var(--ink-muted)]">{point.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </>
            )}

            {data && tab === 'Orders' && <OrdersManager orders={orders} onChanged={realtime.refresh} focusOrderId={focusOrder} onFocusHandled={() => setFocusOrder(null)} />}
            {data && tab === 'Patients' && <PatientsManager patients={data.patients} orders={orders} />}
            {data && tab === 'Audit log' && <AuditLog events={data.recentEvents} />}
            {data && tab === 'Tests & pricing' && <TestManager tests={tests} onChanged={realtime.refresh} />}

            {data && tab === 'Activity' && (
              <section className="surface overflow-hidden rounded-2xl">
                <div className="border-b border-[var(--line)] px-5 py-4">
                  <h2 className="text-sm font-semibold">Activity log</h2>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Every real event recorded in the database</p>
                </div>
                {data.activity.length === 0 ? (
                  <p className="p-10 text-center text-sm text-[var(--ink-muted)]">No activity yet.</p>
                ) : (
                  <div className="divide-y divide-[var(--line)]">
                    {data.activity.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--muted)] text-[var(--ink-soft)]">
                          {item.kind === 'booking' ? <CalendarDays size={14} /> : item.kind === 'report' ? <FileText size={14} /> : <Activity size={14} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-5">{item.text}</p>
                          <p className="text-[10px] text-[var(--ink-muted)]">{new Date(item.at).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {data && tab === 'Settings' && (
              <div className="space-y-5">
                <NotificationSettings onChanged={refreshSettings} />
                <SettingsPanel
                  settings={{
                    brandName: data.brandName,
                    tagline: data.tagline,
                    logo: data.logo,
                    labPhone: data.labPhone,
                    collectionFee: data.collectionFee,
                    adminId: auth.user?.id ?? 'admin',
                    adminName: auth.user?.name ?? 'Operations lead',
                  }}
                  onChanged={refreshSettings}
                />
              </div>
            )}
    </ConsoleShell>
  )
}
