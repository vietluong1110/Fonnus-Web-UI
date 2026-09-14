/**
 * Every promise the frontend makes to the backend, in one file.
 *
 * Types only — no implementation, and no import from `./http`, `*.mock.ts` or
 * `*.live.ts`. Both implementations of each group are typed against the
 * interfaces here, so `npm run typecheck` fails the moment the live version
 * drifts from the mock. That is the whole safety mechanism.
 *
 * Wire shapes are documented in `docs/api-contract.md`; the field names come
 * from `docs/field-catalogue-mapping.md`. When you change an interface here,
 * change that document in the same commit.
 */
import type {
  BookingConfirmationChannel,
  IndustryVertical,
  KnowledgeFile,
  ReceptionistConfig,
  SpeakingSpeed,
  VoiceId,
  Weekday,
} from '../app/letan/model'

/** Every method takes this, so a caller can cancel on unmount. */
export interface Signal {
  signal?: AbortSignal
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type AuthMethod = 'phone' | 'email' | 'google'

/**
 * The signed-in owner. `GET /me`.
 *
 * `plan` is here because the sidebar renders it; today it comes from a hardcoded
 * demo constant, which is a lie the moment there are two customers.
 */
export interface Me {
  /** National-format phone, the email, or the Google address that signed in. */
  identity: string
  method: AuthMethod
  display_name: string
  clinic_name?: string
  plan?: string
}

export interface GoogleAccount {
  initials: string
  name: string
  email: string
}

export interface AuthApi {
  /** `GET /me`. Resolves `null` for an anonymous visitor — a 401 here is a normal answer. */
  me(opts?: Signal): Promise<Me | null>

  /** `POST /auth/otp`. `existing_account` turns a sign-up into a sign-in. */
  sendPhoneCode(phone: string, opts?: Signal): Promise<{ existing_account: boolean }>

  /** `POST /auth/otp/email`. Deliberately discloses nothing about the address. */
  sendEmailCode(email: string, opts?: Signal): Promise<void>

  /** `POST /auth/otp/verify`. On success the server sets the session cookie. */
  verifyCode(input: { identity: string; code: string }, opts?: Signal): Promise<Me>

  /** `PATCH /me`. The account already exists once a code has verified. */
  updateProfile(input: { full_name?: string; phone?: string }, opts?: Signal): Promise<Me>

  /** `POST /auth/signout`. Clears the cookie server-side. */
  signOut(opts?: Signal): Promise<void>

  /**
   * The accounts the in-page Google chooser offers. Empty in live mode, where
   * the chooser is replaced by a redirect to the OAuth endpoint.
   */
  googleAccounts(): readonly GoogleAccount[]

  /**
   * Live: the OAuth URL to send the browser to. Mock: `null`, meaning "render
   * the in-page chooser instead".
   *
   * The redirect URI must carry the hash — `https://app.fonnus.vn/#/app` — or
   * the app comes back to the landing page. See docs/open-questions.md Q18.
   */
  googleAuthUrl(): string | null

  /** Completes the in-page chooser. Live throws: the redirect signs you in instead. */
  signInWithGoogle(account: GoogleAccount, opts?: Signal): Promise<Me>
}

// ---------------------------------------------------------------------------
// Tenant configuration
// ---------------------------------------------------------------------------

/**
 * The config plus the two stamps that keep it honest.
 *
 * `version` is the optimistic-concurrency token — one record is written by the
 * forms, the question rail, the setup assistant and possibly a second laptop.
 * `catalogue_version` is compared against CATALOGUE_VERSION in model.ts, so
 * drift between this repo and the backend's catalogue is loud, not silent.
 */
export interface TenantConfigEnvelope {
  config: ReceptionistConfig
  version: string
  catalogue_version?: string
}

export interface TenantApi {
  /** `GET /tenant/config`. A brand-new tenant comes back seeded from the vertical template. */
  getConfig(opts?: Signal): Promise<TenantConfigEnvelope>

  /**
   * `PATCH /tenant/config` — one call per section save, carrying only that
   * section's keys. Returns the whole record so client-generated row ids and
   * any server normalisation reconcile for free.
   */
  patchConfig(
    patch: Partial<ReceptionistConfig>,
    opts?: Signal & { version?: string },
  ): Promise<TenantConfigEnvelope>

  /** `POST /tenant/config/reset` — back to the vertical template. */
  resetToTemplate(vertical: IndustryVertical, opts?: Signal): Promise<TenantConfigEnvelope>

  /** `POST /tenant/knowledge-files`, multipart. 20 MB cap enforced client-side too. */
  uploadKnowledgeFile(
    file: File,
    opts?: Signal & { onProgress?: (fraction: number) => void },
  ): Promise<KnowledgeFile>

  /** `DELETE /tenant/knowledge-files/{id}` */
  deleteKnowledgeFile(id: string, opts?: Signal): Promise<void>
}

// ---------------------------------------------------------------------------
// Setup assistant
// ---------------------------------------------------------------------------

export type ChatPage = 'ho-so' | 'kien-thuc' | 'ky-nang'

export type AttachmentKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slide' | 'text' | 'file'

/** A file already uploaded. The transport never sees a `File` object. */
export interface AttachmentRef {
  id: string
  name: string
  kind: AttachmentKind
  /** Bytes; 0 for pasted text. */
  size: number
  /** Object URL locally, a signed URL from the server. */
  previewUrl?: string
}

export interface AssistantTurn {
  /** One conversation per tab — the queue is filtered to that tab's questions. */
  page: ChatPage
  text: string
  attachments: AttachmentRef[]
  /** The question the rail is currently on, so the answer can be scored against it. */
  questionId?: string
  /**
   * The record as the owner currently sees it, including question-rail writes
   * that have not been saved through a section yet.
   *
   * The server has its own copy, so this is arguably redundant — but it is the
   * only way the model reasons about exactly what is on screen, and it is what
   * lets the mock work without reaching into the store. The live implementation
   * may drop it if the backend would rather read its own.
   */
  config: ReceptionistConfig
}

/**
 * What comes back from one turn, in order.
 *
 * The assistant's write authority is exactly the canned parser's: it *proposes*
 * a patch and the client applies it through the same path a form uses. Nothing
 * new can write to the record.
 */
export type AssistantEvent =
  /** Incremental assistant text. The mock emits exactly one. */
  | { type: 'delta'; text: string }
  /** The assistant filled something in. `confirm` is the "Đã ghi X vào Y" clause. */
  | { type: 'patch'; patch: Partial<ReceptionistConfig>; confirm: string }
  /** Understood but not usable — today's correction. Rendered with tone `error`. */
  | { type: 'rejected'; reason: string }
  /**
   * A file was read. Deliberately NOT auto-applied: the UI promises the owner in
   * writing that they review every suggestion before the agent uses it.
   */
  | { type: 'extraction'; file: AttachmentRef; patch: Partial<ReceptionistConfig>; summary: string }
  | { type: 'done' }

export interface AssistantApi {
  /**
   * One turn in, a stream of events out. Cancel by aborting the signal.
   *
   * An async iterable rather than a callback bag: `for await (const ev of ...)`
   * reads like the thing it is, and teardown is just the signal.
   */
  send(turn: AssistantTurn, opts: { signal?: AbortSignal }): AsyncIterable<AssistantEvent>

  /** Uploads an attachment before it can be sent with a turn. */
  upload(file: File, opts?: Signal & { onProgress?: (f: number) => void }): Promise<AttachmentRef>
}

// ---------------------------------------------------------------------------
// Receptionist preview — "gọi thử" on a config page
// ---------------------------------------------------------------------------

/**
 * The line a caller "says" when they say nothing. The try-out panel sends it
 * for the "Im lặng một lúc" prompt, and the receptionist answers with her
 * silence nudge — the one behaviour that cannot be triggered by typing.
 */
export const RECEPTIONIST_SILENCE = '[im lặng]'

export interface ReceptionistTurn {
  /** What the caller said — typed, or transcribed in the browser. */
  text: string
  /** The conversation so far, oldest first. The opening greeting is not included. */
  history: { role: 'caller' | 'agent'; text: string }[]
  /** Which Lễ tân sub-page the panel sits on, so a model can weight that section. */
  section?: string
  /**
   * The record as it is on screen — *including unsaved draft fields*. Unlike
   * the setup assistant, this is not redundant with the server's copy: the
   * whole point of the panel is hearing an edit before saving it.
   */
  config: ReceptionistConfig
}

export interface ReceptionistReply {
  text: string
  /**
   * Server-side TTS of `text` in the tenant's voice, when the backend produced
   * one in the same call. Null: the client voices it through `previewTts`, or
   * the browser's own Vietnamese voice as a last resort.
   */
  audio: { url: string; duration_ms: number } | null
}

export interface ReceptionistApi {
  /** `POST /receptionist/preview` — one caller line in, the receptionist's reply out. */
  reply(turn: ReceptionistTurn, opts?: Signal): Promise<ReceptionistReply>
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

export type VoiceAgentState =
  | 'connecting'
  | 'ringing'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ended'

/** Only things a human reads. Audio and loudness are deliberately not events — see below. */
export type VoiceEvent =
  | { type: 'state'; state: VoiceAgentState }
  | { type: 'transcript'; role: 'caller' | 'agent'; text: string; final: boolean }
  | { type: 'ended'; reason: 'user' | 'agent' | 'error' | 'timeout' | 'budget' }
  | { type: 'error'; message: string }

export interface VoiceSession {
  readonly events: AsyncIterable<VoiceEvent>

  /**
   * The UI's entire microphone surface is this boolean. The session owns
   * getUserMedia and everything downstream of it, because sample rate, framing
   * and codec are exactly what changes when the backend picks WebRTC over a raw
   * WebSocket into FreeSWITCH — and no component should have to know.
   */
  setMicEnabled(on: boolean): Promise<void>

  /** For callers who would rather type. */
  sendText(text: string): void

  /** Barge-in: stop the agent talking. */
  interrupt(): void

  /**
   * Audition the currently selected voice without changing it — the play button
   * in the call overlay's voice picker. A demo affordance; a live session may
   * no-op and let `previewTts` handle it instead.
   */
  previewVoice(): void

  /**
   * Output loudness, 0..1, or null when silent. Read from the orb's existing
   * requestAnimationFrame loop — NOT pushed as an event. A 60fps signal through
   * React state would re-render the whole overlay every frame.
   */
  getAmplitude(): number | null

  close(reason?: string): Promise<void>
}

export interface VoiceApi {
  connect(opts: {
    mode: 'landing-demo' | 'tenant-preview'
    voice?: VoiceId
    speed?: SpeakingSpeed
    signal?: AbortSignal
  }): Promise<VoiceSession>

  /**
   * `POST /tts/preview` — one line, one audio file. Replaces the browser's own
   * speech synthesis, which ignores the tenant's chosen voice entirely.
   *
   * There is a play button on nearly every config section, so the server must
   * cache on a hash of (text, voice, speed) or it will bill for the same
   * greeting a hundred times in one setup session.
   */
  previewTts(
    input: { text: string; voice: VoiceId; speed: SpeakingSpeed },
    opts?: Signal,
  ): Promise<{ url: string; duration_ms: number } | null>
}

// ---------------------------------------------------------------------------
// Insights — what the Tổng quan tab reads
// ---------------------------------------------------------------------------

/** The period the whole page is scoped to. `today` is midnight to now. */
export type InsightRange = 'today' | '7d' | '30d'

/**
 * One figure with the context that makes it mean something: the same span
 * immediately before it, and a short trend behind it.
 */
export interface InsightMetric {
  value: number
  /** `null` for a clinic with no history yet — the tile then shows no delta. */
  previous: number | null
  /**
   * Exactly seven points, one per day, oldest first, ending on the range's last
   * day — whatever the range. Thirty columns inside a 260px tile are a texture,
   * not a trend, so the tile always draws a week and the range only changes the
   * figure above it.
   */
  trend: number[]
}

/**
 * Why the caller rang. A closed set: the backend classifies, and this app owns
 * every Vietnamese word for it (`pages/overview/labels.ts`). Anything the
 * classifier cannot place is `other` — never a free-text label, which would be
 * server-authored copy on screen.
 */
export type CallIntent =
  | 'booking'
  | 'pricing'
  | 'hours_location'
  | 'practitioner'
  | 'insurance_payment'
  | 'other'

/** How the call ended. `unanswered` is the one that feeds `attention`. */
export type CallOutcome = 'answered' | 'transferred' | 'abandoned' | 'unanswered'

export type DurationBucket = 'under_1m' | '1_2m' | '2_4m' | '4_6m' | 'over_6m'

/**
 * One line of "Cần bạn xem" — something a real call turned up that the owner
 * can act on. A union rather than a `{ kind, text }` pair on purpose: each
 * kind carries exactly the values its Vietnamese sentence interpolates, so the
 * server never sends prose and the frontend never has to parse any.
 *
 * Where a row leads is this app's business, not the backend's — the routes are
 * hashes and they belong in `labels.ts`, not in a response.
 */
export type AttentionItem =
  /** Callers asked the price of a service that has none in `service_catalog`. */
  | { id: string; kind: 'missing_price'; count: number; service: string }
  /** Callers asked about a weekday whose hours the owner has not confirmed. */
  | { id: string; kind: 'unconfirmed_hours'; count: number; weekday: Weekday }
  /** Held by the receptionist, still waiting on the clinic. */
  | {
      id: string
      kind: 'pending_appointments'
      count: number
      appointments: { customer_name: string; starts_at: string }[]
    }
  /** Calls outside opening hours that nobody has returned. ISO datetimes. */
  | { id: string; kind: 'after_hours_callback'; count: number; from: string; to: string }
  /** A question she had no answer for, in the caller's own words. */
  | { id: string; kind: 'unanswered_question'; count: number; question: string }

export interface InsightsOverview {
  range: InsightRange
  /** ISO. The page dates itself from this rather than from the browser clock. */
  generated_at: string

  calls: InsightMetric
  bookings: InsightMetric
  /** Seconds of talk time across the range — "bạn không phải nghe máy". */
  talk_time: InsightMetric
  /** Seconds. */
  avg_duration: InsightMetric
  after_hours: InsightMetric

  /** One entry per day in the range, oldest first. ISO dates. */
  by_day: { date: string; count: number }[]
  /** 24 numbers, midnight first: the average day inside the range. */
  by_hour: number[]
  by_intent: { intent: CallIntent; count: number }[]
  by_outcome: { outcome: CallOutcome; count: number }[]
  by_duration: { bucket: DurationBucket; count: number }[]

  attention: AttentionItem[]
}

export interface InsightsApi {
  /** `GET /insights/overview?range=…` — everything the Tổng quan tab draws, in one call. */
  overview(range: InsightRange, opts?: Signal): Promise<InsightsOverview>
}

// ---------------------------------------------------------------------------
// Calls — what the Cuộc gọi tab reads
// ---------------------------------------------------------------------------

/**
 * The chips above the list. Applied by the server, not the page: the list is
 * paged, so a filter over the rows already loaded would count and show only
 * what happened to arrive first.
 *
 * `callback` means a callback she promised that nobody has made yet.
 */
export type CallFilter = 'all' | 'callback' | 'booked' | 'transferred' | 'unanswered'

/**
 * Something the receptionist did not know, found on one call. The same three
 * kinds `attention` counts across many calls, carrying the same values, so
 * Tổng quan's "5 khách hỏi giá…" and the call it came from name the same thing.
 */
export type KnowledgeGap =
  | { kind: 'missing_price'; service: string }
  | { kind: 'unconfirmed_hours'; weekday: Weekday }
  | { kind: 'unanswered_question'; question: string }

/** One row of the list. */
export interface CallSummary {
  id: string
  /** ISO datetime. */
  started_at: string
  duration_s: number
  /** Digits only, national format: `0903812217`. The app spaces it. */
  caller_number: string
  /**
   * What the caller said their name is, as she would address them — `Chị
   * Trang`. `null` until she has learned it, on this call or an earlier one
   * from the same number.
   */
  caller_name: string | null
  /** This call's place among every call from the number, oldest first: 1 is a first call. */
  caller_call_number: number
  intent: CallIntent
  /**
   * What the caller wanted, in a few words — `Giá cấy ghép implant`. Written
   * from the conversation, so it is content about the call like the transcript
   * is, never interface copy. See docs/open-questions.md Q24.
   */
  topic: string
  outcome: CallOutcome
  /** She held an appointment during the call. Independent of `outcome`. */
  booked: boolean
  /** Outside the clinic's opening hours on that weekday. */
  after_hours: boolean
  /** A callback she promised the caller. `done_at` stays null until someone makes it. */
  callback: { due_by: string | null; done_at: string | null } | null
  /** The first thing she did not know on this call. */
  gap: KnowledgeGap | null
}

/**
 * Something she did during the call, as a machine code. The Vietnamese is this
 * app's (`pages/calls/labels.ts`); dates are ISO.
 */
export type CallEvent =
  | { type: 'availability_checked'; date: string }
  | { type: 'appointment_held'; starts_at: string }
  | { type: 'message_taken'; callback_by: string | null }
  | { type: 'transferred'; to_name: string; answered: boolean; ring_s: number }
  | { type: 'transfer_ended'; to_name: string; talk_s: number }
  | { type: 'caller_hung_up' }

/**
 * The conversation, in order. `at_ms` is from the start of the recording, so a
 * line and the audio under it are the same moment.
 *
 * `disclosure` is the opening AI and recording notice — the same words on every
 * call, so it carries no text.
 */
export type CallTurn =
  | { kind: 'disclosure'; at_ms: number }
  | { kind: 'caller' | 'agent'; at_ms: number; text: string; gap?: KnowledgeGap }
  | { kind: 'event'; at_ms: number; event: CallEvent }

export interface CallDetail extends CallSummary {
  /** One or two sentences on what happened, written from the conversation. Content, like `topic`. */
  summary: string
  /**
   * `null` once the recording is past `recording_retention`, or when the caller
   * declined recording — the transcript may outlive it.
   */
  recording: { url: string; duration_ms: number } | null
  turns: CallTurn[]
  booking: { starts_at: string; service: string; practitioner: string | null } | null
  transfer: { to_name: string; answered: boolean; ring_s: number; talk_s: number } | null
  /** Every other call from this number, newest first. */
  others: CallSummary[]
}

export interface CallListQuery {
  range: InsightRange
  filter: CallFilter
  /**
   * Digits match the number (`217` finds `0903 812 217`); anything else matches
   * the name, the topic and the transcript, ignoring Vietnamese diacritics.
   */
  q?: string
  /** From the previous page's `next_cursor`. */
  cursor?: string | null
}

export interface CallListPage {
  /** ISO. The page dates itself from this rather than from the browser clock. */
  generated_at: string
  /** Newest first. */
  calls: CallSummary[]
  next_cursor: string | null
  /**
   * For the range and search, whatever the filter — the numbers on the chips.
   * `callback` counts only callbacks not yet made.
   */
  counts: Record<CallFilter, number>
  /**
   * Calls per day for the range, search *and* filter, newest first — the count on
   * each day's band. From the server, because a page boundary can fall mid-day.
   */
  by_day: { date: string; count: number }[]
}

export interface CallsApi {
  /** `GET /calls?range=…&filter=…&q=…&cursor=…` */
  list(query: CallListQuery, opts?: Signal): Promise<CallListPage>

  /** `GET /calls/{id}` — the conversation, the recording and what she did. */
  get(id: string, opts?: Signal): Promise<CallDetail>

  /** `POST /calls/{id}/callback` `{ done }` — the owner made the callback, or undid saying so. */
  setCallbackDone(id: string, done: boolean, opts?: Signal): Promise<CallSummary>
}

// ---------------------------------------------------------------------------
// Appointments — what the Lịch hẹn tab reads
// ---------------------------------------------------------------------------

/**
 * Where an appointment stands.
 *
 * - `held` — inside the receptionist's booking rules. Nothing for the clinic to do.
 * - `pending` — a time she may not give away herself; she noted it, the clinic decides.
 * - `arrived` / `no_show` — marked by the front desk, the second only after the start.
 * - `cancelled` — by the caller on a later call, or by the clinic.
 */
export type AppointmentStatus = 'held' | 'pending' | 'arrived' | 'no_show' | 'cancelled'

/** Why a `pending` appointment waits. A machine code; this app writes the sentence. */
export type PendingReason = 'outside_booking_hours' | 'over_daily_limit'

/**
 * What was sent to the caller after booking. `failed` is the one the clinic is
 * told about — a number with no Zalo, a message that bounced. `informed` is the
 * clinic saying it rang the caller itself.
 */
export type ConfirmationState = 'sent' | 'failed' | 'not_sent' | 'informed'

/**
 * One appointment the receptionist booked. Only hers: staff-booked appointments
 * arrive when the clinic's own software is synced, and are not in this contract.
 *
 * Names, notes and the service are recorded content — the tenant's own words
 * and the caller's — so they come back verbatim. Every sentence around them is
 * this app's (`pages/appointments/labels.ts`).
 */
export interface Appointment {
  id: string
  /** ISO datetime. */
  starts_at: string
  duration_min: number
  status: AppointmentStatus
  /** Set when, and only when, `status` is `pending`. */
  pending_reason: PendingReason | null
  /** A caller rang back to move it. She never moves a booking herself. ISO datetime. */
  change_request: { starts_at: string } | null
  /** The tenant's own `service_name` from `service_catalog`, as it was when booked. */
  service_name: string
  /** The price she read out, from the same row. `null` when the list had none. */
  price_from: number | null
  price_to: number | null
  /** The `practitioner_roster` row, its name as the roster wrote it ("BS Hùng"). `null`: no preference. */
  practitioner: { id: string; name: string } | null
  /** As she wrote it down, salutation included — "Chị Trang", "Bé Bảo An". */
  patient_name: string
  /** Who rang, when the caller booked for somebody else — a parent for a child. */
  booked_by: string | null
  phone: string
  /** Visits before this one. `0` is a new patient. */
  prior_visits: number
  /** What she noted on the call, in the caller's words. May be empty. */
  note: string
  /** The `pre_appointment_instructions` she read to the caller, or `null`. */
  instructions: string | null
  /** The call she booked on. `null` once the recording has been purged. */
  call: { id: string; started_at: string; duration_s: number } | null
  confirmation: { channel: BookingConfirmationChannel; state: ConfirmationState; at: string | null }
}

export interface AppointmentsWeek {
  /** ISO dates, inclusive — the days asked for. */
  from: string
  to: string
  /** ISO. */
  generated_at: string
  /** Everything starting inside `from`–`to`, cancelled included. */
  appointments: Appointment[]
  /**
   * Every upcoming appointment waiting on the clinic, whatever week it falls in —
   * `pending`, a `change_request`, a `failed` confirmation. The strip above the
   * calendar reads this, so a request for next Thursday is not hidden behind the
   * week the owner happens to be looking at.
   */
  attention: Appointment[]
  /** Whether this clinic has ever had one. Tells a quiet week from a first week. */
  has_any: boolean
}

/** The light actions an owner has on an appointment. Moving a time is not one of them. */
export type AppointmentAction =
  | 'confirm'
  | 'decline'
  | 'accept_change'
  | 'keep_time'
  | 'arrived'
  | 'no_show'
  | 'cancel'
  | 'restore'
  | 'informed'

export type CalendarProvider = 'google' | 'microsoft'

/** An outside calendar the receptionist's bookings are copied to. */
export interface CalendarConnection {
  provider: CalendarProvider
  /** The account the owner signed in to at the provider. */
  account_email: string
  connected_at: string
}

export interface AppointmentsApi {
  /** `GET /appointments?from=YYYY-MM-DD&to=YYYY-MM-DD` */
  list(from: string, to: string, opts?: Signal): Promise<AppointmentsWeek>
  /** `POST /appointments/{id}/actions` — the appointment as it now stands. */
  act(id: string, action: AppointmentAction, opts?: Signal): Promise<Appointment>
  /** `GET /appointments/calendars` — the outside calendars bookings are copied to. */
  calendars(opts?: Signal): Promise<CalendarConnection[]>
  /** `POST /appointments/calendars/{provider}` — live answers with the provider's consent URL; the mock connects at once. */
  connectCalendar(provider: CalendarProvider, opts?: Signal): Promise<{ redirect_url: string | null; connection: CalendarConnection | null }>
  /** `DELETE /appointments/calendars/{provider}` */
  disconnectCalendar(provider: CalendarProvider, opts?: Signal): Promise<void>
}

// ---------------------------------------------------------------------------
// Numbers — what the Số điện thoại tab reads and writes
// ---------------------------------------------------------------------------

/**
 * The shape a number's last digits make, as a machine code. The app names it
 * (`pages/numbers/labels.ts`): lộc phát (…68, …86), thần tài (…39, …79), tứ quý
 * (four of a digit), sảnh tiến (four rising), dễ nhớ (a repeated pair).
 */
export type NumberPattern = 'loc_phat' | 'than_tai' | 'tu_quy' | 'sanh_tien' | 'de_nho'

/**
 * A receptionist a number can ring through to. Today a tenant has one; the tab
 * is drawn for several (docs/open-questions.md Q25).
 */
export interface Receptionist {
  id: string
  /** Her `agent_name`. */
  name: string
  /** The branch she answers for, as `branch_list` names it. `null` for the main clinic. */
  branch: string | null
}

/** When the clinic's old line hands a call to the Fonnus number. */
export type ForwardMode = 'all' | 'no_answer' | 'busy'

/** A number the clinic has bought. */
export interface OwnedNumber {
  id: string
  /** Digits only, national format: `02473077199`. The app spaces it. */
  number: string
  receptionist_id: string
  /** `activating` until the carrier routes calls to her, then `live`. */
  status: 'activating' | 'live'
  /** ISO. */
  bought_at: string
  /**
   * What the owner says they set up on their old line. Fonnus cannot see that
   * line, so this is the owner's note, not a state the server checks.
   */
  forwarding: { from_number: string; mode: ForwardMode } | null
}

export interface NumbersOverview {
  numbers: OwnedNumber[]
  receptionists: Receptionist[]
  /** Who the VAT invoice is made out to. `null` until the clinic has given it. */
  invoice: { legal_name: string; tax_code: string } | null
}

/** One number the clinic could take. */
export interface PoolNumber {
  number: string
  pattern: NumberPattern | null
  /** How many trailing digits the pattern covers — the ones the app lights. `0` without one. */
  pattern_digits: number
  /** Another clinic is mid-checkout on it. Shown, but not pressable. */
  held: boolean
  /** Per number, not per page: the kho will hold other cities. */
  area: { code: string; city: string }
  /** One-time, in đồng, VAT included. Per number, because prices will differ. */
  price_vnd: number
}

export interface PoolQuery {
  pattern?: NumberPattern | null
  /** Digits. Numbers ending in them first, then numbers containing them after the area code. */
  q?: string
  cursor?: string | null
  /** How many to return. The server caps it; the page asks for a full grid (9, or 8 on a phone). */
  limit?: number
}

export interface PoolPage {
  numbers: PoolNumber[]
  next_cursor: string | null
  /** For the search, whatever the pattern — the numbers on the chips. */
  counts: Record<'all' | NumberPattern, number>
}

/** A number kept for this clinic while the owner pays. */
export interface NumberHold {
  id: string
  number: string
  /** ISO. Shown as a clock time, never as a countdown. */
  held_until: string
  /** The price quoted for this hold; the checkout charges exactly this. */
  price_vnd: number
}

export type PayMethod = 'vietqr' | 'card' | 'momo'

export interface Checkout {
  id: string
  hold_id: string
  number: string
  method: PayMethod
  amount_vnd: number
  /** `expired`: `expires_at` passed unpaid. */
  status: 'awaiting_payment' | 'paid' | 'expired' | 'failed'
  /** ISO. The payment window — five minutes from checkout — which the panel counts down. The server enforces it. */
  expires_at: string
  /** VietQR: the code to scan, and the transfer details for anyone typing them instead. */
  vietqr: { image_url: string; bank: string; account_number: string; account_name: string; memo: string } | null
  /** Card and MoMo: the payment gateway's page. `null` when the gateway has none. */
  redirect_url: string | null
  /** MoMo: a code to scan with the MoMo app. */
  qr_image_url: string | null
  /** The number, once paid. */
  owned: OwnedNumber | null
}

export interface NumbersApi {
  /** `GET /numbers` — what the clinic owns and who can answer. */
  overview(opts?: Signal): Promise<NumbersOverview>
  /** `GET /numbers/pool?pattern=…&q=…&cursor=…` */
  pool(query: PoolQuery, opts?: Signal): Promise<PoolPage>
  /** `POST /numbers/holds` `{ number }` — `409 number_taken` when someone got there first. */
  hold(number: string, opts?: Signal): Promise<NumberHold>
  /** `DELETE /numbers/holds/{id}` — the owner walked away before paying. */
  releaseHold(holdId: string, opts?: Signal): Promise<void>
  /** `POST /numbers/checkouts` — `409 hold_expired` when the hold ran out. */
  checkout(holdId: string, input: { receptionist_id: string; method: PayMethod }, opts?: Signal): Promise<Checkout>
  /** `GET /numbers/checkouts/{id}` — polled while the owner pays. */
  checkoutStatus(id: string, opts?: Signal): Promise<Checkout>
  /** `PATCH /numbers/{id}` `{ receptionist_id }` */
  assign(id: string, receptionistId: string, opts?: Signal): Promise<OwnedNumber>
  /** `PATCH /numbers/{id}` `{ forwarding }` — `null` clears it. */
  setForwarding(id: string, forwarding: OwnedNumber['forwarding'], opts?: Signal): Promise<OwnedNumber>
  /** `DELETE /numbers/{id}` — the number goes back to the pool. */
  release(id: string, opts?: Signal): Promise<void>
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export interface LeadInput {
  clinic_name: string
  contact_name: string
  phone: string
}

/** One clinic site to ring: where it is, and the number patients call. */
export interface HotlineLocation {
  address: string
  /** National form, digits only: `02838221234`, `0901234567`, `19001234`. */
  phone: string
}

export interface HotlineReportInput {
  contact_name: string
  /** Where the report is sent. */
  email: string
  /** A clinic, or the chain that owns several. */
  clinic_name: string
  /** At least one. */
  locations: HotlineLocation[]
}

export interface LeadsApi {
  /** `POST /leads`. Unauthenticated: the landing-page contact form. */
  submit(input: LeadInput, opts?: Signal): Promise<void>
  /** `POST /leads/hotline-report`. Unauthenticated: the "Chấm điểm hotline" page. */
  requestHotlineReport(input: HotlineReportInput, opts?: Signal): Promise<void>
}

// ---------------------------------------------------------------------------
// Account — the Cài đặt and Gói dịch vụ pages
// ---------------------------------------------------------------------------

export type PlanId = 'basic' | 'standard' | 'advanced'
export type BillingPeriod = 'monthly' | 'annual'

/** One paid plan. Its name and blurb are this app's copy, keyed on `id`; the figures are the server's. */
export interface Plan {
  id: PlanId
  price_monthly_vnd: number
  /** Per month, when a year is paid at once. */
  price_annual_per_month_vnd: number
  /** The one payment for a year. */
  price_annual_vnd: number
  minutes: number
  overage_vnd_per_minute: number
  numbers: number
  concurrent_calls: number
  own_voice: boolean
  account_manager: boolean
}

export interface Subscription {
  plan_id: PlanId
  period: BillingPeriod
  /** YYYY-MM-DD — the first day of the next cycle, when the next charge falls. */
  renews_on: string
  /** What `renews_on` will charge: the scheduled plan if there is one, plus this cycle's overage. VAT included. */
  next_charge_vnd: number
  /**
   * A booked change. `starts_on` is `renews_on`, or later for a move down while `held_until` runs.
   */
  scheduled: { plan_id: PlanId; period: BillingPeriod; starts_on: string } | null
  /**
   * After a monthly move up: the last day of the next full cycle. A move down starts no earlier
   * than the day after (docs/account-billing-decisions.md D3). `null` when no hold runs.
   */
  held_until: string | null
  numbers_used: number
}

export interface UsageCycle {
  /** YYYY-MM-DD, both inclusive. */
  start: string
  end: string
  /**
   * The sum of `by_day` — one source, so the figure and the bars cannot disagree. Counted per
   * second; spam, silent calls and very short calls are not counted (decisions doc D9).
   */
  minutes_used: number
  /** Minutes answered per day, from `start` to today; the last entry is today so far. */
  by_day: number[]
  /** The whole cycle at the current pace. `null` until three days have passed. */
  projected_minutes: number | null
  // No `carried_minutes`: unused minutes do not roll over — the allowance is the plan's `minutes`,
  // reset at each renewal (owner's decision, 14 Sept 2026; docs/account-billing-decisions.md D5).
}

export interface AccountProfile {
  display_name: string
  /** Digits, national format. The login for a phone account, a contact number otherwise. */
  phone: string
  email: string | null
  email_verified: boolean
  /** The linked Google address — always set for a Google account. */
  google_email: string | null
}

/** Who the VAT e-invoice is made out to. Asked for before a payment, never after it (Decree 70/2025). */
export interface InvoiceProfile {
  legal_name: string
  tax_code: string
  address: string
  email: string
}

export interface Invoice {
  id: string
  /** YYYY-MM-DD */
  issued_on: string
  kind: 'plan' | 'number'
  plan_id: PlanId | null
  number: string | null
  period: { start: string; end: string } | null
  overage_minutes: number
  amount_vnd: number
  pdf_url: string
}

export interface AccountSession {
  id: string
  device: 'desktop' | 'tablet' | 'phone'
  /** Proper names, shown as they are: `Chrome`, `Safari`, `Cốc Cốc`. */
  browser: string
  os: string
  /** From the IP, in Vietnamese. `null` when the lookup has nothing. */
  city: string | null
  last_active_at: string
  /** The session making this request. It cannot be signed out from here. */
  current: boolean
}

export interface DataExport {
  status: 'none' | 'preparing' | 'ready'
  ready_at: string | null
  expires_at: string | null
  download_url: string | null
}

export interface AccountOverview {
  profile: AccountProfile
  method: AuthMethod
  /** Email accounts only; `null` for phone and Google, which have no password. */
  password_changed_at: string | null
  subscription: Subscription
  usage: UsageCycle
  /** Demo for now: automated billing is out of MVP, and the first clinics are invoiced by hand (Q26). */
  pay_method: PayMethod
  invoice_profile: InvoiceProfile | null
  invoices: Invoice[]
  sessions: AccountSession[]
  export: DataExport
  deletion: { scheduled_for: string } | null
  /**
   * Days between asking to delete and the deletion — 14, decided 14 Sept 2026 (decisions doc D13). The account is
   * deactivated at once and the deletion can be cancelled until then. Server-owned so the rule
   * can change without a release; the confirmation says it before the button.
   */
  deletion_grace_days: number
}

export interface PlanQuote {
  plan_id: PlanId
  period: BillingPeriod
  /**
   * A monthly move up starts today, with the new plan's **full** minute allowance for the rest
   * of the cycle (not prorated); everything else waits for the renewal, with no refund.
   * docs/account-billing-decisions.md D1–D4.
   */
  applies: 'now' | 'renewal'
  /** Today, `renews_on`, or — for a move down while a hold runs — the day after `held_until`. */
  effective_on: string
  /** The difference for the days left of this cycle, today counted, rounded to 1.000đ. `0` when the change waits. */
  charge_today_vnd: number
  /** From `renews_on`: a month, or the year paid at once. */
  next_charge_vnd: number
  /** For a move up that applies now: the last day of the next full cycle, said before the button. Otherwise `null`. */
  held_until: string | null
}

export interface AccountApi {
  /** `GET /account` — the whole Cài đặt page in one read. */
  overview(opts?: Signal): Promise<AccountOverview>
  /** `GET /plans` — the paid plans. */
  plans(opts?: Signal): Promise<Plan[]>
  /** `PATCH /account/profile` */
  updateProfile(patch: { display_name?: string; email?: string }, opts?: Signal): Promise<AccountProfile>
  /** `POST /account/phone` `{ phone }` — sends a code to the new number. `409 phone_in_use`. */
  requestPhoneChange(phone: string, opts?: Signal): Promise<void>
  /** `POST /account/phone/verify` `{ phone, code }` */
  confirmPhoneChange(input: { phone: string; code: string }, opts?: Signal): Promise<AccountProfile>
  /** `POST /account/google` — live answers with Google's consent URL; the mock links at once. */
  linkGoogle(opts?: Signal): Promise<{ redirect_url: string | null; profile: AccountProfile }>
  /** `DELETE /account/google` — `409 google_only_method` for a Google account. */
  unlinkGoogle(opts?: Signal): Promise<AccountProfile>
  /** `PATCH /account/billing` `{ pay_method }` */
  setPayMethod(method: PayMethod, opts?: Signal): Promise<void>
  /** `PATCH /account/billing` `{ invoice_profile }` */
  setInvoiceProfile(profile: InvoiceProfile, opts?: Signal): Promise<InvoiceProfile>
  /** `POST /account/password` `{ current, next }` — signs every other session out. */
  changePassword(input: { current: string; next: string }, opts?: Signal): Promise<void>
  /** `DELETE /account/sessions/{id}` */
  signOutSession(id: string, opts?: Signal): Promise<void>
  /** `POST /account/sessions/sign-out-others` */
  signOutOthers(opts?: Signal): Promise<void>
  /** `POST /account/export` */
  startExport(opts?: Signal): Promise<DataExport>
  /** `GET /account/export` — polled while `preparing`. */
  exportStatus(opts?: Signal): Promise<DataExport>
  /** `POST /account/deletion` `{ confirm_name }` — `422 confirm_mismatch` unless it is the clinic's name. */
  scheduleDeletion(confirmName: string, opts?: Signal): Promise<{ scheduled_for: string }>
  /** `DELETE /account/deletion` */
  cancelDeletion(opts?: Signal): Promise<void>
  /** `POST /plans/quote` `{ plan_id, period }` — what a change costs and when it starts. */
  quotePlan(input: { plan_id: PlanId; period: BillingPeriod }, opts?: Signal): Promise<PlanQuote>
  /** `POST /subscription/change` `{ plan_id, period }` — charged to `pay_method`. */
  changePlan(input: { plan_id: PlanId; period: BillingPeriod }, opts?: Signal): Promise<Subscription>
  /** `DELETE /subscription/scheduled` */
  cancelScheduledChange(opts?: Signal): Promise<Subscription>
}

// ---------------------------------------------------------------------------
// Shell — what the sidebar shows on every page
// ---------------------------------------------------------------------------

/**
 * The few figures the sidebar carries on every page: what is waiting on the owner, and the
 * minutes. The shell reads it on every navigation, so it is one small read rather than three
 * list endpoints — and each figure must equal the one the tab behind it shows.
 */
export interface ShellSummary {
  /** ISO. */
  generated_at: string
  /**
   * Callbacks she promised that nobody has made yet — `counts.callback` of `GET /calls?range=7d`,
   * the range Cuộc gọi opens on, so the badge and the chip the owner lands on say the same number.
   */
  callbacks_owed: number
  /** Upcoming appointments waiting on the clinic — the length of `AppointmentsWeek.attention`. */
  appointments_waiting: number
  /** This cycle: `usage.minutes_used`, the plan's `minutes`, `subscription.renews_on` — as `GET /account` has them. */
  minutes: { used: number; included: number; renews_on: string }
  plan_id: PlanId
}

export interface ShellApi {
  /** `GET /shell/summary` */
  summary(opts?: Signal): Promise<ShellSummary>
}

// ---------------------------------------------------------------------------
// The whole surface
// ---------------------------------------------------------------------------

export interface FonnusApi {
  auth: AuthApi
  tenant: TenantApi
  assistant: AssistantApi
  receptionist: ReceptionistApi
  voice: VoiceApi
  insights: InsightsApi
  calls: CallsApi
  appointments: AppointmentsApi
  numbers: NumbersApi
  account: AccountApi
  leads: LeadsApi
  shell: ShellApi
}

/** The switchable groups. Keep in sync with `FonnusApi`'s keys. */
export const API_GROUPS = [
  'auth',
  'tenant',
  'assistant',
  'receptionist',
  'voice',
  'insights',
  'calls',
  'appointments',
  'numbers',
  'account',
  'leads',
  'shell',
] as const
export type ApiGroup = (typeof API_GROUPS)[number]
