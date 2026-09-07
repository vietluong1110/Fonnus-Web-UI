import { formatPhone, isValidPhone, normalizePhone } from '../../auth/phone'
import { newId } from './model'
import type { EscalationTarget, ReceptionistConfig } from './model'
import { EMERGENCY_TRIGGER, TRANSFER_TRIGGERS } from './system'
import { derivedFromTargets } from './skills/lines'

/*
 * "Linh hỏi — bạn trả lời": the conversational rail on the Kiến thức hub.
 *
 * Instead of hunting for the right form, the owner answers the receptionist's
 * questions one at a time; each answer writes straight into the catalogue
 * field it belongs to. The queue is derived from the record, so it empties as
 * the record fills, and every question knows which section it lives in.
 */

export interface QuickAnswer {
  label: string
  apply: (cfg: ReceptionistConfig) => Partial<ReceptionistConfig>
}

export interface Question {
  id: string
  /** Segments after `#/app/le-tan/` — where the answer shows up. */
  path: string[]
  sectionLabel: string
  text: string
  chips: QuickAnswer[]
  /** Free-text handler; return null to reject the answer with the given message. */
  applyText: (cfg: ReceptionistConfig, text: string) => Partial<ReceptionistConfig> | { error: string }
  /** What the confirmation line says once written. */
  confirm: (cfg: ReceptionistConfig) => string
  placeholder?: string
}

const parseMoney = (raw: string): number | null => {
  const t = raw.toLowerCase().replace(/\s/g, '')
  if (/miễnphí|free|0đ|^0$/.test(t)) return 0
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(tr|triệu|trieu|m)/)
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1_000_000)
  const k = t.match(/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|ngan|nghin)/)
  if (k) return Math.round(parseFloat(k[1].replace(',', '.')) * 1_000)
  const digits = t.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

/**
 * A new person on the transfer list, plus the two catalogue columns the list
 * writes — the same derivation `Chuyển máy` runs, so a number typed at the
 * assistant lands identically to one typed on the page.
 */
function withTarget(cfg: ReceptionistConfig, part: Partial<EscalationTarget> & { phone: string; name: string }): Partial<ReceptionistConfig> {
  const row: EscalationTarget = { id: newId('esc'), role: '', window: 'always', triggers: [], fallback: 'callback', ...part }
  const escalation_targets = [...cfg.escalation_targets, row]
  return { escalation_targets, ...derivedFromTargets(escalation_targets) }
}

export function buildQuestions(cfg: ReceptionistConfig): Question[] {
  const q: Question[] = []

  if (!cfg.escalation_targets.some((t) => isValidPhone(t.phone) || /^0\d{9,10}$/.test(t.phone.replace(/\D/g, '')))) {
    q.push({
      id: 'escalation_targets',
      path: ['ky-nang', 'chuyen-may'],
      sectionLabel: 'Kỹ năng · Chuyển máy',
      text: 'Khi khách cần gặp người thật, em nối máy tới số nào ạ? (số và tên người nhận)',
      chips: [],
      placeholder: 'VD: 0912 345 678 chị Lan',
      applyText: (c, text) => {
        const digits = normalizePhone(text)
        if (digits.length < 10) return { error: 'Em cần một số điện thoại 10 số ạ.' }
        const name = text.replace(/[\d\s.+-]+/g, ' ').trim() || 'nhân viên'
        return withTarget(c, { phone: digits, name, triggers: [TRANSFER_TRIGGERS[0]] })
      },
      confirm: (c) => `số chuyển máy ${formatPhone(c.escalation_targets[c.escalation_targets.length - 1]?.phone ?? '')}`,
    })
  }

  if (cfg.insurance_bhyt_policy.option === 'unset') {
    q.push({
      id: 'insurance_bhyt_policy',
      path: ['kien-thuc', 'bao-hiem'],
      sectionLabel: 'Kiến thức · BHYT và bảo hiểm',
      text: 'Phòng khám mình có nhận bảo hiểm y tế (BHYT) không ạ?',
      chips: [
        { label: 'Có', apply: () => ({ insurance_bhyt_policy: { option: 'bhyt', note: '' } }) },
        { label: 'Không', apply: () => ({ insurance_bhyt_policy: { option: 'none', note: '' } }) },
        { label: 'Chỉ bảo hiểm tư nhân', apply: () => ({ insurance_bhyt_policy: { option: 'private', note: '' } }) },
        { label: 'Cả hai', apply: () => ({ insurance_bhyt_policy: { option: 'both', note: '' } }) },
      ],
      applyText: (_c, text) => {
        const t = text.toLowerCase()
        const option = /không|ko\b|no\b/.test(t) && !/tư nhân/.test(t) ? 'none' : /tư nhân/.test(t) && !/bhyt|y tế/.test(t) ? 'private' : /cả|và/.test(t) ? 'both' : 'bhyt'
        return { insurance_bhyt_policy: { option, note: text } }
      },
      confirm: () => 'chính sách BHYT',
    })
  }

  if (!cfg.operating_hours_confirmed) {
    q.push({
      id: 'operating_hours_confirmed',
      path: ['kien-thuc', 'gio-mo-cua'],
      sectionLabel: 'Kiến thức · Giờ mở cửa',
      text: 'Giờ làm việc em đang có là T2–T7 08:00–20:00, CN 08:00–12:00. Đúng chưa ạ?',
      chips: [
        { label: 'Đúng rồi', apply: () => ({ operating_hours_confirmed: true }) },
        { label: 'CN nghỉ', apply: (c) => ({ operating_hours_confirmed: true, operating_hours_by_weekday: c.operating_hours_by_weekday.map((d) => (d.day === 0 ? { ...d, open: false } : d)) }) },
      ],
      applyText: (_c, text) => (/đúng|ok|rồi|ừ|phải/i.test(text) ? { operating_hours_confirmed: true } : { error: 'Anh/chị sửa giờ ở mục Giờ làm việc giúp em ạ.' }),
      confirm: () => 'giờ làm việc',
    })
  }

  if (!cfg.holidays_confirmed) {
    q.push({
      id: 'holidays_confirmed',
      path: ['kien-thuc', 'gio-mo-cua'],
      sectionLabel: 'Kiến thức · Giờ mở cửa và ngày nghỉ',
      text: 'Tết 2027 em ghi nghỉ từ 14/02 đến 22/02. Phòng khám mình nghỉ đúng vậy không ạ?',
      chips: [{ label: 'Đúng rồi', apply: () => ({ holidays_confirmed: true }) }],
      applyText: (_c, text) => (/đúng|ok|rồi|ừ|phải/i.test(text) ? { holidays_confirmed: true } : { error: 'Anh/chị chỉnh ngày ở mục Ngày nghỉ giúp em ạ.' }),
      confirm: () => 'lịch nghỉ Tết',
    })
  }

  for (const svc of cfg.service_catalog.filter((s) => s.price_from == null).slice(0, 2)) {
    q.push({
      id: `price-${svc.id}`,
      path: ['kien-thuc', 'dich-vu'],
      sectionLabel: 'Kiến thức · Dịch vụ và giá',
      text: `${svc.service_name} ở phòng khám mình giá khoảng bao nhiêu ạ? (một mức hoặc khoảng, ví dụ 15–25 triệu)`,
      chips: [
        { label: 'Không làm dịch vụ này', apply: (c) => ({ service_catalog: c.service_catalog.filter((s) => s.id !== svc.id) }) },
        { label: 'Tư vấn mới báo', apply: (c) => ({ service_catalog: c.service_catalog.map((s) => (s.id === svc.id ? { ...s, price_from: 0, price_to: 0, service_note: s.service_note || 'Báo giá sau khi khám' } : s)) }) },
      ],
      placeholder: 'VD: 15–25 triệu',
      applyText: (c, text) => {
        const parts = text.split(/[–—\-đến]+/i).map((p) => parseMoney(p)).filter((n): n is number => n != null)
        if (!parts.length) return { error: 'Em chưa hiểu mức giá, anh/chị ghi số giúp em ạ.' }
        const from = Math.min(...parts)
        const to = Math.max(...parts)
        return { service_catalog: c.service_catalog.map((s) => (s.id === svc.id ? { ...s, price_from: from, price_to: to } : s)) }
      },
      confirm: () => `giá ${svc.service_name.toLowerCase()}`,
    })
  }

  if (!cfg.after_hours_emergency_target.phone) {
    q.push({
      id: 'after_hours_emergency_target',
      path: ['ky-nang', 'chuyen-may'],
      sectionLabel: 'Kỹ năng · Chuyển máy',
      text: 'Khách sưng đau lúc 23:00 sau tiểu phẫu, em nối máy tới bác sĩ trực nào ạ? (số và tên)',
      chips: [],
      placeholder: 'VD: 0908 234 567 BS. Hùng',
      applyText: (c, text) => {
        const digits = normalizePhone(text)
        if (digits.length < 10) return { error: 'Em cần một số điện thoại 10 số ạ.' }
        const name = text.replace(/[\d\s.+-]+/g, ' ').trim() || 'bác sĩ trực'
        // The on-call doctor is a row like any other; what makes them the
        // on-call doctor is the trigger, and `after_hours_emergency_target`
        // is read back off it.
        return withTarget(c, { phone: digits, name, role: 'Bác sĩ trực', window: 'after_hours', triggers: [EMERGENCY_TRIGGER] })
      },
      confirm: () => 'số bác sĩ trực',
    })
  }

  if (cfg.consultation_fee == null) {
    q.push({
      id: 'consultation_fee',
      path: ['kien-thuc', 'bao-hiem'],
      sectionLabel: 'Kiến thức · Khám ban đầu',
      text: 'Khám và tư vấn lần đầu có tính phí không ạ?',
      chips: [
        { label: 'Miễn phí', apply: () => ({ consultation_fee: 0 }) },
        { label: '100.000 đ', apply: () => ({ consultation_fee: 100_000 }) },
        { label: '200.000 đ', apply: () => ({ consultation_fee: 200_000 }) },
      ],
      placeholder: 'VD: 150k',
      applyText: (_c, text) => {
        const n = parseMoney(text)
        return n == null ? { error: 'Em chưa hiểu mức phí ạ.' } : { consultation_fee: n }
      },
      confirm: () => 'phí khám ban đầu',
    })
  }

  if (!cfg.parking_info) {
    q.push({
      id: 'parking_info',
      path: ['kien-thuc', 'dia-diem'],
      sectionLabel: 'Kiến thức · Địa điểm',
      text: 'Khách đi xe máy hay ô tô gửi xe ở đâu ạ?',
      chips: [
        { label: 'Xe máy trước cửa, ô tô không có chỗ', apply: () => ({ parking_info: 'Gửi xe máy trước cửa, ô tô không có chỗ gửi' }) },
        { label: 'Có bãi cho cả hai', apply: () => ({ parking_info: 'Có chỗ gửi xe máy và ô tô tại phòng khám' }) },
      ],
      applyText: (_c, text) => ({ parking_info: text }),
      confirm: () => 'chỗ gửi xe',
    })
  }

  if (!cfg.location_landmarks) {
    q.push({
      id: 'location_landmarks',
      path: ['kien-thuc', 'dia-diem'],
      sectionLabel: 'Kiến thức · Địa điểm',
      text: 'Phòng khám gần địa danh nào để em chỉ đường cho khách ạ? (ví dụ: đối diện chợ Bến Thành)',
      chips: [],
      applyText: (_c, text) => ({ location_landmarks: text }),
      confirm: () => 'địa danh gần phòng khám',
    })
  }

  if (!cfg.waiting_time_expectation) {
    q.push({
      id: 'waiting_time_expectation',
      path: ['ky-nang', 'dat-lich'],
      sectionLabel: 'Kỹ năng · Đặt lịch hẹn',
      text: 'Khách đến đúng hẹn thường chờ bao lâu ạ, để em nói trước cho khách khỏi bất ngờ?',
      chips: [
        { label: 'Không phải chờ', apply: () => ({ waiting_time_expectation: 'Đến đúng hẹn là được khám ngay' }) },
        { label: '10–15 phút', apply: () => ({ waiting_time_expectation: 'Thường chờ 10–15 phút' }) },
        { label: '30 phút', apply: () => ({ waiting_time_expectation: 'Có thể chờ đến 30 phút vào giờ cao điểm' }) },
      ],
      applyText: (_c, text) => ({ waiting_time_expectation: text }),
      confirm: () => 'thời gian chờ',
    })
  }

  if (!cfg.cancellation_policy) {
    q.push({
      id: 'cancellation_policy',
      path: ['ky-nang', 'dat-lich'],
      sectionLabel: 'Kỹ năng · Đặt lịch hẹn',
      text: 'Khách muốn huỷ hẹn thì cần báo trước bao lâu ạ, có mất phí không?',
      chips: [
        { label: 'Báo trước 2 tiếng, không phí', apply: () => ({ cancellation_policy: 'Huỷ trước 2 tiếng, không mất phí' }) },
        { label: 'Huỷ lúc nào cũng được', apply: () => ({ cancellation_policy: 'Huỷ lúc nào cũng được, không mất phí' }) },
      ],
      applyText: (_c, text) => ({ cancellation_policy: text }),
      confirm: () => 'chính sách huỷ hẹn',
    })
  }

  if (!cfg.instalment_options) {
    q.push({
      id: 'instalment_options',
      path: ['kien-thuc', 'dich-vu'],
      sectionLabel: 'Kiến thức · Dịch vụ và giá',
      text: 'Phòng khám có cho trả góp không ạ? Khách hỏi implant và niềng răng hay hỏi câu này.',
      chips: [
        { label: 'Không trả góp', apply: () => ({ instalment_options: 'Không hỗ trợ trả góp' }) },
        { label: 'Trả góp 0% qua thẻ', apply: () => ({ instalment_options: 'Trả góp 0% qua thẻ tín dụng, đơn từ 10 triệu' }) },
      ],
      applyText: (_c, text) => ({ instalment_options: text }),
      confirm: () => 'trả góp',
    })
  }

  if (!cfg.pre_appointment_instructions) {
    q.push({
      id: 'pre_appointment_instructions',
      path: ['kien-thuc', 'bao-hiem'],
      sectionLabel: 'Kiến thức · Khám ban đầu',
      text: 'Khách cần mang theo hay chuẩn bị gì trước khi đến không ạ?',
      chips: [
        { label: 'Không cần gì', apply: () => ({ pre_appointment_instructions: 'Không cần chuẩn bị gì' }) },
        { label: 'CCCD và phim X-quang nếu có', apply: () => ({ pre_appointment_instructions: 'Mang CCCD và phim X-quang nếu có' }) },
      ],
      applyText: (_c, text) => ({ pre_appointment_instructions: text }),
      confirm: () => 'chuẩn bị trước khi đến',
    })
  }

  /*
   * Hồ sơ. Only two fields here are genuinely unanswerable-by-default: the
   * greeting and the standing instructions. Voice, speed and style all ship
   * with a working value, so asking about them would be asking a question the
   * record can never mark as answered.
   */
  const agent = cfg.agent_name || 'Linh'

  if (!cfg.greeting_script_custom.trim()) {
    q.push({
      id: 'greeting_script_custom',
      path: ['ho-so', 'danh-tinh'],
      sectionLabel: 'Hồ sơ · Lời chào',
      text: `Anh chị muốn ${agent} chào khách bằng câu gì ạ? Em đang dùng câu mặc định.`,
      chips: [
        {
          label: 'Dùng câu mặc định',
          apply: (c) => ({
            greeting_script_custom: `${c.business_name} xin nghe. Em là ${c.agent_name || 'Linh'}, trợ lý AI của phòng khám. Anh chị cần đặt lịch hay hỏi thông tin ạ?`,
          }),
        },
      ],
      placeholder: 'VD: Việt Smile xin nghe, em có thể giúp gì ạ?',
      applyText: (_c, text) => {
        if (text.trim().length < 10) return { error: 'Câu chào ngắn quá ạ — anh chị viết dài hơn một chút giúp em.' }
        return { greeting_script_custom: text.trim() }
      },
      confirm: () => 'lời chào của phòng khám',
    })
  }

  if (!cfg.tenant_instructions.trim()) {
    q.push({
      id: 'tenant_instructions',
      path: ['ho-so', 'chi-dan'],
      sectionLabel: 'Hồ sơ · Chỉ dẫn riêng',
      text: `Có điều gì anh chị muốn ${agent} luôn làm hoặc luôn tránh khi nói với khách không ạ?`,
      chips: [
        {
          label: 'Luôn mời đặt lịch tư vấn',
          apply: () => ({ tenant_instructions: 'Luôn gợi ý khách đặt lịch tư vấn miễn phí.' }),
        },
        {
          label: 'Không so sánh bác sĩ',
          apply: () => ({
            tenant_instructions: 'Khách hỏi bác sĩ nào giỏi nhất: nói tất cả bác sĩ đều được đào tạo bài bản, không so sánh.',
          }),
        },
      ],
      placeholder: 'VD: Xưng "em", gọi khách là "anh/chị"',
      applyText: (c, text) => ({
        tenant_instructions: (c.tenant_instructions.trim() ? c.tenant_instructions.trimEnd() + '\n' : '') + text.trim(),
      }),
      confirm: () => 'chỉ dẫn riêng',
    })
  }

  return q
}
