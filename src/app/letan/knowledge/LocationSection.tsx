import { Button } from '../../../design-system'
import { LABELS } from '../defaults'
import type { Branch, IndustryVertical, VatInvoiceOption } from '../model'
import { newId } from '../model'
import { computeReadiness } from '../readiness'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, Disclosure, EmptyState, IconButton, PlayButton, SaveBar, SelectField, SpeechBubble, TableHead, TableRow, TextField, ui } from '../../ui'

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

const BRANCH_COLS = '1fr 1.5fr 1fr 1fr 32px'

export function LocationSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Địa điểm và liên hệ')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const r = computeReadiness({ ...config, ...draft })
  const idDone = ['business_name', 'industry_vertical', 'city', 'address_full'].every((id) => r.checks.find((c) => c.id === id)?.done)
  const advanced = [draft.business_name_spoken, draft.location_landmarks, draft.directions_note, draft.parking_info, draft.digital_links].filter(Boolean).length

  const setBranch = (id: string, patch: Partial<Branch>) => set('branch_list', draft.branch_list.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const spokenName = draft.business_name_spoken.trim() || draft.business_name

  return (
    <>
      <SectionHead title="Địa điểm và liên hệ" badge={idDone ? { tone: 'success', label: 'Đủ' } : { tone: 'warning', label: 'Còn thiếu' }} />

      <Card gate="R1" title="Phòng khám" subtitle={`${agent} giới thiệu bằng tên này và đọc địa chỉ khi khách hỏi đường.`}>
        <div className={ui.grid3}>
          <TextField label="Tên phòng khám" value={draft.business_name} onChange={(e) => set('business_name', e.target.value)} error={draft.business_name.trim().length < 2 ? 'Cần tên phòng khám.' : null} />
          <SelectField<IndustryVertical>
            label="Lĩnh vực"
            value={draft.industry_vertical}
            onChange={(v) => set('industry_vertical', v)}
            options={(Object.keys(LABELS.industry) as IndustryVertical[]).map((k) => ({ value: k, label: LABELS.industry[k] }))}
            hint="Chọn sẵn bảng giá mẫu, từ khoá và quy tắc an toàn cho ngành."
          />
          <SelectField label="Thành phố" value={draft.city} onChange={(v) => set('city', v)} options={LABELS.cities} hint="Quyết định giọng miền mặc định và lịch nghỉ lễ." />
          <TextField
            className={ui.span2}
            label="Địa chỉ"
            value={draft.address_full}
            onChange={(e) => set('address_full', e.target.value)}
            placeholder="Số nhà, đường, phường, quận, thành phố"
            hint={`${agent} đọc địa chỉ này khi khách hỏi đường.`}
            error={draft.address_full.trim().length < 6 ? 'Cần địa chỉ đầy đủ.' : null}
          />
          <div className={ui.stackTight} style={{ alignSelf: 'end' }}>
            <SpeechBubble speak text={`Phòng khám ở ${draft.address_full}${draft.location_landmarks ? `, ${draft.location_landmarks.toLowerCase()}` : ''} ạ.`} who={`${agent} nói`}>
              Phòng khám ở {draft.address_full || '…'}
              {draft.location_landmarks ? `, ${draft.location_landmarks.toLowerCase()}` : ''} ạ.
            </SpeechBubble>
          </div>
        </div>
      </Card>

      <Card>
        <Disclosure title="Chỉ đường, gửi xe và liên hệ" subtitle={`không bắt buộc — giúp ${agent} trả lời tự nhiên hơn · ${advanced}/5 mục`} defaultOpen={advanced > 0}>
          <div className={ui.grid2}>
            <TextField
              label="Cách đọc tên"
              value={draft.business_name_spoken}
              onChange={(e) => set('business_name_spoken', e.target.value)}
              placeholder="VD: Vi-ét Smai"
              hint="Khi tên viết khác cách đọc — tên nước ngoài, chữ viết tắt."
              suffix={<PlayButton text={`Em là ${agent}, trợ lý AI của ${spokenName}.`} />}
            />
            <TextField label="Địa danh gần đó" value={draft.location_landmarks} onChange={(e) => set('location_landmarks', e.target.value)} placeholder="VD: Đối diện chợ Bến Thành" />
            <TextField label="Chỉ đường vào" value={draft.directions_note} onChange={(e) => set('directions_note', e.target.value)} placeholder="VD: Vào hẻm 123, bên tay phải" hint="Cho lối vào khó tìm." />
            <TextField label="Gửi xe" value={draft.parking_info} onChange={(e) => set('parking_info', e.target.value)} placeholder="VD: Xe máy trước cửa, ô tô gửi bãi số 125" />
            <TextField label="Zalo / website / fanpage" value={draft.digital_links} onChange={(e) => set('digital_links', e.target.value)} placeholder="VD: zalo.me/vietsmile" hint={`${agent} chỉ nhắc khi khách muốn nhắn tin hay xem thêm.`} />
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

      <Card
        title="Chi nhánh khác"
        gate="O"
        subtitle={`khách gọi nhầm nơi, ${agent} đọc địa chỉ và số của chi nhánh đúng`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => set('branch_list', [...draft.branch_list, { id: newId('br'), branch_name: '', branch_address: '', branch_phone: '', branch_hours_note: '' }])}>
            + Thêm chi nhánh
          </Button>
        }
      >
        {draft.branch_list.length ? (
          <div>
            <TableHead columns={BRANCH_COLS}>
              <span>Tên</span>
              <span>Địa chỉ</span>
              <span>Số điện thoại</span>
              <span>Giờ riêng (nếu khác)</span>
              <span />
            </TableHead>
            {draft.branch_list.map((b) => (
              <TableRow key={b.id} columns={BRANCH_COLS}>
                <TextField compact aria-label="Tên chi nhánh" value={b.branch_name} onChange={(e) => setBranch(b.id, { branch_name: e.target.value })} placeholder="Chi nhánh Đà Nẵng" />
                <TextField compact aria-label="Địa chỉ chi nhánh" value={b.branch_address} onChange={(e) => setBranch(b.id, { branch_address: e.target.value })} placeholder="45 Nguyễn Huệ, Đà Nẵng" />
                <TextField compact numeric inputMode="tel" aria-label="Số chi nhánh" value={b.branch_phone} onChange={(e) => setBranch(b.id, { branch_phone: e.target.value })} placeholder="0236 xxx xxxx" />
                <TextField compact aria-label="Giờ riêng" value={b.branch_hours_note} onChange={(e) => setBranch(b.id, { branch_hours_note: e.target.value })} placeholder="T2–T6 08:00–17:00" />
                <IconButton name="trash-2" label="Xoá chi nhánh" danger onClick={() => set('branch_list', draft.branch_list.filter((x) => x.id !== b.id))} />
              </TableRow>
            ))}
          </div>
        ) : (
          <EmptyState title="Chỉ có một địa điểm">Nếu phòng khám có chi nhánh khác, thêm vào để {agent} chuyển khách gọi nhầm nơi thay vì nói không biết.</EmptyState>
        )}
      </Card>

      <SaveBar dirty={d.dirty} saving={d.saving} onSave={d.save} onCancel={d.cancel} sub="Địa điểm và liên hệ" />
    </>
  )
}
