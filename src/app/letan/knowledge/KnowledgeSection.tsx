import type { ReactNode } from 'react'
import { SectionHead } from '../LeTanPage'
import styles from './Knowledge.module.css'

/**
 * The frame every Kiến thức sub-page is built in: the section head with its
 * way back to the hub, one line saying what the page is for, then the work
 * column beside the rail — the same geometry as a Hồ sơ section.
 *
 * `rail` is a prop rather than a child for the same reason `listen` is on
 * `PreviewCard`: a page cannot forget it, and it always lands in the same
 * place. Every screen ends in something you can hear.
 *
 * `bar` is the save bar, and it is a prop for a layout reason: it has to be
 * a child of the page column, *outside* the grid. It is sticky, it stretches
 * to the column, and it keeps a margin clear of the docked assistant by
 * reading `--dock-inset` — inside the 720px work column that margin leaves
 * it 320px wide and crushed against the left edge.
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
        <div className={styles.col}>{children}</div>
        <aside className={styles.rail}>{rail}</aside>
      </div>
      {bar}
    </>
  )
}
