import { Badge, Icon } from '../../design-system'
import styles from './capability-visuals.module.css'

/** Nhật ký cuộc gọi — the call log as the owner sees it next morning. */
export function CallLogVisual() {
  const calls = [
    { number: '0903 ••• 217', meta: '2 phút · tư vấn niềng răng', outcome: 'Đã đặt lịch', booked: true },
    { number: '0938 ••• 044', meta: '1 phút · hỏi bảng giá', outcome: 'Đã trả lời', booked: false },
    { number: '0911 ••• 882', meta: '3 phút · đặt lịch ngoài giờ', outcome: 'Đã đặt lịch', booked: true },
  ]

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelLabel}>Hôm nay</span>
        <span className={styles.panelNum}>14 cuộc gọi</span>
      </div>
      <div className={styles.log}>
        {calls.map((call) => (
          <div key={call.number} className={styles.logRow}>
            <span className={styles.logIcon}>
              <Icon name="incoming" size={18} />
            </span>
            <span className={styles.logText}>
              <span className={styles.logNumber}>{call.number}</span>
              <span className={styles.logMeta}>{call.meta}</span>
            </span>
            <Badge tone={call.booked ? 'terracotta' : 'neutral'}>{call.outcome}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
