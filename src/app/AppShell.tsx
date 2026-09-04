import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon, Logo } from '../design-system'
import type { IconName } from '../design-system'
import { useSession } from '../auth/SessionProvider'
import { appHref, useAppPath } from '../hooks/useRoute'
import { PHONE_BREAKPOINT, useIsNarrow } from '../hooks/useIsNarrow'
import { useConfig } from './letan/store'
import { computeReadiness } from './letan/readiness'
import styles from './AppShell.module.css'

export interface NavEntry {
  key: string
  label: string
  icon: IconName
  /** First path segment under `#/app/`; empty for Tổng quan. */
  segment: string
}

export const NAV: NavEntry[] = [
  { key: 'tong-quan', label: 'Tổng quan', icon: 'overview', segment: '' },
  { key: 'cuoc-goi', label: 'Cuộc gọi', icon: 'answered', segment: 'cuoc-goi' },
  { key: 'lich-hen', label: 'Lịch hẹn', icon: 'appointment', segment: 'lich-hen' },
  { key: 'le-tan', label: 'Lễ tân', icon: 'caller', segment: 'le-tan' },
  { key: 'so-dien-thoai', label: 'Số điện thoại', icon: 'incoming', segment: 'so-dien-thoai' },
  { key: 'cai-dat', label: 'Cài đặt', icon: 'settings', segment: 'cai-dat' },
]

export function activeNav(path: string[]): NavEntry {
  return NAV.find((n) => n.segment === (path[0] ?? '')) ?? NAV[0]
}

/*
 * On a phone the rail becomes a bottom tab bar, and a bar has room for four
 * destinations and a way to the rest. These four are the ones an owner opens
 * on their feet; the two that are configured once — the number and the
 * account — live behind "Thêm" with the sign-out.
 */
const TAB_KEYS = ['tong-quan', 'cuoc-goi', 'lich-hen', 'le-tan']
const TAB_NAV = NAV.filter((n) => TAB_KEYS.includes(n.key))
const MORE_NAV = NAV.filter((n) => !TAB_KEYS.includes(n.key))

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (a + b).toUpperCase()
}

/** The signed-in frame: sidebar + content column. */
export function AppShell({ children }: { children: ReactNode }) {
  const path = useAppPath()
  const active = activeNav(path)
  const { config, status } = useConfig()
  const readiness = computeReadiness(config)
  const phone = useIsNarrow(PHONE_BREAKPOINT)

  // Until the record has loaded, `config` is the template — the dot would say
  // "Còn thiếu thông tin" about a clinic that is fully set up.
  const attention = status === 'ready' && !readiness.r2Done ? 'le-tan' : null

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Điều hướng">
        <a className={styles.logo} href={appHref()} aria-label="Tổng quan">
          <span className={styles.logoFull}>
            <Logo variant="horizontal" height={26} />
          </span>
          <span className={styles.logoMark}>
            <Logo variant="mark" height={28} />
          </span>
        </a>

        <nav className={styles.nav}>
          {NAV.map((n) => {
            const on = n.key === active.key
            return (
              <a
                key={n.key}
                href={n.segment ? appHref(n.segment) : appHref()}
                className={`${styles.item} ${on ? styles.itemOn : ''}`}
                aria-current={on ? 'page' : undefined}
                title={n.label}
              >
                <Icon name={n.icon} size={18} />
                <span className={styles.itemLabel}>{n.label}</span>
                {attention === n.key ? <span className={styles.itemDot} title="Còn thiếu thông tin" /> : null}
              </a>
            )
          })}
        </nav>

        <UserBlock clinic={config.business_name} />
      </aside>

      <main className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </main>

      {phone ? <TabBar active={active} attention={attention} clinic={config.business_name} /> : null}
    </div>
  )
}

/*
 * The phone shell: four destinations pinned to the bottom edge, thumb-height,
 * plus "Thêm" for the two pages that are set up once and then left alone.
 *
 * Rendered instead of the sidebar rather than beside it — one nav in the tree,
 * so a screen reader is not offered the same six links twice.
 */
function TabBar({
  active,
  attention,
  clinic,
}: {
  active: NavEntry
  attention: string | null
  clinic: string
}) {
  const [more, setMore] = useState(false)
  const { me, signOut } = useSession()
  const moreOn = MORE_NAV.some((n) => n.key === active.key)

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
          <div className={styles.scrim} onClick={() => setMore(false)} />
          <div className={styles.sheet} role="dialog" aria-label="Thêm">
            <span className={styles.sheetGrip} aria-hidden="true" />

            {MORE_NAV.map((n) => (
              <a
                key={n.key}
                className={`${styles.sheetItem} ${n.key === active.key ? styles.sheetItemOn : ''}`}
                href={appHref(n.segment)}
                onClick={() => setMore(false)}
              >
                <Icon name={n.icon} size={19} />
                {n.label}
              </a>
            ))}

            <div className={styles.sheetDivider} />

            <div className={styles.sheetHead}>
              <span className={styles.avatar}>{initials(me?.display_name ?? '')}</span>
              <span className={styles.userText}>
                <span className={styles.userName}>{clinic}</span>
                <span className={styles.userMeta}>
                  {[me?.display_name, me?.plan].filter(Boolean).join(' · ')}
                </span>
              </span>
            </div>

            <button
              type="button"
              className={`${styles.sheetItem} ${styles.menuItemDanger}`}
              onClick={() => void signOut()}
            >
              <Icon name="sign-out" size={19} />
              Đăng xuất
            </button>
          </div>
        </>
      ) : null}

      <nav className={styles.tabbar} aria-label="Điều hướng">
        {TAB_NAV.map((n) => {
          const on = n.key === active.key
          return (
            <a
              key={n.key}
              href={n.segment ? appHref(n.segment) : appHref()}
              className={`${styles.tab} ${on ? styles.tabOn : ''}`}
              aria-current={on ? 'page' : undefined}
            >
              <span className={styles.tabIcon}>
                <Icon name={n.icon} size={20} />
                {attention === n.key ? <span className={styles.tabDot} title="Còn thiếu thông tin" /> : null}
              </span>
              <span className={styles.tabLabel}>{n.label}</span>
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
          </span>
          <span className={styles.tabLabel}>Thêm</span>
        </button>
      </nav>
    </>
  )
}

function UserBlock({ clinic }: { clinic: string }) {
  const { me, signOut } = useSession()
  const name = me?.display_name ?? ''
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.footer} ref={ref}>
      {open ? (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHead}>
            <span className={styles.userName}>{name}</span>
            <span className={styles.userMeta}>{me?.identity}</span>
          </div>
          <a className={styles.menuItem} href={appHref('cai-dat')} role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="settings" size={16} />
            Cài đặt tài khoản
          </a>
          <button type="button" className={`${styles.menuItem} ${styles.menuItemDanger}`} role="menuitem" onClick={() => void signOut()}>
            <Icon name="sign-out" size={16} />
            Đăng xuất
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.user}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${name} · ${clinic}`}
      >
        <span className={styles.avatar}>{initials(name)}</span>
        <span className={styles.userText}>
          <span className={styles.userName}>{clinic}</span>
          <span className={styles.userMeta}>{[name, me?.plan].filter(Boolean).join(' · ')}</span>
        </span>
        <span className={styles.userChevron}>
          <Icon name="chevron-up" size={16} />
        </span>
      </button>
    </div>
  )
}
