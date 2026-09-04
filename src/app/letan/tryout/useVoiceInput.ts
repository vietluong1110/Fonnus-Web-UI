import { useCallback, useEffect, useRef, useState } from 'react'

/*
 * The microphone half of the try-out panel: the browser's own speech
 * recognition, in Vietnamese, one utterance at a time.
 *
 * This is deliberately *not* behind `src/api/`. Nothing here is a Fonnus
 * request — it is a Web API the browser implements itself (Chrome and Edge
 * do; Firefox does not), and the day the product needs its own STT the panel
 * will record audio and post it through `api.receptionist` instead. Until
 * then the mic button simply disables itself, with a title saying to type,
 * wherever the browser has no recogniser.
 *
 * Interim results show in the composer as they arrive so the caller can see
 * they are being heard; the final one is handed back and sent.
 */

interface RecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface RecognitionEventLike {
  resultIndex: number
  results: ArrayLike<RecognitionResultLike>
}
interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}

function recogniser(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useVoiceInput({ onFinal }: { onFinal: (text: string) => void }) {
  const [supported] = useState(() => recogniser() !== null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<RecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const stop = useCallback(() => {
    rec.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = recogniser()
    if (!Ctor) return
    rec.current?.abort()
    const r = new Ctor()
    r.lang = 'vi-VN'
    r.interimResults = true
    r.continuous = false
    r.maxAlternatives = 1
    let finalText = ''
    r.onresult = (e) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else text += res[0].transcript
      }
      setInterim(finalText || text)
    }
    r.onerror = (e) => {
      // "no-speech" and "aborted" are not failures worth a message.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Trình duyệt chưa cho phép dùng micro. Bạn có thể gõ câu hỏi thay vì nói.')
      else if (e.error === 'network') setError('Nhận dạng giọng nói cần kết nối mạng. Bạn có thể gõ câu hỏi thay vì nói.')
    }
    r.onend = () => {
      setListening(false)
      setInterim('')
      rec.current = null
      const said = finalText.trim()
      if (said) onFinalRef.current(said)
    }
    rec.current = r
    setError(null)
    setInterim('')
    setListening(true)
    try {
      r.start()
    } catch {
      setListening(false)
      rec.current = null
    }
  }, [])

  useEffect(() => () => rec.current?.abort(), [])

  return { supported, listening, interim, error, start, stop }
}
