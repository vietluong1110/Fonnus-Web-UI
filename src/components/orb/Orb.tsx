import { useEffect, useRef } from 'react'
import { Icon } from '../../design-system'
import type { OrbPlacement } from './useOrbPlacement'
import { useOrbField } from './useOrbField'
import styles from './Orb.module.css'

interface OrbProps {
  placement: OrbPlacement
  /** Drives the waves; true whenever the agent is talking. */
  speaking: boolean
  /**
   * Live loudness of the greeting, 0–1, or null when no audio is playing —
   * which is the case for the scripted chip replies.
   */
  getAmplitude: () => number | null
  onClick: () => void
}

/** Wave count. Three reads as a ripple; more turns into a target. */
const WAVES = [0, 1, 2]

/** Fallback pulse for the scripted replies, which have no waveform to follow. */
const SYNTHETIC_HZ = 1.1

export function Orb({ placement, speaking, getAmplitude, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useOrbField(canvasRef)

  const { orbRef } = placement

  /*
   * One rAF loop writes a single custom property, `--amp`, on the orb root;
   * every reacting part (body scale, wave brightness and spread, bloom) is a
   * calc() off it. Driving them from CSS rather than from React state is what
   * keeps a 60fps audio envelope from re-rendering the tree 60 times a second.
   */
  useEffect(() => {
    const orb = orbRef.current
    if (!orb) return

    let raf = 0
    let value = 0
    const start = performance.now()

    const tick = (now: number) => {
      const live = speaking ? getAmplitude() : null
      const target = speaking
        ? // No waveform (a chip reply, or Web Audio unavailable): breathe.
          (live ?? 0.45 + 0.35 * Math.sin(((now - start) / 1000) * SYNTHETIC_HZ * Math.PI * 2))
        : 0

      // Ease towards the target so silence between words settles rather than
      // snapping the waves shut.
      value += (target - value) * (target > value ? 0.45 : 0.1)
      orb.style.setProperty('--amp', value.toFixed(3))

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      orb.style.setProperty('--amp', '0')
    }
  }, [speaking, getAmplitude, orbRef])

  return (
    <button ref={orbRef} onClick={onClick} aria-label="Nghe thử Fonnus" className={styles.orb}>
      <span ref={placement.wavesRef} className={styles.waves} aria-hidden="true">
        {WAVES.map((i) => (
          <span key={i} className={styles.wave} style={{ animationDelay: `${i * 900}ms` }} />
        ))}
      </span>

      <span className={styles.body}>
        <span className={styles.halo} />
        <span className={styles.sphere}>
          <canvas ref={canvasRef} width={144} height={144} className={styles.field} />
          <span className={styles.sheen} />
        </span>
        <span ref={placement.labelRef} className={styles.label}>
          <span className={styles.labelStack}>
            <Icon name="phone-call" size={30} />
            <span className={styles.labelTitle}>Nghe thử</span>
            <span className={styles.labelNote}>Miễn phí</span>
          </span>
        </span>
      </span>
    </button>
  )
}
