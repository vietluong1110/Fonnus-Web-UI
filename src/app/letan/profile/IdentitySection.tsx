import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { LABELS } from '../defaults'
import { SectionHead } from '../LeTanPage'
import { useConfig, useDraft } from '../store'
import { GREETING_COMPLIANCE_BLOCK } from '../system'
import { Card, PlayButton, SaveBar, Switch, TextArea, TextField, ui } from '../../ui'
import { PreviewCard, Turn, defaultGreeting } from './preview'
import styles from './Profile.module.css'

const KEYS = ['agent_name', 'greeting_script_custom', 'greeting_by_daypart', 'secondary_language'] as const

const DAYPARTS = [
  ['morning', 'Sáng · trước 12:00', 'sun', 'buổi sáng'],
  ['afternoon', 'Chiều · 12:00 – 18:00', 'sunset', 'buổi chiều'],
  ['evening', 'Tối · sau 18:00', 'after-hours', 'buổi tối'],
] as const

type Daypart = (typeof DAYPARTS)[number][0]

/** Which of the three greetings a caller would hear if they rang right now. */
function currentDaypart(hour = new Date().getHours()): Daypart {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/**
 * `#/app/le-tan/ho-so/danh-tinh` — who answers, and what the clinic says first.
 *
 * The two lines of the call opening are not both editable: Fonnus speaks the
 * AI-disclosure and recording notice, then the clinic's greeting. The fixed
 * one is shown in the preview panel, where the caller meets it, rather than
 * as a red compliance block among the inputs — it is a fact about the call,
 * not a task for the owner.
 */
export function IdentitySection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Danh tính và lời chào')
  const { draft, set } = d

  const agent = draft.agent_name.trim() || 'Linh'
  const fallback = defaultGreeting(config.business_name, agent)
  const greeting = draft.greeting_script_custom.trim() || fallback
  const voice = LABELS.voices[config.voice_selection]

  // With dayparts on, the caller hears the greeting for the time of day they
  // rang — so the preview shows that one, not the all-day line the caller
  // would never get. Fixed at render; a page open across noon is not a case
  // worth a timer.
  const dayparts = draft.greeting_by_daypart
  const part = currentDaypart()
  const partRow = DAYPARTS.find(([key]) => key === part) ?? DAYPARTS[0]
  const spoken = dayparts.enabled ? dayparts[part].trim() || daypartExample(part, config.business_name) : greeting

  return (
    <>
      <SectionHead title="Danh tính và lời chào" backLabel="Hồ sơ" backHref={appHref('le-tan', 'ho-so')} />
      <p className={styles.lede}>
        Khách vừa bấm gọi. Đây là tám giây đầu tiên: ai đang nghe máy, và phòng khám chào thế nào.
      </p>

      <div className={styles.work}>
        <div className={styles.col}>
          <Card title="Tên lễ tân">
            <TextField
              value={draft.agent_name}
              onChange={(e) => set('agent_name', e.target.value)}
              placeholder="Linh"
              maxLength={24}
              hint={`${agent} dùng tên này khi tự giới thiệu trong mọi cuộc gọi. Đây cũng là tên bạn thấy khắp ứng dụng.`}
            />
          </Card>

          <Card title="Lời chào của phòng khám" subtitle="Câu thứ hai khách nghe">
            <TextArea
              value={draft.greeting_script_custom}
              onChange={(e) => set('greeting_script_custom', e.target.value)}
              placeholder={fallback}
              rows={3}
              maxLength={280}
              aria-label="Lời chào của phòng khám"
              hint={
                draft.greeting_script_custom.trim() ? (
                  <button type="button" className={ui.linkButton} onClick={() => set('greeting_script_custom', '')}>
                    Dùng lại câu mặc định
                  </button>
                ) : (
                  'Đang dùng câu mặc định. Viết như bạn nói với khách.'
                )
              }
            />

            <div className={ui.divider} />

            <Switch
              label="Lời chào khác theo buổi"
              hint="Sáng, chiều và tối mỗi buổi một câu — tối nhắc khách là đã ngoài giờ khám."
              checked={dayparts.enabled}
              onChange={(v) => set('greeting_by_daypart', { ...dayparts, enabled: v })}
            />

            {dayparts.enabled ? (
              <div className={ui.stackTight} style={{ gap: 12 }}>
                {DAYPARTS.map(([key, label, icon]) => {
                  const example = daypartExample(key, config.business_name)
                  return (
                    <div key={key} className={styles.daypart}>
                      <TextField
                        label={
                          <span className={styles.daypartLabel}>
                            <Icon name={icon} size={14} /> {label}
                          </span>
                        }
                        value={dayparts[key]}
                        placeholder={example}
                        onChange={(e) => set('greeting_by_daypart', { ...dayparts, [key]: e.target.value })}
                      />
                      <PlayButton text={dayparts[key] || example} label={`Nghe thử lời chào ${label.split(' ·')[0].toLowerCase()}`} />
                    </div>
                  )
                })}
              </div>
            ) : null}
          </Card>

          <Card title="Ngôn ngữ">
            <Switch
              label="Trả lời khi khách nói tiếng Anh"
              hint={
                draft.secondary_language
                  ? `${agent} chuyển sang tiếng Anh khi nghe khách nói tiếng Anh.`
                  : `Đang tắt: ${agent} xin lỗi khéo rồi chuyển máy cho nhân viên.`
              }
              checked={draft.secondary_language}
              onChange={(v) => set('secondary_language', v)}
            />
          </Card>
        </div>

        <aside className={styles.rail}>
          <PreviewCard
            title={agent}
            meta={`${voice.desc}, ${voice.tone}`}
            listen={{ text: `${GREETING_COMPLIANCE_BLOCK} ${spoken}`, label: 'Nghe cả đoạn mở đầu' }}
          >
            <Turn label="Fonnus đọc trước" locked tone="locked">
              “{GREETING_COMPLIANCE_BLOCK}”
            </Turn>
            <Turn
              label={dayparts.enabled ? `Lời chào ${partRow[3]}` : 'Lời chào của phòng khám'}
              note={dayparts.enabled ? `Khách gọi lúc này nghe câu của ${partRow[3]}.` : undefined}
              noteIcon={dayparts.enabled ? partRow[2] : undefined}
            >
              “{spoken}”
            </Turn>
          </PreviewCard>
        </aside>
      </div>

      <SaveBar {...d.bar} sub="Danh tính và lời chào · áp dụng cho cuộc gọi tiếp theo" />
    </>
  )
}

function daypartExample(key: Daypart, business: string): string {
  if (key === 'morning') return `${business} xin chào buổi sáng. Em có thể giúp gì cho anh chị ạ?`
  if (key === 'afternoon') return `${business} xin nghe. Em có thể giúp gì cho anh chị ạ?`
  return `${business} xin nghe. Ngoài giờ khám, em vẫn đặt lịch và ghi lời nhắn được ạ.`
}
