import type { BillingPeriod, Plan, UsageCycle } from '../../../api'

/*
 * The arithmetic behind the minutes: dates as `YYYY-MM-DD` strings, and the one
 * geometry the meter, the plan strip and the plan cards all read — so the bar,
 * the words under it and the estimate on each card cannot disagree.
 */

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function ymdOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s)
  return ymdOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}

/** Days from `a` to `b`, both counted. */
export function daysInclusive(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86_400_000) + 1
}

export interface Meter {
  used: number
  limit: number
  /** Minutes left, or minutes over once `over`. */
  left: number
  over: boolean
  /** The whole cycle at this pace; `null` until the server has enough days to say. */
  projected: number | null
  /** The day the minutes run out at this pace, when that falls inside the cycle. */
  runOutOn: string | null
  pace: number | null
  cycleDays: number
  /** Index of today in `by_day`. */
  todayIndex: number
  /** Percentages of the bar. The bar's end is the larger of the limit and the projection. */
  fill: number
  overFrom: number
  overWidth: number
  projFrom: number
  projWidth: number
  /** Where the limit falls, when the bar reaches past it. */
  limitAt: number | null
}

export function meterOf(u: UsageCycle, plan: Plan): Meter {
  // This cycle's allowance is the plan's minutes. Unused minutes do not roll over.
  const limit = plan.minutes
  const used = u.minutes_used
  const cycleDays = daysInclusive(u.start, u.end)
  const todayIndex = Math.max(0, u.by_day.length - 1)
  const projected = u.projected_minutes == null ? null : Math.max(u.projected_minutes, used)
  const scale = Math.max(limit, projected ?? 0, used) || 1
  const pct = (v: number) => (Math.max(0, v) / scale) * 100
  const pace = projected == null ? null : projected / cycleDays
  let runOutOn: string | null = null
  if (used < limit && projected != null && projected > limit && pace) {
    runOutOn = addDays(u.start, Math.min(cycleDays - 1, todayIndex + Math.ceil((limit - used) / pace)))
  }
  return {
    used,
    limit,
    left: Math.abs(limit - used),
    over: used > limit,
    projected,
    runOutOn,
    pace,
    cycleDays,
    todayIndex,
    fill: pct(Math.min(used, limit)),
    overFrom: pct(limit),
    overWidth: pct(used - limit),
    projFrom: pct(used),
    projWidth: projected == null ? 0 : pct(projected - used),
    limitAt: scale > limit ? pct(limit) : null,
  }
}

/** What a plan would cost for a month of `minutes`, overage included. */
export function monthlyCost(plan: Plan, minutes: number, period: BillingPeriod): number {
  const price = period === 'annual' ? plan.price_annual_per_month_vnd : plan.price_monthly_vnd
  return price + Math.max(0, minutes - plan.minutes) * plan.overage_vnd_per_minute
}

/** The minutes a month is judged against: the projection when there is one, else what is used so far. */
export function monthMinutes(u: UsageCycle): number {
  return u.projected_minutes ?? u.minutes_used
}

/** The plan that costs least at this many minutes. */
export function cheapestFor(plans: Plan[], minutes: number, period: BillingPeriod): Plan | null {
  let best: Plan | null = null
  for (const p of plans) if (!best || monthlyCost(p, minutes, period) < monthlyCost(best, minutes, period)) best = p
  return best
}
