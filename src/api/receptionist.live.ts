/**
 * The receptionist preview against a real backend.
 *
 * One plain POST. Unlike the setup assistant's turn, the record *is* sent:
 * the panel exists to hear an unsaved edit, so the server cannot use its own
 * copy. Wire shape in docs/api-contract.md §5.
 */
import type { ReceptionistApi, ReceptionistReply } from './contracts'
import { http } from './http'

export const receptionistLive: ReceptionistApi = {
  reply(turn, opts) {
    return http.post<ReceptionistReply>('/receptionist/preview', turn, { signal: opts?.signal })
  },
}
