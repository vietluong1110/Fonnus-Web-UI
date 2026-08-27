import { useState } from 'react'
import { Button, Icon, Switch } from '../../design-system'
import { PLANS } from '../../data/pricing'
import type { PlanName } from '../../data/pricing'
import section from '../../styles/section.module.css'
import styles from './Pricing.module.css'
import { PlanCard } from './PlanCard'
import { ComparisonMatrix } from './ComparisonMatrix'

interface PricingProps {
  /** Which paid plan gets the terracotta outline. */
  highlight?: PlanName
  matrixDefaultOpen?: boolean
}

export function Pricing({ highlight = 'Tiêu chuẩn', matrixDefaultOpen = false }: PricingProps) {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="bang-gia" data-reveal="0" className={`${section.section} ${section.milk}`}>
      <div className={section.inner}>
        <div className={styles.head}>
          <div>
            <div className={section.eyebrow}>Bảng giá</div>
            <h2 className={`${section.heading} ${styles.heading}`}>Trả theo tháng, tính tiền theo giây</h2>
          </div>
          <div className={styles.switchWrap}>
            <Switch
              label="Trả năm, giảm 15%"
              checked={annual}
              onChange={() => setAnnual((v) => !v)}
              style={{ minWidth: 220 }}
            />
          </div>
        </div>

        <div className={styles.plans}>
          {PLANS.map((plan, i) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              annual={annual}
              highlighted={plan.name === highlight}
              priceAnimation={
                annual
                  ? 'fnPriceIn 360ms cubic-bezier(.2,.7,.3,1)'
                  : 'fnPriceIn2 360ms cubic-bezier(.2,.7,.3,1)'
              }
              revealOrder={i + 1}
            />
          ))}
        </div>

        <div data-reveal="1" className={styles.extras}>
          <div className={styles.setup}>
            <span className={styles.setupIcon}>
              <Icon name="settings" size={20} />
            </span>
            <div className={styles.setupBody}>
              <div className={styles.setupHead}>
                <span className={styles.setupTitle}>Guided Setup</span>
                <span className={styles.setupPrice}>2.000.000 đ · một lần</span>
              </div>
              <p className={styles.setupText}>
                Chúng tôi cùng bạn khai bảng giá, lời chào và chạy thử đến khi ưng ý. Tuỳ chọn — bạn tự cấu
                hình cũng được, không mất thêm phí.
              </p>
            </div>
          </div>

          <div className={styles.enterprise}>
            <div className={styles.enterpriseBody}>
              <div className={styles.enterpriseTitle}>Doanh nghiệp</div>
              <p className={styles.enterpriseText}>
                Chuỗi phòng khám và bệnh viện, nhiều cơ sở, nhiều cuộc gọi cùng lúc — báo giá riêng.
              </p>
            </div>
            <a href="#lien-he" style={{ textDecoration: 'none', flex: '0 0 auto' }}>
              <Button variant="inverse">Liên hệ báo giá</Button>
            </a>
          </div>
        </div>

        <p className={styles.billingNote}>
          Tính tiền theo giây, tối thiểu 30 giây mỗi cuộc gọi được nghe. Cuộc gọi nhỡ hoặc lỗi không tính
          tiền.
        </p>

        <ComparisonMatrix defaultOpen={matrixDefaultOpen} />
      </div>
    </section>
  )
}
