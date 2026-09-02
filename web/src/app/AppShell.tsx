import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon, Logo } from '../design-system'
import type { IconName } from '../design-system'
import { DEMO_ACCOUNT } from '../auth/mockAuth'
import { endSession, readSession } from '../auth/session'
import { appHref, navigate, useAppPath } from '../hooks/useRoute'
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
  { key: 'tong-quan', label: 'Tổng quan', icon: 'house', segment: '' },
  { key: 'cuoc-goi', label: 'Cuộc gọi', icon: 'phone-call', segment: 'cuoc-goi' },
  { key: 'lich-hen', label: 'Lịch hẹn', icon: 'calendar-check', segment: 'lich-hen' },
  { key: 'le-tan', label: 'Lễ tân', icon: 'user-round', segment: 'le-tan' },
  { key: 'so-dien-thoai', label: 'Số điện thoại', icon: 'phone-incoming', segment: 'so-dien-thoai' },
  { key: 'cai-dat', label: 'Cài đặt', icon: 'settings', segment: 'cai-dat' },
]

export function activeNav(path: string[]): NavEntry {
  return NAV.find((n) => n.segment === (path[0] ?? '')) ?? NAV[0]
}

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
  const { config } = useConfig()
  const readiness = computeReadiness(config)

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
            const attention = n.key === 'le-tan' && !readiness.r2Done
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
                {attention ? <span className={styles.itemDot} title="Còn thiếu thông tin" /> : null}
              </a>
            )
          })}
        </nav>

        <UserBlock clinic={config.business_name} />
      </aside>

      <main className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </main>
    </div>
  )
}

function UserBlock({ clinic }: { clinic: string }) {
  const session = readSession()
  const name = session?.displayName || DEMO_ACCOUNT.displayName
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

  const signOut = () => {
    endSession()
    navigate('signin')
  }

  return (
    <div className={styles.footer} ref={ref}>
      {open ? (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHead}>
            <span className={styles.userName}>{name}</span>
            <span className={styles.userMeta}>{session?.identity ?? DEMO_ACCOUNT.phone}</span>
          </div>
          <a className={styles.menuItem} href={appHref('cai-dat')} role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="settings" size={16} />
            Cài đặt tài khoản
          </a>
          <button type="button" className={`${styles.menuItem} ${styles.menuItemDanger}`} role="menuitem" onClick={signOut}>
            <Icon name="log-out" size={16} />
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
          <span className={styles.userMeta}>
            {name} · {DEMO_ACCOUNT.plan}
          </span>
        </span>
        <span className={styles.userChevron}>
          <Icon name="chevron-up" size={16} />
        </span>
      </button>
    </div>
  )
}
