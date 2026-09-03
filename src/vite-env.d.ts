/// <reference types="vite/client" />

/**
 * Typed environment. Without this, `import.meta.env.VITE_API_MODE` is `any` and
 * a typo in a variable name is silent.
 *
 * Every value here is inlined into the built JavaScript, so none of it is
 * secret. See `.env.example` for what each one does.
 */
interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'live'
  /** Comma-separated group names forced live while VITE_API_MODE is `mock`. */
  readonly VITE_API_LIVE_GROUPS?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MOCK_LATENCY_MS?: string
  readonly VITE_MOCK_FAILURE_RATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
