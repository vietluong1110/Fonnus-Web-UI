import type {
  DayHours,
  HolidayException,
  Keyterm,
  ReceptionistConfig,
  ServiceRow,
  SlotRule,
  Weekday,
} from './model'
import { KEYTERMS_PACK } from './system'

/*
 * The seeded tenant record for a dental clinic: what a tenant sees the first
 * time they open Lễ tân. Vertical template rows (services, hours, holidays,
 * keyterm pack) are here so the R1 path is confirm-and-edit, not type-from-blank.
 *
 * TODO: replace with GET /tenant/config once the backend exists; keep this as
 * the fallback for a brand-new tenant.
 */

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  0: 'CN',
}
export const WEEKDAY_LONG: Record<Weekday, string> = {
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
  0: 'Chủ Nhật',
}

const hours = (day: Weekday, open: boolean, from = '08:00', to = '20:00'): DayHours => ({
  day,
  open,
  from,
  to,
})

const service = (
  id: string,
  service_group: string,
  service_name: string,
  service_aliases: string[],
  price_from: number | null,
  price_to: number | null,
  price_unit: ServiceRow['price_unit'],
  duration: number | null,
  service_note = '',
  is_bookable = true,
): ServiceRow => ({
  id,
  service_name,
  service_aliases,
  price_from,
  price_to,
  price_unit,
  duration,
  service_note,
  is_bookable,
  from_template: true,
  service_group,
})

/*
 * The four headings a Vietnamese dental price list is laid out under. Free
 * text on each row — the owner renames them on the page — so these are the
 * template's starting names, not an enumeration.
 */
const GENERAL = 'Tổng quát'
const COSMETIC = 'Thẩm mỹ'
const ORTHO = 'Chỉnh nha và Implant'
const KIDS = 'Trẻ em'

/** Twelve common dental services, priced where the market range is well known, in price-list order. */
export const DENTAL_SERVICE_TEMPLATE: ServiceRow[] = [
  service('svc-kham', GENERAL, 'Khám tổng quát', ['khám răng'], 0, 0, 'lan', 20),
  service('svc-cao-voi', GENERAL, 'Cạo vôi răng', ['lấy cao răng'], 300_000, 500_000, 'lan', 30),
  service('svc-tram', GENERAL, 'Trám răng', ['hàn răng'], 200_000, 500_000, 'rang', 30),
  service('svc-tuy', GENERAL, 'Điều trị tuỷ', ['chữa tuỷ', 'lấy tuỷ'], 800_000, 2_000_000, 'rang', 60),
  service('svc-nho-thuong', GENERAL, 'Nhổ răng thường', [], 300_000, 800_000, 'rang', 30),
  service('svc-nho-khon', GENERAL, 'Nhổ răng khôn', ['nhổ răng số 8'], 1_000_000, 3_000_000, 'rang', 45),
  service('svc-tay-trang', COSMETIC, 'Tẩy trắng răng', ['làm trắng răng'], 1_500_000, 2_500_000, 'lan', 60, 'Không áp dụng răng nhiễm tetracycline'),
  service('svc-boc-su', COSMETIC, 'Bọc răng sứ', ['răng sứ'], 2_000_000, 8_000_000, 'rang', 60),
  service('svc-dan-su', COSMETIC, 'Dán sứ veneer', ['veneer'], 6_000_000, 12_000_000, 'rang', 60),
  service('svc-nieng', ORTHO, 'Niềng răng', ['chỉnh nha'], 30_000_000, 90_000_000, 'lieu-trinh', 30, '', false),
  service('svc-implant', ORTHO, 'Cấy ghép implant', ['trồng răng'], null, null, 'rang', 90),
  service('svc-tre-em', KIDS, 'Khám răng trẻ em', ['nha khoa trẻ em'], 100_000, 300_000, 'lan', 30),
]

/**
 * The heading a row sits under. A row saved before `service_group` existed
 * carries none: a template row goes back under its template heading by id,
 * anything else is ungrouped until the owner names a group for it.
 */
export function groupOf(s: ServiceRow): string {
  return s.service_group ?? DENTAL_SERVICE_TEMPLATE.find((t) => t.id === s.id)?.service_group ?? ''
}

/**
 * The price list's headings, in order: the record's own list first — which is
 * what keeps a heading the owner emptied — then any name found on a row that
 * the list has lost. Reading it this way means neither half can hide a row.
 */
export function groupNamesOf(cfg: { service_groups: string[]; service_catalog: ServiceRow[] }): string[] {
  const names = [...(cfg.service_groups ?? [])]
  for (const s of cfg.service_catalog) {
    const g = groupOf(s)
    if (!names.includes(g)) names.push(g)
  }
  return names
}

/** The four headings the dental template ships under. */
export const DENTAL_SERVICE_GROUPS = [GENERAL, COSMETIC, ORTHO, KIDS]

/** Things a dental clinic is often asked for and often does not do — one tap adds one to `services_not_offered`. */
export const DENTAL_NOT_OFFERED_IDEAS = ['Chỉnh nha trẻ dưới 12 tuổi', 'Phẫu thuật hàm mặt', 'Gây mê toàn thân', 'Cấp cứu ngoài giờ', 'Khám tại nhà']

/** Ways to answer "có trả góp không" without typing — the first is the most common truth. */
export const INSTALMENT_IDEAS = ['Không hỗ trợ trả góp', 'Trả góp 0% qua thẻ tín dụng, đơn từ 10 triệu', 'Trả góp qua công ty tài chính cho niềng răng và implant']

/** Vietnamese public holidays, pre-seeded. Tết is the one that breaks agents. */
export const HOLIDAY_SEED: HolidayException[] = [
  {
    id: 'hol-tet-2027',
    holiday_label: 'Tết Nguyên Đán 2027',
    date_from: '2027-02-14',
    date_to: '2027-02-22',
    closure_type: 'closed',
    modified_hours: null,
    seeded: true,
  },
  {
    id: 'hol-quoc-khanh-2026',
    holiday_label: 'Quốc khánh',
    date_from: '2026-09-02',
    date_to: '2026-09-02',
    closure_type: 'closed',
    modified_hours: null,
    seeded: true,
  },
  {
    id: 'hol-duong-lich-2027',
    holiday_label: 'Tết Dương lịch',
    date_from: '2027-01-01',
    date_to: '2027-01-01',
    closure_type: 'closed',
    modified_hours: null,
    seeded: true,
  },
  {
    id: 'hol-hung-vuong-2027',
    holiday_label: 'Giỗ Tổ Hùng Vương',
    date_from: '2027-04-16',
    date_to: '2027-04-16',
    closure_type: 'closed',
    modified_hours: null,
    seeded: true,
  },
  {
    id: 'hol-30-4-2027',
    holiday_label: '30/4 và 1/5',
    date_from: '2027-04-30',
    date_to: '2027-05-01',
    closure_type: 'closed',
    modified_hours: null,
    seeded: true,
  },
]

const defaultSlotRules: SlotRule[] = WEEKDAYS.map((day) => ({
  day,
  enabled: day !== 0,
  windows:
    day === 0
      ? []
      : day === 6
        ? [{ from: '09:00', to: '11:30' }]
        : [
            { from: '09:00', to: '11:30' },
            { from: '14:00', to: '17:00' },
          ],
}))

const packKeyterms: Keyterm[] = KEYTERMS_PACK.map((term, i) => ({
  id: `kt-pack-${i}`,
  term,
  phonetic_hint: '',
  source: 'pack',
}))

export const DEFAULT_CONFIG: ReceptionistConfig = {
  agent_name: 'Linh',
  // TODO: comes from the number-provisioning step in Số điện thoại.
  assigned_phone: '02473077199',

  business_name: 'Nha khoa Việt Smile',
  business_name_spoken: '',
  industry_vertical: 'nha-khoa',
  city: 'TP. Hồ Chí Minh',
  address_full: '123 Lê Lợi, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  location_landmarks: '',
  directions_note: '',
  parking_info: '',
  digital_links: '',
  vat_invoice_policy: { option: 'on_request', note: '' },
  branch_list: [],

  operating_hours_by_weekday: [
    hours(1, true),
    hours(2, true),
    hours(3, true),
    hours(4, true),
    hours(5, true),
    hours(6, true),
    hours(0, true, '08:00', '12:00'),
  ],
  operating_hours_confirmed: false,
  break_periods: [{ id: 'brk-lunch', days: [], from: '12:00', to: '13:30' }],
  holiday_exceptions: HOLIDAY_SEED,
  holidays_confirmed: false,

  service_groups: DENTAL_SERVICE_GROUPS,
  service_catalog: DENTAL_SERVICE_TEMPLATE,
  pricing_disclosure_policy: 'range',
  services_not_offered: [],
  package_bundles: [],
  instalment_options: '',
  payment_methods: ['cash', 'transfer'],
  payment_methods_other: [],
  active_promotions: [],

  ai_bookable_slots_per_day: 6,
  slot_duration: 30,
  slot_rules: defaultSlotRules,
  buffer_time: 0,
  max_bookings_per_day: null,
  booking_confirmation_channel: 'sms',
  deposit_policy: '',
  cancellation_policy: '',
  no_show_policy: '',
  identity_verification_rule: 'caller_id_date',

  escalation_targets: [],
  escalation_window: 'always',
  escalation_triggers_custom: [],
  after_hours_routine_behavior: 'log_callback',
  callback_policy: 'Trong 30 phút đầu giờ làm việc',
  waiting_time_expectation: '',

  voice_selection: 'linh',
  voice_accent: 'nam',
  speaking_speed: 'normal',
  personality_style: 'professional_warm',
  greeting_script_custom: '',
  greeting_by_daypart: { enabled: false, morning: '', afternoon: '', evening: '' },
  secondary_language: false,

  endpointing_silence_ms: 700,
  silence_nudge_enabled: true,
  silence_nudge_delay_seconds: 7,
  silence_nudge_script: 'Anh/chị còn nghe máy không ạ?',
  end_call_after_silence_enabled: true,
  end_call_after_n_nudges: 2,
  call_closing_script: 'Em chưa nghe rõ, em xin phép kết thúc. Anh/chị gọi lại giúp em ạ.',
  keyterms: packKeyterms,

  tenant_instructions: '',
  knowledge_files: [],
  website_scrape_url: '',
  faq_pairs: [],

  insurance_bhyt_policy: { option: 'unset', note: '' },
  consultation_fee: null,
  facility_capabilities: [],
  pre_appointment_instructions: '',

  practitioner_roster: [],

  after_hours_emergency_target: { phone: '', name: '' },
  emergency_red_flags_custom: [],

  email_rules: [
    {
      intent: 'needs_review',
      enabled: true,
      recipients: [],
      subject: '[Fonnus] Cuộc gọi cần xem từ «tên_khách»',
      body: '«tên_khách» («số_gọi») vừa gọi lúc «giờ_gọi».\nNội dung: «tóm_tắt»\nNghe lại: «liên_kết»',
    },
    {
      intent: 'new_booking',
      enabled: true,
      recipients: [],
      subject: '[Fonnus] Lịch hẹn mới: «tên_khách» · «giờ_hẹn»',
      body: '«tên_khách» («số_gọi») đã đặt hẹn «dịch_vụ» lúc «giờ_hẹn».\nGhi chú: «tóm_tắt»',
    },
    {
      intent: 'missed_after_hours',
      enabled: false,
      recipients: [],
      subject: '[Fonnus] Cuộc gọi ngoài giờ cần gọi lại: «tên_khách»',
      body: '«tên_khách» («số_gọi») gọi lúc «giờ_gọi», ngoài giờ làm việc.\nLinh đã hẹn gọi lại «hẹn_gọi_lại».\nNội dung: «tóm_tắt»',
    },
  ],
}

/** Labels for the enumerations the UI renders. Single source so copy stays consistent. */
export const LABELS = {
  industry: {
    'nha-khoa': 'Nha khoa',
    'tham-my': 'Thẩm mỹ',
    'nhan-khoa': 'Nhãn khoa',
    'tai-mui-hong': 'Tai mũi họng',
    nhi: 'Nhi',
    'san-phu-khoa': 'Sản phụ khoa',
    'da-khoa': 'Đa khoa',
  },
  cities: [
    'TP. Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
    'Biên Hoà',
    'Nha Trang',
    'Huế',
    'Vũng Tàu',
    'Khác',
  ],
  vat: {
    yes: 'Có xuất VAT',
    on_request: 'Có xuất VAT — báo trước khi thanh toán',
    no: 'Không xuất VAT',
  },
  priceUnit: {
    lan: '/ lần',
    rang: '/ răng',
    ham: '/ hàm',
    'lieu-trinh': '/ liệu trình',
    thang: '/ tháng',
    goi: '/ gói',
  },
  pricing: {
    exact: 'Báo giá chính xác',
    range: 'Khoảng giá (khuyên dùng)',
    defer: 'Không báo giá — mời đến khám',
  },
  /** The same three, short enough for a segmented control; `pricing` keeps the long reading for summaries. */
  pricingShort: { range: 'Khoảng giá', exact: 'Giá chính xác', defer: 'Không báo giá' },
  payment: { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', momo: 'MoMo', zalopay: 'ZaloPay' },
  confirmation: { sms: 'SMS', zalo: 'Zalo', none: 'Không gửi' },
  afterHours: {
    log_callback: 'Ghi lời nhắn + hẹn gọi lại',
    take_message: 'Chỉ ghi lời nhắn',
    transfer: 'Thử chuyển máy, không được thì ghi lời nhắn',
  },
  insurance: {
    unset: 'Chưa trả lời',
    none: 'Không nhận BHYT, không nhận bảo hiểm tư nhân',
    bhyt: 'Có nhận BHYT',
    private: 'Chỉ hỗ trợ bảo hiểm tư nhân',
    both: 'Nhận BHYT và bảo hiểm tư nhân',
  },
  /*
   * `desc` is the region alone and `tone` the temperament, kept apart so a
   * summary line can read "Nữ · miền Nam · nói vừa" rather than piling three
   * comma clauses on top of each other. The picker joins them back together.
   */
  voices: {
    linh: { name: 'Linh', gender: 'Nữ', accent: 'nam' as const, desc: 'Nữ · miền Nam', tone: 'ấm áp' },
    mai: { name: 'Mai', gender: 'Nữ', accent: 'bac' as const, desc: 'Nữ · miền Bắc', tone: 'nhẹ nhàng' },
    khang: { name: 'Khang', gender: 'Nam', accent: 'nam' as const, desc: 'Nam · miền Nam', tone: 'thân thiện' },
    duc: { name: 'Đức', gender: 'Nam', accent: 'bac' as const, desc: 'Nam · miền Bắc', tone: 'điềm tĩnh' },
  },
  style: { professional_warm: 'Chuyên nghiệp và ấm áp', friendly: 'Thân thiện', formal: 'Trang trọng' },
  speed: { slow: 'Chậm', normal: 'Vừa', fast: 'Nhanh' },
  titles: ['BS', 'BS. CKI', 'BS. CKII', 'ThS. BS', 'TS. BS', 'PGS. TS', 'Y sĩ', 'Điều dưỡng'] as const,
  emailIntent: {
    needs_review: 'Cần xem',
    new_booking: 'Lịch hẹn mới',
    missed_after_hours: 'Nhỡ ngoài giờ',
  },
} as const

export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120, 180]
export const SLOT_DURATION_OPTIONS = [15, 20, 30, 45, 60]
export const BUFFER_OPTIONS = [0, 5, 10, 15, 30]
