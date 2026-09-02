import type { CSSProperties, ReactNode } from 'react'
import section from '../../styles/section.module.css'
import styles from './CapabilityRow.module.css'

interface CapabilityRowProps {
  eyebrow: string
  title: string
  body: string
  points: string[]
  /** Mirror the row so consecutive capabilities alternate sides. */
  reversed?: boolean
  /** Reading measure for the body copy; a couple of rows run slightly wider. */
  measure?: string
  visual: ReactNode
}

export function CapabilityRow({
  eyebrow,
  title,
  body,
  points,
  reversed = false,
  measure,
  visual,
}: CapabilityRowProps) {
  return (
    <div
      className={reversed ? styles.reversed : styles.row}
      style={measure ? ({ '--capability-measure': measure } as CSSProperties) : undefined}
    >
      <div data-reveal="0" data-reveal-from={reversed ? 'right' : 'left'}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.body}>{body}</p>
        <div className={section.checkList}>
          {points.map((point) => (
            <div key={point} style={{ display: 'flex', gap: 10 }}>
              <span className={section.checkMark}>✓</span> {point}
            </div>
          ))}
        </div>
      </div>
      <div data-reveal="1" data-reveal-from={reversed ? 'left' : 'right'}>
        {visual}
      </div>
    </div>
  )
}
