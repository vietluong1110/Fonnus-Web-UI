import type { Appointment, AppointmentAction } from '../../../api'
import { formatVnd } from '../../ui'

/*
 * Every Vietnamese word the Lịch hẹn tab puts on screen about an appointment.
 * The API sends machine codes and recorded content (a name, a note in the
 * caller's words); the sentences around them are written here, in the
 * receptionist's voice, with her name in them.
 *
 * Weeks start on Monday, as a Vietnamese wall calendar does — so the index
 * used throughout is Monday 0 … Sunday 6, not `Date.getDay()`.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export const WEEKDAY = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Monday 0 … Sunday 6. */
export const dayIndex = (d: Date) => (d.getDay() + 6) % 7

export const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
export const dm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()
export const hmOfMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -dayIndex(d))
}

export const sameDay = (a: Date, b: Date) => isoDate(a) === isoDate(b)

/** "Thứ Hai, 14/09" */
export const dayLong = (d: Date) => `${WEEKDAY[dayIndex(d)]}, ${dm(d)}`

/** "14 – 20/09/2026", or "28/09 – 04/10/2026" across a month. */
export function weekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const head = monday.getMonth() === sunday.getMonth() ? pad(monday.getDate()) : dm(monday)
  return `${head} – ${dm(sunday)}/${sunday.getFullYear()}`
}

/** Mid-sentence, a salutation is lower case: "Chị Trang" → "chị Trang". */
export function inSentence(name: string): string {
  return name.replace(/^(Anh|Chị|Cô|Chú|Bà|Ông|Bé|Em) /, (m) => m.toLowerCase())
}

export function durationLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (!m) return `${s} giây`
  return s ? `${m} phút ${pad(s)} giây` : `${m} phút`
}

/* ---------------------------------------------------------------- status */

export type Look = 'pending' | 'change' | 'unconfirmed'

/**
 * Why an appointment is waiting on the clinic, if it is. Three things she cannot
 * close alone: a time she may not give away herself, a caller asking to move,
 * and a confirmation that never arrived.
 */
export function lookOf(a: Appointment): Look | null {
  if (a.status === 'pending') return 'pending'
  if (a.status !== 'held') return null
  if (a.change_request) return 'change'
  if (a.confirmation.state === 'failed') return 'unconfirmed'
  return null
}

export function statusLabel(a: Appointment, agent: string): string {
  switch (lookOf(a) ?? a.status) {
    case 'pending':
      return 'Chờ bạn xác nhận'
    case 'change':
      return 'Khách xin đổi giờ'
    case 'unconfirmed':
      return 'Chưa nhận tin xác nhận'
    case 'arrived':
      return 'Đã đến'
    case 'no_show':
      return 'Không đến'
    case 'cancelled':
      return 'Đã huỷ'
    default:
      return `${agent} đã giữ chỗ`
  }
}

/** The pill in "Cần bạn xem". */
export function lookChip(a: Appointment): string {
  switch (lookOf(a)) {
    case 'pending':
      return `${a.patient_name} chờ xác nhận`
    case 'change':
      return `${a.patient_name} xin đổi giờ`
    default:
      return `${a.patient_name} chưa nhận tin`
  }
}

const CHANNEL: Record<Appointment['confirmation']['channel'], string> = { sms: 'SMS', zalo: 'Zalo', none: '' }

/** The line at the top of an appointment that waits on the clinic — what happened and what is left. */
export function lookSentence(a: Appointment, agent: string): string {
  const start = new Date(a.starts_at)
  switch (lookOf(a)) {
    case 'pending':
      return a.pending_reason === 'over_daily_limit'
        ? `Ngày này đã đủ chỗ ${agent} được tự giữ. ${agent} đã ghi nhận, chờ bạn xác nhận.`
        : `Khách xin ${hm(start)} — ngoài khung giờ ${agent} được tự giữ chỗ. ${agent} đã ghi nhận, chờ bạn xác nhận.`
    case 'change': {
      const to = new Date(a.change_request!.starts_at)
      return `Khách xin đổi sang ${hm(to)} ${WEEKDAY[dayIndex(to)].toLowerCase()} ${dm(to)}. ${agent} chưa đổi — chờ bạn.`
    }
    case 'unconfirmed':
      return `Tin xác nhận qua ${CHANNEL[a.confirmation.channel] || 'tin nhắn'} chưa tới khách — có thể số này không dùng ${CHANNEL[a.confirmation.channel] || 'tin nhắn'}.`
    default:
      return ''
  }
}

/** "300.000–500.000đ · 30 phút", "Miễn phí · 30 phút", or the length alone when the list has no price. */
export function priceLine(a: Appointment): string {
  const length = `${a.duration_min} phút`
  if (a.price_from == null) return length
  if (a.price_from === 0 && !a.price_to) return `Miễn phí · ${length}`
  const price = a.price_to && a.price_to !== a.price_from ? `${formatVnd(a.price_from)}–${formatVnd(a.price_to)}đ` : `${formatVnd(a.price_from)}đ`
  return `${price} · ${length}`
}

export function visitsLabel(a: Appointment): string {
  return a.prior_visits <= 0 ? 'Khách mới' : `Đã đến ${a.prior_visits} lần`
}

export function callLine(a: Appointment): string | null {
  if (!a.call) return null
  const at = new Date(a.call.started_at)
  return `Cuộc gọi ${hm(at)} · ${WEEKDAY_SHORT[dayIndex(at)]} ${dm(at)}`
}

/** What was sent to the caller afterwards. `gap` when it is something the clinic should know is missing. */
export function confirmationLine(a: Appointment): { text: string; gap: boolean } {
  const c = a.confirmation
  const at = c.at ? new Date(c.at) : null
  const when = at ? ` · ${hm(at)} ${WEEKDAY_SHORT[dayIndex(at)]} ${dm(at)}` : ''
  switch (c.state) {
    case 'sent':
      return { text: `Đã nhắn ${CHANNEL[c.channel]} xác nhận${when}`, gap: false }
    case 'failed':
      return { text: `Chưa gửi được tin xác nhận qua ${CHANNEL[c.channel]}`, gap: a.status === 'held' }
    case 'informed':
      return { text: `Bạn đã gọi báo khách${when}`, gap: false }
    default:
      return a.status === 'pending'
        ? { text: 'Chưa nhắn xác nhận — chờ bạn', gap: true }
        : { text: c.channel === 'none' ? 'Phòng khám không nhắn xác nhận' : 'Chưa nhắn xác nhận', gap: false }
  }
}

/** The toast after an action. States the fact; no praise. */
export function actionToast(action: AppointmentAction, a: Appointment): string {
  const who = inSentence(a.patient_name)
  switch (action) {
    case 'confirm':
      return `Đã xác nhận lịch của ${who}`
    case 'decline':
      return `Đã từ chối lịch của ${who}`
    case 'accept_change': {
      const to = new Date(a.starts_at)
      return `Đã dời lịch của ${who} sang ${hm(to)} ${WEEKDAY[dayIndex(to)].toLowerCase()}`
    }
    case 'keep_time':
      return `Giữ nguyên giờ cũ cho ${who}`
    case 'arrived':
      return `${a.patient_name} đã đến`
    case 'no_show':
      return `Đã ghi ${who} không đến`
    case 'cancel':
      return `Đã huỷ lịch của ${who}`
    case 'restore':
      return `Đã khôi phục lịch của ${who}`
    case 'informed':
      return `Đã ghi là bạn gọi báo ${who}`
  }
}
