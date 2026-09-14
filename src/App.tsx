import { useLayoutEffect } from 'react'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { MissedCalls } from './components/sections/MissedCalls'
import { HowItWorks } from './components/sections/HowItWorks'
import { Capabilities } from './components/sections/Capabilities'
import { Band } from './components/sections/Band'
import { Pricing } from './components/sections/Pricing'
import { Faq } from './components/sections/Faq'
import { Security } from './components/sections/Security'
import { Testimonials } from './components/sections/Testimonials'
import { Contact } from './components/sections/Contact'
import { Orb } from './components/orb/Orb'
import { CallOverlay } from './components/orb/CallOverlay'
import { useOrbPlacement } from './components/orb/useOrbPlacement'
import { useCallDemo } from './hooks/useCallDemo'
import { useReveal } from './hooks/useReveal'
import type { PlanName } from './data/pricing'
import styles from './App.module.css'

export interface AppProps {
  /** 'reveal' lifts sections in on scroll; 'tắt' renders them settled. */
  motion?: 'reveal' | 'tắt'
  pricingHighlight?: PlanName
  matrixDefaultOpen?: boolean
}

export function App({
  motion = 'reveal',
  pricingHighlight = 'Tiêu chuẩn',
  matrixDefaultOpen = false,
}: AppProps) {
  const demo = useCallDemo()
  const placement = useOrbPlacement(demo.open)
  useReveal(motion !== 'tắt')
  useArrivalScroll()

  return (
    <div className={styles.page}>
      <Header onTryCall={demo.openCall} />

      <Hero dockRef={placement.dockRef} />
      <MissedCalls />
      <HowItWorks />
      <Capabilities />
      <Band />
      <Pricing highlight={pricingHighlight} matrixDefaultOpen={matrixDefaultOpen} />
      <Faq />
      <Security />
      <Testimonials />
      <Contact />

      <Footer />

      {demo.open ? <CallOverlay demo={demo} spotRef={placement.callSpotRef} /> : null}

      {/*
        Rendered last and outside every section: one orb, shared by the demo
        section, the pinned corner and the call screen. Keeping it mounted is
        what lets it fly between them without restarting its animation.
      */}
      <Orb
        placement={placement}
        speaking={demo.speaking}
        getAmplitude={demo.getAmplitude}
        onClick={demo.openCall}
      />
    </div>
  )
}

/** Where this page was scrolled when another page replaced it. Unset until one has. */
let leftAt: number | null = null

/**
 * Coming back to this page from another one.
 *
 * A section anchor (`#bang-gia` in the hotline report's header) arrives before
 * this page exists: the browser looks for the section, finds nothing and leaves
 * the scroll wherever the other page had it. So the page finds the section on
 * mount. With no anchor — Back from the report — it returns to where the
 * visitor left it.
 *
 * The offset is kept only when the hash really moved to another route, so a
 * dev-mode double mount, or a reload the browser restores itself, is left alone.
 */
function useArrivalScroll() {
  useLayoutEffect(() => {
    const id = window.location.hash.slice(1)
    const section = id ? document.getElementById(id) : null
    if (section) section.scrollIntoView({ behavior: 'instant' })
    else if (leftAt != null) window.scrollTo({ top: leftAt, behavior: 'instant' })

    return () => {
      leftAt = window.location.hash.startsWith('#/') ? window.scrollY : null
    }
  }, [])
}
