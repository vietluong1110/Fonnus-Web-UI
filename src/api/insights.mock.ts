/**
 * Call figures for the Tổng quan tab, faked in the browser.
 *
 * Two rules this mock follows that a random generator would not:
 *
 * 1. **The same day always gives the same numbers.** Every figure is derived
 *    from the calendar date through `noise()`, so a reload does not reshuffle
 *    the clinic's week and a screenshot taken twice matches. Nothing here calls
 *    `Math.random()`.
 * 2. **It is always "now".** Days come from the browser's clock rather than a
 *    frozen fixture, so `Hôm nay` is genuinely today and the day columns end on
 *    it. `today` counts only the hours that have actually happened.
 *
 * The shapes are the dental template's: a clinic open 08:00–20:00 with a lunch
 * dip, busiest mid-morning and mid-afternoon, quieter on Sunday.
 */
import type {
  AttentionItem,
  CallIntent,
  CallOutcome,
  DurationBucket,
  InsightMetric,
  InsightRange,
  InsightsApi,
  InsightsOverview,
} from './contracts'
import { delay, maybeFail } from './mock-support'

/**
 * The template clinic's opening hours, to the hour. A live backend reads the
 * tenant's real `operating_hours_by_weekday`; the mock cannot see the record,
 * so it hardcodes what the dental template ships with (`defaults.ts`).
 */
const OPEN_FROM = 8
const OPEN_TO = 20

/** Relative call volume through the day. The dip at 12–13 is the lunch break. */
const HOUR_SHAPE = [
  0, 0, 0, 0, 0, 0, 2, 4, 10, 14, 12, 9, 5, 6, 12, 14, 11, 8, 5, 4, 3, 1, 0, 0,
]

/** Calls on a typical day, by `Date.getDay()` — Sunday is a half day. */
const DAY_BASE = [11, 21, 17, 24, 19, 26, 23]

/** Shares that add to 1. Order matches the arrays they weight. */
const INTENT_SHARE: { intent: CallIntent; share: number }[] = [
  { intent: 'booking', share: 0.35 },
  { intent: 'pricing', share: 0.26 },
  { intent: 'hours_location', share: 0.16 },
  { intent: 'practitioner', share: 0.09 },
  { intent: 'insurance_payment', share: 0.07 },
  { intent: 'other', share: 0.07 },
]

const OUTCOME_SHARE: { outcome: CallOutcome; share: number }[] = [
  { outcome: 'answered', share: 0.76 },
  { outcome: 'transferred', share: 0.14 },
  { outcome: 'abandoned', share: 0.06 },
  { outcome: 'unanswered', share: 0.04 },
]

const DURATION_SHARE: { bucket: DurationBucket; share: number }[] = [
  { bucket: 'under_1m', share: 0.23 },
  { bucket: '1_2m', share: 0.28 },
  { bucket: '2_4m', share: 0.31 },
  { bucket: '4_6m', share: 0.13 },
  { bucket: 'over_6m', share: 0.05 },
]

/**
 * Flip to `true` to see the first-day screen — a clinic whose number went live
 * this morning and has taken no calls yet. It is the state a new owner meets
 * first, and the only way to reach it without a backend.
 */
const MOCK_NO_CALLS_YET = false

/* ------------------------------------------------------------------ helpers */

/** Deterministic 0..1 from any integer. mulberry32's mixing step. */
function noise(n: number): number {
  let t = (n + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Days since the epoch — the seed for everything about one day. */
function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}

function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

/**
 * Split `total` across `weights` as whole numbers that still add to `total`.
 *
 * Largest remainder, not `Math.round` per slice: rounding each share
 * independently is how a breakdown ends up one short of the figure above it,
 * and on this page the two are always read together.
 */
function distribute(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0 || total <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => (w / sum) * total)
  const out = exact.map(Math.floor)
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem)
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length].i]++
  return out
}

/** How many calls that day saw in total. */
function callsOnDay(d: Date): number {
  if (MOCK_NO_CALLS_YET) return 0
  const n = dayNumber(d)
  const base = DAY_BASE[d.getDay()]
  return Math.max(0, Math.round(base * (0.82 + noise(n) * 0.36)))
}

/** That day's calls spread over the 24 hours. */
function hoursOnDay(d: Date): number[] {
  const shape = HOUR_SHAPE.map((w, h) => (w === 0 ? 0 : w * (0.7 + noise(dayNumber(d) * 31 + h) * 0.6)))
  return distribute(callsOnDay(d), shape)
}

/** Today, cut off at the hour it actually is — a day in progress, not a whole one. */
function hoursSoFar(now: Date): number[] {
  const full = hoursOnDay(now)
  return full.map((c, h) => (h <= now.getHours() ? c : 0))
}

const RANGE_DAYS: Record<InsightRange, number> = { today: 1, '7d': 7, '30d': 30 }

/** The days a range covers, oldest first, ending today. */
function daysOf(range: InsightRange, now: Date): Date[] {
  const n = RANGE_DAYS[range]
  return Array.from({ length: n }, (_, i) => addDays(now, i - (n - 1)))
}

/** Seconds a call lasted on average that day — a shallow wobble around 2m24s. */
function avgSecondsOn(d: Date): number {
  return Math.round(120 + noise(dayNumber(d) * 7 + 3) * 60)
}

function metric(value: number, previous: number | null, trend: number[]): InsightMetric {
  return { value, previous, trend }
}

/* ------------------------------------------------------------- the fixtures */

/**
 * "Cần bạn xem". The live backend derives these from real calls — a caller who
 * asked for a service with no price, a question she could not answer. The mock
 * cannot see the tenant record, so it names things the dental template really
 * does leave open: `svc-implant` ships with no price, and the Sunday hours ship
 * unconfirmed.
 */
function attentionFor(range: InsightRange, now: Date): AttentionItem[] {
  if (MOCK_NO_CALLS_YET) return []
  const yesterday = addDays(now, -1)
  /** A local wall-clock time on a given day, as ISO. */
  const at = (day: Date, h: number, m: number) => {
    const d = new Date(day)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const evening = (h: number, m: number) => at(yesterday, h, m)
  const items: AttentionItem[] = [
    { id: 'att-price', kind: 'missing_price', count: range === 'today' ? 2 : 5, service: 'Cấy ghép implant' },
    { id: 'att-hours', kind: 'unconfirmed_hours', count: 3, weekday: 0 },
    {
      id: 'att-appts',
      kind: 'pending_appointments',
      count: 2,
      // Built from local wall-clock time, not by splicing a UTC string: a
      // clinic at UTC+7 booking 09:30 is 02:30Z the *same* day, and slicing
      // the date off an ISO stamp late in the evening lands it on the one
      // before — which the row then reads out as the wrong weekday.
      appointments: [
        { customer_name: 'Chị Trang', starts_at: at(addDays(now, 2), 9, 30) },
        { customer_name: 'Anh Dũng', starts_at: at(addDays(now, 3), 15, 0) },
      ],
    },
    { id: 'att-after', kind: 'after_hours_callback', count: 4, from: evening(20, 10), to: evening(21, 5) },
  ]
  if (range !== 'today') {
    items.push({
      id: 'att-question',
      kind: 'unanswered_question',
      count: 2,
      question: 'Có làm răng cho người đang mang thai không?',
    })
  }
  return items
}

/* ----------------------------------------------------------------- the group */

export const insightsMock: InsightsApi = {
  async overview(range, opts) {
    await delay(0.8, opts?.signal)
    maybeFail()

    const now = new Date()
    const days = daysOf(range, now)

    // Today is still running, so its hours stop at the current one. Every other
    // day in the range is whole.
    const perDayHours = days.map((d, i) =>
      i === days.length - 1 ? hoursSoFar(now) : hoursOnDay(d),
    )
    const perDayCalls = perDayHours.map((hs) => hs.reduce((a, b) => a + b, 0))

    const byHour = Array.from({ length: 24 }, (_, h) =>
      perDayHours.reduce((sum, hs) => sum + hs[h], 0),
    )

    const calls = perDayCalls.reduce((a, b) => a + b, 0)

    // The same span immediately before, so the delta compares like with like:
    // today against the same weekday last week, a week against the week before.
    const prevDays =
      range === 'today'
        ? [addDays(now, -7)]
        : daysOf(range, addDays(now, -RANGE_DAYS[range]))
    const prevCalls = prevDays.reduce((sum, d) => sum + callsOnDay(d), 0)

    // Seven points whatever the range: a month of thirty columns inside a tile
    // 260px wide is a texture, not a trend.
    //
    // The last point is today *so far*, never the whole day — the tile's figure
    // and the week under it are read together, and a trend that counted a full
    // day the figure has not reached yet made the two disagree on screen.
    const trendDays = daysOf('7d', now)
    const trend = trendDays.map((d, i) =>
      i === trendDays.length - 1 ? hoursSoFar(now).reduce((a, b) => a + b, 0) : callsOnDay(d),
    )

    const avgSeconds = calls === 0 ? 0 : avgSecondsOn(now)
    const talk = calls * avgSeconds
    const prevAvg = prevCalls === 0 ? 0 : avgSecondsOn(addDays(now, -RANGE_DAYS[range]))

    const bookings = Math.round(calls * 0.2)
    const prevBookings = Math.round(prevCalls * 0.2)

    const afterHours = byHour.reduce(
      (sum, c, h) => (h < OPEN_FROM || h >= OPEN_TO ? sum + c : sum),
      0,
    )
    const prevAfterHours = Math.round(prevCalls * (calls === 0 ? 0 : afterHours / calls))

    const intents = distribute(
      calls,
      INTENT_SHARE.map((s, i) => s.share * (0.9 + noise(dayNumber(now) + i * 17) * 0.2)),
    )
    const outcomes = distribute(calls, OUTCOME_SHARE.map((s) => s.share))
    const durations = distribute(calls, DURATION_SHARE.map((s) => s.share))

    const out: InsightsOverview = {
      range,
      generated_at: now.toISOString(),

      calls: metric(calls, prevCalls, trend),
      bookings: metric(bookings, prevBookings, trend.map((c) => Math.round(c * 0.2))),
      talk_time: metric(talk, prevCalls * prevAvg, trend.map((c) => c * avgSeconds)),
      avg_duration: metric(avgSeconds, prevAvg, trendDays.map((d) => avgSecondsOn(d))),
      after_hours: metric(afterHours, prevAfterHours, trend.map((c) => Math.round(c * 0.3))),

      by_day: days.map((d, i) => ({ date: isoDate(d), count: perDayCalls[i] })),
      by_hour: byHour,
      by_intent: INTENT_SHARE.map((s, i) => ({ intent: s.intent, count: intents[i] })),
      by_outcome: OUTCOME_SHARE.map((s, i) => ({ outcome: s.outcome, count: outcomes[i] })),
      by_duration: DURATION_SHARE.map((s, i) => ({ bucket: s.bucket, count: durations[i] })),

      attention: attentionFor(range, now),
    }
    return out
  },
}

/*
 * The Cuộc gọi mock builds its call list from these same volumes, so the two
 * tabs count the same calls on the same day — a list of 40 calls under a tile
 * that says 120 is exactly the disagreement ui-ux-principles §10 forbids.
 */
export { OPEN_FROM, OPEN_TO, addDays, dayNumber, hoursOnDay, hoursSoFar, isoDate, noise }
