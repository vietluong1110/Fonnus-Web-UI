import type { MouseEvent } from 'react'
import type { NumbersOverview } from '../../../api'
import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { AddButton, Card, EmptyState, useAppear } from '../../ui'
import { dmy, fmtNumber } from './labels'
import { Avatar, StatusMark } from './parts'
import styles from './Numbers.module.css'

/*
 * "Số của phòng khám" — every number the clinic owns, one row each, and under
 * them a dashed row for each receptionist callers cannot reach yet.
 *
 * The dashed row is the page's reason to exist, said as a gap in her name
 * rather than explained (ui-ux-principles §1, §7): pressing it takes the owner
 * to the kho with the purchase already for her.
 */
export function OwnedCard({
  overview,
  activeId,
  onOpen,
  onChoose,
  onAdd,
}: {
  overview: NumbersOverview
  activeId: string | null
  onOpen: (id: string, e: MouseEvent) => void
  onChoose: (receptionistId: string) => void
  onAdd: () => void
}) {
  const { numbers, receptionists } = overview
  const rows = useAppear(numbers.map((n) => n.id))
  const bare = receptionists.filter((r) => !numbers.some((n) => n.receptionist_id === r.id))
  const subtitle = numbers.length ? `${numbers.length} số · ${receptionists.length} lễ tân` : `${receptionists.length} lễ tân`

  return (
    <Card title="Số của phòng khám" subtitle={subtitle} actions={<AddButton label="Mua số" onClick={onAdd} />}>
      {numbers.length === 0 ? (
        <EmptyState title="Chưa có số nào">
          Khách gọi số nào, lễ tân đó nghe máy — cả ngày lẫn đêm. Chọn số trong kho ngay bên dưới.
        </EmptyState>
      ) : null}

      <div className={styles.rows}>
        {numbers.map((n) => {
          const r = receptionists.find((x) => x.id === n.receptionist_id)
          const on = n.id === activeId
          return (
            <a
              key={n.id}
              ref={rows.ref(n.id)}
              href={appHref('so-dien-thoai', n.id)}
              onClick={(e) => onOpen(n.id, e)}
              className={`${styles.row} ${on ? styles.rowOn : ''}`}
              aria-current={on ? 'true' : undefined}
            >
              <span className={styles.mark}>
                <Icon name="incoming" size={18} />
              </span>
              <span className={styles.rowText}>
                <span className={`${styles.rowNumber} ${styles.num}`}>{fmtNumber(n.number)}</span>
                <span className={styles.rowSub}>
                  {n.forwarding ? `Nhận cuộc gọi từ ${fmtNumber(n.forwarding.from_number)}` : `Mua ${dmy(n.bought_at)}`}
                </span>
              </span>
              <span className={styles.rowMeta}>
                <span className={styles.who}>
                  <Avatar name={r?.name ?? ''} small />
                  {r?.name ?? ''}
                </span>
                <StatusMark status={n.status} />
              </span>
              <span className={styles.chev}>
                <Icon name="chevron-right" size={16} />
              </span>
            </a>
          )
        })}
      </div>

      {bare.map((r) => (
        <button key={r.id} type="button" className={styles.gapRow} onClick={() => onChoose(r.id)}>
          <Avatar name={r.name} dashed />
          <span className={styles.rowText}>
            <span className={styles.gapTitle}>{r.name} chưa có số</span>
            <span className={styles.rowSub}>
              {r.branch ? `${r.branch} · ` : ''}khách chưa gọi được cho {r.name}
            </span>
          </span>
          <span className={styles.gapAct}>
            Chọn số
            <Icon name="chevron-right" size={14} />
          </span>
        </button>
      ))}
    </Card>
  )
}
