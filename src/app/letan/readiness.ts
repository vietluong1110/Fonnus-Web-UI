import { isValidPhone } from '../../auth/phone'
import type { ReceptionistConfig } from './model'

/*
 * Readiness = the catalogue's gates applied to the record.
 *
 * R1 — the agent can pick up, say who it is, state the address and hours,
 *      escalate to a human. About 90 seconds of tenant effort.
 * R2 — the agent can quote prices and book, and is safe with real patients.
 *      12–18 minutes, most of it the service table.
 *
 * Each check points at the app path where it is fixed, so the hub and the
 * question rail can deep-link.
 */

export interface Check {
  id: string
  gate: 'R1' | 'R2'
  label: string
  done: boolean
  /** Segments after `#/app/le-tan/`. */
  path: string[]
  /** Rough tenant effort, seconds. */
  effort: number
}

export interface Readiness {
  checks: Check[]
  r1: Check[]
  r2: Check[]
  r1Done: boolean
  r2Done: boolean
  /** 0–100 across every R1 + R2 check, R1 weighted double. */
  percent: number
  missing: Check[]
  remainingMinutes: number
}

const anyPhone = (v: string) => isValidPhone(v) || /^0\d{9,10}$/.test(v.replace(/\D/g, ''))

export function pricedCount(cfg: ReceptionistConfig): number {
  return cfg.service_catalog.filter((s) => s.price_from != null).length
}

export function computeReadiness(cfg: ReceptionistConfig): Readiness {
  const checks: Check[] = [
    { id: 'business_name', gate: 'R1', label: 'Tên phòng khám', done: cfg.business_name.trim().length > 1, path: ['kien-thuc', 'dia-diem'], effort: 10 },
    { id: 'industry_vertical', gate: 'R1', label: 'Lĩnh vực', done: !!cfg.industry_vertical, path: ['kien-thuc', 'dia-diem'], effort: 5 },
    { id: 'city', gate: 'R1', label: 'Thành phố', done: !!cfg.city, path: ['kien-thuc', 'dia-diem'], effort: 5 },
    { id: 'address_full', gate: 'R1', label: 'Địa chỉ', done: cfg.address_full.trim().length > 5, path: ['kien-thuc', 'dia-diem'], effort: 25 },
    {
      id: 'operating_hours_by_weekday',
      gate: 'R1',
      label: 'Xác nhận giờ làm việc',
      done: cfg.operating_hours_confirmed && cfg.operating_hours_by_weekday.some((d) => d.open),
      path: ['kien-thuc', 'gio-mo-cua'],
      effort: 20,
    },
    {
      id: 'escalation_targets',
      gate: 'R1',
      label: 'Số máy để chuyển cho người thật',
      done: cfg.escalation_targets.some((t) => anyPhone(t.phone)),
      path: ['ky-nang', 'chuyen-may'],
      effort: 15,
    },
    { id: 'voice_selection', gate: 'R1', label: 'Giọng nói', done: !!cfg.voice_selection, path: ['ho-so', 'giong-noi'], effort: 10 },

    {
      id: 'holiday_exceptions',
      gate: 'R2',
      label: 'Xác nhận lịch nghỉ Tết và ngày lễ',
      done: cfg.holidays_confirmed,
      path: ['kien-thuc', 'gio-mo-cua'],
      effort: 40,
    },
    {
      id: 'service_catalog',
      gate: 'R2',
      label: 'Bảng giá dịch vụ',
      done: cfg.pricing_disclosure_policy === 'defer' || (cfg.service_catalog.length > 0 && cfg.service_catalog.every((s) => s.price_from != null)),
      path: ['kien-thuc', 'dich-vu'],
      effort: Math.max(40, (cfg.service_catalog.length - pricedCount(cfg)) * 40),
    },
    { id: 'pricing_disclosure_policy', gate: 'R2', label: 'Cách báo giá', done: !!cfg.pricing_disclosure_policy, path: ['kien-thuc', 'dich-vu'], effort: 5 },
    { id: 'insurance_bhyt_policy', gate: 'R2', label: 'BHYT và bảo hiểm', done: cfg.insurance_bhyt_policy.option !== 'unset', path: ['kien-thuc', 'bao-hiem'], effort: 10 },
    { id: 'ai_bookable_slots_per_day', gate: 'R2', label: 'Số chỗ Linh được tự đặt', done: cfg.ai_bookable_slots_per_day > 0, path: ['ky-nang', 'dat-lich'], effort: 5 },
    { id: 'slot_duration', gate: 'R2', label: 'Thời lượng một cuộc hẹn', done: cfg.slot_duration > 0, path: ['ky-nang', 'dat-lich'], effort: 5 },
    { id: 'booking_confirmation_channel', gate: 'R2', label: 'Kênh xác nhận hẹn', done: !!cfg.booking_confirmation_channel, path: ['ky-nang', 'dat-lich'], effort: 5 },
    { id: 'after_hours_routine_behavior', gate: 'R2', label: 'Cuộc gọi thường ngoài giờ', done: !!cfg.after_hours_routine_behavior, path: ['ky-nang', 'chuyen-may'], effort: 5 },
    {
      id: 'after_hours_emergency_target',
      gate: 'R2',
      label: 'Số bác sĩ trực khẩn cấp',
      done: anyPhone(cfg.after_hours_emergency_target.phone),
      path: ['ky-nang', 'chuyen-may'],
      effort: 15,
    },
  ]

  const r1 = checks.filter((c) => c.gate === 'R1')
  const r2 = checks.filter((c) => c.gate === 'R2')
  const r1Done = r1.every((c) => c.done)
  const r2Done = r2.every((c) => c.done)
  const weight = (c: Check) => (c.gate === 'R1' ? 2 : 1)
  const total = checks.reduce((n, c) => n + weight(c), 0)
  const got = checks.reduce((n, c) => n + (c.done ? weight(c) : 0), 0)
  const missing = checks.filter((c) => !c.done)
  const remainingMinutes = Math.ceil(missing.reduce((n, c) => n + c.effort, 0) / 60)

  return { checks, r1, r2, r1Done, r2Done, percent: Math.round((got / total) * 100), missing, remainingMinutes }
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

/** `is_open_now` (SD) — derived from hours, breaks and holidays, for the live indicator. */
export function isOpenNow(cfg: ReceptionistConfig, now = new Date()): boolean {
  const iso = now.toISOString().slice(0, 10)
  const hol = cfg.holiday_exceptions.find((h) => h.date_from <= iso && iso <= h.date_to)
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (hol) {
    if (hol.closure_type === 'closed') return false
    if (hol.modified_hours) return hol.modified_hours.from <= hhmm && hhmm < hol.modified_hours.to
  }
  const day = now.getDay() as ReceptionistConfig['operating_hours_by_weekday'][number]['day']
  const row = cfg.operating_hours_by_weekday.find((r) => r.day === day)
  if (!row || !row.open) return false
  if (!(row.from <= hhmm && hhmm < row.to)) return false
  const onBreak = cfg.break_periods.some((b) => (b.days.length === 0 || b.days.includes(day)) && b.from <= hhmm && hhmm < b.to)
  return !onBreak
}
