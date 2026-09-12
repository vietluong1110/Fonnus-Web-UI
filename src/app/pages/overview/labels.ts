/**
 * Every Vietnamese word the Tổng quan tab says, and every number it formats.
 *
 * The API returns machine codes — `pricing`, `unanswered`, `under_1m` — and
 * this file is where they become sentences, because the frontend owns all
 * Vietnamese copy (CLAUDE.md). A server-authored label would arrive in a voice
 * the rest of the screen does not share, and there would be nowhere to put the
 * receptionist's name.
 *
 * Where an attention row *leads* lives here too. The routes are hashes and they
 * are this app's business; a response that carried a link would make the
 * backend responsible for the frontend's URL scheme.
 */
import type {
  AttentionItem,
  CallIntent,
  CallOutcome,
  DurationBucket,
  InsightRange,
} from '../../../api'
import type { IconName } from '../../../design-system'
import type { Weekday } from '../../letan/model'
import { appHref } from '../../../hooks/useRoute'

/* ----------------------------------------------------------------- the range */

export const RANGES: { value: InsightRange; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
]

/** What the range is called inside a sentence — "so với 7 ngày trước đó". */
export const RANGE_BEFORE: Record<InsightRange, string> = {
  today: 'so với chủ nhật tuần trước',
  '7d': 'so với 7 ngày trước đó',
  '30d': 'so với 30 ngày trước đó',
}

/**
 * `today` compares against the same weekday a week ago, not against yesterday —
 * a clinic's Sunday and its Tuesday are different businesses, and a Monday
 * measured against Sunday would report a boom every week.
 */
export function rangeBefore(range: InsightRange, weekday: Weekday): string {
  return range === 'today' ? `so với ${WEEKDAY[weekday].toLowerCase()} tuần trước` : RANGE_BEFORE[range]
}

/* ------------------------------------------------------------------ the days */

export const WEEKDAY: Record<Weekday, string> = {
  0: 'Chủ nhật',
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
}

/** The column label on a chart, where there is room for two characters. */
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'CN',
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
}

/* -------------------------------------------------------------- the codes */

export const INTENT_LABEL: Record<CallIntent, string> = {
  booking: 'Đặt hoặc đổi lịch hẹn',
  pricing: 'Hỏi giá dịch vụ',
  hours_location: 'Hỏi giờ mở cửa, địa chỉ',
  practitioner: 'Hỏi về bác sĩ',
  insurance_payment: 'BHYT và thanh toán',
  other: 'Việc khác',
}

/** She is in every one of these, which is why they take her name. */
export function outcomeLabel(outcome: CallOutcome, agent: string): string {
  switch (outcome) {
    case 'answered':
      return `${agent} trả lời xong`
    case 'transferred':
      return 'Chuyển cho người thật'
    case 'abandoned':
      return 'Khách cúp máy sớm'
    case 'unanswered':
      return `${agent} chưa trả lời được`
  }
}

export const DURATION_LABEL: Record<DurationBucket, string> = {
  under_1m: 'Dưới 1p',
  '1_2m': '1–2p',
  '2_4m': '2–4p',
  '4_6m': '4–6p',
  over_6m: 'Trên 6p',
}

/* --------------------------------------------------------------- formatting */

/**
 * A length of time in the words an owner uses. `1g 12p` for a total, `2p 24s`
 * for one call — the unit that matters changes with the size, so the function
 * picks it rather than the caller.
 */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s >= 3600) {
    const h = Math.floor(s / 3600)
    const m = Math.round((s % 3600) / 60)
    return m ? `${h}g ${m}p` : `${h}g`
  }
  if (s >= 60) {
    const m = Math.floor(s / 60)
    const rest = s % 60
    return rest ? `${m}p ${rest}s` : `${m}p`
  }
  return `${s}s`
}

/** `08:05` from an ISO datetime, in the browser's zone — the clinic's own clock. */
export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function fmtDayMonth(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Inside a sentence: "4 việc từ cuộc gọi thật trong 7 ngày qua". */
export const RANGE_IN: Record<InsightRange, string> = {
  today: 'hôm nay',
  '7d': 'trong 7 ngày qua',
  '30d': 'trong 30 ngày qua',
}

/** What a chart of the whole range calls itself in its subtitle. */
export const RANGE_SPAN: Record<InsightRange, string> = {
  today: 'hôm nay',
  '7d': '7 ngày qua',
  '30d': '30 ngày qua',
}

/** The page's own dateline: `Chủ nhật, 13/09/2026`. */
export function fmtDateline(iso: string): string {
  const d = new Date(iso)
  return `${WEEKDAY[d.getDay() as Weekday]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** `Hôm nay` / `Hôm qua` / `09/09`, for a row that names when something happened. */
export function fmtDayRelative(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const days = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      86_400_000,
  )
  if (days === 0) return 'Hôm nay'
  if (days === 1) return 'Hôm qua'
  return fmtDayMonth(iso)
}

/** A share of the whole, rounded once so the column and the legend agree. */
export function fmtShare(count: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((count / total) * 100)}%`
}

/**
 * The change against the span before, or `null` when there is nothing to
 * compare against — a clinic in its first week gets no delta rather than a
 * triumphant `+100%`.
 */
export function delta(value: number, previous: number | null): { text: string; up: boolean } | null {
  if (previous == null) return null
  const diff = value - previous
  if (diff === 0) return null
  return { text: `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`, up: diff > 0 }
}

/* ------------------------------------------------------------- the queue rows */

export interface AttentionCopy {
  icon: IconName
  title: string
  sub: string
  action: string
  href: string
  /**
   * True when the row names something the receptionist does not know yet — the
   * dashed edge means "content, not filled in" and nothing else
   * (ui-ux-principles §1). A row that is only a fact stays solid.
   */
  gap: boolean
}

export function attentionCopy(item: AttentionItem, agent: string): AttentionCopy {
  switch (item.kind) {
    case 'missing_price':
      return {
        icon: 'price',
        title: `${item.count} khách hỏi giá ${item.service.toLowerCase()}`,
        sub: `${agent} chưa có giá để đọc — hiện ${agent} xin ghi nhận rồi nhờ gọi lại`,
        action: 'Thêm giá',
        href: appHref('le-tan', 'kien-thuc', 'dich-vu'),
        gap: true,
      }
    case 'unconfirmed_hours':
      return {
        icon: 'hours',
        title: `${item.count} khách hỏi ${WEEKDAY[item.weekday].toLowerCase()} có làm không`,
        sub: `Giờ ${WEEKDAY[item.weekday].toLowerCase()} bạn chưa xác nhận — ${agent} đang đọc giờ mẫu`,
        action: 'Xác nhận giờ',
        href: appHref('le-tan', 'kien-thuc', 'gio-mo-cua'),
        gap: true,
      }
    case 'unanswered_question':
      return {
        icon: 'help',
        title: `${item.count} khách hỏi câu ${agent} chưa trả lời được`,
        sub: `“${item.question}”`,
        action: 'Thêm câu trả lời',
        href: appHref('le-tan', 'kien-thuc', 'cau-hoi'),
        gap: true,
      }
    case 'pending_appointments':
      return {
        icon: 'appointment',
        title: `${item.count} lịch hẹn chờ bạn xác nhận`,
        sub: item.appointments
          .map((a) => `${a.customer_name} ${fmtTime(a.starts_at)} ${WEEKDAY[new Date(a.starts_at).getDay() as Weekday].toLowerCase()}`)
          .join(' · '),
        action: 'Mở lịch hẹn',
        href: appHref('lich-hen'),
        gap: false,
      }
    case 'after_hours_callback':
      return {
        icon: 'after-hours',
        title: `${item.count} cuộc ngoài giờ chưa ai gọi lại`,
        sub: `${fmtDayRelative(item.from)} ${fmtTime(item.from)} – ${fmtTime(item.to)} · ${agent} đã ghi lại số và nội dung`,
        action: 'Nghe lại',
        href: appHref('cuoc-goi'),
        gap: false,
      }
  }
}
