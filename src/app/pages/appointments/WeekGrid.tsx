import { useEffect, useRef } from 'react'
import type { CSSProperties, MutableRefObject } from 'react'
import type { Appointment } from '../../../api'
import type { ReceptionistConfig, Weekday } from '../../letan/model'
import { WEEKDAY, WEEKDAY_SHORT, dayIndex, hm, hmOfMinutes, isoDate, lookOf, minutesOf, sameDay, statusLabel } from './labels'
import styles from './Appointments.module.css'

/*
 * The week, drawn the way the hours planner on Giờ mở cửa draws it: hour lines
 * only, the time before opening and after closing quieter, a break hatched, a
 * shut day hatched all the way down. An appointment is a block whose length is
 * its duration. Two at the same time — two doctors — sit side by side, never on
 * top of each other.
 *
 * It draws; it does not decide. Which days, which appointments and which one
 * is open all come from the page.
 */

interface Props {
  days: Date[]
  appointments: Appointment[]
  config: ReceptionistConfig
  now: Date
  agent: string
  openId: string | null
  /** The block the open appointment belongs to, for the popover to stand beside. */
  anchorRef: MutableRefObject<HTMLElement | null>
  /** Scroll this appointment into view, then say so. */
  revealId: string | null
  onRevealed: (id: string) => void
  onPick: (a: Appointment, el: HTMLElement) => void
  /** Pressing a day's head. Omitted where the head is not drawn. */
  onDay?: (d: Date) => void
  hourPx: number
  gutter: number
  showHead: boolean
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

interface DayPlan {
  open: boolean
  /** A holiday's name, or empty. */
  label: string
  from: number
  to: number
  breaks: [number, number][]
}

/** The clinic's day on one date: its hours, its breaks, and the holiday that changes them. */
function dayPlan(cfg: ReceptionistConfig, d: Date): DayPlan {
  const day = isoDate(d)
  const holiday = cfg.holiday_exceptions.find((h) => h.date_from <= day && day <= h.date_to)
  if (holiday?.closure_type === 'closed') return { open: false, label: holiday.holiday_label || 'Nghỉ', from: 0, to: 0, breaks: [] }
  const wd = d.getDay() as Weekday
  const hours = cfg.operating_hours_by_weekday.find((h) => h.day === wd)
  const modified = holiday?.closure_type === 'modified' ? holiday.modified_hours : null
  const from = modified ? toMin(modified.from) : hours?.open ? toMin(hours.from) : 0
  const to = modified ? toMin(modified.to) : hours?.open ? toMin(hours.to) : 0
  const open = to > from
  const breaks = open
    ? cfg.break_periods
        .filter((b) => !b.days.length || b.days.includes(wd))
        .map((b): [number, number] => [toMin(b.from), toMin(b.to)])
        .filter(([a, b]) => b > a && a >= from && b <= to)
    : []
  return { open, label: holiday?.holiday_label ?? '', from, to, breaks }
}

/** Side-by-side lanes for appointments that overlap, per cluster of overlaps. */
function lanes(list: Appointment[]): { a: Appointment; lane: number; lanes: number }[] {
  const out: { a: Appointment; lane: number; lanes: number }[] = []
  let cluster: typeof out = []
  let ends: number[] = []
  let clusterEnd = -1
  const flush = () => {
    cluster.forEach((x) => (x.lanes = ends.length))
    cluster = []
    ends = []
  }
  for (const a of [...list].sort((x, y) => x.starts_at.localeCompare(y.starts_at))) {
    const s = new Date(a.starts_at).getTime()
    const e = s + a.duration_min * 60_000
    if (cluster.length && s >= clusterEnd) flush()
    let lane = ends.findIndex((end) => end <= s)
    if (lane < 0) {
      lane = ends.length
      ends.push(0)
    }
    ends[lane] = e
    const item = { a, lane, lanes: 1 }
    cluster.push(item)
    out.push(item)
    clusterEnd = Math.max(clusterEnd, e)
  }
  flush()
  return out
}

const breakLabel = ([from]: [number, number]) => (from >= 660 && from <= 840 ? 'Nghỉ trưa' : 'Nghỉ')

export function WeekGrid({ days, appointments, config, now, agent, openId, anchorRef, revealId, onRevealed, onPick, onDay, hourPx, gutter, showHead }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const plans = days.map((d) => dayPlan(config, d))
  const onDays = appointments.filter((a) => days.some((d) => sameDay(new Date(a.starts_at), d)))

  /*
   * The window: an hour before the earliest opening to the latest closing,
   * stretched to any appointment outside it — a booking at 20:30 must not fall
   * off the bottom of a clinic that closes at 20:00.
   */
  const opens = plans.filter((p) => p.open)
  let startMin = opens.length ? Math.min(...opens.map((p) => p.from)) : 8 * 60
  let endMin = opens.length ? Math.max(...opens.map((p) => p.to)) : 20 * 60
  for (const a of onDays) {
    const s = minutesOf(new Date(a.starts_at))
    startMin = Math.min(startMin, s)
    endMin = Math.max(endMin, s + a.duration_min)
  }
  const h0 = Math.max(0, Math.floor(startMin / 60) - 1)
  const h1 = Math.min(24, Math.ceil(endMin / 60))
  const y = (m: number) => ((m - h0 * 60) / 60) * hourPx
  const height = (h1 - h0) * hourPx

  const nowMin = minutesOf(now)
  const todayAt = days.findIndex((d) => sameDay(d, now))
  const nowShown = todayAt >= 0 && nowMin >= h0 * 60 && nowMin <= h1 * 60

  // Open on the part of the day that matters: the current hour when today is
  // on screen, the top otherwise. By scrollTop, never scrollIntoView (CLAUDE.md).
  const daysKey = days.map(isoDate).join()
  useEffect(() => {
    const box = scrollRef.current
    if (!box || box.scrollHeight <= box.clientHeight) return
    box.scrollTop = nowShown ? Math.max(0, y(nowMin) - box.clientHeight / 3) : 0
    // Only when the days change — not every minute the now line moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey])

  useEffect(() => {
    if (!revealId) return
    const box = scrollRef.current
    const el = box?.querySelector<HTMLElement>(`[data-apt="${CSS.escape(revealId)}"]`)
    if (!box || !el) return
    if (box.scrollHeight > box.clientHeight) {
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
      if (top < box.scrollTop + 60 || top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = Math.max(0, top - 96)
    }
    // After the scroll has landed: the popover closes on a scroll, so it must open after it.
    const t = window.setTimeout(() => onRevealed(revealId), 90)
    return () => window.clearTimeout(t)
  }, [revealId, appointments, onRevealed])

  const firstBreakCol = plans.findIndex((p) => p.breaks.length > 0)
  const hours: number[] = []
  for (let h = h0 + 1; h < h1; h++) hours.push(h)

  return (
    <div className={styles.gridCard} style={{ '--hour': `${hourPx}px` } as CSSProperties}>
      <div ref={scrollRef} className={styles.gScroll}>
        {showHead ? (
          <div className={styles.gHead} style={{ gridTemplateColumns: `${gutter}px repeat(${days.length}, minmax(0, 1fr))` }}>
            <span />
            {days.map((d, i) => {
              const booked = onDays.filter((a) => sameDay(new Date(a.starts_at), d) && a.status !== 'cancelled').length
              const plan = plans[i]
              const caption = !plan.open ? plan.label || 'Nghỉ' : booked ? `${booked} lịch` : plan.label || 'Trống'
              const cls = `${styles.colHead} ${sameDay(d, now) ? styles.colHeadToday : ''} ${onDay ? '' : styles.colHeadStatic}`
              const inner = (
                <>
                  <span className={styles.chTop}>
                    <span className={styles.chDow}>{days.length > 1 ? WEEKDAY[dayIndex(d)] : `${WEEKDAY[dayIndex(d)]}`}</span>
                    <span className={styles.chDate}>{String(d.getDate()).padStart(2, '0')}</span>
                  </span>
                  <span className={styles.chCap}>{caption}</span>
                </>
              )
              return onDay ? (
                <button key={isoDate(d)} type="button" className={cls} onClick={() => onDay(d)} title={`Xem riêng ${WEEKDAY[dayIndex(d)].toLowerCase()}`}>
                  {inner}
                </button>
              ) : (
                <div key={isoDate(d)} className={cls}>
                  {inner}
                </div>
              )
            })}
          </div>
        ) : null}

        <div className={styles.gBody} style={{ gridTemplateColumns: `${gutter}px minmax(0, 1fr)`, height }}>
          <div className={styles.gHours} aria-hidden="true">
            {hours.map((h) => (
              <span key={h} className={styles.hourLabel} style={{ top: y(h * 60) }}>
                {hmOfMinutes(h * 60)}
              </span>
            ))}
            {nowShown ? (
              <span className={styles.nowLabel} style={{ top: y(nowMin) }}>
                {hm(now)}
              </span>
            ) : null}
          </div>

          <div className={styles.gCols} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((d, i) => {
              const plan = plans[i]
              const today = sameDay(d, now)
              const mine = onDays.filter((a) => sameDay(new Date(a.starts_at), d))
              return (
                <div key={isoDate(d)} className={`${styles.col} ${today ? styles.colToday : ''} ${plan.open ? '' : styles.colClosed}`}>
                  {plan.open ? (
                    <>
                      <div className={styles.off} style={{ top: 0, height: Math.max(0, y(plan.from)) }} />
                      <div className={styles.off} style={{ top: y(plan.to), height: Math.max(0, height - y(plan.to)) }} />
                      {plan.breaks.map((b, k) => (
                        <div key={k} className={styles.brk} style={{ top: y(b[0]), height: y(b[1]) - y(b[0]) }}>
                          {/* One worked example, not one per column (ui-ux-principles §7). */}
                          {i === firstBreakCol && k === 0 ? <span className={styles.brkLabel}>{breakLabel(b)}</span> : null}
                        </div>
                      ))}
                    </>
                  ) : null}

                  {lanes(mine).map(({ a, lane, lanes: of }, k) => {
                    const start = new Date(a.starts_at)
                    const h = Math.max((a.duration_min / 60) * hourPx - 3, 20)
                    const look = lookOf(a)
                    const size = h < 30 ? styles.bXs : h < 50 ? styles.bSm : ''
                    const state =
                      look ? styles.bLook : a.status === 'arrived' ? styles.bArrived : a.status === 'no_show' ? styles.bNoShow : a.status === 'cancelled' ? styles.bCancelled : ''
                    return (
                      <button
                        key={a.id}
                        type="button"
                        data-apt={a.id}
                        ref={
                          a.id === openId
                            ? (el) => {
                                if (el) anchorRef.current = el
                              }
                            : undefined
                        }
                        className={`${styles.blk} ${size} ${state} ${of > 1 ? styles.bNarrow : ''} ${a.id === openId ? styles.bOpen : ''}`}
                        style={{
                          top: y(minutesOf(start)) + 1,
                          height: h,
                          left: `calc(${(lane / of) * 100}% + 3px)`,
                          width: `calc(${100 / of}% - 6px)`,
                          animationDelay: `${Math.min(k * 30 + (days.length > 1 ? i * 25 : 0), 260)}ms`,
                        }}
                        aria-label={`${hm(start)}, ${a.patient_name}, ${a.service_name}, ${statusLabel(a, agent)}`}
                        aria-expanded={a.id === openId}
                        onClick={(e) => onPick(a, e.currentTarget)}
                      >
                        <span className={styles.bLine}>
                          <span className={styles.bTime}>{hm(start)}</span>
                          <span className={styles.bName}>{a.patient_name}</span>
                          {look ? <span className={styles.needDot} /> : null}
                        </span>
                        <span className={styles.bSvc}>{a.service_name}</span>
                        {a.practitioner ? <span className={styles.bDoc}>{a.practitioner.name}</span> : null}
                      </button>
                    )
                  })}

                  {today && nowShown ? (
                    <div className={styles.nowLine} style={{ top: y(nowMin) }} aria-hidden="true">
                      <span className={styles.nowDot} />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* For a screen reader, the week as a list: the grid's position carries nothing it can hear. */}
      <ul className="visually-hidden" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {onDays.map((a) => {
          const s = new Date(a.starts_at)
          return (
            <li key={a.id}>
              {WEEKDAY_SHORT[dayIndex(s)]} {hm(s)} — {a.patient_name}, {a.service_name}, {statusLabel(a, agent)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
