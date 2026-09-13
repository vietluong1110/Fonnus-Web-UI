import type { NumberPattern, PoolNumber, PoolPage } from '../../../api'
import { messageFor } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { Card, ChipButton, EmptyState, IconButton, TextField } from '../../ui'
import { PATTERNS, PATTERN_LABEL, tileFine } from './labels'
import { NumberText } from './parts'
import styles from './Numbers.module.css'

/*
 * "Kho số" — the shared pool.
 *
 * Nine numbers at a time, lucky ones first: an owner choosing a number is
 * unsure and in a hurry, which is exactly when a long list stops helping. Each
 * tile carries its own city and price, even while every number costs the same —
 * the kho will hold other cities and prices, and a price in the head would have
 * to move then. Search is by the digits a number ends in; the chips are the
 * shapes Vietnamese callers remember.
 *
 * Pages go both ways: a button that only shows "others" loses the number the
 * owner almost picked.
 *
 * A number another clinic is paying for is hatched — the planner's "not
 * available" — which is also how the owner sees that the pool is shared.
 */
export function PoolCard({
  page,
  busy,
  error,
  onRetry,
  pattern,
  onPattern,
  search,
  onSearch,
  q,
  pageNo,
  pageCount,
  onPrev,
  onNext,
  selected,
  onPick,
  wantName,
  gridKey,
}: {
  page: PoolPage | null
  busy: boolean
  error: unknown
  onRetry: () => void
  pattern: NumberPattern | null
  onPattern: (p: NumberPattern | null) => void
  search: string
  onSearch: (v: string) => void
  /** The search as applied, which is what the tiles light. */
  q: string
  /** The page on screen, from 1. */
  pageNo: number
  pageCount: number
  onPrev: (() => void) | null
  onNext: (() => void) | null
  selected: string | null
  onPick: (n: PoolNumber) => void
  /** The receptionist this purchase is for, when the owner came from her row. */
  wantName: string | null
  /** Names the page on screen, so the grid plays in once per arrival and never for the page leaving. */
  gridKey: string
}) {
  return (
    <Card title="Kho số" subtitle={wantName ? `Chọn số cho ${wantName}` : undefined}>
      <div className={styles.poolTools}>
        <TextField
          className={styles.search}
          compact
          numeric
          inputMode="numeric"
          value={search}
          onChange={(e) => onSearch(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="Tìm đuôi số — VD: 68"
          aria-label="Tìm theo đuôi số"
          prefix={<Icon name="search" size={16} />}
          suffix={search ? <IconButton name="x" label="Xoá tìm kiếm" size={14} onClick={() => onSearch('')} /> : null}
        />
        <div className={styles.chips} role="group" aria-label="Kiểu số">
          {[null, ...PATTERNS].map((p) => (
            <ChipButton key={p ?? 'all'} selected={pattern === p} onClick={() => onPattern(p)}>
              <span>{p ? PATTERN_LABEL[p] : 'Tất cả'}</span>
              <span className={styles.chipCount}>{page ? page.counts[p ?? 'all'] : ''}</span>
            </ChipButton>
          ))}
        </div>
      </div>

      {!page && error ? (
        <div className={styles.notice} role="alert">
          <span className={styles.factTitle}>Chưa tải được kho số</span>
          <span className={styles.factSub}>{messageFor(error)}</span>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {page && page.numbers.length === 0 ? (
        <EmptyState title={q ? `Không còn số có ${q}` : 'Kho đang hết số kiểu này'}>
          Thử bớt một chữ số, hoặc bấm “Tất cả” để xem các số khác.
        </EmptyState>
      ) : null}

      <div key={gridKey} className={styles.grid} aria-busy={busy}>
        {page?.numbers.map((n, i) => {
          const on = n.number === selected
          return (
            <button
              key={n.number}
              type="button"
              className={`${styles.tile} ${on ? styles.tileOn : ''} ${n.held ? styles.tileHeld : ''}`}
              style={{ animationDelay: `${Math.min(i * 25, 250)}ms` }}
              onClick={() => onPick(n)}
              disabled={n.held}
              aria-pressed={on}
              title={n.held ? 'Có phòng khám khác đang giữ số này' : undefined}
            >
              <NumberText number={n.number} lit={n.pattern_digits} q={q} className={styles.tileNumber} />
              {n.held ? (
                <span className={styles.tileTag}>Có người đang giữ</span>
              ) : n.pattern ? (
                <span className={styles.tileTag}>
                  <span className={styles.tagDot} />
                  {PATTERN_LABEL[n.pattern]}
                </span>
              ) : null}
              <span className={styles.tileFine}>{tileFine(n)}</span>
            </button>
          )
        })}
      </div>

      {page && page.numbers.length ? (
        <div className={styles.poolFoot}>
          <span className={styles.footNote}>{page.counts.all} số trong kho</span>
          {pageCount > 1 ? (
            <nav className={styles.pager} aria-label="Trang số">
              <button type="button" className={styles.pageBtn} onClick={onPrev ?? undefined} disabled={!onPrev} aria-label="Trang trước">
                <Icon name="chevron-left" size={16} />
              </button>
              <span className={`${styles.pageNo} ${styles.num}`} aria-live="polite">
                {pageNo} / {pageCount}
              </span>
              <button type="button" className={styles.pageBtn} onClick={onNext ?? undefined} disabled={!onNext} aria-label="Trang sau">
                <Icon name="chevron-right" size={16} />
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
