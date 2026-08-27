import { useState } from 'react'
import { Button, Input } from '../../design-system'
import { CONTACT } from '../../data/content'
import section from '../../styles/section.module.css'
import styles from './Contact.module.css'

const POINTS = [
  'Chúng tôi làm cùng bạn phần chuyển hướng cuộc gọi',
  'Dùng thử 14 ngày trước khi trả tiền',
  'Không ràng buộc hợp đồng dài hạn',
]

const EMPTY = { clinic: '', name: '', phone: '' }

/**
 * The one action the page is asking for. Nothing is posted anywhere yet — the
 * form moves to its success state locally, ready for a real endpoint later.
 */
export function Contact() {
  const [fields, setFields] = useState(EMPTY)
  const [sent, setSent] = useState(false)

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }))

  return (
    <section id="lien-he" data-reveal="0" className={`${section.section} ${section.milk}`}>
      <div className={styles.inner}>
        <div>
          <div className={section.eyebrow}>Liên hệ</div>
          <h2 className={`${section.heading} ${styles.heading}`}>Tham gia danh sách pilot</h2>
          <p className={`${section.lede} ${styles.lede}`}>
            Chúng tôi nhận mười phòng khám cho đợt pilot cuối năm 2026. Để lại số điện thoại, chúng tôi gọi
            lại trong 24 giờ để xem phòng khám bạn có phù hợp không.
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

        <div className={styles.formCard}>
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
                setSent(true)
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
              <Button type="submit" size="lg" fullWidth>
                Gửi thông tin
              </Button>
              <p className={styles.formNote}>
                Hoặc nghe thử trước: <a href="#nghe-thu">gọi thử Fonnus</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
