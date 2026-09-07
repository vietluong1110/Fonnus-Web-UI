import { LABELS, WEEKDAY_LONG } from '../defaults'
import type { EmailIntent, EmailRule, EscalationTarget, ReceptionistConfig, SlotRule, Weekday } from '../model'
import { EMERGENCY_INSTRUCTION_SCRIPT, EMERGENCY_TRIGGER, ESCALATION_TRIGGERS_BASE, UNRESOLVABLE_FALLBACK_SCRIPT } from '../system'
import { shortVnd } from '../knowledge/answers'

/*
 * What the receptionist says about what she is *allowed to do*.
 *
 * Kiến thức has `knowledge/answers.ts` for the same reason: a sentence built
 * from the record, in one place, so the form's `Said` line and the mock
 * receptionist voice the same words for the same field. This is the Kỹ năng
 * half — transfer, email, booking.
 *
 * Every builder returns her line **even when the field is empty**, because the
 * line she falls back to is the whole argument for filling the field in. A
 * warning says "this is missing"; "Dạ, em xin ghi nhận và nhờ nhân viên gọi
 * lại anh chị ạ" says what the caller will actually hear instead, which is
 * what an owner is deciding about.
 */

/** Lower-cases the first letter so a field value can sit mid-sentence. */
const mid = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** No trailing full stop: the sentence around it supplies its own. */
const trim = (s: string) => s.trim().replace(/[.\s]+$/, '')

/** "08:00" → "8 giờ", "14:30" → "14 giờ 30" — the way a time is said, not written. */
export function spokenTime(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2))
  const m = Number(hhmm.slice(3, 5))
  return m ? `${h} giờ ${m}` : `${h} giờ`
}

const midDay = (d: Weekday) => (d === 0 ? 'chủ nhật' : mid(WEEKDAY_LONG[d]))

/* --------------------------------------------------------- chuyển máy */

/** Who picks up: the first number with a name on it, or the honest generic. */
export function handoffTo(cfg: ReceptionistConfig): string {
  const first = cfg.escalation_targets.find((t) => t.name.trim() || t.phone.trim())
  return first?.name.trim() || 'nhân viên'
}

export function hasHandoffNumber(cfg: ReceptionistConfig): boolean {
  return cfg.escalation_targets.some((t) => t.phone.trim().length >= 9)
}

/** A number long enough to ring. */
export const targetReady = (t: EscalationTarget) => t.phone.trim().length >= 9

/** How she names one person to a caller: the name, or the job when there is no name yet. */
export function targetSaid(t: EscalationTarget): string {
  return t.name.trim() || (t.role.trim() ? mid(trim(t.role)) : 'nhân viên')
}

/**
 * What she says when a caller *asks* for a person. With no number stored she
 * cannot connect anyone, so she says the one thing that is true — and that
 * sentence is the argument for the empty list above it.
 */
export function agreeLine(cfg: ReceptionistConfig): string {
  if (!hasHandoffNumber(cfg)) return `Dạ, ${UNRESOLVABLE_FALLBACK_SCRIPT.replace(/^Em /, 'em ')}`
  return `Dạ, em nối máy với ${handoffTo(cfg)} ngay ạ. Anh chị giữ máy giúp em một chút nhé.`
}

/**
 * One row's own sentence: what a caller hears when *this* person's turn comes.
 *
 * The emergency row says something else, because that call must not go the
 * way an ordinary one does — she connects first and talks after.
 */
export function targetLine(t: EscalationTarget): string {
  const who = targetSaid(t)
  if (!targetReady(t)) return `Dạ, ${UNRESOLVABLE_FALLBACK_SCRIPT.replace(/^Em /, 'em ')}`
  if (t.triggers.includes(EMERGENCY_TRIGGER)) return `Anh chị giữ máy, em nối máy với ${who} ngay ạ.`
  return `Dạ, em nối máy với ${who} ngay ạ. Anh chị giữ máy giúp em một chút nhé.`
}

/** And what she says the moment that number rings out. */
export function fallbackLine(t: EscalationTarget): string {
  const who = targetSaid(t)
  return t.fallback === 'handle'
    ? `Dạ, ${who} đang bận máy ạ. Anh chị cho em hỏi thêm để em hỗ trợ trước, được không ạ?`
    : `Dạ, ${who} đang bận máy ạ. Em xin ghi nhận, nhân viên sẽ gọi lại anh chị sớm nhất ạ.`
}

/** The one line under a row's clock tiles: what "khi nào" means on a call. */
export function transferWindowLine(t: EscalationTarget, agent: string): string {
  const who = targetSaid(t)
  switch (t.window) {
    case 'business_hours':
      return `Ngoài giờ ${agent} không gọi ${who} — ${agent} ghi lời nhắn để nhân viên gọi lại.`
    case 'after_hours':
      return `Trong giờ nhân viên đã nghe máy trực tiếp, nên ${agent} chỉ gọi ${who} ngoài giờ.`
    default:
      return `Kể cả 23 giờ. ${agent.charAt(0).toUpperCase()}${agent.slice(1)} thử gọi bất cứ lúc nào trường hợp bên trên xảy ra.`
  }
}

/** The rows that take emergency calls, in the order she rings them. */
export function emergencyTargets(cfg: ReceptionistConfig): EscalationTarget[] {
  return cfg.escalation_targets.filter((t) => t.triggers.includes(EMERGENCY_TRIGGER))
}

/** The doctor on call, as she names them. */
export function emergencyDoctor(cfg: ReceptionistConfig): string {
  return trim(cfg.after_hours_emergency_target.name) || 'bác sĩ'
}

export function hasEmergencyNumber(cfg: ReceptionistConfig): boolean {
  return cfg.after_hours_emergency_target.phone.trim().length >= 9
}

/**
 * The emergency line. Without a number she cannot connect anyone at 23:00,
 * and the fallback says exactly that — which is a stronger case for the row
 * than any red badge was.
 */
export function emergencyLine(cfg: ReceptionistConfig): string {
  if (!hasEmergencyNumber(cfg)) return 'Dạ, em rất tiếc, giờ này em chưa nối được với bác sĩ nào ạ. Em xin ghi nhận và nhờ nhân viên gọi lại anh chị sáng mai ạ.'
  const who = emergencyDoctor(cfg)
  return `Anh chị giữ máy, em nối máy với ${who === 'bác sĩ' ? 'bác sĩ' : who} ngay ạ. ${EMERGENCY_INSTRUCTION_SCRIPT.split('. ').slice(1).join('. ')}`.trim()
}

/**
 * The two columns the catalogue wants, written from the rows.
 *
 * `escalation_triggers_custom` is the flat union of everything the owner typed
 * on a person, minus the base set the platform already applies;
 * `after_hours_emergency_target` is the first row that takes emergency calls.
 * Both are derived on every edit, the way `working_hours_note` is derived from
 * a doctor's blocks — so the catalogue's columns can never fall out of step
 * with what the page shows.
 */
export function derivedFromTargets(targets: EscalationTarget[]): {
  escalation_triggers_custom: string[]
  after_hours_emergency_target: { phone: string; name: string }
} {
  const custom = [...new Set(targets.flatMap((t) => t.triggers))].filter((t) => !ESCALATION_TRIGGERS_BASE.includes(t))
  const doctor = targets.find((t) => t.triggers.includes(EMERGENCY_TRIGGER) && targetReady(t)) ?? targets.find((t) => t.triggers.includes(EMERGENCY_TRIGGER))
  return {
    escalation_triggers_custom: custom,
    after_hours_emergency_target: { phone: doctor?.phone ?? '', name: doctor?.name ?? '' },
  }
}

/* ----------------------------------------------------------- gửi email */

/**
 * A worked call, so an email template reads as an email rather than as a row
 * of tokens. One caller, one booking, one summary — the same person in all
 * three templates, so switching between them compares wording and not data.
 */
export const SAMPLE: Record<string, string> = {
  tên_khách: 'Nguyễn Văn An',
  số_gọi: '090 123 45 67',
  giờ_gọi: '14:32 hôm nay',
  giờ_hẹn: '9:00 thứ Bảy 12/09',
  dịch_vụ: 'cạo vôi răng',
  tóm_tắt: 'Khách hỏi giá cạo vôi và niềng răng trong suốt, đã giữ lịch sáng thứ Bảy.',
  hẹn_gọi_lại: 'trong 30 phút đầu giờ làm việc',
  liên_kết: 'fonnus.vn/cuoc-goi/8241',
}

/**
 * What each variable is *called*, in the owner's words.
 *
 * The key is what the mailer fills in and the label is what a clinic owner
 * reads; nothing on screen ever shows the key. This map is the whole reason
 * `Nội dung` stopped looking like source code — the field used to print
 * `«tên_khách»` and then ask the reader to learn what that meant.
 */
export const VAR_LABELS: Record<string, string> = {
  tên_khách: 'Tên khách',
  số_gọi: 'Số điện thoại',
  giờ_gọi: 'Giờ gọi',
  giờ_hẹn: 'Giờ hẹn',
  dịch_vụ: 'Dịch vụ',
  tóm_tắt: 'Tóm tắt cuộc gọi',
  hẹn_gọi_lại: 'Hẹn gọi lại',
  liên_kết: 'Đường dẫn nghe lại',
}

/** The variables one template may use, as the field and the pill rack want them. */
export function emailVars(keys: string[]): { key: string; label: string; sample?: string }[] {
  return keys.map((key) => ({ key, label: VAR_LABELS[key] ?? key, sample: SAMPLE[key] }))
}

/** One run of a template: plain text, or a variable and the value standing in for it. */
export interface Filled {
  text: string
  /** The variable this run came from, when it is one. */
  variable?: string
}

/**
 * A template split into what is written and what is filled in. The page draws
 * the filled runs differently, so an owner sees which half of the sentence
 * changes on every call without a legend explaining «guillemets».
 */
export function fill(template: string): Filled[] {
  const out: Filled[] = []
  const re = /«([^»]+)»/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(template))) {
    if (m.index > last) out.push({ text: template.slice(last, m.index) })
    out.push({ text: SAMPLE[m[1]] ?? m[1], variable: m[1] })
    last = m.index + m[0].length
  }
  if (last < template.length) out.push({ text: template.slice(last) })
  return out
}

/** The whole template as one string, for the toast that says a test was sent. */
export function filled(template: string): string {
  return fill(template)
    .map((r) => r.text)
    .join('')
}

/** What the card head says about the three rules together. */
export function emailSummary(rules: EmailRule[], agent: string): string {
  const live = rules.filter((r) => r.enabled && r.recipients.length)
  if (!live.length) return `Chưa gửi email nào — bạn chỉ biết một cuộc gọi cần xem lại khi tự mở ứng dụng`
  const to = [...new Set(live.flatMap((r) => r.recipients))]
  return `${live.length}/${rules.length} loại đang gửi tới ${to.length > 1 ? `${to.length} địa chỉ` : to[0]} · ${agent} gửi ngay khi cuộc gọi kết thúc`
}

/** Who a single rule reaches, in the row's own words. */
export function ruleSummary(r: EmailRule): string | null {
  if (!r.enabled) return null
  if (!r.recipients.length) return null
  return r.recipients.join(', ')
}

export const INTENT_ASKS: Record<EmailIntent, (agent: string) => string> = {
  needs_review: (a) => `${a} không trả lời được một câu`,
  new_booking: (a) => `${a} vừa giữ lịch cho khách`,
  missed_after_hours: () => 'Khách gọi lúc phòng khám đã nghỉ',
}

/* ---------------------------------------------------------- đặt lịch hẹn */

/** The days the clinic itself is shut — no booking window can live on one. */
export function closedDays(cfg: ReceptionistConfig): Weekday[] {
  return cfg.operating_hours_by_weekday.filter((h) => !h.open).map((h) => h.day)
}

/** The clinic's own hours on a weekday, when it has any. */
export function clinicHours(cfg: ReceptionistConfig, day: Weekday): { from: string; to: string } | null {
  const h = cfg.operating_hours_by_weekday.find((r) => r.day === day)
  return h && h.open ? { from: h.from, to: h.to } : null
}

/** The days she may give a slot away on, in the week's own order. */
export function bookableDays(rules: SlotRule[]): Weekday[] {
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => rules.find((r) => r.day === d)?.enabled) as Weekday[]
}

/**
 * What she says to "sáng thứ Bảy còn chỗ không". Reads the first bookable day
 * so the sentence is about a real day of this clinic's week, and says the
 * clinic's own hours when that day carries no window of its own.
 */
export function slotLine(cfg: ReceptionistConfig, agent: string): string {
  const days = bookableDays(cfg.slot_rules)
  if (!days.length) return `Dạ, lịch hẹn thì em xin ghi nhận, nhân viên sẽ gọi lại xác nhận với anh chị ạ.`
  const day = days[0]
  const rule = cfg.slot_rules.find((r) => r.day === day)
  const win = rule?.windows.length ? rule.windows : clinicHours(cfg, day) ? [clinicHours(cfg, day)!] : []
  if (!win.length) return `Dạ, ${midDay(day)} phòng khám có nhận hẹn ạ. Anh chị muốn ${agent.toLowerCase() === 'linh' ? 'em' : 'em'} giữ lịch lúc mấy giờ ạ?`
  const said = win.map((w) => `${spokenTime(w.from)} đến ${spokenTime(w.to)}`).join(' và ')
  return `Dạ, ${midDay(day)} phòng khám nhận hẹn từ ${said} ạ. Em giữ lịch cho anh chị nhé?`
}

/**
 * What the cap sounds like *when it is reached* — which is the only moment a
 * caller ever hears it, and so the only honest way to show what the number
 * does. A restatement of the four fields above it would just be the fields
 * again, in a sentence.
 */
export function limitLine(cfg: ReceptionistConfig): string {
  const slots = cfg.ai_bookable_slots_per_day
  if (!slots) return 'Dạ, lịch hẹn thì em xin ghi nhận để nhân viên gọi lại xác nhận với anh chị ạ.'
  return `Dạ, hôm đó em kín ${slots} chỗ rồi ạ. Em xin ghi nhận để nhân viên xếp thêm rồi gọi lại anh chị nhé?`
}

/** The confirmation she promises at the end of a booking. */
export function confirmLine(cfg: ReceptionistConfig): string {
  const ch = cfg.booking_confirmation_channel
  if (ch === 'none') return 'Dạ, em giữ lịch cho anh chị rồi ạ. Anh chị nhớ giúp em giờ hẹn nhé.'
  return `Dạ, em giữ lịch cho anh chị rồi ạ. Em gửi tin nhắn xác nhận qua ${LABELS.confirmation[ch]} về số này ngay ạ.`
}

/** How she checks that the caller is the person who booked. */
export function identityLine(cfg: ReceptionistConfig): string {
  return cfg.identity_verification_rule === 'caller_id_date_name'
    ? 'Dạ, anh chị cho em xin tên người đặt và ngày hẹn để em kiểm tra giúp ạ.'
    : 'Dạ, anh chị cho em xin ngày hẹn để em kiểm tra giúp ạ.'
}

/** The four questions a caller asks *after* the slot is held, and her answers. */
export interface Policy {
  key: 'deposit_policy' | 'cancellation_policy' | 'no_show_policy' | 'waiting_time_expectation'
  /** What the caller asks, in their words. */
  q: string
  /** What she reads back, built from the field. */
  said: (v: string) => string
  /** What she says when the field is empty — the reason to fill it in. */
  fallback: string
  placeholder: string
  ideas: string[]
}

export const POLICIES: Policy[] = [
  {
    key: 'deposit_policy',
    q: 'Có phải đặt cọc trước không?',
    said: (v) => `Dạ, ${mid(trim(v))} ạ.`,
    fallback: 'Dạ, khoản đặt cọc thì em xin ghi nhận, nhân viên sẽ gọi lại báo anh chị ạ.',
    placeholder: 'VD: Không cần đặt cọc',
    ideas: ['Không cần đặt cọc', 'Đặt cọc 500 nghìn cho ca implant', 'Cọc 20% với ca trên 5 triệu'],
  },
  {
    key: 'cancellation_policy',
    q: 'Bận đột xuất thì huỷ thế nào?',
    said: (v) => `Dạ, ${mid(trim(v))} ạ. Anh chị gọi lại số này báo em là được.`,
    fallback: 'Dạ, anh chị gọi lại số này báo em, em xin ghi nhận để nhân viên sắp lại lịch ạ.',
    placeholder: 'VD: Huỷ trước 2 tiếng, không mất phí',
    ideas: ['Huỷ trước 2 tiếng, không mất phí', 'Báo trước 1 ngày để phòng khám sắp lịch khách khác', 'Huỷ sát giờ nhiều lần thì cần đặt cọc lần sau'],
  },
  {
    key: 'no_show_policy',
    q: 'Lỡ quên không đến thì sao?',
    said: (v) => `Dạ, ${mid(trim(v))} ạ.`,
    fallback: 'Dạ, phòng khám sẽ gọi lại để hẹn ngày khác cho anh chị ạ.',
    placeholder: 'VD: Không phạt, phòng khám gọi nhắc lại hôm sau',
    ideas: ['Không phạt, phòng khám gọi nhắc lại hôm sau', 'Giữ chỗ thêm 15 phút rồi mới nhận khách khác', 'Quên hẹn 2 lần thì lần sau cần đặt cọc'],
  },
  {
    key: 'waiting_time_expectation',
    q: 'Đến rồi có phải chờ lâu không?',
    said: (v) => `Dạ, ${mid(trim(v))} ạ. Anh chị đến đúng giờ hẹn là được ạ.`,
    fallback: 'Dạ, anh chị đến đúng giờ hẹn thì phòng khám nhận ngay ạ.',
    placeholder: 'VD: Thường chờ 10 – 15 phút',
    ideas: ['Thường chờ 10 – 15 phút', 'Có hẹn thì gần như không phải chờ', 'Cuối tuần đông hơn, có thể chờ 20 phút'],
  },
]

/** Her answer to one of the four, whether or not the field has been filled in. */
export function policyLine(p: Policy, value: string): string {
  return trim(value) ? p.said(value) : p.fallback
}

/** A price to name in the try-out prompt, when the clinic has one. */
export function samplePrice(cfg: ReceptionistConfig): string | null {
  const s = cfg.service_catalog.find((x) => x.is_bookable && x.price_from)
  return s?.price_from ? `${s.service_name} ${shortVnd(s.price_from)}` : null
}
