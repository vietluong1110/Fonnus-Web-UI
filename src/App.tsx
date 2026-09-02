import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { MissedCalls } from './components/sections/MissedCalls'
import { HowItWorks } from './components/sections/HowItWorks'
import { Capabilities } from './components/sections/Capabilities'
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

  return (
    <div className={styles.page}>
      <Header onTryCall={demo.openCall} />

      <Hero dockRef={placement.dockRef} />
      <MissedCalls />
      <HowItWorks />
      <Capabilities />
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
