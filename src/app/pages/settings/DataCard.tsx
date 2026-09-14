import { useEffect, useState } from 'react'
import { api, messageFor } from '../../../api'
import { Button, Icon } from '../../../design-system'
import { Card, DeleteButton, TextField, useToast } from '../../ui'
import { clockDm, dmy, fmtMobile } from './labels'
import { LinkButton, RowMain, RowSub, SettingRow, downloadFile, sameName, useRowEdit } from './SettingRow'
import type { SectionProps } from './SettingRow'
import styles from './Settings.module.css'

/*
 * The owner's data: take it all home, or close the account.
 *
 * Deleting is last and quiet — a plain delete pill until pressed — and then it
 * says exactly what goes, in icons, before there is a button to press; typing
 * the clinic's name confirms, and there is a window to change one's mind. Same
 * bargain as giving a number back on Số điện thoại (§13).
 */

export function DataCard({ id, overview, editing, setEditing, patch, clinic, agent }: SectionProps & { clinic: string; agent: string }) {
  const { toast } = useToast()
  const row = useRowEdit(editing, setEditing)
  const [exportBusy, setExportBusy] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const ex = overview.export
  const preparing = ex.status === 'preparing'

  // The export is built on the server; the page asks after it rather than waiting on a socket.
  useEffect(() => {
    if (!preparing) return
    let alive = true
    const t = window.setInterval(() => {
      api.account
        .exportStatus()
        .then((next) => {
          if (!alive || next.status === 'preparing') return
          patch((o) => ({ ...o, export: next }))
          if (next.status === 'ready') toast('Bản tải về đã sẵn sàng.')
        })
        .catch(() => {
          /* the next tick asks again */
        })
    }, 2000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [preparing, patch, toast])

  const startExport = async () => {
    setExportBusy(true)
    try {
      const next = await api.account.startExport()
      patch((o) => ({ ...o, export: next }))
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setExportBusy(false)
    }
  }

  const schedule = () =>
    row.run(async () => {
      const r = await api.account.scheduleDeletion(row.draft.name ?? '')
      patch((o) => ({ ...o, deletion: r }))
      row.close()
      toast(`Đã hẹn xoá tài khoản vào ${dmy(r.scheduled_for)}.`, 'neutral')
    })

  const cancelDeletion = async () => {
    setCancelBusy(true)
    try {
      await api.account.cancelDeletion()
      patch((o) => ({ ...o, deletion: null }))
      toast('Đã huỷ xoá tài khoản.')
    } catch (e) {
      toast(messageFor(e), 'error')
    } finally {
      setCancelBusy(false)
    }
  }

  const numbers = overview.subscription.numbers_used
  const matches = sameName(row.draft.name ?? '', clinic)

  return (
    <Card id={id} title="Dữ liệu">
      <div className={styles.rows}>
        <SettingRow
          icon="download"
          label="Tải dữ liệu"
          action={
            ex.status === 'none' ? (
              <Button size="sm" variant="secondary" onClick={startExport} disabled={exportBusy}>
                {exportBusy ? 'Đang tạo…' : 'Tạo bản tải về'}
              </Button>
            ) : ex.status === 'ready' && ex.download_url ? (
              <Button size="sm" icon={<Icon name="download" size={16} />} onClick={() => downloadFile(ex.download_url ?? '')}>
                Tải về
              </Button>
            ) : null
          }
        >
          {ex.status === 'none' ? (
            <>
              <RowMain>Mọi thứ Fonnus giữ cho phòng khám</RowMain>
              <span className={styles.incl}>
                <span className={styles.inclItem}>
                  <Icon name="answered" size={14} />
                  Cuộc gọi, ghi âm
                </span>
                <span className={styles.inclItem}>
                  <Icon name="appointment" size={14} />
                  Lịch hẹn
                </span>
                <span className={styles.inclItem}>
                  <Icon name="caller" size={14} />
                  Cấu hình Lễ tân
                </span>
                <span className={styles.inclItem}>
                  <Icon name="document" size={14} />
                  Hoá đơn
                </span>
              </span>
            </>
          ) : preparing ? (
            <>
              <RowMain>Đang đóng gói…</RowMain>
              <RowSub>Xong sẽ gửi link về {overview.profile.email ?? fmtMobile(overview.profile.phone)}</RowSub>
              <span className={styles.creep} aria-hidden="true">
                <span className={styles.creepFill} />
              </span>
            </>
          ) : (
            <>
              <RowMain>Bản tải về đã sẵn sàng</RowMain>
              <RowSub>
                {ex.ready_at ? `Tạo lúc ${clockDm(ex.ready_at)}` : ''}
                {ex.expires_at ? ` · tải được đến ${dmy(ex.expires_at.slice(0, 10))}` : ''}
              </RowSub>
            </>
          )}
        </SettingRow>

        <SettingRow
          icon="trash"
          label="Xoá tài khoản"
          editing={row.is('delete')}
          action={
            overview.deletion ? (
              <Button size="sm" variant="secondary" onClick={cancelDeletion} disabled={cancelBusy}>
                {cancelBusy ? 'Đang huỷ…' : 'Huỷ xoá'}
              </Button>
            ) : (
              <DeleteButton label="Xoá" onClick={() => row.open('delete', { name: '' })} />
            )
          }
          edit={
            <div className={styles.confirm}>
              <span className={styles.confirmTitle}>Khi xoá tài khoản:</span>
              <span className={styles.confirmLine}>
                <Icon name="voice-off" size={18} />
                <span>{agent} ngừng nghe máy ngay</span>
              </span>
              {numbers ? (
                <span className={styles.confirmLine}>
                  <Icon name="incoming" size={18} />
                  <span>{numbers} số máy trở về kho, không giữ lại được</span>
                </span>
              ) : null}
              <span className={styles.confirmLine}>
                <Icon name="trash" size={18} />
                <span>Cuộc gọi, ghi âm và lịch hẹn xoá hẳn sau {overview.deletion_grace_days} ngày</span>
              </span>
              <span className={styles.confirmLine}>
                <Icon name="cash" size={18} />
                <span>Không hoàn tiền phần còn lại của kỳ</span>
              </span>
              {ex.status === 'none' ? (
                <LinkButton onClick={startExport} disabled={exportBusy}>
                  <Icon name="download" size={16} />
                  Tải dữ liệu về trước
                </LinkButton>
              ) : null}
              <TextField
                label={
                  <>
                    Gõ <b>{clinic}</b> để xác nhận
                  </>
                }
                autoComplete="off"
                autoFocus
                value={row.draft.name ?? ''}
                onChange={(e) => row.set('name', e.target.value)}
              />
              {row.error ? (
                <span className={styles.error} role="alert">
                  {row.error}
                </span>
              ) : null}
              <div className={styles.actions}>
                <button type="button" className={styles.danger} onClick={schedule} disabled={!matches || row.busy}>
                  {row.busy ? 'Đang xoá…' : 'Xoá tài khoản'}
                </button>
                <Button size="sm" variant="secondary" onClick={row.close} disabled={row.busy}>
                  Thôi, giữ lại
                </Button>
              </div>
            </div>
          }
        >
          {overview.deletion ? (
            <>
              <RowMain>Sẽ xoá vào {dmy(overview.deletion.scheduled_for)}</RowMain>
              <RowSub>Đổi ý trước ngày đó thì mọi thứ còn nguyên</RowSub>
            </>
          ) : (
            <>
              <RowMain>{clinic || 'Phòng khám của bạn'}</RowMain>
              <RowSub>Lễ tân, số máy và mọi cuộc gọi</RowSub>
            </>
          )}
        </SettingRow>
      </div>
    </Card>
  )
}
