import type { RefObject } from 'react'
import { Icon, Pattern } from '../../design-system'
import { CHIPS, VOICES } from '../../data/callDemo'
import type { CallDemo } from '../../hooks/useCallDemo'
import styles from './CallOverlay.module.css'

interface CallOverlayProps {
  demo: CallDemo
  /** Empty slot the orb flies to; owned by useOrbPlacement. */
  spotRef: RefObject<HTMLDivElement | null>
}

export function CallOverlay({ demo, spotRef }: CallOverlayProps) {
  return (
    <>
      <div className={styles.screen}>
        {/* Same treatment as the hero: Chấm nhịp behind the orb only. */}
        <Pattern name="dots" className={styles.dots} />
        <div className={styles.topBar}>
          <div className={styles.who}>
            <span className={styles.whoDot} />
            <span>Nha khoa Minh Anh · bản mô phỏng</span>
          </div>
          <button onClick={demo.closeCall} aria-label="Thoát cuộc gọi thử" className={styles.exit}>
            ✕
          </button>
        </div>

        <div className={styles.stage}>
          <div ref={spotRef} aria-hidden="true" className={styles.spot} />
          <div className={styles.state}>{demo.stateLabel}</div>
        </div>

        <div className={styles.controlsSpacer} />
      </div>

      <div className={styles.controls}>
        <div className={styles.chips}>
          {CHIPS.map((chip) => (
            <button key={chip.label} onClick={() => demo.ask(chip.label)} className={styles.chip}>
              {chip.label}
            </button>
          ))}
        </div>

        <div className={styles.composer}>
          <input
            placeholder="Gõ câu hỏi nếu bạn không muốn nói…"
            value={demo.typed}
            onChange={(e) => demo.setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                demo.send()
              }
            }}
            className={styles.input}
          />

          <button
            onClick={demo.toggleMic}
            aria-label="Bật tắt micro"
            aria-pressed={!demo.mic}
            className={demo.mic ? styles.idle : styles.active}
          >
            <Icon name={demo.mic ? 'voice' : 'voice-off'} size={18} />
          </button>

          <span className={styles.voiceAnchor}>
            <button
              onClick={demo.toggleVoices}
              aria-label="Chọn giọng nói của trợ lý"
              aria-expanded={demo.voiceOpen}
              className={demo.voiceOpen ? styles.active : styles.idle}
            >
              <Icon name="caller" size={18} />
            </button>
            {demo.voiceOpen ? <VoiceMenu demo={demo} /> : null}
          </span>

          <button onClick={demo.send} aria-label="Gửi" className={styles.send}>
            <Icon name="arrow-up" size={18} />
          </button>
        </div>

        <p className={styles.footnote}>Fonnus luôn trả lời bằng giọng nói. Bấm ✕ để thoát.</p>
      </div>
    </>
  )
}

function VoiceMenu({ demo }: { demo: CallDemo }) {
  return (
    <div className={styles.voiceMenu} role="listbox" aria-label="Giọng của trợ lý">
      <div className={styles.voiceMenuTitle}>Giọng của trợ lý</div>
      {VOICES.map((v, i) => {
        const selected = demo.voice === i
        return (
          <div
            key={v.name}
            role="option"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => demo.setVoice(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                demo.setVoice(i)
              }
            }}
            className={selected ? styles.voiceRowSelected : styles.voiceRow}
          >
            <span className={styles.voiceText}>
              <span className={styles.voiceName}>{v.name}</span>
              <span className={styles.voiceDesc}>{v.desc}</span>
            </span>
            {selected ? <span className={styles.voiceTick}>✓</span> : null}
            {/* Auditions the voice without selecting it. */}
            <button
              type="button"
              aria-label={`Nghe thử giọng ${v.name}`}
              onClick={(e) => {
                e.stopPropagation()
                demo.previewVoice()
              }}
              className={selected ? styles.voicePlaySelected : styles.voicePlay}
            >
              <Icon name="play" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
