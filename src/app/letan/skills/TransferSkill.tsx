import { useEffect, useState } from 'react'
import { formatPhone, isValidPhone, normalizePhone } from '../../../auth/phone'
import { LABELS } from '../defaults'
import type { EscalationFallback, EscalationTarget, EscalationWindow } from '../model'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { EMERGENCY_RED_FLAGS_PACK, EMERGENCY_TRIGGER, TRANSFER_TRIGGERS, TRANSFER_TRIGGERS_MORE } from '../system'
import {
  AddButton,
  Card,
  ChipInput,
  DeleteButton,
  EmptyState,
  ExpandRow,
  FOLD_MS,
  RowEdit,
  RowEditFoot,
  RowEditLabel,
  RowEditRow,
  RowList,
  RowMark,
  RowMeta,
  RowMissing,
  RowText,
  RowValue,
  Said,
  SaveBar,
  Suggestion,
  SuggestionMore,
  Suggestions,
  TextField,
  Tile,
  TileGrid,
  rowStyles,
  ui,
  useAppear,
} from '../../ui'
import type { IconName } from '../../../design-system'
import { TryPanel } from '../tryout/TryPanel'
import { SkillsSection } from './SkillsSection'
import {
  agreeLine,
  derivedFromTargets,
  emergencyDoctor,
  fallbackLine,
  handoffTo,
  hasEmergencyNumber,
  hasHandoffNumber,
  targetLine,
  targetReady,
  transferWindowLine,
} from './lines'
import styles from './Skills.module.css'

const KEYS = ['escalation_targets', 'escalation_triggers_custom', 'after_hours_emergency_target', 'emergency_red_flags_custom'] as const

const phoneOk = (v: string) => {
  const d = normalizePhone(v)
  return isValidPhone(d) || /^0\d{9,10}$/.test(d)
}

/**
 * When this person may be rung, drawn. Each option is a stretch of the clock,
 * and the icon set already had the three: the closed ring for "always", the
 * clock for opening hours, the crescent for after them.
 */
const WINDOWS: { value: EscalationWindow; icon: IconName }[] = [
  { value: 'always', icon: 'always-on' },
  { value: 'business_hours', icon: 'hours' },
  { value: 'after_hours', icon: 'after-hours' },
]

/** The same three as a single mark in the row's right-hand column. */
const WINDOW_ICON: Record<EscalationWindow, IconName> = {
  always: 'always-on',
  business_hours: 'hours',
  after_hours: 'after-hours',
}

/** The number rang out. Two answers, and both of them are things she does. */
const FALLBACKS: { value: EscalationFallback; icon: IconName }[] = [
  { value: 'callback', icon: 'time-saved' },
  { value: 'handle', icon: 'assistant' },
]

function blank(): EscalationTarget {
  return {
    id: newId('esc'),
    phone: '',
    name: '',
    role: '',
    window: 'always',
    // The commonest reason to reach a person, so a new row means something
    // before a single field of it has been filled in.
    triggers: [TRANSFER_TRIGGERS[0]],
    fallback: 'callback',
  }
}

/**
 * `#/app/le-tan/ky-nang/chuyen-may` — the people she can fetch, and what
 * fetches each of them.
 *
 * **One list, one row per person.** The page used to be four cards — when may
 * she agree, when does she offer, what happens at 21:00, and a separate
 * emergency card with a second phone field — over a single shared list of
 * numbers. That shape could not answer the question every clinic actually
 * has, which is *this* person for the day and *that* one for the night: the
 * numbers were a ladder with no meaning attached to any rung, and the on-call
 * doctor was a phone number typed somewhere else for no reason a reader could
 * see.
 *
 * So a row carries everything about reaching one person. Closed, it reads as
 * the staff board it is — who, on what number, for what, and a mark for the
 * hours they are on. Open, it is four answers in the order a call meets them:
 * who they are, what makes her ring them, when she is allowed to, and what
 * she says when the phone rings out. Two of those four end in the sentence a
 * caller would actually hear, which is the only honest way to show what a
 * tile does.
 *
 * `Khẩn cấp y tế` is one of the triggers rather than a card, and the row that
 * takes it *is* the on-call doctor — `after_hours_emergency_target` is written
 * from it. The clinical red flags appear inside that row, where they qualify
 * something, instead of in a rose panel that made a form look like a warning.
 *
 * `Quy tắc an toàn` is gone. It was a read-only disclosure of four sentences
 * Fonnus writes, applies to every clinic and never lets a tenant change — a
 * page of legal boilerplate on a screen where the owner is answering
 * questions. It lives in `system.ts`, which is where the tenant already
 * cannot edit it.
 *
 * `Ngoài giờ, cuộc gọi thường` is gone too, and it is the more interesting
 * cut: it asked what she does with an ordinary 21:00 call, offering "ghi lời
 * nhắn", "hẹn gọi lại" and "thử nối máy". Every one of those is already what
 * happens. A row with `Ngoài giờ` on it *is* trying to connect somebody; a row
 * whose number rings out falls to its own `fallback`; and taking a message is
 * what she does when neither applies, because there is nothing else she could
 * do. A question whose every answer is the default is a question that only
 * teaches the reader the product has settings. The catalogue's
 * `after_hours_routine_behavior` went with it — see
 * `docs/field-catalogue-mapping.md`.
 *
 * What is left is one card, because the page is one question: who can she
 * fetch, and what fetches them.
 */
export function TransferSkill() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Chuyển máy cho người thật')
  const { draft, set, patch } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const targets = draft.escalation_targets

  /*
   * One open row, the same way the price list and the roster hold one:
   * `closingId` keeps the row that just closed mounted for a fold so it can
   * animate shut, and `fresh` is the rows added on this visit, whose number
   * takes focus.
   */
  const [openId, setOpenId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string[]>([])
  const [more, setMore] = useState<string | null>(null)
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
  const openRow = (id: string) => {
    if (openId && openId !== id) setClosingId(openId)
    setOpenId(id)
  }
  const toggle = (id: string) => (openId === id ? close(id) : openRow(id))

  // A press anywhere outside the open row shuts it — there is no "done"
  // button, the save bar is already up. A pop-up belongs to the row that
  // opened it, wherever the portal put it.
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

  const rows = useAppear(targets.map((t) => t.id))

  /**
   * Every write to the list goes through here, so the two catalogue columns
   * the rows now own — the flat trigger list and the on-call doctor — are
   * rewritten in the same commit. Through the updater form, because a delete
   * is deferred by the exit animation and two of them a frame apart would
   * otherwise each close over the same array.
   */
  const write = (fn: (prev: EscalationTarget[]) => EscalationTarget[]) =>
    patch((prev) => {
      const next = fn(prev.escalation_targets)
      return { escalation_targets: next, ...derivedFromTargets(next) }
    })

  const setTarget = (id: string, p: Partial<EscalationTarget>) => write((list) => list.map((t) => (t.id === id ? { ...t, ...p } : t)))
  const add = () => {
    const row = blank()
    write((list) => [...list, row])
    setFresh((f) => [...f, row.id])
    openRow(row.id)
  }
  const remove = (id: string) => {
    close(id)
    rows.leave(id, () => write((list) => list.filter((t) => t.id !== id)))
  }

  const ready = targets.filter(targetReady).length
  const canTransfer = hasHandoffNumber(live)
  const emergency = hasEmergencyNumber(live)

  return (
    <SkillsSection
      title="Chuyển máy cho người thật"
      lede={`Có câu ${agent} không nên trả lời, và có lúc khách chỉ muốn nghe giọng người. Mỗi người một dòng: số máy, việc gì thì gọi họ, và giờ nào gọi được.`}
      rail={<TryPanel section="chuyen-may" config={live} />}
      bar={
        <SaveBar
          {...d.bar}
          sub={
            canTransfer
              ? `${agent} nối máy tới ${handoffTo(live)}${emergency ? ` · khẩn cấp tới ${emergencyDoctor(live)}` : ''}`
              : `Chưa có số máy nhận — lưu được, nhưng ${agent} chưa nối máy cho ai được`
          }
        />
      }
    >
      <Card
        title="Người nhận cuộc gọi"
        subtitle={
          targets.length
            ? `${ready}/${targets.length} số gọi được · ${agent} thử theo thứ tự từ trên xuống`
            : `số máy ${agent} gọi khi khách cần nghe giọng người`
        }
        actions={<AddButton label="Thêm người" onClick={add} />}
      >
        {targets.length ? (
          <RowList>
            {targets.map((t, i) => {
              const isEmergency = t.triggers.includes(EMERGENCY_TRIGGER)
              const ideas = [...TRANSFER_TRIGGERS, ...TRANSFER_TRIGGERS_MORE].filter((x) => !t.triggers.includes(x))
              // Three at a time, the rest behind the ghost pill (§5 of the UI rules).
              // With the commonest trigger already on a new row, those three are
              // exactly the three standard cases left.
              const shown = more === t.id ? ideas : ideas.slice(0, 3)
              const sub = [t.role.trim(), ...t.triggers].filter(Boolean).join(' · ')
              return (
                <ExpandRow
                  key={t.id}
                  rowId={t.id}
                  rowRef={rows.ref(t.id)}
                  open={openId === t.id}
                  mounted={openId === t.id || closingId === t.id}
                  unfilled={!targetReady(t) || t.triggers.length === 0}
                  onToggle={() => toggle(t.id)}
                  summary={
                    <>
                      {/* The order is real — she tries them from the top — so
                          it is drawn rather than said. Every rung looks the
                          same: filling only the first one implied a difference
                          in kind, and the difference is only the number. */}
                      <span className={styles.rank} aria-hidden="true">
                        {i + 1}
                      </span>
                      <RowText name={t.name} placeholder="Chưa có tên" sub={sub || <RowMissing>chưa chọn trường hợp nào</RowMissing>} />
                      <RowValue>{t.phone.trim() ? formatPhone(t.phone) : <RowMissing>chưa có số</RowMissing>}</RowValue>
                      <RowMeta tight>
                        <RowMark name={isEmergency ? 'alert' : null} title={isEmergency ? 'Nhận cả cuộc gọi khẩn cấp y tế' : undefined} />
                        <RowMark name={WINDOW_ICON[t.window]} title={LABELS.escalationWindow[t.window]} />
                      </RowMeta>
                    </>
                  }
                >
                  <RowEdit>
                    <RowEditRow>
                      <TextField
                        className={rowStyles.editFixed}
                        compact
                        numeric
                        inputMode="tel"
                        label="Số máy"
                        value={formatPhone(t.phone)}
                        onChange={(e) => setTarget(t.id, { phone: normalizePhone(e.target.value).slice(0, 11) })}
                        placeholder="090 123 45 67"
                        error={t.phone && !phoneOk(t.phone) ? 'Số chưa đủ 10 số.' : null}
                        autoFocus={fresh.includes(t.id)}
                      />
                      <TextField
                        className={rowStyles.editGrow}
                        compact
                        label="Tên"
                        value={t.name}
                        onChange={(e) => setTarget(t.id, { name: e.target.value })}
                        placeholder={i === 0 ? 'VD: chị Lan' : 'Tên người nhận'}
                      />
                      <TextField
                        className={rowStyles.editGrow}
                        compact
                        label="Vai trò"
                        value={t.role}
                        onChange={(e) => setTarget(t.id, { role: e.target.value })}
                        placeholder="VD: Quản lý phòng khám"
                      />
                    </RowEditRow>

                    <div className={ui.stackTight}>
                      <RowEditLabel>Khi nào gọi người này</RowEditLabel>
                      <ChipInput
                        boxed
                        value={t.triggers}
                        onChange={(v) => setTarget(t.id, { triggers: v })}
                        placeholder={t.triggers.length ? 'Thêm trường hợp…' : 'VD: Khách hỏi về ca đã làm'}
                      />
                      {shown.length ? (
                        <Suggestions>
                          {shown.map((x) => (
                            <Suggestion key={x} onClick={() => setTarget(t.id, { triggers: [...t.triggers, x] })}>
                              {x}
                            </Suggestion>
                          ))}
                          {ideas.length > 3 ? (
                            <SuggestionMore count={ideas.length - 3} open={more === t.id} onToggle={() => setMore((m) => (m === t.id ? null : t.id))} />
                          ) : null}
                        </Suggestions>
                      ) : null}
                    </div>

                    {/* The clinical signs qualify one trigger, so they live
                        inside the row that took it — and only there. They were
                        a card of their own, on a page where nothing else was
                        about symptoms. */}
                    {isEmergency ? (
                      <div className={ui.stackTight}>
                        <RowEditLabel>Dấu hiệu nối máy ngay</RowEditLabel>
                        <ChipInput
                          boxed
                          value={draft.emergency_red_flags_custom}
                          onChange={(v) => set('emergency_red_flags_custom', v)}
                          locked={EMERGENCY_RED_FLAGS_PACK}
                          lockedTitle="Bộ quy tắc ngành — không gỡ được"
                          placeholder={draft.emergency_red_flags_custom.length ? 'Thêm dấu hiệu…' : 'VD: đau dữ dội sau nhổ răng'}
                        />
                        <span className={ui.hint}>Năm dấu hiệu đầu là quy tắc ngành. Danh sách này dùng chung cho mọi số nhận cuộc gọi khẩn cấp.</span>
                      </div>
                    ) : null}

                    <Said who={agent}>{targetLine(t)}</Said>

                    <div className={ui.stackTight}>
                      <RowEditLabel>Giờ gọi được</RowEditLabel>
                      <TileGrid radio min={130} ariaLabel={`Giờ ${agent} gọi được người này`}>
                        {WINDOWS.map((w) => (
                          <Tile
                            key={w.value}
                            single
                            icon={w.icon}
                            label={LABELS.escalationWindowShort[w.value]}
                            selected={t.window === w.value}
                            onClick={() => setTarget(t.id, { window: w.value })}
                          />
                        ))}
                      </TileGrid>
                      <span className={ui.hint}>{transferWindowLine(t, agent)}</span>
                    </div>

                    <div className={ui.stackTight}>
                      <RowEditLabel>Nếu không ai nghe máy</RowEditLabel>
                      <TileGrid radio min={150} ariaLabel={`${agent} làm gì khi không ai nghe máy`}>
                        {FALLBACKS.map((f) => (
                          <Tile
                            key={f.value}
                            single
                            icon={f.icon}
                            label={LABELS.escalationFallback[f.value]}
                            selected={t.fallback === f.value}
                            onClick={() => setTarget(t.id, { fallback: f.value })}
                          />
                        ))}
                      </TileGrid>
                      <Said who={agent}>{fallbackLine(t)}</Said>
                    </div>

                    <RowEditFoot>
                      <DeleteButton label="Xoá người này" onClick={() => remove(t.id)} />
                    </RowEditFoot>
                  </RowEdit>
                </ExpandRow>
              )
            })}
          </RowList>
        ) : (
          <>
            <EmptyState title="Chưa có số nào">
              Đây là thông tin quan trọng nhất trong cả Lễ tân. Không có nó, khách xin gặp người thật thì {agent} chỉ ghi lại được lời nhắn — nghe câu dưới đây là rõ.
            </EmptyState>
            <Said who={agent}>{agreeLine(live)}</Said>
          </>
        )}
      </Card>

    </SkillsSection>
  )
}
