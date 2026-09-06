import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../design-system'
import { AddButton, AnchoredPopup, DeleteButton, TimeField, useAnchoredPopup } from '../ui'
import { WEEKDAYS, WEEKDAY_LONG, WEEKDAY_SHORT } from './defaults'
import type { Weekday } from './model'
import styles from './Week.module.css'

/*
 * The week: which days, and which blocks of time inside them.
 *
 * Two pages ask the same question of the same clinic — "when is this person
 * here" on Bác sĩ, "when may Linh give a slot away" on Đặt lịch hẹn — so they
 * are one control rather than two that would drift. Bác sĩ wrote it; this is
 * where it lives now.
 *
 * The decision underneath: **a ticked day with no block keeps the clinic's own
 * hours.** Only exceptions get written down, so a normal week costs no typing,
 * and nothing here goes stale the day the clinic changes its opening time.
 */

/** One block of time on one weekday. `PractitionerShift` is this shape. */
export interface TimeBlock {
  id: string
  day: Weekday
  from: string
  to: string
}

/** "13:30" → 810, so a block can be placed relative to the one before it. */
export const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/** Back to "13:30", never past the end of the day — `TimeField` only offers real times. */
export const clock = (mins: number) => {
  const m = Math.max(0, Math.min(23 * 60 + 45, mins))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * The blocks on one day, in order. Both callers keep one flat list rather than
 * a list per day, because a block belongs to a week and not to a row.
 */
export function blocksOn(blocks: TimeBlock[], day: Weekday): TimeBlock[] {
  return blocks.filter((b) => b.day === day).sort((a, b) => a.from.localeCompare(b.from))
}

/**
 * Where a new block starts: after the last one, with a lunch break between.
 * Starting it exactly where the previous block finished produced "08:00 đến
 * 12:00 và 12:00 đến 18:00", which is one block written twice and reads as a
 * mistake in her own sentence.
 */
export function nextBlock(last: TimeBlock | undefined, fallback: { from: string; to: string }): { from: string; to: string } {
  if (!last) return fallback
  const from = clock(minutes(last.to) + 90)
  return { from, to: clock(minutes(from) + 240) }
}

/* -------------------------------------------------------------- the days */

/**
 * The seven days as pressable cells. `off` days are the ones the clinic
 * itself is shut: drawn dashed and not pressable, rather than explained in a
 * sentence — the card's own line says where opening hours are changed.
 */
export function WeekdayPicker({
  value,
  onChange,
  ariaLabel,
  off = [],
  offTitle,
}: {
  value: Weekday[]
  onChange: (v: Weekday[]) => void
  ariaLabel: string
  off?: Weekday[]
  offTitle?: string
}) {
  return (
    <div className={styles.days} role="group" aria-label={ariaLabel}>
      {WEEKDAYS.map((d) => {
        const shut = off.includes(d)
        const on = !shut && value.includes(d)
        return (
          <button
            key={d}
            type="button"
            className={`${styles.day} ${on ? styles.dayOn : ''} ${shut ? styles.dayOff : ''}`}
            aria-pressed={on}
            disabled={shut}
            title={shut ? offTitle : WEEKDAY_LONG[d]}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)))}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ the blocks */

/**
 * One block of time, as a pill that opens its two ends.
 *
 * The same idiom as a holiday's `ClosurePill` on Giờ mở cửa: the two time
 * fields live inside an anchored panel, so a day stays one line however many
 * blocks it carries, and a time list opening inside the panel does not take
 * the panel down with it. The delete lives in the panel too — a row of pills
 * each wearing its own cross reads as chrome, not as a schedule.
 */
export function ShiftPill({
  block,
  problem,
  onChange,
  onRemove,
}: {
  block: TimeBlock
  /** What is wrong with these two times, if anything — carried on the edge and said inside the panel. */
  problem?: string | null
  onChange: (patch: Partial<TimeBlock>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const { place, panelRef } = useAnchoredPopup(triggerRef, open, close, { width: 268, height: problem ? 204 : 168, minWidth: 244 })

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.shiftPill} ${open ? styles.shiftPillOpen : ''} ${problem ? styles.shiftPillBad : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={problem ?? undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {block.from}–{block.to}
        <span className={styles.shiftChevron}>
          <Icon name="chevron-down" size={13} />
        </span>
      </button>
      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label="Khung giờ">
          <div className={styles.shiftPanel}>
            <div className={styles.shiftTimes}>
              <TimeField compact label="Từ" max={block.to} value={block.from} onChange={(v) => onChange({ from: v })} />
              <TimeField compact label="Đến" min={block.from} value={block.to} onChange={(v) => onChange({ to: v })} />
            </div>
            {problem ? <span className={styles.shiftNote}>{problem}</span> : null}
            <div className={styles.shiftFoot}>
              <DeleteButton
                label="Xoá khung giờ"
                onClick={() => {
                  setOpen(false)
                  onRemove()
                }}
              />
            </div>
          </div>
        </AnchoredPopup>
      ) : null}
    </>
  )
}

/**
 * The list of days, one line each: the day, its blocks — or the line saying it
 * keeps the clinic's hours — and the way to add one more.
 *
 * `days` is what the page decided is in scope: the days a doctor ticked, the
 * days the clinic takes bookings. A page with none of them says so in its own
 * words rather than borrowing one from the control.
 */
export function DayBlocks({
  days,
  blocks,
  inherit,
  problem,
  addLabel = 'khung giờ',
  onEdit,
  onRemove,
  onAdd,
}: {
  days: Weekday[]
  blocks: TimeBlock[]
  /** What a day with no block of its own says. It is a default, so it is said, not drawn. */
  inherit: (day: Weekday) => ReactNode
  problem?: (block: TimeBlock) => string | null
  addLabel?: string
  onEdit: (id: string, patch: Partial<TimeBlock>) => void
  onRemove: (id: string) => void
  onAdd: (day: Weekday) => void
}) {
  return (
    <div className={styles.sched}>
      {days.map((d) => {
        const mine = blocksOn(blocks, d)
        return (
          <div key={d} className={styles.schedDay}>
            <span className={styles.schedName}>{WEEKDAY_LONG[d]}</span>
            <span className={styles.schedBlocks}>
              {mine.length ? (
                mine.map((b) => <ShiftPill key={b.id} block={b} problem={problem?.(b)} onChange={(patch) => onEdit(b.id, patch)} onRemove={() => onRemove(b.id)} />)
              ) : (
                <span className={styles.schedInherit}>{inherit(d)}</span>
              )}
            </span>
            <span className={styles.schedAdd}>
              <AddButton band label={addLabel} onClick={() => onAdd(d)} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const weekStyles = styles
