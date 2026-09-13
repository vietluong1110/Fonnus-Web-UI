import { useEffect, useMemo, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import type { CallDetail, CallSummary } from '../../../api'
import { messageFor } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { IconButton, ui } from '../../ui'
import { fmtTime } from '../overview/labels'
import {
  callMeta,
  callbackTitle,
  callerLine,
  clock,
  eventCopy,
  fmtPhone,
  gapCopy,
  rateLabel,
  resultOf,
  slot,
  transferNote,
  whenLine,
} from './labels'
import { useRecording } from './useRecording'
import type { Recording } from './useRecording'
import styles from './Calls.module.css'

/*
 * One call, top to bottom — summary first, evidence second:
 *
 *   the caller and "Gọi lại" → when and how long → what happened, in one or two
 *   sentences → the facts she left behind (a callback owed, an appointment, a
 *   transfer, the thing she did not know) → the recording → the conversation.
 *
 * The same panel in three places, because it is one object:
 *
 *   rail     ≥ 1181px, sticky in the 380px column beside the list — the column
 *            the try-out call takes on every Lễ tân page, behind the same gutter
 *   drawer   tablet: slides in from the right over the list
 *   sheet    phone: the whole screen, the player at the thumb
 *
 * Blush is her speech and nothing else (§1); the caller is hollow. What she did
 * sits between the turns, so "why did she transfer?" is answered where it
 * happened rather than in a log.
 */

export type PanelVariant = 'rail' | 'drawer' | 'sheet'

export interface PanelProps {
  variant: PanelVariant
  id: string
  detail: CallDetail | null
  error: unknown
  onRetry: () => void
  agent: string
  onCallback: (call: CallSummary, done: boolean) => void
  callbackBusy: boolean
  callbackError: string | null
  onOpen: (id: string, e: MouseEvent) => void
  onClose?: () => void
  pager?: { label: string; prev: (() => void) | null; next: (() => void) | null }
}

export function CallPanel(p: PanelProps) {
  const d = p.detail && p.detail.id === p.id ? p.detail : null
  const rec = useRecording(d?.recording?.url ?? null, d?.recording?.duration_ms ?? 0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // An overlay takes focus on its way in, so a keyboard is not left behind it.
  useEffect(() => {
    if (p.variant !== 'rail') closeRef.current?.focus()
  }, [p.variant])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [p.id])

  const live = rec.playing || rec.ms > 0
  const current = useMemo(() => {
    if (!d || !live) return -1
    let at = -1
    d.turns.forEach((t, i) => {
      if (t.at_ms <= rec.ms) at = i
    })
    return at
  }, [d, live, rec.ms])

  // Follow the recording. By `scrollTop`, never `scrollIntoView` — that would
  // scroll the page under a sticky rail too (CLAUDE.md).
  useEffect(() => {
    if (!rec.playing || current < 0) return
    const box = scrollRef.current
    const el = box?.querySelector<HTMLElement>(`[data-turn="${current}"]`)
    if (!box || !el) return
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    const target = Math.max(0, top - box.clientHeight / 3)
    if (Math.abs(box.scrollTop - target) > 24) box.scrollTop = target
  }, [current, rec.playing])

  const status = !d ? (
    p.error ? (
      <div className={styles.panelStatus} role="alert">
        <span className={styles.factTitle}>Chưa tải được cuộc gọi này</span>
        <span className={styles.factSub}>{messageFor(p.error)}</span>
        <Button variant="secondary" size="sm" onClick={p.onRetry}>
          Thử lại
        </Button>
      </div>
    ) : (
      <div className={styles.panelStatus} aria-busy="true" aria-label="Đang tải cuộc gọi">
        <span className={styles.skel} style={{ width: '46%' }} />
        <span className={styles.skel} style={{ width: '82%' }} />
        <span className={styles.skel} style={{ width: '64%' }} />
      </div>
    )
  ) : null

  const facts = d ? (
    <Facts call={d} agent={p.agent} busy={p.callbackBusy} error={p.callbackError} onCallback={p.onCallback} />
  ) : null

  const body = d ? (
    <>
      <div className={styles.meta}>{callMeta(d)}</div>
      <p className={styles.summary}>{d.summary}</p>
      {facts}
    </>
  ) : null

  const conversation = d ? (
    <>
      <Transcript call={d} agent={p.agent} rec={rec} current={current} live={live} />
      <Others call={d} agent={p.agent} onOpen={p.onOpen} />
    </>
  ) : null

  const player = d ? <Player call={d} rec={rec} /> : null

  if (p.variant === 'sheet') {
    return (
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Cuộc gọi">
        <div className={styles.sheetBar}>
          <button ref={closeRef} type="button" className={styles.disc} onClick={p.onClose} aria-label="Quay lại danh sách">
            <Icon name="chevron-left" size={20} />
          </button>
          <span className={styles.callerText}>
            {d ? (
              <>
                <span className={`${styles.callerNumber} ${styles.callerNumberSm}`}>{fmtPhone(d.caller_number)}</span>
                <span className={styles.callerWho}>{callerLine(d)}</span>
              </>
            ) : null}
          </span>
          {d ? (
            <a className={styles.callDisc} href={`tel:${d.caller_number}`} aria-label="Gọi lại">
              <Icon name="answered" size={20} />
            </a>
          ) : null}
        </div>
        <div className={styles.sheetScroll} ref={scrollRef}>
          {d ? (
            <div key={d.id} className={`${styles.sheetBody} ${styles.rise}`}>
              {body}
              <div className={styles.divider} />
              {conversation}
            </div>
          ) : (
            status
          )}
        </div>
        {player ? <div className={styles.sheetPlayer}>{player}</div> : null}
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${p.variant === 'drawer' ? styles.panelDrawer : ''}`}>
      {p.variant === 'drawer' ? (
        <div className={styles.drawerBar}>
          <button ref={closeRef} type="button" className={styles.close} onClick={p.onClose} aria-label="Đóng">
            <Icon name="x" size={16} />
          </button>
          <span className={styles.headSpacer} />
          {p.pager ? <Pager {...p.pager} /> : null}
        </div>
      ) : null}
      {d ? (
        <>
          <div key={d.id} className={`${styles.panelTop} ${styles.rise}`}>
            <div className={styles.caller}>
              <span className={styles.callerText}>
                <span className={styles.callerNumber}>{fmtPhone(d.caller_number)}</span>
                <span className={styles.callerWho}>{callerLine(d)}</span>
              </span>
              <a className={styles.callBtn} href={`tel:${d.caller_number}`}>
                <Icon name="answered" size={16} />
                Gọi lại
              </a>
            </div>
            {body}
          </div>
          <div className={styles.panelPlayer}>{player}</div>
          <div className={styles.panelScroll} ref={scrollRef}>
            <div key={d.id} className={styles.rise}>
              {conversation}
            </div>
          </div>
        </>
      ) : (
        status
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- pager */

function Pager({ label, prev, next }: { label: string; prev: (() => void) | null; next: (() => void) | null }) {
  return (
    <span className={styles.pager}>
      <span className={styles.pagerText}>{label}</span>
      <IconButton name="chevron-left" label="Cuộc trước" onClick={prev ?? undefined} disabled={!prev} />
      <IconButton name="chevron-right" label="Cuộc sau" onClick={next ?? undefined} disabled={!next} />
    </span>
  )
}

/* ------------------------------------------------------------------- facts */

/**
 * What the call left behind, as rows in the Tổng quan queue's geometry. One icon
 * each. A callback still owed carries the page's one terracotta dot — the same
 * dot its row wears in the list — and the button that clears it.
 */
function Facts({
  call,
  agent,
  busy,
  error,
  onCallback,
}: {
  call: CallDetail
  agent: string
  busy: boolean
  error: string | null
  onCallback: (call: CallSummary, done: boolean) => void
}) {
  const rows: ReactNode[] = []

  if (call.callback) {
    rows.push(
      call.callback.done_at ? (
        <div key="callback" className={styles.fact}>
          <Icon name="done" size={20} />
          <span className={styles.factText}>
            <span className={styles.factTitle}>Đã gọi lại lúc {fmtTime(call.callback.done_at)}</span>
            <span className={styles.factSub}>{call.topic}</span>
          </span>
          <button type="button" className={`${ui.linkButton} ${styles.factLink}`} onClick={() => onCallback(call, false)} disabled={busy}>
            Hoàn tác
          </button>
        </div>
      ) : (
        <div key="callback" className={styles.fact}>
          <span className={styles.factMark}>
            <span className={styles.dot} />
          </span>
          <span className={styles.factText}>
            <span className={styles.factTitle}>{callbackTitle(call.callback.due_by)}</span>
            <span className={styles.factSub}>{call.topic}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="check" size={16} />}
            onClick={() => onCallback(call, true)}
            disabled={busy}
            className={styles.factButton}
          >
            Đã gọi lại
          </Button>
        </div>
      ),
    )
  }

  if (call.booking) {
    rows.push(
      <a key="booking" className={`${styles.fact} ${styles.factAnchor}`} href={appHref('lich-hen')}>
        <Icon name="appointment" size={20} />
        <span className={styles.factText}>
          <span className={styles.factTitle}>{slot(call.booking.starts_at)}</span>
          <span className={styles.factSub}>
            {[call.booking.service, call.booking.practitioner].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className={styles.factAct}>
          Mở lịch hẹn
          <Icon name="chevron-right" size={16} />
        </span>
      </a>,
    )
  }

  if (call.transfer) {
    rows.push(
      <div key="transfer" className={styles.fact}>
        <Icon name="handoff" size={20} />
        <span className={styles.factText}>
          <span className={styles.factTitle}>Chuyển máy cho {call.transfer.to_name}</span>
          <span className={styles.factSub}>{transferNote(call.transfer)}</span>
        </span>
      </div>,
    )
  }

  if (call.gap) {
    const g = gapCopy(call.gap, agent)
    // Something she does not know: content not filled in, so dashed (§1),
    // and one press from the field that fills it.
    rows.push(
      <a key="gap" className={`${styles.fact} ${styles.factAnchor} ${styles.factGap}`} href={g.href}>
        <Icon name={g.icon} size={20} />
        <span className={styles.factText}>
          <span className={styles.factTitle}>{g.title}</span>
        </span>
        <span className={styles.factAct}>
          {g.action}
          <Icon name="chevron-right" size={16} />
        </span>
      </a>,
    )
  }

  if (!rows.length) {
    const r = resultOf(call, agent)
    rows.push(
      <div key="result" className={styles.fact}>
        <Icon name={r.icon} size={20} />
        <span className={styles.factText}>
          <span className={styles.factTitle}>{r.label}</span>
          {call.outcome === 'answered' ? <span className={styles.factSub}>Không cần làm gì thêm</span> : null}
        </span>
      </div>,
    )
  }

  return (
    <div className={styles.facts}>
      {rows}
      {error ? (
        <span className={styles.factError} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ player */

/**
 * One line, with the logo's ink dot riding it. What she did sits on the line as
 * dots — terracotta where she held an appointment, ink for anything else she
 * did, a dashed ring where she first did not know something — so the shape of
 * the call is readable before anything is played.
 */
function Player({ call, rec }: { call: CallDetail; rec: Recording }) {
  if (!call.recording) {
    return (
      <div className={styles.playerNote}>
        <Icon name="privacy" size={16} />
        Bản ghi âm không còn lưu
      </div>
    )
  }

  const dur = call.recording.duration_ms
  const pct = dur > 0 ? Math.min(1, rec.ms / dur) * 100 : 0

  let gapMarked = false
  const marks = call.turns.flatMap((t, i) => {
    const left = dur > 0 ? Math.min(100, (t.at_ms / dur) * 100) : 0
    if (t.kind === 'event') {
      return [{ key: i, left, cls: t.event.type === 'appointment_held' ? styles.markBook : styles.markEvent }]
    }
    if ((t.kind === 'agent' || t.kind === 'caller') && t.gap && !gapMarked) {
      gapMarked = true
      return [{ key: i, left, cls: styles.markGap }]
    }
    return []
  })

  return (
    <div className={styles.playerWrap}>
      <div className={styles.player}>
        <button
          type="button"
          className={styles.play}
          onClick={rec.toggle}
          aria-label={rec.playing ? 'Tạm dừng' : 'Nghe lại cuộc gọi'}
        >
          <Icon name={rec.playing ? 'pause' : 'play'} size={18} />
        </button>
        <div
          className={styles.track}
          role="slider"
          tabIndex={0}
          aria-label="Vị trí trong bản ghi âm"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur / 1000)}
          aria-valuenow={Math.round(rec.ms / 1000)}
          aria-valuetext={clock(rec.ms)}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            rec.seek(((e.clientX - r.left) / r.width) * dur)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault()
              rec.seek(rec.ms + (e.key === 'ArrowRight' ? 5000 : -5000))
            }
          }}
        >
          <span className={styles.trackFill} style={{ width: `${pct}%` }} />
          {marks.map((m) => (
            <span key={m.key} className={`${styles.mark} ${m.cls}`} style={{ left: `${m.left}%` }} />
          ))}
          <span className={styles.playhead} style={{ left: `${pct}%` }} />
        </div>
        <span className={styles.time}>
          {clock(rec.ms)} / {clock(dur)}
        </span>
        <button type="button" className={styles.speed} onClick={rec.cycleRate} aria-label={`Tốc độ ${rateLabel(rec.rate)}`}>
          {rateLabel(rec.rate)}
        </button>
      </div>
      {rec.failed ? (
        <span className={styles.factError} role="alert">
          Không phát được bản ghi âm
        </span>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- transcript */

/**
 * The conversation. Press anywhere on a line to hear it — unless the press is
 * the end of a text selection, because an owner copying what a caller said is
 * not asking to play it. The timestamp is the line's keyboard target.
 */
function Transcript({
  call,
  agent,
  rec,
  current,
  live,
}: {
  call: CallDetail
  agent: string
  rec: Recording
  current: number
  live: boolean
}) {
  const firstGap = call.turns.findIndex((t) => (t.kind === 'agent' || t.kind === 'caller') && t.gap)
  const seekTo = (ms: number) => () => {
    if (window.getSelection()?.toString()) return
    rec.seek(ms)
  }

  return (
    <ol className={styles.tx} aria-label="Lời qua lại">
      {call.turns.map((t, i) => {
        const state = i === current ? styles.isCurrent : live && t.at_ms > rec.ms ? styles.isAhead : ''
        const stamp = (
          <button
            type="button"
            className={styles.ts}
            onClick={(e) => {
              e.stopPropagation()
              rec.seek(t.at_ms)
            }}
            aria-label={`Nghe từ ${clock(t.at_ms)}`}
          >
            {clock(t.at_ms)}
          </button>
        )

        if (t.kind === 'disclosure') {
          return (
            <li key={i} data-turn={i} className={`${styles.disclosure} ${state}`} onClick={seekTo(t.at_ms)}>
              <Icon name="privacy" size={16} />
              <span>{agent} chào và báo cuộc gọi có ghi âm</span>
              {stamp}
            </li>
          )
        }

        if (t.kind === 'event') {
          const e = eventCopy(t.event, agent)
          return (
            <li key={i} data-turn={i} className={`${styles.event} ${state}`} onClick={seekTo(t.at_ms)}>
              <span className={styles.eventText}>
                <Icon name={e.icon} size={16} />
                <span>{e.text}</span>
                {stamp}
              </span>
            </li>
          )
        }

        const mine = t.kind === 'agent'
        return (
          <li
            key={i}
            data-turn={i}
            className={`${styles.turn} ${mine ? '' : styles.turnCaller} ${t.gap ? styles.turnGap : ''} ${state}`}
            onClick={seekTo(t.at_ms)}
          >
            <span className={styles.who}>
              <b>{mine ? agent : 'Khách'}</b>
              {stamp}
            </span>
            <span className={`${styles.bubble} ${mine ? styles.bubbleAgent : styles.bubbleCaller}`}>{t.text}</span>
            {t.gap && i === firstGap ? <span className={styles.gapNote}>{gapCopy(t.gap, agent).note}</span> : null}
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ others */

function Others({ call, agent, onOpen }: { call: CallDetail; agent: string; onOpen: (id: string, e: MouseEvent) => void }) {
  if (!call.others.length) return null
  return (
    <div className={styles.others}>
      <span className={styles.othersLabel}>Số này đã gọi {call.others.length + 1} lần</span>
      {call.others.map((o) => {
        const r = resultOf(o, agent)
        return (
          <a key={o.id} className={styles.other} href={appHref('cuoc-goi', o.id)} onClick={(e) => onOpen(o.id, e)}>
            <Icon name={r.icon} size={20} />
            <span className={styles.factText}>
              <span className={styles.otherTitle}>{o.topic}</span>
              <span className={styles.factSub}>
                {whenLine(o.started_at)} · {r.label}
              </span>
            </span>
            <span className={styles.otherChev}>
              <Icon name="chevron-right" size={16} />
            </span>
          </a>
        )
      })}
    </div>
  )
}
