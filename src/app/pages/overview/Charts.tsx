import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import styles from './Charts.module.css'

/*
 * The drawn figures on Tổng quan — and, when the other tabs arrive, on those.
 *
 * Three decisions run through all of them:
 *
 * 1. **One hue, five steps.** Nothing here is coloured by series. Every figure
 *    on this page is a magnitude, so `--chart-step-1…5` (tokens/colors.css)
 *    carry it and identity comes from position plus a label that is always on
 *    screen. The measured reason is in the token file; the short version is
 *    that terracotta and lemongrass are the same bar to a deutan reader.
 * 2. **Every value is readable without the picture.** Columns carry their
 *    count above the bar, ranked bars carry it at the end, the band carries it
 *    in the legend. The hour grid is the one exception — twenty-four numbers
 *    would be noise — so each cell states itself in its `title` and in the
 *    list a screen reader gets instead of the grid.
 * 3. **Marks are thin and the paper does the separating.** Bars cap at 24px
 *    and round only at the data end; touching marks are held apart by a 2px
 *    gap of card, never by a stroke, which would add ink that is not data.
 *
 * Motion is the app's one idiom — the rising arc, staggered — and it is a
 * transition on a CSS custom property rather than a keyframe, so a value that
 * changes (a new range) moves to the new height instead of restarting from
 * zero. `prefers-reduced-motion` drops it in the stylesheet.
 */

/** Where a value sits on the five-step ramp. 0 is "nothing here". */
function step(value: number, max: number): string {
  if (value <= 0) return 'var(--chart-step-1)'
  const n = Math.min(5, Math.max(2, Math.ceil((value / max) * 5) + 1))
  return `var(--chart-step-${n})`
}

/* ------------------------------------------------------------------- columns */

export interface Column {
  key: string
  /** Under the bar. Two or three characters — `T2`, `Dưới 1p`. */
  label: string
  value: number
  /** The one column the reader is standing in: today, or the commonest bucket. */
  now?: boolean
  /** Spoken and hovered — the full sentence the short label abbreviates. */
  title?: string
}

/**
 * A column per day or per bucket, counts on the caps.
 *
 * The bars are a single series, so there is no legend: the card's title says
 * what is plotted, which is all a legend of one swatch could add.
 */
export function Columns({ columns, height = 110 }: { columns: Column[]; height?: number }) {
  const max = Math.max(1, ...columns.map((c) => c.value))
  return (
    <div className={styles.columns} role="list">
      {columns.map((c, i) => (
        <div key={c.key} className={`${styles.column} ${c.now ? styles.columnNow : ''}`} role="listitem" title={c.title ?? `${c.label}: ${c.value}`}>
          <span className={styles.columnCap}>{c.value}</span>
          <div className={styles.columnTrack} style={{ height }}>
            <span
              className={styles.columnBar}
              style={{ '--to': `${(c.value / max) * 100}%`, '--at': `${i * 45}ms` } as CSSProperties}
            />
          </div>
          <span className={styles.columnName}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- ranked bars */

export interface Ranked {
  key: string
  label: string
  value: number
  /** Printed at the end of the bar — the count, and its share of the whole. */
  note: string
}

/**
 * A list in descending order with its magnitudes drawn behind it. A bar chart
 * rather than a pie because the question is "which one is biggest and by how
 * much", and six slices of a circle answer neither well.
 */
export function RankedBars({ rows }: { rows: Ranked[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className={styles.ranked} role="list">
      {rows.map((r, i) => (
        <div key={r.key} className={styles.rank} role="listitem">
          <span className={styles.rankName}>{r.label}</span>
          <span className={styles.rankTrack}>
            <span
              className={styles.rankFill}
              style={{ '--to': `${(r.value / max) * 100}%`, '--at': `${i * 45}ms` } as CSSProperties}
            />
          </span>
          <span className={styles.rankValue}>{r.note}</span>
        </div>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- the band */

export interface Segment {
  key: string
  label: ReactNode
  value: number
  note: string
  /** The step to paint, 1 (palest) to 5. Largest share takes 5. */
  step: 1 | 2 | 3 | 4 | 5
  /** Draws the swatch dashed — the share that is a gap rather than an outcome. */
  gap?: boolean
}

/**
 * One bar split into its parts, with the legend under it.
 *
 * The legend is not optional here: four segments of one hue are told apart by
 * width and by the list below, never by colour alone. The 2px gaps are card
 * showing through, which is what separates neighbouring steps.
 */
export function Band({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <>
      <div className={styles.band} aria-hidden="true">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              className={styles.bandSeg}
              style={{ flex: s.value, background: `var(--chart-step-${s.step})` }}
              title={`${s.note}`}
            />
          ))}
        {total === 0 ? <span className={styles.bandSeg} style={{ flex: 1, background: 'var(--chart-step-1)' }} /> : null}
      </div>
      <div className={styles.legend} role="list">
        {segments.map((s) => (
          <div key={s.key} className={styles.legendRow} role="listitem">
            <span
              className={`${styles.swatch} ${s.gap ? styles.swatchGap : ''}`}
              style={{ background: `var(--chart-step-${s.step})` }}
            />
            <span className={s.gap ? styles.legendGapLabel : undefined}>{s.label}</span>
            <span className={styles.legendValue}>{s.note}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- the hour grid */

/**
 * Twenty-four cells, midnight first, shaded by how many calls landed in each.
 *
 * A grid rather than twenty-four columns because the question is "when does the
 * phone ring", which is a pattern across the day rather than twenty-four
 * separate magnitudes — and because twenty-four bars at 320px wide are 11px
 * each, which is a texture.
 *
 * The opening window is drawn under the grid as a bracket, not as a tint behind
 * it: blush means speech in this product (ui-ux-principles §1) and a shaded
 * band would be the fourth thing on one small chart competing for the same
 * paper.
 */
export function HourGrid({
  hours,
  openFrom,
  openTo,
  label,
}: {
  /** 24 counts, midnight first. */
  hours: number[]
  /** Hour the clinic opens and closes, 0–24. The bracket spans them. */
  openFrom: number
  openTo: number
  /** What the bracket says — "Giờ mở cửa 8:00 – 20:00". */
  label: string
}) {
  const listId = useId()
  const max = Math.max(1, ...hours)
  return (
    <div className={styles.hourWrap}>
      {/*
        The grid is decoration over the list below it: a screen reader reads
        "9 giờ: 14 cuộc" rather than twenty-four unlabelled cells, and the same
        sentence is the hover title.
      */}
      <div className={styles.hours} aria-describedby={listId} role="img" aria-label={label}>
        {hours.map((c, h) => (
          <span key={h} className={styles.hourCell} style={{ background: step(c, max) }} title={`${h}:00 · ${c} cuộc`} />
        ))}
      </div>

      <div className={styles.hourAxis} aria-hidden="true">
        {hours.map((_, h) => (
          <span key={h} className={styles.hourTick}>
            {h % 6 === 0 ? h : h === 23 ? 23 : ''}
          </span>
        ))}
      </div>

      <div className={styles.hourBracket} aria-hidden="true">
        <span
          className={styles.bracket}
          style={{ left: `${(openFrom / 24) * 100}%`, width: `${((openTo - openFrom) / 24) * 100}%` }}
        />
        <span className={styles.bracketLabel} style={{ left: `${((openFrom + openTo) / 2 / 24) * 100}%` }}>
          {label}
        </span>
      </div>

      <ul id={listId} className={styles.srOnly}>
        {hours.map((c, h) => (
          <li key={h}>{`${h} giờ: ${c} cuộc`}</li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ sparkline */

/**
 * Seven days behind a figure. No axis, no labels, no hover: it says "rising",
 * "flat" or "falling" and the number above it says the rest.
 *
 * `vector-effect` keeps the 2px line 2px while the box stretches to the tile,
 * and the end dot wears a 2px ring of card so it stays a dot where the line
 * runs under it.
 */
export function Spark({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const x = (i: number) => (i / (points.length - 1)) * 100
  const y = (v: number) => 26 - ((v - min) / span) * 22
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')
  return (
    <svg className={styles.spark} viewBox="0 0 100 28" preserveAspectRatio="none" role="img" aria-label={label}>
      <path className={styles.sparkLine} d={d} vectorEffect="non-scaling-stroke" />
      <circle className={styles.sparkDot} cx={100} cy={y(points[points.length - 1])} r={3.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
