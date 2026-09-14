import type { AccountOverview, Plan, Subscription, UsageCycle } from '../../../api'
import { Button, Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { navigateApp } from '../../../hooks/useRoute'
import { Columns, TrackTips } from '../../ui'
import type { Column, TrackPart } from '../../ui'
import { PLAN_NAME, dm, dowOf, fmtCount, fmtVnd } from './labels'
import { addDays, meterOf } from './usage'
import type { Meter } from './usage'
import styles from './Settings.module.css'

/*
 * The plan and its minutes — two cards in the rail beside Cài đặt, because they
 * answer two questions: *what am I paying for* and *how is this month going*.
 * One panel holding both read as a wall of lines (owner review, 14 Sept 2026;
 * ui-ux-principles §15).
 *
 *   Gói của bạn   the name, the price, one action; what the plan includes as four
 *                 figure tiles, and its yes-or-no extras as pills
 *   Phút kỳ này   one big number, the bar, one quiet line, the days under a rule
 *
 * Side by side when their wrapper is wide (a tablet), stacked in the rail and on
 * a phone. The bar is one hue (§10): used, the projection a paler step, over the
 * limit a deeper one — never red — and every stretch of it answers the pointer
 * with the charts' own tip. A ring would have read as the readiness meter (§9).
 */

/** What each stretch of the bar is, for its tip. Fractions of the bar's width. */
function meterParts(m: Meter, usage: UsageCycle, plan: Plan): TrackPart[] {
  const parts: TrackPart[] = []
  const at = (pct: number) => pct / 100
  const inPlan = Math.min(m.used, m.limit)
  const renew = dm(addDays(usage.end, 1))

  if (m.fill > 0) {
    parts.push({
      key: 'used',
      from: 0,
      to: at(m.fill),
      tip: m.over
        ? { head: 'Đã dùng hết phút trong gói', value: `${fmtCount(m.limit)} phút`, meta: `Gói ${PLAN_NAME[plan.id]}` }
        : { head: 'Đã dùng', value: `${fmtCount(inPlan)} phút`, meta: `${Math.round((inPlan / m.limit) * 100)}% số phút trong gói` },
    })
  }
  if (m.over) {
    parts.push({
      key: 'over',
      from: at(m.overFrom),
      to: at(m.overFrom + m.overWidth),
      tip: {
        head: 'Vượt gói',
        value: `${fmtCount(m.used - m.limit)} phút`,
        meta: `+${fmtVnd((m.used - m.limit) * plan.overage_vnd_per_minute)} vào kỳ tới`,
      },
    })
  }
  if (m.projWidth > 0 && m.projected != null) {
    parts.push({
      key: 'projected',
      from: at(m.projFrom),
      to: at(m.projFrom + m.projWidth),
      tip: {
        head: `Dự kiến đến ${dm(usage.end)}`,
        value: `thêm khoảng ${fmtCount(m.projected - m.used)} phút`,
        meta: m.runOutOn ? `Hết phút khoảng ${dm(m.runOutOn)}` : `Cả kỳ khoảng ${fmtCount(m.projected)} phút`,
      },
    })
  }
  const reached = Math.max(m.fill, m.over ? m.overFrom + m.overWidth : 0, m.projWidth > 0 ? m.projFrom + m.projWidth : 0)
  if (reached < 99.5) {
    parts.push({
      key: 'free',
      from: at(reached),
      to: 1,
      tip:
        m.projected != null
          ? { head: 'Dự kiến còn dư cuối kỳ', value: `${fmtCount(Math.max(0, m.limit - m.projected))} phút`, meta: `Làm mới ${renew}` }
          : { head: 'Chưa dùng', value: `${fmtCount(m.limit - m.used)} phút`, meta: `Làm mới ${renew}` },
    })
  }
  return parts
}

export function MeterBar({ meter, usage, plan, tag = false }: { meter: Meter; usage: UsageCycle; plan: Plan; tag?: boolean }) {
  const joined = meter.projWidth > 0 || meter.over
  return (
    <TrackTips parts={meterParts(meter, usage, plan)} label="Phút trong kỳ">
      <div
        className={styles.bar}
        role="meter"
        aria-label="Phút đã dùng trong kỳ"
        aria-valuemin={0}
        aria-valuemax={meter.limit}
        aria-valuenow={Math.min(meter.used, meter.limit)}
      >
        <span className={`${styles.fill} ${joined ? styles.fillJoined : ''}`} style={{ width: `${meter.fill}%` }} />
        {meter.over ? <span className={styles.overFill} style={{ left: `${meter.overFrom}%`, width: `${meter.overWidth}%` }} /> : null}
        {meter.projWidth > 0 ? <span className={styles.proj} style={{ left: `${meter.projFrom}%`, width: `${meter.projWidth}%` }} /> : null}
        {meter.limitAt != null ? (
          <>
            <span className={styles.limit} style={{ left: `${meter.limitAt}%` }} />
            {tag ? (
              <span className={styles.limitTag} style={{ left: `${meter.limitAt}%` }}>
                {fmtCount(meter.limit)}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </TrackTips>
  )
}

/** What the plan includes, for Gói dịch vụ's plan cards. The rail draws the same facts as tiles. */
export function Perks({ plan, numbersUsed }: { plan: Plan; numbersUsed?: number }) {
  return (
    <div className={styles.perks}>
      <div className={styles.perk}>
        <Icon name="hours" size={18} />
        <span>{fmtCount(plan.minutes)} phút mỗi tháng</span>
      </div>
      <div className={styles.perk}>
        <Icon name="incoming" size={18} />
        <span className={styles.perkBody}>
          <span>
            {plan.numbers} số máy · {plan.concurrent_calls} cuộc gọi cùng lúc
          </span>
          {numbersUsed ? (
            <span className={styles.perkUse}>
              <span className={styles.mini}>
                <span className={styles.miniFill} style={{ width: `${Math.min(100, (numbersUsed / plan.numbers) * 100)}%` }} />
              </span>
              Đang dùng {numbersUsed}/{plan.numbers} số
            </span>
          ) : null}
        </span>
      </div>
      {plan.own_voice ? (
        <div className={styles.perk}>
          <Icon name="voice" size={18} />
          <span>Giọng nói riêng</span>
        </div>
      ) : null}
      {plan.account_manager ? (
        <div className={styles.perk}>
          <Icon name="practitioner" size={18} />
          <span>Quản lý tài khoản riêng</span>
        </div>
      ) : null}
      <div className={styles.perk}>
        <Icon name="price" size={18} />
        <span>Vượt gói {fmtVnd(plan.overage_vnd_per_minute)}/phút</span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- the plan */

function PlanCard({ plan, sub }: { plan: Plan; sub: Subscription }) {
  const price = sub.period === 'annual' ? plan.price_annual_per_month_vnd : plan.price_monthly_vnd
  const next = sub.scheduled
  let when = `gia hạn ${dm(sub.renews_on)}`
  if (next && next.plan_id !== plan.id) when = `chuyển sang ${PLAN_NAME[next.plan_id]} từ ${dm(next.starts_on)}`
  else if (next) when = `${next.period === 'annual' ? 'trả năm' : 'trả tháng'} từ ${dm(next.starts_on)}`

  const tiles: { icon: IconName; value: string; label: string; share?: number }[] = [
    { icon: 'hours', value: fmtCount(plan.minutes), label: 'phút mỗi tháng' },
    {
      icon: 'incoming',
      value: sub.numbers_used ? `${sub.numbers_used}/${plan.numbers}` : String(plan.numbers),
      label: sub.numbers_used ? 'số máy đang dùng' : 'số máy',
      share: sub.numbers_used ? Math.min(1, sub.numbers_used / plan.numbers) : undefined,
    },
    { icon: 'answered', value: String(plan.concurrent_calls), label: 'cuộc gọi cùng lúc' },
    { icon: 'price', value: fmtVnd(plan.overage_vnd_per_minute), label: 'mỗi phút vượt gói' },
  ]
  const extras: { icon: IconName; label: string }[] = []
  if (plan.own_voice) extras.push({ icon: 'voice', label: 'Giọng nói riêng' })
  if (plan.account_manager) extras.push({ icon: 'practitioner', label: 'Quản lý tài khoản riêng' })

  return (
    <section className={styles.planCard} aria-label="Gói của bạn">
      <div className={styles.planTop}>
        <div className={styles.planTitle}>
          <span className={styles.eyebrow}>Gói của bạn</span>
          <h2 className={styles.planName}>{PLAN_NAME[plan.id]}</h2>
        </div>
        {/* Always secondary: pointing an owner at another plan makes them shop around (decisions doc D12). */}
        <Button size="sm" variant="secondary" onClick={() => navigateApp('goi-dich-vu')}>
          Đổi gói
        </Button>
      </div>
      <span className={styles.planPrice}>
        <span className={styles.num}>{fmtVnd(price)}</span>/tháng · {when}
      </span>
      <ul className={styles.tiles}>
        {tiles.map((t) => (
          <li key={t.icon} className={styles.tile}>
            <Icon name={t.icon} size={18} />
            <span className={styles.tileValue}>{t.value}</span>
            <span className={styles.tileLabel}>{t.label}</span>
            {t.share != null ? (
              <span className={styles.tileMeter} aria-hidden="true">
                <span style={{ width: `${t.share * 100}%` }} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {extras.length ? (
        <div className={styles.extras}>
          {extras.map((e) => (
            <span key={e.icon} className={styles.extra}>
              <Icon name={e.icon} size={15} />
              {e.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

/* ------------------------------------------------------------- the minutes */

/**
 * The days behind the number, drawn by Tổng quan's column chart: the same
 * pointer, tip and dotted average. Days still to come are the palest step at
 * this cycle's pace. The average leaves today out — a morning's half-day would
 * drag it down.
 */
function DailyColumns({ usage, meter: m }: { usage: UsageCycle; meter: Meter }) {
  const full = usage.by_day.slice(0, -1)
  const avg = full.length ? full.reduce((a, b) => a + b, 0) / full.length : null
  const columns: Column[] = Array.from({ length: m.cycleDays }, (_, i) => {
    const date = addDays(usage.start, i)
    const past = i < usage.by_day.length
    const today = i === m.todayIndex
    const value = past ? usage.by_day[i] : Math.round(m.pace ?? 0)
    let meta: string | undefined
    if (today) meta = 'Tính đến bây giờ'
    else if (!past) meta = 'Theo nhịp kỳ này'
    else if (avg != null && Math.round(value - avg) !== 0) {
      meta = `${fmtCount(Math.abs(value - avg))} phút ${value > avg ? 'trên' : 'dưới'} trung bình`
    }
    return {
      key: date,
      tick: i === 0 || i === m.cycleDays - 1 ? dm(date) : '',
      value,
      now: today,
      ghost: !past,
      tip: {
        head: `${dowOf(date)} ${dm(date)}${today ? ' · hôm nay' : ''}`,
        value: past ? `${fmtCount(value)} phút` : m.pace != null ? `khoảng ${fmtCount(value)} phút` : 'Chưa tới',
        meta,
      },
    }
  })

  return (
    <div className={styles.days}>
      <div className={styles.daysHead}>
        <span>Mỗi ngày</span>
        {avg != null ? <span className={styles.daysValue}>Trung bình {fmtCount(avg)} phút</span> : null}
      </div>
      <Columns
        columns={columns}
        label={`Phút mỗi ngày từ ${dm(usage.start)} đến ${dm(usage.end)}`}
        height={84}
        average={avg ?? undefined}
      />
    </div>
  )
}

function MinutesCard({ usage, plan, agent }: { usage: UsageCycle; plan: Plan; agent: string }) {
  const m = meterOf(usage, plan)
  const overCost = (m.used - m.limit) * plan.overage_vnd_per_minute

  return (
    <section className={styles.planCard} aria-label="Phút kỳ này">
      <div className={styles.cardTop}>
        <span className={styles.eyebrow}>Phút kỳ này</span>
        <span className={styles.cardTopMeta}>Làm mới {dm(addDays(usage.end, 1))}</span>
      </div>
      <div className={styles.hero}>
        <span className={styles.heroNum}>{fmtCount(m.left)}</span>
        <span className={styles.heroUnit}>{m.over ? 'phút vượt gói' : 'phút còn lại'}</span>
      </div>
      <div className={`${styles.meterBlock} ${m.limitAt != null ? styles.meterTagged : ''}`}>
        <MeterBar meter={m} usage={usage} plan={plan} tag />
        <div className={styles.meterFoot}>
          <span>
            <span className={styles.num}>{fmtCount(m.used)}</span> / <span className={styles.num}>{fmtCount(m.limit)}</span> phút
          </span>
          {m.over ? (
            <span className={styles.meterFlag}>+{fmtVnd(overCost)} vào kỳ tới</span>
          ) : m.runOutOn ? (
            <span className={styles.meterFlag}>Hết khoảng {dm(m.runOutOn)}</span>
          ) : m.projected != null ? (
            <span>Dự kiến {fmtCount(m.projected)} phút</span>
          ) : null}
        </div>
      </div>
      {m.over || m.runOutOn ? (
        <div className={styles.note}>
          <Icon name="answered" size={16} />
          <span>
            {agent} vẫn nghe máy khi hết phút — mỗi phút vượt {fmtVnd(plan.overage_vnd_per_minute)}
          </span>
        </div>
      ) : null}
      <DailyColumns usage={usage} meter={m} />
    </section>
  )
}

export function PlanPanel({ overview, plans, agent }: { overview: AccountOverview; plans: Plan[]; agent: string }) {
  const sub = overview.subscription
  const plan = plans.find((p) => p.id === sub.plan_id)
  if (!plan) return null

  return (
    <div className={styles.planWrap}>
      <div className={styles.planCards}>
        <PlanCard plan={plan} sub={sub} />
        <MinutesCard usage={overview.usage} plan={plan} agent={agent} />
      </div>
    </div>
  )
}
