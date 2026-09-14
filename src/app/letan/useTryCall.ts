import { formatBusinessPhone } from '../../auth/phone'
import { useToast } from '../ui'
import { useConfig } from './store'

/**
 * "Gọi thử" from wherever it is pressed — the Lễ tân header, the sidebar, the phone's Thêm
 * sheet — with one sentence for what happens, so the places cannot drift apart.
 */
export function useTryCall() {
  const { config } = useConfig()
  const { toast } = useToast()
  const agent = config.agent_name || 'Linh'
  const phone = config.assigned_phone ? formatBusinessPhone(config.assigned_phone) : null

  const call = () =>
    toast(
      phone
        ? `Gọi thử sẽ nối máy tới ${phone} khi số được kích hoạt.`
        : 'Gọi thử sẽ nối máy khi số Fonnus được cấp — xem mục Số điện thoại.',
      'neutral',
    )

  return { agent, phone, call }
}
