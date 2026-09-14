import type { LeadsApi } from './contracts'
import { delay, maybeFail } from './mock-support'

/** The landing-page contact form and the hotline report request, going nowhere. */
export const leadsMock: LeadsApi = {
  async submit(_input, opts) {
    await delay(1.4, opts?.signal)
    maybeFail()
  },

  async requestHotlineReport(_input, opts) {
    await delay(1.4, opts?.signal)
    maybeFail()
  },
}
