import type { IconName } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { LABELS } from '../defaults'
import { useConfig } from '../store'
import { HubFoot, HubRow, sectionStyles as styles } from '../SectionFrame'
import { bookableDays, hasEmergencyNumber, hasHandoffNumber, handoffTo } from './lines'

/*
 * `#/app/le-tan/ky-nang` — the hub.
 *
 * Three ways in, in the order a call runs into them: she picks up and may
 * need a person, she books, and afterwards somebody has to be told. Same row
 * vocabulary as the Hồ sơ and Kiến thức hubs, and the same rule — no
 * "bắt buộc" chips. A row says what is currently set, in the terms of what
 * she can do because of it; a row with nothing in it wears a dashed edge and
 * says what she cannot do without it.
 *
 * The tab used to open straight into Chuyển máy with the other two in a list
 * down the left. That made Kỹ năng the only tab you could not stand back from,
 * and gave its pages nowhere to put a back link.
 */

interface Row {
  segment: string
  icon: IconName
  title: string
  sub: string
  empty?: boolean
}

export function SkillsHub() {
  const { config } = useConfig()
  const agent = config.agent_name || 'Linh'

  const numbers = config.escalation_targets.filter((t) => t.phone.trim()).length
  const emails = config.email_rules.filter((r) => r.enabled && r.recipients.length)
  const recipients = [...new Set(emails.flatMap((r) => r.recipients))]
  const days = bookableDays(config.slot_rules)

  const rows: Row[] = [
    {
      segment: 'chuyen-may',
      icon: 'handoff',
      title: 'Chuyển máy cho người thật',
      sub: hasHandoffNumber(config)
        ? [`${numbers} số · ${agent} gọi ${handoffTo(config)} trước`, hasEmergencyNumber(config) ? 'có số trực khẩn cấp' : 'chưa có số trực khẩn cấp'].join(' · ')
        : `Chưa có số nào — ${agent} không nối được cuộc gọi cho ai`,
      empty: !hasHandoffNumber(config),
    },
    {
      segment: 'dat-lich',
      icon: 'appointment',
      title: 'Giữ lịch hẹn',
      sub: days.length
        ? `${days.length} ngày trong tuần · ${config.ai_bookable_slots_per_day} chỗ mỗi ngày · hẹn ${config.slot_duration} phút · xác nhận qua ${LABELS.confirmation[config.booking_confirmation_channel]}`
        : `Chưa nhận hẹn ngày nào — ${agent} chỉ ghi lời nhắn`,
      empty: days.length === 0,
    },
    {
      segment: 'gui-email',
      icon: 'mail',
      title: 'Báo về hộp thư',
      sub: emails.length
        ? `${emails.length}/${config.email_rules.length} loại đang gửi tới ${recipients.length > 1 ? `${recipients.length} địa chỉ` : recipients[0]}`
        : 'Chưa gửi email nào — bạn chỉ biết cuộc gọi cần xem lại khi tự mở ứng dụng',
      empty: emails.length === 0,
    },
  ]

  return (
    <div className={styles.hub}>
      <div className={styles.rows}>
        {rows.map((r) => (
          <HubRow key={r.segment} section={r.segment} href={appHref('le-tan', 'ky-nang', r.segment)} icon={r.icon} title={r.title} sub={r.sub} empty={r.empty} />
        ))}
      </div>

      <HubFoot>
        Đây là những gì {agent} được <em>làm</em>. Những gì {agent} <em>biết</em> nằm ở tab <a href={appHref('le-tan', 'kien-thuc')}>Kiến thức</a>, cách {agent} <em>xưng hô</em> ở tab{' '}
        <a href={appHref('le-tan', 'ho-so')}>Hồ sơ</a>.
      </HubFoot>
    </div>
  )
}
