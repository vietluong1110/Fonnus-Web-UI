import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Icon, Pattern } from '../../../design-system'
import { WEEKDAYS, WEEKDAY_LONG, WEEKDAY_SHORT } from '../defaults'
import type { BreakPeriod, DayHours, Weekday } from '../model'
import { newId } from '../model'
import { AnchoredPopup, Switch, TimeField, useAnchoredPopup } from '../../ui'
import styles from './WeekPlanner.module.css'

/*
 * The week, as a calendar.
 *
 * Seven columns, one per weekday, the whole day from midnight to midnight
 * with the view opened on six in the morning to ten at night — the rest is
 * a scroll away. There is one thing to draw: a *shift* ("ca"), the hours the
 * clinic is open. Drag on empty space to add one, drag a shift to move it,
 * drag its edge to change when it starts or ends, click it to type the
 * exact times. The gap between two shifts on the same day *is* the break —
 * nobody paints it, it is drawn hatched and labelled the moment it exists,
 * and clicking it edits it or closes it. A day header opens the day: open
 * or closed, another shift, copy these hours to other days.
 *
 * That is one concept where there used to be two legends and a hidden
 * erase mode, and it is how every business-hours editor an owner has met
 * (Google Business Profile, a booking page) already works.
 *
 * The record is not touched: `operating_hours_by_weekday` is one open span
 * per day and `break_periods` the closed windows inside it. Shifts are
 * *derived* from the two on every render and written back on every change
 * — a day is open from its first shift to its last, every gap between
 * shifts is a break, and breaks with the same clock on every open day
 * collapse to one `days: []` row, which is what the catalogue means by it.
 *
 * Rows are half hours; the pointer snaps to quarter hours, the way a
 * calendar app does. Every drag has a single-pointer twin (the panels), so
 * the calendar meets WCAG 2.5.7 and works from a keyboard: shifts and gaps
 * are focusable, Enter opens their panel, Delete removes a shift.
 */

export interface PlannerValue {
  hours: DayHours[]
  breaks: BreakPeriod[]
}

/** Minutes from midnight, `[from, to)`. */
interface Period {
  from: number
  to: number
}
/** One list of shifts per weekday, in `WEEKDAYS` order. */
type Week = Period[][]

const SNAP = 15
const ROW_MIN = 30
/** Pixels per half-hour row: 40px an hour, 10px a quarter — a quarter is hittable, sixteen hours fit a screen. */
const ROW_H = 20
const DAY_MIN = 24 * 60
const VIEW_START = 6 * 60
const MIN_LEN = 15
/** A mouse has to travel this far before a press is a drag rather than a click. */
const DRAG_PX = 4
/** A finger has to stay this long before a press is a drag rather than a scroll. */
const HOLD_MS = 350
/** The shifts a day opens with when no other day has hours to copy. */
const DEFAULT_DAY: Period[] = [
  { from: 8 * 60, to: 12 * 60 },
  { from: 13 * 60 + 30, to: 17 * 60 + 30 },
]

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const snapDown = (min: number) => Math.floor(min / SNAP) * SNAP
const snapNear = (min: number) => Math.round(min / SNAP) * SNAP
const px = (min: number) => (min / ROW_MIN) * ROW_H
const range = (p: Period) => `${toHHMM(p.from)}–${toHHMM(p.to)}`

/* --------------------------------------------------------- record ⇄ week */

function periodsOf(v: PlannerValue): Week {
  return WEEKDAYS.map((day) => {
    const row = v.hours.find((r) => r.day === day)
    if (!row || !row.open) return []
    let list: Period[] = [{ from: toMin(row.from), to: toMin(row.to) }]
    for (const b of v.breaks) {
      if (b.days.length && !b.days.includes(day)) continue
      const bf = toMin(b.from)
      const bt = toMin(b.to)
      list = list.flatMap((p) => {
        if (bt <= p.from || bf >= p.to) return [p]
        const out: Period[] = []
        if (bf > p.from) out.push({ from: p.from, to: bf })
        if (bt < p.to) out.push({ from: bt, to: p.to })
        return out
      })
    }
    return list.filter((p) => p.to > p.from).sort((a, b) => a.from - b.from)
  })
}

/** Sorted, with shifts that touch or overlap joined — dragging the afternoon up to noon is how a lunch break is removed. */
function tidy(list: Period[]): Period[] {
  const out: Period[] = []
  for (const p of [...list].sort((a, b) => a.from - b.from)) {
    const last = out[out.length - 1]
    if (last && p.from <= last.to) last.to = Math.max(last.to, p.to)
    else out.push({ ...p })
  }
  return out
}

function toValue(week: Week, prev: PlannerValue): PlannerValue {
  const runs = new Map<string, Weekday[]>()
  const hours: DayHours[] = WEEKDAYS.map((day, i) => {
    const list = week[i]
    const before = prev.hours.find((r) => r.day === day) ?? { day, open: false, from: '08:00', to: '17:00' }
    if (!list.length) return { ...before, open: false }
    for (let k = 1; k < list.length; k++) {
      const key = `${toHHMM(list[k - 1].to)}-${toHHMM(list[k].from)}`
      runs.set(key, [...(runs.get(key) ?? []), day])
    }
    return { ...before, open: true, from: toHHMM(list[0].from), to: toHHMM(list[list.length - 1].to) }
  })
  const openDays = hours.filter((r) => r.open).length
  const breaks: BreakPeriod[] = [...runs.entries()]
    .map(([key, days]) => {
      const [from, to] = key.split('-')
      const existing = prev.breaks.find((b) => b.from === from && b.to === to)
      return { id: existing?.id ?? newId('brk'), days: days.length === openDays ? [] : days, from, to }
    })
    .sort((a, b) => a.from.localeCompare(b.from))
  return { hours, breaks }
}

/* ------------------------------------------------------------------ drag */

type Drag =
  | { kind: 'draw'; day: number; anchor: number; cur: number; moved: boolean; gap?: number }
  | { kind: 'move'; day: number; idx: number; grab: number; cur: number; moved: boolean }
  | { kind: 'resize'; day: number; idx: number; edge: 'from' | 'to'; cur: number; moved: boolean }

/** The week with the drag applied — what the calendar shows while the pointer is down. */
function applyDrag(week: Week, d: Drag): Week {
  const list = week[d.day]
  const next = week.slice()
  if (d.kind === 'draw') {
    if (!d.moved) return week
    const a = snapDown(d.anchor)
    const c = snapDown(d.cur)
    // Only as far as the neighbours: a new shift stops where the next one starts.
    const lo = Math.max(0, ...list.filter((p) => p.to <= a).map((p) => p.to))
    const hi = Math.min(DAY_MIN, ...list.filter((p) => p.from > a).map((p) => p.from))
    const from = Math.max(Math.min(a, c), lo)
    const to = Math.min(Math.max(a, c) + SNAP, hi)
    if (to - from < MIN_LEN) return week
    next[d.day] = [...list, { from, to }].sort((x, y) => x.from - y.from)
    return next
  }
  const p = list[d.idx]
  if (!p) return week
  const lo = list[d.idx - 1]?.to ?? 0
  const hi = list[d.idx + 1]?.from ?? DAY_MIN
  const col = list.slice()
  if (d.kind === 'move') {
    const len = p.to - p.from
    const from = clamp(snapNear(d.cur - d.grab), lo, hi - len)
    col[d.idx] = { from, to: from + len }
  } else if (d.edge === 'from') {
    col[d.idx] = { from: clamp(snapNear(d.cur), lo, p.to - MIN_LEN), to: p.to }
  } else {
    col[d.idx] = { from: p.from, to: clamp(snapNear(d.cur), p.from + MIN_LEN, hi) }
  }
  next[d.day] = col
  return next
}

/* ---------------------------------------------------------------- panels */

type Panel = { kind: 'shift'; day: number; idx: number } | { kind: 'gap'; day: number; idx: number } | { kind: 'day'; day: number }

const PANEL_SIZE = {
  shift: { width: 272, height: 150, minWidth: 240 },
  gap: { width: 272, height: 150, minWidth: 240 },
  day: { width: 300, height: 230, minWidth: 264 },
} as const

function panelLabel(p: Panel): string {
  const name = WEEKDAY_LONG[WEEKDAYS[p.day]]
  return p.kind === 'shift' ? `Ca làm việc ${name}` : p.kind === 'gap' ? `Giờ nghỉ ${name}` : name
}

/* ------------------------------------------------------------- planner */

export function WeekPlanner({ value, onChange, now, agent }: { value: PlannerValue; onChange: (next: PlannerValue) => void; now: Date; agent: string }) {
  const week = useMemo(() => periodsOf(value), [value])
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [coarse, setCoarse] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  /** A finger's press, waiting to become a drag — or a tap, if it lifts first. */
  const holdRef = useRef<{ timer: number; x: number; y: number; d: Drag; start: () => void } | null>(null)
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  /*
   * What the press landed on. Read here and not from the release's target:
   * once the grid has captured the pointer every later event is retargeted
   * to the grid, so by release the shift under the finger is not in the
   * event any more.
   */
  const pressElRef = useRef<HTMLElement | null>(null)

  const shown = drag ? applyDrag(week, drag) : week
  const commit = useCallback((next: Week) => onChange(toValue(next.map(tidy), value)), [onChange, value])

  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 4000)
    return () => window.clearTimeout(t)
  }, [note])

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setCoarse(mq.matches)
    const on = (e: MediaQueryListEvent) => setCoarse(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  /* ------------------------------------------------------------ scroll */

  const headH = () => headRef.current?.offsetHeight ?? 0
  const [edges, setEdges] = useState({ up: false, down: false, top: VIEW_START, bottom: DAY_MIN })
  const readEdges = useCallback(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const top = Math.round(sc.scrollTop / ROW_H) * ROW_MIN
    const bottom = Math.min(DAY_MIN, Math.round((sc.scrollTop + sc.clientHeight - headH()) / ROW_H) * ROW_MIN)
    setEdges({ up: sc.scrollTop > 1, down: sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1, top, bottom })
  }, [])

  // Opens on six in the morning — or earlier, if the record already has hours before that.
  // Once, on mount: the record changing under the user must not move the view.
  const weekRef = useRef(week)
  weekRef.current = week
  useLayoutEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const earliest = Math.min(VIEW_START, ...weekRef.current.flat().map((p) => p.from))
    sc.scrollTop = px(Math.floor(earliest / 60) * 60)
    readEdges()
  }, [readEdges])

  const scrollTo = (min: number) => scrollerRef.current?.scrollTo({ top: px(min), behavior: 'smooth' })

  /*
   * Once a drag has begun a finger must move the shift, not the sheet.
   * React's touch listeners are passive, so the one that cancels the scroll
   * is attached by hand.
   */
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  /* ------------------------------------------------------------ pointer */

  const locate = (e: { clientX: number; clientY: number }) => {
    const el = gridRef.current
    if (!el) return null
    const box = el.getBoundingClientRect()
    const day = clamp(Math.floor(((e.clientX - box.left) / box.width) * 7), 0, 6)
    const min = clamp(((e.clientY - box.top) / ROW_H) * ROW_MIN, 0, DAY_MIN)
    return { day, min }
  }

  const begin = (d: Drag) => {
    dragRef.current = d
    setDrag(d)
  }

  /** What a press on this element would open, if it turns out to be a click. */
  const clickOf = (d: Drag): Panel | null => (d.kind === 'move' ? { kind: 'shift', day: d.day, idx: d.idx } : d.kind === 'draw' && d.gap !== undefined ? { kind: 'gap', day: d.day, idx: d.gap } : null)

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const at = locate(e)
    if (!at) return
    const target = e.target as HTMLElement
    const edge = target.closest<HTMLElement>('[data-edge]')
    const shift = target.closest<HTMLElement>('[data-shift]')
    const gap = target.closest<HTMLElement>('[data-gap]')
    const on = shift ?? gap
    const day = on ? Number(on.dataset.day) : at.day
    const idx = on ? Number(on.dataset.idx) : -1
    let d: Drag
    if (edge && shift) d = { kind: 'resize', day, idx, edge: edge.dataset.edge as 'from' | 'to', cur: at.min, moved: false }
    else if (shift) d = { kind: 'move', day, idx, grab: at.min - shown[day][idx].from, cur: at.min, moved: false }
    else d = { kind: 'draw', day, anchor: at.min, cur: at.min, moved: false, gap: gap ? idx : undefined }
    pressRef.current = { x: e.clientX, y: e.clientY }
    pressElRef.current = on
    const el = e.currentTarget
    const pointerId = e.pointerId
    const start = () => {
      el.setPointerCapture(pointerId)
      begin(d)
    }
    if (e.pointerType === 'touch') {
      // A finger is a scroll until it has held still: the drag begins when
      // the hold ends, a swipe before that cancels it (the sheet scrolls),
      // and a lift before that is a tap.
      window.clearTimeout(holdRef.current?.timer)
      const timer = window.setTimeout(() => {
        holdRef.current = null
        if (navigator.vibrate) navigator.vibrate(8)
        start()
      }, HOLD_MS)
      holdRef.current = { timer, x: e.clientX, y: e.clientY, d, start }
      return
    }
    start()
  }

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const hold = holdRef.current
    if (hold) {
      if (Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 8) {
        window.clearTimeout(hold.timer)
        holdRef.current = null
      }
      return
    }
    const d = dragRef.current
    if (!d) return
    const at = locate(e)
    if (!at) return
    const press = pressRef.current
    const moved = d.moved || (press ? Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_PX : true)
    // Drag past the sheet's edge and it scrolls to keep up.
    const sc = scrollerRef.current
    if (sc && moved) {
      const r = sc.getBoundingClientRect()
      if (e.clientY < r.top + headH() + 24) sc.scrollTop -= 8
      else if (e.clientY > r.bottom - 24) sc.scrollTop += 8
    }
    if (at.min === d.cur && moved === d.moved) return
    begin({ ...d, cur: at.min, moved })
  }

  const finish = (e: ReactPointerEvent<HTMLDivElement>) => {
    const hold = holdRef.current
    if (hold) {
      window.clearTimeout(hold.timer)
      holdRef.current = null
      const p = e.type === 'pointerup' ? clickOf(hold.d) : null
      if (p) openPanel(p, pressElRef.current)
      return
    }
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    setDrag(null)
    if (e.type === 'pointercancel') return
    if (!d.moved) {
      const p = clickOf(d)
      if (p) openPanel(p, pressElRef.current)
      return
    }
    const next = applyDrag(week, d)
    if (next !== week) commit(next)
  }

  /* ------------------------------------------------------------- panels */

  const openPanel = (p: Panel, el: HTMLElement | null) => {
    if (!el) return
    anchorRef.current = el
    setPanel(p)
  }
  const closePanel = useCallback(() => setPanel(null), [])
  const { place, panelRef } = useAnchoredPopup(anchorRef, panel !== null, closePanel, PANEL_SIZE[panel?.kind ?? 'shift'])

  /*
   * Focus goes to the panel itself once it is placed — not to its first
   * field, which would open the time list before anything was asked — and
   * back to what opened it when it closes.
   */
  const focusedFor = useRef<Panel | null>(null)
  useEffect(() => {
    if (!panel || !place || focusedFor.current === panel) return
    focusedFor.current = panel
    panelRef.current?.querySelector<HTMLElement>('[data-panel]')?.focus()
  }, [panel, place, panelRef])
  useEffect(() => {
    if (!panel) return
    const opener = anchorRef.current
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [panel])

  const setDay = (day: number, list: Period[]) => {
    const next = week.slice()
    next[day] = list
    commit(next)
  }

  const setShift = (day: number, idx: number, patch: Partial<Period>) => {
    const list = week[day].slice()
    const p = { ...list[idx], ...patch }
    const lo = list[idx - 1]?.to ?? 0
    const hi = list[idx + 1]?.from ?? DAY_MIN
    p.from = clamp(p.from, lo, p.to - MIN_LEN)
    p.to = clamp(p.to, p.from + MIN_LEN, hi)
    list[idx] = p
    setDay(day, list)
  }

  const removeShift = (day: number, idx: number) => {
    setDay(
      day,
      week[day].filter((_, i) => i !== idx),
    )
    setPanel(null)
  }

  /** Cut a break into a shift: the lunch hour when the shift covers it, else through its middle. */
  const splitShift = (day: number, idx: number) => {
    const p = week[day][idx]
    if (p.to - p.from < 60) {
      setNote('Ca ngắn hơn một giờ, chưa có chỗ cho giờ nghỉ.')
      return
    }
    const noon = { from: 12 * 60, to: 13 * 60 + 30 }
    let cut: Period
    if (p.from + MIN_LEN <= noon.from && noon.to <= p.to - MIN_LEN) cut = noon
    else {
      const mid = snapNear((p.from + p.to) / 2)
      cut = { from: Math.max(p.from + MIN_LEN, mid - 30), to: Math.min(p.to - MIN_LEN, mid + 30) }
    }
    const list = week[day].slice()
    list.splice(idx, 1, { from: p.from, to: cut.from }, { from: cut.to, to: p.to })
    setDay(day, list)
    setPanel(null)
  }

  /** The gap after shift `idx`: its edges are the neighbours' edges. */
  const setGap = (day: number, idx: number, patch: Partial<Period>) => {
    const list = week[day].map((p) => ({ ...p }))
    const a = list[idx]
    const b = list[idx + 1]
    if (!a || !b) return
    if (patch.from !== undefined) a.to = clamp(patch.from, a.from + MIN_LEN, b.from - MIN_LEN)
    if (patch.to !== undefined) b.from = clamp(patch.to, a.to + MIN_LEN, b.to - MIN_LEN)
    setDay(day, list)
  }

  const closeGap = (day: number, idx: number) => {
    const list = week[day].map((p) => ({ ...p }))
    if (!list[idx + 1]) return
    list[idx].to = list[idx + 1].to
    list.splice(idx + 1, 1)
    setDay(day, list)
    setPanel(null)
  }

  const setDayOpen = (day: number, open: boolean) => {
    if (!open) return setDay(day, [])
    // The nearest day that has hours is the best guess for this one.
    const order = [...Array(6)].flatMap((_, k) => [(day - 1 - k + 7) % 7, (day + 1 + k) % 7])
    const src = order.find((i) => week[i].length)
    setDay(
      day,
      (src !== undefined ? week[src] : DEFAULT_DAY).map((p) => ({ ...p })),
    )
  }

  const addShift = (day: number) => {
    const list = week[day]
    let p: Period | null = null
    if (!list.length) p = { from: 8 * 60, to: 12 * 60 }
    else {
      const last = list[list.length - 1]
      const first = list[0]
      const after = { from: last.to + 60, to: Math.min(DAY_MIN, last.to + 5 * 60) }
      const before = { from: Math.max(0, first.from - 5 * 60), to: first.from - 60 }
      if (after.to - after.from >= 60) p = after
      else if (before.to - before.from >= 60) p = before
    }
    if (!p) {
      setNote('Không còn chỗ trống trong ngày cho một ca nữa.')
      return
    }
    setDay(day, [...list, p])
  }

  const copyDay = (day: number, to: number[]) => {
    const next = week.slice()
    for (const t of to) next[t] = week[day].map((p) => ({ ...p }))
    commit(next)
    setPanel(null)
  }

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>, kind: 'shift' | 'gap', day: number, idx: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPanel({ kind, day, idx }, e.currentTarget)
    } else if (kind === 'shift' && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      removeShift(day, idx)
    }
  }

  /* ------------------------------------------------------------- render */

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todayIdx = WEEKDAYS.indexOf(now.getDay() as Weekday)
  const hint = coarse ? 'Giữ rồi kéo trên lịch để thêm ca · chạm vào ca để sửa giờ' : 'Kéo trên lịch để thêm ca · bấm vào ca để sửa giờ'
  const isActive = (kind: 'shift' | 'gap', day: number, idx: number) => panel?.kind === kind && panel.day === day && panel.idx === idx

  return (
    <div className={styles.planner}>
      <div className={styles.legend}>
        <span className={styles.key} title={`${agent} nhận hẹn và trả lời khách`}>
          <span className={`${styles.swatch} ${styles.swatchWork}`} aria-hidden="true" />
          Giờ làm việc
        </span>
        <span className={styles.key} title={`${agent} báo khách gọi lại sau`}>
          <span className={`${styles.swatch} ${styles.swatchGap}`} aria-hidden="true" />
          Nghỉ giữa ca
        </span>
        <span className={`${styles.legendHint} ${note ? styles.legendNote : ''}`} aria-live="polite">
          {note ?? hint}
        </span>
      </div>

      <div className={`${styles.sheet} ${edges.up ? styles.canUp : ''} ${edges.down ? styles.canDown : ''}`}>
        <div ref={scrollerRef} className={styles.scroller} onScroll={readEdges}>
          <div ref={headRef} className={styles.head}>
            <div className={styles.corner} />
            {WEEKDAYS.map((day, i) => {
              const list = shown[i]
              const open = panel?.kind === 'day' && panel.day === i
              return (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayHead} ${i === todayIdx ? styles.dayToday : ''} ${open ? styles.dayHeadOpen : ''} ${list.length ? '' : styles.dayClosed}`}
                  aria-haspopup="dialog"
                  aria-expanded={open}
                  aria-label={`${WEEKDAY_LONG[day]}: ${list.length ? list.map(range).join(', ') : 'nghỉ'}. Tuỳ chọn ngày`}
                  onClick={(e) => (open ? setPanel(null) : openPanel({ kind: 'day', day: i }, e.currentTarget))}
                >
                  <span className={styles.dayName}>
                    <span className={styles.dayLong}>{WEEKDAY_LONG[day]}</span>
                    <span className={styles.dayShort}>{WEEKDAY_SHORT[day]}</span>
                    <span className={styles.dayChevron} aria-hidden="true">
                      <Icon name="chevron-down" size={12} />
                    </span>
                  </span>
                  <span className={styles.dayCaption}>{list.length ? `${toHHMM(list[0].from)}–${toHHMM(list[list.length - 1].to)}` : 'Nghỉ'}</span>
                </button>
              )
            })}
          </div>

          <div className={styles.body} style={{ height: px(DAY_MIN) }}>
            <div className={styles.hoursCol}>
              {Array.from({ length: 25 }, (_, h) => (
                <span key={h} className={styles.hourLabel} style={{ top: px(h * 60) }}>
                  {toHHMM(h * 60)}
                </span>
              ))}
            </div>
            <div
              ref={gridRef}
              className={styles.grid}
              data-drag={drag?.moved ? drag.kind : undefined}
              style={{ backgroundSize: `100% ${ROW_H * 2}px` }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={finish}
              onPointerCancel={finish}
              onContextMenu={(e) => e.preventDefault()}
            >
              {shown.map((list, di) => {
                const day = WEEKDAYS[di]
                const dragHere = drag?.moved && drag.day === di ? drag : null
                return (
                  <div key={day} className={`${styles.col} ${di === todayIdx ? styles.colToday : ''} ${list.length ? '' : styles.colClosed}`}>
                    {list.map((p, idx) => {
                      const h = px(p.to - p.from)
                      const dragging = dragHere ? (dragHere.kind === 'draw' ? !week[di].includes(p) : dragHere.idx === idx) : false
                      const gap = list[idx + 1] ? { from: p.to, to: list[idx + 1].from } : null
                      const gh = gap ? px(gap.to - gap.from) : 0
                      return (
                        <Fragment key={idx}>
                          <div
                            role="button"
                            tabIndex={0}
                            data-shift=""
                            data-day={di}
                            data-idx={idx}
                            className={`${styles.shift} ${isActive('shift', di, idx) ? styles.shiftActive : ''} ${dragging ? styles.shiftDragging : ''}`}
                            style={{ top: px(p.from), height: h }}
                            aria-label={`${WEEKDAY_LONG[day]}, làm việc ${range(p)}. Enter để sửa, Delete để xoá`}
                            onKeyDown={(e) => onKey(e, 'shift', di, idx)}
                          >
                            <span className={styles.handle} data-edge="from" aria-hidden="true" />
                            {h >= 22 ? <span className={styles.shiftLabel}>{range(p)}</span> : null}
                            <span className={`${styles.handle} ${styles.handleBottom}`} data-edge="to" aria-hidden="true" />
                          </div>
                          {gap ? (
                            <div
                              role="button"
                              tabIndex={0}
                              data-gap=""
                              data-day={di}
                              data-idx={idx}
                              className={`${styles.gap} ${isActive('gap', di, idx) ? styles.gapActive : ''}`}
                              style={{ top: px(gap.from), height: gh }}
                              aria-label={`${WEEKDAY_LONG[day]}, nghỉ ${range(gap)}. Enter để sửa`}
                              onKeyDown={(e) => onKey(e, 'gap', di, idx)}
                            >
                              <Pattern name="arcs" />
                              {gh >= 22 ? (
                                <span className={styles.gapLabel}>
                                  <span className={styles.gapWord}>Nghỉ</span>
                                  {gh >= 38 ? <br /> : ' '}
                                  <span className={styles.gapTime}>{range(gap)}</span>
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </Fragment>
                      )
                    })}
                    {di === todayIdx ? <span className={styles.nowLine} style={{ top: px(nowMin) }} aria-hidden="true" /> : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {edges.up ? (
          <button type="button" className={`${styles.nudge} ${styles.nudgeTop}`} onClick={() => scrollTo(0)}>
            <Icon name="chevron-up" size={12} />
            Trước {toHHMM(edges.top)}
          </button>
        ) : null}
        {edges.down ? (
          <button type="button" className={`${styles.nudge} ${styles.nudgeBottom}`} onClick={() => scrollTo(DAY_MIN)}>
            <Icon name="chevron-down" size={12} />
            Sau {toHHMM(edges.bottom)}
          </button>
        ) : null}
      </div>

      {panel && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label={panelLabel(panel)}>
          {panel.kind === 'shift' ? (
            <ShiftPanel
              day={panel.day}
              p={week[panel.day][panel.idx]}
              prev={week[panel.day][panel.idx - 1]}
              next={week[panel.day][panel.idx + 1]}
              onChange={(patch) => setShift(panel.day, panel.idx, patch)}
              onSplit={() => splitShift(panel.day, panel.idx)}
              onRemove={() => removeShift(panel.day, panel.idx)}
            />
          ) : panel.kind === 'gap' ? (
            <GapPanel day={panel.day} a={week[panel.day][panel.idx]} b={week[panel.day][panel.idx + 1]} onChange={(patch) => setGap(panel.day, panel.idx, patch)} onClose={() => closeGap(panel.day, panel.idx)} />
          ) : (
            <DayPanel key={panel.day} day={panel.day} week={week} onOpen={(o) => setDayOpen(panel.day, o)} onAdd={() => addShift(panel.day)} onCopy={(to) => copyDay(panel.day, to)} />
          )}
        </AnchoredPopup>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------- the panels */

function ShiftPanel({ day, p, prev, next, onChange, onSplit, onRemove }: { day: number; p: Period | undefined; prev?: Period; next?: Period; onChange: (patch: Partial<Period>) => void; onSplit: () => void; onRemove: () => void }) {
  if (!p) return null
  return (
    <div className={styles.panel} data-panel="" tabIndex={-1}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Ca làm việc</span>
        <span className={styles.panelDay}>{WEEKDAY_LONG[WEEKDAYS[day]]}</span>
      </div>
      <div className={styles.panelTimes}>
        <TimeField compact label="Từ" min={toHHMM(prev?.to ?? 0)} max={toHHMM(p.to - MIN_LEN)} value={toHHMM(p.from)} onChange={(v) => onChange({ from: toMin(v) })} />
        <TimeField compact label="Đến" min={toHHMM(p.from + MIN_LEN)} max={toHHMM(next?.from ?? DAY_MIN)} value={toHHMM(p.to)} onChange={(v) => onChange({ to: toMin(v) })} />
      </div>
      <div className={styles.panelActions}>
        <button type="button" className={styles.panelBtn} onClick={onSplit}>
          Thêm giờ nghỉ
        </button>
        <button type="button" className={`${styles.panelBtn} ${styles.panelDanger}`} onClick={onRemove}>
          <Icon name="trash" size={14} />
          Xoá ca
        </button>
      </div>
    </div>
  )
}

function GapPanel({ day, a, b, onChange, onClose }: { day: number; a: Period | undefined; b: Period | undefined; onChange: (patch: Partial<Period>) => void; onClose: () => void }) {
  if (!a || !b) return null
  return (
    <div className={styles.panel} data-panel="" tabIndex={-1}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Giờ nghỉ</span>
        <span className={styles.panelDay}>{WEEKDAY_LONG[WEEKDAYS[day]]}</span>
      </div>
      <div className={styles.panelTimes}>
        <TimeField compact label="Từ" min={toHHMM(a.from + MIN_LEN)} max={toHHMM(b.from - MIN_LEN)} value={toHHMM(a.to)} onChange={(v) => onChange({ from: toMin(v) })} />
        <TimeField compact label="Đến" min={toHHMM(a.to + MIN_LEN)} max={toHHMM(b.to - MIN_LEN)} value={toHHMM(b.from)} onChange={(v) => onChange({ to: toMin(v) })} />
      </div>
      <div className={styles.panelActions}>
        <button type="button" className={styles.panelBtn} onClick={onClose}>
          Bỏ giờ nghỉ, làm liền một ca
        </button>
      </div>
    </div>
  )
}

function DayPanel({ day, week, onOpen, onAdd, onCopy }: { day: number; week: Week; onOpen: (open: boolean) => void; onAdd: () => void; onCopy: (to: number[]) => void }) {
  const [targets, setTargets] = useState<number[]>([])
  const list = week[day]
  const name = WEEKDAY_LONG[WEEKDAYS[day]]
  const others = WEEKDAYS.map((_, i) => i).filter((i) => i !== day)
  const all = targets.length === others.length
  return (
    <div className={styles.panel} data-panel="" tabIndex={-1}>
      <Switch label={name} hint={list.length ? list.map(range).join(' · ') : 'Nghỉ cả ngày'} checked={list.length > 0} onChange={onOpen} ariaLabel={`${name} mở cửa`} className={styles.dayOpen} />
      {list.length ? (
        <button type="button" className={styles.panelBtn} onClick={onAdd}>
          <Icon name="plus" size={14} />
          Thêm ca
        </button>
      ) : null}
      <div className={styles.copy}>
        <span className={styles.copyTitle}>{list.length ? `Sao chép giờ ${name} sang` : `Cho ngày khác nghỉ như ${name}`}</span>
        <div className={styles.copyDays} role="group" aria-label="Chọn ngày nhận">
          {others.map((i) => {
            const on = targets.includes(i)
            return (
              <button key={i} type="button" className={`${styles.copyDay} ${on ? styles.copyDayOn : ''}`} aria-pressed={on} onClick={() => setTargets((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]))}>
                {WEEKDAY_SHORT[WEEKDAYS[i]]}
              </button>
            )
          })}
        </div>
        <span className={styles.copyHint}>{targets.length ? (all ? 'Mọi ngày khác sẽ theo giờ này' : 'Bỏ chọn để áp dụng cho cả tuần') : 'Chọn ngày, hoặc áp dụng cho cả tuần'}</span>
        <button type="button" className={`${styles.panelBtn} ${styles.panelPrimary}`} onClick={() => onCopy(targets.length ? targets : others)}>
          {targets.length && !all ? `Áp dụng cho ${targets.length} ngày` : 'Áp dụng cho cả tuần'}
        </button>
      </div>
    </div>
  )
}
