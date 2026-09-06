import type { CSSProperties, ReactNode } from 'react'
import { Pattern } from '../../design-system'
import type { PatternName } from '../../design-system'
import ui from './ui.module.css'

type Tone = 'milk' | 'dashed' | 'warm' | 'sage' | 'rose'

const toneClass: Record<Tone, string> = {
  milk: ui.card,
  dashed: ui.cardDashed,
  warm: ui.cardWarm,
  sage: ui.cardSage,
  rose: ui.cardRose,
}

interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  tone?: Tone
  tight?: boolean
  /**
   * A faint Fonnus pattern under the card's content — `grid` (Lưới lịch)
   * behind an hours table or a calendar. One kind of pattern per page.
   */
  pattern?: PatternName
  children?: ReactNode
  className?: string
  style?: CSSProperties
  id?: string
}

export function Card({
  title,
  subtitle,
  actions,
  tone = 'milk',
  tight = false,
  pattern,
  children,
  className,
  style,
  id,
}: CardProps) {
  return (
    <section
      id={id}
      className={`${toneClass[tone]} ${tight ? ui.cardTight : ''} ${pattern ? ui.cardPatterned : ''} ${className ?? ''}`}
      style={style}
    >
      {pattern ? <Pattern name={pattern} style={{ zIndex: -1 }} /> : null}
      {title || actions ? (
        <div className={ui.cardHead}>
          <div className={ui.cardHeadText}>
            {title ? <h3 className={ui.cardTitle}>{title}</h3> : null}
            {subtitle ? <span className={ui.cardSub}>{subtitle}</span> : null}
          </div>
          {actions ? <div className={ui.cardActions}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
