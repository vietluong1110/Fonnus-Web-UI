import { useState } from 'react'
import { Button, Switch } from '../../design-system'
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
            <h2 className={`${section.heading} ${styles.heading}`}>Giá minh bạch, không ràng buộc</h2>
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

        <div data-reveal="1" className={styles.enterprise}>
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

        <ComparisonMatrix defaultOpen={matrixDefaultOpen} />
      </div>
    </section>
  )
}
