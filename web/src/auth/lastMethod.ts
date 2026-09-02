export type AuthMethod = 'phone' | 'google' | 'email'

const KEY = 'fonnus.auth.lastMethod'

/**
 * Which way this browser got in last time, so sign-in can point at it.
 *
 * localStorage, not sessionStorage: the whole value is that it survives until
 * the owner comes back next week. Only the name of the method is kept — never
 * the number, the email or anything that identifies who they are.
 */
export function rememberMethod(method: AuthMethod) {
  try {
    localStorage.setItem(KEY, method)
  } catch {
    // Private mode or storage disabled — the badge just never shows.
  }
}

export function readLastMethod(): AuthMethod | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'phone' || value === 'google' || value === 'email' ? value : null
  } catch {
    return null
  }
}
