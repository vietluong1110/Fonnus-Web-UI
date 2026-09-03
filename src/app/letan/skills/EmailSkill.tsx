import { useRef, useState } from 'react'
import { Badge, Button } from '../../../design-system'
import { isValidEmail } from '../../../auth/phone'
import { LABELS } from '../defaults'
import type { EmailIntent, EmailRule } from '../model'
import { useConfig, useDraft } from '../store'
import { Card, ChipButton, ChipInput, Notice, SaveBar, Switch, TextArea, TextField, ui, useToast } from '../../ui'
import styles from './Skills.module.css'

/*
 * [ext] Gửi email — not in catalogue v1. One rule per call intent: when it
 * fires, who receives it, and the template. Variables are «guillemet» tokens
 * the mailer fills in; the chips insert them at the caret.
 */

const KEYS = ['email_rules'] as const

const INTENT_META: Record<EmailIntent, { tone: 'terracotta' | 'lemongrass' | 'neutral'; desc: (agent: string) => string; vars: string[] }> = {
  needs_review: { tone: 'terracotta', desc: (a) => `Cuộc gọi ${a} chưa trả lời được`, vars: ['tên_khách', 'số_gọi', 'giờ_gọi', 'tóm_tắt', 'liên_kết'] },
  new_booking: { tone: 'lemongrass', desc: (a) => `${a} vừa đặt hẹn cho khách`, vars: ['tên_khách', 'số_gọi', 'dịch_vụ', 'giờ_hẹn', 'tóm_tắt', 'liên_kết'] },
  missed_after_hours: { tone: 'neutral', desc: () => 'Khách gọi ngoài giờ, cần gọi lại', vars: ['tên_khách', 'số_gọi', 'giờ_gọi', 'hẹn_gọi_lại', 'tóm_tắt', 'liên_kết'] },
}

const INTENTS: EmailIntent[] = ['needs_review', 'new_booking', 'missed_after_hours']

export function EmailSkill() {
  const { config } = useConfig()
  const { toast } = useToast()
  const d = useDraft(KEYS, 'Kỹ năng gửi email')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const [intent, setIntent] = useState<EmailIntent>('needs_review')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const rule = draft.email_rules.find((r) => r.intent === intent) ?? draft.email_rules[0]
  const setRule = (i: EmailIntent, patch: Partial<EmailRule>) => set('email_rules', draft.email_rules.map((r) => (r.intent === i ? { ...r, ...patch } : r)))

  const insertVar = (v: string) => {
    const token = `«${v}»`
    const el = bodyRef.current
    if (!el) return setRule(intent, { body: rule.body + token })
    const start = el.selectionStart ?? rule.body.length
    const end = el.selectionEnd ?? start
    const body = rule.body.slice(0, start) + token + rule.body.slice(end)
    setRule(intent, { body })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const anyOn = draft.email_rules.some((r) => r.enabled && r.recipients.length)

  return (
    <>
      <Card title="Khi nào gửi email?" gate="O">
        {draft.email_rules.map((r) => {
          const m = INTENT_META[r.intent]
          return (
            <div key={r.intent} className={styles.intentRow}>
              <Badge tone={m.tone} style={{ minWidth: 110, justifyContent: 'center' }}>
                {LABELS.emailIntent[r.intent]}
              </Badge>
              <div className={styles.intentDesc}>
                <span>{m.desc(agent)}</span>
                <span className={styles.intentMeta}>
                  {r.recipients.length ? `→ ${r.recipients.join(', ')}` : 'chưa có người nhận'} · mẫu: {LABELS.emailIntent[r.intent]}
                </span>
              </div>
              <button type="button" className={ui.linkButton} onClick={() => setIntent(r.intent)}>
                Sửa mẫu
              </button>
              <Switch checked={r.enabled} onChange={(v) => setRule(r.intent, { enabled: v })} ariaLabel={`Gửi email ${LABELS.emailIntent[r.intent]}`} />
            </div>
          )
        })}
        {!anyOn ? (
          <Notice tone="warm" icon="mail">
            Chưa có email nào được gửi: bật ít nhất một loại và thêm người nhận ở mẫu bên dưới. Email là cách duy nhất bạn biết một cuộc gọi cần xem lại mà không mở ứng dụng.
          </Notice>
        ) : null}
      </Card>

      <Card title="Mẫu email theo ý định">
        <div className={ui.row}>
          {INTENTS.map((i) => (
            <ChipButton key={i} selected={i === intent} onClick={() => setIntent(i)}>
              {LABELS.emailIntent[i]}
            </ChipButton>
          ))}
        </div>
        <span className={ui.hint}>Mỗi ý định gửi một mẫu riêng — chọn ý định phía trên để sửa mẫu tương ứng. Bật/tắt ở thẻ trên.</span>

        <div className={ui.stackTight}>
          <span className={ui.labelMuted}>Người nhận</span>
          <ChipInput
            value={rule.recipients}
            onChange={(v) => setRule(intent, { recipients: v })}
            placeholder="email@phongkham.vn"
            addLabel="+ Thêm email"
            validate={(raw) => (isValidEmail(raw) ? null : 'Email chưa đúng dạng.')}
            emptyText="Chưa có người nhận."
          />
        </div>

        <TextField label="Tiêu đề" value={rule.subject} onChange={(e) => setRule(intent, { subject: e.target.value })} maxLength={120} />
        <TextArea ref={bodyRef} label="Nội dung" value={rule.body} onChange={(e) => setRule(intent, { body: e.target.value })} rows={5} maxLength={1200} />
        <div className={ui.row}>
          <span className={ui.hint}>Bấm để chèn biến:</span>
          {INTENT_META[intent].vars.map((v) => (
            <button key={v} type="button" className={styles.varChip} onClick={() => insertVar(v)}>
              «{v}»
            </button>
          ))}
        </div>
        <div className={ui.row}>
          <Button variant="ghost" size="sm" onClick={() => toast(`Đã gửi email thử "${rule.subject}" tới ${rule.recipients[0] ?? 'bạn'}.`, 'neutral')} disabled={!rule.recipients.length}>
            Gửi email thử cho tôi
          </Button>
          <span className={ui.hint}>Email thử dùng dữ liệu mẫu — không có cuộc gọi thật nào được gửi đi.</span>
        </div>
      </Card>

      <SaveBar {...d.bar} sub={`${draft.email_rules.filter((r) => r.enabled).length}/3 loại đang bật`} />
    </>
  )
}
