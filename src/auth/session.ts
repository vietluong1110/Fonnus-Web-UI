/**
 * The session *hint* — not the session.
 *
 * The real session is an httpOnly cookie the browser holds and this app cannot
 * read. `GET /me` is the only way to know whether it is still valid, and that is
 * a round trip. This flag records "a sign-in completed in this browser recently"
 * so the app shell can render its frame while the probe is still in flight,
 * instead of flashing the sign-in screen at an owner who is perfectly signed in.
 *
 * It is deliberately not a credential and grants nothing: a stale `true` here
 * costs one skeleton frame before the probe answers 401 and redirects. Never
 * gate anything real on it.
 */

const HINT_KEY = 'fonnus.session.hint'

export function readSessionHint(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1'
  } catch {
    // Private mode: no hint, so a reload shows the sign-in screen a beat sooner.
    return false
  }
}

export function writeSessionHint(): void {
  try {
    window.localStorage.setItem(HINT_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearSessionHint(): void {
  try {
    window.localStorage.removeItem(HINT_KEY)
  } catch {
    /* ignore */
  }
}
