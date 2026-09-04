import type { CSSProperties, SVGAttributes } from 'react'

/*
 * The six Fonnus shapes — "Hình khối" — for slides, the landing page and the
 * app. Same grid as the icons, blown up eight times (200 × 200), same two
 * elements: the rising arc and the ink dot.
 *
 * Ink is `currentColor`; the accent is `--icon-accent`, so a shape on a night
 * surface goes cream + terracotta-night without being told. The handoff
 * target is sage (the resolved state), and the price card is milk.
 *
 * See `docs/visual-language.md` § Shapes for what each one means and where
 * it belongs.
 */

export type ShapeName =
  | 'always-on'
  | 'rising-arcs'
  | 'handoff'
  | 'relieved-owner'
  | 'clear-price'
  | 'appointment-grid'

export interface ShapeProps extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
  name: ShapeName
  size?: number
  /** Only for `clear-price`: the figure printed on the card. */
  price?: string
  style?: CSSProperties
}

const ACCENT = 'var(--icon-accent, var(--terracotta))'

export function Shape({ name, size = 180, price = '300.000 đ', style, ...rest }: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      style={{ display: 'block', flex: '0 0 auto', ...style }}
      {...rest}
    >
      {name === 'always-on' ? (
        /* Nghe máy 24/7 — a closed ring: no part of the day is left empty. The
           terracotta arc covers the hours no one is on duty. */
        <>
          <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="3" />
          <path d="M28 100A72 72 0 0 1 100 28" stroke={ACCENT} strokeWidth="11" strokeLinecap="round" />
          <path d="M100 22v10M178 100h-10M100 178v-10M22 100h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="16" fill="currentColor" />
        </>
      ) : name === 'rising-arcs' ? (
        /* Cuộc gọi được trả lời — three arcs rising from one point: the
           "rising arc" of the motion system. Heroes and opening slides. */
        <>
          <path d="M18 152H182" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
          <path d="M16 152A84 84 0 0 1 184 152" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M38 152A62 62 0 0 1 162 152" stroke={ACCENT} strokeWidth="11" strokeLinecap="round" />
          <path d="M60 152A40 40 0 0 1 140 152" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="152" r="10" fill="currentColor" />
        </>
      ) : name === 'handoff' ? (
        /* Chuyển cho bác sĩ — two points, one arc bridging them. The
           destination is sage, the colour of a resolved state. */
        <>
          <path d="M56 124A44 44 0 0 1 144 124" stroke={ACCENT} strokeWidth="9" strokeLinecap="round" />
          <circle cx="56" cy="124" r="26" fill="currentColor" />
          <circle cx="144" cy="124" r="26" fill="var(--sage)" stroke="currentColor" strokeWidth="3" />
          <path d="M136 124l7 7 13-14" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : name === 'relieved-owner' ? (
        /* Chủ phòng khám nhẹ người — the person below, the call held above.
           No face, no feelings; the posture says enough. */
        <>
          <path d="M64 62A36 36 0 0 1 136 62" stroke={ACCENT} strokeWidth="10" strokeLinecap="round" />
          <circle cx="100" cy="114" r="21" fill="currentColor" />
          <path d="M46 178A54 54 0 0 1 154 178" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : name === 'clear-price' ? (
        /* Giá rõ ràng — the number is the picture. Always IBM Plex Sans,
           tabular figures, a terracotta rule beneath. No brackets, no "từ". */
        <>
          <path d="M62 48A38 38 0 0 1 138 48" stroke={ACCENT} strokeWidth="9" strokeLinecap="round" />
          <rect x="26" y="72" width="148" height="82" rx="16" fill="var(--milk)" stroke="currentColor" strokeWidth="3" />
          <text
            x="100"
            y="112"
            textAnchor="middle"
            fontFamily="var(--font-num)"
            fontSize={price.length > 9 ? 21 : 27}
            fontWeight="600"
            fill="currentColor"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {price}
          </text>
          <path d="M58 130h84" stroke={ACCENT} strokeWidth="7" strokeLinecap="round" />
        </>
      ) : (
        /* Giữ cái hẹn — exactly one cell filled terracotta: the step under
           way. A step not yet reached is a dashed outline, never filled. */
        <>
          <rect x="30" y="54" width="44" height="44" rx="11" stroke="currentColor" strokeWidth="2.6" />
          <rect x="86" y="54" width="44" height="44" rx="11" stroke="currentColor" strokeWidth="2.6" />
          <rect x="142" y="54" width="44" height="44" rx="11" stroke="currentColor" strokeWidth="2.6" />
          <rect x="30" y="110" width="44" height="44" rx="11" stroke="currentColor" strokeWidth="2.6" />
          <rect x="86" y="110" width="44" height="44" rx="11" fill={ACCENT} />
          <path d="M97 132l7 7 13-14" stroke="var(--cream)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="142" y="110" width="44" height="44" rx="11" stroke={ACCENT} strokeWidth="2.6" strokeDasharray="7 6" opacity="0.6" />
        </>
      )}
    </svg>
  )
}
