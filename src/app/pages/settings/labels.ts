import type { AccountSession, Invoice, PayMethod, PlanId } from '../../../api'
import type { IconName } from '../../../design-system'
import { fmtNumber, PAY_METHODS } from '../numbers/labels'
import { parseYmd } from './usage'

/*
 * Every word Cài đặt and Gói dịch vụ put around the API's machine codes.
 */

export const PLAN_ORDER: readonly PlanId[] = ['basic', 'standard', 'advanced']

export const PLAN_NAME: Record<PlanId, string> = { basic: 'Cơ bản', standard: 'Tiêu chuẩn', advanced: 'Nâng cao' }

export const PLAN_BLURB: Record<PlanId, string> = {
  basic: 'Một phòng khám, một số máy chính',
  standard: 'Phòng khám 1–2 cơ sở',
  advanced: 'Nhiều cơ sở, nhiều máy cùng đổ chuông',
}

const SLUG: Record<PlanId, string> = { basic: 'co-ban', standard: 'tieu-chuan', advanced: 'nang-cao' }

export const planSlug = (id: PlanId): string => SLUG[id]

export function planFromSlug(slug: string | undefined): PlanId | null {
  return PLAN_ORDER.find((id) => SLUG[id] === slug) ?? null
}

export const fmtVnd = (n: number): string => `${Math.round(n).toLocaleString('vi-VN')}đ`
export const fmtCount = (n: number): string => Math.round(n).toLocaleString('vi-VN')

const pad = (n: number) => String(n).padStart(2, '0')

export function dm(ymd: string): string {
  const d = parseYmd(ymd)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

export function dmy(ymd: string): string {
  const d = parseYmd(ymd)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function clockDm(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export const dowOf = (ymd: string): string => DOW[parseYmd(ymd).getDay()]

/** 0914 378 064 — a mobile in the groups people read it aloud in. */
export function fmtMobile(raw: string): string {
  const d = raw.replace(/\D/g, '')
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : fmtNumber(d)
}

/** 0109 876 543 — a tax code grouped the way it is printed on an invoice. */
export function fmtTaxCode(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  if (d.length === 13) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)}-${d.slice(10)}`
  return raw
}

export function payLabel(method: PayMethod): string {
  return PAY_METHODS.find((m) => m.id === method)?.label ?? ''
}

/** The label mid-sentence: "Kỳ tới trả bằng chuyển khoản QR". */
export function payInSentence(method: PayMethod): string {
  const label = payLabel(method)
  return label.charAt(0).toLowerCase() + label.slice(1)
}

export function payIcon(method: PayMethod): IconName {
  return PAY_METHODS.find((m) => m.id === method)?.icon ?? 'card'
}

export const DEVICE_ICON:Record<AccountSession['device'], IconName> = {
  desktop: 'device-laptop',
  tablet: 'device-phone',
  phone: 'device-phone',
}

export function sessionName(s: AccountSession): string {
  return `${s.browser} · ${s.os}`
}

/** "đang dùng", "2 giờ trước", "hôm qua, 21:14", "08/09". */
export function lastSeen(s: AccountSession, now = new Date()): string {
  if (s.current) return 'đang dùng'
  const t = new Date(s.last_active_at)
  const mins = Math.round((now.getTime() - t.getTime()) / 60_000)
  if (mins < 60) return `${Math.max(1, mins)} phút trước`
  const sameDay = t.toDateString() === now.toDateString()
  if (sameDay) return `${Math.round(mins / 60)} giờ trước`
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (t.toDateString() === yesterday.toDateString()) return `hôm qua, ${pad(t.getHours())}:${pad(t.getMinutes())}`
  return `${pad(t.getDate())}/${pad(t.getMonth() + 1)}`
}

export function invoiceWhat(i: Invoice): string {
  if (i.kind === 'number' && i.number) return `Số ${fmtNumber(i.number)}`
  return i.plan_id ? `Gói ${PLAN_NAME[i.plan_id]}` : 'Hoá đơn'
}

export function invoiceSub(i: Invoice): string {
  if (i.kind === 'number') return 'Phí mở số, một lần'
  const period = i.period ? `Kỳ ${dm(i.period.start)} – ${dm(i.period.end)}` : ''
  const over = i.overage_minutes ? `vượt ${fmtCount(i.overage_minutes)} phút` : ''
  return [period, over].filter(Boolean).join(' · ')
}
