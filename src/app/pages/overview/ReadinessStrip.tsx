import { useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { useConfig } from '../../letan/store'
import { LEVELS } from '../../letan/readiness'
import { ProgressRing, SECTION_ICONS, useReadiness, useTween } from '../../letan/ReadinessPanel'
import styles from './Overview.module.css'

/**
 * "Linh đã sẵn sàng 79%" — one band across the top of Tổng quan, and then as
 * many of the jobs that move her up as the band has room for.
 *
 * The first version offered one job and a "Làm ngay" button for that same job,
 * which on a desktop left 350px of empty band beside a line saying "còn 4
 * việc". The jobs are the content; the band is only the width they get. So:
 *
 * - **Every job is its own pill, and a pill is the action.** The first, the best
 *   value per minute, is the filled one — it is what the "Làm ngay" button was,
 *   with the job's name on it instead of a verb.
 * - **The band shows what fits, and counts the rest.** Measured, not guessed per
 *   breakpoint: a Vietnamese job title is anywhere from 12 to 30 characters, so a
 *   fixed "three on desktop" either clips or leaves a hole. What does not fit
 *   folds into `+N việc`, which opens the full list on Lễ tân.
 * - **At least one job always shows**, and it ellipsises before it disappears.
 *
 * It reads `computeReadiness` like every other surface, so the number here and
 * the number on the hub can never disagree. Deliberately not the orb: the orb
 * means "talk to her" (ui-ux-principles §1, §9).
 */
export function ReadinessStrip() {
  const { config } = useConfig()
  const r = useReadiness()
  const agent = config.agent_name.trim() || 'Linh'
  const shown = useTween('overview:readiness', r.percent / 100)
  const next = LEVELS[Math.min(r.reached, LEVELS.length - 1)].label

  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(r.jobs.length)
  const jobKey = r.jobs.map((j) => `${j.id}:${j.gain}`).join('|')

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const chips = [...el.querySelectorAll<HTMLElement>('[data-chip]')]
      const more = el.querySelector<HTMLElement>('[data-more]')
      const cs = getComputedStyle(el)
      const gap = parseFloat(cs.columnGap) || 0
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const moreWidth = more?.offsetWidth ?? 0
      // The first pill may shrink and ellipsise, so its rendered width can already be the
      // squeezed one. Add back what its label is hiding, or two pills always "fit".
      const natural = (c: HTMLElement) => {
        const label = c.querySelector<HTMLElement>('[data-label]')
        return c.offsetWidth + (label ? Math.max(0, label.scrollWidth - label.clientWidth) : 0)
      }
      const widthOf = (k: number) => chips.slice(0, k).reduce((sum, c) => sum + natural(c), 0) + gap * (k - 1)
      let n = chips.length
      while (n > 1 && widthOf(n) + (n < chips.length ? gap + moreWidth : 0) > room) n--
      setFit(n)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [jobKey])

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
          {r.jobs.length ? `Còn ${r.jobs.length} việc để lên “${next}”` : `Mọi mục đã đủ`}
        </span>
      </span>

      <span className={styles.stripRule} />

      {r.jobs.length ? (
        <div className={styles.chips} ref={box}>
          {r.jobs.map((job, i) => {
            const hidden = i >= fit
            return (
              <a
                key={job.id}
                data-chip
                className={`${styles.chip} ${i === 0 ? styles.chipFirst : ''} ${hidden ? styles.chipHidden : ''}`}
                href={appHref('le-tan', job.tab, job.section)}
                aria-hidden={hidden || undefined}
                tabIndex={hidden ? -1 : undefined}
              >
                <Icon name={SECTION_ICONS[job.section] ?? 'dot'} size={16} />
                <span className={styles.chipLabel} data-label>
                  {job.label}
                </span>
                <span className={styles.chipGain}>+{job.gain}%</span>
              </a>
            )
          })}
          <a
            data-more
            className={`${styles.chipMore} ${fit >= r.jobs.length ? styles.chipHidden : ''}`}
            href={appHref('le-tan')}
            aria-hidden={fit >= r.jobs.length || undefined}
            tabIndex={fit >= r.jobs.length ? -1 : undefined}
          >
            +{Math.max(1, r.jobs.length - fit)} việc
          </a>
        </div>
      ) : (
        <span className={styles.stripDone}>
          <Icon name="done" size={18} />
          Khi phòng khám thay đổi, sửa ở mục đó để {agent} nói đúng.
        </span>
      )}
    </section>
  )
}
