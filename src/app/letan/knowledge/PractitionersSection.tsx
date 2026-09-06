import { useEffect, useState } from 'react'
import { Icon } from '../../../design-system'
import { LABELS, WEEKDAYS, WEEKDAY_LONG, WEEKDAY_SHORT } from '../defaults'
import type { Practitioner, PractitionerGender, PractitionerTitle, Weekday } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import {
  AddButton,
  Card,
  ChipInput,
  DeleteButton,
  EmptyState,
  ExpandRow,
  FieldFrame,
  FOLD_MS,
  NumberField,
  RowEdit,
  RowEditFoot,
  RowEditLabel,
  RowEditRow,
  RowList,
  RowMark,
  RowMeta,
  RowMissing,
  RowSwitch,
  RowText,
  RowValue,
  Said,
  SaveBar,
  Segmented,
  SelectField,
  TextField,
  rowStyles,
  ui,
  useAppear,
} from '../../ui'
import { DayBlocks, WeekdayPicker, nextBlock } from '../Week'
import { practitionerSentence, shiftsOn, workingDaysSaid, workingHoursNote } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

const KEYS = ['practitioner_roster'] as const

function blank(): Practitioner {
  return {
    id: newId('dr'),
    practitioner_name: '',
    title_credential: 'BS',
    practitioner_gender: '',
    specialties: [],
    years_experience: null,
    working_days: [1, 2, 3, 4, 5],
    working_hours_note: '',
    working_shifts: [],
    bookable_by_name: false,
    languages: ['Tiếng Việt'],
    practitioner_note: '',
  }
}

/**
 * Two letters from a Vietnamese name: the family name and the given name —
 * "Nguyễn Văn Hùng" → "NH", the way the owner would write it on a rota. One
 * word gives one letter; no name at all gives the icon instead.
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * The doctor's week in the value column, drawn rather than written.
 *
 * Seven cells in the day picker's own shapes, so the row and the control that
 * changes it say the same thing; today is underlined, which turns the roster
 * read down one column into "ai trực hôm nay". The whole strip is one label
 * to a screen reader — seven letters read out one at a time say nothing.
 */
function WeekStrip({ days, today }: { days: Weekday[]; today: Weekday }) {
  const said = workingDaysSaid(days)
  return (
    <span className={styles.week} role="img" aria-label={said ? `Có mặt ${said}` : 'Chưa chọn ngày làm việc'}>
      {WEEKDAYS.map((d) => (
        <span key={d} className={`${styles.weekDay} ${days.includes(d) ? styles.weekOn : ''} ${d === today ? styles.weekToday : ''}`} aria-hidden="true">
          {WEEKDAY_SHORT[d]}
        </span>
      ))}
    </span>
  )
}

/**
 * The practitioner's week: the day picker, then a line per day they are in.
 *
 * A ticked day with no block keeps the clinic's own hours and says so — most
 * of a roster is exactly that, so most of this control needs no touching.
 * A day only grows blocks when the owner presses "+ khung giờ", and a doctor
 * who is in twice on a Monday simply has two.
 */
function Schedule({ p, onChange, agent }: { p: Practitioner; onChange: (patch: Partial<Practitioner>) => void; agent: string }) {
  const days = WEEKDAYS.filter((d) => p.working_days.includes(d))
  const shifts = p.working_shifts ?? []

  // Turning a day off takes its blocks with it: a block on a day she is not
  // in is a contradiction the sentence below would have to explain away.
  const setDays = (v: Weekday[]) => onChange({ working_days: v, working_shifts: shifts.filter((s) => v.includes(s.day)) })

  return (
    <div className={ui.stackTight}>
      <RowEditLabel>Ngày có mặt</RowEditLabel>
      <WeekdayPicker ariaLabel="Ngày làm việc" value={p.working_days} onChange={setDays} />
      {days.length ? (
        <DayBlocks
          days={days}
          blocks={shifts}
          inherit={() => 'Theo giờ phòng khám'}
          onEdit={(id, patch) => onChange({ working_shifts: shifts.map((s) => (s.id === id ? { ...s, ...patch } : s)) })}
          onRemove={(id) => onChange({ working_shifts: shifts.filter((s) => s.id !== id) })}
          onAdd={(day) => onChange({ working_shifts: [...shifts, { id: newId('sh'), day, ...nextBlock(shiftsOn(p, day).at(-1), { from: '08:00', to: '12:00' }) }] })}
        />
      ) : (
        <span className={ui.hint}>Chưa chọn ngày nào — {agent} sẽ nói bác sĩ chưa có lịch cố định.</span>
      )}
    </div>
  )
}

/**
 * `#/app/le-tan/kien-thuc/bac-si` — who works here, and when.
 *
 * Vietnamese callers ask for a doctor by name and by day: "bác sĩ Hùng hôm
 * nay có làm không?". So the page is the staff board, not a form — a row per
 * doctor with their monogram, their name as a caller says it, what they do,
 * and their week drawn as seven cells with today underlined. Nine fields per
 * doctor made three doctors a page of twenty-seven controls with nothing to
 * scan; now the roster reads in one glance and the fields are one press away.
 *
 * Hours are per day and per block (`Schedule`), because a doctor is in from
 * 3 to 5 on a Monday and 9 to 10 on a Tuesday and one free-text line could
 * never carry that. The catalogue's `working_hours_note` is written *from*
 * those blocks on every edit rather than typed, so the backend still gets
 * its sentence.
 *
 * The row ends in the sentence she would actually say about that doctor, so
 * "what does this row do" is answered before the try-out rail is touched.
 */
export function PractitionersSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Bác sĩ')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const today = new Date().getDay() as Weekday
  const roster = draft.practitioner_roster
  const specialtyIdeas = config.service_catalog.map((s) => s.service_name.trim()).filter(Boolean)

  /*
   * One open row, the same way the price list holds one: `closingId` keeps the
   * row that just closed mounted for a fold so it can animate shut, and
   * `fresh` is the doctors added on this visit, whose name takes focus.
   */
  const [openId, setOpenId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string[]>([])
  useEffect(() => {
    if (!closingId) return
    const t = window.setTimeout(() => setClosingId(null), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [closingId])
  const close = (id: string) => {
    if (openId === id) {
      setClosingId(id)
      setOpenId(null)
    }
  }
  const openRow = (id: string) => {
    if (openId && openId !== id) setClosingId(openId)
    setOpenId(id)
  }
  const toggle = (id: string) => (openId === id ? close(id) : openRow(id))

  // A press anywhere outside the open row shuts it — there is no "done"
  // button, the save bar is already up. A pop-up belongs to the row that
  // opened it, wherever the portal put it.
  useEffect(() => {
    if (!openId) return
    const onPress = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Element) || t.closest('[data-popup]')) return
      if (document.querySelector(`[data-row-id="${CSS.escape(openId)}"]`)?.contains(t)) return
      close(openId)
    }
    document.addEventListener('pointerdown', onPress, true)
    return () => document.removeEventListener('pointerdown', onPress, true)
    // `close` is rebuilt every render; the effect only needs the one for this `openId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const rows = useAppear(roster.map((p) => p.id))
  /**
   * Every write goes through here, so `working_hours_note` is rewritten from
   * the blocks on every edit and the catalogue's column can never fall out of
   * step with what the UI shows.
   */
  const setRow = (id: string, patch: Partial<Practitioner>) =>
    set(
      'practitioner_roster',
      roster.map((p) => {
        if (p.id !== id) return p
        const next = { ...p, ...patch }
        return { ...next, working_hours_note: workingHoursNote(next) }
      }),
    )
  const add = () => {
    const row = blank()
    set('practitioner_roster', [...roster, { ...row, working_hours_note: workingHoursNote(row) }])
    setFresh((f) => [...f, row.id])
    openRow(row.id)
  }
  const remove = (id: string) => {
    close(id)
    rows.leave(id, () => set('practitioner_roster', (list) => list.filter((p) => p.id !== id)))
  }

  const named = roster.filter((p) => p.practitioner_name.trim()).length

  return (
    <KnowledgeSection
      title="Bác sĩ"
      lede={`Khách Việt hay hỏi đích danh: "bác sĩ Hùng hôm nay có ở phòng khám không?". Có danh sách này, ${agent} trả lời được ngày giờ có mặt và chuyên môn.`}
      rail={<TryPanel section="bac-si" config={live} />}
      bar={<SaveBar {...d.bar} sub="Bác sĩ · tên bác sĩ cũng được thêm vào Từ hay nghe nhầm" />}
    >
      <Card
        title="Bác sĩ của phòng khám"
        subtitle={roster.length ? `${named}/${roster.length} bác sĩ có tên · hôm nay ${WEEKDAY_LONG[today].toLowerCase()}` : `${agent} đọc tên, chuyên môn và ngày giờ có mặt`}
        actions={<AddButton label="Thêm bác sĩ" onClick={add} />}
      >
        {roster.length ? (
          <RowList>
            {roster.map((p) => {
              const name = p.practitioner_name.trim()
              const mark = initials(name)
              return (
                <ExpandRow
                  key={p.id}
                  rowId={p.id}
                  rowRef={rows.ref(p.id)}
                  open={openId === p.id}
                  mounted={openId === p.id || closingId === p.id}
                  unfilled={!name || p.working_days.length === 0}
                  onToggle={() => toggle(p.id)}
                  summary={
                    <>
                      <span className={styles.drMark} aria-hidden="true">
                        {mark || <Icon name="practitioner" size={15} />}
                      </span>
                      <RowText
                        name={name ? `${p.title_credential} ${name}` : ''}
                        placeholder="Bác sĩ chưa có tên"
                        sub={p.specialties.length ? p.specialties.join(' · ') : null}
                      />
                      <RowValue fixed={p.working_days.length > 0}>
                        {p.working_days.length ? <WeekStrip days={p.working_days} today={today} /> : <RowMissing>chưa chọn ngày</RowMissing>}
                      </RowValue>
                      <RowMeta tight>
                        <RowMark
                          name={p.bookable_by_name ? 'appointment' : null}
                          title={p.bookable_by_name ? `Khách hẹn đích danh ${name || 'bác sĩ này'} được` : `${agent} không hứa hẹn đích danh`}
                        />
                      </RowMeta>
                    </>
                  }
                >
                  <RowEdit>
                    <RowEditRow>
                      <SelectField<PractitionerTitle>
                        className={rowStyles.editSmall}
                        compact
                        label="Chức danh"
                        value={p.title_credential}
                        onChange={(v) => setRow(p.id, { title_credential: v })}
                        options={LABELS.titles.map((t) => ({ value: t, label: t }))}
                      />
                      {/* `FieldFrame` rather than a label of our own: it is the
                          frame the two fields beside it draw, so the three
                          controls sit on one baseline instead of four pixels
                          apart. Nothing is selected until the owner answers —
                          an unanswered gender must not read as "nam". */}
                      <FieldFrame label="Giới tính" compact className={rowStyles.editSmall}>
                        <Segmented<PractitionerGender>
                          fill
                          ariaLabel="Giới tính bác sĩ"
                          value={p.practitioner_gender}
                          onChange={(v) => setRow(p.id, { practitioner_gender: v })}
                          options={[
                            { value: 'nam', label: LABELS.gender.nam },
                            { value: 'nu', label: LABELS.gender.nu },
                          ]}
                        />
                      </FieldFrame>
                      <TextField
                        className={rowStyles.editGrow}
                        compact
                        label="Tên"
                        value={p.practitioner_name}
                        onChange={(e) => setRow(p.id, { practitioner_name: e.target.value })}
                        placeholder="VD: Nguyễn Văn Hùng"
                        autoFocus={fresh.includes(p.id)}
                      />
                    </RowEditRow>

                    <div className={ui.stackTight}>
                      <RowEditLabel>Chuyên môn</RowEditLabel>
                      <ChipInput
                        value={p.specialties}
                        onChange={(v) => setRow(p.id, { specialties: v })}
                        addLabel="+ chuyên môn"
                        placeholder="VD: Chỉnh nha"
                        emptyText={`${agent} trả lời được "bác sĩ nào làm implant".`}
                      />
                      {specialtyIdeas.filter((s) => !p.specialties.includes(s)).length ? (
                        <div className={styles.suggests}>
                          {specialtyIdeas
                            .filter((s) => !p.specialties.includes(s))
                            .slice(0, 5)
                            .map((s) => (
                              <button key={s} type="button" className={styles.suggest} onClick={() => setRow(p.id, { specialties: [...p.specialties, s] })}>
                                <Icon name="plus" size={12} />
                                {s}
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>

                    <Schedule p={p} agent={agent} onChange={(patch) => setRow(p.id, patch)} />

                    <RowEditRow>
                      <NumberField
                        className={rowStyles.editFixed}
                        compact
                        label="Số năm kinh nghiệm"
                        value={p.years_experience}
                        onChange={(v) => setRow(p.id, { years_experience: v })}
                        max={60}
                      />
                      <div className={`${rowStyles.editGrow} ${ui.stackTight}`}>
                        <RowEditLabel>Ngôn ngữ</RowEditLabel>
                        <ChipInput value={p.languages} onChange={(v) => setRow(p.id, { languages: v })} addLabel="+ ngôn ngữ" placeholder="VD: English" />
                      </div>
                    </RowEditRow>

                    <TextField
                      compact
                      label="Một dòng giới thiệu"
                      value={p.practitioner_note}
                      onChange={(e) => setRow(p.id, { practitioner_note: e.target.value })}
                      placeholder="VD: Tu nghiệp tại Hàn Quốc"
                      maxLength={120}
                    />

                    <RowSwitch
                      checked={p.bookable_by_name}
                      onChange={(v) => setRow(p.id, { bookable_by_name: v })}
                      ariaLabel={`${agent} được hẹn đích danh bác sĩ này`}
                      label={`${agent} được hẹn đích danh bác sĩ này`}
                      hint={
                        p.bookable_by_name
                          ? `${agent} ghi nhận yêu cầu gặp ${name || 'bác sĩ'} và nói rõ phòng khám sẽ xác nhận lại — chưa có lịch riêng từng bác sĩ.`
                          : `${agent} giữ hẹn chung, không hứa đích danh bác sĩ.`
                      }
                    />

                    {practitionerSentence(p) ? <Said who={agent}>{practitionerSentence(p)}</Said> : null}

                    <RowEditFoot>
                      <DeleteButton label="Xoá bác sĩ" onClick={() => remove(p.id)} />
                    </RowEditFoot>
                  </RowEdit>
                </ExpandRow>
              )
            })}
          </RowList>
        ) : (
          <EmptyState title="Chưa có bác sĩ nào">
            Thêm bác sĩ và những ngày có mặt, để {agent} trả lời được "bác sĩ nào làm implant" và "hôm nay bác sĩ Hùng có ở phòng khám không".
          </EmptyState>
        )}
      </Card>
    </KnowledgeSection>
  )
}
