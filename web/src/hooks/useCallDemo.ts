import { useCallback, useEffect, useRef, useState } from 'react'
import { TYPED_SPEAK_MS, VOICE_PREVIEW_MS } from '../data/callDemo'

/**
 * State machine behind the "Nghe thử" mockup. No microphone is opened and
 * nothing is sent anywhere — asking a question just decides how long the orb
 * stays in the "speaking" state before falling back to "listening".
 */
export type AgentState = 'ringing' | 'speaking' | 'listening'

/** Delay before the agent picks up, and how long the greeting runs. */
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

  const speak = useCallback((ms: number) => {
    setAgent('speaking')
    clearTimeout(timer.current)
    clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => setAgent('listening'), ms)
  }, [])

  const openCall = useCallback(() => {
    setOpen(true)
    setAgent('ringing')
    setTyped('')
    setVoiceOpen(false)
    document.body.style.overflow = 'hidden'
    queue('speaking', GREETING_DELAY_MS, GREETING_HOLD_MS)
  }, [queue])

  const closeCall = useCallback(() => {
    clearTimers()
    document.body.style.overflow = ''
    setOpen(false)
    setAgent('ringing')
    setVoiceOpen(false)
  }, [clearTimers])

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
