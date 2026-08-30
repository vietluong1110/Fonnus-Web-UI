import type { ReactNode } from 'react'
import styles from './SocialOptions.module.css'

interface SocialOptionsProps {
  googleLabel: string
  emailLabel: string
  onGoogle: () => void
  onEmail: () => void
}

/** The two secondary methods, identical on both doors bar the verb. */
export function SocialOptions({ googleLabel, emailLabel, onGoogle, onEmail }: SocialOptionsProps) {
  return (
    <>
      <div className={styles.divider}>hoặc</div>
      <div className={styles.options}>
        <button type="button" className={styles.option} onClick={onGoogle}>
          <span className={styles.googleG} aria-hidden="true">
            G
          </span>
          {googleLabel}
        </button>
        <button type="button" className={styles.option} onClick={onEmail}>
          <span aria-hidden="true">✉</span>
          {emailLabel}
        </button>
      </div>
    </>
  )
}

export function TrialNote({ children }: { children: ReactNode }) {
  return <span className={styles.trialNote}>{children}</span>
}

export function Terms() {
  return (
    <span className={styles.terms}>
      Khi tiếp tục, bạn đồng ý với <a href="#dieu-khoan">Điều khoản</a> và{' '}
      <a href="#bao-mat">Chính sách bảo mật</a> của Fonnus.
    </span>
  )
}

export function SwapLink({ children }: { children: ReactNode }) {
  return <span className={styles.swap}>{children}</span>
}
