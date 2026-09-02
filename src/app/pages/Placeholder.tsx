import { Button, Icon } from '../../design-system'
import type { IconName } from '../../design-system'
import { appHref } from '../../hooks/useRoute'
import { Card, ui } from '../ui'

/*
 * The five tabs that are not Lễ tân. They exist so the sidebar is honest about
 * the app's shape; the screens themselves come after the receptionist is
 * configurable. Copy states the fact and points at the one live tab.
 */

const BLURB: Record<string, { icon: IconName; lede: string }> = {
  'Tổng quan': { icon: 'house', lede: 'Hôm nay Linh nghe bao nhiêu cuộc, mấy cuộc cần bạn xem lại, lịch hẹn mới — tất cả trên một màn hình.' },
  'Cuộc gọi': { icon: 'phone-call', lede: 'Danh sách cuộc gọi, bản ghi âm và tóm tắt từng cuộc.' },
  'Lịch hẹn': { icon: 'calendar-check', lede: 'Lịch hẹn Linh đã giữ cho khách, theo ngày và theo bác sĩ.' },
  'Số điện thoại': { icon: 'phone-incoming', lede: 'Số phòng khám đang chuyển tiếp, số Fonnus trong gói, và thuê thêm số mới.' },
  'Cài đặt': { icon: 'settings', lede: 'Tài khoản, gói và thanh toán, thông báo, bảo mật.' },
}

export function PlaceholderPage({ title }: { title: string }) {
  const b = BLURB[title] ?? { icon: 'house' as IconName, lede: '' }
  return (
    <>
      <div className={ui.pageHead}>
        <h1 className={ui.pageTitle}>{title}</h1>
      </div>
      <Card tone="dashed" style={{ maxWidth: 640, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--text-accent)', display: 'inline-flex' }}>
          <Icon name={b.icon} size={22} />
        </span>
        <span style={{ fontSize: 15, lineHeight: 1.6 }}>{b.lede}</span>
        <span className={ui.hint}>Màn hình này được xây sau khi Lễ tân hoàn thiện. Dữ liệu ở đây đến từ cuộc gọi thật, nên cần Linh trực máy trước.</span>
        <Button variant="secondary" size="sm" onClick={() => (window.location.hash = appHref('le-tan'))}>
          Cấu hình Lễ tân
        </Button>
      </Card>
    </>
  )
}
