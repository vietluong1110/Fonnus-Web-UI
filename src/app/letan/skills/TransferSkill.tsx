import { useState } from 'react'
import { formatPhone, isValidPhone, normalizePhone } from '../../../auth/phone'
import { LABELS } from '../defaults'
import type { AfterHoursRoutineBehavior, EscalationTarget, EscalationWindow } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import {
  EMERGENCY_RED_FLAGS_PACK,
  ESCALATION_TRIGGERS_BASE,
  MEDICAL_ADVICE_REFUSAL_SCRIPT,
  PDPL_DATA_MINIMISATION,
  SYMPTOM_CAPTURE_RULE,
  UNRESOLVABLE_FALLBACK_SCRIPT,
} from '../system'
import {
  AddButton,
  Card,
  ChipInput,
  Disclosure,
  EmptyState,
  IconButton,
  Rule,
  Said,
  SaveBar,
  Suggestion,
  SuggestionMore,
  Suggestions,
  TextField,
  Tile,
  TileGrid,
  ui,
  useAppear,
} from '../../ui'
import type { IconName } from '../../../design-system'
import { TryPanel } from '../tryout/TryPanel'
import { SkillsSection } from './SkillsSection'
import {
  afterHoursLine,
  agreeLine,
  emergencyDoctor,
  emergencyLine,
  handoffTo,
  hasEmergencyNumber,
  hasHandoffNumber,
  offerLine,
  transferWindowLine,
} from './lines'
import styles from './Skills.module.css'

const KEYS = [
  'escalation_targets',
  'escalation_window',
  'escalation_triggers_custom',
  'after_hours_routine_behavior',
  'callback_policy',
  'after_hours_emergency_target',
  'emergency_red_flags_custom',
] as const

const phoneOk = (v: string) => {
  const d = normalizePhone(v)
  return isValidPhone(d) || /^0\d{9,10}$/.test(d)
}

/**
 * When she may reach for a person, drawn. Each option is a stretch of the
 * clock, and the icon set already had the three: the closed ring for "always",
 * the clock for opening hours, the crescent for after them.
 */
const WINDOWS: { value: EscalationWindow; icon: IconName }[] = [
  { value: 'always', icon: 'always-on' },
  { value: 'business_hours', icon: 'hours' },
  { value: 'after_hours', icon: 'after-hours' },
]

/** What she does with an ordinary call at 21:00 — three things she can do, so three drawn tiles. */
const AFTER_HOURS: { value: AfterHoursRoutineBehavior; icon: IconName }[] = [
  { value: 'log_callback', icon: 'time-saved' },
  { value: 'take_message', icon: 'message' },
  { value: 'transfer', icon: 'handoff' },
]

/** Cases a dental clinic actually adds. Three stand; the rest are the owner's own. */
const TRIGGER_IDEAS = [
  'Khách phàn nàn về ca đã làm',
  'Khách muốn nghe ý kiến bác sĩ',
  'Khách hỏi về hoá đơn hoặc công nợ',
  'Khách đổi hoặc huỷ hẹn nhiều lần',
  'Khách nói tiếng nước ngoài',
]

/** Promises a clinic can actually keep. The field is a promise, so the examples are modest. */
const CALLBACK_IDEAS = ['30 phút đầu giờ làm việc', 'ngay khi phòng khám mở cửa', 'trong buổi sáng hôm sau']

/**
 * `#/app/le-tan/ky-nang/chuyen-may` — when she stops answering and fetches a
 * person.
 *
 * The page is four questions in the order a call meets them, and every one of
 * them ends in a *different* sentence the caller would hear:
 *
 *   1. the caller asks for a person — when may she agree, and who does she
 *      ring? One card, because the window and the number are one decision,
 *      and because split in two they both ended in the same line.
 *   2. when does she hand over without being asked? She offers rather than
 *      agrees, so she says something else.
 *   3. it is 21:00 and nobody is there.
 *   4. it is 23:00 and something is wrong. Its own card, because this call
 *      must not go the same way as the one above it.
 *
 * Nothing here is a warning. The card with no number in it is an `EmptyState`
 * that says what she cannot do, and the `Said` line under it shows the
 * sentence a caller gets instead — "em xin ghi nhận, nhân viên sẽ gọi lại".
 * That is a better argument for typing a phone number than a red badge was,
 * and it is made in her voice rather than in the product's.
 */
export function TransferSkill() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Chuyển máy cho người thật')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const [allTriggers, setAllTriggers] = useState(false)

  const targets = draft.escalation_targets
  const rows = useAppear(targets.map((t) => t.id))
  const setTarget = (id: string, patch: Partial<EscalationTarget>) => set('escalation_targets', targets.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const add = () => set('escalation_targets', [...targets, { id: newId('esc'), phone: '', name: '' }])
  const remove = (id: string) => rows.leave(id, () => set('escalation_targets', (list) => list.filter((x) => x.id !== id)))

  const triggerIdeas = TRIGGER_IDEAS.filter((t) => !draft.escalation_triggers_custom.includes(t))
  const shownTriggers = allTriggers ? triggerIdeas : triggerIdeas.slice(0, 3)
  // "Trong 30 phút đầu giờ làm việc" and "30 phút đầu giờ làm việc" are the
  // same promise; offering the second while the first is in the box reads as
  // a suggestion the owner has already taken.
  const said = draft.callback_policy.trim().toLowerCase().replace(/^trong\s+/, '')
  const callbackIdeas = CALLBACK_IDEAS.filter((c) => c.toLowerCase() !== said)

  const ready = hasHandoffNumber(live)
  const emergency = hasEmergencyNumber(live)

  return (
    <SkillsSection
      title="Chuyển máy cho người thật"
      lede={`Có câu ${agent} không nên trả lời, và có lúc khách chỉ muốn nghe giọng người. Trang này nói cho ${agent} biết khi nào nên nhấc máy gọi ai — và số nào gọi trước.`}
      rail={<TryPanel section="chuyen-may" config={live} />}
      bar={
        <SaveBar
          {...d.bar}
          sub={ready ? `${agent} nối máy tới ${handoffTo(live)}${emergency ? ` · khẩn cấp tới ${emergencyDoctor(live)}` : ''}` : `Chưa có số máy nhận — lưu được, nhưng ${agent} chưa nối máy cho ai được`}
        />
      }
    >
      {/* When she may agree, and who she rings — one question with two
          settings, so one card and one spoken line. They were two cards, and
          both ended in the same sentence, which said the page had nothing to
          add the second time. */}
      <Card
        title="Khi khách xin gặp người thật"
        subtitle={`khách nói "cho em gặp nhân viên"`}
        actions={<AddButton label="Thêm số" onClick={add} />}
      >
        <TileGrid radio min={150} ariaLabel={`Khi nào ${agent} chuyển máy`}>
          {WINDOWS.map((w) => (
            <Tile
              key={w.value}
              single
              icon={w.icon}
              label={LABELS.escalationWindowShort[w.value]}
              selected={draft.escalation_window === w.value}
              onClick={() => set('escalation_window', w.value)}
            />
          ))}
        </TileGrid>
        <span className={ui.hint}>{transferWindowLine(live, agent)}</span>

        <div className={ui.stackTight}>
          <Rule label="Số máy nhận" hint={targets.length > 1 ? `${agent} gọi số 1 trước; không ai nghe thì thử số kế tiếp` : undefined} />
          {targets.length ? (
            <div className={styles.targets}>
              {targets.map((t, i) => (
                <div key={t.id} ref={rows.ref(t.id)} className={styles.target}>
                  {/* The order is the whole point of this list, so it is
                      drawn: a numbered ladder with the first rung filled. A
                      sentence saying "she tries them in order" is what this
                      replaces. */}
                  <span className={`${styles.rank} ${i === 0 ? styles.rankFirst : ''}`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <TextField
                    compact
                    numeric
                    inputMode="tel"
                    aria-label={`Số máy nhận ${i + 1}`}
                    value={formatPhone(t.phone)}
                    onChange={(e) => setTarget(t.id, { phone: normalizePhone(e.target.value).slice(0, 11) })}
                    placeholder="090 123 45 67"
                    error={t.phone && !phoneOk(t.phone) ? 'Số chưa đủ 10 số.' : null}
                  />
                  <TextField
                    compact
                    className={styles.targetName}
                    aria-label={`Tên người nhận số ${i + 1}`}
                    value={t.name}
                    onChange={(e) => setTarget(t.id, { name: e.target.value })}
                    placeholder={i === 0 ? 'VD: chị Lan' : 'Tên người nhận'}
                  />
                  <IconButton className={styles.targetDel} name="trash" label={`Xoá số ${i + 1}`} danger onClick={() => remove(t.id)} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có số nào">
              Đây là thông tin quan trọng nhất trong cả Lễ tân. Không có nó, khách xin gặp người thật thì {agent} chỉ ghi lại được lời nhắn — nghe câu dưới đây là rõ.
            </EmptyState>
          )}
        </div>

        <Said who={agent}>{agreeLine(live)}</Said>
      </Card>

      <Card title="Khi nào tự chuyển, không cần khách xin" subtitle={`${agent} nghe thấy ba điều đầu là nối máy ngay`}>
        <ChipInput
          boxed
          value={draft.escalation_triggers_custom}
          onChange={(v) => set('escalation_triggers_custom', v)}
          locked={ESCALATION_TRIGGERS_BASE}
          lockedTitle="Quy tắc hệ thống — không gỡ được"
          placeholder={draft.escalation_triggers_custom.length ? 'Thêm trường hợp…' : 'VD: Khách hỏi về ca đã làm'}
        />
        {shownTriggers.length ? (
          <Suggestions hint="cho phòng khám nha khoa">
            {shownTriggers.map((t) => (
              <Suggestion key={t} onClick={() => set('escalation_triggers_custom', [...draft.escalation_triggers_custom, t])}>
                {t}
              </Suggestion>
            ))}
            {triggerIdeas.length > 3 ? <SuggestionMore count={triggerIdeas.length - 3} open={allTriggers} onToggle={() => setAllTriggers((v) => !v)} /> : null}
          </Suggestions>
        ) : null}
        <Said who={agent}>{offerLine(live)}</Said>
      </Card>

      <Card title="Ngoài giờ, cuộc gọi thường" subtitle={`khách gọi lúc 21 giờ, không có ai ở phòng khám`}>
        <TileGrid radio min={150} ariaLabel={`${agent} làm gì ngoài giờ`}>
          {AFTER_HOURS.map((o) => (
            <Tile
              key={o.value}
              single
              icon={o.icon}
              label={LABELS.afterHoursShort[o.value]}
              selected={draft.after_hours_routine_behavior === o.value}
              onClick={() => set('after_hours_routine_behavior', o.value)}
            />
          ))}
        </TileGrid>

        {/* The promise only exists when she is making one. It used to sit
            here disabled, which asks the reader to work out why. */}
        {draft.after_hours_routine_behavior === 'log_callback' ? (
          <div className={ui.stackTight}>
            <TextField
              label="Nhân viên sẽ gọi lại trong"
              value={draft.callback_policy}
              onChange={(e) => set('callback_policy', e.target.value)}
              placeholder="VD: 30 phút đầu giờ làm việc"
              maxLength={80}
            />
            {callbackIdeas.length ? (
              <Suggestions hint="chỉ hứa điều phòng khám làm được">
                {callbackIdeas.map((c) => (
                  <Suggestion key={c} onClick={() => set('callback_policy', c)}>
                    {c}
                  </Suggestion>
                ))}
              </Suggestions>
            ) : null}
          </div>
        ) : null}

        <Said who={agent}>{afterHoursLine(live)}</Said>
      </Card>

      <Card title="Khẩn cấp y tế" subtitle="sưng đau lúc 23 giờ sau tiểu phẫu không chờ được đến sáng">
        <div className={ui.grid2}>
          <TextField
            label="Số bác sĩ trực"
            numeric
            inputMode="tel"
            value={formatPhone(draft.after_hours_emergency_target.phone)}
            onChange={(e) => set('after_hours_emergency_target', { ...draft.after_hours_emergency_target, phone: normalizePhone(e.target.value).slice(0, 11) })}
            placeholder="090 823 45 67"
            error={draft.after_hours_emergency_target.phone && !phoneOk(draft.after_hours_emergency_target.phone) ? 'Số chưa đủ 10 số.' : null}
          />
          <TextField
            label="Người trực"
            value={draft.after_hours_emergency_target.name}
            onChange={(e) => set('after_hours_emergency_target', { ...draft.after_hours_emergency_target, name: e.target.value })}
            placeholder="VD: BS. Hùng"
          />
        </div>

        <div className={ui.stackTight}>
          <Rule label="Dấu hiệu nối máy ngay" hint="năm dấu hiệu đầu là quy tắc ngành, không gỡ được" />
          <ChipInput
            boxed
            value={draft.emergency_red_flags_custom}
            onChange={(v) => set('emergency_red_flags_custom', v)}
            locked={EMERGENCY_RED_FLAGS_PACK}
            lockedTitle="Bộ quy tắc ngành — không gỡ được"
            placeholder={draft.emergency_red_flags_custom.length ? 'Thêm dấu hiệu…' : 'VD: đau dữ dội sau nhổ răng'}
          />
        </div>

        <Said who={agent}>{emergencyLine(live)}</Said>
      </Card>

      <Card>
        <Disclosure title="Quy tắc an toàn" subtitle="Fonnus viết, luật sư rà soát, áp dụng cho mọi phòng khám">
          <div>
            <div className={ui.kv}>
              <span className={ui.kvKey}>Khách hỏi tư vấn y khoa</span>
              <span className={ui.kvVal}>“{MEDICAL_ADVICE_REFUSAL_SCRIPT}”</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvKey}>Khách kể triệu chứng</span>
              <span className={ui.kvVal}>{SYMPTOM_CAPTURE_RULE} Dữ liệu sức khoẻ là dữ liệu nhạy cảm theo Luật 91/2025/QH15.</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvKey}>Thu thập thông tin</span>
              <span className={ui.kvVal}>{PDPL_DATA_MINIMISATION}</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvKey}>Không trả lời được</span>
              <span className={ui.kvVal}>“{UNRESOLVABLE_FALLBACK_SCRIPT}”</span>
            </div>
          </div>
        </Disclosure>
      </Card>
    </SkillsSection>
  )
}
