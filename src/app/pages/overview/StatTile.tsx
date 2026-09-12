import { Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { Spark } from './Charts'
import { delta } from './labels'
import styles from './Overview.module.css'

/**
 * One figure with the three things that make it mean something: what it is,
 * what it was, and which way it has been going.
 *
 * A bare number answers nothing — eighteen calls is good or bad only against
 * last Sunday — so the tile will not render without a comparison slot, even
 * when the comparison is "no history yet" and the slot stays empty.
 *
 * The delta carries no colour. Up is not good and down is not bad: a clinic
 * shut for Tết took fewer calls and did nothing wrong, and painting that red
 * would be the product scolding an owner for a holiday.
 */
export function StatTile({
  icon,
  label,
  value,
  previous,
  /** Raw value behind `value`, for the delta. Omit when a delta makes no sense. */
  amount,
  compare,
  trend,
  foot,
}: {
  icon: IconName
  label: string
  /** Already formatted — `18`, `2p 24s`, `1g 12p`. */
  value: string
  previous?: number | null
  amount?: number
  /**
   * What the delta is measured against — "so với 7 ngày trước đó". It is the
   * delta's tooltip rather than a line of its own: four tiles each printing the
   * same sentence is four copies of one fact, and the arrow already says which
   * way. Every tile's visible foot says something the others do not.
   */
  compare?: string
  /** Seven days behind the figure. Fewer than two points draws nothing. */
  trend?: number[]
  /** One quiet line under the trend: the total, the share, the window. */
  foot?: string
}) {
  const d = amount != null && previous !== undefined ? delta(amount, previous) : null

  return (
    <section className={styles.tile}>
      <span className={styles.tileHead}>
        <Icon name={icon} size={18} />
        <span className={styles.tileLabel}>{label}</span>
      </span>

      <span className={styles.tileFigure}>
        <span className={styles.tileValue}>{value}</span>
        {d ? (
          <span className={styles.delta} title={compare}>
            <span className={`${styles.deltaIcon} ${d.up ? '' : styles.deltaDown}`}>
              <Icon name="arrow-up" size={14} />
            </span>
            {d.text}
          </span>
        ) : null}
      </span>

      {trend && trend.length > 1 ? <Spark points={trend} label={`${label}, 7 ngày qua`} /> : null}
      {foot ? <span className={styles.tileFoot}>{foot}</span> : null}
    </section>
  )
}
