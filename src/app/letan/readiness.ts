import { isValidPhone } from '../../auth/phone'
import type { ReceptionistConfig } from './model'

/*
 * Readiness — how much of what the receptionist could know she actually
 * knows, measured the way the owner sees the product: thirteen sections under
 * three tabs, each one a row on its hub.
 *
 * Every section is a short list of checks. A check is a fact the owner can
 * supply ("Có nhận BHYT không?"), carries how long it takes, and may be worth
 * part of a point (11 of 12 services priced is 0.92 of the price check). A
 * section's progress is the mean of its checks, a tab's is the mean of its
 * sections, and the one number is the mean of all thirteen sections — so the
 * ring on the hub, split by tab, adds up to the number in its middle.
 *
 * The catalogue's gates decide the three levels, not the percentage:
 *
 *   Nghe máy được   every R1 check — she can pick up, say who she is, give the
 *                   address and hours, and hand over to a person.
 *   Trả lời tốt     every R2 check too — prices, holidays, BHYT, booking, the
 *                   on-call number. Safe with real patients.
 *   Lành nghề       everything on every page.
 *
 * The gates stay here and never reach a field label as a "bắt buộc" chip
 * (ui-ux-principles.md §1). What the owner sees is the level she is on, and
 * the next few jobs that move her up — ordered by what a minute buys.
 */

export type Gate = 'R1' | 'R2' | 'O'
export type LeTanTabKey = 'ho-so' | 'kien-thuc' | 'ky-nang'

export interface Check {
  id: string
  /** What to do, in the owner's words: a job title, not a field name. */
  label: string
  gate: Gate
  /** 0–1. Most checks are 0 or 1; a list that is partly filled is in between. */
  value: number
  /** Rough owner effort, seconds. */
  effort: number
}

export interface SectionReadiness {
  tab: LeTanTabKey
  /** The route segment under the tab — `danh-tinh`, `dich-vu`. */
  key: string
  checks: Check[]
  /** 0–1. */
  progress: number
}

export interface TabReadiness {
  key: LeTanTabKey
  name: string
  sections: SectionReadiness[]
  /** 0–1: the mean of its sections. */
  progress: number
  /** Sections at 100%. */
  complete: number
}

export interface Job extends Check {
  tab: LeTanTabKey
  section: string
  /** Whole percentage points the one number gains when this is done (≥ 1). */
  gain: number
}

export type LevelKey = 'answer' | 'good' | 'expert'

export const LEVELS: { key: LevelKey; label: string }[] = [
  { key: 'answer', label: 'Nghe máy được' },
  { key: 'good', label: 'Trả lời tốt' },
  { key: 'expert', label: 'Lành nghề' },
]

export interface Readiness {
  sections: SectionReadiness[]
  tabs: TabReadiness[]
  /** 0–100, the mean of all sections. */
  percent: number
  /** How many levels are reached: 0, 1, 2 or 3. */
  reached: number
  /** What is left to reach the next level, best value per minute first. Empty at the top. */
  jobs: Job[]
  r1Done: boolean
  r2Done: boolean
}

const TAB_NAMES: Record<LeTanTabKey, string> = { 'ho-so': 'Hồ sơ', 'kien-thuc': 'Kiến thức', 'ky-nang': 'Kỹ năng' }

const anyPhone = (v: string) => isValidPhone(v) || /^0\d{9,10}$/.test(v.replace(/\D/g, ''))
const filled = (v: string) => v.trim().length > 0
const yes = (b: boolean) => (b ? 1 : 0)
const share = (n: number, of: number) => (of > 0 ? Math.min(1, n / of) : 0)

export function pricedCount(cfg: ReceptionistConfig): number {
  return cfg.service_catalog.filter((s) => s.price_from != null).length
}

/** The thirteen sections and their checks, in the order their hubs list them. */
function sectionChecks(cfg: ReceptionistConfig): Omit<SectionReadiness, 'progress'>[] {
  const agent = cfg.agent_name.trim() || 'Linh'
  const services = cfg.service_catalog.filter((s) => s.service_name.trim())
  const unpriced = services.length - services.filter((s) => s.price_from != null).length
  const faqs = cfg.faq_pairs.filter((f) => f.question.trim() && f.answer.trim()).length
  const ownTerms = cfg.keyterms.filter((k) => k.source === 'tenant' && k.term.trim())
  const spelled = ownTerms.filter((k) => k.phonetic_hint.trim()).length

  return [
    {
      tab: 'ho-so',
      key: 'danh-tinh',
      checks: [
        { id: 'agent_name', label: 'Đặt tên cho lễ tân', gate: 'O', value: yes(filled(cfg.agent_name)), effort: 10 },
        { id: 'greeting_script_custom', label: 'Viết lời chào của phòng khám', gate: 'O', value: yes(filled(cfg.greeting_script_custom)), effort: 60 },
        { id: 'greeting_by_daypart', label: 'Lời chào khác theo buổi', gate: 'O', value: yes(cfg.greeting_by_daypart.enabled), effort: 90 },
      ],
    },
    {
      tab: 'ho-so',
      key: 'giong-noi',
      checks: [{ id: 'voice_selection', label: 'Chọn giọng nói', gate: 'R1', value: yes(!!cfg.voice_selection), effort: 10 }],
    },
    {
      tab: 'ho-so',
      key: 'chi-dan',
      checks: [{ id: 'tenant_instructions', label: `Dặn ${agent} vài điều riêng`, gate: 'O', value: yes(filled(cfg.tenant_instructions)), effort: 120 }],
    },

    {
      tab: 'kien-thuc',
      key: 'dia-diem',
      checks: [
        { id: 'business_name', label: 'Tên phòng khám', gate: 'R1', value: yes(cfg.business_name.trim().length > 1), effort: 10 },
        { id: 'city', label: 'Thành phố', gate: 'R1', value: yes(!!cfg.city), effort: 5 },
        { id: 'address_full', label: 'Địa chỉ phòng khám', gate: 'R1', value: yes(cfg.address_full.trim().length > 5), effort: 25 },
        { id: 'directions', label: 'Mốc để chỉ đường', gate: 'O', value: yes(filled(cfg.location_landmarks) || filled(cfg.directions_note)), effort: 40 },
        { id: 'parking_info', label: 'Chỗ gửi xe', gate: 'O', value: yes(filled(cfg.parking_info)), effort: 20 },
      ],
    },
    {
      tab: 'kien-thuc',
      key: 'gio-mo-cua',
      checks: [
        { id: 'operating_hours', label: 'Xác nhận giờ mở cửa', gate: 'R1', value: yes(cfg.operating_hours_confirmed && cfg.operating_hours_by_weekday.some((d) => d.open)), effort: 20 },
        { id: 'holiday_exceptions', label: 'Xác nhận lịch nghỉ Tết và ngày lễ', gate: 'R2', value: yes(cfg.holidays_confirmed), effort: 40 },
      ],
    },
    {
      tab: 'kien-thuc',
      key: 'dich-vu',
      checks: [
        {
          id: 'service_catalog',
          label: !services.length ? 'Thêm dịch vụ và giá' : unpriced === 1 ? 'Giá cho 1 dịch vụ còn thiếu' : `Giá cho ${unpriced} dịch vụ còn thiếu`,
          gate: 'R2',
          // "Không báo giá" is an answer too: she defers every price, so there is nothing left to fill.
          value: cfg.pricing_disclosure_policy === 'defer' ? yes(services.length > 0) : share(services.length - unpriced, services.length),
          effort: Math.max(40, unpriced * 40),
        },
        { id: 'payment_methods', label: 'Cách thanh toán', gate: 'O', value: yes(cfg.payment_methods.length > 0 || cfg.payment_methods_other.length > 0), effort: 15 },
      ],
    },
    {
      tab: 'kien-thuc',
      key: 'bao-hiem',
      checks: [
        { id: 'insurance_bhyt_policy', label: 'Có nhận BHYT không?', gate: 'R2', value: yes(cfg.insurance_bhyt_policy.option !== 'unset'), effort: 10 },
        { id: 'consultation_fee', label: 'Phí khám ban đầu', gate: 'O', value: yes(cfg.consultation_fee != null), effort: 15 },
      ],
    },
    {
      tab: 'kien-thuc',
      key: 'bac-si',
      checks: [{ id: 'practitioner_roster', label: 'Thêm bác sĩ', gate: 'O', value: yes(cfg.practitioner_roster.some((p) => p.practitioner_name.trim())), effort: 120 }],
    },
    {
      tab: 'kien-thuc',
      key: 'cau-hoi',
      // Three answered questions is what "has an FAQ" means; one is a start.
      checks: [{ id: 'faq_pairs', label: faqs ? 'Thêm vài câu hỏi thường gặp' : 'Thêm câu hỏi thường gặp', gate: 'O', value: share(faqs, 3), effort: 60 * (3 - Math.min(3, faqs)) || 60 }],
    },
    {
      tab: 'kien-thuc',
      key: 'tu-khoa',
      checks: [{ id: 'keyterms', label: 'Cách đọc tên riêng', gate: 'O', value: ownTerms.length ? share(spelled, ownTerms.length) : 0, effort: 60 }],
    },

    {
      tab: 'ky-nang',
      key: 'chuyen-may',
      checks: [
        { id: 'escalation_targets', label: 'Số máy chuyển cho người thật', gate: 'R1', value: yes(cfg.escalation_targets.some((t) => anyPhone(t.phone))), effort: 15 },
        { id: 'after_hours_emergency_target', label: 'Số bác sĩ trực khẩn cấp', gate: 'R2', value: yes(anyPhone(cfg.after_hours_emergency_target.phone)), effort: 30 },
      ],
    },
    {
      tab: 'ky-nang',
      key: 'dat-lich',
      checks: [
        { id: 'slot_rules', label: `Ngày ${agent} được nhận hẹn`, gate: 'O', value: yes(cfg.slot_rules.some((r) => r.enabled)), effort: 30 },
        { id: 'ai_bookable_slots_per_day', label: `Số chỗ ${agent} được tự giữ`, gate: 'R2', value: yes(cfg.ai_bookable_slots_per_day > 0), effort: 5 },
        { id: 'slot_duration', label: 'Thời lượng một cuộc hẹn', gate: 'R2', value: yes(cfg.slot_duration > 0), effort: 5 },
        { id: 'booking_confirmation_channel', label: 'Kênh xác nhận hẹn', gate: 'R2', value: yes(!!cfg.booking_confirmation_channel), effort: 5 },
      ],
    },
    {
      tab: 'ky-nang',
      key: 'gui-email',
      checks: [{ id: 'email_rules', label: 'Nhận email sau cuộc gọi', gate: 'O', value: yes(cfg.email_rules.some((r) => r.enabled && r.recipients.length > 0)), effort: 30 }],
    },
  ]
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : 0)

export function computeReadiness(cfg: ReceptionistConfig): Readiness {
  const sections: SectionReadiness[] = sectionChecks(cfg).map((s) => ({ ...s, progress: mean(s.checks.map((c) => c.value)) }))
  const tabs: TabReadiness[] = (Object.keys(TAB_NAMES) as LeTanTabKey[]).map((key) => {
    const own = sections.filter((s) => s.tab === key)
    return { key, name: TAB_NAMES[key], sections: own, progress: mean(own.map((s) => s.progress)), complete: own.filter((s) => s.progress >= 1).length }
  })

  const all = sections.flatMap((s) => s.checks.map((c) => ({ ...c, tab: s.tab, section: s.key, weight: 1 / (sections.length * s.checks.length) })))
  const open = all.filter((c) => c.value < 1)
  const r1Done = !open.some((c) => c.gate === 'R1')
  const r2Done = r1Done && !open.some((c) => c.gate === 'R2')
  const percent = Math.round(mean(sections.map((s) => s.progress)) * 100)
  const reached = r2Done ? (open.length ? 2 : 3) : r1Done ? 1 : 0

  // The jobs for the next level only: a level is a promise about what she can
  // do, and "lên Trả lời tốt" should not be padded with nice-to-haves.
  const next = reached === 0 ? open.filter((c) => c.gate === 'R1') : reached === 1 ? open.filter((c) => c.gate === 'R2') : open
  const jobs: Job[] = next
    .map(({ weight, ...c }) => ({ ...c, gain: Math.max(1, Math.round(weight * (1 - c.value) * 100)) }))
    .sort((a, b) => b.gain / b.effort - a.gain / a.effort)

  return { sections, tabs, percent, reached, jobs, r1Done, r2Done }
}

export function sectionReadiness(r: Readiness, key: string): SectionReadiness | undefined {
  return r.sections.find((s) => s.key === key)
}

/** "10 giây", "2 phút" — how long a job takes, rounded the way a person says it. */
export function effortLabel(seconds: number): string {
  if (seconds < 60) return `${Math.max(5, Math.round(seconds / 5) * 5)} giây`
  return `${Math.round(seconds / 60)} phút`
}

/** Human summary of the weekly hours, for hub cards and greetings. */
export function summarizeHours(cfg: ReceptionistConfig): string {
  const open = cfg.operating_hours_by_weekday.filter((d) => d.open)
  if (!open.length) return 'Chưa có giờ làm việc'
  const groups: { days: number[]; from: string; to: string }[] = []
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const row = cfg.operating_hours_by_weekday.find((r) => r.day === d)
    if (!row || !row.open) continue
    const last = groups[groups.length - 1]
    if (last && last.from === row.from && last.to === row.to) last.days.push(d)
    else groups.push({ days: [d], from: row.from, to: row.to })
  }
  const name = (d: number) => (d === 0 ? 'CN' : `T${d + 1}`)
  return groups
    .map((g) => `${g.days.length > 1 ? `${name(g.days[0])}–${name(g.days[g.days.length - 1])}` : name(g.days[0])} ${g.from}–${g.to}`)
    .join(' · ')
}

/*
 * The clinic's wall clock. Hours, breaks and holiday dates in the record are all
 * Asia/Ho_Chi_Minh, so "now" is read on that clock too — the date, the time and
 * the weekday from one reading. Taking the date from UTC and the time from the
 * browser put 00:00–07:00 on the previous day's holiday.
 */
const CLINIC_CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function clinicClock(now: Date): { iso: string; hhmm: string; day: ReceptionistConfig['operating_hours_by_weekday'][number]['day'] } {
  const parts = CLINIC_CLOCK.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  const iso = `${part('year')}-${part('month')}-${part('day')}`
  // The weekday of that calendar date, whatever zone the browser is in.
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay() as ReceptionistConfig['operating_hours_by_weekday'][number]['day']
  return { iso, hhmm: `${part('hour')}:${part('minute')}`, day }
}

/** `is_open_now` (SD) — derived from hours, breaks and holidays, for the live indicator. */
export function isOpenNow(cfg: ReceptionistConfig, now = new Date()): boolean {
  const { iso, hhmm, day } = clinicClock(now)
  const hol = cfg.holiday_exceptions.find((h) => h.date_from <= iso && iso <= h.date_to)
  if (hol) {
    if (hol.closure_type === 'closed') return false
    if (hol.modified_hours) return hol.modified_hours.from <= hhmm && hhmm < hol.modified_hours.to
  }
  const row = cfg.operating_hours_by_weekday.find((r) => r.day === day)
  if (!row || !row.open) return false
  if (!(row.from <= hhmm && hhmm < row.to)) return false
  const onBreak = cfg.break_periods.some((b) => (b.days.length === 0 || b.days.includes(day)) && b.from <= hhmm && hhmm < b.to)
  return !onBreak
}
