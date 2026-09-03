import { useMemo, useState } from 'react'
import { Button } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { buildQuestions } from '../questions'
import { useConfig } from '../store'
import { ChipButton, SpeechBubble, TextField, ui, useToast } from '../../ui'
import styles from './Knowledge.module.css'

/*
 * "Linh hỏi — bạn trả lời". One question at a time, quick answers as chips,
 * free text underneath. Each answer writes straight into the record through
 * `update`, so the section forms and the readiness meter move at once.
 */

const SKIPPED_KEY = 'fonnus.letan.skipped'

function readSkipped(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(SKIPPED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function useQuestionQueue() {
  const { config } = useConfig()
  const [skipped, setSkipped] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readSkipped()))
  const all = useMemo(() => buildQuestions(config), [config])
  const queue = all.filter((q) => !skipped.includes(q.id))
  const skip = (id: string) => {
    const next = [...skipped, id]
    setSkipped(next)
    try {
      window.sessionStorage.setItem(SKIPPED_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  const unskip = () => {
    setSkipped([])
    try {
      window.sessionStorage.removeItem(SKIPPED_KEY)
    } catch {
      /* ignore */
    }
  }
  return { queue, skippedCount: all.length - queue.length, skip, unskip }
}

export function AskRail() {
  const { config, update } = useConfig()
  const { toast } = useToast()
  const { queue, skippedCount, skip, unskip } = useQuestionQueue()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const q = queue[0]
  const agent = config.agent_name || 'Linh'
  const minutes = Math.max(1, Math.round(queue.length * 0.6))

  const commit = (patch: Partial<typeof config>, confirm: string) => {
    update(patch)
    setLastSaved(confirm)
    setText('')
    setError(null)
    toast(`Đã lưu: ${confirm}.`)
  }

  const submitText = () => {
    if (!q) return
    const raw = text.trim()
    if (!raw) return
    const result = q.applyText(config, raw)
    if ('error' in result) return setError(result.error)
    commit(result, q.confirm({ ...config, ...result }))
  }

  return (
    <aside className={styles.rail} aria-label={`${agent} hỏi`}>
      <div className={styles.railHead}>
        <span className={styles.railTitle}>{agent} hỏi — bạn trả lời</span>
        <span className={styles.railMeta}>{q ? `Còn ${queue.length} câu · ~${minutes} phút` : 'Xong'}</span>
      </div>

      {q ? (
        <>
          <SpeechBubble speaker="assistant">{q.text}</SpeechBubble>
          {q.chips.length ? (
            <div className={ui.row}>
              {q.chips.map((c) => (
                <ChipButton key={c.label} onClick={() => commit(c.apply(config), q.confirm({ ...config, ...c.apply(config) }))}>
                  {c.label}
                </ChipButton>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitText()
            }}
            className={ui.stackTight}
          >
            <TextField
              aria-label="Trả lời"
              placeholder={q.placeholder ?? '…hoặc gõ tự nhiên'}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
              error={error}
            />
            <div className={ui.row} style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
              <a className={ui.linkButton} href={appHref('le-tan', ...q.path)} style={{ marginRight: 'auto', fontWeight: 400, color: 'var(--ink-soft)' }} title={q.sectionLabel}>
                Mở mục ›
              </a>
              <Button variant="ghost" size="sm" onClick={() => skip(q.id)}>
                Bỏ qua
              </Button>
              <Button type="submit" size="sm" disabled={!text.trim()}>
                Gửi
              </Button>
            </div>
          </form>
        </>
      ) : (
        <div className={ui.stackTight}>
          <SpeechBubble speaker="assistant">
            Em không còn câu nào để hỏi ạ. Muốn thêm chi tiết, anh/chị mở các mục bên trái.
          </SpeechBubble>
          {skippedCount ? (
            <button type="button" className={ui.linkButton} onClick={unskip}>
              Hỏi lại {skippedCount} câu đã bỏ qua
            </button>
          ) : null}
        </div>
      )}

      <div className={styles.railFoot}>
        {lastSaved ? <span style={{ color: 'var(--success)' }}>✓ Đã lưu: {lastSaved}</span> : null}
        <span>Trả lời ở đây điền thẳng vào các mục bên trái.</span>
      </div>
    </aside>
  )
}
