import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api, isCanceled, messageFor } from '../../../api'
import type { CalendarConnection, CalendarProvider } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { GoogleMark, MicrosoftMark } from '../../../design-system/BrandMarks'
import { PHONE_BREAKPOINT, useIsNarrow } from '../../../hooks/useIsNarrow'
import { AnchoredPopup, useAnchoredPopup, useToast } from '../../ui'
import { PanelFrame } from '../numbers/parts'
import styles from './CalendarConnect.module.css'

/*
 * "Kết nối lịch" in the Lịch hẹn head: copy the receptionist's bookings to the
 * calendar the owner already lives in — Google Lịch or Microsoft Outlook.
 *
 * It lives on the calendar page rather than in Cài đặt because that is where the
 * question comes up ("can I see these on my phone's calendar?"), and it opens
 * where it was pressed: a pop-up under the button, a sheet on a phone. Connecting
 * is the provider's consent screen in live mode; the mock connects at once.
 */

const PROVIDERS: readonly { id: CalendarProvider; name: string }[] = [
  { id: 'google', name: 'Google Lịch' },
  { id: 'microsoft', name: 'Microsoft Outlook' },
]

const nameOf = (p: CalendarProvider) => PROVIDERS.find((x) => x.id === p)?.name ?? ''

function Mark({ provider, size }: { provider: CalendarProvider; size: number }) {
  return provider === 'google' ? <GoogleMark size={size} /> : <MicrosoftMark size={size} />
}

/*
 * The consent screen returns to `#/app/lich-hen`, and a refusal comes back as
 * the `calendar_denied` code (api-contract §9). It is read as `error=` from
 * either query — before the hash, or after the route inside it — and removed
 * once read, so a reload does not report it again. The route does not change,
 * so this is `replaceState`, not a navigation.
 */
function takeConsentRefusal(): boolean {
  const { pathname, search, hash } = window.location
  const [route, hashQuery = ''] = hash.split('?')
  const outer = new URLSearchParams(search)
  const inner = new URLSearchParams(hashQuery)
  if (outer.get('error') !== 'calendar_denied' && inner.get('error') !== 'calendar_denied') return false
  outer.delete('error')
  inner.delete('error')
  const query = (p: URLSearchParams) => (p.toString() ? `?${p}` : '')
  window.history.replaceState(window.history.state, '', `${pathname}${query(outer)}${route}${query(inner)}`)
  return true
}

export function CalendarConnect({ agent }: { agent: string }) {
  const phone = useIsNarrow(PHONE_BREAKPOINT)
  const { toast } = useToast()
  const [links, setLinks] = useState<CalendarConnection[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<CalendarProvider | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const { place, panelRef } = useAnchoredPopup(triggerRef, open && !phone, close, { width: 340, height: 260 })

  useEffect(() => {
    const ac = new AbortController()
    api.appointments
      .calendars({ signal: ac.signal })
      .then(setLinks)
      .catch((e: unknown) => {
        if (!isCanceled(e)) setLinks([])
      })
    return () => ac.abort()
  }, [])

  // Back from a provider that was refused: say so. "Kết nối lịch" is beside it to try again.
  // The return is a page load; `hashchange` also catches one landing on this page while open.
  useEffect(() => {
    const report = () => {
      if (takeConsentRefusal()) toast(messageFor(new ApiError({ kind: 'forbidden', code: 'calendar_denied' })), 'error')
    }
    report()
    window.addEventListener('hashchange', report)
    return () => window.removeEventListener('hashchange', report)
  }, [toast])

  const connect = async (provider: CalendarProvider) => {
    setBusy(provider)
    try {
      const r = await api.appointments.connectCalendar(provider)
      if (r.redirect_url) {
        window.location.assign(r.redirect_url)
        return
      }
      const c = r.connection
      if (c) {
        setLinks((l) => [...l.filter((x) => x.provider !== provider), c])
        toast(`Đã kết nối ${nameOf(provider)}. Lịch hẹn mới sẽ hiện trên lịch của bạn.`)
      }
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async (provider: CalendarProvider) => {
    setBusy(provider)
    try {
      await api.appointments.disconnectCalendar(provider)
      setLinks((l) => l.filter((x) => x.provider !== provider))
      toast(`Đã ngắt kết nối ${nameOf(provider)}.`, 'neutral')
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const first = links[0]

  const body = (
    <div className={styles.body}>
      <span className={styles.lede}>Lịch hẹn {agent} đặt tự hiện trên lịch bạn chọn.</span>
      <div className={styles.list}>
        {PROVIDERS.map((p) => {
          const link = links.find((l) => l.provider === p.id)
          return (
            <div key={p.id} className={styles.row}>
              <span className={styles.mark}>
                <Mark provider={p.id} size={20} />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.sub}>{link ? link.account_email : 'Chưa kết nối'}</span>
              </span>
              {link ? (
                <button type="button" className={styles.link} onClick={() => void disconnect(p.id)} disabled={busy != null}>
                  {busy === p.id ? 'Đang ngắt…' : 'Ngắt kết nối'}
                </button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => void connect(p.id)} disabled={busy != null}>
                  {busy === p.id ? 'Đang kết nối…' : 'Kết nối'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={first ? `Đang đồng bộ với ${nameOf(first.provider)}` : 'Kết nối lịch'}
      >
        {first ? <Mark provider={first.provider} size={16} /> : <Icon name="calendar" size={16} />}
        <span className={styles.triggerLabel}>{first ? 'Đang đồng bộ lịch' : 'Kết nối lịch'}</span>
      </button>

      {open && !phone && place ? (
        <AnchoredPopup place={place} panelRef={panelRef} label="Kết nối lịch" className={styles.popup}>
          <span className={styles.title}>Kết nối lịch</span>
          {body}
        </AnchoredPopup>
      ) : null}

      {open && phone ? (
        <PanelFrame variant="sheet" title="Kết nối lịch" onClose={close}>
          <div className={styles.sheetBody}>{body}</div>
        </PanelFrame>
      ) : null}
    </>
  )
}
