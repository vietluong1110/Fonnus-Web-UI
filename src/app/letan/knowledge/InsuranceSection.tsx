import { Icon } from '../../../design-system'
import { LABELS } from '../defaults'
import type { InsuranceOption } from '../model'
import { useConfig, useDraft } from '../store'
import { Card, ChipButton, ChipInput, MoneyField, Said, SaveBar, SuggestionMore, Suggestion, Suggestions, TextArea, TextField, Tile, TileGrid, formatVnd, ui } from '../../ui'
import type { IconName } from '../../../design-system'
import { facilityExchange, feeExchange, insuranceExchange, prepExchange, spoken } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'
import { useState } from 'react'

const KEYS = ['insurance_bhyt_policy', 'consultation_fee', 'facility_capabilities', 'pre_appointment_instructions'] as const

/**
 * The four answers as drawn things rather than a list of radios. A kind of
 * insurance *is* a thing the caller is holding: a BHYT card, an insurer's
 * paperwork, or neither — in which case they pay at the desk, which is what
 * the banknote says.
 */
const INSURANCE_OPTIONS: { value: InsuranceOption; icon: IconName }[] = [
  { value: 'none', icon: 'cash' },
  { value: 'bhyt', icon: 'insurance' },
  { value: 'private', icon: 'document' },
  { value: 'both', icon: 'done' },
]

/** The quick answers to "phí khám lần đầu" — free first, because it is the one most clinics pick. */
const FEE_PRESETS = [0, 100_000, 200_000, 300_000]

const PREP_IDEAS = [
  'Anh chị mang theo CCCD',
  'Mang theo thẻ BHYT nếu có',
  'Mang phim X-quang cũ nếu đã chụp ở nơi khác',
  'Đến sớm 10 phút để làm hồ sơ',
  'Không ăn trong 1 tiếng trước khi nhổ răng',
  'Trẻ em cần có người lớn đi cùng',
]

const FACILITY_IDEAS = ['X-quang', 'CT Cone Beam', 'Máy tẩy trắng laser', 'Scan 3D', 'Phòng tiểu phẫu', 'Gây tê không đau']

/** How many ready-made lines stand before the rest go behind one line — see `SuggestionMore`. */
const IDEAS_SHOWN = 3

/**
 * `#/app/le-tan/kien-thuc/bao-hiem` — the logistics questions.
 *
 * "Có nhận BHYT không", "khám lần đầu có mất phí không", "cần mang gì" and
 * "có chụp phim tại chỗ không" are, after price and hours, what a first call
 * asks. So the page is one card per question, in that order, and **every one
 * of them ends in the sentence she would say** — including when the field is
 * still blank, because the line she falls back to ("em xin ghi nhận và nhờ
 * nhân viên gọi lại") is the whole argument for filling the field in. That
 * is the page's answer to "what is going on": it is not a form, it is four
 * answers being written.
 *
 * Nothing here is explained in prose. The insurance answer is four drawn
 * tiles, the fee is four pills, the two open-ended fields carry ready-made
 * lines the owner adopts by pressing them.
 */
export function InsuranceSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'BHYT, bảo hiểm và khám ban đầu')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const [allPrep, setAllPrep] = useState(false)

  const policy = draft.insurance_bhyt_policy
  const prep = draft.pre_appointment_instructions
  // A line already taken is not offered again; matching on the text keeps that
  // true after the owner has edited the box by hand.
  const prepUnused = PREP_IDEAS.filter((i) => !prep.toLowerCase().includes(i.toLowerCase()))
  const prepShown = allPrep ? prepUnused : prepUnused.slice(0, IDEAS_SHOWN)
  const addPrep = (line: string) => set('pre_appointment_instructions', prep.trim() ? `${prep.trim().replace(/[.\s]*$/, '')}. ${line}` : line)
  const facilityUnused = FACILITY_IDEAS.filter((f) => !draft.facility_capabilities.includes(f))

  return (
    <KnowledgeSection
      title="BHYT, bảo hiểm và khám ban đầu"
      lede={`Sau giá và giờ mở cửa, đây là những câu khách gọi lần đầu hay hỏi nhất — và dưới mỗi thẻ là đúng câu ${agent} sẽ đọc.`}
      rail={<TryPanel section="bao-hiem" config={live} />}
      bar={<SaveBar {...d.bar} sub="BHYT, bảo hiểm và khám ban đầu · áp dụng cho cuộc gọi tiếp theo" />}
    >
      <Card title="Bảo hiểm" subtitle={`khách hỏi "bên mình có nhận bảo hiểm y tế không"`}>
        <TileGrid radio min={132} ariaLabel="Phòng khám nhận loại bảo hiểm nào">
          {INSURANCE_OPTIONS.map((o) => (
            <Tile
              key={o.value}
              single
              icon={o.icon}
              label={LABELS.insuranceShort[o.value]}
              selected={policy.option === o.value}
              onClick={() => set('insurance_bhyt_policy', { ...policy, option: o.value })}
            />
          ))}
        </TileGrid>
        <TextField
          label="Nói thêm"
          value={policy.note}
          onChange={(e) => set('insurance_bhyt_policy', { ...policy, note: e.target.value })}
          placeholder="VD: Bảo hiểm tư nhân: phòng khám xuất hoá đơn, khách tự nộp cho hãng."
          maxLength={200}
        />
        <Said who={agent}>{spoken(insuranceExchange(live))}</Said>
      </Card>

      <Card title="Khám lần đầu" subtitle={`khách hỏi "khám và tư vấn có mất phí không"`}>
        <div className={ui.stackTight}>
          <MoneyField label="Phí khám và tư vấn" value={draft.consultation_fee} onChange={(v) => set('consultation_fee', v)} placeholder="chưa trả lời" />
          <div className={ui.row}>
            {FEE_PRESETS.map((n) => (
              <ChipButton key={n} selected={draft.consultation_fee === n} onClick={() => set('consultation_fee', n)}>
                {n === 0 ? 'Miễn phí' : `${formatVnd(n)} đ`}
              </ChipButton>
            ))}
          </div>
        </div>
        <Said who={agent}>{spoken(feeExchange(live))}</Said>
      </Card>

      <Card title="Chuẩn bị trước khi đến" subtitle={`khách hỏi "em cần mang theo gì"`}>
        <TextArea
          aria-label="Chuẩn bị trước khi đến"
          value={prep}
          onChange={(e) => set('pre_appointment_instructions', e.target.value)}
          placeholder="VD: Mang CCCD và phim X-quang nếu có. Không ăn 1 tiếng trước khi nhổ răng."
          rows={2}
          maxLength={300}
        />
        {prepShown.length ? (
          <Suggestions hint="bấm để thêm vào ô trên">
            {prepShown.map((i) => (
              <Suggestion key={i} onClick={() => addPrep(i)}>
                {i}
              </Suggestion>
            ))}
            {prepUnused.length > IDEAS_SHOWN ? <SuggestionMore count={prepUnused.length - IDEAS_SHOWN} open={allPrep} onToggle={() => setAllPrep((v) => !v)} /> : null}
          </Suggestions>
        ) : null}
        <Said who={agent}>{spoken(prepExchange(live))}</Said>
      </Card>

      <Card title="Thiết bị tại phòng khám" subtitle={`khách hỏi "có chụp phim tại chỗ không"`}>
        <ChipInput
          boxed
          value={draft.facility_capabilities}
          onChange={(v) => set('facility_capabilities', v)}
          placeholder={draft.facility_capabilities.length ? 'Thêm thiết bị…' : 'VD: X-quang'}
        />
        {facilityUnused.length ? (
          <div className={styles.suggests}>
            {facilityUnused.map((f) => (
              <button key={f} type="button" className={styles.suggest} onClick={() => set('facility_capabilities', [...draft.facility_capabilities, f])}>
                <Icon name="plus" size={12} />
                {f}
              </button>
            ))}
          </div>
        ) : null}
        <Said who={agent}>{spoken(facilityExchange(live))}</Said>
      </Card>
    </KnowledgeSection>
  )
}
