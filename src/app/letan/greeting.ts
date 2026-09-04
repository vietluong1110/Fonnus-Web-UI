import type { IconName } from '../../design-system'
import { GREETING_COMPLIANCE_BLOCK } from './system'
import type { ReceptionistConfig } from './model'

/*
 * The first eight seconds of every call: the line the law requires, then the
 * clinic's own greeting — one all-day sentence, or one per daypart. Shared by
 * the Danh tính form, the try-out panel that opens every preview with it, and
 * the mock receptionist.
 */

export type Daypart = 'morning' | 'afternoon' | 'evening'

export const DAYPARTS: readonly [Daypart, string, IconName, string][] = [
  ['morning', 'Sáng · trước 12:00', 'sun', 'buổi sáng'],
  ['afternoon', 'Chiều · 12:00 – 18:00', 'sunset', 'buổi chiều'],
  ['evening', 'Tối · sau 18:00', 'after-hours', 'buổi tối'],
]

/** Which of the three greetings a caller would hear if they rang right now. */
export function currentDaypart(hour = new Date().getHours()): Daypart {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/** The line Fonnus speaks before the clinic's own greeting, in every call. */
export function defaultGreeting(business: string, agent: string): string {
  return `${business} xin nghe. Em là ${agent}, trợ lý AI của phòng khám. Anh chị cần đặt lịch hay hỏi thông tin ạ?`
}

export function daypartExample(key: Daypart, business: string): string {
  if (key === 'morning') return `${business} xin chào buổi sáng. Em có thể giúp gì cho anh chị ạ?`
  if (key === 'afternoon') return `${business} xin nghe. Em có thể giúp gì cho anh chị ạ?`
  return `${business} xin nghe. Ngoài giờ khám, em vẫn đặt lịch và ghi lời nhắn được ạ.`
}

/** What a caller hears first, from the record as it stands. */
export function opening(cfg: ReceptionistConfig, now = new Date()): { compliance: string; greeting: string; daypart: Daypart | null } {
  const agent = cfg.agent_name.trim() || 'Linh'
  const fallback = defaultGreeting(cfg.business_name, agent)
  const dp = cfg.greeting_by_daypart
  if (dp.enabled) {
    const part = currentDaypart(now.getHours())
    return { compliance: GREETING_COMPLIANCE_BLOCK, greeting: dp[part].trim() || daypartExample(part, cfg.business_name), daypart: part }
  }
  return { compliance: GREETING_COMPLIANCE_BLOCK, greeting: cfg.greeting_script_custom.trim() || fallback, daypart: null }
}
