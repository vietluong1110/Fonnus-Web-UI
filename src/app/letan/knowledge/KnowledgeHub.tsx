import type { ReactNode } from 'react'
import { Badge, Button, Icon } from '../../../design-system'
import type { IconName } from '../../../design-system'
import { appHref } from '../../../hooks/useRoute'
import { LABELS } from '../defaults'
import { formatVnd } from '../../ui'
import { computeReadiness, pricedCount, summarizeHours } from '../readiness'
import { messageFor } from '../../../api'
import { useConfig } from '../store'
import { Notice, ui, useToast } from '../../ui'
import { AskRail } from './AskRail'
import styles from './Knowledge.module.css'

/*
 * The Kiến thức hub (frame 17): how ready the receptionist is, the sections
 * that feed her, and the question rail. Sections are ordered by gate — the
 * R1/R2 ones first, then the optional add-ons as dashed chips.
 */

type Status = 'ok' | 'missing' | 'partial'

interface Row {
  key: string
  icon: IconName
  title: string
  sub: ReactNode
  status: Status
  accent?: boolean
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'ok')
    return (
      <Badge tone="success" dot>
        Đủ
      </Badge>
    )
  if (status === 'partial')
    return (
      <Badge tone="warning" dot>
        Một phần
      </Badge>
    )
  return (
    <Badge tone="warning" dot>
      Còn thiếu
    </Badge>
  )
}

export function KnowledgeHub() {
  const { config, reset } = useConfig()
  const { toast } = useToast()
  const r = computeReadiness(config)
  const agent = config.agent_name || 'Linh'

  const priced = pricedCount(config)
  const total = config.service_catalog.length
  const advancedLocation = [config.business_name_spoken, config.location_landmarks, config.directions_note, config.parking_info, config.digital_links].filter(Boolean).length
  const tet = config.holiday_exceptions.find((h) => /tết nguyên đán/i.test(h.holiday_label))

  const fmtDate = (iso: string) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '')

  const rows: Row[] = [
    {
      key: 'dia-diem',
      icon: 'map-pin',
      title: 'Địa điểm và liên hệ',
      sub: `${config.address_full || 'Chưa có địa chỉ'} · Nâng cao ${advancedLocation}/5 mục${config.branch_list.length ? ` · ${config.branch_list.length} chi nhánh` : ''}`,
      status: r.checks.filter((c) => ['business_name', 'city', 'address_full', 'industry_vertical'].includes(c.id)).every((c) => c.done) ? 'ok' : 'missing',
    },
    {
      key: 'gio-lam-viec',
      icon: 'clock',
      title: 'Giờ làm việc',
      sub: `${summarizeHours(config)}${config.break_periods.length ? ` · nghỉ trưa ${config.break_periods[0].from}–${config.break_periods[0].to}` : ''}${config.last_intake_time ? ` · nhận muộn nhất ${config.last_intake_time}` : ''}${config.operating_hours_confirmed ? '' : ' · giờ mẫu, cần bạn xác nhận'}`,
      status: config.operating_hours_confirmed ? 'ok' : 'missing',
    },
    {
      key: 'ngay-nghi',
      icon: 'calendar-days',
      title: 'Lịch nghỉ Tết và ngày lễ',
      sub: config.holidays_confirmed
        ? `${config.holiday_exceptions.length} ngày nghỉ · ${tet ? `Tết ${fmtDate(tet.date_from)} – ${fmtDate(tet.date_to)}` : 'chưa có Tết'}`
        : `Đã gợi ý sẵn ${tet ? `Tết 2027 (${fmtDate(tet.date_from)} – ${fmtDate(tet.date_to)})` : 'ngày lễ'} — bạn chỉ cần xác nhận`,
      status: config.holidays_confirmed ? 'ok' : 'missing',
    },
    {
      key: 'dich-vu',
      icon: 'banknote',
      title: 'Dịch vụ và giá',
      sub: `${priced}/${total} dịch vụ có giá · ${LABELS.pricing[config.pricing_disclosure_policy]}${priced < total ? ` · khoảng ${Math.max(1, Math.round(((total - priced) * 40) / 60))} phút` : ''}`,
      status: priced === total && total > 0 ? 'ok' : priced > 0 ? 'partial' : 'missing',
    },
    {
      key: 'bao-hiem',
      icon: 'shield-check',
      title: 'BHYT, bảo hiểm và khám ban đầu',
      sub:
        config.insurance_bhyt_policy.option === 'unset'
          ? `${agent} đang hỏi bạn câu này — trả lời ở khung bên phải`
          : `${LABELS.insurance[config.insurance_bhyt_policy.option]}${config.consultation_fee != null ? ` · khám ban đầu ${config.consultation_fee === 0 ? 'miễn phí' : formatVnd(config.consultation_fee) + ' đ'}` : ''}`,
      status: config.insurance_bhyt_policy.option === 'unset' ? 'missing' : 'ok',
      accent: config.insurance_bhyt_policy.option === 'unset',
    },
  ]

  const tenantKeyterms = config.keyterms.filter((k) => k.source === 'tenant').length
  const addons: { key: string; label: string; count: number }[] = [
    { key: 'bac-si', label: 'Bác sĩ', count: config.practitioner_roster.length },
    { key: 'cau-hoi', label: 'Câu hỏi thường gặp', count: config.faq_pairs.length },
    { key: 'tu-khoa', label: 'Từ hay nghe nhầm', count: tenantKeyterms },
    { key: 'tai-lieu', label: 'Tài liệu và website', count: config.knowledge_files.length + (config.website_scrape_url ? 1 : 0) },
  ]

  const missingLabels = r.missing.slice(0, 3).map((c) => c.label.toLowerCase())

  return (
    <>
      <div className={styles.ready}>
        <span className={styles.readyPct}>{r.percent}%</span>
        <div className={styles.readyBody}>
          <span className={styles.readyTitle}>{r.r2Done ? 'Sẵn sàng nhận cuộc gọi thật' : r.r1Done ? `${agent} nghe máy được — còn thiếu để đón khách thật` : `${agent} chưa nghe máy được`}</span>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${r.percent}%` }} />
          </div>
          <div className={styles.readyLevels}>
            <span className={styles.level}>
              <span className={`${styles.levelDot} ${r.r1Done ? styles.levelOn : ''}`} /> Nghe máy, đọc địa chỉ, chuyển máy
            </span>
            <span className={styles.level}>
              <span className={`${styles.levelDot} ${r.r2Done ? styles.levelOn : ''}`} /> Báo giá, giữ hẹn, an toàn với khách thật
            </span>
            {!r.r2Done ? <span>Còn khoảng {r.remainingMinutes} phút nhập liệu.</span> : null}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Icon name="phone-call" size={16} />}
          onClick={() => toast(`Gọi thử sẽ nối máy khi số Fonnus được cấp — xem mục Số điện thoại.`, 'neutral')}
        >
          Gọi thử
        </Button>
      </div>

      {!r.r2Done ? (
        <Notice tone="warm" icon="circle-alert">
          {r.r1Done ? `${agent} nghe máy được ngay — nhưng chưa ${config.service_catalog.some((s) => s.price_from == null) ? 'báo giá được' : 'sẵn sàng đón khách thật'}.` : `${agent} còn thiếu thông tin cơ bản.`}{' '}
          Còn thiếu: {missingLabels.join(', ')}
          {r.missing.length > 3 ? ` và ${r.missing.length - 3} mục khác` : ''}.
        </Notice>
      ) : (
        <Notice tone="sage" icon="circle-check">
          {agent} đã có đủ thông tin để nghe máy, báo giá và giữ hẹn. Mọi mục thêm bên dưới đều không bắt buộc.
        </Notice>
      )}

      <div className={styles.layout}>
        <div className={ui.stack}>
          <div className={styles.rows}>
            {rows.map((row) => (
              <a key={row.key} href={appHref('le-tan', 'kien-thuc', row.key)} className={`${styles.rowLink} ${row.status === 'missing' ? styles.rowMissing : ''}`}>
                <span className={styles.rowIcon}>
                  <Icon name={row.icon} size={18} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{row.title}</span>
                  <span className={`${styles.rowSub} ${row.accent ? styles.rowSubAccent : ''}`}>{row.sub}</span>
                </span>
                <span className={styles.rowEnd}>
                  <StatusBadge status={row.status} />
                  <span className={styles.rowChevron}>
                    <Icon name="chevron-right" size={16} />
                  </span>
                </span>
              </a>
            ))}
          </div>

          <span className={ui.label} style={{ color: 'var(--ink-soft)', marginTop: 4 }}>
            Thêm mục mới — giúp {agent} trả lời hay hơn, không bắt buộc
          </span>
          <div className={styles.addons}>
            {addons.map((a) => (
              <a key={a.key} href={appHref('le-tan', 'kien-thuc', a.key)} className={`${styles.addon} ${a.count ? styles.addonFilled : ''}`}>
                {a.count ? (
                  <>
                    {a.label} <span className={styles.addonCount}>{a.count}</span>
                  </>
                ) : (
                  `+ ${a.label}`
                )}
              </a>
            ))}
          </div>

          <div className={ui.row} style={{ marginTop: 8 }}>
            <button
              type="button"
              className={ui.linkButton}
              style={{ color: 'var(--ink-soft)', fontWeight: 400 }}
              onClick={() => {
                if (window.confirm('Đưa toàn bộ Lễ tân về mẫu ban đầu? Mọi thông tin bạn đã nhập sẽ mất.')) {
                  reset()
                    .then(() => toast('Đã đưa Lễ tân về mẫu nha khoa.', 'neutral'))
                    .catch((e: unknown) => toast(messageFor(e), 'error'))
                }
              }}
            >
              Đặt lại về mẫu nha khoa
            </button>
          </div>
        </div>

        <AskRail />
      </div>
    </>
  )
}
