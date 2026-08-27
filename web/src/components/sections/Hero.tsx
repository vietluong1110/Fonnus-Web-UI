import { Badge, Button, Icon } from '../../design-system'
import section from '../../styles/section.module.css'
import styles from './Hero.module.css'

interface HeroProps {
  onTryCall: () => void
}

export function Hero({ onTryCall }: HeroProps) {
  return (
    <section id="hero" data-reveal="0" className={styles.hero}>
      <div>
        <div className={section.eyebrow}>Trợ lý nghe máy cho phòng khám</div>
        <h1 className={styles.title}>Không cuộc gọi nào bị bỏ lỡ.</h1>
        <p className={styles.lede}>
          Fonnus nghe máy trên chính số điện thoại phòng khám đang dùng. Trả lời bằng tiếng Việt, báo giá, giữ
          lịch hẹn, chuyển cho nhân viên khi cần — kể cả 10 giờ đêm hay ngày Tết.
        </p>
        <div className={styles.actions}>
          <a href="#lien-he" style={{ textDecoration: 'none' }}>
            <Button size="lg">Tham gia danh sách pilot</Button>
          </a>
          <Button variant="secondary" size="lg" onClick={onTryCall}>
            Nghe thử ngay
          </Button>
        </div>
        <p className={styles.reassurance}>Không cần cài đặt. Nghe thử trực tiếp trên trang này.</p>
      </div>

      <div className={styles.sample}>
        <div className={styles.sampleHead}>
          <span className={styles.sampleTime}>21:47 · Thứ Bảy</span>
          <Badge tone="success" dot>
            Đã nghe máy
          </Badge>
        </div>
        <div className={styles.sampleRows}>
          <div className={styles.callRow}>
            <span className={styles.callIcon}>
              <Icon name="phone-incoming" size={18} />
            </span>
            <div>
              <div className={styles.callNumber}>0903 ••• 217</div>
              <div className={styles.callMeta}>Cuộc gọi đến, ngoài giờ làm</div>
            </div>
          </div>
          <div className={styles.script}>
            “Phòng khám Nha khoa Minh Anh xin nghe. Em là Fonnus, trợ lý AI của phòng khám. Anh chị cần đặt
            lịch hay hỏi thông tin ạ?”
          </div>
          <div className={styles.outcome}>
            <span className={styles.tick}>✓</span> Đã giữ lịch 9:00 Chủ nhật · tư vấn niềng răng
          </div>
        </div>
      </div>
    </section>
  )
}
