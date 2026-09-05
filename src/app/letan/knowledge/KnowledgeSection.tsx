import type { ReactNode } from 'react'
import { SectionHead } from '../LeTanPage'
import { SetupChat } from '../assistant/SetupChat'
import styles from './Knowledge.module.css'

/**
 * The frame every Kiến thức sub-page is built in: the section head with its
 * way back to the hub, one line saying what the page is for, then the work
 * column beside the rail — the same geometry as a Hồ sơ section.
 *
 * `rail` is a prop rather than a child for the same reason `listen` is on
 * `PreviewCard`: a page cannot forget it, and it always lands in the same
 * place. Every screen ends in something you can hear. The rail is the preview
 * at the top and the assistant's window at the foot (the `aside` slot — see
 * SetupChat), which is why the frame owns it.
 *
 * `bar` is the save bar. It is the last thing in the form column, so it
 * spans exactly the form's width and sticks to the bottom edge level with the
 * assistant beside it.
 */
export function KnowledgeSection({
  title,
  lede,
  rail,
  bar,
  children,
}: {
  title: ReactNode
  lede?: ReactNode
  rail: ReactNode
  bar?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <SectionHead title={title} />
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
