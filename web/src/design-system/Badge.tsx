import type { CSSProperties, HTMLAttributes } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'terracotta' | 'lemongrass'

const map: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'rgba(38,31,24,.06)', fg: 'var(--text-muted)' },
  success: { bg: 'rgba(62,123,71,.12)', fg: 'var(--success)' },
  warning: { bg: 'rgba(143,99,0,.12)', fg: 'var(--warning)' },
  error: { bg: 'rgba(178,58,46,.12)', fg: 'var(--error)' },
  info: { bg: 'rgba(47,109,126,.12)', fg: 'var(--info)' },
  terracotta: { bg: 'rgba(184,92,43,.12)', fg: 'var(--text-accent)' },
  lemongrass: { bg: 'rgba(110,127,83,.16)', fg: 'var(--lemongrass)' },
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  dot?: boolean
  style?: CSSProperties
}

export function Badge({ children, tone = 'neutral', dot = false, style, ...rest }: BadgeProps) {
  const t = map[tone] || map.neutral
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        background: t.bg,
        color: t.fg,
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--size-ui)',
        fontWeight: 'var(--weight-ui)' as CSSProperties['fontWeight'],
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} /> : null}
      {children}
    </span>
  )
}
