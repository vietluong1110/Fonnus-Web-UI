import section from '../../styles/section.module.css'
import styles from './Security.module.css'

interface Promise_ {
  title: string
  body: string
  /** The promise this section is really built around. */
  ringed?: boolean
}

const PROMISES: Promise_[] = [
  {
    title: 'Xin phép trước khi ghi âm',
    body: 'Fonnus chia sẻ minh bạch cuộc gọi được xử lý bởi AI và được ghi âm. Người gọi đồng ý thì Fonnus mới tiếp tục.',
  },
  {
    title: 'Dữ liệu là của phòng khám',
    body: 'Bản ghi âm và nội dung cuộc gọi chỉ tài khoản phòng khám xem được. Bạn yêu cầu xoá, chúng tôi xoá.',
  },
  {
    title: 'Chuyên môn y khoa: chuyển cho bác sĩ',
    body: 'Fonnus trả lời giá, giờ, lịch hẹn và thông tin phòng khám. Câu hỏi thuộc chuyên môn luôn được chuyển cho bác sĩ.',
    ringed: true,
  },
]

export function Security() {
  return (
    <section id="bao-mat" className={`${section.section} ${section.blush}`}>
      <div className={section.inner}>
        <div data-reveal="0" className={section.eyebrowDeep}>Bảo mật &amp; dữ liệu</div>
        <h2 data-reveal="1" className={`${section.heading} ${styles.heading}`}>
          Người gọi biết mình đang nói với trợ lý AI
        </h2>
        <p data-reveal="2" className={`${section.lede} ${styles.lede}`}>
          Câu công bố nằm trong câu đầu tiên của mỗi cuộc gọi, và phòng khám không tắt được. Đây là yêu cầu
          pháp luật, không phải tuỳ chọn.
        </p>

        <div className={styles.cards}>
          {PROMISES.map((promise, i) => (
            <div
              key={promise.title}
              data-reveal={String(i)}
              className={promise.ringed ? styles.cardRinged : styles.card}
            >
              <div className={styles.cardTitle}>{promise.title}</div>
              <p className={styles.cardBody}>{promise.body}</p>
            </div>
          ))}
        </div>

        <p data-reveal="0" className={styles.legal}>
          Cơ sở pháp lý chúng tôi làm theo: Luật 91/2025/QH15 về bảo vệ dữ liệu cá nhân và Luật
          134/2025/QH15 về công bố nội dung do AI tạo, hiệu lực tháng 3 năm 2026.
        </p>
      </div>
    </section>
  )
}
