/**
 * Appointments for the Lịch hẹn tab, faked in the browser.
 *
 * The same two rules as `insights.mock.ts`:
 *
 * 1. **The same day always gives the same appointments.** Everything is derived
 *    from the date through `noise()`, so a reload does not reshuffle the week.
 *    Nothing here calls `Math.random()`.
 * 2. **It is always now.** Days before the browser's clock have happened —
 *    most patients came, a few did not — and days after it are still held.
 *
 * And one of its own: **the attention list is never empty on a fresh load.**
 * Tomorrow's first patient has a number without Zalo, a request for an evening
 * slot waits a couple of days out, a Saturday is over the receptionist's daily
 * limit, and the next appointment today has a caller asking to move it. Those
 * are the three things she cannot close alone, and a demo that never shows them
 * cannot show what the strip is for.
 *
 * The mock cannot see the tenant record, so the services and doctors below are
 * the dental template's, hardcoded the way the insights mock hardcodes hours.
 * An action is kept in memory for the life of the tab.
 */
import type { Appointment, AppointmentAction, AppointmentsApi, AppointmentsWeek } from './contracts'
import { delay, maybeFail } from './mock-support'

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** FNV-1a into [0, 1). Deterministic per key. */
function noise(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

const SVC = {
  kham: { name: 'Khám tổng quát', from: 0, to: 0, dur: 30 },
  cao: { name: 'Cạo vôi răng', from: 300_000, to: 500_000, dur: 30 },
  tram: { name: 'Trám răng', from: 200_000, to: 500_000, dur: 45 },
  nho: { name: 'Nhổ răng khôn', from: 1_000_000, to: 3_000_000, dur: 60 },
  tay: { name: 'Tẩy trắng răng', from: 1_500_000, to: 2_500_000, dur: 60 },
  su: { name: 'Bọc răng sứ', from: 2_000_000, to: 8_000_000, dur: 90 },
  tre: { name: 'Khám răng trẻ em', from: 100_000, to: 300_000, dur: 30 },
  implant: { name: 'Cấy ghép implant', from: null, to: null, dur: 45 },
} as const
type SvcKey = keyof typeof SVC

const DOCTORS = [
  { id: 'doc-hung', name: 'BS Hùng' },
  { id: 'doc-thao', name: 'BS Thảo' },
  { id: 'doc-quan', name: 'BS Quân' },
]

/** A typical week by `Date.getDay()`: start, service, doctor index. Sunday is a half day. */
const WEEK: Record<number, [string, SvcKey, number][]> = {
  1: [['08:00', 'kham', 2], ['09:00', 'tram', 0], ['09:30', 'cao', 2], ['10:30', 'tay', 1], ['14:00', 'kham', 0], ['15:30', 'tre', 1], ['16:30', 'su', 0], ['17:30', 'tre', 1]],
  2: [['08:30', 'kham', 2], ['09:00', 'nho', 0], ['10:30', 'cao', 2], ['16:00', 'implant', 0], ['19:00', 'tram', 1]],
  3: [['08:00', 'su', 0], ['10:00', 'kham', 2], ['13:30', 'tram', 1], ['15:00', 'cao', 2], ['17:00', 'tay', 1]],
  4: [['09:00', 'tre', 1], ['15:00', 'cao', 0], ['15:00', 'tram', 2], ['17:30', 'kham', 2]],
  5: [['08:30', 'tay', 1], ['11:00', 'kham', 2], ['14:30', 'nho', 0], ['16:30', 'cao', 2], ['18:00', 'tram', 0]],
  6: [['08:00', 'tre', 1], ['09:00', 'tram', 0], ['09:00', 'cao', 2], ['10:00', 'su', 0], ['14:00', 'kham', 2]],
  0: [['09:00', 'kham', 2], ['10:00', 'cao', 2]],
}

const ADULTS = ['Chị Trang', 'Anh Tùng', 'Chị Mai', 'Ông Bảy', 'Chị Quyên', 'Anh Đức', 'Cô Hoa', 'Anh Khoa', 'Chị Thu', 'Anh Hải', 'Chị Vy', 'Bà Sáu', 'Anh Nam', 'Chị Diệp', 'Chị Phương', 'Anh Sơn', 'Anh Việt', 'Chị Kim', 'Anh Bình', 'Anh Phát', 'Chị Yến', 'Anh Lâm', 'Chị Ly', 'Chú Tám', 'Chị Nhung', 'Anh Lộc', 'Chị Ngân', 'Anh Toàn', 'Chị Hương', 'Anh Minh']
const CHILDREN = ['Bé Bảo An', 'Bé Tí', 'Bé Na', 'Bé Su', 'Bé Bin']
const PARENTS = ['Chị Hạnh', 'Chị Hằng', 'Chị Thủy', 'Anh Quang', 'Chị Duyên']

const NOTES: Record<SvcKey, string[]> = {
  kham: ['Đau nhức răng hàm mấy hôm nay, muốn khám tổng quát.', 'Ê buốt khi uống lạnh, muốn kiểm tra.'],
  cao: ['Cạo vôi định kỳ, lần trước cách đây khoảng sáu tháng.', 'Chảy máu chân răng khi đánh răng.'],
  tram: ['Răng hàm có lỗ sâu nhỏ, thỉnh thoảng ê khi ăn ngọt.', 'Mẻ góc răng cửa, muốn trám cùng màu răng.'],
  nho: ['Răng khôn hàm dưới mọc lệch, thỉnh thoảng sưng.', 'Răng khôn đau nhức, muốn khám rồi nhổ luôn nếu được.'],
  tay: ['Muốn tẩy trắng trước đám cưới cuối tháng.', 'Răng ố vàng do uống cà phê, hỏi tẩy trắng mấy lần.'],
  su: ['Hẹn tiếp theo của liệu trình bọc răng sứ.', 'Lần hẹn thứ hai: gắn mão sứ đã lấy dấu tuần trước.'],
  tre: ['Bé đi học về khoảng 17:00.', 'Kiểm tra răng sữa, bé hơi sợ khi khám.'],
  implant: ['Mất răng hàm đã lâu, muốn hỏi giá implant.', 'Chỉ rảnh sau giờ làm, muốn tư vấn cấy ghép.'],
}

const INSTRUCTIONS: Partial<Record<SvcKey, string>> = {
  cao: 'Anh chị nhớ đến sớm 10 phút nhé ạ.',
  nho: 'Anh chị nhớ ăn nhẹ trước khi đến nhé ạ.',
  tre: 'Anh chị cho bé đến sớm 10 phút nhé ạ.',
  implant: 'Anh chị mang phim X-quang cũ nếu có nhé ạ.',
}

function make(day: Date, index: number, time: string, key: SvcKey, doctor: number, now: Date): Appointment {
  const id = `apt-${iso(day)}-${index}`
  const r = (salt: string) => noise(id + salt)
  const pick = <T,>(list: readonly T[], salt: string) => list[Math.floor(r(salt) * list.length)]
  const svc = SVC[key]
  const [h, m] = time.split(':').map(Number)
  const start = new Date(day)
  start.setHours(h, m, 0, 0)
  const end = start.getTime() + svc.dur * 60_000

  const past = end <= now.getTime()
  const roll = r('status')
  const status: Appointment['status'] = past ? (roll < 0.07 ? 'no_show' : roll < 0.11 ? 'cancelled' : 'arrived') : roll < 0.04 ? 'cancelled' : 'held'

  // She took the call one to three days before, and never after now.
  const callDay = startOfDay(addDays(day, -(1 + Math.floor(r('back') * 3))))
  let callAt = callDay.getTime() + (8 * 60 + Math.floor(r('at') * 720)) * 60_000
  callAt = Math.min(callAt, now.getTime() - (20 + Math.floor(r('late') * 600)) * 60_000, start.getTime() - 3_600_000)
  const channel = r('channel') < 0.25 ? 'sms' : 'zalo'

  const child = key === 'tre'
  return {
    id,
    starts_at: start.toISOString(),
    duration_min: svc.dur,
    status,
    pending_reason: null,
    change_request: null,
    service_name: svc.name,
    price_from: svc.from,
    price_to: svc.to,
    practitioner: DOCTORS[doctor],
    patient_name: child ? pick(CHILDREN, 'child') : pick(ADULTS, 'name'),
    booked_by: child ? pick(PARENTS, 'parent') : null,
    phone: `09${Math.floor(r('p1') * 10)}${Math.floor(r('p2') * 10)} ${String(Math.floor(r('p3') * 1000)).padStart(3, '0')} ${String(Math.floor(r('p4') * 1000)).padStart(3, '0')}`,
    prior_visits: Math.floor(r('visits') * 6),
    note: pick(NOTES[key], 'note'),
    instructions: INSTRUCTIONS[key] ?? null,
    call: { id: `call-${id}`, started_at: new Date(callAt).toISOString(), duration_s: 40 + Math.floor(r('len') * 110) },
    confirmation: { channel, state: 'sent', at: new Date(callAt + 70_000).toISOString() },
  }
}

/** The day's appointments as the template lays them out, before anything special. */
function baseDay(day: Date, now: Date): Appointment[] {
  return (WEEK[day.getDay()] ?? []).map(([time, key, doctor], i) => make(day, i, time, key, doctor, now))
}

/**
 * The attention cases, placed relative to today so a fresh load always has
 * them. Recomputed on every call; stable within a day.
 */
function specials(now: Date) {
  const t0 = startOfDay(now)
  const firstOpen = (from: number, ok: (dow: number) => boolean) => {
    for (let k = from; k < from + 8; k++) {
      const d = addDays(t0, k)
      if ((WEEK[d.getDay()] ?? []).length && ok(d.getDay())) return d
    }
    return addDays(t0, from)
  }
  const tomorrow = firstOpen(1, () => true)
  const today = baseDay(t0, now).find((a) => a.status === 'held' && new Date(a.starts_at).getTime() > now.getTime() + 30 * 60_000)
  return {
    unconfirmedId: `apt-${iso(tomorrow)}-0`,
    // The next appointment still to come today; failing that, tomorrow's second.
    changeId: today?.id ?? `apt-${iso(tomorrow)}-1`,
    // The caller asks for 14:00 the day after the appointment's own day.
    changeTo: startOfDay(today ? addDays(t0, 1) : addDays(tomorrow, 1)).getTime() + 14 * 3_600_000,
    evening: firstOpen(2, (dow) => dow >= 1 && dow <= 5),
    saturday: firstOpen(1, (dow) => dow === 6),
  }
}

function generateDay(day: Date, now: Date): Appointment[] {
  const s = specials(now)
  const list = baseDay(day, now).map((a): Appointment => {
    if (a.id === s.unconfirmedId && a.status === 'held') return { ...a, confirmation: { channel: 'zalo', state: 'failed', at: null } }
    if (a.id === s.changeId && a.status === 'held') return { ...a, change_request: { starts_at: new Date(s.changeTo).toISOString() } }
    return a
  })
  const extra = (index: number, time: string, key: SvcKey, doctor: number, reason: Appointment['pending_reason']): Appointment => {
    const a = make(day, index, time, key, doctor, now)
    return { ...a, status: 'pending', pending_reason: reason, prior_visits: 0, confirmation: { ...a.confirmation, state: 'not_sent', at: null } }
  }
  if (iso(day) === iso(s.evening)) list.push(extra(90, '18:30', 'implant', 0, 'outside_booking_hours'))
  if (iso(day) === iso(s.saturday)) list.push(extra(91, '15:30', 'cao', 2, 'over_daily_limit'))
  return list
}

/* ------------------------------------------------------------------ state */

const overrides = new Map<string, Partial<Appointment>>()

const withOverride = (a: Appointment): Appointment => {
  const o = overrides.get(a.id)
  return o ? { ...a, ...o } : a
}

function find(id: string, now: Date): Appointment | null {
  const m = /^apt-(\d{4}-\d{2}-\d{2})-/.exec(id)
  if (!m) return null
  const a = generateDay(new Date(`${m[1]}T00:00:00`), now).find((x) => x.id === id)
  return a ? withOverride(a) : null
}

export function needsLook(a: Appointment): boolean {
  return a.status === 'pending' || (a.status === 'held' && (!!a.change_request || a.confirmation.state === 'failed'))
}

export const appointmentsMock: AppointmentsApi = {
  async list(from, to, opts) {
    await delay(0.8, opts?.signal)
    maybeFail()
    const now = new Date()
    const first = new Date(`${from}T00:00:00`)
    const after = addDays(new Date(`${to}T00:00:00`), 1)
    const count = Math.round((after.getTime() - first.getTime()) / DAY_MS)

    const seen = new Set<string>()
    const all: Appointment[] = []
    const add = (a: Appointment) => {
      if (seen.has(a.id)) return
      seen.add(a.id)
      all.push(a)
    }
    for (let i = 0; i < count; i++) generateDay(addDays(first, i), now).map(withOverride).forEach(add)
    // Anything moved into this week from another one.
    for (const [id, o] of overrides) {
      if (!o.starts_at || seen.has(id)) continue
      const a = find(id, now)
      if (a) add(a)
    }
    const inside = (a: Appointment) => {
      const t = new Date(a.starts_at).getTime()
      return t >= first.getTime() && t < after.getTime()
    }

    const attention: Appointment[] = []
    const t0 = startOfDay(now)
    for (let k = 0; k < 21; k++) {
      generateDay(addDays(t0, k), now)
        .map(withOverride)
        .filter((a) => needsLook(a) && new Date(a.starts_at).getTime() + a.duration_min * 60_000 > now.getTime())
        .forEach((a) => attention.push(a))
    }

    const byStart = (a: Appointment, b: Appointment) => a.starts_at.localeCompare(b.starts_at)
    const week: AppointmentsWeek = {
      from,
      to,
      generated_at: now.toISOString(),
      appointments: all.filter(inside).sort(byStart),
      attention: attention.sort(byStart),
      has_any: true,
    }
    return week
  },

  async act(id, action: AppointmentAction, opts) {
    await delay(0.5, opts?.signal)
    maybeFail()
    const now = new Date()
    const a = find(id, now)
    if (!a) throw new Error(`No appointment ${id}`)
    const at = now.toISOString()
    const patch: Partial<Appointment> = (() => {
      switch (action) {
        case 'confirm':
          return { status: 'held', pending_reason: null, confirmation: { ...a.confirmation, state: 'sent', at } }
        case 'decline':
          return { status: 'cancelled', pending_reason: null }
        case 'accept_change':
          return a.change_request ? { starts_at: a.change_request.starts_at, change_request: null } : {}
        case 'keep_time':
          return { change_request: null }
        case 'arrived':
          return { status: 'arrived' }
        case 'no_show':
          return { status: 'no_show' }
        case 'cancel':
          return { status: 'cancelled' }
        case 'restore':
          return { status: 'held' }
        case 'informed':
          return { confirmation: { ...a.confirmation, state: 'informed', at } }
      }
    })()
    overrides.set(id, { ...overrides.get(id), ...patch })
    return find(id, now)!
  },
}
