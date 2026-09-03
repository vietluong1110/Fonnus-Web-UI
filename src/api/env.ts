/**
 * The only file in the app that reads `import.meta.env`, apart from the four
 * `BASE_URL` asset paths in the design system.
 *
 * Every value here is inlined into the built JavaScript by Vite, so none of it
 * is secret. See `.env.example` for what each variable does.
 */
import { API_GROUPS } from './contracts'
import type { ApiGroup } from './contracts'

const env = import.meta.env

/** `mock` (default) fakes everything in the browser; `live` makes real requests. */
export const API_MODE: 'mock' | 'live' = env.VITE_API_MODE === 'live' ? 'live' : 'mock'

export const API_BASE_URL: string = (env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/+$/, '')

/**
 * Groups forced live while the rest stay mocked.
 *
 * The backend will ship endpoints one at a time over weeks. A single global
 * switch would mean the first real endpoint cannot be tested until every other
 * one exists, so `VITE_API_LIVE_GROUPS=tenant` is the difference between
 * integrating incrementally and integrating in one terrifying step.
 */
const LIVE_GROUPS: ReadonlySet<ApiGroup> = new Set(
  (env.VITE_API_LIVE_GROUPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is ApiGroup => (API_GROUPS as readonly string[]).includes(s)),
)

export function isLive(group: ApiGroup): boolean {
  return API_MODE === 'live' || LIVE_GROUPS.has(group)
}

function num(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/** How long the mock pretends the network takes. Set to 0 for a snappy demo. */
export const MOCK_LATENCY_MS = Math.max(0, num(env.VITE_MOCK_LATENCY_MS, 450))

/**
 * Fraction of mock requests that fail, 0..1.
 *
 * Not decoration: the loading, rollback and retry paths cannot be reached in
 * mock mode any other way, so this is the only way to look at them before a
 * backend exists. Set it to 1 and walk the app.
 */
export const MOCK_FAILURE_RATE = Math.min(1, Math.max(0, num(env.VITE_MOCK_FAILURE_RATE, 0)))

/** True when at least one group is still faked — used for a dev-only badge and warnings. */
export const HAS_MOCKS: boolean = API_GROUPS.some((g) => !isLive(g))
