import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Field.module.css'

/**
 * The auth pill field.
 *
 * Not the design-system `Input`: that one draws a 12px bordered box, and these
 * screens borrow the landing hero's pill instead, so the first control an owner
 * meets after clicking "Dùng thử miễn phí" is the same shape they just clicked.
 */
export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string
  error?: string | null
  /** Sets tabular figures — for phone numbers and codes, never for names. */
  numeric?: boolean
  /** Sits inside the pill, before the input. */
  prefix?: ReactNode
  /** Sits beside the label, e.g. the "Lần trước" mark on sign-in. */
  badge?: ReactNode
}

export function Field({ label, error, numeric = false, prefix, badge, id, ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id || autoId
  const errorId = `${inputId}-error`

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        {badge}
      </div>

      <div className={`${styles.pill} ${error ? styles.pillError : ''}`}>
        {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
        <input
          id={inputId}
          className={`${styles.input} ${numeric ? styles.numeric : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
      </div>

      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** The +84 a Vietnamese mobile number is typed after. */
export function PhoneField(props: Omit<FieldProps, 'prefix' | 'numeric'>) {
  return (
    <Field
      {...props}
      numeric
      inputMode="tel"
      autoComplete="tel"
      prefix={
        <>
          <span className={styles.dialCode}>+84</span>
          <span className={styles.divider} aria-hidden="true" />
        </>
      }
    />
  )
}
