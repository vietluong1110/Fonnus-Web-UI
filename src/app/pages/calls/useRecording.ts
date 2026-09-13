import { useCallback, useEffect, useRef, useState } from 'react'

const RATES = [1, 1.5, 2] as const

/**
 * One call's recording, played through a plain `<audio>` element.
 *
 * The position is read on a 100ms interval rather than on animation frames or
 * `timeupdate`: frames stop in a hidden tab and `timeupdate` fires about four
 * times a second, which is too coarse for the line under the pointer to light up
 * when it is said. An interval keeps going either way (ui-ux-principles §6: a
 * timer is the floor).
 *
 * Only one recording exists at a time — the page mounts one call panel — so no
 * cross-player "stop the others" registry is needed.
 */
export function useRecording(url: string | null, durationMs: number) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ms, setMs] = useState(0)
  const [rate, setRate] = useState<number>(1)
  const [failed, setFailed] = useState(false)
  const rateRef = useRef(1)

  useEffect(() => {
    setPlaying(false)
    setMs(0)
    setFailed(false)
    if (!url) return
    const el = new Audio(url)
    el.preload = 'metadata'
    el.playbackRate = rateRef.current
    audio.current = el
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setMs(durationMs)
    }
    const onError = () => {
      setFailed(true)
      setPlaying(false)
    }
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    el.addEventListener('error', onError)
    return () => {
      el.pause()
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('error', onError)
      audio.current = null
    }
  }, [url, durationMs])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const el = audio.current
      if (el) setMs(Math.min(durationMs, Math.round(el.currentTime * 1000)))
    }, 100)
    return () => window.clearInterval(id)
  }, [playing, durationMs])

  const start = useCallback(() => {
    const el = audio.current
    if (!el) return
    el.playbackRate = rateRef.current
    el.play().catch(() => {
      // Autoplay policy or a broken file: say so rather than sit silently.
      setFailed(true)
      setPlaying(false)
    })
  }, [])

  const toggle = useCallback(() => {
    const el = audio.current
    if (!el) return
    if (!el.paused) {
      el.pause()
      return
    }
    if (el.ended || el.currentTime * 1000 >= durationMs - 200) el.currentTime = 0
    start()
  }, [durationMs, start])

  /** Jump to a moment and play from it — pressing a line means "let me hear this". */
  const seek = useCallback(
    (to: number) => {
      const el = audio.current
      if (!el) return
      // Short of the very end, or "ended" fires at once and the press does nothing.
      const clamped = Math.max(0, Math.min(to, durationMs - 300))
      el.currentTime = clamped / 1000
      setMs(clamped)
      start()
    },
    [durationMs, start],
  )

  const cycleRate = useCallback(() => {
    const next = RATES[(RATES.indexOf(rateRef.current as (typeof RATES)[number]) + 1) % RATES.length]
    rateRef.current = next
    setRate(next)
    if (audio.current) audio.current.playbackRate = next
  }, [])

  return { playing, ms, rate, failed, toggle, seek, cycleRate }
}

export type Recording = ReturnType<typeof useRecording>
