import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import section from '../../styles/section.module.css'
import styles from './HowItWorks.module.css'
import { ForwardVisual, LiveCallVisual, SetupVisual } from './howitworks-visuals'

interface Step {
  icon: IconName
  eyebrow: string
  title: string
  body: string
  visual: ReactNode
}

const STEPS: Step[] = [
  {
    icon: 'settings',
    eyebrow: 'Bước 1 · 2 phút',
    title: 'Đăng ký và thiết lập trợ lý',
    body: 'Tạo tài khoản, khai thông tin phòng khám và bảng giá dịch vụ — trợ lý trả lời đúng theo dữ liệu của bạn.',
    visual: <SetupVisual />,
  },
  {
    icon: 'phone-call',
    eyebrow: 'Bước 2 · 3 phút',
    title: 'Cài số điện thoại',
    body: 'Dùng số Fonnus cấp, hoặc chuyển tiếp cuộc gọi từ số hiện tại của phòng khám sang Fonnus.',
    visual: <ForwardVisual />,
  },
  {
    icon: 'calendar-check',
    eyebrow: 'Bước 3 · từ đây, 24/7',
    title: 'Bệnh nhân gọi, Fonnus trả lời',
    body: 'Đặt lịch, báo giá và hỗ trợ 24/7 bằng tiếng Việt tự nhiên.',
    visual: <LiveCallVisual />,
  },
]

/**
 * A sticky stack: each step pins under the navbar and the next slides up over
 * it, leaving a sliver of the one below. You meet the steps one at a time
 * instead of being handed all three at once, and each card's right half plays
 * out what that step actually looks like.
 *
 * Below 900px the stacking is dropped — a card taller than the viewport cannot
 * pin, and on a phone the scroll is better spent on the content itself.
 */
export function HowItWorks() {
  return (
    <section id="cach-hoat-dong" data-reveal="0" className={`${section.section} ${section.milk}`}>
      <div className={section.inner}>
        <div className={section.eyebrow}>Cách hoạt động</div>
        <h2 className={`${section.heading} ${styles.heading}`}>
          Sẵn sàng nhận cuộc gọi trong chưa đầy 5 phút
        </h2>

        <div className={styles.stack}>
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={styles.slot}
              style={{ '--i': i, '--n': STEPS.length } as CSSProperties}
            >
              <article className={styles.card}>
                <div className={styles.copy}>
                  <span className={i === STEPS.length - 1 ? styles.bulletLive : styles.bullet}>
                    <Icon name={step.icon} size={22} />
                  </span>
                  <div className={styles.stepEyebrow}>{step.eyebrow}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                  <span className={styles.count}>
                    {i + 1} / {STEPS.length}
                  </span>
                </div>

                <div className={styles.visual}>{step.visual}</div>
              </article>
            </div>
          ))}
          <div aria-hidden="true" className={styles.runway} />
        </div>
      </div>
    </section>
  )
}
