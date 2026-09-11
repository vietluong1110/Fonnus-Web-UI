import type { ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import { useAppPath } from '../../hooks/useRoute'
import { ui } from '../ui'
import { sectionReadiness } from './readiness'
import { Gain, ProgressRing, SectionReadinessCard, useReadiness, useTween } from './ReadinessPanel'
import styles from './Section.module.css'

/**
 * The frame every Lễ tân sub-page is built in, and the row every hub is built
 * from. One copy, because three pages of it drifting apart is how a product
 * stops feeling like one product.
 *
 * A section page is: the head with its way back to the hub, one line saying
 * what the page is for, then the work column beside the rail.
 *
 * `rail` is a prop rather than a child so a page cannot forget it, and it
 * always lands in the same place. Above it the frame puts this section's
 * slice of the hub's readiness panel — how full the section is, and the one
 * thing still missing — so a sub-page answers the hub's question for its own
 * fields, in the same column.
 *
 * `bar` is the save bar. It is the last thing in the form column, so it spans
 * exactly the form's width and sticks to the bottom edge.
 */
export function SectionFrame({
  title,
  backLabel,
  backHref,
  lede,
  rail,
  bar,
  children,
}: {
  title: ReactNode
  backLabel: string
  backHref: string
  lede?: ReactNode
  rail: ReactNode
  bar?: ReactNode
  children: ReactNode
}) {
  // #/app/le-tan/<tab>/<section> — the section is the route's last segment.
  const path = useAppPath()
  const section = path[0] === 'le-tan' ? path[2] : undefined

  return (
    <>
      <div className={ui.pageHead}>
        <a className={ui.backLink} href={backHref}>
          ‹ {backLabel}
        </a>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {lede ? <p className={styles.lede}>{lede}</p> : null}
      <div className={styles.work}>
        <div className={styles.col}>
          {children}
          {bar}
        </div>
        <aside className={styles.rail}>
          <div className={styles.railTop}>
            {section ? <SectionReadinessCard section={section} title={title} /> : null}
            {rail}
          </div>
        </aside>
      </div>
    </>
  )
}

/**
 * One way in, on a hub: what the section currently holds, and a press to go
 * and change it.
 *
 * There are no "bắt buộc" chips on any of them. What a row shows instead is
 * what is *set* — the same information, phrased as a fact about the clinic
 * rather than as an obligation — and a row with nothing in it says so plainly
 * and wears a dashed edge. That is the whole nudge.
 *
 * The icon sits in the same ring the readiness panel beside the rows is drawn
 * with, filled to how much of the section is done. An empty row also says
 * what filling it adds to the panel's number — the one place the row and the
 * panel are visibly the same measurement.
 */
export function HubRow({
  href,
  section,
  icon,
  title,
  sub,
  empty = false,
}: {
  href: string
  /** The route segment, for the section's share of the readiness panel. */
  section: string
  icon: IconName
  title: string
  /** One line, in the receptionist's terms: what she can say because of this. */
  sub: string
  /** Nothing filled in yet: dashed edge, and the summary takes the accent. */
  empty?: boolean
}) {
  const r = useReadiness()
  const s = sectionReadiness(r, section)
  const progress = s?.progress ?? 0
  const gain = Math.round(((1 - progress) / r.sections.length) * 100)
  // Rises from what the hub last showed, like the panel beside it.
  const shownProgress = useTween(`hub:section:${section}`, progress)

  return (
    <a className={`${styles.rowLink} ${empty ? styles.rowEmpty : ''}`} href={href}>
      <ProgressRing value={shownProgress}>
        <Icon name={icon} size={18} />
      </ProgressRing>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={`${styles.rowSub} ${empty ? styles.rowSubEmpty : ''}`}>{sub}</span>
      </span>
      {empty && gain > 0 ? <Gain value={gain} /> : null}
      <span className={styles.rowChev}>
        <Icon name="chevron-right" size={18} />
      </span>
    </a>
  )
}

/** The hub's closing line — where the neighbouring tab's half of the job lives. */
export function HubFoot({ children }: { children: ReactNode }) {
  return (
    <div className={styles.hubFoot}>
      <span className={styles.hubFootIcon}>
        <Icon name="guide" size={16} />
      </span>
      <span>{children}</span>
    </div>
  )
}

/** The hub's own column, and the label over a group of rows. */
export const sectionStyles = styles
