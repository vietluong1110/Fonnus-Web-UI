import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { WEEKDAYS, WEEKDAY_LONG, WEEKDAY_SHORT } from '../defaults'
import type { BreakPeriod, DayHours, Weekday } from '../model'
import { newId } from '../model'
import styles from './WeekPlanner.module.css'

/*
 * The week, painted.
 *
 * Seven columns, one per weekday, and half-hour rows from six in the morning
 * to ten at night (wider if the record says so). Pick a legend — "Làm việc"
 * or "Nghỉ" — and drag a rectangle across the days and hours it covers;
 * drag over what is already painted with the same legend to clear it. That
 * is the whole interaction, and it is the one every owner already knows
 * from a calendar app.
 *
 * The grid is *derived* from `operating_hours_by_weekday` and
 * `break_periods` on every render and written back on every release of the
 * pointer, so it is never a second copy of the record. Reading back: a day
 * is open from its first painted slot to its last; anything inside that span
 * which is not work is a break. Breaks with the same clock on every open day
 * collapse to one `days: []` row, which is what the catalogue means by it.
 *
 * A break is only ever painted over work — outside the open hours there is
 * nothing to break from — so painting "Nghỉ" onto an empty day says so
 * instead of silently doing nothing.
 */

export type PlannerMode = 'work' | 'break'
type Slot = 'off' | 'work' | 'break'

const STEP = 30
const ROW_H = 14
const EARLIEST = 6 * 60
const LATEST = 22 * 60

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const floorTo = (min: number) => Math.floor(min / STEP) * STEP
const ceilTo = (min: number) => Math.ceil(min / STEP) * STEP
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export interface PlannerValue {
  hours: DayHours[]
  breaks: BreakPeriod[]
}

function windowOf(v: PlannerValue): { start: number; end: number } {
  let start = EARLIEST
  let end = LATEST
  for (const r of v.hours) {
    if (!r.open) continue
    start = Math.min(start, floorTo(toMin(r.from)))
    end = Math.max(end, ceilTo(toMin(r.to)))
  }
  return { start: Math.max(0, start), end: Math.min(24 * 60, end) }
}

function toCells(v: PlannerValue, start: number, rows: number): Slot[][] {
  return WEEKDAYS.map((day) => {
    const cells: Slot[] = Array<Slot>(rows).fill('off')
    const row = v.hours.find((r) => r.day === day)
    if (!row || !row.open) return cells
    const f = toMin(row.from)
    const t = toMin(row.to)
    for (let i = 0; i < rows; i++) {
      const a = start + i * STEP
      if (a >= f && a < t) cells[i] = 'work'
    }
    for (const b of v.breaks) {
      if (b.days.length && !b.days.includes(day)) continue
      const bf = toMin(b.from)
      const bt = toMin(b.to)
      for (let i = 0; i < rows; i++) {
        const a = start + i * STEP
        if (a >= bf && a < bt && cells[i] === 'work') cells[i] = 'break'
      }
    }
    return cells
  })
}

function fromCells(cells: Slot[][], start: number, prev: PlannerValue): PlannerValue {
  const runs = new Map<string, Weekday[]>()
  const hours: DayHours[] = WEEKDAYS.map((day, di) => {
    const col = cells[di]
    const before = prev.hours.find((r) => r.day === day) ?? { day, open: false, from: '08:00', to: '17:00' }
    // The open span runs from the first work slot to the last: a break has
    // nothing to interrupt at either edge, so one left there is dropped.
    const first = col.indexOf('work')
    if (first < 0) return { ...before, open: false }
    const last = col.lastIndexOf('work')
    // Every non-work slot inside the open span is a break, painted or not.
    let runFrom: number | null = null
    for (let i = first; i <= last + 1; i++) {
      const gap = i <= last && col[i] !== 'work'
      if (gap && runFrom === null) runFrom = i
      if (!gap && runFrom !== null) {
        const key = `${toHHMM(start + runFrom * STEP)}-${toHHMM(start + i * STEP)}`
        runs.set(key, [...(runs.get(key) ?? []), day])
        runFrom = null
      }
    }
    return { ...before, open: true, from: toHHMM(start + first * STEP), to: toHHMM(start + (last + 1) * STEP) }
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

interface Drag {
  mode: PlannerMode
  erase: boolean
  d0: number
  r0: number
  d1: number
  r1: number
}

const rect = (d: Drag) => ({
  dMin: Math.min(d.d0, d.d1),
  dMax: Math.max(d.d0, d.d1),
  rMin: Math.min(d.r0, d.r1),
  rMax: Math.max(d.r0, d.r1),
})

export function WeekPlanner({ value, onChange, now, agent }: { value: PlannerValue; onChange: (next: PlannerValue) => void; now: Date; agent: string }) {
  const [mode, setMode] = useState<PlannerMode>('work')
  const [drag, setDrag] = useState<Drag | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const { start, end } = windowOf(value)
  const rows = (end - start) / STEP
  const cells = toCells(value, start, rows)

  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 3500)
    return () => window.clearTimeout(t)
  }, [note])

  const locate = (e: ReactPointerEvent) => {
    const el = gridRef.current
    if (!el) return null
    const box = el.getBoundingClientRect()
    const d = clamp(Math.floor(((e.clientX - box.left) / box.width) * 7), 0, 6)
    const r = clamp(Math.floor((e.clientY - box.top) / ROW_H), 0, rows - 1)
    return { d, r }
  }

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const at = locate(e)
    if (!at) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ mode, erase: cells[at.d][at.r] === mode, d0: at.d, r0: at.r, d1: at.d, r1: at.r })
  }

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const at = locate(e)
    if (!at || (at.d === drag.d1 && at.r === drag.r1)) return
    setDrag({ ...drag, d1: at.d, r1: at.r })
  }

  const onUp = () => {
    if (!drag) return
    const { dMin, dMax, rMin, rMax } = rect(drag)
    const next = cells.map((c) => c.slice())
    let touched = 0
    for (let d = dMin; d <= dMax; d++) {
      for (let r = rMin; r <= rMax; r++) {
        const cur = next[d][r]
        if (drag.erase) {
          if (cur === drag.mode) {
            next[d][r] = drag.mode === 'break' ? 'work' : 'off'
            touched++
          }
        } else if (drag.mode === 'work') {
          if (cur !== 'work') touched++
          next[d][r] = 'work'
        } else if (cur === 'work') {
          next[d][r] = 'break'
          touched++
        }
      }
    }
    setDrag(null)
    if (!touched && drag.mode === 'break' && !drag.erase) {
      setNote('Tô giờ làm việc trước, rồi tô giờ nghỉ bên trong.')
      return
    }
    if (touched) onChange(fromCells(next, start, value))
  }

  const copyMonday = () => {
    const next = cells.map((c, i) => (i >= 1 && i <= 5 ? cells[0].slice() : c.slice()))
    onChange(fromCells(next, start, value))
  }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todayIdx = WEEKDAYS.indexOf(now.getDay() as Weekday)
  const nowTop = nowMin >= start && nowMin <= end ? ((nowMin - start) / STEP) * ROW_H : null
  const pending = drag ? rect(drag) : null

  return (
    <div className={styles.planner}>
      <div className={styles.legend} role="group" aria-label="Chọn kiểu giờ để tô">
        {(
          [
            ['work', 'Làm việc', `${agent} nhận hẹn và trả lời khách`],
            ['break', 'Nghỉ', `${agent} báo khách gọi lại sau`],
          ] as const
        ).map(([m, label, hint]) => (
          <button key={m} type="button" className={`${styles.key} ${styles[m]} ${mode === m ? styles.keyOn : ''}`} aria-pressed={mode === m} title={hint} onClick={() => setMode(m)}>
            <span className={styles.swatch} aria-hidden="true" />
            {label}
          </button>
        ))}
        <span className={`${styles.legendHint} ${note ? styles.legendNote : ''}`} aria-live="polite">
          {note ?? 'Chọn rồi kéo trên lịch để tô · kéo lại lên vùng đã tô để xoá'}
        </span>
      </div>

      <div className={styles.sheet}>
        <div className={styles.corner} />
        <div className={styles.days}>
          {WEEKDAYS.map((day, i) => (
            <span key={day} className={`${styles.dayHead} ${i === todayIdx ? styles.dayToday : ''}`}>
              <span className={styles.dayLong}>{WEEKDAY_LONG[day]}</span>
              <span className={styles.dayShort}>{WEEKDAY_SHORT[day]}</span>
            </span>
          ))}
        </div>
        <div className={styles.hoursCol} style={{ height: rows * ROW_H }}>
          {Array.from({ length: (end - start) / 60 + 1 }, (_, i) => (
            <span key={i} className={styles.hourLabel} style={{ top: i * 2 * ROW_H }}>
              {toHHMM(start + i * 60)}
            </span>
          ))}
        </div>
        <div
          ref={gridRef}
          className={`${styles.grid} ${drag ? styles.gridDragging : ''}`}
          style={{ height: rows * ROW_H, backgroundSize: `100% ${ROW_H * 2}px` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setDrag(null)}
        >
          {cells.map((col, di) => (
            <div key={WEEKDAYS[di]} className={`${styles.col} ${di === todayIdx ? styles.colToday : ''}`}>
              {runsOf(col).map((run) => {
                const from = toHHMM(start + run.from * STEP)
                const to = toHHMM(start + run.to * STEP)
                const h = (run.to - run.from) * ROW_H
                return (
                  <div
                    key={run.from}
                    className={`${styles.block} ${run.slot === 'work' ? styles.blockWork : styles.blockBreak}`}
                    style={{ top: run.from * ROW_H, height: h }}
                    title={`${run.slot === 'work' ? 'Làm việc' : 'Nghỉ'} ${from}–${to}`}
                  >
                    {run.slot === 'break' && h >= 26 ? <span className={styles.blockLabel}>Nghỉ</span> : null}
                    {(run.slot === 'work' && h >= 26) || (run.slot === 'break' && h >= 40) ? (
                      <span className={styles.blockLabel}>
                        {from}–{to}
                      </span>
                    ) : null}
                  </div>
                )
              })}
              {nowTop !== null && di === todayIdx ? <span className={styles.nowLine} style={{ top: nowTop }} aria-hidden="true" /> : null}
            </div>
          ))}
          {pending ? (
            <div
              className={`${styles.pending} ${drag!.erase ? styles.pendingErase : drag!.mode === 'work' ? styles.pendingWork : styles.pendingBreak}`}
              style={{
                left: `${(pending.dMin / 7) * 100}%`,
                width: `${((pending.dMax - pending.dMin + 1) / 7) * 100}%`,
                top: pending.rMin * ROW_H,
                height: (pending.rMax - pending.rMin + 1) * ROW_H,
              }}
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>

      <div className={styles.foot}>
        <button type="button" className={styles.footLink} onClick={copyMonday}>
          Áp dụng Thứ Hai cho Thứ Ba đến Thứ Bảy
        </button>
      </div>
    </div>
  )
}

function runsOf(col: Slot[]): { slot: Slot; from: number; to: number }[] {
  const out: { slot: Slot; from: number; to: number }[] = []
  let i = 0
  while (i < col.length) {
    const slot = col[i]
    let j = i
    while (j < col.length && col[j] === slot) j++
    if (slot !== 'off') out.push({ slot, from: i, to: j })
    i = j
  }
  return out
}
