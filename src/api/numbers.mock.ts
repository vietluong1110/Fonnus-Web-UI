/**
 * The Số điện thoại tab, faked in the browser.
 *
 * - **The pool is the same pool on every load.** 146 numbers under 024 730x,
 *   the lucky ones first, drawn from fixed keys — a reload does not reshuffle
 *   the kho. Two are always held by "another clinic", so the hatched tile is
 *   reachable.
 * - **What the clinic owns survives a reload**, in localStorage beside the
 *   tenant record, and every change writes `assigned_phone` into that record the
 *   way the server will derive it — so the Lễ tân header follows a purchase.
 * - **Payment confirms itself**: 30 seconds after a QR checkout (long enough to
 *   see the payment clock run), five after card or MoMo. There is no bank behind
 *   it. A checkout left past its five-minute window expires. Activation takes
 *   five seconds more.
 *
 * The mock sees one receptionist — the tenant record's `agent_name` — because
 * the record describes one. The page is drawn for several (Q25).
 */
import type {
  Checkout,
  NumberHold,
  NumberPattern,
  NumbersApi,
  OwnedNumber,
  PoolNumber,
  InvoiceProfile,
} from './contracts'
import { readMockInvoiceProfile } from './account.mock'
import { ApiError } from './errors'

/** The checkout invoices whoever Cài đặt says the invoice is made out to — one record, two tabs. */
const invoiceOf = (p: InvoiceProfile | null) => (p ? { legal_name: p.legal_name, tax_code: p.tax_code } : null)
import { delay, maybeFail, storage } from './mock-support'
import { readMockConfig, writeMockConfig } from './tenant.mock'

const KEY = 'fonnus.numbers.v1'
const PRICE = 400_000
const AREA = { code: '024', city: 'Hà Nội' }
const HOLD_MS = 15 * 60_000
const PAY_WINDOW_MS = 5 * 60_000
const payAfter = (method: Checkout['method']) => (method === 'vietqr' ? 30_000 : 5_000)
const ACTIVATE_MS = 5_000
const PAGE = 9
const MAIN = 'main'

interface Saved {
  owned: OwnedNumber[]
  /** Numbers given back that the generated pool does not already hold. */
  returned: string[]
}

/* ---------------------------------------------------------------- the pool */

/** FNV-1a into [0, 1). Deterministic per key. */
function noise(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

/** The shape a number's last four digits make. */
export function patternOf(num: string): { pattern: NumberPattern | null; digits: number } {
  const t = num.slice(-4)
  const [a, b, c, d] = t
  if (a === b && b === c && c === d) return { pattern: 'tu_quy', digits: 4 }
  if ([...t].every((ch, i) => i === 0 || Number(ch) === Number(t[i - 1]) + 1)) return { pattern: 'sanh_tien', digits: 4 }
  const pair = t.slice(2)
  const twice = a === c && b === d
  if (pair === '39' || pair === '79') return { pattern: 'than_tai', digits: twice ? 4 : 2 }
  if (pair === '68' || pair === '86') return { pattern: 'loc_phat', digits: twice ? 4 : 2 }
  if (twice || (a === d && b === c)) return { pattern: 'de_nho', digits: 4 }
  return { pattern: null, digits: 0 }
}

/** One of each kind first, plain numbers woven in — what "Tất cả" opens on. */
const CURATED = [
  '02473066868', '02473077979', '02473069999', '02473081234', '02473072727', '02473088686',
  '02473069488', '02473063939', '02473069788', '02473095868', '02473083333', '02473063456',
  '02473060606', '02473061520', '02473085179', '02473062886', '02473065678', '02473061111',
  '02473090909', '02473070352', '02473098839',
]
const HELD_ELSEWHERE = new Set(['02473088686', '02473065678'])
const POOL_SIZE = 146

const BASE: readonly string[] = (() => {
  const out = [...CURATED]
  const seen = new Set(out)
  for (let i = 0; out.length < POOL_SIZE; i++) {
    const block = 6 + Math.floor(noise(`block-${i}`) * 4)
    const tail = String(Math.floor(noise(`tail-${i}`) * 10_000)).padStart(4, '0')
    const num = `024730${block}${tail}`
    if (!seen.has(num)) {
      seen.add(num)
      out.push(num)
    }
  }
  return out
})()

/* ------------------------------------------------------------------- state */

function load(): Saved {
  const raw = storage.read(KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Saved
    } catch {
      /* fall through to the seed */
    }
  }
  // A clinic whose record already names a number owns that number.
  const assigned = readMockConfig().assigned_phone
  return {
    owned: assigned
      ? [{ id: `num-${assigned}`, number: assigned, receptionist_id: MAIN, status: 'live', bought_at: '2026-09-02T02:00:00.000Z', forwarding: null }]
      : [],
    returned: [],
  }
}

function save(s: Saved): void {
  storage.write(KEY, JSON.stringify(s))
  // `assigned_phone` is derived: the main receptionist's first number, or nothing.
  const main = s.owned.find((o) => o.receptionist_id === MAIN)
  const assigned = main ? main.number : ''
  if (readMockConfig().assigned_phone !== assigned) writeMockConfig({ assigned_phone: assigned })
}

/** Activation finishes on its own clock. */
function settled(): Saved {
  const s = load()
  const now = Date.now()
  let changed = false
  const owned = s.owned.map((o) => {
    if (o.status !== 'activating' || now - Date.parse(o.bought_at) < ACTIVATE_MS) return o
    changed = true
    return { ...o, status: 'live' as const }
  })
  const next = { ...s, owned }
  if (changed || !storage.read(KEY)) save(next)
  return next
}

function available(s: Saved): string[] {
  const mine = new Set(s.owned.map((o) => o.number))
  return [...s.returned.filter((n) => !BASE.includes(n)), ...BASE].filter((n) => !mine.has(n))
}

function toPool(num: string): PoolNumber {
  const p = patternOf(num)
  return { number: num, pattern: p.pattern, pattern_digits: p.digits, held: HELD_ELSEWHERE.has(num), area: AREA, price_vnd: PRICE }
}

let seq = 0
const holds = new Map<string, NumberHold>()
const checkouts = new Map<string, { co: Checkout; created: number; receptionist_id: string }>()

/** A mock code to scan. It scans to nothing; the live gateway returns a real image. */
function mockQr(seed: string): string {
  const n = 29
  const cells: string[] = []
  const finder = (r: number, c: number) => r < 8 && c < 8
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (finder(r, c) || finder(r, n - 1 - c) || finder(n - 1 - r, c)) continue
      if (noise(`${seed}-${r}-${c}`) > 0.5) cells.push(`M${c} ${r}h1v1h-1z`)
    }
  const eye = (x: number, y: number) =>
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.4" fill="none" stroke="black"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".7"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${cells.join('')}"/>${eye(0, 0)}${eye(n - 7, 0)}${eye(0, n - 7)}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function change(id: string, fn: (o: OwnedNumber) => OwnedNumber): OwnedNumber {
  const s = settled()
  const o = s.owned.find((x) => x.id === id)
  if (!o) throw new ApiError({ kind: 'notfound', status: 404, code: 'number_not_found' })
  const next = fn(o)
  save({ ...s, owned: s.owned.map((x) => (x.id === id ? next : x)) })
  return next
}

/* --------------------------------------------------------------------- api */

export const numbersMock: NumbersApi = {
  async overview(opts) {
    await delay(1, opts?.signal)
    maybeFail()
    const s = settled()
    const cfg = readMockConfig()
    return {
      numbers: s.owned,
      receptionists: [{ id: MAIN, name: cfg.agent_name.trim() || 'Linh', branch: null }],
      invoice: invoiceOf(readMockInvoiceProfile()),
    }
  },

  async pool(query, opts) {
    await delay(0.6, opts?.signal)
    maybeFail()
    const all = available(settled())
    const q = (query.q ?? '').replace(/\D/g, '')
    const matching = q
      ? [...all.filter((n) => n.endsWith(q)), ...all.filter((n) => !n.endsWith(q) && n.indexOf(q, 3) >= 0)]
      : all
    const counts = { all: matching.length, loc_phat: 0, than_tai: 0, tu_quy: 0, sanh_tien: 0, de_nho: 0 }
    for (const n of matching) {
      const p = patternOf(n).pattern
      if (p) counts[p] += 1
    }
    const list = query.pattern ? matching.filter((n) => patternOf(n).pattern === query.pattern) : matching
    const start = Math.max(0, Number.parseInt(query.cursor ?? '0', 10) || 0)
    const size = Math.min(24, Math.max(1, query.limit ?? PAGE))
    return {
      numbers: list.slice(start, start + size).map(toPool),
      next_cursor: start + size < list.length ? String(start + size) : null,
      counts,
    }
  },

  async hold(number, opts) {
    await delay(0.5, opts?.signal)
    maybeFail()
    if (HELD_ELSEWHERE.has(number) || !available(settled()).includes(number)) {
      throw new ApiError({ kind: 'conflict', status: 409, code: 'number_taken' })
    }
    const h: NumberHold = { id: `hold-${++seq}`, number, held_until: new Date(Date.now() + HOLD_MS).toISOString(), price_vnd: PRICE }
    holds.set(h.id, h)
    return h
  },

  async releaseHold(holdId, opts) {
    await delay(0.2, opts?.signal)
    holds.delete(holdId)
  },

  async checkout(holdId, input, opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    const h = holds.get(holdId)
    if (!h || Date.parse(h.held_until) < Date.now()) {
      throw new ApiError({ kind: 'conflict', status: 409, code: 'hold_expired' })
    }
    const id = `co-${++seq}`
    const co: Checkout = {
      id,
      hold_id: holdId,
      number: h.number,
      method: input.method,
      amount_vnd: PRICE,
      status: 'awaiting_payment',
      expires_at: new Date(Date.now() + PAY_WINDOW_MS).toISOString(),
      vietqr:
        input.method === 'vietqr'
          ? { image_url: mockQr(id), bank: 'Vietcombank', account_number: '1027889966', account_name: 'CONG TY CO PHAN FONNUS', memo: `FONNUS ${h.number.slice(-4)}` }
          : null,
      redirect_url: null,
      qr_image_url: input.method === 'momo' ? mockQr(`${id}-momo`) : null,
      owned: null,
    }
    checkouts.set(id, { co, created: Date.now(), receptionist_id: input.receptionist_id })
    return co
  },

  async checkoutStatus(id, opts) {
    await delay(0.3, opts?.signal)
    const rec = checkouts.get(id)
    if (!rec) throw new ApiError({ kind: 'notfound', status: 404, code: 'checkout_not_found' })
    // The window closing unpaid expires the checkout; the hold keeps its own clock.
    if (rec.co.status === 'awaiting_payment' && Date.now() >= Date.parse(rec.co.expires_at)) {
      rec.co = { ...rec.co, status: 'expired' }
    }
    if (rec.co.status === 'awaiting_payment' && Date.now() - rec.created >= payAfter(rec.co.method)) {
      const s = settled()
      const owned: OwnedNumber = {
        id: `num-${rec.co.number}`,
        number: rec.co.number,
        receptionist_id: rec.receptionist_id,
        status: 'activating',
        bought_at: new Date().toISOString(),
        forwarding: null,
      }
      save({ owned: [...s.owned.filter((o) => o.number !== owned.number), owned], returned: s.returned.filter((n) => n !== owned.number) })
      holds.delete(rec.co.hold_id)
      rec.co = { ...rec.co, status: 'paid', owned }
    }
    return rec.co
  },

  async assign(id, receptionistId, opts) {
    await delay(0.6, opts?.signal)
    maybeFail()
    return change(id, (o) => ({ ...o, receptionist_id: receptionistId }))
  },

  async setForwarding(id, forwarding, opts) {
    await delay(0.6, opts?.signal)
    maybeFail()
    return change(id, (o) => ({ ...o, forwarding }))
  },

  async release(id, opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    const s = settled()
    const o = s.owned.find((x) => x.id === id)
    if (!o) throw new ApiError({ kind: 'notfound', status: 404, code: 'number_not_found' })
    save({ owned: s.owned.filter((x) => x.id !== id), returned: [o.number, ...s.returned.filter((n) => n !== o.number)] })
  },
}
