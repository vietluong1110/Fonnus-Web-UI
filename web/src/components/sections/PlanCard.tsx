import { Button } from '../../design-system'
import type { Plan } from '../../data/pricing'
import { hrefFor } from '../../hooks/useRoute'
import styles from './PlanCard.module.css'

interface PlanCardProps {
  plan: Plan
  annual: boolean
  /** Outlines the plan named by the page's `pricingHighlight` setting. */
  highlighted: boolean
  /**
   * Alternates between two identical keyframes, which is what re-triggers the
   * price animation each time the billing period flips.
   */
  priceAnimation: string
  revealOrder: number
}

export function PlanCard({ plan, annual, highlighted, priceAnimation, revealOrder }: PlanCardProps) {
  const onFill = !!plan.featured
  const cardClass = plan.featured ? styles.featured : plan.price ? styles.card : styles.trial

  return (
    <div
      data-reveal={String(revealOrder)}
      className={`${cardClass} ${highlighted && !plan.featured && plan.price ? styles.highlighted : ''}`}
    >
      {plan.badge ? <span className={styles.badge}>{plan.badge}</span> : null}

      <div className={styles.name}>{plan.name}</div>
      <div className={onFill ? styles.blurbOnFill : styles.blurb}>{plan.blurb}</div>

      {plan.price ? (
        <>
          <div className={styles.priceRow} style={{ animation: priceAnimation }}>
            <span className={onFill ? styles.priceOnFill : styles.price}>
              {annual ? plan.price.annual : plan.price.monthly}
            </span>
            <span className={onFill ? styles.perOnFill : styles.per}>đ/tháng</span>
          </div>
          <div className={onFill ? styles.noteOnFill : styles.note} style={{ animation: priceAnimation }}>
            {annual ? plan.note?.annual : plan.note?.monthly}
          </div>
        </>
      ) : (
        <>
          <div className={styles.priceFree}>{plan.freeLabel}</div>
          <div className={styles.note}>{plan.freeNote}</div>
        </>
      )}

      <span className={onFill ? styles.ruleOnFill : styles.rule} />

      <div className={onFill ? styles.featuresOnFill : styles.features}>
        {plan.features.map((feature) => (
          <div key={feature} className={styles.feature}>
            <span className={onFill ? styles.featureDotOnFill : styles.featureDot} />
            {feature}
          </div>
        ))}
      </div>

      {/* Every plan starts the same way: create an account and pick the plan
          inside. Only the enterprise tier still goes to the contact form. */}
      <a href={hrefFor('signup')} className={styles.cta}>
        <Button variant={plan.featured ? 'inverse' : 'secondary'} fullWidth>
          {plan.cta}
        </Button>
      </a>
    </div>
  )
}
