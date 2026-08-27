import { useEffect, useState } from 'react'

/**
 * Below this width the seven-item nav can no longer sit on one row without
 * shrinking, so the header swaps to a drawer instead of quietly dropping links.
 */
export const NARROW_BREAKPOINT = 1060

export function useIsNarrow(breakpoint = NARROW_BREAKPOINT) {
  const [narrow, setNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < breakpoint,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])

  return narrow
}
