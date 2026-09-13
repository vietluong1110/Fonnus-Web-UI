import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { ApiError, api, isApiError, isCanceled, messageFor } from '../../../api'
import type { Checkout, NumberPattern, NumbersOverview, OwnedNumber, PoolNumber, PoolPage } from '../../../api'
import { appHref } from '../../../hooks/useRoute'
import { PHONE_BREAKPOINT, RAIL_BREAKPOINT, useIsNarrow } from '../../../hooks/useIsNarrow'
import { ContentSkeleton, RetryCard } from '../../Boot'
import { EmptyState, ui, useToast } from '../../ui'
import { useConfig } from '../../letan/store'
import { BuyPanel } from './BuyPanel'
import type { BuyState } from './BuyPanel'
import { NumberPanel } from './NumberPanel'
import { OwnedCard } from './OwnedCard'
import { PoolCard } from './PoolCard'
import { PanelFrame, useCopy } from './parts'
import type { PanelVariant } from './parts'
import { fmtNumber } from './labels'
import styles from './Numbers.module.css'

/*
 * `#/app/so-dien-thoai` — Số điện thoại.
 *   `#/app/so-dien-thoai/{id}`          one number the clinic owns
 *   `#/app/so-dien-thoai/mua/{digits}`  buying one from the pool
 *
 * The Cuộc gọi frame, chosen from three directions on the design canvas: the
 * clinic's numbers and the kho are the work column, and whatever the owner
 * pressed — a number, or the one being bought — is the 380px rail behind the
 * gutter. Below 1181px it opens as a drawer, on a phone as a whole-screen sheet.
 * What is open lives in the address, replaced on a desktop and pushed below it,
 * so Back closes an overlay (ui-ux-principles §12).
 *
 * It calls `api.numbers` directly: nothing outside this page reads numbers. The
 * one thing other tabs see — `assigned_phone`, in the Lễ tân header — the server
 * derives, so the page reloads the tenant record after a change.
 */

function useDebounced<T>(value: T, ms: number): T {
  const [out, setOut] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setOut(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return out
}

export function NumbersPage({ path }: { path: string[] }) {
  const { reload: reloadConfig } = useConfig()
  const { toast } = useToast()
  const copy = useCopy()
  const wide = !useIsNarrow(RAIL_BREAKPOINT)
  const phone = useIsNarrow(PHONE_BREAKPOINT)

  const buyNumber = path[0] === 'mua' && path[1] ? path[1].replace(/\D/g, '') : null
  const routeId = path[0] && path[0] !== 'mua' ? path[0] : null

  /* ------------------------------------------------- what the clinic owns */

  const [overview, setOverview] = useState<NumbersOverview | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    api.numbers
      .overview({ signal: ac.signal })
      .then((o) => {
        setOverview(o)
        setLoadError(null)
      })
      .catch((e: unknown) => {
        if (!isCanceled(e)) setLoadError(e)
      })
    return () => ac.abort()
  }, [attempt])

  const refresh = useCallback(() => {
    api.numbers
      .overview()
      .then(setOverview)
      .catch(() => {
        /* the next poll, or the owner's next action, tries again */
      })
  }, [])

  // Activation finishes on the carrier's clock. Watch it rather than ask for a reload.
  const activating = overview?.numbers.some((n) => n.status === 'activating') ?? false
  useEffect(() => {
    if (!activating) return
    const t = window.setInterval(refresh, 2500)
    return () => window.clearInterval(t)
  }, [activating, refresh])

  const numbers = overview?.numbers ?? []
  const nameOf = (rid: string) => overview?.receptionists.find((r) => r.id === rid)?.name ?? ''

  /* ------------------------------------------------------------- the kho */

  const [pattern, setPattern] = useState<NumberPattern | null>(null)
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 250)
  const limit = phone ? 8 : 9
  const poolKey = `${pattern}|${q}|${limit}`
  // Every cursor the owner has walked through for this query, so "back" is the one
  // before — the server's cursors only go forward. A new query starts at the top.
  const [trail, setTrail] = useState<{ key: string; cursors: (string | null)[] }>({ key: '', cursors: [null] })
  const cursors = trail.key === poolKey ? trail.cursors : [null]
  const cursor = cursors[cursors.length - 1]
  const asked = `${poolKey}|${cursor}`

  // The page on screen, named by the request that produced it. The grid is keyed
  // on that name, not on the request: keyed on the request, the leaving page
  // re-mounted and played in, and then the arriving page played in again.
  const [pool, setPool] = useState<{ page: PoolPage; at: string; no: number } | null>(null)
  const [poolBusy, setPoolBusy] = useState(true)
  const [poolError, setPoolError] = useState<unknown>(null)
  const [poolAttempt, setPoolAttempt] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    const no = cursors.length
    setPoolBusy(true)
    api.numbers
      .pool({ pattern, q, cursor, limit }, { signal: ac.signal })
      .then((p) => {
        setPool({ page: p, at: asked, no })
        setPoolError(null)
        setPoolBusy(false)
      })
      .catch((e: unknown) => {
        if (isCanceled(e)) return
        setPoolError(e)
        setPoolBusy(false)
      })
    return () => ac.abort()
    // `asked` and the trail's length follow `pattern`, `q`, `cursor` and `limit`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, q, cursor, limit, poolAttempt, numbers.length])

  // Only the page that has arrived can be paged from; while one is on its way the arrows wait.
  const ready = !poolBusy && pool?.at === asked
  const nextCursor = ready ? (pool?.page.next_cursor ?? null) : null
  const nextPage = () => {
    if (nextCursor != null) setTrail({ key: poolKey, cursors: [...cursors, nextCursor] })
  }
  const prevPage = () => setTrail({ key: poolKey, cursors: cursors.slice(0, -1) })
  const pageCount = pool ? Math.max(1, Math.ceil(pool.page.counts[pattern ?? 'all'] / limit)) : 1

  /** The receptionist the owner came from, when they pressed her dashed row. */
  const [wantFor, setWantFor] = useState<string | null>(null)
  const poolRef = useRef<HTMLDivElement>(null)

  /* -------------------------------------------------------- open and close */

  const pushed = useRef(false)

  const go = (...segments: string[]) => {
    const href = appHref('so-dien-thoai', ...segments)
    if (wide || path.length) {
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
      window.location.replace(appHref('so-dien-thoai'))
    }
  }, [])

  const openNumber = (id: string, e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    go(id)
  }

  /* -------------------------------------------------------------- buying */

  const [buy, setBuy] = useState<BuyState | null>(null)
  const buyRef = useRef(buy)
  buyRef.current = buy
  /** The tile each purchase started from: its lit digits and its price, until the hold quotes one. */
  const tileOf = useRef(new Map<string, PoolNumber>())
  const started = useRef<string | null>(null)

  const patchBuy = (patch: Partial<BuyState>) => setBuy((b) => (b ? { ...b, ...patch } : b))

  const hold = useCallback((number: string) => {
    api.numbers
      .hold(number)
      .then((h) => setBuy((b) => (b && b.number === number ? { ...b, hold: h, price: h.price_vnd, holdError: null } : b)))
      .catch((e: unknown) => setBuy((b) => (b && b.number === number ? { ...b, holdError: e } : b)))
  }, [])

  const chooseFor = (rid: string | null) => {
    setWantFor(rid)
    if (rid) setBuy((b) => (b && b.step === 'review' ? { ...b, receptionist: rid } : b))
    const el = poolRef.current
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 16) })
    el?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
  }

  // The address says which number is being bought; a hold follows it, and a
  // hold the owner walked away from is handed back.
  useEffect(() => {
    const prev = buyRef.current
    if (prev && prev.number !== buyNumber && prev.hold && prev.step !== 'done') {
      api.numbers.releaseHold(prev.hold.id).catch(() => {})
    }
    if (!buyNumber) {
      started.current = null
      if (prev) setBuy(null)
      return
    }
    if (!overview || started.current === buyNumber) return
    started.current = buyNumber
    const free = overview.receptionists.find((r) => !overview.numbers.some((n) => n.receptionist_id === r.id))
    setBuy({
      number: buyNumber,
      lit: tileOf.current.get(buyNumber)?.pattern_digits ?? 0,
      hold: null,
      price: tileOf.current.get(buyNumber)?.price_vnd ?? null,
      holdError: null,
      receptionist: wantFor ?? free?.id ?? overview.receptionists[0]?.id ?? '',
      method: prev?.method ?? 'vietqr',
      step: 'review',
      checkout: null,
      busy: false,
      error: null,
    })
    hold(buyNumber)
    // `wantFor` and `overview` are read at the moment a purchase starts, not followed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyNumber, overview == null, hold])

  useEffect(
    () => () => {
      const b = buyRef.current
      if (b?.hold && b.step !== 'done') api.numbers.releaseHold(b.hold.id).catch(() => {})
    },
    [],
  )

  const pay = () => {
    const b = buyRef.current
    if (!b?.hold || b.busy || !b.receptionist) return
    patchBuy({ busy: true, error: null })
    api.numbers
      .checkout(b.hold.id, { receptionist_id: b.receptionist, method: b.method })
      .then((co) => setBuy((cur) => (cur && cur.number === co.number ? { ...cur, busy: false, step: 'pay', checkout: co } : cur)))
      .catch((e: unknown) => {
        const expired = isApiError(e) && e.code === 'hold_expired'
        patchBuy({ busy: false, error: messageFor(e), ...(expired ? { hold: null } : {}) })
        if (expired) hold(b.number)
      })
  }

  // While the owner pays, ask the server; "Tôi đã chuyển khoản" only asks sooner.
  const [nudge, setNudge] = useState(0)
  const checkoutId = buy?.step === 'pay' ? (buy.checkout?.id ?? null) : null

  useEffect(() => {
    if (!checkoutId) return
    let alive = true
    let timer = 0

    const settle = (co: Checkout): boolean => {
      if (co.status === 'paid') {
        setBuy((b) => (b && b.checkout?.id === co.id ? { ...b, step: 'done', checkout: co } : b))
        const bought = co.owned
        if (bought) setOverview((ov) => (ov && !ov.numbers.some((n) => n.id === bought.id) ? { ...ov, numbers: [...ov.numbers, bought] } : ov))
        setWantFor(null)
        refresh()
        reloadConfig()
        return true
      }
      if (co.status === 'expired' || co.status === 'failed') {
        // The payment window closing does not lose the number: the hold keeps its own clock.
        const expired = co.status === 'expired'
        const h = buyRef.current?.hold
        const holdLive = !!h && Date.parse(h.held_until) > Date.now()
        const err = new ApiError({ kind: 'conflict', code: expired ? 'checkout_expired' : 'payment_failed' })
        setBuy((b) =>
          b && b.checkout?.id === co.id
            ? { ...b, step: 'review', checkout: null, error: messageFor(err), hold: holdLive ? b.hold : null }
            : b,
        )
        if (!holdLive) hold(co.number)
        return true
      }
      return false
    }

    const tick = () => {
      api.numbers
        .checkoutStatus(checkoutId)
        .then((co) => {
          if (alive && !settle(co)) timer = window.setTimeout(tick, 2000)
        })
        .catch(() => {
          if (alive) timer = window.setTimeout(tick, 3000)
        })
    }
    timer = window.setTimeout(tick, nudge ? 0 : 2000)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [checkoutId, nudge, refresh, reloadConfig, hold])

  const boughtId = buy?.step === 'done' ? (buy.checkout?.owned?.id ?? null) : null
  const [guideFor, setGuideFor] = useState<string | null>(null)

  const finish = () => {
    if (wide && boughtId) window.location.replace(appHref('so-dien-thoai', boughtId))
    else close()
  }

  const guide = () => {
    if (!boughtId) return
    setGuideFor(boughtId)
    window.location.replace(appHref('so-dien-thoai', boughtId))
  }

  /* ---------------------------------------------------------- one number */

  const [assignError, setAssignError] = useState<string | null>(null)
  useEffect(() => setAssignError(null), [routeId])

  const patchOwned = (o: OwnedNumber) =>
    setOverview((ov) => (ov ? { ...ov, numbers: ov.numbers.map((n) => (n.id === o.id ? o : n)) } : ov))

  // Pressing her tile is the change: optimistic, rolled back with the reason beside it.
  const assign = (n: OwnedNumber, rid: string) => {
    if (n.receptionist_id === rid) return
    patchOwned({ ...n, receptionist_id: rid })
    setAssignError(null)
    api.numbers
      .assign(n.id, rid)
      .then((o) => {
        patchOwned(o)
        reloadConfig()
        toast(`Từ giờ ${nameOf(rid)} nghe máy số ${fmtNumber(n.number)}.`)
      })
      .catch((e: unknown) => {
        patchOwned(n)
        setAssignError(messageFor(e))
      })
  }

  const saveForwarding = async (n: OwnedNumber, f: OwnedNumber['forwarding']) => {
    patchOwned(await api.numbers.setForwarding(n.id, f))
  }

  const release = async (n: OwnedNumber) => {
    await api.numbers.release(n.id)
    setOverview((ov) => (ov ? { ...ov, numbers: ov.numbers.filter((x) => x.id !== n.id) } : ov))
    reloadConfig()
    toast(`Đã trả lại số ${fmtNumber(n.number)} về kho.`)
    if (routeId) close()
  }

  /* --------------------------------------------------------------- panel */

  // On a desktop the rail is never empty while the clinic owns a number.
  const activeId = routeId ?? (wide && !buyNumber ? (numbers[0]?.id ?? null) : null)
  const active = numbers.find((n) => n.id === activeId) ?? null
  const view: 'buy' | 'number' | null = buyNumber && buy ? 'buy' : active ? 'number' : null
  const overlay = !wide && (buyNumber != null || routeId != null)

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

  if (!overview && loadError) {
    return <RetryCard title="Chưa tải được số điện thoại" body={messageFor(loadError)} onRetry={() => setAttempt((n) => n + 1)} />
  }
  if (!overview) return <ContentSkeleton />

  const panel = (variant: PanelVariant) => {
    if (view === 'buy' && buy)
      return (
        <PanelFrame variant={variant} title="Mua số" onClose={close}>
          <BuyPanel
            buy={buy}
            overview={overview}
            closable={variant === 'rail'}
            onReceptionist={(rid) => patchBuy({ receptionist: rid })}
            onMethod={(m) => patchBuy({ method: m, error: null })}
            onPay={pay}
            onBack={() => patchBuy({ step: 'review', checkout: null })}
            onCheckNow={() => setNudge((n) => n + 1)}
            onClose={close}
            onFinish={finish}
            onGuide={guide}
            onCopy={copy}
          />
        </PanelFrame>
      )
    if (view === 'number' && active)
      return (
        <PanelFrame variant={variant} title={fmtNumber(active.number)} onClose={close}>
          <NumberPanel
            key={`${active.id}|${guideFor === active.id}`}
            number={active}
            overview={overview}
            assignError={assignError}
            guideOpen={guideFor === active.id}
            onAssign={(rid) => assign(active, rid)}
            onForwarding={(f) => saveForwarding(active, f)}
            onRelease={() => release(active)}
            onCopy={copy}
          />
        </PanelFrame>
      )
    return null
  }

  const pick = (n: PoolNumber) => {
    tileOf.current.set(n.number, n)
    go('mua', n.number)
  }

  return (
    <>
      <div className={styles.head}>
        <h1 className={ui.pageTitle}>Số điện thoại</h1>
      </div>

      <div className={`${styles.work} ${wide ? '' : styles.workSolo}`}>
        <div className={styles.col}>
          <OwnedCard
            overview={overview}
            activeId={view === 'number' ? activeId : null}
            onOpen={openNumber}
            onChoose={chooseFor}
            onAdd={() => chooseFor(null)}
          />
          <div ref={poolRef}>
            <PoolCard
              page={pool?.page ?? null}
              busy={poolBusy}
              error={poolError}
              onRetry={() => setPoolAttempt((n) => n + 1)}
              pattern={pattern}
              onPattern={setPattern}
              search={search}
              onSearch={setSearch}
              q={q}
              pageNo={pool?.no ?? 1}
              pageCount={pageCount}
              onPrev={ready && cursors.length > 1 ? prevPage : null}
              onNext={nextCursor != null ? nextPage : null}
              selected={buyNumber}
              onPick={pick}
              wantName={wantFor ? nameOf(wantFor) : null}
              gridKey={pool?.at ?? ''}
            />
          </div>
        </div>

        {wide ? (
          <aside className={styles.rail} aria-label="Số đang xem">
            {panel('rail') ?? (
              <div className={styles.panel}>
                <div className={styles.body}>
                  <EmptyState title="Chọn một số trong kho">
                    Số bạn chọn hiện ở đây, cùng lễ tân sẽ nghe máy và giá — trước khi thanh toán.
                  </EmptyState>
                </div>
              </div>
            )}
          </aside>
        ) : null}
      </div>

      {overlay ? panel(phone ? 'sheet' : 'drawer') : null}
    </>
  )
}
