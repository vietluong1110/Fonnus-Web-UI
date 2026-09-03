import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { LABELS } from '../defaults'
import { SectionHead } from '../LeTanPage'
import { useConfig, useDraft } from '../store'
import { GREETING_COMPLIANCE_BLOCK, RECORDING_RETENTION_DAYS } from '../system'
import { Card, PlayButton, SaveBar, Switch, TextArea, TextField, ui } from '../../ui'
import { ListenAll, PreviewCard, Turn, defaultGreeting } from './preview'
import styles from './Profile.module.css'

const KEYS = ['agent_name', 'greeting_script_custom', 'greeting_by_daypart', 'secondary_language'] as const

const DAYPARTS = [
  ['morning', 'Sáng · trước 12:00', 'sun'],
  ['afternoon', 'Chiều · 12:00 – 18:00', 'sunset'],
  ['evening', 'Tối · sau 18:00', 'moon'],
] as const

/**
 * `#/app/le-tan/ho-so/danh-tinh` — who answers, and what the clinic says first.
 *
 * The two lines of the call opening are not both editable: Fonnus speaks the
 * AI-disclosure and recording notice, then the clinic's greeting. The fixed
 * one is shown in the preview rail, where the caller meets it, rather than as
 * a red compliance block among the inputs — it is a fact about the call, not a
 * task for the owner.
 */
export function IdentitySection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Danh tính và lời chào')
  const { draft, set } = d

  const agent = draft.agent_name.trim() || 'Linh'
  const fallback = defaultGreeting(config.business_name, agent)
  const greeting = draft.greeting_script_custom.trim() || fallback
  const voice = LABELS.voices[config.voice_selection]

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
              checked={draft.greeting_by_daypart.enabled}
              onChange={(v) => set('greeting_by_daypart', { ...draft.greeting_by_daypart, enabled: v })}
            />

            {draft.greeting_by_daypart.enabled ? (
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
                        value={draft.greeting_by_daypart[key]}
                        placeholder={example}
                        onChange={(e) => set('greeting_by_daypart', { ...draft.greeting_by_daypart, [key]: e.target.value })}
                      />
                      <PlayButton text={draft.greeting_by_daypart[key] || example} label={`Nghe thử lời chào ${label.split(' ·')[0].toLowerCase()}`} />
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
          <PreviewCard title={agent} meta={`${voice.desc}, ${voice.tone}`}>
            <Turn label="Fonnus đọc trước" locked tone="locked">
              “{GREETING_COMPLIANCE_BLOCK}”
            </Turn>
            <Turn label="Lời chào của phòng khám">“{greeting}”</Turn>
            <ListenAll text={`${GREETING_COMPLIANCE_BLOCK} ${greeting}`} label="Nghe cả đoạn mở đầu" />
            <span className={ui.hint}>
              {draft.greeting_by_daypart.enabled
                ? `Đang bật lời chào theo buổi — khách nghe câu của buổi đang diễn ra. Ghi âm lưu ${RECORDING_RETENTION_DAYS} ngày theo gói.`
                : `Tám giây đầu tiên khách nghe thấy. Ghi âm lưu ${RECORDING_RETENTION_DAYS} ngày theo gói.`}
            </span>
          </PreviewCard>
        </aside>
      </div>

      <SaveBar {...d.bar} sub="Danh tính và lời chào · áp dụng cho cuộc gọi tiếp theo" />
    </>
  )
}

function daypartExample(key: 'morning' | 'afternoon' | 'evening', business: string): string {
  if (key === 'morning') return `${business} xin chào buổi sáng. Em có thể giúp gì cho anh chị ạ?`
  if (key === 'afternoon') return `${business} xin nghe. Em có thể giúp gì cho anh chị ạ?`
  return `${business} xin nghe. Ngoài giờ khám, em vẫn đặt lịch và ghi lời nhắn được ạ.`
}
