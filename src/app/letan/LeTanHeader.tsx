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
 * with it. The orb block is identical either way, because "gọi thử" has to be
 * in the same place wherever you are in the tab.
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
          <span>
            Lễ tân: <span className={styles.name}>{agent}</span>
          </span>
          {phone ? (
            <span className={`${styles.phone} ${compact ? styles.phoneCompact : ''}`}>
              <span className={styles.dot} aria-hidden="true" />
              {formatBusinessPhone(phone)}
            </span>
          ) : (
            <span className={styles.unassigned}>Chưa có số — chọn số ở mục Số điện thoại</span>
          )}
        </h1>
      </div>

      <button
        type="button"
        className={styles.call}
        onClick={() =>
          toast(
            phone
              ? `Gọi thử sẽ nối máy tới ${formatBusinessPhone(phone)} khi số được kích hoạt.`
              : 'Gọi thử sẽ nối máy khi số Fonnus được cấp — xem mục Số điện thoại.',
            'neutral',
          )
        }
        title={`Nghe thử ${agent} trả lời`}
      >
        <span className={styles.orbWrap}>
          <MiniOrb size={48} />
        </span>
        <span className={styles.callLabel}>Gọi thử {agent}</span>
      </button>
    </div>
  )
}
