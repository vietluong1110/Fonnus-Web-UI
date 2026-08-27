import { useEffect, useState } from 'react'
import { Button, Icon, Logo } from '../../design-system'
import { NAV_LINKS } from '../../data/content'
import { useIsNarrow } from '../../hooks/useIsNarrow'
import styles from './Header.module.css'

/**
 * Frozen to the top of the viewport at every scroll position.
 *
 * Responsiveness is a swap, not a shrink: below 1060px the seven links move
 * into a drawer rather than being squeezed off the row one at a time. The
 * "Tham gia pilot" CTA survives both layouts — it is the one action the page
 * is asking for.
 */
export function Header() {
  const narrow = useIsNarrow()
  const [menuOpen, setMenuOpen] = useState(false)

  // Widening the window while the drawer is open would strand it on screen.
  useEffect(() => {
    if (!narrow) setMenuOpen(false)
  }, [narrow])

  return (
    <>
      <header className={styles.header}>
        <a href="#hero" className={styles.logoLink}>
          <Logo variant="horizontal" height={28} />
        </a>

        {narrow ? (
          <div className={styles.narrowActions}>
            <a href="#lien-he" className={styles.cta}>
              <Button size="sm">Tham gia pilot</Button>
            </a>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
              className={styles.menuButton}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        ) : (
          <>
            <nav className={styles.nav}>
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className={styles.navLink}>
                  {link.label}
                </a>
              ))}
            </nav>
            <a href="#lien-he" className={styles.cta}>
              <Button size="sm">Tham gia pilot</Button>
            </a>
          </>
        )}
      </header>

      {narrow && menuOpen ? (
        <div className={styles.drawer}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={styles.drawerLink}
            >
              {link.drawerLabel ?? link.label}
            </a>
          ))}
        </div>
      ) : null}

      <div className={styles.spacer} />
    </>
  )
}
