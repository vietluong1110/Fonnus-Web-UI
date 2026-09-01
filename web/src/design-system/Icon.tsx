import type { CSSProperties, HTMLAttributes } from 'react'

/*
 * SUBSTITUTION (see design-system readme): the brand supplied no icon set.
 * Lucide (rounded caps, 2px stroke) is the closest match to the mark's geometry.
 * The glyph is applied as a CSS mask so it always inherits currentColor.
 *
 * The design-system bundle pulled these from a jsDelivr CDN; here they are
 * vendored into `public/icons/` at build time so the page has no runtime
 * network dependency. Icon names are lucide-static file names.
 */
export type IconName =
  | 'arrow-up'
  | 'calendar-check'
  | 'clock'
  | 'list-checks'
  | 'menu'
  | 'mic'
  | 'mic-off'
  | 'phone-call'
  | 'phone-incoming'
  | 'phone-missed'
  | 'play'
  | 'settings'
  | 'shield-check'
  | 'user-round'
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
