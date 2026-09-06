import type { ReactNode } from 'react'
import { appHref } from '../../../hooks/useRoute'
import { SectionFrame } from '../SectionFrame'

/**
 * The frame every Kỹ năng sub-page is built in — the third of the three, and
 * identical to the other two by construction: `SectionFrame` with its own way
 * back to its own hub.
 *
 * Kỹ năng used to be the odd tab out. It had a 220px list of skills down the
 * left instead of a hub, which meant its pages had no way back, no line
 * saying what they were for, and — the one that mattered — no try-out rail.
 * Three pages of the app where you could not hear the thing you were
 * configuring, and all three of them were about what she is *allowed to do*,
 * which is exactly the part an owner most wants to hear before trusting it.
 */
export function SkillsSection(props: { title: ReactNode; lede?: ReactNode; rail: ReactNode; bar?: ReactNode; children: ReactNode }) {
  return <SectionFrame backLabel="Kỹ năng" backHref={appHref('le-tan', 'ky-nang')} {...props} />
}
