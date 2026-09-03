import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { newId } from '../model'
import type { Question } from '../questions'
import { useConfig } from '../store'
import { useQuestionQueue } from '../knowledge/AskRail'

/*
 * "Fonnus" — the setup assistant.
 *
 * Fonnus is the product asking the owner to fill in the record; Linh is the
 * receptionist who will answer the phone. They are deliberately two different
 * speakers with two different marks, because conflating them makes it look
 * like the receptionist is interviewing her own employer.
 *
 * The conversation is a view over `buildQuestions(config)` — the same queue
 * the Kiến thức rail runs — so a chip or a parseable sentence writes straight
 * into the tenant record and the queue shrinks. Free text that the question
 * cannot parse comes back as a correction rather than a silent no-op, and
 * attachments are acknowledged but not read: there is no model behind this yet.
 *
 * ONE CONVERSATION PER PAGE. The queue is filtered to questions that belong to
 * the tab you are on, and each tab keeps its own history — an assistant that
 * asks about the price list while you are naming the receptionist is not
 * helping. State lives above the routes, so walking into a section (where the
 * panel becomes a docked window) does not restart anything.
 */

export type ChatPage = 'ho-so' | 'kien-thuc' | 'ky-nang'

const PAGE_LABEL: Record<ChatPage, string> = {
  'ho-so': 'Hồ sơ',
  'kien-thuc': 'Kiến thức',
  'ky-nang': 'Kỹ năng',
}

export type AttachmentKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slide' | 'text' | 'file'

export interface Attachment {
  id: string
  name: string
  kind: AttachmentKind
  /** Bytes; 0 for pasted text. */
  size: number
  /** Object URL for images, so the chip can show a thumbnail. */
  preview?: string
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  /** `saved` is a green confirmation, `error` a correction. */
  tone?: 'saved' | 'error'
  /** Set on the assistant bubble that is currently asking something. */
  question?: Question
  attachments?: Attachment[]
}

export function attachmentKind(name: string, type: string): AttachmentKind {
  if (type.startsWith('image/')) return 'image'
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'doc' || ext === 'docx' || ext === 'rtf') return 'doc'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'sheet'
  if (ext === 'ppt' || ext === 'pptx') return 'slide'
  if (ext === 'txt' || ext === 'md') return 'text'
  return 'file'
}

interface ChatStore {
  /** Which page's conversation this is — shown in the panel header. */
  pageLabel: string
  messages: ChatMessage[]
  /** The question the last assistant bubble is asking, if any. */
  current: Question | undefined
  /** No question left on this page. Drives the closing line, never a count. */
  done: boolean
  minimized: boolean
  setMinimized: (v: boolean) => void
  answerWithChip: (label: string, patch: Record<string, unknown>, confirm: string) => void
  answerWithText: (text: string, attachments: Attachment[]) => void
}

const ChatContext = createContext<ChatStore | null>(null)

function opener(agent: string, page: ChatPage): string {
  if (page === 'ho-so')
    return `Em là Fonnus. Em hỏi vài câu để ${agent} biết cách xưng hô và chào khách — anh chị trả lời tự nhiên, hoặc gửi em tài liệu cũng được ạ.`
  if (page === 'kien-thuc')
    return `Em là Fonnus. Em hỏi vài câu về phòng khám để ${agent} trả lời khách cho đúng — anh chị trả lời tự nhiên, hoặc gửi em file bảng giá, ảnh chụp lịch làm việc cũng được ạ.`
  return `Em là Fonnus. Em hỏi vài câu về những việc ${agent} được phép làm thay anh chị — trả lời tự nhiên là được ạ.`
}

export function SetupChatProvider({ page, children }: { page: ChatPage; children: ReactNode }) {
  const { config, update } = useConfig()
  const { queue } = useQuestionQueue()
  const agent = config.agent_name || 'Linh'

  /*
   * Starts minimized, which only affects the docked shape — the rail is always
   * open. A section page's right column is the "nghe thử" preview, and an
   * expanded window pinned bottom-right lands squarely on its play button.
   * Arriving collapsed keeps that preview whole; once opened it stays open.
   */
  const [minimized, setMinimized] = useState(true)

  // One history and one "already asked" marker per page.
  const [histories, setHistories] = useState<Partial<Record<ChatPage, ChatMessage[]>>>({})
  const asked = useRef<Partial<Record<ChatPage, string | null>>>({})

  const history = histories[page] ?? [{ id: `open-${page}`, role: 'assistant' as const, text: opener(agent, page) }]

  // Only this page's questions, in the order the queue offers them.
  const pageQueue = useMemo(() => queue.filter((q) => q.path[0] === page), [queue, page])
  const current = pageQueue[0]

  const messages = useMemo(() => {
    if (!current) return history
    if (asked.current[page] === current.id) return history
    return [...history, { id: `q-${current.id}`, role: 'assistant' as const, text: current.text, question: current }]
  }, [history, current, page])

  const commit = useCallback(
    (next: ChatMessage[], askedId: string | null) => {
      asked.current = { ...asked.current, [page]: askedId }
      setHistories((h) => ({ ...h, [page]: next }))
    },
    [page],
  )

  const answerWithChip = useCallback(
    (label: string, patch: Record<string, unknown>, confirm: string) => {
      const asking = current
      commit(
        [
          ...messages,
          { id: newId('m'), role: 'user', text: label },
          { id: newId('m'), role: 'assistant', text: `Đã ghi ${confirm} vào ${asking?.sectionLabel ?? 'hồ sơ'}.`, tone: 'saved' },
        ],
        asking?.id ?? null,
      )
      update(patch as never)
    },
    [messages, current, update, commit],
  )

  const answerWithText = useCallback(
    (text: string, attachments: Attachment[]) => {
      const asking = current
      const said = text.trim()
      const userMsg: ChatMessage = { id: newId('m'), role: 'user', text: said, attachments: attachments.length ? attachments : undefined }

      // Files are acknowledged, never parsed: there is no extraction service yet.
      if (attachments.length && !said) {
        commit(
          [
            ...messages,
            userMsg,
            {
              id: newId('m'),
              role: 'assistant',
              text: `Em nhận được ${attachments.length} tệp rồi ạ. Em sẽ đọc và điền giúp anh chị, xong em báo lại.`,
            },
          ],
          asking?.id ?? null,
        )
        return
      }

      if (!asking) {
        commit([...messages, userMsg, { id: newId('m'), role: 'assistant', text: 'Em ghi nhận rồi ạ.' }], null)
        return
      }

      const result = asking.applyText(config, said)
      if ('error' in result) {
        // The question stays open, so `asked` is left pointing at it.
        commit([...messages, userMsg, { id: newId('m'), role: 'assistant', text: result.error, tone: 'error' }], asking.id)
        return
      }

      const confirm = asking.confirm({ ...config, ...result })
      commit(
        [...messages, userMsg, { id: newId('m'), role: 'assistant', text: `Đã ghi ${confirm} vào ${asking.sectionLabel}.`, tone: 'saved' }],
        asking.id,
      )
      update(result)
    },
    [messages, current, config, update, commit],
  )

  const value = useMemo(
    () => ({
      pageLabel: PAGE_LABEL[page],
      messages,
      current,
      done: !current,
      minimized,
      setMinimized,
      answerWithChip,
      answerWithText,
    }),
    [page, messages, current, minimized, answerWithChip, answerWithText],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useSetupChat(): ChatStore {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useSetupChat must be used inside SetupChatProvider')
  return ctx
}
