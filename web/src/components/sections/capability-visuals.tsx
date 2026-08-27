import { Badge, Icon } from '../../design-system'
import styles from './capability-visuals.module.css'

/** Đặt lịch tự động — a day of slots with one just booked. */
export function ScheduleVisual() {
  const morning = [
    { time: '9:00', state: 'free' },
    { time: '10:00', state: 'taken' },
    { time: '11:00', state: 'free' },
    { time: '14:00', state: 'taken' },
    { time: '15:00', state: 'booked' },
  ] as const
  const afternoon = [
    { time: '9:30', state: 'taken' },
    { time: '10:30', state: 'free' },
    { time: '13:30', state: 'taken' },
    { time: '14:30', state: 'taken' },
    { time: '15:30', state: 'taken' },
  ] as const

  const slotClass = (state: 'free' | 'taken' | 'booked') =>
    state === 'free' ? styles.slotFree : state === 'booked' ? styles.slotBooked : styles.slotTaken

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.windowDots}>
          <span className={styles.dotBlush} />
          <span className={styles.dotSage} />
          <span className={styles.dotIdle} />
        </div>
        <span className={styles.panelLabel}>Lịch · Thứ Năm</span>
      </div>

      <div className={styles.slotRowFirst}>
        {morning.map((slot) => (
          <span key={slot.time} className={slotClass(slot.state)}>
            {slot.time}
          </span>
        ))}
      </div>
      <div className={styles.slotRowSecond}>
        {afternoon.map((slot) => (
          <span key={slot.time} className={slotClass(slot.state)}>
            {slot.time}
          </span>
        ))}
      </div>

      <div className={styles.confirmation}>
        <span className={styles.confirmationTick}>✓</span> Đã xác nhận: tư vấn niềng răng, thứ Năm 15:00
      </div>
    </div>
  )
}

/** Trả lời câu hỏi chung — caller right, Fonnus left. */
export function FaqVisual() {
  const thread = [
    { from: 'caller', text: '“Cạo vôi răng bao nhiêu tiền?”' },
    {
      from: 'agent',
      text: '“Cạo vôi răng tại phòng khám là 300.000 đ. Chị muốn em giữ lịch 9 giờ sáng thứ Bảy không?”',
    },
    { from: 'caller', text: '“Chủ nhật có mở không?”' },
    { from: 'agent', text: '“Chủ nhật phòng khám làm từ 8 giờ đến 12 giờ ạ.”' },
  ] as const

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelLabel}>Câu hỏi thường gặp trong cuộc gọi</span>
      </div>
      <div className={styles.thread}>
        {thread.map((line, i) => (
          <div key={i} className={line.from === 'caller' ? styles.caller : styles.agent}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Chuyển cho nhân viên khi cần — three beats: ask, acknowledge, transfer. */
export function HandoffVisual() {
  return (
    <div className={styles.panel}>
      <div className={styles.flowHead}>
        <span className={styles.panelLabel}>Luồng cuộc gọi</span>
      </div>
      <div className={styles.flow}>
        <span className={styles.speakerCaller}>Người gọi</span>
        <div className={styles.flowCaller}>“Mắt tôi đang bị đỏ và đau quá, tôi cần uống thuốc gì?”</div>

        <span className={styles.connector} />

        <span className={styles.speaker}>Fonnus</span>
        <div className={styles.flowAgent}>“Dạ, để em kết nối mình với bộ phận tư vấn trực tiếp ngay ạ.”</div>

        <span className={styles.connector} />

        <div className={styles.handoff}>
          <span className={styles.handoffIcon}>
            <Icon name="phone-call" size={18} />
          </span>
          Chuyển đến lễ tân · đang đổ chuông
        </div>
      </div>
    </div>
  )
}

/** Nhật ký cuộc gọi đầy đủ — today's calls and how each ended. */
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
              <Icon name="phone-incoming" size={18} />
            </span>
            <span className={styles.logText}>
              <span className={styles.logNumber}>{call.number}</span>
              <span className={styles.logMeta}>{call.meta}</span>
            </span>
            <Badge tone={call.booked ? 'success' : 'neutral'}>{call.outcome}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
