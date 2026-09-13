import type { ForwardMode, NumberPattern, PayMethod } from '../../../api'
import type { IconName } from '../../../design-system'
import { formatBusinessPhone, normalizePhone } from '../../../auth/phone'

/*
 * Every word the Số điện thoại tab puts around the API's machine codes.
 */

/** 024 7307 7199 — fixed lines grouped in fours, the way a clinic's sign prints them. */
export const fmtNumber = (digits: string): string => formatBusinessPhone(digits)

/** A number an owner could have dialled from: a mobile (10 digits) or a landline (11). */
export function isDialable(raw: string): boolean {
  const d = normalizePhone(raw)
  return d.length === 10 || d.length === 11
}

export const fmtVnd = (n: number): string => `${n.toLocaleString('vi-VN')}đ`

const pad = (n: number) => String(n).padStart(2, '0')

export function clock(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dmy(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** A city as a sign abbreviates it. Unknown areas fall back to the server's city name. */
const AREA_SHORT: Record<string, string> = { '024': 'HN', '028': 'HCM', '0236': 'ĐN' }

/** The fine print under a number in the kho: `HN · 400.000đ, một lần`. */
export function tileFine(n: { area: { code: string; city: string }; price_vnd: number }): string {
  return `${AREA_SHORT[n.area.code] ?? n.area.city} · ${fmtVnd(n.price_vnd)}, một lần`
}

export const initialOf =(name: string): string => (name.trim().charAt(0) || '?').toUpperCase()

export const PATTERNS: readonly NumberPattern[] = ['loc_phat', 'than_tai', 'tu_quy', 'sanh_tien', 'de_nho']

export const PATTERN_LABEL: Record<NumberPattern, string> = {
  loc_phat: 'Lộc phát',
  than_tai: 'Thần tài',
  tu_quy: 'Tứ quý',
  sanh_tien: 'Sảnh tiến',
  de_nho: 'Dễ nhớ',
}

export const PAY_METHODS: readonly { id: PayMethod; label: string; icon: IconName }[] = [
  { id: 'vietqr', label: 'Chuyển khoản QR', icon: 'qr' },
  { id: 'card', label: 'Thẻ ngân hàng', icon: 'card' },
  { id: 'momo', label: 'Ví MoMo', icon: 'wallet' },
]

export const PAY_TITLE: Record<PayMethod, string> = {
  vietqr: 'Chuyển khoản',
  card: 'Thanh toán bằng thẻ',
  momo: 'Thanh toán bằng MoMo',
}

/**
 * The carrier codes for call forwarding. These are the GSM supplementary-service
 * codes most Vietnamese lines accept; a clinic's own switchboard may differ, and
 * they are to be confirmed per carrier (docs/open-questions.md Q25).
 */
export const FORWARD_MODES: readonly { id: ForwardMode; label: string; icon: IconName; code: string }[] = [
  { id: 'all', label: 'Mọi cuộc gọi', icon: 'incoming', code: '21' },
  { id: 'no_answer', label: 'Khi không ai nghe', icon: 'missed', code: '61' },
  { id: 'busy', label: 'Khi máy bận', icon: 'answered', code: '67' },
]

export const modeOf = (m: ForwardMode) => FORWARD_MODES.find((x) => x.id === m) ?? FORWARD_MODES[0]

export const cancelCode = (m: ForwardMode): string => `#${modeOf(m).code}#`

/** What reaches the Fonnus number, as the fact row says it. */
export function forwardLine(m: ForwardMode): string {
  if (m === 'all') return 'Mọi cuộc gọi'
  if (m === 'no_answer') return 'Cuộc gọi không ai nghe'
  return 'Cuộc gọi lúc máy bận'
}

/** The guide's last step, true to the mode chosen. */
export function lastStep(m: ForwardMode, name: string): string {
  const when = m === 'all' ? 'gọi thử số cũ, ' : m === 'busy' ? 'khi số cũ bận, ' : 'khi không ai nghe số cũ, '
  return `Nghe tiếng báo là xong — ${when}${name} sẽ nghe máy.`
}

export interface Run {
  text: string
  tone: 'soft' | 'lit' | 'plain'
}

/**
 * A number as runs of text: the area code quiet, the digits that matter lit —
 * what was searched for, or else the pattern's tail.
 */
export function numberRuns(num: string, lit: number, q: string): Run[] {
  const d = num.replace(/\D/g, '')
  const mark = new Set<number>()
  if (q && d.endsWith(q)) for (let i = d.length - q.length; i < d.length; i++) mark.add(i)
  else if (q && d.lastIndexOf(q) >= 3) {
    const at = d.lastIndexOf(q)
    for (let i = at; i < at + q.length; i++) mark.add(i)
  } else if (lit > 0) for (let i = d.length - lit; i < d.length; i++) mark.add(i)

  const out: Run[] = []
  let di = 0
  for (const ch of fmtNumber(d)) {
    let tone: Run['tone']
    if (ch === ' ') tone = out.length ? out[out.length - 1].tone : 'plain'
    else {
      tone = di < 3 ? 'soft' : mark.has(di) ? 'lit' : 'plain'
      di += 1
    }
    const last = out[out.length - 1]
    if (last && last.tone === tone) last.text += ch
    else out.push({ text: ch, tone })
  }
  return out
}
