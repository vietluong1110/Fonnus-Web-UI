import { useState } from 'react'
import { messageFor } from '../../api'
import { appHref } from '../../hooks/useRoute'
import { ContentSkeleton, RetryCard } from '../Boot'
import { BottomStackProvider, Tabs } from '../ui'
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
import { ServicesSection } from './knowledge/ServicesSection'
import { InsuranceSection } from './knowledge/InsuranceSection'
import { PractitionersSection } from './knowledge/PractitionersSection'
import { FaqSection } from './knowledge/FaqSection'
import { KeytermsSection } from './knowledge/KeytermsSection'
import { SkillsHub } from './skills/SkillsHub'
import { TransferSkill } from './skills/TransferSkill'
import { EmailSkill } from './skills/EmailSkill'
import { BookingSkill } from './skills/BookingSkill'
import styles from './LeTanPage.module.css'

/*
 * Lễ tân — everything the owner tells the receptionist about the clinic.
 *
 *   #/app/le-tan/ho-so                 who she is: the hub, plus the assistant
 *   #/app/le-tan/ho-so/<section>       one persona section, full form
 *   #/app/le-tan/kien-thuc             what she knows: the hub, plus the assistant
 *   #/app/le-tan/kien-thuc/<section>   one knowledge section, full form
 *   #/app/le-tan/ky-nang               what she may do: the hub, plus the assistant
 *   #/app/le-tan/ky-nang/<skill>       one skill, full form
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

/*
 * Kiến thức is seven sections, not eight: hours and holidays are one page,
 * because the caller's question — "mai có mở không" — needs both to answer.
 * There is no "tài liệu" page: a price list, a leaflet or a website goes to
 * the Fonnus assistant, which reads it and files what it finds into the
 * sections below.
 */
export const KNOWLEDGE_SECTIONS = {
  'dia-diem': { title: 'Địa điểm và liên hệ', component: LocationSection },
  'gio-mo-cua': { title: 'Giờ mở cửa và ngày nghỉ', component: HoursSection },
  'dich-vu': { title: 'Dịch vụ và giá', component: ServicesSection },
  'bao-hiem': { title: 'BHYT, bảo hiểm và khám ban đầu', component: InsuranceSection },
  'bac-si': { title: 'Bác sĩ', component: PractitionersSection },
  'cau-hoi': { title: 'Câu hỏi thường gặp', component: FaqSection },
  'tu-khoa': { title: 'Từ hay nghe nhầm', component: KeytermsSection },
} as const

export type KnowledgeSectionKey = keyof typeof KNOWLEDGE_SECTIONS

/*
 * Kỹ năng is three skills, in the order a call runs into them: she picks up
 * and may need a person, she books, and afterwards somebody has to be told.
 * It used to be a 220px list down the left of its own pages rather than a hub
 * — the only tab you could not stand back from, and the only one whose pages
 * had no way back, no lede and no try-out rail.
 */
export const SKILL_SECTIONS = {
  'chuyen-may': { title: 'Chuyển máy cho người thật', component: TransferSkill },
  'dat-lich': { title: 'Giữ lịch hẹn', component: BookingSkill },
  'gui-email': { title: 'Báo về hộp thư', component: EmailSkill },
} as const

export type SkillSectionKey = keyof typeof SKILL_SECTIONS

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
    <SetupChatProvider page={tab} section={path[1]}>
      <LeTanRoutes path={path} tab={tab} />
    </SetupChatProvider>
  )
}

function LeTanRoutes({ path, tab }: { path: string[]; tab: LeTanTab }) {
  // Whether a section's save bar is on screen. While it is, the floating
  // assistant stands down and the bar carries the assistant's button instead
  // — see the slots note in SetupChat.
  const [barShown, setBarShown] = useState(false)

  // A section page under either hub: the form, with the assistant docked
  // rather than gone — "Mở mục" brought you here, and the next question is
  // usually about what you are now looking at. The section frame mounts the
  // `aside` slot in its rail column; the two slots for stacked widths are here.
  const Section =
    tab === 'ho-so' && path[1] && path[1] in PROFILE_SECTIONS
      ? PROFILE_SECTIONS[path[1] as ProfileSectionKey].component
      : tab === 'kien-thuc' && path[1] && path[1] in KNOWLEDGE_SECTIONS
        ? KNOWLEDGE_SECTIONS[path[1] as KnowledgeSectionKey].component
        : tab === 'ky-nang' && path[1] && path[1] in SKILL_SECTIONS
          ? SKILL_SECTIONS[path[1] as SkillSectionKey].component
          : null

  if (Section) {
    return (
      <BottomStackProvider above={<SetupChat variant="dock" at="stack" />} onPresence={setBarShown}>
        <LeTanHeader compact />
        <Section />
        <SetupChat variant="dock" at="float" suppressed={barShown} />
      </BottomStackProvider>
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
      <div className={styles.withRail}>
        <div className={styles.withRailMain}>{tab === 'ho-so' ? <ProfileTab /> : tab === 'kien-thuc' ? <KnowledgeHub /> : <SkillsHub />}</div>
        <div className={styles.withRailAside}>
          <SetupChat variant="rail" />
        </div>
      </div>
    </>
  )
}
