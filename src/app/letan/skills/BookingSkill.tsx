import { useEffect, useState } from 'react'
import { appHref } from '../../../hooks/useRoute'
import { BUFFER_OPTIONS, LABELS, SLOT_DURATION_OPTIONS } from '../defaults'
import type { BookingConfirmationChannel, IdentityVerificationRule, SlotRule, Weekday } from '../model'
import { useConfig, useDraft } from '../store'
import {
  Card,
  Disclosure,
  ExpandRow,
  FOLD_MS,
  NumberField,
  RowEdit,
  RowList,
  RowMissing,
  RowText,
  RowValue,
  Said,
  SaveBar,
  Segmented,
  SelectField,
  Suggestion,
  Suggestions,
  TextField,
  ui,
} from '../../ui'
import { DayBlocks, WeekdayPicker, blocksOn, nextBlock } from '../Week'
import type { TimeBlock } from '../Week'
import { fmtDate } from '../knowledge/answers'
import { TryPanel } from '../tryout/TryPanel'
import { SkillsSection } from './SkillsSection'
import { POLICIES, bookableDays, clinicHours, closedDays, confirmLine, identityLine, limitLine, policyLine, slotLine } from './lines'
import styles from './Skills.module.css'

const KEYS = [
  'slot_rules',
  'ai_bookable_slots_per_day',
  'slot_duration',
  'buffer_time',
  'max_bookings_per_day',
  'booking_confirmation_channel',
  'deposit_policy',
  'cancellation_policy',
  'no_show_policy',
  'waiting_time_expectation',
  'identity_verification_rule',
] as const

/**
 * `slot_rules` keeps a list of windows per day; the week control keeps one
 * flat list of blocks. The id is the day and the window's place in it, which
 * is stable for as long as a block exists — a window is only ever added at the
 * end or removed, never reordered.
 */
function toBlocks(rules: SlotRule[]): TimeBlock[] {
  return rules.flatMap((r) => r.windows.map((w, i) => ({ id: `${r.day}:${i}`, day: r.day, from: w.from, to: w.to })))
}

const CHANNELS: BookingConfirmationChannel[] = ['sms', 'zalo', 'none']

/**
 * `#/app/le-tan/ky-nang/dat-lich` — the diary she is allowed to write in.
 *
 * Four questions, in the order a booking runs into them: when may she give a
 * slot away, how many may she give, what does she promise afterwards, and how
 * does she check the person ringing back is the person who booked.
 *
 * The week is the control `Bác sĩ` wrote (`../Week`), and it carries the same
 * decision: **a day that is on but carries no block of its own keeps the
 * clinic's opening hours**, and says so. Most clinics take bookings whenever
 * they are open, so most of this page needs no touching — and the day a
 * clinic changes its opening time, nothing here goes stale. Windows are only
 * for the exceptions: "sáng thứ Bảy thôi". The old version made every day
 * carry its hours written out, in a pair of native time inputs that were
 * system-blue and in English on a Vietnamese page.
 *
 * The four things a caller asks *after* the slot is held — cọc, huỷ, quên
 * hẹn, chờ lâu — are rows rather than a block of text fields, because closed
 * they read as the cheat-sheet they are: the question on the left, her answer
 * under it, and a dashed edge on the ones she still has no answer for.
 */
export function BookingSkill() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Giữ lịch hẹn')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const today = new Date().toISOString().slice(0, 10)

  const shut = closedDays(config)
  const days = bookableDays(draft.slot_rules)
  const blocks = toBlocks(draft.slot_rules)

  const setRule = (day: Weekday, patch: Partial<SlotRule>) => set('slot_rules', draft.slot_rules.map((r) => (r.day === day ? { ...r, ...patch } : r)))
  const setDays = (next: Weekday[]) =>
    set(
      'slot_rules',
      draft.slot_rules.map((r) => (next.includes(r.day) ? { ...r, enabled: true } : { ...r, enabled: false, windows: [] })),
    )
  const editBlock = (id: string, patch: Partial<TimeBlock>) => {
    const [day, i] = id.split(':').map(Number)
    const rule = draft.slot_rules.find((r) => r.day === day)
    if (!rule) return
    setRule(day as Weekday, { windows: rule.windows.map((w, j) => (j === i ? { ...w, ...patch } : w)) })
  }
  const removeBlock = (id: string) => {
    const [day, i] = id.split(':').map(Number)
    const rule = draft.slot_rules.find((r) => r.day === day)
    if (!rule) return
    setRule(day as Weekday, { windows: rule.windows.filter((_, j) => j !== i) })
  }
  const addBlock = (day: Weekday) => {
    const rule = draft.slot_rules.find((r) => r.day === day)
    if (!rule) return
    const h = clinicHours(config, day) ?? { from: '09:00', to: '17:00' }
    setRule(day, { windows: [...rule.windows, nextBlock(blocksOn(blocks, day).at(-1), h)] })
  }

  /** A window that promises a time the clinic is not open is the one real error on this page. */
  const problem = (b: TimeBlock): string | null => {
    if (b.from >= b.to) return 'Giờ kết thúc phải sau giờ bắt đầu.'
    const h = clinicHours(config, b.day)
    if (!h) return 'Phòng khám nghỉ ngày này.'
    if (b.from < h.from || b.to > h.to) return `Ngoài giờ mở cửa (${h.from}–${h.to}).`
    return null
  }
  const anyBad = blocks.some((b) => problem(b))

  const upcoming = config.holiday_exceptions
    .filter((h) => h.date_to >= today)
    .sort((a, b) => a.date_from.localeCompare(b.date_from))
    .slice(0, 3)

  /* One open policy row at a time — the same fold as every other list. */
  const [openId, setOpenId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  useEffect(() => {
    if (!closingId) return
    const t = window.setTimeout(() => setClosingId(null), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [closingId])
  const closeRow = (id: string) => {
    if (openId === id) {
      setClosingId(id)
      setOpenId(null)
    }
  }
  const toggle = (id: string) => {
    if (openId === id) return closeRow(id)
    if (openId) setClosingId(openId)
    setOpenId(id)
  }
  useEffect(() => {
    if (!openId) return
    const onPress = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Element) || t.closest('[data-popup]')) return
      if (document.querySelector(`[data-row-id="${CSS.escape(openId)}"]`)?.contains(t)) return
      closeRow(openId)
    }
    document.addEventListener('pointerdown', onPress, true)
    return () => document.removeEventListener('pointerdown', onPress, true)
    // `closeRow` is rebuilt every render; the effect only needs the one for this `openId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const answered = POLICIES.filter((p) => draft[p.key].trim()).length

  return (
    <SkillsSection
      title="Giữ lịch hẹn"
      lede={`Khách gọi để đặt lịch nhiều hơn mọi lý do khác. Trang này nói cho ${agent} biết được giữ chỗ vào lúc nào, bao nhiêu chỗ, và hứa gì với khách sau đó.`}
      rail={<TryPanel section="dat-lich" config={live} />}
      bar={
        <SaveBar
          {...d.bar}
          sub={anyBad ? 'Có khung giờ nằm ngoài giờ mở cửa — xem lại trước khi lưu.' : `${days.length} ngày nhận hẹn · ${draft.ai_bookable_slots_per_day} chỗ mỗi ngày · hẹn ${draft.slot_duration} phút`}
        />
      }
    >
      <Card title="Ngày và giờ nhận hẹn" subtitle={`khách hỏi "sáng thứ Bảy còn chỗ không"`}>
        <WeekdayPicker
          ariaLabel="Ngày nhận hẹn"
          value={days}
          onChange={setDays}
          off={shut}
          offTitle="Phòng khám nghỉ ngày này — sửa ở Kiến thức · Giờ mở cửa"
        />
        {days.length ? (
          <DayBlocks
            days={days}
            blocks={blocks}
            inherit={() => 'Theo giờ phòng khám'}
            problem={problem}
            onEdit={editBlock}
            onRemove={removeBlock}
            onAdd={addBlock}
          />
        ) : (
          <span className={ui.hint}>Chưa nhận hẹn ngày nào — {agent} ghi lời nhắn và hẹn nhân viên gọi lại.</span>
        )}
        <span className={ui.hint}>
          Ngày bật mà không thêm khung giờ thì {agent} nhận hẹn đúng giờ mở cửa. Chỉ thêm khung giờ cho ngày khác thường — sửa giờ mở cửa ở{' '}
          <a href={appHref('le-tan', 'kien-thuc', 'gio-mo-cua')}>Giờ mở cửa và ngày nghỉ</a>.
        </span>
        <Said who={agent}>{slotLine(live, agent)}</Said>
      </Card>

      <Card title="Bao nhiêu chỗ mỗi ngày" subtitle={`quá số này ${agent} ghi nhận để nhân viên xác nhận lại`}>
        <div className={ui.grid2}>
          <NumberField
            label={`Chỗ ${agent} tự giữ`}
            value={draft.ai_bookable_slots_per_day}
            onChange={(v) => set('ai_bookable_slots_per_day', v ?? 0)}
            min={0}
            max={50}
          />
          <SelectField
            label="Một hẹn kéo dài"
            value={String(draft.slot_duration)}
            onChange={(v) => set('slot_duration', Number(v))}
            options={SLOT_DURATION_OPTIONS.map((m) => ({ value: String(m), label: `${m} phút` }))}
            hint="Dịch vụ có thời lượng riêng ở bảng giá."
          />
          <SelectField
            label="Nghỉ giữa hai hẹn"
            value={String(draft.buffer_time)}
            onChange={(v) => set('buffer_time', Number(v))}
            options={BUFFER_OPTIONS.map((m) => ({ value: String(m), label: m === 0 ? 'Không' : `${m} phút` }))}
          />
          <NumberField
            label="Trần cả phòng khám"
            value={draft.max_bookings_per_day}
            onChange={(v) => set('max_bookings_per_day', v)}
            min={1}
            max={99}
            placeholder="không giới hạn"
            hint="Tính cả hẹn nhân viên tự ghi."
          />
        </div>
        <Said who={agent}>{limitLine(live)}</Said>
      </Card>

      <Card
        title="Ngày nghỉ sắp tới"
        subtitle={`${agent} không giữ lịch vào những ngày này`}
        actions={
          <a className={ui.linkButton} href={appHref('le-tan', 'kien-thuc', 'gio-mo-cua')}>
            Sửa ở Giờ mở cửa
          </a>
        }
      >
        {upcoming.length ? (
          <div className={styles.offdays}>
            {upcoming.map((h) => (
              <div key={h.id} className={styles.offday}>
                <span className={styles.offdayName}>{h.holiday_label || 'Ngày nghỉ'}</span>
                <span className={`${styles.offdayWhen} ${ui.num}`}>{h.date_from === h.date_to ? fmtDate(h.date_from) : `${fmtDate(h.date_from)} – ${fmtDate(h.date_to)}`}</span>
                <span className={styles.offdayWhat}>{h.closure_type === 'closed' ? 'Nghỉ cả ngày' : `Mở ${h.modified_hours?.from}–${h.modified_hours?.to}`}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className={ui.hint}>Không có ngày nghỉ nào sắp tới.</span>
        )}
        {upcoming[0] ? (
          <Said who={agent}>
            Dạ, phòng khám nghỉ {(upcoming[0].holiday_label || 'ngày này').toLowerCase()} đến hết {fmtDate(upcoming[0].date_to)}. Em giữ lịch cho anh chị vào ngày mở cửa lại nhé?
          </Said>
        ) : null}
      </Card>

      <Card title="Khách hỏi thêm về lịch hẹn" subtitle={answered ? `${answered}/${POLICIES.length} câu có câu trả lời riêng` : `chưa câu nào có câu trả lời riêng — ${agent} đang trả lời chung`}>
        <RowList>
          {POLICIES.map((p) => {
            const value = draft[p.key]
            const ideas = p.ideas.filter((i) => i !== value.trim())
            return (
              <ExpandRow
                key={p.key}
                rowId={p.key}
                open={openId === p.key}
                mounted={openId === p.key || closingId === p.key}
                unfilled={!value.trim()}
                onToggle={() => toggle(p.key)}
                summary={
                  <>
                    <RowText name={p.q} sub={policyLine(p, value)} />
                    {value.trim() ? null : (
                      <RowValue>
                        <RowMissing>trả lời chung</RowMissing>
                      </RowValue>
                    )}
                  </>
                }
              >
                <RowEdit>
                  <TextField compact aria-label={p.q} value={value} onChange={(e) => set(p.key, e.target.value)} placeholder={p.placeholder} maxLength={140} />
                  {ideas.length ? (
                    <Suggestions hint="bấm để dùng">
                      {ideas.map((i) => (
                        <Suggestion key={i} onClick={() => set(p.key, i)}>
                          {i}
                        </Suggestion>
                      ))}
                    </Suggestions>
                  ) : null}
                  <Said who={agent}>{policyLine(p, value)}</Said>
                </RowEdit>
              </ExpandRow>
            )
          })}
        </RowList>
      </Card>

      <Card title="Sau khi giữ chỗ" subtitle={`khách hỏi "có nhắn lại cho em không"`}>
        <div className={ui.stackTight}>
          <span className={ui.label}>Xác nhận qua</span>
          <Segmented<BookingConfirmationChannel>
            ariaLabel="Kênh xác nhận hẹn"
            value={draft.booking_confirmation_channel}
            onChange={(v) => set('booking_confirmation_channel', v)}
            options={CHANNELS.map((k) => ({ value: k, label: LABELS.confirmation[k] }))}
          />
          {draft.booking_confirmation_channel === 'zalo' ? <span className={ui.hint}>Zalo cần tài khoản OA — Fonnus sẽ hướng dẫn khi kết nối.</span> : null}
        </div>
        <Said who={agent}>{confirmLine(live)}</Said>

        <Disclosure title="Khách gọi lại hỏi lịch đã đặt" subtitle="quy tắc bảo vệ dữ liệu — chỉ siết thêm được, không nới ra">
          <div className={ui.stack}>
            <SelectField<IdentityVerificationRule>
              label={`${agent} kiểm tra bằng`}
              value={draft.identity_verification_rule}
              onChange={(v) => set('identity_verification_rule', v)}
              options={[
                { value: 'caller_id_date', label: 'Đúng số đã đặt + đúng ngày hẹn' },
                { value: 'caller_id_date_name', label: 'Thêm: đúng tên người đặt (chặt hơn)' },
              ]}
              hint={`${agent} không đọc lịch hẹn cho người gọi từ số lạ, dù trả lời đúng ngày.`}
            />
            <Said who={agent}>{identityLine(live)}</Said>
          </div>
        </Disclosure>
      </Card>
    </SkillsSection>
  )
}
