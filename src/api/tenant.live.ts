/**
 * The tenant record against the real backend.
 *
 * Endpoints and worked request bodies: `docs/api-contract.md` §3.
 *
 * Two things this file assumes, both listed as open questions because they are
 * not settled yet:
 *
 * - The PATCH body is catalogue snake_case at the top level, unwrapped — the
 *   same shape `ReceptionistConfig` already has, so there is no mapping layer
 *   here and there should never need to be one (Q1).
 * - The response carries the **whole** record, not just the changed keys, so
 *   server-assigned row ids and any normalisation reconcile for free (Q4).
 */
import type { TenantApi, TenantConfigEnvelope } from './contracts'
import type { KnowledgeFile } from '../app/letan/model'
import { http } from './http'

export const tenantLive: TenantApi = {
  getConfig(opts) {
    return http.get<TenantConfigEnvelope>('/tenant/config', { signal: opts?.signal })
  },

  patchConfig(patch, opts) {
    return http.patch<TenantConfigEnvelope>('/tenant/config', patch, {
      signal: opts?.signal,
      // Optimistic concurrency: the server rejects with 409 if someone else
      // wrote first, and the UI offers a reload rather than clobbering them.
      headers: opts?.version ? { 'If-Match': opts.version } : undefined,
    })
  },

  resetToTemplate(vertical, opts) {
    return http.post<TenantConfigEnvelope>(
      '/tenant/config/reset',
      { vertical },
      { signal: opts?.signal },
    )
  },

  uploadKnowledgeFile(file, opts) {
    const form = new FormData()
    form.append('file', file)
    return http.upload<KnowledgeFile>('/tenant/knowledge-files', form, {
      signal: opts?.signal,
      onProgress: opts?.onProgress,
    })
  },

  async deleteKnowledgeFile(id, opts) {
    await http.del<void>(`/tenant/knowledge-files/${encodeURIComponent(id)}`, {
      signal: opts?.signal,
    })
  },
}
