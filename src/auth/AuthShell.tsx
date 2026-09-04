import type { ReactNode } from 'react'
import { Icon, Logo, Pattern } from '../design-system'
import { AUTH_FOOTNOTE } from '../data/auth'
import { CONTACT } from '../data/content'
import { hrefFor } from '../hooks/useRoute'
import { SignInPanel, SignUpPanel } from './AuthPanel'
import styles from './AuthShell.module.css'

/**
 * The frame every auth screen sits in: panel on the left, one column of form on
 * the right, with a thin bar over it and a line of reassurance under it.
 *
 * There is no step indicator. Position in the flow is carried by the heading and
 * by `back` — a three-step flow that announces it is three steps only advertises
 * its own length, and the first thing an owner sees should be the field.
 */

export interface AuthBack {
  label: string
  /** A real href where the destination is a route; `onClick` where it is a step. */
  href?: string
  onClick?: () => void
}

interface AuthShellProps {
  variant: 'signup' | 'signin'
  /** Top left. Defaults to the way out; `null` where there is nowhere to go back to. */
  back?: AuthBack | null
  /** Top right — the other door. Omitted mid-flow, where it is a distraction. */
  swap?: ReactNode
  children: ReactNode
  /** Covers the whole shell, e.g. the Google account chooser. */
  overlay?: ReactNode
}

const HOME: AuthBack = { label: 'Trang chủ', href: hrefFor('landing') }

export function AuthShell({ variant, back = HOME, swap, children, overlay }: AuthShellProps) {
  const isSignUp = variant === 'signup'

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        <div className={styles.topbar}>
          {back ? <BackLink back={back} /> : <span />}
          {/* Two slots, one shown at a time: beside the back link on desktop,
              under the form on a phone, where the top bar has no room for it. */}
          {swap ? <span className={`${styles.swap} ${styles.swapTop}`}>{swap}</span> : null}
        </div>

        <div className={styles.middle}>
          <div className={styles.form}>
            {/* The panel carries the logo on desktop; below 900px it is gone. */}
            <a className={styles.mobileLogo} href={hrefFor('landing')} aria-label="Về trang chủ Fonnus">
              <Logo variant="horizontal" height={28} />
            </a>
            {children}
            {swap ? <span className={`${styles.swap} ${styles.swapBottom}`}>{swap}</span> : null}
          </div>
        </div>

        <p className={styles.footnote}>
          <span>{AUTH_FOOTNOTE.residency}</span>
          <span className={styles.footDot} aria-hidden="true">
            ·
          </span>
          <span className={styles.support}>
            {AUTH_FOOTNOTE.supportLabel}{' '}
            <a className={styles.num} href={CONTACT.phoneHref}>
              {CONTACT.phone}
            </a>{' '}
            <span className={styles.supportNote}>({AUTH_FOOTNOTE.supportNote})</span>
          </span>
        </p>
      </div>

      <aside className={`${styles.panel} ${isSignUp ? styles.panelNight : styles.panelWarm}`}>
        {/* Night takes the dots only; blush takes the 45° arc ("Cung chéo"). */}
        <Pattern name={isSignUp ? 'night-dots' : 'arcs'} style={{ zIndex: -1 }} />
        {isSignUp ? <SignUpPanel /> : <SignInPanel />}
      </aside>

      {overlay}
    </div>
  )
}

function BackLink({ back }: { back: AuthBack }) {
  const inner = (
    <>
      <Icon name="arrow-right" size={15} className={styles.backIcon} />
      {back.label}
    </>
  )

  return back.onClick ? (
    <button type="button" className={styles.back} onClick={back.onClick}>
      {inner}
    </button>
  ) : (
    <a className={styles.back} href={back.href}>
      {inner}
    </a>
  )
}

/** Title, plus the one line that says what happens next. */
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.heading}>
      <h1 className={styles.title}>{title}</h1>
      {children ? <p className={styles.subtitle}>{children}</p> : null}
    </div>
  )
}
