import { useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
import { Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import { Switch } from './Choice'
import styles from './Rows.module.css'

/*
 * The list that reads before it edits, and the sentence under a control.
 *
 * `Dịch vụ` wrote both: a price row that shows what is worth reading — name,
 * other names, price, how long — and opens into its editor when pressed, and
 * the "Linh nói: …" line that turns the fields above it into the sentence a
 * caller would hear. `Bác sĩ` and `Câu hỏi` are the same shape, so both live
 * here rather than in three copies that would have drifted apart.
 *
 * Use a row when a record has a one-line summary worth scanning. Use an
 * `entry` (Địa điểm, Giờ mở cửa) when every field matters and there is
 * nothing to scan.
 */

/* ------------------------------------------------------------------ said */

/**
 * "Linh nói:" and the line she would say, built from the current draft.
 *
 * Plain text, no bubble, no play button: the try-out rail is where she is
 * *heard*; this is where the owner reads what a field turns into, before
 * pressing anything. `verb` is the one thing that changes — she *reads* a
 * week of opening hours and *says* a price.
 */
export function Said({ who, verb = 'nói', children }: { who: string; verb?: string; children: ReactNode }) {
  return (
    <p className={styles.said}>
      <span className={styles.saidWho}>
        {who} {verb}:
      </span>{' '}
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ list */

/**
 * The block a list of rows lives in. It spans its card's content width
 * exactly, and declares the `rows` container the row's own breakpoints
 * answer to — a list beside the try-out rail is narrower on a desktop than
 * the same list is on a tablet.
 */
export function RowList({
  grouped = false,
  dragging = false,
  className,
  ref,
  children,
}: {
  /** Rows sit inside group cards that stand apart, rather than in one continuous list. */
  grouped?: boolean
  dragging?: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
  children: ReactNode
}) {
  return (
    <div ref={ref} className={`${styles.rows} ${grouped ? styles.rowsGrouped : ''} ${dragging ? styles.rowsDragging : ''} ${className ?? ''}`}>
      {children}
    </div>
  )
}

/** How long a closed row keeps its editor mounted so the fold can play out — comfortably past the 200ms it takes. */
export const FOLD_MS = 400

/** The pointer handlers a draggable row's head takes; `Dịch vụ` is the only list that reorders. */
export interface RowDragHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
}

/**
 * One line of a list that opens into its editor.
 *
 * Closed, the row *reads*: the summary is the whole row, in fixed columns so
 * every value in the list sits on one vertical. Open, the same line stays as
 * the row's head — it keeps updating as the fields under it are typed into,
 * so the owner watches the list they are making — and the editor grows out
 * beneath it on the house lift-and-settle. Only one row on a page is open at
 * a time (the section owns `openId`), and a press anywhere else closes it:
 * twelve rows in edit mode at once was a hundred controls and nothing left
 * to read.
 *
 * `mounted` outlives `open` by one fold so the close can animate; the parent
 * owns both, because it is the parent that swaps one open row for another.
 */
export function ExpandRow({
  rowId,
  rowRef,
  group,
  open,
  mounted,
  unfilled,
  dragging,
  drag,
  onToggle,
  summary,
  children,
}: {
  rowId: string
  /** From `useAppear`: the row grows into place and collapses out of it. */
  rowRef?: Ref<HTMLDivElement>
  group?: string
  open: boolean
  mounted: boolean
  /** Missing the one thing that makes it useful — a price, an answer, a way to say the word. */
  unfilled?: boolean
  dragging?: boolean
  drag?: RowDragHandlers
  onToggle: () => void
  summary: ReactNode
  children: ReactNode
}) {
  // Clipping is only for the fold itself. Once the editor has settled it lets
  // go, or a focus ring on the first pill inside would be cut off. Reduced
  // motion never fires `transitionend`, so the stylesheet lifts the clip there.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!open) {
      setSettled(false)
      return
    }
    const t = window.setTimeout(() => setSettled(true), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [open])
  return (
    <div
      ref={rowRef}
      className={`${styles.row} ${open ? styles.rowOpen : ''} ${unfilled ? styles.rowUnfilled : ''} ${dragging ? styles.rowDragging : ''}`}
      data-row-id={rowId}
      data-group={group}
      data-flip={rowId}
      data-dragging={dragging ? 'true' : undefined}
    >
      <button type="button" className={styles.rowHead} aria-expanded={open} onClick={onToggle} {...drag}>
        {drag ? (
          <span className={styles.grip} aria-hidden="true">
            <Icon name="grip" size={12} />
          </span>
        ) : null}
        {summary}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          <Icon name="chevron-down" size={16} />
        </span>
      </button>
      <div
        className={`${styles.body} ${open ? styles.bodyOpen : ''} ${open && settled ? styles.bodySettled : ''}`}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && open) setSettled(true)
        }}
      >
        <div className={styles.bodyInner}>{mounted ? children : null}</div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- the summary */

/**
 * The left of a closed row: what it is called, then what else it is called,
 * quieter, on the same baseline. The second half is the first thing to go
 * when the list is narrow — a price or a week of days is worth more than an
 * alias.
 */
export function RowText({
  name,
  sub,
  placeholder,
  className,
}: {
  name: string
  /** Aliases, specialties, the answer she reads — whatever reads under the name. */
  sub?: ReactNode
  /** What stands in for a name that has not been typed yet. */
  placeholder?: ReactNode
  className?: string
}) {
  return (
    <span className={`${styles.text} ${className ?? ''}`}>
      <span className={styles.name}>{name.trim() || <span className={styles.placeholder}>{placeholder}</span>}</span>
      {sub ? <span className={styles.sub}>{sub}</span> : null}
    </span>
  )
}

/** The one column every row in a list shares — a price, a discount, a week. Right-aligned, on one vertical. */
export function RowValue({
  children,
  fixed = false,
  className,
}: {
  children: ReactNode
  /** The value is a set of marks, not text: hold its width rather than clipping the last one. */
  fixed?: boolean
  className?: string
}) {
  return <span className={`${styles.value} ${fixed ? styles.valueFixed : ''} ${className ?? ''}`}>{children}</span>
}

/** The quiet half of a value: "/ lần" after a price. */
export function RowUnit({ children }: { children: ReactNode }) {
  return <span className={styles.unit}> {children}</span>
}

/** What the row still needs, in the value's place: "chưa có giá", "chưa có câu trả lời". */
export function RowMissing({ children }: { children: ReactNode }) {
  return <span className={styles.missing}>{children}</span>
}

/** The far right of a row: a duration, a mark, a state pill. One width, whatever it holds. */
export function RowMeta({ children, tight = false, className }: { children: ReactNode; /** One mark and nothing else — takes only what it needs instead of the price list's column. */ tight?: boolean; className?: string }) {
  return <span className={`${styles.meta} ${tight ? styles.metaTight : ''} ${className ?? ''}`}>{children}</span>
}

/**
 * A drawn mark inside `RowMeta` — she may book this service herself, she may
 * be asked for this doctor by name. `name` is optional and the span keeps its
 * width without one: the mark is a column, and a row that lacks it must not
 * pull everything to its left across by 26px.
 */
export function RowMark({ name, title }: { name?: IconName | null; title?: string }) {
  return (
    <span className={styles.metaMark} title={title}>
      {name ? <Icon name={name} size={16} /> : null}
    </span>
  )
}

/* ----------------------------------------------------------- the editor */

/** The open row's fields, lined up with the row's text above them. */
export function RowEdit({ children }: { children: ReactNode }) {
  return <div className={styles.edit}>{children}</div>
}

/** Fields side by side, wrapping under 560px of list. */
export function RowEditRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.editRow} ${className ?? ''}`}>{children}</div>
}

/** A label for a control that does not draw its own — a chip input, a day picker. */
export function RowEditLabel({ children }: { children: ReactNode }) {
  return <span className={styles.editLabel}>{children}</span>
}

/**
 * A switch with its words beside it: the toggle first, so the two never
 * drift apart however long the hint runs.
 */
export function RowSwitch({
  checked,
  onChange,
  label,
  hint,
  ariaLabel,
  aligned = false,
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  hint?: ReactNode
  ariaLabel: string
  /** It shares a line with a field that draws its own label; take that label's height so the two sit level. */
  aligned?: boolean
  className?: string
}) {
  return (
    <div className={`${styles.editSwitch} ${aligned ? styles.editSwitchAligned : ''} ${className ?? ''}`}>
      <Switch checked={checked} onChange={onChange} ariaLabel={ariaLabel} />
      <span className={styles.editSwitchText}>
        <span className={styles.editSwitchLabel}>{label}</span>
        {hint ? <span className={styles.editSwitchHint}>{hint}</span> : null}
      </span>
    </div>
  )
}

/** The delete at the foot of an open row — right-aligned, pulled into the editor's padding. */
export function RowEditFoot({ children }: { children: ReactNode }) {
  return <div className={styles.editFoot}>{children}</div>
}

/** The layout classes a page needs directly: the group band, and the two editor widths. */
export const rowStyles = styles
