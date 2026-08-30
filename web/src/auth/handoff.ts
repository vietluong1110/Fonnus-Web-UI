const KEY = 'fonnus.signup.phone'

/**
 * Carries the number typed in the landing hero across to the sign-up page, so
 * that field is not asked for twice. sessionStorage rather than a query param:
 * it survives a reload, but the owner's number never lands in the URL bar,
 * browser history or a shared link.
 */
export function stashPhone(phone: string) {
  try {
    sessionStorage.setItem(KEY, phone)
  } catch {
    // Private mode or storage disabled — sign-up just asks for the number.
  }
}

/** Reads and clears: the number is consumed once, by the first screen to ask. */
export function takePhone(): string {
  try {
    const value = sessionStorage.getItem(KEY) ?? ''
    sessionStorage.removeItem(KEY)
    return value
  } catch {
    return ''
  }
}
