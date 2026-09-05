/**
 * Tenant configuration model for the "Lễ tân" tab.
 *
 * Field names follow `docs/context-field-catalogue.md` (v1) one-to-one so the
 * backend can map a section save straight onto the tenant record. Each field is
 * annotated with its origin (TE tenant-entered / SW system-written / SD
 * system-derived) and gate (R1 / R2 / O). Fields that the wireframes added on
 * top of the catalogue are marked `[ext]` — they are UI conveniences and are
 * safe to drop or fold into an existing column server-side.
 *
 * Everything SW / SD lives in `system.ts`, not here: the tenant never edits it.
 */

/**
 * The catalogue revision these names were written against.
 *
 * `GET /tenant/config` returns a `catalogue_version`; the config store compares
 * the two and warns loudly in development when they differ. The catalogue lives
 * in the backend repo, so it will change without this one noticing, and the
 * failure mode is silent — a renamed field simply stops being saved. This turns
 * silent drift into noisy drift. See docs/field-catalogue-mapping.md.
 */
export const CATALOGUE_VERSION = 'v1'

// ---------------------------------------------------------------------------
// Section A — general fields
// ---------------------------------------------------------------------------

export type IndustryVertical =
  | 'nha-khoa'
  | 'tham-my'
  | 'nhan-khoa'
  | 'tai-mui-hong'
  | 'nhi'
  | 'san-phu-khoa'
  | 'da-khoa'

export type VatInvoiceOption = 'yes' | 'on_request' | 'no'

/**
 * A1 · `branch_list` — one row per extra location. All O. Three columns:
 * the catalogue's `branch_hours_note` was dropped (Sept 2026) — a branch
 * with its own hours is a branch with its own receptionist.
 */
export interface Branch {
  id: string
  branch_name: string
  branch_address: string
  branch_phone: string
}

/** Mon = 1 … Sat = 6, Sun = 0 — matches `Date.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** A2 · one row of `operating_hours_by_weekday` (R1, template default). */
export interface DayHours {
  day: Weekday
  open: boolean
  /** "08:00" */
  from: string
  /** "20:00" */
  to: string
}

/** A2 · `break_periods` — closed windows inside an open day (O). */
export interface BreakPeriod {
  id: string
  /** Empty = every open day. */
  days: Weekday[]
  from: string
  to: string
}

export type ClosureType = 'closed' | 'modified'

/** A2 · `holiday_exceptions` — pre-seeded by Fonnus, tenant confirms (R2). */
export interface HolidayException {
  id: string
  holiday_label: string
  /** ISO dates, inclusive. */
  date_from: string
  date_to: string
  closure_type: ClosureType
  /** Only when `closure_type === 'modified'`. */
  modified_hours: { from: string; to: string } | null
  /** SW pre-seed rows can be edited but are flagged so the UI can say so. */
  seeded: boolean
}

export type PriceUnit = 'lan' | 'rang' | 'ham' | 'lieu-trinh' | 'thang' | 'goi'

/** A3 · `service_catalog` — one row per sellable service. */
export interface ServiceRow {
  id: string
  /** R2 */
  service_name: string
  /** O — colloquial names, also feed `keyterms`. */
  service_aliases: string[]
  /** R2 — VND, null = not priced yet. */
  price_from: number | null
  /** R2 — VND, equal to price_from when fixed. */
  price_to: number | null
  /** R2 */
  price_unit: PriceUnit
  /** O — minutes. */
  duration: number | null
  /** O */
  service_note: string
  /** O, default true */
  is_bookable: boolean
  /** [ext] rows that came from the vertical template, so the UI can say "mẫu". */
  from_template: boolean
  /**
   * [ext] The heading this row sits under on the price list — "Tổng quát",
   * "Thẩm mỹ" — free text the owner names. Groups are *derived* from the rows
   * (a group is every row carrying the same name), so there is no second list
   * to keep in step and no orphan reference; renaming a group renames its
   * rows. Empty = not grouped. Rows saved before this field existed carry
   * none; `groupOf()` in defaults.ts puts a template row back under its
   * template heading by id.
   */
  service_group: string
}

export type PricingDisclosurePolicy = 'exact' | 'range' | 'defer'

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'momo' | 'zalopay'

/** A3 · `package_bundles` (O). */
export interface Bundle {
  id: string
  bundle_name: string
  /** VND */
  price: number | null
  /**
   * [ext] The `service_catalog` rows this price covers, by `id`, so the
   * agent can say what the package contains. Depends on ids being stable
   * across a save (open question Q5); a row that is gone is simply skipped.
   */
  service_ids: string[]
  /** Conditions — "áp dụng khách mới". */
  note: string
}

/** [ext] One service a promotion applies to, and how much comes off it. */
export interface PromoService {
  service_id: string
  /** Percent off, 0–100. Null = the offer applies but is not a percentage. */
  discount_percent: number | null
}

/** A3 · `active_promotions` — auto-expire (O). */
export interface Promotion {
  id: string
  promo_name: string
  /**
   * The line the agent voices. **Derived**, not typed: the editor writes it
   * from the structured fields below on every change, so the catalogue field
   * still carries a sentence for the backend while the tenant edits parts.
   */
  promo_description: string
  /** [ext] Which services are discounted, and by how much. */
  promo_services: PromoService[]
  /** [ext] "Áp dụng khách mới" — what a caller must satisfy to get it. */
  promo_condition: string
  valid_from: string
  valid_to: string
}

/** A4 · `slot_rules` — which windows of the day the AI may book into (O). */
export interface SlotRule {
  day: Weekday
  enabled: boolean
  windows: { from: string; to: string }[]
}

export type BookingConfirmationChannel = 'sms' | 'zalo' | 'none'

/**
 * A4 · `identity_verification_rule` — platform policy, tenant may tighten only.
 * `caller_id_date` is the SW default; `caller_id_date_name` is the stricter option.
 */
export type IdentityVerificationRule = 'caller_id_date' | 'caller_id_date_name'

/** A5 · `escalation_targets` — human numbers for live transfer (R1). */
export interface EscalationTarget {
  id: string
  phone: string
  /** "chị Lan" — voiced as "Em nối máy với chị Lan ngay ạ." */
  name: string
}

/** [ext] frame 20 — when the agent is allowed to try the transfer at all. */
export type EscalationWindow = 'always' | 'business_hours' | 'after_hours'

export type AfterHoursRoutineBehavior = 'log_callback' | 'take_message' | 'transfer'

/** A6 · voices are (gender × accent) pairs; picking one sets `voice_accent` too. */
export type VoiceId = 'linh' | 'mai' | 'khang' | 'duc'
export type VoiceAccent = 'nam' | 'bac'
export type SpeakingSpeed = 'slow' | 'normal' | 'fast'
export type PersonalityStyle = 'professional_warm' | 'friendly' | 'formal'

/** A7 · `keyterms` — STT boost list. Mostly SD; tenant adds what derivation missed. */
export interface Keyterm {
  id: string
  term: string
  phonetic_hint: string
  source: 'derived' | 'pack' | 'tenant'
}

/** A8 · `faq_pairs` (O). */
export interface FaqPair {
  id: string
  question: string
  answer: string
}

/** A8 · `knowledge_files` — October scope; the UI records intent only. */
export interface KnowledgeFile {
  id: string
  name: string
  /** bytes */
  size: number
  status: 'queued' | 'indexed'
}

// ---------------------------------------------------------------------------
// Section B — clinic pack
// ---------------------------------------------------------------------------

export type InsuranceOption = 'unset' | 'none' | 'bhyt' | 'private' | 'both'

export type PractitionerTitle =
  | 'BS'
  | 'BS. CKI'
  | 'BS. CKII'
  | 'ThS. BS'
  | 'TS. BS'
  | 'PGS. TS'
  | 'Y sĩ'
  | 'Điều dưỡng'

/** B2 · `practitioner_roster` (all O). */
export interface Practitioner {
  id: string
  practitioner_name: string
  title_credential: PractitionerTitle
  specialties: string[]
  years_experience: number | null
  working_days: Weekday[]
  working_hours_note: string
  /** Off by default: committing a named doctor without a live schedule is a broken promise. */
  bookable_by_name: boolean
  languages: string[]
  practitioner_note: string
}

// ---------------------------------------------------------------------------
// [ext] Email skill (frame 21) — not in catalogue v1
// ---------------------------------------------------------------------------

export type EmailIntent = 'needs_review' | 'new_booking' | 'missed_after_hours'

export interface EmailRule {
  intent: EmailIntent
  enabled: boolean
  recipients: string[]
  subject: string
  body: string
}

// ---------------------------------------------------------------------------
// The whole tenant record, as the Lễ tân tab edits it
// ---------------------------------------------------------------------------

export interface ReceptionistConfig {
  /* ---- [ext] persona ---- */
  /** The receptionist's given name, used in every self-introduction. */
  agent_name: string
  /**
   * [ext] The Fonnus number this receptionist answers on, chosen from the FPT
   * inventory pool during setup. Owned by the "Số điện thoại" tab; the Lễ tân
   * header only reads it, to say which line this receptionist *is*. Empty
   * until a number is provisioned.
   */
  assigned_phone: string

  /* ---- A1 · Business identity and location ---- */
  business_name: string // R1
  business_name_spoken: string // O
  industry_vertical: IndustryVertical // R1
  city: string // R1
  address_full: string // R1
  location_landmarks: string // O
  directions_note: string // O
  parking_info: string // O
  digital_links: string // O
  vat_invoice_policy: { option: VatInvoiceOption; note: string } // O
  branch_list: Branch[] // O

  /* ---- A2 · Hours and open-state ---- */
  operating_hours_by_weekday: DayHours[] // R1
  /** [ext] the template is pre-filled; R1 asks the tenant to confirm it once. */
  operating_hours_confirmed: boolean
  break_periods: BreakPeriod[] // O
  holiday_exceptions: HolidayException[] // R2
  /** [ext] the Tết pre-seed counts as R2 only once the tenant has looked at it. */
  holidays_confirmed: boolean

  /* ---- A3 · Services and pricing ---- */
  /**
   * [ext] The price list's headings, in the order they are shown. The rows
   * carry the name they sit under (`ServiceRow.service_group`); this list is
   * what lets a heading exist with nothing under it yet — a group the owner
   * has named but not filled. A name on a row that is missing here is
   * appended when the page reads the record, so the two cannot drift apart.
   */
  service_groups: string[]
  service_catalog: ServiceRow[] // R2
  pricing_disclosure_policy: PricingDisclosurePolicy // R2, default range
  services_not_offered: string[] // O
  package_bundles: Bundle[] // O
  instalment_options: string // O
  payment_methods: PaymentMethod[] // O
  /**
   * [ext] Ways to pay that the enum above does not name — "Quẹt thẻ Visa tại
   * quầy", a clinic's own instalment partner. Free text, said in the same
   * breath as the known ones. The five-value enum cannot cover a market where
   * new wallets appear every year.
   */
  payment_methods_other: string[]
  active_promotions: Promotion[] // O

  /* ---- A4 · Scheduling and booking ---- */
  ai_bookable_slots_per_day: number // R2, default 6
  slot_duration: number // R2, minutes, default 30
  slot_rules: SlotRule[] // O
  buffer_time: number // O, minutes, default 0
  max_bookings_per_day: number | null // O
  booking_confirmation_channel: BookingConfirmationChannel // R2, default sms
  deposit_policy: string // O
  cancellation_policy: string // O
  no_show_policy: string // O
  identity_verification_rule: IdentityVerificationRule // R2 (auto), tighten-only

  /* ---- A5 · Escalation and human availability ---- */
  escalation_targets: EscalationTarget[] // R1
  escalation_window: EscalationWindow // [ext]
  /** TE additions on top of the SW base set in `system.ts`. */
  escalation_triggers_custom: string[] // O
  after_hours_routine_behavior: AfterHoursRoutineBehavior // R2
  callback_policy: string // O
  waiting_time_expectation: string // O

  /* ---- A6 · Voice and persona ---- */
  voice_selection: VoiceId // R1
  voice_accent: VoiceAccent // R1, default by city
  speaking_speed: SpeakingSpeed // O
  personality_style: PersonalityStyle // O
  greeting_script_custom: string // O
  /** [ext] frame 16 — optional per-daypart greetings. Off = one greeting. */
  greeting_by_daypart: { enabled: boolean; morning: string; afternoon: string; evening: string }
  secondary_language: boolean // O

  /* ---- A7 · Speech recognition and turn-taking ---- */
  endpointing_silence_ms: number // O
  silence_nudge_enabled: boolean // O
  silence_nudge_delay_seconds: number // O
  silence_nudge_script: string // O (SW default)
  end_call_after_silence_enabled: boolean // O
  end_call_after_n_nudges: number // O
  call_closing_script: string // O (SW default)
  keyterms: Keyterm[] // O

  /* ---- A8 · Knowledge and behaviour steering ---- */
  tenant_instructions: string // O
  knowledge_files: KnowledgeFile[] // O
  website_scrape_url: string // O
  faq_pairs: FaqPair[] // O

  /* ---- B1 · Clinic identity and eligibility ---- */
  insurance_bhyt_policy: { option: InsuranceOption; note: string } // R2
  /** VND; 0 = free; null = not answered. */
  consultation_fee: number | null // O
  facility_capabilities: string[] // O
  pre_appointment_instructions: string // O

  /* ---- B2 · Practitioners ---- */
  practitioner_roster: Practitioner[] // O

  /* ---- B3 · Clinical safety and escalation ---- */
  after_hours_emergency_target: { phone: string; name: string } // R2
  /** TE additions on top of the SW pack in `system.ts`; the pack cannot be removed. */
  emergency_red_flags_custom: string[] // O

  /* ---- [ext] Email skill ---- */
  email_rules: EmailRule[]
}

export type ConfigKey = keyof ReceptionistConfig

let counter = 0
/** Client-side row ids. The server replaces them on save. */
export function newId(prefix = 'row'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}
