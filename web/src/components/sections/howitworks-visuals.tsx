import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../design-system'
import styles from './howitworks-visuals.module.css'

/**
 * True once the element has been meaningfully on screen, and true for good —
 * these little scenes play once and then stay finished, so a card that is
 * scrolled back past does not replay and pull the eye a second time.
 */
export function usePlayedOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [played, setPlayed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || played) return

    if (!('IntersectionObserver' in window)) {
      setPlayed(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlayed(true)
          io.disconnect()
        }
      },
      { threshold: 0.45 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [played])

  return { ref, played }
}

/** Step 1 — the clinic's own details being typed in, then its price list. */
export function SetupVisual() {
  const { ref, played } = usePlayedOnce<HTMLDivElement>()

  return (
    <div ref={ref} data-played={played || undefined} className={styles.scene}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <Icon name="settings" size={15} />
          Thông tin phòng khám
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Tên phòng khám</span>
          <span className={styles.fieldBox}>
            <span className={styles.typed} style={{ '--delay': '200ms' } as React.CSSProperties}>
              Nha khoa Minh Anh
            </span>
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Địa chỉ</span>
          <span className={styles.fieldBox}>
            <span className={styles.typed} style={{ '--delay': '1000ms' } as React.CSSProperties}>
              12 Nguyễn Huệ, Q.1, TP.HCM
            </span>
          </span>
        </div>

        <div className={styles.tableHead}>Bảng giá dịch vụ</div>
        <div className={styles.table}>
          {[
            ['Khám tổng quát', '150.000 đ'],
            ['Cạo vôi răng', '300.000 đ'],
            ['Trám răng', 'từ 400.000 đ'],
          ].map(([name, price], i) => (
            <span
              key={name}
              className={styles.tableRow}
              style={{ '--delay': `${1700 + i * 220}ms` } as React.CSSProperties}
            >
              <span>{name}</span>
              <span className={styles.price}>{price}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Step 2 — the clinic's existing line forwarding to Fonnus, then going live. */
export function ForwardVisual() {
  const { ref, played } = usePlayedOnce<HTMLDivElement>()

  return (
    <div ref={ref} data-played={played || undefined} className={styles.scene}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <Icon name="phone-call" size={15} />
          Chuyển tiếp cuộc gọi
        </div>

        <div className={styles.hop}>
          <span className={styles.node} style={{ '--delay': '150ms' } as React.CSSProperties}>
            <span className={styles.nodeLabel}>Số phòng khám</span>
            <span className={styles.nodeNum}>028 3822 1234</span>
            <span className={styles.nodeNote}>Giữ nguyên, không đổi</span>
          </span>

          <span className={styles.wire} aria-hidden="true">
            <span className={styles.wireLine} style={{ '--delay': '550ms' } as React.CSSProperties} />
            <span className={styles.wireHead} style={{ '--delay': '950ms' } as React.CSSProperties}>
              <Icon name="arrow-right" size={16} />
            </span>
          </span>

          <span className={styles.nodeOn} style={{ '--delay': '1000ms' } as React.CSSProperties}>
            <span className={styles.nodeLabel}>Fonnus</span>
            <span className={styles.nodeNum}>1900 8386</span>
            <span className={styles.nodeNote}>Nghe những cuộc không ai bắt</span>
          </span>
        </div>

        <div className={styles.switchRow} style={{ '--delay': '1400ms' } as React.CSSProperties}>
          <span className={styles.switchLabel}>Chuyển tiếp khi không ai nghe</span>
          <span className={styles.switchTrack}>
            <span className={styles.switchKnob} />
          </span>
        </div>

        <div className={styles.liveChip} style={{ '--delay': '1850ms' } as React.CSSProperties}>
          <Icon name="shield-check" size={15} />
          Đã kích hoạt — Fonnus bắt đầu nghe máy
        </div>
      </div>
    </div>
  )
}

/** Step 3 — a real call arriving, answered, and booked. */
export function LiveCallVisual() {
  const { ref, played } = usePlayedOnce<HTMLDivElement>()

  return (
    <div ref={ref} data-played={played || undefined} className={styles.scene}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <Icon name="phone-incoming" size={15} />
          Cuộc gọi đến · 21:14
        </div>

        <div className={styles.callRow} style={{ '--delay': '200ms' } as React.CSSProperties}>
          <span className={styles.ring}>
            <Icon name="phone-incoming" size={18} />
          </span>
          <span className={styles.callWho}>
            <span className={styles.callNum}>0903 ••• 217</span>
            <span className={styles.callMeta}>Ngoài giờ làm việc</span>
          </span>
        </div>

        <div className={styles.answering} style={{ '--delay': '900ms' } as React.CSSProperties}>
          <span className={styles.answerBars} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} style={{ animationDelay: `${i * 110}ms` }} />
            ))}
          </span>
          Linh đang trả lời bằng tiếng Việt
        </div>

        <div className={styles.saidRow} style={{ '--delay': '1200ms' } as React.CSSProperties}>
          “Dạ, phòng khám mở cửa 8 giờ sáng mai. Em giữ lịch 3 giờ chiều thứ Năm cho mình nhé?”
        </div>

        <div className={styles.doneChip} style={{ '--delay': '1800ms' } as React.CSSProperties}>
          <Icon name="calendar-check" size={15} />
          Đã đặt lịch · 15:00 thứ Năm 10/09
        </div>
      </div>
    </div>
  )
}
