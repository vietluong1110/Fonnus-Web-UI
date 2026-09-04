import { useEffect, useState } from 'react'
import { Badge, Icon } from '../../../design-system'
import { WEEKDAYS, WEEKDAY_LONG, WEEKDAY_SHORT } from '../defaults'
import type { BreakPeriod, ClosureType, HolidayException, Weekday } from '../model'
import { newId } from '../model'
import { isOpenNow } from '../readiness'
import { useConfig, useDraft } from '../store'
import { Card, DateField, EmptyState, IconButton, SaveBar, SelectField, Switch, TextField, TimeField, ui } from '../../ui'
import { localIso } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

const KEYS = ['operating_hours_by_weekday', 'operating_hours_confirmed', 'break_periods', 'last_intake_time', 'holiday_exceptions', 'holidays_confirmed'] as const

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
 * `#/app/le-tan/kien-thuc/gio-mo-cua` — when the clinic is open.
 *
 * Weekly hours, breaks and holidays were two pages. They are one because the
 * caller's question is one: "mai có mở không?" needs the weekday, the lunch
 * break and Tết added together before she can answer, and the rail here
 * does exactly that sum for tomorrow.
 *
 * Both lists ship pre-filled from the dental template and are only *hers*
 * once the owner has looked at them — one "Xác nhận" at the foot confirms
 * both. Until then the rail says so, as a fact about the preview, not as a
 * warning among the fields.
 */
export function HoursSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Giờ mở cửa và ngày nghỉ')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const open = isOpenNow(live, now)
  const today = localIso(now)

  const setDay = (day: Weekday, patch: Partial<(typeof draft.operating_hours_by_weekday)[number]>) =>
    set('operating_hours_by_weekday', draft.operating_hours_by_weekday.map((r) => (r.day === day ? { ...r, ...patch } : r)))

  const copyMonToAll = () => {
    const mon = draft.operating_hours_by_weekday.find((r) => r.day === 1)
    if (!mon) return
    set('operating_hours_by_weekday', draft.operating_hours_by_weekday.map((r) => (r.day === 0 ? r : { ...r, open: mon.open, from: mon.from, to: mon.to })))
  }

  const setBreak = (id: string, patch: Partial<BreakPeriod>) => set('break_periods', draft.break_periods.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const holidays = [...draft.holiday_exceptions].sort((a, b) => a.date_from.localeCompare(b.date_from))
  const setHoliday = (id: string, patch: Partial<HolidayException>) => set('holiday_exceptions', draft.holiday_exceptions.map((h) => (h.id === id ? { ...h, ...patch } : h)))

  const invalid = draft.operating_hours_by_weekday.some((r) => r.open && r.from >= r.to)
  const confirmed = draft.operating_hours_confirmed && draft.holidays_confirmed

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
        sub={invalid ? 'Có ngày giờ đóng trước giờ mở — sửa trước khi lưu.' : `${agent} đọc giờ này khi khách hỏi "mấy giờ mở cửa" và "Tết nghỉ ngày nào".`}
      />}
    >
      <Card
        pattern="grid"
        title="Giờ mở cửa trong tuần"
        actions={
          <span className={styles.openNow} title="Tính từ giờ làm việc, nghỉ trưa và ngày nghỉ">
            <span className={`${styles.openDot} ${open ? '' : styles.closedDot}`} />
            {open ? 'Đang mở cửa' : 'Đang đóng cửa'} · {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
          </span>
        }
      >
        {!draft.operating_hours_confirmed ? <span className={ui.hint}>Giờ mẫu theo ngành nha khoa. Sửa cho đúng phòng khám rồi bấm Xác nhận ở thanh dưới.</span> : null}
        <div>
          {WEEKDAYS.map((day) => {
            const row = draft.operating_hours_by_weekday.find((r) => r.day === day)!
            const bad = row.open && row.from >= row.to
            return (
              <div key={day} className={styles.dayRow}>
                <span className={styles.dayName}>{WEEKDAY_LONG[day]}</span>
                <Switch checked={row.open} onChange={(v) => setDay(day, { open: v })} ariaLabel={`Mở cửa ${WEEKDAY_LONG[day]}`} />
                {row.open ? (
                  <div className={styles.timeRange}>
                    <TimeField compact aria-label={`Mở ${WEEKDAY_LONG[day]}`} value={row.from} onChange={(v) => setDay(day, { from: v })} error={bad ? 'Giờ đóng phải sau giờ mở.' : null} />
                    <span className={styles.timeSep}>–</span>
                    <TimeField compact aria-label={`Đóng ${WEEKDAY_LONG[day]}`} value={row.to} onChange={(v) => setDay(day, { to: v })} />
                  </div>
                ) : (
                  <span className={styles.dayClosed}>Nghỉ — {agent} ghi lời nhắn và hẹn gọi lại</span>
                )}
              </div>
            )
          })}
        </div>
        <div className={ui.row}>
          <button type="button" className={ui.linkButton} onClick={copyMonToAll}>
            Áp dụng giờ Thứ Hai cho Thứ Ba đến Thứ Bảy
          </button>
        </div>
      </Card>

      <Card title="Nghỉ trưa và giờ nhận khách cuối">
        <div className={ui.stackTight}>
          <span className={ui.label}>Nghỉ giữa ngày</span>
          {draft.break_periods.length ? (
            draft.break_periods.map((b) => (
              <div key={b.id} className={styles.item}>
                <div className={styles.line}>
                  <TimeField compact aria-label="Bắt đầu nghỉ" value={b.from} onChange={(v) => setBreak(b.id, { from: v })} style={{ width: 118 }} />
                  <span className={styles.timeSep}>–</span>
                  <TimeField compact aria-label="Kết thúc nghỉ" value={b.to} onChange={(v) => setBreak(b.id, { to: v })} style={{ width: 118 }} />
                  <span className={styles.itemSep} />
                  <span className={styles.itemLabel}>{b.days.length ? 'Các ngày' : 'Mọi ngày mở cửa'}</span>
                  <WeekdayPicker ariaLabel="Ngày áp dụng" value={b.days} onChange={(v) => setBreak(b.id, { days: v })} />
                  <div className={styles.itemActions}>
                    <IconButton name="trash" label="Xoá giờ nghỉ" danger onClick={() => set('break_periods', draft.break_periods.filter((x) => x.id !== b.id))} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <span className={ui.hint}>Không nghỉ giữa ngày — {agent} nhận hẹn suốt giờ mở cửa.</span>
          )}
          <button type="button" className={styles.idea} onClick={() => set('break_periods', [...draft.break_periods, { id: newId('brk'), days: [], from: '12:00', to: '13:30' }])}>
            <span className={styles.ideaPlus}>
              <Icon name="plus" size={14} />
            </span>
            <span>Thêm giờ nghỉ — {agent} không nhận hẹn và báo khách gọi lại sau</span>
          </button>
        </div>

        <div className={ui.divider} />

        <div className={ui.stackTight}>
          <span className={ui.label}>Nhận khách muộn nhất</span>
          <div className={ui.row}>
            <TimeField compact aria-label="Giờ nhận khách muộn nhất" value={draft.last_intake_time} onChange={(v) => set('last_intake_time', v)} style={{ width: 140 }} />
            {draft.last_intake_time ? (
              <button type="button" className={ui.linkButton} onClick={() => set('last_intake_time', '')}>
                Bỏ
              </button>
            ) : (
              <span className={ui.hint}>Để trống = nhận khách đến tận giờ đóng cửa.</span>
            )}
          </div>
        </div>
      </Card>

      <Card title="Ngày nghỉ" subtitle={`${agent} báo ngày mở cửa lại và không đặt hẹn vào ngày nghỉ`}>
        {!draft.holidays_confirmed ? <span className={ui.hint}>Fonnus điền sẵn ngày lễ Việt Nam. Tết là ngày hay bị hỏi nhất — kiểm tra ngày nghỉ Tết của phòng khám rồi bấm Xác nhận.</span> : null}
        {holidays.length ? (
          <div>
            {holidays.map((h) => {
              const past = h.date_to < today
              return (
                <div key={h.id} className={`${styles.item} ${past ? styles.itemPast : ''}`}>
                  <div className={styles.line}>
                    <TextField className={styles.grow} compact aria-label="Tên ngày nghỉ" value={h.holiday_label} onChange={(e) => setHoliday(h.id, { holiday_label: e.target.value })} placeholder="Nghỉ Tết" />
                    {h.seeded ? <Badge tone="neutral">Fonnus gợi ý</Badge> : null}
                    <div className={styles.itemActions}>
                      <IconButton name="trash" label="Xoá ngày nghỉ" danger onClick={() => set('holiday_exceptions', draft.holiday_exceptions.filter((x) => x.id !== h.id))} />
                    </div>
                  </div>
                  <div className={styles.line}>
                    <DateField compact aria-label="Từ ngày" value={h.date_from} onChange={(v) => setHoliday(h.id, { date_from: v, date_to: h.date_to < v ? v : h.date_to })} style={{ width: 150 }} />
                    <span className={styles.timeSep}>–</span>
                    <DateField compact aria-label="Đến ngày" value={h.date_to} onChange={(v) => setHoliday(h.id, { date_to: v })} min={h.date_from} style={{ width: 150 }} />
                    <span className={styles.itemSep} />
                    <SelectField<ClosureType>
                      compact
                      aria-label="Kiểu đóng cửa"
                      value={h.closure_type}
                      onChange={(v) => setHoliday(h.id, { closure_type: v, modified_hours: v === 'modified' ? (h.modified_hours ?? { from: '08:00', to: '12:00' }) : null })}
                      options={[
                        { value: 'closed', label: 'Nghỉ cả ngày' },
                        { value: 'modified', label: 'Mở một phần' },
                      ]}
                      style={{ width: 150 }}
                    />
                    {h.closure_type === 'modified' && h.modified_hours ? (
                      <>
                        <TimeField compact aria-label="Mở" value={h.modified_hours.from} onChange={(v) => setHoliday(h.id, { modified_hours: { from: v, to: h.modified_hours!.to } })} style={{ width: 110 }} />
                        <span className={styles.timeSep}>–</span>
                        <TimeField compact aria-label="Đóng" value={h.modified_hours.to} onChange={(v) => setHoliday(h.id, { modified_hours: { from: h.modified_hours!.from, to: v } })} style={{ width: 110 }} />
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Chưa có ngày nghỉ">Thêm Tết và các ngày lễ để {agent} không hẹn khách vào ngày phòng khám đóng cửa.</EmptyState>
        )}
        <button
          type="button"
          className={styles.idea}
          onClick={() =>
            set('holiday_exceptions', [
              ...draft.holiday_exceptions,
              { id: newId('hol'), holiday_label: '', date_from: today, date_to: today, closure_type: 'closed', modified_hours: null, seeded: false },
            ])
          }
        >
          <span className={styles.ideaPlus}>
            <Icon name="plus" size={14} />
          </span>
          <span>Thêm ngày nghỉ</span>
        </button>
        <span className={ui.hint}>Ngày đã qua mờ đi và tự bỏ khỏi lịch. Kỹ năng · Đặt lịch hẹn dùng chung danh sách này.</span>
      </Card>
    </KnowledgeSection>
  )
}
