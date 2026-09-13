/**
 * Every Vietnamese word the Cuộc gọi tab says, and every number it formats.
 *
 * The API sends machine codes — `appointment_held`, `missing_price` — and this
 * file turns them into sentences, because the frontend owns all Vietnamese copy
 * (CLAUDE.md). The one exception is content *about* a call — what the caller
 * said, the topic, the summary — which is the call's, not the interface's.
 *
 * Words the Tổng quan tab already says are imported from its labels, not
 * restated: an outcome must read the same on both tabs.
 */
import type { CallDetail, CallEvent, CallFilter, CallOutcome, CallSummary, KnowledgeGap } from '../../../api'
import type { IconName } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import type { Weekday } from '../../letan/model'
import { WEEKDAY, WEEKDAY_SHORT, fmtDayMonth, fmtDuration, fmtTime, outcomeLabel } from '../overview/labels'

/* ----------------------------------------------------------------- filters */

export const FILTERS: readonly CallFilter[] = ['all', 'callback', 'booked', 'transferred', 'unanswered']

export function filterLabel(filter: CallFilter, agent: string): string {
  switch (filter) {
    case 'all':
      return 'Tất cả'
    case 'callback':
      return 'Cần gọi lại'
    case 'booked':
      return 'Đặt lịch'
    case 'transferred':
    case 'unanswered':
      return outcomeLabel(filter, agent)
  }
}

/* ------------------------------------------------------------------ the row */

/** `0903812217` → `0903 812 217`; a landline `02838221144` → `028 3822 1144`. */
export function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  if (d.length === 11 && d.startsWith('02')) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`
  return raw
}

const OUTCOME_ICON: Record<CallOutcome, IconName> = {
  answered: 'done',
  transferred: 'handoff',
  abandoned: 'caller-lost',
  unanswered: 'help',
}

/**
 * What the call came to, in one label and one icon. A booking outranks the
 * outcome: "Linh trả lời xong" is true of a booked call, and says less.
 */
export function resultOf(call: CallSummary, agent: string): { label: string; icon: IconName } {
  if (call.booked) return { label: 'Đặt lịch', icon: 'appointment' }
  return { label: outcomeLabel(call.outcome, agent), icon: OUTCOME_ICON[call.outcome] }
}

/** Under the number: who it is, if she learned it, and whether they have rung before. */
export function callerLine(call: CallSummary): string {
  const n = call.caller_call_number
  if (call.caller_name) return n > 1 ? `${call.caller_name} · gọi lần ${n}` : call.caller_name
  return n > 1 ? `Gọi lần ${n}` : 'Khách mới'
}

/** An open callback: promised, and nobody has made it yet. */
export function callbackOpen(call: CallSummary): boolean {
  return call.callback != null && call.callback.done_at == null
}

/* -------------------------------------------------------------------- time */

/** A local `YYYY-MM-DD`, the key a day's calls group under. */
export function localDate(iso: string | Date): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Whole calendar days from `now` to `iso` — negative in the past. */
function daysFrom(iso: string, now: Date): number {
  const d = new Date(iso)
  return Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86_400_000,
  )
}

/** `Hôm nay` / `Hôm qua` / `Thứ Sáu` — the name on a day's band. */
export function dayName(iso: string, now = new Date()): string {
  const days = daysFrom(iso, now)
  if (days === 0) return 'Hôm nay'
  if (days === -1) return 'Hôm qua'
  return WEEKDAY[new Date(iso).getDay() as Weekday]
}

/** `Hôm nay · 10:31` / `Thứ Sáu 11/09 · 19:40` — when, in one short line. */
export function whenLine(iso: string, now = new Date()): string {
  const name = dayName(iso, now)
  const d = name === 'Hôm nay' || name === 'Hôm qua' ? name : `${name} ${fmtDayMonth(iso)}`
  return `${d} · ${fmtTime(iso)}`
}

/** `Hôm nay · 10:31 · 1p 24s` — the line under the caller in the rail. */
export function callMeta(call: CallSummary, now = new Date()): string {
  return `${whenLine(call.started_at, now)} · ${fmtDuration(call.duration_s)}`
}

/** `T5 17/09 · 15:00` — an appointment slot, the way the calendar writes it. */
export function slot(iso: string): string {
  const d = new Date(iso)
  return `${WEEKDAY_SHORT[d.getDay() as Weekday]} ${fmtDayMonth(d)} · ${fmtTime(iso)}`
}

/** `Cần gọi lại trước 17:00 hôm nay` — the deadline she promised, as a fact. */
export function callbackTitle(dueBy: string | null, now = new Date()): string {
  if (!dueBy) return 'Cần gọi lại'
  const days = daysFrom(dueBy, now)
  const when = days === 0 ? 'hôm nay' : days === 1 ? 'ngày mai' : days === -1 ? 'hôm qua' : fmtDayMonth(dueBy)
  return `Cần gọi lại trước ${fmtTime(dueBy)} ${when}`
}

/** `1:24` — a position in the recording. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** `1x`, `1,5x` — the speed pill. A letter x, not a multiplication glyph. */
export function rateLabel(rate: number): string {
  return `${String(rate).replace('.', ',')}x`
}

/* ------------------------------------------------------------ what she did */

export function eventCopy(event: CallEvent, agent: string): { icon: IconName; text: string } {
  switch (event.type) {
    case 'availability_checked':
      return {
        icon: 'calendar',
        text: `${agent} xem lịch trống ${WEEKDAY[new Date(`${event.date}T00:00:00`).getDay() as Weekday].toLowerCase()}`,
      }
    case 'appointment_held':
      return { icon: 'appointment', text: `Đã giữ lịch · ${slot(event.starts_at)}` }
    case 'message_taken':
      return {
        icon: 'message',
        text: event.callback_by ? `Ghi lời nhắn · gọi lại trước ${fmtTime(event.callback_by)}` : 'Ghi lời nhắn',
      }
    case 'transferred':
      return {
        icon: 'handoff',
        text: event.answered
          ? `Chuyển máy cho ${event.to_name} · nghe máy sau ${event.ring_s} giây`
          : `Chuyển máy cho ${event.to_name} · không ai nghe máy`,
      }
    case 'transfer_ended':
      return { icon: 'practitioner', text: `${event.to_name} nói chuyện với khách · ${fmtDuration(event.talk_s)}` }
    case 'caller_hung_up':
      return { icon: 'caller-lost', text: 'Khách cúp máy' }
  }
}

export function transferNote(t: NonNullable<CallDetail['transfer']>): string {
  return t.answered
    ? `Nghe máy sau ${t.ring_s} giây · nói chuyện ${fmtDuration(t.talk_s)}`
    : `Không ai nghe máy sau ${t.ring_s} giây`
}

/* ------------------------------------------------------- what she lacked */

export interface GapCopy {
  icon: IconName
  /** The row in the rail: what she does not know, in her name. */
  title: string
  /** Under the line where it happened. */
  note: string
  action: string
  /** The field that closes it — the same place Tổng quan's queue sends the owner. */
  href: string
}

export function gapCopy(gap: KnowledgeGap, agent: string): GapCopy {
  switch (gap.kind) {
    case 'missing_price':
      return {
        icon: 'price',
        title: `${agent} chưa có giá ${gap.service.toLowerCase()}`,
        note: 'Chưa có giá để đọc',
        action: 'Thêm giá',
        href: appHref('le-tan', 'kien-thuc', 'dich-vu'),
      }
    case 'unconfirmed_hours':
      return {
        icon: 'hours',
        title: `${agent} đang đọc giờ mẫu cho ${WEEKDAY[gap.weekday].toLowerCase()}`,
        note: 'Giờ này bạn chưa xác nhận',
        action: 'Xác nhận giờ',
        href: appHref('le-tan', 'kien-thuc', 'gio-mo-cua'),
      }
    case 'unanswered_question':
      return {
        icon: 'help',
        title: `${agent} chưa có câu trả lời: “${gap.question}”`,
        note: 'Chưa có câu trả lời',
        action: 'Thêm câu trả lời',
        href: appHref('le-tan', 'kien-thuc', 'cau-hoi'),
      }
  }
}
