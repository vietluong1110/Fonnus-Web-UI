import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../../design-system'
import { LABELS } from '../defaults'
import type { SpeakingSpeed, VoiceId } from '../model'
import { ControlShell, PlayButton } from '../../ui'
import styles from './Profile.module.css'

/*
 * Voice picking as a dropdown rather than a grid of tiles.
 *
 * Four voices fit in a grid; the roster will not stay at four, and a grid that
 * grows to twelve stops being scannable and starts pushing the rest of the
 * card off screen. The panel is the one from the landing page's call screen —
 * grouped, one row per voice, each auditionable in place — so an owner who
 * tried the demo meets a control they have already used.
 *
 * Every row auditions the *same sentence*, in its own voice and at the draft's
 * pace, so what is being compared is the voice and not the script.
 */

const ORDER = ['Nữ', 'Nam'] as const

export function VoicePicker({
  value,
  onChange,
  speed,
  sampleText,
}: {
  value: VoiceId
  onChange: (id: VoiceId) => void
  speed: SpeakingSpeed
  sampleText: string
}) {
  const ids = Object.keys(LABELS.voices) as VoiceId[]
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<VoiceId>(value)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = LABELS.voices[value]

  useEffect(() => {
    if (!open) return
    setActive(value)
    const onDown = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, value])

  // Keeps the highlighted row visible while the arrow keys walk the list.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const move = (step: number) => {
    const i = ids.indexOf(active)
    setActive(ids[(i + step + ids.length) % ids.length])
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange(active)
      setOpen(false)
    }
  }

  return (
    <div className={styles.anchor} ref={anchorRef}>
      <ControlShell open={open}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={styles.triggerText}>
            <span className={styles.triggerName}>{selected.name}</span>
            <span className={styles.optDesc}>
              {selected.desc}, {selected.tone}
            </span>
          </span>
          <span className={`${styles.triggerChev} ${open ? styles.triggerOpen : ''}`}>
            <Icon name="chevron-down" size={18} />
          </span>
        </button>
      </ControlShell>

      {open ? (
        <div className={styles.popup} role="listbox" aria-label="Giọng của lễ tân" ref={listRef}>
          {ORDER.map((gender) => {
            const group = ids.filter((id) => LABELS.voices[id].gender === gender)
            if (!group.length) return null
            return (
              <div key={gender}>
                <div className={styles.popGroup}>Giọng {gender.toLowerCase()}</div>
                {group.map((id) => {
                  const v = LABELS.voices[id]
                  const on = id === value
                  return (
                    <div
                      key={id}
                      role="option"
                      aria-selected={on}
                      data-active={id === active}
                      className={`${styles.opt} ${on ? styles.optOn : ''} ${id === active && !on ? styles.optActive : ''}`}
                      onClick={() => {
                        onChange(id)
                        setOpen(false)
                      }}
                      onMouseEnter={() => setActive(id)}
                    >
                      <span className={styles.optMark}>{on ? <Icon name="check" size={15} /> : null}</span>
                      <span className={styles.optText}>
                        <span className={styles.optName}>{v.name}</span>
                        <span className={styles.optDesc}>
                          {v.desc}, {v.tone}
                        </span>
                      </span>
                      {/* Auditions the voice without choosing it. */}
                      <span onClick={(e) => e.stopPropagation()}>
                        <PlayButton text={sampleText} label={`Nghe thử giọng ${v.name}`} voice={id} speed={speed} />
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
