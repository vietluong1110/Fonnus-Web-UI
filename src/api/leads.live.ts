import type { LeadsApi } from './contracts'
import { http } from './http'

export const leadsLive: LeadsApi = {
  async submit(input, opts) {
    // Unauthenticated — this is a marketing page. Rate-limit by IP server-side;
    // a CAPTCHA here costs more leads than it saves.
    await http.post<void>(
      '/leads',
      { ...input, source: 'landing_contact' },
      { signal: opts?.signal, expect401: true, parse: 'none' },
    )
  },

  async requestHotlineReport(input, opts) {
    // Same terms as the contact form: unauthenticated, rate-limited by IP.
    await http.post<void>(
      '/leads/hotline-report',
      { ...input, source: 'hotline_report' },
      { signal: opts?.signal, expect401: true, parse: 'none' },
    )
  },
}
