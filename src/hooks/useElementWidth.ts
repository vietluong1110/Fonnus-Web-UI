import { useLayoutEffect, useState } from 'react'

/**
 * The rendered width of one element, kept current as it resizes.
 *
 * For the places where a viewport query is the wrong question: a list inside
 * the form column is narrow on a 1200px desktop (a 380px rail beside it) and
 * wide on an 860px tablet (the rail stacked above), so what it can afford
 * depends on the column, not the window. CSS answers the same question with a
 * container query; this is the JS half, for the parts of the row that are
 * *text* — a date's reading — which a stylesheet cannot change.
 *
 * Returns a callback ref so a conditionally rendered element is picked up the
 * moment it mounts, and the first measurement lands before paint.
 */
export function useElementWidth(): [(el: HTMLElement | null) => void, number] {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w !== undefined) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])

  return [setEl, width]
}
