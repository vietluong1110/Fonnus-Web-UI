import { useEffect, useState } from 'react'
import { Button, Icon, Shape } from '../../../design-system'
import { api, isCanceled, messageFor } from '../../../api'
import type { InsightRange, InsightsOverview } from '../../../api'
import { appHref } from '../../../hooks/useRoute'
import { ContentSkeleton, RetryCard } from '../../Boot'
import { Band, Card, Columns, EmptyState, HourGrid, RankedBars, Segmented, ui } from '../../ui'
import type { ChartTip, Column, Ranked, Segment } from '../../ui'
import { useConfig } from '../../letan/store'
import type { Weekday } from '../../letan/model'
import { AttentionCard } from './Attention'
import { ReadinessStrip } from './ReadinessStrip'
import { StatTile } from './StatTile'
import {
  DURATION_LABEL,
  DURATION_LONG,
  INTENT_LABEL,
  RANGES,
  RANGE_IN,
  RANGE_SPAN,
  WEEKDAY_SHORT,
  fmtDateline,
  fmtDayLong,
  fmtDayMonth,
  fmtDuration,
  fmtShare,
  fmtTime,
  outcomeLabel,
  perTen,
  rangeBefore,
  vsAverage,
} from './labels'
import styles from './Overview.module.css'

/*
 * `#/app/tong-quan` — Tổng quan.
 *
 * What happened on the phone, and the one list you act on. The page answers two
 * questions in that order: *what is going on*, and *what should I fill in next* —
 * and the second is answered by the first, because every row of "Cần bạn xem"
 * is a gap a real caller found rather than an item on a checklist.
 *
 * The whole screen is one GET. Five figures, four breakdowns and the queue are
 * one moment; fetching them separately would let the tiles and the charts
 * disagree with each other while they landed, and the range switch would tear.
 *
 * It calls `api.insights` directly rather than through a provider, because
 * nothing outside this page reads the result (CLAUDE.md: *does more than one
 * component need to see it?*). The tenant record it needs — her name, the
 * clinic's opening hours — comes from `ConfigProvider`, which is already above
 * every page in the shell.
 */

/** The clinic's day, as one window: earliest opening to latest closing. */
function openWindow(hours: { day: Weekday; open: boolean; from: string; to: string }[]) {
  const open = hours.filter((d) => d.open && d.from && d.to)
  if (!open.length) return null
  const from = open.reduce((min, d) => (d.from < min ? d.from : min), open[0].from)
  const to = open.reduce((max, d) => (d.to > max ? d.to : max), open[0].to)
  return { from, to, fromHour: Number(from.slice(0, 2)), toHour: Number(to.slice(0, 2)) }
}

/** The last index holding the extreme — so of two equal days, the more recent is named. */
function lastIndexOf(values: number[], pick: (a: number, b: number) => boolean): number {
  let at = -1
  values.forEach((v, i) => {
    if (at < 0 || pick(v, values[at]) || v === values[at]) at = i
  })
  return at
}

/** `n` local midnights ending on the day of `end`. */
function daysEnding(end: Date, n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (n - 1 - i))
    return d
  })
}

export function OverviewPage() {
  const { config } = useConfig()
  const agent = config.agent_name.trim() || 'Linh'

  const [range, setRange] = useState<InsightRange>('today')
  const [data, setData] = useState<InsightsOverview | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(true)
  /** Bumped by "Thử lại", so a failed load can be asked for again. */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setBusy(true)
    api.insights
      .overview(range, { signal: ac.signal })
      .then((d) => {
        setData(d)
        setError(null)
        setBusy(false)
      })
      .catch((e: unknown) => {
        if (isCanceled(e)) return
        setError(e)
        setBusy(false)
      })
    return () => ac.abort()
  }, [range, attempt])

  // Only the very first load blanks the page. A range change keeps the numbers
  // that are already on screen and dims them — replacing a full screen of
  // figures with a skeleton for 400ms reads as the page breaking, and the
  // owner loses the thing they were comparing against.
  if (!data && busy) return <ContentSkeleton />

  if (!data && error) {
    return (
      <RetryCard
        title="Chưa tải được số liệu"
        body={messageFor(error)}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  if (!data) return null

  return (
    <>
      <div className={styles.head}>
        <h1 className={ui.pageTitle}>Tổng quan</h1>
        <span className={styles.dateline}>{fmtDateline(data.generated_at)}</span>
        <span className={styles.headSpacer} />
        <Segmented
          value={range}
          onChange={setRange}
          options={RANGES}
          ariaLabel="Khoảng thời gian"
        />
      </div>

      <ReadinessStrip />

      <div aria-busy={busy} className={busy ? styles.busy : undefined}>
        <OverviewBody data={data} agent={agent} range={range} onRange={setRange} />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------- body */

function OverviewBody({
  data,
  agent,
  range,
  onRange,
}: {
  data: InsightsOverview
  agent: string
  range: InsightRange
  onRange: (r: InsightRange) => void
}) {
  const { config } = useConfig()
  const total = data.calls.value

  /*
   * Two different zeros, and they are not the same screen.
   *
   * A clinic that has never taken a call needs to be told what will appear
   * here. A clinic opening the page at seven in the morning has simply not
   * been rung yet today, knows perfectly well what the page is, and wants the
   * week. The week behind the figure is what tells the two apart, and it is on
   * every response whatever the range.
   */
  if (total === 0) {
    const everRung = data.calls.trend.some((c) => c > 0)
    return everRung ? (
      <QuietDay agent={agent} week={data.calls.trend.reduce((a, b) => a + b, 0)} onRange={onRange} />
    ) : (
      <FirstDay agent={agent} hasPhone={Boolean(config.assigned_phone)} />
    )
  }

  const now = new Date(data.generated_at)
  const window_ = openWindow(config.operating_hours_by_weekday)
  const compare = rangeBefore(range, now.getDay() as Weekday)

  /*
   * The days.
   *
   * `by_day` has one entry for `today`, which is not a chart — a single column
   * says nothing a number has not already said. So a one-day range borrows the
   * figure's own seven-day trend, which the contract guarantees is always seven
   * points ending on the same day.
   */
  const days =
    data.by_day.length > 1
      ? data.by_day.map((d) => ({ date: new Date(`${d.date}T00:00:00`), count: d.count }))
      : daysEnding(now, data.calls.trend.length).map((date, i) => ({ date, count: data.calls.trend[i] }))
  const counts = days.map((d) => d.count)
  const dense = days.length > 12
  const last = days.length - 1

  /*
   * Today is never over when the page is read, so it is left out of the
   * average and out of "quietest day" — at nine in the morning it would drag
   * the line down and win the quietest-day label every single time.
   */
  const complete = counts.slice(0, last)
  const dayAverage = complete.length ? Math.round(complete.reduce((a, b) => a + b, 0) / complete.length) : null
  const busiestAt = lastIndexOf(counts, (a, b) => a > b)
  const quietestAt = lastIndexOf(complete, (a, b) => a < b)

  /*
   * Ticks. Seven days name every day. Thirty name the first day, today, and
   * each Monday far enough from both ends not to collide with them — about one
   * a week, which is the unit an owner thinks of a month in.
   */
  const tickFor = (date: Date, i: number): string => {
    if (i === last) return 'Hôm nay'
    if (!dense) return WEEKDAY_SHORT[date.getDay() as Weekday]
    if (i === 0) return fmtDayMonth(date)
    // Five slots clear of the first tick and six of "Hôm nay", which is wider: at a
    // phone's ~10px slots that is the least that keeps the two labels apart.
    return date.getDay() === 1 && i >= 5 && i <= last - 6 ? fmtDayMonth(date) : ''
  }

  const dayColumns: Column[] = days.map((d, i) => ({
    key: String(d.date.getTime()),
    tick: tickFor(d.date, i),
    value: d.count,
    now: i === last,
    cap: !dense || i === last || i === busiestAt || i === quietestAt,
    tip: {
      head: i === last ? `Hôm nay, ${fmtDayMonth(d.date)}` : fmtDayLong(d.date),
      value: `${d.count} cuộc`,
      meta:
        i === last
          ? `Tính đến ${fmtTime(data.generated_at)}`
          : dayAverage != null
            ? vsAverage(d.count, dayAverage)
            : undefined,
    },
  }))
  const dayTotal = counts.reduce((a, b) => a + b, 0)
  const weekTotal = data.calls.trend.reduce((a, b) => a + b, 0)

  /** One tip per sparkline point: the day, and the figure on it. */
  const trendDays = daysEnding(now, data.calls.trend.length)
  const trendTips = (points: number[], show: (v: number) => string): ChartTip[] =>
    points.map((v, i) => ({
      head: i === points.length - 1 ? `Hôm nay, ${fmtDayMonth(trendDays[i])}` : fmtDayLong(trendDays[i]),
      value: show(v),
    }))

  const share = (count: number): ChartTip => ({
    head: '',
    value: `${count} cuộc · ${fmtShare(count, total)}`,
    meta: perTen(count, total),
  })

  const intents: Ranked[] = [...data.by_intent]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      key: r.intent,
      label: INTENT_LABEL[r.intent],
      value: r.count,
      share: fmtShare(r.count, total),
      tip: { ...share(r.count), head: INTENT_LABEL[r.intent] },
    }))

  /*
   * The band's steps come from rank, not from the order the server sent: the
   * biggest share takes the full hue and the rest step down, so width and
   * darkness say the same thing. `unanswered` is the exception the eye should
   * find — it is the one the queue below acts on — so it also wears the dashed
   * swatch, which is this app's mark for a gap rather than an outcome.
   */
  const outcomeRank = [...data.by_outcome].sort((a, b) => b.count - a.count)
  const stepOf = (outcome: string): 1 | 2 | 3 | 4 | 5 => {
    const i = outcomeRank.findIndex((o) => o.outcome === outcome)
    return ([5, 3, 2, 1] as const)[Math.min(3, i < 0 ? 3 : i)]
  }
  const outcomes: Segment[] = data.by_outcome.map((o) => ({
    key: o.outcome,
    label: outcomeLabel(o.outcome, agent),
    value: o.count,
    note: `${o.count} · ${fmtShare(o.count, total)}`,
    step: stepOf(o.outcome),
    gap: o.outcome === 'unanswered',
    tip: { ...share(o.count), head: outcomeLabel(o.outcome, agent) },
  }))

  const hourTips: ChartTip[] = data.by_hour.map((count, h) => {
    const outside = window_ != null && (h < window_.fromHour || h >= window_.toHour)
    const part = count > 0 ? `${fmtShare(count, total)} số cuộc` : undefined
    return {
      head: `${h}:00 – ${h + 1}:00`,
      value: `${count} cuộc`,
      meta: outside ? ['Ngoài giờ mở cửa', part].filter(Boolean).join(' · ') : part,
    }
  })

  const busiest = data.by_hour
    .map((count, hour) => ({ count, hour }))
    .sort((a, b) => b.count - a.count)
    .filter((h) => h.count > 0)
    .slice(0, 2)
    .sort((a, b) => a.hour - b.hour)

  const durationMax = Math.max(...data.by_duration.map((d) => d.count))
  const durations: Column[] = data.by_duration.map((d) => ({
    key: d.bucket,
    tick: DURATION_LABEL[d.bucket],
    value: d.count,
    now: d.count === durationMax,
    cap: true,
    tip: { ...share(d.count), head: DURATION_LONG[d.bucket] },
  }))

  return (
    <div className={ui.stack} style={{ gap: 'var(--gap-card)' }}>
      <div className={styles.tiles}>
        <StatTile
          icon="answered"
          label={`Cuộc gọi ${agent} nghe`}
          amount={data.calls.value}
          previous={data.calls.previous}
          compare={compare}
          trend={data.calls.trend}
          trendTips={trendTips(data.calls.trend, (v) => `${v} cuộc`)}
          foot={
            range === 'today'
              ? `7 ngày qua · ${weekTotal} cuộc`
              : `Đông nhất ${fmtDayMonth(days[busiestAt].date)} · ${days[busiestAt].count} cuộc`
          }
        />
        <StatTile
          icon="appointment"
          label="Lịch hẹn giữ được"
          amount={data.bookings.value}
          previous={data.bookings.previous}
          compare={compare}
          trend={data.bookings.trend}
          trendTips={trendTips(data.bookings.trend, (v) => `${v} lịch hẹn`)}
          foot={`${fmtShare(data.bookings.value, total)} số cuộc thành lịch hẹn`}
        />
        <StatTile
          icon="time-saved"
          label="Trung bình mỗi cuộc"
          amount={data.avg_duration.value}
          format={fmtDuration}
          trend={data.avg_duration.trend}
          trendTips={trendTips(data.avg_duration.trend, fmtDuration)}
          foot={`Tổng ${fmtDuration(data.talk_time.value)} bạn không phải nghe máy`}
        />
        <StatTile
          icon="after-hours"
          label="Gọi ngoài giờ"
          amount={data.after_hours.value}
          previous={data.after_hours.previous}
          compare={compare}
          trend={data.after_hours.trend}
          trendTips={trendTips(data.after_hours.trend, (v) => `${v} cuộc`)}
          foot={window_ ? `Trước ${window_.from} và sau ${window_.to}` : 'Ngoài giờ mở cửa'}
        />
      </div>

      <div className={styles.split}>
        <Card
          title="Cuộc gọi theo ngày"
          subtitle={`${dense ? '30 ngày qua' : '7 ngày qua'} · ${dayTotal} cuộc`}
          actions={
            dayAverage != null ? (
              <span className={styles.avgKey}>
                <span className={styles.avgSwatch} aria-hidden="true" />
                Trung bình {dayAverage}/ngày
              </span>
            ) : null
          }
        >
          <Columns columns={dayColumns} label="Cuộc gọi theo ngày" average={dayAverage ?? undefined} fill />
        </Card>

        <Card title="Khách gọi để làm gì" subtitle={RANGE_SPAN[range]}>
          <RankedBars rows={intents} label="Khách gọi để làm gì" />
        </Card>
      </div>

      <div className={styles.trio}>
        <Card title="Giờ máy reo nhiều nhất" subtitle={RANGE_SPAN[range]}>
          <HourGrid
            hours={data.by_hour}
            tips={hourTips}
            ticks={['0h', '6h', '12h', '18h', '24h']}
            openFrom={window_?.fromHour ?? 8}
            openTo={window_?.toHour ?? 20}
            label={window_ ? `Giờ mở cửa ${window_.from} – ${window_.to}` : 'Chưa có giờ mở cửa'}
          />
          {busiest.length ? (
            <div className={styles.chartNote}>
              <span className={styles.chartNoteIcon}>
                <Icon name="info" size={16} />
              </span>
              <span>
                Đông nhất{' '}
                {busiest.map((h, i) => (
                  <span key={h.hour}>
                    {i > 0 ? ' và ' : ''}
                    <b>{h.hour}:00</b>
                  </span>
                ))}
                . Ngoài giờ mở cửa vẫn có <b>{fmtShare(data.after_hours.value, total)}</b> số cuộc.
              </span>
            </div>
          ) : null}
        </Card>

        <Card title="Cuộc gọi kết thúc thế nào" subtitle={`${total} cuộc`}>
          <Band segments={outcomes} label="Cuộc gọi kết thúc thế nào" />
        </Card>

        <Card title="Cuộc gọi kéo dài bao lâu" subtitle={`${total} cuộc`}>
          <Columns columns={durations} label="Cuộc gọi kéo dài bao lâu" height={124} />
          <div className={styles.chartNote}>
            <span className={styles.chartNoteIcon}>
              <Icon name="time-saved" size={16} />
            </span>
            <span>
              Trung bình <b>{fmtDuration(data.avg_duration.value)}</b> — cuộc dài thường là đặt lịch.
            </span>
          </div>
        </Card>
      </div>

      <AttentionCard items={data.attention} agent={agent} range={RANGE_IN[range]} />
    </div>
  )
}

/* -------------------------------------------------------------- first day */

/**
 * Nobody has rung yet.
 *
 * Zeroes in four tiles and four empty charts would be technically correct and
 * would teach nothing — so the page says what will appear here and points at
 * the one thing standing between the owner and a first call: a number, or a
 * receptionist who is not ready to answer it (ui-ux-principles §4).
 */
function FirstDay({ agent, hasPhone }: { agent: string; hasPhone: boolean }) {
  return (
    <Card>
      <div className={styles.firstDay}>
        <span className={styles.firstDayArt} aria-hidden="true">
          <Shape name="rising-arcs" size={104} />
        </span>
        <div className={styles.firstDayText}>
          <EmptyState title="Chưa có cuộc gọi nào">
            Khi số Fonnus đổ chuông, mỗi cuộc {agent} nghe sẽ hiện ở đây: giờ khách hay gọi, khách
            hỏi gì nhiều nhất, và những câu {agent} chưa trả lời được — để bạn bổ sung đúng chỗ.
          </EmptyState>
          {hasPhone ? (
            <Button variant="secondary" size="sm" onClick={() => (window.location.hash = appHref('le-tan'))}>
              Xem {agent} đã sẵn sàng chưa
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => (window.location.hash = appHref('so-dien-thoai'))}>
              Chọn số cho phòng khám
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * Today has not started yet — but last week did.
 *
 * One line and one press to the week, rather than four tiles of zeroes: the
 * figures exist, they are simply not about today.
 */
function QuietDay({ agent, week, onRange }: { agent: string; week: number; onRange: (r: InsightRange) => void }) {
  return (
    <Card>
      <div className={styles.firstDay}>
        <span className={styles.firstDayArt} aria-hidden="true">
          <Shape name="always-on" size={88} />
        </span>
        <div className={styles.firstDayText}>
          <h3 className={ui.cardTitle}>Hôm nay chưa ai gọi</h3>
          <p className={styles.firstDayBody}>
            {agent} vẫn đang trực máy. Bảy ngày vừa rồi phòng khám nhận{' '}
            <b>{week} cuộc</b> — mở “7 ngày” để xem khách hỏi gì nhiều nhất.
          </p>
          <Button variant="secondary" size="sm" onClick={() => onRange('7d')}>
            Xem 7 ngày
          </Button>
        </div>
      </div>
    </Card>
  )
}
