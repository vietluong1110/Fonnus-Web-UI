import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../../../design-system'
import { useElementWidth } from '../../../hooks/useElementWidth'
import { WEEKDAYS, WEEKDAY_SHORT } from '../defaults'
import type { ClosureType, HolidayException, Weekday } from '../model'
import { newId } from '../model'
import { isOpenNow, summarizeHours } from '../readiness'
import { useConfig, useDraft } from '../store'
import { AddButton, AnchoredPopup, Card, DateRangeField, EmptyState, IconButton, SaveBar, Segmented, TimeField, ui, useAnchoredPopup, useAppear } from '../../ui'
import { localIso } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import { WeekPlanner } from './WeekPlanner'
import styles from './Knowledge.module.css'

/*
 * How the holiday list lays a row out, by the list's own width — the column
 * beside a rail is narrower than a tablet's full width, so the viewport is the
 * wrong thing to ask. The layout itself is container queries on `.holidays`
 * in Knowledge.module.css; these are the same two thresholds for the parts of
 * a row that are text and so cannot be changed from CSS. Change both together.
 */
/** Under this the date pill drops the year: "14–22/02" for "14/02 – 22/02/2027". */
const HOLIDAY_SHORT_DATES = 660
/** Under this a row is two lines and the pills are exact halves; the closure pill drops its "Mở". */
const HOLIDAY_STACKED = 560

const KEYS = ['operating_hours_by_weekday', 'operating_hours_confirmed', 'break_periods', 'holiday_exceptions', 'holidays_confirmed'] as const

export function WeekdayPicker({ value, onChange, ariaLabel }: { value: Weekday[]; onChange: (v: Weekday[]) => void; ariaLabel: string }) {
  return (
    <div className={styles.days} role="group" aria-label={ariaLabel}>
      {WEEKDAYS.map((d) => {
        const on = value.includes(d)
        return (
          <button
            key={d}
            type="button"
            className={`${styles.day} ${on ? styles.dayOn : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)))}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        )
      })}
    </div>
  )
}

/**
 * "Nghỉ cả ngày" or "Mở 08:00–12:00": one pill that says what the holiday
 * does to the day, and opens a small panel to change it. The two time
 * fields live inside the panel, so a holiday row is always one line — and
 * the panel is an anchored pop-up like the calendar beside it, so a time
 * list opening inside it does not take it down.
 */
function ClosurePill({ holiday: h, short, onChange }: { holiday: HolidayException; /** Hours without the "Mở" — the terracotta dot says it — for a pill too narrow for both. */ short: boolean; onChange: (patch: Partial<HolidayException>) => void }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  // 292px when there is room under the pill; near the window's edge it gives
  // up to 36px of that before it is moved left, so it stays the pill's panel
  // rather than a box pushed across the row. The floor is what "Nghỉ cả ngày"
  // and "Mở một phần" need as two equal halves with room to breathe.
  const { place, panelRef } = useAnchoredPopup(triggerRef, open, close, { width: 292, height: 150, minWidth: 256 })
  const partial = h.closure_type === 'modified' && h.modified_hours

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.closurePill} ${open ? styles.closurePillOpen : ''} ${partial ? styles.closurePartial : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.closureDot} aria-hidden="true" />
        <span className={styles.closureText}>{partial ? `${short ? '' : 'Mở '}${h.modified_hours!.from}–${h.modified_hours!.to}` : 'Nghỉ cả ngày'}</span>
        <span className={styles.closureChevron}>
          <Icon name="chevron-down" size={14} />
        </span>
      </button>
      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label="Hôm đó phòng khám">
          <div className={styles.closurePanel}>
            <Segmented<ClosureType>
              fill
              ariaLabel="Kiểu đóng cửa"
              value={h.closure_type}
              onChange={(v) => onChange({ closure_type: v, modified_hours: v === 'modified' ? (h.modified_hours ?? { from: '08:00', to: '12:00' }) : null })}
              options={[
                { value: 'closed', label: 'Nghỉ cả ngày' },
                { value: 'modified', label: 'Mở một phần' },
              ]}
            />
            {partial ? (
              <div className={styles.closureTimes}>
                <TimeField compact label="Từ" max={h.modified_hours!.to} value={h.modified_hours!.from} onChange={(v) => onChange({ modified_hours: { from: v, to: h.modified_hours!.to } })} />
                <TimeField compact label="Đến" min={h.modified_hours!.from} value={h.modified_hours!.to} onChange={(v) => onChange({ modified_hours: { from: h.modified_hours!.from, to: v } })} />
              </div>
            ) : null}
          </div>
        </AnchoredPopup>
      ) : null}
    </>
  )
}

/** "T2–T6, CN" — weekdays as ranges, the way `summarizeHours` writes them. */
function dayList(days: Weekday[]): string {
  const order = WEEKDAYS.filter((d) => days.includes(d))
  const runs: Weekday[][] = []
  for (const d of order) {
    const last = runs[runs.length - 1]
    if (last && WEEKDAYS.indexOf(d) === WEEKDAYS.indexOf(last[last.length - 1]) + 1) last.push(d)
    else runs.push([d])
  }
  return runs.map((r) => (r.length > 2 ? `${WEEKDAY_SHORT[r[0]]}–${WEEKDAY_SHORT[r[r.length - 1]]}` : r.map((d) => WEEKDAY_SHORT[d]).join(', '))).join(', ')
}

/** "nghỉ 12:00–13:30 T2–T7" — the breaks as one phrase, for the line under the planner. */
function summarizeBreaks(cfg: { break_periods: { days: Weekday[]; from: string; to: string }[] }): string | null {
  if (!cfg.break_periods.length) return null
  return cfg.break_periods.map((b) => `nghỉ ${b.from}–${b.to}${b.days.length ? ` ${dayList(b.days)}` : ''}`).join(' · ')
}

/**
 * `#/app/le-tan/kien-thuc/gio-mo-cua` — when the clinic is open.
 *
 * Weekly hours, breaks and holidays were two pages. They are one because the
 * caller's question is one: "mai có mở không?" needs the weekday, the lunch
 * break and Tết added together before she can answer, and the rail here
 * does exactly that sum for tomorrow.
 *
 * Hours and breaks are one calendar of shifts (`WeekPlanner`), not two
 * lists of times: an owner knows their week as a shape, and the shape is
 * what they draw — the gap between two shifts is the break. Holidays stay
 * a list, because a holiday is a date.
 *
 * Both ship pre-filled from the dental template and are only *hers* once
 * the owner has looked at them — one "Xác nhận" at the foot confirms both.
 */
export function HoursSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Giờ mở cửa và ngày nghỉ')
  const [holidaysRef, holidaysWidth] = useElementWidth()
  const shortDates = holidaysWidth > 0 && holidaysWidth < HOLIDAY_SHORT_DATES
  const stackedRows = holidaysWidth > 0 && holidaysWidth < HOLIDAY_STACKED
  const { draft, set, patch } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const open = isOpenNow(live, now)
  const today = localIso(now)

  // A holiday that has passed is kept in the record (the booking skill still
  // reads it) but no longer shown — there is nothing left to decide about it.
  // Sorted by date, except that a row added on this visit stays at the top,
  // newest first — it appears where the button was pressed, and does not
  // jump down the list the moment its dates are set.
  const [fresh, setFresh] = useState<string[]>([])
  const upcoming = draft.holiday_exceptions.filter((h) => h.date_to >= today)
  const holidays = [
    ...fresh.map((id) => upcoming.find((h) => h.id === id)).filter((h): h is HolidayException => !!h),
    ...upcoming.filter((h) => !fresh.includes(h.id)).sort((a, b) => a.date_from.localeCompare(b.date_from)),
  ]
  const setHoliday = (id: string, patch: Partial<HolidayException>) => set('holiday_exceptions', draft.holiday_exceptions.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  const rows = useAppear(holidays.map((h) => h.id))

  /*
   * A new holiday lands at the top of the list, where the eye already is
   * after pressing the card head's button — not at the foot, where it would
   * be below the fold on a list of any length.
   */
  const addHoliday = () => {
    const id = newId('hol')
    setFresh((f) => [id, ...f])
    set('holiday_exceptions', [{ id, holiday_label: '', date_from: today, date_to: today, closure_type: 'closed', modified_hours: null, seeded: false }, ...draft.holiday_exceptions])
  }

  const confirmed = draft.operating_hours_confirmed && draft.holidays_confirmed
  const anyOpen = draft.operating_hours_by_weekday.some((r) => r.open)
  const breaks = summarizeBreaks(draft)

  return (
    <KnowledgeSection
      title="Giờ mở cửa và ngày nghỉ"
      lede={`"Mai có mở không?" là câu khách hỏi nhiều hơn mọi câu khác. Giờ trong tuần, nghỉ trưa và ngày lễ — ${agent} cộng cả ba lại rồi mới trả lời.`}
      rail={<TryPanel section="gio-mo-cua" config={live} />}
      bar={<SaveBar
        {...d.bar}
        dirty={d.dirty || !confirmed}
        onSave={() => void d.save({ operating_hours_confirmed: true, holidays_confirmed: true })}
        label={confirmed ? 'Bạn có thay đổi chưa lưu' : 'Xác nhận giờ mở cửa và ngày nghỉ'}
        sub={anyOpen ? `${agent} đọc giờ này khi khách hỏi "mấy giờ mở cửa" và "Tết nghỉ ngày nào".` : `Chưa có ngày nào mở cửa — ${agent} sẽ báo khách gọi lại.`}
      />}
    >
      <Card
        title="Giờ làm việc trong tuần"
        subtitle="kéo ca làm việc lên lịch, giờ nghỉ là khoảng trống giữa hai ca"
        actions={
          <span className={styles.openNow} title="Tính từ giờ làm việc, giờ nghỉ và ngày nghỉ">
            <span className={`${styles.openDot} ${open ? '' : styles.closedDot}`} />
            {open ? 'Đang mở cửa' : 'Đang đóng cửa'} · {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
          </span>
        }
      >
        {!draft.operating_hours_confirmed ? <span className={ui.hint}>Giờ mẫu theo ngành nha khoa. Sửa cho đúng phòng khám rồi bấm Xác nhận ở thanh dưới.</span> : null}
        <WeekPlanner
          value={{ hours: draft.operating_hours_by_weekday, breaks: draft.break_periods }}
          onChange={(v) => patch({ operating_hours_by_weekday: v.hours, break_periods: v.breaks })}
          now={now}
          agent={agent}
        />
        <p className={styles.hoursSaid}>
          <span className={styles.hoursSaidWho}>{agent} đọc:</span> {summarizeHours(live)}
          {breaks ? ` · ${breaks}` : ''}
        </p>
      </Card>

      <Card
        title="Ngày nghỉ"
        subtitle={`${agent} báo ngày mở cửa lại và không đặt hẹn vào ngày nghỉ`}
        actions={<AddButton label="Thêm ngày nghỉ" onClick={addHoliday} />}
      >
        {!draft.holidays_confirmed ? <span className={ui.hint}>Fonnus điền sẵn ngày lễ Việt Nam. Tết là ngày hay bị hỏi nhất — kiểm tra ngày nghỉ Tết của phòng khám rồi bấm Xác nhận.</span> : null}
        {holidays.length ? (
          <div className={styles.holidays} ref={holidaysRef}>
            <div className={styles.holidayHead} aria-hidden="true">
              <span className={styles.holidayName}>Dịp nghỉ</span>
              <span className={styles.holidayWhen}>Ngày</span>
              <span className={styles.holidayWhat}>Hôm đó</span>
              <span className={styles.holidayEnd} />
            </div>
            {holidays.map((h) => (
              <div key={h.id} ref={rows.ref(h.id)} className={styles.holiday}>
                <input
                  className={`${styles.holidayName} ${styles.holidayInput}`}
                  value={h.holiday_label}
                  onChange={(e) => setHoliday(h.id, { holiday_label: e.target.value })}
                  placeholder="Tên ngày nghỉ"
                  aria-label="Tên ngày nghỉ"
                  autoFocus={!h.holiday_label && !h.seeded}
                />
                <span className={styles.holidayWhen}>
                  <DateRangeField pill reading={shortDates ? 'short' : 'full'} aria-label="Ngày nghỉ" from={h.date_from} to={h.date_to} onChange={(r) => setHoliday(h.id, { date_from: r.from, date_to: r.to })} />
                </span>
                <span className={styles.holidayWhat}>
                  <ClosurePill holiday={h} short={stackedRows} onChange={(patch) => setHoliday(h.id, patch)} />
                </span>
                <span className={styles.holidayEnd}>
                  <IconButton name="trash" label="Xoá ngày nghỉ" danger onClick={() => rows.leave(h.id, () => set('holiday_exceptions', (list) => list.filter((x) => x.id !== h.id)))} />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có ngày nghỉ">Thêm Tết và các ngày lễ để {agent} không hẹn khách vào ngày phòng khám đóng cửa.</EmptyState>
        )}
      </Card>
    </KnowledgeSection>
  )
}
