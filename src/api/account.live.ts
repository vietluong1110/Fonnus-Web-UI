/**
 * Cài đặt and Gói dịch vụ, against the real backend.
 *
 * One read for the whole settings page (`GET /account`), one for the plan
 * catalogue, and a small write per thing an owner changes. Linking Google is a
 * redirect: the server answers with the consent URL and the page follows it.
 *
 * Wire shape: `docs/api-contract.md` §11.
 */
import type { AccountApi, AccountOverview, AccountProfile, DataExport, InvoiceProfile, Plan, PlanQuote, Subscription } from './contracts'
import { http } from './http'

const enc = encodeURIComponent

export const accountLive: AccountApi = {
  overview(opts) {
    return http.get<AccountOverview>('/account', { signal: opts?.signal })
  },

  plans(opts) {
    return http.get<Plan[]>('/plans', { signal: opts?.signal })
  },

  updateProfile(patch, opts) {
    return http.patch<AccountProfile>('/account/profile', patch, { signal: opts?.signal })
  },

  requestPhoneChange(phone, opts) {
    return http.post<void>('/account/phone', { phone }, { signal: opts?.signal })
  },

  confirmPhoneChange(input, opts) {
    return http.post<AccountProfile>('/account/phone/verify', input, { signal: opts?.signal })
  },

  linkGoogle(opts) {
    return http.post<{ redirect_url: string | null; profile: AccountProfile }>('/account/google', undefined, { signal: opts?.signal })
  },

  unlinkGoogle(opts) {
    return http.del<AccountProfile>('/account/google', { signal: opts?.signal })
  },

  setPayMethod(method, opts) {
    return http.patch<void>('/account/billing', { pay_method: method }, { signal: opts?.signal })
  },

  setInvoiceProfile(profile, opts) {
    return http.patch<{ invoice_profile: InvoiceProfile }>('/account/billing', { invoice_profile: profile }, { signal: opts?.signal }).then(
      (r) => r.invoice_profile,
    )
  },

  changePassword(input, opts) {
    return http.post<void>('/account/password', input, { signal: opts?.signal })
  },

  signOutSession(id, opts) {
    return http.del<void>(`/account/sessions/${enc(id)}`, { signal: opts?.signal })
  },

  signOutOthers(opts) {
    return http.post<void>('/account/sessions/sign-out-others', undefined, { signal: opts?.signal })
  },

  startExport(opts) {
    return http.post<DataExport>('/account/export', undefined, { signal: opts?.signal })
  },

  exportStatus(opts) {
    return http.get<DataExport>('/account/export', { signal: opts?.signal })
  },

  scheduleDeletion(confirmName, opts) {
    return http.post<{ scheduled_for: string }>('/account/deletion', { confirm_name: confirmName }, { signal: opts?.signal })
  },

  cancelDeletion(opts) {
    return http.del<void>('/account/deletion', { signal: opts?.signal })
  },

  quotePlan(input, opts) {
    return http.post<PlanQuote>('/plans/quote', input, { signal: opts?.signal })
  },

  changePlan(input, opts) {
    return http.post<Subscription>('/subscription/change', input, { signal: opts?.signal })
  },

  cancelScheduledChange(opts) {
    return http.del<Subscription>('/subscription/scheduled', { signal: opts?.signal })
  },
}
