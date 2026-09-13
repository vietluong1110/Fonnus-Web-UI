import type { Checkout, NumberHold, NumbersOverview, PayMethod } from '../../../api'
import { messageFor } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { IconButton, Tile, TileGrid } from '../../ui'
import { PAY_METHODS, PAY_TITLE, clock, fmtNumber, fmtVnd } from './labels'
import { NumberText, PayClock, ReceptionistTiles } from './parts'
import styles from './Numbers.module.css'

/*
 * Buying one number, in three states that replace each other in the panel:
 *
 *   review   the number, held until a clock time (never a countdown); who
 *            answers it; how to pay; one total and one button.
 *   pay      the QR or the gateway, with the five-minute payment window counting
 *            down in the corner — the page polls, so "Tôi đã chuyển khoản" only
 *            asks now, and so does the clock reaching zero.
 *   done     the number is the clinic's, and the one next step: forwarding the
 *            old line. Whether it is live yet is the list's business, not this.
 *
 * Who answers is chosen inside the purchase, so no number is ever paid for and
 * left ringing nobody.
 */

export interface BuyState {
  number: string
  /** Trailing digits the pattern covers, carried from the tile that was pressed. */
  lit: number
  hold: NumberHold | null
  /** The tile's price until the hold quotes one. `null` when the owner arrived by address. */
  price: number | null
  holdError: unknown
  receptionist: string
  method: PayMethod
  step: 'review' | 'pay' | 'done'
  checkout: Checkout | null
  busy: boolean
  error: string | null
}

export function BuyPanel({
  buy,
  overview,
  closable,
  onReceptionist,
  onMethod,
  onPay,
  onBack,
  onCheckNow,
  onClose,
  onFinish,
  onGuide,
  onCopy,
}: {
  buy: BuyState
  overview: NumbersOverview
  /** The rail has no bar of its own to close from. */
  closable: boolean
  onReceptionist: (id: string) => void
  onMethod: (m: PayMethod) => void
  onPay: () => void
  onBack: () => void
  onCheckNow: () => void
  onClose: () => void
  onFinish: () => void
  onGuide: () => void
  onCopy: (text: string, what: string) => void
}) {
  const price = buy.hold?.price_vnd ?? buy.price

  if (buy.holdError) {
    return (
      <div className={styles.body}>
        <div className={styles.notice} role="alert">
          <span className={styles.factTitle}>Chưa giữ được số {fmtNumber(buy.number)}</span>
          <span className={styles.factSub}>{messageFor(buy.holdError)}</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Chọn số khác
          </Button>
        </div>
      </div>
    )
  }

  if (buy.step === 'done') {
    return (
      <div className={styles.body}>
        <span className={styles.doneMark}>
          <Icon name="done" size={26} />
        </span>
        <h3 className={styles.doneTitle}>
          <span className={styles.num}>{fmtNumber(buy.number)}</span> đã là số của phòng khám
        </h3>
        <button type="button" className={`${styles.fact} ${styles.factGap}`} onClick={onGuide}>
          <span className={styles.factMark}>
            <Icon name="transfer" size={20} />
          </span>
          <span className={styles.factText}>
            <span className={styles.factTitle}>Khách vẫn gọi số cũ?</span>
            <span className={styles.factSub}>Chuyển máy sang số mới — mất một phút</span>
          </span>
          <span className={styles.factAct}>
            Xem cách
            <Icon name="chevron-right" size={14} />
          </span>
        </button>
        <Button variant="secondary" fullWidth onClick={onFinish}>
          Xong
        </Button>
      </div>
    )
  }

  if (buy.step === 'pay' && buy.checkout) {
    const co = buy.checkout
    const qr = co.vietqr?.image_url ?? co.qr_image_url
    return (
      <div className={styles.body}>
        <div className={styles.top}>
          <button type="button" className={styles.back} onClick={onBack}>
            <Icon name="chevron-left" size={16} />
            Đổi cách trả
          </button>
          <span className={styles.spacer} />
          {co.status === 'awaiting_payment' ? <PayClock until={co.expires_at} onZero={onCheckNow} /> : null}
        </div>
        <div className={styles.plate}>
          <span className={styles.eyebrow}>{PAY_TITLE[co.method]}</span>
          <span className={`${styles.plateNumber} ${styles.num}`}>{fmtVnd(co.amount_vnd)}</span>
          <span className={styles.plateSub}>
            cho số <span className={styles.num}>{fmtNumber(co.number)}</span>
          </span>
        </div>

        {qr ? (
          <div className={styles.qrWrap}>
            <img className={styles.qr} src={qr} alt="Mã QR để thanh toán" width={176} height={176} />
            <span className={styles.qrCap}>{co.method === 'momo' ? 'Quét bằng ứng dụng MoMo' : 'Mở app ngân hàng và quét mã'}</span>
          </div>
        ) : null}

        {co.vietqr ? (
          <div className={styles.payRows}>
            <div className={styles.payRow}>
              <span className={styles.payKey}>Ngân hàng</span>
              <span className={styles.payVal}>{co.vietqr.bank}</span>
            </div>
            <div className={styles.payRow}>
              <span className={styles.payKey}>Chủ tài khoản</span>
              <span className={styles.payVal}>{co.vietqr.account_name}</span>
            </div>
            <div className={styles.payRow}>
              <span className={styles.payKey}>Số tài khoản</span>
              <span className={`${styles.payVal} ${styles.num}`}>{co.vietqr.account_number}</span>
              <button type="button" className={styles.copy} onClick={() => onCopy(co.vietqr?.account_number ?? '', 'số tài khoản')}>
                Chép
              </button>
            </div>
            <div className={styles.payRow}>
              <span className={styles.payKey}>Nội dung</span>
              <span className={`${styles.payVal} ${styles.num}`}>{co.vietqr.memo}</span>
              <button type="button" className={styles.copy} onClick={() => onCopy(co.vietqr?.memo ?? '', 'nội dung chuyển khoản')}>
                Chép
              </button>
            </div>
          </div>
        ) : null}

        {co.method === 'card' ? (
          <div className={styles.kv}>
            <span className={styles.kvIcon}>
              <Icon name="privacy" size={18} />
            </span>
            <span className={styles.kvSub}>Số thẻ nhập ở trang của cổng thanh toán — Fonnus không giữ số thẻ.</span>
          </div>
        ) : null}

        {co.redirect_url ? (
          <a className={styles.gateway} href={co.redirect_url} target="_blank" rel="noopener noreferrer">
            {co.method === 'momo' ? 'Mở ứng dụng MoMo' : 'Mở trang thanh toán thẻ'}
          </a>
        ) : null}

        {co.method === 'vietqr' ? (
          <Button variant="secondary" fullWidth onClick={onCheckNow}>
            Tôi đã chuyển khoản
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.body}>
      <div className={styles.top}>
        <span className={styles.eyebrow}>Số bạn chọn</span>
        <span className={styles.spacer} />
        {closable ? <IconButton name="x" label="Bỏ chọn số này" size={18} onClick={onClose} /> : null}
      </div>

      <div className={styles.plate}>
        <NumberText number={buy.number} lit={buy.lit} className={styles.plateNumber} />
        <span className={styles.plateSub}>
          <Icon name="hours" size={14} />
          {buy.hold ? `Giữ cho bạn đến ${clock(buy.hold.held_until)}` : 'Đang giữ số cho bạn…'}
        </span>
      </div>

      <section className={styles.sect}>
        <h4 className={styles.sectLabel}>Ai nghe máy số này?</h4>
        <ReceptionistTiles overview={overview} selected={buy.receptionist} onPick={onReceptionist} />
      </section>

      <div className={styles.rule} />

      <section className={styles.sect}>
        <h4 className={styles.sectLabel}>Thanh toán bằng</h4>
        <TileGrid min={104} radio ariaLabel="Cách thanh toán">
          {PAY_METHODS.map((m) => (
            <Tile key={m.id} icon={m.icon} label={m.label} single selected={buy.method === m.id} onClick={() => onMethod(m.id)} />
          ))}
        </TileGrid>
      </section>

      <div className={styles.total}>
        <span className={styles.totalLabel}>Tổng</span>
        <span className={styles.totalSub}>một lần</span>
        <span className={`${styles.totalNum} ${styles.num}`}>{price != null ? fmtVnd(price) : '—'}</span>
      </div>

      {buy.error ? (
        <p className={styles.error} role="alert">
          {buy.error}
        </p>
      ) : null}

      <Button fullWidth onClick={onPay} disabled={!buy.hold || buy.busy || !buy.receptionist}>
        {buy.busy ? 'Đang tạo thanh toán…' : price != null ? `Thanh toán ${fmtVnd(price)}` : 'Thanh toán'}
      </Button>
    </div>
  )
}
