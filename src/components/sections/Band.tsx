import { Pattern } from '../../design-system'
import styles from './Band.module.css'

/**
 * The divider band — "Dải phân cách" in the visual language: the rings
 * pattern at ×3 on blush, with one line of copy in the left column. It is the
 * only pattern the landing page carries (one kind per page), and it sits
 * between what Fonnus does and what it costs.
 */
export function Band() {
  return (
    <section aria-label="Fonnus" className={styles.band}>
      <Pattern name="band" className={styles.pattern} />
      <div className={styles.inner}>
        <div data-reveal="0" className={styles.eyebrow}>Fonnus cho phòng khám</div>
        <h2 data-reveal="1" className={styles.title}>
          Phòng khám vẫn chạy, ngay cả khi bạn không ngồi đó.
        </h2>
      </div>
    </section>
  )
}
