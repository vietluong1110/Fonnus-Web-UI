import { Icon } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { SectionHead } from '../LeTanPage'
import { useConfig, useDraft } from '../store'
import { Card, Notice, SaveBar, TextArea, ui } from '../../ui'
import { PreviewCard, Turn } from './preview'
import styles from './Profile.module.css'

const KEYS = ['tenant_instructions'] as const

/*
 * Each suggestion carries the answer it produces, so the rail can show the
 * same caller question answered with and without it. Sample prices — a real
 * clinic's would come from the service catalogue.
 */
const IDEAS: { text: string; answer: string }[] = [
  {
    text: 'Luôn gợi ý khách đặt lịch tư vấn miễn phí.',
    answer:
      'Dạ niềng răng bên em khoảng 25–45 triệu tuỳ ca ạ. Anh chị đặt một buổi tư vấn miễn phí để bác sĩ xem trực tiếp nhé ạ?',
  },
  {
    text: 'Khách hỏi giá niềng răng: mời đến khám để bác sĩ tư vấn chính xác.',
    answer: 'Dạ khoảng 25–45 triệu tuỳ ca ạ. Giá chính xác thì bác sĩ phải xem phim và khám trực tiếp mới báo được ạ.',
  },
  {
    text: 'Xưng "em", gọi khách là "anh/chị", không dùng "quý khách".',
    answer: 'Dạ niềng răng bên em khoảng 25–45 triệu tuỳ ca ạ. Anh chị cần em xem giúp lịch khám không ạ?',
  },
  {
    text: 'Khách hỏi bác sĩ nào giỏi nhất: nói tất cả bác sĩ đều được đào tạo bài bản, không so sánh.',
    answer:
      'Dạ bên em bác sĩ nào cũng được đào tạo bài bản ạ, em không so sánh được. Anh chị đến khám, bác sĩ trực hôm đó tư vấn giúp mình nhé ạ.',
  },
]

const PLAIN_ANSWER = 'Dạ niềng răng bên em khoảng 25–45 triệu tuỳ ca ạ.'

/**
 * `#/app/le-tan/ho-so/chi-dan` — the standing orders.
 *
 * The textarea gets the whole work column and nothing sits beside it, so it
 * can be dragged as tall as the owner wants without shifting anything. The
 * rail answers the question a blank box cannot: what does writing this here
 * actually change about what the receptionist says.
 */
export function InstructionsSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Chỉ dẫn riêng')
  const { draft, set } = d

  const agent = config.agent_name || 'Linh'
  const unused = IDEAS.filter((i) => !draft.tenant_instructions.includes(i.text))
  const lastUsed = IDEAS.filter((i) => draft.tenant_instructions.includes(i.text)).pop()

  const add = (text: string) =>
    set('tenant_instructions', (draft.tenant_instructions.trim() ? draft.tenant_instructions.trimEnd() + '\n' : '') + text)

  return (
    <>
      <SectionHead title="Chỉ dẫn riêng" backLabel="Hồ sơ" backHref={appHref('le-tan', 'ho-so')} />
      <p className={styles.lede}>
        Những gì bạn dặn riêng {agent}, ngoài kiến thức về phòng khám. Viết như dặn một nhân viên mới — mỗi ý một câu.
      </p>

      <div className={styles.work}>
        <div className={styles.col}>
          <Card title={`${agent} luôn làm, luôn tránh`}>
            <TextArea
              value={draft.tenant_instructions}
              onChange={(e) => set('tenant_instructions', e.target.value)}
              placeholder={`Ví dụ: ${IDEAS[0].text}`}
              rows={9}
              maxLength={1500}
              aria-label="Chỉ dẫn riêng"
              hint="Kéo góc dưới bên phải để ô cao thêm."
            />
            <Notice tone="neutral" icon="shield-check">
              Chỉ dẫn không thay đổi được quy tắc an toàn, tuân thủ pháp lý và chuyển máy khẩn cấp. Nội dung được kiểm duyệt trước khi áp dụng.
            </Notice>
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
          <PreviewCard title="Chỉ dẫn đổi câu trả lời thế nào" meta="Cùng một câu hỏi của khách, hai câu trả lời" orb={false}>
            <Turn label="Khách hỏi" tone="caller">
              “Niềng răng bên mình bao nhiêu tiền ạ?”
            </Turn>
            <Turn label="Không có chỉ dẫn" tone="locked">
              “{PLAIN_ANSWER}”
            </Turn>
            <Turn label={lastUsed ? 'Có chỉ dẫn của bạn' : 'Có chỉ dẫn — ví dụ'}>
              “{(lastUsed ?? IDEAS[0]).answer}”
            </Turn>
            <span className={ui.hint}>
              {lastUsed
                ? 'Đang xem chỉ dẫn bạn vừa thêm.'
                : `Ví dụ trên đang dùng chỉ dẫn “${IDEAS[0].text}”. Thêm một gợi ý bên cạnh để xem chỉ dẫn của chính bạn.`}
            </span>
          </PreviewCard>
        </aside>
      </div>

      <SaveBar {...d.bar} sub="Chỉ dẫn riêng · áp dụng cho cuộc gọi tiếp theo" />
    </>
  )
}
