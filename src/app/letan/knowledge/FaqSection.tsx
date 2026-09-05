import { useState } from 'react'
import type { FaqPair } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { AddButton, Card, EmptyState, IconButton, SaveBar, Suggestion, Suggestions, TextArea, TextField, useAppear } from '../../ui'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

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

/**
 * `#/app/le-tan/kien-thuc/cau-hoi` — everything the other pages do not cover.
 *
 * A question and the answer she reads almost verbatim, one block each inside
 * the card that holds them — the same shape as a branch on Địa điểm or a
 * doctor on Bác sĩ.
 *
 * The suggestions sit under the same card rather than in one of their own:
 * they write into this list, and a reader should not have to carry the link
 * between two cards to see that. They are whole sentences, so rows rather
 * than pills. The try-out panel offers the clinic's own questions back as
 * prompts.
 */
export function FaqSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Câu hỏi thường gặp')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const [focused, setFocused] = useState<string | null>(null)

  const setRow = (id: string, patch: Partial<FaqPair>) => set('faq_pairs', draft.faq_pairs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const add = (question = '') => {
    const id = newId('faq')
    set('faq_pairs', [...draft.faq_pairs, { id, question, answer: '' }])
    setFocused(id)
  }
  const rows = useAppear(draft.faq_pairs.map((f) => f.id))
  const asked = new Set(draft.faq_pairs.map((f) => f.question.trim()))
  const unused = IDEAS.filter((q) => !asked.has(q))
  const answered = draft.faq_pairs.filter((f) => f.question.trim() && f.answer.trim()).length

  return (
    <KnowledgeSection
      title="Câu hỏi thường gặp"
      lede={`Chỗ cho mọi câu khách hay hỏi mà các mục khác chưa có. Viết câu trả lời như bạn nói với khách — ${agent} đọc gần nguyên văn. Đừng đưa lời khuyên y khoa: ${agent} sẽ chuyển máy cho bác sĩ thay vì trả lời.`}
      rail={<TryPanel section="cau-hoi" config={live} />}
      bar={<SaveBar {...d.bar} sub={`${answered} câu có trả lời · ${agent} dùng từ cuộc gọi tiếp theo`} />}
    >
      <Card
        title="Câu hỏi của phòng khám"
        subtitle={draft.faq_pairs.length ? `${answered}/${draft.faq_pairs.length} câu có trả lời` : `${agent} đọc gần nguyên văn câu bạn viết`}
        actions={<AddButton label="Thêm câu hỏi" onClick={() => add()} />}
      >
        {draft.faq_pairs.length ? (
          <div className={styles.entries}>
            {draft.faq_pairs.map((f, i) => (
              <div key={f.id} ref={rows.ref(f.id)} className={styles.entry} onFocusCapture={() => setFocused(f.id)}>
                <div className={styles.entryHead}>
                  <span className={styles.entryTitle}>Câu hỏi {i + 1}</span>
                  <IconButton name="trash" label="Xoá câu hỏi" danger onClick={() => rows.leave(f.id, () => set('faq_pairs', (list) => list.filter((x) => x.id !== f.id)))} />
                </div>
                <TextField label="Khách hỏi" value={f.question} onChange={(e) => setRow(f.id, { question: e.target.value })} placeholder="Khách hỏi gì?" autoFocus={focused === f.id && !f.question} />
                <TextArea
                  label={`${agent} trả lời`}
                  value={f.answer}
                  onChange={(e) => setRow(f.id, { answer: e.target.value })}
                  placeholder="VD: Có ạ, bác sĩ Hùng phụ trách. Anh chị đặt lịch để bác sĩ xem phim trước nhé."
                  rows={2}
                  maxLength={400}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có câu hỏi nào">Bấm một gợi ý bên dưới, hoặc thêm câu của riêng phòng khám.</EmptyState>
        )}

        {unused.length ? (
          <Suggestions hint="cho phòng khám nha khoa">
            {unused.map((q) => (
              <Suggestion key={q} onClick={() => add(q)}>
                {q}
              </Suggestion>
            ))}
          </Suggestions>
        ) : null}
      </Card>
    </KnowledgeSection>
  )
}
