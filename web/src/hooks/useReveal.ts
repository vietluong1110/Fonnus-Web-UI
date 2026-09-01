import { useEffect } from 'react'

/**
 * Sections lift and settle as they enter the viewport — the one motion idiom
 * the brand allows. Driven by a rAF-throttled scroll pass rather than an
 * IntersectionObserver: the observer missed elements that were already in view
 * when async design-system components settled the layout.
 *
 * Elements opt in with `data-reveal="<order>"`; the order is a stagger index,
 * 90ms apart. `data-reveal-from="left|right"` slides it in from that side
 * instead of lifting it — used where a row's two halves should arrive from
 * their own edges. That only applies on wide viewports: in a stacked
 * single-column layout a sideways slide means nothing and pushes content past
 * the screen edge. A watchdog reveals everything after 4s no matter what, so a
 * missed pass can never leave the page blank.
 */
export function useReveal(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sideways = window.matchMedia('(min-width: 900px)').matches
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))

    els.forEach((el) => {
      const from = sideways ? el.getAttribute('data-reveal-from') : null
      const offset =
        from === 'left' ? 'translateX(-28px)' : from === 'right' ? 'translateX(28px)' : 'translateY(18px)'
      el.style.opacity = '0'
      if (!reduce) el.style.transform = offset
      el.style.transition =
        'opacity 520ms cubic-bezier(.2,.7,.3,1), transform 520ms cubic-bezier(.2,.7,.3,1)'
      el.style.willChange = 'opacity, transform'
    })

    const shown = new WeakSet<HTMLElement>()
    const timers: ReturnType<typeof setTimeout>[] = []

    const show = (el: HTMLElement, immediate = false) => {
      if (shown.has(el)) return
      shown.add(el)
      const delay = immediate ? 0 : (Number(el.getAttribute('data-reveal')) || 0) * 90
      timers.push(
        setTimeout(() => {
          el.style.opacity = '1'
          el.style.transform = 'none'
          el.style.willChange = 'auto'
        }, delay),
      )
    }

    const pass = () => {
      const limit = window.innerHeight * 0.92
      els.forEach((el) => {
        if (el.getBoundingClientRect().top < limit) show(el)
      })
    }

    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        pass()
      })
    }

    const revealAll = () => els.forEach((el) => show(el, true))

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('beforeprint', revealAll)
    pass()
    const watchdog = setTimeout(revealAll, 4000)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('beforeprint', revealAll)
      cancelAnimationFrame(raf)
      clearTimeout(watchdog)
      timers.forEach(clearTimeout)
    }
  }, [enabled])
}
