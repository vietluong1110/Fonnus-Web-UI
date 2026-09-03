import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, InputHTMLAttributes, KeyboardEvent, ReactNode, Ref, TextareaHTMLAttributes } from 'react'
import { Icon } from '../../design-system'
import type { Gate } from './Card'
import { GateTag } from './Card'
import styles from './Field.module.css'

/*
 * Form controls for the app. Same skin as the design-system Input (milk
 * ground, 12px radius, 1px inset hairline that thickens to the focus ring), but
 * as CSS modules and with the extra control types the catalogue needs: select,
 * textarea, time, date, VND amount, phone.
 *
 * The focus ring is drawn once, by the `.control` shell: the inner input and
 * textarea suppress the global `:focus-visible` outline so a focused field shows
 * one ring rather than two boxes nested inside each other.
 */

interface FieldFrameProps {
  label?: ReactNode
  gate?: Gate
  hint?: ReactNode
  error?: ReactNode
  /** Right-aligned extra in the label row, e.g. a character count. */
  labelExtra?: ReactNode
  htmlFor?: string
  style?: CSSProperties
  className?: string
  children: ReactNode
}

export function FieldFrame({ label, gate, hint, error, labelExtra, htmlFor, style, className, children }: FieldFrameProps) {
  return (
    <div className={`${styles.field} ${className ?? ''}`} style={style}>
      {label ? (
        <div className={styles.labelRow}>
          <label htmlFor={htmlFor} className={styles.label}>
            {label}
          </label>
          {gate ? <GateTag gate={gate} /> : null}
          {labelExtra ? <span className={styles.count}>{labelExtra}</span> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  )
}

type FrameProps = Pick<FieldFrameProps, 'label' | 'gate' | 'hint' | 'error' | 'labelExtra' | 'style' | 'className'>

/**
 * The field skin on its own, for controls this file does not implement (the
 * voice picker). Exported rather than copied so the focus ring stays drawn in
 * exactly one place — two of them nested is a bug this file already fixed once.
 */
export function ControlShell({
  open,
  error,
  readOnly,
  compact,
  className,
  children,
}: {
  /** A popup is open under this control: hold the focus ring while it is. */
  open?: boolean
  error?: boolean
  readOnly?: boolean
  compact?: boolean
  className?: string
  children: ReactNode
}) {
  const cls = [
    styles.control,
    error ? styles.controlError : '',
    readOnly ? styles.controlReadonly : '',
    compact ? styles.compact : '',
    open ? styles.triggerOpen : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return <span className={cls}>{children}</span>
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'className' | 'prefix'>, FrameProps {
  prefix?: ReactNode
  suffix?: ReactNode
  numeric?: boolean
  compact?: boolean
}

export function TextField({
  label,
  gate,
  hint,
  error,
  labelExtra,
  style,
  className,
  prefix,
  suffix,
  numeric,
  compact,
  id,
  readOnly,
  ...rest
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldFrame label={label} gate={gate} hint={hint} error={error} labelExtra={labelExtra} htmlFor={inputId} style={style} className={className}>
      <span
        className={`${styles.control} ${error ? styles.controlError : ''} ${readOnly ? styles.controlReadonly : ''} ${compact ? styles.compact : ''}`}
      >
        {prefix ? <span className={styles.affix}>{prefix}</span> : null}
        <input id={inputId} className={`${styles.input} ${numeric ? styles.numeric : ''}`} readOnly={readOnly} {...rest} />
        {suffix ? <span className={styles.affix}>{suffix}</span> : null}
      </span>
    </FieldFrame>
  )
}

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style' | 'className'>, FrameProps {
  /** Shows "n / max" in the label row and enforces the cap. */
  maxLength?: number
  ref?: Ref<HTMLTextAreaElement>
}

export function TextArea({ label, gate, hint, error, labelExtra, style, className, id, maxLength, value, ref, ...rest }: TextAreaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const length = typeof value === 'string' ? value.length : 0
  return (
    <FieldFrame
      label={label}
      gate={gate}
      hint={hint}
      error={error}
      labelExtra={labelExtra ?? (maxLength ? `${length} / ${maxLength}` : undefined)}
      htmlFor={inputId}
      style={style}
      className={className}
    >
      <span className={`${styles.control} ${error ? styles.controlError : ''}`}>
        <textarea ref={ref} id={inputId} className={styles.textarea} value={value} maxLength={maxLength} {...rest} />
      </span>
    </FieldFrame>
  )
}

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  disabled?: boolean
}

export interface SelectFieldProps<V extends string> extends FrameProps {
  value: V
  options: readonly SelectOption<V>[] | readonly V[]
  onChange: (value: V) => void
  compact?: boolean
  disabled?: boolean
  id?: string
  name?: string
  /** Shown when `value` matches no option. */
  placeholder?: string
  'aria-label'?: string
}

/** Where the panel goes: pinned under the trigger, or above it when the page runs out of room. */
interface Placement {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

const POPUP_GAP = 6
const POPUP_MAX = 288
const OPTION_HEIGHT = 36

/**
 * A listbox we draw ourselves rather than a native <select>.
 *
 * The native popup is painted by the OS — on Windows a white list with a
 * system-blue highlight, which has nothing to do with the brand. This keeps the
 * trigger looking like every other field and opens a milk panel with terracotta
 * selection, while behaving like a real combobox: arrows, Home/End, type-ahead,
 * Enter to pick, Escape to close, selected row scrolled into view.
 *
 * The panel is portalled to <body> and positioned `fixed` because several of the
 * tables that hold selects clip their overflow (`overflow-x: auto`), which would
 * cut an absolutely positioned popup off at the cell edge.
 */
export function SelectField<V extends string>({
  label,
  gate,
  hint,
  error,
  labelExtra,
  style,
  className,
  value,
  options,
  onChange,
  compact,
  disabled,
  id,
  name,
  placeholder,
  'aria-label': ariaLabel,
}: SelectFieldProps<V>) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listId = `${inputId}-list`
  const opts: SelectOption<V>[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const selectedIndex = opts.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? opts[selectedIndex] : undefined

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(Math.max(selectedIndex, 0))
  const [place, setPlace] = useState<Placement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typed = useRef({ query: '', at: 0 })

  const measure = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - POPUP_GAP - 8
    const above = r.top - POPUP_GAP - 8
    const wanted = Math.min(POPUP_MAX, opts.length * OPTION_HEIGHT + 10)
    const dropUp = below < wanted && above > below
    setPlace({
      left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
      width: r.width,
      top: dropUp ? undefined : r.bottom + POPUP_GAP,
      bottom: dropUp ? window.innerHeight - r.top + POPUP_GAP : undefined,
      maxHeight: Math.max(120, Math.min(POPUP_MAX, dropUp ? above : below)),
    })
  }, [opts.length])

  useLayoutEffect(() => {
    if (open) measure()
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return
      setOpen(false)
    }
    // Any ancestor scrolling would leave the fixed panel behind, so close rather than chase it.
    const onScroll = (e: Event) => {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', measure)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', measure)
    }
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  /** Next selectable index in `dir`, wrapping, skipping disabled rows. */
  const step = (from: number, dir: 1 | -1) => {
    const n = opts.length
    if (!n) return from
    for (let i = 1; i <= n; i += 1) {
      const next = (((from + dir * i) % n) + n) % n
      if (!opts[next].disabled) return next
    }
    return from
  }

  const commit = (index: number) => {
    const opt = opts[index]
    if (!opt || opt.disabled) return
    onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setActive(Math.max(selectedIndex, 0))
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => step(i, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => step(i, -1))
        break
      case 'Home':
        e.preventDefault()
        setActive(step(-1, 1))
        break
      case 'End':
        e.preventDefault()
        setActive(step(0, -1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        commit(active)
        break
      default: {
        if (e.key.length !== 1) return
        const now = Date.now()
        typed.current.query = now - typed.current.at > 700 ? e.key : typed.current.query + e.key
        typed.current.at = now
        const q = typed.current.query.toLowerCase()
        const hit = opts.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(q))
        if (hit >= 0) setActive(hit)
      }
    }
  }

  return (
    <FieldFrame label={label} gate={gate} hint={hint} error={error} labelExtra={labelExtra} htmlFor={inputId} style={style} className={className}>
      <button
        ref={triggerRef}
        id={inputId}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`${styles.control} ${styles.trigger} ${error ? styles.controlError : ''} ${compact ? styles.compact : ''} ${open ? styles.triggerOpen : ''}`}
        onClick={() => {
          setActive(Math.max(selectedIndex, 0))
          setOpen((o) => !o)
        }}
        onKeyDown={onKeyDown}
      >
        <span className={`${styles.triggerText} ${selected ? '' : styles.triggerEmpty}`}>{selected?.label ?? placeholder ?? '—'}</span>
        <span className={`${styles.triggerChevron} ${open ? styles.triggerChevronOpen : ''}`}>
          <Icon name="chevron-down" size={16} />
        </span>
      </button>
      {open && place
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
              className={styles.popup}
              style={{ left: place.left, top: place.top, bottom: place.bottom, minWidth: place.width, maxHeight: place.maxHeight }}
            >
              {opts.map((o, i) => (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled || undefined}
                  data-active={i === active}
                  className={`${styles.option} ${i === active ? styles.optionActive : ''} ${o.value === value ? styles.optionOn : ''} ${o.disabled ? styles.optionDisabled : ''}`}
                  onPointerEnter={() => !o.disabled && setActive(i)}
                  onClick={() => commit(i)}
                >
                  <span className={styles.optionLabel}>{o.label}</span>
                  <span className={styles.optionMark}>{o.value === value ? <Icon name="check" size={15} /> : null}</span>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </FieldFrame>
  )
}

/** "08:00" — native picker, tabular figures. */
export function TimeField({ value, onChange, ...rest }: Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & { value: string; onChange: (v: string) => void }) {
  return <TextField type="time" value={value} onChange={(e) => onChange(e.target.value)} step={300} {...rest} />
}

/** ISO date — native picker. */
export function DateField({ value, onChange, ...rest }: Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & { value: string; onChange: (v: string) => void }) {
  return <TextField type="date" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
}

export function formatVnd(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toLocaleString('vi-VN')
}

export function parseVnd(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

/** VND amount with live thousands separators; `null` while empty. */
export function MoneyField({
  value,
  onChange,
  suffix = 'đ',
  ...rest
}: Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'numeric'> & { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <TextField
      inputMode="numeric"
      numeric
      value={formatVnd(value)}
      onChange={(e) => onChange(parseVnd(e.target.value))}
      suffix={suffix}
      {...rest}
    />
  )
}

/** Integer with an optional unit suffix; `null` while empty. */
export function NumberField({
  value,
  onChange,
  min,
  max,
  ...rest
}: Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'numeric' | 'min' | 'max'> & {
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
}) {
  return (
    <TextField
      inputMode="numeric"
      numeric
      value={value == null ? '' : String(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, '')
        if (!digits) return onChange(null)
        let n = Number(digits)
        if (max != null) n = Math.min(n, max)
        if (min != null) n = Math.max(n, min)
        onChange(n)
      }}
      {...rest}
    />
  )
}

export interface MoneyRangeFieldProps extends FrameProps {
  from: number | null
  to: number | null
  onFrom: (v: number | null) => void
  onTo: (v: number | null) => void
  fromLabel: string
  toLabel: string
  fromPlaceholder?: string
  toPlaceholder?: string
  suffix?: string
  compact?: boolean
  disabled?: boolean
  /** The upper bound alone is dead until there is a lower bound to count from. */
  toDisabled?: boolean
}

/**
 * "từ – đến đ" as one control.
 *
 * A range is one answer, not two: the receptionist says "từ 300 nghìn đến 500
 * nghìn" in a single breath. Two separate boxes under two column headings made
 * the price table read as twice as many fields as it has.
 */
export function MoneyRangeField({
  label,
  gate,
  hint,
  error,
  labelExtra,
  style,
  className,
  from,
  to,
  onFrom,
  onTo,
  fromLabel,
  toLabel,
  fromPlaceholder,
  toPlaceholder,
  suffix = 'đ',
  compact,
  disabled,
  toDisabled,
}: MoneyRangeFieldProps) {
  return (
    <FieldFrame label={label} gate={gate} hint={hint} error={error} labelExtra={labelExtra} style={style} className={className}>
      <span className={`${styles.control} ${styles.rangeShell} ${error ? styles.controlError : ''} ${compact ? styles.compact : ''}`}>
        <input
          className={styles.rangeInput}
          inputMode="numeric"
          aria-label={fromLabel}
          value={formatVnd(from)}
          placeholder={fromPlaceholder}
          disabled={disabled}
          onChange={(e) => onFrom(parseVnd(e.target.value))}
        />
        <span className={styles.rangeDash} aria-hidden="true">
          –
        </span>
        <input
          className={styles.rangeInput}
          inputMode="numeric"
          aria-label={toLabel}
          value={formatVnd(to)}
          placeholder={toPlaceholder}
          disabled={disabled || toDisabled}
          onChange={(e) => onTo(parseVnd(e.target.value))}
        />
        <span className={styles.affix}>{suffix}</span>
      </span>
    </FieldFrame>
  )
}
