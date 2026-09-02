import { useCallback, useEffect, useMemo, useRef } from 'react'

/**
 * The greeting Linh says when the call screen opens, plus the live amplitude
 * the orb's waves are driven from.
 *
 * Two things make this safe to autoplay: the call screen is only ever reached
 * by a click, which satisfies the browser's autoplay gesture requirement, and
 * `play()` is awaited so a refusal is handled rather than thrown into the void.
 *
 * The Web Audio graph is built lazily and exactly once — `createMediaElement-
 * Source` may only be called once per element, and an AudioContext created
 * before a gesture starts suspended.
 */
const GREETING_SRC = `${import.meta.env.BASE_URL}audio/linh-greeting.wav`

/** Smoothing on the amplitude envelope: fast attack, slower release, so the
 *  waves snap open on a syllable and settle instead of flickering. */
const ATTACK = 0.5
const RELEASE = 0.12

export interface GreetingAudio {
  /** Starts the greeting. Resolves false if the browser refused to play it. */
  play: () => Promise<boolean>
  stop: () => void
  /** 0–1 loudness right now, or null when nothing is playing. */
  getAmplitude: () => number | null
}

export function useGreetingAudio(onEnded: () => void): GreetingAudio {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const bufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const envelopeRef = useRef(0)
  const playingRef = useRef(false)

  // Latest callback without re-running the element's effect on every render.
  const endedRef = useRef(onEnded)
  endedRef.current = onEnded

  useEffect(() => {
    const audio = new Audio(GREETING_SRC)
    audio.preload = 'auto'
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    const onDone = () => {
      playingRef.current = false
      envelopeRef.current = 0
      endedRef.current()
    }
    audio.addEventListener('ended', onDone)

    return () => {
      audio.removeEventListener('ended', onDone)
      audio.pause()
      audioRef.current = null
      playingRef.current = false
    }
  }, [])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return false

    // Built here, not on mount: an AudioContext made outside a user gesture is
    // created suspended, and Safari never resumes it on its own.
    if (!analyserRef.current) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) {
        try {
          const ctx = new Ctor()
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 512
          ctx.createMediaElementSource(audio).connect(analyser)
          // Through the analyser to the speakers: an analyser alone is a tap,
          // it does not pass audio on by itself.
          analyser.connect(ctx.destination)
          ctxRef.current = ctx
          analyserRef.current = analyser
          bufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize))
        } catch {
          // No Web Audio: the greeting still plays, the waves fall back to
          // their scripted pulse.
        }
      }
    }
    // Autoplay policy can hand back a suspended context even after a gesture.
    await ctxRef.current?.resume().catch(() => {})

    audio.currentTime = 0
    envelopeRef.current = 0
    try {
      await audio.play()
      playingRef.current = true
      return true
    } catch {
      playingRef.current = false
      return false
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    playingRef.current = false
    envelopeRef.current = 0
  }, [])

  const getAmplitude = useCallback(() => {
    const analyser = analyserRef.current
    const buffer = bufferRef.current
    if (!playingRef.current || !analyser || !buffer) return null

    analyser.getByteTimeDomainData(buffer)
    // RMS of the waveform around its 128 midpoint.
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / buffer.length)

    // Speech RMS rarely passes ~0.35, so scale before clamping or the waves
    // would barely move.
    const level = Math.min(1, rms * 3.2)
    const k = level > envelopeRef.current ? ATTACK : RELEASE
    envelopeRef.current += (level - envelopeRef.current) * k
    return envelopeRef.current
  }, [])

  // Stable object: callers keep it in their own useCallback dependency lists.
  return useMemo(() => ({ play, stop, getAmplitude }), [play, stop, getAmplitude])
}
