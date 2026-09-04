import { Icon } from '../../../design-system'
import { LABELS } from '../defaults'
import type { Practitioner, PractitionerTitle } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { Card, ChipButton, ChipInput, EmptyState, IconButton, NumberField, SaveBar, SelectField, Switch, TextField, ui } from '../../ui'
import { WeekdayPicker } from './HoursSection'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

const KEYS = ['practitioner_roster'] as const

function blank(): Practitioner {
  return {
    id: newId('dr'),
    practitioner_name: '',
    title_credential: 'BS',
    specialties: [],
    years_experience: null,
    working_days: [1, 2, 3, 4, 5],
    working_hours_note: '',
    bookable_by_name: false,
    languages: ['Tiếng Việt'],
    practitioner_note: '',
  }
}

/**
 * `#/app/le-tan/kien-thuc/bac-si` — who works here.
 *
 * Vietnamese callers ask for a doctor by name. One card per doctor, stacked
 * in the work column; ask the try-out panel for one and she reads the card.
 */
export function PractitionersSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Bác sĩ')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const specialtyIdeas = config.service_catalog.map((s) => s.service_name).slice(0, 8)

  const setRow = (id: string, patch: Partial<Practitioner>) => set('practitioner_roster', draft.practitioner_roster.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const add = () => {
    const row = blank()
    set('practitioner_roster', [...draft.practitioner_roster, row])
  }

  return (
    <KnowledgeSection
      title="Bác sĩ"
      lede={`Khách Việt hay hỏi đích danh: "bác sĩ Hùng hôm nay có ở phòng khám không?". Có danh sách này, ${agent} trả lời được ngày làm việc và chuyên môn — và nghe đúng tên bác sĩ khi khách nói.`}
      rail={<TryPanel section="bac-si" config={live} />}
      bar={<SaveBar {...d.bar} sub="Bác sĩ · tên bác sĩ cũng được thêm vào Từ hay nghe nhầm" />}
    >
      {draft.practitioner_roster.length ? (
        draft.practitioner_roster.map((p) => (
          <div key={p.id}>
            <Card
              title={p.practitioner_name ? `${p.title_credential} ${p.practitioner_name}` : 'Bác sĩ mới'}
              actions={<IconButton name="trash" label="Xoá bác sĩ" danger onClick={() => set('practitioner_roster', draft.practitioner_roster.filter((x) => x.id !== p.id))} />}
            >
              <div className={ui.grid2}>
                <SelectField<PractitionerTitle> label="Chức danh" value={p.title_credential} onChange={(v) => setRow(p.id, { title_credential: v })} options={LABELS.titles.map((t) => ({ value: t, label: t }))} />
                <TextField label="Tên" value={p.practitioner_name} onChange={(e) => setRow(p.id, { practitioner_name: e.target.value })} placeholder="Nguyễn Văn Hùng" hint="Như khách gọi." />
              </div>
              <div className={ui.stackTight}>
                <span className={ui.labelMuted}>Chuyên môn</span>
                <ChipInput value={p.specialties} onChange={(v) => setRow(p.id, { specialties: v })} placeholder="VD: Chỉnh nha" />
                <div className={ui.row}>
                  {specialtyIdeas
                    .filter((s) => !p.specialties.includes(s))
                    .slice(0, 5)
                    .map((s) => (
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
                  <TextField
                    compact
                    aria-label="Giờ riêng"
                    value={p.working_hours_note}
                    onChange={(e) => setRow(p.id, { working_hours_note: e.target.value })}
                    placeholder="Giờ riêng, VD: chỉ buổi sáng"
                    style={{ flex: 1, minWidth: 160 }}
                  />
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
                hint={
                  p.bookable_by_name
                    ? `Bật: ${agent} ghi nhận yêu cầu gặp ${p.practitioner_name || 'bác sĩ'} nhưng nói rõ phòng khám sẽ xác nhận lại — chưa có lịch riêng từng bác sĩ.`
                    : `Tắt: ${agent} giữ hẹn chung, không hứa đích danh bác sĩ.`
                }
                checked={p.bookable_by_name}
                onChange={(v) => setRow(p.id, { bookable_by_name: v })}
              />
            </Card>
          </div>
        ))
      ) : (
        <Card>
          <EmptyState title="Chưa có bác sĩ nào">Có danh sách, {agent} trả lời được "bác sĩ nào làm implant" và "hôm nay ai trực".</EmptyState>
        </Card>
      )}

      <button type="button" className={styles.idea} onClick={add}>
        <span className={styles.ideaPlus}>
          <Icon name="plus" size={14} />
        </span>
        <span>{draft.practitioner_roster.length ? 'Thêm bác sĩ' : 'Thêm bác sĩ đầu tiên'}</span>
      </button>
    </KnowledgeSection>
  )
}
