import { useState } from 'react'
import { api, messageFor } from '../../api'
import { Button, Input } from '../../design-system'
import { CONTACT } from '../../data/content'
import { hrefFor } from '../../hooks/useRoute'
import section from '../../styles/section.module.css'
import styles from './Contact.module.css'

const POINTS = [
  'Chúng tôi làm cùng bạn phần chuyển hướng cuộc gọi',
  'Dùng thử 14 ngày trước khi trả tiền',
  'Không ràng buộc hợp đồng dài hạn',
]

const EMPTY = { clinic: '', name: '', phone: '' }

/**
 * The slower door, for owners who want a person before they want an account:
 * chains and hospitals on a quoted plan, and anyone who would rather be walked
 * through call forwarding than click "Dùng thử miễn phí".
 *
 * Posts through `api.leads`. The landing page is outside `ToastProvider` — and
 * should be: a toast is a thing that disappears, and someone who just typed
 * their phone number needs to see what happened to it. So the error lives
 * inline, under the button, and the form keeps what they typed.
 */
export function Contact() {
  const [fields, setFields] = useState(EMPTY)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await api.leads.submit({
        clinic_name: fields.clinic,
        contact_name: fields.name,
        phone: fields.phone,
      })
      setSent(true)
    } catch (e) {
      setError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="lien-he" className={`${section.section} ${section.milk}`}>
      <div className={styles.inner}>
        <div data-reveal="0" data-reveal-from="left">
          <div className={section.eyebrow}>Liên hệ</div>
          <h2 className={`${section.heading} ${styles.heading}`}>Cần tư vấn trước khi bắt đầu?</h2>
          <p className={`${section.lede} ${styles.lede}`}>
            Để lại số điện thoại, chúng tôi gọi lại trong 24 giờ — xem phòng khám bạn cần gì và cài đặt cùng
            bạn. Chuỗi phòng khám và bệnh viện cũng liên hệ ở đây để nhận báo giá riêng.
          </p>
          <div className={styles.points}>
            {POINTS.map((point) => (
              <div key={point} style={{ display: 'flex', gap: 10 }}>
                <span className={section.checkMark}>✓</span> {point}
              </div>
            ))}
          </div>

          <div className={styles.directLine}>
            <div>
              <div className={styles.directLabel}>Điện thoại · Zalo</div>
              <a href={CONTACT.phoneHref} className={styles.directNum}>
                {CONTACT.phone}
              </a>
            </div>
            <div>
              <div className={styles.directLabel}>Email</div>
              <a href={CONTACT.emailHref}>{CONTACT.email}</a>
            </div>
          </div>
        </div>

        <div data-reveal="1" data-reveal-from="right" className={styles.formCard}>
          {sent ? (
            <div className={styles.sent}>
              <span className={styles.sentTick}>✓</span>
              <div className={styles.sentTitle}>Đã nhận thông tin</div>
              <p className={styles.sentBody}>
                Chúng tôi sẽ gọi lại trong 24 giờ. Nếu cần gấp, gọi trực tiếp {CONTACT.phone}.
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSent(false)
                  setError(null)
                  setFields(EMPTY)
                }}
              >
                Gửi thông tin khác
              </Button>
            </div>
          ) : (
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <Input
                label="Tên phòng khám"
                placeholder="Nha khoa Minh Anh"
                value={fields.clinic}
                onChange={set('clinic')}
              />
              <Input
                label="Tên bạn"
                placeholder="Nguyễn Minh Anh"
                value={fields.name}
                onChange={set('name')}
              />
              <Input
                label="Số điện thoại"
                placeholder="090 123 45 67"
                numeric
                inputMode="tel"
                value={fields.phone}
                onChange={set('phone')}
                hint="Chúng tôi chỉ gọi, không nhắn tin quảng cáo."
              />
              <Button type="submit" size="lg" fullWidth disabled={busy}>
                {busy ? 'Đang gửi…' : 'Gửi thông tin'}
              </Button>
              {error ? (
                <p className={styles.formError} role="alert">
                  {error}
                </p>
              ) : null}
              <p className={styles.formNote}>
                Không cần chờ gọi lại: <a href={hrefFor('signup')}>dùng thử miễn phí 14 ngày</a> hoặc{' '}
                <a href="#hero">nghe thử ngay</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
