import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react'
import { Icon } from '../../design-system'
import { FieldFrame } from './Field'
import type { Gate } from './Card'
import field from './Field.module.css'
import styles from './Pickers.module.css'

/*
 * Dates and times, picked.
 *
 * The browser's own date and time pop-ups are the one piece of chrome on
 * these screens that is not ours — blue, boxy, and English ("AM", "PM", a
 * month-first date) on a page that is otherwise Vietnamese. These three
 * controls replace them: a month calendar for one date or a range, and a
 * time field that takes typing ("8h30", "8:30", "0830") and offers a list.
 *
 * Values stay what the catalogue stores — ISO dates ("2027-02-14") and
 * 24-hour clocks ("08:30") — and only the reading changes: `14/02/2027`,
 * `14/02 – 22/02/2027`, `08:30`. Every pop-up is portalled to the body and
 * positioned like SelectField's list, so a card that clips its overflow
 * cannot cut one off.
 */

/* ---------------------------------------------------------------- popups */

export interface Place {
  left: number
  top: number
  /** What the pop-up was placed at — its `size.width`, or less when it was allowed to shrink. */
  width: number
}

const GAP = 6
/* The pop-up's clearance from the window's edge: 8px above and below, 16px
   at the sides. Sideways is measured against the document's client width,
   not `innerWidth`, which counts the scrollbar — with it a panel "8px from
   the edge" sat under the scrollbar, touching it. */
const EDGE_Y = 8
const EDGE_X = 16

/*
 * Every open pop-up, oldest first. Pop-ups nest — a time list opens from
 * inside a holiday's panel — and a press has to be read against that
 * nesting rather than against the DOM, since all of them are portalled to
 * `<body>` and none contains another.
 *
 * The rule: a press closes a pop-up unless it landed inside that pop-up,
 * on its trigger, or inside one opened *from* it — anything later in this
 * list. So pressing the holiday panel closes the time list it opened while
 * the panel itself stays; pressing the page closes both. Escape takes the
 * top one only, which is the same rule read from the other end.
 */
interface Layer {
  panel: RefObject<HTMLElement | null>
  press: (target: Element) => boolean
  close: () => void
}

const layers: Layer[] = []

/**
 * One anchored, portalled pop-up: measures under (or over) the trigger, and
 * closes on an outside press, a scroll of the page, or Escape. See `layers`
 * above for what "outside" means once pop-ups start opening each other.
 */
export function useAnchoredPopup(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
  /**
   * `width` is what the pop-up wants; with `minWidth` it may give up some
   * of that to keep its left edge under the trigger's rather than being
   * pushed across the page — a pop-up near the right edge shrinks first
   * and moves second, and never below `minWidth`.
   */
  size: { width: number; height: number; minWidth?: number },
) {
  const [place, setPlace] = useState<Place | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Read by the layer, which is registered once per opening and must not be
  // torn down and rebuilt every time the caller passes a new `close`.
  const closeRef = useRef(close)
  closeRef.current = close

  useLayoutEffect(() => {
    if (!open) return
    const layer: Layer = {
      panel: panelRef,
      press: (t) => !!triggerRef.current?.contains(t) || !!panelRef.current?.contains(t),
      close: () => closeRef.current(),
    }
    layers.push(layer)
    return () => {
      const i = layers.indexOf(layer)
      if (i >= 0) layers.splice(i, 1)
    }
  }, [open, triggerRef])

  /*
   * Place it under the trigger, above it when it does not fit there, and in
   * every case fully inside the window. Being inside is not a nicety: a list
   * hanging off the bottom edge cannot be clicked at all, and the press lands
   * on the page behind instead — closing the very pop-up being reached into.
   *
   * The height used is the panel's *own*, read back once it is in the DOM.
   * `size` is only the guess for the very first pass, before there is a panel
   * to measure. Trusting that guess put a 55px panel through the maths for a
   * 150px one: it "did not fit" below when it would have, flipped above, and
   * hung there with the difference as a gap.
   */
  const measure = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const height = Math.min(panelRef.current?.offsetHeight || size.height, window.innerHeight - 2 * EDGE_Y)
    const under = r.bottom + GAP
    const over = r.top - GAP - height
    const fitsUnder = under + height <= window.innerHeight - EDGE_Y
    const top = !fitsUnder && over >= EDGE_Y ? over : Math.max(EDGE_Y, Math.min(under, window.innerHeight - EDGE_Y - height))
    const vw = document.documentElement.clientWidth
    const width = size.minWidth === undefined ? size.width : Math.max(size.minWidth, Math.min(size.width, vw - EDGE_X - r.left))
    const left = Math.max(EDGE_X, Math.min(r.left, vw - width - EDGE_X))
    // Same numbers means the same object, so the effect below settles instead
    // of re-running on an identity that changed but said nothing new.
    setPlace((prev) => (prev && prev.left === left && prev.top === top && prev.width === width ? prev : { left, top, width }))
  }, [triggerRef, size.width, size.height, size.minWidth])

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null)
      return
    }
    measure()
  }, [open, measure])

  /*
   * After every commit while it is open, place it again against what the
   * panel actually measures. This is the pass that matters: the first one
   * above ran before there was a panel to measure, and the holiday panel
   * more than doubles in height when "Mở một phần" adds two time fields —
   * grown into the window's edge, it has to be moved rather than left
   * hanging over it. `measure` returns the same `place` when the numbers
   * have not changed, so this settles instead of looping, and being a layout
   * effect it lands before the browser paints.
   */
  useLayoutEffect(() => {
    if (open && panelRef.current) measure()
  })

  /*
   * And for the size changes no render tells us about — a webfont landing,
   * text reflowing. Belt to the braces above, not a replacement for them:
   * `ResizeObserver` is driven by the rendering loop, so a hidden tab
   * delivers nothing at all.
   */
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!open || !el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, place, measure])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Element
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      // A press inside a pop-up this one opened is not a press outside it.
      const mine = layers.findIndex((l) => l.panel === panelRef)
      if (mine >= 0 && layers.slice(mine + 1).some((l) => l.press(t))) return
      close()
    }
    const onScroll = (e: Event) => {
      const t = e.target
      if (t instanceof Element && (panelRef.current?.contains(t) || t.closest('[data-popup]'))) return
      close()
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      // Escape peels one layer: the innermost pop-up, not all of them.
      if (e.key === 'Escape' && layers[layers.length - 1]?.panel === panelRef) close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', measure)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', measure)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, measure, triggerRef])

  return { place, panelRef }
}

/** The panel at `place`, as wide as it was placed — the hook's `size.width`, or what it shrank to. */
export function AnchoredPopup({ place, panelRef, children, label }: { place: Place; panelRef: RefObject<HTMLDivElement | null>; children: ReactNode; label?: string }) {
  return createPortal(
    <div ref={panelRef} data-popup="" role="dialog" aria-label={label} className={styles.popup} style={{ left: place.left, top: place.top, width: place.width }}>
      {children}
    </div>,
    document.body,
  )
}

/* ----------------------------------------------------------------- dates */

const pad = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dateOf = (iso: string) => new Date(`${iso}T00:00:00`)
const todayIso = () => isoOf(new Date())

/** "14/02/2027" */
export function fmtDMY(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** "14/02 – 22/02/2027", "14/02/2027", or "28/12/2026 – 02/01/2027" across a year end. */
export function fmtRange(from: string, to: string): string {
  if (!from) return ''
  if (!to || to === from) return fmtDMY(from)
  const [fy, fm, fd] = from.split('-')
  const [ty, tm, td] = to.split('-')
  return fy === ty ? `${fd}/${fm} – ${td}/${tm}/${ty}` : `${fmtDMY(from)} – ${fmtDMY(to)}`
}

/** "14/02" — the day and month alone. */
function fmtDM(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/**
 * The short reading, for a pill with no room for the year: "14–22/02" within
 * a month, "30/04–01/05" across one, "01/01" for a single day. A list of
 * upcoming dates says which year on its own; the calendar behind the pill
 * says it again for anyone who asks.
 */
export function fmtRangeShort(from: string, to: string): string {
  if (!from) return ''
  if (!to || to === from) return fmtDM(from)
  const [fy, fm, fd] = from.split('-')
  const [ty, tm, td] = to.split('-')
  return fy === ty && fm === tm ? `${fd}–${td}/${fm}` : `${fmtDM(from)}–${fmtDM(to)}`
}

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const DAY_HEADS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/**
 * One month, Monday first, six rows so the panel never changes height.
 * `from`/`to` are the picked range (equal for one date); `hover` is the day
 * under the pointer while the second end is still being chosen.
 */
function MonthGrid({
  month,
  onMonth,
  from,
  to,
  hover,
  min,
  onPick,
  onHover,
}: {
  month: Date
  onMonth: (m: Date) => void
  from: string
  to: string
  hover?: string | null
  min?: string
  onPick: (iso: string) => void
  onHover?: (iso: string | null) => void
}) {
  const y = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(y, m, 1)
  const lead = (first.getDay() + 6) % 7
  const start = new Date(y, m, 1 - lead)
  const today = todayIso()
  const lo = hover && hover < from ? hover : from
  const hi = hover && hover > from ? hover : to
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))

  return (
    <div className={styles.month} onPointerLeave={() => onHover?.(null)}>
      <div className={styles.monthHead}>
        <button type="button" className={styles.nav} aria-label="Tháng trước" onClick={() => onMonth(new Date(y, m - 1, 1))}>
          <Icon name="chevron-left" size={16} />
        </button>
        <span className={styles.monthName}>
          {MONTHS[m]}, {y}
        </span>
        <button type="button" className={styles.nav} aria-label="Tháng sau" onClick={() => onMonth(new Date(y, m + 1, 1))}>
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
      <div className={styles.dayHeads}>
        {DAY_HEADS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className={styles.dayGrid}>
        {cells.map((d) => {
          const iso = isoOf(d)
          const outside = d.getMonth() !== m
          const disabled = !!min && iso < min
          const isFrom = iso === lo
          const isTo = iso === hi
          const inside = lo && hi && iso > lo && iso < hi
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-label={fmtDMY(iso)}
              aria-pressed={isFrom || isTo}
              className={[
                styles.dayCell,
                outside ? styles.dayOutside : '',
                iso === today ? styles.dayToday : '',
                inside ? styles.dayInside : '',
                isFrom || isTo ? styles.dayEnd : '',
                isFrom && !isTo && hi !== lo ? styles.dayStart : '',
                isTo && !isFrom && hi !== lo ? styles.dayStop : '',
              ].join(' ')}
              onClick={() => onPick(iso)}
              onPointerEnter={() => onHover?.(iso)}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const CAL_W = 296
const CAL_H = 336

interface PickerFrameProps {
  label?: ReactNode
  gate?: Gate
  hint?: ReactNode
  error?: ReactNode
  style?: CSSProperties
  className?: string
  compact?: boolean
  /** A pill trigger, for a control that sits in a row rather than in a form. */
  pill?: boolean
  /** `short` drops the year from the reading — for a row too narrow to carry it. Only the reading changes. */
  reading?: 'full' | 'short'
  'aria-label'?: string
  id?: string
}

function Trigger({
  triggerRef,
  open,
  onToggle,
  compact,
  pill,
  error,
  icon,
  text,
  empty,
  id,
  ariaLabel,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>
  open: boolean
  onToggle: () => void
  compact?: boolean
  pill?: boolean
  error?: boolean
  icon: 'calendar' | 'hours'
  text: string
  empty: boolean
  id?: string
  ariaLabel?: string
}) {
  const cls = pill
    ? `${styles.pill} ${open ? styles.pillOpen : ''}`
    : `${field.control} ${field.trigger} ${error ? field.controlError : ''} ${compact ? field.compact : ''} ${open ? field.triggerOpen : ''}`
  return (
    <button ref={triggerRef} id={id} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel} className={cls} onClick={onToggle}>
      <span className={styles.triggerIcon}>
        <Icon name={icon} size={16} />
      </span>
      <span className={`${field.triggerText} ${styles.triggerNum} ${empty ? field.triggerEmpty : ''}`}>{text}</span>
      {pill ? (
        <span className={`${field.triggerChevron} ${open ? field.triggerChevronOpen : ''}`}>
          <Icon name="chevron-down" size={14} />
        </span>
      ) : null}
    </button>
  )
}

/** One ISO date. */
export function DateField({ value, onChange, min, placeholder = 'Chọn ngày', label, gate, hint, error, style, className, compact, pill, reading = 'full', id, 'aria-label': ariaLabel }: PickerFrameProps & { value: string; onChange: (iso: string) => void; min?: string; placeholder?: string }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => dateOf(value || todayIso()))
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const { place, panelRef } = useAnchoredPopup(triggerRef, open, close, { width: CAL_W, height: CAL_H })

  const toggle = () => {
    if (!open) setMonth(dateOf(value || todayIso()))
    setOpen((o) => !o)
  }

  return (
    <FieldFrame label={label} gate={gate} hint={hint} error={error} htmlFor={inputId} style={style} className={className} compact={compact}>
      <Trigger triggerRef={triggerRef} id={inputId} open={open} onToggle={toggle} compact={compact} pill={pill} error={!!error} icon="calendar" text={value ? (reading === 'short' ? fmtDM(value) : fmtDMY(value)) : placeholder} empty={!value} ariaLabel={ariaLabel} />
      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label={ariaLabel ?? 'Chọn ngày'}>
          <MonthGrid
            month={month}
            onMonth={setMonth}
            from={value}
            to={value}
            min={min}
            onPick={(iso) => {
              onChange(iso)
              setOpen(false)
              triggerRef.current?.focus()
            }}
          />
        </AnchoredPopup>
      ) : null}
    </FieldFrame>
  )
}

/** Two ISO dates, inclusive. Pick the first day, then the last; one day is a range of one. */
export function DateRangeField({ from, to, onChange, min, placeholder = 'Chọn ngày', label, gate, hint, error, style, className, compact, pill, reading = 'full', id, 'aria-label': ariaLabel }: PickerFrameProps & { from: string; to: string; onChange: (r: { from: string; to: string }) => void; min?: string; placeholder?: string }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => dateOf(from || todayIso()))
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    setPendingFrom(null)
  }, [])
  const { place, panelRef } = useAnchoredPopup(triggerRef, open, close, { width: CAL_W, height: CAL_H + 30 })

  const toggle = () => {
    if (!open) {
      setMonth(dateOf(from || todayIso()))
      setPendingFrom(null)
    }
    setOpen((o) => !o)
  }

  const pick = (iso: string) => {
    if (pendingFrom === null) {
      setPendingFrom(iso)
      return
    }
    const a = pendingFrom < iso ? pendingFrom : iso
    const b = pendingFrom < iso ? iso : pendingFrom
    onChange({ from: a, to: b })
    close()
    triggerRef.current?.focus()
  }

  const shownFrom = pendingFrom ?? from
  const shownTo = pendingFrom ?? to

  return (
    <FieldFrame label={label} gate={gate} hint={hint} error={error} htmlFor={inputId} style={style} className={className} compact={compact}>
      <Trigger triggerRef={triggerRef} id={inputId} open={open} onToggle={toggle} compact={compact} pill={pill} error={!!error} icon="calendar" text={from ? (reading === 'short' ? fmtRangeShort : fmtRange)(from, to) : placeholder} empty={!from} ariaLabel={ariaLabel} />
      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label={ariaLabel ?? 'Chọn khoảng ngày'}>
          <MonthGrid month={month} onMonth={setMonth} from={shownFrom} to={shownTo} hover={pendingFrom ? hover : null} min={min} onPick={pick} onHover={setHover} />
          <div className={styles.popupFoot}>{pendingFrom ? 'Chọn ngày cuối — hoặc chọn lại ngày đó nếu nghỉ một ngày' : 'Chọn ngày đầu'}</div>
        </AnchoredPopup>
      ) : null}
    </FieldFrame>
  )
}

/* ----------------------------------------------------------------- times */

const TIME_STEP = 15
const TIMES = Array.from({ length: (24 * 60) / TIME_STEP }, (_, i) => `${pad(Math.floor((i * TIME_STEP) / 60))}:${pad((i * TIME_STEP) % 60)}`)
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const TIME_W = 132
const TIME_H = 240

/** "8", "8h30", "8:30", "08.30", "0830", "8g" → "08:30" or null. */
export function parseTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null
  const m = /^(\d{1,2})(?:[:h.g](\d{1,2})?|(\d{2}))?$/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2] ?? m[3] ?? 0)
  if (h > 23 || mm > 59) return null
  return `${pad(h)}:${pad(mm)}`
}

/**
 * "08:30", typed or picked from a list of quarter hours.
 *
 * `min` / `max` bound the offered list, inclusive — the closing half of a
 * range offers nothing before the opening half, and vice versa, so the two
 * fields of a range cannot be put in the wrong order by picking. Typing is
 * left free: correcting a typo should not need the other field changed first.
 */
export function TimeField({ value, onChange, min, max, placeholder = '--:--', label, gate, hint, error, style, className, compact, id, 'aria-label': ariaLabel }: PickerFrameProps & { value: string; onChange: (hhmm: string) => void; min?: string; max?: string; placeholder?: string }) {
  const autoId = useId()
  const inputId = id ?? autoId
  // An empty window (min after max) would leave nothing to pick, which reads
  // as a broken control; offer the whole day and let the range be corrected.
  const all = TIMES.filter((t) => (!min || t >= min) && (!max || t <= max))
  const times = all.length ? all : TIMES
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value)
  const [active, setActive] = useState(0)
  // Read by the open-scroll effect, which must not re-run when `active` moves.
  const activeRef = useRef(0)
  const shellRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const { place, panelRef } = useAnchoredPopup(shellRef, open, close, { width: TIME_W, height: TIME_H })

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(value)
  }, [value])

  /*
   * Scrolling the list is done by hand, by setting its own scrollTop.
   *
   * Not `scrollIntoView`: that walks up every scrollable ancestor and fires
   * a scroll event outside this pop-up, which an enclosing panel reads as
   * "the page moved" and closes itself under the user's finger.
   *
   * And never as an effect on `active`. The list scrolls when it opens, and
   * a scroll drags a different row under a stationary pointer; if hovering
   * a row also set `active`, that scroll would feed the next one and the
   * list would run away to one end on its own. So `active` is the *keyboard*
   * cursor only — the mouse highlights rows with CSS `:hover` and moves
   * nothing — and arrow keys scroll from the key handler, not from here.
   */
  const scrollToRow = useCallback(
    (index: number, centre: boolean) => {
      const list = panelRef.current?.querySelector<HTMLElement>('[role="listbox"]')
      const row = list?.children[index] as HTMLElement | undefined
      if (!list || !row) return
      if (centre) {
        list.scrollTop = row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2
        return
      }
      if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop
      else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight
    },
    [panelRef],
  )

  // `place` is the dependency, not `open`: the list is not in the DOM until
  // the pop-up has been measured, so on `open` alone there is nothing to scroll.
  useEffect(() => {
    if (open && place) scrollToRow(activeRef.current, true)
  }, [open, place, scrollToRow])

  const nearest = (hhmm: string) => {
    const i = times.indexOf(hhmm)
    if (i >= 0) return i
    const target = toMinutes(hhmm)
    let best = 0
    for (let j = 1; j < times.length; j++) {
      if (Math.abs(toMinutes(times[j]) - target) < Math.abs(toMinutes(times[best]) - target)) best = j
    }
    return best
  }

  const goTo = (index: number) => {
    activeRef.current = index
    setActive(index)
  }

  const show = () => {
    goTo(nearest(value || '08:00'))
    setOpen(true)
  }

  const commitText = () => {
    const parsed = parseTime(text)
    if (parsed) {
      if (parsed !== value) onChange(parsed)
      setText(parsed)
    } else setText(value)
  }

  const pick = (hhmm: string) => {
    onChange(hhmm)
    setText(hhmm)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return show()
      const next = Math.max(0, Math.min(times.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)))
      goTo(next)
      scrollToRow(next, false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && parseTime(text) === value) pick(times[active])
      else {
        commitText()
        setOpen(false)
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <FieldFrame label={label} gate={gate} hint={hint} error={error} htmlFor={inputId} style={style} className={className} compact={compact}>
      <span ref={shellRef} className={`${field.control} ${error ? field.controlError : ''} ${compact ? field.compact : ''} ${open ? field.triggerOpen : ''}`}>
        <span className={styles.triggerIcon}>
          <Icon name="hours" size={16} />
        </span>
        <input
          ref={inputRef}
          id={inputId}
          className={`${field.input} ${field.numeric}`}
          value={text}
          placeholder={placeholder}
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onChange={(e) => setText(e.target.value)}
          onFocus={show}
          onClick={() => !open && show()}
          onBlur={commitText}
          onKeyDown={onKeyDown}
        />
      </span>
      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label={ariaLabel ?? 'Chọn giờ'}>
          <div className={styles.timeList} role="listbox">
            {times.map((t, i) => (
              <div
                key={t}
                role="option"
                aria-selected={t === value}
                data-active={i === active}
                className={`${field.option} ${styles.timeOption} ${i === active ? styles.timeActive : ''} ${t === value ? field.optionOn : ''}`}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(t)}
              >
                {t}
              </div>
            ))}
          </div>
        </AnchoredPopup>
      ) : null}
    </FieldFrame>
  )
}
