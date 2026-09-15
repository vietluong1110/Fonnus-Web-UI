import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, Icon, Shape } from '../../../design-system'
import { api, isApiError, isCanceled, messageFor } from '../../../api'
import type { Appointment, AppointmentAction, AppointmentsWeek } from '../../../api'
import { appHref } from '../../../hooks/useRoute'
import { PHONE_BREAKPOINT, useIsNarrow } from '../../../hooks/useIsNarrow'
import { ContentSkeleton, RetryCard } from '../../Boot'
import { AnchoredPopup, ChipButton, EmptyState, Segmented, ui, useAnchoredPopup, useToast } from '../../ui'
import { useConfig } from '../../letan/store'
import { markSummaryStale } from '../../summary'
import { AppointmentDetail } from './AppointmentDetail'
import { CalendarConnect } from './CalendarConnect'
import { WeekGrid } from './WeekGrid'
import {
  WEEKDAY,
  WEEKDAY_SHORT,
  actionToast,
  addDays,
  dayIndex,
  dm,
  hm,
  isoDate,
  lookChip,
  lookOf,
  sameDay,
  startOfDay,
  startOfWeek,
  weekRange,
} from './labels'
import styles from './Appointments.module.css'

/*
 * `#/app/lich-hen` — Lịch hẹn.
 *
 * The appointments the receptionist booked, on a week the owner already knows
 * how to read. Direction A of the September 2026 canvas ("Lưới tuần"): a week of
 * time, blocks as long as the appointment, a now line, and the appointment itself
 * one press away — beside its block on a desktop, a drawer on a tablet, a sheet
 * on a phone, where the week becomes one day under a seven-day strip.
 *
 * Above it, the three things she cannot close alone, pulled from every week at
 * once so a request for next Thursday is not hidden behind this one.
 *
 * Like Tổng quan it calls `api.appointments` directly: nothing outside this
 * page reads the result (CLAUDE.md).
 */

/** At this width and above, an appointment opens beside its block. */
const WIDE = 1100

type View = 'day' | 'week'
const VIEWS: { value: View; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
]

/** The clock, a minute at a time — for the now line and "đã bắt đầu". */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

const inWeek = (a: Appointment, monday: Date) => {
  const t = new Date(a.starts_at).getTime()
  return t >= monday.getTime() && t < addDays(monday, 7).getTime()
}

/** An action's result, folded back into the week and the strip. */
function withResult(d: AppointmentsWeek, next: Appointment, monday: Date): AppointmentsWeek {
  const byStart = (x: Appointment, y: Appointment) => x.starts_at.localeCompare(y.starts_at)
  const appointments = d.appointments.filter((x) => x.id !== next.id)
  if (inWeek(next, monday)) appointments.push(next)
  const attention = d.attention.filter((x) => x.id !== next.id)
  if (lookOf(next)) attention.push(next)
  return { ...d, appointments: appointments.sort(byStart), attention: attention.sort(byStart) }
}

export function AppointmentsPage() {
  const { config } = useConfig()
  const agent = config.agent_name.trim() || 'Linh'
  const phone = useIsNarrow(PHONE_BREAKPOINT)
  const wide = !useIsNarrow(WIDE)
  const now = useNow()
  const { toast } = useToast()

  const [focus, setFocus] = useState(() => startOfDay(new Date()))
  const [chosenView, setView] = useState<View>('week')
  // A week of seven columns is unreadable in 350px; a phone always shows one day.
  const view: View = phone ? 'day' : chosenView
  const [doctor, setDoctor] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [revealId, setRevealId] = useState<string | null>(null)
  const [data, setData] = useState<AppointmentsWeek | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(true)
  const [acting, setActing] = useState(false)
  /** Bumped by "Thử lại". */
  const [attempt, setAttempt] = useState(0)

  const monday = startOfWeek(focus)
  const mondayIso = isoDate(monday)

  useEffect(() => {
    const ac = new AbortController()
    setBusy(true)
    const first = new Date(`${mondayIso}T00:00:00`)
    api.appointments
      .list(mondayIso, isoDate(addDays(first, 6)), { signal: ac.signal })
      .then((d) => {
        setData(d)
        setError(null)
        setBusy(false)
      })
      .catch((e: unknown) => {
        if (isCanceled(e)) return
        setError(e)
        setBusy(false)
      })
    return () => ac.abort()
  }, [mondayIso, attempt])

  const anchorRef = useRef<HTMLElement | null>(null)
  const close = useCallback(() => setOpenId(null), [])
  const all = data ? [...data.appointments, ...data.attention] : []
  const open = openId ? all.find((a) => a.id === openId) ?? null : null
  const { place, panelRef } = useAnchoredPopup(anchorRef, wide && !!open, close, { width: 360, height: 520, side: 'beside' })

  const onRevealed = useCallback((id: string) => {
    setOpenId(id)
    setRevealId(null)
  }, [])

  // Only the first load blanks the page. A week change keeps the old week on
  // screen, dimmed, so the owner does not lose the thing they were comparing.
  if (!data && busy) return <ContentSkeleton />
  if (!data && error) return <RetryCard title="Chưa tải được lịch hẹn" body={messageFor(error)} onRetry={() => setAttempt((n) => n + 1)} />
  if (!data) return null

  const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(monday, i)) : [focus]
  const inView = (a: Appointment) => days.some((d) => sameDay(new Date(a.starts_at), d))

  /*
   * Doctors: the clinic's own roster, plus anyone an appointment names that the
   * roster has since lost — a doctor who left still has patients this week.
   * Fewer than two, and there is nothing to choose between.
   */
  const rosterNames = config.practitioner_roster.filter((p) => p.practitioner_name.trim()).map((p) => `${p.title_credential} ${p.practitioner_name.trim()}`)
  const doctorNames = [...new Set([...rosterNames, ...data.appointments.map((a) => a.practitioner?.name).filter((n): n is string => !!n)])]
  const counted = data.appointments.filter((a) => inView(a) && a.status !== 'cancelled')
  const shown = data.appointments.filter((a) => doctor === 'all' || a.practitioner?.name === doctor)

  const thisMonday = startOfWeek(now)
  const today = startOfDay(now)
  const whenWord =
    view === 'week'
      ? sameDay(monday, thisMonday)
        ? 'Tuần này'
        : sameDay(monday, addDays(thisMonday, 7))
          ? 'Tuần sau'
          : sameDay(monday, addDays(thisMonday, -7))
            ? 'Tuần trước'
            : ''
      : sameDay(focus, today)
        ? 'Hôm nay'
        : sameDay(focus, addDays(today, 1))
          ? 'Ngày mai'
          : sameDay(focus, addDays(today, -1))
            ? 'Hôm qua'
            : ''
  const onToday = view === 'week' ? sameDay(monday, thisMonday) : sameDay(focus, today)
  const dateline = view === 'week' ? weekRange(monday) : `${WEEKDAY[dayIndex(focus)]}, ${dm(focus)}/${focus.getFullYear()}`

  const step = (dir: 1 | -1) => {
    setOpenId(null)
    setFocus((f) => addDays(f, view === 'week' ? 7 * dir : dir))
  }
  const goToday = () => {
    setOpenId(null)
    setFocus(startOfDay(new Date()))
  }

  const pick = (a: Appointment, el: HTMLElement) => {
    anchorRef.current = el
    setOpenId((id) => (id === a.id ? null : a.id))
  }

  /** From the strip: go to its day, clear the doctor filter, then open it. */
  const reveal = (a: Appointment) => {
    setDoctor('all')
    setFocus(startOfDay(new Date(a.starts_at)))
    if (wide) {
      setOpenId(null)
      setRevealId(a.id)
    } else setOpenId(a.id)
  }

  const act = async (a: Appointment, action: AppointmentAction) => {
    setActing(true)
    try {
      const next = await api.appointments.act(a.id, action)
      setData((d) => (d ? withResult(d, next, monday) : d))
      // What is waiting on the clinic may have changed, and the sidebar counts it.
      markSummaryStale()
      toast(actionToast(action, next))
      // A caller's move accepted: follow the appointment to its new day.
      if (action === 'accept_change') {
        const day = startOfDay(new Date(next.starts_at))
        if (!inWeek(next, monday) || view === 'day') setFocus(day)
        if (!inWeek(next, monday)) setOpenId(null)
      }
    } catch (e) {
      toast(messageFor(e), 'error')
      // The appointment moved on without this screen — the caller rang back, or
      // it started. What is drawn is stale, so fetch the week again (contract §9).
      if (isApiError(e) && e.code === 'appointment_state') setAttempt((n) => n + 1)
    } finally {
      setActing(false)
    }
  }

  const detail = open ? (
    <AppointmentDetail appointment={open} agent={agent} now={now} busy={acting} onAct={(action) => void act(open, action)} onClose={wide ? undefined : close} />
  ) : null

  return (
    <>
      <div className={styles.head}>
        {phone ? (
          <span className={styles.headText}>
            <h1 className={ui.pageTitle}>Lịch hẹn</h1>
            <span className={styles.dateline}>{dateline}</span>
          </span>
        ) : (
          <>
            <h1 className={ui.pageTitle}>Lịch hẹn</h1>
            <span className={styles.dateline}>{dateline}</span>
            {whenWord ? <span className={styles.when}>{whenWord}</span> : null}
            <span className={styles.headSpacer} />
          </>
        )}
        <div className={styles.nav}>
          <button type="button" className={styles.navBtn} onClick={() => step(-1)} aria-label={view === 'week' ? 'Tuần trước' : 'Ngày trước'}>
            <Icon name="chevron-left" size={18} />
          </button>
          <button type="button" className={`${styles.todayBtn} ${onToday ? styles.todayQuiet : ''}`} onClick={goToday}>
            Hôm nay
          </button>
          <button type="button" className={styles.navBtn} onClick={() => step(1)} aria-label={view === 'week' ? 'Tuần sau' : 'Ngày sau'}>
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
        {phone ? null : (
          <Segmented
            value={view}
            onChange={(v) => {
              setOpenId(null)
              setView(v)
            }}
            options={VIEWS}
            ariaLabel="Xem theo"
          />
        )}
        <CalendarConnect agent={agent} />
      </div>

      {phone ? (
        <div className={styles.week}>
          {Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((d) => {
            const list = shown.filter((a) => sameDay(new Date(a.starts_at), d) && a.status !== 'cancelled')
            const on = sameDay(d, focus)
            return (
              <button
                key={isoDate(d)}
                type="button"
                className={`${styles.wd} ${on ? styles.wdOn : ''} ${sameDay(d, now) ? styles.wdToday : ''}`}
                aria-pressed={on}
                aria-label={`${WEEKDAY[dayIndex(d)]} ${dm(d)}, ${list.length} lịch hẹn`}
                onClick={() => {
                  setOpenId(null)
                  setFocus(d)
                }}
              >
                <span className={styles.wdDow}>{WEEKDAY_SHORT[dayIndex(d)]}</span>
                <span className={styles.wdDate}>{String(d.getDate()).padStart(2, '0')}</span>
                <span className={styles.wdCount}>{list.length || '–'}</span>
                {list.some((a) => lookOf(a)) ? <span className={styles.needDot} /> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {doctorNames.length > 1 || !phone ? (
        <div className={styles.toolbar}>
          {doctorNames.length > 1 ? (
            <div className={styles.chips}>
              <ChipButton selected={doctor === 'all'} onClick={() => setDoctor('all')}>
                Tất cả bác sĩ <span className={styles.chipCount}>{counted.length}</span>
              </ChipButton>
              {doctorNames.map((name) => (
                <ChipButton
                  key={name}
                  selected={doctor === name}
                  onClick={() => {
                    setDoctor(name)
                    if (open && open.practitioner?.name !== name) setOpenId(null)
                  }}
                >
                  {name} <span className={styles.chipCount}>{counted.filter((a) => a.practitioner?.name === name).length}</span>
                </ChipButton>
              ))}
            </div>
          ) : null}
          {phone ? null : (
            <div className={styles.legend} aria-hidden="true">
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.swatchHeld}`} />
                {agent} đã giữ
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.swatchLook}`} />
                Chờ bạn
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.swatchArrived}`} />
                Đã đến
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.swatchCancelled}`} />
                Đã huỷ
              </span>
            </div>
          )}
        </div>
      ) : null}

      {data.attention.length ? (
        <div className={styles.strip}>
          <span className={styles.stripLead}>
            <span className={styles.stripMark}>
              <Icon name="appointment" size={18} />
              <span className={styles.needDot} />
            </span>
            <span className={styles.stripTitle}>{data.attention.length} lịch cần bạn xem</span>
          </span>
          <span className={styles.stripRule} />
          <div className={styles.attChips}>
            {data.attention.map((a) => {
              const s = new Date(a.starts_at)
              return (
                <button key={a.id} type="button" className={`${styles.attChip} ${openId === a.id ? styles.attChipOn : ''}`} onClick={() => reveal(a)}>
                  <span className={styles.needDot} />
                  {lookChip(a)}
                  <span className={styles.attWhen}>
                    {WEEKDAY_SHORT[dayIndex(s)]} {hm(s)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {data.has_any ? (
        <div aria-busy={busy} className={busy ? styles.busy : undefined}>
          <WeekGrid
            days={days}
            appointments={shown}
            config={config}
            now={now}
            agent={agent}
            openId={openId}
            anchorRef={anchorRef}
            revealId={revealId}
            onRevealed={onRevealed}
            onPick={pick}
            onDay={
              view === 'week'
                ? (d) => {
                    setOpenId(null)
                    setFocus(d)
                    setView('day')
                  }
                : undefined
            }
            hourPx={phone ? 64 : 52}
            gutter={phone ? 46 : 52}
            showHead={!phone}
          />
        </div>
      ) : (
        <FirstWeek agent={agent} />
      )}

      {open && wide && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label={`${open.patient_name}, ${open.service_name}`} className={styles.popPanel}>
          {detail}
        </AnchoredPopup>
      ) : null}

      {open && !wide ? (
        <Overlay kind={phone ? 'sheet' : 'drawer'} label={`${open.patient_name}, ${open.service_name}`} onClose={close}>
          {detail}
        </Overlay>
      ) : null}
    </>
  )
}

/**
 * The drawer (tablet) and the sheet (phone). One at a time, never stacked;
 * Escape and the scrim close it, and the page behind does not scroll under the thumb.
 */
function Overlay({ kind, label, onClose, children }: { kind: 'drawer' | 'sheet'; label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <>
      <div className={styles.scrim} onClick={onClose} />
      <div className={kind === 'sheet' ? styles.sheet : styles.drawer} role="dialog" aria-modal="true" aria-label={label}>
        {kind === 'sheet' ? <span className={styles.sheetGrip} aria-hidden="true" /> : null}
        <div className={styles.overlayScroll}>{children}</div>
      </div>
    </>,
    document.body,
  )
}

/**
 * Nobody has booked yet — a different screen from a quiet week (ui-ux-principles
 * §10). Says what will appear here, and points at the page that decides when
 * she may book.
 */
function FirstWeek({ agent }: { agent: string }) {
  return (
    <section className={ui.card}>
      <div className={styles.firstDay}>
        <span className={styles.firstDayArt} aria-hidden="true">
          <Shape name="appointment-grid" size={96} />
        </span>
        <div className={styles.firstDayText}>
          <EmptyState title="Chưa có lịch hẹn nào">
            Khi khách gọi xin giờ, {agent} giữ chỗ và lịch hiện ở đây — kèm tên khách, bác sĩ và lời {agent} ghi lại trong cuộc gọi.
          </EmptyState>
          <Button variant="secondary" size="sm" onClick={() => (window.location.hash = appHref('le-tan', 'ky-nang', 'dat-lich'))}>
            Xem {agent} được giữ lịch lúc nào
          </Button>
        </div>
      </div>
    </section>
  )
}
