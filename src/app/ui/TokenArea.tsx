import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { FieldFrame } from './Field'
import { AnchoredPopup, useAnchoredPopup } from './Pickers'
import styles from './TokenArea.module.css'

/*
 * A text field whose sentence has holes in it.
 *
 * `Gửi email` writes one message that goes out after every call, so half of
 * every sentence is the same words and half is that call — the caller's name,
 * the time, the link. Those halves have to be told apart while the owner is
 * typing, and the field used to do it with `«tên_khách»`: a token vocabulary,
 * in snake_case, inside a plain textarea, with a legend underneath. That is
 * source code on a screen built for a clinic owner.
 *
 * Here a variable is a **pill**. It carries the words the owner would use —
 * `Tên khách`, `Giờ gọi` — it cannot be edited a letter at a time, and one
 * backspace takes the whole thing. Typing `@` opens the list of what this
 * message knows, filtered as you keep typing, with arrow keys and Enter or a
 * press; the pills under the box do the same for anyone who never tries `@`.
 *
 * **What is stored does not change.** The value in and out is still
 * `«tên_khách»`, because that is what the mailer fills in and what `fill()`
 * in `skills/lines.ts` reads — the same bargain `DateField` makes with ISO
 * dates. Only the reading is different.
 *
 * Why a `contentEditable` rather than a textarea with markers: an atomic
 * token is the whole idea, and a textarea can only hold characters. This is
 * the merge-tag shape every mail tool converged on, and the list follows the
 * ARIA combobox pattern — `aria-expanded` and `aria-activedescendant` on the
 * box, `listbox`/`option` in the panel — so the keyboard and a screen reader
 * get the same control the mouse does.
 */

/** One thing a message knows about the call it is reporting. */
export interface TokenVar {
  /** As stored, inside the guillemets: `tên_khách`. */
  key: string
  /** As read: `Tên khách`. */
  label: string
  /** What it becomes on a worked call — shown beside the label, so the list explains itself. */
  sample?: string
}

/*
 * A zero-width space rides behind every pill, and is stripped on the way out.
 *
 * A caret has nowhere to stand directly after an inline `contenteditable=false`
 * at the end of a line; browsers put it inside the pill, or refuse it. One
 * invisible character gives it somewhere to be, which is what makes "insert a
 * variable and keep typing" work at all.
 */
const ZW = '​'

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()

/** The pill, as a DOM node — this half of the field is not React's to own. */
function pill(v: TokenVar): HTMLElement {
  const el = document.createElement('span')
  el.className = styles.token
  el.contentEditable = 'false'
  el.dataset.var = v.key
  el.textContent = v.label
  if (v.sample) el.title = `Thành "${v.sample}"`
  return el
}

const varOf = (key: string, vars: TokenVar[]): TokenVar => vars.find((v) => v.key === key) ?? { key, label: key }

/** `«tên_khách» vừa gọi` → a pill and a run of text. Newlines are `<br>`, the way the browser writes them. */
function paint(el: HTMLElement, value: string, vars: TokenVar[]) {
  el.textContent = ''
  const text = (s: string) => {
    s.split('\n').forEach((line, i) => {
      if (i) el.appendChild(document.createElement('br'))
      if (line) el.appendChild(document.createTextNode(line))
    })
  }
  const re = /«([^»]+)»/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    text(value.slice(last, m.index))
    el.appendChild(pill(varOf(m[1], vars)))
    el.appendChild(document.createTextNode(ZW))
    last = m.index + m[0].length
  }
  text(value.slice(last))
}

/**
 * The field back into what is stored.
 *
 * A block element means the browser wrapped a line the owner pressed Enter
 * on, so it opens a newline unless one is already open; the trailing one is
 * the browser's own filler and comes off at the end.
 */
function read(el: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        // A browser writes a trailing space as `&nbsp;`. Left alone it would
        // be stored — and then sent — as U+00A0, which looks like a space and
        // is not one.
        out += (child.nodeValue ?? '').split(ZW).join('').replace(/ /g, ' ')
      } else if (child instanceof HTMLElement) {
        if (child.dataset.var) out += `«${child.dataset.var}»`
        else if (child.tagName === 'BR') out += '\n'
        else {
          if (out && !out.endsWith('\n')) out += '\n'
          walk(child)
        }
      }
    }
  }
  walk(el)
  return out.replace(/\n$/, '')
}

interface TokenAreaProps {
  label?: ReactNode
  hint?: ReactNode
  value: string
  onChange: (next: string) => void
  vars: TokenVar[]
  placeholder?: string
  /** Lines the box opens at; ignored on one line. */
  rows?: number
  /** Enter is not a line break — a subject line. */
  singleLine?: boolean
  maxLength?: number
  /** The row of pills under the box, for the owners who never try `@`. */
  inserts?: boolean
  ariaLabel?: string
  className?: string
}

export function TokenArea({
  label,
  hint,
  value,
  onChange,
  vars,
  placeholder,
  rows = 5,
  singleLine = false,
  maxLength,
  inserts = false,
  ariaLabel,
  className,
}: TokenAreaProps) {
  const id = useId()
  const listId = `${id}-list`
  const editorRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  /** What we last handed the parent — the field is uncontrolled between the two. */
  const lastRef = useRef<string | null>(null)
  const varsRef = useRef(vars)
  varsRef.current = vars

  /** The `@…` being typed: the text node it lives in, and where it starts. */
  const atRef = useRef<{ node: Text; start: number; end: number } | null>(null)
  /** Where the caret was when the box lost focus, so a pill press lands there. */
  const restRef = useRef<Range | null>(null)

  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [box, setBox] = useState({ left: 0, top: 0, height: 0 })

  const matches = useMemo(() => {
    if (query === null) return []
    const q = fold(query)
    return q ? vars.filter((v) => fold(v.label).includes(q) || fold(v.key).includes(q)) : vars
  }, [query, vars])

  const open = query !== null && matches.length > 0
  const close = useCallback(() => {
    atRef.current = null
    setQuery(null)
  }, [])
  const { place, panelRef } = useAnchoredPopup(anchorRef, open, close, { width: 260, height: 240, minWidth: 200 })

  // Only repaint when the value came from somewhere other than this field.
  // Repainting on our own edit would drop the caret on every keystroke.
  useEffect(() => {
    const el = editorRef.current
    if (!el || lastRef.current === value) return
    paint(el, value, varsRef.current)
    lastRef.current = value
  }, [value])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const next = read(el)
    lastRef.current = next
    onChange(next)
  }, [onChange])

  /** Puts the pop-up under the `@` rather than under the field: a menu at the caret. */
  const placeAt = (node: Text, start: number, end: number) => {
    const r = document.createRange()
    r.setStart(node, start)
    r.setEnd(node, end)
    const rect = r.getBoundingClientRect()
    setBox({ left: rect.left, top: rect.top, height: rect.height || 18 })
  }

  /** After every edit: is the caret sitting at the end of an `@word`? */
  const readAt = () => {
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed || !sel.focusNode || sel.focusNode.nodeType !== Node.TEXT_NODE) return close()
    const node = sel.focusNode as Text
    const before = (node.nodeValue ?? '').slice(0, sel.focusOffset)
    const m = /@([^\s@«»]{0,24})$/.exec(before)
    if (!m) return close()
    const start = sel.focusOffset - m[0].length
    atRef.current = { node, start, end: sel.focusOffset }
    placeAt(node, start, sel.focusOffset)
    setQuery((q) => {
      if (q !== m[1]) setActive(0)
      return m[1]
    })
  }

  const insert = (v: TokenVar) => {
    const el = editorRef.current
    const sel = window.getSelection()
    if (!el || !sel) return
    const at = atRef.current
    const rest = restRef.current
    const range = document.createRange()
    if (at && el.contains(at.node)) {
      // Swallow the `@word` that opened the list.
      range.setStart(at.node, at.start)
      range.setEnd(at.node, Math.min(at.end, (at.node.nodeValue ?? '').length))
    } else if (rest && el.contains(rest.startContainer)) {
      range.setStart(rest.startContainer, rest.startOffset)
      range.setEnd(rest.endContainer, rest.endOffset)
    } else {
      range.selectNodeContents(el)
      range.collapse(false)
    }
    if (maxLength && read(el).length + v.key.length + 2 > maxLength) return close()
    range.deleteContents()
    const node = pill(v)
    range.insertNode(node)
    const tail = document.createTextNode(ZW)
    node.parentNode?.insertBefore(tail, node.nextSibling)
    const after = document.createRange()
    after.setStart(tail, tail.length)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)
    restRef.current = after.cloneRange()
    el.focus()
    close()
    emit()
  }

  /** One press takes a whole pill — a variable is a word, not eight letters. */
  const eatPill = (e: ReactKeyboardEvent) => {
    const el = editorRef.current
    const sel = window.getSelection()
    if (!el || !sel || !sel.isCollapsed || !sel.rangeCount) return
    const r = sel.getRangeAt(0)
    let prev: Node | null = null
    let zw: Text | null = null
    if (r.startContainer.nodeType === Node.TEXT_NODE) {
      const node = r.startContainer as Text
      const before = (node.nodeValue ?? '').slice(0, r.startOffset)
      // Only when the caret is *against* the pill: anything real in front of
      // it and this is an ordinary backspace.
      if (before.split(ZW).join('') !== '') return
      if (before) zw = node
      prev = node.previousSibling
    } else if (r.startContainer === el) {
      prev = el.childNodes[r.startOffset - 1] ?? null
    }
    if (!(prev instanceof HTMLElement) || !prev.dataset.var) return
    const parent = prev.parentNode
    if (!parent) return
    e.preventDefault()
    const index = Array.prototype.indexOf.call(parent.childNodes, prev)
    if (zw) zw.remove()
    prev.remove()
    const at = document.createRange()
    at.setStart(parent, Math.max(0, index))
    at.collapse(true)
    sel.removeAllRanges()
    sel.addRange(at)
    emit()
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insert(matches[Math.min(active, matches.length - 1)])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
    }
    if (e.key === 'Enter') {
      // A line break, never a block. Chrome's own Enter wraps the line in a
      // `<div>`, which `read` can cope with but which leaves the field holding
      // two kinds of line; and a subject has no lines to break at all.
      e.preventDefault()
      if (singleLine) return
      document.execCommand('insertLineBreak')
      return emit()
    }
    if (e.key === 'Backspace') eatPill(e)
  }

  return (
    <FieldFrame
      label={label}
      hint={hint}
      /* The one thing the field cannot show: that `@` opens the list. It goes
         in the label row, where the character count used to sit, rather than
         as a hint under a box that already has pills under it. */
      labelExtra={vars.length ? 'gõ @ để chèn' : undefined}
      htmlFor={id}
      className={className}
    >
      <div className={styles.shell}>
        <div
          ref={editorRef}
          id={id}
          className={`${styles.editor} ${singleLine ? styles.single : ''}`}
          style={singleLine ? undefined : { minHeight: rows * 22 }}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          role="textbox"
          aria-multiline={!singleLine}
          aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          onInput={() => {
            emit()
            readAt()
          }}
          onKeyDown={onKeyDown}
          onBeforeInput={(e) => {
            const el = editorRef.current
            const data = (e.nativeEvent as InputEvent).data
            if (!el || !maxLength || !data) return
            if (read(el).length + data.length > maxLength) e.preventDefault()
          }}
          onPaste={(e) => {
            // Plain text only: a paste out of a mail client would otherwise
            // arrive wearing its own fonts and colours.
            e.preventDefault()
            const el = editorRef.current
            const text = e.clipboardData.getData('text/plain')
            if (!el || !text) return
            const clean = singleLine ? text.replace(/\s+/g, ' ') : text
            const room = maxLength ? maxLength - read(el).length : clean.length
            if (room > 0) document.execCommand('insertText', false, clean.slice(0, room))
            emit()
          }}
          onBlur={() => {
            const sel = window.getSelection()
            if (!sel || !sel.rangeCount) return
            const r = sel.getRangeAt(0)
            if (editorRef.current?.contains(r.startContainer)) restRef.current = r.cloneRange()
          }}
        />
        {value ? null : (
          <span className={styles.placeholder} aria-hidden="true">
            {placeholder}
          </span>
        )}
        {/* The pop-up hangs off the caret, so it needs something at the caret
            to hang from: a fixed, zero-width mark that only exists to be
            measured. */}
        <span ref={anchorRef} className={styles.anchor} style={{ left: box.left, top: box.top, height: box.height }} aria-hidden="true" />
      </div>

      {inserts ? (
        <div className={styles.inserts}>
          <span className={styles.insertsLead}>Bấm để chèn</span>
          {vars.map((v) => (
            <button
              key={v.key}
              type="button"
              className={styles.insert}
              title={v.sample ? `Thành "${v.sample}"` : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(v)}
            >
              {v.label}
            </button>
          ))}
        </div>
      ) : null}

      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label="Thông tin của cuộc gọi">
          <div id={listId} role="listbox" className={styles.list}>
            {matches.map((v, i) => (
              <button
                key={v.key}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`${styles.option} ${i === active ? styles.optionActive : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(v)}
              >
                <span className={styles.optionName}>{v.label}</span>
                {v.sample ? <span className={styles.optionSample}>{v.sample}</span> : null}
              </button>
            ))}
          </div>
        </AnchoredPopup>
      ) : null}
    </FieldFrame>
  )
}
