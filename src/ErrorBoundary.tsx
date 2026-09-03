import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

/*
 * The last line of defence. Without one of these, a render error anywhere
 * unmounts the whole tree and leaves a white page — no message, no way back.
 *
 * React still has no hook form of this, so it is a class. That is the reason,
 * and the only one.
 */

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Nothing is shipped anywhere yet; when there is an error service, this is
    // the one place that needs to call it.
    console.error('[fonnus] render failed', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className={styles.wrap} role="alert">
        <div className={styles.card}>
          <h1 className={styles.title}>Có lỗi xảy ra</h1>
          <p className={styles.body}>
            Trang gặp sự cố và không hiển thị được. Bạn tải lại giúp mình nhé — thông tin đã lưu
            vẫn còn nguyên.
          </p>
          <button type="button" className={styles.button} onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
        </div>
      </div>
    )
  }
}
