import { useEffect } from 'react'
import { App } from './App'
import { AppRoot } from './app/AppRoot'
import { SignInPage } from './auth/SignInPage'
import { SignUpPage } from './auth/SignUpPage'
import { useRoute } from './hooks/useRoute'

const TITLES: Record<string, string> = {
  landing: 'Fonnus — Không cuộc gọi nào bị bỏ lỡ.',
  signup: 'Tạo tài khoản · Fonnus',
  signin: 'Đăng nhập · Fonnus',
}

/** The site's pages. See `hooks/useRoute` for why the routes are hashes. */
export function Root() {
  const route = useRoute()

  useEffect(() => {
    if (route !== 'app') document.title = TITLES[route]
  }, [route])

  if (route === 'signup') return <SignUpPage />
  if (route === 'signin') return <SignInPage />
  if (route === 'app') return <AppRoot />
  return <App />
}
