import { Button, Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import section from '../../styles/section.module.css'
import styles from './MissedCalls.module.css'

interface Step {
  icon: IconName
  when: string
  what: string
}

/*
 * The same call, twice — once as it goes today, once with Fonnus. Two parallel
 * three-step tracks instead of a time-axis chart: a clinic owner reads a
 * before/after at a glance, where an axis with bands and a legend has to be
 * decoded first.
 */
const TODAY: Step[] = [
  { icon: 'moon', when: '20:15', what: 'Khách gọi sau giờ làm' },
  { icon: 'phone-missed', when: 'Máy reo', what: 'Không có ai nghe' },
  { icon: 'user-round-x', when: '20:16', what: 'Khách gọi nơi khác' },
]

const WITH_FONNUS: Step[] = [
  { icon: 'moon', when: '20:15', what: 'Khách gọi sau giờ làm' },
  { icon: 'phone-call', when: '3 hồi chuông', what: 'Fonnus nghe máy' },
  { icon: 'calendar-check', when: '20:17', what: 'Lịch hẹn vào sổ' },
]

/** "Cái giá của một cuộc gọi nhỡ" — why this is a problem worth solving. */
export function MissedCalls() {
  return (
    <section id="vi-sao" data-reveal="0" className={section.section}>
      <div className={section.inner}>
        <div className={section.eyebrow}>Cái giá của một cuộc gọi nhỡ</div>
        <h2 className={`${section.heading} ${styles.heading}`}>
          Người gọi không để lại lời nhắn. Họ gọi phòng khám tiếp theo.
        </h2>
        <p className={`${section.lede} ${styles.lede}`}>
          Cùng một cuộc gọi lúc 8 giờ tối — hai kết cục khác nhau.
        </p>

        <div className={styles.tracks}>
          <Track
            variant="today"
            label="Hôm nay"
            steps={TODAY}
            outcome="Bỏ lỡ 1 khách hàng — và không có gì ghi lại để bạn biết."
          />
          <Track
            variant="fonnus"
            label="Với Fonnus"
            steps={WITH_FONNUS}
            outcome="Sáng mai mở máy, lịch hẹn đã nằm sẵn trong sổ."
          />
        </div>

        <div data-reveal="4" className={styles.answer}>
          <div className={styles.answerText}>Fonnus nghe máy 24/7, từ 2.500.000 đ mỗi tháng.</div>
          <a href="#bang-gia" style={{ textDecoration: 'none' }}>
            <Button variant="inverse">Xem bảng giá</Button>
          </a>
        </div>
      </div>
    </section>
  )
}

interface TrackProps {
  variant: 'today' | 'fonnus'
  label: string
  steps: Step[]
  outcome: string
}

function Track({ variant, label, steps, outcome }: TrackProps) {
  const fonnus = variant === 'fonnus'

  return (
    <div data-reveal={fonnus ? '3' : '2'} className={fonnus ? styles.trackFonnus : styles.trackToday}>
      <div className={styles.trackLabel}>
        <span className={styles.trackDot} aria-hidden="true" />
        {label}
      </div>

      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li key={step.what} className={styles.step}>
            <span className={styles.stepIcon}>
              <Icon name={step.icon} size={22} />
            </span>
            <span className={styles.stepWhen}>{step.when}</span>
            <span className={styles.stepWhat}>{step.what}</span>

            {i < steps.length - 1 ? (
              <span className={styles.arrow} aria-hidden="true">
                <Icon name="arrow-right" size={18} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <p className={styles.outcome}>{outcome}</p>
    </div>
  )
}
