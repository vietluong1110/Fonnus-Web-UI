import { useLayoutEffect } from 'react'

/** Attribute on <html> that switches the hidden state in global.css on. */
const ARMED = 'data-reveal-armed'

/**
 * Sections lift and settle as they scroll into view — the one motion idiom the
 * brand allows.
 *
 * Two things matter here and both used to be wrong:
 *
 * 1. The hidden state is declared in CSS and only *armed* from here, inside a
 *    layout effect, so it is in place before the browser's first paint. The old
 *    version wrote `opacity: 0` from a passive effect after paint, which is
 *    what made the hero flash in and back out on load.
 *
 * 2. Each block waits for its own trigger and nothing else reveals it. The old
 *    version had a 4s watchdog that revealed the entire page whether or not it
 *    had been scrolled to — so after four seconds on the hero, every section
 *    below was already settled and there was no animation left to see.
 *
 * Elements opt in with `data-reveal="<order>"`, the order being a stagger index
 * within its group. `data-reveal-from="left|right"` brings it in from that edge
 * instead of lifting it; global.css limits that to wide viewports.
 */
export function useReveal(enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) return

    const root = document.documentElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const reveal = (el: Element) => (el as HTMLElement).setAttribute('data-revealed', '')

    // Nothing to arm: leave every block rendered settled.
    if (reduce || !els.length || !('IntersectionObserver' in window)) return

    root.setAttribute(ARMED, '')

    const stagger = getComputedStyle(root).getPropertyValue('--reveal-stagger').trim() || '110ms'
    const step = parseFloat(stagger) || 110
    els.forEach((el) => {
      const order = Number(el.getAttribute('data-reveal')) || 0
      if (order) el.style.setProperty('--reveal-delay', `${order * step}ms`)
    })

    /*
     * The margins make one rule out of two requirements. The bottom inset is
     * the point of the effect: a block has to be properly inside the viewport,
     * not merely touching its lower edge, before it starts — with the trigger
     * on the edge the arc was over before the block had scrolled far enough to
     * look at. The very tall top margin covers the other half: it counts
     * anything already above the viewport as intersecting, so a block jumped
     * clean over — an anchor link, a flung scroll, a restored scroll position —
     * is revealed rather than left invisible with its one chance gone.
     */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          reveal(entry.target)
          io.unobserve(entry.target)
        })
      },
      { rootMargin: '200000px 0px -16% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))

    // A print job has no scroll to trigger on, so hand it the settled page.
    const revealAll = () => els.forEach(reveal)
    window.addEventListener('beforeprint', revealAll)

    /*
     * Disarming is enough to undo this: without the attribute the hidden state
     * in global.css stops matching and every block renders settled. Blocks that
     * already revealed keep their marker, so nothing blinks on the way out.
     */
    return () => {
      io.disconnect()
      window.removeEventListener('beforeprint', revealAll)
      root.removeAttribute(ARMED)
    }
  }, [enabled])
}
