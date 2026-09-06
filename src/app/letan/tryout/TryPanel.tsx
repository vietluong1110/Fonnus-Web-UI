import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from '../../../design-system'
import { MiniOrb } from '../../../components/orb/MiniOrb'
import { api, isCanceled, messageFor } from '../../../api'
import { LABELS } from '../defaults'
import { opening } from '../greeting'
import type { ReceptionistConfig } from '../model'
import { newId } from '../model'
import { usePlayer } from '../../ui/speak'
import { promptsFor } from './prompts'
import { useVoiceInput } from './useVoiceInput'
import styles from './TryPanel.module.css'

/*
 * "Nói chuyện thử với Linh" — the rail beside every Lễ tân form.
 *
 * A voice call, not a chat. The orb sleeps with a muted microphone on it;
 * press it and it wakes — lifts, loses the badge — and the receptionist
 * greets you the way she greets a caller, from the greeting on the left.
 * From there it is a conversation: the mic listens whenever she is not
 * speaking, what you say is transcribed and sent, her reply is spoken the
 * moment it lands, and the mic opens again. There is no transcript at all —
 * not hers, not yours. The stage shows the orb and one line of status, the
 * way a call has a voice and not a log; only a failed turn puts words under
 * the orb, because an error you cannot hear has to be read.
 *
 * She answers from the record *as it is on the left, unsaved edits included*
 * — that is what the panel is for. Typing does the same as speaking, for a
 * quiet room; the mic button mutes her ears, not her voice.
 *
 * Nothing here knows whether the reply came from a model or from the regex
 * receptionist in `api/receptionist.mock.ts`; both return one line and,
 * optionally, its audio. Without audio the line is voiced the way every
 * play button in the app is (`usePlayer`, over `previewTts`).
 */

export function TryPanel({ section, config }: { section: string; config: ReceptionistConfig }) {
  const agent = config.agent_name.trim() || 'Linh'
  const voice = LABELS.voices[config.voice_selection]
  const open = opening(config)
  const prompts = promptsFor(section, config)

  const [live, setLive] = useState(false)
  const [muted, setMuted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  /** The Vietnamese message for a failed turn — the one thing ever written under the orb. */
  const [failure, setFailure] = useState<string | null>(null)

  const player = usePlayer({ voice: config.voice_selection, speed: config.speaking_speed })
  const history = useRef<{ role: 'caller' | 'agent'; text: string }[]>([])
  const inFlight = useRef<AbortController | null>(null)
  // Readable from the reply callback without making every keystroke a new callback.
  const configRef = useRef(config)
  configRef.current = config

  const speak = (id: string, line: string) => {
    setFailure(null)
    player.play(id, line)
  }

  const send = (raw: string) => {
    const line = raw.trim()
    if (!line || busy) return
    if (!live) setLive(true)
    setText('')
    setBusy(true)
    player.stop()
    mic.stop()

    const before = history.current.slice()
    inFlight.current?.abort()
    const ac = new AbortController()
    inFlight.current = ac

    api.receptionist
      .reply({ text: line, history: before, section, config: configRef.current }, { signal: ac.signal })
      .then((r) => {
        history.current = [...before, { role: 'caller', text: line }, { role: 'agent', text: r.text }]
        speak(newId('a'), r.text)
      })
      .catch((e: unknown) => {
        if (isCanceled(e)) return
        setFailure(messageFor(e))
      })
      .finally(() => {
        if (inFlight.current === ac) {
          inFlight.current = null
          setBusy(false)
        }
      })
  }

  const mic = useVoiceInput({ onFinal: (line) => send(line) })

  const wake = () => {
    setLive(true)
    speak('opening', open.greeting)
  }

  const hangUp = () => {
    inFlight.current?.abort()
    inFlight.current = null
    mic.stop()
    player.stop()
    history.current = []
    setLive(false)
    setBusy(false)
    setFailure(null)
  }

  /*
   * The turn-taking: whenever the call is live, nobody is speaking and the
   * mic is not muted, listen. Not while she talks — on a laptop the mic would
   * hear the speakers and she would answer herself.
   */
  const speaking = player.playingId !== null
  useEffect(() => {
    if (!live || muted || busy || speaking || mic.listening || !mic.supported) return
    const t = window.setTimeout(() => mic.start(), 250)
    return () => window.clearTimeout(t)
  }, [live, muted, busy, speaking, mic.listening, mic.supported, mic.start])

  useEffect(() => {
    if (muted) mic.stop()
  }, [muted, mic.stop])

  useEffect(() => () => inFlight.current?.abort(), [])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      send(text)
    }
  }

  const status = !live
    ? `Bấm vào ${agent} để bắt đầu`
    : mic.error
      ? mic.error
      : busy
        ? `${agent} đang trả lời…`
        : speaking
          ? `${agent} đang nói`
          : !mic.supported
            ? 'Trình duyệt này chưa nhận giọng nói — gõ câu hỏi bên dưới'
            : muted
              ? 'Micro đang tắt — gõ câu hỏi bên dưới'
              : mic.listening
                ? 'Đang nghe'
                : 'Sẵn sàng'

  const micOn = live && !muted && mic.supported

  return (
    <section className={styles.panel} aria-label={`Nói chuyện thử với ${agent}`}>
      <div className={styles.head}>
        <span className={styles.headText}>
          <span className={styles.title}>Nói chuyện thử với {agent}</span>
          <span className={styles.meta}>
            {voice.desc}, {voice.tone} · trả lời theo thông tin bên trái, kể cả phần chưa lưu
          </span>
        </span>
        {live ? (
          <button type="button" className={styles.end} onClick={hangUp}>
            Kết thúc
          </button>
        ) : null}
      </div>

      <div className={styles.stage}>
        <button
          type="button"
          className={`${styles.orb} ${live ? styles.orbLive : ''} ${micOn && mic.listening ? styles.orbListening : ''} ${speaking ? styles.orbSpeaking : ''}`}
          onClick={live ? hangUp : wake}
          aria-pressed={live}
          aria-label={live ? `Kết thúc cuộc gọi thử với ${agent}` : `Bắt đầu nói chuyện với ${agent}`}
        >
          <MiniOrb size={128} />
          {!live ? (
            <span className={styles.badge} aria-hidden="true">
              <Icon name="voice-off" size={16} />
            </span>
          ) : null}
        </button>

        <span className={`${styles.status} ${mic.error ? styles.statusError : ''}`} aria-live="polite">
          {status}
        </span>

        {live && failure ? (
          <p className={styles.failure} aria-live="polite">
            {failure}
          </p>
        ) : null}
      </div>

      <div className={styles.prompts}>
        <span className={styles.promptsLabel}>Thử hỏi</span>
        {/* Keyed by position, not by label: on Câu hỏi the prompts *are* the
            clinic's own questions, and nothing stops an owner from writing the
            same one twice. */}
        {prompts.map((p, i) => (
          <button key={i} type="button" className={styles.prompt} onClick={() => send(p.text ?? p.label)}>
            <span className={styles.promptText}>{p.text ? p.label : `“${p.label}”`}</span>
            <span className={styles.promptGo} aria-hidden="true">
              <Icon name="arrow-up" size={14} />
            </span>
          </button>
        ))}
      </div>

      <div className={styles.composer}>
        <input
          className={styles.input}
          value={text}
          placeholder={`Hoặc gõ cho ${agent}…`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={`Gõ cho ${agent}`}
        />
        <button
          type="button"
          className={micOn ? styles.micOn : styles.mic}
          disabled={!mic.supported}
          aria-pressed={micOn}
          aria-label={!live ? 'Bắt đầu và bật micro' : muted ? 'Bật micro' : 'Tắt micro'}
          title={mic.supported ? (!live ? 'Bắt đầu và bật micro' : muted ? 'Bật micro' : 'Tắt micro') : 'Trình duyệt này chưa nhận giọng nói'}
          onClick={() => {
            if (!live) {
              setMuted(false)
              wake()
              return
            }
            setMuted((m) => !m)
          }}
        >
          <Icon name={micOn ? 'voice' : 'voice-off'} size={17} />
        </button>
        <button type="button" className={styles.send} disabled={busy || !text.trim()} onClick={() => send(text)} aria-label="Gửi">
          <Icon name="arrow-up" size={16} />
        </button>
      </div>
    </section>
  )
}
