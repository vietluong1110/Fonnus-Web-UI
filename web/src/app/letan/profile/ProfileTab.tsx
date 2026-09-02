import { Button, Icon } from '../../../design-system'
import { LABELS } from '../defaults'
import type { PersonalityStyle, SpeakingSpeed, VoiceId } from '../model'
import { useConfig, useDraft } from '../store'
import { GREETING_COMPLIANCE_BLOCK, MAX_CALL_DURATION_SECONDS, RECORDING_RETENTION_DAYS, VERBOSITY_CAP_SENTENCES } from '../system'
import {
  Card,
  ChipButton,
  Disclosure,
  GateTag,
  Notice,
  PlayButton,
  RadioGroup,
  SaveBar,
  Segmented,
  SelectField,
  Slider,
  SpeechBubble,
  Switch,
  TextArea,
  TextField,
  ui,
  useToast,
} from '../../ui'
import styles from './ProfileTab.module.css'

const KEYS = [
  'agent_name',
  'voice_selection',
  'voice_accent',
  'speaking_speed',
  'personality_style',
  'secondary_language',
  'greeting_script_custom',
  'greeting_by_daypart',
  'tenant_instructions',
  'endpointing_silence_ms',
  'silence_nudge_enabled',
  'silence_nudge_delay_seconds',
  'silence_nudge_script',
  'end_call_after_silence_enabled',
  'end_call_after_n_nudges',
  'call_closing_script',
] as const

const INSTRUCTION_IDEAS = [
  'Luôn gợi ý khách đặt lịch tư vấn miễn phí.',
  'Khách hỏi giá niềng răng: mời đến khám để bác sĩ tư vấn chính xác.',
  'Xưng "em", gọi khách là "anh/chị", không dùng "quý khách".',
  'Khách hỏi bác sĩ nào giỏi nhất: nói tất cả bác sĩ đều được đào tạo bài bản, không so sánh.',
]

export function defaultGreeting(business: string, agent: string): string {
  return `${business} xin nghe. Em là ${agent}, trợ lý AI của phòng khám. Anh chị cần đặt lịch hay hỏi thông tin ạ?`
}

export function ProfileTab() {
  const { config } = useConfig()
  const { toast } = useToast()
  const d = useDraft(KEYS, 'Hồ sơ lễ tân')
  const { draft, set } = d
  const agent = draft.agent_name.trim() || 'Linh'
  const intro = defaultGreeting(config.business_name, agent)
  const greeting = draft.greeting_script_custom.trim() || intro
  const voice = LABELS.voices[draft.voice_selection]

  const pickVoice = (id: VoiceId) => {
    set('voice_selection', id)
    set('voice_accent', LABELS.voices[id].accent)
  }

  return (
    <>
      <div className={styles.grid}>
        <Card title="Tên và lời giới thiệu">
          <TextField
            label="Tên lễ tân"
            value={draft.agent_name}
            onChange={(e) => set('agent_name', e.target.value)}
            hint="Dùng khi tự giới thiệu trong mọi cuộc gọi, và là tên bạn thấy khắp ứng dụng."
            maxLength={24}
          />
          <SpeechBubble speak who={`${agent} nói`} text={`${GREETING_COMPLIANCE_BLOCK} ${greeting}`}>
            {greeting}
          </SpeechBubble>
          <span className={ui.hint}>
            Câu này nối sau phần công bố AI bắt buộc (xem thẻ Lời chào). Bấm ▸ để nghe cả hai.
          </span>
        </Card>

        <Card title="Giọng nói" gate="R1">
          <div className={styles.voices} role="radiogroup" aria-label="Giọng nói">
            {(Object.keys(LABELS.voices) as VoiceId[]).map((id) => {
              const v = LABELS.voices[id]
              const on = draft.voice_selection === id
              return (
                <div key={id} className={`${styles.voice} ${on ? styles.voiceOn : ''}`}>
                  <button type="button" role="radio" aria-checked={on} className={styles.voiceButton} onClick={() => pickVoice(id)}>
                    <span className={styles.voiceName}>{v.name}</span>
                    <span className={styles.voiceDesc}>{v.desc}</span>
                  </button>
                  <PlayButton text={`Em là ${v.name}, trợ lý AI của ${config.business_name}. Anh chị cần đặt lịch hay hỏi thông tin ạ?`} label={`Nghe giọng ${v.name}`} />
                </div>
              )
            })}
          </div>
          <span className={ui.hint}>
            Giọng {voice.desc.toLowerCase()} — Fonnus chọn sẵn theo thành phố ({config.city}). Bạn đổi được bất cứ lúc nào.
          </span>

          <div className={styles.labelled}>
            <span className={ui.labelMuted}>Tốc độ nói</span>
            <Segmented<SpeakingSpeed>
              ariaLabel="Tốc độ nói"
              value={draft.speaking_speed}
              onChange={(v) => set('speaking_speed', v)}
              options={(['slow', 'normal', 'fast'] as SpeakingSpeed[]).map((v) => ({ value: v, label: LABELS.speed[v] }))}
            />
          </div>

          <div className={styles.labelled} style={{ alignItems: 'flex-start' }}>
            <span className={ui.labelMuted} style={{ paddingTop: 2 }}>
              Phong cách
            </span>
            <RadioGroup<PersonalityStyle>
              name="style"
              value={draft.personality_style}
              onChange={(v) => set('personality_style', v)}
              options={(['professional_warm', 'friendly', 'formal'] as PersonalityStyle[]).map((v) => ({ value: v, label: LABELS.style[v] }))}
            />
          </div>

          <Switch
            lined
            label="Khách nói tiếng Anh"
            hint={draft.secondary_language ? `${agent} chuyển sang tiếng Anh khi khách nói tiếng Anh.` : `Tắt: ${agent} xin lỗi khéo và chuyển máy cho nhân viên.`}
            checked={draft.secondary_language}
            onChange={(v) => set('secondary_language', v)}
          />
        </Card>

        <Card title="Lời chào">
          <div className={styles.compliance}>
            <span className={styles.complianceEyebrow}>
              <Icon name="lock" size={12} /> Bắt buộc theo luật
            </span>
            <span className={styles.complianceText}>“{GREETING_COMPLIANCE_BLOCK}”</span>
            <span className={ui.hint}>
              Phát trước lời chào, đã được rà soát pháp lý — không chỉnh sửa được. Ghi âm lưu {RECORDING_RETENTION_DAYS} ngày theo gói.
            </span>
          </div>

          <TextArea
            label="Lời chào của phòng khám"
            gate="O"
            value={draft.greeting_script_custom}
            onChange={(e) => set('greeting_script_custom', e.target.value)}
            placeholder={intro}
            hint={
              draft.greeting_script_custom.trim() ? (
                <button type="button" className={ui.linkButton} onClick={() => set('greeting_script_custom', '')}>
                  Dùng lại câu mặc định
                </button>
              ) : (
                'Để trống thì dùng câu mặc định ở trên. Viết như bạn nói với khách.'
              )
            }
            maxLength={280}
            rows={2}
          />

          <Switch
            label="Lời chào khác theo buổi"
            hint="Sáng, chiều và tối mỗi buổi một câu — tối nhắc khách là ngoài giờ khám."
            checked={draft.greeting_by_daypart.enabled}
            onChange={(v) => set('greeting_by_daypart', { ...draft.greeting_by_daypart, enabled: v })}
          />
          {draft.greeting_by_daypart.enabled ? (
            <div className={ui.stackTight}>
              {(
                [
                  ['morning', 'Sáng · trước 12:00', 'sun', `${config.business_name} xin chào buổi sáng. Em có thể giúp gì cho anh chị ạ?`],
                  ['afternoon', 'Chiều · 12:00 – 18:00', 'sunset', `${config.business_name} xin nghe. Em có thể giúp gì cho anh chị ạ?`],
                  ['evening', 'Tối · sau 18:00', 'moon', `${config.business_name} xin nghe. Ngoài giờ khám, em vẫn đặt lịch và ghi lời nhắn được ạ.`],
                ] as const
              ).map(([key, label, icon, example]) => (
                <div key={key} className={styles.daypart}>
                  <TextField
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name={icon} size={14} /> {label}
                      </span>
                    }
                    value={draft.greeting_by_daypart[key]}
                    placeholder={example}
                    onChange={(e) => set('greeting_by_daypart', { ...draft.greeting_by_daypart, [key]: e.target.value })}
                  />
                  <PlayButton text={draft.greeting_by_daypart[key] || example} />
                </div>
              ))}
            </div>
          ) : null}

          <div className={ui.kv}>
            <span className={ui.kvKey}>
              <GateTag gate="SW" /> Mỗi lượt nói
            </span>
            <span className={ui.kvVal}>
              Tối đa {VERBOSITY_CAP_SENTENCES} câu — {agent} trả lời ngắn để khách không phải chờ.
            </span>
          </div>
        </Card>

        <Card title="Chỉ dẫn riêng" gate="O">
          <span className={ui.hint}>Điều bạn muốn {agent} luôn làm hoặc tránh, viết tự nhiên. Mỗi ý một câu.</span>
          <TextArea
            value={draft.tenant_instructions}
            onChange={(e) => set('tenant_instructions', e.target.value)}
            placeholder={`Ví dụ: ${INSTRUCTION_IDEAS[0]}`}
            rows={5}
            maxLength={1500}
            aria-label="Chỉ dẫn riêng"
          />
          <div className={ui.row}>
            <span className={ui.small} style={{ color: 'var(--ink-soft)' }}>
              Gợi ý:
            </span>
            {INSTRUCTION_IDEAS.filter((i) => !draft.tenant_instructions.includes(i)).map((idea) => (
              <ChipButton
                key={idea}
                onClick={() => set('tenant_instructions', (draft.tenant_instructions.trim() ? draft.tenant_instructions.trimEnd() + '\n' : '') + idea)}
              >
                + {idea}
              </ChipButton>
            ))}
          </div>
          <Notice tone="neutral" icon="shield-check">
            Chỉ dẫn không thể thay đổi quy tắc an toàn, tuân thủ pháp lý và chuyển máy khẩn cấp. Nội dung được kiểm duyệt trước khi áp dụng.
          </Notice>
        </Card>

        <Card className={ui.span2}>
          <Disclosure
            title="Nhịp trò chuyện"
            subtitle="nâng cao — đã chỉnh sẵn cho khách Việt, chỉ sửa khi nghe thử thấy chưa tự nhiên"
            badge={<GateTag gate="O" />}
          >
            <div className={styles.pace}>
              <div className={ui.stackTight}>
                <span className={ui.label}>Chờ khách nói xong</span>
                <Slider
                  ariaLabel="Chờ khách nói xong"
                  min={300}
                  max={1500}
                  step={50}
                  value={draft.endpointing_silence_ms}
                  onChange={(v) => set('endpointing_silence_ms', v)}
                  format={(v) => `${(v / 1000).toFixed(2).replace('.', ',').replace(/0$/, '')} giây`}
                />
                <span className={ui.hint}>Ngắn hơn: đáp nhanh nhưng dễ chen lời khách. Dài hơn: từ tốn nhưng chậm. Khách Việt hay ngắt giữa câu — 0,7 giây là mức hợp.</span>
              </div>

              <div className={ui.stackTight}>
                <Switch label="Khi khách im lặng" checked={draft.silence_nudge_enabled} onChange={(v) => set('silence_nudge_enabled', v)} />
                <div className={ui.row}>
                  <span className={ui.hint}>Hỏi lại sau</span>
                  <SelectField
                    compact
                    aria-label="Số giây im lặng"
                    value={String(draft.silence_nudge_delay_seconds)}
                    onChange={(v) => set('silence_nudge_delay_seconds', Number(v))}
                    options={['5', '7', '10', '15'].map((s) => ({ value: s, label: `${s} giây` }))}
                    disabled={!draft.silence_nudge_enabled}
                    style={{ width: 110 }}
                  />
                  <span className={ui.hint}>im lặng</span>
                </div>
                <TextField
                  label="Câu hỏi lại"
                  value={draft.silence_nudge_script}
                  onChange={(e) => set('silence_nudge_script', e.target.value)}
                  disabled={!draft.silence_nudge_enabled}
                  suffix={<PlayButton text={draft.silence_nudge_script} />}
                />
              </div>

              <div className={ui.stackTight}>
                <Switch
                  label="Tự kết thúc khi không ai đáp"
                  checked={draft.end_call_after_silence_enabled}
                  onChange={(v) => set('end_call_after_silence_enabled', v)}
                />
                <div className={ui.row}>
                  <span className={ui.hint}>Sau</span>
                  <SelectField
                    compact
                    aria-label="Số lần hỏi lại"
                    value={String(draft.end_call_after_n_nudges)}
                    onChange={(v) => set('end_call_after_n_nudges', Number(v))}
                    options={['1', '2', '3'].map((s) => ({ value: s, label: `${s} lần hỏi` }))}
                    disabled={!draft.end_call_after_silence_enabled}
                    style={{ width: 110 }}
                  />
                  <span className={ui.hint}>không có tiếng trả lời</span>
                </div>
                <TextField
                  label="Câu chào trước khi ngắt máy"
                  value={draft.call_closing_script}
                  onChange={(e) => set('call_closing_script', e.target.value)}
                  disabled={!draft.end_call_after_silence_enabled}
                  suffix={<PlayButton text={draft.call_closing_script} />}
                />
              </div>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvKey}>
                <GateTag gate="SW" /> Cuộc gọi tối đa
              </span>
              <span className={ui.kvVal}>
                {MAX_CALL_DURATION_SECONDS / 60} phút — quy tắc hệ thống, tránh cuộc gọi kẹt tính phút vô hạn.
              </span>
            </div>
          </Disclosure>
        </Card>
      </div>

      <SaveBar dirty={d.dirty} saving={d.saving} onSave={d.save} onCancel={d.cancel} sub="Hồ sơ lễ tân · áp dụng cho cuộc gọi tiếp theo" />
      {!d.dirty ? (
        <div className={ui.row} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" icon={<Icon name="phone-call" size={16} />} onClick={() => toast('Gọi thử sẽ nối máy khi số Fonnus được cấp — xem mục Số điện thoại.', 'neutral')}>
            Gọi thử {agent}
          </Button>
        </div>
      ) : null}
    </>
  )
}
