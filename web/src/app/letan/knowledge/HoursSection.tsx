import { useEffect, useState } from 'react'
import { Button } from '../../../design-system'
import { WEEKDAYS, WEEKDAY_LONG, WEEKDAY_SHORT } from '../defaults'
import type { BreakPeriod, Weekday } from '../model'
import { newId } from '../model'
import { isOpenNow, summarizeHours } from '../readiness'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, EmptyState, IconButton, Notice, SaveBar, SpeechBubble, Switch, TimeField, ui } from '../../ui'
import styles from './Knowledge.module.css'

const KEYS = ['operating_hours_by_weekday', 'operating_hours_confirmed', 'break_periods', 'last_intake_time'] as const

export function WeekdayPicker({ value, onChange, ariaLabel }: { value: Weekday[]; onChange: (v: Weekday[]) => void; ariaLabel: string }) {
  return (
    <div className={styles.days} role="group" aria-label={ariaLabel}>
      {WEEKDAYS.map((d) => {
        const on = value.includes(d)
        return (
          <button key={d} type="button" className={`${styles.day} ${on ? styles.dayOn : ''}`} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)))}>
            {WEEKDAY_SHORT[d]}
          </button>
        )
      })}
    </div>
  )
}

export function HoursSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Giờ làm việc')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const open = isOpenNow({ ...config, ...draft }, now)

  const setDay = (day: Weekday, patch: Partial<(typeof draft.operating_hours_by_weekday)[number]>) =>
    set('operating_hours_by_weekday', draft.operating_hours_by_weekday.map((r) => (r.day === day ? { ...r, ...patch } : r)))

  const copyMonToAll = () => {
    const mon = draft.operating_hours_by_weekday.find((r) => r.day === 1)
    if (!mon) return
    set('operating_hours_by_weekday', draft.operating_hours_by_weekday.map((r) => (r.day === 0 ? r : { ...r, open: mon.open, from: mon.from, to: mon.to })))
  }

  const setBreak = (id: string, patch: Partial<BreakPeriod>) => set('break_periods', draft.break_periods.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const invalid = draft.operating_hours_by_weekday.some((r) => r.open && r.from >= r.to)

  const save = () => d.save({ operating_hours_confirmed: true })

  return (
    <>
      <SectionHead title="Giờ làm việc" badge={draft.operating_hours_confirmed ? { tone: 'success', label: 'Đủ' } : { tone: 'warning', label: 'Cần xác nhận' }} />

      {!draft.operating_hours_confirmed ? (
        <Notice tone="warm" icon="circle-alert">
          Giờ mẫu theo ngành nha khoa. Sửa cho đúng phòng khám rồi bấm Lưu — {agent} chỉ đọc giờ sau khi bạn xác nhận.
        </Notice>
      ) : null}

      <Card
        gate="R1"
        title="Giờ mở cửa trong tuần"
        actions={
          <span className={styles.openNow} title="Tính từ giờ làm việc, nghỉ trưa và ngày nghỉ">
            <span className={`${styles.openDot} ${open ? '' : styles.closedDot}`} />
            {open ? 'Đang mở cửa' : 'Đang đóng cửa'} · {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
          </span>
        }
      >
        <div>
          {WEEKDAYS.map((day) => {
            const row = draft.operating_hours_by_weekday.find((r) => r.day === day)!
            const bad = row.open && row.from >= row.to
            return (
              <div key={day} className={styles.dayRow}>
                <span className={styles.dayName} title={WEEKDAY_LONG[day]}>
                  {WEEKDAY_LONG[day]}
                </span>
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
                {day === 1 ? (
                  <button type="button" className={ui.linkButton} onClick={copyMonToAll}>
                    Áp dụng T2 cho T3–T7
                  </button>
                ) : (
                  <span />
                )}
              </div>
            )
          })}
        </div>
        <SpeechBubble who={`${agent} nói`} speak text={`Phòng khám mở cửa ${summarizeHours({ ...config, ...draft }).replace(/–/g, ' đến ').replace(/·/g, ',')} ạ.`}>
          Phòng khám mở cửa {summarizeHours({ ...config, ...draft })} ạ.
        </SpeechBubble>
      </Card>

      <div className={ui.grid2}>
        <Card
          gate="O"
          title="Nghỉ giữa ngày"
          subtitle={`${agent} không nhận hẹn và báo khách gọi lại sau`}
          actions={
            <Button variant="ghost" size="sm" onClick={() => set('break_periods', [...draft.break_periods, { id: newId('brk'), days: [], from: '12:00', to: '13:30' }])}>
              + Thêm
            </Button>
          }
        >
          {draft.break_periods.length ? (
            draft.break_periods.map((b) => (
              <div key={b.id} className={ui.stackTight} style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-hairline)' }}>
                <div className={styles.timeRange}>
                  <TimeField compact aria-label="Bắt đầu nghỉ" value={b.from} onChange={(v) => setBreak(b.id, { from: v })} />
                  <span className={styles.timeSep}>–</span>
                  <TimeField compact aria-label="Kết thúc nghỉ" value={b.to} onChange={(v) => setBreak(b.id, { to: v })} />
                  <span style={{ marginLeft: 'auto', width: 'auto' }}>
                    <IconButton name="trash-2" label="Xoá" danger onClick={() => set('break_periods', draft.break_periods.filter((x) => x.id !== b.id))} />
                  </span>
                </div>
                <div className={ui.row}>
                  <span className={ui.hint}>{b.days.length ? 'Các ngày:' : 'Mọi ngày mở cửa'}</span>
                  <WeekdayPicker ariaLabel="Ngày áp dụng" value={b.days} onChange={(v) => setBreak(b.id, { days: v })} />
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Không nghỉ giữa ngày">Thêm nếu phòng khám đóng cửa nghỉ trưa.</EmptyState>
          )}
        </Card>

        <Card gate="O" title="Nhận khách muộn nhất" subtitle="giờ cuối phòng khám còn nhận khách đến, trước giờ đóng cửa">
          <div className={ui.row}>
            <TimeField compact aria-label="Giờ nhận muộn nhất" value={draft.last_intake_time} onChange={(v) => set('last_intake_time', v)} style={{ width: 140 }} />
            {draft.last_intake_time ? (
              <button type="button" className={ui.linkButton} onClick={() => set('last_intake_time', '')}>
                Bỏ
              </button>
            ) : (
              <span className={ui.hint}>Để trống = nhận đến giờ đóng cửa.</span>
            )}
          </div>
          {draft.last_intake_time ? (
            <SpeechBubble who={`${agent} nói`}>Phòng khám nhận khách muộn nhất {draft.last_intake_time} ạ, anh/chị đến trước giờ đó giúp em.</SpeechBubble>
          ) : null}
        </Card>
      </div>

      <SaveBar
        dirty={d.dirty || !draft.operating_hours_confirmed}
        saving={d.saving}
        onSave={save}
        onCancel={d.cancel}
        label={draft.operating_hours_confirmed ? 'Bạn có thay đổi chưa lưu' : 'Xác nhận giờ làm việc'}
        sub={invalid ? 'Có ngày giờ đóng trước giờ mở — sửa trước khi lưu.' : `${agent} đọc giờ này khi khách hỏi "mấy giờ mở cửa".`}
      />
    </>
  )
}
