export interface NavLink {
  href: string
  label: string
  /** Longer label used in the mobile drawer, where there is room for it. */
  drawerLabel?: string
}

export const NAV_LINKS: NavLink[] = [
  { href: '#nghe-thu', label: 'Nghe thử' },
  { href: '#vi-sao', label: 'Vì sao' },
  { href: '#cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '#kha-nang', label: 'Khả năng' },
  { href: '#bang-gia', label: 'Bảng giá' },
  { href: '#faq', label: 'FAQ' },
  { href: '#bao-mat', label: 'Bảo mật', drawerLabel: 'Bảo mật & dữ liệu' },
]

export interface FaqItem {
  q: string
  a: string
}

export const FAQS: FaqItem[] = [
  {
    q: 'Fonnus có thay lễ tân của tôi không?',
    a: 'Không. Fonnus nhận những cuộc gọi mà hiện tại không ai nghe: ngoài giờ, lúc máy đang bận, lúc lễ tân đang đứng với bệnh nhân. Việc cần con người vẫn do con người làm.',
  },
  {
    q: 'Người gọi có biết mình đang nói với AI không?',
    a: 'Có, ngay câu đầu tiên: “Em là Fonnus, trợ lý AI của phòng khám.” Đây là yêu cầu pháp luật và phòng khám không tắt được.',
  },
  {
    q: 'Tôi có phải đổi số điện thoại không?',
    a: 'Không. Bạn giữ nguyên số khách đã quen. Nhà mạng chuyển những cuộc gọi không ai nghe sang Fonnus, chúng tôi làm cùng bạn bước này.',
  },
  {
    q: 'Nếu Fonnus không biết câu trả lời?',
    a: 'Fonnus nói là chưa có thông tin, ghi lại câu hỏi kèm số điện thoại để bạn gọi lại, hoặc nối máy cho nhân viên ngay nếu bạn bật chuyển máy.',
  },
  {
    q: 'Cài đặt mất bao lâu?',
    a: 'Phần khai thông tin phòng khám — bảng giá, giờ, dịch vụ, cách xưng hô — thường mất một đến hai buổi. Chúng tôi không cho số máy chạy thật khi thông tin còn thiếu.',
  },
  {
    q: 'Cuộc gọi được tính tiền thế nào?',
    a: 'Theo giây, tối thiểu 30 giây cho mỗi cuộc gọi được nghe. Cuộc gọi nhỡ hoặc lỗi không tính tiền. Vượt số phút của gói thì tính theo giá vượt phút của gói đó.',
  },
]

export interface Testimonial {
  quote: string
  attribution: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      '“Tối nào cũng có người gọi sau chín giờ. Trước đây mình để máy reo, giờ sáng ra mở bảng điều khiển là thấy đã có ba lịch hẹn.”',
    attribution: 'Chủ phòng khám nha khoa · Quận 7, TP.HCM',
  },
  {
    quote:
      '“Lễ tân của mình bớt phải trả lời câu hỏi giờ mở cửa cả ngày. Cô ấy ở lại với bệnh nhân đang ngồi trước mặt.”',
    attribution: 'Chủ phòng khám thẩm mỹ · Cầu Giấy, Hà Nội',
  },
  {
    quote: '“Cái mình cần là biết ai đã gọi. Bản ghi và tóm tắt mỗi tối giải quyết đúng chuyện đó.”',
    attribution: 'Chủ hai cơ sở nha khoa · Hải Châu, Đà Nẵng',
  },
]

export const CONTACT = {
  phone: '+84 914 378 064',
  phoneHref: 'tel:+84914378064',
  email: 'xinchao@fonnus.ai',
  emailHref: 'mailto:xinchao@fonnus.ai',
  site: 'fonnus.ai',
}
