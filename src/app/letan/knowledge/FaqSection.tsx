import { useEffect, useState } from 'react'
import type { FaqPair } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import {
  AddButton,
  Card,
  DeleteButton,
  EmptyState,
  ExpandRow,
  FOLD_MS,
  RowEdit,
  RowEditFoot,
  RowList,
  RowMissing,
  RowText,
  RowValue,
  SaveBar,
  Suggestion,
  SuggestionMore,
  Suggestions,
  TextArea,
  TextField,
  useAppear,
} from '../../ui'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'

const KEYS = ['faq_pairs'] as const

const IDEAS = [
  'Có nhổ răng khôn không?',
  'Trẻ em mấy tuổi khám được?',
  'Nhổ răng có đau không?',
  'Có làm việc Chủ nhật không?',
  'Tẩy trắng giữ được bao lâu?',
  'Có bác sĩ nữ không?',
  'Có nhận khách không hẹn trước không?',
]

/** How many ready-made questions stand before the rest go behind one line. */
const IDEAS_SHOWN = 3

/**
 * `#/app/le-tan/kien-thuc/cau-hoi` — everything the other pages do not cover.
 *
 * The page is the cheat-sheet taped beside the phone: the caller's question
 * on the left, the line she reads underneath it, one row each. Closed, a row
 * shows both — so the owner scans what the clinic already answers instead of
 * reading a stack of open textareas — and a row with no answer wears the
 * dashed edge and says so where a price row says "chưa có giá".
 *
 * There is no `Said` line here, and that is deliberate: on every other page
 * a sentence is *derived* from fields, but here the field **is** the
 * sentence. Printing it twice would say the page did not trust the owner to
 * see that.
 *
 * The suggestions sit inside the card they write into (§5), three at a time.
 * Seven dashed rows were taller than the list above them, which made the
 * card read as a page of examples with a list attached.
 */
export function FaqSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Câu hỏi thường gặp')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const pairs = draft.faq_pairs

  /*
   * One open row, the same as the price list and the roster: `closingId`
   * keeps the row that just closed mounted for a fold so it can animate, and
   * `fresh` is the questions added on this visit, whose first empty field
   * takes focus.
   */
  const [openId, setOpenId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string[]>([])
  const [allIdeas, setAllIdeas] = useState(false)
  useEffect(() => {
    if (!closingId) return
    const t = window.setTimeout(() => setClosingId(null), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [closingId])
  const close = (id: string) => {
    if (openId === id) {
      setClosingId(id)
      setOpenId(null)
    }
  }
  const openRow = (id: string) => {
    if (openId && openId !== id) setClosingId(openId)
    setOpenId(id)
  }
  const toggle = (id: string) => (openId === id ? close(id) : openRow(id))

  // A press outside the open row shuts it; the save bar is the only "done".
  useEffect(() => {
    if (!openId) return
    const onPress = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Element) || t.closest('[data-popup]')) return
      if (document.querySelector(`[data-row-id="${CSS.escape(openId)}"]`)?.contains(t)) return
      close(openId)
    }
    document.addEventListener('pointerdown', onPress, true)
    return () => document.removeEventListener('pointerdown', onPress, true)
    // `close` is rebuilt every render; the effect only needs the one for this `openId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const rows = useAppear(pairs.map((f) => f.id))
  const setRow = (id: string, patch: Partial<FaqPair>) => set('faq_pairs', pairs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const add = (question = '') => {
    const id = newId('faq')
    set('faq_pairs', [...pairs, { id, question, answer: '' }])
    setFresh((f) => [...f, id])
    openRow(id)
  }
  const remove = (id: string) => {
    close(id)
    rows.leave(id, () => set('faq_pairs', (list) => list.filter((x) => x.id !== id)))
  }

  const asked = new Set(pairs.map((f) => f.question.trim()))
  const unused = IDEAS.filter((q) => !asked.has(q))
  const shownIdeas = allIdeas ? unused : unused.slice(0, IDEAS_SHOWN)
  const answered = pairs.filter((f) => f.question.trim() && f.answer.trim()).length

  return (
    <KnowledgeSection
      title="Câu hỏi thường gặp"
      lede={`Chỗ cho mọi câu khách hay hỏi mà các mục khác chưa có. Viết câu trả lời như bạn nói với khách — ${agent} đọc gần nguyên văn, và không tự đưa lời khuyên y khoa.`}
      rail={<TryPanel section="cau-hoi" config={live} />}
      bar={<SaveBar {...d.bar} sub={`${answered} câu có trả lời · ${agent} dùng từ cuộc gọi tiếp theo`} />}
    >
      <Card
        title="Câu hỏi của phòng khám"
        subtitle={pairs.length ? `${answered}/${pairs.length} câu có trả lời` : `${agent} đọc gần nguyên văn câu bạn viết`}
        actions={<AddButton label="Thêm câu hỏi" onClick={() => add()} />}
      >
        {pairs.length ? (
          <RowList>
            {pairs.map((f) => {
              const answer = f.answer.trim()
              return (
                <ExpandRow
                  key={f.id}
                  rowId={f.id}
                  rowRef={rows.ref(f.id)}
                  open={openId === f.id}
                  mounted={openId === f.id || closingId === f.id}
                  unfilled={!answer}
                  onToggle={() => toggle(f.id)}
                  summary={
                    <>
                      <RowText name={f.question} placeholder="Câu hỏi chưa viết" sub={answer || null} />
                      {answer ? null : (
                        <RowValue>
                          <RowMissing>chưa có câu trả lời</RowMissing>
                        </RowValue>
                      )}
                    </>
                  }
                >
                  <RowEdit>
                    <TextField
                      compact
                      label="Khách hỏi"
                      value={f.question}
                      onChange={(e) => setRow(f.id, { question: e.target.value })}
                      placeholder="VD: Nhổ răng có đau không?"
                      autoFocus={fresh.includes(f.id) && !f.question}
                    />
                    <TextArea
                      label={`${agent} trả lời`}
                      value={f.answer}
                      onChange={(e) => setRow(f.id, { answer: e.target.value })}
                      placeholder="VD: Dạ có ạ, bác sĩ Hùng phụ trách. Anh chị đặt lịch để bác sĩ xem phim trước nhé."
                      rows={3}
                      maxLength={400}
                      autoFocus={fresh.includes(f.id) && !!f.question}
                    />
                    <RowEditFoot>
                      <DeleteButton label="Xoá câu hỏi" onClick={() => remove(f.id)} />
                    </RowEditFoot>
                  </RowEdit>
                </ExpandRow>
              )
            })}
          </RowList>
        ) : (
          <EmptyState title="Chưa có câu hỏi nào">
            Mỗi dòng là một câu khách hay hỏi và câu {agent} đọc lại. Bấm một gợi ý bên dưới để bắt đầu.
          </EmptyState>
        )}

        {shownIdeas.length ? (
          <Suggestions hint="cho phòng khám nha khoa">
            {shownIdeas.map((q) => (
              <Suggestion key={q} onClick={() => add(q)}>
                {q}
              </Suggestion>
            ))}
            {unused.length > IDEAS_SHOWN ? <SuggestionMore count={unused.length - IDEAS_SHOWN} open={allIdeas} onToggle={() => setAllIdeas((v) => !v)} /> : null}
          </Suggestions>
        ) : null}
      </Card>
    </KnowledgeSection>
  )
}
