import { useId } from 'react'
import type { CSSProperties, InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Icon } from '../../design-system'
import type { Gate } from './Card'
import { GateTag } from './Card'
import styles from './Field.module.css'

/*
 * Form controls for the app. Same skin as the design-system Input (milk
 * ground, 12px radius, 1px inset hairline that thickens to the focus ring), but
 * as CSS modules and with the extra control types the catalogue needs: select,
 * textarea, time, date, VND amount, phone.
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

export interface SelectFieldProps<V extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'style' | 'className' | 'value' | 'onChange'>,
    FrameProps {
  value: V
  options: readonly SelectOption<V>[] | readonly V[]
  onChange: (value: V) => void
  compact?: boolean
}

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
  id,
  ...rest
}: SelectFieldProps<V>) {
  const autoId = useId()
  const inputId = id ?? autoId
  const opts: SelectOption<V>[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <FieldFrame label={label} gate={gate} hint={hint} error={error} labelExtra={labelExtra} htmlFor={inputId} style={style} className={className}>
      <span className={`${styles.control} ${styles.selectWrap} ${error ? styles.controlError : ''} ${compact ? styles.compact : ''}`}>
        <select id={inputId} className={styles.select} value={value} onChange={(e) => onChange(e.target.value as V)} {...rest}>
          {opts.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron}>
          <Icon name="chevron-down" size={16} />
        </span>
      </span>
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
