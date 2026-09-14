/**
 * Cài đặt and Gói dịch vụ, faked in the browser.
 *
 * - **Who you are comes from the mock session** (`fonnus.session`): the method you
 *   signed in with decides whether there is an email, a Google link, a password.
 *   Edits live beside it in `fonnus.account.v1`, and a new name or login number is
 *   written back into the session, so a reload greets the owner the same way.
 * - **Minutes are drawn from the calendar**, not stored: a cycle renewing on the
 *   22nd, a clinic's week (quiet Sunday, busy Friday), today counted up to the
 *   current hour. A reload does not reshuffle the month. `VITE_MOCK_USAGE=near` or
 *   `over` runs a busier clinic so the two warning states can be looked at. These
 *   minutes do not reconcile with the calls mock yet (Q26).
 * - **The export is ready six seconds after it is asked for**; the file is this
 *   record as JSON.
 * - **Deletion is scheduled, never done**: nothing is removed, the page shows the date.
 */
import { isValidEmail, normalizePhone } from '../auth/phone'
import type {
  AccountApi,
  AccountOverview,
  AccountProfile,
  AccountSession,
  BillingPeriod,
  DataExport,
  Invoice,
  InvoiceProfile,
  Me,
  PayMethod,
  Plan,
  PlanId,
  PlanQuote,
  Subscription,
  UsageCycle,
} from './contracts'
import { MOCK_USAGE } from './env'
import { ApiError } from './errors'
import type { ApiErrorKind } from './errors'
import { DEMO_ACCOUNT, GOOGLE_ACCOUNTS, REGISTERED_PHONES, delay, maybeFail, storage } from './mock-support'
import { readMockConfig } from './tenant.mock'

const KEY = 'fonnus.account.v1'
const SESSION_KEY = 'fonnus.session'
const NUMBERS_KEY = 'fonnus.numbers.v1'
const RENEW_DAY = 22
/** The deletion window, decided 14 Sept 2026 — inside Decree 356/2025's 20 days. */
const GRACE_DAYS = 14
const EXPORT_MS = 6_000
const NUMBER_FEE = 400_000

/** src/data/pricing.ts, as figures. Names and blurbs are the app's copy. */
export const MOCK_PLANS: Plan[] = [
  { id: 'basic', price_monthly_vnd: 2_500_000, price_annual_per_month_vnd: 2_125_000, price_annual_vnd: 25_500_000, minutes: 1_000, overage_vnd_per_minute: 3_000, numbers: 2, concurrent_calls: 2, own_voice: false, account_manager: false },
  { id: 'standard', price_monthly_vnd: 4_900_000, price_annual_per_month_vnd: 4_165_000, price_annual_vnd: 49_980_000, minutes: 2_500, overage_vnd_per_minute: 2_500, numbers: 5, concurrent_calls: 10, own_voice: true, account_manager: false },
  { id: 'advanced', price_monthly_vnd: 9_900_000, price_annual_per_month_vnd: 8_415_000, price_annual_vnd: 100_980_000, minutes: 6_000, overage_vnd_per_minute: 2_200, numbers: 10, concurrent_calls: 25, own_voice: true, account_manager: true },
]
const ORDER: PlanId[] = ['basic', 'standard', 'advanced']
const planOf = (id: PlanId): Plan => MOCK_PLANS.find((p) => p.id === id) ?? MOCK_PLANS[1]
/** What the sidebar prints under the owner's name. `Me.plan` is display text in the mock. */
const PLAN_TEXT: Record<PlanId, string> = { basic: 'Gói Cơ bản', standard: 'Gói Tiêu chuẩn', advanced: 'Gói Nâng cao' }

interface Saved {
  profile: Partial<AccountProfile>
  password_changed_at: string | null
  plan_id: PlanId
  period: BillingPeriod
  scheduled: Subscription['scheduled']
  /** After a monthly move up: a move down starts no earlier than the day after this (D3). */
  held_until: string | null
  pay_method: PayMethod
  /** Absent until the owner edits it; the default is built from the clinic record. */
  invoice_profile?: InvoiceProfile | null
  revoked: string[]
  export_started_at: string | null
  deletion: { scheduled_for: string } | null
}

const fail = (kind: ApiErrorKind, status: number, code: string) => new ApiError({ kind, status, code })

/* ------------------------------------------------------------------ storage */

function readMe(): Me | null {
  const raw = storage.read(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Me
  } catch {
    return null
  }
}

function writeMe(patch: Partial<Me>): void {
  const me = readMe()
  if (me) storage.write(SESSION_KEY, JSON.stringify({ ...me, ...patch }))
}

function read(): Saved {
  const base: Saved = {
    profile: {},
    password_changed_at: '2026-06-12T03:00:00.000Z',
    plan_id: 'standard',
    period: 'monthly',
    scheduled: null,
    held_until: null,
    pay_method: 'vietqr',
    revoked: [],
    export_started_at: null,
    deletion: null,
  }
  const raw = storage.read(KEY)
  if (!raw) return base
  try {
    return { ...base, ...(JSON.parse(raw) as Partial<Saved>) }
  } catch {
    return base
  }
}

function save(s: Saved): Saved {
  storage.write(KEY, JSON.stringify(s))
  return s
}

const methodOf = () => readMe()?.method ?? 'phone'

/** The numbers the Số điện thoại mock says the clinic owns. */
function ownedNumbers(): { number: string; bought_at: string }[] {
  const raw = storage.read(NUMBERS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { owned?: { number: string; bought_at: string }[] }
    return parsed.owned ?? []
  } catch {
    return []
  }
}

/* -------------------------------------------------------------------- dates */

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayCount = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)

function cycleOf(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < RENEW_DAY ? 1 : 0), RENEW_DAY)
  const next = new Date(start.getFullYear(), start.getMonth() + 1, RENEW_DAY)
  return { start, next, end: addDays(next, -1), days: dayCount(start, next) }
}

const fromYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The last day of the next full cycle — how long a plan moved up today is held (D3). */
function holdEndFor(now: Date): string {
  const { next } = cycleOf(now)
  return ymd(addDays(new Date(next.getFullYear(), next.getMonth() + 1, RENEW_DAY), -1))
}

/** The hold still running, if any. */
function activeHold(s: Saved, now: Date): string | null {
  return s.held_until && s.held_until >= ymd(now) ? s.held_until : null
}

/* -------------------------------------------------------------------- usage */

/** FNV-1a into [0, 1). Deterministic per key. */
function noise(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

/** A clinic's week, Sunday first: quiet Sunday, half a Saturday, Friday busiest. */
const WEEK = [0.3, 1.15, 1, 1.05, 1.1, 1.2, 0.75]
const PACE: Record<typeof MOCK_USAGE, number> = { normal: 74, near: 108, over: 122 }

function usageOf(now: Date): UsageCycle {
  const { start, end, days } = cycleOf(now)
  const today = startOfDay(now).getTime()
  // The clinic's day runs 07:00–20:00; today counts the part of it that has passed.
  const share = Math.min(1, Math.max(0, (now.getHours() + now.getMinutes() / 60 - 7) / 13))
  const by_day: number[] = []
  for (let d = start; d.getTime() <= today; d = addDays(d, 1)) {
    const full = PACE[MOCK_USAGE] * WEEK[d.getDay()] * (0.85 + noise(ymd(d)) * 0.3)
    by_day.push(Math.round(d.getTime() === today ? full * share : full))
  }
  const used = by_day.reduce((a, b) => a + b, 0)
  const elapsed = by_day.length - 1 + share
  const projected = elapsed >= 3 ? Math.round(((used / elapsed) * days) / 10) * 10 : null
  return { start: ymd(start), end: ymd(end), minutes_used: used, by_day, projected_minutes: projected }
}

/* ------------------------------------------------------------------ record */

function profileOf(s: Saved): AccountProfile {
  const me = readMe()
  const method = me?.method ?? 'phone'
  const identity = me?.identity ?? DEMO_ACCOUNT.phone
  const base: AccountProfile = {
    display_name: me?.display_name ?? DEMO_ACCOUNT.displayName,
    phone: method === 'phone' ? normalizePhone(identity) : DEMO_ACCOUNT.phone,
    email: method === 'phone' ? null : identity,
    email_verified: method !== 'phone',
    google_email: method === 'google' ? identity : null,
  }
  return { ...base, ...s.profile }
}

function invoiceProfileOf(s: Saved): InvoiceProfile | null {
  if (s.invoice_profile !== undefined) return s.invoice_profile
  const name = readMockConfig().business_name.trim()
  return name ? { legal_name: `Công ty TNHH ${name}`, tax_code: '0312345678', address: '', email: 'ketoan@vietsmile.vn' } : null
}

/** Who the Số điện thoại checkout invoices, so the two tabs never disagree. */
export function readMockInvoiceProfile(): InvoiceProfile | null {
  return invoiceProfileOf(read())
}

function thisDevice(): Pick<AccountSession, 'device' | 'browser' | 'os'> {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : 'Linux'
  const browser = /Edg\//.test(ua) ? 'Edge' : /coc_coc|CocCoc/i.test(ua) ? 'Cốc Cốc' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt'
  const device = /iPad|Tablet/.test(ua) ? 'tablet' : /Mobi|iPhone|Android/.test(ua) ? 'phone' : 'desktop'
  return { device, browser, os }
}

const OTHER_SESSIONS = ['ses_iphone', 'ses_android', 'ses_edge']

function sessionsOf(s: Saved, now: Date): AccountSession[] {
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString()
  const all: AccountSession[] = [
    { id: 'ses_this', ...thisDevice(), city: 'Hà Nội', last_active_at: now.toISOString(), current: true },
    { id: 'ses_iphone', device: 'phone', browser: 'Safari', os: 'iOS', city: 'Hà Nội', last_active_at: ago(125), current: false },
    { id: 'ses_android', device: 'phone', browser: 'Chrome', os: 'Android', city: 'TP. Hồ Chí Minh', last_active_at: ago(26 * 60), current: false },
    { id: 'ses_edge', device: 'desktop', browser: 'Edge', os: 'Windows', city: 'Hà Nội', last_active_at: ago(5 * 24 * 60), current: false },
  ]
  return all.filter((x) => x.current || !s.revoked.includes(x.id))
}

function textFile(lines: string[]): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`
}

function invoicesOf(s: Saved, now: Date): Invoice[] {
  const { start } = cycleOf(now)
  const buyer = invoiceProfileOf(s)
  const list: Invoice[] = []
  for (let i = 0; i < 3; i++) {
    const st = new Date(start.getFullYear(), start.getMonth() - i, RENEW_DAY)
    const en = addDays(new Date(st.getFullYear(), st.getMonth() + 1, RENEW_DAY), -1)
    const plan = planOf(i === 2 ? 'basic' : 'standard')
    const over = i === 2 ? 120 : 0
    const amount = plan.price_monthly_vnd + over * plan.overage_vnd_per_minute
    list.push({
      id: `inv_${ymd(st)}`,
      issued_on: ymd(st),
      kind: 'plan',
      plan_id: plan.id,
      number: null,
      period: { start: ymd(st), end: ymd(en) },
      overage_minutes: over,
      amount_vnd: amount,
      pdf_url: textFile([`Hoá đơn ${ymd(st)}`, PLAN_TEXT[plan.id], `${amount} đ`, buyer?.legal_name ?? '']),
    })
  }
  for (const n of ownedNumbers()) {
    list.push({
      id: `inv_num_${n.number}`,
      issued_on: n.bought_at.slice(0, 10),
      kind: 'number',
      plan_id: null,
      number: n.number,
      period: null,
      overage_minutes: 0,
      amount_vnd: NUMBER_FEE,
      pdf_url: textFile([`Hoá đơn ${n.bought_at.slice(0, 10)}`, n.number, `${NUMBER_FEE} đ`, buyer?.legal_name ?? '']),
    })
  }
  return list.sort((a, b) => b.issued_on.localeCompare(a.issued_on))
}

function subscriptionOf(s: Saved, now: Date): Subscription {
  const { next } = cycleOf(now)
  const cur = planOf(s.plan_id)
  // renews_on bills the booked plan only if it starts then; a move down held by D3 starts later.
  const booked = s.scheduled ? { ...s.scheduled, starts_on: s.scheduled.starts_on ?? ymd(next) } : null
  const startsThen = booked != null && booked.starts_on === ymd(next)
  const nextPlan = booked && startsThen ? planOf(booked.plan_id) : cur
  const nextPeriod = booked && startsThen ? booked.period : s.period
  const usage = usageOf(now)
  // This cycle's minutes over the plan's allowance are billed with the next charge. Nothing rolls over.
  const overage = Math.max(0, usage.minutes_used - cur.minutes) * cur.overage_vnd_per_minute
  return {
    plan_id: s.plan_id,
    period: s.period,
    renews_on: ymd(next),
    next_charge_vnd: (nextPeriod === 'annual' ? nextPlan.price_annual_vnd : nextPlan.price_monthly_vnd) + overage,
    scheduled: booked,
    held_until: activeHold(s, now),
    numbers_used: ownedNumbers().length,
  }
}

function exportOf(s: Saved, now: Date): DataExport {
  if (!s.export_started_at) return { status: 'none', ready_at: null, expires_at: null, download_url: null }
  const readyAt = Date.parse(s.export_started_at) + EXPORT_MS
  if (now.getTime() < readyAt) return { status: 'preparing', ready_at: null, expires_at: null, download_url: null }
  const dump = { profile: profileOf(s), clinic: readMockConfig(), subscription: subscriptionOf(s, now) }
  return {
    status: 'ready',
    ready_at: new Date(readyAt).toISOString(),
    expires_at: new Date(readyAt + 7 * 86_400_000).toISOString(),
    download_url: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dump, null, 2))}`,
  }
}

function overviewOf(s: Saved, now = new Date()): AccountOverview {
  const method = methodOf()
  return {
    profile: profileOf(s),
    method,
    password_changed_at: method === 'email' ? s.password_changed_at : null,
    subscription: subscriptionOf(s, now),
    usage: usageOf(now),
    pay_method: s.pay_method,
    invoice_profile: invoiceProfileOf(s),
    invoices: invoicesOf(s, now),
    sessions: sessionsOf(s, now),
    export: exportOf(s, now),
    deletion: s.deletion,
    deletion_grace_days: GRACE_DAYS,
  }
}

function quoteOf(s: Saved, input: { plan_id: PlanId; period: BillingPeriod }, now: Date): PlanQuote {
  if (input.plan_id === s.plan_id && input.period === s.period) throw fail('conflict', 409, 'plan_unchanged')
  const cur = planOf(s.plan_id)
  const tgt = planOf(input.plan_id)
  const { next, days } = cycleOf(now)
  // docs/account-billing-decisions.md D1–D4: only a monthly move up starts today, charged the
  // price difference for the days left (today counted) rounded to 1.000đ, with the new plan's
  // full minutes at once — and the plan is then held to the end of the next full cycle. Anything
  // else waits for the renewal, with no refund; a move down also waits for a running hold.
  const now_ = ORDER.indexOf(input.plan_id) > ORDER.indexOf(s.plan_id) && input.period === 'monthly' && s.period === 'monthly'
  const down = ORDER.indexOf(input.plan_id) < ORDER.indexOf(s.plan_id)
  const hold = activeHold(s, now)
  const starts = now_ ? now : down && hold && hold >= ymd(next) ? addDays(fromYmd(hold), 1) : next
  const left = dayCount(now, next)
  return {
    plan_id: input.plan_id,
    period: input.period,
    applies: now_ ? 'now' : 'renewal',
    effective_on: ymd(starts),
    charge_today_vnd: now_ ? Math.round(((tgt.price_monthly_vnd - cur.price_monthly_vnd) * left) / days / 1000) * 1000 : 0,
    next_charge_vnd: input.period === 'annual' ? tgt.price_annual_vnd : tgt.price_monthly_vnd,
    held_until: now_ ? holdEndFor(now) : null,
  }
}

const norm = (v: string) => v.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')

/* --------------------------------------------------------------------- api */

export const accountMock: AccountApi = {
  async overview(opts) {
    await delay(1, opts?.signal)
    maybeFail()
    return overviewOf(read())
  },

  async plans(opts) {
    await delay(0.4, opts?.signal)
    maybeFail()
    return MOCK_PLANS
  },

  async updateProfile(patch, opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    const s = read()
    const next: Partial<AccountProfile> = { ...s.profile }
    if (patch.display_name !== undefined) {
      const name = patch.display_name.trim()
      if (!name) throw fail('validation', 422, 'name_required')
      next.display_name = name
      writeMe({ display_name: name })
    }
    if (patch.email !== undefined) {
      if (methodOf() === 'google') throw fail('forbidden', 403, 'email_from_google')
      const email = patch.email.trim()
      if (!isValidEmail(email)) throw fail('validation', 422, 'invalid_email')
      next.email = email
      next.email_verified = false
    }
    return profileOf(save({ ...s, profile: next }))
  },

  async requestPhoneChange(phone, opts) {
    await delay(1.2, opts?.signal)
    maybeFail('ratelimited', 'otp_rate_limited')
    const digits = normalizePhone(phone)
    if (!/^0\d{9}$/.test(digits)) throw fail('validation', 422, 'invalid_phone')
    if (digits === profileOf(read()).phone) throw fail('conflict', 409, 'phone_unchanged')
    if (REGISTERED_PHONES.has(digits)) throw fail('conflict', 409, 'phone_in_use')
  },

  async confirmPhoneChange({ phone, code }, opts) {
    await delay(1.4, opts?.signal)
    maybeFail()
    if (code !== DEMO_ACCOUNT.code) throw fail('validation', 422, 'otp_invalid')
    const digits = normalizePhone(phone)
    const s = read()
    const saved = save({ ...s, profile: { ...s.profile, phone: digits } })
    if (methodOf() === 'phone') writeMe({ identity: digits })
    return profileOf(saved)
  },

  async linkGoogle(opts) {
    await delay(1, opts?.signal)
    maybeFail()
    const s = read()
    const saved = save({ ...s, profile: { ...s.profile, google_email: GOOGLE_ACCOUNTS[0].email } })
    return { redirect_url: null, profile: profileOf(saved) }
  },

  async unlinkGoogle(opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    if (methodOf() === 'google') throw fail('conflict', 409, 'google_only_method')
    const s = read()
    return profileOf(save({ ...s, profile: { ...s.profile, google_email: null } }))
  },

  async setPayMethod(method, opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    save({ ...read(), pay_method: method })
  },

  async setInvoiceProfile(profile, opts) {
    await delay(0.9, opts?.signal)
    maybeFail()
    const tax = profile.tax_code.replace(/\D/g, '')
    if (!profile.legal_name.trim()) throw fail('validation', 422, 'legal_name_required')
    if (tax.length !== 10 && tax.length !== 13) throw fail('validation', 422, 'invalid_tax_code')
    if (profile.email.trim() && !isValidEmail(profile.email)) throw fail('validation', 422, 'invalid_email')
    const clean: InvoiceProfile = { legal_name: profile.legal_name.trim(), tax_code: tax, address: profile.address.trim(), email: profile.email.trim() }
    save({ ...read(), invoice_profile: clean })
    return clean
  },

  async changePassword({ current, next }, opts) {
    await delay(1.2, opts?.signal)
    maybeFail()
    if (methodOf() !== 'email') throw fail('forbidden', 403, 'no_password')
    if (!current) throw fail('validation', 422, 'password_wrong')
    if (next.length < 8) throw fail('validation', 422, 'weak_password')
    const s = read()
    // A new password signs every other device out.
    save({ ...s, password_changed_at: new Date().toISOString(), revoked: [...new Set([...s.revoked, ...OTHER_SESSIONS])] })
  },

  async signOutSession(id, opts) {
    await delay(0.7, opts?.signal)
    maybeFail()
    if (id === 'ses_this') throw fail('conflict', 409, 'session_current')
    const s = read()
    save({ ...s, revoked: [...new Set([...s.revoked, id])] })
  },

  async signOutOthers(opts) {
    await delay(0.9, opts?.signal)
    maybeFail()
    const s = read()
    save({ ...s, revoked: [...new Set([...s.revoked, ...OTHER_SESSIONS])] })
  },

  async startExport(opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    const s = read()
    const now = new Date()
    if (exportOf(s, now).status === 'preparing') return exportOf(s, now)
    return exportOf(save({ ...s, export_started_at: now.toISOString() }), now)
  },

  async exportStatus(opts) {
    await delay(0.3, opts?.signal)
    return exportOf(read(), new Date())
  },

  async scheduleDeletion(confirmName, opts) {
    await delay(1.2, opts?.signal)
    maybeFail()
    if (norm(confirmName) !== norm(readMockConfig().business_name)) throw fail('validation', 422, 'confirm_mismatch')
    const scheduled_for = ymd(addDays(new Date(), GRACE_DAYS))
    save({ ...read(), deletion: { scheduled_for } })
    return { scheduled_for }
  },

  async cancelDeletion(opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    save({ ...read(), deletion: null })
  },

  async quotePlan(input, opts) {
    await delay(0.6, opts?.signal)
    maybeFail()
    return quoteOf(read(), input, new Date())
  },

  async changePlan(input, opts) {
    await delay(1.4, opts?.signal)
    maybeFail()
    const s = read()
    const now = new Date()
    const q = quoteOf(s, input, now)
    const next: Saved =
      q.applies === 'now'
        ? { ...s, plan_id: input.plan_id, period: input.period, scheduled: null, held_until: q.held_until }
        : { ...s, scheduled: { plan_id: input.plan_id, period: input.period, starts_on: q.effective_on } }
    save(next)
    if (q.applies === 'now') writeMe({ plan: PLAN_TEXT[input.plan_id] })
    return subscriptionOf(next, now)
  },

  async cancelScheduledChange(opts) {
    await delay(0.7, opts?.signal)
    maybeFail()
    return subscriptionOf(save({ ...read(), scheduled: null }), new Date())
  },
}
