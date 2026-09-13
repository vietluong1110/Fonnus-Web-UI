import { useEffect } from 'react'
import { useSession } from '../auth/SessionProvider'
import { appHref, navigate, useAppPath } from '../hooks/useRoute'
import { AppShell, activeNav } from './AppShell'
import { ConfigProvider } from './letan/store'
import { LeTanPage } from './letan/LeTanPage'
import { OverviewPage } from './pages/overview/OverviewPage'
import { CallsPage } from './pages/calls/CallsPage'
import { AppointmentsPage } from './pages/appointments/AppointmentsPage'
import { NumbersPage } from './pages/numbers/NumbersPage'
import { PlaceholderPage } from './pages/Placeholder'
import { ConnectionError, ShellSkeleton } from './Boot'

/**
 * Everything under `#/app`. Guards the session, then picks the page from the
 * first path segment. Every tab is built except Cài đặt, which is a
 * placeholder.
 *
 * The guard has three answers, not two. "Still checking" is a real state — the
 * session lives in an httpOnly cookie this app cannot read, so the only way to
 * know is a round trip, and bouncing to sign-in while that is in flight would
 * throw out a perfectly good session on every reload.
 */
export function AppRoot() {
  const path = useAppPath()
  const { status, error, hint } = useSession()

  useEffect(() => {
    // Only once we actually know. `checking` must not redirect.
    if (status === 'anonymous' && !error) navigate('signin')
  }, [status, error])

  useEffect(() => {
    const nav = activeNav(path)
    document.title = `${nav.label} · Fonnus`
  }, [path])

  // Tổng quan lives at `#/app/tong-quan`, like every other page at its own
  // segment. A bare `#/app` is still the door sign-in, the OAuth return URI and
  // old bookmarks use, so it forwards — with `replace`, not a new entry, or
  // Back would land on a hash that immediately bounces forward again.
  useEffect(() => {
    if (!path.length) window.location.replace(appHref('tong-quan'))
  }, [path])

  // The landing page scrolls smoothly between its anchors; inside the app
  // every jump (a save bar appearing, a section link) should be instant.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    return () => {
      root.style.scrollBehavior = previous
    }
  }, [])

  if (status === 'checking') {
    // If this browser signed in recently, show the frame it is about to see
    // rather than a blank page. The hint is not a credential and gates nothing.
    return hint ? <ShellSkeleton /> : null
  }

  // Unreachable is not signed-out. Offer a retry instead of throwing the owner
  // back to a login screen they cannot get through either.
  if (status === 'anonymous' && error) return <ConnectionError />

  if (status === 'anonymous') return null

  const nav = activeNav(path)

  return (
    <ConfigProvider>
      <AppShell>
        {nav.key === 'le-tan' ? (
          <LeTanPage path={path.slice(1)} />
        ) : nav.key === 'tong-quan' ? (
          <OverviewPage />
        ) : nav.key === 'cuoc-goi' ? (
          <CallsPage path={path.slice(1)} />
        ) : nav.key === 'lich-hen' ? (
          <AppointmentsPage />
        ) : nav.key === 'so-dien-thoai' ? (
          <NumbersPage path={path.slice(1)} />
        ) : (
          <PlaceholderPage title={nav.label} />
        )}
      </AppShell>
    </ConfigProvider>
  )
}
