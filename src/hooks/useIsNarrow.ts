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

/**
 * Below this width the app shell swaps its side rail for a bottom tab bar and
 * the setup assistant collapses to a prompt card. Phone, not tablet: a 768px
 * iPad still has room for the rail beside the content.
 *
 * CSS matches this as `@media (max-width: 639.98px)` — the hook is a strict
 * `<`, so the two would disagree at exactly 640px otherwise.
 */
export const PHONE_BREAKPOINT = 640

/**
 * Below this width a section page's preview rail stacks above the form, and
 * the setup assistant loses the rail column it docks in — it floats instead,
 * and gives way to a button when the save bar comes up. CSS matches this as
 * `@media (max-width: 1180.98px)`, for the same reason as the phone query.
 */
export const RAIL_BREAKPOINT = 1181
