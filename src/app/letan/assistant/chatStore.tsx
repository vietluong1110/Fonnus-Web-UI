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
 * State lives above the routes so walking into a sub-page (where the panel
 * becomes a docked window) does not restart the conversation.
 */

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
  messages: ChatMessage[]
  /** The question the last assistant bubble is asking, if any. */
  current: Question | undefined
  remaining: number
  minimized: boolean
  setMinimized: (v: boolean) => void
  answerWithChip: (label: string, patch: Record<string, unknown>, confirm: string) => void
  answerWithText: (text: string, attachments: Attachment[]) => void
  skipCurrent: () => void
}

const ChatContext = createContext<ChatStore | null>(null)

export function SetupChatProvider({ children }: { children: ReactNode }) {
  const { config, update } = useConfig()
  const { queue, skip } = useQuestionQueue()
  const agent = config.agent_name || 'Linh'

  /*
   * Starts minimized, which only affects the docked shape — the rail is always
   * open. A section page's right column is the "nghe thử" preview, and an
   * expanded 468px window pinned bottom-right lands squarely on its play
   * button. Arriving collapsed keeps that preview whole; the count badge makes
   * the assistant obvious, and once opened it stays open as you move around.
   */
  const [minimized, setMinimized] = useState(true)
  const [history, setHistory] = useState<ChatMessage[]>(() => [
    {
      id: newId('m'),
      role: 'assistant',
      text: `Em là Fonnus. Em hỏi vài câu để ${agent} biết đủ thông tin mà trả lời khách — anh chị trả lời tự nhiên, hoặc gửi em file bảng giá, ảnh chụp lịch làm việc cũng được ạ.`,
    },
  ])

  /*
   * The queue is derived from the record, so the head changes on its own as
   * answers land. The conversation only needs to notice when it has moved on
   * to a question it has not asked yet.
   */
  const asked = useRef<string | null>(null)
  const current = queue[0]
  const messages = useMemo(() => {
    if (!current) return history
    if (asked.current === current.id) return history
    return [...history, { id: `q-${current.id}`, role: 'assistant' as const, text: current.text, question: current }]
  }, [history, current])

  const commitHistory = useCallback((next: ChatMessage[], askedId: string | null) => {
    asked.current = askedId
    setHistory(next)
  }, [])

  const answerWithChip = useCallback(
    (label: string, patch: Record<string, unknown>, confirm: string) => {
      const asking = current
      commitHistory(
        [
          ...messages,
          { id: newId('m'), role: 'user', text: label },
          { id: newId('m'), role: 'assistant', text: `Đã ghi ${confirm} vào ${asking?.sectionLabel ?? 'hồ sơ'}.`, tone: 'saved' },
        ],
        asking?.id ?? null,
      )
      update(patch as never)
    },
    [messages, current, update, commitHistory],
  )

  const answerWithText = useCallback(
    (text: string, attachments: Attachment[]) => {
      const asking = current
      const said = text.trim()
      const userMsg: ChatMessage = { id: newId('m'), role: 'user', text: said, attachments: attachments.length ? attachments : undefined }

      // Files are acknowledged, never parsed: there is no extraction service yet.
      if (attachments.length && !said) {
        commitHistory(
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
        commitHistory([...messages, userMsg, { id: newId('m'), role: 'assistant', text: 'Em ghi nhận rồi ạ.' }], null)
        return
      }

      const result = asking.applyText(config, said)
      if ('error' in result) {
        // The question stays open, so `asked` is left pointing at it.
        commitHistory([...messages, userMsg, { id: newId('m'), role: 'assistant', text: result.error, tone: 'error' }], asking.id)
        return
      }

      const confirm = asking.confirm({ ...config, ...result })
      commitHistory(
        [...messages, userMsg, { id: newId('m'), role: 'assistant', text: `Đã ghi ${confirm} vào ${asking.sectionLabel}.`, tone: 'saved' }],
        asking.id,
      )
      update(result)
    },
    [messages, current, config, update, commitHistory],
  )

  const skipCurrent = useCallback(() => {
    if (!current) return
    commitHistory([...messages, { id: newId('m'), role: 'user', text: 'Để sau' }], current.id)
    skip(current.id)
  }, [messages, current, skip, commitHistory])

  const value = useMemo(
    () => ({ messages, current, remaining: queue.length, minimized, setMinimized, answerWithChip, answerWithText, skipCurrent }),
    [messages, current, queue.length, minimized, answerWithChip, answerWithText, skipCurrent],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useSetupChat(): ChatStore {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useSetupChat must be used inside SetupChatProvider')
  return ctx
}
