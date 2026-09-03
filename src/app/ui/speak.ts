import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isLive } from '../../api'
import { useConfig } from '../letan/store'

/*
 * "Nghe thử" — voices one line.
 *
 * Live, this is server-side TTS in the voice the tenant actually picked
 * (`api.voice.previewTts`). Mocked, `previewTts` resolves null and this falls
 * back to the browser's own Vietnamese voice — a stand-in that ignores the
 * chosen voice and speed entirely, and is not the product voice.
 *
 * Both paths land on the same `{ speaking, toggle, supported }`, so the ten
 * play buttons across the Lễ tân screens do not know which one they got.
 */

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith('vi')) ?? null
}

/** Only one thing speaks at a time, across every instance of this hook. */
let currentUtterance: SpeechSynthesisUtterance | null = null
let currentAudio: HTMLAudioElement | null = null

export function useSpeak(text: string) {
  const { config } = useConfig()
  const [speaking, setSpeaking] = useState(false)
  const [browserVoice, setBrowserVoice] = useState(false)
  const mine = useRef<SpeechSynthesisUtterance | null>(null)
  const myAudio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const check = () => setBrowserVoice(!!pickVoice())
    check()
    window.speechSynthesis.addEventListener('voiceschanged', check)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check)
  }, [])

  const stop = useCallback(() => {
    if (mine.current && currentUtterance === mine.current) window.speechSynthesis.cancel()
    if (myAudio.current && currentAudio === myAudio.current) {
      currentAudio.pause()
      currentAudio = null
    }
    setSpeaking(false)
  }, [])

  useEffect(() => stop, [stop])

  const speakInBrowser = useCallback(() => {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) u.voice = voice
    u.lang = 'vi-VN'
    u.rate = 1
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    mine.current = u
    currentUtterance = u
    setSpeaking(true)
    synth.speak(u)
  }, [text])

  const toggle = useCallback(() => {
    if (speaking) {
      stop()
      return
    }
    setSpeaking(true)

    api.voice
      .previewTts({ text, voice: config.voice_selection, speed: config.speaking_speed })
      .then((clip) => {
        if (!clip) {
          // No server-side TTS in this mode — fall back to the browser's voice.
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) speakInBrowser()
          else setSpeaking(false)
          return
        }
        currentAudio?.pause()
        const audio = new Audio(clip.url)
        audio.onended = () => setSpeaking(false)
        audio.onerror = () => setSpeaking(false)
        myAudio.current = audio
        currentAudio = audio
        void audio.play().catch(() => setSpeaking(false))
      })
      .catch(() => setSpeaking(false))
  }, [speaking, stop, text, config.voice_selection, config.speaking_speed, speakInBrowser])

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
