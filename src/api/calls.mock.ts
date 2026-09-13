/**
 * The Cuộc gọi tab, faked in the browser.
 *
 * Three things this mock does on purpose:
 *
 * 1. **It counts the calls Tổng quan counts.** Each day's volume, hour by hour,
 *    comes from `insights.mock.ts`, so the list and the figure above it on the
 *    other tab never disagree. Nothing here calls `Math.random()`: the same day
 *    gives the same calls, the same numbers, the same ids.
 * 2. **Its gaps are the dental template's real gaps** — the implant with no
 *    price, the unconfirmed Sunday, the question nobody has answered — the same
 *    three "Cần bạn xem" names, so a row there leads to calls that say it.
 * 3. **The recording is a real audio file** — silence, of the right length — so
 *    the page plays it through the same `<audio>` path a live recording takes.
 *
 * The conversations are scripts filled in per call: a person (a number, "chị"
 * or "anh", a name) and a moment. `Linh` is the template's default name; the
 * mock cannot see the tenant record.
 */
import type {
  CallDetail,
  CallEvent,
  CallFilter,
  CallIntent,
  CallListPage,
  CallOutcome,
  CallSummary,
  CallTurn,
  CallsApi,
  KnowledgeGap,
} from './contracts'
import { ApiError } from './errors'
import { OPEN_FROM, OPEN_TO, addDays, dayNumber, hoursOnDay, hoursSoFar, isoDate, noise } from './insights.mock'
import { delay, maybeFail, storage } from './mock-support'

/* ------------------------------------------------------------------ people */

type Who = 'chị' | 'anh'

interface Person {
  number: string
  who: Who
  first: string
}

const PREFIXES = ['090', '091', '093', '094', '097', '098', '086', '088', '070', '079', '083', '077']
const CHI = ['Trang', 'Mai', 'Hạnh', 'Lan', 'Thảo', 'Ngọc', 'Hương', 'Vy', 'Hà', 'Thu', 'Yến', 'Nhung']
const ANH = ['Dũng', 'Phong', 'Khoa', 'Tuấn', 'Minh', 'Quang', 'Sơn', 'Nam', 'Bảo', 'Long', 'Thắng', 'Việt']
const KIDS = ['Bảo An', 'Minh Khang', 'Gia Hân', 'Tuệ Nhi', 'Đăng Khoa', 'Khánh Linh']

/** How many different callers a month of calls is drawn from — enough that some ring twice. */
const POOL = 460

function personAt(idx: number): Person {
  const digits = Array.from({ length: 7 }, (_, i) => Math.floor(noise(idx * 131 + i * 17 + 7) * 10)).join('')
  const who: Who = noise(idx * 53 + 5) < 0.6 ? 'chị' : 'anh'
  const names = who === 'chị' ? CHI : ANH
  return { number: PREFIXES[idx % PREFIXES.length] + digits, who, first: names[Math.floor(noise(idx * 29 + 3) * names.length)] }
}

/* ----------------------------------------------------------------- scripts */

interface Ctx {
  start: Date
  who: Who
  /** `Chị` / `Anh`, for the start of a sentence. */
  Who: string
  first: string
  seed: number
}

type Step =
  | { k: 'caller' | 'agent'; t: number; text: string; gap?: KnowledgeGap }
  | { k: 'event'; t: number; event: CallEvent }

interface Script {
  weight: number
  when: 'day' | 'night' | 'any'
  who?: Who
  intent: CallIntent
  outcome: CallOutcome
  /** The caller says their own name somewhere in it. */
  learnsName?: boolean
  topic: string
  summary(c: Ctx): string
  steps(c: Ctx): Step[]
  /** Seconds of recording after the last step. */
  tail?: number
  booking?(c: Ctx): { starts_at: Date; service: string; practitioner: string | null }
  /** Present when she promises a callback: by when. */
  callbackBy?(c: Ctx): Date
  gap?: KnowledgeGap
  transfer?: { to_name: string; answered: boolean; ring_s: number; talk_s: number }
}

const WD = ['chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy']
const pad = (n: number) => String(n).padStart(2, '0')
const dm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
const day = (d: Date) => `${WD[d.getDay()]} ${dm(d)}`

function at(d: Date, h: number, m = 0): Date {
  const out = new Date(d)
  out.setHours(h, m, 0, 0)
  return out
}

/** `n` clinic days after `d`, skipping Sundays — the template's Sunday is a half day. */
function workday(d: Date, n: number, h: number, m = 0): Date {
  let out = new Date(d)
  let left = n
  while (left > 0) {
    out = addDays(out, 1)
    if (out.getDay() !== 0) left--
  }
  return at(out, h, m)
}

/** The callback she promises: this afternoon if there is time, otherwise the next morning. */
function callbackFrom(start: Date): Date {
  const h = start.getHours()
  if (h < OPEN_FROM) return at(start, 9)
  if (h < 15) return at(start, 17)
  return workday(start, 1, 9)
}

/** The same deadline, as she says it on the phone. */
function said(start: Date, by: Date): string {
  const h = by.getHours()
  const clock = h > 12 ? `${h - 12} giờ chiều` : `${h} giờ sáng`
  if (isoDate(by) === isoDate(start)) return `trước ${clock} nay`
  if (isoDate(by) === isoDate(addDays(start, 1))) return `trước ${clock} mai`
  return `trước ${clock} ${WD[by.getDay()]}`
}

const closed = (c: Ctx) => (c.start.getHours() < OPEN_FROM ? 'Phòng khám chưa mở cửa' : 'Phòng khám đã nghỉ')
const farewell = (c: Ctx) => (c.start.getHours() < 12 ? 'Chúc anh chị một ngày vui ạ.' : 'Chúc anh chị buổi tối vui vẻ ạ.')

const IMPLANT: KnowledgeGap = { kind: 'missing_price', service: 'Cấy ghép implant' }
const SUNDAY: KnowledgeGap = { kind: 'unconfirmed_hours', weekday: 0 }
const PREGNANT: KnowledgeGap = { kind: 'unanswered_question', question: 'Có làm răng cho người đang mang thai không?' }

const SCRIPTS: Script[] = [
  {
    weight: 12, when: 'day', intent: 'booking', outcome: 'answered', learnsName: true,
    topic: 'Đặt lịch cạo vôi răng',
    booking: (c) => ({ starts_at: workday(c.start, 3, 15), service: 'Cạo vôi răng', practitioner: 'BS Hùng' }),
    summary: (c) => `${c.Who} ${c.first} đặt lịch cạo vôi răng lúc 15:00 ${day(workday(c.start, 3, 15))} với BS Hùng.`,
    steps: (c) => {
      const b = workday(c.start, 3, 15)
      return [
        { k: 'caller', t: 7, text: `Alo em ơi, cho ${c.who} đặt lịch cạo vôi răng được không?` },
        { k: 'agent', t: 12, text: `Dạ được ạ. ${c.Who} muốn đến ngày nào, buổi sáng hay buổi chiều ạ?` },
        { k: 'caller', t: 20, text: `Chiều ${WD[b.getDay()]} nhé em, tầm 3 giờ.` },
        { k: 'event', t: 25, event: { type: 'availability_checked', date: isoDate(b) } },
        { k: 'agent', t: 28, text: `Dạ, 15:00 ${day(b)} bác sĩ Hùng còn trống. Em giữ giờ này cho ${c.who} nhé?` },
        { k: 'caller', t: 38, text: 'Ừ, được em.' },
        { k: 'agent', t: 41, text: `Dạ, ${c.who} cho em xin tên để ghi vào lịch ạ.` },
        { k: 'caller', t: 46, text: `${c.Who} tên ${c.first}.` },
        { k: 'event', t: 50, event: { type: 'appointment_held', starts_at: b.toISOString() } },
        { k: 'agent', t: 53, text: `Em đã đặt lịch cạo vôi răng cho ${c.who} ${c.first} lúc 15:00 ${day(b)} với bác sĩ Hùng. Cạo vôi bên em 300.000 đồng, khoảng 30 phút. ${c.Who} nhớ đến sớm 10 phút nhé ạ.` },
        { k: 'caller', t: 71, text: 'Ok, cảm ơn em nhé.' },
        { k: 'agent', t: 74, text: `Dạ, em cảm ơn ${c.who} ${c.first}. Chúc ${c.who} một ngày vui ạ.` },
      ]
    },
  },
  {
    weight: 5, when: 'day', who: 'chị', intent: 'booking', outcome: 'answered',
    topic: 'Đặt lịch khám răng cho con',
    booking: (c) => ({ starts_at: workday(c.start, 2, 17, 30), service: 'Khám răng trẻ em', practitioner: null }),
    summary: (c) => `Khách đặt lịch khám răng cho bé ${KIDS[c.seed % KIDS.length]} lúc 17:30 ${day(workday(c.start, 2, 17, 30))}.`,
    steps: (c) => {
      const b = workday(c.start, 2, 17, 30)
      const kid = KIDS[c.seed % KIDS.length]
      return [
        { k: 'caller', t: 6, text: `Em ơi, chị muốn đặt lịch khám răng cho bé nhà chị, bé ${5 + (c.seed % 4)} tuổi.` },
        { k: 'agent', t: 12, text: 'Dạ được ạ, bên em có khám răng cho trẻ em. Chị muốn đưa bé đến ngày nào ạ?' },
        { k: 'caller', t: 20, text: `Chiều ${WD[b.getDay()]} được không em, bé đi học về tầm 5 giờ.` },
        { k: 'event', t: 26, event: { type: 'availability_checked', date: isoDate(b) } },
        { k: 'agent', t: 29, text: `Dạ, 17:30 ${day(b)} còn trống ạ. Em đặt giờ này cho bé nhé?` },
        { k: 'caller', t: 37, text: `Ừ em, tên bé là ${kid}.` },
        { k: 'event', t: 42, event: { type: 'appointment_held', starts_at: b.toISOString() } },
        { k: 'agent', t: 45, text: `Em đã đặt lịch khám răng cho bé ${kid} lúc 17:30 ${day(b)}. Chị cho bé đến sớm 10 phút nhé ạ.` },
        { k: 'caller', t: 58, text: 'Cảm ơn em.' },
      ]
    },
  },
  {
    weight: 5, when: 'day', who: 'anh', intent: 'booking', outcome: 'answered', learnsName: true,
    topic: 'Đặt lịch nhổ răng khôn',
    booking: (c) => ({ starts_at: workday(c.start, 3, 9), service: 'Khám và nhổ răng khôn', practitioner: 'BS Hùng' }),
    summary: (c) => `Anh ${c.first} đặt lịch khám và nhổ răng khôn lúc 09:00 ${day(workday(c.start, 3, 9))} với BS Hùng.`,
    steps: (c) => {
      const b = workday(c.start, 3, 9)
      return [
        { k: 'caller', t: 6, text: 'Mình muốn nhổ răng khôn, có đặt lịch được không em?' },
        { k: 'agent', t: 11, text: 'Dạ được ạ. Bác sĩ cần khám trước khi nhổ, em đặt lịch khám và nhổ cùng buổi nhé. Anh muốn ngày nào ạ?' },
        { k: 'caller', t: 24, text: `Sáng ${WD[b.getDay()]} được không em?` },
        { k: 'event', t: 28, event: { type: 'availability_checked', date: isoDate(b) } },
        { k: 'agent', t: 31, text: `Dạ, 9 giờ sáng ${day(b)} bác sĩ Hùng còn trống. Cho em xin tên anh ạ.` },
        { k: 'caller', t: 40, text: `Anh tên ${c.first}.` },
        { k: 'event', t: 44, event: { type: 'appointment_held', starts_at: b.toISOString() } },
        { k: 'agent', t: 47, text: `Em đã đặt lịch cho anh ${c.first} lúc 9 giờ sáng ${day(b)} với bác sĩ Hùng. Anh nhớ ăn nhẹ trước khi đến nhé ạ.` },
      ]
    },
    tail: 8,
  },
  {
    weight: 11, when: 'day', intent: 'pricing', outcome: 'answered',
    topic: 'Giá cạo vôi răng',
    summary: () => 'Khách hỏi giá cạo vôi răng và có cần đặt trước không. Linh báo 300.000 đồng; khách hẹn xem lịch rồi gọi lại.',
    steps: (c) => [
      { k: 'caller', t: 6, text: `Cho ${c.who} hỏi cạo vôi răng bên em bao nhiêu tiền?` },
      { k: 'agent', t: 10, text: 'Dạ, cạo vôi răng bên em 300.000 đồng một lần, làm khoảng 30 phút ạ.' },
      { k: 'caller', t: 19, text: 'Có cần đặt lịch trước không em?' },
      { k: 'agent', t: 23, text: `Dạ, ${c.who} nên đặt trước để không phải chờ. Em đặt lịch luôn cho ${c.who} nhé?` },
      { k: 'caller', t: 31, text: `Để ${c.who} xem lịch rồi gọi lại.` },
      { k: 'agent', t: 35, text: `Dạ vâng, ${c.who} cần cứ gọi em ạ.` },
    ],
  },
  {
    weight: 4, when: 'day', intent: 'pricing', outcome: 'unanswered',
    topic: 'Giá cấy ghép implant', gap: IMPLANT,
    callbackBy: (c) => callbackFrom(c.start),
    summary: (c) => `Khách hỏi giá cấy ghép implant. Linh chưa có giá nên hẹn nhân viên gọi lại ${said(c.start, callbackFrom(c.start))}.`,
    steps: (c) => {
      const by = callbackFrom(c.start)
      return [
        { k: 'caller', t: 6, text: 'Cho mình hỏi cấy ghép implant một răng bên bạn giá bao nhiêu?' },
        { k: 'agent', t: 11, gap: IMPLANT, text: 'Dạ, em chưa có giá cấy ghép implant để báo chính xác cho anh chị. Em xin ghi nhận và nhờ nhân viên tư vấn gọi lại cho mình nhé ạ.' },
        { k: 'caller', t: 25, text: 'Khoảng bao nhiêu thôi cũng được bạn.' },
        { k: 'agent', t: 29, gap: IMPLANT, text: 'Dạ em xin lỗi, em không muốn báo sai giá. Nhân viên sẽ gọi lại số này cho anh chị, được không ạ?' },
        { k: 'caller', t: 40, text: `Được, gọi ${said(c.start, by)} nhé.` },
        { k: 'event', t: 44, event: { type: 'message_taken', callback_by: by.toISOString() } },
        { k: 'agent', t: 47, text: `Dạ, em đã ghi: gọi lại ${said(c.start, by)}. Em cảm ơn anh chị ạ.` },
      ]
    },
  },
  {
    weight: 6, when: 'day', intent: 'hours_location', outcome: 'answered',
    topic: 'Chủ nhật có mở cửa, gửi xe ở đâu', gap: SUNDAY,
    summary: () => 'Khách hỏi chủ nhật có mở cửa không và gửi xe ở đâu. Linh đọc giờ chủ nhật mẫu và chỗ gửi xe.',
    steps: () => [
      { k: 'caller', t: 6, text: 'Chủ nhật bên mình có làm không em?' },
      { k: 'agent', t: 10, gap: SUNDAY, text: 'Dạ, chủ nhật phòng khám mở cửa từ 8 giờ đến 12 giờ trưa ạ.' },
      { k: 'caller', t: 17, text: 'Vậy gửi xe máy ở đâu em?' },
      { k: 'agent', t: 21, text: 'Dạ, anh chị gửi xe ngay trước cửa phòng khám, có bảo vệ trông miễn phí ạ.' },
      { k: 'caller', t: 30, text: 'Ok, cảm ơn em.' },
      { k: 'agent', t: 33, text: 'Dạ, hẹn gặp anh chị ạ.' },
    ],
  },
  {
    weight: 5, when: 'day', intent: 'hours_location', outcome: 'answered',
    topic: 'Giờ đóng cửa buổi tối',
    summary: () => 'Khách hỏi tối nay mấy giờ đóng cửa. Linh báo phòng khám mở đến 20:00.',
    steps: () => [
      { k: 'caller', t: 6, text: 'Tối nay mấy giờ bên mình đóng cửa em?' },
      { k: 'agent', t: 10, text: 'Dạ, phòng khám mở cửa đến 8 giờ tối ạ.' },
      { k: 'caller', t: 16, text: 'Ok, vậy khoảng 7 giờ mình qua.' },
      { k: 'agent', t: 20, text: 'Dạ, hẹn gặp anh chị ạ.' },
    ],
  },
  {
    weight: 6, when: 'day', who: 'anh', intent: 'insurance_payment', outcome: 'answered', learnsName: true,
    topic: 'Nhận BHYT không, trả góp răng sứ',
    summary: (c) => `Anh ${c.first} hỏi về BHYT và trả góp răng sứ. Linh trả lời: chưa nhận BHYT, trả góp 0% trong 6 tháng.`,
    steps: (c) => [
      { k: 'caller', t: 6, text: 'Bên mình có nhận thẻ bảo hiểm y tế không em?' },
      { k: 'agent', t: 10, text: 'Dạ, phòng khám chưa áp dụng bảo hiểm y tế ạ. Bên em nhận tiền mặt, chuyển khoản và quẹt thẻ.' },
      { k: 'caller', t: 20, text: 'Làm răng sứ có trả góp được không?' },
      { k: 'agent', t: 24, text: 'Dạ có ạ. Răng sứ từ 5 triệu đồng trở lên được trả góp 0% qua thẻ tín dụng trong 6 tháng.' },
      { k: 'caller', t: 36, text: `Ok, anh tên ${c.first}, để anh qua xem.` },
      { k: 'agent', t: 40, text: `Dạ, hẹn gặp anh ${c.first} ạ.` },
    ],
  },
  {
    weight: 5, when: 'day', who: 'anh', intent: 'practitioner', outcome: 'transferred',
    topic: 'Đau, sưng sau nhổ răng khôn',
    transfer: { to_name: 'BS Hùng', answered: true, ring_s: 12, talk_s: 53 },
    summary: () => 'Khách đau và sưng sau khi nhổ răng khôn hôm qua. Linh không tư vấn, nối máy ngay cho BS Hùng — bác sĩ đã nghe máy.',
    steps: () => [
      { k: 'caller', t: 6, text: 'Em ơi, anh mới nhổ răng khôn hôm qua, giờ sưng với đau quá, có sao không em?' },
      { k: 'agent', t: 14, text: 'Dạ, em rất tiếc anh đang đau. Em không tư vấn được về tình trạng sau thủ thuật, em nối máy ngay cho bác sĩ Hùng để bác sĩ hỏi anh trực tiếp nhé.' },
      { k: 'caller', t: 27, text: 'Ừ, em nối giúp anh.' },
      { k: 'agent', t: 30, text: 'Dạ, anh giữ máy giúp em một chút ạ.' },
      { k: 'event', t: 33, event: { type: 'transferred', to_name: 'BS Hùng', answered: true, ring_s: 12 } },
      { k: 'event', t: 98, event: { type: 'transfer_ended', to_name: 'BS Hùng', talk_s: 53 } },
    ],
    tail: 0,
  },
  {
    weight: 4, when: 'day', intent: 'practitioner', outcome: 'answered',
    topic: 'Bác sĩ Hùng có làm thứ Bảy không',
    summary: () => 'Khách hỏi bác sĩ Hùng có làm thứ Bảy không. Linh báo lịch sáng thứ Bảy và mời giữ lịch.',
    steps: () => [
      { k: 'caller', t: 6, text: 'Bác sĩ Hùng có làm thứ Bảy không em?' },
      { k: 'agent', t: 10, text: 'Dạ, bác sĩ Hùng làm sáng thứ Bảy, từ 8 giờ đến 12 giờ ạ. Anh chị muốn em giữ lịch luôn không ạ?' },
      { k: 'caller', t: 20, text: 'Để mình sắp xếp đã, cảm ơn em.' },
      { k: 'agent', t: 24, text: 'Dạ vâng, anh chị cần cứ gọi lại em nhé ạ.' },
    ],
  },
  {
    weight: 2, when: 'day', who: 'chị', intent: 'other', outcome: 'unanswered',
    topic: 'Làm răng khi đang mang thai', gap: PREGNANT,
    callbackBy: (c) => callbackFrom(c.start),
    summary: (c) => `Khách đang mang thai hỏi có làm răng được không. Linh chưa có câu trả lời, hẹn bác sĩ gọi lại ${said(c.start, callbackFrom(c.start))}.`,
    steps: (c) => {
      const by = callbackFrom(c.start)
      return [
        { k: 'caller', t: 6, text: 'Em ơi, chị đang mang thai tháng thứ năm, có làm răng được không em?' },
        { k: 'agent', t: 13, gap: PREGNANT, text: 'Dạ, câu này em chưa có thông tin để trả lời chính xác cho chị. Em nhờ bác sĩ gọi lại tư vấn cho chị nhé ạ.' },
        { k: 'caller', t: 25, text: `Ừ, gọi ${said(c.start, by)} giúp chị nhé.` },
        { k: 'event', t: 29, event: { type: 'message_taken', callback_by: by.toISOString() } },
        { k: 'agent', t: 32, text: 'Dạ, em đã ghi lại. Chị giữ sức khoẻ nhé ạ.' },
      ]
    },
  },
  {
    weight: 3, when: 'any', who: 'chị', intent: 'booking', outcome: 'unanswered', learnsName: true,
    topic: 'Đổi lịch tẩy trắng răng',
    callbackBy: (c) => callbackFrom(c.start),
    summary: (c) => `Chị ${c.first} muốn đổi lịch tẩy trắng sang một buổi chiều. Linh chưa đổi lịch được nên hẹn nhân viên gọi lại ${said(c.start, callbackFrom(c.start))}.`,
    steps: (c) => {
      const by = callbackFrom(c.start)
      return [
        { k: 'caller', t: 7, text: `Em ơi, chị ${c.first} đây, chị có lịch tẩy trắng răng, giờ muốn đổi sang hôm khác được không?` },
        { k: 'agent', t: 15, text: `Dạ, em chưa đổi lịch trực tiếp được ạ. Em ghi nhận chị ${c.first} muốn đổi lịch tẩy trắng và nhờ nhân viên gọi lại xác nhận ${said(c.start, by)} nhé.` },
        { k: 'caller', t: 29, text: 'Ừ, chị muốn buổi chiều nhé.' },
        { k: 'event', t: 33, event: { type: 'message_taken', callback_by: by.toISOString() } },
        { k: 'agent', t: 36, text: `Dạ, em ghi rõ: đổi sang buổi chiều. Em cảm ơn chị ${c.first} ạ.` },
      ]
    },
  },
  {
    weight: 2, when: 'day', who: 'anh', intent: 'other', outcome: 'answered',
    topic: 'Chào bán dịch vụ quảng cáo',
    summary: () => 'Cuộc gọi chào bán quảng cáo. Linh từ chối lịch sự và mời gửi thông tin qua email.',
    steps: () => [
      { k: 'caller', t: 6, text: 'Chào em, anh bên dịch vụ quảng cáo, cho anh gặp chủ phòng khám được không?' },
      { k: 'agent', t: 13, text: 'Dạ, em chỉ nhận cuộc gọi của khách hàng ạ. Anh vui lòng gửi thông tin qua email của phòng khám nhé. Em cảm ơn anh.' },
      { k: 'caller', t: 25, text: 'Ờ, vậy thôi.' },
    ],
    tail: 4,
  },
  {
    weight: 5, when: 'any', intent: 'other', outcome: 'abandoned',
    topic: 'Chưa kịp hỏi',
    summary: (c) => `Khách cúp máy sau ${5 + (c.seed % 9)} giây, lúc Linh đang chào.`,
    steps: (c) => [{ k: 'event', t: 5 + (c.seed % 9), event: { type: 'caller_hung_up' } }],
    tail: 0,
  },
  {
    weight: 3, when: 'night', intent: 'pricing', outcome: 'unanswered',
    topic: 'Giá cấy ghép implant', gap: IMPLANT,
    callbackBy: (c) => callbackFrom(c.start),
    summary: (c) => `Khách hỏi giá cấy ghép implant ngoài giờ. Linh chưa có giá, hẹn nhân viên gọi lại ${said(c.start, callbackFrom(c.start))}.`,
    steps: (c) => {
      const by = callbackFrom(c.start)
      return [
        { k: 'caller', t: 6, text: 'Chào em, cấy ghép implant một răng bên mình khoảng bao nhiêu tiền vậy?' },
        { k: 'agent', t: 12, gap: IMPLANT, text: `Dạ, em chưa có giá cấy ghép implant để báo anh chị. ${closed(c)}, nhân viên sẽ gọi lại tư vấn ${said(c.start, by)} được không ạ?` },
        { k: 'caller', t: 27, text: 'Ừ được.' },
        { k: 'event', t: 30, event: { type: 'message_taken', callback_by: by.toISOString() } },
        { k: 'agent', t: 33, text: `Dạ, em đã ghi lại. ${farewell(c)}` },
      ]
    },
  },
  {
    weight: 3, when: 'night', who: 'anh', intent: 'booking', outcome: 'answered', learnsName: true,
    topic: 'Đặt lịch khám ngoài giờ',
    booking: (c) => ({ starts_at: workday(c.start, 1, 9, 30), service: 'Khám tổng quát', practitioner: null }),
    summary: (c) => `Anh ${c.first} gọi ngoài giờ và đặt lịch khám lúc 09:30 ${day(workday(c.start, 1, 9, 30))}.`,
    steps: (c) => {
      const b = workday(c.start, 1, 9, 30)
      return [
        { k: 'caller', t: 6, text: 'Mình muốn đặt lịch khám răng, giờ này còn đặt được không?' },
        { k: 'agent', t: 11, text: `Dạ được ạ. ${closed(c)} nhưng em vẫn giữ lịch cho anh được. Anh muốn đến ngày nào ạ?` },
        { k: 'caller', t: 21, text: `Sáng ${WD[b.getDay()]} nhé, tầm 9 rưỡi.` },
        { k: 'event', t: 26, event: { type: 'availability_checked', date: isoDate(b) } },
        { k: 'agent', t: 29, text: `Dạ, 9:30 ${day(b)} còn trống ạ. Cho em xin tên anh.` },
        { k: 'caller', t: 37, text: `Anh tên ${c.first}.` },
        { k: 'event', t: 41, event: { type: 'appointment_held', starts_at: b.toISOString() } },
        { k: 'agent', t: 44, text: `Em đã đặt lịch khám cho anh ${c.first} lúc 9:30 ${day(b)}. Hẹn gặp anh ạ.` },
      ]
    },
    tail: 6,
  },
  {
    weight: 1, when: 'night', intent: 'practitioner', outcome: 'transferred',
    topic: 'Chảy máu sau nhổ răng',
    transfer: { to_name: 'BS Hùng', answered: true, ring_s: 18, talk_s: 94 },
    summary: () => 'Khách chảy máu nhiều sau khi nhổ răng. Linh không tư vấn, nối máy ngay cho BS Hùng đang trực — bác sĩ đã nghe máy.',
    steps: () => [
      { k: 'caller', t: 6, text: 'Em ơi, chiều nay mình mới nhổ răng, giờ vẫn chảy máu nhiều quá.' },
      { k: 'agent', t: 13, text: 'Dạ, em nối máy ngay cho bác sĩ trực để bác sĩ hỏi anh chị trực tiếp. Anh chị giữ máy giúp em ạ.' },
      { k: 'event', t: 24, event: { type: 'transferred', to_name: 'BS Hùng', answered: true, ring_s: 18 } },
      { k: 'event', t: 136, event: { type: 'transfer_ended', to_name: 'BS Hùng', talk_s: 94 } },
    ],
    tail: 0,
  },
]

function pickScript(seed: number, night: boolean, who: Who): Script {
  const pool = SCRIPTS.filter(
    (s) => (s.when === 'any' || (s.when === 'night') === night) && (!s.who || s.who === who),
  )
  const total = pool.reduce((sum, s) => sum + s.weight, 0)
  let r = noise(seed) * total
  for (const s of pool) {
    r -= s.weight
    if (r < 0) return s
  }
  return pool[pool.length - 1]
}

/* -------------------------------------------------------------- the month */

interface Row {
  id: string
  start: Date
  person: Person
  script: Script
  seed: number
  night: boolean
}

/** Every call in the last 30 days, newest first. Today stops at the current minute. */
function month(now: Date): Row[] {
  const rows: Row[] = []
  for (let back = 29; back >= 0; back--) {
    const d = addDays(now, -back)
    const hours = back === 0 ? hoursSoFar(now) : hoursOnDay(d)
    hours.forEach((count, h) => {
      for (let k = 0; k < count; k++) {
        const seed = dayNumber(d) * 997 + h * 61 + k * 7
        let minute = Math.floor(noise(seed + 1) * 60)
        if (back === 0 && h === now.getHours()) minute = Math.min(minute, now.getMinutes())
        const person = personAt(Math.floor(noise(seed + 2) * POOL))
        const night = h < OPEN_FROM || h >= OPEN_TO
        rows.push({
          id: `c-${isoDate(d)}-${pad(h)}${pad(minute)}-${k}`,
          start: at(d, h, minute),
          person,
          script: pickScript(seed + 3, night, person.who),
          seed,
          night,
        })
      }
    })
  }
  return rows.sort((a, b) => b.start.getTime() - a.start.getTime())
}

/* ---------------------------------------------------------- callback state */

const CALLBACK_KEY = 'fonnus.mock.calls.callbacks'

/** `{ id: done_at }`, or `null` for a callback the owner re-opened. */
function callbackOverrides(): Record<string, string | null> {
  try {
    return JSON.parse(storage.read(CALLBACK_KEY) ?? '{}') as Record<string, string | null>
  } catch {
    return {}
  }
}

/**
 * Callbacks from before yesterday noon count as made — a clinic returns its
 * calls — so the list is not a month of red dots. The newer ones are still open,
 * which is what the owner would actually find in the morning.
 */
function doneAt(row: Row, by: Date, now: Date): string | null {
  const o = callbackOverrides()
  if (row.id in o) return o[row.id]
  if (row.start >= at(addDays(now, -1), 12)) return null
  const made = new Date(Math.min(by.getTime() - 20 * 60_000, now.getTime()))
  return made.toISOString()
}

/* ------------------------------------------------------------ one call */

interface Built {
  summary: CallSummary
  detail: Omit<CallDetail, 'recording' | 'others'>
  text: string
}

function ctxOf(row: Row): Ctx {
  const { who, first } = row.person
  return { start: row.start, who, Who: who === 'chị' ? 'Chị' : 'Anh', first, seed: row.seed }
}

function build(row: Row, rows: Row[], now: Date): Built {
  const s = row.script
  const c = ctxOf(row)
  const steps = s.steps(c)
  const last = steps.length ? steps[steps.length - 1].t : 0
  const duration_s = last + (s.tail ?? 6)

  const sameNumber = rows.filter((r) => r.person.number === row.person.number && r.start <= row.start)
  const learned = sameNumber.some((r) => r.script.learnsName)
  const booking = s.booking?.(c) ?? null
  const by = s.callbackBy?.(c) ?? null

  const summary: CallSummary = {
    id: row.id,
    started_at: row.start.toISOString(),
    duration_s,
    caller_number: row.person.number,
    caller_name: learned ? `${c.Who} ${c.first}` : null,
    caller_call_number: sameNumber.length,
    intent: s.intent,
    topic: s.topic,
    outcome: s.outcome,
    booked: booking != null,
    after_hours: row.night,
    callback: by ? { due_by: by.toISOString(), done_at: doneAt(row, by, now) } : null,
    gap: s.gap ?? null,
  }

  const turns: CallTurn[] = [
    { kind: 'disclosure', at_ms: 0 },
    ...steps.map((st): CallTurn =>
      st.k === 'event'
        ? { kind: 'event', at_ms: st.t * 1000, event: st.event }
        : { kind: st.k, at_ms: st.t * 1000, text: st.text, ...(st.gap ? { gap: st.gap } : {}) },
    ),
  ]

  const detail = {
    ...summary,
    summary: s.summary(c),
    turns,
    booking: booking
      ? { starts_at: booking.starts_at.toISOString(), service: booking.service, practitioner: booking.practitioner }
      : null,
    transfer: s.transfer ?? null,
  }

  const text = [summary.caller_name ?? '', s.topic, detail.summary, ...steps.map((st) => ('text' in st ? st.text : ''))].join(' ')
  return { summary, detail, text }
}

/* --------------------------------------------------------------- search */

/** Lower-case, no diacritics: `Niềng` finds `niềng` and `nieng`. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function matches(b: Built, q: string): boolean {
  const compact = q.replace(/[\s.]/g, '')
  if (/^\d{3,}$/.test(compact)) return b.summary.caller_number.includes(compact)
  return fold(b.text).includes(fold(q))
}

const FILTER_TEST: Record<CallFilter, (c: CallSummary) => boolean> = {
  all: () => true,
  callback: (c) => c.callback != null && c.callback.done_at == null,
  booked: (c) => c.booked,
  transferred: (c) => c.outcome === 'transferred',
  unanswered: (c) => c.outcome === 'unanswered',
}

/* -------------------------------------------------------------- recording */

const recordings = new Map<string, string>()

/**
 * A WAV of silence the length of the call: 8 kHz, 8-bit, mono. A real file
 * rather than a pretend clock, so seeking, speed and "ended" run through the
 * browser's own audio element exactly as a live recording's would.
 */
function silentRecording(id: string, ms: number): string {
  const hit = recordings.get(id)
  if (hit) return hit
  const rate = 8000
  const samples = Math.ceil((rate * ms) / 1000)
  const buf = new ArrayBuffer(44 + samples)
  const v = new DataView(buf)
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  v.setUint32(4, 36 + samples, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate, true)
  v.setUint16(32, 1, true)
  v.setUint16(34, 8, true)
  ascii(36, 'data')
  v.setUint32(40, samples, true)
  new Uint8Array(buf, 44).fill(128)
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
  recordings.set(id, url)
  return url
}

/* ----------------------------------------------------------------- the group */

const PAGE_SIZE = 40

export const callsMock: CallsApi = {
  async list(query, opts) {
    await delay(0.7, opts?.signal)
    maybeFail()

    const now = new Date()
    const rows = month(now)
    const from = at(addDays(now, query.range === 'today' ? 0 : query.range === '7d' ? -6 : -29), 0)
    const q = (query.q ?? '').trim()

    const searched = rows
      .filter((r) => r.start >= from)
      .map((r) => build(r, rows, now))
      .filter((b) => !q || matches(b, q))
      .map((b) => b.summary)

    const counts = Object.fromEntries(
      (Object.keys(FILTER_TEST) as CallFilter[]).map((f) => [f, searched.filter(FILTER_TEST[f]).length]),
    ) as Record<CallFilter, number>

    const filtered = searched.filter(FILTER_TEST[query.filter])

    const perDay = new Map<string, number>()
    for (const c of filtered) {
      const key = isoDate(new Date(c.started_at))
      perDay.set(key, (perDay.get(key) ?? 0) + 1)
    }

    const offset = Number(query.cursor ?? 0) || 0
    const end = offset + PAGE_SIZE

    const page: CallListPage = {
      generated_at: now.toISOString(),
      calls: filtered.slice(offset, end),
      next_cursor: end < filtered.length ? String(end) : null,
      counts,
      by_day: [...perDay.entries()].map(([date, count]) => ({ date, count })),
    }
    return page
  },

  async get(id, opts) {
    await delay(0.5, opts?.signal)
    maybeFail()

    const now = new Date()
    const rows = month(now)
    const row = rows.find((r) => r.id === id)
    if (!row) throw new ApiError({ kind: 'notfound', status: 404, code: 'call_not_found' })

    const built = build(row, rows, now)
    const others = rows
      .filter((r) => r.person.number === row.person.number && r.id !== id)
      .map((r) => build(r, rows, now).summary)

    return {
      ...built.detail,
      recording: { url: silentRecording(id, built.summary.duration_s * 1000), duration_ms: built.summary.duration_s * 1000 },
      others,
    }
  },

  async setCallbackDone(id, done, opts) {
    await delay(0.5, opts?.signal)
    maybeFail()

    const now = new Date()
    const rows = month(now)
    const row = rows.find((r) => r.id === id)
    if (!row) throw new ApiError({ kind: 'notfound', status: 404, code: 'call_not_found' })

    const o = callbackOverrides()
    o[id] = done ? now.toISOString() : null
    storage.write(CALLBACK_KEY, JSON.stringify(o))
    return build(row, rows, now).summary
  },
}
