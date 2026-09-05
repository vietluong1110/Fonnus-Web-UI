import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, Ref, RefObject, TransitionEvent } from 'react'
import { Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { useElementWidth } from '../../../hooks/useElementWidth'
import { DENTAL_NOT_OFFERED_IDEAS, DURATION_OPTIONS, LABELS, groupNamesOf, groupOf } from '../defaults'
import type { Bundle, PaymentMethod, PriceUnit, PricingDisclosurePolicy, PromoService, Promotion, ServiceRow } from '../model'
import { newId } from '../model'
import { pricedCount } from '../readiness'
import { useConfig, useDraft } from '../store'
import { PRICE_QUALIFIER } from '../system'
import { AddButton, Card, ChipButton, ChipInput, DateRangeField, DeleteButton, EmptyState, MoneyField, NumberField, RadioGroup, SaveBar, Segmented, SelectField, Switch, TextField, ui, useAppear } from '../../ui'
import { bundleSentence, localIso, priceSentence, priceShort, promoOffer, promoSentence } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

export { priceSentence } from './answers'

const KEYS = ['service_groups', 'service_catalog', 'pricing_disclosure_policy', 'services_not_offered', 'package_bundles', 'instalment_options', 'payment_methods', 'payment_methods_other', 'active_promotions'] as const

const POLICIES: PricingDisclosurePolicy[] = ['range', 'exact', 'defer']

/** How long a closed row keeps its editor in the tree so the fold can play out — comfortably past the 200ms it takes. */
const FOLD_MS = 400

/** Under this much card, the three policy labels no longer fit one segmented row and become a list. */
const POLICY_STACKED = 340

/** A press that travels this far is a drag, not a click. */
const DRAG_SLOP = 6

function policyHint(policy: PricingDisclosurePolicy, agent: string): string {
  switch (policy) {
    case 'range':
      return `${agent} đọc "từ … đến …" rồi thêm "${PRICE_QUALIFIER}" — luật yêu cầu, không tắt được. Khuyên dùng: khách có con số để yên tâm, phòng khám không bị trói vào một mức.`
    case 'exact':
      return `${agent} đọc một con số — mức "Giá từ" của mỗi dòng — và vẫn thêm "${PRICE_QUALIFIER}".`
    default:
      return `${agent} không đọc số nào, chỉ mời khách đến khám. Bảng giá bên dưới vẫn dùng để trả lời "có làm không" và để đặt hẹn.`
  }
}

type PromoState = 'live' | 'soon' | 'past'

function promoState(p: Promotion, today: string): PromoState {
  if (p.valid_to && p.valid_to < today) return 'past'
  if (p.valid_from && p.valid_from > today) return 'soon'
  return 'live'
}

const PROMO_LABEL: Record<PromoState, string> = { live: 'Đang chạy', soon: 'Sắp chạy', past: 'Hết hạn' }

/** A drawn icon per payment method; the two wallets share one, which is honest — they are the same gesture. */
const PAY_ICON: Record<PaymentMethod, IconName> = { cash: 'cash', transfer: 'transfer', card: 'card', momo: 'wallet', zalopay: 'wallet' }

type InstalmentChoice = '' | 'yes' | 'no'

/**
 * The one sentence that means "we do not do instalments". `instalmentExchange`
 * already reads a leading "không" as the negative answer, so the choice is
 * stored in the catalogue's own free-text field rather than in a new flag.
 */
const NO_INSTALMENT = 'Không hỗ trợ trả góp'
const isNoInstalment = (v: string) => /^không/i.test(v.trim())

/** "Linh nói:" and the line — under the control that changes it, the way the hours page reads its week back. */
function Said({ who, children }: { who: string; children: ReactNode }) {
  return (
    <p className={styles.said}>
      <span className={styles.saidWho}>{who} nói:</span> {children}
    </p>
  )
}

/* ------------------------------------------------------------------ drag */

interface DragState {
  id: string
  pointerId: number
  startY: number
  /** Pointer y minus the row's top at the press, so the row stays where it was grabbed. */
  grabOffset: number
  pointerY: number
  translate: number
  el: HTMLElement
  moved: boolean
  place: { group: string; index: number } | null
}

/**
 * Dragging a row to another place in the list, groups included.
 *
 * Pointer events on the row's head: press, travel six pixels, and the row
 * lifts and follows the pointer. The list re-sorts *live* as it crosses the
 * others — `onPlace` rewrites the draft — and `useFlip` slides every other
 * row into its new slot, so nothing jumps. After each re-sort the dragged
 * row's slot has moved; the layout effect puts it back under the pointer in
 * the same paint. Mouse and pen only: a touch that travels is a scroll, and
 * taking it would cost the phone its page.
 *
 * Once a drag is live the *window* hears the moves and the release, not the
 * head: a regroup remounts the row (each group is its own card), which drops
 * the head's pointer capture mid-drag — and the pointer spends half the
 * journey over group bands and gaps that have no head under them at all.
 */
function useRowDrag(listRef: RefObject<HTMLDivElement | null>, onLift: (id: string) => void, onPlace: (id: string, group: string, index: number) => void) {
  const [dragId, setDragId] = useState<string | null>(null)
  const st = useRef<DragState | null>(null)
  const suppressClick = useRef(false)
  // The callbacks close over the current draft; the window listeners attach
  // once per drag. Refs keep the second placement from writing through the
  // array the first one already replaced.
  const cb = useRef({ onLift, onPlace })
  cb.current = { onLift, onPlace }

  const follow = () => {
    const s = st.current
    if (!s) return
    // The row is keyed, but a regroup re-parents it — an unmount and a mount.
    // Pick up the new element, and its transform starts again from zero.
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(s.id)}"]`)
    if (el && el !== s.el) {
      s.el = el
      s.translate = 0
    }
    const base = s.el.getBoundingClientRect().top - s.translate
    s.translate = s.pointerY - s.grabOffset - base
    s.el.style.transform = `translateY(${s.translate}px)`
  }

  useLayoutEffect(() => {
    if (dragId) follow()
  })

  /** Where the pointer would drop the row: the group whose band is above it, and how many of that group's other rows it has passed. */
  const placementAt = (y: number, id: string) => {
    const list = listRef.current
    if (!list) return null
    const heads = [...list.querySelectorAll<HTMLElement>('[data-group-head]')]
    if (!heads.length) return null
    let group = heads[0].dataset.groupHead ?? ''
    for (const h of heads) if (h.getBoundingClientRect().top <= y) group = h.dataset.groupHead ?? ''
    let index = 0
    for (const r of list.querySelectorAll<HTMLElement>('[data-row-id]')) {
      if (r.dataset.group !== group || r.dataset.rowId === id) continue
      const rr = r.getBoundingClientRect()
      if (y > rr.top + rr.height / 2) index += 1
    }
    return { group, index }
  }

  /** One step of a live drag: follow the pointer, and re-sort when it crosses into a new slot. */
  const advance = (y: number) => {
    const s = st.current
    if (!s || !s.moved) return
    s.pointerY = y
    follow()
    const place = placementAt(y, s.id)
    if (place && (place.group !== s.place?.group || place.index !== s.place?.index)) {
      s.place = place
      cb.current.onPlace(s.id, place.group, place.index)
    }
  }

  const endDrag = () => {
    const s = st.current
    if (!s) return
    if (s.moved) {
      s.el.style.transform = ''
      // The click that follows this release is the end of a drag, not a press
      // on the row. If no click comes, the flag must not wait for the next one.
      suppressClick.current = true
      window.setTimeout(() => {
        suppressClick.current = false
      }, 300)
      setDragId(null)
    }
    st.current = null
  }

  useEffect(() => {
    if (!dragId) return
    const onMove = (e: PointerEvent) => {
      if (st.current?.pointerId === e.pointerId) advance(e.clientY)
    }
    const onEnd = (e: PointerEvent) => {
      if (st.current?.pointerId === e.pointerId) endDrag()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
    // `advance` and `endDrag` are stable in what matters: they read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId])

  const onPointerDown = (id: string) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || e.pointerType === 'touch') return
    const el = e.currentTarget.closest<HTMLElement>('[data-row-id]')
    if (!el) return
    st.current = { id, pointerId: e.pointerId, startY: e.clientY, grabOffset: e.clientY - el.getBoundingClientRect().top, pointerY: e.clientY, translate: 0, el, moved: false, place: null }
    // Capture covers the slop phase; past it the window listeners take over.
    // A pointer the browser does not know (a synthetic event) has nothing to capture.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* no capture; the head still hears the events while the pointer is over it */
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = st.current
    if (!s || s.pointerId !== e.pointerId || s.moved) return
    if (Math.abs(e.clientY - s.startY) < DRAG_SLOP) return
    s.moved = true
    s.place = placementAt(s.startY, s.id)
    setDragId(s.id)
    cb.current.onLift(s.id)
    advance(e.clientY)
  }

  /** A release inside the slop is a click on the row; the head clears the press it was holding. */
  const onPointerEnd = (e: ReactPointerEvent<HTMLElement>) => {
    const s = st.current
    if (s && s.pointerId === e.pointerId && !s.moved) st.current = null
  }

  /** True once, for the click that ends a drag. */
  const consumeClick = () => {
    const was = suppressClick.current
    suppressClick.current = false
    return was
  }

  return { dragId, consumeClick, handlersFor: (id: string) => ({ onPointerDown: onPointerDown(id), onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd }) }
}

/**
 * FLIP for the rows around a drag: remember where every `[data-flip]` sat
 * last commit, and when one has moved, start it from where it was and let it
 * settle where it is now — the house lift-and-settle, on the rows that were
 * not touched. Only while a drag is on; an editor opening pushes rows down
 * too, and that already has its own motion.
 */
function useFlip(listRef: RefObject<HTMLDivElement | null>, active: boolean) {
  const prev = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const next = new Map<string, number>()
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const el of list.querySelectorAll<HTMLElement>('[data-flip]')) {
      const key = el.dataset.flip ?? ''
      const top = el.getBoundingClientRect().top
      next.set(key, top)
      const before = prev.current.get(key)
      if (active && !still && before !== undefined && Math.abs(before - top) > 0.5 && el.dataset.dragging !== 'true') {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.7,.3,1)' })
      }
    }
    prev.current = next
  })
}

/* ------------------------------------------------------------------ rows */

/**
 * One line of a list that opens into its editor.
 *
 * Closed, it *reads*: the summary is the whole row, in fixed columns so every
 * price in the list sits on one vertical. Open, the same line stays as the
 * row's head — it keeps updating as the fields under it are typed into, so
 * the owner watches the list they are making — and the editor grows out
 * beneath it on the house lift-and-settle. Only one row on the page is open
 * at a time (`openId` in the section), and a press anywhere else closes it:
 * twelve rows in edit mode at once was a hundred controls and nothing to read.
 *
 * Every list on this page is built from this row — services, combos,
 * promotions — so all three sections share one geometry: the row spans its
 * card's content width exactly, and its text sits 12px inside that.
 *
 * `mounted` outlives `open` by one fold so the close can animate; the parent
 * owns both because it is the parent that swaps one open row for another.
 */
function ExpandRow({
  rowId,
  rowRef,
  group,
  open,
  mounted,
  unfilled,
  dragging,
  drag,
  onToggle,
  summary,
  children,
}: {
  rowId: string
  /** From `useAppear`: the row grows into place and collapses out of it. */
  rowRef?: Ref<HTMLDivElement>
  group?: string
  open: boolean
  mounted: boolean
  unfilled?: boolean
  dragging?: boolean
  /** Pointer handlers for the head when the row can be dragged; none for a list that cannot be reordered. */
  drag?: ReturnType<ReturnType<typeof useRowDrag>['handlersFor']>
  onToggle: () => void
  summary: ReactNode
  children: ReactNode
}) {
  // Clipping is only for the fold itself. Once the editor has settled it lets
  // go, or a focus ring on the first pill inside would be cut off. Reduced
  // motion never fires `transitionend`, so the stylesheet lifts the clip there.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!open) {
      setSettled(false)
      return
    }
    const t = window.setTimeout(() => setSettled(true), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [open])
  const onEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && open) setSettled(true)
  }
  return (
    <div
      ref={rowRef}
      className={`${styles.svc} ${open ? styles.svcOpen : ''} ${unfilled ? styles.svcUnfilled : ''} ${dragging ? styles.svcDragging : ''}`}
      data-row-id={rowId}
      data-group={group}
      data-flip={rowId}
      data-dragging={dragging ? 'true' : undefined}
    >
      <button type="button" className={styles.svcHead} aria-expanded={open} onClick={onToggle} {...drag}>
        {drag ? (
          <span className={styles.svcGrip} aria-hidden="true">
            <Icon name="grip" size={12} />
          </span>
        ) : null}
        {summary}
        <span className={`${styles.svcChevron} ${open ? styles.svcChevronOpen : ''}`}>
          <Icon name="chevron-down" size={16} />
        </span>
      </button>
      <div className={`${styles.svcBody} ${open ? styles.svcBodyOpen : ''} ${open && settled ? styles.svcBodySettled : ''}`} onTransitionEnd={onEnd}>
        <div className={styles.svcBodyInner}>{mounted ? children : null}</div>
      </div>
    </div>
  )
}

/**
 * The rows of one group, folding shut when the group is collapsed — the same
 * 0fr → 1fr grid fold as a row's editor, and the same clipping rule: only
 * while moving, or a dragged row could never ride over the cards below.
 */
function GroupBody({ open, children }: { open: boolean; children: ReactNode }) {
  const [settled, setSettled] = useState(true)
  useEffect(() => {
    if (!open) {
      setSettled(false)
      return
    }
    const t = window.setTimeout(() => setSettled(true), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [open])
  return (
    <div
      className={`${styles.svcGroupBody} ${open ? styles.svcGroupBodyOpen : ''} ${open && settled ? styles.svcGroupBodySettled : ''}`}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && open) setSettled(true)
      }}
    >
      <div className={styles.svcGroupBodyInner}>{children}</div>
    </div>
  )
}

/** The price column of a row: "300–500 nghìn / lần", "miễn phí", or the one thing the row still needs. */
function PriceCell({ from, to, unit }: { from: number | null; to: number | null; unit?: PriceUnit }) {
  const price = priceShort(from, to)
  if (price == null) return <span className={styles.svcMissing}>chưa có giá</span>
  return (
    <>
      {price}
      {unit && price !== 'miễn phí' ? <span className={styles.svcUnit}> {LABELS.priceUnit[unit]}</span> : null}
    </>
  )
}

/**
 * `#/app/le-tan/kien-thuc/dich-vu` — what the clinic does and what it costs.
 *
 * The page is a price list first. It reads like the one on the clinic's
 * wall — a card per heading, named by the owner, one line per service in the
 * order she says it (what it is called, what else callers call it, the price
 * and its unit, how long, whether she may book it) — and a line opens into
 * its editor when pressed. Rows are dragged between headings rather than
 * filed with a dropdown; a heading folds shut when the owner is done with
 * it, and survives being emptied. The seeded rows are mostly right already;
 * the owner's job is to scan, catch the two that are wrong, and fix those.
 *
 * Around it, one card per question a caller asks: how she quotes at all,
 * which services come as a package, what the clinic does not do, how one can
 * pay, what is on offer this month. Combos and promotions are the same
 * expanding row as a service, so the three lists share one geometry and one
 * way of being edited. Each card ends in the sentence she would say, built
 * from the draft, so the page answers "what is going on" before the try-out
 * panel is even pressed.
 *
 * A row missing the thing that makes it useful — a service with no price, an
 * offer with no service — takes a dashed edge, the mark the hub uses for an
 * empty section. Not a red ground: nothing is wrong with the row, it is just
 * not finished.
 */
export function ServicesSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Dịch vụ và giá')
  const { draft, set, patch } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const today = localIso(new Date())
  const policy = draft.pricing_disclosure_policy
  const [policyRef, policyWidth] = useElementWidth()
  const policyStacked = policyWidth > 0 && policyWidth < POLICY_STACKED

  /*
   * One open row across all three lists. `closingId` keeps the row that just
   * closed mounted for one fold so it can animate shut; `fresh` is the rows
   * added on this visit, whose first field takes focus when they open.
   */
  const [openId, setOpenId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string[]>([])
  const [freshGroup, setFreshGroup] = useState<string | null>(null)
  // The new group's name, selected for typing over. Done after commit rather
  // than with `autoFocus` + `select()` in the focus handler: Chrome places its
  // own caret after that handler runs, and the selection was lost every time.
  const freshGroupRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!freshGroup) return
    freshGroupRef.current?.focus()
    freshGroupRef.current?.select()
  }, [freshGroup])
  useEffect(() => {
    if (!closingId) return
    const t = window.setTimeout(() => setClosingId(null), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [closingId])
  const close = (id: string) => {
    if (openId === id) {
      setClosingId(id)
      setOpenId(null)
    }
  }
  const openRow = (id: string) => {
    if (openId && openId !== id) setClosingId(openId)
    setOpenId(id)
  }
  const toggle = (id: string) => (openId === id ? close(id) : openRow(id))

  // A press anywhere outside the open row closes it — there is no "done"
  // button; the save bar is already up. A pop-up is part of the row that
  // opened it, wherever the portal put it.
  useEffect(() => {
    if (!openId) return
    const onPress = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Element) || t.closest('[data-popup]')) return
      const row = document.querySelector(`[data-row-id="${CSS.escape(openId)}"]`)
      if (row?.contains(t)) return
      close(openId)
    }
    document.addEventListener('pointerdown', onPress, true)
    return () => document.removeEventListener('pointerdown', onPress, true)
    // `close` is rebuilt every render; the effect only needs the one for this `openId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const rows = draft.service_catalog
  const total = rows.length
  const priced = pricedCount(live)

  // The headings, from the record's own list plus any name a row still
  // carries — so a group the owner emptied stays, and a row can never hide.
  const groupNames = groupNamesOf(draft)
  const groups = groupNames.map((name) => ({ name, rows: rows.filter((s) => groupOf(s) === name) }))
  // A stable key per heading. Groups are matched by name, and keying by name
  // would remount the card on every keystroke of a rename and drop the caret.
  // The key follows the name instead.
  const groupKeys = useRef(new Map<string, string>())
  for (const name of groupNames) if (!groupKeys.current.has(name)) groupKeys.current.set(name, newId('grp'))
  const groupKey = (name: string) => `group:${groupKeys.current.get(name) ?? name}`

  // Folded-shut groups, by stable key so a rename does not reopen one.
  const [folded, setFolded] = useState<string[]>([])
  const unfold = (name: string) => setFolded((f) => f.filter((k) => k !== groupKey(name)))

  const setRow = (id: string, p: Partial<ServiceRow>) => set('service_catalog', rows.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const removeRow = (id: string) => {
    close(id)
    svcRows.leave(id, () => set('service_catalog', (list) => list.filter((s) => s.id !== id)))
  }
  const renameGroup = (from: string, to: string) => {
    const k = groupKeys.current.get(from)
    if (k && !groupKeys.current.has(to)) groupKeys.current.set(to, k)
    patch({
      service_groups: groupNames.map((n) => (n === from ? to : n)),
      service_catalog: rows.map((s) => (groupOf(s) === from ? { ...s, service_group: to } : s)),
    })
  }
  // The heading goes with its rows: a group is a place on the price list, and
  // emptying it first is the way to keep the services. The save bar's Huỷ
  // brings the whole thing back — nothing is lost until the owner saves.
  const removeGroup = (name: string) => {
    const ids = rows.filter((s) => groupOf(s) === name).map((s) => s.id)
    if (openId && ids.includes(openId)) close(openId)
    // The heading collapses with everything under it, as one block.
    groupRows.leave(groupKey(name), () =>
      patch((d) => ({
        service_groups: groupNamesOf(d).filter((n) => n !== name),
        service_catalog: d.service_catalog.filter((s) => groupOf(s) !== name),
      })),
    )
  }
  const addRow = (group: string) => {
    const id = newId('svc')
    unfold(group)
    set('service_catalog', [...rows, { id, service_name: '', service_aliases: [], price_from: null, price_to: null, price_unit: 'lan', duration: 30, service_note: '', is_bookable: true, from_template: false, service_group: group }])
    setFresh((f) => [...f, id])
    openRow(id)
  }
  // A heading can stand empty now, so "Thêm nhóm" makes just the heading,
  // named and selected for typing over. Filling it is the next, separate move.
  const addGroup = () => {
    const base = 'Nhóm mới'
    let name = base
    for (let n = 2; groupNames.includes(name); n += 1) name = `${base} ${n}`
    setFreshGroup(name)
    set('service_groups', [...groupNames, name])
  }
  /**
   * Put one row at `index` among the rows of `group`. The rows are one flat
   * array read heading by heading, so it is rebuilt in the order the headings
   * already stand — moving a row never reorders the headings, and a heading
   * left with nothing under it simply keeps its place in `service_groups`.
   */
  const placeRow = (id: string, group: string, index: number) => {
    const moving = rows.find((s) => s.id === id)
    if (!moving) return
    // A row dropped on a folded group must not vanish into it.
    unfold(group)
    const others = rows.filter((s) => s.id !== id)
    const result: ServiceRow[] = []
    for (const name of groupNames) {
      const inGroup = others.filter((s) => groupOf(s) === name)
      if (name === group) inGroup.splice(Math.min(index, inGroup.length), 0, { ...moving, service_group: group })
      result.push(...inGroup)
    }
    if (!groupNames.includes(group)) result.push({ ...moving, service_group: group })
    set('service_catalog', result)
  }

  /*
   * The four lists on this page grow and shrink the same way as every other
   * list in the app. Services are keyed off the whole catalogue rather than
   * per group, so a row dragged from one heading to another is a move and
   * not an arrival — it must not play the entrance on landing.
   */
  const svcRows = useAppear(rows.map((s) => s.id))
  const groupRows = useAppear(groupNames.map((n) => groupKey(n)))

  const listRef = useRef<HTMLDivElement | null>(null)
  const drag = useRowDrag(
    listRef,
    (id) => {
      if (openId) close(openId)
      if (fresh.includes(id)) setFresh((f) => f.filter((x) => x !== id))
    },
    placeRow,
  )
  useFlip(listRef, drag.dragId != null)

  const named = rows.filter((s) => s.service_name.trim())
  const nameOf = (id: string) => rows.find((s) => s.id === id)?.service_name.trim() ?? ''

  const bundleRows = useAppear(draft.package_bundles.map((b) => b.id))
  const setBundle = (id: string, p: Partial<Bundle>) => set('package_bundles', draft.package_bundles.map((b) => (b.id === id ? { ...b, ...p } : b)))
  const addBundle = () => {
    const id = newId('bd')
    set('package_bundles', [...draft.package_bundles, { id, bundle_name: '', price: null, service_ids: [], note: '' }])
    setFresh((f) => [...f, id])
    openRow(id)
  }
  const removeBundle = (id: string) => {
    close(id)
    bundleRows.leave(id, () => set('package_bundles', (list) => list.filter((b) => b.id !== id)))
  }

  /*
   * A promotion's spoken line is derived, never typed: every edit rewrites
   * `promo_description` from the services and the percentages, so the
   * catalogue field still holds a sentence for the backend while the tenant
   * edits parts of one.
   */
  const promoRows = useAppear(draft.active_promotions.map((p) => p.id))
  const setPromo = (id: string, p: Partial<Promotion>) =>
    set(
      'active_promotions',
      draft.active_promotions.map((x) => {
        if (x.id !== id) return x
        const next = { ...x, ...p }
        return { ...next, promo_description: promoOffer(next, rows) }
      }),
    )
  const addPromo = () => {
    const id = newId('pr')
    setFresh((f) => [...f, id])
    set('active_promotions', [...draft.active_promotions, { id, promo_name: '', promo_description: '', promo_services: [], promo_condition: '', valid_from: today, valid_to: today }])
    openRow(id)
  }
  const removePromo = (id: string) => {
    close(id)
    promoRows.leave(id, () => set('active_promotions', (list) => list.filter((p) => p.id !== id)))
  }
  const togglePromoService = (p: Promotion, serviceId: string) => {
    const list = p.promo_services ?? []
    const has = list.some((x) => x.service_id === serviceId)
    setPromo(p.id, { promo_services: has ? list.filter((x) => x.service_id !== serviceId) : [...list, { service_id: serviceId, discount_percent: null }] })
  }
  const setPromoPercent = (p: Promotion, serviceId: string, percent: number | null) =>
    setPromo(p.id, { promo_services: (p.promo_services ?? []).map((x) => (x.service_id === serviceId ? { ...x, discount_percent: percent } : x)) })

  const togglePay = (m: PaymentMethod) => set('payment_methods', draft.payment_methods.includes(m) ? draft.payment_methods.filter((x) => x !== m) : [...draft.payment_methods, m])
  const otherPay = draft.payment_methods_other ?? []
  const [addingPay, setAddingPay] = useState(false)
  const [payDraft, setPayDraft] = useState('')
  const commitPay = () => {
    const v = payDraft.trim()
    if (v && !otherPay.includes(v)) set('payment_methods_other', [...otherPay, v])
    setPayDraft('')
  }

  /*
   * Trả góp has three states, and the empty one is not "no": a clinic that has
   * not answered must not have the agent assert it does not offer instalments.
   * So nothing is selected until the owner picks, "Không" writes the sentence,
   * and `wantsInstalment` keeps "Có" selected while the detail is still blank.
   */
  const [wantsInstalment, setWantsInstalment] = useState<boolean | null>(null)
  const instalmentText = draft.instalment_options.trim()
  const instalmentChoice: InstalmentChoice = instalmentText ? (isNoInstalment(instalmentText) ? 'no' : 'yes') : wantsInstalment ? 'yes' : ''

  const sample = rows.find((s) => s.service_name.trim() && s.price_from != null && s.price_from > 0) ?? rows.find((s) => s.service_name.trim())
  const notOfferedIdeas = config.industry_vertical === 'nha-khoa' ? DENTAL_NOT_OFFERED_IDEAS.filter((i) => !draft.services_not_offered.includes(i)) : []
  const promoClass: Record<PromoState, string> = { live: styles.promoLive, soon: styles.promoSoon, past: styles.promoPastState }

  /** "−20%" when one number covers the offer, "2 dịch vụ" when they differ, "chưa chọn dịch vụ" when it is empty. */
  const promoHeadline = (p: Promotion): ReactNode => {
    const list = (p.promo_services ?? []).filter((x) => nameOf(x.service_id))
    if (!list.length) return <span className={styles.svcMissing}>chưa chọn dịch vụ</span>
    const percents = [...new Set(list.map((x) => x.discount_percent))]
    if (percents.length === 1 && percents[0] != null) return `−${percents[0]}%`
    return `${list.length} dịch vụ`
  }

  return (
    <KnowledgeSection
      title="Dịch vụ và giá"
      lede={`Bảng giá này là thứ ${agent} đọc khi khách hỏi "bao nhiêu tiền". Bấm vào một dòng để sửa, rồi hỏi thử — ${agent} báo đúng giá vừa sửa, kể cả khi bạn chưa lưu.`}
      rail={<TryPanel section="dich-vu" config={live} />}
      bar={<SaveBar {...d.bar} sub={`${priced}/${total} dịch vụ có giá · ${LABELS.pricing[policy]}`} />}
    >
      <Card title="Cách báo giá qua điện thoại">
        <div ref={policyRef}>
          {policyStacked ? (
            <RadioGroup<PricingDisclosurePolicy> name="pricing_disclosure_policy" value={policy} onChange={(v) => set('pricing_disclosure_policy', v)} options={POLICIES.map((k) => ({ value: k, label: LABELS.pricingShort[k] }))} />
          ) : (
            <Segmented<PricingDisclosurePolicy> fill ariaLabel="Cách báo giá" value={policy} onChange={(v) => set('pricing_disclosure_policy', v)} options={POLICIES.map((k) => ({ value: k, label: LABELS.pricingShort[k] }))} />
          )}
        </div>
        <span className={ui.hint}>{policyHint(policy, agent)}</span>
        {sample ? <Said who={agent}>{priceSentence(sample, policy)}</Said> : null}
      </Card>

      <Card title="Bảng giá" subtitle={`${priced}/${total} dịch vụ có giá`} actions={<AddButton label="Thêm nhóm" onClick={addGroup} />}>
        {groups.length === 0 ? (
          <EmptyState title="Chưa có bảng giá">
            Thêm một nhóm — VD: "Điều trị" — rồi liệt kê dịch vụ và giá bên dưới. Khách hỏi "cạo vôi bao nhiêu", {agent} đọc đúng con số thay vì hẹn gọi lại.
          </EmptyState>
        ) : null}
        <div className={`${styles.services} ${styles.servicesGrouped} ${drag.dragId ? styles.servicesDragging : ''}`} ref={listRef}>
          {groups.map((g) => {
            const key = groupKey(g.name)
            const isOpen = !folded.includes(key)
            const toggleFold = () => {
              if (isOpen && openId && g.rows.some((r) => r.id === openId)) close(openId)
              setFolded((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]))
            }
            return (
              <section key={key} ref={groupRows.ref(key)} className={`${styles.svcGroupCard} ${isOpen ? '' : styles.svcGroupFolded}`} data-flip={key}>
                {/* The band is the fold's handle; presses on what it carries — the name, the buttons — stay theirs. */}
                <div
                  className={styles.svcGroupHead}
                  data-group-head={g.name}
                  onClick={(e) => {
                    if ((e.target as Element).closest('input,button')) return
                    toggleFold()
                  }}
                >
                  <input
                    className={styles.svcGroupName}
                    value={g.name}
                    onChange={(e) => renameGroup(g.name, e.target.value)}
                    placeholder="Tên nhóm"
                    aria-label="Tên nhóm dịch vụ"
                    ref={freshGroup === g.name ? freshGroupRef : undefined}
                    onBlur={() => setFreshGroup(null)}
                  />
                  <span className={styles.svcGroupCount}>{g.rows.length} dịch vụ</span>
                  <AddButton band label="Thêm" onClick={() => addRow(g.name)} />
                  <DeleteButton band label="Xoá" icon={false} onClick={() => removeGroup(g.name)} />
                  <button type="button" className={styles.svcGroupChevron} aria-expanded={isOpen} aria-label={`${isOpen ? 'Thu gọn' : 'Mở'} nhóm ${g.name || 'chưa đặt tên'}`} onClick={toggleFold}>
                    <span className={`${styles.svcChevron} ${isOpen ? styles.svcChevronOpen : ''}`}>
                      <Icon name="chevron-down" size={16} />
                    </span>
                  </button>
                </div>
                <GroupBody open={isOpen}>
                  {/* An empty heading keeps its place, and says what to do with it — it is also the target a dragged row needs. */}
                  {g.rows.length === 0 ? <p className={styles.svcGroupEmpty}>Chưa có dịch vụ — kéo một dòng vào đây, hoặc bấm Thêm.</p> : null}
                  {g.rows.map((s) => {
                    const unpriced = s.price_from == null
                    return (
                      <ExpandRow
                        key={s.id}
                        rowId={s.id}
                        rowRef={svcRows.ref(s.id)}
                        group={g.name}
                        open={openId === s.id}
                        mounted={openId === s.id || closingId === s.id}
                        unfilled={unpriced}
                        dragging={drag.dragId === s.id}
                        drag={drag.handlersFor(s.id)}
                        onToggle={() => {
                          if (!drag.consumeClick()) toggle(s.id)
                        }}
                        summary={
                          <>
                            <span className={styles.svcText}>
                              <span className={styles.svcName}>{s.service_name.trim() || <span className={styles.svcPlaceholder}>Dịch vụ chưa có tên</span>}</span>
                              {s.service_aliases.length ? <span className={styles.svcAlias}>{s.service_aliases.join(' · ')}</span> : null}
                            </span>
                            <span className={styles.svcPrice}>
                              <PriceCell from={s.price_from} to={s.price_to} unit={s.price_unit} />
                            </span>
                            <span className={styles.svcMeta}>
                              <span className={styles.svcDuration}>{s.duration != null ? `${s.duration} phút` : ''}</span>
                              <span className={styles.svcBook} title={s.is_bookable ? `${agent} được tự đặt hẹn` : `${agent} không tự đặt hẹn`}>
                                {s.is_bookable ? <Icon name="appointment" size={16} /> : null}
                              </span>
                            </span>
                          </>
                        }
                      >
                        <div className={styles.svcEdit}>
                          <TextField compact label="Tên dịch vụ" value={s.service_name} onChange={(e) => setRow(s.id, { service_name: e.target.value })} placeholder="VD: Cạo vôi răng" autoFocus={fresh.includes(s.id)} />
                          <div className={ui.stackTight}>
                            <span className={styles.svcEditLabel}>Khách còn gọi là</span>
                            <ChipInput value={s.service_aliases} onChange={(v) => setRow(s.id, { service_aliases: v })} addLabel="+ tên khác" placeholder="VD: lấy cao răng" emptyText={`${agent} nhận ra dịch vụ khi khách gọi bằng tên khác.`} />
                          </div>
                          <div className={styles.svcEditRow}>
                            <MoneyField
                              className={styles.svcEditGrow}
                              compact
                              label="Giá từ"
                              value={s.price_from}
                              onChange={(v) => setRow(s.id, { price_from: v, price_to: v != null && s.price_to != null && s.price_to < v ? v : s.price_to })}
                              placeholder="chưa có giá"
                            />
                            <MoneyField className={styles.svcEditGrow} compact label="Giá đến" value={s.price_to} onChange={(v) => setRow(s.id, { price_to: v })} disabled={unpriced} placeholder={unpriced ? '' : 'để trống = một giá'} />
                            <SelectField<PriceUnit>
                              className={styles.svcEditFixed}
                              compact
                              label="Tính theo"
                              value={s.price_unit}
                              onChange={(v) => setRow(s.id, { price_unit: v })}
                              options={(Object.keys(LABELS.priceUnit) as PriceUnit[]).map((k) => ({ value: k, label: LABELS.priceUnit[k] }))}
                            />
                          </div>
                          <div className={styles.svcEditRow}>
                            <div className={`${styles.svcEditGrow} ${styles.svcSwitch}`}>
                              <Switch checked={s.is_bookable} onChange={(v) => setRow(s.id, { is_bookable: v })} ariaLabel={`${agent} được tự đặt hẹn`} />
                              <span className={styles.svcSwitchText}>
                                <span className={styles.svcSwitchLabel}>{agent} được tự đặt hẹn</span>
                                <span className={styles.svcSwitchHint}>{s.is_bookable ? 'Khách gọi là có lịch ngay.' : `${agent} ghi nhận, phòng khám gọi lại xếp lịch — cho việc cần bác sĩ xem trước.`}</span>
                              </span>
                            </div>
                            <SelectField
                              className={styles.svcEditFixed}
                              compact
                              label="Mỗi hẹn"
                              value={s.duration == null ? '' : String(s.duration)}
                              onChange={(v) => setRow(s.id, { duration: v ? Number(v) : null })}
                              options={[{ value: '', label: '—' }, ...DURATION_OPTIONS.map((m) => ({ value: String(m), label: `${m} phút` }))]}
                              disabled={!s.is_bookable}
                            />
                          </div>
                          <TextField compact label={`${agent} được nói thêm`} value={s.service_note} onChange={(e) => setRow(s.id, { service_note: e.target.value })} placeholder="VD: Không áp dụng răng nhiễm tetracycline" maxLength={140} />
                          <Said who={agent}>{priceSentence(s, policy)}</Said>
                          <div className={styles.svcEditFoot}>
                            <DeleteButton label="Xoá dịch vụ" onClick={() => removeRow(s.id)} />
                          </div>
                        </div>
                      </ExpandRow>
                    )
                  })}
                </GroupBody>
              </section>
            )
          })}
        </div>
      </Card>

      <Card title="Gói combo" subtitle={`nhiều dịch vụ một giá — ${agent} báo khi khách hỏi "có gói nào không"`} actions={<AddButton label="Thêm combo" onClick={addBundle} />}>
        {draft.package_bundles.length ? (
          <div className={styles.services}>
            {draft.package_bundles.map((b) => {
              const ids = b.service_ids ?? []
              const included = ids.map(nameOf).filter(Boolean)
              return (
                <ExpandRow
                  key={b.id}
                  rowId={b.id}
                  rowRef={bundleRows.ref(b.id)}
                  open={openId === b.id}
                  mounted={openId === b.id || closingId === b.id}
                  unfilled={b.price == null}
                  onToggle={() => toggle(b.id)}
                  summary={
                    <>
                      <span className={styles.svcText}>
                        <span className={styles.svcName}>{b.bundle_name.trim() || <span className={styles.svcPlaceholder}>Combo chưa có tên</span>}</span>
                        {included.length ? <span className={styles.svcAlias}>{included.join(' + ')}</span> : null}
                      </span>
                      <span className={styles.svcPrice}>
                        <PriceCell from={b.price} to={b.price} />
                      </span>
                    </>
                  }
                >
                  <div className={styles.svcEdit}>
                    <div className={styles.svcEditRow}>
                      <TextField className={styles.svcEditGrow} compact label="Tên combo" value={b.bundle_name} onChange={(e) => setBundle(b.id, { bundle_name: e.target.value })} placeholder="VD: Cạo vôi và tẩy trắng" autoFocus={fresh.includes(b.id)} />
                      <MoneyField className={styles.svcEditFixed} compact label="Giá gói" value={b.price} onChange={(v) => setBundle(b.id, { price: v })} placeholder="2.000.000" />
                    </div>
                    <div className={ui.stackTight}>
                      <span className={styles.svcEditLabel}>Dịch vụ trong gói</span>
                      {named.length ? (
                        <div className={styles.payChips}>
                          {named.map((s) => (
                            <ChipButton key={s.id} selected={ids.includes(s.id)} onClick={() => setBundle(b.id, { service_ids: ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id] })}>
                              {s.service_name.trim()}
                            </ChipButton>
                          ))}
                        </div>
                      ) : (
                        <span className={ui.hint}>Thêm dịch vụ vào bảng giá trước, rồi chọn ở đây.</span>
                      )}
                    </div>
                    <TextField compact label="Điều kiện" value={b.note} onChange={(e) => setBundle(b.id, { note: e.target.value })} placeholder="VD: Áp dụng khách mới, làm trong một buổi" />
                    <Said who={agent}>{bundleSentence(b, rows)}</Said>
                    <div className={styles.svcEditFoot}>
                      <DeleteButton label="Xoá combo" onClick={() => removeBundle(b.id)} />
                    </div>
                  </div>
                </ExpandRow>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Chưa có gói combo">Gộp vài dịch vụ thành một giá — VD: cạo vôi và tẩy trắng 2 triệu. Khách hỏi "có combo không", {agent} có gói để đọc.</EmptyState>
        )}
      </Card>

      <Card title="Ưu đãi" subtitle={`hết hạn, ${agent} tự ngừng báo — không cần nhớ gỡ`} actions={<AddButton label="Thêm ưu đãi" onClick={addPromo} />}>
        {draft.active_promotions.length ? (
          <div className={styles.services}>
            {draft.active_promotions.map((p) => {
              const st = promoState(p, today)
              const picked = (p.promo_services ?? []).filter((x) => nameOf(x.service_id))
              return (
                <ExpandRow
                  key={p.id}
                  rowId={p.id}
                  rowRef={promoRows.ref(p.id)}
                  open={openId === p.id}
                  mounted={openId === p.id || closingId === p.id}
                  unfilled={picked.length === 0}
                  onToggle={() => toggle(p.id)}
                  summary={
                    <>
                      <span className={`${styles.svcText} ${st === 'past' ? styles.promoPast : ''}`}>
                        <span className={styles.svcName}>{p.promo_name.trim() || <span className={styles.svcPlaceholder}>Ưu đãi chưa có tên</span>}</span>
                        {picked.length ? <span className={styles.svcAlias}>{picked.map((x) => nameOf(x.service_id)).join(' · ')}</span> : null}
                      </span>
                      <span className={styles.svcPrice}>{promoHeadline(p)}</span>
                      <span className={styles.svcMeta}>
                        <span className={`${styles.promoState} ${promoClass[st]}`}>
                          <span className={styles.promoDot} aria-hidden="true" />
                          {PROMO_LABEL[st]}
                        </span>
                      </span>
                    </>
                  }
                >
                  <div className={styles.svcEdit}>
                    <TextField compact label="Tên ưu đãi" value={p.promo_name} onChange={(e) => setPromo(p.id, { promo_name: e.target.value })} placeholder="VD: Ưu đãi tháng 9" autoFocus={fresh.includes(p.id)} />
                    <div className={ui.stackTight}>
                      <span className={styles.svcEditLabel}>Dịch vụ được giảm</span>
                      {named.length ? (
                        <div className={styles.payChips}>
                          {named.map((s) => (
                            <ChipButton key={s.id} selected={picked.some((x) => x.service_id === s.id)} onClick={() => togglePromoService(p, s.id)}>
                              {s.service_name.trim()}
                            </ChipButton>
                          ))}
                        </div>
                      ) : (
                        <span className={ui.hint}>Thêm dịch vụ vào bảng giá trước, rồi chọn ở đây.</span>
                      )}
                    </div>
                    {picked.length ? (
                      <div className={styles.promoRates}>
                        {picked.map((x) => (
                          <div key={x.service_id} className={styles.promoRate}>
                            <span className={styles.promoRateName}>{nameOf(x.service_id)}</span>
                            <NumberField
                              className={styles.promoRateField}
                              compact
                              aria-label={`Giảm bao nhiêu phần trăm cho ${nameOf(x.service_id)}`}
                              value={x.discount_percent}
                              onChange={(v) => setPromoPercent(p, x.service_id, v)}
                              min={0}
                              max={100}
                              suffix="%"
                              placeholder="20"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className={styles.svcEditRow}>
                      <DateRangeField
                        className={styles.svcEditGrow}
                        compact
                        label="Thời gian áp dụng"
                        from={p.valid_from}
                        to={p.valid_to}
                        onChange={(r) => setPromo(p.id, { valid_from: r.from, valid_to: r.to })}
                      />
                    </div>
                    <TextField compact label="Điều kiện" value={p.promo_condition ?? ''} onChange={(e) => setPromo(p.id, { promo_condition: e.target.value })} placeholder="VD: Áp dụng khách mới, đặt lịch trước" />
                    <Said who={agent}>{promoSentence(p, rows)}</Said>
                    <div className={styles.svcEditFoot}>
                      <DeleteButton label="Xoá ưu đãi" onClick={() => removePromo(p.id)} />
                    </div>
                  </div>
                </ExpandRow>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Chưa có ưu đãi">
            Thêm chương trình đang chạy để {agent} nhắc khi khách hỏi "có ưu đãi gì không". Hết ngày, {agent} tự ngừng nói.
          </EmptyState>
        )}
      </Card>

      <Card title="Thanh toán" subtitle={`${agent} chỉ nói khi khách hỏi`}>
        <div className={styles.pay}>
          {(Object.keys(LABELS.payment) as PaymentMethod[]).map((m) => {
            const on = draft.payment_methods.includes(m)
            return (
              <button key={m} type="button" className={`${styles.payTile} ${on ? styles.payTileOn : ''}`} aria-pressed={on} onClick={() => togglePay(m)}>
                <Icon name={PAY_ICON[m]} size={20} />
                <span className={styles.payName}>{LABELS.payment[m]}</span>
              </button>
            )
          })}
          {otherPay.map((label: string) => (
            <span key={label} className={`${styles.payTile} ${styles.payTileOn} ${styles.payTileOwn}`}>
              <Icon name="wallet" size={20} />
              <span className={styles.payName}>{label}</span>
              <button type="button" className={styles.payRemove} aria-label={`Bỏ ${label}`} onClick={() => set('payment_methods_other', otherPay.filter((x: string) => x !== label))}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          {addingPay ? (
            <span className={`${styles.payTile} ${styles.payTileInput}`}>
              <input
                className={styles.payInput}
                autoFocus
                value={payDraft}
                placeholder="Cách thanh toán khác — VD: Quẹt thẻ Visa tại quầy"
                aria-label="Cách thanh toán khác"
                onChange={(e) => setPayDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitPay()
                  } else if (e.key === 'Escape') {
                    setPayDraft('')
                    setAddingPay(false)
                  }
                }}
                onBlur={() => {
                  commitPay()
                  setAddingPay(false)
                }}
              />
            </span>
          ) : (
            <button type="button" className={`${styles.payTile} ${styles.payAdd}`} onClick={() => setAddingPay(true)}>
              <Icon name="plus" size={18} />
              <span className={styles.payName}>Cách khác</span>
            </button>
          )}
        </div>

        <div className={ui.divider} />

        <div className={ui.stackTight}>
          <span className={styles.svcEditLabel}>Trả góp</span>
          <Segmented<InstalmentChoice>
            ariaLabel="Phòng khám có hỗ trợ trả góp không"
            value={instalmentChoice}
            onChange={(v) => {
              if (v === 'yes') {
                setWantsInstalment(true)
                if (isNoInstalment(draft.instalment_options)) set('instalment_options', '')
              } else {
                setWantsInstalment(false)
                set('instalment_options', NO_INSTALMENT)
              }
            }}
            options={[
              { value: 'yes', label: 'Có trả góp' },
              { value: 'no', label: 'Không trả góp' },
            ]}
          />
          {instalmentChoice === 'yes' ? (
            <TextField
              compact
              aria-label="Điều kiện trả góp"
              value={draft.instalment_options}
              onChange={(e) => set('instalment_options', e.target.value)}
              placeholder="VD: Trả góp 0% qua thẻ tín dụng, đơn từ 10 triệu"
              autoFocus={wantsInstalment === true && !draft.instalment_options}
            />
          ) : null}
        </div>
      </Card>

      <Card title="Dịch vụ không làm" subtitle={`khách hỏi, ${agent} từ chối khéo thay vì tự bịa`}>
        <ChipInput boxed value={draft.services_not_offered} onChange={(v) => set('services_not_offered', v)} placeholder={draft.services_not_offered.length ? 'Thêm dịch vụ…' : 'VD: Chỉnh nha trẻ dưới 12 tuổi'} />
        {notOfferedIdeas.length ? (
          <div className={styles.suggests}>
            {notOfferedIdeas.map((idea) => (
              <button key={idea} type="button" className={styles.suggest} onClick={() => set('services_not_offered', [...draft.services_not_offered, idea])}>
                <Icon name="plus" size={12} />
                {idea}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

    </KnowledgeSection>
  )
}

export type { PromoService }
