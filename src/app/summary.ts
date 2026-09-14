import { useEffect, useState } from 'react'
import { api, isCanceled } from '../api'
import type { ShellSummary } from '../api'

/*
 * What the sidebar shows on every page — callbacks owed, bookings waiting, the minutes.
 *
 * Only the shell reads it, so the shell calls `api.shell` directly rather than growing a
 * provider (CLAUDE.md, "Network access goes through src/api/"). It reads again when the owner
 * moves to another page, comes back to the window, or a page changes one of the figures and
 * says so with `markSummaryStale`. Between reads the last answer stays on screen, and a failed
 * read keeps it: the sidebar is not where a network error is reported.
 */

const STALE = 'fonnus:summary-stale'

/** A page changed something the sidebar counts — a callback made, a booking confirmed, a plan changed. */
export function markSummaryStale(): void {
  window.dispatchEvent(new Event(STALE))
}

/** `page` is the first path segment: a new one means a new read. */
export function useShellSummary(page: string): ShellSummary | null {
  const [summary, setSummary] = useState<ShellSummary | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const again = () => setNonce((n) => n + 1)
    const onVisible = () => {
      if (document.visibilityState === 'visible') again()
    }
    window.addEventListener(STALE, again)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(STALE, again)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    api.shell
      .summary({ signal: ac.signal })
      .then((s) => {
        if (!ac.signal.aborted) setSummary(s)
      })
      .catch((e: unknown) => {
        if (isCanceled(e)) return
        // Keep the last figures; the next page or the next focus tries again.
      })
    return () => ac.abort()
  }, [page, nonce])

  return summary
}
