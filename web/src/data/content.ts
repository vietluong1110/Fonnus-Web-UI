import type { IconName } from '../design-system'

export interface NavItem {
  label: string
  desc: string
  icon: IconName
  /** Omitted on the one item that opens the call demo instead of scrolling. */
  href?: string
  /** Opens the "nghe thử" call overlay rather than navigating. */
  demo?: true
}

export interface NavGroup {
  label: string
  /** A plain link when there are no items. */
  href?: string
  items?: NavItem[]
}

/*
 * Four entries, two of them menus. Every destination is a real section on this
 * page — the nav never promises a page that does not exist.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Sản phẩm',
    items: [
      { label: 'Nghe thử Linh', desc: 'Gọi thử ngay trên trình duyệt', icon: 'phone-call', demo: true },
      { label: 'Khả năng', desc: 'Đặt lịch, báo giá, chuyển máy', icon: 'calendar-check', href: '#kha-nang' },
      {
        label: 'Cách hoạt động',
        desc: 'Giữ nguyên số phòng khám đang dùng',
        icon: 'settings',
        href: '#cach-hoat-dong',
      },
    ],
  },
  { label: 'Bảng giá', href: '#bang-gia' },
  {
    label: 'Tin cậy',
    items: [
      { label: 'Vì sao Fonnus', desc: 'Cuộc gọi nhỡ đang lấy đi bao nhiêu', icon: 'phone-missed', href: '#vi-sao' },
      {
        label: 'Bảo mật & dữ liệu',
        desc: 'Dữ liệu bệnh nhân lưu tại Việt Nam',
        icon: 'shield-check',
        href: '#bao-mat',
      },
      { label: 'Câu hỏi thường gặp', desc: 'Những điều chủ phòng khám hay hỏi', icon: 'list-checks', href: '#faq' },
    ],
  },
  { label: 'Liên hệ', href: '#lien-he' },
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
      '“Tối nào cũng có người gọi sau chín giờ. Trước đây mình đành để kệ máy reo, giờ sáng ra mở Fonnus là thấy đã có ba lịch hẹn.”',
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
