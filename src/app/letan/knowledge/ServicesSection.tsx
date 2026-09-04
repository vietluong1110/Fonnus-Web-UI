import { useState } from 'react'
import { Badge, Icon } from '../../../design-system'
import { DURATION_OPTIONS, LABELS } from '../defaults'
import type { Bundle, PaymentMethod, PriceUnit, PricingDisclosurePolicy, Promotion, ServiceRow } from '../model'
import { newId } from '../model'
import { pricedCount } from '../readiness'
import { useConfig, useDraft } from '../store'
import { PRICE_QUALIFIER } from '../system'
import { Card, Checkbox, ChipInput, DateField, IconButton, MoneyField, MoneyRangeField, SaveBar, SelectField, Switch, TableHead, TableRow, TextField, ui } from '../../ui'
import { localIso } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

export { priceSentence } from './answers'

const KEYS = ['service_catalog', 'pricing_disclosure_policy', 'services_not_offered', 'package_bundles', 'instalment_options', 'payment_methods', 'active_promotions'] as const

const BUNDLE_COLS = 'minmax(0, 1.4fr) 150px minmax(0, 1.6fr) 32px'

function promoStatus(p: Promotion, today: string): { label: string; tone: 'lemongrass' | 'neutral' | 'warning' } {
  if (p.valid_to && p.valid_to < today) return { label: 'Hết hạn', tone: 'neutral' }
  if (p.valid_from && p.valid_from > today) return { label: 'Sắp chạy', tone: 'warning' }
  return { label: 'Đang chạy', tone: 'lemongrass' }
}

/**
 * `#/app/le-tan/kien-thuc/dich-vu` — what the clinic does and what it costs.
 *
 * The price list was a five-column table 920px wide. Beside the rail it is
 * a list of two-line rows, each in the order she says it: what it is called
 * and what else callers call it; then the price, its unit, and whether she
 * may book it and for how long. Ask the try-out panel for a price and she
 * quotes the row as it stands, unsaved edits included.
 *
 * A row without a price takes a dashed edge, the same mark the hub uses for
 * an empty section. Not a red ground: nothing is wrong with the row, it is
 * just not finished.
 */
export function ServicesSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Dịch vụ và giá')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const today = localIso(new Date())

  const [openNote, setOpenNote] = useState<string | null>(null)

  const total = draft.service_catalog.length
  const priced = pricedCount(live)

  const setRow = (id: string, patch: Partial<ServiceRow>) => set('service_catalog', draft.service_catalog.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const addRow = () => {
    const id = newId('svc')
    set('service_catalog', [
      ...draft.service_catalog,
      { id, service_name: '', service_aliases: [], price_from: null, price_to: null, price_unit: 'lan', duration: 30, service_note: '', is_bookable: true, from_template: false },
    ])
  }
  const setBundle = (id: string, patch: Partial<Bundle>) => set('package_bundles', draft.package_bundles.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  const setPromo = (id: string, patch: Partial<Promotion>) => set('active_promotions', draft.active_promotions.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const togglePay = (m: PaymentMethod, on: boolean) => set('payment_methods', on ? [...draft.payment_methods, m] : draft.payment_methods.filter((x) => x !== m))

  return (
    <KnowledgeSection
      title="Dịch vụ và giá"
      lede={`Mỗi dòng là một dịch vụ khách hay hỏi. Sửa một mức giá rồi hỏi thử ở khung bên phải — ${agent} báo đúng giá vừa sửa, kể cả khi bạn chưa lưu.`}
      rail={<TryPanel section="dich-vu" config={live} />}
      bar={<SaveBar {...d.bar} sub={`${priced}/${total} dịch vụ có giá · ${LABELS.pricing[draft.pricing_disclosure_policy]}`} />}
    >
      <Card title="Cách báo giá qua điện thoại">
        <SelectField<PricingDisclosurePolicy>
          value={draft.pricing_disclosure_policy}
          onChange={(v) => set('pricing_disclosure_policy', v)}
          options={(['range', 'exact', 'defer'] as PricingDisclosurePolicy[]).map((k) => ({ value: k, label: LABELS.pricing[k] }))}
          aria-label="Cách báo giá"
          hint={
            draft.pricing_disclosure_policy === 'defer'
              ? `${agent} không đọc số nào — chỉ mời khách đến khám. Bảng giá bên dưới vẫn dùng để trả lời "có làm không".`
              : `Câu "${PRICE_QUALIFIER}" tự thêm sau mỗi mức giá — luật yêu cầu, không tắt được.`
          }
        />
      </Card>

      <Card title="Bảng giá" subtitle={`${priced}/${total} dịch vụ có giá`}>
        {draft.service_catalog.some((s) => s.from_template) && priced < total ? (
          <span className={ui.hint}>
            Đã điền sẵn {draft.service_catalog.filter((s) => s.from_template).length} dịch vụ nha khoa phổ biến. Sửa giá cho đúng phòng khám, xoá dòng không làm. Dòng chưa có giá, {agent} mời khách đến khám thay vì tự bịa.
          </span>
        ) : null}

        <div>
          {draft.service_catalog.map((s) => {
            const unpriced = s.price_from == null
            const showNote = openNote === s.id || !!s.service_note
            return (
              <div key={s.id} className={`${styles.item} ${unpriced ? styles.itemOpen : ''}`}>
                <div className={styles.line}>
                  <TextField className={styles.grow} compact aria-label="Tên dịch vụ" value={s.service_name} onChange={(e) => setRow(s.id, { service_name: e.target.value })} placeholder="Tên dịch vụ" />
                  <div className={styles.grow}>
                    <ChipInput value={s.service_aliases} onChange={(v) => setRow(s.id, { service_aliases: v })} addLabel="+ tên khác" placeholder="khách còn gọi là" />
                  </div>
                  <div className={styles.itemActions}>
                    <IconButton name="edit" label={showNote ? 'Ghi chú của dịch vụ này' : 'Thêm ghi chú'} disabled={showNote} onClick={() => setOpenNote(s.id)} />
                    <IconButton name="trash" label="Xoá dịch vụ" danger onClick={() => set('service_catalog', draft.service_catalog.filter((x) => x.id !== s.id))} />
                  </div>
                </div>
                <div className={styles.line}>
                  <span className={styles.itemLabel}>Giá</span>
                  <MoneyRangeField
                    compact
                    fromLabel="Giá từ"
                    toLabel="Giá đến"
                    from={s.price_from}
                    to={s.price_to}
                    onFrom={(v) => setRow(s.id, { price_from: v, price_to: s.price_to == null || (v != null && s.price_to < v) ? v : s.price_to })}
                    onTo={(v) => setRow(s.id, { price_to: v })}
                    fromPlaceholder={unpriced ? 'chưa có giá' : 'từ'}
                    toPlaceholder={unpriced ? '' : 'đến'}
                    toDisabled={unpriced}
                    className={styles.half}
                  />
                  <SelectField<PriceUnit>
                    compact
                    aria-label="Đơn vị tính giá"
                    value={s.price_unit}
                    onChange={(v) => setRow(s.id, { price_unit: v })}
                    options={(Object.keys(LABELS.priceUnit) as PriceUnit[]).map((k) => ({ value: k, label: LABELS.priceUnit[k] }))}
                    style={{ width: 118, flex: '0 0 auto' }}
                  />
                  <span className={styles.itemSep} />
                  <span className={styles.itemLabel}>Đặt hẹn</span>
                  <Switch checked={s.is_bookable} onChange={(v) => setRow(s.id, { is_bookable: v })} ariaLabel={`${agent} được đặt hẹn ${s.service_name}`} />
                  <SelectField
                    compact
                    aria-label="Thời lượng một hẹn"
                    value={s.duration == null ? '' : String(s.duration)}
                    onChange={(v) => setRow(s.id, { duration: v ? Number(v) : null })}
                    options={[{ value: '', label: '—' }, ...DURATION_OPTIONS.map((m) => ({ value: String(m), label: `${m} phút` }))]}
                    disabled={!s.is_bookable}
                    style={{ width: 104, flex: '0 0 auto' }}
                  />
                </div>
                {showNote ? (
                  <div className={styles.line}>
                    <span className={styles.itemLabel}>Ghi chú</span>
                    <TextField
                      className={styles.grow}
                      compact
                      aria-label={`Ghi chú cho ${s.service_name || 'dịch vụ'}`}
                      value={s.service_note}
                      onChange={(e) => setRow(s.id, { service_note: e.target.value })}
                      placeholder={`Một dòng ${agent} được nói thêm — VD: Không áp dụng răng nhiễm tetracycline`}
                      maxLength={140}
                      autoFocus={openNote === s.id && !s.service_note}
                      suffix={
                        <button
                          type="button"
                          className={ui.linkButton}
                          style={{ fontSize: 12 }}
                          onClick={() => {
                            setRow(s.id, { service_note: '' })
                            setOpenNote(null)
                          }}
                        >
                          bỏ
                        </button>
                      }
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        <button type="button" className={styles.idea} onClick={addRow}>
          <span className={styles.ideaPlus}>
            <Icon name="plus" size={14} />
          </span>
          <span>Thêm dịch vụ</span>
        </button>
        <span className={ui.hint}>
          Giá để trống = {agent} mời khách đến khám. Giá 0 = miễn phí. Tắt "Đặt hẹn" = {agent} không tự giữ lịch cho dịch vụ đó (ví dụ niềng răng cần bác sĩ xem trước).
        </span>
      </Card>

      <Card title="Không làm" subtitle={`${agent} từ chối khéo thay vì tự bịa câu trả lời`}>
        <ChipInput value={draft.services_not_offered} onChange={(v) => set('services_not_offered', v)} placeholder="VD: Chỉnh nha trẻ dưới 12 tuổi" emptyText="" />
      </Card>

      <Card title="Thanh toán và ưu đãi" subtitle={`${agent} chỉ nói khi khách hỏi`}>
        <div className={ui.stackTight}>
          <span className={ui.labelMuted}>Nhận thanh toán</span>
          <div className={ui.row} style={{ gap: 16 }}>
            {(Object.keys(LABELS.payment) as PaymentMethod[]).map((m) => (
              <Checkbox key={m} label={LABELS.payment[m]} checked={draft.payment_methods.includes(m)} onChange={(on) => togglePay(m, on)} />
            ))}
          </div>
        </div>
        <TextField
          label="Trả góp"
          value={draft.instalment_options}
          onChange={(e) => set('instalment_options', e.target.value)}
          placeholder="VD: Trả góp 0% qua thẻ tín dụng, đơn từ 10 triệu"
          hint="Khách hỏi implant và niềng răng hay hỏi câu này."
        />

        <div className={ui.divider} />
        <div className={ui.cardHead}>
          <span className={ui.label}>Giá combo</span>
          <span className={ui.cardSub}>gói nhiều dịch vụ một giá</span>
        </div>
        {draft.package_bundles.length ? (
          <div>
            <TableHead columns={BUNDLE_COLS}>
              <span>Combo</span>
              <span>Giá</span>
              <span>Ghi chú</span>
              <span />
            </TableHead>
            {draft.package_bundles.map((b) => (
              <TableRow key={b.id} columns={BUNDLE_COLS}>
                <TextField compact aria-label="Tên combo" value={b.bundle_name} onChange={(e) => setBundle(b.id, { bundle_name: e.target.value })} placeholder="Cạo vôi + tẩy trắng" />
                <MoneyField compact aria-label="Giá combo" value={b.price} onChange={(v) => setBundle(b.id, { price: v })} />
                <TextField compact aria-label="Ghi chú combo" value={b.note} onChange={(e) => setBundle(b.id, { note: e.target.value })} placeholder="Áp dụng khách mới" />
                <IconButton name="trash" label="Xoá combo" danger onClick={() => set('package_bundles', draft.package_bundles.filter((x) => x.id !== b.id))} />
              </TableRow>
            ))}
          </div>
        ) : null}
        <button type="button" className={styles.idea} onClick={() => set('package_bundles', [...draft.package_bundles, { id: newId('bd'), bundle_name: '', price: null, note: '' }])}>
          <span className={styles.ideaPlus}>
            <Icon name="plus" size={14} />
          </span>
          <span>Thêm combo</span>
        </button>

        <div className={ui.divider} />
        <div className={ui.cardHead}>
          <span className={ui.label}>Ưu đãi đang chạy</span>
          <span className={ui.cardSub}>hết hạn, {agent} tự ngừng báo — không cần nhớ gỡ</span>
        </div>
        {draft.active_promotions.length ? (
          <div>
            {draft.active_promotions.map((p) => {
              const st = promoStatus(p, today)
              return (
                <div key={p.id} className={styles.item}>
                  <div className={styles.line}>
                    <TextField className={styles.grow} compact aria-label="Tên ưu đãi" value={p.promo_name} onChange={(e) => setPromo(p.id, { promo_name: e.target.value })} placeholder="Ưu đãi tháng 9" />
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <div className={styles.itemActions}>
                      <IconButton name="trash" label="Xoá ưu đãi" danger onClick={() => set('active_promotions', draft.active_promotions.filter((x) => x.id !== p.id))} />
                    </div>
                  </div>
                  <div className={styles.line}>
                    <TextField className={styles.grow} compact aria-label="Nội dung ưu đãi" value={p.promo_description} onChange={(e) => setPromo(p.id, { promo_description: e.target.value })} placeholder={`${agent} nói gì: Giảm 20% tẩy trắng`} />
                    <DateField compact aria-label="Từ ngày" value={p.valid_from} onChange={(v) => setPromo(p.id, { valid_from: v })} style={{ width: 150 }} />
                    <span className={styles.timeSep}>–</span>
                    <DateField compact aria-label="Đến ngày" value={p.valid_to} onChange={(v) => setPromo(p.id, { valid_to: v })} min={p.valid_from} style={{ width: 150 }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
        <button
          type="button"
          className={styles.idea}
          onClick={() => set('active_promotions', [...draft.active_promotions, { id: newId('pr'), promo_name: '', promo_description: '', valid_from: today, valid_to: today }])}
        >
          <span className={styles.ideaPlus}>
            <Icon name="plus" size={14} />
          </span>
          <span>Thêm ưu đãi — {agent} chỉ nhắc trong thời gian còn hiệu lực</span>
        </button>
      </Card>
    </KnowledgeSection>
  )
}
