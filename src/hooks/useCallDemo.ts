import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { VoiceSession } from '../api'

/**
 * The "Nghe thử" call screen.
 *
 * Everything the agent does comes from a `VoiceSession` (`api.voice`). Mocked,
 * that session plays the real greeting WAV and scripts the rest of the beat —
 * no microphone is opened and nothing is sent anywhere. Live, it is the actual
 * pipeline. This hook does not know which, and neither does the overlay.
 *
 * The shape it returns is unchanged, so `CallOverlay`, `Orb`, `MiniOrb` and
 * `Hero` are untouched.
 */
export type AgentState = 'ringing' | 'speaking' | 'listening'

export function useCallDemo() {
  const [open, setOpen] = useState(false)
  const [agent, setAgent] = useState<AgentState>('ringing')
  const [mic, setMic] = useState(true)
  const [typed, setTyped] = useState('')
  const [voice, setVoice] = useState(0)
  const [voiceOpen, setVoiceOpen] = useState(false)

  const session = useRef<VoiceSession | null>(null)
  const connecting = useRef<AbortController | null>(null)

  const closeSession = useCallback(() => {
    connecting.current?.abort()
    connecting.current = null
    void session.current?.close()
    session.current = null
  }, [])

  const openCall = useCallback(() => {
    setOpen(true)
    setTyped('')
    setVoiceOpen(false)
    document.body.style.overflow = 'hidden'
    // The agent is already talking: the click that opened this screen is the
    // gesture browsers require for autoplay, so there is nothing left to ask for.
    setAgent('speaking')

    closeSession()
    const ac = new AbortController()
    connecting.current = ac

    void api.voice
      .connect({ mode: 'landing-demo', signal: ac.signal })
      .then(async (live) => {
        if (ac.signal.aborted) {
          void live.close()
          return
        }
        session.current = live

        for await (const event of live.events) {
          if (ac.signal.aborted) break
          if (event.type === 'state') {
            // `connecting` and `thinking` have no orb pose of their own; both
            // read as the agent holding the floor.
            if (event.state === 'connecting' || event.state === 'ringing') setAgent('ringing')
            else if (event.state === 'speaking' || event.state === 'thinking') setAgent('speaking')
            else if (event.state === 'listening') setAgent('listening')
          }
        }
      })
      .catch(() => {
        // Nothing to connect to. The screen stays open and silent rather than
        // throwing the visitor out of it.
        setAgent('listening')
      })
  }, [closeSession])

  const closeCall = useCallback(() => {
    closeSession()
    document.body.style.overflow = ''
    setOpen(false)
    setAgent('ringing')
    setVoiceOpen(false)
  }, [closeSession])

  /** Ask something — a suggestion chip, or the typed box. */
  const ask = useCallback((text: string) => {
    if (!text.trim()) return
    session.current?.sendText(text)
  }, [])

  const send = useCallback(() => {
    if (!typed.trim()) return
    ask(typed)
    setTyped('')
  }, [typed, ask])

  /** The play button auditions a voice without selecting it. */
  const previewVoice = useCallback(() => session.current?.previewVoice(), [])

  const toggleMic = useCallback(() => {
    setMic((m) => {
      const next = !m
      void session.current?.setMicEnabled(next)
      return next
    })
  }, [])

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
      closeSession()
      document.body.style.overflow = ''
    },
    [closeSession],
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
    /**
     * Live loudness for the orb's waves; null when silent. Polled from the
     * orb's own animation frame, never pushed through React state — a 60fps
     * signal there would re-render the whole overlay every frame.
     */
    getAmplitude: () => session.current?.getAmplitude() ?? null,
    stateLabel,
    mic,
    toggleMic,
    typed,
    setTyped,
    send,
    ask,
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
