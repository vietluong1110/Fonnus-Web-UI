import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import { appHref } from '../../hooks/useRoute'
import { useConfig } from './store'
import { LEVELS, computeReadiness, effortLabel, sectionReadiness } from './readiness'
import type { Job, LeTanTabKey, Readiness, TabReadiness } from './readiness'
import styles from './ReadinessPanel.module.css'

/*
 * "Linh đã sẵn sàng đến đâu" — the right-hand column of every Lễ tân hub,
 * where the setup assistant used to be.
 *
 * One number for the whole tab, drawn as a hollow ring cut into Hồ sơ,
 * Kiến thức and Kỹ năng, each filled to its own progress, so the ring is also
 * the breakdown and the three tabs add up to the number in the hole. Under
 * it, the three levels (readiness.ts) and the next few jobs that move her up
 * one, each with how long it takes and what it adds.
 *
 * What is deliberately *not* here is the orb. The orb is the product's one
 * call affordance — the header button, the try-out panel — and inside a meter
 * it would look pressable and repeat the thing one click away.
 *
 * The same panel sits on all three hubs; only the current tab's label is
 * picked out. A sub-page carries its own slice of it: `SectionReadinessCard`.
 */

/** Each section's glyph — the same one its hub row wears. */
export const SECTION_ICONS: Record<string, IconName> = {
  'danh-tinh': 'caller',
  'giong-noi': 'volume',
  'chi-dan': 'instructions',
  'dia-diem': 'location',
  'gio-mo-cua': 'hours',
  'dich-vu': 'price',
  'bao-hiem': 'privacy',
  'bac-si': 'practitioner',
  'cau-hoi': 'help',
  'tu-khoa': 'volume',
  'chuyen-may': 'handoff',
  'dat-lich': 'appointment',
  'gui-email': 'mail',
}

export function useReadiness(): Readiness {
  const { config } = useConfig()
  return useMemo(() => computeReadiness(config), [config])
}

/* ------------------------------------------------------------------ motion */

/*
 * The last value each meter was *shown* at, by where it was shown. A hub ring
 * remembers what the hub last displayed, not what the record holds — so an
 * owner who fills a field on a sub-page and comes back sees the hub's ring
 * rise from where they left it, even though the save landed before they
 * arrived. Kept in memory: hash routing never unmounts the app, and a fresh
 * load rises from zero once, which is the one reveal the page gets.
 */
const shown = new Map<string, number>()

const DURATION = 900
/** A beat before moving, so the eye has landed on the page first. */
const DELAY = 150
/** `--ease-arc` (tokens/motion.css): a short lift-and-settle, no overshoot. */
const easeArc = (t: number) => {
  // cubic-bezier(.2,.7,.3,1), solved for y at x = t by bisection.
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (bez(0.2, 0.3, mid) < t) lo = mid
    else hi = mid
  }
  return bez(0.7, 1, (lo + hi) / 2)
}

/**
 * A meter value that moves to its target instead of jumping: the ring's arc
 * and the number in it rise together. `key` names the place it is shown
 * (`hub:overall`, `card:section:dia-diem`), so each surface animates from
 * what *it* last showed.
 *
 * Reduced motion jumps straight there. And there is a timer floor under the
 * frames, because a hidden or throttled tab stops requestAnimationFrame and
 * the meter would otherwise sit on its old value (ui-ux-principles §6).
 */
export function useTween(key: string, target: number): number {
  const [value, setValue] = useState(() => shown.get(key) ?? 0)
  const current = useRef(value)
  current.current = value

  useEffect(() => {
    const from = current.current
    shown.set(key, target)
    if (from === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now() + DELAY
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION))
      setValue(from + (target - from) * easeArc(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const floor = window.setTimeout(() => setValue(target), DELAY + DURATION + 100)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(floor)
    }
  }, [key, target])

  return value
}

/* ------------------------------------------------------------------- ring */

/**
 * A ring around something — a hub row's icon, a section's percentage. A
 * section with nothing in it is a dashed circle, the app's one mark for
 * "not filled in yet".
 */
export function ProgressRing({ value, size = 40, stroke = 3, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2
  return (
    <span className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        {value > 0 ? (
          <>
            <circle className={styles.track} cx={mid} cy={mid} r={r} strokeWidth={stroke} />
            <circle
              className={styles.fill}
              cx={mid}
              cy={mid}
              r={r}
              strokeWidth={stroke}
              strokeDasharray={`${c * Math.min(1, value)} ${c}`}
              transform={`rotate(-90 ${mid} ${mid})`}
            />
          </>
        ) : (
          <circle className={styles.dashed} cx={mid} cy={mid} r={r} strokeWidth={Math.max(1.2, stroke * 0.55)} />
        )}
      </svg>
      <span className={styles.ringInner}>{children}</span>
    </span>
  )
}

/** The big ring: one arc per tab, sized by how many sections the tab has. */
function TabRing({ tabs, size, stroke, labels, active }: { tabs: TabReadiness[]; size: number; stroke: number; labels: boolean; active: LeTanTabKey }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2
  const total = tabs.reduce((n, t) => n + t.sections.length, 0)
  const gapDeg = 5
  let at = 0
  const arcs = tabs.map((t) => {
    const sweep = (t.sections.length / total) * 360
    const len = ((sweep - gapDeg) / 360) * c
    const rot = at + gapDeg / 2 - 90
    const mid_ = ((at + sweep / 2 - 90) * Math.PI) / 180
    at += sweep
    return { t, len, rot, mid: mid_ }
  })

  return (
    <div className={styles.ringBox} style={{ height: size }}>
      <svg className={styles.ringSvg} width={size} height={size} aria-hidden="true">
        {arcs.map(({ t, len, rot }) => (
          <TabArc key={t.key} tab={t} len={len} rot={rot} mid={mid} r={r} c={c} stroke={stroke} />
        ))}
      </svg>
      {labels
        ? arcs.map(({ t, mid: a }) => {
            // Each tab named where its arc sits: beside it, or under it at the foot.
            const R = r + stroke / 2 + 12
            const x = Math.cos(a) * R
            const y = Math.sin(a) * R
            const side = Math.cos(a) > 0.3 ? styles.labelRight : Math.cos(a) < -0.3 ? styles.labelLeft : styles.labelBelow
            return (
              <span
                key={t.key}
                className={`${styles.ringLabel} ${side} ${t.key === active ? styles.ringLabelOn : ''}`}
                style={{ left: `calc(50% + ${x.toFixed(1)}px)`, top: `${(mid + y).toFixed(1)}px` }}
              >
                <span>{t.name}</span>
                <span className={styles.num}>
                  {t.complete}/{t.sections.length}
                </span>
              </span>
            )
          })
        : null}
    </div>
  )
}

/** One tab's arc: its pale track, and the fill rising to the tab's progress. */
function TabArc({ tab, len, rot, mid, r, c, stroke }: { tab: TabReadiness; len: number; rot: number; mid: number; r: number; c: number; stroke: number }) {
  const v = useTween(`hub:tab:${tab.key}`, tab.progress)
  return (
    <g transform={`rotate(${rot} ${mid} ${mid})`}>
      <circle className={styles.track} cx={mid} cy={mid} r={r} strokeWidth={stroke} strokeDasharray={`${len} ${c}`} />
      <circle className={styles.fill} cx={mid} cy={mid} r={r} strokeWidth={stroke} strokeDasharray={`${len * v} ${c}`} />
    </g>
  )
}

/** The number in the hole, counting up with the arcs around it. */
function Percent({ value, className }: { value: number; className?: string }) {
  const v = useTween('hub:overall', value)
  return (
    <span className={`${styles.percent} ${className ?? ''}`}>
      {Math.round(v)}
      <span className={styles.percentSign}>%</span>
    </span>
  )
}

/* ----------------------------------------------------------------- levels */

function Levels({ reached }: { reached: number }) {
  return (
    <ol className={styles.levels} aria-label="Các bậc sẵn sàng">
      {LEVELS.map((l, i) => {
        const state = i < reached ? 'done' : i === reached ? 'now' : 'next'
        return (
          <li key={l.key} className={`${styles.level} ${styles[`level_${state}`]}`}>
            {i > 0 ? <span className={`${styles.levelLine} ${i <= reached ? styles.levelLineOn : ''}`} aria-hidden="true" /> : null}
            <span className={styles.levelDot} aria-hidden="true">
              {state === 'done' ? <Icon name="check" size={11} /> : null}
            </span>
            <span className={styles.levelLabel}>{l.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------- jobs */

const TAB_NAME: Record<LeTanTabKey, string> = { 'ho-so': 'Hồ sơ', 'kien-thuc': 'Kiến thức', 'ky-nang': 'Kỹ năng' }

export function Gain({ value }: { value: number }) {
  return <span className={styles.gain}>+{value}%</span>
}

function JobRow({ job, strong = false }: { job: Job; strong?: boolean }) {
  return (
    <a className={`${styles.job} ${strong ? styles.jobStrong : ''}`} href={appHref('le-tan', job.tab, job.section)}>
      <span className={styles.jobIcon}>
        <Icon name={SECTION_ICONS[job.section] ?? 'dot'} size={strong ? 20 : 16} />
      </span>
      <span className={styles.jobText}>
        <span className={styles.jobTitle}>{job.label}</span>
        <span className={styles.jobMeta}>
          {TAB_NAME[job.tab]} · {effortLabel(job.effort)}
        </span>
      </span>
      <Gain value={job.gain} />
    </a>
  )
}

/*
 * The count in the eyebrow is every job left; one of them is offered, with
 * the button, and the rest wait behind one closed row that says how many
 * there are. Showing two of three "others" under the button read as a second
 * list that did not add up to the number above it.
 */
function Jobs({ r, agent }: { r: Readiness; agent: string }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  if (!r.jobs.length) {
    return (
      <div className={styles.jobs}>
        <div className={styles.allDone}>
          <span className={styles.allDoneIcon}>
            <Icon name="done" size={20} />
          </span>
          <span>Mọi mục đã đủ. Khi phòng khám thay đổi, sửa ở mục đó để {agent} nói đúng.</span>
        </div>
      </div>
    )
  }
  const [first, ...rest] = r.jobs
  const next = LEVELS[Math.min(r.reached, LEVELS.length - 1)].label
  return (
    <div className={styles.jobs}>
      {/* Past halfway, what is left is the smaller number — so that is what it counts. */}
      <span className={styles.eyebrow}>
        Còn {r.jobs.length} việc để lên “{next}”
      </span>
      <JobRow job={first} strong />
      <a className={styles.go} href={appHref('le-tan', first.tab, first.section)}>
        Làm ngay
        <Icon name="arrow-right" size={16} />
      </a>
      {rest.length ? (
        <div className={styles.more}>
          <button type="button" className={styles.moreToggle} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
            <span>Xem {rest.length} việc còn lại</span>
            <span className={`${styles.moreChevron} ${open ? styles.moreChevronOpen : ''}`}>
              <Icon name="chevron-down" size={16} />
            </span>
          </button>
          {/* Grows from 0fr to 1fr: a natural height with nothing measured. */}
          <div id={listId} className={`${styles.moreBody} ${open ? styles.moreBodyOpen : ''}`} inert={!open}>
            <div className={styles.moreList}>
              {rest.map((j) => (
                <JobRow key={j.id} job={j} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ panel */

export function ReadinessPanel({ tab }: { tab: LeTanTabKey }) {
  const { config } = useConfig()
  const r = useReadiness()
  const agent = config.agent_name.trim() || 'Linh'

  return (
    <section className={styles.wrap} aria-label={`${agent} đã sẵn sàng đến đâu`}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.title}>{agent} đã sẵn sàng đến đâu</span>
          <span className={styles.meta}>Tính trên cả Hồ sơ, Kiến thức và Kỹ năng</span>
        </div>

        <div className={styles.body}>
          {/* Rail and tablet: the ring with each tab named beside its arc. */}
          <div className={styles.stage}>
            <div className={styles.ringWrap}>
              <TabRing tabs={r.tabs} size={176} stroke={16} labels active={tab} />
              <span className={styles.hole}>
                <Percent value={r.percent} />
                <span className={styles.holeLabel}>sẵn sàng</span>
              </span>
            </div>
            <Levels reached={r.reached} />
          </div>

          {/* Phone: a smaller ring, the tabs as a list beside it. */}
          <div className={styles.compact}>
            <div className={styles.ringWrapSmall}>
              <TabRing tabs={r.tabs} size={112} stroke={11} labels={false} active={tab} />
              <span className={styles.hole}>
                <Percent value={r.percent} className={styles.percentSmall} />
              </span>
            </div>
            <div className={styles.legend}>
              <span className={styles.legendLevel}>
                {r.reached >= LEVELS.length ? (
                  <b>{LEVELS[LEVELS.length - 1].label}</b>
                ) : (
                  <>
                    Đang lên <b>{LEVELS[r.reached].label}</b>
                  </>
                )}
              </span>
              {r.tabs.map((t) => (
                <span key={t.key} className={`${styles.legendRow} ${t.key === tab ? styles.legendRowOn : ''}`}>
                  <span>{t.name}</span>
                  <span className={styles.num}>
                    {t.complete}/{t.sections.length}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className={styles.jobsCol}>
            <Jobs r={r} agent={agent} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ sub-page card */

/**
 * The section's own slice of the panel, above the try-out call on a sub-page:
 * how full this section is, the whole tab's number beside it, and the one
 * thing still missing here. It reads the saved record, so it moves when the
 * owner saves — and the hub, which remembers what it last showed, rises again
 * from there when the owner goes back.
 */
export function SectionReadinessCard({ section, title }: { section: string; title: ReactNode }) {
  const r = useReadiness()
  const s = sectionReadiness(r, section)
  // Rises when a save lands: the arc and the number move together.
  const shownProgress = useTween(`card:section:${section}`, s?.progress ?? 0)
  if (!s) return null
  const done = s.checks.filter((c) => c.value >= 1).length
  const missing = s.checks.find((c) => c.value < 1)
  const gain = missing ? Math.max(1, Math.round(((1 - missing.value) / (r.sections.length * s.checks.length)) * 100)) : 0

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <ProgressRing value={shownProgress} size={56} stroke={5}>
          <span className={styles.cardPct}>{Math.round(shownProgress * 100)}%</span>
        </ProgressRing>
        <span className={styles.cardText}>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.meta}>
            <span className={styles.num}>
              {done}/{s.checks.length}
            </span>{' '}
            mục · cả Lễ tân <span className={styles.num}>{r.percent}%</span>
          </span>
        </span>
      </div>
      <div className={styles.cardNext}>
        {missing ? (
          <>
            <span className={styles.cardNextIcon}>
              <Icon name="plus" size={16} />
            </span>
            <span className={styles.cardNextText}>{missing.label}</span>
            <Gain value={gain} />
          </>
        ) : (
          <>
            <span className={styles.cardNextIcon}>
              <Icon name="check" size={16} />
            </span>
            <span className={styles.cardNextText}>Mục này đã đủ</span>
          </>
        )}
      </div>
    </div>
  )
}
