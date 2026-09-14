import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api, isCanceled, setUnauthorizedHandler } from '../api'
import type { ApiError, Me } from '../api'
import { clearMockTenantData } from '../api'
import { navigate } from '../hooks/useRoute'
import { clearSessionHint, readSessionHint, writeSessionHint } from './session'

/*
 * Who is signed in, for the whole app.
 *
 * Mounted above the route switch in `Root`, so the probe runs once at boot
 * rather than restarting every time someone navigates into `#/app`.
 *
 * Three states, not a boolean. "We don't know yet" is a real answer and the one
 * the old synchronous `isSignedIn()` could not express — which is why replacing
 * it was the first thing a real network would have broken.
 */

export type SessionStatus = 'checking' | 'authenticated' | 'anonymous'

interface SessionState {
  status: SessionStatus
  me: Me | null
  /**
   * Set when the probe failed for a reason *other* than 401 — the server is
   * unreachable, which is not the same as being signed out. `AppRoot` uses this
   * to show a retry card instead of bouncing a signed-in owner to sign-in.
   */
  error: ApiError | null
  /** True if this browser completed a sign-in recently. Used only to pick a placeholder. */
  hint: boolean
  signIn: (me: Me) => void
  /** Cài đặt changed the name, the login number or the plan the sidebar prints. */
  patchMe: (patch: Partial<Me>) => void
  signOut: () => Promise<void>
  recheck: () => void
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('checking')
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [nonce, setNonce] = useState(0)
  const hint = useRef(readSessionHint()).current

  useEffect(() => {
    // StrictMode double-invokes this in development. Without the abort, two
    // probes race and the loser's setState looks like a flicker bug in our code.
    const ac = new AbortController()

    api.auth
      .me({ signal: ac.signal })
      .then((found) => {
        if (ac.signal.aborted) return
        setError(null)
        if (found) {
          setMe(found)
          setStatus('authenticated')
          writeSessionHint()
        } else {
          setMe(null)
          setStatus('anonymous')
          clearSessionHint()
        }
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted || isCanceled(e)) return
        // Unreachable is not signed-out: keep the hint so a retry can still
        // land the owner back in the app rather than at a login screen.
        setError(e as ApiError)
        setMe(null)
        setStatus('anonymous')
      })

    return () => ac.abort()
  }, [nonce])

  const signIn = useCallback((next: Me) => {
    setMe(next)
    setStatus('authenticated')
    setError(null)
    writeSessionHint()
  }, [])

  const patchMe = useCallback((patch: Partial<Me>) => {
    setMe((m) => (m ? { ...m, ...patch } : m))
  }, [])

  const forget = useCallback(() => {
    setMe(null)
    setStatus('anonymous')
    clearSessionHint()
    // One owner's clinic must not greet the next one on a shared laptop.
    clearMockTenantData()
  }, [])

  const signOut = useCallback(async () => {
    forget()
    try {
      await api.auth.signOut()
    } catch {
      // Already gone server-side, or unreachable. Either way the local session
      // is cleared and the owner is out; there is nothing to tell them.
    }
    navigate('signin')
  }, [forget])

  const recheck = useCallback(() => {
    setStatus('checking')
    setNonce((n) => n + 1)
  }, [])

  // A 401 from anywhere in the app means the cookie expired mid-session.
  // Registered here rather than imported by `http`, so the transport layer
  // never depends on React.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      forget()
      navigate('signin')
    })
    return () => setUnauthorizedHandler(null)
  }, [forget])

  const value = useMemo(
    () => ({ status, me, error, hint, signIn, patchMe, signOut, recheck }),
    [status, me, error, hint, signIn, patchMe, signOut, recheck],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
