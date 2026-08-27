import { useId, useState } from 'react'
import { FAQS } from '../../data/content'
import section from '../../styles/section.module.css'
import styles from './Faq.module.css'

/** One answer open at a time; the first is open on load. */
export function Faq() {
  const [openIndex, setOpenIndex] = useState(0)
  const baseId = useId()

  return (
    <section id="faq" data-reveal="0" className={section.section}>
      <div className={styles.inner}>
        <div className={section.eyebrow}>Câu hỏi thường gặp</div>
        <h2 className={`${section.heading} ${styles.heading}`}>Những điều chủ phòng khám hỏi trước</h2>

        <div className={styles.list}>
          {FAQS.map((item, i) => {
            const open = openIndex === i
            const panelId = `${baseId}-panel-${i}`
            return (
              <div key={item.q} className={styles.item}>
                <button
                  onClick={() => setOpenIndex(open ? -1 : i)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className={styles.question}
                >
                  <span>{item.q}</span>
                  <span className={styles.sign}>{open ? '—' : '+'}</span>
                </button>
                <div id={panelId} className={open ? styles.answerWrapOpen : styles.answerWrap}>
                  <div className={styles.answerClip}>
                    <p className={styles.answer}>{item.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
