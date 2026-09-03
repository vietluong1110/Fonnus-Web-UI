/**
 * The voice pipeline, against a real backend.
 *
 * `previewTts` is a plain POST and is ready — it is the realistic first live
 * piece here, because it is what the ten play buttons across the Lễ tân config
 * screens call.
 *
 * `connect` is **deliberately not implemented**. The transport is undecided
 * (WebSocket into FreeSWITCH, or WebRTC through an SFU) and guessing would
 * produce code that has to be deleted rather than fixed. What is settled is the
 * `VoiceSession` shape in `contracts.ts`: whichever transport wins, the UI's
 * whole microphone surface stays a boolean and the orb keeps polling
 * `getAmplitude()` from its own animation frame. See docs/api-contract.md §7
 * and open-questions.md Q21 — the cost controls have to exist before the
 * endpoint does.
 */
import type { VoiceApi, VoiceSession } from './contracts'
import { ApiError } from './errors'
import { http } from './http'

export const voiceLive: VoiceApi = {
  connect(): Promise<VoiceSession> {
    return Promise.reject(
      new ApiError({
        kind: 'unknown',
        code: 'voice_transport_undecided',
        cause:
          'Live voice sessions are not implemented: the transport is undecided. ' +
          'See docs/api-contract.md §7. Keep VITE_API_LIVE_GROUPS without "voice".',
      }),
    )
  },

  previewTts(input, opts) {
    return http.post<{ url: string; duration_ms: number }>('/tts/preview', input, {
      signal: opts?.signal,
    })
  },
}
