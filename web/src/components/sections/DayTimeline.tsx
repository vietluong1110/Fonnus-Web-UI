import { Icon } from '../../design-system'
import styles from './DayTimeline.module.css'

interface CallMark {
  /** Position along the 8:00–22:00 track. */
  left: string
  label: string
  answered: boolean
}

const CALLS: CallMark[] = [
  { left: '13.3%', label: '9:00', answered: true },
  { left: '30%', label: '11:30', answered: true },
  { left: '50%', label: '14:30 · máy bận', answered: false },
  { left: '76.7%', label: '18:30', answered: false },
  { left: '93.3%', label: '21:00', answered: false },
]

export function DayTimeline() {
  return (
    <div data-reveal="1" className={styles.frame}>
      <div className={styles.head}>
        <span className={styles.title}>Một ngày của điện thoại phòng khám</span>
        <span className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendAnswered} /> Có người nghe
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendMissed} /> Không ai nghe
          </span>
        </span>
      </div>

      <div className={styles.scroller}>
        <div className={styles.track}>
          {CALLS.map((call) => (
            <span key={call.left} className={styles.timeLabel} style={{ left: call.left }}>
              {call.label}
            </span>
          ))}
          {CALLS.map((call) => (
            <span
              key={call.left}
              className={call.answered ? styles.answered : styles.missed}
              style={{ left: call.left }}
            >
              <Icon name={call.answered ? 'phone-incoming' : 'phone-missed'} size={18} />
            </span>
          ))}
          {CALLS.map((call) => (
            <span key={call.left} className={styles.tick} style={{ left: call.left }} />
          ))}

          <span className={styles.barBase} />
          <span className={styles.barOpen} />
          <span className={styles.barAfterHours} />

          <span className={styles.bandOpen}>Giờ mở cửa · 8:00 – 17:00</span>
          <span className={styles.bandAfterHours}>Ngoài giờ</span>

          <span className={styles.boundary} style={{ left: '6.7%' }}>
            8:00
          </span>
          <span className={styles.boundary} style={{ left: '66.7%' }}>
            17:00
          </span>
          <span className={styles.boundaryEnd}>22:00</span>
        </div>
      </div>
    </div>
  )
}
