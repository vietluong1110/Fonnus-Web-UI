import type { ReactNode } from 'react'
import { appHref } from '../../../hooks/useRoute'
import { SectionFrame } from '../SectionFrame'

/**
 * The frame every Hồ sơ sub-page is built in — the twin of `KnowledgeSection`.
 * Both are `SectionFrame` with their own way back to their own hub.
 */
export function ProfileSection(props: { title: ReactNode; lede?: ReactNode; rail: ReactNode; bar?: ReactNode; children: ReactNode }) {
  return <SectionFrame backLabel="Hồ sơ" backHref={appHref('le-tan', 'ho-so')} {...props} />
}
