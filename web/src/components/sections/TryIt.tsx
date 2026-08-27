import type { RefObject } from 'react'
import section from '../../styles/section.module.css'
import styles from './TryIt.module.css'

const POINTS = [
  'Không cần tải gì, không cần đăng ký',
  'Nói tiếng Việt tự nhiên, ngắt lời được',
  'Thoát lúc nào cũng được',
]

interface TryItProps {
  /** Placeholder the shared orb docks onto; owned by useOrbPlacement. */
  dockRef: RefObject<HTMLDivElement | null>
}

export function TryIt({ dockRef }: TryItProps) {
  return (
    <section id="nghe-thu" data-reveal="0" className={styles.tryIt}>
      <div className={styles.inner}>
        <div>
          <div className={section.eyebrowDeep}>Nghe thử</div>
          <h2 className={styles.heading}>Nghe một lần rồi quyết định</h2>
          <p className={styles.lede}>
            Bấm nút, Fonnus sẽ nói trước. Bạn hỏi giá, hỏi giờ mở cửa, hay xin một lịch hẹn — bằng giọng nói
            hoặc gõ chữ. Fonnus luôn trả lời bằng giọng nói.
          </p>
          <div className={styles.points}>
            {POINTS.map((point) => (
              <div key={point} className={section.check}>
                <span className={section.checkMark}>✓</span> {point}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.stage}>
          <div ref={dockRef} aria-hidden="true" className={styles.dock} />
        </div>
      </div>
    </section>
  )
}
