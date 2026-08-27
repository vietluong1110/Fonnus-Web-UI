import { useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

const sizes: Record<Size, { padding: string; fontSize: string; radius: string; gap: string; icon: number }> = {
  sm: { padding: '8px 14px', fontSize: 'var(--size-ui)', radius: 'var(--radius-sm)', gap: '6px', icon: 16 },
  md: { padding: '11px 20px', fontSize: 'var(--size-body-sm)', radius: 'var(--radius-md)', gap: '8px', icon: 18 },
  lg: { padding: '15px 26px', fontSize: 'var(--size-body)', radius: 'var(--radius-md)', gap: '10px', icon: 20 },
}

/* Primary uses Nút #A04E1F (5.4:1) with Kem text — never plain Đất nung behind small text. */
function variantStyle(variant: Variant): CSSProperties {
  if (variant === 'secondary')
    return {
      background: 'var(--action-secondary)',
      color: 'var(--text-body)',
      boxShadow: 'inset 0 0 0 1px var(--border-strong)',
    }
  if (variant === 'ghost') return { background: 'transparent', color: 'var(--text-accent)' }
  if (variant === 'inverse') return { background: 'var(--cream-night)', color: 'var(--night)' }
  return { background: 'var(--action-primary)', color: 'var(--text-on-accent)' }
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  style?: CSSProperties
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  style,
  ...rest
}: ButtonProps) {
  const s = sizes[size] || sizes.md
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  const v = variantStyle(variant)
  const hoverBg =
    variant === 'primary'
      ? 'var(--action-primary-hover)'
      : variant === 'secondary'
        ? 'var(--action-secondary-hover)'
        : variant === 'ghost'
          ? 'var(--action-ghost-hover)'
          : 'var(--cream)'

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false)
        setPress(false)
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        font: 'inherit',
        fontFamily: 'var(--font-ui)',
        fontWeight: 'var(--weight-ui)' as CSSProperties['fontWeight'],
        fontSize: s.fontSize,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        padding: s.padding,
        borderRadius: s.radius,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        transition:
          'background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
        transform: press && !disabled ? 'scale(var(--press-scale))' : 'none',
        ...v,
        background: hover && !disabled ? hoverBg : v.background,
        ...style,
      }}
      {...rest}
    >
      {icon ? <span style={{ display: 'inline-flex', width: s.icon, height: s.icon }}>{icon}</span> : null}
      {children}
      {iconRight ? (
        <span style={{ display: 'inline-flex', width: s.icon, height: s.icon }}>{iconRight}</span>
      ) : null}
    </button>
  )
}
