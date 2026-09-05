import { LABELS, WEEKDAY_LONG } from '../defaults'
import { summarizeHours } from '../readiness'
import type { Bundle, InsuranceOption, PaymentMethod, PricingDisclosurePolicy, Promotion, ReceptionistConfig, ServiceRow, Weekday } from '../model'
import { PRICE_QUALIFIER } from '../system'
import { formatVnd } from '../../ui'

/*
 * What the receptionist says, built from the record.
 *
 * Every Kiến thức screen ends in something you can hear (rule 2), and the hub
 * opens with the four questions a clinic's phone actually rings with. The
 * sentences live here, in one place, so the hub card, the sub-page rails and
 * the save-bar captions all voice the same line for the same field — and so
 * a change to how Linh phrases a price is one edit, not six.
 *
 * An `Exchange` is one caller question and her answer. `a` is null when she
 * has nothing to say yet; `missing` then names what is missing, in the words
 * the hub row uses, and `segment` is the sub-page that fixes it.
 */

export interface Exchange {
  /** The Kiến thức sub-page where this answer is edited. */
  segment: string
  /** The caller's line. */
  q: string
  /** The receptionist's line, or null when the record cannot answer yet. */
  a: string | null
  /** What is missing, when `a` is null. */
  missing?: string
  /** One line the answer says about itself — "giờ mẫu, bạn chưa xác nhận". */
  note?: string
}

export const fmtDate = (iso: string): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '…')

/** Local calendar date as ISO — `toISOString` would shift a late evening to tomorrow. */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Lower-cases the first letter so a field value can sit mid-sentence. */
const mid = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** "1.500.000" → "1,5 triệu", "300.000" → "300 nghìn". The way a price is said. */
export function shortVnd(n: number): string {
  if (n >= 1_000_000 && n % 100_000 === 0) return `${(n / 1_000_000).toString().replace('.', ',')} triệu`
  if (n >= 1_000 && n % 1_000 === 0) return `${n / 1_000} nghìn`
  return `${formatVnd(n)} đồng`
}

/**
 * A price as the list shows it: "300–500 nghìn", "1,5 triệu", "800 nghìn – 2
 * triệu", "miễn phí". The spoken shape rather than "300.000 – 500.000 đ": it is
 * what she says, and it is a third of the width, which is what lets a price
 * sit in one column of a one-line row. Null = no price yet.
 */
export function priceShort(from: number | null, to: number | null): string | null {
  if (from == null) return null
  if (from === 0 && (to ?? 0) === 0) return 'miễn phí'
  if (to == null || to === from) return shortVnd(from)
  const [a, ...unitA] = shortVnd(from).split(' ')
  const [b, ...unitB] = shortVnd(to).split(' ')
  return unitA.join(' ') === unitB.join(' ') ? `${a}–${b} ${unitA.join(' ')}` : `${shortVnd(from)} – ${shortVnd(to)}`
}

/** Wallets are brands and keep their capitals; "Tiền mặt" is a common noun and does not. */
const PAYMENT_PROPER_NOUNS: PaymentMethod[] = ['momo', 'zalopay']

/** "Dạ, phòng khám nhận tiền mặt, chuyển khoản ạ." — the named methods, then the clinic's own. */
export function paymentSentence(methods: PaymentMethod[], other: string[] = []): string {
  const ways = [
    ...methods.map((m) => (PAYMENT_PROPER_NOUNS.includes(m) ? LABELS.payment[m] : LABELS.payment[m].toLowerCase())),
    ...other.map((o) => mid(o.trim())).filter(Boolean),
  ]
  return ways.length ? `Dạ, phòng khám nhận ${ways.join(', ')} ạ.` : 'Dạ, phòng khám nhận tiền mặt ạ.'
}

/** The clean deflection for something on `services_not_offered` — said instead of an improvised answer. */
export function notOfferedSentence(item: string): string {
  return `Dạ, hiện phòng khám không làm ${mid(item.trim())} ạ. Em xin lỗi anh chị.`
}

/** "Gói cạo vôi và tẩy trắng gồm cạo vôi răng và tẩy trắng răng, giá 2 triệu, áp dụng khách mới ạ." */
/** The combo's name without a leading "gói" — the sentence supplies its own, and "Gói gói gia đình" is what came out otherwise. */
export function bundleName(b: Bundle): string {
  return b.bundle_name.trim().replace(/^(gói|combo)\s+/i, '') || 'này'
}

export function bundleSentence(b: Bundle, catalog: ServiceRow[]): string {
  const name = bundleName(b)
  const parts = (b.service_ids ?? []).map((id) => catalog.find((s) => s.id === id)?.service_name.trim()).filter((n): n is string => !!n).map(mid)
  const has = parts.length ? ` gồm ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} và ${parts[parts.length - 1]}` : parts[0]}` : ''
  if (b.price == null) return `Gói ${mid(name)}${has} thì em xin ghi nhận, nhân viên sẽ báo giá lại anh chị ạ.`
  const note = b.note.trim() ? `, ${mid(b.note.trim().replace(/[.\s]+$/, ''))}` : ''
  return `Gói ${mid(name)}${has}, giá ${shortVnd(b.price)}${note} ạ. ${PRICE_QUALIFIER}`
}

/**
 * The offer itself, without the "dạ có ạ" around it — what goes into the
 * catalogue's `promo_description` so the field still holds a sentence while
 * the tenant edits services and percentages instead of prose.
 *
 * "giảm" is said once for the whole list, not once per service: "giảm 20%
 * tẩy trắng răng và 10% cạo vôi răng" is how a receptionist says it.
 */
export function promoOffer(p: Promotion, catalog: ServiceRow[]): string {
  const items = (p.promo_services ?? [])
    .map((ps) => {
      const name = catalog.find((s) => s.id === ps.service_id)?.service_name.trim()
      return name ? { name: mid(name), pct: ps.discount_percent } : null
    })
    .filter((x): x is { name: string; pct: number | null } => !!x)
  if (!items.length) return p.promo_name.trim()
  const parts = items.map((i) => (i.pct != null ? `${i.pct}% ${i.name}` : i.name))
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} và ${parts[parts.length - 1]}` : parts[0]
  return items.some((i) => i.pct != null) ? `giảm ${joined}` : `có ưu đãi cho ${joined}`
}

/** "Dạ có ạ, phòng khám đang giảm 20% tẩy trắng răng, áp dụng đến hết 30/09, cho khách mới ạ." */
export function promoSentence(p: Promotion, catalog: ServiceRow[]): string {
  const offer = promoOffer(p, catalog)
  if (!offer) return 'Dạ, hiện phòng khám chưa có chương trình ưu đãi nào ạ.'
  // Not "áp dụng đến hết": the condition clause below often starts with "áp dụng" too.
  const until = p.valid_to ? `, đến hết ${fmtDate(p.valid_to)}` : ''
  const cond = (p.promo_condition ?? '').trim() ? `, ${mid((p.promo_condition ?? '').trim().replace(/[.\s]+$/, ''))}` : ''
  return `Dạ có ạ, phòng khám đang ${offer}${until}${cond} ạ.`
}

/** What the agent would say for one service under the chosen policy. */
export function priceSentence(s: ServiceRow, policy: PricingDisclosurePolicy): string {
  const unit = LABELS.priceUnit[s.price_unit].replace('/ ', 'mỗi ')
  const name = s.service_name.trim() || 'Dịch vụ này'
  if (policy === 'defer' || s.price_from == null)
    return `${name} thì bác sĩ cần thăm khám mới báo giá chính xác được ạ. Em mời anh chị đến khám tư vấn nhé?`
  if (s.price_from === 0 && (s.price_to ?? 0) === 0) return `${name} tại phòng khám là miễn phí ạ.`
  if (policy === 'exact' || s.price_to == null || s.price_to === s.price_from)
    return `${name} tại phòng khám là ${shortVnd(s.price_from)} ${unit}. ${PRICE_QUALIFIER}`
  return `${name} từ ${shortVnd(s.price_from)} đến ${shortVnd(s.price_to)} ${unit}. ${PRICE_QUALIFIER}`
}

export function insuranceSentence(option: InsuranceOption, note: string): string {
  const base =
    option === 'none'
      ? 'Phòng khám không nhận bảo hiểm y tế và cũng chưa liên kết bảo hiểm tư nhân ạ.'
      : option === 'bhyt'
        ? 'Phòng khám có nhận bảo hiểm y tế ạ.'
        : option === 'private'
          ? 'Phòng khám không nhận BHYT, nhưng có hỗ trợ hồ sơ cho bảo hiểm tư nhân ạ.'
          : option === 'both'
            ? 'Phòng khám nhận cả bảo hiểm y tế và bảo hiểm tư nhân ạ.'
            : 'Câu này em xin ghi nhận và nhờ nhân viên gọi lại anh chị ạ.'
  return note.trim() ? `${base} ${note.trim()}` : base
}

export function feeSentence(fee: number | null): string | null {
  if (fee == null) return null
  if (fee === 0) return 'Khám và tư vấn lần đầu miễn phí ạ.'
  return `Phí khám và tư vấn lần đầu là ${shortVnd(fee)} ạ.`
}

/* ------------------------------------------------------------ exchanges */

export function addressExchange(cfg: ReceptionistConfig): Exchange {
  const address = cfg.address_full.trim()
  const landmarks = cfg.location_landmarks.trim()
  return {
    segment: 'dia-diem',
    q: 'Phòng khám mình ở đâu ạ?',
    a: address.length > 5 ? `Phòng khám ở ${address}${landmarks ? `, ${mid(landmarks)}` : ''} ạ.` : null,
    missing: 'Chưa có địa chỉ',
  }
}

export function parkingExchange(cfg: ReceptionistConfig): Exchange {
  const parking = cfg.parking_info.trim()
  return {
    segment: 'dia-diem',
    q: 'Đến bằng xe máy thì gửi ở đâu ạ?',
    a: parking ? `Dạ, ${mid(parking)} ạ.` : null,
    missing: 'Chưa có chỗ gửi xe',
  }
}

function nextOpenDay(cfg: ReceptionistConfig, from: Weekday): Weekday | null {
  for (let i = 1; i <= 7; i += 1) {
    const day = ((from + i) % 7) as Weekday
    const row = cfg.operating_hours_by_weekday.find((r) => r.day === day)
    if (row?.open) return day
  }
  return null
}

/** "T2–T7 08:00–20:00 · CN 08:00–12:00" said aloud: "thứ Hai đến thứ Bảy từ 08:00 đến 20:00, Chủ nhật…". */
export function summarizeWeek(cfg: ReceptionistConfig): string {
  return summarizeHours(cfg)
    .replace(/T([2-7])–T([2-7])/g, (_m, a: string, b: string) => `thứ ${NUM[a]} đến thứ ${NUM[b]}`)
    .replace(/\bT([2-7])\b/g, (_m, a: string) => `thứ ${NUM[a]}`)
    .replace(/\bCN\b/g, 'Chủ nhật')
    .replace(/(\d{2}:\d{2})–(\d{2}:\d{2})/g, 'từ $1 đến $2')
    .replace(/ · /g, ', ')
}

const NUM: Record<string, string> = { '2': 'Hai', '3': 'Ba', '4': 'Tư', '5': 'Năm', '6': 'Sáu', '7': 'Bảy' }

/**
 * What she says about one date — hours, breaks and holidays added together.
 * `label` is how the caller named the day: "Mai", "Thứ Bảy", "Hôm nay".
 */
export function hoursOn(cfg: ReceptionistConfig, date: Date, label: string): string {
  const iso = localIso(date)
  const day = date.getDay() as Weekday
  const when = label.charAt(0).toUpperCase() + label.slice(1)
  const name = WEEKDAY_LONG[day].toLowerCase()
  const said = /^(mai|hôm nay)$/i.test(label) ? `${when} ${name}` : when

  const hol = cfg.holiday_exceptions.find((h) => h.date_from <= iso && iso <= h.date_to)
  if (hol && hol.closure_type === 'closed') {
    const back = new Date(`${hol.date_to}T00:00:00`)
    back.setDate(back.getDate() + 1)
    return `${when} phòng khám nghỉ ${hol.holiday_label || 'lễ'} ạ, mở lại từ ${fmtDate(localIso(back))}.`
  }
  if (hol && hol.modified_hours) return `${when} ${hol.holiday_label || 'lễ'} nên phòng khám chỉ mở từ ${hol.modified_hours.from} đến ${hol.modified_hours.to} ạ.`

  const row = cfg.operating_hours_by_weekday.find((r) => r.day === day)
  if (!row || !row.open) {
    const next = nextOpenDay(cfg, day)
    return `${said} phòng khám nghỉ ạ.${next != null ? ` Anh chị gọi lại ${WEEKDAY_LONG[next].toLowerCase()} giúp em nhé.` : ''}`
  }
  // A lunch break is only worth saying if it falls inside that day's hours —
  // a clinic closing at noon on Sunday has no 12:00–13:30 break to mention.
  const brk = cfg.break_periods.find((b) => (b.days.length === 0 || b.days.includes(day)) && b.from < row.to && b.to > row.from)
  return `${said} phòng khám mở từ ${row.from} đến ${row.to}${brk ? `, nghỉ trưa ${brk.from} đến ${brk.to}` : ''} ạ.`
}

/** "Mai mấy giờ mở cửa?" — tomorrow, with the template caveat until confirmed. */
export function hoursExchange(cfg: ReceptionistConfig, now = new Date()): Exchange {
  const agent = cfg.agent_name || 'Linh'
  const t = new Date(now)
  t.setDate(t.getDate() + 1)
  return {
    segment: 'gio-mo-cua',
    q: 'Mai phòng khám mấy giờ mở cửa ạ?',
    a: hoursOn(cfg, t, 'Mai'),
    note: cfg.operating_hours_confirmed ? undefined : `Giờ mẫu theo ngành nha khoa — ${agent} chỉ đọc sau khi bạn xác nhận.`,
  }
}

/** "Sát giờ đóng cửa qua có kịp không?" — she reads today's closing time. */
export function closingToday(cfg: ReceptionistConfig, now = new Date()): string {
  const row = cfg.operating_hours_by_weekday.find((r) => r.day === (now.getDay() as Weekday))
  if (!row || !row.open) return hoursOn(cfg, now, 'Hôm nay')
  return `Dạ, hôm nay phòng khám mở đến ${row.to} ạ, anh chị đến trước giờ đó giúp em nhé.`
}

export function tetExchange(cfg: ReceptionistConfig): Exchange {
  const tet = cfg.holiday_exceptions.find((h) => /tết nguyên đán/i.test(h.holiday_label))
  return {
    segment: 'gio-mo-cua',
    q: 'Tết bên mình nghỉ ngày nào ạ?',
    a: tet ? `Tết phòng khám nghỉ từ ${fmtDate(tet.date_from)} đến hết ${fmtDate(tet.date_to)} ạ. Em đặt lịch cho anh chị sau Tết nhé?` : null,
    missing: 'Chưa có ngày nghỉ Tết',
    note: tet && !cfg.holidays_confirmed ? 'Ngày Fonnus gợi ý sẵn — bạn chưa xác nhận.' : undefined,
  }
}

export function priceExchange(cfg: ReceptionistConfig, svc: ServiceRow): Exchange {
  const name = svc.service_name.trim() || 'Dịch vụ này'
  const unpriced = cfg.pricing_disclosure_policy !== 'defer' && svc.price_from == null
  return {
    segment: 'dich-vu',
    q: `${name} bên mình bao nhiêu tiền ạ?`,
    a: unpriced ? null : priceSentence(svc, cfg.pricing_disclosure_policy),
    missing: `Chưa có giá ${mid(name)}`,
  }
}

export function instalmentExchange(cfg: ReceptionistConfig): Exchange {
  const v = cfg.instalment_options.trim()
  return {
    segment: 'dich-vu',
    q: 'Có trả góp không ạ?',
    a: v ? (/^không/i.test(v) ? `${v} ạ.` : `Dạ có, ${mid(v)} ạ.`) : null,
    missing: 'Chưa nói có trả góp hay không',
  }
}

export function insuranceExchange(cfg: ReceptionistConfig): Exchange {
  const p = cfg.insurance_bhyt_policy
  return {
    segment: 'bao-hiem',
    q: 'Bên mình có nhận bảo hiểm y tế không ạ?',
    a: p.option === 'unset' ? null : insuranceSentence(p.option, p.note),
    missing: 'Chưa chọn có nhận BHYT hay không',
  }
}

export function feeExchange(cfg: ReceptionistConfig): Exchange {
  return {
    segment: 'bao-hiem',
    q: 'Khám lần đầu có mất phí không ạ?',
    a: feeSentence(cfg.consultation_fee),
    missing: 'Chưa có phí khám ban đầu',
  }
}

export function facilityExchange(cfg: ReceptionistConfig): Exchange {
  const list = cfg.facility_capabilities
  return {
    segment: 'bao-hiem',
    q: 'Có chụp phim tại chỗ không ạ?',
    a: list.length ? `Dạ có, phòng khám có ${list.join(', ')} tại chỗ ạ.` : null,
    missing: 'Chưa có thiết bị tại phòng khám',
  }
}

export function prepExchange(cfg: ReceptionistConfig): Exchange {
  const v = cfg.pre_appointment_instructions.trim()
  return {
    segment: 'bao-hiem',
    q: 'Em cần mang theo gì không ạ?',
    a: v ? `${v.replace(/[.\s]+$/, '')} ạ.` : null,
    missing: 'Chưa có hướng dẫn chuẩn bị',
  }
}
