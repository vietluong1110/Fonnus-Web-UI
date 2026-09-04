import { Badge } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { BUFFER_OPTIONS, LABELS, SLOT_DURATION_OPTIONS, WEEKDAYS, WEEKDAY_LONG } from '../defaults'
import type { BookingConfirmationChannel, IdentityVerificationRule, SlotRule, Weekday } from '../model'
import { useConfig, useDraft } from '../store'
import { Card, GateTag, Notice, NumberField, SaveBar, SelectField, SpeechBubble, Switch, TextField, ui } from '../../ui'
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

const fmt = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')

export function BookingSkill() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Kỹ năng đặt lịch hẹn')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const today = new Date().toISOString().slice(0, 10)

  const hoursFor = (day: Weekday) => config.operating_hours_by_weekday.find((h) => h.day === day)
  const setRule = (day: Weekday, patch: Partial<SlotRule>) => set('slot_rules', draft.slot_rules.map((r) => (r.day === day ? { ...r, ...patch } : r)))
  const setWindow = (day: Weekday, i: number, patch: Partial<{ from: string; to: string }>) => {
    const rule = draft.slot_rules.find((r) => r.day === day)!
    setRule(day, { windows: rule.windows.map((w, j) => (j === i ? { ...w, ...patch } : w)) })
  }
  const windowBad = (day: Weekday, w: { from: string; to: string }) => {
    const h = hoursFor(day)
    if (w.from >= w.to) return 'Giờ kết thúc phải sau giờ bắt đầu.'
    if (h && h.open && (w.from < h.from || w.to > h.to)) return `Ngoài giờ làm việc (${h.from}–${h.to}).`
    if (h && !h.open) return 'Phòng khám nghỉ ngày này.'
    return null
  }
  const anyBad = draft.slot_rules.some((r) => r.enabled && r.windows.some((w) => windowBad(r.day, w)))

  const upcoming = config.holiday_exceptions.filter((h) => h.date_to >= today).sort((a, b) => a.date_from.localeCompare(b.date_from)).slice(0, 4)
  const example = config.service_catalog.find((s) => s.is_bookable && s.price_from) ?? config.service_catalog[0]
  const line = example
    ? `${example.service_name} tại phòng khám ${example.price_from ? `từ ${(example.price_from / 1000).toLocaleString('vi-VN')} nghìn` : 'bác sĩ báo giá sau khám'}. Anh chị muốn em giữ lịch 9 giờ sáng thứ Bảy không ạ?${draft.deposit_policy.trim() ? ` ${draft.deposit_policy.trim()}.` : ''}`
    : ''

  return (
    <>
      <Card gate="O" title="Khung giờ nhận hẹn trong tuần" subtitle={`${agent} chỉ tự giữ lịch trong các khung này`}>
        <div>
          {WEEKDAYS.map((day) => {
            const rule = draft.slot_rules.find((r) => r.day === day)!
            const h = hoursFor(day)
            return (
              <div key={day} className={styles.slotRow}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{WEEKDAY_LONG[day]}</span>
                <Switch checked={rule.enabled} onChange={(v) => setRule(day, { enabled: v, windows: v && !rule.windows.length && h?.open ? [{ from: h.from, to: h.to }] : rule.windows })} ariaLabel={`Nhận hẹn ${WEEKDAY_LONG[day]}`} disabled={!h?.open} />
                {!h?.open ? (
                  <span className={ui.hint}>Phòng khám nghỉ — sửa ở Kiến thức · Giờ làm việc</span>
                ) : rule.enabled ? (
                  <div className={styles.windows}>
                    {rule.windows.map((w, i) => {
                      const bad = windowBad(day, w)
                      return (
                        <span key={i} className={`${styles.window} ${bad ? styles.windowBad : ''}`} title={bad ?? undefined}>
                          <input type="time" step={300} className={styles.windowInput} value={w.from} onChange={(e) => setWindow(day, i, { from: e.target.value })} aria-label="Từ" />
                          <span className={ui.muted}>–</span>
                          <input type="time" step={300} className={styles.windowInput} value={w.to} onChange={(e) => setWindow(day, i, { to: e.target.value })} aria-label="Đến" />
                          <button type="button" className={styles.windowRemove} aria-label="Bỏ khung giờ" onClick={() => setRule(day, { windows: rule.windows.filter((_, j) => j !== i) })}>
                            ✕
                          </button>
                        </span>
                      )
                    })}
                    <button type="button" className={styles.addWindow} onClick={() => setRule(day, { windows: [...rule.windows, { from: rule.windows.length ? rule.windows[rule.windows.length - 1].to : (h?.from ?? '09:00'), to: h?.to ?? '17:00' }] })}>
                      + Thêm
                    </button>
                  </div>
                ) : (
                  <span className={ui.hint}>Không nhận hẹn — {agent} ghi lời nhắn và hẹn gọi lại</span>
                )}
              </div>
            )
          })}
        </div>
        <span className={ui.hint}>Bật/tắt từng ngày và thêm khung giờ riêng cho ngày đó. Giờ nhận hẹn phải nằm trong giờ làm việc của phòng khám.</span>

        <div className={ui.grid2} style={{ paddingTop: 4 }}>
          <NumberField label="Số chỗ mỗi ngày" gate="R2" value={draft.ai_bookable_slots_per_day} onChange={(v) => set('ai_bookable_slots_per_day', v ?? 0)} min={0} max={50} hint={`${agent} chỉ tự xác nhận trong số chỗ này.`} />
          <SelectField label="Thời lượng một hẹn" gate="R2" value={String(draft.slot_duration)} onChange={(v) => set('slot_duration', Number(v))} options={SLOT_DURATION_OPTIONS.map((m) => ({ value: String(m), label: `${m} phút` }))} hint="Dịch vụ có thời lượng riêng ở bảng giá." />
          <SelectField label="Nghỉ giữa hai hẹn" value={String(draft.buffer_time)} onChange={(v) => set('buffer_time', Number(v))} options={BUFFER_OPTIONS.map((m) => ({ value: String(m), label: m === 0 ? 'Không' : `${m} phút` }))} />
          <NumberField label="Tối đa mỗi ngày" value={draft.max_bookings_per_day} onChange={(v) => set('max_bookings_per_day', v)} min={1} max={99} placeholder="không giới hạn" hint="Trần cứng, tính cả hẹn nhân viên tự ghi." />
        </div>
      </Card>

      <Card title="Ngày nghỉ và ngoại lệ" subtitle="lấy từ Kiến thức · Lịch nghỉ — sửa ở đó" actions={<a className={ui.linkButton} href={appHref('le-tan', 'kien-thuc', 'ngay-nghi')}>Mở Lịch nghỉ</a>}>
        {upcoming.length ? (
          <div>
            {upcoming.map((h) => (
              <div key={h.id} className={ui.kv}>
                <span className={ui.kvKey} style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {h.holiday_label || 'Ngày nghỉ'}
                </span>
                <span className={`${ui.kvVal} ${ui.num}`}>
                  {h.date_from === h.date_to ? fmt(h.date_from) : `${fmt(h.date_from)} – ${fmt(h.date_to)}`}
                  {'  '}
                  <Badge tone={h.closure_type === 'closed' ? 'terracotta' : 'neutral'} style={{ marginLeft: 10 }}>
                    {h.closure_type === 'closed' ? 'Cả ngày' : `${h.modified_hours?.from} – ${h.modified_hours?.to}`}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className={ui.hint}>Không có ngày nghỉ sắp tới.</span>
        )}
        {upcoming[0] ? (
          <SpeechBubble who={`${agent} nói`}>
            Phòng khám nghỉ {upcoming[0].holiday_label.toLowerCase()} đến hết {fmt(upcoming[0].date_to)}. Em đặt lịch cho anh chị vào ngày mở cửa lại nhé?
          </SpeechBubble>
        ) : null}
      </Card>

      <Card title="Xác nhận với khách">
        <div className={ui.grid2}>
          <SelectField<BookingConfirmationChannel>
            label="Kênh xác nhận"
            gate="R2"
            value={draft.booking_confirmation_channel}
            onChange={(v) => set('booking_confirmation_channel', v)}
            options={(['sms', 'zalo', 'none'] as BookingConfirmationChannel[]).map((k) => ({ value: k, label: LABELS.confirmation[k] }))}
            hint={draft.booking_confirmation_channel === 'zalo' ? 'Zalo cần tài khoản OA — Fonnus sẽ hướng dẫn khi kết nối.' : undefined}
          />
          <TextField label="Đặt cọc" value={draft.deposit_policy} onChange={(e) => set('deposit_policy', e.target.value)} placeholder="VD: Không cần đặt cọc" />
          <TextField label="Chính sách huỷ" value={draft.cancellation_policy} onChange={(e) => set('cancellation_policy', e.target.value)} placeholder="VD: Huỷ trước 2 tiếng, không mất phí" />
          <TextField label="Khách không đến" value={draft.no_show_policy} onChange={(e) => set('no_show_policy', e.target.value)} placeholder={`VD: Không phạt — ${agent} gọi nhắc lại hôm sau`} />
          <TextField className={ui.span2} label="Thời gian chờ tại phòng khám" value={draft.waiting_time_expectation} onChange={(e) => set('waiting_time_expectation', e.target.value)} placeholder="VD: Thường chờ 10 – 15 phút" hint={`${agent} nói trước để khách khỏi bất ngờ.`} />
        </div>

        <div className={ui.stackTight}>
          <SelectField<IdentityVerificationRule>
            label={
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                Khách hỏi lại lịch đã đặt <GateTag gate="SW" />
              </span>
            }
            value={draft.identity_verification_rule}
            onChange={(v) => set('identity_verification_rule', v)}
            options={[
              { value: 'caller_id_date', label: 'Gọi từ đúng số đã đặt + nói đúng ngày hẹn (mặc định)' },
              { value: 'caller_id_date_name', label: 'Thêm: nói đúng tên người đặt (chặt hơn)' },
            ]}
          />
          <Notice tone="neutral" icon="privacy">
            Quy tắc bảo vệ dữ liệu cá nhân — chỉ siết chặt thêm được, không nới lỏng. {agent} không đọc lịch hẹn cho người gọi từ số lạ.
          </Notice>
        </div>

        {line ? (
          <SpeechBubble who={`${agent} nói`} speak text={line}>
            {line}
          </SpeechBubble>
        ) : null}
      </Card>

      <SaveBar {...d.bar} sub={anyBad ? 'Có khung giờ nằm ngoài giờ làm việc — kiểm tra lại trước khi lưu.' : `${draft.ai_bookable_slots_per_day} chỗ mỗi ngày · hẹn ${draft.slot_duration} phút · xác nhận qua ${LABELS.confirmation[draft.booking_confirmation_channel]}`} />
    </>
  )
}
