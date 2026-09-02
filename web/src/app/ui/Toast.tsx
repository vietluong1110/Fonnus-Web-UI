import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Bits.module.css'

/*
 * Toasts state a fact: "Đã lưu Dịch vụ và giá." No exclamation, no praise.
 */

type Tone = 'success' | 'error' | 'neutral'

interface ToastItem {
  id: number
  text: ReactNode
  tone: Tone
}

interface ToastApi {
  toast: (text: ReactNode, tone?: Tone) => void
}

const ToastContext = createContext<ToastApi>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const toast = useCallback((text: ReactNode, tone: Tone = 'success') => {
    const id = ++seq.current
    setItems((list) => [...list.slice(-2), { id, text, tone }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3200)
  }, [])

  const api = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.toasts} aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`${styles.toast} ${t.tone === 'error' ? styles.toastError : ''} ${t.tone === 'neutral' ? styles.toastNeutral : ''}`}
          >
            {t.tone === 'success' ? (
              <span className={styles.toastMark} style={{ color: 'var(--success)' }}>
                ✓
              </span>
            ) : t.tone === 'error' ? (
              <span className={styles.toastMark} style={{ color: 'var(--error)' }}>
                ✕
              </span>
            ) : null}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
