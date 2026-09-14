import { Icon } from '../design-system'
import { GoogleMark } from '../design-system/BrandMarks'
import type { AuthMethod } from './lastMethod'
import styles from './SocialOptions.module.css'

/**
 * The secondary ways in.
 *
 * One button, not two. Google is around three quarters of all social sign-ins,
 * so it gets the button and email gets a quiet link underneath — three equally
 * weighted options on a screen whose whole job is one action is three ways to
 * hesitate.
 */
interface SocialOptionsProps {
  googleLabel: string
  emailLabel: string
  onGoogle: () => void
  onEmail: () => void
  /** Marks the method this browser used last time, if any. */
  lastUsed?: AuthMethod | null
}

export function SocialOptions({
  googleLabel,
  emailLabel,
  onGoogle,
  onEmail,
  lastUsed = null,
}: SocialOptionsProps) {
  return (
    <div className={styles.block}>
      <div className={styles.divider}>hoặc</div>

      <button type="button" className={styles.google} onClick={onGoogle}>
        <GoogleMark className={styles.googleMark} />
        {googleLabel}
        {lastUsed === 'google' ? <LastUsedBadge /> : null}
      </button>

      <button type="button" className={styles.emailLink} onClick={onEmail}>
        <Icon name="mail" size={15} className={styles.emailIcon} />
        {emailLabel}
        {lastUsed === 'email' ? <LastUsedBadge /> : null}
      </button>
    </div>
  )
}

/** Marks the way this browser got in last time — the shortcut a returning owner wants. */
export function LastUsedBadge() {
  return <span className={styles.lastUsed}>Lần trước</span>
}

export function Terms() {
  return (
    <p className={styles.terms}>
      Khi tiếp tục, bạn đồng ý với <a href="#dieu-khoan">Điều khoản</a> và{' '}
      <a href="#bao-mat">Chính sách bảo mật</a> của Fonnus.
    </p>
  )
}
