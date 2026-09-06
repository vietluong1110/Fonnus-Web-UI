import type { ReactNode } from 'react'
import { appHref } from '../../../hooks/useRoute'
import { SectionFrame } from '../SectionFrame'

/**
 * The frame every Kiến thức sub-page is built in. The geometry is
 * `SectionFrame`, shared with Hồ sơ and Kỹ năng; what is left here is the one
 * thing that differs between the three — which hub the back link goes to.
 */
export function KnowledgeSection(props: { title: ReactNode; lede?: ReactNode; rail: ReactNode; bar?: ReactNode; children: ReactNode }) {
  return <SectionFrame backLabel="Kiến thức" backHref={appHref('le-tan', 'kien-thuc')} {...props} />
}
