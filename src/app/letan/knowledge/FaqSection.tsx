import { Button } from '../../../design-system'
import type { FaqPair } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { SectionHead } from '../LeTanPage'
import { Card, ChipButton, EmptyState, IconButton, Notice, SaveBar, TextArea, TextField, ui } from '../../ui'

const KEYS = ['faq_pairs'] as const

const IDEAS = [
  'Có nhổ răng khôn không?',
  'Trẻ em mấy tuổi khám được?',
  'Có làm việc Chủ nhật không?',
  'Nhổ răng có đau không?',
  'Tẩy trắng giữ được bao lâu?',
  'Có bác sĩ nữ không?',
  'Có nhận khách không hẹn trước không?',
]

export function FaqSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Câu hỏi thường gặp')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'

  const setRow = (id: string, patch: Partial<FaqPair>) => set('faq_pairs', draft.faq_pairs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const add = (question = '') => set('faq_pairs', [...draft.faq_pairs, { id: newId('faq'), question, answer: '' }])
  const asked = new Set(draft.faq_pairs.map((f) => f.question.trim()))

  return (
    <>
      <SectionHead
        title="Câu hỏi thường gặp"
        badge={draft.faq_pairs.length ? { tone: 'success', label: `${draft.faq_pairs.length} câu` } : { tone: 'neutral', label: 'Không bắt buộc' }}
        actions={
          <Button size="sm" variant="secondary" onClick={() => add()}>
            + Thêm câu hỏi
          </Button>
        }
      />

      <Notice tone="neutral" icon="circle-help">
        Chỗ cho mọi câu khách hay hỏi mà các mục khác chưa có. Viết câu trả lời như bạn nói với khách — {agent} đọc gần nguyên văn. Đừng đưa lời khuyên y khoa: {agent} sẽ chuyển máy cho bác sĩ thay vì trả lời.
      </Notice>

      <div className={ui.row}>
        <span className={ui.hint}>Gợi ý:</span>
        {IDEAS.filter((q) => !asked.has(q)).map((q) => (
          <ChipButton key={q} onClick={() => add(q)}>
            + {q}
          </ChipButton>
        ))}
      </div>

      {draft.faq_pairs.length ? (
        <div className={ui.stack}>
          {draft.faq_pairs.map((f, i) => (
            <Card key={f.id} tight>
              <div className={ui.grid2}>
                <TextField label={`Câu hỏi ${i + 1}`} value={f.question} onChange={(e) => setRow(f.id, { question: e.target.value })} placeholder="Khách hỏi gì?" />
                <TextArea label={`${agent} trả lời`} value={f.answer} onChange={(e) => setRow(f.id, { answer: e.target.value })} placeholder="VD: Có ạ, bác sĩ Hùng phụ trách. Anh chị đặt lịch để bác sĩ xem phim trước nhé." rows={2} maxLength={400} />
              </div>
              <div className={ui.row} style={{ justifyContent: 'flex-end' }}>
                <IconButton name="trash-2" label="Xoá câu hỏi" danger onClick={() => set('faq_pairs', draft.faq_pairs.filter((x) => x.id !== f.id))} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có câu hỏi nào">Bấm một gợi ý ở trên, hoặc thêm câu của riêng phòng khám.</EmptyState>
      )}

      <SaveBar dirty={d.dirty} saving={d.saving} onSave={d.save} onCancel={d.cancel} sub={`${draft.faq_pairs.filter((f) => f.question.trim() && f.answer.trim()).length} câu có trả lời`} />
    </>
  )
}
