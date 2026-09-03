import { Button } from '../design-system'
import { useSession } from '../auth/SessionProvider'
import styles from './Boot.module.css'

/*
 * The three screens that only exist because there is a network.
 *
 * None of them appears in the design bundle — there was nothing to wait for
 * when every answer was a local variable. They are deliberately quiet: a
 * clinic owner opening the app should see the shape of what is coming, not a
 * spinner apologising.
 */

/** The app frame with nothing in it, shown while `GET /me` is still in flight. */
export function ShellSkeleton() {
  return (
    <div className={styles.shell} aria-busy="true" aria-label="Đang tải">
      <div className={styles.sidebar}>
        <div className={`${styles.bar} ${styles.logo}`} />
        <div className={styles.navBars}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${styles.bar} ${styles.navBar}`} />
          ))}
        </div>
      </div>
      <div className={styles.content}>
        <div className={`${styles.bar} ${styles.title}`} />
        <div className={`${styles.bar} ${styles.line}`} />
        <div className={`${styles.bar} ${styles.card}`} />
      </div>
    </div>
  )
}

/** A section's content, while the tenant record loads. */
export function ContentSkeleton() {
  return (
    <div className={styles.contentOnly} aria-busy="true" aria-label="Đang tải">
      <div className={`${styles.bar} ${styles.title}`} />
      <div className={`${styles.bar} ${styles.line}`} />
      <div className={`${styles.bar} ${styles.card}`} />
    </div>
  )
}

/**
 * Shown when the session probe failed for a reason other than 401.
 *
 * The distinction matters: the server being unreachable is not the same as
 * being signed out, and redirecting to a sign-in screen the owner also cannot
 * reach would only lose their place.
 */
export function ConnectionError() {
  const { recheck } = useSession()
  return (
    <RetryCard
      title="Không kết nối được máy chủ"
      body="Bọn mình chưa liên lạc được với máy chủ Fonnus. Bạn kiểm tra mạng rồi thử lại giúp mình nhé."
      onRetry={recheck}
    />
  )
}

export function RetryCard({
  title,
  body,
  onRetry,
}: {
  title: string
  body: string
  onRetry: () => void
}) {
  return (
    <div className={styles.errorWrap} role="alert">
      <div className={styles.errorCard}>
        <div className={styles.errorTitle}>{title}</div>
        <p className={styles.errorBody}>{body}</p>
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    </div>
  )
}
