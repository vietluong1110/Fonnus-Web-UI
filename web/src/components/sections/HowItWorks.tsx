import { Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import section from '../../styles/section.module.css'
import styles from './HowItWorks.module.css'

interface Step {
  icon: IconName
  eyebrow: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: 'settings',
    eyebrow: 'Bước 1 · 2 phút',
    title: 'Đăng ký và thiết lập trợ lý',
    body: 'Tạo tài khoản, khai thông tin phòng khám và bảng giá dịch vụ — trợ lý trả lời đúng theo dữ liệu của bạn.',
  },
  {
    icon: 'phone-call',
    eyebrow: 'Bước 2 · 3 phút',
    title: 'Cài số điện thoại',
    body: 'Dùng số Fonnus cấp, hoặc chuyển tiếp cuộc gọi từ số hiện tại của phòng khám sang Fonnus.',
  },
  {
    icon: 'calendar-check',
    eyebrow: 'Bước 3 · từ đây, 24/7',
    title: 'Bệnh nhân gọi, Fonnus trả lời',
    body: 'Đặt lịch, báo giá và hỗ trợ 24/7 bằng tiếng Việt tự nhiên.',
  },
]

export function HowItWorks() {
  return (
    <section id="cach-hoat-dong" data-reveal="0" className={`${section.section} ${section.milk}`}>
      <div className={section.inner}>
        <div className={section.eyebrow}>Cách hoạt động</div>
        <h2 className={`${section.heading} ${styles.heading}`}>
          Sẵn sàng nhận cuộc gọi trong chưa đầy 5 phút
        </h2>

        <div className={styles.steps}>
          {STEPS.map((step, i) => {
            const isLast = i === STEPS.length - 1
            return (
              <div key={step.title} data-reveal={String(i + 1)}>
                <div className={styles.rail}>
                  <span className={isLast ? styles.bulletLive : styles.bullet}>
                    <Icon name={step.icon} size={22} />
                  </span>
                  {isLast ? null : <span className={styles.thread} />}
                </div>
                <div className={styles.stepEyebrow}>{step.eyebrow}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
