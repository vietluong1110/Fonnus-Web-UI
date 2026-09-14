import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isCanceled, messageFor } from '../../../api'
import type { AccountOverview, BillingPeriod, Plan, PlanId, PlanQuote, Subscription } from '../../../api'
import { useSession } from '../../../auth/SessionProvider'
import { Button, Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { PHONE_BREAKPOINT, useIsNarrow } from '../../../hooks/useIsNarrow'
import { appHref, navigateApp } from '../../../hooks/useRoute'
import { ContentSkeleton, RetryCard } from '../../Boot'
import { Card, Segmented, ui, useToast } from '../../ui'
import { PanelFrame } from '../numbers/parts'
import { MeterBar, Perks } from './PlanPanel'
import { COMPARISON_MATRIX, MATRIX_FOOTNOTE } from '../../../data/pricing'
import { PLAN_BLURB, PLAN_NAME, PLAN_ORDER, dm, fmtCount, fmtVnd, payIcon, payInSentence, planFromSlug, planSlug } from './labels'
import { addDays, cheapestFor, daysInclusive, meterOf, monthMinutes, monthlyCost } from './usage'
import styles from './Plans.module.css'

/*
 * `#/app/goi-dich-vu` — Gói dịch vụ.
 *   `#/app/goi-dich-vu/{plan}`   the change to that plan, open in a drawer or sheet
 *
 * The plan being changed to lives in the address, pushed, so Back closes the
 * panel on every width (§12). The period (tháng / năm) is the page's own state.
 * The trial plan is not offered as a card — a paying clinic cannot go back to it —
 * but it stays in "So sánh chi tiết", which is the landing page's full table.
 */

/*
 * "So sánh chi tiết" lists what the landing page's comparison lists, in its order
 * (`COMPARISON_MATRIX`). The rows the plan catalogue carries are read from the API
 * instead, so the table cannot disagree with the cards above it.
 */
const FROM_PLAN: Record<string, (p: Plan) => string | boolean> = {
  'Số phút bao gồm': (p) => fmtCount(p.minutes),
  'Giá thực tế mỗi phút': (p) => fmtVnd(Math.round(p.price_monthly_vnd / p.minutes / 10) * 10),
  'Giá vượt phút': (p) => fmtVnd(p.overage_vnd_per_minute),
  'Cuộc gọi cùng lúc': (p) => String(p.concurrent_calls),
  'Số máy bao gồm': (p) => String(p.numbers),
  'Giọng nói riêng': (p) => p.own_voice,
  'Quản lý tài khoản riêng': (p) => p.account_manager,
}
/** Where each paid plan sits in `COMPARISON_MATRIX`'s cells; 0 is Dùng thử. */
const MATRIX_COLUMN: Record<PlanId, number> = { basic: 1, standard: 2, advanced: 3 }

/** One comparison cell. The matrix writes ✓ and ✕ for the landing page; in the app they are drawn. */
function MatrixCell({ value, current = false }: { value: string | boolean; current?: boolean }) {
  const yes = value === true || value === '✓'
  const no = value === false || value === '✕'
  return (
    <span role="cell" className={`${styles.mCell} ${current ? styles.mCur : ''} ${no ? styles.mNo : ''}`}>
      {yes || no ? <Icon name={yes ? 'check' : 'minus'} size={16} aria-label={yes ? 'Có' : 'Không'} /> : String(value).replace(/(\d) đ/g, '$1đ')}
    </span>
  )
}

export function PlansPage({ path }: { path: string[] }) {
  const phone = useIsNarrow(PHONE_BREAKPOINT)
  const { toast } = useToast()
  const { patchMe } = useSession()
  const [data, setData] = useState<{ overview: AccountOverview; plans: Plan[] } | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [periodPick, setPeriodPick] = useState<BillingPeriod | null>(null)
  const [compare, setCompare] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [done, setDone] = useState<{ title: string; sub: string } | null>(null)
  const pushed = useRef(false)
  const pickedId = planFromSlug(path[0])

  useEffect(() => {
    const ac = new AbortController()
    Promise.all([api.account.overview({ signal: ac.signal }), api.account.plans({ signal: ac.signal })])
      .then(([overview, plans]) => {
        setData({ overview, plans })
        setLoadError(null)
      })
      .catch((e: unknown) => {
        if (!isCanceled(e)) setLoadError(e)
      })
    return () => ac.abort()
  }, [attempt])

  const choose = (id: PlanId) => {
    setDone(null)
    pushed.current = true
    window.location.hash = appHref('goi-dich-vu', planSlug(id))
  }

  const close = useCallback(() => {
    setDone(null)
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else {
      window.location.replace(appHref('goi-dich-vu'))
    }
  }, [])

  const open = pickedId != null && data != null

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  if (!data && loadError) {
    return <RetryCard title="Chưa tải được các gói" body={messageFor(loadError)} onRetry={() => setAttempt((n) => n + 1)} />
  }
  if (!data) return <ContentSkeleton />

  const { overview, plans } = data
  const sub = overview.subscription
  const period = periodPick ?? sub.period
  const minutes = monthMinutes(overview.usage)
  const current = plans.find((p) => p.id === sub.plan_id) ?? plans[0]
  const best = cheapestFor(plans, minutes, period)
  const meter = meterOf(overview.usage, current)
  const setSubscription = (next: Subscription) => setData((d) => (d ? { ...d, overview: { ...d.overview, subscription: next } } : d))

  const target = pickedId ? (plans.find((p) => p.id === pickedId) ?? null) : null
  const booked = (id: PlanId) => sub.scheduled?.plan_id === id && sub.scheduled.period === period
  const changeable = !!target && !(target.id === sub.plan_id && period === sub.period) && !booked(target.id)

  const onChanged = (next: Subscription, quote: PlanQuote, plan: Plan) => {
    setSubscription(next)
    const name = PLAN_NAME[plan.id]
    if (quote.applies === 'now') {
      patchMe({ plan: `Gói ${name}` })
      setDone({
        title: `Đã nâng lên ${name}`,
        sub: `Từ hôm nay có ${fmtCount(plan.minutes)} phút mỗi tháng.${quote.held_until ? ` Gói giữ ít nhất đến hết ${dm(quote.held_until)}.` : ''}`,
      })
      toast(`Đã nâng lên gói ${name}.`)
    } else {
      const how = quote.period === 'annual' ? 'trả năm' : 'trả tháng'
      setDone({
        title: plan.id === current.id ? `Từ ${dm(quote.effective_on)} ${how}` : `Từ ${dm(quote.effective_on)} dùng gói ${name}`,
        sub: `Đến lúc đó vẫn là gói ${PLAN_NAME[current.id]} như cũ.`,
      })
      toast(`Đã hẹn đổi gói từ ${dm(quote.effective_on)}.`)
    }
  }

  const cancelBooked = async () => {
    setCancelBusy(true)
    try {
      setSubscription(await api.account.cancelScheduledChange())
      toast('Đã huỷ hẹn đổi gói.', 'neutral')
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setCancelBusy(false)
    }
  }

  const card = (plan: Plan) => {
    const isCurrent = plan.id === sub.plan_id
    const isBooked = booked(plan.id)
    const up = PLAN_ORDER.indexOf(plan.id) > PLAN_ORDER.indexOf(sub.plan_id)
    const fits = best?.id === plan.id
    const overBy = Math.max(0, minutes - plan.minutes)
    const price = period === 'annual' ? plan.price_annual_per_month_vnd : plan.price_monthly_vnd

    let label: string
    let variant: 'primary' | 'secondary' = 'secondary'
    let disabled = false
    if (isBooked) {
      label = `Đã hẹn từ ${dm(sub.scheduled?.starts_on ?? sub.renews_on)}`
      disabled = true
    } else if (isCurrent && period === sub.period) {
      label = 'Gói đang dùng'
      disabled = true
    } else if (isCurrent) {
      label = period === 'annual' ? 'Chuyển sang trả năm' : 'Chuyển sang trả tháng'
    } else if (up) {
      label = `Nâng lên ${PLAN_NAME[plan.id]}`
      // Primary only for the plan that costs least at this month's minutes.
      if (fits) variant = 'primary'
    } else {
      label = `Chuyển xuống ${PLAN_NAME[plan.id]}`
    }

    return (
      <article key={plan.id} className={`${styles.plan} ${isCurrent ? styles.planCurrent : ''}`}>
        <div className={styles.planTop}>
          <h2 className={styles.planName}>{PLAN_NAME[plan.id]}</h2>
          {isCurrent ? <span className={styles.tag}>Gói của bạn</span> : null}
          {isBooked ? <span className={styles.tag}>Từ {dm(sub.scheduled?.starts_on ?? sub.renews_on)}</span> : null}
          {!isCurrent && fits ? <span className={styles.tag}>Hợp mức dùng</span> : null}
        </div>
        <span className={styles.blurb}>{PLAN_BLURB[plan.id]}</span>
        <div className={styles.price}>
          <span className={styles.priceNum}>{fmtCount(price)}</span>
          <span className={styles.per}>đ/tháng</span>
        </div>
        <span className={styles.note}>
          {period === 'annual' ? `trả một lần ${fmtVnd(plan.price_annual_vnd)}/năm` : `hoặc ${fmtVnd(plan.price_annual_per_month_vnd)}/tháng khi trả năm`}
        </span>
        <div className={styles.fit}>
          <div className={styles.fitHead}>
            <span>Với mức dùng của bạn</span>
            <b>≈ {fmtVnd(monthlyCost(plan, minutes, period))}/tháng</b>
          </div>
          <div className={styles.fitBar}>
            <span className={styles.fitFill} style={{ width: `${Math.min(100, (minutes / plan.minutes) * 100)}%` }} />
            {overBy ? <span className={styles.fitCap} /> : null}
          </div>
          <span className={styles.fitSub}>
            {overBy
              ? `Dự kiến vượt ${fmtCount(overBy)} phút · +${fmtVnd(overBy * plan.overage_vnd_per_minute)}`
              : `${fmtCount(minutes)} / ${fmtCount(plan.minutes)} phút`}
          </span>
        </div>
        <Perks plan={plan} />
        <div className={styles.planActs}>
          <Button fullWidth variant={variant} disabled={disabled} onClick={() => choose(plan.id)}>
            {label}
          </Button>
          {isBooked ? (
            <button type="button" className={styles.link} onClick={cancelBooked} disabled={cancelBusy}>
              {cancelBusy ? 'Đang huỷ…' : 'Huỷ hẹn đổi gói'}
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <>
      <a className={styles.back} href={appHref('cai-dat')}>
        <Icon name="chevron-left" size={16} />
        Cài đặt
      </a>
      <div className={styles.head}>
        <h1 className={ui.pageTitle}>Gói dịch vụ</h1>
        <span className={styles.spacer} />
        <Segmented
          value={period}
          onChange={setPeriodPick}
          ariaLabel="Cách trả"
          options={[
            { value: 'monthly', label: 'Theo tháng' },
            {
              value: 'annual',
              label: (
                <>
                  Theo năm <span className={styles.save}>−15%</span>
                </>
              ),
            },
          ]}
        />
      </div>

      <div className={styles.strip}>
        <span className={styles.stripMark} aria-hidden="true">
          <Icon name="hours" size={18} />
        </span>
        <span className={styles.stripText}>
          <span className={styles.stripTitle}>Kỳ này đã dùng {fmtCount(meter.used)} phút</span>
          <span className={styles.stripSub}>
            {meter.projected != null ? `Dự kiến ${fmtCount(meter.projected)} phút cả kỳ · ` : ''}làm mới {dm(sub.renews_on)}
          </span>
        </span>
        <div className={styles.stripBar}>
          <MeterBar meter={meter} usage={overview.usage} plan={current} />
        </div>
        <span className={styles.stripSub}>
          Gói {PLAN_NAME[current.id]} · {fmtCount(current.minutes)} phút
        </span>
      </div>

      <div className={styles.grid}>{plans.map(card)}</div>

      <Card className={styles.compare}>
        {/* The whole strip opens the table, not only the words at its end (§15). */}
        <h3 className={styles.compareHead}>
          <button
            type="button"
            className={styles.compareToggle}
            onClick={() => setCompare((c) => !c)}
            aria-expanded={compare}
            aria-controls="so-sanh-chi-tiet"
          >
            <span className={ui.cardTitle}>So sánh chi tiết</span>
            <span className={styles.compareHint}>
              {compare ? 'Thu gọn' : 'Mở bảng'}
              <span className={`${styles.compareCaret} ${compare ? styles.compareCaretOpen : ''}`} aria-hidden="true">
                <Icon name="chevron-down" size={16} />
              </span>
            </span>
          </button>
        </h3>
        {compare ? (
          <div id="so-sanh-chi-tiet" className={styles.compareBody}>
            <div className={styles.matrixWrap}>
              <div className={styles.matrix} role="table" aria-label="So sánh các gói">
                <div className={`${styles.mRow} ${styles.mHead}`} role="row">
                  <span role="columnheader" />
                  <span role="columnheader" className={styles.mCell}>
                    Dùng thử
                  </span>
                  {plans.map((p) => (
                    <span key={p.id} role="columnheader" className={`${styles.mCell} ${p.id === sub.plan_id ? styles.mCur : ''}`}>
                      {PLAN_NAME[p.id]}
                      {p.id === sub.plan_id ? <span className={styles.mHeadSub}>Gói của bạn</span> : null}
                    </span>
                  ))}
                </div>
                {COMPARISON_MATRIX.map((row, i) =>
                  row.kind === 'group' ? (
                    <div key={`${row.label}-${i}`} className={`${styles.mRow} ${styles.mGroup}`} role="row">
                      <span role="rowheader" className={styles.mGroupLabel}>
                        {row.label}
                      </span>
                      {/* Empty cells, so the owner's column runs unbroken through the group's row. */}
                      <span aria-hidden="true" />
                      {plans.map((p) => (
                        <span key={p.id} aria-hidden="true" className={p.id === sub.plan_id ? styles.mCur : undefined} />
                      ))}
                    </div>
                  ) : (
                    <div key={`${row.label}-${i}`} className={styles.mRow} role="row">
                      <span role="rowheader" className={styles.mLabel}>
                        {row.label}
                      </span>
                      <MatrixCell value={row.cells[0]} />
                      {plans.map((p) => (
                        <MatrixCell
                          key={p.id}
                          value={FROM_PLAN[row.label]?.(p) ?? row.cells[MATRIX_COLUMN[p.id]]}
                          current={p.id === sub.plan_id}
                        />
                      ))}
                    </div>
                  ),
                )}
              </div>
            </div>
            <p className={styles.mFoot}>{MATRIX_FOOTNOTE}</p>
          </div>
        ) : null}
      </Card>

      {open && target && (done || changeable) ? (
        <PanelFrame variant={phone ? 'sheet' : 'drawer'} title="Đổi gói" onClose={close}>
          {done ? (
            <div className={styles.ck}>
              <span className={styles.doneMark}>
                <Icon name="check" size={26} />
              </span>
              <h3 className={styles.doneTitle}>{done.title}</h3>
              <p className={styles.doneSub}>{done.sub}</p>
              <div className={styles.ckActs}>
                <Button fullWidth onClick={() => navigateApp('cai-dat')}>
                  Về Cài đặt
                </Button>
                <Button fullWidth variant="ghost" onClick={close}>
                  Xem các gói
                </Button>
              </div>
            </div>
          ) : (
            <PlanChange key={`${target.id}|${period}`} overview={overview} plans={plans} target={target} period={period} onChanged={onChanged} onClose={close} />
          )}
        </PanelFrame>
      ) : null}
    </>
  )
}

function PlanChange({
  overview,
  plans,
  target,
  period,
  onChanged,
  onClose,
}: {
  overview: AccountOverview
  plans: Plan[]
  target: Plan
  period: BillingPeriod
  onChanged: (next: Subscription, quote: PlanQuote, plan: Plan) => void
  onClose: () => void
}) {
  const [quote, setQuote] = useState<PlanQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setQuote(null)
    setQuoteError(null)
    api.account
      .quotePlan({ plan_id: target.id, period }, { signal: ac.signal })
      .then(setQuote)
      .catch((e: unknown) => {
        if (!isCanceled(e)) setQuoteError(messageFor(e))
      })
    return () => ac.abort()
  }, [target.id, period, attempt])

  const sub = overview.subscription
  const cur = plans.find((p) => p.id === sub.plan_id) ?? target
  const same = target.id === cur.id
  const up = PLAN_ORDER.indexOf(target.id) > PLAN_ORDER.indexOf(cur.id)
  const minutes = monthMinutes(overview.usage)
  const today = addDays(overview.usage.start, Math.max(0, overview.usage.by_day.length - 1))
  const daysLeft = daysInclusive(today, overview.usage.end)
  const name = PLAN_NAME[target.id]
  const per = (p: BillingPeriod) => (p === 'annual' ? 'năm' : 'tháng')

  const diffs: { icon: IconName; text: string }[] = []
  if (same) {
    diffs.push(
      period === 'annual'
        ? { icon: 'arrow-up', text: `Bớt ${fmtVnd((cur.price_monthly_vnd - cur.price_annual_per_month_vnd) * 12)} mỗi năm` }
        : { icon: 'minus', text: `Trả từng tháng, ${fmtVnd(cur.price_monthly_vnd)} mỗi tháng` },
    )
  } else {
    const dMin = target.minutes - cur.minutes
    // A move up that starts today brings the whole new allowance, not a share of it — say so.
    const fullNow = quote?.applies === 'now' ? ` — đủ ${fmtCount(target.minutes)} phút ngay kỳ này` : ''
    diffs.push({ icon: dMin > 0 ? 'arrow-up' : 'minus', text: `${dMin > 0 ? '+' : '−'}${fmtCount(Math.abs(dMin))} phút mỗi tháng${fullNow}` })
    diffs.push({ icon: up ? 'arrow-up' : 'minus', text: `${target.numbers} số máy · ${target.concurrent_calls} cuộc gọi cùng lúc` })
    if (target.own_voice !== cur.own_voice)
      diffs.push(target.own_voice ? { icon: 'arrow-up', text: 'Có giọng nói riêng' } : { icon: 'minus', text: 'Không còn giọng nói riêng — lễ tân dùng giọng trong kho' })
    if (target.account_manager !== cur.account_manager)
      diffs.push(target.account_manager ? { icon: 'arrow-up', text: 'Có người quản lý tài khoản riêng' } : { icon: 'minus', text: 'Không còn người quản lý tài khoản riêng' })
    if (!up && sub.numbers_used > target.numbers)
      diffs.push({ icon: 'alert', text: `Gói này có ${target.numbers} số máy — phòng khám đang dùng ${sub.numbers_used}` })
    else if (!up && sub.numbers_used) diffs.push({ icon: 'check', text: `${sub.numbers_used} số máy đang dùng vẫn giữ nguyên` })
  }
  // The same estimate the plan's card printed — nothing new appears at the button (§13).
  const overBy = Math.max(0, minutes - target.minutes)
  diffs.push({
    icon: 'info',
    text: `Với mức dùng của bạn, khoảng ${fmtVnd(monthlyCost(target, minutes, period))} mỗi tháng${overBy ? ` — dự kiến vượt ${fmtCount(overBy)} phút` : ''}`,
  })

  const confirm = async () => {
    if (!quote || busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await api.account.changePlan({ plan_id: target.id, period })
      onChanged(next, quote, target)
    } catch (e) {
      setError(messageFor(e))
      setBusy(false)
    }
  }

  const confirmLabel = same ? (period === 'annual' ? 'Chuyển sang trả năm' : 'Chuyển sang trả tháng') : up ? `Nâng lên ${name}` : `Chuyển xuống ${name}`

  return (
    <div className={styles.ck}>
      <div className={styles.swap}>
        <div className={styles.swapSide}>
          <span className={styles.swapLabel}>Đang dùng</span>
          <span className={styles.swapName}>{PLAN_NAME[cur.id]}</span>
          <span className={styles.swapSub}>
            {fmtVnd(sub.period === 'annual' ? cur.price_annual_vnd : cur.price_monthly_vnd)}/{per(sub.period)}
          </span>
        </div>
        <span className={styles.swapArrow} aria-hidden="true">
          <Icon name="arrow-right" size={20} />
        </span>
        <div className={`${styles.swapSide} ${styles.swapNew}`}>
          <span className={styles.swapLabel}>{period === 'annual' ? 'Trả năm' : 'Trả tháng'}</span>
          <span className={styles.swapName}>{name}</span>
          <span className={styles.swapSub}>
            {fmtVnd(period === 'annual' ? target.price_annual_vnd : target.price_monthly_vnd)}/{per(period)}
          </span>
        </div>
      </div>

      <div className={styles.sect}>
        <span className={styles.sectLabel}>Thay đổi</span>
        {diffs.map((d, i) => (
          <span key={i} className={styles.diff}>
            <Icon name={d.icon} size={18} />
            <span>{d.text}</span>
          </span>
        ))}
      </div>

      {quote ? (
        <>
          <div className={styles.sect}>
            <span className={styles.sectLabel}>Khi nào, trả thế nào</span>
            <div className={styles.kv}>
              <Icon name="calendar" size={20} />
              <span className={styles.kvText}>
                <span className={styles.kvMain}>{quote.applies === 'now' ? 'Ngay hôm nay' : `Từ ${dm(quote.effective_on)}`}</span>
                <span className={styles.kvSub}>
                  {quote.applies === 'now'
                    ? `Phần chênh cho ${daysLeft} ngày còn lại của kỳ`
                    : quote.effective_on !== sub.renews_on && sub.held_until
                      ? `Vừa nâng gói nên gói ${PLAN_NAME[cur.id]} được giữ đến hết ${dm(sub.held_until)}`
                      : `Đến lúc đó vẫn là gói ${PLAN_NAME[cur.id]}, ${sub.period === 'annual' ? 'trả năm' : 'trả tháng'}`}
                </span>
              </span>
            </div>
            {quote.held_until ? (
              // Said before the button: after a move up, a move down waits for the end of the next full cycle (D3).
              <div className={styles.kv}>
                <Icon name="info" size={20} />
                <span className={styles.kvText}>
                  <span className={styles.kvMain}>Giữ gói {name} ít nhất đến hết {dm(quote.held_until)}</span>
                  <span className={styles.kvSub}>Muốn chuyển xuống thì sớm nhất từ {dm(addDays(quote.held_until, 1))}</span>
                </span>
              </div>
            ) : null}
            <div className={styles.kv}>
              <Icon name={payIcon(overview.pay_method)} size={20} />
              <span className={styles.kvText}>
                <span className={styles.kvMain}>Trả bằng {payInSentence(overview.pay_method)}</span>
              </span>
            </div>
          </div>

          <div className={styles.total}>
            <span className={styles.totalLabel}>{quote.applies === 'now' ? 'Hôm nay' : `Ngày ${dm(quote.effective_on)}`}</span>
            <span className={styles.totalSub}>
              {quote.applies === 'now'
                ? `rồi ${fmtVnd(quote.next_charge_vnd)}/tháng từ ${dm(sub.renews_on)}`
                : period === 'annual'
                  ? 'một lần cho 12 tháng'
                  : 'mỗi tháng'}
            </span>
            <span className={styles.totalNum}>{fmtVnd(quote.applies === 'now' ? quote.charge_today_vnd : quote.next_charge_vnd)}</span>
          </div>

          {error ? (
            <span className={styles.errorText} role="alert">
              {error}
            </span>
          ) : null}
          <div className={styles.ckActs}>
            <Button fullWidth onClick={confirm} disabled={busy}>
              {busy ? 'Đang đổi gói…' : confirmLabel}
            </Button>
            <Button fullWidth variant="ghost" onClick={onClose} disabled={busy}>
              Thôi
            </Button>
          </div>
        </>
      ) : quoteError ? (
        <div className={styles.sect}>
          <span className={styles.errorText} role="alert">
            {quoteError}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Thử lại
          </Button>
        </div>
      ) : (
        <span className={styles.loading}>Đang tính số tiền…</span>
      )}
    </div>
  )
}
