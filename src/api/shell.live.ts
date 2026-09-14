/**
 * The sidebar's figures, against the real backend.
 *
 * Read on every navigation and whenever a page changes one of the figures, so it has to be
 * cheap: three counts and the cycle's minutes, nothing else.
 *
 * Wire shape: `docs/api-contract.md` §12.
 */
import type { ShellApi, ShellSummary } from './contracts'
import { http } from './http'

export const shellLive: ShellApi = {
  summary(opts) {
    return http.get<ShellSummary>('/shell/summary', { signal: opts?.signal })
  },
}
