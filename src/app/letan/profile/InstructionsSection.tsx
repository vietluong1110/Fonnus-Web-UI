import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { INSTRUCTION_IDEAS } from '../instructions'
import { SectionHead } from '../LeTanPage'
import { useConfig, useDraft } from '../store'
import { TryPanel } from '../tryout/TryPanel'
import { Card, SaveBar, TextArea } from '../../ui'
import styles from './Profile.module.css'

const KEYS = ['tenant_instructions'] as const

/**
 * `#/app/le-tan/ho-so/chi-dan` — the standing orders.
 *
 * The textarea gets the whole work column and nothing sits beside it, so it
 * can be dragged as tall as the owner wants without shifting anything. The
 * try-out panel answers the question a blank box cannot: what does writing
 * this here actually change about what the receptionist says — ask her the
 * price of braces before and after adding a line, and hear the difference.
 *
 * There is no compliance notice among the fields. What the instructions
 * cannot override (safety, the legal disclosure, emergency transfer) is
 * enforced server-side; a warning box in the form only made the page read as
 * something that could be got wrong.
 */
export function InstructionsSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Chỉ dẫn riêng')
  const { draft, set } = d

  const agent = config.agent_name || 'Linh'
  const unused = INSTRUCTION_IDEAS.filter((i) => !draft.tenant_instructions.includes(i.text))
  const live = { ...config, ...draft }

  const add = (text: string) =>
    set('tenant_instructions', (draft.tenant_instructions.trim() ? draft.tenant_instructions.trimEnd() + '\n' : '') + text)

  return (
    <>
      <SectionHead title="Chỉ dẫn riêng" backLabel="Hồ sơ" backHref={appHref('le-tan', 'ho-so')} />
      <p className={styles.lede}>
        Những gì bạn dặn riêng {agent}, ngoài kiến thức về phòng khám. Viết như dặn một nhân viên mới — mỗi ý một câu, rồi hỏi thử {agent} ở khung bên phải.
      </p>

      <div className={styles.work}>
        <div className={styles.col}>
          <Card title={`${agent} luôn làm, luôn tránh`}>
            <TextArea
              value={draft.tenant_instructions}
              onChange={(e) => set('tenant_instructions', e.target.value)}
              placeholder={`Ví dụ: ${INSTRUCTION_IDEAS[0].text}`}
              rows={9}
              maxLength={1500}
              aria-label="Chỉ dẫn riêng"
              hint="Kéo góc dưới bên phải để ô cao thêm."
            />
          </Card>

          {unused.length ? (
            <Card title="Gợi ý cho phòng khám nha khoa" subtitle="Bấm để thêm vào ô trên">
              <div className={styles.ideas}>
                {unused.map((i) => (
                  <button key={i.text} type="button" className={styles.idea} onClick={() => add(i.text)}>
                    <span className={styles.ideaPlus}>
                      <Icon name="plus" size={14} />
                    </span>
                    <span>{i.text}</span>
                  </button>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className={styles.rail}>
          <TryPanel section="chi-dan" config={live} />
        </aside>
      </div>

      <SaveBar {...d.bar} sub="Chỉ dẫn riêng · áp dụng cho cuộc gọi tiếp theo" />
    </>
  )
}
