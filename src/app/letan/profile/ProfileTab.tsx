import { Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { LABELS } from '../defaults'
import { useConfig } from '../store'
import { ui } from '../../ui'
import styles from './Profile.module.css'

/**
 * `#/app/le-tan/ho-so` — the hub.
 *
 * The page used to be every persona field at once, four cards deep and two
 * columns wide. It is now three ways in, and nothing else: what each section
 * currently holds, and a row to go and change it.
 *
 * There are no "bắt buộc" / "không bắt buộc" chips. What a row shows instead
 * is what is currently set — the same information, phrased as a fact about
 * the clinic rather than as an obligation. A row with nothing in it says so
 * plainly and wears a dashed edge; that is the whole nudge.
 */

interface Row {
  segment: string
  icon: IconName
  title: string
  sub: string
  empty?: boolean
}

export function ProfileTab() {
  const { config } = useConfig()

  const agent = config.agent_name || 'Linh'
  const voice = LABELS.voices[config.voice_selection]
  const dayparts = config.greeting_by_daypart.enabled
  const instructions = config.tenant_instructions.trim()

  const rows: Row[] = [
    {
      segment: 'danh-tinh',
      icon: 'user-round',
      title: 'Danh tính và lời chào',
      sub: [
        agent,
        config.greeting_script_custom.trim() ? 'lời chào riêng của phòng khám' : 'lời chào mặc định',
        dayparts ? 'ba câu cho sáng, chiều và tối' : 'một câu dùng cả ngày',
      ].join(' · '),
    },
    {
      segment: 'giong-noi',
      icon: 'volume-2',
      title: 'Giọng nói và cách nói',
      sub: [
        voice.desc,
        `nói ${LABELS.speed[config.speaking_speed].toLowerCase()}`,
        LABELS.style[config.personality_style].toLowerCase(),
      ].join(' · '),
    },
    {
      segment: 'chi-dan',
      icon: 'clipboard-list',
      title: 'Chỉ dẫn riêng',
      sub: instructions
        ? `${instructions.split('\n').filter(Boolean).length} chỉ dẫn cho ${agent}`
        : `Chưa dặn gì thêm — ${agent} đang trả lời theo quy tắc mặc định của Fonnus`,
      empty: !instructions,
    },
  ]

  return (
    <div className={styles.hub}>
      <div className={styles.rows}>
        {rows.map((r) => (
          <a key={r.segment} className={`${styles.rowLink} ${r.empty ? styles.rowEmpty : ''}`} href={appHref('le-tan', 'ho-so', r.segment)}>
            <span className={styles.rowIcon}>
              <Icon name={r.icon} size={20} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{r.title}</span>
              <span className={`${styles.rowSub} ${r.empty ? styles.rowSubEmpty : ''}`}>{r.sub}</span>
            </span>
            <span className={styles.rowChev}>
              <Icon name="chevron-right" size={18} />
            </span>
          </a>
        ))}
      </div>

      <div className={styles.hubFoot}>
        <span className={styles.hubFootIcon}>
          <Icon name="book-open" size={16} />
        </span>
        <span>
          Những gì {agent} <em>biết</em> về phòng khám — giá, giờ mở cửa, bác sĩ — nằm ở tab{' '}
          <a href={appHref('le-tan', 'kien-thuc')}>Kiến thức</a>.
        </span>
      </div>

      <span className={ui.hint}>
        Chưa biết bắt đầu từ đâu? Trả lời Fonnus ở khung trợ lý — mỗi câu trả lời điền thẳng vào một mục.
      </span>
    </div>
  )
}
