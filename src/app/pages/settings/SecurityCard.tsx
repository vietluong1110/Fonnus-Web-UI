import { useState } from 'react'
import { api, messageFor } from '../../../api'
import type { AccountSession } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { GoogleMark } from '../../../design-system/BrandMarks'
import { Card, TextField, useAppear, useToast } from '../../ui'
import { DEVICE_ICON, dmy, fmtMobile, lastSeen, sessionName } from './labels'
import { EditActions, LinkButton, RowBand, RowMain, RowSub, SettingRow, useRowEdit } from './SettingRow'
import type { SectionProps } from './SettingRow'
import styles from './Settings.module.css'

/*
 * How the owner signs in, said as a fact, and who else is signed in.
 * A password row exists only for an email account: a phone account signs in
 * with a code, a Google account with Google, and neither has a password to
 * change. Signing out every other device keeps this one — and it works on a
 * phone, where an owner is most likely to need it.
 */

function strength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0
  if (pw.length < 8) return 1
  return pw.length >= 10 && /\d/.test(pw) && /[a-zA-Z]/.test(pw) ? 3 : 2
}

const STRENGTH = ['Ít nhất 8 ký tự', 'Còn ngắn', 'Được', 'Mạnh']

export function SecurityCard({ id, overview, editing, setEditing, patch, agent }: SectionProps & { agent: string }) {
  const { toast } = useToast()
  const row = useRowEdit(editing, setEditing)
  const [confirmOut, setConfirmOut] = useState(false)
  const [outBusy, setOutBusy] = useState<string | null>(null)
  const method = overview.method
  const p = overview.profile
  const sessions = overview.sessions
  const others = sessions.filter((s) => !s.current)
  const list = useAppear(sessions.map((s) => s.id))

  const remove = (sid: string) => list.leave(sid, () => patch((o) => ({ ...o, sessions: o.sessions.filter((x) => x.id !== sid) })))

  const signOutOne = async (s: AccountSession) => {
    setOutBusy(s.id)
    try {
      await api.account.signOutSession(s.id)
      remove(s.id)
      toast(`Đã đăng xuất ${sessionName(s)}.`, 'neutral')
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setOutBusy(null)
    }
  }

  const signOutOthers = async () => {
    setOutBusy('all')
    try {
      await api.account.signOutOthers()
      setConfirmOut(false)
      others.forEach((s) => remove(s.id))
      toast(`Đã đăng xuất ${others.length} thiết bị khác.`, 'neutral')
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setOutBusy(null)
    }
  }

  const savePassword = () =>
    row.run(async () => {
      const current = row.draft.current ?? ''
      const next = row.draft.next ?? ''
      if (!current) return row.fail('Nhập mật khẩu hiện tại.')
      if (next.length < 8) return row.fail('Mật khẩu mới cần ít nhất 8 ký tự.')
      await api.account.changePassword({ current, next })
      patch((o) => ({ ...o, password_changed_at: new Date().toISOString() }))
      row.close()
      others.forEach((s) => remove(s.id))
      toast('Đã đổi mật khẩu. Các thiết bị khác phải đăng nhập lại.')
    })

  const methodIcon = (size: number) => (method === 'google' ? <GoogleMark /> : <Icon name={method === 'email' ? 'key' : 'message'} size={size} />)
  const methodMain = { phone: 'Mã gửi qua SMS', email: 'Email và mật khẩu', google: 'Tài khoản Google' }[method]
  const methodSub =
    method === 'phone' ? `Tới ${fmtMobile(p.phone)} · không cần mật khẩu` : method === 'email' ? (p.email ?? '') : `${p.google_email ?? ''} · mật khẩu do Google giữ`
  const reLogin = {
    phone: 'Ai đang dùng các máy đó phải nhập mã SMS lại',
    email: 'Ai đang dùng các máy đó phải nhập mật khẩu lại',
    google: 'Ai đang dùng các máy đó phải đăng nhập Google lại',
  }[method]
  const level = strength(row.draft.next ?? '')

  return (
    <Card id={id} title="Bảo mật">
      <div className={styles.rows}>
        <SettingRow icon={methodIcon(20)} label="Đăng nhập">
          <RowMain>{methodMain}</RowMain>
          <RowSub>{methodSub}</RowSub>
        </SettingRow>

        {method === 'email' ? (
          <SettingRow
            icon="privacy"
            label="Mật khẩu"
            editing={row.is('password')}
            action={<LinkButton onClick={() => row.open('password', { current: '', next: '' })}>Đổi mật khẩu</LinkButton>}
            edit={
              <>
                <TextField
                  label="Mật khẩu hiện tại"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={row.draft.current ?? ''}
                  onChange={(e) => row.set('current', e.target.value)}
                />
                <div className={styles.fieldStack}>
                  <TextField label="Mật khẩu mới" type="password" autoComplete="new-password" value={row.draft.next ?? ''} onChange={(e) => row.set('next', e.target.value)} />
                  <div className={styles.strength} aria-live="polite">
                    <span className={styles.strengthBar} aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={`${styles.strengthSeg} ${level >= n ? styles.strengthOn : ''}`} />
                      ))}
                    </span>
                    <span className={styles.sub}>{STRENGTH[level]}</span>
                  </div>
                </div>
                <EditActions busy={row.busy} onSave={savePassword} onCancel={row.close} saveLabel="Đổi mật khẩu" error={row.error} />
              </>
            }
          >
            <RowMain>Đã đặt mật khẩu</RowMain>
            <RowSub>{overview.password_changed_at ? `Đổi lần cuối ${dmy(overview.password_changed_at.slice(0, 10))}` : 'Chưa đổi lần nào'}</RowSub>
          </SettingRow>
        ) : null}
      </div>

      <RowBand
        label="Đang đăng nhập"
        count={sessions.length}
        action={
          others.length ? (
            <LinkButton
              onClick={() => {
                setEditing(null)
                setConfirmOut(true)
              }}
            >
              Đăng xuất thiết bị khác
            </LinkButton>
          ) : null
        }
      />

      {confirmOut && others.length ? (
        <div className={styles.confirm}>
          <span className={styles.confirmTitle}>Đăng xuất {others.length} thiết bị khác?</span>
          <span className={styles.confirmLine}>
            {methodIcon(18)}
            <span>{reLogin}</span>
          </span>
          <span className={styles.confirmLine}>
            <Icon name="answered" size={18} />
            <span>{agent} vẫn nghe máy bình thường</span>
          </span>
          <div className={styles.actions}>
            <Button size="sm" onClick={signOutOthers} disabled={outBusy === 'all'}>
              {outBusy === 'all' ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmOut(false)} disabled={outBusy === 'all'}>
              Thôi
            </Button>
          </div>
        </div>
      ) : null}

      <div className={styles.devices}>
        {sessions.map((s) => (
          <div key={s.id} ref={list.ref(s.id)} className={styles.device}>
            <span className={styles.deviceMark} aria-hidden="true">
              <Icon name={DEVICE_ICON[s.device]} size={18} />
            </span>
            <span className={styles.deviceText}>
              <span className={styles.deviceName}>{sessionName(s)}</span>
              <span className={styles.sub}>{[s.city, lastSeen(s)].filter(Boolean).join(' · ')}</span>
            </span>
            {s.current ? (
              <span className={styles.thisPill}>Thiết bị này</span>
            ) : (
              <LinkButton quiet onClick={() => signOutOne(s)} disabled={outBusy != null}>
                Đăng xuất
              </LinkButton>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
