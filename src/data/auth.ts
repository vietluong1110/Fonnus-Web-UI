import { TESTIMONIALS } from './content'
import type { IconName } from '../design-system'

/**
 * Copy for the sign-up and sign-in screens. No markup, same as the other data
 * files: where a number has to be set in tabular figures the string is split
 * into parts and the panel wraps the `{ num }` ones itself.
 */

/** One run inside a line of the panel scene. `{ num }` is set in IBM Plex tnum. */
export type Say = string | { num: string }

export interface SceneLine {
  who: 'caller' | 'fonnus'
  says: Say[]
}

/**
 * Sign-up panel: one call the clinic would have missed, start to finish.
 *
 * The old panel put a headline on an empty third of the screen. This is the
 * same promise as a thing that happens — the call arrives after closing time,
 * the price is answered, the slot is held — which is what the owner is being
 * asked to believe before they type their number.
 */
export const SIGNUP_PANEL = {
  when: {
    icon: 'after-hours' as IconName,
    time: '21:14',
    context: ['Tối thứ Sáu', 'Phòng khám đã đóng cửa'],
  },
  caller: '0903 ••• 217',
  lines: [
    { who: 'caller', says: ['Em ơi, cạo vôi răng bao nhiêu tiền? Mai chị qua được không?'] },
    {
      who: 'fonnus',
      says: [
        'Cạo vôi răng tại phòng khám là ',
        { num: '300.000 đ' },
        ' ạ. Sáng mai còn trống ',
        { num: '9:00' },
        ' và ',
        { num: '10:30' },
        ', chị chọn giờ nào ạ?',
      ],
    },
    { who: 'caller', says: ['9 giờ nhé em.'] },
  ] satisfies SceneLine[],
  outcome: ['Đã lưu lịch hẹn ', { num: '9:00' }, ' thứ Bảy'] satisfies Say[],
  headline: 'Không cuộc gọi nào bị bỏ lỡ.',
  /** One source for this quote: it is the same pilot clinic the landing page cites. */
  quote: TESTIMONIALS[0].quote,
  attribution: TESTIMONIALS[0].attribution,
}

/**
 * Sign-in panel: the morning after. Someone signing in has already bought the
 * promise, so the panel shows what they are signing in *to* rather than selling
 * it again.
 */
export const SIGNIN_PANEL = {
  when: {
    icon: 'hours' as IconName,
    time: '7:30',
    context: ['Sáng thứ Bảy', 'Trước giờ mở cửa'],
  },
  logLabel: 'Đêm qua',
  logCount: { num: '6', label: 'cuộc gọi đã nghe' },
  calls: [
    { number: '0903 ••• 217', meta: '21:14 · hỏi giá cạo vôi răng', outcome: 'Đã đặt lịch', booked: true },
    { number: '0938 ••• 044', meta: '22:02 · hỏi giờ mở cửa', outcome: 'Đã trả lời', booked: false },
    { number: '0911 ••• 882', meta: '06:48 · đặt lịch niềng răng', outcome: 'Đã đặt lịch', booked: true },
  ],
  tiles: [
    { icon: 'appointment' as IconName, num: '3', label: 'lịch hẹn mới hôm nay' },
    { icon: 'answered' as IconName, num: '1', label: 'lời nhắn cần gọi lại' },
  ],
  headline: 'Chào mừng bạn quay lại.',
  lede: 'Cuộc gọi đêm qua, lịch hẹn và báo cáo hôm nay của phòng khám đang chờ bạn.',
}

/**
 * Under every form, on every step. Two things a clinic owner in Vietnam checks
 * before typing a number into a service they have just met: where the data
 * lives, and whether a human answers when it goes wrong.
 */
export const AUTH_FOOTNOTE = {
  residency: 'Dữ liệu phòng khám lưu tại Việt Nam',
  supportLabel: 'Cần hỗ trợ?',
  supportNote: 'gọi hoặc Zalo',
}
