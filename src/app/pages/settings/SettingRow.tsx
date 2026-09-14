import { useCallback, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { isCanceled, messageFor } from '../../../api'
import type { AccountOverview } from '../../../api'
import { Button, Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import styles from './Settings.module.css'

/*
 * The one geometry every setting takes: icon · label · value · action, reading
 * closed and growing its editor out from underneath when pressed. One row edits
 * at a time across the whole page, so an owner never has two half-typed boxes.
 */

export interface SectionProps {
  id: string
  overview: AccountOverview
  editing: string | null
  setEditing: (key: string | null) => void
  patch: (fn: (o: AccountOverview) => AccountOverview) => void
}

export function SettingRow({
  icon,
  label,
  editing = false,
  action,
  edit,
  children,
}: {
  icon: IconName | ReactNode
  label: string
  editing?: boolean
  action?: ReactNode
  edit?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={`${styles.row} ${editing ? styles.rowEditing : ''}`}>
      <span className={styles.rowIcon} aria-hidden="true">
        {typeof icon === 'string' ? <Icon name={icon as IconName} size={20} /> : icon}
      </span>
      <span className={styles.rowLabel}>{label}</span>
      {editing ? (
        <div className={styles.rowEdit}>{edit}</div>
      ) : (
        <>
          <div className={styles.rowValue}>{children}</div>
          <div className={styles.rowAction}>{action}</div>
        </>
      )}
    </div>
  )
}

export function RowMain({ children, soft = false }: { children: ReactNode; soft?: boolean }) {
  return <span className={`${styles.main} ${soft ? styles.mainSoft : ''}`}>{children}</span>
}

export function RowSub({ children }: { children: ReactNode }) {
  return <span className={styles.sub}>{children}</span>
}

/** A label on a hairline inside a card, with a count and the band's own action (§2). */
export function RowBand({ label, count, action }: { label: string; count?: number; action?: ReactNode }) {
  return (
    <div className={styles.band}>
      <span className={styles.eyebrow}>{label}</span>
      {count != null ? <span className={styles.bandCount}>{count}</span> : null}
      <span className={styles.bandLine} />
      {action}
    </div>
  )
}

export function LinkButton({
  children,
  onClick,
  quiet = false,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  quiet?: boolean
  disabled?: boolean
}) {
  return (
    <button type="button" className={`${styles.link} ${quiet ? styles.linkQuiet : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function EditActions({
  busy,
  onSave,
  onCancel,
  saveLabel = 'Lưu',
  busyLabel = 'Đang lưu…',
  error,
}: {
  busy: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  busyLabel?: string
  /** A message that belongs to the whole editor rather than to one field. */
  error?: string | null
}) {
  return (
    <>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
      <div className={styles.actions}>
        <Button size="sm" onClick={onSave} disabled={busy}>
          {busy ? busyLabel : saveLabel}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
          Huỷ
        </Button>
      </div>
    </>
  )
}

/** The editing state of one card's rows. `run` shows a failed save beside the button — no toast. */
export function useRowEdit(editing: string | null, setEditing: (key: string | null) => void) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = (key: string, init: Record<string, string> = {}) => {
    setEditing(key)
    setDraft(init)
    setError(null)
  }
  const close = () => {
    setEditing(null)
    setError(null)
  }
  const set = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setError(null)
  }
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      if (!isCanceled(e)) setError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }, [])

  return { draft, busy, error, open, close, set, run, fail: (message: string) => setError(message), is: (key: string) => editing === key }
}

export function onEnter(fn: () => void) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      fn()
    }
  }
}

/** Hands the browser a file the server named. */
export function downloadFile(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** A name compared the way a person types it: accents composed, case and spacing ignored. */
export const sameName = (a: string, b: string) => {
  const n = (v: string) => v.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')
  return n(a) !== '' && n(a) === n(b)
}
