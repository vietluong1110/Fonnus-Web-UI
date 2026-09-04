import { Fragment } from 'react'
import { Icon, Logo } from '../design-system'
import type { IconName } from '../design-system'
import { SIGNIN_PANEL, SIGNUP_PANEL } from '../data/auth'
import type { Say } from '../data/auth'
import { hrefFor } from '../hooks/useRoute'
import styles from './AuthPanel.module.css'

/**
 * The left half of both auth screens.
 *
 * Same job on both doors, opposite moment: sign-up replays the call that
 * happens while the clinic is shut, sign-in shows what was waiting the next
 * morning. Neither is decoration — the panel is the only place on these screens
 * where the product is visible at all, and an owner deciding whether to hand
 * over their phone number is deciding about the thing shown here.
 *
 * Below 900px the whole panel is dropped (see AuthShell): it is reassurance,
 * not a control, and on a phone the form should own the screen.
 */

/** Renders a scripted line, wrapping the `{ num }` runs in tabular figures. */
function Says({ says }: { says: Say[] }) {
  return (
    <>
      {says.map((part, i) => (
        <Fragment key={i}>
          {typeof part === 'string' ? part : <b className={styles.num}>{part.num}</b>}
        </Fragment>
      ))}
    </>
  )
}

/** "21:14 · Tối thứ Sáu · Phòng khám đã đóng cửa" — sets the clock on the scene. */
function WhenChip({
  when,
  tone,
}: {
  when: { icon: IconName; time: string; context: string[] }
  tone: 'night' | 'warm'
}) {
  return (
    <div className={styles.whenRow}>
      <span className={`${styles.chip} ${tone === 'warm' ? styles.chipWarm : ''}`}>
        <Icon name={when.icon} size={15} className={styles.chipIcon} />
        <span className={styles.num}>{when.time}</span>
        {when.context.map((item) => (
          <Fragment key={item}>
            <span className={styles.chipDot} aria-hidden="true">
              ·
            </span>
            <span>{item}</span>
          </Fragment>
        ))}
      </span>
    </div>
  )
}

export function SignUpPanel() {
  return (
    <>
      <a className={styles.brand} href={hrefFor('landing')} aria-label="Về trang chủ Fonnus">
        <Logo variant="mark-dark" height={40} />
      </a>

      <div className={styles.scene}>
        <div className={styles.rise} style={{ animationDelay: '0ms' }}>
          <WhenChip when={SIGNUP_PANEL.when} tone="night" />
        </div>

        {SIGNUP_PANEL.lines.map((line, i) => {
          const fromCaller = line.who === 'caller'
          return (
            <div
              key={i}
              className={`${styles.rise} ${styles.turn} ${fromCaller ? styles.turnCaller : ''}`}
              style={{ animationDelay: `${140 * (i + 1)}ms` }}
            >
              {fromCaller ? (
                <span className={styles.callerAvatar} aria-hidden="true">
                  <Icon name="incoming" size={16} />
                </span>
              ) : (
                <span className={styles.orbAvatar} aria-hidden="true" />
              )}

              <div className={styles.turnBody}>
                {/* Only the opening line is attributed; repeating it every turn
                    turns a conversation into a table. */}
                {i === 0 ? (
                  <span className={styles.who}>
                    Khách gọi · <span className={styles.num}>{SIGNUP_PANEL.caller}</span>
                  </span>
                ) : i === 1 ? (
                  <span className={styles.who}>Fonnus</span>
                ) : null}

                <p className={`${styles.bubble} ${fromCaller ? styles.bubbleCaller : styles.bubbleFonnus}`}>
                  <Says says={line.says} />
                </p>
              </div>
            </div>
          )
        })}

        <div className={styles.rise} style={{ animationDelay: '560ms' }}>
          <div className={styles.outcomeRow}>
            <span className={styles.outcome}>
              <span className={styles.tick} aria-hidden="true">
                ✓
              </span>
              <span>
                <Says says={SIGNUP_PANEL.outcome} />
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <h2 className={styles.headline}>{SIGNUP_PANEL.headline}</h2>
        <figure className={styles.quoteBlock}>
          <blockquote className={styles.quote}>{SIGNUP_PANEL.quote}</blockquote>
          <figcaption className={styles.attribution}>{SIGNUP_PANEL.attribution}</figcaption>
        </figure>
      </div>
    </>
  )
}

export function SignInPanel() {
  return (
    <>
      <a className={styles.brand} href={hrefFor('landing')} aria-label="Về trang chủ Fonnus">
        <Logo variant="horizontal" height={30} />
      </a>

      <div className={styles.scene}>
        <div className={styles.rise} style={{ animationDelay: '0ms' }}>
          <WhenChip when={SIGNIN_PANEL.when} tone="warm" />
        </div>

        <div className={`${styles.rise} ${styles.card}`} style={{ animationDelay: '140ms' }}>
          <div className={styles.cardHead}>
            <span className={styles.eyebrow}>{SIGNIN_PANEL.logLabel}</span>
            <span className={styles.cardCount}>
              <span className={styles.num}>{SIGNIN_PANEL.logCount.num}</span>{' '}
              {SIGNIN_PANEL.logCount.label}
            </span>
          </div>

          {SIGNIN_PANEL.calls.map((call) => (
            <div key={call.number} className={styles.logRow}>
              <span className={styles.logIcon} aria-hidden="true">
                <Icon name="incoming" size={16} />
              </span>
              <span className={styles.logText}>
                <span className={`${styles.logNumber} ${styles.num}`}>{call.number}</span>
                <span className={styles.logMeta}>{call.meta}</span>
              </span>
              <span className={`${styles.tag} ${call.booked ? styles.tagBooked : ''}`}>
                {call.outcome}
              </span>
            </div>
          ))}
        </div>

        <div className={`${styles.rise} ${styles.tiles}`} style={{ animationDelay: '280ms' }}>
          {SIGNIN_PANEL.tiles.map((tile) => (
            <div key={tile.label} className={styles.tile}>
              <Icon name={tile.icon} size={18} className={styles.tileIcon} />
              <span>
                <b className={styles.num}>{tile.num}</b> {tile.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.foot}>
        <h2 className={`${styles.headline} ${styles.headlineWarm}`}>{SIGNIN_PANEL.headline}</h2>
        <p className={styles.lede}>{SIGNIN_PANEL.lede}</p>
      </div>
    </>
  )
}
