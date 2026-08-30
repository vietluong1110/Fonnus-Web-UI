import { useCallback, useEffect, useRef, useState } from 'react'
import { TYPED_SPEAK_MS, VOICE_PREVIEW_MS } from '../data/callDemo'
import { useGreetingAudio } from './useGreetingAudio'

/**
 * State machine behind the "Nghe thử" mockup. No microphone is opened and
 * nothing is sent anywhere — asking a question just decides how long the orb
 * stays in the "speaking" state before falling back to "listening".
 */
export type AgentState = 'ringing' | 'speaking' | 'listening'

/**
 * Fallback timings, used only when the browser refuses to play the greeting
 * (autoplay policy, no codec). With audio, the recording's own length decides
 * how long the agent speaks.
 */
const GREETING_DELAY_MS = 1600
const GREETING_HOLD_MS = 5200

export function useCallDemo() {
  const [open, setOpen] = useState(false)
  const [agent, setAgent] = useState<AgentState>('ringing')
  const [mic, setMic] = useState(true)
  const [typed, setTyped] = useState('')
  const [voice, setVoice] = useState(0)
  const [voiceOpen, setVoiceOpen] = useState(false)

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearTimers = useCallback(() => {
    clearTimeout(timer.current)
    clearTimeout(holdTimer.current)
  }, [])

  /** Enter `next` after `delay`, then drop back to listening after `hold`. */
  const queue = useCallback(
    (next: AgentState, delay: number, hold: number) => {
      clearTimers()
      timer.current = setTimeout(() => {
        setAgent(next)
        holdTimer.current = setTimeout(() => setAgent('listening'), hold)
      }, delay)
    },
    [clearTimers],
  )

  // Real audio, so the greeting's length is the recording's, not a guess.
  const greeting = useGreetingAudio(useCallback(() => setAgent('listening'), []))

  const speak = useCallback(
    (ms: number) => {
      // Asking something cuts the greeting off rather than talking over it.
      greeting.stop()
      setAgent('speaking')
      clearTimeout(timer.current)
      clearTimeout(holdTimer.current)
      holdTimer.current = setTimeout(() => setAgent('listening'), ms)
    },
    [greeting],
  )

  const openCall = useCallback(() => {
    setOpen(true)
    setTyped('')
    setVoiceOpen(false)
    document.body.style.overflow = 'hidden'

    // Linh greets straight away — the click that opened this screen is the
    // gesture that lets the audio play, so there is nothing left to ask for.
    clearTimers()
    setAgent('speaking')
    void greeting.play().then((started) => {
      if (started) return
      // Refused: fall back to the scripted ring-then-speak beat.
      setAgent('ringing')
      queue('speaking', GREETING_DELAY_MS, GREETING_HOLD_MS)
    })
  }, [queue, clearTimers, greeting])

  const closeCall = useCallback(() => {
    clearTimers()
    greeting.stop()
    document.body.style.overflow = ''
    setOpen(false)
    setAgent('ringing')
    setVoiceOpen(false)
  }, [clearTimers, greeting])

  const send = useCallback(() => {
    if (!typed.trim()) return
    setTyped('')
    speak(TYPED_SPEAK_MS)
  }, [typed, speak])

  /** The play button auditions a voice without selecting it. */
  const previewVoice = useCallback(() => speak(VOICE_PREVIEW_MS), [speak])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) closeCall()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeCall])

  // A hot reload or unmount must never leave the page permanently unscrollable.
  useEffect(
    () => () => {
      clearTimers()
      document.body.style.overflow = ''
    },
    [clearTimers],
  )

  const stateLabel =
    agent === 'ringing'
      ? 'Đang kết nối…'
      : agent === 'speaking'
        ? 'Fonnus đang nói'
        : mic
          ? 'Fonnus đang nghe'
          : 'Micro đang tắt — bạn có thể gõ chữ'

  return {
    open,
    agent,
    speaking: agent === 'speaking',
    /** Live loudness of the greeting for the orb's waves; null when silent. */
    getAmplitude: greeting.getAmplitude,
    stateLabel,
    mic,
    toggleMic: () => setMic((m) => !m),
    typed,
    setTyped,
    send,
    speak,
    voice,
    setVoice,
    previewVoice,
    voiceOpen,
    toggleVoices: () => setVoiceOpen((v) => !v),
    openCall,
    closeCall,
  }
}

export type CallDemo = ReturnType<typeof useCallDemo>
