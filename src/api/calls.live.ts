/**
 * The Cuộc gọi tab, against the real backend.
 *
 * Filtering, search and paging are the server's: the list is paged, so doing
 * any of them over the rows already loaded would count and show only whatever
 * arrived first.
 *
 * Wire shape: `docs/api-contract.md` §8.
 */
import type { CallDetail, CallListPage, CallSummary, CallsApi } from './contracts'
import { http } from './http'

export const callsLive: CallsApi = {
  list(query, opts) {
    return http.get<CallListPage>('/calls', {
      signal: opts?.signal,
      query: {
        range: query.range,
        filter: query.filter,
        q: query.q || undefined,
        cursor: query.cursor || undefined,
      },
    })
  },

  get(id, opts) {
    return http.get<CallDetail>(`/calls/${encodeURIComponent(id)}`, { signal: opts?.signal })
  },

  setCallbackDone(id, done, opts) {
    return http.post<CallSummary>(`/calls/${encodeURIComponent(id)}/callback`, { done }, { signal: opts?.signal })
  },
}
