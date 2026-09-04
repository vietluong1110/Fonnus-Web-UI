import type { ReactNode } from 'react'
import { Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { MiniOrb } from '../../../components/orb/MiniOrb'
import { useSpeak } from '../../ui/speak'
import styles from './Profile.module.css'

/*
 * The preview panel.
 *
 * Every Hồ sơ section ends in one of these: the caller's side of the call,
 * rebuilt from the fields as they are typed. It is the answer to "what does
 * this setting actually do" — the thing a clinic owner cannot get from a
 * label — and it is why the legally-required opening line lives here rather
 * than in a warning block among the inputs. The caller hears it, so it
 * belongs in the transcript; there is nothing to fill in.
 *
 * It is drawn as the assistant's sibling in shape but not in colour: the same
 * head over a hairline with the conversation underneath, on the same milk
 * ground as the fields beside it, separated by the gutter rule rather than by
 * a tint (see the note above `.panel` in Profile.module.css). The head is
 * always the receptionist — her orb, her
 * name, how she sounds — because the whole panel is "press this and hear
 * her". Turns, then the play control, and nothing under it: the captions that
 * used to explain the transcript were longer than the transcript.
 *
 * `listen` is a prop rather than a child so the button always lands at the
 * foot of the transcript and always looks the same. It was once passed in as
 * a child, which is how one screen ended up without one at all.
 */

/** The line Fonnus speaks before the clinic's own greeting, in every call. */
export function defaultGreeting(business: string, agent: string): string {
  return `${business} xin nghe. Em là ${agent}, trợ lý AI của phòng khám. Anh chị cần đặt lịch hay hỏi thông tin ạ?`
}

export function PreviewCard({
  title,
  meta,
  listen,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  /** The line to voice, and what to call it. Rule 2: every screen ends in
      something you can hear. */
  listen?: { text: string; label?: string }
  children: ReactNode
}) {
  return (
    <section className={styles.panel} aria-label="Nghe thử">
      <div className={styles.panelHead}>
        <MiniOrb size={32} />
        <span className={styles.previewText}>
          <span className={styles.previewName}>{title}</span>
          {meta ? <span className={styles.previewMeta}>{meta}</span> : null}
        </span>
      </div>

      <div className={styles.panelBody}>
        {children}
        {listen ? <ListenAll text={listen.text} label={listen.label} /> : null}
      </div>
    </section>
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
  note,
  noteIcon,
  children,
}: {
  label?: ReactNode
  /** Draws the padlock beside the label: this line cannot be edited. */
  locked?: boolean
  tone?: TurnTone
  /** One line the bubble says about itself, set above the quote — which
      instruction produced this answer, which daypart this greeting is for. */
  note?: ReactNode
  noteIcon?: IconName
  children: ReactNode
}) {
  return (
    <div className={styles.turn}>
      {label ? (
        <span className={styles.turnLabel}>
          {locked ? <Icon name="privacy" size={12} /> : null}
          {label}
        </span>
      ) : null}
      <div className={`${styles.turnBody} ${toneClass[tone]}`}>
        {note ? (
          <span className={styles.turnNote}>
            {noteIcon ? (
              <span className={styles.turnNoteIcon}>
                <Icon name={noteIcon} size={13} />
              </span>
            ) : null}
            <span>{note}</span>
          </span>
        ) : null}
        {children}
      </div>
    </div>
  )
}

/*
 * "Hear the whole thing" — the one filled control in the panel, at the foot
 * of the transcript.
 *
 * It does not use `PlayButton`, which is a 30px icon disc built for sitting
 * beside a row of fields. Here the play action *is* the point of the panel, so
 * it carries its own label: an icon disc plus 12.5px grey text was the quietest
 * thing on a card whose entire job is "press this and hear it".
 */
function ListenAll({ text, label = 'Nghe cả đoạn' }: { text: string; label?: string }) {
  const { speaking, toggle, supported } = useSpeak(text)
  return (
    <button
      type="button"
      className={`${styles.listen} ${speaking ? styles.listenOn : ''}`}
      onClick={toggle}
      disabled={!text.trim()}
      title={supported ? undefined : 'Trình duyệt này không đọc được tiếng Việt — nghe thử cần máy chủ TTS.'}
    >
      <Icon name={speaking ? 'pause' : 'play'} size={15} />
      {speaking ? 'Đang phát — bấm để dừng' : label}
    </button>
  )
}
