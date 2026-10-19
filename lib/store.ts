import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Persistent data layer (SQLite via better-sqlite3).
 *
 * Every row here is created through the admin console or a real patient
 * booking — there is no demo/seed content. A single database file lives at
 * `data/sv-diagnostics.db`; set DATABASE_FILE to override.
 *
 * Swap `getDb()` for Postgres in production — the query surface is small and
 * plain SQL, so the migration is mechanical.
 */

const dbFile = process.env.DATABASE_FILE ?? join(process.cwd(), 'data', 'sv-diagnostics.db')

const globalForDb = globalThis as typeof globalThis & { __svDb?: Database.Database }
export function getDb(): Database.Database {
  if (globalForDb.__svDb) return globalForDb.__svDb
  mkdirSync(join(dbFile, '..'), { recursive: true })
  const db = new Database(dbFile)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  globalForDb.__svDb = db
  return db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tests (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      category      TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      sample_type   TEXT NOT NULL DEFAULT '',
      price         INTEGER NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'none',    -- none | percent | amount
      discount_value INTEGER NOT NULL DEFAULT 0,
      report_hours  TEXT NOT NULL DEFAULT '24 hours',
      prep          TEXT NOT NULL DEFAULT 'No fasting',
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS packages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tests       TEXT NOT NULL DEFAULT '',
      price       INTEGER NOT NULL,
      old_price   INTEGER,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id             TEXT PRIMARY KEY,
      order_id       TEXT NOT NULL UNIQUE,
      patient_name   TEXT NOT NULL,
      phone          TEXT NOT NULL DEFAULT '',
      pincode        TEXT NOT NULL DEFAULT '',
      test_id        INTEGER,
      test_name      TEXT NOT NULL,
      type           TEXT NOT NULL,
      slot           TEXT NOT NULL DEFAULT '',
      amount         INTEGER NOT NULL DEFAULT 0,
      status         TEXT NOT NULL DEFAULT 'Confirmed',
      report_pdf     BLOB,
      report_ready_at INTEGER,
      whatsapp_sent_at INTEGER,
      created_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      kind   TEXT NOT NULL,
      text   TEXT NOT NULL,
      at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id     TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      role   TEXT NOT NULL,
      text   TEXT NOT NULL,
      at     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_created ON appointments(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_at ON activity(at DESC);
  `)

  // Defaults are only written once; afterwards the admin owns them.
  // Older databases predate the sample-type column.
  const columns = db.prepare('PRAGMA table_info(tests)').all() as { name: string }[]
  if (!columns.some((column) => column.name === 'sample_type')) {
    db.exec("ALTER TABLE tests ADD COLUMN sample_type TEXT NOT NULL DEFAULT ''")
  }

  // Uploaded-report + operations metadata (added incrementally so existing
  // databases upgrade in place).
  const orderColumns = new Set((db.prepare('PRAGMA table_info(appointments)').all() as { name: string }[]).map((column) => column.name))
  const addOrderColumn = (name: string, ddl: string) => {
    if (!orderColumns.has(name)) db.exec(`ALTER TABLE appointments ADD COLUMN ${name} ${ddl}`)
  }
  addOrderColumn('report_filename', "TEXT NOT NULL DEFAULT ''")
  addOrderColumn('report_size', 'INTEGER NOT NULL DEFAULT 0')
  addOrderColumn('report_uploaded_at', 'INTEGER')
  addOrderColumn('report_notes', "TEXT NOT NULL DEFAULT ''")
  addOrderColumn('staff_note', "TEXT NOT NULL DEFAULT ''")
  addOrderColumn('payment_status', "TEXT NOT NULL DEFAULT 'Pending'")
  addOrderColumn('payment_method', "TEXT NOT NULL DEFAULT ''")
  addOrderColumn('cancelled_at', 'INTEGER')

  // Append-only timeline so every operational change is explainable.
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   TEXT NOT NULL,
      kind       TEXT NOT NULL,
      text       TEXT NOT NULL,
      actor      TEXT NOT NULL DEFAULT 'System',
      at         INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, at DESC);

    -- In-app staff notifications, one row per event worth surfacing.
    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      kind        TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL DEFAULT '',
      order_id    TEXT,
      href_tab    TEXT NOT NULL DEFAULT 'Orders',
      channel     TEXT NOT NULL DEFAULT '',   -- comma list: what was attempted
      delivery    TEXT NOT NULL DEFAULT '{}', -- JSON per-channel result
      read_at     INTEGER,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
  `)

  const seedSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  seedSetting.run('brand_tagline', 'Accurate tests. Trusted care.')
  seedSetting.run('logo_data_url', '')
  seedSetting.run('admin_id', 'admin')
  seedSetting.run('admin_name', 'Operations lead')
  seedSetting.run('admin_password_salt', '')
  seedSetting.run('admin_password_hash', '')
  seedSetting.run('whatsapp_sender', '')
  seedSetting.run('admin_whatsapp', '')
  seedSetting.run('whatsapp_phone_number_id', '')
  seedSetting.run('whatsapp_access_token', '')
  seedSetting.run('notify_on_booking', '1')
  seedSetting.run('lab_phone', '1800 123 4567')
  seedSetting.run('collection_fee', '99')
}

/* ------------------------------------------------------------------ */
/*  Settings                                                          */
/* ------------------------------------------------------------------ */

export function getSetting(key: string, fallback = ''): string {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? fallback
}

export function setSetting(key: string, value: string) {
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

export function publicSettings() {
  return {
    brandName: getSetting('brand_name', 'SV Diagnostics'),
    tagline: getSetting('brand_tagline', 'Accurate tests. Trusted care.'),
    logo: getSetting('logo_data_url'),
    labPhone: getSetting('lab_phone'),
    collectionFee: Number(getSetting('collection_fee', '99')) || 0,
    whatsappSender: getSetting('whatsapp_sender'),
  }
}

/* ------------------------------------------------------------------ */
/*  Admin credentials (stored in the database, changeable in the app)  */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}

export function isAdminConfigured() {
  return Boolean(getSetting('admin_password_hash'))
}

let appliedEnvFingerprint: string | null = null

/**
 * First run: ADMIN_ID / ADMIN_PASSWORD (or the documented default), which the
 * console then owns. Changing those env vars later re-applies them once, so a
 * deployment can always recover or rotate the admin login.
 */
export function ensureDefaultAdmin() {
  const envId = process.env.ADMIN_ID?.trim()
  const envPassword = process.env.ADMIN_PASSWORD
  if (envPassword) {
    if (appliedEnvFingerprint === null) {
      appliedEnvFingerprint = scryptSync(`${envId ?? ''}\0${envPassword}`, 'sv-admin-env', 32).toString('hex')
    }
    if (getSetting('admin_env_fingerprint') !== appliedEnvFingerprint) {
      if (envId) setSetting('admin_id', envId)
      const { salt, hash } = hashPassword(envPassword)
      setSetting('admin_password_salt', salt)
      setSetting('admin_password_hash', hash)
      setSetting('admin_env_fingerprint', appliedEnvFingerprint)
    }
    return
  }
  if (isAdminConfigured()) return
  const { salt, hash } = hashPassword('sv-admin-2026')
  setSetting('admin_password_salt', salt)
  setSetting('admin_password_hash', hash)
}

export function verifyAdmin(id: string, password: string) {
  ensureDefaultAdmin()
  const expectedId = getSetting('admin_id', 'admin')
  if (id.trim().toLowerCase() !== expectedId.toLowerCase()) return null

  const salt = getSetting('admin_password_salt')
  const stored = getSetting('admin_password_hash')
  if (!salt || !stored) return null

  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(stored, 'hex')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  return { id: expectedId, name: getSetting('admin_name', 'Operations lead'), role: 'Operations lead' }
}

export function updateAdminCredentials(input: { adminId?: string; adminName?: string; currentPassword: string; newPassword?: string }) {
  const check = verifyAdmin(getSetting('admin_id', 'admin'), input.currentPassword)
  if (!check) return { ok: false as const, error: 'Current password is incorrect.' }

  if (input.adminId && input.adminId.trim()) setSetting('admin_id', input.adminId.trim())
  if (input.adminName && input.adminName.trim()) setSetting('admin_name', input.adminName.trim())

  if (input.newPassword) {
    if (input.newPassword.length < 8) return { ok: false as const, error: 'New password must be at least 8 characters.' }
    const { salt, hash } = hashPassword(input.newPassword)
    setSetting('admin_password_salt', salt)
    setSetting('admin_password_hash', hash)
  }
  return { ok: true as const }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

export type DiscountType = 'none' | 'percent' | 'amount'

export interface TestRow {
  id: number
  name: string
  category: string
  description: string
  sample_type: string
  price: number
  discount_type: DiscountType
  discount_value: number
  report_hours: string
  prep: string
  active: number
  created_at: number
}

export interface TestView {
  id: number
  name: string
  category: string
  description: string
  sampleType: string
  price: number
  finalPrice: number
  discountType: DiscountType
  discountValue: number
  discountLabel: string
  reportHours: string
  prep: string
  active: boolean
}

export const computeFinalPrice = (price: number, type: DiscountType, value: number) => {
  if (type === 'amount') return Math.max(1, price - Math.max(0, value))
  if (type === 'percent') {
    const percent = Math.min(100, Math.max(0, value))
    return Math.max(1, Math.round(price * (1 - percent / 100)))
  }
  return price
}

export const discountLabel = (type: DiscountType, value: number) => {
  if (type === 'percent' && value > 0) return `${value}% off`
  if (type === 'amount' && value > 0) return `₹${value.toLocaleString('en-IN')} off`
  return ''
}

export function toTestView(row: TestRow): TestView {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    sampleType: row.sample_type,
    price: row.price,
    finalPrice: computeFinalPrice(row.price, row.discount_type, row.discount_value),
    discountType: row.discount_type,
    discountValue: row.discount_value,
    discountLabel: discountLabel(row.discount_type, row.discount_value),
    reportHours: row.report_hours,
    prep: row.prep,
    active: Boolean(row.active),
  }
}

export function listTests(includeInactive = false): TestView[] {
  const rows = getDb()
    .prepare(`SELECT * FROM tests ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY category ASC, name ASC`)
    .all() as TestRow[]
  return rows.map(toTestView)
}

/** Distinct categories for the homepage filter chips, in a stable order. */
export function listTestCategories(): string[] {
  const rows = getDb().prepare('SELECT DISTINCT category FROM tests WHERE active = 1').all() as { category: string }[]
  return rows.map((row) => row.category)
}

export function getTest(id: number): TestView | null {
  const row = getDb().prepare('SELECT * FROM tests WHERE id = ?').get(id) as TestRow | undefined
  return row ? toTestView(row) : null
}

export function createTest(input: {
  name: string
  category: string
  description?: string
  sampleType?: string
  price: number
  discountType?: DiscountType
  discountValue?: number
  reportHours?: string
  prep?: string
}) {
  const info = getDb()
    .prepare(
      `INSERT INTO tests (name, category, description, sample_type, price, discount_type, discount_value, report_hours, prep, active, created_at)
       VALUES (@name, @category, @description, @sampleType, @price, @discountType, @discountValue, @reportHours, @prep, 1, @createdAt)`,
    )
    .run({
      name: input.name,
      category: input.category,
      description: input.description ?? '',
      sampleType: input.sampleType ?? '',
      price: input.price,
      discountType: input.discountType ?? 'none',
      discountValue: input.discountValue ?? 0,
      reportHours: input.reportHours ?? '24 hours',
      prep: input.prep ?? 'No fasting',
      createdAt: Date.now(),
    })
  return getTest(Number(info.lastInsertRowid))!
}

export function updateTest(id: number, input: Partial<Omit<TestView, 'id' | 'finalPrice' | 'discountLabel'>> & { active?: boolean }) {
  const current = getDb().prepare('SELECT * FROM tests WHERE id = ?').get(id) as TestRow | undefined
  if (!current) return null
  getDb()
    .prepare(
      `UPDATE tests SET name=@name, category=@category, description=@description, sample_type=@sample_type, price=@price,
        discount_type=@discount_type, discount_value=@discount_value, report_hours=@report_hours,
        prep=@prep, active=@active WHERE id=@id`,
    )
    .run({
      id,
      name: input.name ?? current.name,
      category: input.category ?? current.category,
      description: input.description ?? current.description,
      sample_type: input.sampleType ?? current.sample_type,
      price: input.price ?? current.price,
      discount_type: input.discountType ?? current.discount_type,
      discount_value: input.discountValue ?? current.discount_value,
      report_hours: input.reportHours ?? current.report_hours,
      prep: input.prep ?? current.prep,
      active: input.active === undefined ? current.active : input.active ? 1 : 0,
    })
  return getTest(id)
}

export function deleteTest(id: number) {
  return getDb().prepare('DELETE FROM tests WHERE id = ?').run(id).changes > 0
}

/**
 * Imports the price list into the bookable catalogue.
 *
 * Idempotent by (case-insensitive) name: existing tests are updated in place
 * so admin discounts survive, and only genuinely new investigations are
 * inserted. Sample types live in the description because the catalogue has no
 * dedicated column for them.
 */
export function importPriceList(items: { name: string; sampleType: string; price: number; package?: boolean }[]) {
  const db = getDb()
  const existing = db.prepare('SELECT id, name FROM tests').all() as { id: number; name: string }[]
  const byName = new Map(existing.map((row) => [row.name.trim().toLowerCase(), row.id]))

  const insert = db.prepare(
    `INSERT INTO tests (name, category, description, sample_type, price, discount_type, discount_value, report_hours, prep, active, created_at)
     VALUES (@name, @category, @description, @sample_type, @price, 'none', 0, '24 hours', @prep, 1, @createdAt)`,
  )
  // Only refresh price/description — never overwrite an admin's discount.
  const update = db.prepare(`UPDATE tests SET price = @price, sample_type = @sample_type, category = @category WHERE id = @id`)

  let inserted = 0
  let updated = 0
  db.transaction(() => {
    for (const item of items) {
      const name = item.name.trim().replace(/\s+/g, ' ')
      const sampleType = item.sampleType
      const description = item.package ? 'Full-body health package with multiple investigations.' : ''
      const category = item.package
        ? 'Health packages'
        : /URINE/i.test(item.sampleType)
          ? 'Urine'
          : /STOOL|SPUTUM|SWAB|PUS|SEMEN/i.test(item.sampleType)
            ? 'Microbiology'
            : /NA$/i.test(item.sampleType)
              ? 'Imaging & Cardiology'
              : 'Pathology'
      const prep = category === 'Imaging & Cardiology' ? 'No special preparation' : 'No fasting unless advised'
      const id = byName.get(name.toLowerCase())
      if (id) {
        update.run({ id, price: item.price, sample_type: sampleType, category })
        updated += 1
      } else {
        insert.run({ name, category, description, sample_type: sampleType, price: item.price, prep, createdAt: Date.now() })
        inserted += 1
      }
    }
  })()

  return { inserted, updated, total: items.length }
}

/* ------------------------------------------------------------------ */
/*  Appointments / orders                                             */
/* ------------------------------------------------------------------ */

export interface OrderRow {
  id: string
  order_id: string
  patient_name: string
  phone: string
  pincode: string
  test_id: number | null
  test_name: string
  type: string
  slot: string
  amount: number
  status: string
  report_ready_at: number | null
  whatsapp_sent_at: number | null
  report_filename: string
  report_size: number
  report_uploaded_at: number | null
  report_notes: string
  staff_note: string
  payment_status: string
  payment_method: string
  cancelled_at: number | null
  created_at: number
}

const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newOrderId() {
  const bytes = randomBytes(6)
  let code = ''
  for (let index = 0; index < 6; index += 1) code += ORDER_ALPHABET[bytes[index] % ORDER_ALPHABET.length]
  return `SV-${new Date().getFullYear()}-${code}`
}

export function createOrder(input: {
  patientName: string
  phone: string
  pincode?: string
  testId?: number
  testName: string
  type: 'Home collection' | 'Lab visit'
  slot: string
  amount: number
}) {
  const db = getDb()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderId = newOrderId()
    try {
      db.prepare(
        `INSERT INTO appointments (id, order_id, patient_name, phone, pincode, test_id, test_name, type, slot, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?)`,
      ).run(
        orderId,
        orderId,
        input.patientName,
        input.phone,
        input.pincode ?? '',
        input.testId ?? null,
        input.testName,
        input.type,
        input.slot,
        input.amount,
        Date.now(),
      )
      addOrderEvent(orderId, 'created', `Order placed · ${input.testName} (${input.type})`, input.patientName)
      return getOrder(orderId)!
    } catch (error) {
      if (!(error as Error).message.includes('UNIQUE')) throw error
    }
  }
  throw new Error('Could not allocate an order ID')
}

export function getOrder(reference: string): OrderRow | null {
  const value = reference.trim().toUpperCase()
  return (getDb().prepare('SELECT * FROM appointments WHERE order_id = ? OR id = ?').get(value, value) as OrderRow | undefined) ?? null
}

export type OrderView = Omit<OrderRow, 'report_ready_at' | 'whatsapp_sent_at'> & {
  hasReport: boolean
  reportReadyAt: number | null
  whatsappSentAt: number | null
}

export interface OrderEvent {
  id: number
  order_id: string
  kind: string
  text: string
  actor: string
  at: number
}

export function addOrderEvent(orderId: string, kind: string, text: string, actor = 'Staff') {
  getDb().prepare('INSERT INTO order_events (order_id, kind, text, actor, at) VALUES (?, ?, ?, ?, ?)').run(orderId, kind, text, actor, Date.now())
}

export function listOrderEvents(orderId: string): OrderEvent[] {
  return getDb().prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY at DESC LIMIT 100').all(orderId) as OrderEvent[]
}

export function listOrders(): OrderView[] {
  const rows = getDb()
    .prepare('SELECT *, (report_pdf IS NOT NULL) AS has_report FROM appointments ORDER BY created_at DESC LIMIT 500')
    .all() as (OrderRow & { has_report: number })[]
  return rows.map((row) => ({
    ...row,
    hasReport: Boolean(row.has_report),
    reportReadyAt: row.report_ready_at,
    whatsappSentAt: row.whatsapp_sent_at,
  }))
}

export function attachReportPdf(orderId: string, pdf: Buffer, meta?: { filename?: string; notes?: string }) {
  const now = Date.now()
  getDb()
    .prepare(
      `UPDATE appointments SET report_pdf = ?, report_size = ?, report_filename = ?, report_uploaded_at = ?,
       report_notes = COALESCE(NULLIF(?, ''), report_notes), status = 'Report ready', report_ready_at = ?
       WHERE order_id = ?`,
    )
    .run(pdf, pdf.length, meta?.filename ?? '', now, meta?.notes ?? '', now, orderId)
  addOrderEvent(orderId, 'report', `Report uploaded${meta?.filename ? ` (${meta.filename})` : ''} · ${(pdf.length / 1024).toFixed(0)} KB`)
  return getOrder(orderId)
}

export function removeReportPdf(orderId: string) {
  getDb().prepare("UPDATE appointments SET report_pdf = NULL, report_size = 0, report_filename = '', report_uploaded_at = NULL, report_ready_at = NULL, status = 'Sample collected' WHERE order_id = ?").run(orderId)
  addOrderEvent(orderId, 'report', 'Report removed')
  return getOrder(orderId)
}

export function setStaffNote(orderId: string, note: string) {
  getDb().prepare('UPDATE appointments SET staff_note = ? WHERE order_id = ?').run(note, orderId)
  addOrderEvent(orderId, 'note', note ? 'Internal note updated' : 'Internal note cleared')
  return getOrder(orderId)
}

export function setPayment(orderId: string, status: string, method = '') {
  getDb().prepare('UPDATE appointments SET payment_status = ?, payment_method = ? WHERE order_id = ?').run(status, method, orderId)
  addOrderEvent(orderId, 'payment', `Payment marked ${status}${method ? ` via ${method}` : ''}`)
  return getOrder(orderId)
}

export function setOrderStatus(orderId: string, status: string) {
  getDb().prepare('UPDATE appointments SET status = ? WHERE order_id = ?').run(status, orderId)
  addOrderEvent(orderId, 'status', `Status changed to ${status}`)
  return getOrder(orderId)
}

export function cancelOrder(orderId: string, reason: string) {
  getDb().prepare("UPDATE appointments SET status = 'Cancelled', cancelled_at = ? WHERE order_id = ?").run(Date.now(), orderId)
  addOrderEvent(orderId, 'status', `Order cancelled${reason ? `: ${reason}` : ''}`)
  return getOrder(orderId)
}

export function getReportPdf(orderId: string): { pdf: Buffer; order: OrderRow } | null {
  const row = getDb().prepare('SELECT report_pdf FROM appointments WHERE order_id = ?').get(orderId) as { report_pdf: Buffer | null } | undefined
  if (!row?.report_pdf) return null
  const order = getOrder(orderId)
  return order ? { pdf: row.report_pdf, order } : null
}

export function markWhatsappSent(orderId: string) {
  getDb().prepare('UPDATE appointments SET whatsapp_sent_at = ? WHERE order_id = ?').run(Date.now(), orderId)
  addOrderEvent(orderId, 'whatsapp', 'Report link sent on WhatsApp')
}

export function advanceOrder(orderId: string) {
  const flow = ['Confirmed', 'Agent assigned', 'Sample collected', 'Report ready'] as const
  const order = getOrder(orderId)
  if (!order) return null
  const next = flow[(flow.indexOf(order.status as typeof flow[number]) + 1) % flow.length]
  getDb().prepare('UPDATE appointments SET status = ? WHERE order_id = ?').run(next, orderId)
  addOrderEvent(orderId, 'status', `Status changed to ${next}`)
  return getOrder(orderId)
}

/** Today's real numbers, computed from the database. */
export function getStats() {
  const db = getDb()
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const today = db
    .prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS revenue FROM appointments WHERE created_at >= ?`)
    .get(startOfDay) as { count: number; revenue: number }
  const totals = db
    .prepare(
         `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN status = 'Report ready' AND cancelled_at IS NULL THEN 1 ELSE 0 END), 0) AS ready,
           COALESCE(SUM(CASE WHEN cancelled_at IS NULL AND status IN ('Sample collected','Report ready') AND report_pdf IS NULL THEN 1 ELSE 0 END), 0) AS pending,
           COALESCE(SUM(CASE WHEN report_pdf IS NOT NULL THEN 1 ELSE 0 END), 0) AS withPdf,
           COALESCE(SUM(CASE WHEN cancelled_at IS NULL AND status IN ('Confirmed','Agent assigned') THEN 1 ELSE 0 END), 0) AS inCollection
         FROM appointments`,
      )
      .get() as { total: number; ready: number; pending: number; withPdf: number; inCollection: number }
  const week = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS day,
              COUNT(*) AS count, COALESCE(SUM(amount),0) AS revenue
       FROM appointments WHERE created_at >= ? GROUP BY day ORDER BY day ASC`,
    )
    .all(Date.now() - 6 * 86_400_000) as { day: string; count: number; revenue: number }[]

  const byDay = new Map(week.map((row) => [row.day, row]))
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfDay - (6 - index) * 86_400_000)
    const key = date.toLocaleDateString('en-CA')
    const row = byDay.get(key)
    return {
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: key,
      bookings: row?.count ?? 0,
      revenue: row?.revenue ?? 0,
    }
  })

  return {
    todayBookings: Number(today.count) || 0,
    todayRevenue: Number(today.revenue) || 0,
    totalOrders: totals.total,
    // Genuinely awaiting a report: sample collected but no PDF (cancelled excluded).
    reportsPending: Number(totals.pending) || 0,
    reportsReady: Number(totals.ready) || 0,
    inCollection: Number(totals.inCollection) || 0,
    analytics: days,
  }
}

/* ------------------------------------------------------------------ */
/*  Activity + chat                                                   */
/* ------------------------------------------------------------------ */

export function addActivity(kind: string, text: string) {
  const info = getDb().prepare('INSERT INTO activity (kind, text, at) VALUES (?, ?, ?)').run(kind, text, Date.now())
  return { id: Number(info.lastInsertRowid), kind, text, at: Date.now() }
}

export function listActivity(limit = 40) {
  return getDb().prepare('SELECT id, kind, text, at FROM activity ORDER BY at DESC LIMIT ?').all(limit) as { id: number; kind: string; text: string; at: number }[]
}

export function listMessages() {
  return getDb().prepare('SELECT * FROM messages ORDER BY at ASC LIMIT 200').all()
}

export function addMessage(input: { author: string; role: 'patient' | 'staff'; text: string }) {
  const message = { id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...input, at: Date.now() }
  getDb().prepare('INSERT INTO messages (id, author, role, text, at) VALUES (@id, @author, @role, @text, @at)').run(message)
  return message
}

/** Stable signature for a WhatsApp deep link (no provider required). */
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.length > 10 ? digits : `91${digits}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

/* ------------------------------------------------------------------ */
/*  Operations helpers (new admin features)                           */
/* ------------------------------------------------------------------ */

/**
 * Patients directory, grouped by phone number — the key that identifies a
 * person across orders. One row per patient with visit history.
 */
export function listPatients() {
  const rows = getDb()
    .prepare(
      `SELECT phone,
              MAX(patient_name) AS name,
              COUNT(*) AS orders,
              COALESCE(SUM(amount), 0) AS spent,
              MAX(created_at) AS lastVisit,
              SUM(CASE WHEN report_pdf IS NOT NULL THEN 1 ELSE 0 END) AS reports
       FROM appointments
       WHERE phone != '' AND status != 'Cancelled'
       GROUP BY phone
       ORDER BY lastVisit DESC
       LIMIT 500`,
    )
    .all() as { phone: string; name: string; orders: number; spent: number; lastVisit: number; reports: number }[]
  return rows
}

export function listPatientOrders(phone: string) {
  return getDb().prepare('SELECT * FROM appointments WHERE phone = ? ORDER BY created_at DESC').all(phone) as OrderRow[]
}

export interface PendingWork {
  sampleCollection: number
  awaitingUpload: number
  readyToSend: number
  unpaid: number
  total: number
}

/**
 * The "what needs attention now" summary shown at the top of the console.
 * `readyToSend` = report uploaded but WhatsApp not yet sent.
 */
export function getPendingWork(): PendingWork {
  const row = getDb()
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('Confirmed','Agent assigned') AND cancelled_at IS NULL THEN 1 ELSE 0 END), 0) AS sampleCollection,
         COALESCE(SUM(CASE WHEN status = 'Sample collected' AND report_pdf IS NULL AND cancelled_at IS NULL THEN 1 ELSE 0 END), 0) AS awaitingUpload,
         COALESCE(SUM(CASE WHEN report_pdf IS NOT NULL AND whatsapp_sent_at IS NULL AND cancelled_at IS NULL THEN 1 ELSE 0 END), 0) AS readyToSend,
         COALESCE(SUM(CASE WHEN payment_status = 'Pending' AND cancelled_at IS NULL THEN 1 ELSE 0 END), 0) AS unpaid,
         COUNT(*) AS total
       FROM appointments`,
    )
    .get() as PendingWork
  return {
    sampleCollection: Number(row.sampleCollection) || 0,
    awaitingUpload: Number(row.awaitingUpload) || 0,
    readyToSend: Number(row.readyToSend) || 0,
    unpaid: Number(row.unpaid) || 0,
    total: Number(row.total) || 0,
  }
}

/** Test performance: which investigations are actually being booked. */
export function getTopTests(limit = 8) {
  return getDb()
    .prepare(
      `SELECT test_name AS name, COUNT(*) AS orders, COALESCE(SUM(amount),0) AS revenue
       FROM appointments WHERE status != 'Cancelled'
       GROUP BY test_name ORDER BY orders DESC, revenue DESC LIMIT ?`,
    )
    .all(limit) as { name: string; orders: number; revenue: number }[]
}

/** Full audit trail across every order, newest first. */
export function listRecentEvents(limit = 100) {
  return getDb()
    .prepare(
      `SELECT e.*, a.patient_name FROM order_events e
       LEFT JOIN appointments a ON a.order_id = e.order_id
       ORDER BY e.at DESC LIMIT ?`,
    )
    .all(limit) as (OrderEvent & { patient_name: string | null })[]
}

/** Orders whose pincode falls outside the serviced (500xxx) range. */
export function listOutOfAreaOrders() {
  return getDb()
    .prepare(
      `SELECT order_id, patient_name, pincode FROM appointments
       WHERE pincode != '' AND substr(pincode, 1, 3) != '500' AND status != 'Cancelled'
       ORDER BY created_at DESC LIMIT 50`,
    )
    .all() as { order_id: string; patient_name: string; pincode: string }[]
}
/* ------------------------------------------------------------------ */
/*  Notifications                                                     */
/* ------------------------------------------------------------------ */

export interface NotificationRow {
  id: number
  kind: string
  title: string
  body: string
  order_id: string | null
  href_tab: string
  channel: string
  delivery: string
  read_at: number | null
  created_at: number
}

export interface NotificationView extends Omit<NotificationRow, 'delivery'> {
  delivery: Record<string, { ok: boolean; detail: string; link?: string }>
}

function toNotificationView(row: NotificationRow): NotificationView {
  let delivery: NotificationView['delivery'] = {}
  try {
    delivery = JSON.parse(row.delivery || '{}')
  } catch {
    delivery = {}
  }
  return { ...row, delivery }
}

export function createNotification(input: {
  kind: string
  title: string
  body?: string
  orderId?: string
  hrefTab?: string
  channel?: string
  delivery?: Record<string, { ok: boolean; detail: string; link?: string }>
}) {
  const info = getDb()
    .prepare(
      `INSERT INTO notifications (kind, title, body, order_id, href_tab, channel, delivery, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.kind,
      input.title,
      input.body ?? '',
      input.orderId ?? null,
      input.hrefTab ?? 'Orders',
      input.channel ?? '',
      JSON.stringify(input.delivery ?? {}),
      Date.now(),
    )
  return toNotificationView(getDb().prepare('SELECT * FROM notifications WHERE id = ?').get(Number(info.lastInsertRowid)) as NotificationRow)
}

export function listNotifications(limit = 50): NotificationView[] {
  const rows = getDb().prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?').all(limit) as NotificationRow[]
  return rows.map(toNotificationView)
}

export function unreadNotificationCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM notifications WHERE read_at IS NULL').get() as { count: number }
  return Number(row.count) || 0
}

export function markNotificationRead(id: number) {
  getDb().prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND read_at IS NULL').run(Date.now(), id)
}

export function markAllNotificationsRead() {
  getDb().prepare('UPDATE notifications SET read_at = ? WHERE read_at IS NULL').run(Date.now())
}

/** Drops the oldest rows so the table cannot grow without bound. */
export function pruneNotifications(keep = 500) {
  getDb().prepare('DELETE FROM notifications WHERE id NOT IN (SELECT id FROM notifications ORDER BY created_at DESC LIMIT ?)').run(keep)
}
