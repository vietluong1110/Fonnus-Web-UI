import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'type'> {
  label?: ReactNode
  hint?: ReactNode
  style?: CSSProperties
}

export function Switch({
  label,
  checked = false,
  onChange,
  disabled = false,
  hint,
  style,
  ...rest
}: SwitchProps) {
  return (
    <label
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--size-body-sm)',
            fontWeight: 'var(--weight-ui)' as CSSProperties['fontWeight'],
          }}
        >
          {label}
        </span>
        {hint ? <span style={{ fontSize: 'var(--size-ui)', color: 'var(--text-muted)' }}>{hint}</span> : null}
      </span>
      <span
        style={{
          position: 'relative',
          width: 44,
          height: 26,
          flex: '0 0 auto',
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--action-primary)' : 'rgba(38,31,24,.16)',
          transition: 'background var(--duration-base) var(--ease-out)',
        }}
      >
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'inherit' }}
          {...rest}
        />
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--milk)',
            transition: 'left var(--duration-base) var(--ease-arc)',
          }}
        />
      </span>
    </label>
  )
}
