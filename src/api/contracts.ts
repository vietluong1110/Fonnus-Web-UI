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
  leads: LeadsApi
}

/** The switchable groups. Keep in sync with `FonnusApi`'s keys. */
export const API_GROUPS = ['auth', 'tenant', 'assistant', 'receptionist', 'voice', 'leads'] as const
export type ApiGroup = (typeof API_GROUPS)[number]
