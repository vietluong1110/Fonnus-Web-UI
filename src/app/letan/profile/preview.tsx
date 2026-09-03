import type { ReactNode } from 'react'
import { Icon } from '../../../design-system'
import { MiniOrb } from '../../../components/orb/MiniOrb'
import { Card, PlayButton, ui } from '../../ui'
import styles from './Profile.module.css'

/*
 * The preview rail.
 *
 * Every Hồ sơ screen ends in one of these: the caller's side of the call,
 * rebuilt from the fields as they are typed. It is the answer to "what does
 * this setting actually do", which is the thing a clinic owner cannot get from
 * a label — and it is why the legally-required opening line lives here rather
 * than in a warning block among the inputs. The caller hears it, so it belongs
 * in the transcript; there is nothing to fill in.
 */

/** The line Fonnus speaks before the clinic's own greeting, in every call. */
export function defaultGreeting(business: string, agent: string): string {
  return `${business} xin nghe. Em là ${agent}, trợ lý AI của phòng khám. Anh chị cần đặt lịch hay hỏi thông tin ạ?`
}

export function PreviewCard({
  title,
  meta,
  orb = true,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  /** Off for previews that are an explanation rather than the agent speaking. */
  orb?: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <div className={styles.previewHead}>
        {orb ? <MiniOrb size={34} /> : null}
        <span>
          <span className={styles.previewName}>{title}</span>
          {meta ? <span className={styles.previewMeta}>{meta}</span> : null}
        </span>
      </div>
      {children}
    </Card>
  )
}

export type TurnTone = 'locked' | 'greeting' | 'caller'

const toneClass: Record<TurnTone, string> = {
  locked: styles.turnLocked,
  greeting: styles.turnGreeting,
  caller: styles.turnCaller,
}

export function Turn({
  label,
  locked = false,
  tone = 'greeting',
  children,
}: {
  label?: ReactNode
  /** Draws the padlock beside the label: this line cannot be edited. */
  locked?: boolean
  tone?: TurnTone
  children: ReactNode
}) {
  return (
    <div className={styles.turn}>
      {label ? (
        <span className={styles.turnLabel}>
          {locked ? <Icon name="lock" size={12} /> : null}
          {label}
        </span>
      ) : null}
      <div className={`${styles.turnBody} ${toneClass[tone]}`}>{children}</div>
    </div>
  )
}

/** A full-width "hear the whole thing" button, the last element of a rail. */
export function ListenAll({ text, label = 'Nghe cả đoạn' }: { text: string; label?: string }) {
  return (
    <div className={ui.row}>
      <PlayButton text={text} label={label} />
      <span className={ui.hint}>{label}</span>
    </div>
  )
}
