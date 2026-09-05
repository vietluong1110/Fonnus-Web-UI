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

export type Gate = 'R1' | 'R2' | 'O' | 'SW'

const gateClass: Record<Gate, string> = {
  R1: ui.gateR1,
  R2: ui.gateR2,
  O: ui.gateO,
  SW: ui.gateSW,
}

const gateLabel: Record<Gate, string> = {
  R1: 'Bắt buộc',
  R2: 'Trước khi đón khách thật',
  O: 'Không bắt buộc',
  SW: 'Hệ thống',
}

/**
 * Gate chip: says whether a field or card is R1 (needed to answer at all), R2
 * (needed before real patients), optional, or system-written. The tenant never
 * sees the catalogue's letters, only what they mean.
 */
export function GateTag({ gate, style }: { gate: Gate; style?: CSSProperties }) {
  return (
    <span className={gateClass[gate]} style={style} title={`Mức ${gate}`}>
      {gateLabel[gate]}
    </span>
  )
}

interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  gate?: Gate
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
  gate,
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
            {gate ? <GateTag gate={gate} /> : null}
            {subtitle ? <span className={ui.cardSub}>{subtitle}</span> : null}
          </div>
          {actions ? <div className={ui.cardActions}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
