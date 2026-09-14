import { useState } from 'react'
import { api, messageFor } from '../../../api'
import type { AccountProfile } from '../../../api'
import { isValidEmail, normalizePhone } from '../../../auth/phone'
import { Button, Icon } from '../../../design-system'
import { GoogleMark } from '../../../design-system/BrandMarks'
import { appHref } from '../../../hooks/useRoute'
import { Card, TextField, useToast } from '../../ui'
import { fmtMobile } from './labels'
import { EditActions, LinkButton, RowMain, RowSub, SettingRow, onEnter, useRowEdit } from './SettingRow'
import type { SectionProps } from './SettingRow'
import styles from './Settings.module.css'

/*
 * Who the owner is. The login number changes only through a code sent to the
 * new number; the email wears the dashed edge when it is missing, because it is
 * the way back in if the SIM is lost; the clinic's name is read here and edited
 * in Lễ tân, where it already lives — one fact, one place.
 */

export function AccountCard({
  id,
  overview,
  editing,
  setEditing,
  clinic,
  onProfile,
}: SectionProps & { clinic: string; onProfile: (p: AccountProfile) => void }) {
  const { toast } = useToast()
  const row = useRowEdit(editing, setEditing)
  const [stage, setStage] = useState<'number' | 'code'>('number')
  const [googleBusy, setGoogleBusy] = useState(false)
  const p = overview.profile
  const method = overview.method

  const saveName = () =>
    row.run(async () => {
      const name = (row.draft.name ?? '').trim()
      if (!name) return row.fail('Tên không được để trống.')
      onProfile(await api.account.updateProfile({ display_name: name }))
      row.close()
      toast('Đã lưu tên.')
    })

  const openPhone = () => {
    setStage('number')
    row.open('phone', { phone: '', code: '' })
  }

  const sendCode = () =>
    row.run(async () => {
      const digits = normalizePhone(row.draft.phone ?? '')
      if (!/^0\d{9}$/.test(digits)) return row.fail('Số di động gồm 10 chữ số, bắt đầu bằng 0.')
      await api.account.requestPhoneChange(digits)
      row.set('phone', digits)
      setStage('code')
    })

  const confirmPhone = () =>
    row.run(async () => {
      const code = (row.draft.code ?? '').replace(/\D/g, '')
      if (code.length !== 6) return row.fail('Mã gồm 6 chữ số.')
      const next = await api.account.confirmPhoneChange({ phone: row.draft.phone ?? '', code })
      onProfile(next)
      row.close()
      toast(method === 'phone' ? `Lần sau đăng nhập bằng số ${fmtMobile(next.phone)}.` : 'Đã đổi số di động.')
    })

  const saveEmail = () =>
    row.run(async () => {
      const email = (row.draft.email ?? '').trim()
      if (!isValidEmail(email)) return row.fail('Email chưa đúng — VD: ten@phongkham.vn')
      onProfile(await api.account.updateProfile({ email }))
      row.close()
      toast(`Đã gửi thư xác nhận tới ${email}.`)
    })

  const link = async () => {
    setGoogleBusy(true)
    try {
      const r = await api.account.linkGoogle()
      if (r.redirect_url) {
        window.location.assign(r.redirect_url)
        return
      }
      onProfile(r.profile)
      toast(`Đã liên kết Google ${r.profile.google_email ?? ''}.`)
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setGoogleBusy(false)
    }
  }

  const unlink = async () => {
    setGoogleBusy(true)
    try {
      onProfile(await api.account.unlinkGoogle())
      toast('Đã huỷ liên kết Google.', 'neutral')
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <Card id={id} title="Tài khoản">
      <div className={styles.rows}>
        <SettingRow
          icon="caller"
          label="Họ tên"
          editing={row.is('name')}
          action={<LinkButton onClick={() => row.open('name', { name: p.display_name })}>Sửa</LinkButton>}
          edit={
            <>
              <TextField
                aria-label="Họ tên"
                autoComplete="name"
                maxLength={80}
                autoFocus
                value={row.draft.name ?? ''}
                onChange={(e) => row.set('name', e.target.value)}
                onKeyDown={onEnter(saveName)}
                error={row.error ?? undefined}
              />
              <EditActions busy={row.busy} onSave={saveName} onCancel={row.close} />
            </>
          }
        >
          <RowMain>{p.display_name}</RowMain>
        </SettingRow>

        <SettingRow
          icon="answered"
          label="Di động"
          editing={row.is('phone')}
          action={<LinkButton onClick={openPhone}>Đổi số</LinkButton>}
          edit={
            stage === 'number' ? (
              <>
                <TextField
                  label="Số mới"
                  hint="Fonnus gửi mã xác nhận qua SMS tới số này."
                  inputMode="tel"
                  autoComplete="tel"
                  numeric
                  autoFocus
                  value={row.draft.phone ?? ''}
                  onChange={(e) => row.set('phone', e.target.value)}
                  onKeyDown={onEnter(sendCode)}
                  error={row.error ?? undefined}
                />
                <EditActions busy={row.busy} onSave={sendCode} onCancel={row.close} saveLabel="Gửi mã" busyLabel="Đang gửi…" />
              </>
            ) : (
              <>
                <TextField
                  label={
                    <>
                      Mã 6 số vừa gửi tới <span className={styles.num}>{fmtMobile(row.draft.phone ?? '')}</span>
                    </>
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  numeric
                  autoFocus
                  className={styles.codeField}
                  value={row.draft.code ?? ''}
                  onChange={(e) => row.set('code', e.target.value.replace(/\D/g, ''))}
                  onKeyDown={onEnter(confirmPhone)}
                  error={row.error ?? undefined}
                />
                <EditActions busy={row.busy} onSave={confirmPhone} onCancel={row.close} saveLabel="Xác nhận" busyLabel="Đang xác nhận…" />
              </>
            )
          }
        >
          <RowMain>
            <span className={styles.num}>{fmtMobile(p.phone)}</span>
            <span className={styles.verified}>
              <Icon name="check" size={14} />
              Đã xác minh
            </span>
          </RowMain>
          <RowSub>{method === 'phone' ? 'Dùng để đăng nhập' : 'Số liên hệ của bạn'}</RowSub>
        </SettingRow>

        <SettingRow
          icon="mail"
          label="Email"
          editing={row.is('email')}
          action={p.email && method !== 'google' ? <LinkButton onClick={() => row.open('email', { email: p.email ?? '' })}>Sửa</LinkButton> : null}
          edit={
            <>
              <TextField
                aria-label="Email"
                type="email"
                autoComplete="email"
                placeholder="ten@phongkham.vn"
                autoFocus
                value={row.draft.email ?? ''}
                onChange={(e) => row.set('email', e.target.value)}
                onKeyDown={onEnter(saveEmail)}
                error={row.error ?? undefined}
              />
              <EditActions busy={row.busy} onSave={saveEmail} onCancel={row.close} />
            </>
          }
        >
          {p.email ? (
            <>
              <RowMain>
                {p.email}
                {!p.email_verified ? <span className={styles.pending}>Chờ xác nhận</span> : null}
              </RowMain>
              <RowSub>{method === 'email' ? 'Dùng để đăng nhập' : method === 'google' ? 'Theo tài khoản Google' : 'Để vào lại tài khoản khi mất số'}</RowSub>
            </>
          ) : (
            <button type="button" className={styles.gap} onClick={() => row.open('email', { email: '' })}>
              Chưa có email — mất số thì không vào lại được
            </button>
          )}
        </SettingRow>

        <SettingRow
          icon={<GoogleMark />}
          label="Google"
          action={
            p.google_email ? (
              method !== 'google' ? (
                <LinkButton quiet onClick={unlink} disabled={googleBusy}>
                  Huỷ liên kết
                </LinkButton>
              ) : null
            ) : (
              <Button size="sm" variant="secondary" onClick={link} disabled={googleBusy}>
                {googleBusy ? 'Đang liên kết…' : 'Liên kết'}
              </Button>
            )
          }
        >
          {p.google_email ? (
            <>
              <RowMain>{p.google_email}</RowMain>
              <RowSub>{method === 'google' ? 'Cách bạn đăng nhập' : 'Đăng nhập một chạm'}</RowSub>
            </>
          ) : (
            <>
              <RowMain soft>Chưa liên kết</RowMain>
              <RowSub>Đăng nhập một chạm bằng tài khoản Google</RowSub>
            </>
          )}
        </SettingRow>

        <SettingRow
          icon="location"
          label="Phòng khám"
          action={
            <a className={`${styles.link} ${styles.linkQuiet}`} href={appHref('le-tan', 'ho-so', 'danh-tinh')}>
              Sửa ở Lễ tân
              <Icon name="chevron-right" size={14} />
            </a>
          }
        >
          {clinic ? <RowMain>{clinic}</RowMain> : <RowMain soft>Chưa đặt tên</RowMain>}
        </SettingRow>
      </div>
    </Card>
  )
}
