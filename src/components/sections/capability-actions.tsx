import { Icon } from '../../design-system'
import styles from './capability-actions.module.css'

/*
 * What Fonnus DID, drawn rather than described. Each one is the last thing to
 * appear in its call demo, so it has to read on its own in about a second.
 */

const DAYS = [
  { d: 'T2', n: '07' },
  { d: 'T3', n: '08' },
  { d: 'T4', n: '09' },
  { d: 'T5', n: '10' },
  { d: 'T6', n: '11' },
  { d: 'T7', n: '12' },
  { d: 'CN', n: '13' },
]

/** The appointment lands in the calendar: Thursday 10/09, 15:00. */
export function BookingAction() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Icon name="appointment" size={17} />
        Lịch hẹn đã vào sổ
      </div>

      <div className={styles.week}>
        {DAYS.map((day) => (
          <span key={day.d} className={day.d === 'T5' ? styles.dayOn : styles.day}>
            <span className={styles.dayName}>{day.d}</span>
            <span className={styles.dayNum}>{day.n}</span>
          </span>
        ))}
      </div>

      <div className={styles.slots}>
        <span className={styles.slotFree}>
          <span className={styles.slotTime}>14:00</span> Trống
        </span>
        <span className={styles.slotBooked}>
          <span className={styles.slotTime}>15:00</span> 0903 ••• 217 · khám tổng quát
          <Icon name="appointment" size={15} />
        </span>
        <span className={styles.slotFree}>
          <span className={styles.slotTime}>16:00</span> Trống
        </span>
      </div>
    </div>
  )
}

const PRICES = [
  { name: 'Khám tổng quát', price: '150.000 đ' },
  { name: 'Cạo vôi răng', price: '300.000 đ' },
  { name: 'Trám răng', price: 'từ 400.000 đ' },
]

/** The answer came out of the clinic's own price list — shown, not claimed. */
export function PriceAction() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Icon name="list" size={17} />
        Lấy từ bảng giá của phòng khám
      </div>

      <div className={styles.rows}>
        {PRICES.map((row) => (
          <span key={row.name} className={row.name === 'Cạo vôi răng' ? styles.rowOn : styles.row}>
            <span>{row.name}</span>
            <span className={styles.price}>{row.price}</span>
          </span>
        ))}
      </div>

      <p className={styles.note}>Fonnus chỉ đọc lại con số bạn đã khai, không tự nghĩ ra.</p>
    </div>
  )
}

/** The call goes to a human, and the screen says who and when. */
export function TransferAction() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Icon name="answered" size={17} />
        Đã nối máy cho người thật
      </div>

      <div className={styles.hop}>
        <span className={styles.who}>
          <span className={styles.avatarLinh}>L</span>
          <span className={styles.whoText}>
            <span className={styles.whoName}>Linh</span>
            <span className={styles.whoRole}>Lễ tân Fonnus</span>
          </span>
        </span>

        <span className={styles.hopArrow} aria-hidden="true">
          <Icon name="arrow-right" size={18} />
        </span>

        <span className={styles.who}>
          <span className={styles.avatarStaff}>
            <Icon name="caller" size={18} />
          </span>
          <span className={styles.whoText}>
            <span className={styles.whoName}>BS. Trần Minh</span>
            <span className={styles.whoRole}>Bác sĩ trực</span>
          </span>
        </span>
      </div>

      <p className={styles.note}>Nối máy sau 4 giây. Nếu không ai bắt máy, Fonnus ghi lời nhắn kèm số.</p>
    </div>
  )
}
