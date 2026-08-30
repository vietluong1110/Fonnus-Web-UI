import { useCallback, useState } from 'react'
import { Button, Input } from '../design-system'
import { hrefFor, navigate } from '../hooks/useRoute'
import { AuthHeading, AuthShell } from './AuthShell'
import { GoogleChooser } from './GoogleChooser'
import { OtpField, OtpFooter } from './OtpField'
import { SocialOptions, SwapLink } from './SocialOptions'
import { formatPhone, isValidEmail, isValidPhone, normalizePhone, phoneError } from './phone'
import { useCountdown } from './useCountdown'
import { requestVoiceCode, sendEmailCode, sendPhoneCode, verifyCode } from './mockAuth'
import styles from './AuthPage.module.css'

/*
 * Same three methods as sign-up, because an owner will not remember which one
 * they used. Phone + SMS code is the default; there is no password anywhere.
 *
 * No stepper here: signing in is one screen and a code, and a progress bar
 * across two steps only advertises length.
 */
type Step = 'phone' | 'phone-otp' | 'google-chooser' | 'email' | 'email-otp'

const RESEND_SECONDS = 42

export function SignInPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [voiceSent, setVoiceSent] = useState(false)

  const resend = useCountdown(RESEND_SECONDS)

  const goTo = (next: Step) => {
    setCode('')
    setCodeError(null)
    setFieldError(null)
    setVoiceSent(false)
    setStep(next)
  }

  // TODO: replace with a redirect into the app shell (Tổng quan).
  const enterApp = useCallback(() => navigate('landing'), [])

  const confirmCode = useCallback(
    async (entered: string) => {
      setBusy(true)
      const result = await verifyCode(entered)
      setBusy(false)

      if (!result.ok) {
        setCodeError('Mã không đúng. Kiểm tra lại giúp mình nhé.')
        setCode('')
        return
      }
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
        <AuthShell variant="signin" centred>
          <AuthHeading title="Đăng nhập">
            Nhập số điện thoại đã đăng ký — mã xác nhận gửi qua SMS.
          </AuthHeading>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitPhone()
            }}
            className={styles.formGroup}
          >
            <Input
              label="Số điện thoại"
              placeholder="090 123 45 67"
              value={formatPhone(phone)}
              onChange={(e) => {
                setPhone(normalizePhone(e.target.value).slice(0, 10))
                setFieldError(null)
              }}
              numeric
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              error={fieldError}
            />
            <Button type="submit" size="md" fullWidth disabled={busy || !isValidPhone(phone)}>
              {busy ? 'Đang gửi…' : 'Gửi mã đăng nhập'}
            </Button>
          </form>

          <SocialOptions
            googleLabel="Đăng nhập với Google"
            emailLabel="Đăng nhập với email"
            onGoogle={() => goTo('google-chooser')}
            onEmail={() => goTo('email')}
          />

          <SwapLink>
            Chưa có tài khoản?{' '}
            <a href={hrefFor('signup')} style={{ fontWeight: 500 }}>
              Dùng thử miễn phí
            </a>
          </SwapLink>
        </AuthShell>
      )

    case 'phone-otp':
      return (
        <AuthShell variant="signin" centred>
          <AuthHeading title="Nhập mã 6 số">
            Đã gửi SMS tới <span className={styles.num}>{formatPhone(phone)}</span> ·{' '}
            <button type="button" className={styles.inlineButton} onClick={() => goTo('phone')}>
              Đổi số
            </button>
          </AuthHeading>

          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(entered) => void confirmCode(entered)}
            error={codeError}
            disabled={busy}
          />

          <OtpFooter
            secondsLeft={resend.left}
            onResend={() => {
              resend.restart()
              void sendPhoneCode(phone)
            }}
            onVoiceCall={() => {
              setVoiceSent(true)
              void requestVoiceCode(phone)
            }}
            voiceCallSent={voiceSent}
          />
        </AuthShell>
      )

    case 'google-chooser':
      return (
        <AuthShell
          variant="signin"
          centred
          overlay={<GoogleChooser onPick={enterApp} onDismiss={() => goTo('phone')} />}
        >
          <div className={styles.behindOverlay} aria-hidden="true">
            <AuthHeading title="Đăng nhập" />
            <Input label="Số điện thoại" placeholder="090 123 45 67" numeric disabled />
          </div>
        </AuthShell>
      )

    case 'email':
      return (
        <AuthShell variant="signin" centred>
          <AuthHeading title="Đăng nhập bằng email" />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitEmail()
            }}
            className={styles.formGroup}
          >
            <Input
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
            <Button type="submit" size="md" fullWidth disabled={busy || !isValidEmail(email)}>
              {busy ? 'Đang gửi…' : 'Gửi mã tới email'}
            </Button>
          </form>

          <button type="button" className={styles.inlineButton} onClick={() => goTo('phone')}>
            ‹ Dùng số điện thoại
          </button>
        </AuthShell>
      )

    case 'email-otp':
      return (
        <AuthShell variant="signin" centred>
          <AuthHeading title="Kiểm tra hộp thư">
            Mã 6 số đã gửi tới <b style={{ color: 'var(--ink)' }}>{email}</b> ·{' '}
            <button type="button" className={styles.inlineButton} onClick={() => goTo('email')}>
              Đổi email
            </button>
          </AuthHeading>

          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(entered) => void confirmCode(entered)}
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
