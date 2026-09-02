import { normalizePhone } from './phone'

/*
 * Front-end only. Every function here stands in for a call that does not exist
 * yet — each one is marked TODO with the endpoint it should become. Nothing
 * leaves the browser and no credential is stored.
 */

/**
 * The one demo account. Sign in with this number and the code below to reach
 * the app shell. The two other numbers exist so the "already registered"
 * branch of sign-up stays reachable.
 */
export const DEMO_ACCOUNT = {
  phone: '0914378064',
  code: '111002',
  displayName: 'Nguyễn Lan',
  clinic: 'Nha khoa Việt Smile',
  plan: 'Gói Tiêu chuẩn',
}

const REGISTERED_PHONES = new Set([DEMO_ACCOUNT.phone, '0901234567', '0987654321'])

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

/**
 * TODO: POST /auth/otp/verify
 * Only the demo code verifies, so the wrong-code state is reachable with any
 * other six digits.
 */
export async function verifyCode(code: string): Promise<{ ok: boolean; reason?: 'invalid' }> {
  await delay(700)
  if (code !== DEMO_ACCOUNT.code) return { ok: false, reason: 'invalid' }
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
