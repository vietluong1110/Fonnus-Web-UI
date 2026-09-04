import { RECEPTIONIST_SILENCE } from '../../../api'
import type { ReceptionistConfig } from '../model'

/*
 * What to try saying, per sub-page: three or four lines a caller would say
 * that exercise exactly the fields on that page. Tapping one sends it;
 * reading one aloud into the mic does the same thing the long way.
 */

export interface Prompt {
  /** What the chip shows. */
  label: string
  /** What is sent — the label, unless the prompt is a gesture rather than a line. */
  text?: string
}

const line = (label: string): Prompt => ({ label })

export function promptsFor(section: string, cfg: ReceptionistConfig): Prompt[] {
  const svc = cfg.service_catalog.filter((s) => s.service_name.trim())
  const priced = svc.find((s) => s.price_from != null && s.price_from > 0) ?? svc[0]
  const unpriced = svc.find((s) => s.price_from == null)
  const doctor = cfg.practitioner_roster.find((p) => p.practitioner_name.trim())
  const doctorName = doctor ? doctor.practitioner_name.trim().split(' ').pop() : 'Hùng'
  const faqs = cfg.faq_pairs.filter((f) => f.question.trim())
  const term = cfg.keyterms.find((k) => k.source === 'tenant' && k.term.trim())

  switch (section) {
    case 'danh-tinh':
      return [line('Alo, ai đang nghe máy vậy?'), line('Cho em hỏi phòng khám tên gì?'), line('Em muốn đặt lịch khám'), line('Hello, do you speak English?')]
    case 'giong-noi':
      return [line('Đọc giúp em địa chỉ phòng khám'), line('Mai mấy giờ mở cửa?'), line('Cảm ơn nhé'), { label: 'Im lặng một lúc', text: RECEPTIONIST_SILENCE }]
    case 'chi-dan':
      return [line('Niềng răng bên mình bao nhiêu tiền?'), line('Bác sĩ nào giỏi nhất?'), line('Em muốn gặp nhân viên'), line('Cạo vôi răng có đau không?')]
    case 'dia-diem':
      return [line('Phòng khám mình ở đâu?'), line('Đến bằng xe máy thì gửi ở đâu?'), line('Đi vào như thế nào?'), line('Có chi nhánh nào khác không?')]
    case 'gio-mo-cua':
      return [line('Mai mấy giờ mở cửa?'), line('Chủ nhật có làm không?'), line('Tết nghỉ ngày nào?'), line('Sát giờ đóng cửa qua có kịp không?')]
    case 'dich-vu':
      return [
        line(`${priced?.service_name ?? 'Cạo vôi răng'} bao nhiêu tiền?`),
        ...(unpriced ? [line(`${unpriced.service_name} giá sao?`)] : []),
        line('Có trả góp không?'),
        line('Có ưu đãi gì không?'),
        line('Thanh toán bằng gì được?'),
      ]
    case 'bao-hiem':
      return [line('Có nhận bảo hiểm y tế không?'), line('Khám lần đầu có mất phí không?'), line('Em cần mang theo gì?'), line('Có chụp phim tại chỗ không?')]
    case 'bac-si':
      return [line(`Bác sĩ ${doctorName} hôm nay có làm không?`), line(`Bác sĩ nào làm ${(svc[3]?.service_name ?? 'implant').toLowerCase()}?`), line('Có bác sĩ nữ không?')]
    case 'cau-hoi':
      return [...faqs.slice(0, 3).map((f) => line(f.question.trim())), ...(faqs.length < 3 ? [line('Nhổ răng có đau không?'), line('Trẻ em mấy tuổi khám được?')] : [])].slice(0, 4)
    case 'tu-khoa':
      return [line(`Em muốn hỏi về ${term?.phonetic_hint.trim() || term?.term.trim() || 'in-vi-za-lai'}`), line(`Bên mình có làm ${term?.term.trim() || 'Invisalign'} không?`), line('Cho em hỏi giá implant')]
    default:
      return [line('Phòng khám ở đâu?'), line('Mai mấy giờ mở cửa?'), line('Có nhận bảo hiểm y tế không?')]
  }
}
