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
import type { TenantApi, TenantConfigEnvelope } from './contracts'
import { ApiError } from './errors'
import { delay, maybeFail, storage } from './mock-support'

const CONFIG_KEY = 'fonnus.letan.config.v2'
const MAX_BYTES = 20 * 1024 * 1024

let version = 1

function load(): ReceptionistConfig {
  const raw = storage.read(CONFIG_KEY)
  if (!raw) return DEFAULT_CONFIG
  try {
    const saved = JSON.parse(raw) as Partial<ReceptionistConfig>
    // Merge over the defaults so a field added since this record was saved
    // still gets its default rather than arriving undefined.
    return { ...DEFAULT_CONFIG, ...saved }
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
