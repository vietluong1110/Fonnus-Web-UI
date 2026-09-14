import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { SUPPORT_GUIDE_URL, SUPPORT_HOTLINE, SUPPORT_ZALO_URL } from '../api'
import type { PlanId, ShellSummary } from '../api'
import { formatPhone } from '../auth/phone'
import { useSession } from '../auth/SessionProvider'
import { CallOrb } from '../components/orb/CallOrb'
import { Icon, Logo } from '../design-system'
import type { IconName } from '../design-system'
import { PHONE_BREAKPOINT, useIsNarrow } from '../hooks/useIsNarrow'
import { appHref, useAppPath } from '../hooks/useRoute'
import { shortClinicName } from './clinicName'
import { computeReadiness } from './letan/readiness'
import { useConfig } from './letan/store'
import { useTryCall } from './letan/useTryCall'
import { PLAN_NAME, dm, fmtCount } from './pages/settings/labels'
import { useShellSummary } from './summary'
import { AnchoredPopup, useAnchoredPopup } from './ui'
import styles from './AppShell.module.css'

/*
 * The signed-in frame. Designed on the "Fonnus Sidebar" canvas (Sept 2026, direction A with
 * "Gọi thử Linh" and the "Tên gọn" account block); the rules it set are ui-ux-principles §16.
 *
 *   ≥ 900px   a 216px milk sidebar: pill items, the open tab a terracotta pill that slides
 *   640–899   a 96px rail with the label under every icon — hover tooltips do not work on touch
 *   < 640px   a bottom tab bar: four tabs and "Thêm"
 *
 * What it carries beyond the tabs is deliberately short: a count only where something waits
 * on the owner, one dot while Lễ tân is missing something, "Gọi thử", Hỗ trợ, the minutes only
 * when they are about to run out, and the account.
 */

export interface NavEntry {
  key: string
  label: string
  icon: IconName
  /** First path segment under `#/app/`. Every page has one — a bare `#/app` redirects (AppRoot). */
  segment: string
}

export const NAV: NavEntry[] = [
  { key: 'tong-quan', label: 'Tổng quan', icon: 'overview', segment: 'tong-quan' },
  { key: 'cuoc-goi', label: 'Cuộc gọi', icon: 'answered', segment: 'cuoc-goi' },
  { key: 'lich-hen', label: 'Lịch hẹn', icon: 'appointment', segment: 'lich-hen' },
  { key: 'le-tan', label: 'Lễ tân', icon: 'caller', segment: 'le-tan' },
  { key: 'so-dien-thoai', label: 'Số điện thoại', icon: 'incoming', segment: 'so-dien-thoai' },
]

/** The first of the tabs that set her up rather than show the day — a hairline goes above it, no heading. */
const SETUP_FIRST = 'le-tan'

/*
 * The owner's own account, not the clinic's day: opened a few times a year, so
 * it lives behind the user block at the foot of the sidebar (and under "Thêm" on
 * a phone) rather than in the nav beside the tabs used every morning.
 */
export const ACCOUNT_PAGES: NavEntry[] = [
  { key: 'cai-dat', label: 'Cài đặt', icon: 'settings', segment: 'cai-dat' },
  { key: 'goi-dich-vu', label: 'Gói dịch vụ', icon: 'price', segment: 'goi-dich-vu' },
]

/** The nav entry for this path — `null` on an account page, where no tab is lit. */
export function activeNav(path: string[]): NavEntry | null {
  if (ACCOUNT_PAGES.some((a) => a.segment === path[0])) return null
  return NAV.find((n) => n.segment === (path[0] ?? '')) ?? NAV[0]
}

export function pageLabel(path: string[]): string {
  return (ACCOUNT_PAGES.find((a) => a.segment === path[0]) ?? activeNav(path) ?? NAV[0]).label
}

/*
 * On a phone the rail becomes a bottom tab bar, and a bar has room for four
 * destinations and a way to the rest. These four are the ones an owner opens
 * on their feet; the number and the account live behind "Thêm" with the sign-out.
 */
const TAB_KEYS = ['tong-quan', 'cuoc-goi', 'lich-hen', 'le-tan']
const TAB_NAV = NAV.filter((n) => TAB_KEYS.includes(n.key))
const MORE_NAV = NAV.filter((n) => !TAB_KEYS.includes(n.key))

/** Below this the sidebar is the labelled rail. CSS matches it as `max-width: 899.98px`. */
const RAIL_BREAKPOINT = 900

/** From this share of the plan's minutes, the minutes come onto the sidebar. */
const NEAR_LIMIT = 0.8

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (a + b).toUpperCase()
}

/* ------------------------------------------------------------------ what the tabs carry */

/** A count is things waiting on the owner. Never a total, and gone at zero. `count: null` is a dot. */
interface Mark {
  count: number | null
  /** What a screen reader hears after the tab's name. */
  label: string
}

function marksOf(summary: ShellSummary | null, setupMissing: boolean): Record<string, Mark> {
  const marks: Record<string, Mark> = {}
  if (summary?.callbacks_owed) marks['cuoc-goi'] = { count: summary.callbacks_owed, label: `${summary.callbacks_owed} cuộc cần gọi lại` }
  if (summary?.appointments_waiting) marks['lich-hen'] = { count: summary.appointments_waiting, label: `${summary.appointments_waiting} lịch cần bạn xem` }
  // Until the record has loaded, `config` is the template — the dot would say
  // "Còn thiếu thông tin" about a clinic that is fully set up.
  if (setupMissing) marks['le-tan'] = { count: null, label: 'Còn thiếu thông tin' }
  return marks
}

const countText = (n: number) => (n > 99 ? '99+' : String(n))

interface Minutes {
  planId: PlanId
  /** Minutes left, or minutes past the plan once `over`. */
  left: number
  over: boolean
  /** 0..1 of the plan used, capped at the bar's end. */
  share: number
  near: boolean
  /** "22/09" */
  renews: string
}

function minutesOf(s: ShellSummary | null): Minutes | null {
  if (!s || s.minutes.included <= 0) return null
  const { used, included, renews_on } = s.minutes
  return {
    planId: s.plan_id,
    left: Math.abs(included - used),
    over: used > included,
    share: Math.min(1, used / included),
    near: used / included >= NEAR_LIMIT,
    renews: dm(renews_on),
  }
}

interface SupportLink {
  key: string
  label: string
  /** For a tile, where the full label does not fit. */
  short: string
  icon: IconName
  href: string | null
  meta: string | null
  external: boolean
}

const SUPPORT: SupportLink[] = [
  { key: 'zalo', label: 'Nhắn Zalo', short: 'Nhắn Zalo', icon: 'message', href: SUPPORT_ZALO_URL || null, meta: null, external: true },
  {
    key: 'hotline',
    label: 'Gọi tổng đài',
    short: 'Gọi tổng đài',
    icon: 'answered',
    href: SUPPORT_HOTLINE ? `tel:${SUPPORT_HOTLINE.replace(/[^\d+]/g, '')}` : null,
    meta: SUPPORT_HOTLINE || null,
    external: false,
  },
  { key: 'guide', label: 'Hướng dẫn sử dụng', short: 'Hướng dẫn', icon: 'guide', href: SUPPORT_GUIDE_URL || null, meta: null, external: true },
]

/* ------------------------------------------------------------------ the frame */

/** The signed-in frame: sidebar + content column, or content + tab bar on a phone. */
export function AppShell({ children }: { children: ReactNode }) {
  const path = useAppPath()
  const active = activeNav(path)
  const account = ACCOUNT_PAGES.find((a) => a.segment === path[0])?.key ?? null
  const { config, status } = useConfig()
  const { me } = useSession()
  const phone = useIsNarrow(PHONE_BREAKPOINT)
  const rail = useIsNarrow(RAIL_BREAKPOINT)
  const summary = useShellSummary(path[0] ?? '')

  const setupMissing = status === 'ready' && !computeReadiness(config).r2Done
  const marks = marksOf(summary, setupMissing)
  const minutes = minutesOf(summary)
  const clinic = (status === 'ready' && config.business_name.trim()) || me?.clinic_name || ''

  return (
    <div className={styles.shell}>
      {/* One nav in the tree at a time, so a screen reader is not offered the same links twice. */}
      {phone ? null : <Sidebar active={active} account={account} marks={marks} minutes={minutes} clinic={clinic} rail={rail} />}

      <main className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </main>

      {phone ? <TabBar active={active} account={account} marks={marks} minutes={minutes} clinic={clinic} /> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ sidebar and rail */

function Sidebar({
  active,
  account,
  marks,
  minutes,
  clinic,
  rail,
}: {
  active: NavEntry | null
  account: string | null
  marks: Record<string, Mark>
  minutes: Minutes | null
  clinic: string
  rail: boolean
}) {
  const asideRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const indicator = useIndicator(navRef, active?.key ?? null, rail)
  const { agent, phone, call } = useTryCall()

  return (
    <aside ref={asideRef} className={styles.sidebar} aria-label="Điều hướng">
      <a className={styles.logo} href={appHref('tong-quan')} aria-label="Tổng quan">
        <span className={styles.logoFull}>
          <Logo variant="horizontal" height={24} />
        </span>
        <span className={styles.logoMark}>
          <Logo variant="mark" height={30} />
        </span>
      </a>

      <nav className={styles.nav} ref={navRef}>
        <span
          className={`${styles.indicator} ${indicator.shown ? styles.indicatorOn : ''} ${indicator.live ? styles.indicatorLive : ''}`}
          style={indicator.style}
          aria-hidden="true"
        />
        {NAV.map((n) => {
          const on = n.key === active?.key
          const mark = marks[n.key]
          return (
            <Fragment key={n.key}>
              {n.key === SETUP_FIRST ? <span className={styles.divider} aria-hidden="true" /> : null}
              <a data-nav={n.key} href={appHref(n.segment)} className={`${styles.item} ${on ? styles.itemOn : ''}`} aria-current={on ? 'page' : undefined}>
                {/* The icon's pill: where the rail draws the open tab and pins the count. */}
                <span className={styles.itemIcon} data-pill="">
                  <Icon name={n.icon} size={rail ? 20 : 18} />
                  {mark ? (
                    mark.count != null ? (
                      <span className={styles.badge} aria-hidden="true">
                        {countText(mark.count)}
                      </span>
                    ) : (
                      <span className={styles.dotMark} aria-hidden="true" />
                    )
                  ) : null}
                </span>
                <span className={styles.itemLabel}>{n.label}</span>
                {mark ? (
                  mark.count != null ? (
                    <span className={styles.count} aria-hidden="true">
                      {countText(mark.count)}
                    </span>
                  ) : (
                    <span className={styles.dotRight} aria-hidden="true" />
                  )
                ) : null}
                {mark ? <span className={styles.srOnly}>, {mark.label}</span> : null}
              </a>
            </Fragment>
          )
        })}
      </nav>

      <div className={styles.foot}>
        {/* The orb means "talk to her" — here as everywhere, the one press that calls her. */}
        <button type="button" className={styles.callPill} onClick={call} aria-label={`Gọi thử ${agent}`}>
          <span className={styles.orbSlot}>
            <CallOrb size={40} />
          </span>
          <span className={styles.callText} aria-hidden="true">
            <span className={styles.callTitle}>Gọi thử {agent}</span>
            {phone ? <span className={styles.callMeta}>{phone}</span> : null}
          </span>
          <span className={styles.callShort} aria-hidden="true">
            Gọi thử
          </span>
        </button>

        <SupportMenu rail={rail} clear={asideRef} />

        <span className={styles.footRule} aria-hidden="true" />

        {minutes?.near && !rail ? <NearBar minutes={minutes} /> : null}

        <AccountMenu rail={rail} account={account} clinic={clinic} minutes={minutes} clear={asideRef} />
      </div>
    </aside>
  )
}

/**
 * Where the open tab's pill sits, measured rather than counted: in the sidebar it is the whole
 * item, in the rail the pill behind the icon. A change of tab slides it; a change of shape
 * (sidebar ↔ rail) and the first placement land in place, so it never flies in from the corner.
 */
function useIndicator(navRef: RefObject<HTMLElement | null>, activeKey: string | null, rail: boolean) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [live, setLive] = useState(false)
  const lastRail = useRef(rail)

  const measure = useCallback(() => {
    const nav = navRef.current
    if (!nav || !activeKey) return
    const item = nav.querySelector<HTMLElement>(`[data-nav="${activeKey}"]`)
    const target = rail ? item?.querySelector<HTMLElement>('[data-pill]') : item
    if (!target) return
    const n = nav.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    const next = { x: r.left - n.left, y: r.top - n.top, w: r.width, h: r.height }
    setBox((b) => (b && b.x === next.x && b.y === next.y && b.w === next.w && b.h === next.h ? b : next))
  }, [navRef, activeKey, rail])

  useLayoutEffect(() => {
    if (lastRail.current !== rail) {
      lastRail.current = rail
      setLive(false)
    }
    measure()
  }, [measure, rail])

  useEffect(() => {
    if (live || !box) return
    const id = requestAnimationFrame(() => setLive(true))
    return () => cancelAnimationFrame(id)
  }, [live, box])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(nav)
    return () => ro.disconnect()
  }, [navRef, measure])

  const style: CSSProperties | undefined = box ? { width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` } : undefined
  // On an account page the pill fades where it was rather than sliding home as it goes.
  return { style, shown: box != null && activeKey != null, live }
}

/** `clear` is the sidebar: the panel opens beside it, not over its edge. */
function SupportMenu({ rail, clear }: { rail: boolean; clear: RefObject<HTMLElement | null> }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const { place, panelRef } = useAnchoredPopup(trigger, open, close, { width: 272, height: 150, side: 'beside', clear })

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`${styles.item} ${open ? styles.itemOpen : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.itemIcon}>
          <Icon name="help" size={rail ? 20 : 18} />
        </span>
        <span className={styles.itemLabel}>Hỗ trợ</span>
      </button>
      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label="Hỗ trợ" className={styles.panel}>
          {SUPPORT.map((s) => (
            <SupportRow key={s.key} link={s} onPick={close} />
          ))}
        </AnchoredPopup>
      ) : null}
    </>
  )
}

/** A channel that is not set up yet still shows, and says so, rather than pointing nowhere. */
function SupportRow({ link, onPick }: { link: SupportLink; onPick: () => void }) {
  const body = (
    <>
      <Icon name={link.icon} size={18} />
      <span className={styles.menuLabel}>{link.label}</span>
      {link.href ? link.meta ? <span className={styles.menuMeta}>{link.meta}</span> : null : <span className={styles.menuMeta}>Sắp có</span>}
    </>
  )
  if (!link.href) {
    return (
      <span className={`${styles.menuItem} ${styles.menuItemSoon}`} aria-disabled="true">
        {body}
      </span>
    )
  }
  return (
    <a className={styles.menuItem} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined} onClick={onPick}>
      {body}
    </a>
  )
}

/** The minutes on the sidebar itself — only from `NEAR_LIMIT`. The rest of the month, nothing. */
function NearBar({ minutes }: { minutes: Minutes }) {
  return (
    <a className={styles.nearBar} href={appHref('goi-dich-vu')}>
      <span className={styles.nearTop}>
        <span>
          {minutes.over ? 'Vượt' : 'Còn'} <b className={styles.nearNum}>{fmtCount(minutes.left)}</b> phút
        </span>
        <span className={styles.nearRenew}>{minutes.renews}</span>
      </span>
      <Meter minutes={minutes} />
    </a>
  )
}

/** A quota is a bar, never a ring — the ring already means readiness (§14). Past the plan, deeper; never red. */
function Meter({ minutes }: { minutes: Minutes }) {
  return (
    <span className={`${styles.bar} ${minutes.over ? styles.barOver : ''}`} aria-hidden="true">
      <span className={styles.barFill} style={{ width: `${minutes.share * 100}%` }} />
    </span>
  )
}

function AccountMenu({
  rail,
  account,
  clinic,
  minutes,
  clear,
}: {
  rail: boolean
  account: string | null
  clinic: string
  minutes: Minutes | null
  clear: RefObject<HTMLElement | null>
}) {
  const { me } = useSession()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  // The sidebar opens it above the block, over its own foot; the rail has no room for that, so beside.
  const { place, panelRef } = useAnchoredPopup(trigger, open, close, {
    width: rail ? 288 : 264,
    height: 320,
    side: rail ? 'beside' : 'below',
    clear,
  })
  const name = me?.display_name ?? ''
  const short = shortClinicName(clinic)

  return (
    <>
      {/* Lit while an account page is open: the page has no tab, so the block it came from says where the owner is. */}
      <button
        ref={trigger}
        type="button"
        className={`${styles.user} ${account || open ? styles.userOn : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={[clinic, name].filter(Boolean).join(' · ') || 'Tài khoản'}
      >
        <span className={styles.avatar}>
          {initials(name)}
          {minutes?.near ? <span className={styles.avatarDot} /> : null}
        </span>
        <span className={styles.userText}>
          <FitName text={short || name} />
          {short ? <span className={styles.userMeta}>{name}</span> : null}
        </span>
      </button>
      {open && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label="Tài khoản" className={styles.panel}>
          <AccountPanel clinic={clinic} minutes={minutes} account={account} onPick={close} />
        </AnchoredPopup>
      ) : null}
    </>
  )
}

/**
 * One line, always ("Tên gọn"). A name still too long after the kind of clinic is dropped
 * fades at its edge instead of ending in "…", and glides to its last word while pointed at.
 */
function FitName({ text }: { text: string }) {
  const clip = useRef<HTMLSpanElement>(null)
  const run = useRef<HTMLSpanElement>(null)
  const [over, setOver] = useState(0)

  useLayoutEffect(() => {
    const c = clip.current
    const r = run.current
    if (!c || !r) return
    const m = () => setOver(Math.max(0, Math.ceil(r.offsetWidth - c.clientWidth)))
    m()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(m)
    ro.observe(c)
    return () => ro.disconnect()
  }, [text])

  return (
    <span ref={clip} className={`${styles.userName} ${over > 0 ? styles.userNameLong : ''}`} style={{ '--glide': `${-over}px` } as CSSProperties}>
      <span ref={run} className={styles.userNameRun}>
        {text}
      </span>
    </span>
  )
}

function PlanTile({ minutes, onPick }: { minutes: Minutes; onPick?: () => void }) {
  return (
    <a className={styles.planTile} href={appHref('goi-dich-vu')} onClick={onPick}>
      <span className={styles.planTop}>
        <span>Gói {PLAN_NAME[minutes.planId]}</span>
        <span className={styles.planRenew}>Làm mới {minutes.renews}</span>
      </span>
      <Meter minutes={minutes} />
      <span className={styles.planFig}>
        <b className={styles.planNum}>{fmtCount(minutes.left)}</b> {minutes.over ? 'phút vượt gói' : 'phút còn lại'}
      </span>
    </a>
  )
}

function loginOf(me: ReturnType<typeof useSession>['me']): string {
  if (!me) return ''
  return me.method === 'phone' ? formatPhone(me.identity) : me.identity
}

function AccountPanel({
  clinic,
  minutes,
  account,
  onPick,
}: {
  clinic: string
  minutes: Minutes | null
  account: string | null
  onPick: () => void
}) {
  const { me, signOut } = useSession()
  const name = me?.display_name ?? ''

  return (
    <>
      <div className={styles.menuHead}>
        <span className={styles.avatar}>{initials(name)}</span>
        <span className={styles.menuWho}>
          {/* The full name: the one line on the sidebar may have shortened it. */}
          <span className={styles.menuClinic}>{clinic || name}</span>
          <span className={styles.menuMetaLine}>{[clinic ? name : null, loginOf(me)].filter(Boolean).join(' · ')}</span>
        </span>
      </div>
      {minutes ? <PlanTile minutes={minutes} onPick={onPick} /> : null}
      {ACCOUNT_PAGES.map((n) => (
        <a
          key={n.key}
          className={`${styles.menuItem} ${n.key === account ? styles.menuItemOn : ''}`}
          href={appHref(n.segment)}
          aria-current={n.key === account ? 'page' : undefined}
          onClick={onPick}
        >
          <Icon name={n.icon} size={16} />
          <span className={styles.menuLabel}>{n.label}</span>
        </a>
      ))}
      <span className={styles.menuRule} aria-hidden="true" />
      {/* Ink, not red: signing out is not an error. */}
      <button
        type="button"
        className={styles.menuItem}
        onClick={() => {
          onPick()
          void signOut()
        }}
      >
        <Icon name="sign-out" size={16} />
        <span className={styles.menuLabel}>Đăng xuất</span>
      </button>
    </>
  )
}

/* ------------------------------------------------------------------ phone */

/*
 * The phone shell: four destinations pinned to the bottom edge, thumb-height,
 * plus "Thêm" for the pages that are set up once and then left alone. The open
 * tab is the same terracotta pill as the sidebar's, behind the icon, and it
 * slides the same way.
 */
function TabBar({
  active,
  account,
  marks,
  minutes,
  clinic,
}: {
  active: NavEntry | null
  account: string | null
  marks: Record<string, Mark>
  minutes: Minutes | null
  clinic: string
}) {
  const [more, setMore] = useState(false)
  const { me, signOut } = useSession()
  const { agent, phone, call } = useTryCall()
  const tabIndex = TAB_NAV.findIndex((n) => n.key === active?.key)
  const slot = more || tabIndex < 0 ? TAB_NAV.length : tabIndex
  const moreOn = slot === TAB_NAV.length
  const name = me?.display_name ?? ''
  const shut = () => setMore(false)

  // The sheet is the page's whole surface while it is up; letting the page
  // behind it scroll under the thumb is the thing that makes a sheet feel broken.
  useEffect(() => {
    if (!more) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMore(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [more])

  return (
    <>
      {more ? (
        <>
          <div className={styles.scrim} onClick={shut} />
          {/* Above the tab bar, not over it: "Thêm" stays lit and pressing it again closes the sheet. */}
          <div className={styles.sheet} role="dialog" aria-label="Thêm">
            <span className={styles.sheetGrip} aria-hidden="true" />

            <button
              type="button"
              className={`${styles.callPill} ${styles.sheetCall}`}
              aria-label={`Gọi thử ${agent}`}
              onClick={() => {
                shut()
                call()
              }}
            >
              <span className={styles.orbSlot}>
                <CallOrb size={40} />
              </span>
              <span className={styles.callText} aria-hidden="true">
                <span className={styles.callTitle}>Gọi thử {agent}</span>
                {phone ? <span className={styles.callMeta}>{phone}</span> : null}
              </span>
            </button>

            {MORE_NAV.map((n) => (
              <a
                key={n.key}
                className={`${styles.sheetItem} ${n.key === active?.key ? styles.sheetItemOn : ''}`}
                href={appHref(n.segment)}
                aria-current={n.key === active?.key ? 'page' : undefined}
                onClick={shut}
              >
                <Icon name={n.icon} size={20} />
                {n.label}
              </a>
            ))}

            <div className={styles.sheetDivider} />

            <div className={styles.sheetHead}>
              <span className={styles.avatar}>{initials(name)}</span>
              <span className={styles.menuWho}>
                <span className={styles.menuClinic}>{clinic || name}</span>
                <span className={styles.menuMetaLine}>{[clinic ? name : null, loginOf(me)].filter(Boolean).join(' · ')}</span>
              </span>
            </div>

            {minutes ? <PlanTile minutes={minutes} onPick={shut} /> : null}

            {ACCOUNT_PAGES.map((n) => (
              <a
                key={n.key}
                className={`${styles.sheetItem} ${n.key === account ? styles.sheetItemOn : ''}`}
                href={appHref(n.segment)}
                aria-current={n.key === account ? 'page' : undefined}
                onClick={shut}
              >
                <Icon name={n.icon} size={20} />
                {n.label}
              </a>
            ))}

            <div className={styles.sheetDivider} />

            <div className={styles.helpTiles}>
              {SUPPORT.map((s) => (
                <SupportTile key={s.key} link={s} onPick={shut} />
              ))}
            </div>

            <div className={styles.sheetDivider} />

            <button type="button" className={styles.sheetItem} onClick={() => void signOut()}>
              <Icon name="sign-out" size={20} />
              Đăng xuất
            </button>
          </div>
        </>
      ) : null}

      <nav className={styles.tabbar} aria-label="Điều hướng" style={{ '--tab': slot } as CSSProperties}>
        <span className={styles.tabIndicator} aria-hidden="true" />
        {TAB_NAV.map((n) => {
          const on = !more && n.key === active?.key
          const mark = marks[n.key]
          return (
            <a key={n.key} href={appHref(n.segment)} className={`${styles.tab} ${on ? styles.tabOn : ''}`} aria-current={on ? 'page' : undefined}>
              <span className={styles.tabIcon}>
                <Icon name={n.icon} size={20} />
                {mark ? (
                  mark.count != null ? (
                    <span className={styles.tabBadge} aria-hidden="true">
                      {countText(mark.count)}
                    </span>
                  ) : (
                    <span className={styles.tabDot} aria-hidden="true" />
                  )
                ) : null}
              </span>
              <span className={styles.tabLabel}>{n.label}</span>
              {mark ? <span className={styles.srOnly}>, {mark.label}</span> : null}
            </a>
          )
        })}

        <button
          type="button"
          className={`${styles.tab} ${moreOn ? styles.tabOn : ''}`}
          aria-haspopup="dialog"
          aria-expanded={more}
          onClick={() => setMore((o) => !o)}
        >
          <span className={styles.tabIcon}>
            <Icon name={more ? 'x' : 'menu'} size={20} />
            {minutes?.near && !more ? <span className={styles.tabDot} aria-hidden="true" /> : null}
          </span>
          <span className={styles.tabLabel}>Thêm</span>
        </button>
      </nav>
    </>
  )
}

function SupportTile({ link, onPick }: { link: SupportLink; onPick: () => void }) {
  const body = (
    <>
      <Icon name={link.icon} size={22} />
      <span>{link.short}</span>
      {link.href ? null : <span className={styles.helpTileSoon}>Sắp có</span>}
    </>
  )
  if (!link.href) {
    return (
      <span className={`${styles.helpTile} ${styles.helpTileOff}`} aria-disabled="true">
        {body}
      </span>
    )
  }
  return (
    <a className={styles.helpTile} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined} onClick={onPick}>
      {body}
    </a>
  )
}
