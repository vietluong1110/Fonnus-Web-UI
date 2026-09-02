import { useCallback, useEffect, useState } from 'react'
import { Button } from '../design-system'
import { hrefFor, navigate } from '../hooks/useRoute'
import { startSession } from './session'
import { AuthHeading, AuthShell } from './AuthShell'
import { Field, PhoneField } from './Field'
import { GoogleChooser } from './GoogleChooser'
import { OtpField, OtpFooter } from './OtpField'
import { SocialOptions, Terms } from './SocialOptions'
import { takePhone } from './handoff'
import { rememberMethod } from './lastMethod'
import { formatPhone, isValidEmail, normalizePhone, phoneError } from './phone'
import { useCountdown } from './useCountdown'
import {
  DEMO_ACCOUNT,
  requestVoiceCode,
  saveProfile,
  sendEmailCode,
  sendPhoneCode,
  verifyCode,
} from './mockAuth'
import { saveProfile, sendEmailCode, sendPhoneCode, verifyCode } from './mockAuth'
import styles from './AuthPage.module.css'

/*
 * Three ways in, deliberately different lengths:
 *
 *   phone  → number → SMS code → name (skippable)
 *   Google → account picker → in                      ← one tap, nothing re-asked
 *   email  → email → code → name + optional number
 *
 * The phone is verified only where it *is* the login identity, i.e. the phone
 * flow. Everywhere else it is an ordinary profile field, and the clinic's own
 * hotline is never asked for here — that belongs in setup, next to forwarding.
 *
 * No step indicator: the heading says where you are, and `back` is how you
 * leave. Announcing "1 of 3" before the first field only prices the journey.
 */
type Step =
  | 'phone'
  | 'phone-otp'
  | 'phone-name'
  | 'google-chooser'
  | 'email'
  | 'email-otp'
  | 'email-name'
  | 'existing-otp' // the number already has an account: sign in, never error
  | 'done'

const RESEND_SECONDS = 42
const EMAIL_RESEND_SECONDS = 55

/** Top right on every step of this door. */
const SWAP = (
  <>
    Đã có tài khoản?{' '}
    <a href={hrefFor('signin')} style={{ fontWeight: 500 }}>
      Đăng nhập
    </a>
  </>
)

export function SignUpPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [code, setCode] = useState('')
  const [greetName, setGreetName] = useState('')
  const [signedUpWith, setSignedUpWith] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resend = useCountdown(RESEND_SECONDS)
  const emailResend = useCountdown(EMAIL_RESEND_SECONDS)

  // A number typed in the landing hero skips this screen and goes to the code.
  useEffect(() => {
    const handedOff = takePhone()
    if (!handedOff) return
    setPhone(handedOff)
    setBusy(true)
    sendPhoneCode(handedOff)
      .then(({ existingAccount }) => setStep(existingAccount ? 'existing-otp' : 'phone-otp'))
      .finally(() => setBusy(false))
  }, [])

  const goTo = (next: Step) => {
    setCode('')
    setCodeError(null)
    setFieldError(null)
    setStep(next)
  }

  async function submitPhone() {
    const problem = phoneError(phone)
    if (problem) return setFieldError(problem)

    setBusy(true)
    const { existingAccount } = await sendPhoneCode(phone)
    setBusy(false)
    resend.restart()
    goTo(existingAccount ? 'existing-otp' : 'phone-otp')
  }

  async function submitEmail() {
    if (!isValidEmail(email)) return setFieldError('Email chưa đúng định dạng.')

    setBusy(true)
    await sendEmailCode(email)
    setBusy(false)
    emailResend.restart()
    goTo('email-otp')
  }

  // Confirms itself on the sixth digit — no "Xác nhận" button to hunt for.
  const confirmCode = useCallback(async (entered: string, next: Step) => {
    setBusy(true)
    const result = await verifyCode(entered)
    setBusy(false)

    if (!result.ok) {
      setCodeError('Mã không đúng. Kiểm tra lại giúp mình nhé.')
      setCode('')
      return
    }
    setCodeError(null)
    setStep(next)
  }, [])

  async function finish(
    profile: { fullName?: string; phone?: string; email?: string },
    greeting: string,
    method: 'phone' | 'email',
  ) {
    setBusy(true)
    await saveProfile(profile)
    setBusy(false)
    rememberMethod(method)
    setGreetName(greeting)
    setStep('done')
  }

  // The account exists once the code verified: open a local session and go in.
  const enterApp = () => {
    startSession({
      identity: phone || email || 'google',
      method: phone ? 'phone' : email ? 'email' : 'google',
      displayName: fullName || greetName || DEMO_ACCOUNT.displayName,
    })
    navigate('app')
  }

  switch (step) {
    case 'phone':
      return (
        <AuthShell variant="signup" swap={SWAP}>
          <AuthHeading title="Dùng thử miễn phí">Mã xác nhận sẽ được gửi qua SMS.</AuthHeading>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitPhone()
            }}
            className={styles.formGroup}
          >
            <PhoneField
              label="Số điện thoại"
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
              {busy ? 'Đang gửi…' : 'Gửi mã xác nhận'}
            </Button>
          </form>

          <SocialOptions
            googleLabel="Tiếp tục với Google"
            emailLabel="Đăng ký bằng email"
            onGoogle={() => goTo('google-chooser')}
            onEmail={() => goTo('email')}
          />

          <Terms />
        </AuthShell>
      )

    case 'phone-otp':
      return (
        <AuthShell
          variant="signup"
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
            onComplete={(entered) => void confirmCode(entered, 'phone-name')}
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

    // Verified: there is an account now, so there is nothing to go back to.
    case 'phone-name':
      return (
        <AuthShell variant="signup" back={null} swap={SWAP}>
          <AuthHeading title="Chào bạn! Gọi bạn thế nào ạ?">
            Fonnus dùng tên này khi trao đổi với bạn.
          </AuthHeading>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void finish({ fullName, phone }, fullName, 'phone')
            }}
            className={styles.formGroup}
          >
            <Field
              label="Họ và tên"
              placeholder="Nguyễn Lan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
            <Button type="submit" size="lg" fullWidth disabled={busy}>
              Vào Fonnus →
            </Button>
          </form>

          <button
            type="button"
            className={styles.skip}
            onClick={() => void finish({ phone }, '', 'phone')}
            disabled={busy}
          >
            Để sau
          </button>
        </AuthShell>
      )

    case 'google-chooser':
      return (
        <AuthShell
          variant="signup"
          back={{ label: 'Quay lại', onClick: () => goTo('phone') }}
          overlay={
            <GoogleChooser
              onPick={(account) => {
                rememberMethod('google')
                setSignedUpWith(account.email)
                setGreetName(account.name.split(' ').slice(-1)[0])
                setStep('done')
              }}
              onDismiss={() => goTo('phone')}
            />
          }
        >
          {/* The form the chooser is covering — dimmed, not interactive. */}
          <div className={styles.behindOverlay} aria-hidden="true">
            <AuthHeading title="Dùng thử miễn phí">Mã xác nhận sẽ được gửi qua SMS.</AuthHeading>
            <PhoneField label="Số điện thoại" placeholder="090 123 45 67" disabled />
          </div>
        </AuthShell>
      )

    case 'email':
      return (
        <AuthShell
          variant="signup"
          back={{ label: 'Dùng số điện thoại', onClick: () => goTo('phone') }}
          swap={SWAP}
        >
          <AuthHeading title="Đăng ký bằng email">
            Mã xác nhận sẽ được gửi tới hộp thư của bạn.
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

          <Terms />
        </AuthShell>
      )

    case 'email-otp':
      return (
        <AuthShell
          variant="signup"
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
            onComplete={(entered) => void confirmCode(entered, 'email-name')}
            error={codeError}
            disabled={busy}
          />

          <OtpFooter
            secondsLeft={emailResend.left}
            onResend={() => {
              emailResend.restart()
              void sendEmailCode(email)
            }}
            note="Không thấy email? Kiểm tra mục Spam."
          />
        </AuthShell>
      )

    case 'email-name':
      return (
        <AuthShell variant="signup" back={null} swap={SWAP}>
          <AuthHeading title="Chào bạn! Gọi bạn thế nào ạ?">
            Fonnus dùng tên này khi trao đổi với bạn.
          </AuthHeading>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void finish({ fullName, email, phone }, fullName, 'email')
            }}
            className={styles.formGroup}
          >
            <Field
              label="Họ và tên"
              placeholder="Nguyễn Lan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
            {/* Unverified on purpose: no second OTP when email is the identity. */}
            <PhoneField
              label="Số điện thoại · tuỳ chọn"
              placeholder="090 123 45 67"
              value={formatPhone(phone)}
              onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 10))}
            />
            <Button type="submit" size="lg" fullWidth disabled={busy}>
              Vào Fonnus →
            </Button>
          </form>

          <button
            type="button"
            className={styles.skip}
            onClick={() => void finish({ email }, '', 'email')}
            disabled={busy}
          >
            Để sau
          </button>
        </AuthShell>
      )

    // Someone who already has an account typed their number into sign-up. This
    // is the most common drop-off in phone-first flows, so it is not an error:
    // the code is already on its way and the screen quietly becomes sign-in.
    case 'existing-otp':
      return (
        <AuthShell
          variant="signin"
          back={{ label: 'Dùng số khác', onClick: () => goTo('phone') }}
        >
          <div className={styles.notice}>
            <span className={styles.noticeTick} aria-hidden="true">
              ✓
            </span>
            <span>
              Số <span className={styles.num}>{formatPhone(phone)}</span> đã có tài khoản Fonnus — mình đăng
              nhập luôn nhé, không cần tạo lại.
            </span>
          </div>

          <AuthHeading title="Nhập mã 6 số">Mã đăng nhập đã được gửi qua SMS.</AuthHeading>

          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(entered) => {
              rememberMethod('phone')
              void confirmCode(entered, 'done')
            }}
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

    case 'done':
      return (
        <AuthShell variant="signup" back={null}>
          <div className={styles.done}>
            <span className={styles.doneTick} aria-hidden="true">
              ✓
            </span>

            <div className={styles.doneHeading}>
              <AuthHeading title={greetName ? `Xong rồi, chào ${greetName}!` : 'Xong rồi!'} />
              {signedUpWith ? (
                <p className={styles.doneWith}>
                  Tài khoản đã tạo bằng <b className={styles.strong}>{signedUpWith}</b>.
                </p>
              ) : null}
            </div>

            <Button size="lg" fullWidth onClick={enterApp}>
              Vào Fonnus →
            </Button>

            <span className={styles.doneNext}>
              Bước tiếp theo trong ứng dụng: khai báo số hotline để Fonnus nghe máy.
            </span>
          </div>
        </AuthShell>
      )
  }
}
