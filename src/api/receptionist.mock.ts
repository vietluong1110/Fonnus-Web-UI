/**
 * The receptionist, with no model behind her.
 *
 * The try-out panel on every Lễ tân sub-page sends a caller's line here and
 * gets her reply. Live, that is a model reading the whole record; here it is
 * intent matching on the folded text — the same regexes for "mấy giờ mở
 * cửa" that a Vietnamese caller would actually say — and the sentence
 * builders in `knowledge/answers.ts`, so the panel and the rest of the app
 * voice the same line for the same field.
 *
 * What it gets right is what the config screens change: the address, the
 * hours for the day the caller named, a price under the chosen policy, the
 * BHYT answer, the doctor's days, an FAQ pair, the standing orders' four
 * sample rules, and the formal/friendly register. What it cannot do is
 * reason; anything it does not recognise gets the honest fallback every real
 * call also has.
 */
import { LABELS, WEEKDAY_LONG } from '../app/letan/defaults'
import { INSTRUCTION_IDEAS } from '../app/letan/instructions'
import {
  addressExchange,
  facilityExchange,
  feeExchange,
  hoursOn,
  insuranceExchange,
  instalmentExchange,
  closingToday,
  localIso,
  parkingExchange,
  prepExchange,
  priceSentence,
  summarizeWeek,
  tetExchange,
} from '../app/letan/knowledge/answers'
import type { ReceptionistConfig, ServiceRow, Weekday } from '../app/letan/model'
import {
  EMERGENCY_INSTRUCTION_SCRIPT,
  EMERGENCY_RED_FLAGS_PACK,
  MEDICAL_ADVICE_REFUSAL_SCRIPT,
  UNRESOLVABLE_FALLBACK_SCRIPT,
} from '../app/letan/system'
import { RECEPTIONIST_SILENCE } from './contracts'
import type { ReceptionistApi, ReceptionistTurn } from './contracts'
import { delay, maybeFail } from './mock-support'

/** Lower-case, no diacritics: "Mấy giờ mở cửa?" → "may gio mo cua?". */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

const any = (t: string, res: RegExp[]) => res.some((r) => r.test(t))

const STOP = new Set(['co', 'khong', 'la', 'gi', 'a', 'ben', 'minh', 'em', 'anh', 'chi', 'cho', 'hoi', 'duoc', 'nao', 'thi', 'va', 'o', 'cua', 'phong', 'kham', 'toi', 'nhe', 'voi'])
const words = (t: string) => fold(t).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))

/** The service the caller named, by name or alias, longest match first. */
function serviceIn(cfg: ReceptionistConfig, t: string): ServiceRow | undefined {
  const hits = cfg.service_catalog
    .flatMap((s) => [s.service_name, ...s.service_aliases].filter((n) => n.trim()).map((n) => ({ s, n: fold(n) })))
    .filter((h) => t.includes(h.n))
    .sort((a, b) => b.n.length - a.n.length)
  return hits[0]?.s
}

/** "thứ bảy", "chủ nhật", "mai", "hôm nay" → the date the caller means. */
function dayIn(t: string, now: Date): { date: Date; label: string } | null {
  const d = new Date(now)
  if (/hom nay|bay gio|gio nay/.test(t)) return { date: d, label: 'Hôm nay' }
  if (/ngay mai|\bmai\b|sang mai|chieu mai/.test(t)) {
    d.setDate(d.getDate() + 1)
    return { date: d, label: 'Mai' }
  }
  const names: [RegExp, Weekday][] = [
    [/chu nhat|\bcn\b/, 0],
    [/thu hai|\bt2\b/, 1],
    [/thu ba|\bt3\b/, 2],
    [/thu tu|\bt4\b/, 3],
    [/thu nam|\bt5\b/, 4],
    [/thu sau|\bt6\b/, 5],
    [/thu bay|\bt7\b/, 6],
  ]
  for (const [re, day] of names) {
    if (re.test(t)) {
      const ahead = (day - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + ahead)
      return { date: d, label: WEEKDAY_LONG[day] }
    }
  }
  if (/cuoi tuan/.test(t)) {
    const ahead = (6 - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + ahead)
    return { date: d, label: 'Thứ Bảy' }
  }
  return null
}

function bestFaq(cfg: ReceptionistConfig, t: string): string | null {
  const asked = new Set(words(t))
  if (!asked.size) return null
  let best: { score: number; answer: string } | null = null
  for (const f of cfg.faq_pairs) {
    if (!f.question.trim() || !f.answer.trim()) continue
    const own = words(f.question)
    if (!own.length) continue
    const shared = own.filter((w) => asked.has(w)).length
    const score = shared / own.length
    if (shared >= 2 || score >= 0.6) if (!best || score > best.score) best = { score, answer: f.answer.trim() }
  }
  return best?.answer ?? null
}

function reply(turn: ReceptionistTurn, now: Date): string {
  const cfg = turn.config
  const agent = cfg.agent_name.trim() || 'Linh'
  const business = cfg.business_name.trim() || 'phòng khám'
  const raw = turn.text.trim()
  const t = fold(raw)
  const instructions = fold(cfg.tenant_instructions)

  // Silence: the one thing typing cannot produce.
  if (raw === RECEPTIONIST_SILENCE) {
    if (!cfg.silence_nudge_enabled) return '…'
    const silences = turn.history.filter((h) => h.role === 'caller' && h.text === RECEPTIONIST_SILENCE).length
    if (cfg.end_call_after_silence_enabled && silences >= cfg.end_call_after_n_nudges) return cfg.call_closing_script
    return cfg.silence_nudge_script
  }

  // Safety first, before any matching that could answer a symptom with a price.
  const flags = [...EMERGENCY_RED_FLAGS_PACK, ...cfg.emergency_red_flags_custom].map(fold)
  if (flags.some((f) => f && t.includes(f)) || /cap cuu|khan cap/.test(t)) return EMERGENCY_INSTRUCTION_SCRIPT

  if (any(t, [/gap (nguoi|nhan vien|le tan)/, /nguoi that/, /noi chuyen voi (nguoi|ai)/, /chuyen may/])) {
    const target = cfg.escalation_targets.find((x) => x.phone.trim())
    return target ? `Dạ, em nối máy với ${target.name || 'nhân viên'} ngay ạ. Anh chị giữ máy giúp em.` : `Dạ, hiện chưa có nhân viên nghe máy ạ. ${UNRESOLVABLE_FALLBACK_SCRIPT}`
  }

  // English, decided by the absence of Vietnamese rather than a dictionary.
  if (/^[a-z0-9\s?.,'!-]+$/.test(raw.toLowerCase()) && /\b(the|is|are|do|you|can|what|when|how|open|price|appointment|hello|hi)\b/.test(t)) {
    if (!cfg.secondary_language) return `Dạ, em xin lỗi, em chưa hỗ trợ tiếng Anh ạ. Em nối máy với nhân viên giúp anh chị nhé.`
    const address = cfg.address_full.trim()
    return `Yes, I can help in English. ${business} is at ${address || 'the address on our website'}. Would you like to book an appointment?`
  }

  if (any(t, [/^(a ?lo|hello|hi|xin chao|chao)\b/, /ai (dang )?nghe/, /may ai/, /(chi|em|ban) (la|ten) (ai|gi)/, /ten gi/])) {
    return `Dạ, em là ${agent}, trợ lý AI của ${business}. Anh chị cần đặt lịch hay hỏi thông tin ạ?`
  }
  if (any(t, [/cam on/, /tam biet/, /\bbye\b/, /the thoi/])) return `Dạ, cảm ơn anh chị đã gọi ${business}. Chúc anh chị một ngày tốt lành ạ.`

  // Doctors, by name if one was said.
  if (any(t, [/bac si/, /\bbs\b/, /bac sy/])) {
    const roster = cfg.practitioner_roster.filter((p) => p.practitioner_name.trim())
    if (/gioi nhat|tot nhat|uy tin nhat/.test(t) && /khong so sanh/.test(instructions)) return INSTRUCTION_IDEAS[3].answer
    const named = roster.find((p) => fold(p.practitioner_name).split(' ').some((w) => w.length > 2 && new RegExp(`\\b${w}\\b`).test(t)))
    if (named) {
      const days = named.working_days.length ? named.working_days.map((w) => WEEKDAY_LONG[w].replace('Thứ ', 'thứ ')).join(', ') : 'theo lịch'
      const note = named.working_hours_note.trim() ? `, ${named.working_hours_note.trim().toLowerCase()}` : ''
      const spec = named.specialties.length ? ` Bác sĩ phụ trách ${named.specialties.join(', ').toLowerCase()}.` : ''
      return `${named.title_credential} ${named.practitioner_name.trim()} làm việc ${days}${note} ạ.${spec}${named.bookable_by_name ? ' Anh chị muốn hẹn đích danh, em ghi nhận rồi phòng khám xác nhận lại ạ.' : ''}`
    }
    const svc = serviceIn(cfg, t)
    const bySpec = svc ? roster.filter((p) => p.specialties.some((sp) => fold(sp) === fold(svc.service_name))) : []
    if (bySpec.length) return `Dạ, ${svc!.service_name.toLowerCase()} bên em do ${bySpec.map((p) => `${p.title_credential} ${p.practitioner_name.trim()}`).join(' và ')} phụ trách ạ.`
    if (/bac si nu/.test(t)) return roster.length ? `Dạ, phòng khám có ${roster.length} bác sĩ ạ: ${roster.map((p) => `${p.title_credential} ${p.practitioner_name.trim()}`).join(', ')}. Anh chị muốn hẹn bác sĩ nào ạ?` : UNRESOLVABLE_FALLBACK_SCRIPT
    if (roster.length) return `Dạ, phòng khám có ${roster.map((p) => `${p.title_credential} ${p.practitioner_name.trim()}`).join(', ')} ạ. Anh chị muốn hỏi bác sĩ nào ạ?`
    return `Dạ, em chưa có lịch của từng bác sĩ ạ. ${UNRESOLVABLE_FALLBACK_SCRIPT}`
  }

  // Money.
  if (/tra gop/.test(t)) return instalmentExchange(cfg).a ?? `Dạ, câu này em chưa rõ ạ. ${UNRESOLVABLE_FALLBACK_SCRIPT}`
  if (any(t, [/thanh toan/, /chuyen khoan/, /the tin dung/, /quet the/, /momo/, /zalopay/, /tien mat/])) {
    const ways = cfg.payment_methods.map((m) => LABELS.payment[m].toLowerCase())
    return ways.length ? `Dạ, phòng khám nhận ${ways.join(', ')} ạ.` : `Dạ, phòng khám nhận tiền mặt ạ.`
  }
  if (any(t, [/uu dai/, /khuyen mai/, /giam gia/, /chuong trinh/])) {
    const today = localIso(now)
    const live = cfg.active_promotions.filter((p) => p.promo_name.trim() && (!p.valid_from || p.valid_from <= today) && (!p.valid_to || today <= p.valid_to))
    return live.length ? `Dạ có ạ, ${live.map((p) => p.promo_description.trim() || p.promo_name.trim()).join('; ')}. Áp dụng đến hết ${live[0].valid_to.slice(8, 10)}/${live[0].valid_to.slice(5, 7)} ạ.` : `Dạ, hiện phòng khám chưa có chương trình ưu đãi nào ạ.`
  }
  if (any(t, [/bhyt/, /bao hiem/])) return insuranceExchange(cfg).a ?? `Dạ, câu này em xin ghi nhận và nhờ nhân viên gọi lại anh chị ạ.`

  // A service, named.
  const notOffered = cfg.services_not_offered.map(fold).find((n) => n && t.includes(n))
  if (notOffered) return `Dạ, hiện phòng khám không làm ${notOffered} ạ. Em xin lỗi anh chị.`
  const svc = serviceIn(cfg, t)
  if (svc) {
    let line = priceSentence(svc, cfg.pricing_disclosure_policy)
    if (/nieng rang|chinh nha/.test(t) && cfg.tenant_instructions.trim()) {
      const hit = INSTRUCTION_IDEAS.find((i) => i.text !== INSTRUCTION_IDEAS[3].text && cfg.tenant_instructions.includes(i.text))
      if (hit) return hit.answer
    }
    if (/tu van mien phi/.test(instructions) && !/mien phi/.test(fold(line))) line += ' Anh chị đặt một buổi tư vấn miễn phí để bác sĩ xem trực tiếp nhé ạ?'
    if (svc.service_note.trim() && /(?:^|\s)(luu y|dieu kien|ap dung)/.test(t)) line += ` ${svc.service_note.trim()}.`
    return line
  }
  if (any(t, [/kham (lan )?dau/, /phi kham/, /tu van .*(phi|tien)/, /lan dau/])) return feeExchange(cfg).a ?? `Dạ, phí khám ban đầu em xin ghi nhận và nhờ nhân viên báo lại anh chị ạ.`
  if (any(t, [/mang theo/, /chuan bi/, /can (mang|dem) gi/])) return prepExchange(cfg).a ?? `Dạ, anh chị chỉ cần đến đúng giờ hẹn ạ, không cần chuẩn bị gì thêm.`
  if (any(t, [/chup phim/, /x-?quang/, /thiet bi/, /may moc/, /cone beam/, /scan/])) return facilityExchange(cfg).a ?? `Dạ, thiết bị tại phòng khám em xin ghi nhận và nhờ nhân viên trả lời anh chị ạ.`

  // When.
  if (any(t, [/tet/, /nghi le/, /ngay le/, /le (nay|nao)/, /30\/4/, /2\/9/, /ngay nghi/, /nghi (ngay|hom) nao/])) return tetExchange(cfg).a ?? `Dạ, phòng khám chưa có lịch nghỉ lễ ạ. ${UNRESOLVABLE_FALLBACK_SCRIPT}`
  if (any(t, [/sat gio/, /muon (nhat|qua)/, /tre (qua|nhat)/, /kip khong/, /con nhan khach/])) return closingToday(cfg, now)
  if (any(t, [/may gio/, /gio (mo|lam|dong|kham)/, /mo cua/, /dong cua/, /co mo/, /co lam/, /lam viec/, /chu nhat/, /cuoi tuan/, /thu (hai|ba|tu|nam|sau|bay)/, /hom nay/, /ngay mai/, /\bmai\b/])) {
    const day = dayIn(t, now)
    if (day) return hoursOn(cfg, day.date, day.label)
    return `Phòng khám mở cửa ${summarizeWeek(cfg)} ạ.`
  }

  // Where.
  if (any(t, [/gui xe/, /dau xe/, /do xe/, /bai xe/, /de xe/, /cho xe/])) return parkingExchange(cfg).a ?? `Dạ, chỗ gửi xe em xin ghi nhận và nhờ nhân viên hướng dẫn anh chị ạ.`
  if (any(t, [/chi nhanh/, /co so (nao|khac)/, /o (tinh|thanh pho) khac/])) {
    const list = cfg.branch_list.filter((b) => b.branch_name.trim())
    return list.length ? `Dạ, ngoài ${business} còn có ${list.map((b) => `${b.branch_name.trim()}${b.branch_address.trim() ? ` ở ${b.branch_address.trim()}` : ''}`).join('; ')} ạ.` : `Dạ, phòng khám chỉ có một cơ sở ạ.`
  }
  if (any(t, [/chi duong/, /loi vao/, /di (vao|toi|den) (nhu|the|bang)/, /tim (khong|the nao)/, /\bhem\b/])) {
    const note = cfg.directions_note.trim()
    const addr = addressExchange(cfg).a
    if (note) return `Dạ, ${note.charAt(0).toLowerCase()}${note.slice(1)} ạ.${addr ? ` ${addr}` : ''}`
    return addr ?? UNRESOLVABLE_FALLBACK_SCRIPT
  }
  if (any(t, [/gan (dau|cho|gi|toa)/])) {
    const l = cfg.location_landmarks.trim()
    return l ? `Dạ, phòng khám ${l.charAt(0).toLowerCase()}${l.slice(1)} ạ.` : (addressExchange(cfg).a ?? UNRESOLVABLE_FALLBACK_SCRIPT)
  }
  if (any(t, [/o dau/, /dia chi/, /cho nao/, /duong nao/, /quan (may|nao)/, /toa lac/])) return addressExchange(cfg).a ?? `Dạ, em chưa có địa chỉ để đọc ạ. ${UNRESOLVABLE_FALLBACK_SCRIPT}`
  if (any(t, [/zalo/, /website/, /fanpage/, /facebook/, /nhan tin/, /trang web/])) {
    const link = cfg.digital_links.trim()
    return link ? `Dạ, anh chị nhắn qua ${link} giúp em ạ.` : `Dạ, phòng khám nhận tin nhắn qua số điện thoại này ạ.`
  }
  if (any(t, [/hoa don/, /\bvat\b/])) return `Dạ, ${LABELS.vat[cfg.vat_invoice_policy.option].toLowerCase()}${cfg.vat_invoice_policy.note.trim() ? ` — ${cfg.vat_invoice_policy.note.trim()}` : ''} ạ.`

  // Booking — the skill itself lives in Kỹ năng; here only the first exchange.
  if (any(t, [/dat lich/, /dat hen/, /hen kham/, /lich kham/, /\bbook/, /con cho/, /lich trong/, /muon kham/])) {
    const wait = cfg.waiting_time_expectation.trim()
    return `Dạ được ạ. Anh chị muốn khám vào ngày nào, buổi sáng hay chiều ạ?${wait ? ` ${wait.charAt(0).toUpperCase()}${wait.slice(1)}.` : ''}`
  }
  if (any(t, [/huy (hen|lich)/, /doi lich/, /doi hen/])) {
    const p = cfg.cancellation_policy.trim()
    return p ? `Dạ, ${p.charAt(0).toLowerCase()}${p.slice(1)} ạ.` : `Dạ được ạ, anh chị cho em xin số điện thoại đã đặt để em xem lịch giúp mình nhé.`
  }
  if (any(t, [/cho (lau|bao lau)/, /doi lau/, /doi bao lau/])) {
    const w = cfg.waiting_time_expectation.trim()
    return w ? `Dạ, ${w.charAt(0).toLowerCase()}${w.slice(1)} ạ.` : `Dạ, anh chị đến đúng giờ hẹn là được khám ngay ạ.`
  }

  // FAQ before medical refusal: "Nhổ răng có đau không?" is usually a pair the clinic wrote.
  const faq = bestFaq(cfg, t)
  if (faq) return faq
  if (any(t, [/co dau khong/, /uong thuoc/, /bi (sung|dau|nhuc|chay mau)/, /nen lam gi/, /co sao khong/, /trieu chung/])) return MEDICAL_ADVICE_REFUSAL_SCRIPT

  // A price question with no service named.
  if (any(t, [/\bgia\b/, /bao nhieu/, /nhieu tien/, /phi\b/])) {
    const priced = cfg.service_catalog.filter((s) => s.service_name.trim())
    if (cfg.pricing_disclosure_policy === 'defer') return `Dạ, giá cụ thể thì bác sĩ cần thăm khám mới báo được ạ. Em mời anh chị đến khám tư vấn nhé?`
    if (priced.length) return `Dạ, anh chị muốn hỏi giá dịch vụ nào ạ? Bên em có ${priced.slice(0, 4).map((s) => s.service_name.toLowerCase()).join(', ')}${priced.length > 4 ? ' và một số dịch vụ khác' : ''} ạ.`
    return UNRESOLVABLE_FALLBACK_SCRIPT
  }

  return UNRESOLVABLE_FALLBACK_SCRIPT
}

/** The register: "Trang trọng" swaps the pronouns, "Thân thiện" loosens the particles. */
function styled(text: string, cfg: ReceptionistConfig): string {
  if (/quy khach/.test(fold(cfg.tenant_instructions)) && /khong dung/.test(fold(cfg.tenant_instructions))) return text
  if (cfg.personality_style === 'formal') {
    return text
      .replace(/\bAnh chị\b/g, 'Quý khách')
      .replace(/\banh chị\b/g, 'quý khách')
      .replace(/^Dạ,?\s*/, 'Vâng, ')
      .replace(/\bem\b/g, 'tôi')
      .replace(/\bEm\b/g, 'Tôi')
      .replace(/mình nhé ạ/g, 'quý khách nhé')
  }
  if (cfg.personality_style === 'friendly') {
    return text.replace(/ nhé ạ\?/g, ' nha?').replace(/ nhé\?$/g, ' nha?').replace(/^Dạ,\s/, 'Dạ ')
  }
  return text
}

export const receptionistMock: ReceptionistApi = {
  async reply(turn, opts) {
    // A beat, so the panel's "đang trả lời" state is something you can see.
    await delay(0.9, opts?.signal)
    maybeFail()
    const now = new Date()
    const text = styled(reply(turn, now), turn.config)
    return { text, audio: null }
  },
}
