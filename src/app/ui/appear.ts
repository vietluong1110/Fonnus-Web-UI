import { useLayoutEffect, useRef } from 'react'

/** `--duration-base` and `--ease-arc`, as the Web Animations API wants them. */
const MS = 200
const EASE = 'cubic-bezier(.2,.7,.3,1)'

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The gap the parent still reserves for a row that is collapsing. Without it
 * the list holds a row-gap's worth of space for the whole animation and then
 * closes it in one frame at the end — the jump the animation was there to
 * remove, moved to the last frame.
 *
 * The gap sits after every child but the last, where it sits before instead.
 */
function gapAround(el: HTMLElement): { top: number; bottom: number } {
  const parent = el.parentElement
  if (!parent) return { top: 0, bottom: 0 }
  const gap = parseFloat(getComputedStyle(parent).rowGap)
  if (!Number.isFinite(gap) || gap <= 0) return { top: 0, bottom: 0 }
  if (el.nextElementSibling) return { top: 0, bottom: gap }
  return { top: el.previousElementSibling ? gap : 0, bottom: 0 }
}

/**
 * Run `after` when the animation ends, however it ends — and run it even if
 * it never does.
 *
 * `finish` does not fire while the document timeline is stopped: a hidden or
 * throttled tab, a window the compositor has parked. An entrance that never
 * finishes would leave the row clipped and eat the focus ring off the pills
 * inside it; an exit that never finishes would leave the delete unapplied,
 * with the row sitting there collapsed to nothing. So the events are the fast
 * path and the timer is the floor. Whichever comes first wins, once.
 */
function whenDone(anim: Animation, after: () => void) {
  let ran = false
  const once = () => {
    if (ran) return
    ran = true
    window.clearTimeout(timer)
    after()
  }
  const timer = window.setTimeout(once, MS + 300)
  anim.addEventListener('finish', once)
  anim.addEventListener('cancel', once)
}

/**
 * One lift-and-settle between "not there" and the height the row actually
 * has. Everything that contributes to that height goes with it — padding,
 * borders, and the parent's gap — or the row would still occupy a couple of
 * dozen pixels at the shut end and the motion would start halfway.
 */
function play(el: HTMLElement, dir: 'in' | 'out'): Animation {
  const cs = getComputedStyle(el)
  const gap = gapAround(el)
  const open: Keyframe = {
    height: `${el.getBoundingClientRect().height}px`,
    paddingTop: cs.paddingTop,
    paddingBottom: cs.paddingBottom,
    borderTopWidth: cs.borderTopWidth,
    borderBottomWidth: cs.borderBottomWidth,
    marginTop: cs.marginTop,
    marginBottom: cs.marginBottom,
    opacity: '1',
  }
  const shut: Keyframe = {
    height: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    marginTop: `${parseFloat(cs.marginTop) - gap.top}px`,
    marginBottom: `${parseFloat(cs.marginBottom) - gap.bottom}px`,
    opacity: '0',
  }

  // Clipping only while it moves. A row that stays clipped would cut the
  // outset focus ring off the pills inside it — the same rule the row editor
  // and the group fold already follow.
  const held = el.style.overflow
  el.style.overflow = 'hidden'

  const anim = el.animate(dir === 'in' ? [shut, open] : [open, shut], {
    duration: MS,
    easing: EASE,
    // A row on its way out has to stay shut until React unmounts it.
    fill: dir === 'out' ? 'forwards' : 'none',
  })
  if (dir === 'in') {
    whenDone(anim, () => {
      el.style.overflow = held
    })
  }
  return anim
}

/**
 * The house motion for a list that gains and loses rows.
 *
 * Every list in the app grows the same way: the new row grows into its place
 * instead of appearing under the cursor, and the rows below slide down with
 * it rather than jumping. Deleting runs the same 200ms backwards. One idiom,
 * so a combo, a doctor, a holiday and a price row all behave alike.
 *
 * It animates the row element **itself**, not a wrapper. A wrapper is the
 * usual way to reach a natural height without measuring it — `0fr` to `1fr`
 * on a grid — but the price list draws the rule between two rows with
 * `.svc + .svc::before`, and a div between them would put a hairline under
 * every open, unfilled and dragging row in three lists. Measuring costs one
 * layout read per row that moves and leaves the markup alone, so it is the
 * one that generalises.
 *
 * Entrances find themselves: any id that was not in the list last commit
 * plays. Exits cannot — by the time an effect could see the row it is
 * already unmounted — so a delete is routed through `leave`, which collapses
 * the row first and applies the change after it. The 200ms is spent watching
 * the row go, and the save bar is a beat behind rather than ahead.
 *
 * ```tsx
 * const rows = useAppear(draft.branch_list.map((b) => b.id))
 * // …
 * <div ref={rows.ref(b.id)} className={styles.entry}>
 *   <IconButton name="trash" onClick={() => rows.leave(b.id, () => set('branch_list', without(b.id)))} />
 * ```
 *
 * The first commit is the list *arriving*, not rows appearing in it, so
 * nothing plays on mount or when a page is navigated to. Under
 * `prefers-reduced-motion` every row simply appears and every delete is
 * immediate.
 */
export function useAppear(ids: readonly string[]) {
  const els = useRef(new Map<string, HTMLElement>())
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>())
  const seen = useRef<Set<string> | null>(null)
  const going = useRef(new Set<string>())

  useLayoutEffect(() => {
    const before = seen.current
    seen.current = new Set(ids)
    // Ref callbacks for rows that have gone would otherwise be kept for the
    // life of the page.
    for (const id of refs.current.keys()) if (!seen.current.has(id)) refs.current.delete(id)
    if (!before || still()) return
    for (const id of ids) {
      if (before.has(id)) continue
      const el = els.current.get(id)
      if (el) play(el, 'in')
    }
  })

  return {
    /** Put on the row's outermost element. Stable per id, so React does not re-attach it every render. */
    ref(id: string) {
      let fn = refs.current.get(id)
      if (!fn) {
        fn = (el: HTMLElement | null) => {
          if (el) els.current.set(id, el)
          else els.current.delete(id)
        }
        refs.current.set(id, fn)
      }
      return fn
    },
    /** Collapse the row, then apply the removal. A second press while it is going is ignored. */
    leave(id: string, remove: () => void) {
      if (going.current.has(id)) return
      const el = els.current.get(id)
      if (!el || still()) {
        remove()
        return
      }
      going.current.add(id)
      whenDone(play(el, 'out'), () => {
        going.current.delete(id)
        remove()
      })
    },
  }
}
