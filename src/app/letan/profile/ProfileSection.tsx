import type { ReactNode } from 'react'
import { appHref } from '../../../hooks/useRoute'
import { SectionHead } from '../LeTanPage'
import { SetupChat } from '../assistant/SetupChat'
import styles from './Profile.module.css'

/**
 * The frame every Hồ sơ sub-page is built in — the twin of `KnowledgeSection`,
 * on its own stylesheet: the section head with its way back to the hub, one
 * line saying what the page is for, then the work column beside the rail.
 *
 * `rail` is a prop rather than a child for the same reason `listen` is on
 * `PreviewCard`: a page cannot forget it, and it always lands in the same
 * place. The rail is the preview at the top and the assistant's window at the
 * foot (the `aside` slot — see SetupChat), which is why the frame owns it.
 *
 * `bar` is the save bar. It is the last thing in the form column, so it
 * spans exactly the form's width and sticks to the bottom edge level with the
 * assistant beside it.
 */
export function ProfileSection({
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
      <SectionHead title={title} backLabel="Hồ sơ" backHref={appHref('le-tan', 'ho-so')} />
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
