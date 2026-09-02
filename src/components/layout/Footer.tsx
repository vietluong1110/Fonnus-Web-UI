import { CONTACT } from '../../data/content'
import styles from './Footer.module.css'

const PAGE_LINKS = [
  { href: '#hero', label: 'Nghe thử' },
  { href: '#cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '#bang-gia', label: 'Bảng giá' },
  { href: '#bao-mat', label: 'Bảo mật & dữ liệu' },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img
            src={`${import.meta.env.BASE_URL}assets/SVG/fonnus-mark-dark.svg`}
            alt="Fonnus"
            className={styles.mark}
          />
          <p className={styles.tagline}>Không cuộc gọi nào bị bỏ lỡ.</p>
          <p className={styles.mission}>
            Fonnus mong muốn trở thành hệ thống lễ tân đáng tin cậy của nền kinh tế Việt Nam.
          </p>
        </div>

        <div className={styles.columns}>
          <div className={styles.column}>
            <span className={styles.columnTitle}>Trang</span>
            {PAGE_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={styles.link}>
                {link.label}
              </a>
            ))}
          </div>
          <div className={styles.column}>
            <span className={styles.columnTitle}>Liên hệ</span>
            <a href={CONTACT.phoneHref} className={styles.linkNum}>
              {CONTACT.phone}
            </a>
            <a href={CONTACT.emailHref} className={styles.link}>
              {CONTACT.email}
            </a>
            <span className={styles.plain}>{CONTACT.site}</span>
          </div>
        </div>
      </div>

      <div className={styles.colophon}>© 2026 Fonnus</div>
    </footer>
  )
}
