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
import { DEMO_ACCOUNT, sendEmailCode, sendPhoneCode, verifyCode } from './mockAuth'
import { startSession } from './session'
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

  // The code verified: open a local session and go into the app shell.
  const enterApp = useCallback(
    (google?: { name: string; email: string }) => {
      startSession(
        google
          ? { identity: google.email, method: 'google', displayName: google.name }
          : email
            ? { identity: email, method: 'email', displayName: DEMO_ACCOUNT.displayName }
            : { identity: normalizePhone(phone), method: 'phone', displayName: DEMO_ACCOUNT.displayName },
      )
      navigate('app')
    },
    [email, phone],
  )

  const confirmCode = useCallback(
    async (entered: string, method: 'phone' | 'email') => {
      setBusy(true)
      const result = await verifyCode(entered)
      setBusy(false)

      if (!result.ok) {
        setCodeError('Mã không đúng. Kiểm tra lại giúp mình nhé.')
        setCode('')
        return
      }
      rememberMethod(method)
      enterApp()
    },
    [enterApp],
  )

  async function submitPhone() {
    const problem = phoneError(phone)
    if (problem) return setFieldError(problem)

    setBusy(true)
    await sendPhoneCode(phone)
    setBusy(false)
    resend.restart()
    goTo('phone-otp')
  }

  async function submitEmail() {
    if (!isValidEmail(email)) return setFieldError('Email chưa đúng định dạng.')

    setBusy(true)
    await sendEmailCode(email)
    setBusy(false)
    resend.restart()
    goTo('email-otp')
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
            onResend={() => {
              resend.restart()
              void sendPhoneCode(phone)
            }}
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
              onPick={(account) => {
                rememberMethod('google')
                enterApp(account)
              }}
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
            onResend={() => {
              resend.restart()
              void sendEmailCode(email)
            }}
            note="Không thấy email? Kiểm tra mục Spam."
          />
        </AuthShell>
      )
  }
}
