import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import styles from './Tiles.module.css'

/*
 * A choice made of drawn things.
 *
 * When the options are a small closed set and each one *is* a thing — a
 * note, a card, a wallet, a health-insurance card — the drawing is read
 * before the label is, and the grid answers the question in one glance
 * instead of one line at a time. That is worth more than the row of word
 * chips it replaces, and it is why `Thanh toán` on Dịch vụ looks the way it
 * does.
 *
 * Do not reach for tiles when the set is open-ended or the labels are
 * sentences: a free-form list of short values is a `ChipInput`, and a list
 * of ready-made sentences is `Suggestions`.
 */

/**
 * The grid. `min` is the column floor — 100px fits five payment methods and
 * the add tile beside the try-out rail; a set whose labels are phrases
 * passes something wider. `radio` when exactly one may be chosen.
 */
export function TileGrid({
  min,
  radio = false,
  ariaLabel,
  children,
}: {
  min?: number
  radio?: boolean
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <div
      className={styles.tiles}
      style={min ? ({ '--tile-min': `${min}px` } as CSSProperties) : undefined}
      role={radio ? 'radiogroup' : 'group'}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

/**
 * One tile. Selected is the terracotta fill the voice tiles use in Hồ sơ, so
 * "on" means the same thing in all three places — and on that ground the
 * drawing's accent becomes the text colour rather than staying terracotta on
 * terracotta.
 *
 * With `onRemove` and no `onClick` it is a value the clinic wrote itself: on
 * by definition, so it is removed rather than toggled.
 */
export function Tile({
  icon,
  label,
  selected = false,
  single = false,
  onClick,
  onRemove,
  removeLabel,
}: {
  icon: IconName
  label: ReactNode
  selected?: boolean
  /** One of the set, not one of many: `radio` semantics instead of a pressed toggle. */
  single?: boolean
  onClick?: () => void
  onRemove?: () => void
  removeLabel?: string
}) {
  const cls = `${styles.tile} ${selected ? styles.tileOn : ''} ${onRemove ? styles.tileOwn : ''}`
  const inner = (
    <>
      <Icon name={icon} size={20} />
      <span className={styles.tileName}>{label}</span>
    </>
  )
  if (!onClick)
    return (
      <span className={cls}>
        {inner}
        {onRemove ? (
          <button type="button" className={styles.tileRemove} aria-label={removeLabel} onClick={onRemove}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </span>
    )
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      {...(single ? { role: 'radio' as const, 'aria-checked': selected } : { 'aria-pressed': selected })}
    >
      {inner}
    </button>
  )
}

/**
 * The dashed tile that adds one of the clinic's own, at the end of the grid.
 * Typing takes the whole row: what a clinic adds is a phrase, not a word.
 */
export function TileAdd({
  label,
  placeholder,
  ariaLabel,
  onAdd,
}: {
  label: string
  placeholder: string
  ariaLabel: string
  onAdd: (value: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const commit = () => {
    const v = draft.trim()
    if (v) onAdd(v)
    setDraft('')
  }
  if (!adding)
    return (
      <button type="button" className={`${styles.tile} ${styles.tileAdd}`} onClick={() => setAdding(true)}>
        <Icon name="plus" size={18} />
        <span className={styles.tileName}>{label}</span>
      </button>
    )
  return (
    <span className={`${styles.tile} ${styles.tileInput}`}>
      <input
        className={styles.input}
        autoFocus
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            setDraft('')
            setAdding(false)
          }
        }}
        onBlur={() => {
          commit()
          setAdding(false)
        }}
      />
    </span>
  )
}
