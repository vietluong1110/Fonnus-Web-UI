import { useEffect, useState } from 'react'

/**
 * Hash routes rather than a router dependency. Hash routing (not pushState) is
 * deliberate: the build ships with `base: './'` and the README promises
 * `dist/` drops on any host — history routes would need an SPA fallback rule
 * on every one of them.
 *
 * Section anchors (`#bang-gia`, `#lien-he`, …) still work: only hashes that
 * start with `#/` are read as routes, everything else is the landing page.
 * That cuts both ways: on any other page an in-page anchor would *leave* it,
 * so those pages scroll with JS rather than with an href.
 *
 * The app shell lives under `#/app/...`; `useAppPath` reads the part after it.
 */
export type Route = 'landing' | 'signup' | 'signin' | 'hotline' | 'app'

const PATHS: Record<Exclude<Route, 'landing'>, string> = {
  signup: '#/dang-ky',
  signin: '#/dang-nhap',
  hotline: '#/cham-diem-hotline',
  app: '#/app',
}

function read(): Route {
  const hash = window.location.hash
  if (hash.startsWith(PATHS.signup)) return 'signup'
  if (hash.startsWith(PATHS.signin)) return 'signin'
  if (hash.startsWith(PATHS.hotline)) return 'hotline'
  if (hash.startsWith(PATHS.app)) return 'app'
  return 'landing'
}

function useHash(): string {
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash))
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export function useRoute(): Route {
  const hash = useHash()
  return typeof window === 'undefined' ? 'landing' : read() ?? hash
}

/**
 * The path inside the app shell, split on `/`, without the `app` prefix.
 * `#/app/le-tan/kien-thuc/dich-vu` → `['le-tan', 'kien-thuc', 'dich-vu']`.
 */
export function useAppPath(): string[] {
  const hash = useHash()
  return parseAppPath(hash)
}

export function parseAppPath(hash: string): string[] {
  const rest = hash.startsWith(PATHS.app) ? hash.slice(PATHS.app.length) : ''
  return rest.split('/').filter(Boolean)
}

/** Href for an anchor — keeps middle-click and "open in new tab" working. */
export function hrefFor(route: Route): string {
  return route === 'landing' ? '#' : PATHS[route]
}

/** Href for a page inside the app shell: `appHref('le-tan', 'kien-thuc')`. */
export function appHref(...segments: string[]): string {
  return segments.length ? `${PATHS.app}/${segments.join('/')}` : PATHS.app
}

export function navigate(route: Route) {
  window.location.hash = route === 'landing' ? '' : PATHS[route]
  // A hash swap keeps the old scroll offset, which lands the auth page
  // mid-screen when you leave the landing page from the pricing section.
  window.scrollTo(0, 0)
}

export function navigateApp(...segments: string[]) {
  window.location.hash = appHref(...segments)
  window.scrollTo(0, 0)
}
