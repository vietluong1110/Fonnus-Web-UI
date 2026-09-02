import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import { useSpeak } from './speak'
import styles from './Bits.module.css'

/* ------------------------------------------------------------------ Tabs */

export interface TabItem<V extends string> {
  value: V
  label: ReactNode
  count?: number | string
  href?: string
}

export function Tabs<V extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: readonly TabItem<V>[]
  value: V
  onChange?: (v: V) => void
  ariaLabel?: string
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => {
        const active = it.value === value
        const cls = `${styles.tab} ${active ? styles.tabOn : ''}`
        const inner = (
          <>
            {it.label}
            {it.count != null ? <span className={styles.tabCount}>{it.count}</span> : null}
          </>
        )
        return it.href ? (
          <a key={it.value} role="tab" aria-selected={active} className={cls} href={it.href}>
            {inner}
          </a>
        ) : (
          <button key={it.value} type="button" role="tab" aria-selected={active} className={cls} onClick={() => onChange?.(it.value)}>
            {inner}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- Notice */

type NoticeTone = 'sage' | 'warm' | 'rose' | 'info' | 'neutral'
const noticeClass: Record<NoticeTone, string> = {
  sage: styles.noticeSage,
  warm: styles.noticeWarm,
  rose: styles.noticeRose,
  info: styles.noticeInfo,
  neutral: styles.noticeNeutral,
}

export function Notice({
  tone = 'sage',
  icon,
  children,
  actions,
  style,
}: {
  tone?: NoticeTone
  icon?: IconName
  children: ReactNode
  actions?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className={noticeClass[tone]} style={style} role={tone === 'rose' ? 'alert' : undefined}>
      {icon ? <Icon name={icon} size={16} style={{ marginTop: 2 }} /> : null}
      <div className={styles.noticeBody}>{children}</div>
      {actions ? <div className={styles.noticeActions}>{actions}</div> : null}
    </div>
  )
}

/* ---------------------------------------------------------- SpeechBubble */

const bubbleClass = {
  assistant: styles.bubbleAssistant,
  caller: styles.bubbleCaller,
  handoff: styles.bubbleHandoff,
}

/**
 * A line the receptionist would say, on one of the three voice grounds. When
 * `speak` is on, a play button previews it with the browser's Vietnamese voice
 * — a stand-in for the real TTS endpoint (see `speak.ts`).
 */
export function SpeechBubble({
  speaker = 'assistant',
  who,
  children,
  text,
  speak = false,
  muted = false,
  style,
}: {
  speaker?: 'assistant' | 'caller' | 'handoff'
  /** Small caps label above the line: "Linh nói". */
  who?: ReactNode
  children?: ReactNode
  /** The plain text to voice when `speak` is set; defaults to `children` if it is a string. */
  text?: string
  speak?: boolean
  muted?: boolean
  style?: CSSProperties
}) {
  const voiced = text ?? (typeof children === 'string' ? children : '')
  return (
    <div className={styles.bubbleRow} style={style}>
      <div className={bubbleClass[speaker]} style={{ width: '100%' }}>
        {speak ? <PlayButton text={voiced} /> : null}
        <div className={`${styles.bubbleText} ${muted ? styles.bubbleMuted : ''}`}>
          {who ? <div className={styles.bubbleWho}>{who}</div> : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export function PlayButton({ text, label = 'Nghe thử' }: { text: string; label?: string }) {
  const { speaking, toggle, supported } = useSpeak(text)
  return (
    <button
      type="button"
      className={`${styles.play} ${speaking ? styles.playOn : ''}`}
      onClick={toggle}
      aria-label={speaking ? 'Dừng' : label}
      title={supported ? label : 'Trình duyệt này không đọc được tiếng Việt — nghe thử cần máy chủ TTS.'}
      disabled={!text.trim()}
    >
      <Icon name={speaking ? 'pause' : 'play'} size={14} />
    </button>
  )
}

/* ------------------------------------------------------------ IconButton */

export function IconButton({
  name,
  label,
  onClick,
  danger,
  disabled,
  size = 16,
}: {
  name: IconName
  label: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  size?: number
}) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${danger ? styles.iconButtonDanger : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      <Icon name={name} size={size} />
    </button>
  )
}

/* ------------------------------------------------------------ Disclosure */

/** A collapsible block for the "Nâng cao — không bắt buộc" pattern (frame 18). */
export function Disclosure({
  title,
  subtitle,
  defaultOpen = false,
  children,
  badge,
}: {
  title: ReactNode
  subtitle?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  badge?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.disclosure}>
      <button type="button" className={styles.disclosureHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h3 style={{ margin: 0, font: '600 16px/1.3 var(--font-display)' }}>{title}</h3>
        {badge}
        {subtitle ? <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{subtitle}</span> : null}
        <span className={`${styles.disclosureChevron} ${open ? styles.disclosureOpen : ''}`}>
          <Icon name="chevron-down" size={18} />
        </span>
      </button>
      {open ? children : null}
    </div>
  )
}

/* ---------------------------------------------------------------- Slider */

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  ariaLabel,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format: (v: number) => string
  ariaLabel: string
}) {
  return (
    <div className={styles.slider}>
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
      />
      <span className={styles.sliderValue}>{format(value)}</span>
    </div>
  )
}

/* --------------------------------------------------------------- SaveBar */

export function SaveBar({
  dirty,
  saving,
  onSave,
  onCancel,
  label = 'Bạn có thay đổi chưa lưu',
  sub,
}: {
  dirty: boolean
  saving?: boolean
  onSave: () => void
  onCancel: () => void
  label?: ReactNode
  sub?: ReactNode
}) {
  if (!dirty) return null
  return (
    <div className={styles.saveBar} role="region" aria-label="Lưu thay đổi">
      <div className={styles.saveBarText}>
        <div>{label}</div>
        {sub ? <div className={styles.saveBarSub}>{sub}</div> : null}
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} style={{ color: 'var(--cream-night)' }} disabled={saving}>
        Huỷ
      </Button>
      <Button variant="inverse" size="sm" onClick={onSave} disabled={saving}>
        {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------ EmptyState */

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyTitle}>{title}</span>
      {children ? <span>{children}</span> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  )
}

/* ----------------------------------------------------------------- Table */

export function TableHead({ columns, children }: { columns: string; children: ReactNode }) {
  return (
    <div className={styles.thead} style={{ gridTemplateColumns: columns }}>
      {children}
    </div>
  )
}

export function TableRow({ columns, children, warn, style }: { columns: string; children: ReactNode; warn?: boolean; style?: CSSProperties }) {
  return (
    <div className={`${styles.tr} ${warn ? styles.trWarn : ''}`} style={{ gridTemplateColumns: columns, ...style }}>
      {children}
    </div>
  )
}

export const tableStyles = styles
