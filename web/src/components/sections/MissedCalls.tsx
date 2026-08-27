import { Button, Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import section from '../../styles/section.module.css'
import styles from './MissedCalls.module.css'
import { DayTimeline } from './DayTimeline'

interface Moment {
  icon: IconName
  when: string
  what: string
}

const MOMENTS: Moment[] = [
  { icon: 'clock', when: 'Sau 5 giờ chiều', what: 'Phòng khám đóng cửa, điện thoại vẫn reo' },
  { icon: 'phone-call', when: 'Trong giờ làm', what: 'Tay đang làm, máy vẫn reo' },
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
          Một cuộc gọi không ai nghe không để lại dấu vết nào trên phần mềm quản lý.
        </p>

        <DayTimeline />

        <div className={styles.cards}>
          {MOMENTS.map((moment, i) => (
            <div key={moment.when} data-reveal={String(i + 2)} className={styles.card}>
              <span className={styles.cardIcon}>
                <Icon name={moment.icon} size={20} />
              </span>
              <div>
                <div className={styles.when}>{moment.when}</div>
                <div className={styles.what}>{moment.what}</div>
              </div>
            </div>
          ))}
        </div>

        <div data-reveal="4" className={styles.answer}>
          <div className={styles.answerText}>Fonnus nghe máy 24/7, từ 2.500.000 đ mỗi tháng.</div>
          <a href="#bang-gia" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Xem bảng giá</Button>
          </a>
        </div>
      </div>
    </section>
  )
}
