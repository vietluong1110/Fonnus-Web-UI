import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * There is exactly one orb on the page. It is a `position: fixed` element that
 * this hook drives with a transform, so it can travel between four places
 * without ever being re-mounted (which would restart its canvas animation):
 *
 *   hidden  — above the "Nghe thử" section: invisible, not clickable
 *   docked  — parked in the section's right-hand column, at the dock's size
 *   pinned  — 84px, bottom-right, after the section has scrolled past
 *   call    — filling the demo overlay's centre slot
 *
 * Rules the transitions follow, from the design review:
 *   · hidden ↔ anything is a fade with no flight — scrolling down from the hero
 *     must not look like the orb slides up from below.
 *   · pinned ↔ docked is a real flight, and it must land exactly on the dock,
 *     once. Layout settles late (fonts, images), so after every mode change we
 *     re-measure at 600ms and keep re-targeting for 560ms while the flight is
 *     in the air, instead of snapping after it lands.
 */
const ORB_BASE = 280
const ORB_EASE = 'cubic-bezier(.2,.7,.3,1)'
const PINNED_SIZE = 84
/** Re-measure passes that catch late layout shifts after mount. */
const SETTLE_PASSES_MS = [60, 300, 800, 1600, 3200]

type OrbMode = 'hidden' | 'docked' | 'pinned' | 'call'

export interface OrbPlacement {
  orbRef: RefObject<HTMLButtonElement | null>
  labelRef: RefObject<HTMLSpanElement | null>
  ring1Ref: RefObject<HTMLSpanElement | null>
  ring2Ref: RefObject<HTMLSpanElement | null>
  /** Placeholder in the "Nghe thử" section that defines the docked position. */
  dockRef: RefObject<HTMLDivElement | null>
  /** Placeholder in the call overlay that defines the call position. */
  callSpotRef: RefObject<HTMLDivElement | null>
  refresh: (force?: boolean) => void
}

export function useOrbPlacement(overlayOpen: boolean): OrbPlacement {
  const orbRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const ring1Ref = useRef<HTMLSpanElement>(null)
  const ring2Ref = useRef<HTMLSpanElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const callSpotRef = useRef<HTMLDivElement>(null)

  const modeRef = useRef<OrbMode | null>(null)
  const movedAtRef = useRef(0)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const overlayRef = useRef(overlayOpen)
  overlayRef.current = overlayOpen

  const refresh = useCallback((force = false) => {
    const orb = orbRef.current
    const dock = dockRef.current
    if (!orb || !dock) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    let mode: OrbMode
    let x: number
    let y: number
    let s: number

    if (overlayRef.current) {
      mode = 'call'
      const spot = callSpotRef.current
      if (spot) {
        const r = spot.getBoundingClientRect()
        x = r.left
        y = r.top
        s = r.width / ORB_BASE
      } else {
        const size = Math.min(320, Math.max(200, vh * 0.32))
        s = size / ORB_BASE
        x = (vw - size) / 2
        y = vh * 0.44 - size / 2
      }
    } else {
      const r = dock.getBoundingClientRect()
      if (r.bottom < 120) {
        mode = 'pinned'
        s = PINNED_SIZE / ORB_BASE
        x = vw - PINNED_SIZE - 24
        y = vh - PINNED_SIZE - 28
      } else if (r.top > vh) {
        mode = 'hidden'
        s = r.width / ORB_BASE
        x = r.left
        y = r.top
      } else {
        mode = 'docked'
        s = r.width / ORB_BASE
        x = r.left
        y = r.top
      }
    }

    const prev = modeRef.current
    const changed = mode !== prev
    // While docked the orb tracks the dock every frame; other modes are static.
    if (!changed && mode !== 'docked' && !force) return

    const instantJump =
      changed && (!prev || mode === 'hidden' || prev === 'hidden') && mode !== 'call' && prev !== 'call'
    const settling = !changed && mode === 'docked' && Date.now() - movedAtRef.current < 560

    orb.style.transition = instantJump
      ? `opacity 360ms ${ORB_EASE}`
      : changed || mode !== 'docked' || settling
        ? `transform 520ms ${ORB_EASE}, opacity 360ms ${ORB_EASE}`
        : 'none'
    orb.style.transform = `translate(${x}px,${y}px) scale(${s})`
    orb.style.opacity = mode === 'hidden' ? '0' : '1'
    orb.style.pointerEvents = mode === 'hidden' || mode === 'call' ? 'none' : 'auto'
    orb.style.zIndex = mode === 'call' ? '70' : '30'

    if (labelRef.current) labelRef.current.style.opacity = mode === 'docked' ? '1' : '0'
    const ringVisibility = mode === 'call' ? 'visible' : 'hidden'
    if (ring1Ref.current) ring1Ref.current.style.visibility = ringVisibility
    if (ring2Ref.current) ring2Ref.current.style.visibility = ringVisibility

    if (changed) {
      movedAtRef.current = Date.now()
      clearTimeout(settleTimer.current)
      settleTimer.current = setTimeout(() => refresh(true), 600)
    }
    modeRef.current = mode
  }, [])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        refresh(false)
      })
    }
    const onResize = () => refresh(true)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const timers = SETTLE_PASSES_MS.map((t) => setTimeout(() => refresh(true), t))
    refresh(true)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      clearTimeout(settleTimer.current)
    }
  }, [refresh])

  // The overlay mounts its centre slot in the same commit that flips this flag;
  // re-measure once immediately and once after the fade has laid it out.
  useEffect(() => {
    const a = setTimeout(() => refresh(true), 30)
    const b = setTimeout(() => refresh(true), 260)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [overlayOpen, refresh])

  return { orbRef, labelRef, ring1Ref, ring2Ref, dockRef, callSpotRef, refresh }
}
