import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_CONFIG } from './defaults'
import type { ConfigKey, ReceptionistConfig } from './model'
import { useToast } from '../ui/Toast'

/*
 * One tenant record for the whole Lễ tân tab.
 *
 * The record is kept in React state and mirrored to localStorage so an owner's
 * edits survive a reload during the demo. Every write goes through
 * `saveSection`, which is the seam for the backend: one PATCH per section,
 * carrying only the catalogue keys that section owns.
 *
 * TODO: GET /tenant/config on mount (replace `load`), PATCH /tenant/config
 * in `saveSection`. Keep the optimistic update; roll back on a failed PATCH.
 */

const STORAGE_KEY = 'fonnus.letan.config.v1'

function load(): ReceptionistConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const saved = JSON.parse(raw) as Partial<ReceptionistConfig>
    // Merge so that a field added after the record was first saved gets its default.
    return { ...DEFAULT_CONFIG, ...saved }
  } catch {
    return DEFAULT_CONFIG
  }
}

function persist(config: ReceptionistConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* private mode — edits live for the session only */
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface ConfigStore {
  config: ReceptionistConfig
  /** Immediate, local write — used by the question rail and toggles that save themselves. */
  update: (patch: Partial<ReceptionistConfig>) => void
  /** The backend seam. Resolves once the section is persisted. */
  saveSection: (patch: Partial<ReceptionistConfig>) => Promise<void>
  /** Back to the vertical template. */
  reset: () => void
}

const ConfigContext = createContext<ConfigStore | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ReceptionistConfig>(() => (typeof window === 'undefined' ? DEFAULT_CONFIG : load()))

  useEffect(() => {
    persist(config)
  }, [config])

  const update = useCallback((patch: Partial<ReceptionistConfig>) => {
    setConfig((c) => ({ ...c, ...patch }))
  }, [])

  const saveSection = useCallback(async (patch: Partial<ReceptionistConfig>) => {
    // TODO: await api.patch('/tenant/config', patch)
    await delay(450)
    setConfig((c) => ({ ...c, ...patch }))
  }, [])

  const reset = useCallback(() => setConfig(DEFAULT_CONFIG), [])

  const value = useMemo(() => ({ config, update, saveSection, reset }), [config, update, saveSection, reset])

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): ConfigStore {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used inside ConfigProvider')
  return ctx
}

function pick<K extends ConfigKey>(config: ReceptionistConfig, keys: readonly K[]): Pick<ReceptionistConfig, K> {
  const out = {} as Pick<ReceptionistConfig, K>
  for (const k of keys) out[k] = config[k]
  return out
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export interface Draft<K extends ConfigKey> {
  draft: Pick<ReceptionistConfig, K>
  set: <P extends K>(key: P, value: ReceptionistConfig[P]) => void
  patch: (partial: Partial<Pick<ReceptionistConfig, K>>) => void
  dirty: boolean
  saving: boolean
  /** Persists the draft; `extra` is merged in first, for flags a save itself sets (e.g. "confirmed"). */
  save: (extra?: Partial<Pick<ReceptionistConfig, K>>) => Promise<void>
  cancel: () => void
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
    setDraft((d) => ({ ...d, [key]: value }))
  }, [])

  const patch = useCallback((partial: Partial<Pick<ReceptionistConfig, K>>) => {
    setDraft((d) => ({ ...d, ...partial }))
  }, [])

  const save = useCallback(
    async (extra?: Partial<Pick<ReceptionistConfig, K>>) => {
      const next = extra ? { ...draft, ...extra } : draft
      if (extra) setDraft(next)
      setSaving(true)
      await saveSection(next)
      setSaving(false)
      toast(`Đã lưu ${label}.`)
    },
    [draft, label, saveSection, toast],
  )

  const cancel = useCallback(() => setDraft(base.current), [])

  return { draft, set, patch, dirty, saving, save, cancel }
}
