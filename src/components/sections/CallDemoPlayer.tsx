import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { CallDemo } from '../../data/callDemos'
import styles from './CallDemoPlayer.module.css'

/** Progress ticks 10×/second; the bar's CSS transition smooths between them. */
const TICK_MS = 100

/** Deterministic bar heights — a waveform should look like audio, not noise. */
const BARS = [
  0.32, 0.5, 0.72, 0.44, 0.86, 0.62, 0.95, 0.55, 0.38, 0.7, 0.88, 0.46, 0.66, 0.92, 0.58, 0.34, 0.76,
  0.5, 0.82, 0.4, 0.68, 0.9, 0.52, 0.36,
]

/*
 * Only one call plays at a time. Each mounted player leaves a stopper here and
 * clears everyone else's before it starts — otherwise two transcripts roll at
 * once, and once these carry real audio they would talk over each other.
 */
const stoppers = new Set<() => void>()

interface CallDemoPlayerProps {
  demo: CallDemo
  /** What Fonnus did — shown once the call reaches `actionAt`. */
  action: ReactNode
}

export function CallDemoPlayer({ demo, action }: CallDemoPlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const finished = elapsed >= demo.duration

  const stop = useCallback(() => {
    setPlaying(false)
    audioRef.current?.pause()
  }, [])

  useEffect(() => {
    stoppers.add(stop)
    return () => {
      stoppers.delete(stop)
    }
  }, [stop])

  // Optional: with no recording the transcript simply rolls in silence.
  useEffect(() => {
    if (!demo.audioSrc) return
    const el = new Audio(demo.audioSrc)
    el.preload = 'auto'
    audioRef.current = el
    return () => {
      el.pause()
      audioRef.current = null
    }
  }, [demo.audioSrc])

  useEffect(() => {
    if (!playing) return

    const startedAt = performance.now() - elapsed * 1000
    const id = window.setInterval(() => {
      const t = (performance.now() - startedAt) / 1000
      if (t >= demo.duration) {
        setElapsed(demo.duration)
        setPlaying(false)
        return
      }
      setElapsed(t)
    }, TICK_MS)

    return () => window.clearInterval(id)
    // `elapsed` is read once to resume from a pause; re-running on every tick
    // would restart the clock ten times a second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, demo.duration])

  function toggle() {
    if (playing) {
      stop()
      return
    }
    stoppers.forEach((other) => other !== stop && other())

    const from = finished ? 0 : elapsed
    if (finished) setElapsed(0)
    setPlaying(true)

    const el = audioRef.current
    if (el) {
      el.currentTime = from
      void el.play().catch(() => {
        /* Refused: the transcript still rolls. */
      })
    }
  }

  const progress = Math.min(1, elapsed / demo.duration)
  const visible = demo.turns.filter((t) => elapsed >= t.at)
  const showAction = elapsed >= demo.actionAt

  return (
    <div className={styles.player}>
      <div className={styles.bar}>
        <button
          type="button"
          onClick={toggle}
          className={styles.play}
          aria-label={playing ? `Tạm dừng ${demo.title}` : `Phát ${demo.title}`}
        >
          <Icon name={playing ? 'pause' : finished ? 'arrow-right' : 'play'} size={18} />
        </button>

        <span className={styles.meta}>
          <span className={styles.callerLine}>
            <span className={styles.liveDot} data-on={playing || undefined} aria-hidden="true" />
            {demo.caller}
          </span>
          <span className={styles.title}>{demo.title}</span>
        </span>

        <span className={styles.wave} aria-hidden="true">
          {BARS.map((h, i) => (
            <span
              key={i}
              className={i / BARS.length <= progress ? styles.barPlayed : styles.barAhead}
              style={{
                height: `${Math.round(h * 100)}%`,
                animationDelay: `${(i % 7) * 90}ms`,
              }}
              data-playing={playing || undefined}
            />
          ))}
        </span>

        <span className={styles.time}>
          {fmt(elapsed)} / {fmt(demo.duration)}
        </span>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Turns and the action land here one after another as the call plays. */}
      <div className={styles.stream} aria-live="polite">
        {visible.length === 0 ? (
          <p className={styles.hint}>Bấm ▶ để nghe lại một cuộc gọi Fonnus đã xử lý.</p>
        ) : null}

        {visible.map((turn) => (
          <div
            key={turn.at}
            className={turn.role === 'linh' ? styles.turnLinh : styles.turnCaller}
          >
            <span className={styles.who}>{turn.role === 'linh' ? 'Linh · Fonnus' : 'Khách gọi'}</span>
            <p className={styles.said}>{turn.text}</p>
          </div>
        ))}

        {showAction ? <div className={styles.action}>{action}</div> : null}
      </div>
    </div>
  )
}

function fmt(seconds: number) {
  const s = Math.floor(seconds)
  return `0:${String(s).padStart(2, '0')}`
}
