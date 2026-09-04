import { Icon } from '../../../design-system'
import type { Keyterm } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { Card, Chip, EmptyState, IconButton, SaveBar, TableHead, TableRow, TextField, ui } from '../../ui'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

const KEYS = ['keyterms'] as const
const COLS = 'minmax(0, 1fr) minmax(0, 1fr) 32px'

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

/**
 * `#/app/le-tan/kien-thuc/tu-khoa` — the words the machine mishears.
 *
 * Most of the list writes itself from the other pages and the vertical pack;
 * the owner adds only what those miss — a competitor's name, a drug, an
 * alley. The try-out panel's prompts say a term the way callers say it, so
 * the owner hears it come back right.
 */
export function KeytermsSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Từ hay nghe nhầm')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const derived = derivedKeyterms(config)
  const pack = draft.keyterms.filter((k) => k.source === 'pack')
  const mine = draft.keyterms.filter((k) => k.source === 'tenant')

  const setRow = (id: string, patch: Partial<Keyterm>) => set('keyterms', draft.keyterms.map((k) => (k.id === id ? { ...k, ...patch } : k)))
  const add = () => set('keyterms', [...draft.keyterms, { id: newId('kt'), term: '', phonetic_hint: '', source: 'tenant' }])

  return (
    <KnowledgeSection
      title="Từ hay nghe nhầm"
      lede={`Tên riêng, thương hiệu, tên đường — những từ máy nghe dễ nhầm. ${agent} đã tự lấy tên phòng khám, dịch vụ và bác sĩ từ các mục khác; bạn chỉ thêm từ còn thiếu: tên đối thủ khách hay so sánh, tên thuốc, tên hẻm.`}
      rail={<TryPanel section="tu-khoa" config={live} />}
      bar={<SaveBar {...d.bar} sub="Từ hay nghe nhầm · áp dụng cho cuộc gọi tiếp theo" />}
    >
      <Card title="Từ của phòng khám" subtitle="thêm từ và cách khách thường đọc">
        {mine.length ? (
          <div>
            <TableHead columns={COLS}>
              <span>Từ</span>
              <span>Khách hay đọc thành</span>
              <span />
            </TableHead>
            {mine.map((k) => (
              <TableRow key={k.id} columns={COLS}>
                <TextField compact aria-label="Từ" value={k.term} onChange={(e) => setRow(k.id, { term: e.target.value })} placeholder="VD: Invisalign" />
                <TextField compact aria-label="Cách đọc" value={k.phonetic_hint} onChange={(e) => setRow(k.id, { phonetic_hint: e.target.value })} placeholder="VD: in-vi-za-lai" />
                <IconButton name="trash" label="Xoá từ" danger onClick={() => set('keyterms', draft.keyterms.filter((x) => x.id !== k.id))} />
              </TableRow>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa thêm từ nào">Ví dụ: "Hẻm Sư Vạn Hạnh", "Osstem", "Nha khoa Kim" (đối thủ khách hay nhắc).</EmptyState>
        )}
        <button type="button" className={styles.idea} onClick={add}>
          <span className={styles.ideaPlus}>
            <Icon name="plus" size={14} />
          </span>
          <span>{mine.length ? 'Thêm từ' : 'Thêm từ đầu tiên'}</span>
        </button>
      </Card>

      <Card title="Tự lấy từ các mục khác" subtitle="đổi tên dịch vụ hay thêm bác sĩ, danh sách này tự cập nhật">
        <div className={ui.row}>
          {derived.map((t) => (
            <Chip key={t} system>
              {t}
            </Chip>
          ))}
        </div>
      </Card>

      <Card title="Bộ từ ngành nha khoa" subtitle="Fonnus cập nhật theo ngành — không cần sửa">
        <div className={ui.row}>
          {pack.map((k) => (
            <Chip key={k.id} system>
              {k.term}
            </Chip>
          ))}
        </div>
      </Card>
    </KnowledgeSection>
  )
}
