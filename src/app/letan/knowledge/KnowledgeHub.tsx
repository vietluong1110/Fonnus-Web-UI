import type { IconName } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { messageFor } from '../../../api'
import { LABELS } from '../defaults'
import { pricedCount, summarizeHours } from '../readiness'
import { useConfig } from '../store'
import { formatVnd, useToast } from '../../ui'
import { fmtDate } from './answers'
import { derivedKeyterms } from './KeytermsSection'
import { HubFoot, HubRow, sectionStyles } from '../SectionFrame'
import styles from './Knowledge.module.css'

/*
 * `#/app/le-tan/kien-thuc` — the hub.
 *
 * It used to open with a percentage, a progress bar and an amber warning
 * listing what was missing. None of that told an owner what their
 * receptionist would actually say if the phone rang now. That question is
 * answered on every sub-page instead — the try-out panel beside each form —
 * so the hub is only the rows: what is set, and where to change it.
 *
 * Seven ways in, in two groups. Group one is what callers ask; group two is
 * what makes her answers better. Same row vocabulary as the Hồ sơ hub, and
 * the same rule: nothing is "bắt buộc" — an empty row is dashed, and that is
 * the whole nudge. Files and websites have no row of their own: they go to
 * the assistant beside the hub, which reads them into these sections.
 */

interface Row {
  segment: string
  icon: IconName
  title: string
  sub: string
  empty?: boolean
}

export function KnowledgeHub() {
  const { config, reset } = useConfig()
  const { toast } = useToast()
  const agent = config.agent_name || 'Linh'

  const priced = pricedCount(config)
  const total = config.service_catalog.length
  const tet = config.holiday_exceptions.find((h) => /tết nguyên đán/i.test(h.holiday_label))
  const hasAddress = config.address_full.trim().length > 5
  const brk = config.break_periods[0]
  const insurance = config.insurance_bhyt_policy.option
  const fee = config.consultation_fee
  const doctors = config.practitioner_roster.filter((p) => p.practitioner_name.trim())
  const faqs = config.faq_pairs.filter((f) => f.question.trim() && f.answer.trim()).length
  // The word list is the tenant's own rows plus every word the other pages
  // already know; a derived word only has a stored row once it has been given
  // a spelling, so the count of what is *done* is read the same way the page
  // itself reads it.
  const ownTerms = config.keyterms.filter((k) => k.source === 'tenant')
  const derivedTerms = derivedKeyterms(config)
  const spelledDerived = new Map(config.keyterms.filter((k) => k.source === 'derived').map((k) => [k.term, k.phonetic_hint]))
  const mine = ownTerms.length
  const terms = mine + derivedTerms.length
  const spelled = ownTerms.filter((k) => k.term.trim() && k.phonetic_hint.trim()).length + derivedTerms.filter((t) => (spelledDerived.get(t) ?? '').trim()).length
  const hoursDone = config.operating_hours_confirmed && config.holidays_confirmed

  const asked: Row[] = [
    {
      segment: 'dia-diem',
      icon: 'location',
      title: 'Địa điểm và liên hệ',
      sub: hasAddress
        ? [config.address_full.trim(), config.branch_list.length ? `${config.branch_list.length} chi nhánh khác` : null, config.parking_info ? 'có chỗ gửi xe' : null]
            .filter(Boolean)
            .join(' · ')
        : `Chưa có địa chỉ — ${agent} chưa chỉ đường được`,
      empty: !hasAddress,
    },
    {
      segment: 'gio-mo-cua',
      icon: 'hours',
      title: 'Giờ mở cửa và ngày nghỉ',
      sub: hoursDone
        ? [summarizeHours(config), brk ? `nghỉ trưa ${brk.from}–${brk.to}` : null, tet ? `Tết ${fmtDate(tet.date_from)} – ${fmtDate(tet.date_to)}` : null].filter(Boolean).join(' · ')
        : `Giờ mẫu ${summarizeHours(config)}${tet ? ` · Tết ${fmtDate(tet.date_from)} – ${fmtDate(tet.date_to)}` : ''} — bạn chưa xác nhận`,
      empty: !hoursDone,
    },
    {
      segment: 'dich-vu',
      icon: 'price',
      title: 'Dịch vụ và giá',
      sub: total
        ? `${priced}/${total} dịch vụ có giá · ${LABELS.pricing[config.pricing_disclosure_policy].replace(' (khuyên dùng)', '')}${config.instalment_options ? ' · có trả góp' : ''}`
        : `Chưa có dịch vụ nào — ${agent} chưa báo giá được`,
      empty: total === 0,
    },
    {
      segment: 'bao-hiem',
      icon: 'privacy',
      title: 'BHYT, bảo hiểm và khám ban đầu',
      sub:
        insurance === 'unset'
          ? 'Chưa trả lời — Fonnus đang hỏi bạn câu này ở khung bên'
          : [LABELS.insurance[insurance], fee == null ? null : `khám ban đầu ${fee === 0 ? 'miễn phí' : `${formatVnd(fee)} đ`}`, config.facility_capabilities.length ? `${config.facility_capabilities.length} thiết bị` : null]
              .filter(Boolean)
              .join(' · '),
      empty: insurance === 'unset',
    },
  ]

  const better: Row[] = [
    {
      segment: 'bac-si',
      icon: 'practitioner',
      title: 'Bác sĩ',
      sub: doctors.length
        ? doctors.map((p) => `${p.title_credential} ${p.practitioner_name.trim()}`).join(', ')
        : `Chưa có — khách hỏi đích danh bác sĩ, ${agent} chưa trả lời được`,
      empty: doctors.length === 0,
    },
    {
      segment: 'cau-hoi',
      icon: 'help',
      title: 'Câu hỏi thường gặp',
      sub: faqs ? `${faqs} câu có trả lời sẵn` : 'Chưa có — những câu khách hay hỏi mà các mục trên chưa có',
      empty: faqs === 0,
    },
    {
      segment: 'tu-khoa',
      icon: 'volume',
      title: 'Từ hay nghe nhầm',
      sub: terms ? `${spelled}/${terms} từ có cách đọc${mine ? ` · ${mine} từ bạn thêm` : ''}` : 'Chưa có từ nào — điền tên phòng khám và dịch vụ trước',
    },
  ]

  const row = (r: Row) => <HubRow key={r.segment} href={appHref('le-tan', 'kien-thuc', r.segment)} icon={r.icon} title={r.title} sub={r.sub} empty={r.empty} />

  return (
    <div className={sectionStyles.hub}>
      <div className={sectionStyles.group}>
        <span className={sectionStyles.groupLabel}>Khách hay hỏi</span>
        {asked.map(row)}
      </div>

      <div className={sectionStyles.group}>
        <span className={sectionStyles.groupLabel}>Để {agent} trả lời hay hơn</span>
        {better.map(row)}
      </div>

      <HubFoot>
        Cách {agent} <em>xưng hô</em> và chào khách — tên, giọng, lời chào — nằm ở tab <a href={appHref('le-tan', 'ho-so')}>Hồ sơ</a>.
      </HubFoot>

      <button
        type="button"
        className={styles.resetLink}
        onClick={() => {
          if (window.confirm('Đưa toàn bộ Lễ tân về mẫu ban đầu? Mọi thông tin bạn đã nhập sẽ mất.')) {
            reset()
              .then(() => toast('Đã đưa Lễ tân về mẫu nha khoa.', 'neutral'))
              .catch((e: unknown) => toast(messageFor(e), 'error'))
          }
        }}
      >
        Đặt lại về mẫu nha khoa
      </button>
    </div>
  )
}
