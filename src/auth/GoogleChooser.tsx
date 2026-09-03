import { useEffect } from 'react'
import { api } from '../api'
import type { GoogleAccount } from '../api'
import styles from './GoogleChooser.module.css'

interface GoogleChooserProps {
  onPick: (account: GoogleAccount) => void
  onDismiss: () => void
}

/*
 * Stands in for the Google OAuth popup, which cannot exist without a client ID.
 * Rendered as an in-page dialog so the flow stays walkable; when the real OAuth
 * lands this whole component is replaced by a redirect.
 */
export function GoogleChooser({ onPick, onDismiss }: GoogleChooserProps) {
  // Empty in live mode: the real flow is a redirect, not an in-page chooser.
  const accounts = api.auth.googleAccounts()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return (
    <div className={styles.scrim} onClick={onDismiss}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Chọn tài khoản Google"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span className={styles.wordmark} aria-label="Google">
            <span style={{ color: '#4285F4' }}>G</span>
            <span style={{ color: '#EA4335' }}>o</span>
            <span style={{ color: '#FBBC05' }}>o</span>
            <span style={{ color: '#4285F4' }}>g</span>
            <span style={{ color: '#34A853' }}>l</span>
            <span style={{ color: '#EA4335' }}>e</span>
          </span>
          <span className={styles.chooseTitle}>Chọn tài khoản</span>
          <span className={styles.chooseSub}>để tiếp tục với Fonnus</span>
        </div>

        <div className={styles.accounts}>
          {accounts.map((account) => (
            <button
              key={account.email}
              type="button"
              className={styles.account}
              onClick={() => onPick(account)}
            >
              <span className={styles.avatar} aria-hidden="true">
                {account.initials}
              </span>
              <span className={styles.identity}>
                <span className={styles.name}>{account.name}</span>
                <span className={styles.email}>{account.email}</span>
              </span>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
            </button>
          ))}
          <button type="button" className={styles.other} onClick={onDismiss}>
            + Dùng tài khoản khác
          </button>
        </div>
      </div>
    </div>
  )
}
