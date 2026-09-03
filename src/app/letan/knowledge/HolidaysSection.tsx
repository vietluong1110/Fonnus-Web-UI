import { Badge, Button } from '../../../design-system'
import type { ClosureType, HolidayException } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, DateField, EmptyState, IconButton, Notice, SaveBar, SelectField, SpeechBubble, TableHead, TableRow, TextField, TimeField, ui } from '../../ui'

const KEYS = ['holiday_exceptions', 'holidays_confirmed'] as const
const COLS = '1.3fr 150px 150px 170px 190px 32px'

const fmt = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '…')

export function HolidaysSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Lịch nghỉ Tết và ngày lễ')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const today = new Date().toISOString().slice(0, 10)

  const rows = [...draft.holiday_exceptions].sort((a, b) => a.date_from.localeCompare(b.date_from))
  const setRow = (id: string, patch: Partial<HolidayException>) => set('holiday_exceptions', draft.holiday_exceptions.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  const tet = rows.find((h) => /tết nguyên đán/i.test(h.holiday_label))
  const next = rows.find((h) => h.date_to >= today)

  const save = () => d.save({ holidays_confirmed: true })

  return (
    <>
      <SectionHead title="Lịch nghỉ Tết và ngày lễ" badge={draft.holidays_confirmed ? { tone: 'success', label: 'Đủ' } : { tone: 'warning', label: 'Cần xác nhận' }} />

      {!draft.holidays_confirmed ? (
        <Notice tone="warm" icon="calendar-days">
          Fonnus điền sẵn ngày lễ Việt Nam. Tết là ngày hay bị hỏi nhất — kiểm tra ngày nghỉ Tết của phòng khám rồi bấm Lưu.
        </Notice>
      ) : null}

      <Card
        gate="R2"
        title="Ngày nghỉ"
        subtitle={`${agent} báo khách ngày mở cửa lại và không đặt hẹn vào ngày nghỉ`}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              set('holiday_exceptions', [
                ...draft.holiday_exceptions,
                { id: newId('hol'), holiday_label: '', date_from: today, date_to: today, closure_type: 'closed', modified_hours: null, seeded: false },
              ])
            }
          >
            + Thêm ngày nghỉ
          </Button>
        }
      >
        {rows.length ? (
          <div style={{ overflowX: 'auto', margin: '0 -24px', padding: '0 24px' }}>
            <div style={{ minWidth: 860 }}>
              <TableHead columns={COLS}>
                <span>Tên</span>
                <span>Từ ngày</span>
                <span>Đến ngày</span>
                <span>Đóng cửa</span>
                <span>Giờ nếu mở một phần</span>
                <span />
              </TableHead>
              {rows.map((h) => {
                const past = h.date_to < today
                return (
                  <TableRow key={h.id} columns={COLS} style={{ opacity: past ? 0.55 : 1 }}>
                    <div className={ui.row} style={{ flexWrap: 'nowrap' }}>
                      <TextField compact aria-label="Tên ngày nghỉ" value={h.holiday_label} onChange={(e) => setRow(h.id, { holiday_label: e.target.value })} placeholder="Nghỉ Tết" style={{ flex: 1 }} />
                      {h.seeded ? (
                        <Badge tone="neutral" title="Fonnus gợi ý sẵn">
                          gợi ý
                        </Badge>
                      ) : null}
                    </div>
                    <DateField compact aria-label="Từ ngày" value={h.date_from} onChange={(v) => setRow(h.id, { date_from: v, date_to: h.date_to < v ? v : h.date_to })} />
                    <DateField compact aria-label="Đến ngày" value={h.date_to} onChange={(v) => setRow(h.id, { date_to: v })} min={h.date_from} />
                    <SelectField<ClosureType>
                      compact
                      aria-label="Kiểu đóng cửa"
                      value={h.closure_type}
                      onChange={(v) => setRow(h.id, { closure_type: v, modified_hours: v === 'modified' ? (h.modified_hours ?? { from: '08:00', to: '12:00' }) : null })}
                      options={[
                        { value: 'closed', label: 'Nghỉ cả ngày' },
                        { value: 'modified', label: 'Mở một phần' },
                      ]}
                    />
                    {h.closure_type === 'modified' && h.modified_hours ? (
                      <div className={ui.row} style={{ flexWrap: 'nowrap', gap: 6 }}>
                        <TimeField compact aria-label="Mở" value={h.modified_hours.from} onChange={(v) => setRow(h.id, { modified_hours: { from: v, to: h.modified_hours!.to } })} />
                        <span className={ui.muted}>–</span>
                        <TimeField compact aria-label="Đóng" value={h.modified_hours.to} onChange={(v) => setRow(h.id, { modified_hours: { from: h.modified_hours!.from, to: v } })} />
                      </div>
                    ) : (
                      <span className={ui.hint}>—</span>
                    )}
                    <IconButton name="trash-2" label="Xoá" danger onClick={() => set('holiday_exceptions', draft.holiday_exceptions.filter((x) => x.id !== h.id))} />
                  </TableRow>
                )
              })}
            </div>
          </div>
        ) : (
          <EmptyState title="Chưa có ngày nghỉ">Thêm Tết và các ngày lễ để {agent} không hẹn khách vào ngày phòng khám đóng cửa.</EmptyState>
        )}
        <span className={ui.hint}>Ngày nghỉ đã qua mờ đi và tự bỏ khỏi lịch. Mục Kỹ năng · Đặt lịch hẹn dùng chung danh sách này.</span>
      </Card>

      {next ? (
        <SpeechBubble who={`${agent} nói — ví dụ`} speak text={`Phòng khám nghỉ ${next.holiday_label || 'lễ'} ${next.date_from === next.date_to ? `ngày ${fmt(next.date_from)}` : `từ ${fmt(next.date_from)} đến hết ${fmt(next.date_to)}`}. Em đặt lịch cho anh chị vào ngày mở cửa lại nhé?`}>
          Phòng khám nghỉ {next.holiday_label || 'lễ'} {next.date_from === next.date_to ? `ngày ${fmt(next.date_from)}` : `từ ${fmt(next.date_from)} đến hết ${fmt(next.date_to)}`}. Em đặt lịch cho anh chị vào ngày mở cửa lại nhé?
        </SpeechBubble>
      ) : null}

      <SaveBar
        {...d.bar}
        dirty={d.dirty || !draft.holidays_confirmed}
        onSave={save}
        label={draft.holidays_confirmed ? 'Bạn có thay đổi chưa lưu' : 'Xác nhận lịch nghỉ'}
        sub={tet ? `Tết ${fmt(tet.date_from)} – ${fmt(tet.date_to)} · ${rows.length} ngày nghỉ` : 'Chưa có ngày Tết trong danh sách.'}
      />
    </>
  )
}
