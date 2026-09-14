import { Icon } from '../../design-system'
import { MiniOrb } from './MiniOrb'
import styles from './CallOrb.module.css'

/**
 * The orb with the call glyph on it: the product's one "talk to her" affordance.
 *
 * The Lễ tân header and the sidebar's "Gọi thử Linh" draw this same object, so it lives here
 * once. It is only the face — the button around it, its label and its hover lift belong to
 * whoever places it.
 */
export function CallOrb({ size }: { size: number }) {
  return (
    <span className={styles.root} style={{ width: size, height: size }} aria-hidden="true">
      <MiniOrb size={size} />
      <span className={styles.glyph}>
        <Icon name="answered" size={size >= 44 ? 17 : 16} />
      </span>
    </span>
  )
}
