/**
 * Appointments for the Lịch hẹn tab, against the real backend.
 *
 * One call per week the owner looks at, and one per action. The week comes
 * back with the clinic's whole attention list alongside it, so the strip above
 * the calendar never has to make a second request to stay honest.
 *
 * Wire shape: `docs/api-contract.md` §9.
 */
import type { Appointment, AppointmentsApi, AppointmentsWeek } from './contracts'
import { http } from './http'

export const appointmentsLive: AppointmentsApi = {
  list(from, to, opts) {
    return http.get<AppointmentsWeek>(`/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      signal: opts?.signal,
    })
  },

  act(id, action, opts) {
    return http.post<Appointment>(`/appointments/${encodeURIComponent(id)}/actions`, { action }, { signal: opts?.signal })
  },
}
