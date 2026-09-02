import type { ReactNode } from 'react'
import { Badge } from '../../design-system'
import { appHref } from '../../hooks/useRoute'
import { Tabs, ui } from '../ui'
import { ProfileTab } from './profile/ProfileTab'
import { KnowledgeHub } from './knowledge/KnowledgeHub'
import { LocationSection } from './knowledge/LocationSection'
import { HoursSection } from './knowledge/HoursSection'
import { HolidaysSection } from './knowledge/HolidaysSection'
import { ServicesSection } from './knowledge/ServicesSection'
import { InsuranceSection } from './knowledge/InsuranceSection'
import { PractitionersSection } from './knowledge/PractitionersSection'
import { FaqSection } from './knowledge/FaqSection'
import { KeytermsSection } from './knowledge/KeytermsSection'
import { DocumentsSection } from './knowledge/DocumentsSection'
import { SkillsTab } from './skills/SkillsTab'
import { AskPill } from './knowledge/AskRail'

/*
 * Lễ tân — everything the owner tells the receptionist about the clinic.
 *
 *   #/app/le-tan/ho-so                 who she is: name, voice, greeting, steering
 *   #/app/le-tan/kien-thuc             what she knows: the hub + the question rail
 *   #/app/le-tan/kien-thuc/<section>   one knowledge section, full form
 *   #/app/le-tan/ky-nang/<skill>       what she may do: transfer, email, book
 */

export type LeTanTab = 'ho-so' | 'kien-thuc' | 'ky-nang'

const TABS: { value: LeTanTab; label: string }[] = [
  { value: 'ho-so', label: 'Hồ sơ' },
  { value: 'kien-thuc', label: 'Kiến thức' },
  { value: 'ky-nang', label: 'Kỹ năng' },
]

export const KNOWLEDGE_SECTIONS = {
  'dia-diem': { title: 'Địa điểm và liên hệ', component: LocationSection },
  'gio-lam-viec': { title: 'Giờ làm việc', component: HoursSection },
  'ngay-nghi': { title: 'Lịch nghỉ Tết và ngày lễ', component: HolidaysSection },
  'dich-vu': { title: 'Dịch vụ và giá', component: ServicesSection },
  'bao-hiem': { title: 'BHYT, bảo hiểm và khám ban đầu', component: InsuranceSection },
  'bac-si': { title: 'Bác sĩ', component: PractitionersSection },
  'cau-hoi': { title: 'Câu hỏi thường gặp', component: FaqSection },
  'tu-khoa': { title: 'Từ hay nghe nhầm', component: KeytermsSection },
  'tai-lieu': { title: 'Tài liệu và website', component: DocumentsSection },
} as const

export type KnowledgeSectionKey = keyof typeof KNOWLEDGE_SECTIONS

export function LeTanPage({ path }: { path: string[] }) {
  const tab = (TABS.some((t) => t.value === path[0]) ? path[0] : 'ho-so') as LeTanTab

  if (tab === 'kien-thuc' && path[1] && path[1] in KNOWLEDGE_SECTIONS) {
    const key = path[1] as KnowledgeSectionKey
    const Section = KNOWLEDGE_SECTIONS[key].component
    return <Section />
  }

  return (
    <>
      <div className={ui.pageHead}>
        <h1 className={ui.pageTitle}>Lễ tân</h1>
        {tab !== 'kien-thuc' ? <AskPill /> : null}
      </div>
      <Tabs
        ariaLabel="Mục Lễ tân"
        items={TABS.map((t) => ({ value: t.value, label: t.label, href: appHref('le-tan', t.value) }))}
        value={tab}
      />
      {tab === 'ho-so' ? <ProfileTab /> : tab === 'kien-thuc' ? <KnowledgeHub /> : <SkillsTab path={path.slice(1)} />}
    </>
  )
}

/** Frame 18/19 head: back link, title, status badge, plus the floating question pill. */
export function SectionHead({
  title,
  badge,
  actions,
  backLabel = 'Kiến thức',
  backHref = appHref('le-tan', 'kien-thuc'),
}: {
  title: ReactNode
  badge?: { tone: 'success' | 'warning' | 'neutral' | 'terracotta'; label: ReactNode }
  actions?: ReactNode
  backLabel?: string
  backHref?: string
}) {
  return (
    <>
      <div className={ui.pageHead}>
        <a className={ui.backLink} href={backHref}>
          ‹ {backLabel}
        </a>
        <h1 className={ui.pageTitle}>{title}</h1>
        {badge ? (
          <Badge tone={badge.tone} dot>
            {badge.label}
          </Badge>
        ) : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <AskPill />
          {actions}
        </div>
      </div>
    </>
  )
}
