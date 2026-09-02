import { TESTIMONIALS } from '../../data/content'
import section from '../../styles/section.module.css'
import styles from './Testimonials.module.css'

export function Testimonials() {
  return (
    <section id="phong-kham" className={section.section}>
      <div className={section.inner}>
        <div data-reveal="0" className={section.eyebrow}>Phòng khám đang dùng</div>
        <h2 data-reveal="1" className={`${section.heading} ${styles.heading}`}>Mười phòng khám đầu tiên</h2>

        <div className={styles.grid}>
          {TESTIMONIALS.map((item, i) => (
            <div key={item.attribution} data-reveal={String(i)} className={styles.card}>
              <p className={styles.quote}>{item.quote}</p>
              <div className={styles.attribution}>{item.attribution}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
