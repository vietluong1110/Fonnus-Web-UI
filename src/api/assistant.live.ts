/**
 * The setup assistant against a real model.
 *
 * **The wire format here is not agreed yet** — see `docs/api-contract.md` §7.
 * This is a working SSE reader written so the backend has something concrete to
 * push back on, not a settled contract. What *is* settled is the event union in
 * `contracts.ts`: whatever the transport ends up being, it has to produce those
 * events, because that is what the chat panel consumes.
 *
 * The assistant's write authority is deliberately narrow. It emits a `patch`
 * and the client applies it through the same path a form uses — it cannot write
 * to the record any other way.
 */
import { API_BASE_URL } from './env'
import { ApiError } from './errors'
import { http } from './http'
import type { AssistantApi, AssistantEvent, AttachmentRef } from './contracts'

/** Splits an SSE byte stream into `data:` payloads. */
async function* sseEvents(res: Response, signal?: AbortSignal): AsyncIterable<unknown> {
  const body = res.body
  if (!body) throw new ApiError({ kind: 'parse', status: res.status })
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  try {
    for (;;) {
      if (signal?.aborted) throw new ApiError({ kind: 'canceled' })
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      // Events are separated by a blank line.
      let split = buffer.indexOf('\n\n')
      while (split !== -1) {
        const frame = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n')
        if (data && data !== '[DONE]') {
          try {
            yield JSON.parse(data)
          } catch {
            // A malformed frame should not kill the stream.
          }
        }
        split = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

async function* run(body: unknown, signal?: AbortSignal): AsyncIterable<AssistantEvent> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/assistant/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      credentials: 'include',
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw new ApiError({ kind: 'canceled', cause: e })
    throw new ApiError({ kind: 'network', cause: e })
  }

  if (!res.ok) {
    throw new ApiError({ kind: res.status >= 500 ? 'server' : 'unknown', status: res.status })
  }

  let sawDone = false
  for await (const raw of sseEvents(res, signal)) {
    const event = raw as AssistantEvent
    if (event?.type === 'done') sawDone = true
    yield event
  }
  // A stream that ends without `done` still has to close the bubble.
  if (!sawDone) yield { type: 'done' }
}

export const assistantLive: AssistantApi = {
  send(turn, opts) {
    // The server holds its own copy of the record, so the turn's `config` is
    // not sent — see the note on AssistantTurn.config.
    const { config: _config, ...wire } = turn
    return run(wire, opts.signal)
  },

  upload(file, opts) {
    const form = new FormData()
    form.append('file', file)
    return http.upload<AttachmentRef>('/assistant/attachments', form, {
      signal: opts?.signal,
      onProgress: opts?.onProgress,
    })
  },
}
