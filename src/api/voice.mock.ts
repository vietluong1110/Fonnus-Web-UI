/**
 * The voice demo, with no pipeline behind it.
 *
 * No microphone is opened and nothing is sent anywhere. The one genuinely real
 * thing is the greeting: `public/audio/linh-greeting.wav` plays through a Web
 * Audio analyser, so the orb's waves track an actual voice rather than a timer.
 * Asking a question only decides how long the agent stays in `speaking`.
 *
 * The timings live in `src/data/callDemo.ts` alongside the demo's copy.
 */
import { TYPED_SPEAK_MS, VOICE_PREVIEW_MS } from '../data/callDemo'
import type { VoiceApi, VoiceEvent, VoiceSession } from './contracts'
import { EventQueue } from './event-queue'
import { GreetingPlayer } from './greeting-player'
import { delay } from './mock-support'

/**
 * Fallback beat, used only when the browser refuses to play the greeting
 * (autoplay policy, missing codec). With audio, the recording's own length
 * decides how long the agent speaks.
 */
const GREETING_DELAY_MS = 1600
const GREETING_HOLD_MS = 5200

class MockVoiceSession implements VoiceSession {
  readonly events = new EventQueue<VoiceEvent>()
  private greeting: GreetingPlayer
  private holdTimer: ReturnType<typeof setTimeout> | undefined
  private startTimer: ReturnType<typeof setTimeout> | undefined
  private closed = false

  constructor() {
    this.greeting = new GreetingPlayer(() => this.emit({ type: 'state', state: 'listening' }))
  }

  private emit(e: VoiceEvent): void {
    if (!this.closed) this.events.push(e)
  }

  private clearTimers(): void {
    clearTimeout(this.holdTimer)
    clearTimeout(this.startTimer)
  }

  /** Speak for `ms`, then fall back to listening. */
  private speakFor(ms: number): void {
    this.clearTimers()
    this.emit({ type: 'state', state: 'speaking' })
    this.holdTimer = setTimeout(() => this.emit({ type: 'state', state: 'listening' }), ms)
  }

  async start(): Promise<void> {
    // Linh greets straight away: the click that opened the call screen is the
    // gesture browsers require for autoplay, so there is nothing left to ask for.
    this.emit({ type: 'state', state: 'speaking' })
    const started = await this.greeting.play()
    if (started || this.closed) return

    // Refused: fall back to the scripted ring-then-speak beat, so the screen is
    // never both silent and frozen.
    this.emit({ type: 'state', state: 'ringing' })
    this.startTimer = setTimeout(() => {
      this.emit({ type: 'state', state: 'speaking' })
      this.holdTimer = setTimeout(
        () => this.emit({ type: 'state', state: 'listening' }),
        GREETING_HOLD_MS,
      )
    }, GREETING_DELAY_MS)
  }

  setMicEnabled(): Promise<void> {
    // Nothing to enable — the mock never opens a microphone.
    return Promise.resolve()
  }

  sendText(text: string): void {
    if (!text.trim()) return
    // Asking something cuts the greeting off rather than talking over it.
    this.greeting.stop()
    this.emit({ type: 'transcript', role: 'caller', text, final: true })
    this.speakFor(TYPED_SPEAK_MS)
  }

  /** The voice-picker play button auditions a voice without selecting it. */
  previewVoice(): void {
    this.greeting.stop()
    this.speakFor(VOICE_PREVIEW_MS)
  }

  interrupt(): void {
    this.greeting.stop()
    this.clearTimers()
    this.emit({ type: 'state', state: 'listening' })
  }

  getAmplitude(): number | null {
    return this.greeting.getAmplitude()
  }

  close(reason?: string): Promise<void> {
    if (this.closed) return Promise.resolve()
    this.clearTimers()
    this.greeting.dispose()
    this.emit({ type: 'ended', reason: reason === 'agent' ? 'agent' : 'user' })
    this.closed = true
    this.events.close()
    return Promise.resolve()
  }
}

export const voiceMock: VoiceApi = {
  async connect(opts) {
    const session = new MockVoiceSession()
    if (opts.signal?.aborted) {
      await session.close()
      return session
    }
    void session.start()
    return session
  },

  async previewTts(_input, opts) {
    await delay(0.6, opts?.signal)
    // No server-side TTS yet. `null` tells the caller to fall back to the
    // browser's own Vietnamese voice, which is a stand-in, not the product voice.
    return null
  },
}
