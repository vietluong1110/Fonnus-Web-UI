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
// Leads
// ---------------------------------------------------------------------------

export interface LeadInput {
  clinic_name: string
  contact_name: string
  phone: string
}

export interface LeadsApi {
  /** `POST /leads`. Unauthenticated: the landing-page contact form. */
  submit(input: LeadInput, opts?: Signal): Promise<void>
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
  leads: LeadsApi
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
  'leads',
] as const
export type ApiGroup = (typeof API_GROUPS)[number]
