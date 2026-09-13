import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { Spark } from '../../ui'
import type { ChartTip } from '../../ui'
import { delta } from './labels'
import styles from './Overview.module.css'

/**
 * Counts from what the tile last showed to `target`, on the rising arc's
 * duration. On the first paint that is from zero; on a range change it is from
 * the old figure, so `125` running to `581` says "bigger" before it is read.
 */
function useCountUp(target: number): number {
  const [shown, setShown] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const start = from.current
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still || start === target) {
      from.current = target
      setShown(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 520)
      const v = start + (target - start) * (1 - Math.pow(1 - p, 3))
      from.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return shown
}

/**
 * One figure with the three things that make it mean something: what it is,
 * what it was, and which way it has been going.
 *
 * The delta carries no colour. Up is not good and down is not bad: a clinic
 * shut for Tết took fewer calls and did nothing wrong.
 */
export function StatTile({
  icon,
  label,
  amount,
  format = String,
  previous,
  compare,
  trend,
  trendTips,
  foot,
}: {
  icon: IconName
  label: string
  /** The raw figure. The tile formats it, so it can count to it. */
  amount: number
  /** `2p 10s` from 130. Defaults to the plain number. */
  format?: (n: number) => string
  /** Omit for a figure where a change makes no sense to show. */
  previous?: number | null
  /**
   * What the delta is measured against — "so với 7 ngày trước đó". It is the
   * delta's own tip rather than a line of its own: four tiles each printing
   * the same sentence is four copies of one fact.
   */
  compare?: string
  /** Seven days behind the figure. Fewer than two points draws nothing. */
  trend?: number[]
  /** One tip per trend point: the day, and the figure that day. */
  trendTips?: ChartTip[]
  /** One quiet line under the trend: the total, the share, the window. */
  foot?: string
}) {
  const shown = useCountUp(amount)
  const d = previous !== undefined ? delta(amount, previous) : null

  return (
    <section className={styles.tile}>
      <span className={styles.tileHead}>
        <Icon name={icon} size={18} />
        <span className={styles.tileLabel}>{label}</span>
      </span>

      <span className={styles.tileFigure}>
        <span className={styles.tileValue}>{format(Math.round(shown))}</span>
        {d ? (
          // Focusable so the comparison is reachable without a mouse; it says itself in full.
          <span className={styles.delta} tabIndex={0} aria-label={compare ? `${d.text}, ${compare}` : d.text}>
            <span className={`${styles.deltaIcon} ${d.up ? '' : styles.deltaDown}`} aria-hidden="true">
              <Icon name="arrow-up" size={14} />
            </span>
            <span aria-hidden="true">{d.text}</span>
            {compare ? (
              <span className={styles.deltaTip} aria-hidden="true">
                {compare}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>

      {trend && trend.length > 1 ? (
        <Spark points={trend} tips={trendTips ?? []} label={`${label}, 7 ngày qua`} />
      ) : null}
      {foot ? <span className={styles.tileFoot}>{foot}</span> : null}
    </section>
  )
}
