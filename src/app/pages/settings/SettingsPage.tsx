import { useCallback, useEffect, useState } from 'react'
import { api, isCanceled, messageFor } from '../../../api'
import type { AccountOverview, AccountProfile, Plan } from '../../../api'
import { useSession } from '../../../auth/SessionProvider'
import { RAIL_BREAKPOINT, useIsNarrow } from '../../../hooks/useIsNarrow'
import { ContentSkeleton, RetryCard } from '../../Boot'
import { ui } from '../../ui'
import { useConfig } from '../../letan/store'
import { AccountCard } from './AccountCard'
import { BillingCard } from './BillingCard'
import { DataCard } from './DataCard'
import { PlanPanel } from './PlanPanel'
import { SecurityCard } from './SecurityCard'
import styles from './Settings.module.css'

/*
 * `#/app/cai-dat` — Cài đặt. Reached from the user menu, not the nav: it is the
 * owner's account, opened a few times a year, and the sidebar is for the clinic's
 * day. `#/app/cai-dat/{section}` opens scrolled to one card, so another page can
 * point at, say, the invoice details.
 *
 * There is no page index. One was drawn under the plan (and as a chip row on narrow
 * screens); the owner took it out on 14 Sept 2026 — no other screen has one, and
 * four cards on one scroll do not need it.
 *
 * One read for the whole page (`GET /account`) and the plan catalogue beside it.
 * Nothing outside this page and Gói dịch vụ reads the account, so it calls
 * `api.account` directly (CLAUDE.md). The name and the login number are the one
 * exception: the sidebar shows them, so a change is written into the session too.
 */

const SECTIONS = ['tai-khoan', 'thanh-toan', 'bao-mat', 'du-lieu'] as const

export function SettingsPage({ path }: { path: string[] }) {
  const wide = !useIsNarrow(RAIL_BREAKPOINT)
  const { config } = useConfig()
  const { patchMe } = useSession()
  const [data, setData] = useState<{ overview: AccountOverview; plans: Plan[] } | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)

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

  const patch = useCallback((fn: (o: AccountOverview) => AccountOverview) => {
    setData((d) => (d ? { ...d, overview: fn(d.overview) } : d))
  }, [])

  const method = data?.overview.method
  const onProfile = useCallback(
    (profile: AccountProfile) => {
      patch((o) => ({ ...o, profile }))
      patchMe({ display_name: profile.display_name, ...(method === 'phone' ? { identity: profile.phone } : {}) })
    },
    [patch, patchMe, method],
  )

  // A link to `#/app/cai-dat/{section}` lands on that card once the page has loaded.
  const loaded = data != null
  const linked = SECTIONS.find((s) => s === path[0]) ?? null
  useEffect(() => {
    if (!loaded || !linked) return
    const el = document.getElementById(linked)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' })
  }, [loaded, linked])

  if (!data && loadError) {
    return <RetryCard title="Chưa tải được cài đặt" body={messageFor(loadError)} onRetry={() => setAttempt((n) => n + 1)} />
  }
  if (!data) return <ContentSkeleton />

  const { overview, plans } = data
  const agent = config.agent_name.trim() || 'Lễ tân'
  const clinic = config.business_name.trim()
  const shared = { overview, editing, setEditing, patch }

  const cards = (
    <div className={styles.col}>
      <AccountCard id="tai-khoan" {...shared} clinic={clinic} onProfile={onProfile} />
      <BillingCard id="thanh-toan" {...shared} />
      <SecurityCard id="bao-mat" {...shared} agent={agent} />
      <DataCard id="du-lieu" {...shared} clinic={clinic} agent={agent} />
    </div>
  )
  const panel = <PlanPanel overview={overview} plans={plans} agent={agent} />

  return (
    <>
      <div className={styles.head}>
        <h1 className={ui.pageTitle}>Cài đặt</h1>
      </div>

      {wide ? (
        <div className={styles.work}>
          {cards}
          <aside className={styles.rail} aria-label="Gói và phút">
            <div className={styles.railStack}>{panel}</div>
          </aside>
        </div>
      ) : (
        <div className={styles.stack}>
          {panel}
          {cards}
        </div>
      )}
    </>
  )
}
