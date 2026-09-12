import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { useConfig } from '../../letan/store'
import { LEVELS, effortLabel } from '../../letan/readiness'
import { Gain, ProgressRing, SECTION_ICONS, useReadiness, useTween } from '../../letan/ReadinessPanel'
import styles from './Overview.module.css'

/**
 * "Linh đã sẵn sàng 68%" — one band across the top of Tổng quan.
 *
 * It is the hub panel's first two lines and nothing else: the number, the level
 * being worked towards, and the single best next job with what it adds. The
 * levels, the arcs per tab and the rest of the queue stay on Lễ tân, because
 * this page's subject is the calls and a second full panel here would be the
 * same meter twice in the product.
 *
 * It reads `computeReadiness` like every other surface, so the number here and
 * the number on the hub can never disagree — that is the whole reason the
 * calculation lives in `readiness.ts` rather than in a component.
 *
 * Deliberately not the orb: the orb means "talk to her" and appears nowhere
 * else (ui-ux-principles §1, §9).
 */
export function ReadinessStrip() {
  const { config } = useConfig()
  const r = useReadiness()
  const agent = config.agent_name.trim() || 'Linh'

  // Rises from what this surface last showed, like the hub's ring — so coming
  // back from a section that was just filled in reads as a rise, not a jump.
  const shown = useTween('overview:readiness', r.percent / 100)
  const job = r.jobs[0]
  const next = LEVELS[Math.min(r.reached, LEVELS.length - 1)].label

  return (
    <section className={styles.strip} aria-label={`${agent} đã sẵn sàng đến đâu`}>
      <ProgressRing value={shown} size={46} stroke={5}>
        <span className={styles.stripPct}>{Math.round(shown * 100)}</span>
      </ProgressRing>

      <span className={styles.stripText}>
        <span className={styles.stripTitle}>
          {agent} đã sẵn sàng {r.percent}%
        </span>
        <span className={styles.stripMeta}>
          {job ? `Còn ${r.jobs.length} việc để lên “${next}”` : `Mọi mục đã đủ — ${agent} trả lời được mọi câu bạn đã dặn`}
        </span>
      </span>

      {job ? (
        <>
          <span className={styles.stripRule} />
          <a className={styles.job} href={appHref('le-tan', job.tab, job.section)}>
            <span className={styles.jobIcon}>
              <Icon name={SECTION_ICONS[job.section] ?? 'dot'} size={20} />
            </span>
            <span className={styles.jobText}>
              <span className={styles.jobTitle}>{job.label}</span>
              <span className={styles.jobMeta}>{effortLabel(job.effort)}</span>
            </span>
            <Gain value={job.gain} />
          </a>
          <span className={styles.headSpacer} />
          <a className={styles.stripGo} href={appHref('le-tan', job.tab, job.section)}>
            Làm ngay
            <Icon name="arrow-right" size={16} />
          </a>
        </>
      ) : (
        <>
          <span className={styles.stripRule} />
          <span className={styles.stripDone}>
            <Icon name="done" size={18} />
            Khi phòng khám thay đổi, sửa ở mục đó để {agent} nói đúng.
          </span>
        </>
      )}
    </section>
  )
}
