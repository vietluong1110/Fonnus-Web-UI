import { useEffect } from 'react'
import { App } from './App'
import { SignInPage } from './auth/SignInPage'
import { SignUpPage } from './auth/SignUpPage'
import { useRoute } from './hooks/useRoute'

const TITLES: Record<string, string> = {
  landing: 'Fonnus — Không cuộc gọi nào bị bỏ lỡ.',
  signup: 'Dùng thử miễn phí · Fonnus',
  signin: 'Đăng nhập · Fonnus',
}

/** The site's three pages. See `hooks/useRoute` for why the routes are hashes. */
export function Root() {
  const route = useRoute()

  useEffect(() => {
    document.title = TITLES[route]
  }, [route])

  if (route === 'signup') return <SignUpPage />
  if (route === 'signin') return <SignInPage />
  return <App />
}
