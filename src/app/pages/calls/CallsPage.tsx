import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { api, isCanceled, messageFor } from '../../../api'
import type { CallDetail, CallFilter, CallListPage, CallSummary, InsightRange } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { PHONE_BREAKPOINT, RAIL_BREAKPOINT, useIsNarrow } from '../../../hooks/useIsNarrow'
import { ContentSkeleton, RetryCard } from '../../Boot'
import { ChipButton, EmptyState, Segmented, TextField, ui } from '../../ui'
import { useConfig } from '../../letan/store'
import { RANGES, fmtDateline } from '../overview/labels'
import { CallList } from './CallList'
import { CallPanel } from './CallPanel'
import { FILTERS, filterLabel } from './labels'
import styles from './Calls.module.css'

/*
 * `#/app/cuoc-goi` — Cuộc gọi. `#/app/cuoc-goi/{id}` opens one call.
 *
 * The Lễ tân frame, reused: the list is the work column and the open call is
 * the 380px rail beside it, behind the same hairline gutter. On Lễ tân that rail
 * is the try-out call; here it is the call that already happened. Below 1181px
 * the rail cannot fit, so the call comes in as a drawer from the right, and on
 * a phone as a sheet over the whole screen.
 *
 * The open call lives in the address, not in state, so Tổng quan can link to
 * one and Back closes an overlay. On a desktop, choosing another row *replaces*
 * the address — twenty calls looked at should not be twenty presses of Back.
 * On a tablet or phone it *pushes*, because there Back is how you close a call.
 *
 * It calls `api.calls` directly rather than through a provider: nothing outside
 * this page reads calls (CLAUDE.md — does more than one component need it?).
 */

function useDebounced<T>(value: T, ms: number): T {
  const [out, setOut] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setOut(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return out
}

/** A callback marked (or unmarked) as made, applied to a page of rows and its counts. */
function withCallback(page: CallListPage, id: string, doneAt: string | null): CallListPage {
  let delta = 0
  const calls = page.calls.map((c) => {
    if (c.id !== id || !c.callback) return c
    const wasOpen = c.callback.done_at == null
    const isOpen = doneAt == null
    delta = (isOpen ? 1 : 0) - (wasOpen ? 1 : 0)
    return { ...c, callback: { ...c.callback, done_at: doneAt } }
  })
  return { ...page, calls, counts: { ...page.counts, callback: Math.max(0, page.counts.callback + delta) } }
}

export function CallsPage({ path }: { path: string[] }) {
  const { config } = useConfig()
  const agent = config.agent_name.trim() || 'Linh'
  const routeId = path[0] ?? null
  const wide = !useIsNarrow(RAIL_BREAKPOINT)
  const phone = useIsNarrow(PHONE_BREAKPOINT)

  /* ------------------------------------------------------------- the list */

  const [range, setRange] = useState<InsightRange>('7d')
  const [filter, setFilter] = useState<CallFilter>('all')
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim(), 300)

  const [page, setPage] = useState<CallListPage | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [moreBusy, setMoreBusy] = useState(false)
  /** Which query the rows on screen answer — a late "more" for an old query is dropped. */
  const listKey = `${range}|${filter}|${q}`
  const listKeyRef = useRef(listKey)
  listKeyRef.current = listKey

  useEffect(() => {
    const ac = new AbortController()
    setBusy(true)
    api.calls
      .list({ range, filter, q }, { signal: ac.signal })
      .then((p) => {
        setPage(p)
        setError(null)
        setBusy(false)
      })
      .catch((e: unknown) => {
        if (isCanceled(e)) return
        setError(e)
        setBusy(false)
      })
    return () => ac.abort()
  }, [range, filter, q, attempt])

  const loadMore = () => {
    if (!page?.next_cursor || moreBusy) return
    const key = listKey
    setMoreBusy(true)
    api.calls
      .list({ range, filter, q, cursor: page.next_cursor })
      .then((next) => {
        if (listKeyRef.current !== key) return
        setPage((cur) => (cur ? { ...next, calls: [...cur.calls, ...next.calls] } : next))
      })
      .catch(() => {
        /* The button stays; pressing it again is the retry. */
      })
      .finally(() => setMoreBusy(false))
  }

  /* ------------------------------------------------------------ one call */

  // On a desktop the rail is never empty while there are calls: with nothing in
  // the address it shows the newest. Below that, nothing is open until chosen.
  const activeId = routeId ?? (wide ? (page?.calls[0]?.id ?? null) : null)

  const cache = useRef(new Map<string, CallDetail>())
  const [detail, setDetail] = useState<CallDetail | null>(null)
  const [detailError, setDetailError] = useState<unknown>(null)
  const [detailAttempt, setDetailAttempt] = useState(0)

  useEffect(() => {
    setDetailError(null)
    if (!activeId) {
      setDetail(null)
      return
    }
    const hit = cache.current.get(activeId)
    setDetail(hit ?? null)
    if (hit) return
    const ac = new AbortController()
    api.calls
      .get(activeId, { signal: ac.signal })
      .then((d) => {
        cache.current.set(d.id, d)
        setDetail(d)
      })
      .catch((e: unknown) => {
        if (!isCanceled(e)) setDetailError(e)
      })
    return () => ac.abort()
  }, [activeId, detailAttempt])

  /* ------------------------------------------------------- the callback */

  const [callbackBusy, setCallbackBusy] = useState(false)
  const [callbackError, setCallbackError] = useState<string | null>(null)
  useEffect(() => setCallbackError(null), [activeId])

  const applyCallback = useCallback((id: string, doneAt: string | null) => {
    setPage((p) => (p ? withCallback(p, id, doneAt) : p))
    const d = cache.current.get(id)
    if (d?.callback) {
      const next = { ...d, callback: { ...d.callback, done_at: doneAt } }
      cache.current.set(id, next)
      setDetail((cur) => (cur?.id === id ? next : cur))
    }
  }, [])

  /*
   * Optimistic: the dot leaves the row the moment the owner says they called.
   * A failure puts it back and says why beside the button — a toast would take
   * the message away while the wrong state was still on screen.
   */
  const setCallbackDone = (call: CallSummary, done: boolean) => {
    if (!call.callback || callbackBusy) return
    const before = call.callback.done_at
    applyCallback(call.id, done ? new Date().toISOString() : null)
    setCallbackBusy(true)
    setCallbackError(null)
    api.calls
      .setCallbackDone(call.id, done)
      .then((s) => applyCallback(s.id, s.callback?.done_at ?? null))
      .catch((e: unknown) => {
        applyCallback(call.id, before)
        setCallbackError(messageFor(e))
      })
      .finally(() => setCallbackBusy(false))
  }

  /* ------------------------------------------------------- open and close */

  /** Whether the open overlay was pushed by this page, so Back is the way out. */
  const pushed = useRef(false)

  const open = (id: string, e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    const href = appHref('cuoc-goi', id)
    if (wide || routeId) {
      window.location.replace(href)
    } else {
      pushed.current = true
      window.location.hash = href
    }
  }

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else {
      window.location.replace(appHref('cuoc-goi'))
    }
  }, [])

  const overlay = !wide && routeId != null

  // An overlay is the whole surface while it is up: the page behind must not
  // scroll under a thumb, and Escape closes it.
  useEffect(() => {
    if (!overlay) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [overlay, close])

  /* -------------------------------------------------------------- render */

  if (!page && busy) return <ContentSkeleton />
  if (!page && error) {
    return <RetryCard title="Chưa tải được cuộc gọi" body={messageFor(error)} onRetry={() => setAttempt((n) => n + 1)} />
  }
  if (!page) return null

  const calls = page.calls
  const index = activeId ? calls.findIndex((c) => c.id === activeId) : -1
  const step = (to: number) => () => window.location.replace(appHref('cuoc-goi', calls[to].id))
  const pager =
    index >= 0
      ? {
          label: `${index + 1} / ${calls.length}`,
          prev: index > 0 ? step(index - 1) : null,
          next: index < calls.length - 1 ? step(index + 1) : null,
        }
      : undefined

  const resetFilters = () => {
    setFilter('all')
    setSearch('')
  }

  /*
   * Three empty lists, three different sentences (ui-ux-principles §4, §10):
   * nothing matches what you asked for; nobody has rung yet today; nobody has
   * ever rung. Telling a clinic with a month of calls "khi số Fonnus đổ
   * chuông…" because a filter came back empty reads as the product forgetting it.
   */
  const empty =
    q || filter !== 'all' ? (
      <div className={styles.emptyWrap}>
        <EmptyState title="Không có cuộc gọi nào khớp">
          Thử bỏ bớt bộ lọc, hoặc tìm bằng vài số cuối của số điện thoại.
        </EmptyState>
        <Button variant="secondary" size="sm" onClick={resetFilters}>
          Xem tất cả
        </Button>
      </div>
    ) : range === 'today' ? (
      <div className={styles.emptyWrap}>
        <EmptyState title="Hôm nay chưa ai gọi">{agent} vẫn đang trực máy — cuộc gọi đầu tiên sẽ hiện ở đây.</EmptyState>
        <Button variant="secondary" size="sm" onClick={() => setRange('7d')}>
          Xem 7 ngày
        </Button>
      </div>
    ) : (
      <EmptyState title="Chưa có cuộc gọi nào">
        Khi số Fonnus đổ chuông, mỗi cuộc {agent} nghe sẽ hiện ở đây: khách hỏi gì, {agent} trả lời ra sao, và việc bạn
        cần làm tiếp.
      </EmptyState>
    )

  const panel = (variant: 'rail' | 'drawer' | 'sheet') =>
    activeId ? (
      <CallPanel
        variant={variant}
        id={activeId}
        detail={detail}
        error={detailError}
        onRetry={() => setDetailAttempt((n) => n + 1)}
        agent={agent}
        onCallback={setCallbackDone}
        callbackBusy={callbackBusy}
        callbackError={callbackError}
        onOpen={open}
        onClose={close}
        pager={pager}
      />
    ) : null

  const showRail = wide && activeId != null

  return (
    <>
      <div className={styles.head}>
        <h1 className={ui.pageTitle}>Cuộc gọi</h1>
        <span className={styles.dateline}>{fmtDateline(page.generated_at)}</span>
        <span className={styles.headSpacer} />
        <span className={styles.range}>
          <Segmented value={range} onChange={setRange} options={RANGES} ariaLabel="Khoảng thời gian" fill={phone} />
        </span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.chips} role="group" aria-label="Lọc cuộc gọi">
          {FILTERS.map((f) => (
            <ChipButton key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f === 'callback' ? <span className={styles.chipDot} aria-hidden="true" /> : null}
              <span>{filterLabel(f, agent)}</span>
              <span className={styles.chipCount}>{page.counts[f]}</span>
            </ChipButton>
          ))}
        </div>
        <TextField
          className={styles.search}
          compact
          type="text"
          inputMode="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm số điện thoại hoặc điều khách hỏi"
          aria-label="Tìm cuộc gọi"
          prefix={<Icon name="search" size={16} />}
        />
      </div>

      <div className={`${styles.work} ${showRail ? '' : styles.workSolo}`}>
        <div aria-busy={busy} className={busy ? styles.busy : undefined}>
          <CallList
            page={page}
            agent={agent}
            activeId={activeId}
            onOpen={open}
            onMore={loadMore}
            moreBusy={moreBusy}
            empty={empty}
          />
        </div>
        {showRail ? (
          <aside className={styles.rail} aria-label="Cuộc gọi đang xem">
            {panel('rail')}
          </aside>
        ) : null}
      </div>

      {overlay && !phone ? (
        <>
          <div className={styles.scrim} onClick={close} />
          <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Cuộc gọi">
            {panel('drawer')}
          </div>
        </>
      ) : null}
      {overlay && phone ? panel('sheet') : null}
    </>
  )
}
