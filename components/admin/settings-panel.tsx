'use client'

import { useRef, useState } from 'react'
import { Check, ImagePlus, KeyRound, Loader2, Trash2, Upload } from 'lucide-react'

interface SettingsProps {
  settings: {
    brandName: string
    tagline: string
    logo: string
    labPhone: string
    collectionFee: number
    adminId: string
    adminName: string
  }
  onChanged: () => Promise<void>
}

export function SettingsPanel({ settings, onChanged }: SettingsProps) {
  const [brand, setBrand] = useState({
    brandName: settings.brandName,
    tagline: settings.tagline,
    labPhone: settings.labPhone,
    collectionFee: String(settings.collectionFee),
  })
  const [logo, setLogo] = useState(settings.logo)
  const [brandBusy, setBrandBusy] = useState(false)
  const [brandNotice, setBrandNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const [creds, setCreds] = useState({ adminId: settings.adminId, adminName: settings.adminName, currentPassword: '', newPassword: '', confirmPassword: '' })
  const [credBusy, setCredBusy] = useState(false)
  const [credNotice, setCredNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const readLogo = (file: File) => {
    if (file.size > 400 * 1024) {
      setBrandNotice({ tone: 'error', text: 'Logo must be under 400 KB. Try a smaller image.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogo(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  const saveBrand = async () => {
    setBrandBusy(true)
    setBrandNotice(null)
    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...brand, collectionFee: Number(brand.collectionFee) || 0, logo }),
    })
    const body = await response.json().catch(() => ({}))
    setBrandBusy(false)
    setBrandNotice(response.ok ? { tone: 'ok', text: 'Branding saved and published to the website.' } : { tone: 'error', text: body.error ?? 'Could not save settings.' })
    if (response.ok) await onChanged()
  }

  const saveCredentials = async () => {
    setCredNotice(null)
    if (creds.newPassword && creds.newPassword !== creds.confirmPassword) {
      setCredNotice({ tone: 'error', text: 'New passwords do not match.' })
      return
    }
    if (!creds.currentPassword) {
      setCredNotice({ tone: 'error', text: 'Enter your current password to save changes.' })
      return
    }
    setCredBusy(true)
    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId: creds.adminId,
        adminName: creds.adminName,
        currentPassword: creds.currentPassword,
        ...(creds.newPassword ? { newPassword: creds.newPassword } : {}),
      }),
    })
    const body = await response.json().catch(() => ({}))
    setCredBusy(false)
    if (!response.ok) {
      setCredNotice({ tone: 'error', text: body.error ?? 'Could not update credentials.' })
      return
    }
    setCredNotice({ tone: 'ok', text: creds.newPassword ? 'Credentials updated. Please sign in again.' : 'Account details updated.' })
    setCreds((current) => ({ ...current, currentPassword: '', newPassword: '', confirmPassword: '' }))
    await onChanged()
  }

  const notice = (value: { tone: 'ok' | 'error'; text: string } | null) =>
    value && (
      <p className={`rounded-lg px-3 py-2 text-[11px] font-medium ${value.tone === 'ok' ? 'bg-[#e6f6f2] text-[#0b7d6b]' : 'bg-[#fdf4e3] text-[#8a5a00]'}`}>{value.text}</p>
    )

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Branding */}
      <section className="surface rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[#e9f3fb] text-[#0f6fb5]"><ImagePlus size={15} /></span>
          <div>
            <h2 className="text-sm font-semibold">Brand identity</h2>
            <p className="text-[11px] text-[var(--ink-muted)]">Shown on the website, console and every PDF report</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-sunken)]">
            {logo ? <img src={logo} alt="Current logo" className="size-full object-contain p-2" /> : <ImagePlus size={20} className="text-[var(--ink-muted)]" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--muted)]">
              <Upload size={13} /> Upload logo
            </button>
            {logo && (
              <button onClick={() => setLogo('')} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[#dc2626] transition hover:bg-[#fee2e2]">
                <Trash2 size={13} /> Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && readLogo(event.target.files[0])} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-xs font-medium">Brand name
            <input value={brand.brandName} onChange={(event) => setBrand({ ...brand, brandName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
          </label>
          <label className="block text-xs font-medium">Tagline
            <input value={brand.tagline} onChange={(event) => setBrand({ ...brand, tagline: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">Helpline
              <input value={brand.labPhone} onChange={(event) => setBrand({ ...brand, labPhone: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5]" />
            </label>
            <label className="block text-xs font-medium">Home collection fee (₹)
              <input value={brand.collectionFee} onChange={(event) => setBrand({ ...brand, collectionFee: event.target.value.replace(/\D/g, '') })} inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5]" />
            </label>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {notice(brandNotice)}
          <button onClick={saveBrand} disabled={brandBusy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#12283d] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {brandBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save branding
          </button>
        </div>
      </section>

      {/* Security */}
      <section className="surface rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[#fdf4e3] text-[#8a5a00]"><KeyRound size={15} /></span>
          <div>
            <h2 className="text-sm font-semibold">Admin credentials</h2>
            <p className="text-[11px] text-[var(--ink-muted)]">Change the staff ID and password used to sign in</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">Staff ID
              <input value={creds.adminId} onChange={(event) => setCreds({ ...creds, adminId: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
            </label>
            <label className="block text-xs font-medium">Display name
              <input value={creds.adminName} onChange={(event) => setCreds({ ...creds, adminName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
            </label>
          </div>
          <label className="block text-xs font-medium">Current password <span className="font-normal text-[var(--ink-muted)]">(required to save)</span>
            <input type="password" value={creds.currentPassword} onChange={(event) => setCreds({ ...creds, currentPassword: event.target.value })} autoComplete="current-password" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5] focus:ring-4 focus:ring-[#0f6fb5]/10" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">New password
              <input type="password" value={creds.newPassword} onChange={(event) => setCreds({ ...creds, newPassword: event.target.value })} autoComplete="new-password" placeholder="Leave blank to keep" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5]" />
            </label>
            <label className="block text-xs font-medium">Confirm new password
              <input type="password" value={creds.confirmPassword} onChange={(event) => setCreds({ ...creds, confirmPassword: event.target.value })} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[#0f6fb5]" />
            </label>
          </div>
          <p className="text-[11px] leading-5 text-[var(--ink-muted)]">Changing these signs out every active session. Passwords must be at least 8 characters.</p>
        </div>

        <div className="mt-4 space-y-3">
          {notice(credNotice)}
          <button onClick={saveCredentials} disabled={credBusy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#12283d] py-2.5 text-sm font-semibold disabled:opacity-60">
            {credBusy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Update credentials
          </button>
        </div>
      </section>
    </div>
  )
}
