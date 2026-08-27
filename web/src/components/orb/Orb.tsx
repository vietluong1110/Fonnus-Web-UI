import { useRef } from 'react'
import { Icon } from '../../design-system'
import type { OrbPlacement } from './useOrbPlacement'
import { useOrbField } from './useOrbField'
import styles from './Orb.module.css'

interface OrbProps {
  placement: OrbPlacement
  /** Pulses the sphere while the agent is talking. */
  speaking: boolean
  onClick: () => void
}

export function Orb({ placement, speaking, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useOrbField(canvasRef)

  return (
    <button
      ref={placement.orbRef}
      onClick={onClick}
      aria-label="Gọi thử Fonnus"
      className={styles.orb}
    >
      <span ref={placement.ring1Ref} className={styles.ring1} />
      <span ref={placement.ring2Ref} className={styles.ring2} />
      <span className={`${styles.body} ${speaking ? styles.speaking : ''}`}>
        <span className={styles.halo} />
        <span className={styles.sphere}>
          <canvas ref={canvasRef} width={144} height={144} className={styles.field} />
          <span className={styles.sheen} />
        </span>
        <span ref={placement.labelRef} className={styles.label}>
          <span className={styles.labelStack}>
            <Icon name="phone-call" size={30} />
            <span className={styles.labelTitle}>Gọi thử</span>
            <span className={styles.labelNote}>Miễn phí · 1 phút</span>
          </span>
        </span>
      </span>
    </button>
  )
}
