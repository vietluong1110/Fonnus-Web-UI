import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api, attachmentKindOf, isCanceled, messageFor } from '../../../api'
import type { AssistantEvent, AttachmentRef, ChatPage } from '../../../api'
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
 * This file is now view state only. What the assistant *says* — and what it
 * writes into the record — comes from `api.assistant`, as a stream of events:
 * `delta` for text, `patch` for a field it filled in, `rejected` for an answer
 * it could not use. Today that stream is produced in the browser by the regex
 * parsers in `questions.ts`; live it is an SSE stream from a model. Nothing in
 * this component knows which.
 *
 * The assistant's write authority is deliberately narrow: it emits a patch and
 * this file applies it through the same `update()` a form uses. It cannot write
 * to the record any other way.
 *
 * ONE CONVERSATION PER PAGE. The queue is filtered to questions that belong to
 * the tab you are on, and each tab keeps its own history — an assistant that
 * asks about the price list while you are naming the receptionist is not
 * helping. State lives above the routes, so walking into a section (where the
 * panel becomes a docked window) does not restart anything.
 */

export type { ChatPage }

const PAGE_LABEL: Record<ChatPage, string> = {
  'ho-so': 'Hồ sơ',
  'kien-thuc': 'Kiến thức',
  'ky-nang': 'Kỹ năng',
}

/** Re-exported so the panel keeps importing its types from one place. */
export type { AttachmentKind, AttachmentRef } from '../../../api'
export type Attachment = AttachmentRef
export const attachmentKind = attachmentKindOf

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

interface ChatStore {
  /** Which page's conversation this is — shown in the panel header. */
  pageLabel: string
  messages: ChatMessage[]
  /** The question the last assistant bubble is asking, if any. */
  current: Question | undefined
  /** No question left on this page. Drives the closing line, never a count. */
  done: boolean
  /** A turn is in flight — the composer disables and the panel can show a beat. */
  busy: boolean
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
  const [busy, setBusy] = useState(false)

  // One history and one "already asked" marker per page.
  const [histories, setHistories] = useState<Partial<Record<ChatPage, ChatMessage[]>>>({})
  const asked = useRef<Partial<Record<ChatPage, string | null>>>({})

  // Readable from a callback without making every keystroke a new callback.
  const configRef = useRef(config)
  configRef.current = config

  // One turn at a time; a page change or unmount cancels whatever is streaming.
  const inFlight = useRef<AbortController | null>(null)
  useEffect(() => {
    return () => inFlight.current?.abort()
  }, [page])

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

  /*
   * A chip is a pre-parsed answer: the patch and the confirmation line are both
   * known before the click, so there is nothing for the assistant to work out
   * and no reason to make the owner wait for a round trip.
   */
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
      if (!said && !attachments.length) return

      const userMsg: ChatMessage = {
        id: newId('m'),
        role: 'user',
        text: said,
        attachments: attachments.length ? attachments : undefined,
      }
      const withUser = [...messages, userMsg]
      // Show the owner's own line straight away; the reply streams in after.
      commit(withUser, asking?.id ?? null)

      inFlight.current?.abort()
      const ac = new AbortController()
      inFlight.current = ac
      setBusy(true)

      void (async () => {
        // One bubble per turn, appended to as deltas arrive.
        const replyId = newId('m')
        let reply = ''
        let tone: ChatMessage['tone']
        // The question stays open unless something actually answered it.
        let nextAsked = asking?.id ?? null

        const render = () => {
          commit([...withUser, { id: replyId, role: 'assistant', text: reply, tone }], nextAsked)
        }

        try {
          const turn = {
            page,
            text: said,
            attachments,
            questionId: asking?.id,
            config: configRef.current,
          }
          for await (const event of api.assistant.send(turn, { signal: ac.signal })) {
            const e = event as AssistantEvent
            if (e.type === 'delta') {
              reply += e.text
              render()
            } else if (e.type === 'patch') {
              reply = `Đã ghi ${e.confirm}.`
              tone = 'saved'
              // Answered: let the queue move on to the next question.
              nextAsked = asking?.id ?? null
              update(e.patch)
              render()
            } else if (e.type === 'rejected') {
              reply = e.reason
              tone = 'error'
              // Not answered — leave `asked` pointing at it so it stays open.
              nextAsked = asking?.id ?? null
              render()
            } else if (e.type === 'extraction') {
              // Never applied automatically: the owner is promised, in writing,
              // that they review every suggestion before Linh uses it.
              reply = e.summary
              render()
            }
          }
        } catch (err) {
          if (!isCanceled(err)) {
            reply = messageFor(err)
            tone = 'error'
            render()
          }
        } finally {
          if (inFlight.current === ac) {
            inFlight.current = null
            setBusy(false)
          }
        }
      })()
    },
    [messages, current, page, update, commit],
  )

  const value = useMemo(
    () => ({
      pageLabel: PAGE_LABEL[page],
      messages,
      current,
      done: !current,
      busy,
      minimized,
      setMinimized,
      answerWithChip,
      answerWithText,
    }),
    [page, messages, current, busy, minimized, answerWithChip, answerWithText],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useSetupChat(): ChatStore {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useSetupChat must be used inside SetupChatProvider')
  return ctx
}
