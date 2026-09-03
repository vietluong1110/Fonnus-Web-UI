import { appHref } from '../../../hooks/useRoute'
import { LABELS } from '../defaults'
import type { PersonalityStyle, SpeakingSpeed, VoiceId } from '../model'
import { SectionHead } from '../LeTanPage'
import { useConfig, useDraft } from '../store'
import { Card, PlayButton, SaveBar, SelectField, Segmented, Switch, TextField, ui } from '../../ui'
import { ListenAll, PreviewCard, Turn, defaultGreeting } from './preview'
import { VoicePicker } from './VoicePicker'
import styles from './Profile.module.css'

const KEYS = [
  'voice_selection',
  'voice_accent',
  'speaking_speed',
  'personality_style',
  'endpointing_silence_ms',
  'silence_nudge_enabled',
  'silence_nudge_delay_seconds',
  'silence_nudge_script',
  'end_call_after_silence_enabled',
  'end_call_after_n_nudges',
  'call_closing_script',
] as const

/*
 * One line per style, so "Chuyên nghiệp và ấm áp" stops being an abstraction:
 * the owner hears the difference instead of guessing at it. Mid-call phrasing
 * on purpose — the greeting is previewed on the screen next door.
 */
const STYLE_SAMPLE: Record<PersonalityStyle, string> = {
  professional_warm: 'Dạ, em kiểm tra lịch giúp anh chị ngay ạ. Anh chị chờ em một chút nhé.',
  friendly: 'Dạ em xem lịch liền nha anh chị, chờ em xíu thôi ạ!',
  formal: 'Vâng, xin quý khách vui lòng chờ trong giây lát để tôi kiểm tra lịch hẹn.',
}

const SPEED_HINT: Record<SpeakingSpeed, string> = {
  slow: 'Chậm hơn một nhịp — hợp với khách lớn tuổi và đường truyền yếu.',
  normal: 'Tốc độ nói bình thường của người Việt. Hợp với hầu hết phòng khám.',
  fast: 'Gọn và nhanh, rút ngắn cuộc gọi — nhưng khách lớn tuổi dễ nghe không kịp.',
}

/** 700ms shows as "0,7 giây"; a whole second shows as "1 giây", not "1,0". */
function seconds(ms: number): string {
  return `${String(Math.round(ms / 10) / 100).replace('.', ',')} giây`
}

function pacing(ms: number): string {
  if (ms <= 500) return 'Linh đáp gần như tức thì, nhưng dễ chen lời khi khách ngập ngừng giữa câu.'
  if (ms >= 1100) return 'Linh chờ chắc chắn khách nói xong. Từ tốn, nhưng khách phải đợi lâu hơn.'
  return 'Khách Việt hay ngắt giữa câu để nghĩ, nên Linh chờ chừng này rồi mới đáp.'
}

/**
 * `#/app/le-tan/ho-so/giong-noi` — how the receptionist sounds, and the rhythm
 * she keeps.
 *
 * Turn-taking used to be a three-column band of toggles, selects and a slider
 * crammed under an accordion, next to two system-written rows the tenant could
 * not change. The system rows are gone — they were never the owner's business —
 * and what is left is three full-width blocks, each written as a sentence.
 */
export function VoiceSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Giọng nói và cách nói')
  const { draft, set } = d

  const agent = config.agent_name || 'Linh'
  const voice = LABELS.voices[draft.voice_selection]
  const audition = defaultGreeting(config.business_name, agent)

  const pickVoice = (id: VoiceId) => {
    set('voice_selection', id)
    // The accent is not a separate question — it is a property of the voice.
    set('voice_accent', LABELS.voices[id].accent)
  }

  return (
    <>
      <SectionHead title="Giọng nói và cách nói" backLabel="Hồ sơ" backHref={appHref('le-tan', 'ho-so')} />
      <p className={styles.lede}>
        Nghe thử rồi hãy chọn — giọng, tốc độ và phong cách ở đây đều bấm nghe được ngay.
      </p>

      <div className={styles.work}>
        <div className={styles.col}>
          <Card title="Giọng nói">
            <VoicePicker value={draft.voice_selection} onChange={pickVoice} sampleText={audition} />
            <span className={ui.hint}>
              Fonnus chọn sẵn giọng theo thành phố của phòng khám ({config.city}). Đổi lúc nào cũng được — mọi giọng đều nghe thử được ngay trong danh sách.
            </span>
          </Card>

          <Card title="Cách nói">
            <div className={ui.stackTight}>
              <span className={ui.label}>Tốc độ</span>
              <Segmented<SpeakingSpeed>
                ariaLabel="Tốc độ nói"
                value={draft.speaking_speed}
                onChange={(v) => set('speaking_speed', v)}
                options={(['slow', 'normal', 'fast'] as SpeakingSpeed[]).map((v) => ({ value: v, label: LABELS.speed[v] }))}
              />
              <span className={ui.hint}>{SPEED_HINT[draft.speaking_speed]}</span>
            </div>

            <div className={ui.divider} />

            <div className={ui.stackTight}>
              <span className={ui.label}>Phong cách — nghe thử từng kiểu rồi chọn</span>
              <div className={styles.tiles} role="radiogroup" aria-label="Phong cách">
                {(['professional_warm', 'friendly', 'formal'] as PersonalityStyle[]).map((v) => {
                  const on = draft.personality_style === v
                  return (
                    <div key={v} className={`${styles.tile} ${on ? styles.tileOn : ''}`}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={styles.tileButton}
                        onClick={() => set('personality_style', v)}
                      >
                        <span className={styles.tileName}>{LABELS.style[v]}</span>
                        <span className={styles.tileSample}>“{STYLE_SAMPLE[v]}”</span>
                      </button>
                      <PlayButton text={STYLE_SAMPLE[v]} label={`Nghe câu mẫu ${LABELS.style[v]}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card title="Nhịp trò chuyện" subtitle="nâng cao">
            <p className={ui.hint} style={{ margin: '-4px 0 2px' }}>
              Đã chỉnh sẵn cho khách Việt. Chỉ sửa nếu nghe thử thấy {agent} chen lời khách, hoặc bắt khách chờ lâu.
            </p>

            <div className={`${styles.paceBlock} ${styles.paceFirst}`}>
              <div className={styles.paceHead}>
                <span className={ui.label}>Chờ khách nói xong</span>
                <span className={styles.paceValue}>{seconds(draft.endpointing_silence_ms)}</span>
              </div>
              <input
                type="range"
                className={styles.range}
                min={300}
                max={1500}
                step={50}
                value={draft.endpointing_silence_ms}
                onChange={(e) => set('endpointing_silence_ms', Number(e.target.value))}
                aria-label="Chờ khách nói xong"
              />
              <div className={styles.rangeScale}>
                <span>Đáp nhanh</span>
                <span>Từ tốn</span>
              </div>
              <span className={ui.hint}>{pacing(draft.endpointing_silence_ms)}</span>
            </div>

            <div className={styles.paceBlock}>
              <Switch
                label="Hỏi lại khi khách im lặng"
                checked={draft.silence_nudge_enabled}
                onChange={(v) => set('silence_nudge_enabled', v)}
              />
              {draft.silence_nudge_enabled ? (
                <>
                  <div className={styles.sentence}>
                    <span>Khách im lặng</span>
                    <SelectField
                      compact
                      aria-label="Số giây im lặng"
                      value={String(draft.silence_nudge_delay_seconds)}
                      onChange={(v) => set('silence_nudge_delay_seconds', Number(v))}
                      options={['5', '7', '10', '15'].map((s) => ({ value: s, label: `${s} giây` }))}
                      style={{ width: 106 }}
                    />
                    <span>thì {agent} hỏi lại:</span>
                  </div>
                  <TextField
                    value={draft.silence_nudge_script}
                    onChange={(e) => set('silence_nudge_script', e.target.value)}
                    aria-label="Câu hỏi lại"
                    suffix={<PlayButton text={draft.silence_nudge_script} label="Nghe câu hỏi lại" />}
                  />
                </>
              ) : null}
            </div>

            <div className={styles.paceBlock}>
              <Switch
                label="Tự kết thúc khi không ai đáp"
                checked={draft.end_call_after_silence_enabled}
                onChange={(v) => set('end_call_after_silence_enabled', v)}
              />
              {draft.end_call_after_silence_enabled ? (
                <>
                  <div className={styles.sentence}>
                    <span>Hỏi lại</span>
                    <SelectField
                      compact
                      aria-label="Số lần hỏi lại"
                      value={String(draft.end_call_after_n_nudges)}
                      onChange={(v) => set('end_call_after_n_nudges', Number(v))}
                      options={['1', '2', '3'].map((s) => ({ value: s, label: `${s} lần` }))}
                      style={{ width: 100 }}
                    />
                    <span>mà vẫn im lặng thì {agent} chào rồi cúp máy:</span>
                  </div>
                  <TextField
                    value={draft.call_closing_script}
                    onChange={(e) => set('call_closing_script', e.target.value)}
                    aria-label="Câu chào trước khi ngắt máy"
                    suffix={<PlayButton text={draft.call_closing_script} label="Nghe câu chào cuối" />}
                  />
                </>
              ) : null}
            </div>
          </Card>
        </div>

        <aside className={styles.rail}>
          <PreviewCard title={agent} meta={`${voice.desc} · nói ${LABELS.speed[draft.speaking_speed].toLowerCase()}`}>
            <Turn label="Giữa cuộc gọi">“{STYLE_SAMPLE[draft.personality_style]}”</Turn>

            {draft.silence_nudge_enabled ? (
              <>
                <div className={ui.divider} />
                <Turn label="Khi khách im lặng" tone="caller">
                  <span className={ui.muted}>Khách không nói gì</span>
                </Turn>
                <span className={styles.turnSilence}>sau {draft.silence_nudge_delay_seconds} giây im lặng…</span>
                <Turn>“{draft.silence_nudge_script}”</Turn>
              </>
            ) : null}

            <ListenAll text={STYLE_SAMPLE[draft.personality_style]} label="Nghe câu mẫu" />
            <span className={ui.hint}>Mỗi thay đổi bên cạnh đổi ngay đoạn thoại này.</span>
          </PreviewCard>
        </aside>
      </div>

      <SaveBar {...d.bar} sub="Giọng nói và cách nói · áp dụng cho cuộc gọi tiếp theo" />
    </>
  )
}
