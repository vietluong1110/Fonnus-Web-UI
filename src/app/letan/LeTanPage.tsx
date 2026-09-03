import type { ReactNode } from 'react'
import { messageFor } from '../../api'
import { Badge } from '../../design-system'
import { appHref } from '../../hooks/useRoute'
import { ContentSkeleton, RetryCard } from '../Boot'
import { Tabs, ui } from '../ui'
import { useConfig } from './store'
import { LeTanHeader } from './LeTanHeader'
import { SetupChatProvider } from './assistant/chatStore'
import { SetupChat } from './assistant/SetupChat'
import { ProfileTab } from './profile/ProfileTab'
import { IdentitySection } from './profile/IdentitySection'
import { VoiceSection } from './profile/VoiceSection'
import { InstructionsSection } from './profile/InstructionsSection'
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
import styles from './LeTanPage.module.css'

/*
 * Lễ tân — everything the owner tells the receptionist about the clinic.
 *
 *   #/app/le-tan/ho-so                 who she is: the hub, plus the assistant
 *   #/app/le-tan/ho-so/<section>       one persona section, full form
 *   #/app/le-tan/kien-thuc             what she knows: the hub + the question rail
 *   #/app/le-tan/kien-thuc/<section>   one knowledge section, full form
 *   #/app/le-tan/ky-nang/<skill>       what she may do: transfer, email, book
 *
 * Every page under the tab carries the same identity header: which
 * receptionist this is, which line she answers on, and one press to hear her.
 * The tab configures exactly one of them today, and that header is where the
 * switcher goes the day a clinic runs two.
 */

export type LeTanTab = 'ho-so' | 'kien-thuc' | 'ky-nang'

const TABS: { value: LeTanTab; label: string }[] = [
  { value: 'ho-so', label: 'Hồ sơ' },
  { value: 'kien-thuc', label: 'Kiến thức' },
  { value: 'ky-nang', label: 'Kỹ năng' },
]

/*
 * Hồ sơ is a hub over three sections rather than one long form — the same
 * shape as Kiến thức below it, so the whole tab reads one way.
 */
export const PROFILE_SECTIONS = {
  'danh-tinh': { title: 'Danh tính và lời chào', component: IdentitySection },
  'giong-noi': { title: 'Giọng nói và cách nói', component: VoiceSection },
  'chi-dan': { title: 'Chỉ dẫn riêng', component: InstructionsSection },
} as const

export type ProfileSectionKey = keyof typeof PROFILE_SECTIONS

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
  const { status, loadError, reload } = useConfig()

  // The whole tab is a view over one record, so there is nothing to render
  // until it lands. Note this does NOT fall back to the template on failure:
  // an owner shown a stranger's dental clinic would start editing it.
  if (status === 'loading') return <ContentSkeleton />
  if (status === 'error') {
    return (
      <RetryCard
        title="Chưa tải được thông tin"
        body={
          loadError
            ? messageFor(loadError)
            : 'Bọn mình chưa tải được thông tin phòng khám. Bạn thử lại giúp mình nhé.'
        }
        onRetry={reload}
      />
    )
  }

  // Above the routes, so walking into a section does not restart the
  // conversation — it only changes the shape the assistant is rendered in.
  // Keyed by tab, so each page holds its own questions and its own thread.
  return (
    <SetupChatProvider page={tab}>
      <LeTanRoutes path={path} tab={tab} />
    </SetupChatProvider>
  )
}

function LeTanRoutes({ path, tab }: { path: string[]; tab: LeTanTab }) {

  if (tab === 'ho-so' && path[1] && path[1] in PROFILE_SECTIONS) {
    const Section = PROFILE_SECTIONS[path[1] as ProfileSectionKey].component
    return (
      <div className={styles.docked}>
        <LeTanHeader compact />
        <Section />
        {/* Docked rather than gone: "Mở mục" brought you here, and the next
            question is usually about what you are now looking at. */}
        <SetupChat variant="dock" />
      </div>
    )
  }

  if (tab === 'kien-thuc' && path[1] && path[1] in KNOWLEDGE_SECTIONS) {
    const Section = KNOWLEDGE_SECTIONS[path[1] as KnowledgeSectionKey].component
    return (
      <>
        <LeTanHeader compact />
        <Section />
      </>
    )
  }

  return (
    <>
      <LeTanHeader />
      <Tabs
        ariaLabel="Mục Lễ tân"
        items={TABS.map((t) => ({ value: t.value, label: t.label, href: appHref('le-tan', t.value) }))}
        value={tab}
      />
      {tab === 'ho-so' ? (
        <div className={styles.withRail}>
          <div className={styles.withRailMain}>
            <ProfileTab />
          </div>
          <div className={styles.withRailAside}>
            <SetupChat variant="rail" />
          </div>
        </div>
      ) : tab === 'kien-thuc' ? (
        <KnowledgeHub />
      ) : (
        <SkillsTab path={path.slice(1)} />
      )}
    </>
  )
}

/** Section head: back link and the section's own title, under the identity header. */
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
    <div className={ui.pageHead}>
      <a className={ui.backLink} href={backHref}>
        ‹ {backLabel}
      </a>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {badge ? (
        <Badge tone={badge.tone} dot>
          {badge.label}
        </Badge>
      ) : null}
      {actions ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div> : null}
    </div>
  )
}
