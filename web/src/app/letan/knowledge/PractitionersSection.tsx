import { Button } from '../../../design-system'
import { LABELS, WEEKDAY_SHORT } from '../defaults'
import type { Practitioner, PractitionerTitle } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, ChipButton, ChipInput, EmptyState, IconButton, Notice, NumberField, SaveBar, SelectField, SpeechBubble, Switch, TextField, ui } from '../../ui'
import { WeekdayPicker } from './HoursSection'
import styles from './Knowledge.module.css'

const KEYS = ['practitioner_roster'] as const

function blank(): Practitioner {
  return { id: newId('dr'), practitioner_name: '', title_credential: 'BS', specialties: [], years_experience: null, working_days: [1, 2, 3, 4, 5], working_hours_note: '', bookable_by_name: false, languages: ['Tiếng Việt'], practitioner_note: '' }
}

export function PractitionersSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Bác sĩ')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const specialtyIdeas = config.service_catalog.map((s) => s.service_name).slice(0, 8)

  const setRow = (id: string, patch: Partial<Practitioner>) => set('practitioner_roster', draft.practitioner_roster.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const first = draft.practitioner_roster.find((p) => p.practitioner_name.trim())

  return (
    <>
      <SectionHead
        title="Bác sĩ"
        badge={draft.practitioner_roster.length ? { tone: 'success', label: `${draft.practitioner_roster.length} bác sĩ` } : { tone: 'neutral', label: 'Không bắt buộc' }}
        actions={
          <Button size="sm" variant="secondary" onClick={() => set('practitioner_roster', [...draft.practitioner_roster, blank()])}>
            + Thêm bác sĩ
          </Button>
        }
      />

      <Notice tone="neutral" icon="stethoscope">
        Khách Việt hay hỏi đích danh: "bác sĩ Hùng hôm nay có ở phòng khám không?". Có danh sách này, {agent} trả lời được ngày làm việc và chuyên môn — và nghe đúng tên bác sĩ khi khách nói.
      </Notice>

      {draft.practitioner_roster.length ? (
        <div className={styles.pracGrid}>
          {draft.practitioner_roster.map((p) => (
            <Card
              key={p.id}
              title={p.practitioner_name ? `${p.title_credential} ${p.practitioner_name}` : 'Bác sĩ mới'}
              actions={<IconButton name="trash-2" label="Xoá bác sĩ" danger onClick={() => set('practitioner_roster', draft.practitioner_roster.filter((x) => x.id !== p.id))} />}
            >
              <div className={ui.grid2}>
                <SelectField<PractitionerTitle> label="Chức danh" value={p.title_credential} onChange={(v) => setRow(p.id, { title_credential: v })} options={LABELS.titles.map((t) => ({ value: t, label: t }))} />
                <TextField label="Tên" value={p.practitioner_name} onChange={(e) => setRow(p.id, { practitioner_name: e.target.value })} placeholder="Nguyễn Văn Hùng" hint="Như khách gọi." />
              </div>
              <div className={ui.stackTight}>
                <span className={ui.labelMuted}>Chuyên môn</span>
                <ChipInput value={p.specialties} onChange={(v) => setRow(p.id, { specialties: v })} placeholder="VD: Chỉnh nha" />
                <div className={ui.row}>
                  {specialtyIdeas.filter((s) => !p.specialties.includes(s)).slice(0, 5).map((s) => (
                    <ChipButton key={s} onClick={() => setRow(p.id, { specialties: [...p.specialties, s] })}>
                      + {s}
                    </ChipButton>
                  ))}
                </div>
              </div>
              <div className={ui.stackTight}>
                <span className={ui.labelMuted}>Ngày có mặt</span>
                <div className={ui.row}>
                  <WeekdayPicker ariaLabel="Ngày làm việc" value={p.working_days} onChange={(v) => setRow(p.id, { working_days: v })} />
                  <TextField compact aria-label="Giờ riêng" value={p.working_hours_note} onChange={(e) => setRow(p.id, { working_hours_note: e.target.value })} placeholder="Giờ riêng, VD: chỉ buổi sáng" style={{ flex: 1, minWidth: 160 }} />
                </div>
              </div>
              <div className={ui.grid2}>
                <NumberField label="Số năm kinh nghiệm" value={p.years_experience} onChange={(v) => setRow(p.id, { years_experience: v })} max={60} hint="Chỉ nói khi khách hỏi." />
                <div className={ui.stackTight}>
                  <span className={ui.labelMuted}>Ngôn ngữ</span>
                  <ChipInput value={p.languages} onChange={(v) => setRow(p.id, { languages: v })} placeholder="VD: English" />
                </div>
              </div>
              <TextField label="Một dòng giới thiệu" value={p.practitioner_note} onChange={(e) => setRow(p.id, { practitioner_note: e.target.value })} placeholder="VD: Tu nghiệp tại Hàn Quốc" maxLength={120} />
              <Switch
                lined
                label={`${agent} được hẹn đích danh bác sĩ này`}
                hint={p.bookable_by_name ? `Bật: ${agent} ghi nhận yêu cầu gặp ${p.practitioner_name || 'bác sĩ'} nhưng nói rõ phòng khám sẽ xác nhận lại — chưa có lịch riêng từng bác sĩ.` : `Tắt (mặc định): ${agent} giữ hẹn chung, không hứa đích danh bác sĩ.`}
                checked={p.bookable_by_name}
                onChange={(v) => setRow(p.id, { bookable_by_name: v })}
              />
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có bác sĩ nào" action={<Button size="sm" onClick={() => set('practitioner_roster', [blank()])}>+ Thêm bác sĩ đầu tiên</Button>}>
          Không bắt buộc. Có danh sách, {agent} trả lời được "bác sĩ nào làm implant" và "hôm nay ai trực".
        </EmptyState>
      )}

      {first ? (
        <SpeechBubble who={`${agent} nói — ví dụ`} speak text={`${first.title_credential} ${first.practitioner_name} làm việc ${first.working_days.length ? first.working_days.map((w) => WEEKDAY_SHORT[w]).join(', ') : 'theo lịch'}${first.working_hours_note ? `, ${first.working_hours_note.toLowerCase()}` : ''} ạ.${first.specialties.length ? ` Bác sĩ phụ trách ${first.specialties.join(', ').toLowerCase()}.` : ''}`}>
          {first.title_credential} {first.practitioner_name} làm việc {first.working_days.length ? first.working_days.map((w) => WEEKDAY_SHORT[w]).join(', ') : 'theo lịch'}
          {first.working_hours_note ? `, ${first.working_hours_note.toLowerCase()}` : ''} ạ.{first.specialties.length ? ` Bác sĩ phụ trách ${first.specialties.join(', ').toLowerCase()}.` : ''}
        </SpeechBubble>
      ) : null}

      <SaveBar dirty={d.dirty} saving={d.saving} onSave={d.save} onCancel={d.cancel} sub="Bác sĩ · tên bác sĩ cũng được thêm vào Từ hay nghe nhầm" />
    </>
  )
}
