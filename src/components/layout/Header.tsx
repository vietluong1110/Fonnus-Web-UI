import { useEffect, useRef, useState } from 'react'
import { Button, Icon, Logo } from '../../design-system'
import { NAV_GROUPS } from '../../data/content'
import type { NavGroup, NavItem } from '../../data/content'
import { hrefFor } from '../../hooks/useRoute'
import { useIsNarrow } from '../../hooks/useIsNarrow'
import styles from './Header.module.css'

/** Below this the four menus cannot sit in the pill; it becomes brand + CTA + drawer. */
const HEADER_NARROW = 900
/** Past this scroll the pill tightens and its glass goes more opaque. */
const CONDENSE_AT = 24
/** Grace period so the pointer can cross the gap into an open menu. */
const CLOSE_DELAY_MS = 140

interface HeaderProps {
  /** "Nghe thử Linh" opens the call demo rather than scrolling anywhere. */
  onTryCall: () => void
}

/**
 * A floating glass pill, centred and stuck to the top at every scroll position.
 *
 * The glass is tinted cream (--milk), not grey — that tint is what keeps it
 * reading as Fonnus rather than as a generic SaaS bar. Responsiveness is a
 * swap, not a shrink: below 900px the menus move into a drawer and the pill
 * keeps only the brand, the primary CTA and the toggle.
 */
export function Header({ onTryCall }: HeaderProps) {
  const narrow = useIsNarrow(HEADER_NARROW)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > CONDENSE_AT)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Widening the window while the drawer is open would strand it on screen.
  useEffect(() => {
    if (!narrow) setMenuOpen(false)
    else setOpen(null)
  }, [narrow])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(null)
      setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const hold = (label: string) => {
    clearTimeout(closeTimer.current)
    setOpen(label)
  }
  const release = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(null), CLOSE_DELAY_MS)
  }

  const pick = (item: NavItem) => {
    setOpen(null)
    setMenuOpen(false)
    if (item.demo) onTryCall()
  }

  return (
    <>
      <div className={styles.rail}>
        <div className={`${styles.pill} ${scrolled ? styles.pillScrolled : ''}`}>
          <a href="#hero" className={styles.logoLink} aria-label="Fonnus — về đầu trang">
            <Logo variant="horizontal" height={scrolled ? 23 : 26} />
          </a>

          {narrow ? null : (
            <nav className={styles.nav} onMouseLeave={release}>
              {NAV_GROUPS.map((group) => (
                <GroupTrigger
                  key={group.label}
                  group={group}
                  open={open === group.label}
                  onHold={() => hold(group.label)}
                  onRelease={release}
                  onToggle={() => setOpen((v) => (v === group.label ? null : group.label))}
                  onPick={pick}
                />
              ))}
            </nav>
          )}

          <div className={styles.actions}>
            {narrow ? null : (
              <a href={hrefFor('signin')} className={styles.cta}>
                <Button variant="secondary" size="sm">
                  Đăng nhập
                </Button>
              </a>
            )}
            <a href={hrefFor('signup')} className={styles.cta}>
              <Button size="sm">
                {narrow ? 'Dùng thử' : 'Dùng thử miễn phí'}
              </Button>
            </a>
            {narrow ? (
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={menuOpen}
                className={styles.menuButton}
              >
                <Icon name={menuOpen ? 'x' : 'menu'} size={19} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {narrow && menuOpen ? (
        <div className={styles.drawer}>
          {NAV_GROUPS.map((group) =>
            group.items ? (
              <div key={group.label} className={styles.drawerGroup}>
                <span className={styles.drawerGroupLabel}>{group.label}</span>
                {group.items.map((item) => (
                  <DrawerItem key={item.label} item={item} onPick={pick} />
                ))}
              </div>
            ) : (
              <a
                key={group.label}
                href={group.href}
                onClick={() => setMenuOpen(false)}
                className={styles.drawerLink}
              >
                {group.label}
              </a>
            ),
          )}
          <a href={hrefFor('signin')} className={styles.drawerSignIn}>
            Đăng nhập
          </a>
        </div>
      ) : null}
    </>
  )
}

interface TriggerProps {
  group: NavGroup
  open: boolean
  onHold: () => void
  onRelease: () => void
  onToggle: () => void
  onPick: (item: NavItem) => void
}

function GroupTrigger({ group, open, onHold, onRelease, onToggle, onPick }: TriggerProps) {
  if (!group.items) {
    return (
      <a href={group.href} className={styles.navLink} onMouseEnter={onRelease}>
        {group.label}
      </a>
    )
  }

  return (
    <div className={styles.navGroup} onMouseEnter={onHold} onMouseLeave={onRelease}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`${styles.navLink} ${open ? styles.navLinkOpen : ''}`}
      >
        {group.label}
        <Icon name="chevron-down" size={12} className={open ? styles.chevronOpen : styles.chevron} />
      </button>

      {open ? (
        <div className={styles.panel} role="menu">
          {group.items.map((item) => (
            <PanelItem key={item.label} item={item} onPick={onPick} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PanelItem({ item, onPick }: { item: NavItem; onPick: (i: NavItem) => void }) {
  const body = (
    <>
      <span className={styles.panelIcon} aria-hidden="true">
        <Icon name={item.icon} size={17} />
      </span>
      <span className={styles.panelText}>
        <span className={styles.panelLabel}>{item.label}</span>
        <span className={styles.panelDesc}>{item.desc}</span>
      </span>
    </>
  )

  return item.demo ? (
    <button type="button" role="menuitem" onClick={() => onPick(item)} className={styles.panelRowDemo}>
      {body}
    </button>
  ) : (
    <a href={item.href} role="menuitem" onClick={() => onPick(item)} className={styles.panelRow}>
      {body}
    </a>
  )
}

function DrawerItem({ item, onPick }: { item: NavItem; onPick: (i: NavItem) => void }) {
  return item.demo ? (
    <button type="button" onClick={() => onPick(item)} className={styles.drawerItemDemo}>
      {item.label}
    </button>
  ) : (
    <a href={item.href} onClick={() => onPick(item)} className={styles.drawerItem}>
      {item.label}
    </a>
  )
}
