import { Button } from '../../../design-system'
import type { Keyterm } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, Chip, EmptyState, GateTag, IconButton, Notice, SaveBar, TableHead, TableRow, TextField, ui } from '../../ui'

const KEYS = ['keyterms'] as const
const COLS = '1fr 1fr 32px'

/** `keyterms` rows the system derives (SD) — shown so the tenant does not retype them. */
export function derivedKeyterms(cfg: { business_name: string; service_catalog: { service_name: string; service_aliases: string[] }[]; practitioner_roster: { practitioner_name: string }[] }): string[] {
  const out = new Set<string>()
  if (cfg.business_name.trim()) out.add(cfg.business_name.trim())
  for (const s of cfg.service_catalog) {
    if (s.service_name.trim()) out.add(s.service_name.trim())
    for (const a of s.service_aliases) out.add(a)
  }
  for (const p of cfg.practitioner_roster) if (p.practitioner_name.trim()) out.add(p.practitioner_name.trim())
  return [...out]
}

export function KeytermsSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Từ hay nghe nhầm')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const derived = derivedKeyterms(config)
  const pack = draft.keyterms.filter((k) => k.source === 'pack')
  const mine = draft.keyterms.filter((k) => k.source === 'tenant')

  const setRow = (id: string, patch: Partial<Keyterm>) => set('keyterms', draft.keyterms.map((k) => (k.id === id ? { ...k, ...patch } : k)))
  const add = () => set('keyterms', [...draft.keyterms, { id: newId('kt'), term: '', phonetic_hint: '', source: 'tenant' }])

  return (
    <>
      <SectionHead
        title="Từ hay nghe nhầm"
        badge={mine.length ? { tone: 'success', label: `${mine.length} từ thêm` } : { tone: 'neutral', label: 'Không bắt buộc' }}
        actions={
          <Button size="sm" variant="secondary" onClick={add}>
            + Thêm từ
          </Button>
        }
      />

      <Notice tone="neutral" icon="ear">
        Tên riêng, thương hiệu, tên đường — những từ máy nghe dễ nhầm. {agent} đã tự lấy tên phòng khám, dịch vụ và bác sĩ từ các mục khác; bạn chỉ thêm từ còn thiếu: tên đối thủ khách hay so sánh, tên thuốc, tên hẻm.
      </Notice>

      <Card title="Từ của phòng khám" gate="O" subtitle="thêm từ và cách khách thường đọc">
        {mine.length ? (
          <div>
            <TableHead columns={COLS}>
              <span>Từ</span>
              <span>Khách hay đọc thành (không bắt buộc)</span>
              <span />
            </TableHead>
            {mine.map((k) => (
              <TableRow key={k.id} columns={COLS}>
                <TextField compact aria-label="Từ" value={k.term} onChange={(e) => setRow(k.id, { term: e.target.value })} placeholder="VD: Invisalign" />
                <TextField compact aria-label="Cách đọc" value={k.phonetic_hint} onChange={(e) => setRow(k.id, { phonetic_hint: e.target.value })} placeholder="VD: in-vi-za-lai" />
                <IconButton name="trash-2" label="Xoá từ" danger onClick={() => set('keyterms', draft.keyterms.filter((x) => x.id !== k.id))} />
              </TableRow>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa thêm từ nào" action={<Button size="sm" variant="secondary" onClick={add}>+ Thêm từ đầu tiên</Button>}>
            Ví dụ: "Hẻm Sư Vạn Hạnh", "Osstem", "Nha khoa Kim" (đối thủ khách hay nhắc).
          </EmptyState>
        )}
      </Card>

      <div className={ui.grid2}>
        <Card tight title="Tự lấy từ các mục khác" subtitle={<GateTag gate="SW" />}>
          <div className={ui.row}>
            {derived.map((t) => (
              <Chip key={t} system>
                {t}
              </Chip>
            ))}
          </div>
          <span className={ui.hint}>Đổi tên dịch vụ hay thêm bác sĩ, danh sách này tự cập nhật.</span>
        </Card>
        <Card tight title="Bộ từ ngành nha khoa" subtitle={<GateTag gate="SW" />}>
          <div className={ui.row}>
            {pack.map((k) => (
              <Chip key={k.id} system>
                {k.term}
              </Chip>
            ))}
          </div>
          <span className={ui.hint}>Fonnus cập nhật theo ngành. Không cần sửa.</span>
        </Card>
      </div>

      <SaveBar dirty={d.dirty} saving={d.saving} onSave={d.save} onCancel={d.cancel} sub="Từ hay nghe nhầm" />
    </>
  )
}
