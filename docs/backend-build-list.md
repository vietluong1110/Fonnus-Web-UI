# Backend build list

What has to exist behind this app before its screens can run on real data — the services, jobs,
integrations and internal tools, page by page — and which of them the pilot needs.

Written for Fonnus engineers. Status: **15 Sept 2026**. It started from the owner's draft list and
was checked against every page in `src/` and every doc in `docs/`. Sections the draft did not have
are marked *added*.

---

## How to read this

**This file says what to build, not what goes over the wire.** Request and response shapes are in
[`api-contract.md`](./api-contract.md), cited here as "contract §8". Where the two disagree on a
shape, the contract wins and this file is wrong.

| Doc | Answers |
|---|---|
| [`api-contract.md`](./api-contract.md) | every endpoint, request and response |
| [`account-billing-decisions.md`](./account-billing-decisions.md) | the rules billing and deletion must enforce (D1–D15) |
| [`open-questions.md`](./open-questions.md) | decisions still owed to the frontend (Q1–Q27) |
| [`field-catalogue-mapping.md`](./field-catalogue-mapping.md) | how the config record maps to catalogue v1 |
| [`backend-integration.md`](./backend-integration.md) | how to switch a group of calls from the mock to the real backend |
| `CONTEXT.md` | product scope, the pilot, the stack that exists |

Every build item carries one tag:

| Tag | Meaning |
|---|---|
| **Pilot** | The first clinic (mid-November 2026) needs it. Either `CONTEXT.md` puts it in MVP, or a screen the pilot owner uses does not work without it |
| **After pilot** | `CONTEXT.md` puts it out of MVP, or a decision in D1–D15 defers it |
| **Decide** | The UI already draws or promises it, but `CONTEXT.md` leaves it out of MVP. Build it, or change the screen — §13 lists each one |

A number marked *proposed* (a limit, a window) has not been decided. It is a starting value.

---

## Where we start

**The backend** (from `CONTEXT.md`) has the phone pipeline and little else.

- **Built:** FreeSWITCH + `mod_audio_stream` on an FPT SIP trunk → Deepgram Nova-3 → Qwen 3.5 via
  OpenRouter → ElevenLabs. The consent gate at call open. Call logging — transcripts, recordings,
  metadata — in PostgreSQL with Drizzle.
- **Not built:** tenancy (one `TENANT_ID` per process), a per-tenant prompt (today a hardcoded
  constant), tool calling, appointment and availability tables, and any HTTP API — the whole surface
  is `/healthz` and `/metrics`.

**The frontend** has every screen, and none of them has talked to a server.

- Twelve API groups have a mock and a live stub, typed against `src/api/contracts.ts`: `auth`,
  `tenant`, `assistant`, `receptionist`, `voice`, `insights`, `calls`, `appointments`, `numbers`,
  `account`, `leads`, `shell`.
- A group goes live on its own with `VITE_API_LIVE_GROUPS=<group>`. `npm run typecheck` fails when a
  live file drifts from its mock.

---

## The map

Sixteen building blocks sit under the pages. Most pages use several. Each is built once, in the
section named.

| Building block | Built in | Used by | Tag |
|---|---|---|---|
| Web voice gateway — a call from a browser | §1.1 | landing demo, Lễ tân try-out, "Gọi thử Linh" | Pilot |
| Leads store and inbox | §1.2 | contact form, hotline report | Pilot |
| Hotline report operations | §1.3 | Chấm điểm hotline | Pilot |
| Accounts, sign-in and sessions | §2 | every signed-in request, Cài đặt | Pilot · Decide (open sign-up, trial) |
| Call records and post-call processing | §3 | Cuộc gọi, Tổng quan, Gửi email, usage | Pilot |
| Read models and counters | §4, §10 | Tổng quan, sidebar | Pilot |
| Booking ledger and appointments | §5 | Lịch hẹn, the booking tool | Pilot · Decide (moves and cancels by phone) |
| Outside calendar sync | §5.6 | Lịch hẹn | Decide |
| Tenancy and the config store | §6.1 | Lễ tân, every call | Pilot |
| Prompt assembly and call-time skills | §6.2, §6.5–6.6 | every call, try-out, demo | Pilot |
| Number inventory, routing and activation | §7 | Số điện thoại, every call | Pilot |
| Payments and e-invoices | §7.4, §9.4 | number checkout, plan changes | Decide |
| Data rights: export, deletion, retention | §8.6–8.7 | Cài đặt, legal | Pilot |
| Subscriptions and usage metering | §9 | Gói dịch vụ, Cài đặt, sidebar | Pilot (metering) · After pilot (charging) |
| Messaging: SMS, email, Zalo | §11.2 | codes, confirmations, Gửi email, exports, reports | Pilot (SMS, email) · Decide (Zalo) |
| Back office — Fonnus's internal tool | §11.3 | numbers, leads, reports, onboarding, billing | Pilot |

After the pages: §10 the sidebar, §11 the shared platform and back office, §12 the frontend work
this depends on, §13 decisions, §14 a suggested order.

---

## 1. Landing page — `#` and `#/cham-diem-hotline`

### 1.1 Demo call with Fonnus's receptionist — **Pilot**

**The owner's brief (15 Sept 2026):**
- A visitor talks to an AI receptionist from the browser, not over a phone line.
- Fonnus configures that receptionist.
- Each call lasts at most one minute.
- A visitor who starts calls too many times in a row is frozen for a while.

**Today.**
- The orb and "Nghe thử Linh" call `api.voice.connect({ mode: 'landing-demo' })`
  (`hooks/useCallDemo.ts:50`).
- The mock opens no microphone. It plays `public/audio/linh-greeting.wav`, and a typed line or a
  chip only keeps the orb "speaking" for 4.4 s, with no reply.
- The live stub rejects with `voice_transport_undecided` (`api/voice.live.ts`).
- The page promises *"Không cần cài đặt, không cần để lại số"* — no install, no need to leave a
  number — so the caller is anonymous.

**Build**

| Item | Detail |
|---|---|
| **Web voice gateway** | Browser mic → the same STT → LLM → TTS session code a phone call uses → audio back to the page. One gateway serves this demo and the Lễ tân try-out (§6.3). Transport options below |
| **Session start** | An endpoint that returns a short-lived token and socket URL — or refuses with `429 demo_frozen` and `retry_after` before any audio flows. The wire format is not agreed (contract §13); agree it before building |
| **The demo receptionist** | A Fonnus-owned tenant (say `fonnus-demo`) in the same config store, edited through the same Lễ tân screens by a Fonnus account. The demo then runs the product's own prompt path, and changing what she says is a config edit, not a deploy |
| **One-minute cap** | Enforced by the server. At about 50 s she says a closing line; at 60 s the session ends with `ended { reason: 'timeout' }`. The browser's timer is display only |
| **Freeze on repeats** | Keyed on a signed anonymous device cookie **and** on the IP. *Proposed:* 3 calls in 10 min from one device → that device is frozen for 30 min; 10 calls in an hour from one IP → that IP is frozen for 1 h. The IP limit has to be looser than the device limit, because Vietnamese mobile networks put many subscribers behind one address (carrier-grade NAT) |
| **Budget and kill switch** | A cap on concurrent demo sessions and a daily spend budget. Past either, new calls are refused with `demo_unavailable`, and the page falls back to today's scripted greeting. A switch in the back office (§11.3) forces the same state |
| **Side effects sandboxed** | The demo tenant's tools write nothing: no appointment, no SMS, no transfer to a real phone, no email |
| **Not a call record** | It does not appear in any tenant's Cuộc gọi, Tổng quan or usage. Keep only per-session metrics: duration, end reason, cost |
| **Recording** | *Proposed:* record nothing. A visitor's voice is personal data, and the demo has no use for it. If transcripts are wanted for evals, ask for consent first |

**Transport — pick one**

| Option | How | For | Against |
|---|---|---|---|
| **A. Audio over a WebSocket, into the session layer** | The browser captures the mic (`getUserMedia`, echo cancellation on), streams audio frames over WSS to the Node session code, and plays the TTS audio that comes back on the same socket | The pipeline already takes its audio from `mod_audio_stream` over a WebSocket, so this is a second adapter, not new infrastructure. No new frontend dependency. No NAT or TURN problems | TCP turns packet loss into delay. The browser owns playback buffering |
| **B. WebRTC into FreeSWITCH** | FreeSWITCH's own WebRTC endpoint | The browser call becomes an ordinary channel, identical to a phone call from there on | Needs a signalling library in the browser — a new dependency, which this repo does not take without asking (`CLAUDE.md`). Needs a TURN server |
| **C. WebRTC through an SFU** | A media server in front of the pipeline | The best media quality at scale | A new service to run, and a client SDK |

**Recommendation: A** for the pilot. A one-minute call does not need B or C.

Whichever is chosen, **downsample to 8 kHz before STT and TTS.** Otherwise a visitor who hears a
wideband demo and then rings a clinic hears a noticeably different Linh. And every STT and TTS eval
is graded on the 8 kHz phone channel.

**Frontend and contract fixes this needs** (§12):
- `VoiceEvent`'s `error` carries `message: string`. It should carry a machine `code`, like every other error.
- `useCallDemo` handles only `state` events. `transcript`, `ended` and `error` are dropped, so a timeout or a freeze would end the call with nothing said.
- The overlay's voice picker is never passed to `connect`.

### 1.2 Contact form → leads — **Pilot**

**Today.**
- Three fields — clinic, name, phone — go to `POST /leads` with `source: 'landing_contact'` (contract §6).
- The form does no validation of its own (`Contact.tsx`).
- The pricing section's "Liên hệ báo giá" scrolls to the same form and sends the same `source`.

**Build**
- **A lead store.** The request, plus when it arrived, a hash of the IP and the user agent. Deduplicated by phone.
- **Validation on the server.** Required fields, and a phone number of the right shape. A `422` names the field.
- **Bot protection without a puzzle.** A per-IP rate limit and a honeypot field. No CAPTCHA — contract §6 explains why.
- **Someone is told.** The page promises a call back within 24 hours: *"chúng tôi gọi lại trong 24 giờ"*. So:
  - notify sales when a lead lands;
  - in the back office (§11.3), give each lead a status (new → contacted → qualified or lost), an owner, notes, and the time it was first contacted, so the 24 hours can be checked.
- **Use for its stated purpose only.** The form says *"Chúng tôi chỉ gọi, không nhắn tin quảng cáo"* — we only call, no marketing SMS. Set how long leads that never become customers are kept.
- **Frontend:** give the enterprise enquiry its own `source` (§12).

### 1.3 Chấm điểm hotline — the report request and the calls behind it — **Pilot**

**Today.**
- The form takes a contact name, a work email, a clinic or chain name, and 1–20 locations, each with an address and a hotline. It posts to `POST /leads/hotline-report` (contract §6).
- The page promises Fonnus will ring each location **5–7 times over a few days**, as a patient would.
- It also promises an emailed report that scores four things against an average: answer speed, answer rate, FAQ answers and caller experience (`data/hotlineReport.ts`).

**The owner decided (15 Sept 2026): Fonnus staff make these calls by hand.** There is no dialler.
What has to be built is the intake plus an internal tracker.

**Build**

| Item | Detail |
|---|---|
| **Request store** | The request and its locations. Server-side validation to match the page: 1–20 locations, each a landline, a mobile or an 1800/1900 number. It is also a lead, so it lands in the same inbox with `source: 'hotline_report'` |
| **Request status** | received → calling → scoring → report sent. The page promises no number of days, so set an internal target so no request sits |
| **Call plan per location** | 5–7 attempts spread across days and across hours — including the lunch break and after closing, since the report is about missed calls. Each attempt is assigned to a staff member |
| **Attempt log** | When, who, and what happened: answered after N seconds, no answer, busy, or voicemail. Which questions from a fixed script were asked, and whether each was answered. A 1–5 experience score. Notes |
| **Scoring** | The four metrics per location and for the whole chain, computed from the log — never typed in |
| **Report** | Generated from the scores, reviewed by a person, emailed to the address given, stored, and able to be re-sent |

**Two things to settle before the first report goes out**
- **The benchmark.**
  - The page says each report compares against *"hàng chục nghìn cuộc gọi tới các phòng khám khắp Việt Nam"* — tens of thousands of calls to clinics across Vietnam (`ReportRequest.tsx:371`).
  - The reference data on the same page is a North American study of 10,000 practices (`data/hotlineReport.ts`).
  - No Vietnamese dataset of that size exists. Either build the average from these staff calls (it will stay small for months) or change the sentence.
- **Follow-up.** The form says the details are *"chỉ dùng để gọi thử và gửi báo cáo"* — used only for the test calls and the report. A sales call to that contact afterwards breaks that promise. Decide which gives way.

*Proposed:* staff do not record these calls. The clinic's staff have not been told they are being
called, and the scores need no audio.

---

## 2. Sign-up and sign-in — `#/dang-ky`, `#/dang-nhap` — *added*

Not in the draft, but every signed-in page depends on it. The endpoints are in contract §2.

**Today.**
- There are three ways in and no passwords: phone plus SMS code, email plus emailed code, and Google.
- A number that already has an account turns sign-up into sign-in.
- A number typed in the landing hero starts sign-up and **sends the SMS at once** (`SignUpPage.tsx`).
- `GET /me` runs on every page load, public pages included.

| Item | Tag | Detail |
|---|---|---|
| **Users, tenants, sessions** | Pilot | One user owns exactly one tenant (Q10 — confirm). The session is an httpOnly cookie, with the API on a subdomain of the app's domain so the cookie can stay `SameSite=Lax` (Q15). Store one session row per device: device type, browser, OS, city from the IP, last active. Cài đặt lists them (§8.5) |
| **`GET /me`** | Pilot | Fast and cheap: it gates first paint on every page. Drop `plan` from it. Nothing reads it any more; the sidebar reads `plan_id` from `GET /shell/summary` |
| **SMS codes** | Pilot | A Vietnamese SMS provider sending from a registered brandname. **Registering a brandname with the carriers needs company papers and can take weeks — start now.** Accept only Vietnamese mobile prefixes (`03 05 07 08 09`), as the page does |
| **Email codes** | Pilot | A transactional email provider, with SPF, DKIM and DMARC set on the sending domain. Never reveal whether an address has an account |
| **Code policy** | Pilot | Codes are six digits. Decide the expiry, attempts per code, lockout and resend interval. The UI waits 42 s before offering resend, except email sign-up, which waits 55 s — pick one. Each failure needs its own code: `otp_invalid`, `otp_expired`, `otp_too_many`, `otp_rate_limited` (Q17) |
| **SMS pumping defence** | Pilot | A public form that sends SMS is a toll-fraud target. Limit sends per number, per IP and globally per hour, and alert on spikes |
| **Google sign-in** | Pilot | A Google OAuth client and a verified consent screen (verification takes days). The redirect URI must carry the hash route, e.g. `https://app.fonnus.vn/#/app` (Q18). The page shows a fake account chooser today; the live path is a redirect |
| **Sign-in with a number that has no account** | Pilot | The sign-in page ignores `existing_account`, so `POST /auth/otp/verify` has to decide: create the account, or refuse with a code the page can put into words. §13 |
| **Account creation** | Pilot | Creating a user also creates the tenant, a fully seeded config (§6.1) and a subscription |
| **Open self-serve sign-up and the free trial** | Decide | `CONTEXT.md` keeps self-serve onboarding out of MVP; the pilot is set up by an operator. The landing page promises the opposite: *"Miễn phí 14 ngày · Không cần thẻ ngân hàng"* (free for 14 days, no bank card) and 100 trial minutes that *"dừng khi hết phút"* (stop when used up). The pilot needs only sign-in for accounts the back office creates (§11.3). The trial is not in the plan contract at all (§9.1) |

**Phone-number disclosure.** `POST /auth/otp` tells sign-up whether a number already has an account.
That lets anyone check whether a number is registered, and it is kept on purpose (Q16). Rate limits
are the only defence.

---

## 3. Cuộc gọi — `#/app/cuoc-goi`

**Today.**
- A list of calls under day bands, with filter chips for calls that need a person, and a search box.
- The open call sits beside the list: a summary, what she did, the recording, and the conversation turn by turn. Pressing a line plays the audio from there.
- Shapes are in contract §8; the mock is `calls.mock.ts`.

The owner's draft lists the call record and three generated fields. Behind them are a per-call
record written by the pipeline and a job that runs after hang-up.

### 3.1 The call record — **Pilot**

`call_log` already stores transcripts, recordings and metadata. This page needs:

| Field | Source | Notes |
|---|---|---|
| `tenant_id` | the dialled number → tenant (§7.3) | Every read is scoped by it |
| `started_at`, `duration_s` | pipeline | |
| `caller_number`, `caller_call_number` | the switch | National digits. `caller_call_number` is this call's position among all the number's calls to this clinic |
| `caller_name` | post-call job | e.g. "Chị Trang", once she learns it. Looked up by the caller's number within this clinic, never across clinics (`CONTEXT.md`, legal) |
| `after_hours` | computed **at call time** against that day's hours and holidays | Store it. Recomputing later against this week's hours rewrites history |
| Recording | object storage | A short-lived signed URL that supports HTTP range requests, so seeking works. `null` past `recording_retention` or when the caller declined recording; the transcript may outlive it |
| `turns[]` with `at_ms` | pipeline | **`at_ms` is measured on the recording's clock**, starting with the disclosure at 0. Pressing a line seeks the audio there |
| `events[]` | pipeline | `availability_checked`, `appointment_held`, `message_taken`, `transferred`, `transfer_ended`, `caller_hung_up` — machine codes only |
| `booking`, `transfer` | pipeline | Give `booking` the appointment's id. Today a call can only link to the Lịch hẹn week, not to the appointment itself |
| `billable_seconds`, `excluded_reason` | post-call job | D9: counted per second; spam, silent and very short calls excluded, with the reason stored |
| `config_version` | pipeline | *Proposed.* Which version of the tenant record the call ran on, so "why did she say that?" can still be answered after the owner edits the record |

**Access.** Only the owner can open recordings, and every recording fetch is logged (Q24). The
landing page promises *"Bản ghi âm và nội dung cuộc gọi chỉ tài khoản phòng khám xem được"* — only
the clinic's account can see recordings and call content. That includes Fonnus staff: support access
goes through the back office, and is logged.

### 3.2 After the call: the processing job — **Pilot**

One job, queued at hang-up, writes the fields this page and three others read. It can be re-run and
is versioned, so a better prompt can re-process old calls.

| Output | What it is | Rules |
|---|---|---|
| `intent` | Closed set: `booking`, `pricing`, `hours_location`, `practitioner`, `insurance_payment`, `other` | Never a seventh value. Anything unclear is `other` |
| `outcome` | `answered`, `transferred`, `abandoned`, `unanswered` | Write down what each means before building. For example: `abandoned` = the caller hung up before she finished; `unanswered` = she could not answer what was asked |
| `booked` | Whether the call held an appointment | Must agree with Lịch hẹn |
| `topic` | A few words, e.g. "Giá cấy ghép implant" | Content, not UI copy. Vietnamese |
| `summary` | One sentence in the receptionist's name, e.g. *"Khách hỏi giá cấy ghép implant. Linh chưa có giá nên hẹn nhân viên gọi lại trước 17:00."* | No diagnosis, no judgement of the caller. The style guide and the model are Q24. The model is a cross-border transfer, like the pipeline's own |
| `gap` — the draft's "suggested action" | The first thing she did not know, and the turn where it showed | Three kinds. `missing_price`: a service with no `price_from`. `unconfirmed_hours`: a weekday asked about while the hours are unconfirmed. `unanswered_question`: the caller's words, verbatim. The page links each gap to the field that fixes it |
| `callback` | `due_by`, when she promised a call back | Comes from `message_taken`. Drives the callback chip and the sidebar count |
| `caller_name` | See §3.1 | |
| `billable_seconds`, `excluded_reason` | D9 | Who decides what counts as spam or silence is still open |

**A declined medical question is not a knowledge gap.**
- The draft's example, *"Có làm răng cho người đang mang thai không?"* (can a pregnant patient have dental work?), is the kind of question the refusal script may rightly hand to a doctor.
- If the job marks it `unanswered_question`, the page invites the owner to type a medical answer into Câu hỏi.
- Keep questions the safety rules deliberately routed away out of `gap`.

### 3.3 List, search and callbacks — **Pilot**

- **Filtering, search, paging and counts run on the server** (contract §8 explains why).
  - `counts` ignore the filter; `by_day` respects it.
  - **`counts.all` must equal Tổng quan's `calls.value` for the same range**, and `counts.booked` must equal its `bookings.value`.
- **Search ignores Vietnamese diacritics** (`nieng` finds `niềng`) over the caller's name, the topic and the transcript. Three or more digits search the number instead. PostgreSQL's `unaccent` plus a trigram index does this without new infrastructure.
- **Callbacks.** `POST /calls/{id}/callback` marks one done or undone. It is idempotent and uses the server's clock. Which time window counts an owed callback is Q27.
- **Cap `others`** — the list of other calls from the same number has no limit today.
- **After pilot.**
  - "Gọi lại" (call back) is a `tel:` link on the owner's own phone. It isn't logged and doesn't mark the callback done.
  - Calling back through the clinic's Fonnus number is later work.
  - So is a reminder when a callback falls due.

---

## 4. Tổng quan — `#/app/tong-quan`

**Today.**
- Five figures with sparklines and deltas.
- Calls by day and by hour, and three breakdowns.
- "Cần bạn xem" (needs your attention): what real calls turned up.
- It is all one request, `GET /insights/overview?range=today|7d|30d` (contract §7).

The draft's "data analytics dashboards" are one read model over §3's records. At pilot size no
separate analytics stack is needed.

### 4.1 Build — **Pilot**

- **Rollups per tenant, per clinic-local day and hour**, updated by §3.2's job:
  - calls, bookings, talk time and after-hours calls;
  - counts by intent, by outcome and by duration bucket.

  Every day and hour boundary is in **Asia/Ho_Chi_Minh**.
- **One definition of a counted call**, shared by Tổng quan, Cuộc gọi, the sidebar and the usage meter. D9 excludes spam, silent and very short calls from *minutes*; decide whether they also leave the *call counts* (§13).
- **Breakdowns add up to `calls.value`**, rounded by largest remainder.
- **`previous` and `trend`.** `previous` is the span just before. `trend` is always seven daily points ending on the range's last day, with today partial.
- **Attention items** (five kinds, contract §7), derived from calls against the current record:
  - `unanswered_question` needs grouping, because it counts how many callers asked the same thing. Near-identical questions must merge, using embeddings or an LLM pass.
  - An item **disappears once the record fixes it**. Recompute after a config save, not only at the next call.
  - `pending_appointments` reads from §5.

### 4.2 Settle before building

| Question | Why |
|---|---|
| `by_hour`: the total over the range, or an average day? | The contract calls it an average day. The screen prints totals ("N cuộc"), and the mock sums |
| `previous` for `today`: the whole of the same weekday last week, or the same hours? | The mock compares today-so-far with a whole day, so every morning looks like a drop |
| `pending_appointments`: only `pending`, or everything Lịch hẹn's "Cần bạn xem" counts? | Lịch hẹn also counts change requests and failed confirmations, so the two pages can show different numbers for the same thing |
| Dismissing an attention row | There is no endpoint for it. **After pilot** |

---

## 5. Lịch hẹn — `#/app/lich-hen`

**Today.**
- The week of appointments the receptionist booked, on a time grid, with "Cần bạn xem" above it.
- Pressing a block opens the appointment and its quick actions (contract §9).
- "Kết nối lịch" copies bookings to the owner's Google or Outlook calendar.

The draft's "calendar management widget" is the screen. Behind it is the booking system the
receptionist uses on calls. `CONTEXT.md` puts that in MVP as UC-2, but it hasn't started: there are
no `appointment` or `availability_slot` tables, and no tool calling.

### 5.1 Availability ledger — **Pilot**

The bookable slots for a day are:

> the owner's booking windows (`slot_rules`, or the clinic's hours on a day with none)
> ∩ opening hours − breaks − holidays − appointments already held,
> cut into lengths of the service's `duration` (or `slot_duration`), plus `buffer_time`.

- **Two caps: `ai_bookable_slots_per_day` and `max_bookings_per_day`.** Past either cap, she takes the request as `pending` with reason `over_daily_limit`. A time outside the windows is `pending` with `outside_booking_hours`.
- **`max_bookings_per_day` says it counts appointments staff entered themselves** (*"Tính cả hẹn nhân viên tự ghi"*, `BookingSkill.tsx`). The system never sees those; contract §9 says so. Either drop the words or give staff a way to enter them.
- **Two callers, one slot.** Hold slots in a transaction. A PostgreSQL exclusion constraint on a time range per tenant makes a double booking impossible, not just unlikely.
- **Named doctors.**
  - `bookable_by_name` is off by default.
  - Without a per-doctor schedule, she offers a doctor as a request, not a promise (catalogue B2).
  - "Is Dr Hùng in today?" is answered from `working_shifts`.

### 5.2 Booking tools on the call — **Pilot**

`CONTEXT.md` Phase 3 needs three things: tool definitions sent to the LLM, a `tool_wait` phase, and
a filler phrase to cover the wait. The latency budget with a tool call is under 2 500 ms.

- `check_availability(date, service, practitioner?)` → emits `availability_checked`.
- `hold_appointment(...)` → writes the appointment and emits `appointment_held`, or records it as `pending` with its reason.
- Collect only what `pdpl_data_minimisation_rule` allows: name and phone.

### 5.3 Appointments and actions — **Pilot**

- **Statuses and actions.** The record and its statuses are in contract §9: `held`, `pending`, `arrived`, `no_show`, `cancelled`, with nine actions. An action the current status does not allow returns `409 appointment_state`.
- **Align `arrived`.** The contract allows it on any held appointment; the screen offers it only on the day. Pick one.
- **Define `prior_visits`.** Arrived visits only, or every appointment from that number?
- **`attention`** is every upcoming appointment waiting on the clinic, in any week: pending, or held with a change request, or held with a failed confirmation.
- **The sidebar must see every action.** It re-reads straight after each one, so the change has to be visible already (Q27).

### 5.4 Telling the caller

| Message | When | Tag |
|---|---|---|
| Booking confirmation by **SMS** | on hold, `confirm`, `accept_change` | Pilot |
| Booking confirmation by **Zalo** (ZNS) | same | **Decide.** The booking skill offers Zalo and Lịch hẹn prints "Đã nhắn Zalo"; `CONTEXT.md` defers Zalo. ZNS needs a Zalo Official Account and pre-approved templates |
| Delivery receipt → `confirmation.state` | `sent` or `failed` | Pilot. A failed message puts the appointment in "Cần bạn xem" |
| Cancellation notice | on `cancel` (contract: "tell the caller") | Pilot |
| On `decline` and on `keep_time` | the contract does not say whether the caller is told | Decide |
| Reminder the day before | nothing in the UI | After pilot |

Every one of these is Vietnamese text a caller reads, sent by the server, so someone has to own the
wording (§11.2).

### 5.5 Moves and cancellations by phone — **Decide**

- `change_request` is a caller ringing back to move a booking. A cancellation by phone is the same flow.
- That is UC-3, which `CONTEXT.md` puts **after** the pilot — yet the screen already handles both.
- It needs the caller's identity checked against `identity_verification_rule` before she reads a booking out.
- Build it, or hide the change-request states for the pilot.

### 5.6 Outside calendar sync — **Decide**

"Kết nối lịch" (D15, contract §9) connects Google Calendar and Microsoft Outlook and copies bookings
out, one way. `CONTEXT.md` excludes calendar integration from MVP.

If it is built:
- **OAuth apps.** A Google OAuth app with the calendar scope, which Google classes as sensitive and verifies, and a Microsoft Entra app.
- **Tokens.** Stored encrypted, refreshed, and revoked on disconnect.
- **A write queue.** Creates, moves and cancels become calendar events, with retries.
- **Backfill.** Decide whether connecting copies existing bookings.
- **Status.** Add a sync state and last error to `CalendarConnection`. Today a broken connection looks the same as a working one.
- **Busy time.** Whether busy time in the owner's calendar blocks her slots is Q26.

---

## 6. Lễ tân — `#/app/le-tan/...`

**Today.**
- Three tabs and thirteen sections describe the clinic: who she is (Hồ sơ), what she knows (Kiến thức), and what she does (Kỹ năng).
- Each section saves with one PATCH.
- A readiness ring shows how close she is to picking up the phone.
- Beside every form, "Gọi thử" lets the owner hear her.

The draft lists only the try-out call. This tab also needs the store the whole product reads from,
and the prompt that turns that record into a receptionist.

### 6.1 The config store — **Pilot**

One record per tenant: `ReceptionistConfig` in `src/app/letan/model.ts`, about 60 fields named 1:1
with the catalogue. See contract §3; Q1–Q14 are the decisions about it.

- **`GET /tenant/config`**
  - Returns `{ config, version, catalogue_version }`.
  - **A new tenant comes back fully seeded** from the vertical template. The store treats any error, 404 included, as a failure, and never shows a stranger's clinic.
- **`PATCH /tenant/config`**
  - Accepts any subset of keys (Q2).
  - Checks `If-Match: <version>` and returns `409` on a mismatch (Q8).
  - Replaces arrays wholesale (Q6).
  - **Returns the whole record**, so ids minted on the server reach the form (Q4, Q5).
- **`[ext]` fields.** The frontend added fourteen fields the catalogue doesn't define. Rejecting them breaks six sections (Q3, [`field-catalogue-mapping.md`](./field-catalogue-mapping.md)).
- **Validation to repeat on the server.** The client checks these loosely or not at all:

  | Field | Rule |
  |---|---|
  | Escalation and emergency phone numbers | 10 digits |
  | Email recipients / subject / body | valid address / ≤ 120 characters / ≤ 1 200 characters |
  | `ai_bookable_slots_per_day` / `max_bookings_per_day` | 0–50 / 1–99 or null |
  | `slot_duration` / `buffer_time` | 15, 20, 30, 45 or 60 / 0, 5, 10, 15 or 30 |
  | `endpointing_silence_ms` | 300–1 500 |
  | Silence-nudge delay / nudges before hang-up | 5, 7, 10 or 15 s / 1–3 |
  | `identity_verification_rule` | can be tightened, never loosened |
  | Booking windows outside opening hours | the page warns and still saves; decide whether the server refuses |

- **Fields the server owns, never the client**
  - `assigned_phone`, derived from the clinic's numbers (§7).
  - `is_open_now`, the derived keyterms, and readiness (Q7). The browser's own `isOpenNow` is already wrong for part of every night: it reads the date in UTC and the time in local time (`readiness.ts:273`), so between 00:00 and 07:00 it checks the previous day's holiday.
  - Four values the client currently writes, which the server should recompute: `escalation_triggers_custom`, `after_hours_emergency_target`, `promo_description`, `working_hours_note`.
- **System-written fields come from the server and are never trusted from the client** (Q12, Q14).
  - That covers the compliance block, AI disclosure, red-flag pack, refusal and emergency scripts, verbosity cap, maximum call length, retention, data minimisation rule, price qualifier and keyterm pack.
  - A change of legal wording must not need a frontend deploy.
  - A tenant's own triggers and red flags live in separate columns.
- **The vertical template moves to the backend** (Q11).
  - It holds the 12 dental service rows, the keyterm pack, and a holiday seed that rolls forward each year with Tết's lunar date computed.
  - The frontend's seed is fixed and already stale: it still offers Quốc khánh on **2026**-09-02 (`defaults.ts:143`).
- **Keep old versions.** `version` already exists. Keeping each saved version lets a call be explained against what the record said at the time (§3.1).
- **`POST /tenant/config/reset`** returns the record to the template.

### 6.2 Prompt assembly and call-time settings — **Pilot**

The prompt in the pipeline is a hardcoded constant (`CONTEXT.md` W2-C / W4-A). Every call — phone,
try-out and demo — needs it built from the record.

- **Structure.**
  - The prompt is authored by Fonnus, and the system-written blocks are always included.
  - The tenant's fields are slotted in.
  - `tenant_instructions` goes in a sandboxed section that cannot override safety, compliance or escalation, and it passes an injection and advertising-claim filter first (catalogue A8).
- **Computed for each call, in clinic time:**
  - `current_datetime_local` and `is_open_now`;
  - promotions within `valid_from`–`valid_to`;
  - which doctors work today, from `working_shifts`;
  - the greeting for the time of day (`greeting_by_daypart`);
  - how prices are worded under `pricing_disclosure_policy`.
- **Voice.** Map the four voice ids (`linh`, `mai`, `khang`, `duc` — gender × accent) and `speaking_speed` to provider voices. There is no voices endpoint; the list is fixed in `defaults.ts`.
- **Speech recognition.** Hand Deepgram a keyterm list on every call. It combines the vertical pack, terms derived from the clinic name, service names, aliases and doctor names, and the owner's own additions.
- **Turn-taking.** `endpointing_silence_ms`, the silence nudges, hang-up after N nudges and `max_call_duration_seconds` (600) all become pipeline parameters.
- **Prompt caching.** Most of the record is the same on every call, and caching behaviour is already one of the criteria for choosing the LLM.

### 6.3 "Gọi thử" — a real voice call with the owner's draft — **Pilot**

**The owner's decision (15 Sept 2026):**
- The try-out becomes a real voice call on the same web voice gateway as the landing demo (§1.1), answering from the owner's configuration.
- The turn-based `POST /receptionist/preview` (contract §5) is retired.
- So is the browser's own speech recognition (`tryout/useVoiceInput.ts`).

**Today.**
- The rail beside every section sends one line at a time with the draft config.
- It voices the reply through TTS or the browser, ignores any audio the server returns, and never plays the compliance block.
- The header orb and the sidebar's "Gọi thử Linh" only show a toast (`useTryCall.ts`).

| Item | Detail |
|---|---|
| **Mode** | `tenant-preview` on the gateway. The owner must be signed in, and the tenant comes from the session |
| **The draft** | The owner is listening for unsaved edits, so the session starts with the draft record. `VoiceApi.connect` has no parameter for it yet (§12). The draft is snapshotted at call start; an edit made mid-call applies to the next call |
| **Draft is untrusted input** | Validate it like a PATCH, then overwrite every system-written field with the server's own. The compliance block opens the try-out as it opens a real call |
| **Side effects sandboxed** | Availability is checked against the real ledger, but nothing is held. No SMS, no email. A transfer is announced, not dialled — unless the owner is explicitly testing Chuyển máy, and then only to a number on their own list |
| **Limits** | *Proposed:* 5 minutes per call and 60 minutes per tenant per day. Past that, `429 preview_limit` |
| **Not a call record** | Not shown in Cuộc gọi, Tổng quan or usage |
| **Entry points** | The rail on every Lễ tân page, the header orb, the sidebar's "Gọi thử Linh" and the phone's Thêm sheet — all through `useTryCall` |

**Decide:** do try-out minutes count against the plan? And does the owner ringing their own live
number count as a billed call?

### 6.4 "Nghe thử" — voice previews — **Pilot**

`POST /tts/preview` (contract §5) voices one line in a chosen voice. Nearly every section has a play
button.

- **Cache on a hash of (text, voice, speed)**, so the same greeting isn't billed a hundred times (Q20). Rate-limit with `429`.
- **The audio URL must work without cookies**, because the page plays it with a plain `<audio>` element.
- **`expires_at`** is in the contract doc but not in the TypeScript type. Add it to one or remove it from the other.

### 6.5 Chuyển máy — transferring a call — **Pilot**

`escalation_targets` is an R1 field: without it she cannot hand a caller to a person.

- **Who is rung.**
  - The target rows are filtered by `window` (always, business hours or after hours) against `is_open_now`, then rung **top to bottom**.
  - Choose a ring timeout; the owner can't set one.
- **When to transfer.**
  - Transfer on the built-in triggers: the caller asks for a person, the caller is angry, or she has misunderstood twice.
  - Also transfer on the owner's own free-text triggers, which means classifying the conversation during the call.
  - A red flag, from the emergency pack or the owner's additions, is connected first and talked through after.
- **No answer.**
  - With `fallback: callback`, she logs a callback and says staff will ring back.
  - With `handle`, she carries on herself.
  - With no number set at all, she uses `unresolvable_fallback_script`.
- **Events.** `transferred` records ring seconds and whether it was answered; `transfer_ended` records talk seconds.
- **Cost.** A transfer is an **outbound** leg on the FPT trunk. Today the pipeline is inbound-only, and inbound is the free direction. Whether talk time after a transfer counts against the plan is open (D9).
- **After pilot:** a whisper to staff before connecting — who is calling and what about.

### 6.6 Gửi email — **Decide** (Q22)

- The skill has three rules: needs review, new booking, and missed after hours.
- Each rule has recipients and a template whose `«variables»` are filled in after the call.
- It is not in catalogue v1, and it is a whole feature, not just a field.

If it is built:
- **Sending.** Classify the call after hang-up, and send as the page promises: *"ngay khi cuộc gọi kết thúc"* (as soon as the call ends).
- **Filling the template.** Escape the content, and refuse any variable the rule does not allow.
  - `«hẹn_gọi_lại»` has nothing to fill it since `callback_policy` was dropped.
  - `«liên_kết»` is a link into the app, so opening it requires signing in.
- **"Gửi thử cho tôi" (send me a test)** is only a toast today. It needs a test-send endpoint.
- **Health data in email.** `«tóm_tắt»` puts a summary of a medical call into an inbox Fonnus does not control. Decide what a summary may contain before it leaves the platform.

### 6.7 Đặt lịch — the booking skill

§6.1 stores its settings, and §5.1–5.4 use them.

### 6.8 Readiness and the go-live gate — **Pilot**

- **What's promised.** The FAQ says *"Chúng tôi không cho số máy chạy thật khi thông tin còn thiếu"* — we don't put a number live while information is missing (`data/content.ts:87`).
- **Today readiness exists only in the browser** (`readiness.ts`) and gates nothing.
- **Compute readiness on the server**, return it with the config (Q7), and **refuse to route a number to a receptionist below the agreed level** (§7.3).
  - **R1:** voice, name, city, address, confirmed hours, a transfer phone.
  - **R2:** holidays, prices (or the defer-to-consultation policy), BHYT answer, emergency phone, booking settings.
- **Decide:**
  - Which level gates a live number. The catalogue defines R2 as "required before go-live with real patients".
  - What a caller hears on a number that is not ready, or whose account is being deleted (D13).

### 6.9 Not now

- **Knowledge files and website scraping — After pilot.**
  - The endpoints are specified (contract §4), but no screen has uploaded anything since the setup assistant went.
  - `CONTEXT.md` plans three ways for an operator to fill a record: upload with extraction, website scrape, and a generated FAQ. They belong in the back office first (§11.3).
  - Whatever extracts content only proposes changes, and nothing is applied without review.
- **The setup assistant.** Removed from the UI. The `assistant` API group stays unused. Do not build it.

---

## 7. Số điện thoại — `#/app/so-dien-thoai`

**Today.**
- The clinic's own numbers, and which receptionist answers each.
- The shared pool (kho), shown beside the purchase flow: hold a number, pay by VietQR, card or MoMo, then watch it activate (contract §10).

### 7.1 Inventory in the back office — **Pilot**

This is the owner's draft item. Fonnus buys numbers from FPT and resells them from one pool.

- **Add numbers**, one at a time or pasted in bulk, with:
  - the number;
  - area code and city;
  - carrier;
  - trunk and DID details;
  - price.
- **Classify patterns on the server**, so a lucky number gets the same name for every clinic:
  - the pattern (`loc_phat`, `than_tai`, `tu_quy`, `sanh_tien` or `de_nho`);
  - how many trailing digits to highlight;
  - a manual override.
- **Lifecycle:** in stock → held → activating → live → released → **cooling off** → back in stock, or retired.
  - *Proposed:* a released number rests before going back on sale, because its old patients will keep ringing it.
- **Cost per number:** 400.000đ to provision and 20.000đ a month from FPT (`CONTEXT.md`), for margin reporting.
- **An audit log** of every change.

### 7.2 Pool and holds — **Pilot**

- **Search.** Numbers ending in the typed digits come first, then numbers containing them.
  - The pool also returns a count per pattern and pages with a forward-only cursor.
  - Owned numbers are excluded; numbers held by other tenants show as held.
- **Holds.**
  - A hold has a time limit (the mock uses 15 minutes).
  - The database enforces one live hold per number.
  - A hold is released when the owner walks away, and a job sweeps up holds from tabs that were simply closed.
- **Plan limit.** Plans allow 2, 5 or 10 numbers, but nothing refuses the next one. Add `number_limit_reached`.

### 7.3 Activation, routing and forwarding — **Pilot**

- **At call time: dialled number → tenant → receptionist** (`CONTEXT.md` W4-A). Reassigning a number applies from the next call. Releasing a number stops routing at once.
- **`activating → live`** happens when the carrier routes the number. Open (Q25): does activation need the clinic's business registration, and does waiting for it block anything?
- **`assigned_phone`** on the config is rewritten whenever a number is bought, reassigned or released.
- **Forwarding.**
  - The owner only notes that they forwarded their old line; nothing checks it.
  - The GSM codes on screen (`*21*`, `*61*`, `*67*`) aren't confirmed for each carrier (Q25).
  - The landing FAQ promises Fonnus sets up forwarding *with* the clinic, so plan ops time for it.
- **Several receptionists.** The page draws one per branch. The config describes one, and there's no endpoint to create a second. Decide (Q25).

### 7.4 Paying for a number — **Decide**

The sources disagree on what a number costs (Q25):
- `CONTEXT.md` says a tenant picks a pool number **at no charge**, and automated billing is out of MVP.
- The page sells a number for **400.000đ once**, by VietQR, card or MoMo, with a five-minute payment clock.
- The landing comparison table adds **500.000đ a month** per extra number (`data/pricing.ts:93`).

These can't all be true.

For the pilot, the cheapest honest version: the owner picks a number, the back office confirms it,
and any charge goes on an invoice made by hand.

If checkout is built as drawn (contract §10):

| Method | Needs |
|---|---|
| **VietQR** | A dynamic QR code carrying the amount and a memo, plus a bank-transfer webhook service (SePay or payOS) that matches the incoming transfer by memo |
| **Card** | A payment gateway account and its redirect flow |
| **MoMo** | A MoMo merchant account, its QR code, and its IPN callback |

- Verify every webhook's signature, and make payment handling idempotent.
- The amount charged must equal the price quoted on the hold.
- The server enforces the five-minute expiry.
- A transfer that lands after expiry is either matched to the number or refunded. This is handled in a back office queue, not by the owner.
- **On payment:**
  - create the number as `activating`;
  - assign the receptionist;
  - issue the VAT e-invoice to the clinic's invoice details (Decree 70/2025).

---

## 8. Cài đặt — `#/app/cai-dat`

**Today.** Six areas (contract §11):
- account: name, phone, email, Google;
- security: sign-in method, devices;
- plan and minutes;
- payment method;
- invoices;
- data: download, delete.

### 8.1 Profile — **Pilot**

- Name.
- **Login phone.** Changed with an SMS code sent to the new number. Error codes: `phone_in_use`, `otp_*`.
  - For a phone account this changes the login. Decide whether it also changes the number she transfers to or reads out to callers (Q26).
- **The "Đã xác minh" (verified) badge on the phone is hard-coded.** Add `phone_verified`, or drop the badge.

### 8.2 Email verification — **Pilot**

- Saving an email sets `email_verified: false`, and the page says a confirmation email is on its way.
- **Nothing ever confirms it.** Add an endpoint that accepts the link or code, and another to resend it.
- A Google account's email can't be edited (`email_from_google`).

### 8.3 Google link — **Pilot**

- **Link** through Google OAuth, using the same client as §2 and returning to `#/app/cai-dat`.
- **Unlink**, except when Google is the only way in (`google_only_method`).

### 8.4 Password — **Decide**

- The security card shows "Email và mật khẩu" (email and password) and a change-password row for email accounts (`SecurityCard.tsx`), and the contract has `POST /account/password`.
- **Sign-up and sign-in have no passwords anywhere** (contract §2, `README.md`).
- Recommendation: remove the row and the endpoint.

### 8.5 Devices and sign-in history — **Pilot** · history and alerts **After pilot**

The draft's "login tracking on device for security".

- **Pilot: the session list.**
  - Device type, browser and OS, parsed from the user agent.
  - City, from an IP lookup, named in Vietnamese.
  - Last active time, updated at most every few minutes.
  - Actions: sign out one session, or all the others.
- **After pilot.** Neither has a screen yet.
  - A sign-in history that includes failed attempts.
  - An email when a new device signs in.
- **Decide:** who does the IP → city lookup, and whether the city is stored (Q26).

### 8.6 Data download — **Pilot**

- **The job.** It runs in the background and exports calls with transcripts, recordings, appointments, the Lễ tân record, and invoices (`DataCard.tsx`).
  - Stream the zip into object storage; recordings can make it large.
- **Status.** The page checks every 2 s. The mock's download link expires after 7 days.
- **The "ready" notice goes by email, or by SMS if there's no email** (*"Xong sẽ gửi link về {email ?? phone}"*).
  - *Proposed:* the message links to the signed-in page, never to the archive itself. A link that downloads a clinic's recordings without sign-in shouldn't sit in an SMS inbox.

### 8.7 Deleting the account — **Pilot** (D13)

- **Confirm** by typing the clinic's name; case and spacing are ignored.
- **Deactivate at once:** she stops answering calls, but sign-in keeps working.
- **14 days to cancel.** The server sends `deletion_grace_days`.
- **On day 14 a job erases everything** — calls, transcripts, recordings in storage, appointments, config and exports — and **logs both the request and the erasure** (Decree 356/2025).
- **Beyond our own storage:** tell each processor (the STT, LLM and TTS providers) according to their retention terms, and decide how long backups keep data.
- **Open (D13):**
  - **Are the numbers held until day 14?** The recommendation says yes, but the confirmation screen already tells the owner the numbers go back to the pool and cannot be kept (`DataCard.tsx`). One of the two has to change.
  - What callers hear during the 14 days.
  - Whether the export can still be downloaded.

### 8.8 Invoices and how the clinic pays

- **Invoice details — Pilot.** Legal name, tax code (10 or 13 digits), address, email. One record, used by both numbers and plans.
- **The invoice list with PDFs.**
  - **Pilot:** invoices made by hand and uploaded in the back office.
  - **After pilot:** automated e-invoices from a provider.
- **"Cách trả" (payment method).** The VietQR, card and MoMo tiles are a demo, kept on purpose (D14). No backend beyond storing the choice.

### 8.9 Usage

The minutes meter is §9.3.

---

## 9. Gói dịch vụ — `#/app/goi-dich-vu`

**Today.**
- Three plans, monthly or yearly.
- The clinic's own usage, shown against each plan.
- A drawer that quotes a plan change before confirming it.

The rules are D1–D15 in [`account-billing-decisions.md`](./account-billing-decisions.md). Read it
before building any of this: several rules only work together (D2 is safe only because of D3).

### 9.1 Plan catalogue — **Pilot**

- **`GET /plans`** returns the figures (contract §11). **Serve the same data to the landing page.** Today its pricing is typed by hand in `data/pricing.ts` and will drift from billing.
- **Missing from the plan contract:**

  | Item | Shown on | Tag |
  |---|---|---|
  | Free trial: 14 days, 100 minutes, 1 number, 1 concurrent call, **stops at the limit** | landing | Decide (§2). The hard stop is the opposite of D6 |
  | Extra number, 500.000đ a month | landing comparison table | Decide (§7.4) |
  | Guided Setup, 2.000.000đ once | landing | Decide |
  | Voice library, "50+" | landing | After pilot — there are 4 voices today |
  | Feature rows (Sổ lịch, kho kiến thức, Kết nối lịch…) | landing | Decide which are real per-plan entitlements |

- **Enforce `concurrent_calls`** (2 / 10 / 25) in the telephony layer. Decide what caller N+1 hears: a busy signal, or a forward to the clinic.
- **`own_voice`** means a cloned voice. That's a provider feature, and the person whose voice is cloned must consent in writing.

### 9.2 Subscriptions — **Pilot** (state and rules) · **Decide** (self-serve changes)

- **State:** plan, period, `renews_on`, `scheduled`, `held_until`.
- **Quote on the server** (D1).
  - The price difference × days left ÷ days in the cycle, rounded to 1.000đ, with days counted in Asia/Ho_Chi_Minh.
  - Return the number of days left too. The page computes its own count, and the two can disagree.
- **Plan-change rules:**
  - A move up applies now, with the full new allowance at once (D2).
  - It is then held to the end of the next full cycle (D3).
  - Moves down and period switches wait for the renewal, with no refund (D4).
  - A booked change can be cancelled.
- **A renewal job:**
  - applies any scheduled change, never before `held_until`;
  - closes the cycle;
  - settles overage against the plan in force at close (D2);
  - resets the allowance with nothing carried over (D5);
  - raises the invoice, with overage as its own line (D6).
- **Cancelling a subscription.** The only way today is deleting the account. Decide whether a separate cancel is needed.
- **Decide (Q26):** can a pilot owner change plan themselves, or is it a request the back office applies?

### 9.3 Usage metering — **Pilot**

The draft's "usage tracking" on Cài đặt, and the minutes on the sidebar.

- **Count per second, summed over the cycle, never rounded per call** (D9). The source is `billable_seconds` on each call (§3.1).
  - Spam, silent calls and calls under a threshold don't count. The threshold — 10 s or 15 s — is not chosen yet.
- **One set of numbers.**
  - `minutes_used` is the sum of `by_day`.
  - `projected_minutes` starts after three days.
  - The meter, Tổng quan, Cuộc gọi and the sidebar all read these same figures.
- **Never block a call for going over** (D6).
- **Copy conflict.** The landing FAQ says *"tối thiểu 30 giây cho mỗi cuộc gọi"* — a 30-second minimum per call (`data/content.ts:91`). D9 says the opposite. Fix the FAQ before anyone is billed.
- **Not now.**
  - Deferred: an owner-set overage cap (D7); alerts at 80% and 100% (D8).
  - Out: top-up packs (D10).
  - Open: on annual plans, a monthly allotment or a yearly pool (D11).

### 9.4 Charging and e-invoices — **After pilot** · **Decide** for the pilot

`CONTEXT.md`: the first 5–10 clinics are invoiced by hand.

- **Pilot:** the back office records charges and uploads invoice PDFs (§11.3).
- **Later:** automated charging, and an e-invoice provider issuing VAT invoices for plans, overage, proration and numbers. Check whether 1.000đ rounding suits the e-invoice (D1).
- **Contract gap.** `POST /subscription/change` charges `pay_method` in a single call, and its only failure is `payment_failed`.
  - That can't work for VietQR, where the owner has to make the transfer themselves.
  - A plan change needs a checkout step, like the number purchase (§12).

---

## 10. The sidebar — every signed-in page — *added*

`GET /shell/summary` (contract §12) — **Pilot**. It returns callbacks owed, appointments waiting,
minutes used out of the plan's, the renewal date and the plan.

- **Every figure must equal what another endpoint returns at the same moment:** `counts.callback`, `attention.length`, `usage.minutes_used`.
- **Serve it from counters**, not by aggregating on each read. It is read on every page change and every time the window regains focus.
- **Read-your-writes.** Right after a callback is marked or an appointment action runs, the summary must already reflect it (Q27).
- **Decide (Q27): should an owed callback count with no time window?** Today the window is the last seven days, so a callback owed for eight days silently drops off.

---

## 11. Shared platform and the back office — *added*

### 11.1 Platform — **Pilot**

| Piece | What |
|---|---|
| **Hosting in Vietnam** | The landing page promises *"Dữ liệu bệnh nhân lưu tại Việt Nam"* — patient data stored in Vietnam (`data/content.ts:52`). So the database, object storage and backups sit in a Vietnamese data centre. STT, LLM and TTS still process audio abroad; the cross-border transfer assessments in `CONTEXT.md` cover that |
| **API conventions** | Contract §1: `/api/v1`; CORS with credentials that echoes the exact origin; `application/problem+json` errors with machine `code`s and field paths; `x-request-id` on every response; `Idempotency-Key` on payment and plan writes |
| **Tenant isolation** | `tenant_id` on every row and in every query. One owner, one clinic (Q10) |
| **Object storage** | Recordings (kept as long as the plan's retention allows), the TTS cache, exports, invoice PDFs. Every file is served through a short-lived signed URL |
| **Job queue and schedules** | Post-call processing, exports, day-14 erasure, renewals, hold and checkout expiry, delivery receipts, calendar writes, the yearly holiday seed |
| **Audit logs** | Recording fetches, config changes, back office actions, deletion requests and erasures |
| **Cost and abuse telemetry** | Cost per minute against the 1.438đ model, split into phone calls, try-outs, the landing demo and TTS previews. Alert when demo calls or SMS sends spike |
| **Licences** | The A05 data-processing licence is `CONTEXT.md`'s primary launch gate |

### 11.2 Messaging — **Pilot** (SMS, email) · **Decide** (Zalo)

| Channel | Carries | Needs |
|---|---|---|
| **SMS** | sign-in and phone-change codes; booking confirmations and cancellations; export notices for accounts with no email | A registered brandname (can take weeks), delivery receipts, and send limits per number and overall |
| **Email** | sign-in codes, email verification, export notices, hotline reports, lead alerts to sales, and Gửi email if built | Domain authentication (SPF, DKIM, DMARC) and bounce handling |
| **Zalo ZNS** | booking confirmations, if kept | A Zalo Official Account, approved templates, and a per-message cost |

**Who writes these messages?** `CLAUDE.md` gives the frontend every Vietnamese sentence shown on
screen, and the API sends only codes. But SMS, email and Zalo messages are sent by the server, and
the callers and owners who read them may never open the app. Give the templates one owner, and
review them the way screen copy is reviewed.

### 11.3 The back office — Fonnus's internal tool — **Pilot**

The draft asks for one internal screen, for adding numbers. But `CONTEXT.md` makes the pilot
operator-assisted, and several sections above rely on the back office. It is a small tool in its own
right:

| Area | For | See |
|---|---|---|
| **Clinics** | Create an account and tenant for a pilot clinic; open its Lễ tân record as that clinic (logged); check readiness; activate and deactivate | §2, §6.8 |
| **Numbers** | Add and price numbers; see holds and who owns what; retire numbers; match late payments | §7.1, §7.4 |
| **Leads** | The inbox: status, owner, notes, the 24-hour clock | §1.2 |
| **Hotline reports** | Call plans, attempt log, scores, report review and send | §1.3 |
| **Demo** | The demo receptionist's account, the demo budget, the kill switch | §1.1 |
| **Billing** | Record charges, upload invoices, apply plan changes on request | §8.8, §9.2, §9.4 |
| **Support** | Find a call by id or `x-request-id`; recording access is logged | §3.1 |

**Decide where it lives.**
- **In its own app:** internal screens stay out of every clinic's bundle, and out from under this repo's no-dependency rule.
- **In this repo:** it reuses the design system.

Either way, staff sign in with a separate staff role, never with a clinic account.

---

## 12. Frontend work this depends on — *added*

Each item is small, but the backend can't be finished without it.

### Contract changes

| Change | For | Where |
|---|---|---|
| `VoiceApi.connect` takes the draft config for `tenant-preview`, and session start can refuse with `demo_frozen`, `demo_unavailable` or `preview_limit` | §1.1, §6.3 | `contracts.ts:304` |
| `VoiceEvent.error` carries a `code` instead of a `message` | the frontend owns all copy | `contracts.ts` |
| Retire `ReceptionistApi` and `useVoiceInput`; point `useTryCall` (header orb, sidebar, Thêm sheet) and the try-out rail at a voice session | §6.3 | `api/receptionist.*`, `letan/tryout/`, `letan/useTryCall.ts` |
| Email verification: confirm and resend | §8.2 | `AccountApi` |
| A plan change that can return a checkout, for VietQR | §9.4 | `AccountApi.changePlan` |
| `number_limit_reached` on hold and checkout | §7.2 | `NumbersApi` |
| `CallDetail.booking` carries the appointment id | §3.1 | `contracts.ts` |
| `CalendarConnection` carries a sync state and last error | §5.6 | `contracts.ts` |
| A distinct `source` for the pricing section's enterprise enquiry | §1.2 | `LeadInput` |

### Wiring the screens don't do yet

- **The landing demo only handles `state` events** (`useCallDemo.ts`). It needs `transcript`, `ended` and `error`, a visible one-minute limit, the frozen state, and the chosen voice passed through.
- **Field errors are never highlighted.** A `422`'s `errors[].field` reaches `ApiError.fields`, but a section save shows only the summary message (`letan/store.tsx`).
- **`409 appointment_state` doesn't reload the week**, though the contract says it should. It only shows a toast (`AppointmentsPage.tsx:218`).
- **A refused calendar consent is never shown.** Nothing reads the OAuth return, so `calendar_denied` goes unused (`errors.ts:127`).
- **Resend errors are swallowed** on every code screen (`SignUpPage.tsx:270, 401, 489`; `SignInPage.tsx:204, 293`), so a `429` on resend shows nothing.
- **Some codes have no Vietnamese sentence:** `call_not_found`, `no_callback`, `appointment_state`, `number_not_found`, `checkout_not_found`.
- **A call's detail is cached for the life of the page** (`CallsPage.tsx`), but its recording URL is short-lived. Re-fetch on a playback error, or agree a URL lifetime longer than a session.
- **Days and hours are bucketed in the browser's time zone**, not the clinic's.

### Copy that promises what the backend won't do

| Copy | Where | Conflicts with |
|---|---|---|
| "tối thiểu 30 giây cho mỗi cuộc gọi" | `data/content.ts:91` | D9 |
| "Email và mật khẩu", "Đổi mật khẩu" | `SecurityCard.tsx` | no passwords anywhere |
| "một lần" (once) for a number's price | `pages/numbers/` | 500.000đ a month in `data/pricing.ts:93` |
| "so với hàng chục nghìn cuộc gọi … khắp Việt Nam" | `ReportRequest.tsx:371` | North American reference data |
| "Sẵn sàng nhận cuộc gọi trong chưa đầy 5 phút" | `HowItWorks.tsx:57` | the FAQ's "một đến hai buổi" (one to two sessions), and the go-live gate |
| Numbers can't be kept after deletion | `DataCard.tsx` | D13's recommendation to hold them |

---

## 13. Decisions this list needs

The existing open questions still apply — Q1, Q5, Q8 and Q10 first. The table below lists the
decisions this document adds, and places where an existing question now blocks a build. Every
proposal is a starting position for the owner, not a decision.

| # | Decision | Blocks | Proposal |
|---|---|---|---|
| 1 | Web voice transport | §1.1, §6.3 | Audio over a WebSocket into the session layer; 8 kHz |
| 2 | Demo freeze thresholds, budget, recording | §1.1 | 3 calls per device in 10 min → 30 min freeze; 10 per IP per hour; no recording |
| 3 | Try-out limits. Do try-outs, and the owner's own calls to their live number, count against the plan? | §6.3, §9.3 | 5 min a call, 60 min a day; try-outs free; calls to the live number count like any call |
| 4 | Open sign-up and the 14-day trial at the pilot, or accounts created by Fonnus? | §2, §9.1 | Accounts created by Fonnus for the pilot; hide the trial promise until the trial exists |
| 5 | The trial stops at 100 minutes, which contradicts D6's "never block" | §9.1 | A trial isn't a paid plan: stop, and say so on screen |
| 6 | What sign-in does with a number that has no account | §2 | Refuse with a code; the page offers sign-up |
| 7 | The password row | §8.4 | Remove it |
| 8 | A number's price: free, 400.000đ once, or monthly (Q25) | §7.4 | — owner's call |
| 9 | Zalo confirmations at the pilot | §5.4 | SMS only; hide Zalo |
| 10 | Moves and cancellations by phone (UC-3) at the pilot | §5.5 | Hide the change-request states until UC-3 ships |
| 11 | Calendar sync at the pilot | §5.6 | Hide "Kết nối lịch" until the booking ledger is stable |
| 12 | Is Gửi email in scope (Q22), and what may a summary say in an email? | §6.6 | — owner's call |
| 13 | Which readiness level lets a number go live, and what callers hear otherwise | §6.8 | R2, as the catalogue defines it |
| 14 | One definition of a counted call across Tổng quan, Cuộc gọi, the sidebar and minutes | §4.1, §9.3 | — D9 already requires the meter, Tổng quan and Cuộc gọi to agree |
| 15 | `by_hour` as total or average; `previous` for today; what `pending_appointments` counts | §4.2 | Total; the same hours last week; the same rule as Lịch hẹn |
| 16 | What caller N+1 hears past `concurrent_calls` | §9.1 | A forward to the clinic's own number |
| 17 | Who owns the wording of SMS, email and Zalo messages | §11.2 | Whoever owns screen copy |
| 18 | How long a released number cools off | §7.1 | 3 months |
| 19 | Where the back office lives | §11.3 | Its own small app |
| 20 | Hotline report: the benchmark sentence, and whether sales may follow up | §1.3 | Change the sentence; reword the purpose line to allow one follow-up call |

---

## 14. Suggested order

Built in dependency order toward the pilot. Each step can ship, and be switched on in the frontend,
on its own. This extends the endpoint order in
[`backend-integration.md`](./backend-integration.md).

**Start now.** These are slow and outside engineering's control:
- SMS brandname registration with the carriers.
- Vietnamese hosting for the database and storage.
- The A05 data-processing licence and the cross-border assessments (`CONTEXT.md`).
- Google OAuth consent-screen verification.
- Only if §7.4 or §9.4 goes ahead: a bank-transfer webhook service, a card gateway, a MoMo merchant account, and an e-invoice provider.
- Only if Zalo stays: a Zalo Official Account, and approval of its message templates.

| Step | Build | Frontend group switched on | Needs |
|---|---|---|---|
| 1 | Platform skeleton (§11.1), users and sessions, `GET /me` | `auth` (`/me` only) | hosting |
| 2 | Tenancy; the config store with a seeded template (§6.1); back office: create a clinic (§11.3) | `tenant` | 1 |
| 3 | Sign-in by SMS and email codes, and by Google (§2) | `auth` | 1, brandname |
| 4 | Number inventory, dialled number → tenant routing, the readiness gate (§7.1–7.3, §6.8) | `numbers` (read, assign) | 2 |
| 5 | Prompt assembly from the record, keyterms, voices, transfer (§6.2, §6.5); TTS previews (§6.4) | — | 2, 4 |
| 6 | Web voice gateway: the try-out first, then the landing demo with its guardrails (§6.3, §1.1) | `voice` | 5 |
| 7 | Call records and the post-call job (§3.1–3.2) | — | 4, 5 |
| 8 | Calls, insights, the sidebar, metering (§3.3, §4, §10, §9.3) | `calls`, `insights`, `shell` | 7 |
| 9 | Booking ledger, tools, appointments, SMS confirmations (§5.1–5.4) | `appointments` | 5, 7 |
| 10 | Account: profile, phone, email verification, Google link, sessions, export, deletion (§8); plans and quotes (§9.1–9.2) | `account` | 3, 7 |
| any time | Leads and hotline-report intake (§1.2–1.3) | `leads` | 1 |
| after pilot | Payments and e-invoices, Zalo, calendar sync, moves and cancellations by phone, knowledge files, usage alerts and caps | — | — |
