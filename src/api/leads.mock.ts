import type { LeadsApi } from './contracts'
import { delay, maybeFail } from './mock-support'

/** The landing-page contact form, going nowhere. */
export const leadsMock: LeadsApi = {
  async submit(_input, opts) {
    await delay(1.4, opts?.signal)
    maybeFail()
  },
}
