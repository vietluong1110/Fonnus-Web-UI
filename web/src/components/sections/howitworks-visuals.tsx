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

/** A `--delay` carrier; every scene element schedules itself off this. */
const at = (ms: number) => ({ '--delay': `${ms}ms` }) as React.CSSProperties

const PRICE_ROWS = [
  { name: 'Khám tổng quát', price: '150.000 đ' },
  { name: 'Cạo vôi răng', price: '300.000 đ' },
  { name: 'Trám răng', price: 'từ 400.000 đ' },
  { name: 'Tẩy trắng răng', price: 'từ 1.500.000 đ' },
]

/** Step 1 — the clinic's own details, then its price list, easing into place. */
export function SetupVisual() {
  const { ref, played } = usePlayedOnce<HTMLDivElement>()

  return (
    <div ref={ref} data-played={played || undefined} className={styles.scene}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <Icon name="settings" size={15} />
          Thông tin phòng khám
        </div>

        <div className={styles.paneBody}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Tên phòng khám</span>
            <span className={styles.fieldBox}>
              <span className={styles.fieldValue} style={at(160)}>
                Nha khoa Minh Anh
              </span>
            </span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Địa chỉ</span>
            <span className={styles.fieldBox}>
              <span className={styles.fieldValue} style={at(320)}>
                12 Nguyễn Huệ, Q.1, TP.HCM
              </span>
            </span>
          </div>

          <div>
            <div className={styles.tableHead}>Bảng giá dịch vụ</div>
            <div className={styles.table}>
              {PRICE_ROWS.map(({ name, price }, i) => (
                <span key={name} className={styles.tableRow} style={at(560 + i * 130)}>
                  <span>{name}</span>
                  <span className={styles.price}>{price}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/*
 * The pool a clinic picks from during onboarding. Fonnus buys fixed-line
 * numbers in bulk and the tenant takes one at no charge, so the scene shows a
 * short list with one taken rather than a number handed down.
 */
const FONNUS_NUMBERS = [
  { number: '028 7300 8386', chosen: true },
  { number: '028 7300 8388' },
  /* Two options already read as a pool to pick from, and a phone card only has
     the height the screen gives it, so the third is shown where there is room. */
  { number: '028 7300 1246', wideOnly: true },
]

/**
 * Step 2 — the two ways a clinic gets onto Fonnus, side by side, because the
 * choice between them is the whole of this step:
 *
 *   1. Take a number from the Fonnus pool and publish it. Whoever rings it
 *      reaches the assistant.
 *   2. Keep the hotline already on the door and the website, and point it at
 *      the Fonnus number with a redirect on the exchange. Callers dial what
 *      they always dialled and land in the same place.
 */
export function ForwardVisual() {
  const { ref, played } = usePlayedOnce<HTMLDivElement>()

  return (
    <div ref={ref} data-played={played || undefined} className={styles.scene}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <Icon name="phone-call" size={15} />
          Hai cách bắt đầu
        </div>

        <div className={styles.paneBodyWays}>
          {/*
            The two routes share the pane's spare height between them, so what
            is left over opens the gaps inside each card — between the badge and
            the numbers — instead of pooling in one slab between the two.
          */}
          <div className={styles.ways}>
            <div className={styles.way} style={at(120)}>
              <div className={styles.wayHead}>
                <span className={styles.wayBadge}>Cách 1</span>
                Dùng số Fonnus cấp
              </div>

              <div className={styles.numbers}>
                {FONNUS_NUMBERS.map(({ number, chosen, wideOnly }, i) => (
                  <span
                    key={number}
                    className={chosen ? styles.numberOn : wideOnly ? styles.numberWide : styles.number}
                    style={at(280 + i * 100)}
                  >
                    <span>{number}</span>
                    {chosen ? <span className={styles.numberTag}>Đã chọn</span> : null}
                  </span>
                ))}
              </div>

              <p className={styles.wayNote}>In số này lên website và biển hiệu phòng khám.</p>
            </div>

            <div className={styles.way} style={at(1150)}>
              <div className={styles.wayHead}>
                <span className={styles.wayBadge}>Cách 2</span>
                Giữ số hiện tại
              </div>

              <div className={styles.redirect}>
                <span className={styles.redirectFrom} style={at(1270)}>
                  028 3822 1234
                </span>

                {/*
                The connector is drawn on a real box — left to right in the row,
                top to bottom on the narrowest screens. Rotating the box itself
                is what used to smear the line across the card.
              */}
                <span className={styles.wire} aria-hidden="true">
                  <span className={styles.wireLine} style={at(1420)} />
                  <span className={styles.wireHead} style={at(1640)}>
                    <Icon name="arrow-right" size={16} />
                  </span>
                </span>

                <span className={styles.redirectTo} style={at(1660)}>
                  028 7300 8386
                </span>
              </div>

              <p className={styles.wayNote}>Cài chuyển hướng trên tổng đài — khách vẫn gọi số cũ.</p>
            </div>
          </div>

          <div className={styles.liveChip} style={at(1980)}>
            <Icon name="shield-check" size={15} />
            {/* The full sentence wraps to two lines on a phone, so the narrow
                screens get the half that carries the news. */}
            <span className={styles.chipLong}>Chọn xong là Fonnus bắt đầu nghe máy</span>
            <span className={styles.chipShort}>Fonnus bắt đầu nghe máy</span>
          </div>
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

        <div className={styles.paneBody}>
          <div className={styles.callRow} style={at(140)}>
            <span className={styles.ring}>
              <Icon name="phone-incoming" size={18} />
            </span>
            <span className={styles.callWho}>
              <span className={styles.callNum}>0903 ••• 217</span>
              <span className={styles.callMeta}>Ngoài giờ làm việc</span>
            </span>
          </div>

          <div className={styles.answering} style={at(500)}>
            <span className={styles.answerBars} aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 110}ms` }} />
              ))}
            </span>
            Linh đang trả lời bằng tiếng Việt
          </div>

          {/*
            Both halves of the exchange, not just the assistant's. A single
            quoted line left the pane looking half-empty and, worse, never
            showed the thing being demonstrated: that the caller is understood.
            Blush is the brand's assistant-speech ground; the caller sits on
            paper.
          */}
          <div className={styles.turns}>
            <p className={styles.askRow} style={at(820)}>
              “Alo, mai phòng khám mở cửa mấy giờ em?”
            </p>
            <p className={styles.saidRow} style={at(1120)}>
              “Dạ, mai phòng khám mở cửa 8 giờ. Em giữ lịch 3 giờ chiều thứ Năm nhé?”
            </p>
            <p className={styles.askRow} style={at(1440)}>
              “Ừ, em đặt giúp chị.”
            </p>
          </div>

          <div className={styles.doneChip} style={at(1740)}>
            <Icon name="calendar-check" size={15} />
            <span className={styles.chipLong}>Đã đặt lịch · 15:00 thứ Năm 10/09</span>
            <span className={styles.chipShort}>Đã đặt lịch · 15:00 thứ Năm</span>
          </div>
        </div>
      </div>
    </div>
  )
}
