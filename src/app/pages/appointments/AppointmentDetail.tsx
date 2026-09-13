import type { ReactNode } from 'react'
import { Button, Icon } from '../../../design-system'
import type { Appointment, AppointmentAction } from '../../../api'
import { appHref } from '../../../hooks/useRoute'
import { IconButton } from '../../ui'
import {
  WEEKDAY,
  callLine,
  confirmationLine,
  dayIndex,
  dayLong,
  durationLabel,
  hm,
  lookOf,
  lookSentence,
  priceLine,
  sameDay,
  statusLabel,
  visitsLabel,
} from './labels'
import styles from './Appointments.module.css'

/*
 * One appointment, in the order an owner reads it: where it stands, what and
 * when, who, what the receptionist heard and said, the call it came from,
 * what was sent afterwards — and the few things to do about it.
 *
 * The same content in all three places it opens (beside the block, in the
 * drawer, in the phone's sheet), so an owner learns it once.
 *
 * The actions are light on purpose: nothing here moves a time. A caller's own
 * request to move is accepted or kept; anything else is a phone call, and the
 * call button is always one of the actions.
 */

interface Props {
  appointment: Appointment
  agent: string
  now: Date
  busy: boolean
  onAct: (action: AppointmentAction) => void
  /** Drawn as a close button in the head. The popover closes on an outside press instead. */
  onClose?: () => void
}

export function AppointmentDetail({ appointment: a, agent, now, busy, onAct, onClose }: Props) {
  const start = new Date(a.starts_at)
  const end = new Date(start.getTime() + a.duration_min * 60_000)
  const look = lookOf(a)
  const started = start.getTime() <= now.getTime()
  const today = sameDay(start, now)
  const confirm = confirmationLine(a)
  const call = callLine(a)
  const tel = `tel:${a.phone.replace(/\s+/g, '')}`

  const pill = look ? styles.stPillLook : a.status === 'arrived' ? styles.stPillArrived : a.status === 'held' ? '' : styles.stPillQuiet

  const callButton = (label = 'Gọi khách', primary = false, onClick?: () => void) => (
    <a className={`${styles.callBtn} ${primary ? styles.callBtnPrimary : ''}`} href={tel} onClick={onClick}>
      <Icon name="answered" size={16} />
      {label}
    </a>
  )
  const quiet = (label: string, action: AppointmentAction) => (
    <button type="button" className={styles.quiet} disabled={busy} onClick={() => onAct(action)}>
      {label}
    </button>
  )
  const primary = (label: string, action: AppointmentAction) => (
    <Button size="sm" disabled={busy} onClick={() => onAct(action)}>
      {label}
    </Button>
  )

  let actions: ReactNode
  if (look === 'pending') {
    actions = (
      <>
        {primary('Xác nhận lịch', 'confirm')}
        {callButton()}
        {quiet('Từ chối', 'decline')}
      </>
    )
  } else if (look === 'change') {
    const to = new Date(a.change_request!.starts_at)
    actions = (
      <>
        {primary(`Đổi sang ${hm(to)} ${WEEKDAY[dayIndex(to)].toLowerCase()}`, 'accept_change')}
        {callButton()}
        {quiet('Giữ giờ cũ', 'keep_time')}
      </>
    )
  } else if (look === 'unconfirmed') {
    actions = (
      <>
        {callButton('Gọi báo khách', true, () => onAct('informed'))}
        {quiet('Huỷ lịch', 'cancel')}
      </>
    )
  } else if (a.status === 'held') {
    actions = (
      <>
        {today ? primary('Khách đã đến', 'arrived') : null}
        {callButton()}
        {started ? quiet('Không đến', 'no_show') : quiet('Huỷ lịch', 'cancel')}
      </>
    )
  } else if (a.status === 'no_show') {
    actions = (
      <>
        {callButton('Gọi hẹn lại', true)}
        {quiet('Bỏ đánh dấu', 'restore')}
      </>
    )
  } else if (a.status === 'arrived') {
    actions = (
      <>
        {callButton()}
        {quiet('Bỏ đánh dấu', 'restore')}
      </>
    )
  } else {
    actions = (
      <>
        {callButton()}
        {started ? null : quiet('Khôi phục lịch', 'restore')}
      </>
    )
  }

  return (
    <div className={styles.detail}>
      <div className={styles.dtTop}>
        <span className={`${styles.stPill} ${pill}`}>
          {look ? <span className={styles.needDot} /> : null}
          {a.status === 'arrived' ? <Icon name="check" size={14} /> : null}
          {a.status === 'no_show' ? <Icon name="caller-lost" size={15} /> : null}
          {statusLabel(a, agent)}
        </span>
        {onClose ? (
          <span className={styles.dtClose}>
            <IconButton name="x" label="Đóng" size={18} onClick={onClose} />
          </span>
        ) : null}
      </div>

      <div className={styles.dtHead}>
        <h3 className={styles.dtTitle}>{a.service_name}</h3>
        <span className={styles.dtWhen}>
          {dayLong(start)} · {hm(start)}–{hm(end)}
        </span>
      </div>

      {look ? (
        <div className={styles.askRow}>
          <span className={styles.needDot} />
          <span>{lookSentence(a, agent)}</span>
        </div>
      ) : null}

      <div className={styles.kvs}>
        <div className={styles.kv}>
          <span className={styles.kvIcon}>
            <Icon name="caller" size={20} />
          </span>
          <span className={styles.kvText}>
            <span className={styles.kvMain}>
              {a.patient_name}
              {a.prior_visits <= 0 ? <span className={styles.newTag}>Khách mới</span> : null}
            </span>
            {a.booked_by ? <span className={styles.kvSub}>{a.booked_by} đặt giúp</span> : null}
            <span className={`${styles.kvSub} ${styles.num}`}>
              {a.phone}
              {a.prior_visits > 0 ? ` · ${visitsLabel(a)}` : ''}
            </span>
          </span>
        </div>
        <div className={styles.kv}>
          <span className={styles.kvIcon}>
            <Icon name="practitioner" size={20} />
          </span>
          <span className={styles.kvText}>
            <span className={styles.kvMain}>{a.practitioner?.name ?? 'Bác sĩ nào cũng được'}</span>
            <span className={`${styles.kvSub} ${styles.num}`}>{priceLine(a)}</span>
          </span>
        </div>
      </div>

      {a.note ? (
        <div className={styles.note}>
          <span className={styles.eyebrow}>{agent} ghi lại</span>
          <p className={styles.noteText}>{a.note}</p>
        </div>
      ) : null}

      {a.instructions && a.status !== 'cancelled' ? (
        <div className={styles.said}>
          <span className={styles.saidWho}>{agent} dặn khách</span>
          <span className={styles.saidText}>{a.instructions}</span>
        </div>
      ) : null}

      {a.call && call ? (
        <a className={styles.callRow} href={appHref('cuoc-goi', a.call.id)}>
          <span className={styles.playDisc}>
            <Icon name="play" size={16} />
          </span>
          <span className={styles.kvText}>
            <span className={`${styles.kvMain} ${styles.num}`}>{call}</span>
            <span className={styles.kvSub}>{durationLabel(a.call.duration_s)} · nghe lại trong Cuộc gọi</span>
          </span>
          <span className={styles.chev}>
            <Icon name="chevron-right" size={16} />
          </span>
        </a>
      ) : null}

      <div className={`${styles.confirm} ${confirm.gap ? styles.confirmGap : ''}`}>
        <Icon name="message" size={18} />
        <span>{confirm.text}</span>
      </div>

      <div className={styles.acts}>{actions}</div>
    </div>
  )
}
