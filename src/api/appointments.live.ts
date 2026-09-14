/**
 * Appointments for the Lịch hẹn tab, against the real backend.
 *
 * One call per week the owner looks at, and one per action. The week comes
 * back with the clinic's whole attention list alongside it, so the strip above
 * the calendar never has to make a second request to stay honest.
 *
 * Connecting an outside calendar is a redirect: the server answers with the
 * provider's consent URL, and the return lands back on `#/app/lich-hen`.
 *
 * Wire shape: `docs/api-contract.md` §9.
 */
import type { Appointment, AppointmentsApi, AppointmentsWeek, CalendarConnection } from './contracts'
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

  calendars(opts) {
    return http.get<CalendarConnection[]>('/appointments/calendars', { signal: opts?.signal })
  },

  connectCalendar(provider, opts) {
    return http.post<{ redirect_url: string | null; connection: CalendarConnection | null }>(
      `/appointments/calendars/${encodeURIComponent(provider)}`,
      undefined,
      { signal: opts?.signal },
    )
  },

  disconnectCalendar(provider, opts) {
    return http.del<void>(`/appointments/calendars/${encodeURIComponent(provider)}`, { signal: opts?.signal })
  },
}
