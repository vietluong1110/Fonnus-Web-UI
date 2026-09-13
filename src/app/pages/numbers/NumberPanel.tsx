import { useState } from 'react'
import type { ForwardMode, NumbersOverview, OwnedNumber } from '../../../api'
import { messageFor } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { DeleteButton, TextField, Tile, TileGrid, ui } from '../../ui'
import { FORWARD_MODES, cancelCode, dmy, fmtNumber, forwardLine, isDialable, lastStep, modeOf } from './labels'
import { ForwardArc, ReceptionistTiles, StatusMark } from './parts'
import styles from './Numbers.module.css'

/*
 * One number the clinic owns: whether it is live, who answers it (changed by
 * pressing her tile, no save), the guide for forwarding the old line, and
 * giving the number back — quiet until pressed, and then what will happen is
 * said before it happens.
 */
export function NumberPanel({
  number: n,
  overview,
  assignError,
  guideOpen,
  onAssign,
  onForwarding,
  onRelease,
  onCopy,
}: {
  number: OwnedNumber
  overview: NumbersOverview
  assignError: string | null
  guideOpen: boolean
  onAssign: (receptionistId: string) => void
  onForwarding: (f: OwnedNumber['forwarding']) => Promise<void>
  onRelease: () => Promise<void>
  onCopy: (text: string, what: string) => void
}) {
  const name = overview.receptionists.find((r) => r.id === n.receptionist_id)?.name ?? ''
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [releaseError, setReleaseError] = useState<string | null>(null)

  const release = () => {
    setBusy(true)
    setReleaseError(null)
    onRelease().catch((e: unknown) => {
      setReleaseError(messageFor(e))
      setBusy(false)
    })
  }

  return (
    <div className={styles.body}>
      <div className={styles.top}>
        <StatusMark status={n.status} pill />
        <span className={styles.spacer} />
        <a className={styles.callLink} href={`tel:${n.number}`}>
          <Icon name="answered" size={16} />
          Gọi thử
        </a>
      </div>

      <div className={styles.plate}>
        <span className={`${styles.plateNumber} ${styles.num}`}>{fmtNumber(n.number)}</span>
        <span className={styles.plateSub}>Mua {dmy(n.bought_at)}</span>
      </div>

      <section className={styles.sect}>
        <h4 className={styles.sectLabel}>Ai nghe máy số này?</h4>
        <ReceptionistTiles overview={overview} selected={n.receptionist_id} onPick={onAssign} exceptNumber={n.id} />
        {assignError ? (
          <p className={styles.error} role="alert">
            {assignError}
          </p>
        ) : null}
      </section>

      <div className={styles.rule} />

      <section className={styles.sect}>
        <h4 className={styles.sectLabel}>Chuyển máy từ số cũ</h4>
        <Forwarding number={n} name={name} initiallyOpen={guideOpen} onSave={onForwarding} onCopy={onCopy} />
      </section>

      {confirm ? (
        <div className={styles.release} role="group" aria-label="Trả lại số">
          <span className={styles.releaseTitle}>
            Trả lại số <span className={styles.num}>{fmtNumber(n.number)}</span>?
          </span>
          <span className={styles.releaseLine}>
            <Icon name="caller-lost" size={18} />
            <span>Khách gọi số này sẽ không gặp {name || 'lễ tân'} nữa.</span>
          </span>
          <span className={styles.releaseLine}>
            <Icon name="overview" size={18} />
            <span>Số về kho chung — phòng khám khác mua được.</span>
          </span>
          <span className={styles.releaseLine}>
            <Icon name="price" size={18} />
            <span>Tiền mua số đã trả không được hoàn lại.</span>
          </span>
          {n.forwarding ? (
            <span className={styles.releaseLine}>
              <Icon name="transfer" size={18} />
              <span>Nhớ tắt chuyển máy ở số cũ: bấm {cancelCode(n.forwarding.mode)}.</span>
            </span>
          ) : null}
          {releaseError ? (
            <p className={styles.error} role="alert">
              {releaseError}
            </p>
          ) : null}
          <span className={styles.releaseActs}>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(false)} disabled={busy}>
              Giữ số
            </Button>
            <button type="button" className={styles.danger} onClick={release} disabled={busy}>
              {busy ? 'Đang trả lại…' : 'Trả lại số'}
            </button>
          </span>
        </div>
      ) : (
        <div className={styles.relFoot}>
          <DeleteButton label="Trả lại số này" onClick={() => setConfirm(true)} />
        </div>
      )}
    </div>
  )
}

/*
 * The old line keeps working. Fonnus cannot see it, so what is saved is the
 * owner's word that it is done — and the guide is a drawing, three tiles and
 * the code to dial with the number already filled in.
 */
function Forwarding({
  number: n,
  name,
  initiallyOpen,
  onSave,
  onCopy,
}: {
  number: OwnedNumber
  name: string
  initiallyOpen: boolean
  onSave: (f: OwnedNumber['forwarding']) => Promise<void>
  onCopy: (text: string, what: string) => void
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const [mode, setMode] = useState<ForwardMode>(n.forwarding?.mode ?? 'all')
  const [from, setFrom] = useState(n.forwarding?.from_number ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = (f: OwnedNumber['forwarding']) => {
    setBusy(true)
    setError(null)
    onSave(f)
      .then(() => {
        setBusy(false)
        setOpen(false)
      })
      .catch((e: unknown) => {
        setBusy(false)
        setError(messageFor(e))
      })
  }

  if (n.forwarding) {
    const m = modeOf(n.forwarding.mode)
    return (
      <>
        <div className={styles.fact}>
          <span className={styles.factMark}>
            <Icon name="transfer" size={20} />
          </span>
          <span className={styles.factText}>
            <span className={styles.factTitle}>
              {forwardLine(m.id)} từ <span className={styles.num}>{fmtNumber(n.forwarding.from_number)}</span>
            </span>
            <span className={styles.factSub}>Tắt: bấm {cancelCode(m.id)} ở số cũ</span>
          </span>
          <button type="button" className={ui.linkButton} onClick={() => save(null)} disabled={busy}>
            Tắt
          </button>
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </>
    )
  }

  if (!open) {
    return (
      <button type="button" className={`${styles.fact} ${styles.factGap}`} onClick={() => setOpen(true)}>
        <span className={styles.factMark}>
          <Icon name="transfer" size={20} />
        </span>
        <span className={styles.factText}>
          <span className={styles.factTitle}>Khách vẫn gọi số cũ?</span>
          <span className={styles.factSub}>Chuyển sang số này — không phải in lại biển hiệu</span>
        </span>
        <span className={styles.factAct}>
          Xem cách
          <Icon name="chevron-right" size={14} />
        </span>
      </button>
    )
  }

  const m = modeOf(mode)
  const ok = isDialable(from)

  return (
    <div className={styles.fw}>
      <TextField
        label="Số cũ của phòng khám"
        compact
        numeric
        inputMode="tel"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        placeholder="VD: 024 3756 2211"
      />

      <div className={styles.fwDraw} aria-hidden="true">
        <span className={styles.mini}>
          <span className={styles.miniLabel}>Số cũ</span>
          <span className={`${styles.miniNum} ${styles.num}`}>{ok ? fmtNumber(from) : '— — —'}</span>
        </span>
        <ForwardArc />
        <span className={`${styles.mini} ${styles.miniNew}`}>
          <span className={styles.miniLabel}>Số Fonnus</span>
          <span className={`${styles.miniNum} ${styles.num}`}>{fmtNumber(n.number)}</span>
        </span>
      </div>

      <TileGrid min={96} radio ariaLabel="Khi nào chuyển máy">
        {FORWARD_MODES.map((x) => (
          <Tile key={x.id} icon={x.icon} label={x.label} single selected={mode === x.id} onClick={() => setMode(x.id)} />
        ))}
      </TileGrid>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepNum}>1</span>
          <span>Nhấc máy bàn của số cũ</span>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum}>2</span>
          <span className={styles.stepBody}>
            <span>Bấm mã này rồi bấm gọi</span>
            <span className={styles.code}>
              <span className={`${styles.codeText} ${styles.num}`}>
                <span className={styles.lit}>*{m.code}*</span>
                {n.number}
                <span className={styles.lit}>#</span>
              </span>
              <button type="button" className={styles.copy} onClick={() => onCopy(`*${m.code}*${n.number}#`, 'mã chuyển máy')}>
                Chép
              </button>
            </span>
          </span>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum}>3</span>
          <span>{lastStep(mode, name || 'lễ tân')}</span>
        </li>
      </ol>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.fwFoot}>
        <Button size="sm" onClick={() => save({ from_number: from.replace(/\D/g, ''), mode })} disabled={!ok || busy}>
          {busy ? 'Đang lưu…' : 'Tôi đã chuyển xong'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          Để sau
        </Button>
      </div>
    </div>
  )
}
