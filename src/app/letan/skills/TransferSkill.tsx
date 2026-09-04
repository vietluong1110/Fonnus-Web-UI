import { Badge, Button } from '../../../design-system'
import { formatPhone, isValidPhone, normalizePhone } from '../../../auth/phone'
import { LABELS } from '../defaults'
import type { AfterHoursRoutineBehavior, EscalationTarget, EscalationWindow } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import {
  EMERGENCY_INSTRUCTION_SCRIPT,
  EMERGENCY_RED_FLAGS_PACK,
  ESCALATION_TRIGGERS_BASE,
  MEDICAL_ADVICE_REFUSAL_SCRIPT,
  PDPL_DATA_MINIMISATION,
  SYMPTOM_CAPTURE_RULE,
  UNRESOLVABLE_FALLBACK_SCRIPT,
} from '../system'
import { Card, ChipInput, Disclosure, GateTag, IconButton, Notice, RadioGroup, SaveBar, SelectField, SpeechBubble, TextField, ui } from '../../ui'
import styles from './Skills.module.css'

const KEYS = ['escalation_targets', 'escalation_window', 'escalation_triggers_custom', 'after_hours_routine_behavior', 'callback_policy', 'after_hours_emergency_target', 'emergency_red_flags_custom'] as const

const phoneOk = (v: string) => {
  const d = normalizePhone(v)
  return isValidPhone(d) || /^0\d{9,10}$/.test(d)
}

export function TransferSkill() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Kỹ năng chuyển máy')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'

  const setTarget = (id: string, patch: Partial<EscalationTarget>) => set('escalation_targets', draft.escalation_targets.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const first = draft.escalation_targets.find((t) => t.name.trim() || t.phone.trim())
  const who = first?.name.trim() || 'nhân viên'
  const hasTarget = draft.escalation_targets.some((t) => phoneOk(t.phone))
  const emergencyOk = phoneOk(draft.after_hours_emergency_target.phone)
  const doctor = draft.after_hours_emergency_target.name.trim() || 'bác sĩ'

  const afterHoursLine =
    draft.after_hours_routine_behavior === 'log_callback'
      ? `Giờ này phòng khám nghỉ rồi ạ. Em xin ghi lời nhắn, nhân viên sẽ gọi lại anh chị ${draft.callback_policy.trim() ? draft.callback_policy.trim().toLowerCase() : 'sớm nhất'} ạ.`
      : draft.after_hours_routine_behavior === 'take_message'
        ? 'Giờ này phòng khám nghỉ rồi ạ. Anh chị để lại lời nhắn, em ghi nhận và chuyển cho phòng khám ạ.'
        : `Giờ này phòng khám nghỉ rồi ạ. Em thử nối máy với ${who}, nếu không được em xin ghi lời nhắn ạ.`

  return (
    <>
      <Card gate="R1" title={`Khi nào ${agent} chuyển máy cho người thật?`}>
        <RadioGroup<EscalationWindow>
          name="window"
          value={draft.escalation_window}
          onChange={(v) => set('escalation_window', v)}
          options={[
            { value: 'always', label: 'Luôn chuyển khi khách yêu cầu', hint: `Kể cả ngoài giờ — nếu không ai nghe, ${agent} ghi lời nhắn.` },
            { value: 'business_hours', label: 'Chỉ trong giờ làm việc', hint: `Ngoài giờ, ${agent} xử lý theo thẻ "Ngoài giờ" bên dưới.` },
            { value: 'after_hours', label: 'Chỉ ngoài giờ làm việc', hint: 'Trong giờ, nhân viên đã nghe máy trực tiếp.' },
          ]}
        />

        <div className={ui.stackTight}>
          <div className={ui.cardHead}>
            <span className={ui.label}>Số máy nhận</span>
            <span className={ui.cardSub}>{agent} gọi số đầu tiên; không ai nghe thì thử số kế tiếp</span>
            <div className={ui.cardActions}>
              <Button variant="ghost" size="sm" onClick={() => set('escalation_targets', [...draft.escalation_targets, { id: newId('esc'), phone: '', name: '' }])}>
                + Thêm số
              </Button>
            </div>
          </div>
          {draft.escalation_targets.length ? (
            <div className={styles.targets}>
              {draft.escalation_targets.map((t, i) => (
                <div key={t.id} className={styles.targetRow}>
                  <span className={`${styles.targetOrder} ${i === 0 ? styles.targetOrderFirst : ''}`}>{i + 1}</span>
                  <TextField
                    compact
                    numeric
                    inputMode="tel"
                    aria-label="Số máy nhận"
                    value={formatPhone(t.phone)}
                    onChange={(e) => setTarget(t.id, { phone: normalizePhone(e.target.value).slice(0, 11) })}
                    placeholder="090 123 45 67"
                    error={t.phone && !phoneOk(t.phone) ? 'Số chưa đủ 10 số.' : null}
                  />
                  <TextField compact aria-label="Tên người nhận" value={t.name} onChange={(e) => setTarget(t.id, { name: e.target.value })} placeholder="Tên người nhận, VD: chị Lan" />
                  <IconButton name="trash" label="Xoá số" danger onClick={() => set('escalation_targets', draft.escalation_targets.filter((x) => x.id !== t.id))} />
                </div>
              ))}
            </div>
          ) : (
            <Notice tone="warm" icon="alert">
              Chưa có số nào. Đây là thông tin quan trọng nhất trong toàn bộ Lễ tân — không có nó, {agent} không chuyển được cuộc gọi nào cho người thật.
            </Notice>
          )}
        </div>

        <div className={ui.stackTight}>
          <span className={ui.label}>Trường hợp nào cần chuyển?</span>
          <ChipInput value={draft.escalation_triggers_custom} onChange={(v) => set('escalation_triggers_custom', v)} locked={ESCALATION_TRIGGERS_BASE} lockedTitle="Quy tắc hệ thống — không gỡ được" placeholder="VD: Khách hỏi về ca đã làm" addLabel="+ Thêm trường hợp" />
          <span className={ui.hint}>Ba trường hợp đầu là quy tắc hệ thống. Thêm trường hợp riêng của phòng khám: khách phàn nàn, hỏi về ca đã làm, cần trao đổi với bác sĩ.</span>
        </div>

        <SpeechBubble speaker="handoff" who={`${agent} nói khi chuyển`} speak text={`Câu này em xin phép chuyển cho ${who} trả lời trực tiếp. Em nối máy ngay ạ.`}>
          Câu này em xin phép chuyển cho {who} trả lời trực tiếp. Em nối máy ngay ạ.
        </SpeechBubble>
        <span className={ui.hint}>Cuộc gọi thường ngoài giờ và khẩn cấp y tế đi hai đường riêng — cài ở hai thẻ bên dưới.</span>
      </Card>

      <Card gate="R2" title="Ngoài giờ — cuộc gọi thường">
        <div className={ui.grid2}>
          <SelectField<AfterHoursRoutineBehavior>
            label={`${agent} làm gì`}
            value={draft.after_hours_routine_behavior}
            onChange={(v) => set('after_hours_routine_behavior', v)}
            options={(['log_callback', 'take_message', 'transfer'] as AfterHoursRoutineBehavior[]).map((k) => ({ value: k, label: LABELS.afterHours[k] }))}
          />
          <TextField
            label="Hẹn gọi lại trong"
            value={draft.callback_policy}
            onChange={(e) => set('callback_policy', e.target.value)}
            placeholder="VD: 30 phút đầu giờ làm việc"
            hint="Chỉ hứa điều phòng khám làm được."
            disabled={draft.after_hours_routine_behavior !== 'log_callback'}
          />
        </div>
        <SpeechBubble who={`${agent} nói`} speak text={afterHoursLine}>
          {afterHoursLine}
        </SpeechBubble>
      </Card>

      <Card
        gate="R2"
        title="Khẩn cấp y tế — đường dây riêng"
        actions={emergencyOk ? <Badge tone="success" dot>Đã có số trực</Badge> : <Badge tone="error">Cần trước khi nhận khách thật</Badge>}
      >
        <span className={ui.hint}>Sưng đau lúc 23:00 sau tiểu phẫu không thể chờ đến sáng — cuộc gọi này không đi chung đường với lời nhắn thường.</span>
        <div className={ui.grid2}>
          <TextField
            label="Số bác sĩ trực"
            numeric
            inputMode="tel"
            value={formatPhone(draft.after_hours_emergency_target.phone)}
            onChange={(e) => set('after_hours_emergency_target', { ...draft.after_hours_emergency_target, phone: normalizePhone(e.target.value).slice(0, 11) })}
            placeholder="090 823 45 67"
            error={draft.after_hours_emergency_target.phone && !emergencyOk ? 'Số chưa đủ 10 số.' : null}
          />
          <TextField
            label="Người trực"
            value={draft.after_hours_emergency_target.name}
            onChange={(e) => set('after_hours_emergency_target', { ...draft.after_hours_emergency_target, name: e.target.value })}
            placeholder="BS. Hùng"
            hint={`${agent} nói: "Em nối máy với ${doctor} ngay ạ."`}
          />
        </div>
        <div className={styles.redFlags}>
          <span className={styles.redEyebrow}>Dấu hiệu chuyển máy ngay — quy tắc hệ thống, không gỡ được</span>
          <ChipInput value={draft.emergency_red_flags_custom} onChange={(v) => set('emergency_red_flags_custom', v)} locked={EMERGENCY_RED_FLAGS_PACK} lockedTitle="Bộ quy tắc ngành — không gỡ được" placeholder="VD: đau dữ dội sau nhổ răng" addLabel="+ Thêm dấu hiệu" />
        </div>
        <SpeechBubble speaker="handoff" who={`${agent} nói`} speak text={EMERGENCY_INSTRUCTION_SCRIPT}>
          {EMERGENCY_INSTRUCTION_SCRIPT}
        </SpeechBubble>
      </Card>

      <Card>
        <Disclosure title="Quy tắc an toàn" subtitle="hệ thống — Fonnus viết, luật sư rà soát, áp dụng cho mọi phòng khám" badge={<GateTag gate="SW" />}>
          <div>
            <div className={ui.kv}>
              <span className={ui.kvKey}>Hỏi tư vấn y khoa</span>
              <span className={ui.kvVal}>“{MEDICAL_ADVICE_REFUSAL_SCRIPT}”</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvKey}>Ghi nhận triệu chứng</span>
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

      <SaveBar {...d.bar} sub={hasTarget ? `Chuyển máy tới ${who}${emergencyOk ? ` · khẩn cấp tới ${doctor}` : ''}` : 'Chưa có số máy nhận — lưu được, nhưng Linh chưa chuyển máy được.'} />
    </>
  )
}
