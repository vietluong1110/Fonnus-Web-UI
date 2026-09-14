import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react'
import styles from './Charts.module.css'

/*
 * The drawn figures — Tổng quan first, and every reporting page after it.
 *
 * Four decisions run through all of them:
 *
 * 1. **One hue, five steps.** Nothing is coloured by series. Every figure is a
 *    magnitude, so `--chart-step-1…5` carry it and identity comes from position
 *    plus a label that is on screen. Measured reason: tokens/colors.css.
 * 2. **A number sits on the thing it counts.** A column's count rides its own
 *    cap, not a row pinned to the top of the chart — the eye should not have to
 *    travel from a short bar up to a figure 50px above it. On a long series only
 *    the few columns worth naming keep theirs (today, the busiest, the quietest);
 *    thirty numbers in a row are a barcode of digits.
 * 3. **Every mark answers the pointer, the same way, at once.** See `useScrub`.
 * 4. **Marks are thin and the paper does the separating.** A column is a share
 *    of its slot, capped, rounded only at the data end; the air between is card.
 *
 * Motion is the rising arc: bars grow from the baseline when a chart mounts,
 * and slide to a new length when the range changes rather than restarting.
 * `prefers-reduced-motion` drops all of it in the stylesheet.
 *
 * Charts carry no Vietnamese of their own. Every label, tick and tip is written
 * by the page, which owns the copy (CLAUDE.md).
 */

/** What a mark says when it is pointed at: where, how many, and one line of why it matters. */
export interface ChartTip {
  head: string
  value: string
  meta?: string
}

/** Where a value sits on the five-step ramp. 0 is "nothing here". */
function step(value: number, max: number): string {
  if (value <= 0) return 'var(--chart-step-1)'
  const n = Math.min(5, Math.max(2, Math.ceil((value / max) * 5) + 1))
  return `var(--chart-step-${n})`
}

/**
 * False for the first two frames after mount, then true — so a bar is painted
 * at zero once and *then* given its length, which is what lets the transition
 * run on arrival instead of only on later changes.
 */
function useDrawn(): boolean {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setDrawn(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])
  return drawn
}

/* ------------------------------------------------------------------ the scrub */

type Source = 'mouse' | 'touch' | 'key'
type IndexAt = (e: PointerEvent<HTMLDivElement>, host: HTMLDivElement) => number | null | undefined

/**
 * One hover model for every chart.
 *
 * - **The tip is there the moment the pointer is.** NN/g's 300–500ms wait is
 *   for content that *interrupts* — a menu, a popover over a button. A chart is
 *   being read by moving across it; the tip is the reading, and a delay on every
 *   bar makes a scrub feel like wading. What stops it being noise is that it
 *   appears only inside the plot, never over something you meant to press.
 * - **The target is the whole slot, not the ink.** Today's column at 4 calls is
 *   a 6px sliver; the pointer only has to be in its column. The index comes from
 *   the pointer's position, so the 2px gaps between marks never flicker it off.
 * - **Moving between marks glides.** The tip slides to the next mark instead of
 *   fading out and in, so a scrub reads as one object following the hand.
 * - **A tap keeps its tip until the next tap elsewhere**, because a finger lifts
 *   and a cursor does not. A horizontal drag scrubs; a vertical one still
 *   scrolls the page (`touch-action: pan-y`).
 * - **Arrow keys walk the marks** once the chart has keyboard focus, and only
 *   then is the tip announced.
 *
 * `indexAt` returns `undefined` to mean "between marks, keep the current one".
 */
function useScrub(count: number, indexAt: IndexAt) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const [source, setSource] = useState<Source>('mouse')

  useEffect(() => {
    if (active == null || source !== 'touch') return
    const onDown = (e: globalThis.PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setActive(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active, source])

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const i = indexAt(e, e.currentTarget)
    if (i === undefined) return
    setSource(e.pointerType === 'mouse' ? 'mouse' : 'touch')
    setActive(i)
  }

  const bind = {
    ref,
    tabIndex: 0,
    onPointerDown: pick,
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      // A finger that is not down is not pointing at anything.
      if (e.pointerType !== 'mouse' && e.buttons === 0) return
      pick(e)
    },
    onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') setActive(null)
    },
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      const move: Record<string, (a: number) => number> = {
        ArrowRight: (a) => a + 1,
        ArrowDown: (a) => a + 1,
        ArrowLeft: (a) => a - 1,
        ArrowUp: (a) => a - 1,
        Home: () => 0,
        End: () => count - 1,
      }
      if (e.key === 'Escape') {
        setActive(null)
        return
      }
      const go = move[e.key]
      if (!go) return
      e.preventDefault()
      setSource('key')
      setActive((a) => Math.max(0, Math.min(count - 1, a == null ? count - 1 : go(a))))
    },
    onBlur: () => setActive(null),
  }

  return { active, source, bind }
}

/** The slot under the pointer, for marks laid out evenly across `[data-track]`. */
const bySlot =
  (n: number): IndexAt =>
  (e, host) => {
    const r = (host.querySelector('[data-track]') ?? host).getBoundingClientRect()
    return Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)))
  }

/** The nearest point, for a line whose points sit on both edges. */
const byPoint =
  (n: number): IndexAt =>
  (e, host) => {
    const r = (host.querySelector('[data-track]') ?? host).getBoundingClientRect()
    return Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1))))
  }

/** The row nearest the pointer, for marks stacked down the chart. */
const byRow: IndexAt = (e, host) => {
  let best: number | undefined
  let distance = Infinity
  host.querySelectorAll<HTMLElement>('[data-i]').forEach((el) => {
    const r = el.getBoundingClientRect()
    const d = Math.abs(e.clientY - (r.top + r.height / 2))
    if (d < distance) {
      distance = d
      best = Number(el.dataset.i)
    }
  })
  return best
}

/** Whatever mark is directly under the pointer; between marks, keep the last one. */
const byMark: IndexAt = (e, host) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-i]')
  return el && host.contains(el) ? Number(el.dataset.i) : undefined
}

/* ----------------------------------------------------------------------- tip */

/**
 * The one tip. Night paper and cream type — the same object as the header's
 * "Gọi thử" label, grown to three lines — so a pointer label looks like one
 * thing across the product.
 *
 * It finds its mark by `data-anchor` inside the chart and positions itself
 * after layout: centred over the mark, clamped to the chart's width so it never
 * leaves the card on a phone, flipped below when the viewport's top edge is too
 * close. The caret keeps pointing at the mark when the box is clamped.
 */
function TipBox({
  host,
  active,
  tip,
  announce,
}: {
  host: RefObject<HTMLDivElement | null>
  active: number | null
  tip: ChartTip | null
  announce: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useRef(false)
  // Fading out keeps the last words on it, rather than shrinking to an empty box.
  const last = useRef<ChartTip | null>(tip)
  if (tip) last.current = tip

  useLayoutEffect(() => {
    const el = ref.current
    const box = host.current
    if (!el || !box) return
    const anchor = active == null || !tip ? null : box.querySelector<HTMLElement>(`[data-anchor="${active}"]`)
    if (!anchor) {
      el.removeAttribute('data-shown')
      shown.current = false
      return
    }
    const hr = box.getBoundingClientRect()
    const ar = anchor.getBoundingClientRect()
    const w = el.offsetWidth
    const h = el.offsetHeight
    const cx = ar.left + ar.width / 2 - hr.left
    const left = Math.max(-6, Math.min(hr.width - w + 6, cx - w / 2))
    const below = ar.top - h - 12 < 8
    const top = below ? ar.bottom - hr.top + 10 : ar.top - hr.top - h - 10
    // Glide only from a position that was on screen; arriving from hidden snaps.
    el.classList.toggle(styles.tipGlide, shown.current)
    el.classList.toggle(styles.tipBelow, below)
    el.style.setProperty('--caret', `${Math.round(cx - left)}px`)
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
    el.setAttribute('data-shown', '')
    shown.current = true
  })

  const t = last.current
  return (
    <div
      ref={ref}
      className={styles.tip}
      role={announce ? 'status' : undefined}
      aria-hidden={announce ? undefined : true}
    >
      {t ? (
        <>
          <span className={styles.tipHead}>{t.head}</span>
          <span className={styles.tipValue}>{t.value}</span>
          {t.meta ? <span className={styles.tipMeta}>{t.meta}</span> : null}
        </>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------- columns */

export interface Column {
  key: string
  /** Under the axis. Empty on a long series for a column that carries no tick. */
  tick: string
  value: number
  /** The one column the reader is standing in: today, or the commonest bucket. */
  now?: boolean
  /** Keep the count on the cap when nothing is pointed at. */
  cap?: boolean
  /** A day that has not happened yet, drawn at the palest step — a projection, not a count. */
  ghost?: boolean
  tip: ChartTip
}

/**
 * A column per day or per bucket.
 *
 * Past twelve columns the chart becomes *dense*: bars narrow to their share of
 * a smaller slot, and ticks stop being one per column — the page passes a tick
 * only where it wants one (a week's start), and the first and last hold to the
 * chart's edges instead of centring past them.
 *
 * `average` draws a dotted reference line across the plot. Dotted, never
 * dashed: a dashed edge is this app's mark for content not yet filled in.
 */
export function Columns({
  columns,
  label,
  height = 170,
  average,
  fill = false,
}: {
  columns: Column[]
  /** What the chart is, for a screen reader: the card's title. */
  label: string
  /** The plot's height — or, with `fill`, the least it may be. */
  height?: number
  average?: number
  /**
   * Grow into the card's leftover height. For a chart sharing a row with a
   * taller card: a fixed plot left a band of empty card under its axis that
   * looked like a missing footer.
   */
  fill?: boolean
}) {
  const n = columns.length
  const dense = n > 12
  const max = Math.max(1, ...columns.map((c) => c.value), average ?? 0)
  const drawn = useDrawn()
  const { active, source, bind } = useScrub(n, bySlot(n))

  return (
    <div
      {...bind}
      className={`${styles.chart} ${dense ? styles.dense : ''} ${fill ? styles.fill : ''}`}
      data-scrub={active != null || undefined}
      role="group"
      aria-label={label}
    >
      <div className={styles.plot} style={fill ? { minHeight: height } : { height }} data-track role="list">
        {average != null && average > 0 ? (
          <span
            className={styles.average}
            style={{ '--avg': drawn ? average / max : 0 } as CSSProperties}
            aria-hidden="true"
          />
        ) : null}
        {columns.map((c, i) => (
          <div
            key={c.key}
            role="listitem"
            aria-label={`${c.tip.head}: ${c.tip.value}`}
            data-i={i}
            data-on={active === i || undefined}
            className={`${styles.slot} ${c.now ? styles.slotNow : ''} ${c.cap ? styles.slotCap : ''} ${c.ghost ? styles.slotGhost : ''}`}
          >
            <span
              className={styles.bar}
              style={
                {
                  '--to': drawn ? `${(c.value / max) * 100}%` : '0%',
                  '--at': `${i * (dense ? 12 : 40)}ms`,
                } as CSSProperties
              }
            >
              <span className={styles.cap} data-anchor={i}>
                {c.value}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className={styles.ticks} aria-hidden="true">
        {columns.map((c, i) => (
          <span
            key={c.key}
            className={`${styles.tick} ${c.now ? styles.slotNow : ''}`}
            data-on={active === i || undefined}
          >
            {c.tick ? (
              <span
                className={`${styles.tickLabel} ${dense && i === 0 ? styles.tickStart : ''} ${dense && i === n - 1 ? styles.tickEnd : ''}`}
              >
                {c.tick}
              </span>
            ) : null}
          </span>
        ))}
      </div>

      <TipBox host={bind.ref} active={active} tip={active == null ? null : columns[active].tip} announce={source === 'key'} />
    </div>
  )
}

/* --------------------------------------------------------------- ranked bars */

export interface Ranked {
  key: string
  label: string
  value: number
  /** The share of the whole, already rounded — `27%`. */
  share: string
  tip: ChartTip
}

/**
 * A list in descending order with its magnitudes drawn under it.
 *
 * The name and the figure share one line and the bar takes the full width of
 * the next, at every width. With the name beside the bar, the bar got whatever
 * the name and the figure left over — 86px on one row and 94px on the next,
 * because "0 · 0%" is narrower than "2 · 50%" — and bars that do not start and
 * end in the same place cannot be compared, which is the only thing they are for.
 */
export function RankedBars({ rows, label }: { rows: Ranked[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const drawn = useDrawn()
  const { active, source, bind } = useScrub(rows.length, byRow)

  return (
    <div {...bind} className={styles.chart} data-scrub={active != null || undefined} role="group" aria-label={label}>
      <div className={styles.ranked} role="list">
        {rows.map((r, i) => {
          const to = drawn ? `${(r.value / max) * 100}%` : '0%'
          return (
            <div
              key={r.key}
              role="listitem"
              data-i={i}
              data-on={active === i || undefined}
              className={`${styles.rank} ${r.value === 0 ? styles.rankZero : ''}`}
              style={{ '--to': to, '--to-n': drawn ? r.value / max : 0, '--at': `${i * 40}ms` } as CSSProperties}
            >
              <span className={styles.rankName}>{r.label}</span>
              <span className={styles.rankValue}>
                <b>{r.value}</b> · {r.share}
              </span>
              <span className={styles.rankTrack}>
                <span className={styles.rankFill} />
              </span>
              {/* The fill's end, full row height: the tip stands over the row at the bar's tip. */}
              <span className={styles.rankAnchor} data-anchor={i} />
            </div>
          )
        })}
      </div>
      <TipBox host={bind.ref} active={active} tip={active == null ? null : rows[active].tip} announce={source === 'key'} />
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
  tip: ChartTip
}

/**
 * One bar split into its parts, with the legend under it.
 *
 * The legend is not optional: four segments of one hue are told apart by width
 * and by the list, never by colour alone. Pointing at either half lights both —
 * the segment lifts and its legend row takes the hover wash — so the link
 * between a stretch of band and its name is shown rather than inferred.
 */
export function Band({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const drawn = useDrawn()
  const { active, source, bind } = useScrub(segments.length, byMark)

  return (
    <div {...bind} className={styles.chart} data-scrub={active != null || undefined} role="group" aria-label={label}>
      <div className={styles.band} aria-hidden="true">
        {segments.map((s, i) =>
          s.value > 0 ? (
            <span
              key={s.key}
              data-i={i}
              data-anchor={i}
              data-on={active === i || undefined}
              className={styles.bandSeg}
              style={{ flexGrow: drawn ? s.value : 0.001, background: `var(--chart-step-${s.step})` }}
            />
          ) : null,
        )}
        {total === 0 ? <span className={styles.bandSeg} style={{ flexGrow: 1, background: 'var(--chart-step-1)' }} /> : null}
      </div>
      <div className={styles.legend} role="list">
        {segments.map((s, i) => (
          <div key={s.key} className={styles.legendRow} role="listitem" data-i={i} data-on={active === i || undefined}>
            <span
              className={`${styles.swatch} ${s.gap ? styles.swatchGap : ''}`}
              style={{ background: `var(--chart-step-${s.step})` }}
            />
            <span className={s.gap ? styles.legendGapLabel : undefined}>{s.label}</span>
            <span className={styles.legendValue}>{s.note}</span>
          </div>
        ))}
      </div>
      <TipBox host={bind.ref} active={active} tip={active == null ? null : segments[active].tip} announce={source === 'key'} />
    </div>
  )
}

/* -------------------------------------------------------------- track tips */

/** One stretch of a figure the page draws itself, as fractions of its width. */
export interface TrackPart {
  key: string
  from: number
  to: number
  tip: ChartTip
}

/**
 * The charts' pointer and tip for a figure this file does not draw — a quota
 * bar, whose used, projected and free stretches are the page's own marks.
 *
 * The page draws the figure as `children`; this lays one invisible part over
 * each stretch and answers the pointer the way every chart does (`useScrub`):
 * at once, anywhere along the stretch, gliding between stretches, arrow keys
 * once focused. The hit area reaches 8px above and below a thin bar, like the
 * sparkline's. The stretch under the pointer is ringed, not recoloured — on a
 * meter the colour *is* the reading, as on the hour grid.
 */
export function TrackTips({ parts, label, children }: { parts: TrackPart[]; label: string; children: ReactNode }) {
  const { active, source, bind } = useScrub(parts.length, (e, host) => {
    const r = (host.querySelector('[data-track]') ?? host).getBoundingClientRect()
    const x = (e.clientX - r.left) / Math.max(1, r.width)
    const i = parts.findIndex((p) => x >= p.from && x <= p.to)
    if (i >= 0) return i
    return x < 0 ? 0 : x > 1 ? parts.length - 1 : undefined
  })
  const tip = active == null ? null : (parts[active]?.tip ?? null)

  return (
    <div {...bind} className={`${styles.chart} ${styles.trackTips}`} data-scrub={active != null || undefined} role="group" aria-label={label}>
      <div className={styles.trackTipsTrack} data-track>
        {children}
        {parts.map((p, i) => (
          <span
            key={p.key}
            className={styles.trackPart}
            data-anchor={i}
            data-on={active === i || undefined}
            style={{ left: `${p.from * 100}%`, width: `${Math.max(0, p.to - p.from) * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <TipBox host={bind.ref} active={active} tip={tip} announce={source === 'key'} />
    </div>
  )
}

/* ------------------------------------------------------------- the hour grid */

/**
 * Twenty-four cells, midnight first, shaded by how many calls landed in each.
 *
 * A grid rather than twenty-four columns because the question is "when does the
 * phone ring" — a pattern across the day — and twenty-four bars at 320px are
 * 11px each, which is a texture. The cells carry no numbers; the tip does.
 *
 * The axis names the hours at the cells' *edges*, 0h to 24h, because a cell is
 * an hour-long span and a label centred under it reads as an instant.
 *
 * The opening window is drawn under the grid as a bracket, not a tint behind it:
 * blush means speech in this product (ui-ux-principles §1).
 */
export function HourGrid({
  hours,
  tips,
  openFrom,
  openTo,
  label,
  ticks,
}: {
  /** 24 counts, midnight first. */
  hours: number[]
  /** 24 tips, one per hour. Also what a screen reader reads instead of the grid. */
  tips: ChartTip[]
  /** Hour the clinic opens and closes, 0–24. The bracket spans them. */
  openFrom: number
  openTo: number
  /** What the bracket says — "Giờ mở cửa 8:00 – 20:00". */
  label: string
  /** The five edge labels, `0h` … `24h`. */
  ticks: [string, string, string, string, string]
}) {
  const listId = useId()
  const max = Math.max(1, ...hours)
  const { active, source, bind } = useScrub(24, bySlot(24))

  return (
    <div {...bind} className={styles.chart} data-scrub={active != null || undefined} role="group" aria-label={label}>
      <div className={styles.hours} data-track aria-describedby={listId}>
        {hours.map((c, h) => (
          <span
            key={h}
            className={styles.hourCell}
            data-anchor={h}
            data-on={active === h || undefined}
            style={{ background: step(c, max) }}
          />
        ))}
      </div>

      <div className={styles.hourAxis} aria-hidden="true">
        {ticks.map((t, i) => (
          <span key={i} className={styles.hourTick} style={{ left: `${i * 25}%` }}>
            {t}
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
        {tips.map((t, h) => (
          <li key={h}>{`${t.head}: ${t.value}`}</li>
        ))}
      </ul>

      <TipBox host={bind.ref} active={active} tip={active == null ? null : tips[active]} announce={source === 'key'} />
    </div>
  )
}

/* ------------------------------------------------------------------ sparkline */

/**
 * Seven days behind a figure. No axis and no labels: it says rising, flat or
 * falling, and pointing at it says which day was which.
 *
 * The line is SVG stretched to the tile; the dots are not. A circle inside a
 * `preserveAspectRatio="none"` box is stretched with it — the end dot rendered
 * as a 9×3 lozenge on a wide tile — so dots are positioned elements laid over
 * the line at the same percentages, and stay round at any width.
 */
export function Spark({ points, tips, label }: { points: number[]; tips: ChartTip[]; label: string }) {
  const n = points.length
  const { active, source, bind } = useScrub(n, byPoint(n))
  if (n < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const x = (i: number) => (i / (n - 1)) * 100
  // 2px of headroom top and bottom inside the 28-unit box, as a percentage.
  const y = (v: number) => ((26 - ((v - min) / span) * 22) / 28) * 100
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)} ${((y(v) / 100) * 28).toFixed(2)}`).join(' ')
  const on = active ?? n - 1

  return (
    <div
      {...bind}
      className={`${styles.chart} ${styles.sparkWrap}`}
      data-scrub={active != null || undefined}
      role="group"
      aria-label={label}
    >
      <div className={styles.sparkTrack} data-track>
        <svg className={styles.spark} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.sparkLine} d={d} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className={styles.sparkGuide} style={{ left: `${x(on)}%` }} aria-hidden="true" />
        <span className={styles.sparkDot} style={{ left: `${x(on)}%`, top: `${y(points[on])}%` }} aria-hidden="true" />
        {/* Not animated, unlike the dot: the tip measures this, and a moving target would leave it behind. */}
        {active != null ? (
          <span className={styles.sparkMark} data-anchor={active} style={{ left: `${x(active)}%`, top: `${y(points[active])}%` }} />
        ) : null}
      </div>
      <TipBox host={bind.ref} active={active} tip={active == null ? null : tips[active] ?? null} announce={source === 'key'} />
    </div>
  )
}
