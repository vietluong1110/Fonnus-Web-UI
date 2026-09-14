import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Button } from '../../design-system'
import { useReveal } from '../../hooks/useReveal'
import { Footer } from '../layout/Footer'
import { Header } from '../layout/Header'
import { MissedCallStats } from './MissedCallStats'
import { ReportRequest } from './ReportRequest'
import app from '../../App.module.css'
import styles from './HotlineReportPage.module.css'

/**
 * "Chấm điểm hotline" — the free mystery-shopping report, as its own page.
 *
 * Two sections and nothing else: the case (a clinic misses more calls than it
 * thinks) and the ask (where to call, where to send the report). It is a page
 * rather than a landing section because it offers a measurement, not the
 * receptionist, and a visitor who came for one should not scroll through the
 * other.
 *
 * It wears the landing page's header, footer, section rhythm and reveal, so
 * moving between the two reads as one site. It has no orb: the orb means "talk
 * to her" and lives with the call demo, so the header's "Nghe thử Linh" goes
 * back to the hero.
 */
export function HotlineReportPage() {
  const ctaRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLElement>(null)
  const floating = useFloatingCta(ctaRef, formRef)
  useReveal(true)

  // A hash swap keeps the old scroll offset, which would open this page halfway down.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // On this page an in-page href would be read as a route and leave it (hooks/useRoute).
  const toForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className={app.page}>
      <Header />

      <main>
        <MissedCallStats ctaRef={ctaRef} onRequest={toForm} />
        <ReportRequest sectionRef={formRef} />
      </main>

      <Footer />

      <div className={styles.floating} data-shown={floating || undefined} aria-hidden={!floating}>
        <div className={styles.floatingInner}>
          <Button size="lg" fullWidth onClick={toForm} tabIndex={floating ? undefined : -1}>
            Nhận báo cáo miễn phí
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * On a phone the case runs to three screens before the form. Once the head's
 * own button has scrolled away, the same button waits at the bottom edge — and
 * leaves the moment the form is reached, where it would only repeat the submit
 * button under the visitor's thumb. The stylesheet keeps it to narrow screens.
 */
function useFloatingCta(cta: RefObject<HTMLElement | null>, form: RefObject<HTMLElement | null>): boolean {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const button = cta.current
    const section = form.current
    if (!button || !section || !('IntersectionObserver' in window)) return

    let passed = false
    let reached = false
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === button) passed = !entry.isIntersecting && entry.boundingClientRect.top < 0
        if (entry.target === section) reached = entry.isIntersecting || entry.boundingClientRect.top < 0
      })
      setShown(passed && !reached)
    })
    io.observe(button)
    io.observe(section)
    return () => io.disconnect()
  }, [cta, form])

  return shown
}
