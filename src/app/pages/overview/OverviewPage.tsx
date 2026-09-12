import { useEffect, useState } from 'react'
import { Button, Icon, Shape } from '../../../design-system'
import { api, isCanceled, messageFor } from '../../../api'
import type { InsightRange, InsightsOverview } from '../../../api'
import { appHref } from '../../../hooks/useRoute'
import { ContentSkeleton, RetryCard } from '../../Boot'
import { Card, EmptyState, Segmented, ui } from '../../ui'
import { useConfig } from '../../letan/store'
import type { Weekday } from '../../letan/model'
import { Band, Columns, HourGrid, RankedBars } from './Charts'
import type { Column, Segment } from './Charts'
import { AttentionCard } from './Attention'
import { ReadinessStrip } from './ReadinessStrip'
import { StatTile } from './StatTile'
import {
  DURATION_LABEL,
  INTENT_LABEL,
  RANGES,
  RANGE_IN,
  RANGE_SPAN,
  WEEKDAY_SHORT,
  fmtDateline,
  fmtDayMonth,
  fmtDuration,
  fmtShare,
  outcomeLabel,
  rangeBefore,
} from './labels'
import styles from './Overview.module.css'

/*
 * `#/app` — Tổng quan.
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

      <div aria-busy={busy} style={busy ? { opacity: 0.55, transition: 'opacity 120ms' } : undefined}>
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
   * week — telling *them* "khi số Fonnus đổ chuông…" would read as the product
   * having forgotten them. The week behind the figure is what tells the two
   * apart, and it is on every response whatever the range.
   */
  if (total === 0) {
    const everRung = data.calls.trend.some((c) => c > 0)
    return everRung ? (
      <QuietDay agent={agent} week={data.calls.trend.reduce((a, b) => a + b, 0)} onRange={onRange} />
    ) : (
      <FirstDay agent={agent} hasPhone={Boolean(config.assigned_phone)} />
    )
  }

  const window_ = openWindow(config.operating_hours_by_weekday)

  /*
   * The day columns.
   *
   * `by_day` has one entry for `today`, which is not a chart — a single column
   * says nothing a number has not already said. So a one-day range borrows the
   * figure's own seven-day trend, which the contract guarantees is always seven
   * points ending on the same day.
   */
  const dayColumns: Column[] = (() => {
    if (data.by_day.length > 1) {
      const long = data.by_day.length > 10
      return data.by_day.map((d, i) => {
        const date = new Date(`${d.date}T00:00:00`)
        const last = i === data.by_day.length - 1
        return {
          key: d.date,
          label: long
            ? i % 5 === 0 || last
              ? fmtDayMonth(date.toISOString())
              : ''
            : last
              ? 'Hôm nay'
              : WEEKDAY_SHORT[date.getDay() as Weekday],
          value: d.count,
          now: last,
          title: `${fmtDayMonth(date.toISOString())}: ${d.count} cuộc`,
        }
      })
    }
    const end = new Date(data.generated_at)
    return data.calls.trend.map((count, i) => {
      const d = new Date(end)
      d.setDate(d.getDate() - (data.calls.trend.length - 1 - i))
      const last = i === data.calls.trend.length - 1
      return {
        key: d.toISOString().slice(0, 10),
        label: last ? 'Hôm nay' : WEEKDAY_SHORT[d.getDay() as Weekday],
        value: count,
        now: last,
        title: `${fmtDayMonth(d.toISOString())}: ${count} cuộc`,
      }
    })
  })()

  const dayAverage = Math.round(
    dayColumns.reduce((sum, c) => sum + c.value, 0) / Math.max(1, dayColumns.length),
  )
  /** The busiest day in the range — the one fact the figure alone does not carry. */
  const busiestDay = [...dayColumns].sort((a, b) => b.value - a.value)[0]
  const compare = rangeBefore(range, new Date(data.generated_at).getDay() as Weekday)
  const weekTotal = data.calls.trend.reduce((a, b) => a + b, 0)

  const intents = [...data.by_intent]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      key: r.intent,
      label: INTENT_LABEL[r.intent],
      value: r.count,
      note: `${r.count} · ${fmtShare(r.count, total)}`,
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
  }))

  const busiest = data.by_hour
    .map((count, hour) => ({ count, hour }))
    .sort((a, b) => b.count - a.count)
    .filter((h) => h.count > 0)
    .slice(0, 2)
    .sort((a, b) => a.hour - b.hour)

  const durationMax = Math.max(...data.by_duration.map((d) => d.count))
  const durations: Column[] = data.by_duration.map((d) => ({
    key: d.bucket,
    label: DURATION_LABEL[d.bucket],
    value: d.count,
    now: d.count === durationMax,
    title: `${DURATION_LABEL[d.bucket]}: ${d.count} cuộc`,
  }))

  return (
    <div className={ui.stack} style={{ gap: 'var(--gap-card)' }}>
      <div className={styles.tiles}>
        <StatTile
          icon="answered"
          label={`Cuộc gọi ${agent} nghe`}
          value={String(data.calls.value)}
          amount={data.calls.value}
          previous={data.calls.previous}
          compare={compare}
          trend={data.calls.trend}
          foot={
            range === 'today'
              ? `7 ngày qua · ${weekTotal} cuộc`
              : busiestDay
                ? `Đông nhất ${busiestDay.label} · ${busiestDay.value} cuộc`
                : undefined
          }
        />
        <StatTile
          icon="appointment"
          label="Lịch hẹn giữ được"
          value={String(data.bookings.value)}
          amount={data.bookings.value}
          previous={data.bookings.previous}
          compare={compare}
          trend={data.bookings.trend}
          foot={`${fmtShare(data.bookings.value, total)} số cuộc thành lịch hẹn`}
        />
        <StatTile
          icon="time-saved"
          label="Trung bình mỗi cuộc"
          value={fmtDuration(data.avg_duration.value)}
          trend={data.avg_duration.trend}
          foot={`Tổng ${fmtDuration(data.talk_time.value)} bạn không phải nghe máy`}
        />
        <StatTile
          icon="after-hours"
          label="Gọi ngoài giờ"
          value={String(data.after_hours.value)}
          amount={data.after_hours.value}
          previous={data.after_hours.previous}
          compare={compare}
          trend={data.after_hours.trend}
          foot={window_ ? `Trước ${window_.from} và sau ${window_.to}` : 'Ngoài giờ mở cửa'}
        />
      </div>

      <div className={styles.split}>
        <Card
          title="Cuộc gọi theo ngày"
          subtitle={`${dayColumns.length > 10 ? '30 ngày qua' : '7 ngày qua'} · ${dayColumns.reduce((s, c) => s + c.value, 0)} cuộc`}
          actions={<span className={styles.cardNote}>trung bình {dayAverage}/ngày</span>}
        >
          <Columns columns={dayColumns} height={150} />
        </Card>

        <Card title="Khách gọi để làm gì" subtitle={RANGE_SPAN[range]}>
          <RankedBars rows={intents} />
        </Card>
      </div>

      <div className={styles.trio}>
        <Card title="Giờ máy reo nhiều nhất" subtitle={RANGE_SPAN[range]}>
          <HourGrid
            hours={data.by_hour}
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
          <Band segments={outcomes} />
        </Card>

        <Card title="Cuộc gọi kéo dài bao lâu" subtitle={`${total} cuộc`}>
          <Columns columns={durations} height={92} />
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
 * figures exist, they are simply not about today, and the owner asking "hôm
 * nay thế nào" at 7am is better served by "chưa ai gọi" than by a screen of
 * charts that all read nought.
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
