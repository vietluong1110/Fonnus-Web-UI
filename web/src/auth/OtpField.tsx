import { useEffect, useRef } from 'react'
import styles from './OtpField.module.css'

export const OTP_LENGTH = 6

interface OtpFieldProps {
  value: string
  onChange: (value: string) => void
  /** Fired once the sixth digit lands — the code confirms itself, no button. */
  onComplete: (value: string) => void
  error?: string | null
  disabled?: boolean
  autoFocus?: boolean
}

export function OtpField({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}: OtpFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const completed = useRef(false)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Auto-submit on the sixth digit, but only once per code — otherwise a
  // re-render while verifying would fire it again.
  useEffect(() => {
    if (value.length === OTP_LENGTH && !completed.current) {
      completed.current = true
      onComplete(value)
    }
    if (value.length < OTP_LENGTH) completed.current = false
  }, [value, onComplete])

  const digits = value.padEnd(OTP_LENGTH, ' ').split('').slice(0, OTP_LENGTH)
  const cursor = Math.min(value.length, OTP_LENGTH - 1)

  return (
    <div>
      <div className={styles.wrap} onClick={() => inputRef.current?.focus()}>
        <div className={styles.boxes}>
          {digits.map((digit, i) => (
            <span
              key={i}
              className={`${styles.box} ${error ? styles.boxError : ''} ${
                !error && i === cursor && !disabled ? styles.boxActive : ''
              }`}
            >
              {digit.trim()}
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          className={styles.input}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          aria-label="Mã xác nhận 6 số"
          aria-invalid={!!error}
        />
      </div>

      {error ? (
        <span className={styles.error} role="alert" style={{ display: 'block', marginTop: 10 }}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

interface ResendProps {
  /** Seconds left before the resend link unlocks. */
  secondsLeft: number
  onResend: () => void
  /** The "gọi điện đọc mã" fallback — omitted for email codes. */
  onVoiceCall?: () => void
  voiceCallSent?: boolean
  note?: string
}

export function OtpFooter({ secondsLeft, onResend, onVoiceCall, voiceCallSent, note }: ResendProps) {
  const mm = Math.floor(secondsLeft / 60)
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className={styles.footer}>
      {note ? <span className={styles.muted}>{note}</span> : null}

      {secondsLeft > 0 ? (
        <span className={styles.muted}>
          Gửi lại mã sau{' '}
          <span className={styles.num}>
            {mm}:{ss}
          </span>
        </span>
      ) : (
        <button type="button" className={styles.linkButton} onClick={onResend}>
          Gửi lại mã
        </button>
      )}

      {onVoiceCall ? (
        <button
          type="button"
          className={styles.linkButton}
          onClick={onVoiceCall}
          disabled={voiceCallSent}
        >
          {voiceCallSent ? 'Fonnus đang gọi cho bạn…' : 'Gọi điện đọc mã cho tôi'}
        </button>
      ) : null}
    </div>
  )
}
