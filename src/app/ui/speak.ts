import { useCallback, useEffect, useRef, useState } from 'react'

/*
 * "Nghe thử" — voices a line with the browser's own Vietnamese voice when one
 * is installed. This is a preview stand-in, not the product voice: the four
 * voices the tenant picks from (Linh, Mai, Khang, Đức) are server-side TTS.
 *
 * TODO: POST /tts/preview { text, voice_selection, speaking_speed } → audio
 * URL, then play it through an <audio> element and drop speechSynthesis.
 */

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith('vi')) ?? null
}

let current: SpeechSynthesisUtterance | null = null

export function useSpeak(text: string) {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  const mine = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const check = () => setSupported(!!pickVoice())
    check()
    window.speechSynthesis.addEventListener('voiceschanged', check)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check)
  }, [])

  useEffect(
    () => () => {
      if (mine.current && current === mine.current) window.speechSynthesis.cancel()
    },
    [],
  )

  const toggle = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) u.voice = voice
    u.lang = 'vi-VN'
    u.rate = 1
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    mine.current = u
    current = u
    setSpeaking(true)
    synth.speak(u)
  }, [speaking, text])

  return { speaking, toggle, supported }
}
