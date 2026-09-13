/**
 * The Số điện thoại tab, against the real backend.
 *
 * The pool is paged and searched on the server — it is shared by every clinic,
 * so a copy in the browser would be stale the moment another clinic paid. A
 * purchase is a hold, then a checkout the page polls until the payment gateway
 * has answered.
 *
 * Wire shape: `docs/api-contract.md` §10.
 */
import type { Checkout, NumberHold, NumbersApi, NumbersOverview, OwnedNumber, PoolPage } from './contracts'
import { http } from './http'

const enc = encodeURIComponent

export const numbersLive: NumbersApi = {
  overview(opts) {
    return http.get<NumbersOverview>('/numbers', { signal: opts?.signal })
  },

  pool(query, opts) {
    return http.get<PoolPage>('/numbers/pool', {
      signal: opts?.signal,
      query: {
        pattern: query.pattern || undefined,
        q: query.q || undefined,
        cursor: query.cursor || undefined,
        limit: query.limit ? String(query.limit) : undefined,
      },
    })
  },

  hold(number, opts) {
    return http.post<NumberHold>('/numbers/holds', { number }, { signal: opts?.signal })
  },

  releaseHold(holdId, opts) {
    return http.del<void>(`/numbers/holds/${enc(holdId)}`, { signal: opts?.signal })
  },

  checkout(holdId, input, opts) {
    return http.post<Checkout>('/numbers/checkouts', { hold_id: holdId, ...input }, { signal: opts?.signal })
  },

  checkoutStatus(id, opts) {
    return http.get<Checkout>(`/numbers/checkouts/${enc(id)}`, { signal: opts?.signal, retry: false })
  },

  assign(id, receptionistId, opts) {
    return http.patch<OwnedNumber>(`/numbers/${enc(id)}`, { receptionist_id: receptionistId }, { signal: opts?.signal })
  },

  setForwarding(id, forwarding, opts) {
    return http.patch<OwnedNumber>(`/numbers/${enc(id)}`, { forwarding }, { signal: opts?.signal })
  },

  release(id, opts) {
    return http.del<void>(`/numbers/${enc(id)}`, { signal: opts?.signal })
  },
}
