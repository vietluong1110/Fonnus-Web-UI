import { Button, Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { MiniOrb } from '../../../components/orb/MiniOrb'
import { appHref } from '../../../hooks/useRoute'
import { LABELS } from '../defaults'
import { useConfig } from '../store'
import { GREETING_COMPLIANCE_BLOCK } from '../system'
import { Card, PlayButton, ui, useToast } from '../../ui'
import { defaultGreeting } from './preview'
import styles from './Profile.module.css'

/**
 * `#/app/le-tan/ho-so` — the hub.
 *
 * The page used to be every persona field at once, four cards deep and two
 * columns wide. It is now a summary and three ways in: what the caller hears
 * in the first eight seconds, who is answering, and one row per sub-page.
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
  const { toast } = useToast()

  const agent = config.agent_name || 'Linh'
  const voice = LABELS.voices[config.voice_selection]
  const greeting = config.greeting_script_custom.trim() || defaultGreeting(config.business_name, agent)
  const dayparts = config.greeting_by_daypart.enabled

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
    config.tenant_instructions.trim()
      ? {
          segment: 'chi-dan',
          icon: 'clipboard-list',
          title: 'Chỉ dẫn riêng',
          sub: `${config.tenant_instructions.trim().split('\n').filter(Boolean).length} chỉ dẫn cho ${agent}`,
        }
      : {
          segment: 'chi-dan',
          icon: 'clipboard-list',
          title: 'Chỉ dẫn riêng',
          sub: `Chưa dặn gì thêm — ${agent} đang trả lời theo quy tắc mặc định của Fonnus`,
          empty: true,
        },
  ]

  return (
    <div className={styles.hub}>
      {/*
        The whole point of the page in one card: the two lines the caller
        actually hears, in order, playable. The locked line is shown because
        it is part of the call — not flagged as a legal requirement, which is
        Fonnus's problem rather than the clinic's.
      */}
      <Card>
        <div className={styles.hero}>
          <div className={styles.heroLines}>
            <span className={styles.eyebrow}>Khách gọi đến — {agent} nghe máy như thế này</span>

            <div className={`${styles.turnBody} ${styles.turnLocked}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flex: '0 0 auto', marginTop: 2 }}>
                <Icon name="lock" size={14} />
              </span>
              <span>“{GREETING_COMPLIANCE_BLOCK}”</span>
            </div>

            <div className={`${styles.turnBody} ${styles.turnGreeting}`}>“{greeting}”</div>

            <div className={styles.heroFoot}>
              <PlayButton text={`${GREETING_COMPLIANCE_BLOCK} ${greeting}`} label="Nghe cả đoạn mở đầu" />
              <span className={ui.hint}>
                Câu đầu do Fonnus đọc trước mọi cuộc gọi và không sửa được. Câu sau là của phòng khám.
              </span>
            </div>
          </div>

          <div className={styles.who}>
            <MiniOrb size={56} />
            <div>
              <div className={styles.whoName}>{agent}</div>
              <div className={ui.hint} style={{ marginTop: 2 }}>
                {voice.desc} · nói {LABELS.speed[config.speaking_speed].toLowerCase()} · {LABELS.style[config.personality_style].toLowerCase()}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Icon name="phone-call" size={15} />}
              onClick={() => toast('Gọi thử sẽ nối máy khi số Fonnus được cấp — xem mục Số điện thoại.', 'neutral')}
            >
              Gọi thử {agent}
            </Button>
          </div>
        </div>
      </Card>

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
    </div>
  )
}
