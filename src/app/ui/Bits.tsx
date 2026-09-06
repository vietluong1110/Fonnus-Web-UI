import { createContext, useContext, useLayoutEffect, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { Button, Icon, Pattern } from '../../design-system'
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
      {/* Dấu thanh is the one pattern allowed on sage — the resolved state. */}
      {tone === 'sage' ? <Pattern name="ticks" style={{ zIndex: -1 }} /> : null}
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
        {speaker === 'handoff' ? <Pattern name="ticks" style={{ zIndex: -1 }} /> : null}
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

/**
 * The bottom edge of a section page is one sticky stack, and the save bar is
 * its anchor. Whatever else wants that edge while there are unsaved changes
 * — the assistant's button, on a width where the page has no rail column to
 * keep the assistant in — is handed in as `above`, and rides up with the bar
 * instead of measuring it. `onPresence` tells the page when the bar is on
 * screen, so the floating assistant can stand down while it is.
 */
interface BottomStack {
  above: ReactNode
  onPresence: (shown: boolean) => void
}

const BottomStackContext = createContext<BottomStack | null>(null)

export function BottomStackProvider({ above, onPresence, children }: BottomStack & { children: ReactNode }) {
  return <BottomStackContext.Provider value={{ above, onPresence }}>{children}</BottomStackContext.Provider>
}

export function SaveBar({
  dirty,
  saving,
  error,
  onSave,
  onCancel,
  label = 'Bạn có thay đổi chưa lưu',
  sub,
}: {
  dirty: boolean
  saving?: boolean
  /**
   * A failed save, in Vietnamese. The bar stays up and the button becomes
   * "Thử lại" — a toast would take the message away while the unsaved change
   * is still sitting on screen.
   */
  error?: string | null
  onSave: () => void
  onCancel: () => void
  label?: ReactNode
  sub?: ReactNode
}) {
  const stack = useContext(BottomStackContext)
  const onPresence = stack?.onPresence
  // Layout effect, not a passive one: the page takes the floating assistant
  // down in response, and that has to land in the same paint as the bar.
  useLayoutEffect(() => {
    if (!onPresence) return
    onPresence(dirty)
    return () => onPresence(false)
  }, [dirty, onPresence])

  if (!dirty) return null
  return (
    <div className={styles.saveStack}>
      {stack?.above}
      <div className={styles.saveBar} role="region" aria-label="Lưu thay đổi">
        {/* Night surfaces take the dots only — arcs read too loud on brown. */}
        <Pattern name="night-dots" style={{ zIndex: -1 }} />
        <div className={styles.saveBarText}>
          <div>{error ? 'Chưa lưu được' : label}</div>
          {error ? (
            <div className={`${styles.saveBarSub} ${styles.saveBarError}`} role="alert">
              {error}
            </div>
          ) : sub ? (
            <div className={styles.saveBarSub}>{sub}</div>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} style={{ color: 'var(--cream-night)' }} disabled={saving}>
          Huỷ
        </Button>
        <Button variant="inverse" size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Đang lưu…' : error ? 'Thử lại' : 'Lưu thay đổi'}
        </Button>
      </div>
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

export function TableRow({ columns, children, warn, style, ref }: { columns: string; children: ReactNode; warn?: boolean; style?: CSSProperties; /** For `useAppear`, so a table row grows and collapses like every other list row. */ ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={`${styles.tr} ${warn ? styles.trWarn : ''}`} style={{ gridTemplateColumns: columns, ...style }}>
      {children}
    </div>
  )
}

export const tableStyles = styles

/* -------------------------------------------------- AddButton / DeleteButton

 * The two actions every list on this app needs, as one pair of pills.
 *
 * `AddButton` belongs in the head of the card it adds to — top right, in the
 * `actions` slot — never at the foot of the list. A list that grows pushes a
 * foot button off the screen, so the way to add the second row ends up
 * somewhere different from the way you added the first; in the head it stays
 * where it was put, and it reads as "this card's action" rather than as
 * another row. The one dashed thing under a list is the empty state, or a
 * `Suggestion`, and both are content rather than chrome.
 *
 * `DeleteButton` is the same pill with the word written out and the error
 * colour held back until it is pointed at. Use `IconButton name="trash"` for
 * a row's own delete, where there is no room for a word.
 */

export function AddButton({ label, onClick, band = false }: { label: string; onClick: () => void; /** Slightly smaller, for a group band inside a card rather than the card's own head. */ band?: boolean }) {
  return (
    <button type="button" className={`${styles.addBtn} ${band ? styles.addBtnBand : ''}`} onClick={onClick}>
      <Icon name="plus" size={13} />
      {label}
    </button>
  )
}

export function DeleteButton({ label, icon = true, band = false, onClick }: { label: string; icon?: boolean; band?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.delBtn} ${band ? styles.delBtnBand : ''}`} onClick={onClick}>
      {icon ? <Icon name="trash" size={14} /> : null}
      {label}
    </button>
  )
}

/* ----------------------------------------------------------- Suggestions

 * Dashed means *content you can take*, and only that: a suggestion here, or
 * the empty state above it. It stopped meaning anything when it was also the
 * add button, because then half the dashed things on a page were controls.
 *
 * A suggestion list sits inside the card it writes into, under a hairline
 * with the word "Gợi ý" on it — a separate card made the reader carry the
 * link between the two themselves, and put the examples furthest away
 * exactly when the box above was still blank.
 */

/**
 * A hairline with a word sitting on it. It names a band inside a card
 * without spending a heading on one, and the rule carries on past the word
 * so the band still reads as part of the card rather than as a second card.
 * `Suggestions` is this plus its list; a card that groups two kinds of the
 * same thing — the words Fonnus derives and the ones the industry pack
 * brings — uses it directly.
 */
export function Rule({ label, hint }: { label: string; hint?: ReactNode }) {
  return (
    <div className={styles.suggestsRule}>
      <span className={styles.suggestsLabel}>{label}</span>
      {hint ? <span className={styles.suggestsHint}>{hint}</span> : null}
    </div>
  )
}

export function Suggestions({ label = 'Gợi ý', hint, children }: { label?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.suggests}>
      <Rule label={label} hint={hint} />
      <div className={styles.suggestsList}>{children}</div>
    </div>
  )
}

export function Suggestion({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={styles.suggest} onClick={onClick}>
      <span className={styles.suggestPlus}>
        <Icon name="plus" size={14} />
      </span>
      <span>{children}</span>
    </button>
  )
}

/**
 * The rest of a long suggestion list, behind one line. Show three or four —
 * enough to say what a good one looks like — and let the reader ask for the
 * remainder. Past that the examples are taller than the list they write
 * into, and the card reads as a page of suggestions with a list attached.
 */
export function SuggestionMore({ count, open, onToggle }: { count: number; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={styles.suggestMore} onClick={onToggle} aria-expanded={open}>
      {open ? 'Bớt gợi ý' : `Thêm ${count} gợi ý`}
      <span className={`${styles.suggestMoreChevron} ${open ? styles.suggestMoreOpen : ''}`}>
        <Icon name="chevron-down" size={14} />
      </span>
    </button>
  )
}
