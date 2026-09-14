import { api } from '../../../api'
import type { PayMethod } from '../../../api'
import { isValidEmail } from '../../../auth/phone'
import { Card, EmptyState, IconButton, TextField, Tile, TileGrid, useToast } from '../../ui'
import { PAY_METHODS } from '../numbers/labels'
import { dm, dmy, fmtTaxCode, fmtVnd, invoiceSub, invoiceWhat, payIcon, payInSentence, payLabel } from './labels'
import { EditActions, LinkButton, RowBand, RowMain, RowSub, SettingRow, downloadFile, useRowEdit } from './SettingRow'
import type { SectionProps } from './SettingRow'
import styles from './Settings.module.css'

/*
 * How the clinic pays, who the invoice is made out to, and the invoices.
 * The pay tiles are Số điện thoại's checkout tiles, so the choice reads the same
 * in both places; the invoice details are the ones that checkout uses.
 */

export function BillingCard({ id, overview, editing, setEditing, patch }: SectionProps) {
  const { toast } = useToast()
  const row = useRowEdit(editing, setEditing)
  const sub = overview.subscription
  const method = overview.pay_method
  const inv = overview.invoice_profile

  const savePay = () =>
    row.run(async () => {
      const next = (row.draft.pay as PayMethod | undefined) ?? method
      await api.account.setPayMethod(next)
      patch((o) => ({ ...o, pay_method: next }))
      row.close()
      toast(`Kỳ tới trả bằng ${payInSentence(next)}.`)
    })

  const openInvoice = () =>
    row.open('invoice', { legal: inv?.legal_name ?? '', tax: inv?.tax_code ?? '', address: inv?.address ?? '', email: inv?.email ?? '' })

  const saveInvoice = () =>
    row.run(async () => {
      const d = row.draft
      const legal = (d.legal ?? '').trim()
      const tax = (d.tax ?? '').replace(/\D/g, '')
      const email = (d.email ?? '').trim()
      if (!legal) return row.fail('Cần tên công ty in trên hoá đơn.')
      if (tax.length !== 10 && tax.length !== 13) return row.fail('Mã số thuế gồm 10 hoặc 13 chữ số.')
      if (email && !isValidEmail(email)) return row.fail('Email nhận hoá đơn chưa đúng.')
      const saved = await api.account.setInvoiceProfile({ legal_name: legal, tax_code: tax, address: (d.address ?? '').trim(), email })
      patch((o) => ({ ...o, invoice_profile: saved }))
      row.close()
      toast('Hoá đơn từ kỳ tới xuất theo thông tin này.')
    })

  const chosen = (row.draft.pay as PayMethod | undefined) ?? method

  return (
    <Card id={id} title="Thanh toán và hoá đơn">
      <div className={styles.rows}>
        <SettingRow
          icon={payIcon(method)}
          label="Cách trả"
          editing={row.is('pay')}
          action={<LinkButton onClick={() => row.open('pay', { pay: method })}>Đổi</LinkButton>}
          edit={
            <>
              <TileGrid min={120} radio ariaLabel="Cách trả">
                {PAY_METHODS.map((m) => (
                  <Tile key={m.id} icon={m.icon} label={m.label} single selected={chosen === m.id} onClick={() => row.set('pay', m.id)} />
                ))}
              </TileGrid>
              <EditActions busy={row.busy} onSave={savePay} onCancel={row.close} error={row.error} />
            </>
          }
        >
          <RowMain>{payLabel(method)}</RowMain>
          <RowSub>
            Kỳ tới <span className={styles.num}>{fmtVnd(sub.next_charge_vnd)}</span> vào {dm(sub.renews_on)} ·{' '}
            {method === 'vietqr' ? 'tự xác nhận khi tiền về' : 'qua cổng thanh toán'}
          </RowSub>
        </SettingRow>

        <SettingRow
          icon="document"
          label="Hoá đơn VAT"
          editing={row.is('invoice')}
          action={inv ? <LinkButton onClick={openInvoice}>Sửa</LinkButton> : null}
          edit={
            <>
              <div className={styles.fields}>
                <TextField className={styles.span2} label="Tên công ty" autoFocus value={row.draft.legal ?? ''} onChange={(e) => row.set('legal', e.target.value)} />
                <TextField label="Mã số thuế" inputMode="numeric" numeric value={row.draft.tax ?? ''} onChange={(e) => row.set('tax', e.target.value)} />
                <TextField label="Email nhận hoá đơn" type="email" value={row.draft.email ?? ''} onChange={(e) => row.set('email', e.target.value)} />
                <TextField className={styles.span2} label="Địa chỉ" value={row.draft.address ?? ''} onChange={(e) => row.set('address', e.target.value)} />
              </div>
              <EditActions busy={row.busy} onSave={saveInvoice} onCancel={row.close} error={row.error} />
            </>
          }
        >
          {inv ? (
            <>
              <RowMain>{inv.legal_name}</RowMain>
              <RowSub>
                MST <span className={styles.num}>{fmtTaxCode(inv.tax_code)}</span>
                {inv.email ? ` · gửi về ${inv.email}` : ''}
              </RowSub>
            </>
          ) : (
            <button type="button" className={styles.gap} onClick={openInvoice}>
              Chưa có thông tin xuất hoá đơn — hoá đơn chưa ghi được tên công ty
            </button>
          )}
        </SettingRow>
      </div>

      <RowBand label="Hoá đơn" count={overview.invoices.length} />
      {overview.invoices.length ? (
        <div className={styles.invoices}>
          {overview.invoices.map((i) => (
            <div key={i.id} className={styles.invoice}>
              <span className={styles.invDate}>{dmy(i.issued_on)}</span>
              <span className={styles.invText}>
                <span className={styles.invWhat}>{invoiceWhat(i)}</span>
                <span className={styles.sub}>
                  <span className={styles.invSubDate} aria-hidden="true">
                    {dmy(i.issued_on)} ·{' '}
                  </span>
                  {invoiceSub(i)}
                </span>
              </span>
              <span className={styles.invAmount}>{fmtVnd(i.amount_vnd)}</span>
              <IconButton name="download" size={18} label={`Tải hoá đơn ${dmy(i.issued_on)}`} className={styles.invGet} onClick={() => downloadFile(i.pdf_url)} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có hoá đơn">Hoá đơn VAT của mỗi kỳ hiện ở đây, tải về bằng một lần bấm.</EmptyState>
      )}
    </Card>
  )
}
