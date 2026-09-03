/**
 * The greeting clip plus the live loudness the orb's waves ride on, outside
 * React so a transport can own it.
 *
 * The Web Audio graph, and the reasoning behind each part of it:
 *
 * - The Web Audio nodes are built lazily and exactly once, inside the gesture.
 *   `createMediaElementSource` may only be called once per element, and an
 *   AudioContext created before a gesture starts suspended — Safari never
 *   resumes one on its own.
 * - The analyser is a tap, not a pass-through: it has to be connected to the
 *   destination or the page goes silent.
 * - The envelope has a fast attack and a slow release, so the waves snap open on
 *   a syllable and settle through a pause instead of flickering.
 * - `play()` resolving is not a promise that `ended` will ever fire. A stalled
 *   media element, a background tab that never advances, a missing audio device
 *   — any of them leaves the agent "speaking" forever with nothing to recover
 *   it. Hence the watchdog.
 */
const GREETING_SRC = `${import.meta.env.BASE_URL}audio/linh-greeting.wav`

const ATTACK = 0.5
const RELEASE = 0.12

export class GreetingPlayer {
  private audio: HTMLAudioElement | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private buffer: Uint8Array<ArrayBuffer> | null = null
  private envelope = 0
  private playing = false
  private watchdog: ReturnType<typeof setTimeout> | undefined

  /** Cap for the watchdog when the clip's real duration is not known yet. */
  private static readonly MAX_GREETING_MS = 12_000

  constructor(private readonly onEnded: () => void) {}

  private finish(): void {
    if (!this.playing) return
    clearTimeout(this.watchdog)
    this.playing = false
    this.envelope = 0
    this.onEnded()
  }

  /** Arm on the clip's own length once known, else on the hard cap. */
  private armWatchdog(): void {
    clearTimeout(this.watchdog)
    const known = this.audio?.duration
    const ms =
      known && Number.isFinite(known) && known > 0
        ? known * 1000 + 1500
        : GreetingPlayer.MAX_GREETING_MS
    this.watchdog = setTimeout(() => this.finish(), ms)
  }

  /** Resolves false if the browser refused to play — the caller then scripts the beat. */
  async play(): Promise<boolean> {
    if (!this.audio) {
      const audio = new Audio(GREETING_SRC)
      audio.preload = 'auto'
      audio.crossOrigin = 'anonymous'
      audio.addEventListener('ended', () => this.finish())
      // Metadata usually arrives after play() starts, so re-arm on the real length.
      audio.addEventListener('loadedmetadata', () => {
        if (this.playing) this.armWatchdog()
      })
      this.audio = audio
    }
    const audio = this.audio

    if (!this.analyser) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) {
        try {
          const ctx = new Ctor()
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 512
          ctx.createMediaElementSource(audio).connect(analyser)
          analyser.connect(ctx.destination)
          this.ctx = ctx
          this.analyser = analyser
          this.buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize))
        } catch {
          // No Web Audio: the greeting still plays, the waves fall back to their
          // scripted pulse.
        }
      }
    }
    await this.ctx?.resume().catch(() => {})

    audio.currentTime = 0
    this.envelope = 0
    try {
      await audio.play()
      this.playing = true
      this.armWatchdog()
      return true
    } catch {
      this.playing = false
      return false
    }
  }

  stop(): void {
    clearTimeout(this.watchdog)
    if (!this.audio) return
    this.audio.pause()
    this.audio.currentTime = 0
    this.playing = false
    this.envelope = 0
  }

  dispose(): void {
    this.stop()
    this.ctx?.close().catch(() => {})
    this.ctx = null
    this.analyser = null
    this.audio = null
  }

  /** 0–1 right now, or null when nothing is playing. Read from a rAF loop. */
  getAmplitude(): number | null {
    if (!this.playing || !this.analyser || !this.buffer) return null

    this.analyser.getByteTimeDomainData(this.buffer)
    let sum = 0
    for (let i = 0; i < this.buffer.length; i += 1) {
      const v = (this.buffer[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / this.buffer.length)

    // Speech RMS rarely passes ~0.35, so scale before clamping or the waves
    // would barely move.
    const level = Math.min(1, rms * 3.2)
    const k = level > this.envelope ? ATTACK : RELEASE
    this.envelope += (level - this.envelope) * k
    return this.envelope
  }
}
