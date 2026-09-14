import { Icon } from '../../design-system'
import { CallOrb } from '../../components/orb/CallOrb'
import { useTryCall } from './useTryCall'
import styles from './LeTanPage.module.css'

/**
 * Who this tab is about, and one press to hear her.
 *
 * `compact` is for section pages, which carry a title of their own: the
 * identity drops to a context line so it frames the page instead of competing
 * with it. The orb sits in the same place either way, because "gọi thử" has to
 * be where you left it wherever you are in the tab.
 */
export function LeTanHeader({ compact = false }: { compact?: boolean }) {
  const { agent, phone, call } = useTryCall()

  return (
    <div className={styles.head}>
      <div className={styles.identity}>
        <h1 className={`${styles.title} ${compact ? styles.titleCompact : ''}`}>
          Lễ tân: <span className={styles.name}>{agent}</span>
        </h1>

        {/*
          The number in a badge rather than loose after a dot: on its own it
          was just a string of digits sitting next to a name, with nothing to
          say which of the two it was. The icon names it, and a box gives it a
          box's alignment instead of a text baseline nested two flexes deep.
        */}
        {phone ? (
          <span className={`${styles.phoneBadge} ${compact ? styles.phoneBadgeCompact : ''}`} title="Số khách gọi đến">
            <Icon name="incoming" size={compact ? 13 : 14} />
            {phone}
          </span>
        ) : (
          <a className={styles.unassigned} href="#/app/so-dien-thoai">
            Chưa có số — chọn số ở mục Số điện thoại
          </a>
        )}
      </div>

      {/*
        The orb is the product's one call affordance — the same object as the
        sidebar's "Gọi thử", at 44px, with the label moved into a tooltip so
        the header stays one row tall.
      */}
      <button type="button" className={styles.call} aria-label={`Gọi thử ${agent}`} onClick={call}>
        <span className={styles.orbWrap}>
          <CallOrb size={44} />
        </span>
        <span className={styles.tip} role="tooltip">
          Gọi thử {agent}
        </span>
      </button>
    </div>
  )
}
