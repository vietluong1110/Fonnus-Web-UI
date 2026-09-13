/**
 * Call figures for the Tổng quan tab, against the real backend.
 *
 * One call per page load and one per range change. Everything the page draws
 * comes back together on purpose: five figures, four breakdowns and the
 * attention queue are one screen and one moment, and five round trips would
 * let them disagree with each other while they landed.
 *
 * Wire shape: `docs/api-contract.md` §7.
 */
import type { InsightsApi, InsightsOverview } from './contracts'
import { http } from './http'

export const insightsLive: InsightsApi = {
  overview(range, opts) {
    return http.get<InsightsOverview>(`/insights/overview?range=${encodeURIComponent(range)}`, {
      signal: opts?.signal,
    })
  },
}
