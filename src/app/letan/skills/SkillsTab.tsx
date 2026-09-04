import type { ComponentType } from 'react'
import { Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { computeReadiness } from '../readiness'
import { useConfig } from '../store'
import { TransferSkill } from './TransferSkill'
import { EmailSkill } from './EmailSkill'
import { BookingSkill } from './BookingSkill'
import styles from './Skills.module.css'

/*
 * Kỹ năng — what the receptionist may do, one skill per sub-page:
 * transfer a call, send an email, hold an appointment.
 */

type SkillKey = 'chuyen-may' | 'gui-email' | 'dat-lich'

const SKILLS: { key: SkillKey; label: string; icon: IconName; component: ComponentType }[] = [
  { key: 'chuyen-may', label: 'Chuyển máy', icon: 'handoff', component: TransferSkill },
  { key: 'gui-email', label: 'Gửi email', icon: 'mail', component: EmailSkill },
  { key: 'dat-lich', label: 'Đặt lịch hẹn', icon: 'appointment', component: BookingSkill },
]

export function SkillsTab({ path }: { path: string[] }) {
  const { config } = useConfig()
  const r = computeReadiness(config)
  const active = (SKILLS.some((s) => s.key === path[0]) ? path[0] : 'chuyen-may') as SkillKey
  const Active = SKILLS.find((s) => s.key === active)!.component

  const attention: Record<SkillKey, boolean> = {
    'chuyen-may': r.missing.some((c) => c.path[1] === 'chuyen-may'),
    'gui-email': !config.email_rules.some((e) => e.enabled && e.recipients.length),
    'dat-lich': r.missing.some((c) => c.path[1] === 'dat-lich'),
  }

  return (
    <div className={styles.layout}>
      <nav className={styles.subnav} aria-label="Kỹ năng">
        {SKILLS.map((s) => (
          <a key={s.key} href={appHref('le-tan', 'ky-nang', s.key)} className={`${styles.subItem} ${s.key === active ? styles.subItemOn : ''}`} aria-current={s.key === active ? 'page' : undefined}>
            <Icon name={s.icon} size={16} />
            <span style={{ flex: 1 }}>{s.label}</span>
            {attention[s.key] && s.key !== active ? <span className={styles.subDot} title="Còn thiếu" /> : null}
          </a>
        ))}
      </nav>
      <div className={styles.content}>
        <Active />
      </div>
    </div>
  )
}
