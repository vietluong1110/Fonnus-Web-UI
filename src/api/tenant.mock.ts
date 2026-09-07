/**
 * The tenant record, faked in the browser.
 *
 * localStorage is the mock's database — it is what makes an owner's edits
 * survive a reload during a demo. **In live mode nothing here runs**, and the
 * store never reads localStorage at all: a mirror that outlives the server's
 * truth is a stale cache, and the owner would see yesterday's price list with
 * no way to tell.
 *
 * The key is `.v2` because v1 held client-generated row ids that a
 * server-backed record will not.
 */
import { DEFAULT_CONFIG } from '../app/letan/defaults'
import type { IndustryVertical, KnowledgeFile, ReceptionistConfig } from '../app/letan/model'
import { CATALOGUE_VERSION, newId } from '../app/letan/model'
import type { EscalationTarget, EscalationWindow } from '../app/letan/model'
import { EMERGENCY_TRIGGER, TRANSFER_TRIGGERS } from '../app/letan/system'
import type { TenantApi, TenantConfigEnvelope } from './contracts'
import { ApiError } from './errors'
import { delay, maybeFail, storage } from './mock-support'

const CONFIG_KEY = 'fonnus.letan.config.v2'
const MAX_BYTES = 20 * 1024 * 1024

let version = 1

/**
 * A record saved before a field changed *shape*.
 *
 * The merge below covers a key that did not exist yet; it cannot cover one
 * whose contents moved. Two did:
 *
 *   - an escalation target grew a role, its own hours, its own triggers and a
 *     fallback when `Chuyển máy` became one row per person. A row saved
 *     without them reaches the page as `.triggers.includes()` on `undefined`.
 *     The page-level window and the separate on-call doctor moved onto rows,
 *     so both are carried across rather than dropped.
 *   - `keyterms` no longer holds rows the owner cannot see: the industry pack
 *     belongs to the recogniser, and a word derived from another page is now
 *     simply a word. Anything already spelled becomes an ordinary row the
 *     owner can rename.
 */
function migrate(saved: Partial<ReceptionistConfig> & { escalation_window?: EscalationWindow }): Partial<ReceptionistConfig> {
  const hours = saved.escalation_window ?? 'always'
  const targets: EscalationTarget[] = (saved.escalation_targets ?? []).map((row) => {
    // Typed as whole because that is what it is *now*; on disk it may predate
    // any of the four fields below.
    const t = row as Partial<EscalationTarget> & Pick<EscalationTarget, 'id' | 'phone' | 'name'>
    return {
      id: t.id,
      phone: t.phone,
      name: t.name,
      role: t.role ?? '',
      window: t.window ?? hours,
      triggers: t.triggers ?? [TRANSFER_TRIGGERS[0]],
      fallback: t.fallback ?? 'callback',
    }
  })
  const doctor = saved.after_hours_emergency_target
  if (doctor?.phone.trim() && !targets.some((t) => t.triggers.includes(EMERGENCY_TRIGGER))) {
    targets.push({
      id: newId('esc'),
      phone: doctor.phone,
      name: doctor.name,
      role: 'Bác sĩ trực',
      window: 'after_hours',
      triggers: [EMERGENCY_TRIGGER],
      fallback: 'callback',
    })
  }
  return {
    ...saved,
    ...(saved.escalation_targets ? { escalation_targets: targets } : {}),
    ...(saved.keyterms ? { keyterms: saved.keyterms.filter((k) => k.source !== 'pack').map((k) => ({ ...k, source: 'tenant' as const })) } : {}),
  }
}

function load(): ReceptionistConfig {
  const raw = storage.read(CONFIG_KEY)
  if (!raw) return DEFAULT_CONFIG
  try {
    const saved = JSON.parse(raw) as Partial<ReceptionistConfig>
    // Merge over the defaults so a field added since this record was saved
    // still gets its default rather than arriving undefined.
    return { ...DEFAULT_CONFIG, ...migrate(saved) }
  } catch {
    return DEFAULT_CONFIG
  }
}

function persist(config: ReceptionistConfig): TenantConfigEnvelope {
  storage.write(CONFIG_KEY, JSON.stringify(config))
  version += 1
  return { config, version: String(version), catalogue_version: CATALOGUE_VERSION }
}

/** Called on sign-out: one owner's record must not greet the next one. */
export function clearMockTenantData(): void {
  storage.remove(CONFIG_KEY)
}

export const tenantMock: TenantApi = {
  async getConfig(opts) {
    await delay(1, opts?.signal)
    maybeFail()
    return { config: load(), version: String(version), catalogue_version: CATALOGUE_VERSION }
  },

  async patchConfig(patch, opts) {
    await delay(1, opts?.signal)
    maybeFail()
    return persist({ ...load(), ...patch })
  },

  async resetToTemplate(_vertical: IndustryVertical, opts) {
    await delay(1, opts?.signal)
    maybeFail()
    return persist(DEFAULT_CONFIG)
  },

  async uploadKnowledgeFile(file, opts) {
    if (file.size > MAX_BYTES) {
      throw new ApiError({ kind: 'validation', status: 422, code: 'file_too_large' })
    }
    // Fake a progress ramp so the upload UI has something to render.
    for (let step = 1; step <= 4; step += 1) {
      await delay(0.4, opts?.signal)
      opts?.onProgress?.(step / 4)
    }
    maybeFail()
    // Nothing is read: there is no extraction service behind this yet.
    const stored: KnowledgeFile = { id: newId('file'), name: file.name, size: file.size, status: 'queued' }
    return stored
  },

  async deleteKnowledgeFile(_id, opts) {
    await delay(0.7, opts?.signal)
    maybeFail()
  },
}
