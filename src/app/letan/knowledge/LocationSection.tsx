import { Icon } from '../../../design-system'
import { LABELS } from '../defaults'
import type { Branch, IndustryVertical, VatInvoiceOption } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { Card, Disclosure, EmptyState, IconButton, PlayButton, SaveBar, SelectField, TextField, ui } from '../../ui'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

const KEYS = [
  'business_name',
  'industry_vertical',
  'city',
  'address_full',
  'business_name_spoken',
  'location_landmarks',
  'directions_note',
  'parking_info',
  'digital_links',
  'vat_invoice_policy',
  'branch_list',
] as const

/**
 * `#/app/le-tan/kien-thuc/dia-diem` — where the clinic is.
 *
 * Name and address are the two things every call needs; the rest is what
 * lets her give directions like a person who has been there. The branch
 * table is gone — a branch is three lines, name and number, address, hours.
 */
export function LocationSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Địa điểm và liên hệ')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }

  const advanced = [draft.business_name_spoken, draft.location_landmarks, draft.directions_note, draft.parking_info, draft.digital_links].filter(Boolean).length
  const spokenName = draft.business_name_spoken.trim() || draft.business_name
  const setBranch = (id: string, patch: Partial<Branch>) => set('branch_list', draft.branch_list.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  return (
    <KnowledgeSection
      title="Địa điểm và liên hệ"
      lede={`Khách hỏi đường, ${agent} đọc địa chỉ này. Tên và địa chỉ là hai thứ mọi cuộc gọi cần — phần còn lại giúp ${agent} chỉ đường như người đã đến.`}
      rail={<TryPanel section="dia-diem" config={live} />}
      bar={<SaveBar {...d.bar} sub={`Địa điểm và liên hệ · ${agent} đọc địa chỉ mới từ cuộc gọi tiếp theo`} />}
    >
      <Card title="Phòng khám">
        <TextField
          label="Tên phòng khám"
          value={draft.business_name}
          onChange={(e) => set('business_name', e.target.value)}
          error={draft.business_name.trim().length < 2 ? 'Cần tên phòng khám.' : null}
          hint={`${agent} giới thiệu bằng tên này ở đầu mọi cuộc gọi.`}
        />
        <div className={ui.grid2}>
          <SelectField<IndustryVertical>
            label="Lĩnh vực"
            value={draft.industry_vertical}
            onChange={(v) => set('industry_vertical', v)}
            options={(Object.keys(LABELS.industry) as IndustryVertical[]).map((k) => ({ value: k, label: LABELS.industry[k] }))}
            hint="Chọn sẵn bảng giá mẫu, từ khoá và quy tắc an toàn cho ngành."
          />
          <SelectField label="Thành phố" value={draft.city} onChange={(v) => set('city', v)} options={LABELS.cities} hint="Quyết định giọng miền mặc định và lịch nghỉ lễ." />
        </div>
        <TextField
          label="Địa chỉ"
          value={draft.address_full}
          onChange={(e) => set('address_full', e.target.value)}
          placeholder="Số nhà, đường, phường, quận, thành phố"
          hint={`${agent} đọc nguyên văn địa chỉ này khi khách hỏi đường.`}
          error={draft.address_full.trim().length < 6 ? 'Cần địa chỉ đầy đủ.' : null}
        />
      </Card>

      <Card>
        <Disclosure title="Chỉ đường, gửi xe và liên hệ" subtitle={`giúp ${agent} trả lời tự nhiên hơn · ${advanced}/5 mục`} defaultOpen={advanced > 0}>
          <div className={ui.stack}>
            <TextField
              label="Cách đọc tên"
              value={draft.business_name_spoken}
              onChange={(e) => set('business_name_spoken', e.target.value)}
              placeholder="VD: Vi-ét Smai"
              hint="Khi tên viết khác cách đọc — tên nước ngoài, chữ viết tắt."
              suffix={<PlayButton text={`Em là ${agent}, trợ lý AI của ${spokenName}.`} />}
            />
            <TextField label="Địa danh gần đó" value={draft.location_landmarks} onChange={(e) => set('location_landmarks', e.target.value)} placeholder="VD: Đối diện chợ Bến Thành" hint={`${agent} đọc kèm sau địa chỉ.`} />
            <TextField label="Chỉ đường vào" value={draft.directions_note} onChange={(e) => set('directions_note', e.target.value)} placeholder="VD: Vào hẻm 123, bên tay phải" hint="Cho lối vào khó tìm." />
            <TextField label="Gửi xe" value={draft.parking_info} onChange={(e) => set('parking_info', e.target.value)} placeholder="VD: Xe máy trước cửa, ô tô gửi bãi số 125" />
            <TextField
              label="Zalo / website / fanpage"
              value={draft.digital_links}
              onChange={(e) => set('digital_links', e.target.value)}
              placeholder="VD: zalo.me/vietsmile"
              hint={`${agent} chỉ nhắc khi khách muốn nhắn tin hay xem thêm.`}
            />
            <div className={ui.stackTight}>
              <SelectField<VatInvoiceOption>
                label="Hoá đơn VAT"
                value={draft.vat_invoice_policy.option}
                onChange={(v) => set('vat_invoice_policy', { ...draft.vat_invoice_policy, option: v })}
                options={(['yes', 'on_request', 'no'] as VatInvoiceOption[]).map((k) => ({ value: k, label: LABELS.vat[k] }))}
              />
              {draft.vat_invoice_policy.option !== 'no' ? (
                <TextField
                  aria-label="Ghi chú hoá đơn"
                  value={draft.vat_invoice_policy.note}
                  onChange={(e) => set('vat_invoice_policy', { ...draft.vat_invoice_policy, note: e.target.value })}
                  placeholder="Cần gì để xuất: mã số thuế, báo trước khi thanh toán…"
                  compact
                />
              ) : null}
            </div>
          </div>
        </Disclosure>
      </Card>

      <Card title="Chi nhánh khác" subtitle={`khách gọi nhầm nơi, ${agent} đọc địa chỉ và số của chi nhánh đúng`}>
        {draft.branch_list.length ? (
          <div>
            {draft.branch_list.map((b) => (
              <div key={b.id} className={styles.item}>
                <div className={styles.line}>
                  <TextField className={styles.grow} compact aria-label="Tên chi nhánh" value={b.branch_name} onChange={(e) => setBranch(b.id, { branch_name: e.target.value })} placeholder="Chi nhánh Đà Nẵng" />
                  <TextField className={styles.half} compact numeric inputMode="tel" aria-label="Số chi nhánh" value={b.branch_phone} onChange={(e) => setBranch(b.id, { branch_phone: e.target.value })} placeholder="0236 xxx xxxx" />
                  <div className={styles.itemActions}>
                    <IconButton name="trash" label="Xoá chi nhánh" danger onClick={() => set('branch_list', draft.branch_list.filter((x) => x.id !== b.id))} />
                  </div>
                </div>
                <div className={styles.line}>
                  <TextField className={styles.grow} compact aria-label="Địa chỉ chi nhánh" value={b.branch_address} onChange={(e) => setBranch(b.id, { branch_address: e.target.value })} placeholder="Địa chỉ: 45 Nguyễn Huệ, Đà Nẵng" />
                  <TextField className={styles.half} compact aria-label="Giờ riêng" value={b.branch_hours_note} onChange={(e) => setBranch(b.id, { branch_hours_note: e.target.value })} placeholder="Giờ riêng nếu khác: T2–T6 08:00–17:00" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chỉ có một địa điểm">Nếu phòng khám có chi nhánh khác, thêm vào để {agent} chuyển khách gọi nhầm nơi thay vì nói không biết.</EmptyState>
        )}
        <button
          type="button"
          className={styles.idea}
          onClick={() => set('branch_list', [...draft.branch_list, { id: newId('br'), branch_name: '', branch_address: '', branch_phone: '', branch_hours_note: '' }])}
        >
          <span className={styles.ideaPlus}>
            <Icon name="plus" size={14} />
          </span>
          <span>Thêm chi nhánh</span>
        </button>
      </Card>
    </KnowledgeSection>
  )
}
