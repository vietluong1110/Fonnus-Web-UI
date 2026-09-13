import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { NumbersOverview, OwnedNumber } from '../../../api'
import { Icon } from '../../../design-system'
import { useToast } from '../../ui'
import { initialOf, numberRuns } from './labels'
import styles from './Numbers.module.css'

/*
 * The small pieces the list, the kho and both panels share.
 */

export type PanelVariant = 'rail' | 'drawer' | 'sheet'

/** A receptionist: her initial in a ring. Not the orb — the orb means "call her". */
export function Avatar({ name, small = false, dashed = false }: { name: string; small?: boolean; dashed?: boolean }) {
  return (
    <span className={`${styles.avatar} ${small ? styles.avatarSm : ''} ${dashed ? styles.avatarDashed : ''}`} aria-hidden="true">
      {initialOf(name)}
    </span>
  )
}

/** A number in Plex: the area code quiet, the digits that matter in the accent. */
export function NumberText({ number, lit = 0, q = '', className }: { number: string; lit?: number; q?: string; className?: string }) {
  return (
    <span className={`${styles.num} ${className ?? ''}`}>
      {numberRuns(number, lit, q).map((r, i) => (
        <span key={i} className={r.tone === 'soft' ? styles.soft : r.tone === 'lit' ? styles.lit : undefined}>
          {r.text}
        </span>
      ))}
    </span>
  )
}

/**
 * Live is the one terracotta dot. Activating is a meter that creeps and never
 * claims to know how long is left: nobody knows how long a carrier takes.
 */
export function StatusMark({ status, pill = false }: { status: OwnedNumber['status']; pill?: boolean }) {
  const live = status === 'live'
  return (
    <span className={pill ? `${styles.pill} ${live ? styles.pillLive : styles.pillAct}` : styles.status}>
      {live ? (
        <span className={styles.dot} />
      ) : (
        <span className={styles.meter}>
          <span className={styles.meterCreep} />
        </span>
      )}
      <span>{live ? 'Đang trực máy' : 'Đang kích hoạt'}</span>
    </span>
  )
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * The payment window, counted down in the panel's corner — the one countdown in
 * the app, at the owner's request (13 Sept 2026). It is honest only because the
 * server keeps the same deadline (`Checkout.expires_at`): at zero the page asks
 * the server, which answers `expired`. Never draw a clock the server does not keep.
 */
export function PayClock({ until, onZero }: { until: string; onZero: () => void }) {
  const end = Date.parse(until)
  const [now, setNow] = useState(() => Date.now())
  const left = Math.max(0, Math.ceil((end - now) / 1000))
  const zero = useRef(onZero)
  zero.current = onZero

  useEffect(() => {
    if (left <= 0) {
      zero.current()
      return
    }
    // Wake just past the next whole second, so the digits change on the second and never skip one.
    const t = window.setTimeout(() => setNow(Date.now()), ((end - Date.now()) % 1000) + 15)
    return () => window.clearTimeout(t)
  }, [left, end])

  const m = Math.floor(left / 60)
  const s = left % 60
  return (
    <span className={`${styles.clock} ${left <= 60 ? styles.clockLate : ''}`} role="timer" aria-label={`Còn ${m} phút ${s} giây để thanh toán`}>
      <Icon name="hours" size={15} />
      <span className={styles.num}>
        {pad2(m)}:{pad2(s)}
      </span>
    </span>
  )
}

/** One tile per receptionist; picking one is the whole of "who answers". */
export function ReceptionistTiles({
  overview,
  selected,
  onPick,
  exceptNumber,
}: {
  overview: NumbersOverview
  selected: string
  onPick: (id: string) => void
  /** The number being edited, so her count is "the others". */
  exceptNumber?: string
}) {
  return (
    <div className={styles.agents} role="radiogroup" aria-label="Lễ tân nghe máy">
      {overview.receptionists.map((r) => {
        const count = overview.numbers.filter((n) => n.receptionist_id === r.id && n.id !== exceptNumber).length
        const on = r.id === selected
        // Inside one number's panel, the chosen one is answering it — never "chưa có số".
        const holds = exceptNumber && on ? (count ? `số này và ${count} số khác` : 'nghe máy số này') : count ? `đang có ${count} số` : 'chưa có số'
        const sub = [r.branch, holds].filter(Boolean).join(' · ')
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`${styles.agentTile} ${on ? styles.agentOn : ''}`}
            onClick={() => onPick(r.id)}
          >
            <Avatar name={r.name} />
            <span className={styles.agentText}>
              <span className={styles.agentName}>{r.name}</span>
              <span className={styles.agentSub}>{sub}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Old number, an arc carrying the call, the Fonnus number. A quadratic curve
 * that stays inside its box, with the head laid along the curve's last tangent
 * (control point → end), so it points where the dashes are going.
 */
export function ForwardArc() {
  return (
    <svg className={styles.arc} width="44" height="22" viewBox="0 0 56 28" fill="none" aria-hidden="true">
      <path className={styles.arcFlow} d="M6 20 Q28 2 48 18" />
      <path className={styles.arcHead} d="M45.3 10.1 L48 18 L39.7 17.1" />
    </svg>
  )
}

/**
 * The same content in three containers, as on Cuộc gọi: the sticky rail beside
 * the list, a drawer from the right on a tablet, the whole screen on a phone.
 */
export function PanelFrame({
  variant,
  title,
  onClose,
  children,
}: {
  variant: PanelVariant
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (variant !== 'rail') closeRef.current?.focus()
  }, [variant])

  if (variant === 'sheet')
    return (
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.sheetBar}>
          <button ref={closeRef} type="button" className={styles.disc} onClick={onClose} aria-label="Quay lại">
            <Icon name="chevron-left" size={20} />
          </button>
          <span className={styles.barTitle}>{title}</span>
        </div>
        <div className={styles.sheetScroll}>{children}</div>
      </div>
    )

  if (variant === 'drawer')
    return (
      <>
        <div className={styles.scrim} onClick={onClose} />
        <div className={styles.drawer} role="dialog" aria-modal="true" aria-label={title}>
          <div className={styles.drawerBar}>
            <span className={styles.barTitle}>{title}</span>
            <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
              <Icon name="x" size={18} />
            </button>
          </div>
          <div className={styles.drawerScroll}>{children}</div>
        </div>
      </>
    )

  return <div className={styles.panel}>{children}</div>
}

/** Copy to the clipboard and say so; a browser that refuses gets told plainly. */
export function useCopy() {
  const { toast } = useToast()
  return (text: string, what: string) => {
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
    const refused = () => toast('Trình duyệt chưa cho chép. Bạn chép tay giúp mình nhé.', 'error')
    if (!clip) {
      refused()
      return
    }
    clip.writeText(text).then(() => toast(`Đã chép ${what}.`, 'neutral'), refused)
  }
}
