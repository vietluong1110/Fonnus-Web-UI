import { useRef } from 'react'
import { useOrbField } from './useOrbField'
import styles from './MiniOrb.module.css'

/** The size the orb's insets, blurs and shadows are authored at. */
const BASE = 280

/**
 * A small, still version of the landing page's orb, for use inline in the app.
 *
 * It runs the same `useOrbField` canvas as the big one, so the pigment drifts
 * and folds on the same 44-second loop — the orb is the product's face, and a
 * frozen copy of it in the app would read as a screenshot of the real thing.
 * What it drops is the interactive layer: no sound waves, no call label, and
 * no `--amp`, because nothing here is speaking.
 */
export function MiniOrb({ size = 56, className }: { size?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useOrbField(canvasRef)

  return (
    <span className={`${styles.root} ${className ?? ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <span className={styles.scale} style={{ transform: `scale(${size / BASE})` }}>
        <span className={styles.halo} />
        <span className={styles.sphere}>
          <canvas ref={canvasRef} width={144} height={144} className={styles.field} />
          <span className={styles.sheen} />
        </span>
      </span>
    </span>
  )
}
