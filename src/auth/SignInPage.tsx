import { useCallback, useState } from 'react'
import { Button } from '../design-system'
import { hrefFor, navigate } from '../hooks/useRoute'
import { AuthHeading, AuthShell } from './AuthShell'
import { Field, PhoneField } from './Field'
import { GoogleChooser } from './GoogleChooser'
import { OtpField, OtpFooter } from './OtpField'
import { LastUsedBadge, SocialOptions } from './SocialOptions'
import { readLastMethod, rememberMethod } from './lastMethod'
import { formatPhone, isValidEmail, normalizePhone, phoneError } from './phone'
import { useCountdown } from './useCountdown'
import { api, messageFor } from '../api'
import type { GoogleAccount, Me } from '../api'
import { useSession } from './SessionProvider'
import styles from './AuthPage.module.css'

/*
 * Same three methods as sign-up, because an owner will not remember which one
 * they used. Phone + SMS code is the default; there is no password anywhere.
 *
 * The one thing this door has that sign-up does not: a "Lần trước" badge on the
 * method this browser used last time. Remembering that for the owner is the
 * cheapest thing on the screen and the one they are actually looking for.
 */
type Step = 'phone' | 'phone-otp' | 'google-chooser' | 'email' | 'email-otp'

const RESEND_SECONDS = 42

/** Top right on every step of this door. */
const SWAP = (
  <>
    Chưa có tài khoản?{' '}
    <a href={hrefFor('signup')} style={{ fontWeight: 500 }}>
      Dùng thử miễn phí
    </a>
  </>
)

export function SignInPage() {
  const session = useSession()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Read once on mount: it must not change under the owner mid-flow.
  const [lastUsed] = useState(readLastMethod)

  const resend = useCountdown(RESEND_SECONDS)

  const goTo = (next: Step) => {
    setCode('')
    setCodeError(null)
    setFieldError(null)
    setStep(next)
  }

  // A resend that fails says so where the code goes — a 429 is the likely one,
  // and an owner who sees nothing presses again. It clears any older code error.
  async function resendCode(send: () => Promise<unknown>) {
    resend.restart()
    setCodeError(null)
    try {
      await send()
    } catch (e) {
      setCodeError(messageFor(e))
    }
  }

  // The server has set the session cookie: record who is in and go to the shell.
  const enterApp = useCallback(
    (me: Me) => {
      session.signIn(me)
      navigate('app')
    },
    [session],
  )

  const confirmCode = useCallback(
    async (entered: string, method: 'phone' | 'email') => {
      setBusy(true)
      try {
        const identity = method === 'email' ? email : normalizePhone(phone)
        const me = await api.auth.verifyCode({ identity, code: entered })
        rememberMethod(method)
        enterApp(me)
      } catch (e) {
        // messageFor() knows the difference between a wrong code, an expired
        // one, too many tries and the server simply being down.
        setCodeError(messageFor(e))
        setCode('')
      } finally {
        setBusy(false)
      }
    },
    [email, phone, enterApp],
  )

  const signInWithGoogle = useCallback(
    async (account: GoogleAccount) => {
      setBusy(true)
      try {
        const me = await api.auth.signInWithGoogle(account)
        rememberMethod('google')
        enterApp(me)
      } catch (e) {
        setFieldError(messageFor(e))
        goTo('phone')
      } finally {
        setBusy(false)
      }
    },
    [enterApp],
  )

  async function submitPhone() {
    const problem = phoneError(phone)
    if (problem) return setFieldError(problem)

    setBusy(true)
    try {
      await api.auth.sendPhoneCode(phone)
      resend.restart()
      goTo('phone-otp')
    } catch (e) {
      setFieldError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  async function submitEmail() {
    if (!isValidEmail(email)) return setFieldError('Email chưa đúng định dạng.')

    setBusy(true)
    try {
      await api.auth.sendEmailCode(email)
      resend.restart()
      goTo('email-otp')
    } catch (e) {
      setFieldError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  switch (step) {
    case 'phone':
      return (
        <AuthShell variant="signin" swap={SWAP}>
          <AuthHeading title="Đăng nhập">Mã đăng nhập sẽ được gửi qua SMS.</AuthHeading>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitPhone()
            }}
            className={styles.formGroup}
          >
            <PhoneField
              label="Số điện thoại"
              badge={lastUsed === 'phone' ? <LastUsedBadge /> : null}
              placeholder="090 123 45 67"
              value={formatPhone(phone)}
              onChange={(e) => {
                setPhone(normalizePhone(e.target.value).slice(0, 10))
                setFieldError(null)
              }}
              autoFocus
              error={fieldError}
            />
            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? 'Đang gửi…' : 'Gửi mã đăng nhập'}
            </Button>
          </form>

          <SocialOptions
            googleLabel="Đăng nhập với Google"
            emailLabel="Đăng nhập bằng email"
            onGoogle={() => goTo('google-chooser')}
            onEmail={() => goTo('email')}
            lastUsed={lastUsed}
          />
        </AuthShell>
      )

    case 'phone-otp':
      return (
        <AuthShell
          variant="signin"
          back={{ label: 'Quay lại', onClick: () => goTo('phone') }}
          swap={SWAP}
        >
          <AuthHeading title="Nhập mã 6 số">
            Đã gửi SMS tới <span className={styles.num}>{formatPhone(phone)}</span> ·{' '}
            <button type="button" className={styles.inlineButton} onClick={() => goTo('phone')}>
              Đổi số
            </button>
          </AuthHeading>

          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(entered) => void confirmCode(entered, 'phone')}
            error={codeError}
            disabled={busy}
          />

          <OtpFooter
            secondsLeft={resend.left}
            onResend={() => void resendCode(() => api.auth.sendPhoneCode(phone))}
          />
        </AuthShell>
      )

    case 'google-chooser':
      return (
        <AuthShell
          variant="signin"
          back={{ label: 'Quay lại', onClick: () => goTo('phone') }}
          overlay={
            <GoogleChooser
              onPick={(account) => void signInWithGoogle(account)}
              onDismiss={() => goTo('phone')}
            />
          }
        >
          <div className={styles.behindOverlay} aria-hidden="true">
            <AuthHeading title="Đăng nhập">Mã đăng nhập sẽ được gửi qua SMS.</AuthHeading>
            <PhoneField label="Số điện thoại" placeholder="090 123 45 67" disabled />
          </div>
        </AuthShell>
      )

    case 'email':
      return (
        <AuthShell
          variant="signin"
          back={{ label: 'Dùng số điện thoại', onClick: () => goTo('phone') }}
          swap={SWAP}
        >
          <AuthHeading title="Đăng nhập bằng email">
            Mã đăng nhập sẽ được gửi tới hộp thư của bạn.
          </AuthHeading>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitEmail()
            }}
            className={styles.formGroup}
          >
            <Field
              label="Email"
              type="email"
              placeholder="lan@vietsmile.vn"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldError(null)
              }}
              autoComplete="email"
              autoFocus
              error={fieldError}
            />
            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? 'Đang gửi…' : 'Gửi mã tới email'}
            </Button>
          </form>
        </AuthShell>
      )

    case 'email-otp':
      return (
        <AuthShell
          variant="signin"
          back={{ label: 'Quay lại', onClick: () => goTo('email') }}
          swap={SWAP}
        >
          <AuthHeading title="Kiểm tra hộp thư">
            Mã 6 số đã gửi tới <b className={styles.strong}>{email}</b> ·{' '}
            <button type="button" className={styles.inlineButton} onClick={() => goTo('email')}>
              Đổi email
            </button>
          </AuthHeading>

          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(entered) => void confirmCode(entered, 'email')}
            error={codeError}
            disabled={busy}
          />

          <OtpFooter
            secondsLeft={resend.left}
            onResend={() => void resendCode(() => api.auth.sendEmailCode(email))}
            note="Không thấy email? Kiểm tra mục Spam."
          />
        </AuthShell>
      )
  }
}
