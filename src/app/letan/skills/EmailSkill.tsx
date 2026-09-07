import { useEffect, useState } from 'react'
import { Button } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { isValidEmail } from '../../../auth/phone'
import { LABELS } from '../defaults'
import type { EmailIntent, EmailRule } from '../model'
import { useConfig, useDraft } from '../store'
import {
  Card,
  ChipInput,
  Disclosure,
  ExpandRow,
  FOLD_MS,
  RowEdit,
  RowEditFoot,
  RowEditLabel,
  RowList,
  RowMark,
  RowMeta,
  RowMissing,
  RowSwitch,
  RowText,
  RowValue,
  SaveBar,
  TokenArea,
  ui,
  useToast,
} from '../../ui'
import { TryPanel } from '../tryout/TryPanel'
import { SkillsSection } from './SkillsSection'
import { INTENT_ASKS, VAR_LABELS, emailSummary, emailVars, fill, filled } from './lines'
import styles from './Skills.module.css'

/*
 * [ext] Gửi email — not in catalogue v1. One rule per call intent: when it
 * fires, who receives it, and the wording.
 *
 * A variable is stored as a «guillemet» token because that is what the mailer
 * fills in, and it is never shown as one: the envelope tints it, and the
 * editor draws it as a pill carrying the words an owner would use. See
 * `VAR_LABELS` in `lines.ts` and `TokenArea` in `app/ui`.
 */

const KEYS = ['email_rules'] as const

const INTENT_ICON: Record<EmailIntent, IconName> = {
  needs_review: 'alert',
  new_booking: 'appointment',
  missed_after_hours: 'caller-lost',
}

const INTENT_VARS: Record<EmailIntent, string[]> = {
  needs_review: ['tên_khách', 'số_gọi', 'giờ_gọi', 'tóm_tắt', 'liên_kết'],
  new_booking: ['tên_khách', 'số_gọi', 'dịch_vụ', 'giờ_hẹn', 'tóm_tắt', 'liên_kết'],
  missed_after_hours: ['tên_khách', 'số_gọi', 'giờ_gọi', 'hẹn_gọi_lại', 'tóm_tắt', 'liên_kết'],
}

/**
 * The email as it lands, not the template that makes it.
 *
 * This is the `Said` line of a page whose output is not a sentence. Every
 * other screen ends in the words a caller would hear; here the thing produced
 * is a message in somebody's inbox, so that is what is shown — addressed,
 * with a subject, filled in with one worked call. The parts that change from
 * call to call are tinted, which is the entire explanation of what a variable
 * is; the row of «tên_khách» chips underneath used to be that explanation,
 * and it asked an owner to hold a token vocabulary in their head to read
 * their own email.
 */
function Envelope({ rule, to }: { rule: EmailRule; to: string[] }) {
  const runs = fill(rule.body)
  return (
    <div className={styles.mail}>
      <div className={styles.mailTo}>
        <span className={styles.mailToLabel}>Tới</span>
        {to.length ? to.join(', ') : <span className={styles.mailNobody}>chưa có người nhận</span>}
      </div>
      <div className={styles.mailSubject}>
        {fill(rule.subject).map((r, i) => (
          <span key={i} className={r.variable ? styles.mailVar : undefined} title={r.variable ? VAR_LABELS[r.variable] : undefined}>
            {r.text}
          </span>
        ))}
      </div>
      <div className={styles.mailBody}>
        {runs.map((r, i) => (
          <span key={i} className={r.variable ? styles.mailVar : undefined} title={r.variable ? VAR_LABELS[r.variable] : undefined}>
            {r.text}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * `#/app/le-tan/ky-nang/gui-email` — how the clinic finds out what happened
 * on the phone while nobody was watching.
 *
 * Three things worth an email, one row each: she could not answer, she held a
 * slot, somebody rang after hours. Closed, a row says who it reaches; open, it
 * is who and *what arrives* — the message drawn as it lands in the inbox,
 * filled in with one worked call, the changing parts tinted.
 *
 * The wording is Fonnus's, and that is the point. The page used to be two
 * cards — a list of switches, then a second card with a chip picker choosing
 * which of the same three to edit — asking a clinic owner to author three
 * email templates with «guillemet» tokens inserted at the caret. That is a
 * copywriting job handed to somebody who wanted a notification. So the mail is
 * written, the owner picks who gets it, and "Sửa lời" is one press away for
 * the clinics that want their own subject line.
 */
export function EmailSkill() {
  const { config } = useConfig()
  const { toast } = useToast()
  const d = useDraft(KEYS, 'Báo về hộp thư')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const rules = draft.email_rules

  /*
   * One open row, the same way the price list and the roster hold one:
   * `closingId` keeps the row that just closed mounted for a fold so it can
   * animate shut.
   */
  const [openId, setOpenId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  useEffect(() => {
    if (!closingId) return
    const t = window.setTimeout(() => setClosingId(null), FOLD_MS)
    return () => window.clearTimeout(t)
  }, [closingId])
  const close = (id: string) => {
    if (openId === id) {
      setClosingId(id)
      setOpenId(null)
    }
  }
  const toggle = (id: string) => {
    if (openId === id) return close(id)
    if (openId) setClosingId(openId)
    setOpenId(id)
  }

  // A press outside the open row shuts it; the save bar is the only "done".
  useEffect(() => {
    if (!openId) return
    const onPress = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Element) || t.closest('[data-popup]')) return
      if (document.querySelector(`[data-row-id="${CSS.escape(openId)}"]`)?.contains(t)) return
      close(openId)
    }
    document.addEventListener('pointerdown', onPress, true)
    return () => document.removeEventListener('pointerdown', onPress, true)
    // `close` is rebuilt every render; the effect only needs the one for this `openId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const setRule = (i: EmailIntent, patch: Partial<EmailRule>) => set('email_rules', rules.map((r) => (r.intent === i ? { ...r, ...patch } : r)))

  const on = rules.filter((r) => r.enabled && r.recipients.length).length

  return (
    <SkillsSection
      title="Báo về hộp thư"
      lede={`${agent} nghe máy cả lúc không ai ở phòng khám. Ba việc đáng để bạn biết ngay — mỗi việc một email, gửi tới đúng người, viết sẵn.`}
      rail={<TryPanel section="gui-email" config={live} />}
      bar={<SaveBar {...d.bar} sub={on ? `${on}/${rules.length} loại đang gửi · áp dụng cho cuộc gọi tiếp theo` : `Chưa loại nào được gửi — ${agent} vẫn nghe máy, chỉ là không ai được báo`} />}
    >
      <Card title="Việc đáng báo" subtitle={emailSummary(rules, agent)}>
        <RowList>
          {rules.map((r) => {
            const to = r.recipients
            const live_ = r.enabled && to.length > 0
            return (
              <ExpandRow
                key={r.intent}
                rowId={r.intent}
                open={openId === r.intent}
                mounted={openId === r.intent || closingId === r.intent}
                unfilled={r.enabled && !to.length}
                onToggle={() => toggle(r.intent)}
                summary={
                  <>
                    <RowText name={LABELS.emailIntent[r.intent]} sub={INTENT_ASKS[r.intent](agent)} />
                    <RowValue>
                      {live_ ? to.join(', ') : r.enabled ? <RowMissing>chưa có người nhận</RowMissing> : <RowMissing>đang tắt</RowMissing>}
                    </RowValue>
                    <RowMeta tight>
                      <RowMark name={live_ ? INTENT_ICON[r.intent] : null} title={live_ ? `Đang gửi tới ${to.join(', ')}` : 'Chưa gửi'} />
                    </RowMeta>
                  </>
                }
              >
                <RowEdit>
                  <RowSwitch
                    checked={r.enabled}
                    onChange={(v) => setRule(r.intent, { enabled: v })}
                    ariaLabel={`Gửi email ${LABELS.emailIntent[r.intent]}`}
                    label={`Gửi email khi ${INTENT_ASKS[r.intent](agent)}`}
                    hint={r.enabled ? 'Gửi ngay khi cuộc gọi kết thúc.' : 'Việc này vẫn được ghi lại trong Cuộc gọi, chỉ là không ai được báo.'}
                  />

                  <div className={ui.stackTight}>
                    <RowEditLabel>Người nhận</RowEditLabel>
                    <ChipInput
                      boxed
                      value={to}
                      onChange={(v) => setRule(r.intent, { recipients: v })}
                      placeholder={to.length ? 'Thêm email…' : 'VD: chi.lan@nhakhoa.vn'}
                      validate={(raw) => (isValidEmail(raw) ? null : 'Email chưa đúng dạng.')}
                    />
                  </div>

                  <div className={ui.stackTight}>
                    <RowEditLabel>Email sẽ trông như thế này</RowEditLabel>
                    <Envelope rule={r} to={to} />
                  </div>

                  {/* The wording is Fonnus's by default. It opens for the
                      clinics that want their own, and stays shut for the ones
                      that never think about it — which is most of them. */}
                  <Disclosure title="Sửa lời" subtitle="phần tô màu là thông tin của từng cuộc gọi">
                    <div className={ui.stack}>
                      <TokenArea
                        singleLine
                        label="Tiêu đề"
                        value={r.subject}
                        onChange={(v) => setRule(r.intent, { subject: v })}
                        vars={emailVars(INTENT_VARS[r.intent])}
                        maxLength={120}
                      />
                      <TokenArea
                        label="Nội dung"
                        value={r.body}
                        onChange={(v) => setRule(r.intent, { body: v })}
                        vars={emailVars(INTENT_VARS[r.intent])}
                        rows={5}
                        maxLength={1200}
                        inserts
                      />
                    </div>
                  </Disclosure>

                  <RowEditFoot>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!to.length}
                      onClick={() => toast(`Đã gửi thử "${filled(r.subject)}" tới ${to[0]}.`, 'neutral')}
                    >
                      Gửi thử cho tôi
                    </Button>
                  </RowEditFoot>
                </RowEdit>
              </ExpandRow>
            )
          })}
        </RowList>
      </Card>
    </SkillsSection>
  )
}
