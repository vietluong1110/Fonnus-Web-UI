import { useState } from 'react'
import { Badge, Button, Icon } from '../../../design-system'
import { BUFFER_OPTIONS, DURATION_OPTIONS, LABELS } from '../defaults'
import type { Bundle, PaymentMethod, PriceUnit, PricingDisclosurePolicy, Promotion, ServiceRow } from '../model'
import { newId } from '../model'
import { pricedCount } from '../readiness'
import { useConfig, useDraft } from '../store'
import { PRICE_QUALIFIER } from '../system'
import { SectionHead } from '../LeTanPage'
import {
  Card,
  Checkbox,
  ChipInput,
  DateField,
  EmptyState,
  IconButton,
  MoneyField,
  MoneyRangeField,
  Notice,
  SaveBar,
  SelectField,
  SpeechBubble,
  Switch,
  TableHead,
  TableRow,
  TextField,
  formatVnd,
  ui,
} from '../../ui'
import styles from './Knowledge.module.css'

void BUFFER_OPTIONS

const KEYS = ['service_catalog', 'pricing_disclosure_policy', 'services_not_offered', 'package_bundles', 'instalment_options', 'payment_methods', 'active_promotions'] as const

const BUNDLE_COLS = '1.4fr 160px 1.6fr 32px'
const PROMO_COLS = '1fr 1.6fr 150px 150px 100px 32px'

function shortVnd(n: number): string {
  if (n >= 1_000_000 && n % 100_000 === 0) return `${(n / 1_000_000).toString().replace('.', ',')} triệu`
  if (n >= 1_000 && n % 1_000 === 0) return `${n / 1_000} nghìn`
  return `${formatVnd(n)} đồng`
}

/** What the agent would say for one row under the chosen policy. */
export function priceSentence(s: ServiceRow, policy: PricingDisclosurePolicy): string {
  const unit = LABELS.priceUnit[s.price_unit].replace('/ ', 'mỗi ')
  if (policy === 'defer' || s.price_from == null) return `${s.service_name} thì bác sĩ cần thăm khám mới báo giá chính xác được ạ. Em mời anh chị đến khám tư vấn miễn phí nhé?`
  if (s.price_from === 0 && (s.price_to ?? 0) === 0) return `${s.service_name} tại phòng khám là miễn phí ạ.`
  if (policy === 'exact' || s.price_to == null || s.price_to === s.price_from) return `${s.service_name} tại phòng khám là ${shortVnd(s.price_from)} ${unit}. ${PRICE_QUALIFIER}`
  return `${s.service_name} từ ${shortVnd(s.price_from)} đến ${shortVnd(s.price_to)} ${unit}. ${PRICE_QUALIFIER}`
}

function promoStatus(p: Promotion, today: string): { label: string; tone: 'lemongrass' | 'neutral' | 'warning' } {
  if (p.valid_to && p.valid_to < today) return { label: 'Hết hạn', tone: 'neutral' }
  if (p.valid_from && p.valid_from > today) return { label: 'Sắp chạy', tone: 'warning' }
  return { label: 'Đang chạy', tone: 'lemongrass' }
}

export function ServicesSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Dịch vụ và giá')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const [openNote, setOpenNote] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const total = draft.service_catalog.length
  const priced = pricedCount({ ...config, ...draft })
  const example = draft.service_catalog.find((s) => s.price_from != null && s.price_from > 0) ?? draft.service_catalog[0]

  const setRow = (id: string, patch: Partial<ServiceRow>) => set('service_catalog', draft.service_catalog.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const addRow = () => {
    const id = newId('svc')
    set('service_catalog', [...draft.service_catalog, { id, service_name: '', service_aliases: [], price_from: null, price_to: null, price_unit: 'lan', duration: 30, service_note: '', is_bookable: true, from_template: false }])
  }
  const setBundle = (id: string, patch: Partial<Bundle>) => set('package_bundles', draft.package_bundles.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  const setPromo = (id: string, patch: Partial<Promotion>) => set('active_promotions', draft.active_promotions.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const togglePay = (m: PaymentMethod, on: boolean) => set('payment_methods', on ? [...draft.payment_methods, m] : draft.payment_methods.filter((x) => x !== m))

  const badge = priced === total && total > 0 ? { tone: 'success' as const, label: `${priced}/${total} có giá` } : { tone: 'warning' as const, label: `${priced}/${total} có giá` }

  return (
    <>
      <SectionHead title="Dịch vụ và giá" badge={badge} />

      {draft.service_catalog.some((s) => s.from_template) && priced < total ? (
        <Notice tone="sage" icon="info">
          Đã điền sẵn {draft.service_catalog.filter((s) => s.from_template).length} dịch vụ nha khoa phổ biến. Sửa giá cho đúng phòng khám của bạn — xoá dòng không làm. Dòng chưa có giá, {agent} mời khách đến khám thay vì tự bịa.
        </Notice>
      ) : null}

      <div className={ui.grid2} style={{ alignItems: 'end' }}>
        <SelectField<PricingDisclosurePolicy>
          label="Cách báo giá qua điện thoại"
          gate="R2"
          value={draft.pricing_disclosure_policy}
          onChange={(v) => set('pricing_disclosure_policy', v)}
          options={(['range', 'exact', 'defer'] as PricingDisclosurePolicy[]).map((k) => ({ value: k, label: LABELS.pricing[k] }))}
          hint={draft.pricing_disclosure_policy === 'defer' ? `${agent} không đọc số nào — chỉ mời khách đến khám. Bảng giá bên dưới vẫn hữu ích để trả lời "có làm không".` : `Câu "${PRICE_QUALIFIER}" là bắt buộc, tự thêm sau mỗi mức giá.`}
        />
        {example ? (
          <SpeechBubble who={`${agent} nói`} speak text={priceSentence(example, draft.pricing_disclosure_policy)}>
            {priceSentence(example, draft.pricing_disclosure_policy)}
          </SpeechBubble>
        ) : null}
      </div>

      <Card gate="R2" title="Bảng giá" subtitle="một dòng cho mỗi dịch vụ khách hay hỏi">
        <div className={styles.scroll}>
          <div className={styles.svcTable}>
            <div className={styles.svcHead}>
              <span>Dịch vụ</span>
              <span>Khách còn gọi là</span>
              <span>Giá · từ – đến</span>
              <span>Đặt hẹn · thời lượng</span>
              <span />
            </div>
            {draft.service_catalog.map((s) => {
              const unpriced = s.price_from == null
              const showNote = openNote === s.id || !!s.service_note
              return (
                <div key={s.id} className={`${styles.svcItem} ${unpriced ? styles.svcWarn : ''}`}>
                  <div className={styles.svcMain}>
                    <TextField compact aria-label="Tên dịch vụ" value={s.service_name} onChange={(e) => setRow(s.id, { service_name: e.target.value })} placeholder="Tên dịch vụ" />

                    <ChipInput value={s.service_aliases} onChange={(v) => setRow(s.id, { service_aliases: v })} addLabel="+" placeholder="tên gọi khác" />

                    {/* One range plus its unit — the shape of the sentence she actually says. */}
                    <div className={styles.svcGroup}>
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
                      />
                      <SelectField<PriceUnit>
                        compact
                        aria-label="Đơn vị tính giá"
                        value={s.price_unit}
                        onChange={(v) => setRow(s.id, { price_unit: v })}
                        options={(Object.keys(LABELS.priceUnit) as PriceUnit[]).map((k) => ({ value: k, label: LABELS.priceUnit[k] }))}
                        style={{ width: 122, flex: '0 0 auto' }}
                      />
                    </div>

                    {/* The slot length only means anything once she is allowed to book it. */}
                    <div className={styles.svcGroup}>
                      <Switch checked={s.is_bookable} onChange={(v) => setRow(s.id, { is_bookable: v })} ariaLabel={`${agent} được đặt hẹn ${s.service_name}`} />
                      <SelectField
                        compact
                        aria-label="Thời lượng một hẹn"
                        value={s.duration == null ? '' : String(s.duration)}
                        onChange={(v) => setRow(s.id, { duration: v ? Number(v) : null })}
                        options={[{ value: '', label: '—' }, ...DURATION_OPTIONS.map((m) => ({ value: String(m), label: `${m} phút` }))]}
                        disabled={!s.is_bookable}
                        style={{ width: 108, flex: '0 0 auto' }}
                      />
                    </div>

                    <div className={styles.svcActions}>
                      <IconButton
                        name="pencil"
                        label={showNote ? 'Ghi chú của dịch vụ này' : 'Thêm ghi chú'}
                        disabled={showNote}
                        onClick={() => setOpenNote(s.id)}
                      />
                      <IconButton name="trash-2" label="Xoá dịch vụ" danger onClick={() => set('service_catalog', draft.service_catalog.filter((x) => x.id !== s.id))} />
                    </div>
                  </div>

                  {showNote ? (
                    <div className={styles.svcNote}>
                      <span className={styles.svcNoteLabel}>
                        <Icon name="pencil" size={12} /> Ghi chú
                      </span>
                      <TextField
                        compact
                        aria-label={`Ghi chú cho ${s.service_name || 'dịch vụ'}`}
                        value={s.service_note}
                        onChange={(e) => setRow(s.id, { service_note: e.target.value })}
                        placeholder={`Một dòng ${agent} được nói thêm — VD: Không áp dụng răng nhiễm tetracycline`}
                        maxLength={140}
                        autoFocus={openNote === s.id && !s.service_note}
                        suffix={
                          <button type="button" className={ui.linkButton} style={{ fontSize: 12 }} onClick={() => { setRow(s.id, { service_note: '' }); setOpenNote(null) }}>
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
        </div>
        <div className={ui.row}>
          <Button variant="ghost" size="sm" onClick={addRow}>
            + Thêm dịch vụ
          </Button>
          <span className={ui.hint}>
            Giá để trống = {agent} mời khách đến khám. Giá 0 = miễn phí. Tắt "Đặt hẹn" = {agent} không tự giữ lịch cho dịch vụ đó (ví dụ niềng răng cần bác sĩ xem trước), và thời lượng không dùng đến.
          </span>
        </div>
      </Card>

      <Card tight>
        <div className={ui.row}>
          <span className={ui.label}>Không làm:</span>
          <ChipInput value={draft.services_not_offered} onChange={(v) => set('services_not_offered', v)} placeholder="VD: Chỉnh nha trẻ dưới 12 tuổi" emptyText="" />
          <span className={ui.hint} style={{ marginLeft: 'auto' }}>
            {agent} từ chối khéo thay vì tự bịa câu trả lời.
          </span>
        </div>
      </Card>

      <Card title="Thanh toán và ưu đãi" gate="O" subtitle={`${agent} chỉ nói khi khách hỏi`}>
        <div className={ui.row} style={{ gap: 16 }}>
          <span className={ui.labelMuted}>Nhận thanh toán</span>
          {(Object.keys(LABELS.payment) as PaymentMethod[]).map((m) => (
            <Checkbox key={m} label={LABELS.payment[m]} checked={draft.payment_methods.includes(m)} onChange={(on) => togglePay(m, on)} />
          ))}
        </div>
        <TextField label="Trả góp" value={draft.instalment_options} onChange={(e) => set('instalment_options', e.target.value)} placeholder="VD: Trả góp 0% qua thẻ tín dụng, đơn từ 10 triệu" hint="Khách hỏi implant và niềng răng hay hỏi câu này." />

        <div className={ui.divider} />
        <div className={ui.cardHead}>
          <span className={ui.label}>Giá combo</span>
          <span className={ui.cardSub}>gói nhiều dịch vụ một giá</span>
          <div className={ui.cardActions}>
            <Button variant="ghost" size="sm" onClick={() => set('package_bundles', [...draft.package_bundles, { id: newId('bd'), bundle_name: '', price: null, note: '' }])}>
              + Thêm combo
            </Button>
          </div>
        </div>
        {draft.package_bundles.length ? (
          <div>
            <TableHead columns={BUNDLE_COLS}>
              <span>Combo</span>
              <span className={ui.right}>Giá</span>
              <span>Ghi chú</span>
              <span />
            </TableHead>
            {draft.package_bundles.map((b) => (
              <TableRow key={b.id} columns={BUNDLE_COLS}>
                <TextField compact aria-label="Tên combo" value={b.bundle_name} onChange={(e) => setBundle(b.id, { bundle_name: e.target.value })} placeholder="Cạo vôi + tẩy trắng" />
                <MoneyField compact aria-label="Giá combo" value={b.price} onChange={(v) => setBundle(b.id, { price: v })} />
                <TextField compact aria-label="Ghi chú combo" value={b.note} onChange={(e) => setBundle(b.id, { note: e.target.value })} placeholder="Áp dụng khách mới" />
                <IconButton name="trash-2" label="Xoá combo" danger onClick={() => set('package_bundles', draft.package_bundles.filter((x) => x.id !== b.id))} />
              </TableRow>
            ))}
          </div>
        ) : null}

        <div className={ui.divider} />
        <div className={ui.cardHead}>
          <span className={ui.label}>Ưu đãi đang chạy</span>
          <span className={ui.cardSub}>hết hạn, {agent} tự ngừng báo — không cần nhớ gỡ</span>
          <div className={ui.cardActions}>
            <Button variant="ghost" size="sm" onClick={() => set('active_promotions', [...draft.active_promotions, { id: newId('pr'), promo_name: '', promo_description: '', valid_from: today, valid_to: today }])}>
              + Thêm ưu đãi
            </Button>
          </div>
        </div>
        {draft.active_promotions.length ? (
          <div style={{ overflowX: 'auto', margin: '0 -24px', padding: '0 24px' }}>
            <div style={{ minWidth: 820 }}>
              <TableHead columns={PROMO_COLS}>
                <span>Tên</span>
                <span>{agent} nói gì</span>
                <span>Từ</span>
                <span>Đến</span>
                <span>Trạng thái</span>
                <span />
              </TableHead>
              {draft.active_promotions.map((p) => {
                const st = promoStatus(p, today)
                return (
                  <TableRow key={p.id} columns={PROMO_COLS}>
                    <TextField compact aria-label="Tên ưu đãi" value={p.promo_name} onChange={(e) => setPromo(p.id, { promo_name: e.target.value })} placeholder="Ưu đãi tháng 9" />
                    <TextField compact aria-label="Nội dung ưu đãi" value={p.promo_description} onChange={(e) => setPromo(p.id, { promo_description: e.target.value })} placeholder="Giảm 20% tẩy trắng" />
                    <DateField compact aria-label="Từ ngày" value={p.valid_from} onChange={(v) => setPromo(p.id, { valid_from: v })} />
                    <DateField compact aria-label="Đến ngày" value={p.valid_to} onChange={(v) => setPromo(p.id, { valid_to: v })} min={p.valid_from} />
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <IconButton name="trash-2" label="Xoá ưu đãi" danger onClick={() => set('active_promotions', draft.active_promotions.filter((x) => x.id !== p.id))} />
                  </TableRow>
                )
              })}
            </div>
          </div>
        ) : (
          <EmptyState title="Không có ưu đãi nào">Thêm khi có chương trình — {agent} chỉ nhắc trong thời gian còn hiệu lực.</EmptyState>
        )}
      </Card>

      <SaveBar {...d.bar} sub={`${priced}/${total} dịch vụ có giá · ${LABELS.pricing[draft.pricing_disclosure_policy]}`} />
    </>
  )
}
