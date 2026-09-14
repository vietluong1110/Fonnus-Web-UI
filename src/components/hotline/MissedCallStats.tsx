import type { CSSProperties, RefObject } from 'react'
import { StackedColumns } from '../../app/ui/Charts'
import type { StackedColumn } from '../../app/ui/Charts'
import { Button, Icon } from '../../design-system'
import { CALL_REASONS, MISSED_BY_HOUR, MISSED_OVERALL, STUDY, WORKING_HOURS } from '../../data/hotlineReport'
import section from '../../styles/section.module.css'
import styles from './MissedCallStats.module.css'

/*
 * Two cards, two drawings, no paragraphs. The reference said the same things in
 * a chart with a pink/green legend and a donut; here both are one hue in two
 * steps (docs/visual-language.md § Charts — pink against green is the pair a
 * colour-blind owner cannot separate), and the donut is a grid of a hundred
 * dots, because "33 of these 100 calls" is read at a glance by anyone, where a
 * third of a ring has to be estimated. The ring also already means readiness in
 * the app.
 */

const COLUMNS: StackedColumn[] = MISSED_BY_HOUR.map((h) => ({
  key: h.time,
  tick: h.time,
  share: h.missed,
  shareLabel: `${h.missed}%`,
  restLabel: `${100 - h.missed}%`,
  tip: {
    head: `Lúc ${h.time}`,
    value: `${h.missed}% không ai nghe`,
    // The one thing the column does not already print: the share as calls.
    meta: `Cứ 10 cuộc gọi, ${Math.round(h.missed / 10)} cuộc không ai nghe`,
  },
}))

const DOTS = Array.from({ length: 100 }, (_, i) => i < MISSED_OVERALL)

interface MissedCallStatsProps {
  /** The head's button, watched by the page for its phone bottom-edge copy. */
  ctaRef: RefObject<HTMLDivElement | null>
  onRequest: () => void
}

/** "Phòng khám nào cũng bỏ lỡ nhiều cuộc gọi hơn mình nghĩ" — the case, before the ask. */
export function MissedCallStats({ ctaRef, onRequest }: MissedCallStatsProps) {
  return (
    <section id="so-lieu" className={`${section.section} ${styles.stats}`}>
      <div className={section.inner}>
        <div className={styles.head}>
          <div className={styles.claim}>
            <div data-reveal="0" className={section.eyebrow}>
              Chấm điểm hotline
            </div>
            <h1 data-reveal="1" className={styles.title}>
              Phòng khám nào cũng bỏ lỡ <span className={styles.titleAccent}>nhiều cuộc gọi hơn</span> mình nghĩ
            </h1>
            <p data-reveal="2" className={`${section.lede} ${styles.lede}`}>
              Một khảo sát đã gọi thử hơn <b className={section.num}>{STUDY.practices}</b> phòng khám nha khoa ở{' '}
              {STUDY.region}, như bệnh nhân thật. Kết quả khiến chính các phòng khám bất ngờ.
            </p>
          </div>

          <div ref={ctaRef} data-reveal="3" className={styles.cta}>
            <Button size="lg" onClick={onRequest} iconRight={<Icon name="chevron-down" size={18} />}>
              Nhận báo cáo miễn phí
            </Button>
            <span className={styles.ctaNote}>Miễn phí · Điền trong 1 phút</span>
          </div>
        </div>

        <div className={styles.cards}>
          <article data-reveal="0" className={styles.card}>
            <div className={styles.cardLabel}>
              <Icon name="hours" size={18} />
              Theo giờ trong ngày
            </div>
            <h2 className={styles.cardTitle}>Ngay trong giờ làm việc, hơn 1/3 cuộc gọi không ai nghe</h2>
            <p className={styles.cardLine}>Lễ tân đang bận, nghỉ trưa, hay tiếp bệnh nhân tại quầy.</p>

            <div className={styles.chart}>
              <StackedColumns
                columns={COLUMNS}
                label="Tỉ lệ cuộc gọi không ai nghe theo giờ trong ngày"
                bracket={{ ...WORKING_HOURS, label: 'Giờ làm việc' }}
              />
            </div>

            <div className={styles.foot} aria-hidden="true">
              <span className={styles.key}>
                <span className={styles.swatchMissed} />
                Không ai nghe
              </span>
              <span className={styles.key}>
                <span className={styles.swatchAnswered} />
                Có người nghe
              </span>
            </div>
          </article>

          <article data-reveal="1" className={styles.card}>
            <div className={styles.cardLabel}>
              <Icon name="missed" size={18} />
              Tính chung cả ngày
            </div>
            <h2 className={styles.cardTitle}>Lỡ một ít mỗi ngày, cả tháng là rất nhiều khách</h2>

            <div className={styles.share}>
              <div className={styles.figure}>
                <span className={styles.figureNum}>{MISSED_OVERALL}%</span>
                <span className={styles.figureLabel}>cuộc gọi không ai nghe</span>
                <span className={styles.figureRest}>
                  <b>{100 - MISSED_OVERALL}%</b> có người nghe
                </span>
              </div>

              <div
                className={styles.dots}
                role="img"
                aria-label={`Cứ 100 cuộc gọi, ${MISSED_OVERALL} cuộc không ai nghe`}
              >
                {DOTS.map((missed, i) => (
                  <span
                    key={i}
                    className={missed ? styles.dotMissed : styles.dot}
                    style={{ '--i': i } as CSSProperties}
                  />
                ))}
              </div>
            </div>

            <div className={styles.foot}>
              <p className={styles.footHead}>Người gọi không chỉ muốn đặt lịch</p>
              <ul className={styles.reasons}>
                {CALL_REASONS.map((reason) => (
                  <li key={reason.label} className={styles.reason}>
                    <Icon name={reason.icon} size={16} />
                    {reason.label}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
