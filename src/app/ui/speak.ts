import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isLive } from '../../api'
import type { SpeakingSpeed, VoiceId } from '../letan/model'
import { useConfig } from '../letan/store'

/*
 * "Nghe thử" — voices one line.
 *
 * Live, this is server-side TTS in the voice the tenant actually picked
 * (`api.voice.previewTts`). Mocked, `previewTts` resolves null and this falls
 * back to the browser's own Vietnamese voice — a stand-in that ignores the
 * chosen voice, and is not the product voice.
 *
 * Two hooks share one transport: `useSpeak(text)` is a play button beside a
 * field; `usePlayer()` is the try-out panel, which plays whichever reply just
 * arrived and lets any earlier one be replayed. Only one thing speaks at a
 * time, across every instance of either.
 */

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith('vi')) ?? null
}

/** The browser fallback at least honours the pace, if not the voice. */
const RATE: Record<SpeakingSpeed, number> = { slow: 0.88, normal: 1, fast: 1.14 }

let stopCurrent: (() => void) | null = null

/**
 * Starts voicing `text` and returns a function that stops it. `onEnd` fires
 * exactly once: when playback finishes, fails, or is stopped — by the caller
 * or by something else starting to speak.
 */
export function startSpeech(text: string, voice: VoiceId, speed: SpeakingSpeed, onEnd: () => void): () => void {
  stopCurrent?.()

  let done = false
  let audio: HTMLAudioElement | null = null
  let utterance: SpeechSynthesisUtterance | null = null

  const finish = () => {
    if (done) return
    done = true
    if (stopCurrent === stop) stopCurrent = null
    onEnd()
  }
  const stop = () => {
    if (done) return
    if (audio) {
      audio.pause()
      audio = null
    }
    if (utterance && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      utterance = null
      window.speechSynthesis.cancel()
    }
    finish()
  }
  stopCurrent = stop

  api.voice
    .previewTts({ text, voice, speed })
    .then((clip) => {
      if (done) return
      if (clip) {
        audio = new Audio(clip.url)
        audio.onended = finish
        audio.onerror = finish
        void audio.play().catch(finish)
        return
      }
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        finish()
        return
      }
      const synth = window.speechSynthesis
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const v = pickVoice()
      if (v) u.voice = v
      u.lang = 'vi-VN'
      u.rate = RATE[speed]
      u.onend = finish
      u.onerror = finish
      utterance = u
      synth.speak(u)
    })
    .catch(finish)

  return stop
}

function useBrowserVoice(): boolean {
  const [has, setHas] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const check = () => setHas(!!pickVoice())
    check()
    window.speechSynthesis.addEventListener('voiceschanged', check)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check)
  }, [])
  return has
}

/**
 * `voice` and `speed` default to the saved record. A row that auditions one
 * voice among several passes its own; the Giọng nói page passes its draft.
 */
export function useSpeak(text: string, overrides?: { voice?: VoiceId; speed?: SpeakingSpeed }) {
  const { config } = useConfig()
  const voice = overrides?.voice ?? config.voice_selection
  const speed = overrides?.speed ?? config.speaking_speed
  const [speaking, setSpeaking] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const browserVoice = useBrowserVoice()

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setSpeaking(false)
  }, [])

  useEffect(() => stop, [stop])

  const toggle = useCallback(() => {
    if (speaking) {
      stop()
      return
    }
    setSpeaking(true)
    stopRef.current = startSpeech(text, voice, speed, () => setSpeaking(false))
  }, [speaking, stop, text, voice, speed])

  return {
    speaking,
    toggle,
    /**
     * Whether pressing play will produce sound at all. With server-side TTS it
     * always will; on the fallback it depends on the machine having a
     * Vietnamese voice installed, which most Windows machines do not.
     */
    supported: isLive('voice') || browserVoice,
  }
}

/**
 * A player for a transcript: `play(id, text)` voices one line and reports
 * which line is sounding, so every bubble can draw its own play/pause state.
 * `voice` and `speed` default to the saved record; the Giọng nói page passes
 * its draft so an unsaved pick is what you hear.
 */
export function usePlayer(overrides?: { voice?: VoiceId; speed?: SpeakingSpeed }) {
  const { config } = useConfig()
  const voice = overrides?.voice ?? config.voice_selection
  const speed = overrides?.speed ?? config.speaking_speed
  const [playingId, setPlayingId] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const browserVoice = useBrowserVoice()

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setPlayingId(null)
  }, [])

  useEffect(() => stop, [stop])

  const play = useCallback(
    (id: string, text: string) => {
      stopRef.current?.()
      setPlayingId(id)
      stopRef.current = startSpeech(text, voice, speed, () => setPlayingId((cur) => (cur === id ? null : cur)))
    },
    [voice, speed],
  )

  const toggle = useCallback(
    (id: string, text: string) => {
      if (playingId === id) stop()
      else play(id, text)
    },
    [playingId, play, stop],
  )

  return { playingId, play, toggle, stop, supported: isLive('voice') || browserVoice }
}
