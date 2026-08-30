import { Fragment } from 'react'
import styles from './Stepper.module.css'

interface StepperProps {
  steps: string[]
  /** 0-based: everything before it reads as done, everything after as pending. */
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div
      className={styles.stepper}
      role="group"
      aria-label={`Bước ${current + 1} trên ${steps.length}: ${steps[current]}`}
    >
      {steps.map((label, i) => (
        <Fragment key={label}>
          {i > 0 ? <span className={styles.connector} /> : null}
          <div className={styles.step}>
            <span
              className={`${styles.dot} ${i < current ? styles.dotDone : ''} ${
                i === current ? styles.dotCurrent : ''
              }`}
              aria-hidden="true"
            >
              {i < current ? '✓' : i + 1}
            </span>
            <span className={`${styles.label} ${i === current ? styles.labelCurrent : ''}`}>{label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}
