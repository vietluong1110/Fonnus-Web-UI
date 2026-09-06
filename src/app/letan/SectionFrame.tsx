import type { ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import { SetupChat } from './assistant/SetupChat'
import { ui } from '../ui'
import styles from './Section.module.css'

/**
 * The frame every Lễ tân sub-page is built in, and the row every hub is built
 * from. One copy, because three pages of it drifting apart is how a product
 * stops feeling like one product.
 *
 * A section page is: the head with its way back to the hub, one line saying
 * what the page is for, then the work column beside the rail.
 *
 * `rail` is a prop rather than a child for the same reason `listen` is on
 * `PreviewCard`: a page cannot forget it, and it always lands in the same
 * place. The rail is the try-out panel at the top and the assistant's window
 * at the foot (the `aside` slot — see SetupChat), which is why the frame owns
 * it.
 *
 * `bar` is the save bar. It is the last thing in the form column, so it spans
 * exactly the form's width and sticks to the bottom edge level with the
 * assistant beside it.
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
          <div className={styles.railTop}>{rail}</div>
          <SetupChat variant="dock" at="aside" />
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
 */
export function HubRow({
  href,
  icon,
  title,
  sub,
  empty = false,
}: {
  href: string
  icon: IconName
  title: string
  /** One line, in the receptionist's terms: what she can say because of this. */
  sub: string
  /** Nothing filled in yet: dashed edge, and the summary takes the accent. */
  empty?: boolean
}) {
  return (
    <a className={`${styles.rowLink} ${empty ? styles.rowEmpty : ''}`} href={href}>
      <span className={styles.rowIcon}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={`${styles.rowSub} ${empty ? styles.rowSubEmpty : ''}`}>{sub}</span>
      </span>
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
