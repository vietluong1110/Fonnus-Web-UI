import { useEffect, useState } from 'react'

/**
 * The whole site is three pages, so it gets three hash routes rather than a
 * router dependency. Hash routing (not pushState) is deliberate: the build ships
 * with `base: './'` and the README promises `dist/` drops on any host — history
 * routes would need an SPA fallback rule on every one of them.
 *
 * Section anchors (`#bang-gia`, `#lien-he`, …) still work: only hashes that
 * start with `#/` are read as routes, everything else is the landing page.
 */
export type Route = 'landing' | 'signup' | 'signin'

const PATHS: Record<Exclude<Route, 'landing'>, string> = {
  signup: '#/dang-ky',
  signin: '#/dang-nhap',
}

function read(): Route {
  const hash = window.location.hash
  if (hash.startsWith(PATHS.signup)) return 'signup'
  if (hash.startsWith(PATHS.signin)) return 'signin'
  return 'landing'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? 'landing' : read(),
  )

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

/** Href for an anchor — keeps middle-click and "open in new tab" working. */
export function hrefFor(route: Route): string {
  return route === 'landing' ? '#' : PATHS[route]
}

export function navigate(route: Route) {
  window.location.hash = route === 'landing' ? '' : PATHS[route]
  // A hash swap keeps the old scroll offset, which lands the auth page
  // mid-screen when you leave the landing page from the pricing section.
  window.scrollTo(0, 0)
}
