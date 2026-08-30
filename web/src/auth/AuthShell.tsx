import type { ReactNode } from 'react'
import { Logo } from '../design-system'
import { SIGNIN_PANEL, SIGNUP_PANEL } from '../data/auth'
import { hrefFor } from '../hooks/useRoute'
import styles from './AuthShell.module.css'

/**
 * The two-column frame every auth screen sits in.
 *
 * The left panel is what separates the two doors: sign-up gets the night panel
 * with the product promise (you are being sold to), sign-in gets the warm panel
 * with a welcome back (you already bought). Same geometry, different mood.
 */
interface AuthShellProps {
  variant: 'signup' | 'signin'
  /** Rendered above the form; the step indicator, when the flow has steps. */
  stepper?: ReactNode
  /** Vertically centres the form — for screens with no stepper. */
  centred?: boolean
  children: ReactNode
  /** Covers the whole shell, e.g. the Google account chooser. */
  overlay?: ReactNode
}

export function AuthShell({ variant, stepper, centred = false, children, overlay }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      {variant === 'signup' ? <SignUpPanel /> : <SignInPanel />}

      <div className={`${styles.content} ${centred || !stepper ? styles.contentCentred : ''}`}>
        <a className={styles.exit} href={hrefFor('landing')}>
          ‹ Về trang chủ
        </a>

        <div className={styles.mobileLogo}>
          <Logo variant="horizontal" height={28} />
        </div>

        {stepper}
        <div className={`${styles.form} ${stepper ? styles.formTopGap : ''}`}>{children}</div>
      </div>

      {overlay}
    </div>
  )
}

function SignUpPanel() {
  return (
    <div className={`${styles.panel} ${styles.panelNight}`}>
      <Logo variant="mark-dark" height={44} />

      <div className={styles.panelBody}>
        <h2 className={styles.panelHeadline}>{SIGNUP_PANEL.headline}</h2>
        <span className={styles.panelLede}>{SIGNUP_PANEL.lede}</span>
      </div>

      <div className={styles.stats}>
        {SIGNUP_PANEL.stats.map((stat) => (
          <div key={stat.value} className={styles.stat}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SignInPanel() {
  return (
    <div className={`${styles.panel} ${styles.panelWarm}`}>
      <Logo variant="horizontal" height={30} />

      <div className={styles.panelBodyCentred}>
        <Logo variant="mark" height={72} />
        <h2 className={`${styles.panelHeadline} ${styles.panelHeadlineWarm}`}>{SIGNIN_PANEL.headline}</h2>
        <span className={`${styles.panelLede} ${styles.panelLedeWarm}`}>{SIGNIN_PANEL.lede}</span>
      </div>

      <span className={styles.panelFootnote}>{SIGNIN_PANEL.footnote}</span>
    </div>
  )
}

/** Title + optional subtitle, at the top of a form block. */
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.heading}>
      <h1 className={styles.title}>{title}</h1>
      {children ? <span className={styles.subtitle}>{children}</span> : null}
    </div>
  )
}
