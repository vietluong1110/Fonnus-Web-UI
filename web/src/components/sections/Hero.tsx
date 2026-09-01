import { useState } from 'react'
import type { RefObject } from 'react'
import { Button } from '../../design-system'
import { stashPhone } from '../../auth/handoff'
import { formatPhone, isValidPhone, normalizePhone } from '../../auth/phone'
import { navigate } from '../../hooks/useRoute'
import { CLINIC_LOGOS, ClinicMark } from './clinic-logos'
import styles from './Hero.module.css'

interface HeroProps {
  /** Placeholder the shared orb docks onto; owned by useOrbPlacement. */
  dockRef: RefObject<HTMLDivElement | null>
}

/**
 * Three things and nothing else: the claim, one control to sign up, and the
 * orb — which is the product, not an illustration of it. The orb docks here
 * and flies to the bottom-right corner once this section scrolls away.
 */
export function Hero({ dockRef }: HeroProps) {
  const [phone, setPhone] = useState('')

  /*
   * Taking the number here removes a whole screen from the sign-up path: it is
   * handed over and sign-up opens straight on the SMS code. Submitting empty is
   * fine — that just opens sign-up at its first step.
   */
  function startSignUp() {
    if (isValidPhone(phone)) stashPhone(phone)
    navigate('signup')
  }

  return (
    <section id="hero" data-reveal="0" className={styles.hero}>
      {/* Warm glow anchoring the orb's half of the composition. */}
      <div aria-hidden="true" className={styles.glow} />
      <div aria-hidden="true" className={styles.glowSoft} />

      {/* Same 1280px inner column every other section uses, so the headline
          lines up with the sections below instead of sitting further left. */}
      <div className={styles.inner}>
      <div className={styles.claim}>
        <h1 className={styles.title}>
          Không cuộc gọi
          <br />
          nào bị <span className={styles.titleAccent}>bỏ lỡ.</span>
        </h1>

        <p className={styles.lede}>Lễ tân AI nghe máy cho phòng khám của bạn 24/7, bằng tiếng Việt.</p>

        {/* One control, not four: prefix, field and action share a single pill. */}
        <form
          className={styles.signup}
          onSubmit={(e) => {
            e.preventDefault()
            startSignUp()
          }}
        >
          <span className={styles.prefix}>+84</span>
          <span aria-hidden="true" className={styles.divider} />
          {/* Raw field, not the design-system Input: that one draws its own
              bordered box, and here the pill IS the box. */}
          <input
            aria-label="Số điện thoại của bạn"
            placeholder="90 123 45 67"
            value={formatPhone(phone)}
            onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 10))}
            inputMode="tel"
            autoComplete="tel"
            className={styles.field}
          />
          <Button type="submit" size="md" style={{ borderRadius: 999, flex: '0 0 auto' }}>
            Dùng thử miễn phí
          </Button>
        </form>

        <p className={styles.reassurance}>Miễn phí 14 ngày · Không cần thẻ ngân hàng</p>

        <div className={styles.proof}>
          <div className={styles.marks}>
            {CLINIC_LOGOS.map((logo) => (
              <span key={logo.name} className={styles.mark}>
                <ClinicMark logo={logo} size={30} />
              </span>
            ))}
          </div>
          <span className={styles.proofText}>
            50+ phòng khám ở TP.HCM và Hà Nội đang để Fonnus nghe máy
          </span>
        </div>
      </div>

      <div className={styles.stage}>
        {/*
          Empty placeholder, not the orb. The orb is a single fixed element
          shared by this dock, the pinned corner and the call screen; this box
          only tells it where "docked" is and how big to be.
        */}
        <div ref={dockRef} aria-hidden="true" className={styles.dock} />
        <p className={styles.orbNote}>
          Bấm để nghe Linh trả lời ngay trên trình duyệt.
          <br />
          Không cần cài đặt, không cần để lại số.
        </p>
      </div>
      </div>
    </section>
  )
}
