/*
 * Front-end session. Nothing here is a credential: it only records that the
 * code was verified in this browser, so a reload on `#/app` does not bounce the
 * owner back to the sign-in screen.
 *
 * TODO: replace with the httpOnly session cookie the auth endpoints will set;
 * `isSignedIn` then becomes a GET /me probe.
 */

const KEY = 'fonnus.session'

export interface Session {
  /** National-format phone, or the email / Google account that signed in. */
  identity: string
  method: 'phone' | 'email' | 'google'
  displayName: string
  signedInAt: string
}

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function isSignedIn(): boolean {
  return readSession() !== null
}

export function startSession(session: Omit<Session, 'signedInAt'>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...session, signedInAt: new Date().toISOString() }))
  } catch {
    /* private mode: the session simply does not survive a reload */
  }
}

export function endSession() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
