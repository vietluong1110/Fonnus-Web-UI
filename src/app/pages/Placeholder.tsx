import { Button, Icon, Shape } from '../../design-system'
import type { IconName, ShapeName } from '../../design-system'
import { appHref } from '../../hooks/useRoute'
import { Card, ui } from '../ui'

/*
 * The tabs that are not built yet — Số điện thoại, Cài đặt. They exist so the
 * sidebar is honest about the app's shape; the screens themselves come after
 * the receptionist is configurable. Copy states the fact and points at the
 * tab that configures her.
 */

/*
 * Each tab is drawn before it is described: one of the six shapes where the
 * visual language has one for the idea, the icon at shape scale where it
 * does not.
 */
type Art = { shape: ShapeName } | { icon: IconName }

const BLURB: Record<string, { art: Art; lede: string }> = {
  'Số điện thoại': { art: { icon: 'incoming' }, lede: 'Số phòng khám đang chuyển tiếp, số Fonnus trong gói, và thuê thêm số mới.' },
  'Cài đặt': { art: { icon: 'settings' }, lede: 'Tài khoản, gói và thanh toán, thông báo, bảo mật.' },
}

export function PlaceholderPage({ title }: { title: string }) {
  const b = BLURB[title] ?? { art: { icon: 'overview' as IconName }, lede: '' }
  return (
    <>
      <div className={ui.pageHead}>
        <h1 className={ui.pageTitle}>{title}</h1>
      </div>
      <Card tone="dashed" style={{ maxWidth: 640, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--ink)', display: 'inline-flex', height: 96, alignItems: 'center' }} aria-hidden="true">
          {'shape' in b.art ? <Shape name={b.art.shape} size={112} /> : <Icon name={b.art.icon} size={56} />}
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
