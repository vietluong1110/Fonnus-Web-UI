import { Icon } from '../../design-system'
import { MiniOrb } from '../../components/orb/MiniOrb'
import { formatBusinessPhone } from '../../auth/phone'
import { useConfig } from './store'
import { useToast } from '../ui'
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
  const { config } = useConfig()
  const { toast } = useToast()
  const agent = config.agent_name || 'Linh'
  const phone = config.assigned_phone

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
            <Icon name="phone-incoming" size={compact ? 13 : 14} />
            {formatBusinessPhone(phone)}
          </span>
        ) : (
          <a className={styles.unassigned} href="#/app/so-dien-thoai">
            Chưa có số — chọn số ở mục Số điện thoại
          </a>
        )}
      </div>

      {/*
        The orb is the product's one call affordance — it is what a visitor
        presses on the landing page to hear Linh, phone glyph and all. Same
        object here, at 44px, with the label moved into a tooltip so the header
        stays one row tall.
      */}
      <button
        type="button"
        className={styles.call}
        aria-label={`Gọi thử ${agent}`}
        onClick={() =>
          toast(
            phone
              ? `Gọi thử sẽ nối máy tới ${formatBusinessPhone(phone)} khi số được kích hoạt.`
              : 'Gọi thử sẽ nối máy khi số Fonnus được cấp — xem mục Số điện thoại.',
            'neutral',
          )
        }
      >
        <span className={styles.orbWrap}>
          <MiniOrb size={44} />
          <span className={styles.callIcon} aria-hidden="true">
            <Icon name="phone-call" size={17} />
          </span>
        </span>
        <span className={styles.tip} role="tooltip">
          Gọi thử {agent}
        </span>
      </button>
    </div>
  )
}
