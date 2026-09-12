import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { Card } from '../../ui'
import type { AttentionItem } from '../../../api'
import { attentionCopy } from './labels'
import styles from './Overview.module.css'

/**
 * "Cần bạn xem" — the one part of this page you act on.
 *
 * Every row is a gap a real caller found, not an item on a checklist, and one
 * press lands on the field that closes it. That is the whole argument for the
 * page: a readiness meter tells an owner they are at 68%, but *"5 khách hỏi giá
 * cấy ghép implant — Linh chưa có giá để đọc"* tells them what 68% costs them,
 * in their own callers' words.
 *
 * Which rows are dashed is a rule, not a mood: a row naming something she does
 * not know yet is content not yet filled in and wears the dashed edge; a row
 * that is only a fact about the day — two appointments waiting, four calls to
 * return — stays solid (ui-ux-principles §1).
 *
 * The card is not rendered at all when the queue is empty. There is no "mọi thứ
 * đều ổn" card, because an empty queue is the normal state of a well-set-up
 * clinic and a card saying so would be on screen for ever, reporting nothing.
 */
export function AttentionCard({ items, agent, range }: { items: AttentionItem[]; agent: string; range: string }) {
  if (!items.length) return null

  return (
    <Card
      title="Cần bạn xem"
      subtitle={`${items.length} việc từ cuộc gọi thật ${range.toLowerCase()}`}
      actions={
        <a className={styles.rowAction} href={appHref('cuoc-goi')}>
          Tất cả cuộc gọi
          <Icon name="chevron-right" size={16} />
        </a>
      }
    >
      <div className={styles.rows}>
        {items.map((item) => {
          const c = attentionCopy(item, agent)
          return (
            <a key={item.id} className={`${styles.row} ${c.gap ? styles.rowGap : ''}`} href={c.href}>
              <span className={styles.rowIcon}>
                <Icon name={c.icon} size={20} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{c.title}</span>
                <span className={styles.rowSub}>{c.sub}</span>
              </span>
              <span className={styles.rowAction}>
                {c.action}
                <Icon name="chevron-right" size={16} />
              </span>
            </a>
          )
        })}
      </div>
    </Card>
  )
}
