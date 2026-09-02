import { normalizePhone } from './phone'

/*
 * Front-end only. Every function here stands in for a call that does not exist
 * yet — each one is marked TODO with the endpoint it should become. Nothing
 * leaves the browser and no credential is stored.
 */

/** Numbers that pretend to already have an account, so frame 12 is reachable. */
const REGISTERED_PHONES = new Set(['0901234567', '0987654321'])

/** Anything but this passes, so the wrong-code state is reachable on demand. */
const WRONG_CODE = '000000'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** TODO: POST /auth/otp — returns whether the number already has an account. */
export async function sendPhoneCode(phone: string): Promise<{ existingAccount: boolean }> {
  await delay(650)
  return { existingAccount: REGISTERED_PHONES.has(normalizePhone(phone)) }
}

/** TODO: POST /auth/otp/email */
export async function sendEmailCode(_email: string): Promise<void> {
  await delay(650)
}

/** TODO: POST /auth/otp/verify */
export async function verifyCode(code: string): Promise<{ ok: boolean; reason?: 'invalid' }> {
  await delay(700)
  if (code === WRONG_CODE) return { ok: false, reason: 'invalid' }
  return { ok: true }
}

export interface Profile {
  fullName?: string
  phone?: string
  email?: string
}

/** TODO: PATCH /me — the account already exists once the code is verified. */
export async function saveProfile(_profile: Profile): Promise<void> {
  await delay(500)
}

/** Demo accounts for the Google chooser (frame 05). */
export const GOOGLE_ACCOUNTS = [
  { initials: 'NL', name: 'Nguyễn Lan', email: 'lan@vietsmile.vn' },
  { initials: 'VS', name: 'Việt Smile Clinic', email: 'info@vietsmile.vn' },
]

/** TODO: redirect to the Google OAuth endpoint instead of faking the chooser. */
export async function signInWithGoogle(account: (typeof GOOGLE_ACCOUNTS)[number]) {
  await delay(500)
  return account
}
