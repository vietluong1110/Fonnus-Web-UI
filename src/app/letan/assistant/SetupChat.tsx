import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent } from 'react'
import { Icon, Logo } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { PHONE_BREAKPOINT, useIsNarrow } from '../../../hooks/useIsNarrow'
import { ChipButton } from '../../ui'
import { newId } from '../model'
import { useConfig } from '../store'
import { attachmentKind, useSetupChat } from './chatStore'
import type { Attachment, AttachmentKind, ChatMessage } from './chatStore'
import styles from './SetupChat.module.css'

/*
 * Fonnus, the setup assistant. Same conversation in every shape it takes —
 * the state lives in `chatStore`, above the routes.
 *
 *   rail   a column beside a hub page
 *   dock   a window pinned bottom-right on a section page
 *   phone  neither fits, so the panel splits: what stays in the page is the
 *          current question and its chips (a `prompt` card on a hub, a `fab`
 *          on a section page), and the conversation comes up as a `sheet`
 *          over the page when it is asked for.
 *
 * The split matters more than it looks. A full panel above the hub on a phone
 * pushed all three sections off the screen, so the page opened on a chat box
 * and hid the thing the owner came for — while a one-tap answer like "Dùng câu
 * mặc định" still has to cost exactly one tap. Hence a card that carries the
 * question and the chips but not the log.
 *
 * Nothing here talks to a model. Chips and parseable sentences write into the
 * tenant record through the question queue; attachments are accepted and
 * acknowledged so the interaction is complete, but they are not read.
 */

const KIND_ICON: Record<AttachmentKind, IconName> = {
  image: 'file-text',
  pdf: 'file-text',
  doc: 'file-text',
  sheet: 'receipt',
  slide: 'file-text',
  text: 'file-text',
  file: 'file-text',
}

/** Long pastes become an attachment rather than flooding the composer. */
const PASTE_AS_ATTACHMENT = 220

function humanSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SetupChat({ variant }: { variant: 'rail' | 'dock' }) {
  const { config } = useConfig()
  const chat = useSetupChat()
  const { messages, current, done, pageLabel, minimized, setMinimized } = chat

  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dropping, setDropping] = useState(false)
  const [sheet, setSheet] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const phone = useIsNarrow(PHONE_BREAKPOINT)
  const agent = config.agent_name || 'Linh'
  const docked = variant === 'dock'
  const asSheet = phone && sheet

  // Keep the newest turn in view; the log is the only scrolling region.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, minimized, sheet])

  // A sheet that lets the page scroll under it is the thing that makes a sheet
  // feel broken. Escape closes it, the way every other overlay in the app does.
  useEffect(() => {
    if (!asSheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [asSheet])

  // Leaving the phone (a rotation, a resized window) must not leave the page
  // scroll-locked behind a sheet that is no longer rendered.
  useEffect(() => {
    if (!phone) setSheet(false)
  }, [phone])

  /*
   * The composer grows with its content, up to the cap in CSS. It also has to
   * be measured whenever the textarea is a *different element* — opening the
   * sheet on a phone mounts a fresh one, and one that was never measured opens
   * one line tall with its own placeholder scrolled out of view.
   */
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text, sheet, current?.placeholder])

  const addFiles = (files: FileList | File[]) => {
    const next: Attachment[] = []
    for (const f of Array.from(files)) {
      const kind = attachmentKind(f.name, f.type)
      next.push({
        id: newId('att'),
        name: f.name,
        kind,
        size: f.size,
        previewUrl: kind === 'image' ? URL.createObjectURL(f) : undefined,
      })
    }
    setAttachments((a) => [...a, ...next])
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files)
    if (files.length) {
      e.preventDefault()
      addFiles(files)
      return
    }
    const pasted = e.clipboardData.getData('text')
    if (pasted.length > PASTE_AS_ATTACHMENT) {
      e.preventDefault()
      setAttachments((a) => [
        ...a,
        { id: newId('att'), name: `Đoạn dán · ${pasted.length} ký tự`, kind: 'text', size: 0 },
      ])
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const send = () => {
    if (chat.busy) return
    if (!text.trim() && !attachments.length) return
    // The object URLs are NOT revoked here: the sent message keeps rendering
    // those thumbnails, so the blobs have to outlive the composer.
    chat.answerWithText(text, attachments)
    setText('')
    setAttachments([])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const shellClass = asSheet
    ? `${styles.shell} ${styles.sheet}`
    : `${styles.shell} ${docked ? styles.dock : styles.rail} ${docked && minimized ? styles.dockMin : ''}`

  // Minimizing is a desktop gesture on a window. A phone has no window to
  // minimize — it has the button below, which is already the collapsed state.
  const collapsedDock = !phone && docked && minimized

  // Who is asking, on every shape. The page, not a count: a number counting
  // down how much is left to answer reads as a debt, and it is the first thing
  // an owner opening this on a busy morning would rather not see.
  const identity = (
    <>
      <span className={styles.mark}>
        <Logo variant="mark" height={17} />
      </span>
      <span className={styles.headText}>
        <span className={styles.headName}>Fonnus</span>
        <span className={styles.headMeta}>Trợ lý thiết lập · {pageLabel}</span>
      </span>
    </>
  )

  const head = (
    <div
      className={`${styles.head} ${collapsedDock ? styles.minBar : ''}`}
      onClick={collapsedDock ? () => setMinimized(false) : undefined}
      role={collapsedDock ? 'button' : undefined}
      tabIndex={collapsedDock ? 0 : undefined}
    >
      {identity}
      {asSheet ? (
        <button type="button" className={styles.headButton} aria-label="Đóng trợ lý" onClick={() => setSheet(false)}>
          <Icon name="x" size={18} />
        </button>
      ) : docked ? (
        <button
          type="button"
          className={styles.headButton}
          aria-label={minimized ? 'Mở trợ lý' : 'Thu nhỏ trợ lý'}
          onClick={(e) => {
            e.stopPropagation()
            setMinimized(!minimized)
          }}
        >
          <Icon name={minimized ? 'chevron-up' : 'chevron-down'} size={18} />
        </button>
      ) : null}
    </div>
  )

  const chips = current?.chips.length ? (
    <div className={styles.chips}>
      {current.chips.map((c) => (
        <ChipButton
          key={c.label}
          onClick={() => {
            const patch = c.apply(config)
            chat.answerWithChip(c.label, patch as Record<string, unknown>, current.confirm({ ...config, ...patch }))
          }}
        >
          {c.label}
        </ChipButton>
      ))}
    </div>
  ) : null

  if (collapsedDock) {
    return (
      <aside className={shellClass} aria-label="Trợ lý thiết lập Fonnus">
        {head}
      </aside>
    )
  }

  /*
   * Phone, sheet closed. The dock becomes a button because a section page is a
   * form and the form comes first; the rail becomes a card because a hub page
   * has nothing more useful to lead with than the question itself.
   */
  if (phone && !sheet) {
    if (docked) {
      return (
        <button
          type="button"
          className={styles.fab}
          aria-label={`Mở trợ lý thiết lập Fonnus${done ? '' : ' — đang có câu hỏi'}`}
          onClick={() => setSheet(true)}
        >
          <Logo variant="mark" height={22} />
          {done ? null : <span className={styles.fabDot} aria-hidden="true" />}
        </button>
      )
    }

    const asked = [...messages].reverse().find((m) => m.role === 'assistant' && m.text.trim())

    return (
      <aside className={styles.prompt} aria-label="Trợ lý thiết lập Fonnus">
        <div className={styles.promptHead}>{identity}</div>

        {done ? (
          <div className={`${styles.promptQuestion} ${styles.promptDone}`}>
            <span className={styles.savedIcon}>
              <Icon name="circle-check" size={15} />
            </span>
            <span>{agent} đã đủ thông tin ở mục này.</span>
          </div>
        ) : asked ? (
          <div className={styles.promptQuestion}>{asked.text}</div>
        ) : null}

        {chips}

        <button type="button" className={styles.promptOpen} onClick={() => setSheet(true)}>
          {done ? 'Mở trò chuyện với Fonnus' : 'Trả lời Fonnus'}
          <Icon name="arrow-up" size={17} />
        </button>
      </aside>
    )
  }

  const panel = (
    <aside
      className={shellClass}
      aria-label="Trợ lý thiết lập Fonnus"
      onDragOver={(e) => {
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      {asSheet ? <span className={styles.grip} aria-hidden="true" /> : null}
      {head}

      <div className={styles.log} ref={logRef} role="log">
        {messages.map((m) => (
          <Turn key={m.id} message={m} />
        ))}

        {chips}
      </div>

      <div className={`${styles.composer} ${dropping ? styles.dropping : ''}`}>
        {attachments.length ? (
          <div className={styles.attachments}>
            {attachments.map((a) => (
              <span key={a.id} className={styles.attachment}>
                {a.previewUrl ? (
                  <img src={a.previewUrl} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.attachIcon}>
                    <Icon name={KIND_ICON[a.kind]} size={14} />
                  </span>
                )}
                <span className={styles.attachText}>
                  <span className={styles.attachName}>{a.name}</span>
                  {a.size ? <span className={styles.attachSize}>{humanSize(a.size)}</span> : null}
                </span>
                <button
                  type="button"
                  className={styles.attachRemove}
                  aria-label={`Bỏ ${a.name}`}
                  onClick={() => {
                    if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
                    setAttachments((list) => list.filter((x) => x.id !== a.id))
                  }}
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className={styles.inputShell}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={1}
            value={text}
            placeholder={current?.placeholder ?? 'Trả lời Fonnus, hoặc kéo tệp vào đây…'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            aria-label="Trả lời Fonnus"
          />
          <button type="button" className={styles.headButton} aria-label="Đính kèm tệp" onClick={() => fileRef.current?.click()}>
            <Icon name="plus" size={18} />
          </button>
          <button
            type="button"
            className={styles.send}
            aria-label="Gửi"
            onClick={send}
            disabled={chat.busy || (!text.trim() && !attachments.length)}
          >
            <Icon name="arrow-up" size={17} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files?.length) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <div className={styles.foot}>
          <span>
            {chat.busy
              ? 'Fonnus đang xem…'
              : done
                ? `${agent} đã đủ thông tin ở mục này.`
                : 'Trả lời ở đây điền thẳng vào các mục.'}
          </span>
        </div>
      </div>
    </aside>
  )

  if (asSheet) {
    return (
      <>
        <div className={styles.sheetScrim} onClick={() => setSheet(false)} />
        {panel}
      </>
    )
  }

  return panel
}

function Turn({ message }: { message: ChatMessage }) {
  const user = message.role === 'user'
  const bubbleClass = user
    ? `${styles.bubble} ${styles.bubbleUser}`
    : message.tone === 'saved'
      ? `${styles.bubble} ${styles.bubbleAssistant} ${styles.bubbleSaved}`
      : message.tone === 'error'
        ? `${styles.bubble} ${styles.bubbleAssistant} ${styles.bubbleError}`
        : `${styles.bubble} ${styles.bubbleAssistant}`

  return (
    <div className={`${styles.turn} ${user ? styles.turnUser : ''}`}>
      {message.attachments?.length ? (
        <div className={styles.attachments} style={{ justifyContent: 'flex-end' }}>
          {message.attachments.map((a) => (
            <span key={a.id} className={styles.attachment}>
              {a.previewUrl ? (
                <img src={a.previewUrl} alt="" className={styles.thumb} />
              ) : (
                <span className={styles.attachIcon}>
                  <Icon name={KIND_ICON[a.kind]} size={14} />
                </span>
              )}
              <span className={styles.attachText}>
                <span className={styles.attachName}>{a.name}</span>
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {message.text ? (
        <div className={bubbleClass}>
          {message.tone === 'saved' ? (
            <span className={styles.savedIcon}>
              <Icon name="circle-check" size={15} />
            </span>
          ) : null}
          <span>{message.text}</span>
        </div>
      ) : null}

      {message.question ? (
        <div className={styles.context}>
          <span className={styles.sectionLabel}>{message.question.sectionLabel}</span>
          <a className={styles.openLink} href={appHref('le-tan', ...message.question.path)}>
            Mở mục <Icon name="chevron-right" size={13} />
          </a>
        </div>
      ) : null}
    </div>
  )
}
