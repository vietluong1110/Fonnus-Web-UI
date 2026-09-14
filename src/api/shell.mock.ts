/**
 * The sidebar's figures, faked in the browser — by asking the other mocks rather than inventing
 * numbers, so the badge on Cuộc gọi, the strip on Lịch hẹn and the meter on Cài đặt cannot say
 * something different from the sidebar.
 */
import type { ShellApi } from './contracts'
import { MOCK_PLANS, accountMock } from './account.mock'
import { appointmentsMock } from './appointments.mock'
import { callsMock } from './calls.mock'

const pad = (n: number) => String(n).padStart(2, '0')

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const shellMock: ShellApi = {
  async summary(opts) {
    const day = today()
    // `attention` is clinic-wide whatever week is asked for, so one day is enough.
    const [calls, week, account] = await Promise.all([
      callsMock.list({ range: '7d', filter: 'callback' }, opts),
      appointmentsMock.list(day, day, opts),
      accountMock.overview(opts),
    ])
    const plan = MOCK_PLANS.find((p) => p.id === account.subscription.plan_id) ?? MOCK_PLANS[1]
    return {
      generated_at: new Date().toISOString(),
      callbacks_owed: calls.counts.callback,
      appointments_waiting: week.attention.length,
      minutes: { used: account.usage.minutes_used, included: plan.minutes, renews_on: account.subscription.renews_on },
      plan_id: account.subscription.plan_id,
    }
  },
}
