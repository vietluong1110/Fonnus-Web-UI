import { useEffect } from 'react'
import { isSignedIn } from '../auth/session'
import { navigate, useAppPath } from '../hooks/useRoute'
import { AppShell, activeNav } from './AppShell'
import { ConfigProvider } from './letan/store'
import { LeTanPage } from './letan/LeTanPage'
import { PlaceholderPage } from './pages/Placeholder'
import { ToastProvider } from './ui'

/**
 * Everything under `#/app`. Guards the session, then picks the page from the
 * first path segment. Only Lễ tân is built; the other five are placeholders.
 */
export function AppRoot() {
  const path = useAppPath()
  const signedIn = isSignedIn()

  useEffect(() => {
    if (!signedIn) navigate('signin')
  }, [signedIn])

  useEffect(() => {
    const nav = activeNav(path)
    document.title = `${nav.label} · Fonnus`
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

  if (!signedIn) return null

  const nav = activeNav(path)

  return (
    <ToastProvider>
      <ConfigProvider>
        <AppShell>{nav.key === 'le-tan' ? <LeTanPage path={path.slice(1)} /> : <PlaceholderPage title={nav.label} />}</AppShell>
      </ConfigProvider>
    </ToastProvider>
  )
}
