import { useId, useState } from 'react'
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'style'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  prefix?: ReactNode
  suffix?: ReactNode
  numeric?: boolean
  style?: CSSProperties
}

export function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  numeric = false,
  id,
  style,
  ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false)
  const autoId = useId()
  const inputId = id || autoId
  const border = error ? 'var(--error)' : focus ? 'var(--focus-ring)' : 'var(--border-strong)'

  return (
    <label htmlFor={inputId} style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label ? (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--size-ui)',
            fontWeight: 'var(--weight-ui)' as CSSProperties['fontWeight'],
            color: 'var(--text-body)',
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-md)',
          padding: '11px 14px',
          boxShadow: `inset 0 0 0 ${focus ? '2px' : '1px'} ${border}`,
          transition: 'box-shadow var(--duration-fast) var(--ease-out)',
        }}
      >
        {prefix ? <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{prefix}</span> : null}
        <input
          id={inputId}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: numeric ? 'var(--font-num)' : 'var(--font-ui)',
            fontVariantNumeric: numeric ? 'tabular-nums' : 'normal',
            fontSize: 'var(--size-body-sm)',
            lineHeight: 1.5,
            color: 'var(--text-body)',
          }}
          {...rest}
        />
        {suffix ? (
          <span
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-num)', fontSize: 'var(--size-body-sm)' }}
          >
            {suffix}
          </span>
        ) : null}
      </span>
      {error ? (
        <span style={{ fontSize: 'var(--size-ui)', color: 'var(--error)' }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 'var(--size-ui)', color: 'var(--text-muted)' }}>{hint}</span>
      ) : null}
    </label>
  )
}
