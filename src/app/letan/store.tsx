import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api, isCanceled, messageFor } from '../../api'
import type { ApiError } from '../../api'
import { DEFAULT_CONFIG } from './defaults'
import { CATALOGUE_VERSION } from './model'
import type { ConfigKey, ReceptionistConfig } from './model'
import { useToast } from '../ui/Toast'

/*
 * One tenant record for the whole Lễ tân tab.
 *
 * Every read and write goes through `api.tenant` — the mock keeps it in
 * localStorage so a demo survives a reload, the live implementation talks to
 * GET/PATCH /tenant/config. Nothing in this file knows which one it got, and
 * no storage key appears here on purpose: a localStorage mirror that outlives
 * the server's truth is a stale cache, and the owner would see yesterday's
 * price list with no way to tell.
 *
 * Sections edit a draft (`useDraft`) and commit through `saveSection`, which is
 * one PATCH per section carrying only that section's catalogue keys.
 */

/** `config` is never null — see the note on the gate below. */
export type ConfigStatus = 'loading' | 'ready' | 'error'

interface ConfigStore {
  /**
   * Always a whole record. `DEFAULT_CONFIG` until the load lands.
   *
   * Keeping it non-nullable is deliberate: `readiness.ts`, `questions.ts`,
   * `AppShell` and all fifteen sections index straight into it, and making it
   * nullable would scatter a hundred null checks to save two. Instead exactly
   * two places branch on `status` — `LeTanPage` and the sidebar's readiness dot.
   */
  config: ReceptionistConfig
  status: ConfigStatus
  /** Set when the initial load failed. Section save failures live on the draft. */
  loadError: ApiError | null
  reload: () => void
  /** Immediate, local write — the question rail and toggles that save themselves. */
  update: (patch: Partial<ReceptionistConfig>) => void
  /**
   * One PATCH per section. Optimistic, rolls back and rejects on failure.
   *
   * Resolves with the record the server actually stored. Returned rather than
   * read back off the store, because a `setState` dispatched inside this call
   * has not necessarily re-rendered by the time the caller's `await` resumes —
   * reading the ref there would hand back the pre-save value.
   */
  saveSection: (patch: Partial<ReceptionistConfig>) => Promise<ReceptionistConfig>
  /** Back to the vertical template. */
  reset: () => Promise<void>
}

const ConfigContext = createContext<ConfigStore | null>(null)

function pick<K extends ConfigKey>(config: ReceptionistConfig, keys: readonly K[]): Pick<ReceptionistConfig, K> {
  const out = {} as Pick<ReceptionistConfig, K>
  for (const k of keys) out[k] = config[k]
  return out
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ReceptionistConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState<ConfigStatus>('loading')
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [nonce, setNonce] = useState(0)

  // The optimistic-concurrency stamp, sent back on every write.
  const version = useRef<string | undefined>(undefined)
  // The current record, readable from a callback without making it a dependency.
  const latest = useRef(config)
  latest.current = config

  useEffect(() => {
    // StrictMode double-invokes this in development. Without the abort the two
    // loads race, and the loser's setState looks like a bug in our own code.
    const ac = new AbortController()

    setStatus('loading')
    api.tenant
      .getConfig({ signal: ac.signal })
      .then((envelope) => {
        if (ac.signal.aborted) return
        version.current = envelope.version
        setConfig(envelope.config)
        setLoadError(null)
        setStatus('ready')

        // The catalogue lives in the backend repo and will move without this one
        // noticing. A renamed field just stops saving — nothing errors. Make it loud.
        if (
          import.meta.env.DEV &&
          envelope.catalogue_version &&
          envelope.catalogue_version !== CATALOGUE_VERSION
        ) {
          console.warn(
            `[fonnus] Catalogue drift: the server is on ${envelope.catalogue_version}, ` +
              `model.ts is on ${CATALOGUE_VERSION}. See docs/field-catalogue-mapping.md.`,
          )
        }
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted || isCanceled(e)) return
        // Do NOT fall back to the template: an owner shown a stranger's dental
        // clinic will start editing it.
        setLoadError(e as ApiError)
        setStatus('error')
      })

    return () => ac.abort()
  }, [nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const update = useCallback((patch: Partial<ReceptionistConfig>) => {
    setConfig((c) => ({ ...c, ...patch }))
  }, [])

  const saveSection = useCallback(async (patch: Partial<ReceptionistConfig>) => {
    const keys = Object.keys(patch) as ConfigKey[]
    // Snapshot only the keys this save touches. Restoring the whole record on
    // failure would wipe a concurrent write from another section or the rail.
    const before = pick(latest.current, keys)

    setConfig((c) => ({ ...c, ...patch }))

    try {
      const envelope = await api.tenant.patchConfig(patch, { version: version.current })
      version.current = envelope.version
      // Adopt the server's truth: real row ids, any normalisation it applied.
      setConfig(envelope.config)
      return envelope.config
    } catch (e) {
      setConfig((c) => {
        const rolled: ReceptionistConfig = { ...c }
        // TS cannot see that `rolled[k]` and `before[k]` are the same key's type
        // when `k` ranges over a union, so the write goes through an index type.
        const write = rolled as Record<ConfigKey, unknown>
        for (const k of keys) {
          // Only roll back a key still holding exactly what we optimistically
          // wrote. If it changed, someone newer owns it — the question rail
          // answering while this PATCH was in flight — and their write wins.
          if (same(c[k], patch[k])) write[k] = before[k]
        }
        return rolled
      })
      throw e
    }
  }, [])

  const reset = useCallback(async () => {
    const envelope = await api.tenant.resetToTemplate(latest.current.industry_vertical)
    version.current = envelope.version
    setConfig(envelope.config)
  }, [])

  const value = useMemo(
    () => ({ config, status, loadError, reload, update, saveSection, reset }),
    [config, status, loadError, reload, update, saveSection, reset],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): ConfigStore {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used inside ConfigProvider')
  return ctx
}

export interface Draft<K extends ConfigKey> {
  draft: Pick<ReceptionistConfig, K>
  set: <P extends K>(key: P, value: ReceptionistConfig[P]) => void
  patch: (partial: Partial<Pick<ReceptionistConfig, K>>) => void
  dirty: boolean
  saving: boolean
  /** Vietnamese, ready to render. Cleared by the next edit or a successful save. */
  error: string | null
  /**
   * Persists the draft; `extra` is merged in first, for flags a save itself sets
   * (e.g. "confirmed").
   *
   * **Never rejects.** All fifteen call sites pass it straight to `onSave`, a
   * `() => void` handler — a rejecting promise there is an unhandled rejection
   * in the console and nothing at all on screen. Failures set `error`.
   */
  save: (extra?: Partial<Pick<ReceptionistConfig, K>>) => Promise<void>
  cancel: () => void
  /** Prebuilt props for `<SaveBar {...d.bar} />`. */
  bar: {
    dirty: boolean
    saving: boolean
    error: string | null
    onSave: () => void
    onCancel: () => void
  }
}

/**
 * A section's editable copy of its keys. Edits stay local until `save`, which
 * writes them through `saveSection` and toasts. `cancel` throws them away.
 *
 * If the store changes underneath (the question rail wrote a field), keys the
 * draft has not touched follow the store; keys it has touched keep the draft.
 */
export function useDraft<K extends ConfigKey>(keys: readonly K[], label: string): Draft<K> {
  const { config, saveSection } = useConfig()
  const { toast } = useToast()
  const [draft, setDraft] = useState(() => pick(config, keys))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const base = useRef(pick(config, keys))

  useEffect(() => {
    const next = pick(config, keys)
    setDraft((d) => {
      const merged = { ...d }
      for (const k of keys) {
        if (same(d[k], base.current[k])) merged[k] = next[k]
      }
      return merged
    })
    base.current = next
    // `keys` is a stable literal at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const dirty = useMemo(() => keys.some((k) => !same(draft[k], base.current[k])), [draft, keys])

  const set = useCallback(<P extends K>(key: P, value: ReceptionistConfig[P]) => {
    setError(null)
    setDraft((d) => ({ ...d, [key]: value }))
  }, [])

  const patch = useCallback((partial: Partial<Pick<ReceptionistConfig, K>>) => {
    setError(null)
    setDraft((d) => ({ ...d, ...partial }))
  }, [])

  const save = useCallback(
    async (extra?: Partial<Pick<ReceptionistConfig, K>>) => {
      const next = extra ? { ...draft, ...extra } : draft
      if (extra) setDraft(next)
      setSaving(true)
      setError(null)
      try {
        const stored = await saveSection(next)
        /*
         * Adopt what the store now holds, explicitly.
         *
         * Without this the reconcile effect above keeps the draft: it only
         * refreshes a key the draft has *not* touched, and after a save the
         * draft has touched every key it just sent. So a server-assigned row id
         * would never reach the form, the next save would re-send the client's
         * `newId()` strings, and — depending on the backend's array semantics —
         * create a second copy of every service.
         */
        const settled = pick(stored, keys)
        base.current = settled
        setDraft(settled)
        toast(`Đã lưu ${label}.`)
      } catch (e) {
        if (!isCanceled(e)) setError(messageFor(e))
      } finally {
        setSaving(false)
      }
      // `keys` is a stable literal at every call site.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [draft, label, saveSection, toast],
  )

  const cancel = useCallback(() => {
    setError(null)
    setDraft(base.current)
  }, [])

  const bar = useMemo(
    () => ({ dirty, saving, error, onSave: () => void save(), onCancel: cancel }),
    [dirty, saving, error, save, cancel],
  )

  return { draft, set, patch, dirty, saving, error, save, cancel, bar }
}
