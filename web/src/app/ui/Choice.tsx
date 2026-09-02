import type { CSSProperties, ReactNode } from 'react'
import styles from './Choice.module.css'

interface RadioProps {
  name: string
  label: ReactNode
  hint?: ReactNode
  checked: boolean
  onChange: () => void
  disabled?: boolean
}

export function Radio({ name, label, hint, checked, onChange, disabled }: RadioProps) {
  return (
    <label className={`${styles.choice} ${disabled ? styles.choiceDisabled : ''}`}>
      <span className={`${styles.radio} ${checked ? styles.radioOn : ''}`}>
        <input className={styles.native} type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
    </label>
  )
}

/** A vertical radio group bound to a string union. */
export function RadioGroup<V extends string>({
  name,
  value,
  onChange,
  options,
  style,
}: {
  name: string
  value: V
  onChange: (v: V) => void
  options: readonly { value: V; label: ReactNode; hint?: ReactNode }[]
  style?: CSSProperties
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }} role="radiogroup">
      {options.map((o) => (
        <Radio key={o.value} name={name} label={o.label} hint={o.hint} checked={value === o.value} onChange={() => onChange(o.value)} />
      ))}
    </div>
  )
}

interface CheckboxProps {
  label: ReactNode
  hint?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Checkbox({ label, hint, checked, onChange, disabled }: CheckboxProps) {
  return (
    <label className={`${styles.choice} ${disabled ? styles.choiceDisabled : ''}`}>
      <span className={`${styles.check} ${checked ? styles.checkOn : ''}`}>
        <input className={styles.native} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
        {checked ? <span aria-hidden="true">✓</span> : null}
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
    </label>
  )
}

export function Segmented<V extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: V
  onChange: (v: V) => void
  options: readonly { value: V; label: ReactNode }[]
  ariaLabel?: string
}) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`${styles.segment} ${value === o.value ? styles.segmentOn : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  hint?: ReactNode
  disabled?: boolean
  /** Adds a hairline above, for stacking rows in a card. */
  lined?: boolean
  ariaLabel?: string
}

export function Switch({ checked, onChange, label, hint, disabled, lined, ariaLabel }: SwitchProps) {
  const toggle = (
    <span className={`${styles.track} ${checked ? styles.trackOn : ''} ${disabled ? styles.trackDisabled : ''}`}>
      <input
        className={styles.native}
        type="checkbox"
        role="switch"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={`${styles.thumb} ${checked ? styles.thumbOn : ''}`} />
    </span>
  )
  if (!label) return <label style={{ display: 'inline-flex', cursor: disabled ? 'not-allowed' : 'pointer' }}>{toggle}</label>
  return (
    <label className={`${styles.switchRow} ${lined ? styles.switchRowLined : ''}`} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span className={styles.switchText}>
        <span className={styles.switchLabel}>{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
      {toggle}
    </label>
  )
}
