'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, LogOut, Menu, Search, TestTube2, X } from 'lucide-react'
import type { AdminAuthApi, RealtimeApi } from '@/hooks/use-realtime'
import { NotificationBell } from '@/components/admin/notification-bell'

export type Tab = 'Overview' | 'Orders' | 'Patients' | 'Tests & pricing' | 'Audit log' | 'Activity' | 'Settings'

export interface NavItem {
  name: Tab
  icon: typeof TestTube2
  group: string
}

interface Props {
  tab: Tab
  setTab: (tab: Tab) => void
  navItems: NavItem[]
  realtime: RealtimeApi
  auth: AdminAuthApi
  orders: number
  pendingReports: number
  onOpenOrder: (orderId: string) => void
  children: React.ReactNode
}

/**
 * Console shell: collapsible sidebar, command bar and animated page transitions.
 * All motion is defined in globals.css (`.anim-*`, `.stagger`, `.panel-hover`).
 */
export function ConsoleShell({ tab, setTab, navItems, realtime, auth, orders, pendingReports, onOpenOrder, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const data = realtime.data
  const initials = (auth.user?.name ?? 'Staff').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  // ⌘K / Ctrl+K jumps between sections.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close the mobile drawer whenever the section changes.
  useEffect(() => { setMobileNav(false) }, [tab])

  const groups = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    ; (acc[item.group] ??= []).push(item)
    return acc
  }, {})

  const results = navItems.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
  const active = navItems.find((item) => item.name === tab)

  const NavButton = ({ item, compact }: { item: NavItem; compact?: boolean }) => {
    const Icon = item.icon
    const selected = tab === item.name
    const badge = item.name === 'Orders' ? orders : item.name === 'Overview' ? pendingReports : 0
    return (
      <button
        onClick={() => setTab(item.name)}
        title={compact ? item.name : undefined}
        aria-current={selected ? 'page' : undefined}
        className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-all duration-300 ${selected ? 'bg-[var(--brand)] text-white shadow-[0_6px_16px_-8px_rgba(15,111,181,0.75)]' : 'text-[var(--ink-soft)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]'
          } ${compact ? 'justify-center px-0' : ''}`}
      >
        <Icon size={16} className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${selected ? 'text-white' : 'text-[var(--ink-muted)] group-hover:text-[var(--brand)]'}`} />
        {!compact && <span className="truncate">{item.name}</span>}
        {!compact && badge > 0 && (
          <span className={`ml-auto rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${selected ? 'bg-white/25 text-white' : 'bg-[var(--brand-soft)] text-[var(--brand-deep)] ring-1 ring-[#cfe3f5]'}`}>{badge}</span>
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground">
      <div className="flex">
        {/* ---------- Sidebar ---------- */}
        <aside
          className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-[var(--line)] bg-white/90 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex ${collapsed ? 'w-[76px]' : 'w-64'}`}
        >
          <div className={`flex h-16 items-center gap-2.5 border-b border-[var(--line)] ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--brand)] text-white">
              {data?.logo ? <img src={data.logo} alt="" className="size-full bg-white object-contain p-1" /> : <TestTube2 size={17} />}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <b className="block truncate text-[13.5px] font-bold leading-tight tracking-tight">{data?.brandName ?? 'Diagnostics'}</b>
                <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--ink-muted)]">Console</span>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-4">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-5 last:mb-0">
                {!collapsed && <p className="mb-1.5 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">{group}</p>}
                <div className="space-y-0.5">{items.map((item) => <NavButton key={item.name} item={item} compact={collapsed} />)}</div>
              </div>
            ))}
          </nav>

          <div className="border-t border-[var(--line)] p-2.5">
            {!collapsed && (
              <div className="mb-2 rounded-lg bg-[#12283d] px-3 py-2.5 text-white">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#4fd6bd]">
                  <span className={`size-1.5 rounded-full ${realtime.connected ? 'animate-pulse bg-[#4fd6bd]' : 'bg-[#f59e0b]'}`} />
                  {realtime.connected ? 'Realtime connected' : 'Reconnecting…'}
                </div>
                <p className="mt-1 text-[10.5px] leading-4 text-white/50">Changes sync across every open tab.</p>
              </div>
            )}
            <button
              onClick={() => setCollapsed((value) => !value)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-[var(--ink-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--ink)]"
            >
              {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /> Collapse</>}
            </button>
          </div>
        </aside>

        {/* ---------- Main column ---------- */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/80 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <button onClick={() => setMobileNav(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-lg border border-[var(--line)] text-[var(--ink-soft)] transition hover:bg-[var(--muted)] lg:hidden">
                <Menu size={17} />
              </button>

              <div className="hidden min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--ink-muted)] sm:flex">
                <span className="font-medium">Console</span>
                {active && <><ChevronRight size={13} /><span className="truncate font-semibold text-[var(--ink)]">{active.name}</span></>}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setPaletteOpen(true)}
                  className="hidden items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] px-3 py-2 text-[12px] text-[var(--ink-muted)] transition hover:border-[var(--brand)] hover:text-[var(--ink)] md:flex"
                >
                  <Search size={13} /> Jump to…
                  <kbd className="ml-4 rounded border border-[var(--line)] bg-white px-1.5 py-0.5 font-mono text-[9.5px]">⌘K</kbd>
                </button>

                <span className="hidden items-center gap-1.5 rounded-full bg-[var(--mint-soft)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--accent-foreground)] sm:flex">
                  <span className={`size-1.5 rounded-full ${realtime.connected ? 'animate-pulse bg-[#14a08a]' : 'bg-[#f59e0b]'}`} />
                  {realtime.connected ? 'Live' : 'Offline'}
                </span>

                <NotificationBell
                  notifications={data?.notifications ?? []}
                  unread={data?.unreadNotifications ?? 0}
                  onOpenOrder={onOpenOrder}
                  onOpenSettings={() => setTab('Settings')}
                />

                <div className="group flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white py-1 pl-1 pr-1.5">
                  <span className="grid size-7 place-items-center rounded-md bg-[var(--brand)] text-[10.5px] font-bold text-white">{initials}</span>
                  <div className="hidden pr-1 sm:block">
                    <b className="block text-[11px] font-semibold leading-tight">{auth.user?.name}</b>
                    <span className="block text-[9.5px] text-[var(--ink-muted)]">{auth.user?.id}</span>
                  </div>
                  <button onClick={() => auth.signOut()} aria-label="Sign out" title="Sign out" className="grid size-7 place-items-center rounded-md text-[var(--ink-muted)] transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626]">
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main key={tab} className="anim-fade-up mx-auto max-w-[1440px] p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h1 className="mt-1 text-[1.65rem] font-bold leading-tight tracking-[-0.025em]">
                  {tab === 'Overview' ? (
                    <>Welcome back, <span className="text-[var(--brand)]">{auth.user?.name?.split(' ')[0] ?? ''}</span></>
                  ) : tab}
                </h1>
              </div>
              {data && tab === 'Overview' && (
                <p className="text-[11.5px] text-[var(--ink-muted)]">
                  <b className="tabular text-[var(--ink)]">{data.pending.total}</b> orders · <b className="tabular text-[var(--ink)]">{data.patients.length}</b> patients
                </p>
              )}
            </div>
            {children}
          </main>
        </div>
      </div>

      {/* ---------- Mobile drawer ---------- */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-[#12283d]/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <aside className="anim-slide-right relative flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[var(--line)] px-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-[var(--brand)] text-white"><TestTube2 size={17} /></span>
                <b className="text-[13.5px] font-bold">{data?.brandName ?? 'Diagnostics'}</b>
              </div>
              <button onClick={() => setMobileNav(false)} aria-label="Close menu" className="grid size-8 place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--muted)]"><X size={16} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {Object.entries(groups).map(([group, items]) => (
                <div key={group} className="mb-5">
                  <p className="mb-1.5 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">{group}</p>
                  <div className="space-y-0.5">{items.map((item) => <NavButton key={item.name} item={item} />)}</div>
                </div>
              ))}
            </nav>
            <div className="border-t border-[var(--line)] p-3">
              <button onClick={() => auth.signOut()} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-[var(--ink-soft)] hover:bg-[var(--muted)]">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ---------- Command palette ---------- */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#12283d]/40 p-4 pt-[14vh] backdrop-blur-sm" onClick={() => setPaletteOpen(false)}>
          <div className="anim-in w-full max-w-md overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4">
              <Search size={15} className="text-[var(--ink-muted)]" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jump to a section…" className="flex-1 bg-transparent py-3.5 text-[13px] outline-none placeholder:text-[var(--ink-muted)]" />
              <kbd className="rounded border border-[var(--line)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--ink-muted)]">ESC</kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {results.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.name} onClick={() => { setTab(item.name); setPaletteOpen(false); setQuery('') }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-[var(--brand-soft)]">
                    <span className="grid size-7 place-items-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]"><Icon size={14} /></span>
                    <span className="flex-1 text-[12.5px] font-medium">{item.name}</span>
                    <ChevronRight size={13} className="text-[var(--ink-muted)]" />
                  </button>
                )
              })}
              {results.length === 0 && <p className="p-6 text-center text-[12px] text-[var(--ink-muted)]">No sections match.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
