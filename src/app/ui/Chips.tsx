import { useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './Chips.module.css'

/*
 * Chips are the catalogue's "TE (chips)" input: short free-text values that
 * read as a set. Aliases, capabilities, red flags, recipients. Type, Enter
 * (or comma) to add; ✕ to remove. Locked chips (system pack rows) have no ✕.
 */

export function Chip({
  children,
  onRemove,
  locked,
  system,
  selected,
  title,
}: {
  children: ReactNode
  onRemove?: () => void
  /** Red-tinted outline: a rule the tenant may not remove. */
  locked?: boolean
  /** Paper ground: derived by the system, informational. */
  system?: boolean
  selected?: boolean
  title?: string
}) {
  return (
    <span
      className={`${styles.chip} ${locked ? styles.chipLocked : ''} ${system ? styles.chipSystem : ''} ${selected ? styles.chipSelected : ''}`}
      title={title}
    >
      <span className={styles.chipText}>{children}</span>
      {onRemove ? (
        <button type="button" className={styles.remove} aria-label="Xoá" onClick={onRemove}>
          ✕
        </button>
      ) : null}
    </span>
  )
}

/** A chip that is a choice: quick-reply answers, template pickers. */
export function ChipButton({ children, selected, onClick }: { children: ReactNode; selected?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={selected ? styles.chipButtonSelected : styles.chipButton} onClick={onClick} aria-pressed={selected}>
      {children}
    </button>
  )
}

interface ChipInputProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  addLabel?: string
  /** Rendered before the editable chips and cannot be removed. */
  locked?: string[]
  lockedTitle?: string
  /** Rendered before the editable chips, greyed, cannot be removed. */
  system?: string[]
  systemTitle?: string
  emptyText?: string
  validate?: (raw: string) => string | null
}

export function ChipInput({
  value,
  onChange,
  placeholder = 'Gõ rồi Enter',
  addLabel = '+ Thêm',
  locked = [],
  lockedTitle,
  system = [],
  systemTitle,
  emptyText,
  validate,
}: ChipInputProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    const raw = draft.trim().replace(/,+$/, '').trim()
    if (!raw) {
      setAdding(false)
      return
    }
    const problem = validate ? validate(raw) : null
    if (problem) {
      setError(problem)
      return
    }
    if (!value.includes(raw)) onChange([...value, raw])
    setDraft('')
    setError(null)
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      setDraft('')
      setAdding(false)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  const nothing = !value.length && !locked.length && !system.length

  return (
    <div className={styles.wrap}>
      {system.map((s) => (
        <Chip key={`sys-${s}`} system title={systemTitle}>
          {s}
        </Chip>
      ))}
      {locked.map((s) => (
        <Chip key={`lock-${s}`} locked title={lockedTitle}>
          {s}
        </Chip>
      ))}
      {value.map((v) => (
        <Chip key={v} onRemove={() => onChange(value.filter((x) => x !== v))}>
          {v}
        </Chip>
      ))}
      {nothing && !adding && emptyText ? <span className={styles.empty}>{emptyText}</span> : null}
      {adding ? (
        <span className={styles.adder}>
          <input
            ref={inputRef}
            className={styles.adderInput}
            value={draft}
            placeholder={placeholder}
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
            onKeyDown={onKey}
            onBlur={() => {
              commit()
              if (!draft.trim()) setAdding(false)
            }}
            aria-invalid={!!error}
            title={error ?? undefined}
          />
        </span>
      ) : (
        <button type="button" className={styles.addButton} onClick={() => setAdding(true)}>
          {addLabel}
        </button>
      )}
      {error ? (
        <span className={styles.empty} style={{ color: 'var(--error)' }}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
