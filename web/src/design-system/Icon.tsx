import type { CSSProperties, HTMLAttributes } from 'react'

/*
 * SUBSTITUTION (see design-system readme): the brand supplied no icon set.
 * Lucide (rounded caps, 2px stroke) is the closest match to the mark's geometry.
 * The glyph is applied as a CSS mask so it always inherits currentColor.
 *
 * The design-system bundle pulled these from a jsDelivr CDN; here they are
 * vendored into `public/icons/` at build time so the page has no runtime
 * network dependency. Icon names are lucide-static file names — add a name
 * here and copy the matching SVG from `node_modules/lucide-static/icons/`.
 */
export type IconName =
  | 'arrow-right'
  | 'arrow-up'
  | 'badge-check'
  | 'banknote'
  | 'bell-ring'
  | 'book-open'
  | 'building-2'
  | 'calendar-check'
  | 'calendar-days'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'circle-alert'
  | 'circle-check'
  | 'circle-help'
  | 'clipboard-list'
  | 'clock'
  | 'ear'
  | 'file-text'
  | 'globe'
  | 'grip-vertical'
  | 'hand-coins'
  | 'house'
  | 'info'
  | 'languages'
  | 'list-checks'
  | 'lock'
  | 'log-out'
  | 'mail'
  | 'map-pin'
  | 'mail'
  | 'menu'
  | 'mic'
  | 'mic-off'
  | 'moon'
  | 'pause'
  | 'pencil'
  | 'percent'
  | 'phone-call'
  | 'phone-forwarded'
  | 'phone-incoming'
  | 'phone-missed'
  | 'play'
  | 'plus'
  | 'receipt'
  | 'search'
  | 'settings'
  | 'shield-check'
  | 'stethoscope'
  | 'sun'
  | 'sunset'
  | 'timer'
  | 'trash-2'
  | 'triangle-alert'
  | 'user-round'
  | 'user-round-x'
  | 'users'
  | 'volume-2'
  | 'x'

export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  name: IconName
  size?: number
  color?: string
  style?: CSSProperties
}

export function Icon({ name, size = 20, color = 'currentColor', style, ...rest }: IconProps) {
  const url = `url(${import.meta.env.BASE_URL}icons/${name}.svg)`
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: '0 0 auto',
        background: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        ...style,
      }}
      {...rest}
    />
  )
}
