/**
 * The API the app uses. Import `api` from here and nothing else.
 *
 * This is the only file that decides between a mock and a live implementation.
 * Both sides of every group are typed against the same interface in
 * `contracts.ts`, so `npm run typecheck` is what catches a live implementation
 * drifting from the mock it replaces.
 *
 * Switching one group at a time — `VITE_API_LIVE_GROUPS=tenant` — is deliberate:
 * the backend ships endpoints over weeks, and a single global switch would mean
 * the first real endpoint could not be tested until every other one existed.
 *
 * See docs/backend-integration.md.
 */
import { API_MODE, HAS_MOCKS, isLive } from './env'
import { API_GROUPS } from './contracts'
import type { FonnusApi } from './contracts'

import { authMock } from './auth.mock'
import { authLive } from './auth.live'
import { tenantMock } from './tenant.mock'
import { tenantLive } from './tenant.live'
import { assistantMock } from './assistant.mock'
import { assistantLive } from './assistant.live'
import { receptionistMock } from './receptionist.mock'
import { receptionistLive } from './receptionist.live'
import { voiceMock } from './voice.mock'
import { voiceLive } from './voice.live'
import { insightsMock } from './insights.mock'
import { insightsLive } from './insights.live'
import { callsMock } from './calls.mock'
import { callsLive } from './calls.live'
import { leadsMock } from './leads.mock'
import { leadsLive } from './leads.live'

export const api: FonnusApi = {
  auth: isLive('auth') ? authLive : authMock,
  tenant: isLive('tenant') ? tenantLive : tenantMock,
  assistant: isLive('assistant') ? assistantLive : assistantMock,
  receptionist: isLive('receptionist') ? receptionistLive : receptionistMock,
  voice: isLive('voice') ? voiceLive : voiceMock,
  insights: isLive('insights') ? insightsLive : insightsMock,
  calls: isLive('calls') ? callsLive : callsMock,
  leads: isLive('leads') ? leadsLive : leadsMock,
}

// A one-line reminder in the console, so nobody debugs a mock for an hour
// wondering why their breakpoint in the backend never hits.
if (import.meta.env.DEV && HAS_MOCKS) {
  const faked = API_GROUPS.filter((g) => !isLive(g))
  // eslint-disable-next-line no-console
  console.info(
    `[fonnus] API mode: ${API_MODE}. Faked in the browser: ${faked.join(', ')}. ` +
      'See .env.example to point a group at the real backend.',
  )
}

export { ApiError, isApiError, isCanceled, messageFor } from './errors'
export type { ApiErrorKind, FieldError } from './errors'
export { setUnauthorizedHandler } from './http'
export { isLive, API_MODE } from './env'
export { clearMockTenantData } from './tenant.mock'
export { attachmentKindOf } from './attachments'
export * from './contracts'
