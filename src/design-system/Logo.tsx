import type { CSSProperties, ImgHTMLAttributes } from 'react'

type Variant = 'mark' | 'mark-mono' | 'mark-dark' | 'horizontal' | 'stacked'

const files: Record<Variant, string> = {
  mark: 'SVG/fonnus-mark.svg',
  'mark-mono': 'SVG/fonnus-mark-mono.svg',
  'mark-dark': 'SVG/fonnus-mark-dark.svg',
  horizontal: 'SVG/fonnus-lockup-horizontal.svg',
  stacked: 'SVG/fonnus-lockup-stacked.svg',
}

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'height' | 'src' | 'alt'> {
  variant?: Variant
  height?: number
  assetBase?: string
  clearspace?: boolean
  style?: CSSProperties
}

/* Clearspace = height of the arc. Below 24px the wordmark is dropped and only the mark is used. */
export function Logo({
  variant = 'horizontal',
  height = 32,
  assetBase = `${import.meta.env.BASE_URL}assets`,
  clearspace = false,
  style,
  ...rest
}: LogoProps) {
  const isMark = variant.startsWith('mark')
  const v: Variant = !isMark && height < 24 ? 'mark' : variant
  return (
    <img
      src={`${assetBase}/${files[v]}`}
      alt="Fonnus"
      style={{
        height,
        width: 'auto',
        display: 'block',
        padding: clearspace ? height * 0.3 : 0,
        boxSizing: 'content-box',
        ...style,
      }}
      {...rest}
    />
  )
}
