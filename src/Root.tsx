import { useEffect } from 'react'
import { App } from './App'
import { AppRoot } from './app/AppRoot'
import { ToastProvider } from './app/ui'
import { SessionProvider } from './auth/SessionProvider'
import { SignInPage } from './auth/SignInPage'
import { SignUpPage } from './auth/SignUpPage'
import { ErrorBoundary } from './ErrorBoundary'
import { useRoute } from './hooks/useRoute'

const TITLES: Record<string, string> = {
  landing: 'Fonnus — Không cuộc gọi nào bị bỏ lỡ.',
  signup: 'Dùng thử miễn phí · Fonnus',
  signin: 'Đăng nhập · Fonnus',
}

/** The site's pages. See `hooks/useRoute` for why the routes are hashes. */
function Pages() {
  const route = useRoute()

  useEffect(() => {
    if (route !== 'app') document.title = TITLES[route]
  }, [route])

  if (route === 'signup') return <SignUpPage />
  if (route === 'signin') return <SignInPage />
  if (route === 'app') return <AppRoot />
  return <App />
}

/*
 * The providers sit above the route switch, not inside a page.
 *
 * `SessionProvider` so the `GET /me` probe runs once at boot rather than
 * restarting on every navigation into `#/app`.
 *
 * `ToastProvider` because an expired session has to be able to say so as it
 * redirects — and if it lived inside `AppRoot`, it would already have unmounted
 * by then. The auth pages get toasts out of it too, which they lacked.
 */
export function Root() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <ToastProvider>
          <Pages />
        </ToastProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}
