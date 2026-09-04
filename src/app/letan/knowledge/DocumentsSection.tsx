import { useRef, useState } from 'react'
import { Badge, Icon } from '../../../design-system'
import { api, messageFor } from '../../../api'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, IconButton, Notice, SaveBar, TextField, ui } from '../../ui'
import styles from './Knowledge.module.css'

const KEYS = ['knowledge_files', 'website_scrape_url'] as const
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'
const MAX_BYTES = 20 * 1024 * 1024

function fmtSize(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

export function DocumentsSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Tài liệu và website')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  /*
   * Uploads through `api.tenant`, which is what turns this from a list of
   * filenames into files the extraction service can actually read.
   *
   * Each file is added to the list optimistically so the row appears the
   * instant it is dropped, then replaced by the stored record — the server's
   * id, and its `status`, which is what a later `indexed` will arrive on. A
   * failed upload takes its own row back out and says which file it was.
   */
  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const accepted: File[] = []
    let bad: string | null = null

    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) {
        bad = `${f.name} quá 20 MB.`
        continue
      }
      if (draft.knowledge_files.some((x) => x.name === f.name)) continue
      accepted.push(f)
    }
    setRejected(bad)
    if (!accepted.length) return

    const pending = accepted.map((f) => ({
      file: f,
      row: { id: newId('file'), name: f.name, size: f.size, status: 'queued' as const },
    }))
    let list = [...draft.knowledge_files, ...pending.map((p) => p.row)]
    set('knowledge_files', list)
    setUploading(pending.length)

    for (const { file, row } of pending) {
      try {
        const stored = await api.tenant.uploadKnowledgeFile(file)
        list = list.map((x) => (x.id === row.id ? stored : x))
      } catch (e) {
        list = list.filter((x) => x.id !== row.id)
        setRejected(`${file.name}: ${messageFor(e)}`)
      }
      set('knowledge_files', list)
      setUploading((n) => n - 1)
    }
  }

  const urlOk = !draft.website_scrape_url.trim() || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(draft.website_scrape_url.trim())

  return (
    <>
      <SectionHead title="Tài liệu và website" badge={draft.knowledge_files.length || draft.website_scrape_url ? { tone: 'success', label: 'Có nguồn' } : { tone: 'neutral', label: 'Không bắt buộc' }} />

      <Notice tone="info" icon="info">
        Fonnus đọc bảng giá, tờ rơi và website để gợi ý điền các mục Kiến thức. Bạn duyệt từng gợi ý trước khi {agent} dùng — không có gì tự động lên sóng. Tính năng đọc tài liệu hoàn thiện trong tháng 10.
      </Notice>

      <div className={ui.grid2}>
        <Card title="Tải tài liệu" gate="O" subtitle="bảng giá, tờ rơi, danh sách dịch vụ">
          <div
            className={`${styles.drop} ${over ? styles.dropOver : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              void addFiles(e.dataTransfer.files)
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
          >
            <Icon name="document" size={22} />
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Kéo thả hoặc bấm để chọn</span>
            <span className={ui.hint}>PDF, Word, Excel, ảnh · tối đa 20 MB mỗi tệp</span>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => void addFiles(e.target.files)} />
          </div>
          {uploading > 0 ? (
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Đang tải lên {uploading} tệp…</span>
          ) : null}
          {rejected ? <span style={{ fontSize: 12.5, color: 'var(--error)' }}>{rejected}</span> : null}
          {draft.knowledge_files.length ? (
            <div>
              {draft.knowledge_files.map((f) => (
                <div key={f.id} className={styles.fileRow}>
                  <Icon name="document" size={16} color="var(--text-accent)" />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span className={`${ui.num} ${ui.hint}`}>{fmtSize(f.size)}</span>
                  <Badge tone={f.status === 'indexed' ? 'success' : 'neutral'}>{f.status === 'indexed' ? 'Đã đọc' : 'Chờ đọc'}</Badge>
                  <IconButton name="trash" label="Bỏ tệp" danger onClick={() => set('knowledge_files', draft.knowledge_files.filter((x) => x.id !== f.id))} />
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card title="Website hoặc fanpage" gate="O" subtitle="Fonnus đọc trang công khai của phòng khám">
          <TextField
            label="Địa chỉ trang"
            value={draft.website_scrape_url}
            onChange={(e) => set('website_scrape_url', e.target.value)}
            placeholder="vietsmile.vn"
            prefix={<Icon name="globe" size={16} />}
            error={urlOk ? null : 'Địa chỉ chưa đúng dạng.'}
            hint="Chỉ đọc nội dung công khai: dịch vụ, giá, giờ, địa chỉ. Không đăng nhập vào đâu cả."
            inputMode="url"
            autoComplete="url"
          />
        </Card>
      </div>

      <SaveBar {...d.bar} sub="Tài liệu và website · Fonnus sẽ gửi gợi ý sau khi đọc xong" />
    </>
  )
}
