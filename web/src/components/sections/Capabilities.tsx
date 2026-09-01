import section from '../../styles/section.module.css'
import styles from './Capabilities.module.css'
import { CapabilityRow } from './CapabilityRow'
import { CallLogVisual } from './capability-visuals'
import { CallDemoPlayer } from './CallDemoPlayer'
import { BookingAction, PriceAction, TransferAction } from './capability-actions'
import { BOOKING_DEMO, FAQ_DEMO, HANDOFF_DEMO } from '../../data/callDemos'

export function Capabilities() {
  return (
    <section id="kha-nang" className={section.section}>
      <div className={section.inner}>
        <div data-reveal="0" className={section.eyebrow}>Khả năng</div>
        <h2 data-reveal="1" className={`${section.heading} ${styles.heading}`}>
          Một lễ tân không nghỉ, không quên
        </h2>
        <p data-reveal="2" className={`${section.lede} ${styles.lede}`}>
          Ba cuộc gọi mẫu, phát lại ngay tại đây — bấm nghe và xem Fonnus làm gì sau mỗi câu.
        </p>

        <div className={styles.rows}>
          <CapabilityRow
            eyebrow="Đặt lịch tự động"
            title="Hiểu “3 giờ chiều thứ Năm tuần sau”"
            body="Fonnus hiểu ngày giờ nói theo kiểu tiếng Việt, đối chiếu lịch trống và xác nhận ngay trong cuộc gọi."
            measure="44ch"
            points={['Kiểm tra lịch trống theo thời gian thực', 'Xác nhận bằng giọng nói, không cần gọi lại']}
            visual={<CallDemoPlayer demo={BOOKING_DEMO} action={<BookingAction />} />}
          />

          <CapabilityRow
            reversed
            eyebrow="Trả lời câu hỏi chung"
            title="Giá, giờ, địa chỉ — trả lời thẳng"
            body="Câu trả lời lấy từ bảng giá và thông tin bạn khai, không phải Fonnus tự nghĩ ra. Không biết thì nói không biết, rồi ghi lại để bạn trả lời."
            points={['Dùng đúng bảng giá của phòng khám', 'Không tự suy diễn khi thiếu dữ liệu']}
            visual={<CallDemoPlayer demo={FAQ_DEMO} action={<PriceAction />} />}
          />

          <CapabilityRow
            eyebrow="Chuyển cho nhân viên khi cần"
            title="Luôn có người thật cách một bước"
            body="Câu hỏi thuộc chuyên môn y khoa, ca gấp, hoặc khách muốn gặp người thật: Fonnus nối máy sang nhân viên, hoặc ghi lời nhắn để gọi lại."
            points={['Nối máy trực tiếp cho nhân viên', 'Ghi lời nhắn kèm số để gọi lại']}
            visual={<CallDemoPlayer demo={HANDOFF_DEMO} action={<TransferAction />} />}
          />

          <CapabilityRow
            reversed
            eyebrow="Nhật ký cuộc gọi đầy đủ"
            title="Mọi cuộc gọi đều được ghi lại"
            body="Xem lại bản ghi âm, nội dung và kết quả từng cuộc gọi trên bảng điều khiển — kèm tóm tắt qua Zalo mỗi tối."
            points={['Bản ghi âm và nội dung đầy đủ', 'Tóm tắt mỗi ngày qua Zalo']}
            visual={<CallLogVisual />}
          />
        </div>
      </div>
    </section>
  )
}
