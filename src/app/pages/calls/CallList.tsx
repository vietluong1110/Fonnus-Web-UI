import { Fragment } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import type { CallListPage, CallSummary } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { Card } from '../../ui'
import { fmtDayMonth, fmtDuration, fmtTime } from '../overview/labels'
import { callbackOpen, callerLine, dayName, fmtPhone, localDate, resultOf } from './labels'
import styles from './Calls.module.css'

/**
 * The calls, as one card of rows under day bands (ui-ux-principles §3: a list
 * is one card). The five columns hold one vertical each at every width the
 * list is wide enough for; below that — a phone, or the list beside nothing on
 * a narrow tablet — the same markup folds to two lines by a container query on
 * the list, not on the viewport.
 *
 * Every row is a link to its own address, so middle-click and "open in new tab"
 * work; the page decides whether a plain click pushes or replaces.
 */
export function CallList({
  page,
  agent,
  activeId,
  onOpen,
  onMore,
  moreBusy,
  empty,
}: {
  page: CallListPage
  agent: string
  activeId: string | null
  onOpen: (id: string, e: MouseEvent) => void
  onMore: () => void
  moreBusy: boolean
  /** What to say instead of rows. Rendered only when there are none. */
  empty: ReactNode
}) {
  const now = new Date(page.generated_at)
  const perDay = new Map(page.by_day.map((d) => [d.date, d.count]))

  const groups: { key: string; calls: CallSummary[] }[] = []
  for (const call of page.calls) {
    const key = localDate(call.started_at)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.calls.push(call)
    else groups.push({ key, calls: [call] })
  }

  return (
    <Card className={styles.listCard}>
      {page.calls.length ? (
        <div className={styles.rows}>
          <div className={styles.thead} aria-hidden="true">
            <span />
            <span>Giờ</span>
            <span>Khách gọi</span>
            <span>Khách hỏi về</span>
            <span>Kết quả</span>
            <span className={styles.right}>Dài</span>
          </div>

          {groups.map((g) => (
            <Fragment key={g.key}>
              <div className={styles.band}>
                <span>{dayName(g.calls[0].started_at, now)}</span>
                <span className={styles.bandDate}>{fmtDayMonth(g.calls[0].started_at)}</span>
                <span className={styles.bandCount}>{perDay.get(g.key) ?? g.calls.length} cuộc</span>
              </div>
              {g.calls.map((call) => (
                <Row key={call.id} call={call} agent={agent} active={call.id === activeId} onOpen={onOpen} />
              ))}
            </Fragment>
          ))}
        </div>
      ) : (
        empty
      )}

      {page.next_cursor ? (
        <div className={styles.more}>
          <Button variant="secondary" size="sm" onClick={onMore} disabled={moreBusy}>
            {moreBusy ? 'Đang tải…' : 'Xem thêm cuộc gọi'}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

function Row({
  call,
  agent,
  active,
  onOpen,
}: {
  call: CallSummary
  agent: string
  active: boolean
  onOpen: (id: string, e: MouseEvent) => void
}) {
  const result = resultOf(call, agent)
  const open = callbackOpen(call)
  return (
    <a
      className={`${styles.row} ${active ? styles.rowOn : ''}`}
      href={appHref('cuoc-goi', call.id)}
      onClick={(e) => onOpen(call.id, e)}
      aria-current={active ? 'true' : undefined}
    >
      <span className={styles.cDot}>
        {open ? <span className={styles.dot} role="img" aria-label="Cần gọi lại" /> : null}
      </span>
      <span className={styles.cTime}>
        <span>{fmtTime(call.started_at)}</span>
        {call.after_hours ? <span className={styles.sub}>ngoài giờ</span> : null}
      </span>
      <span className={styles.cCaller}>
        <span className={styles.number}>{fmtPhone(call.caller_number)}</span>
        <span className={styles.sub}>{callerLine(call)}</span>
      </span>
      <span className={styles.cMeta}>
        <span className={`${styles.cAsk} ${call.outcome === 'abandoned' ? styles.muted : ''}`}>{call.topic}</span>
        {/* She did not know something: the one result that is a gap, so it wears the dashed mark (§1). */}
        <span className={`${styles.cOut} ${call.gap ? styles.outGap : ''}`}>
          <Icon name={result.icon} size={20} />
          <span className={styles.outLabel}>{result.label}</span>
        </span>
      </span>
      <span className={styles.cDur}>{fmtDuration(call.duration_s)}</span>
    </a>
  )
}
