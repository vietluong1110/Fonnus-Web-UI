import { LABELS } from '../defaults'
import type { InsuranceOption } from '../model'
import { useConfig, useDraft } from '../store'
import { Card, ChipButton, ChipInput, MoneyField, RadioGroup, SaveBar, TextArea, TextField, formatVnd, ui } from '../../ui'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'

const KEYS = ['insurance_bhyt_policy', 'consultation_fee', 'facility_capabilities', 'pre_appointment_instructions'] as const

const FACILITY_IDEAS = ['X-quang', 'CT Cone Beam', 'Máy tẩy trắng laser', 'Scan 3D', 'Phòng tiểu phẫu', 'Gây tê không đau']

/**
 * `#/app/le-tan/kien-thuc/bao-hiem` — the three logistics questions.
 *
 * "Có nhận BHYT không", "khám lần đầu có mất phí không" and "cần mang gì"
 * are, after price and hours, what a first call asks. One column, one
 * question per block, and the rail answers each as soon as it can.
 */
export function InsuranceSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'BHYT, bảo hiểm và khám ban đầu')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }

  return (
    <KnowledgeSection
      title="BHYT, bảo hiểm và khám ban đầu"
      lede={`Sau giá và giờ mở cửa, đây là ba câu khách gọi lần đầu hay hỏi nhất. ${agent} trả lời thẳng — hoặc, khi chưa có thông tin, xin ghi nhận và nhờ nhân viên gọi lại.`}
      rail={<TryPanel section="bao-hiem" config={live} />}
      bar={<SaveBar {...d.bar} sub="BHYT, bảo hiểm và khám ban đầu · áp dụng cho cuộc gọi tiếp theo" />}
    >
      <Card title="BHYT và bảo hiểm">
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
          hint={`${agent} đọc thêm câu này ngay sau câu trả lời chính.`}
        />
      </Card>

      <Card title="Khám và tư vấn lần đầu">
        <div className={ui.stackTight}>
          <MoneyField
            label="Phí khám và tư vấn"
            value={draft.consultation_fee}
            onChange={(v) => set('consultation_fee', v)}
            placeholder="chưa trả lời"
            hint={draft.consultation_fee === 0 ? `Miễn phí — khách hỏi giá, ${agent} mời đến khám không mất phí.` : undefined}
          />
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
      </Card>

      <Card title="Thiết bị tại phòng khám" subtitle={`khách hỏi "có chụp phim tại chỗ không" — ${agent} trả lời đúng thay vì đoán`}>
        <ChipInput value={draft.facility_capabilities} onChange={(v) => set('facility_capabilities', v)} placeholder="VD: X-quang" />
        <div className={ui.row}>
          {FACILITY_IDEAS.filter((f) => !draft.facility_capabilities.includes(f)).map((f) => (
            <ChipButton key={f} onClick={() => set('facility_capabilities', [...draft.facility_capabilities, f])}>
              + {f}
            </ChipButton>
          ))}
        </div>
      </Card>
    </KnowledgeSection>
  )
}
