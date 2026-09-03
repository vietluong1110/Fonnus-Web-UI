import { LABELS } from '../defaults'
import type { InsuranceOption } from '../model'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, ChipButton, ChipInput, MoneyField, RadioGroup, SaveBar, SpeechBubble, TextArea, TextField, formatVnd, ui } from '../../ui'

const KEYS = ['insurance_bhyt_policy', 'consultation_fee', 'facility_capabilities', 'pre_appointment_instructions'] as const

const FACILITY_IDEAS = ['X-quang', 'CT Cone Beam', 'Máy tẩy trắng laser', 'Scan 3D', 'Phòng tiểu phẫu', 'Gây tê không đau']

function insuranceSentence(option: InsuranceOption, note: string): string {
  const base =
    option === 'none'
      ? 'Phòng khám không nhận bảo hiểm y tế và cũng chưa liên kết bảo hiểm tư nhân ạ.'
      : option === 'bhyt'
        ? 'Phòng khám có nhận bảo hiểm y tế ạ.'
        : option === 'private'
          ? 'Phòng khám không nhận BHYT, nhưng có hỗ trợ hồ sơ cho bảo hiểm tư nhân ạ.'
          : option === 'both'
            ? 'Phòng khám nhận cả bảo hiểm y tế và bảo hiểm tư nhân ạ.'
            : 'Câu này em xin ghi nhận và nhờ nhân viên gọi lại anh chị ạ.'
  return note.trim() ? `${base} ${note.trim()}` : base
}

export function InsuranceSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'BHYT, bảo hiểm và khám ban đầu')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const set_ = draft.insurance_bhyt_policy.option !== 'unset'

  return (
    <>
      <SectionHead title="BHYT, bảo hiểm và khám ban đầu" badge={set_ ? { tone: 'success', label: 'Đủ' } : { tone: 'warning', label: 'Còn thiếu' }} />

      <div className={ui.grid2}>
        <Card gate="R2" title="BHYT và bảo hiểm" subtitle="một trong ba câu hỏi hậu cần phổ biến nhất">
          <RadioGroup<InsuranceOption>
            name="insurance"
            value={draft.insurance_bhyt_policy.option}
            onChange={(v) => set('insurance_bhyt_policy', { ...draft.insurance_bhyt_policy, option: v })}
            options={(['none', 'bhyt', 'private', 'both'] as InsuranceOption[]).map((k) => ({ value: k, label: LABELS.insurance[k] }))}
          />
          <TextField
            label="Nói thêm"
            value={draft.insurance_bhyt_policy.note}
            onChange={(e) => set('insurance_bhyt_policy', { ...draft.insurance_bhyt_policy, note: e.target.value })}
            placeholder="VD: Bảo hiểm tư nhân: phòng khám xuất hoá đơn, khách tự nộp cho hãng."
            maxLength={200}
          />
          <SpeechBubble who={`${agent} nói`} speak text={insuranceSentence(draft.insurance_bhyt_policy.option, draft.insurance_bhyt_policy.note)}>
            {insuranceSentence(draft.insurance_bhyt_policy.option, draft.insurance_bhyt_policy.note)}
          </SpeechBubble>
        </Card>

        <Card gate="O" title="Khám và tư vấn ban đầu" subtitle={`${agent} chỉ nói khi khách hỏi`}>
          <div className={ui.stackTight}>
            <MoneyField label="Phí khám và tư vấn lần đầu" value={draft.consultation_fee} onChange={(v) => set('consultation_fee', v)} placeholder="chưa trả lời" hint={draft.consultation_fee === 0 ? 'Miễn phí — khách hỏi giá, Linh mời đến khám không mất phí.' : undefined} />
            <div className={ui.row}>
              <ChipButton selected={draft.consultation_fee === 0} onClick={() => set('consultation_fee', 0)}>
                Miễn phí
              </ChipButton>
              {[100_000, 200_000, 300_000].map((n) => (
                <ChipButton key={n} selected={draft.consultation_fee === n} onClick={() => set('consultation_fee', n)}>
                  {formatVnd(n)} đ
                </ChipButton>
              ))}
            </div>
          </div>
          <TextArea
            label="Chuẩn bị trước khi đến"
            value={draft.pre_appointment_instructions}
            onChange={(e) => set('pre_appointment_instructions', e.target.value)}
            placeholder="VD: Mang CCCD và phim X-quang nếu có. Không ăn 1 tiếng trước khi nhổ răng."
            rows={2}
            maxLength={300}
          />
          <div className={ui.stackTight}>
            <span className={ui.labelMuted}>Thiết bị tại phòng khám</span>
            <ChipInput value={draft.facility_capabilities} onChange={(v) => set('facility_capabilities', v)} placeholder="VD: X-quang" />
            <div className={ui.row}>
              {FACILITY_IDEAS.filter((f) => !draft.facility_capabilities.includes(f)).map((f) => (
                <ChipButton key={f} onClick={() => set('facility_capabilities', [...draft.facility_capabilities, f])}>
                  + {f}
                </ChipButton>
              ))}
            </div>
            <span className={ui.hint}>Khách hỏi "có chụp phim tại chỗ không" — {agent} trả lời đúng thay vì đoán.</span>
          </div>
        </Card>
      </div>

      <SaveBar {...d.bar} sub="BHYT, bảo hiểm và khám ban đầu" />
    </>
  )
}
