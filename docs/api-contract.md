# Fonnus API contract

What the web frontend expects from the backend. Written for a backend engineer who has never
opened this repo.

**Status: proposed, not implemented.** Nothing here exists yet on either side. The frontend
runs against in-browser mocks (`VITE_API_MODE=mock`, the committed default) that implement
exactly these signatures, so the shapes below are already exercised — but no HTTP request has
ever been made. Treat this as a specification to agree on, not a description of a running
system. Where a decision is genuinely open, it is marked and listed in
[`open-questions.md`](./open-questions.md).

For how the frontend is wired to swap mocks for real calls, see
[`backend-integration.md`](./backend-integration.md). For field names and their meanings, see
[`field-catalogue-mapping.md`](./field-catalogue-mapping.md) and the frozen
[catalogue v1](./context-field-catalogue.v1.md).

---

## 1. Conventions

### Base path

Every path below is relative to a configurable base (`VITE_API_BASE_URL`, default `/api/v1`).
In development the Vite dev server proxies `/api` to the backend, so the browser only ever
talks to `localhost:5180` — **no CORS is involved in dev at all.**

### Authentication — read this before anything else

The frontend sends `credentials: 'include'` on **every** request and stores no token
anywhere. The session is expected to be an **httpOnly cookie** set by
`POST /auth/otp/verify`.

Two consequences that cause most first-day integration failures:

1. **`Access-Control-Allow-Origin: *` is illegal with credentials.** The backend must echo the
   exact origin and send `Access-Control-Allow-Credentials: true`.
2. **Cookie attributes decide whether this works at all.** Recommendation: deploy the API on a
   subdomain of the same registrable domain as the app — `app.fonnus.vn` ↔ `api.fonnus.vn`.
   They are then *same-site* despite being different origins, so the cookie can stay
   `SameSite=Lax` and no CSRF-token machinery is needed for XHR. An unrelated domain forces
   `SameSite=None; Secure`, which reopens CSRF and requires a double-submit token.

This is an architectural decision worth making deliberately rather than discovering. See Q14.

### Request and response format

- JSON in, JSON out. `Content-Type: application/json` except for file upload.
- **Field names are catalogue `snake_case`, verbatim.** `business_name`, not `businessName`.
  This is the whole reason there is no mapping layer; keeping it means there never has to be one.
- Money is an **integer of VND**, no decimals, no separators: `1500000`.
- Times of day are `"HH:MM"` strings in 24-hour form: `"08:00"`. Dates are ISO `"2027-02-14"`.
  All wall-clock times are Asia/Ho_Chi_Minh. Timestamps are ISO 8601 with offset.
- `null` means "not answered yet" and is distinct from `0` or `""`. `consultation_fee: 0`
  means free; `consultation_fee: null` means nobody has said.

### Errors

Proposed: RFC 9457 `application/problem+json`, with two additions.

```json
{
  "type": "https://api.fonnus.vn/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "validation_failed",
  "errors": [
    { "field": "service_catalog.3.price_from", "code": "must_be_positive" }
  ]
}
```

- `code` — a stable machine string. **The frontend owns every Vietnamese sentence the user
  reads**; a server-authored sentence will not match the voice of the surrounding screen.
  Send codes, not prose.
- `errors[].field` — a dotted path into the record, array indices included. The section forms
  render per-field errors, so they need a path that maps onto an input.

Every response should carry `x-request-id`; the frontend surfaces it in error states so a
support message can name the exact request.

### What the frontend does with each status

| Status | Frontend behaviour |
|---|---|
| `200` / `201` / `202` / `204` | Success. `204` parses as `undefined` |
| `400` / `422` | Field errors highlighted in the form; the save bar stays open with "Thử lại" |
| `401` | **Signs the owner out and redirects to sign-in** — except on `GET /me` and `/auth/*`, where a 401 is a normal answer meaning "anonymous" |
| `403` | Generic error message; no sign-out |
| `404` | Generic error; on `GET /tenant/config` it is treated as "new tenant, seed a template" |
| `409` | "Đã có người khác vừa sửa" + a reload prompt. Requires the concurrency answer in Q8 |
| `429` | Retry-after message. Relevant on OTP send and TTS preview |
| `5xx` | Retryable. GETs retry once automatically; writes never do |
| Network / timeout | Retryable. Client timeout is 15 s; uploads 120 s |

### Idempotency

The client retries `GET` once on a network error, timeout or 5xx. **It never automatically
retries a write.** If the backend wants safe retries on `POST /auth/otp` or
`PATCH /tenant/config`, propose an `Idempotency-Key` header and the frontend will send one.

---

## 2. Auth

The product has **no passwords anywhere**. Three ways in: phone + SMS code, email + emailed
code, and Google OAuth. A number that already has an account silently becomes a sign-in rather
than an error — that is deliberate, and it is the single biggest drop-off in phone-first flows.

Frontend constants the backend must match or override (they are currently hardcoded):

| Constant | Value | Where |
|---|---|---|
| Code length | 6 digits | `auth/OtpField.tsx` |
| Resend cooldown | 42 s | `auth/SignInPage.tsx` |
| Phone format sent | national, digits only, 10 chars: `0914378064` | `auth/phone.ts → normalizePhone` |

Only **mobile** prefixes are accepted client-side (`03|05|07|08|09`) — a landline cannot
receive the SMS, so it is rejected before a code that would never arrive.

---

### `POST /auth/otp`

Send a login code by SMS.

```jsonc
// request
{ "phone": "0914378064" }

// 200
{ "existing_account": true }
```

`existing_account` drives the flow: `true` in sign-up turns the screen into a sign-in with a
code instead of showing an error.

> ⚠️ **This is a phone-number enumeration oracle** — anyone can learn whether a number has a
> Fonnus account. It is called out as a deliberate product trade-off rather than an accident,
> because removing it changes a UI flow. See Q16.

Errors: `422 invalid_phone`, `429 otp_rate_limited`.

### `POST /auth/otp/email`

```jsonc
// request
{ "email": "lan@vietsmile.vn" }

// 202 — no body
```

Deliberately does **not** disclose whether the address is registered.

Errors: `422 invalid_email`, `429 otp_rate_limited`.

### `POST /auth/otp/verify`

Verifies a code and **sets the session cookie**.

```jsonc
// request — `identity` is the phone or email the code was sent to
{ "identity": "0914378064", "code": "111002" }

// 200 → Me (see below), plus Set-Cookie
```

Errors, each needing its own Vietnamese copy: `401 otp_invalid`, `401 otp_expired`,
`429 otp_too_many`. See Q17 for the policy behind them.

### `GET /me`

The session probe. Runs once at app boot, before anything renders.

```jsonc
// 200
{
  "identity": "0914378064",
  "method": "phone",
  "display_name": "Nguyễn Lan",
  "clinic_name": "Nha khoa Việt Smile",
  "plan": "Gói Tiêu chuẩn"
}

// 401 — anonymous. A normal answer, NOT a session expiry.
```

`plan` is required: the sidebar renders it today from a hardcoded demo constant, which is a
lie the moment there are two customers.

### `PATCH /me`

```jsonc
// request — both optional
{ "full_name": "Nguyễn Lan", "phone": "0914378064" }

// 200 → Me
```

### `POST /auth/signout`

`204`, and clears the cookie. The frontend also clears its local caches.

### Google OAuth

Currently a fake in-page account chooser; it cannot be real without a client ID. The live path
is a redirect, and there is one trap worth naming now: **this app uses hash routing**
(`#/app/le-tan/...`) because the build ships with `base: './'` and must drop on any host. A
fragment survives an OAuth redirect only if the backend puts it in the redirect URI —
`https://app.fonnus.vn/#/app`. Easy to get wrong once and very confusing afterwards. See Q18.

---

## 3. Tenant configuration

The whole Lễ tân tab reads and writes one record. Its full shape is
`ReceptionistConfig` in `src/app/letan/model.ts` — ~60 fields, named 1:1 with catalogue v1.
That file is the authoritative schema; this document does not duplicate it, because a copy
would drift.

### `GET /tenant/config`

```jsonc
// 200
{
  "config":  { /* ReceptionistConfig — every field, no partials */ },
  "version": "7",
  "catalogue_version": "v1"
}
```

- `version` — the optimistic-concurrency stamp, echoed back on write. See Q8.
- `catalogue_version` — compared against a constant in `model.ts`; a mismatch logs a loud
  development warning. This is the only defence against silent drift between the two repos.

**A brand-new tenant must come back fully seeded**, with the vertical template already
applied: the dental service rows, the Vietnamese holiday seed including Tết, and the keyterm
pack. Those currently live in `src/app/letan/defaults.ts`, which is the wrong repo for them —
if the frontend seeds a new tenant, both repos encode "what a dental clinic looks like" and
they will disagree. See Q11.

### `PATCH /tenant/config`

**One request per section save.** The body is a partial record carrying only the keys that
section owns — between 1 and 11 keys in practice.

```jsonc
// request — the "Địa điểm" section saving
{
  "business_name": "Nha khoa Việt Smile",
  "city": "TP. Hồ Chí Minh",
  "address_full": "123 Lê Lợi, P. Bến Nghé, Quận 1",
  "parking_info": "Gửi xe máy trước cửa"
}

// 200 — the full record back, as GET
{ "config": { /* ... */ }, "version": "8", "catalogue_version": "v1" }
```

**Returning the whole record, not just the changed keys, is a deliberate ask.** It is small,
and it makes row ids and any server-side normalisation reconcile for free. The frontend
applies the response over its optimistic state, so anything the server changed simply appears.

Three worked cases:

**Scalar section** — as above. Straightforward.

**Array section.** `service_catalog` is sent as a complete array; the client always holds and
sends every row.

```jsonc
{
  "service_groups": ["Tổng quát", "Thẩm mỹ", "Chỉnh nha và Implant", "Trẻ em"],
  "service_catalog": [
    { "id": "svc-cao-voi", "service_name": "Cạo vôi răng",
      "service_aliases": ["lấy cao răng"],
      "price_from": 300000, "price_to": 500000, "price_unit": "lan",
      "duration": 30, "service_note": "", "is_bookable": true,
      "from_template": true, "service_group": "Tổng quát" }
  ],
  "pricing_disclosure_policy": "range"
}
```

Rows created in the browser carry a client-generated `id` like `svc-lx3k-4`. **If the server
mints its own ids, the response must contain the full new array** — otherwise the client can
never learn the real ids, and the next save re-sends the client strings and creates duplicate
services. See Q5 and Q6.

**Validation failure.**

```jsonc
// 422
{
  "type": "https://api.fonnus.vn/errors/validation",
  "title": "Validation failed", "status": 422, "code": "validation_failed",
  "errors": [
    { "field": "service_catalog.3.price_from", "code": "must_be_positive" },
    { "field": "escalation_targets.0.phone",   "code": "invalid_phone" }
  ]
}
```

The frontend rolls the optimistic edit back, keeps the save bar open, and highlights those two
inputs. Nothing is lost and the owner can fix and retry.

### `POST /tenant/config/reset`

Back to the vertical template. Behind a confirmation dialog in the UI.

```jsonc
{ "vertical": "nha-khoa" }   // → the same envelope as GET
```

---

## 4. Knowledge files

### `POST /tenant/knowledge-files`

`multipart/form-data`, one `file` part.

Client-side limits already enforced, which the backend should match or correct:
**20 MB**, and `.pdf .doc .docx .xls .xlsx .png .jpg .jpeg`.

```jsonc
// 201
{ "id": "kf_01H...", "name": "banggia2026.pdf", "size": 184320, "status": "queued" }
```

`status` moves `queued → indexed`. **How the client learns of the transition is undecided** —
poll, or push. See Q19.

The UI promises the owner, in writing, that they review every extracted suggestion before the
agent uses it. Any extraction result must therefore be *proposed*, never auto-applied.

### `DELETE /tenant/knowledge-files/{id}` → `204`

---

## 5. Hearing the receptionist: TTS preview and the try-out

### `POST /tts/preview`

Voices one line in the tenant's chosen voice. Today this is the browser's own speech
synthesis, which ignores the chosen voice entirely and is not the product voice.

```jsonc
// request
{ "text": "Việt Smile xin chào...", "voice": "linh", "speed": "normal" }

// 200
{ "url": "https://.../preview/abc.mp3", "duration_ms": 3200,
  "expires_at": "2026-09-03T12:00:00+07:00" }
```

> ⚠️ **Cost.** There is a play button on nearly every configuration section. A naive
> implementation bills ElevenLabs for the same greeting a hundred times in one setup session.
> Cache on a hash of `(text, voice, speed)`. See Q20.

### `POST /receptionist/preview`

The "gọi thử" panel beside every Lễ tân form. One caller line in, the receptionist's reply
out — answered from the record **as sent**, not from the server's copy: the panel exists to
hear an unsaved edit, so the request carries the whole draft.

```jsonc
// request
{
  "text": "Mai mấy giờ mở cửa?",
  "history": [ { "role": "caller", "text": "Alo" }, { "role": "agent", "text": "Dạ, em là Linh…" } ],
  "section": "gio-mo-cua",          // which sub-page the panel sits on; a hint, not a filter
  "config": { /* ReceptionistConfig, draft fields included */ }
}

// 200
{
  "text": "Mai thứ Bảy phòng khám mở từ 08:00 đến 20:00, nghỉ trưa 12:00 đến 13:30 ạ.",
  "audio": { "url": "https://.../preview/def.mp3", "duration_ms": 4100 }   // or null
}
```

`text: "[im lặng]"` is the caller saying nothing: reply with the silence nudge
(`silence_nudge_script`), or the closing line once `end_call_after_n_nudges` is reached.
`audio` may be null — the client then voices `text` through `POST /tts/preview`, or the
browser's own Vietnamese voice as a last resort. Today the reply comes from intent matching in
the browser (`src/api/receptionist.mock.ts`); live it is the same model that takes real calls,
reading the same record, so what the owner hears here is what a caller will hear.

> Same cost note as TTS: the owner will ask the same three questions twenty times while
> editing one price. Cache replies on a hash of `(text, history, config)`.

---

## 6. Leads

### `POST /leads`

The landing-page contact form. Unauthenticated.

```jsonc
{ "clinic_name": "Nha khoa Minh Anh", "contact_name": "Nguyễn Minh Anh",
  "phone": "0901234567", "source": "landing_contact" }
// → 202
```

Needs bot protection, but **not a CAPTCHA the user must solve** — the form is three fields on
a marketing page and a challenge there costs more leads than it saves. Rate-limit by IP.

---

## 7. Insights — the Tổng quan tab

### `GET /insights/overview?range=today|7d|30d`

Everything that tab draws, in one response. **One call, not six**: five figures, four
breakdowns and the attention queue are one screen and one moment, and separate requests
would let the tiles and the charts disagree with each other while they landed.

```jsonc
{
  "range": "7d",
  "generated_at": "2026-09-13T00:50:11.000Z",

  // Each figure carries the same span immediately before it, and a week behind it.
  // `previous` is null for a clinic with no history — the UI then shows no delta
  // rather than a meaningless "+100%".
  // `trend` is ALWAYS exactly 7 daily points, oldest first, ending on the range's
  // last day, whatever the range. Its last point must be the same partial day the
  // figure counts, or the tile and its own sparkline disagree on screen.
  "calls":        { "value": 120, "previous": 142, "trend": [20,15,22,16,23,24,0] },
  "bookings":     { "value": 24,  "previous": 28,  "trend": [4,3,5,3,5,4,0] },
  "talk_time":    { "value": 15600, "previous": 18900, "trend": [...] },  // seconds
  "avg_duration": { "value": 130,   "previous": 133,   "trend": [...] },  // seconds
  "after_hours":  { "value": 8,     "previous": 9,     "trend": [...] },

  "by_day":  [{ "date": "2026-09-07", "count": 20 }, /* … one per day, oldest first */ ],
  "by_hour": [0,0,0,0,0,0,1,4,9,13,14,10,6,6,12,13,12,8,6,3,3,0,0,0],  // 24, midnight first

  "by_intent":   [{ "intent": "booking", "count": 43 }, /* … */ ],
  "by_outcome":  [{ "outcome": "answered", "count": 91 }, /* … */ ],
  "by_duration": [{ "bucket": "under_1m", "count": 28 }, /* … */ ],

  "attention": [ /* below */ ]
}
```

**Every breakdown must add up to `calls.value`.** The four of them are read together on
one screen, and a percentage that does not reconcile with the figure above it is the
fastest way to lose an owner's trust in the whole page. Round with largest-remainder, not
per-slice.

**Closed sets, never free text.** The frontend owns all Vietnamese copy, so these are
machine codes and this app maps them (`src/app/pages/overview/labels.ts`):

| Field | Values |
|---|---|
| `intent` | `booking`, `pricing`, `hours_location`, `practitioner`, `insurance_payment`, `other` |
| `outcome` | `answered`, `transferred`, `abandoned`, `unanswered` |
| `bucket` | `under_1m`, `1_2m`, `2_4m`, `4_6m`, `over_6m` |

Anything the classifier cannot place is `other`. Do not invent a seventh intent and do not
send a label — a server-authored sentence arrives in a voice the rest of the screen does
not share, and there is nowhere in it to put the receptionist's name.

### `attention` — what a real call turned up

Each item is one row of "Cần bạn xem", and each kind carries exactly the values its
Vietnamese sentence interpolates. **No prose, and no links**: where a row leads is the
frontend's business, because the routes are hashes.

```jsonc
[
  { "id": "…", "kind": "missing_price", "count": 5, "service": "Cấy ghép implant" },
  { "id": "…", "kind": "unconfirmed_hours", "count": 3, "weekday": 0 },
  { "id": "…", "kind": "pending_appointments", "count": 2,
    "appointments": [{ "customer_name": "Chị Trang", "starts_at": "2026-09-15T02:30:00Z" }] },
  { "id": "…", "kind": "after_hours_callback", "count": 4,
    "from": "2026-09-12T13:10:00Z", "to": "2026-09-12T14:05:00Z" },
  { "id": "…", "kind": "unanswered_question", "count": 2,
    "question": "Có làm răng cho người đang mang thai không?" }
]
```

`weekday` is `Date.getDay()` — Sunday 0 — matching `operating_hours_by_weekday`.
`service` is the tenant's own `service_name` from `service_catalog`, verbatim, so the row
names the thing the owner named.

Derive these from calls against the tenant record: a caller who asked the price of a
`service_catalog` row with no `price_from`; a caller asking about a weekday while
`operating_hours_confirmed` is false; a turn the model could not answer. An empty array is
normal and the card then does not render — there is no "everything is fine" row.

---

## 8. Calls — the Cuộc gọi tab

§7 is aggregates; this is the list they are aggregated from. The tab shows the calls, one
call's conversation beside its recording, and the callbacks she promised. Mock:
`src/api/calls.mock.ts`.

### `GET /calls?range=…&filter=…&q=…&cursor=…`

| Param | Values |
|---|---|
| `range` | `today`, `7d`, `30d` — the same day boundaries as §7, on the clinic's wall clock |
| `filter` | `all`, `callback` (a callback promised and not yet made), `booked`, `transferred`, `unanswered` |
| `q` | Optional. Three or more digits (spaces and dots ignored) match the number; anything else matches the caller's name, the topic and the transcript, **ignoring Vietnamese diacritics** — `nieng` finds `niềng` |
| `cursor` | Optional, opaque, from the previous page's `next_cursor` |

```jsonc
{
  "generated_at": "2026-09-13T03:45:00.000Z",
  "calls": [
    {
      "id": "c_8f3a…",
      "started_at": "2026-09-13T03:05:12.000Z",
      "duration_s": 64,
      "caller_number": "0987204553",        // digits only, national format
      "caller_name": null,                  // "Chị Trang" once she has learned it
      "caller_call_number": 1,              // this call's place among the number's calls
      "intent": "pricing",                  // §7's closed set
      "topic": "Giá cấy ghép implant",      // content — see below
      "outcome": "unanswered",              // §7's closed set
      "booked": false,
      "after_hours": false,
      "callback": { "due_by": "2026-09-13T10:00:00.000Z", "done_at": null },
      "gap": { "kind": "missing_price", "service": "Cấy ghép implant" }
    }
  ],
  "next_cursor": "eyJvIjo0MH0",
  "counts": { "all": 128, "callback": 3, "booked": 24, "transferred": 17, "unanswered": 5 },
  "by_day": [{ "date": "2026-09-13", "count": 9 }, /* … newest first */ ]
}
```

**Filtering, search and paging are the server's.** The list is paged, so doing any of them
over the rows already loaded would count and show only what arrived first.

- `counts` is for the range and `q`, **whatever the filter** — it is what the chips print.
  `callback` counts only callbacks not yet made.
- `by_day` is for the range, `q` **and** the filter — the count on each day's band. It comes
  from the server because a page boundary can fall in the middle of a day.
- Newest first. Page size is the server's choice; the mock uses 40.
- **`counts.all` must equal §7's `calls.value` for the same range**, and `counts.booked` its
  `bookings.value`. The two tabs are read by the same owner on the same morning.

`gap` is the first thing she did not know on the call. Its three kinds carry exactly the
values §7's `attention` items of the same name carry — `missing_price.service`,
`unconfirmed_hours.weekday`, `unanswered_question.question` — so the queue row and the calls
behind it name the same thing.

### `GET /calls/{id}`

Everything `GET /calls` returns for the row, plus:

```jsonc
{
  // …every CallSummary field…
  "summary": "Khách hỏi giá cấy ghép implant. Linh chưa có giá nên hẹn nhân viên gọi lại trước 17:00.",
  "recording": { "url": "https://…signed…", "duration_ms": 64000 },   // or null
  "turns": [
    { "kind": "disclosure", "at_ms": 0 },
    { "kind": "caller", "at_ms": 6000, "text": "Cho mình hỏi cấy ghép implant…" },
    { "kind": "agent", "at_ms": 11000, "text": "Dạ, em chưa có giá…",
      "gap": { "kind": "missing_price", "service": "Cấy ghép implant" } },
    { "kind": "event", "at_ms": 44000,
      "event": { "type": "message_taken", "callback_by": "2026-09-13T10:00:00.000Z" } }
  ],
  "booking": null,     // { "starts_at", "service", "practitioner" | null }
  "transfer": null,    // { "to_name", "answered", "ring_s", "talk_s" }
  "others": [ /* every other call from this number, newest first, as CallSummary */ ]
}
```

- **`at_ms` is on the recording's clock.** Pressing a line seeks the audio to it and the line
  being played lights up, so a turn and the audio under it must be the same moment.
- `disclosure` is the opening AI and recording notice (`greeting_compliance_block`). It
  carries no text: it is the same words on every call and the app says what it is.
- `recording.url` should be short-lived and support HTTP range requests, or seeking in the
  browser's audio element downloads the whole file first. `null` once the recording is past
  `recording_retention`, or when the caller declined recording — the transcript may outlive it.
- A turn's `gap` marks the line she said *because* she did not know.

Events are machine codes; every Vietnamese word is this app's (`pages/calls/labels.ts`):

| `event.type` | Fields | Reads as |
|---|---|---|
| `availability_checked` | `date` (ISO date) | Linh xem lịch trống thứ Năm |
| `appointment_held` | `starts_at` | Đã giữ lịch · T5 17/09 · 15:00 |
| `message_taken` | `callback_by` (ISO or null) | Ghi lời nhắn · gọi lại trước 17:00 |
| `transferred` | `to_name`, `answered`, `ring_s` | Chuyển máy cho BS Hùng · nghe máy sau 12 giây |
| `transfer_ended` | `to_name`, `talk_s` | BS Hùng nói chuyện với khách · 53s |
| `caller_hung_up` | — | Khách cúp máy |

**`topic`, `summary` and the turns' `text` are content, not copy.** They are about the call —
what was said, and a model's short account of it — in the same way a transcript is. They are
the one place prose from the server reaches the screen, and every label, button and sentence
around them is still the frontend's. Who writes them, and in what voice, is Q24.

### `POST /calls/{id}/callback`

```jsonc
{ "done": true }      // → 200, the call's CallSummary with callback.done_at set
{ "done": false }     // → 200, done_at back to null ("Hoàn tác")
```

Idempotent. `done_at` is the server's clock. `404` with code `call_not_found`; `409` with
code `no_callback` when the call carries no callback. The UI applies the change before the
response and rolls it back on failure, with the error beside the button.

---

## 9. Appointments — the Lịch hẹn tab

Only the appointments the receptionist booked. Staff-booked appointments arrive when the
clinic's own software is synced, and are not part of this contract.

### `GET /appointments?from=YYYY-MM-DD&to=YYYY-MM-DD`

One week, as the tab draws it, plus the clinic's whole attention list.

```jsonc
{
  "from": "2026-09-14",
  "to": "2026-09-20",
  "generated_at": "2026-09-14T02:40:00.000Z",

  // Everything that STARTS inside from–to, inclusive, cancelled included, oldest first.
  "appointments": [
    {
      "id": "…",
      "starts_at": "2026-09-17T08:00:00Z",
      "duration_min": 30,
      "status": "held",                 // held | pending | arrived | no_show | cancelled
      "pending_reason": null,           // set only when status is pending: outside_booking_hours | over_daily_limit
      "change_request": null,           // { "starts_at": "…" } — the caller rang back to move it
      "service_name": "Cạo vôi răng",   // the tenant's own service_catalog row, verbatim, as booked
      "price_from": 300000, "price_to": 500000,   // what she read out; null when the row had none
      "practitioner": { "id": "…", "name": "BS Hùng" },   // null: no preference
      "patient_name": "Chị Trang",      // as she wrote it, salutation included
      "booked_by": null,                // who rang, when booking for someone else — "Chị Hạnh"
      "phone": "0903 812 217",
      "prior_visits": 1,                // 0 = new patient
      "note": "Hỏi giá hôm thứ Bảy, sáng Chủ Nhật gọi lại đặt lịch.",
      "instructions": "Chị nhớ đến sớm 10 phút nhé ạ.",   // pre_appointment_instructions as read, or null
      "call": { "id": "…", "started_at": "2026-09-13T03:31:00Z", "duration_s": 84 },   // null once purged
      "confirmation": { "channel": "zalo", "state": "sent", "at": "2026-09-13T03:32:10Z" }
                                        // state: sent | failed | not_sent | informed
    }
  ],

  // Every UPCOMING appointment waiting on the clinic, whatever week it is in:
  // status pending, or held with a change_request, or held with confirmation.state failed.
  "attention": [ /* same shape */ ],

  // Whether this clinic has ever had an appointment. A quiet week and a first week are two screens.
  "has_any": true
}
```

**Recorded content, not copy.** `service_name`, `practitioner.name`, `patient_name`,
`booked_by`, `note` and `instructions` are the tenant's words and the caller's, and come back
verbatim. Every sentence around them — "Khách xin 18:30 — ngoài khung giờ Linh được tự giữ
chỗ" — is written by the frontend from the machine codes (`src/app/pages/appointments/labels.ts`).
Do not send a status label or a reason sentence.

`attention` is not filtered by the week so that a request for next Thursday is not hidden
behind the week the owner happens to be looking at.

### `POST /appointments/{id}/actions`

```jsonc
{ "action": "confirm" }
```

Returns the appointment as it now stands. The light actions an owner has — moving a time to
one the caller did not ask for is not one of them:

| `action` | Allowed when | Effect |
|---|---|---|
| `confirm` | `pending` | `held`, `pending_reason: null`; send the confirmation |
| `decline` | `pending` | `cancelled` |
| `accept_change` | `change_request` set | `starts_at` takes the requested time; `change_request: null`; re-confirm |
| `keep_time` | `change_request` set | `change_request: null` |
| `arrived` | `held` | `arrived` |
| `no_show` | `held`, after `starts_at` | `no_show` |
| `cancel` | `held` | `cancelled`; tell the caller |
| `restore` | `arrived`, `no_show`, or `cancelled` before `starts_at` | `held` |
| `informed` | `confirmation.state` is `failed` | `confirmation.state: "informed"`, `at: now` — the clinic rang the caller itself |

An action that is not allowed from the current state is `409` with `code:
"appointment_state"`; the frontend reloads the week.

---

### Outside calendars — "Kết nối lịch"

The Lịch hẹn head carries a button that copies the receptionist's bookings to the owner's own
calendar. Mock: `appointments.mock.ts` connects at once and keeps the list in localStorage.

| Call | Answers | Notes |
|---|---|---|
| `GET /appointments/calendars` | `[{ "provider": "google", "account_email": "lan@vietsmile.vn", "connected_at": "…" }]` | `provider`: `"google"` \| `"microsoft"`; both may be connected |
| `POST /appointments/calendars/{provider}` | `{ "redirect_url": "https://accounts.google.com/…", "connection": null }` | The page follows `redirect_url` to the provider's consent screen; the return lands on `#/app/lich-hen`. A refusal there comes back as `calendar_denied` |
| `DELETE /appointments/calendars/{provider}` | `204` | Events already copied stay in the owner's calendar |

One-way for now: a booking, a move and a cancellation are written to the outside calendar; nothing
is read back. Whether busy time there should block Linh's slots is Q26.

---

## 10. Numbers — the Số điện thoại tab

The clinic buys a fixed-line number from a pool shared by every tenant, and says which
receptionist answers it. Mock: `src/api/numbers.mock.ts`. Open decisions — the monthly fee,
VAT, activation time, paperwork, several receptionists — are **Q25**.

### `GET /numbers`

```jsonc
{
  "numbers": [
    {
      "id": "num_7f2c…",
      "number": "02473077199",                 // digits only, national format
      "receptionist_id": "rcp_main",
      "status": "live",                        // "activating" until the carrier routes it
      "bought_at": "2026-09-02T02:00:00.000Z",
      "forwarding": { "from_number": "02437562211", "mode": "all" }   // or null
    }
  ],
  "receptionists": [{ "id": "rcp_main", "name": "Linh", "branch": null }],
  "invoice": { "legal_name": "Công ty TNHH Nha khoa Việt Smile", "tax_code": "0312345678" }  // or null
}
```

- **`assigned_phone` on the tenant record is derived from this**, never written by
  `PATCH /tenant/config`: the main receptionist's first number, rewritten whenever a number is
  bought, reassigned or given back. The Lễ tân header reads it.
- `forwarding` is the owner's note that they set the old line to forward. Fonnus cannot see the
  old line, so nothing checks it.
- `name` is that receptionist's `agent_name`; `branch` names her row in `branch_list`.

### `GET /numbers/pool?pattern=…&q=…&cursor=…&limit=…`

| Param | Values |
|---|---|
| `pattern` | Optional. `loc_phat` (…68, …86), `than_tai` (…39, …79), `tu_quy` (four of a digit), `sanh_tien` (four rising), `de_nho` (a repeated pair) |
| `q` | Optional digits. Numbers **ending** in them first, then numbers containing them after the area code |
| `cursor` | Optional, opaque, from the previous page's `next_cursor`. Forward only: the app keeps the cursors it was given, so its "back" arrow re-asks for the one before — no `prev_cursor` needed |
| `limit` | Optional. The page asks for a full grid — 9, or 8 on a phone. Server caps it |

```jsonc
{
  "numbers": [
    {
      "number": "02473066868", "pattern": "loc_phat", "pattern_digits": 4, "held": false,
      "area": { "code": "024", "city": "Hà Nội" },
      "price_vnd": 400000                      // one-time, VAT included
    },
    {
      "number": "02473088686", "pattern": "loc_phat", "pattern_digits": 4, "held": true,
      "area": { "code": "024", "city": "Hà Nội" },
      "price_vnd": 400000
    }
  ],
  "next_cursor": "9",
  "counts": { "all": 146, "loc_phat": 5, "than_tai": 4, "tu_quy": 3, "sanh_tien": 3, "de_nho": 4 }
}
```

- **`area` and `price_vnd` are per number**, not per page or per tenant. Today every number is
  024 at 400.000đ; the kho is meant to hold other cities and prices, and each tile prints both
  (`HN · 400.000đ, một lần`). The frontend owns the short city label (`024` → `HN`).
- The page number the app shows (`2 / 17`) is `counts[pattern ?? 'all']` over `limit`, so the
  server does not return a total.

- **The pool is the server's**, searched and paged there: every clinic draws from it, so a copy
  in the browser is stale the moment another clinic pays.
- Default order puts one of each pattern first and plain numbers between them. Excludes
  numbers any tenant owns.
- `held` is another tenant's hold. The number is shown hatched and cannot be pressed — which is
  how an owner sees the pool is shared.
- `counts` respect `q` and ignore `pattern`: they are the numbers on the chips.
- `pattern` is the server's classification, so a lucky number is named the same way for every
  clinic. `pattern_digits` is how many trailing digits the app lights.

### `POST /numbers/holds` → `NumberHold`

```jsonc
{ "number": "02473066868" }
// 201 → { "id": "hold_…", "number": "02473066868", "held_until": "2026-09-13T02:55:00.000Z", "price_vnd": 400000 }
```

`price_vnd` is the price quoted for this hold, and the checkout's `amount_vnd` must equal it — a
price that changes between the tile and the button is exactly the surprise cost the checkout
must not have. `409` with code `number_taken` when another tenant holds or owns it. A hold lasts long enough to
pay by transfer (the mock uses 15 minutes). The app shows `held_until` as a clock time and never
as a countdown. `DELETE /numbers/holds/{id}` → `204` when the owner walks away.

### `POST /numbers/checkouts` → `Checkout`

```jsonc
{ "hold_id": "hold_…", "receptionist_id": "rcp_main", "method": "vietqr" }   // vietqr | card | momo
```

```jsonc
{
  "id": "co_…",
  "hold_id": "hold_…",
  "number": "02473066868",
  "method": "vietqr",
  "amount_vnd": 400000,
  "status": "awaiting_payment",               // paid | expired | failed
  "expires_at": "2026-09-13T02:45:00.000Z",   // five minutes from now; the panel counts it down
  "vietqr": {
    "image_url": "https://…",                 // a dynamic VietQR with amount and memo
    "bank": "Vietcombank",
    "account_number": "1027889966",
    "account_name": "CONG TY CO PHAN FONNUS",
    "memo": "FONNUS 6868"
  },
  "redirect_url": null,                       // card / MoMo: the gateway's page
  "qr_image_url": null,                       // MoMo: a code for the MoMo app
  "owned": null                               // the OwnedNumber, once paid
}
```

- `409` with code `hold_expired` when the hold ran out. The app asks for a new hold and says so.
- **`expires_at` is a real deadline, and the server must keep it.** The panel shows a
  five-minute clock counting down to it (the owner asked for the urgency, 13 Sept 2026). A
  checkout still unpaid at `expires_at` becomes `expired`; the app returns to the review with
  code `checkout_expired`, keeps the hold if it still has time, and a new checkout gets a new
  window. A transfer that lands after expiry still has to be matched to the number or refunded —
  that is the webhook's problem, not the owner's.
- **The receptionist is part of the purchase**, so a number is never paid for and left ringing
  nobody. The first status after `paid` is `activating`.
- The VAT invoice goes to `invoice` from `GET /numbers`, and is issued when payment lands
  (Decree 70/2025/NĐ-CP). The checkout panel does **not** show it — the owner took the line out
  (13 Sept 2026) — so where those details are collected and checked is still Q25.

### `GET /numbers/checkouts/{id}` → `Checkout`

The app polls this every two seconds while the owner pays, and immediately when they press
"Tôi đã chuyển khoản" or the payment clock reaches zero. No retries on the server's side of a poll — the next poll is the retry.
Payment confirmation comes from the bank or gateway webhook (SePay, payOS, MoMo IPN), not from
the owner. `failed` returns the app to the review with code `payment_failed`.

### `PATCH /numbers/{id}` → `OwnedNumber`

```jsonc
{ "receptionist_id": "rcp_vy" }                                     // who answers
{ "forwarding": { "from_number": "02437562211", "mode": "no_answer" } }  // or null to clear
```

`404` with code `number_not_found`. Reassigning takes effect on the next call.

### `DELETE /numbers/{id}` → `204`

The number goes back to the pool and stops ringing through to the receptionist. No refund. The
app says all of that in the confirmation before calling this.

---

## 11. Account — the Cài đặt and Gói dịch vụ pages

The owner's account, the plan and its minutes, paying, sessions and data. Mock:
`src/api/account.mock.ts` (`VITE_MOCK_USAGE=near|over` reaches the two warning states of the
minutes meter). The owner's decisions about plan changes, minutes, overage, counting and deletion —
with the evidence behind each and what would reopen it — are in
**[`account-billing-decisions.md`](./account-billing-decisions.md)** (D1–D15). Read it before
building billing or deletion. What is still open is **Q26**.

### `GET /account` → `AccountOverview`

```jsonc
{
  "profile": {
    "display_name": "Nguyễn Lan",
    "phone": "0914378064",               // digits; the login for a phone account
    "email": null,                        // or an address; "email_verified" says whether confirmed
    "email_verified": false,
    "google_email": null                  // always set for a Google account
  },
  "method": "phone",                      // "phone" | "email" | "google"
  "password_changed_at": null,            // email accounts only
  "subscription": {
    "plan_id": "standard",                // "basic" | "standard" | "advanced"
    "period": "monthly",                  // "monthly" | "annual"
    "renews_on": "2026-09-22",
    "next_charge_vnd": 4900000,           // the plan renews_on bills (a held move down has not started), plus this cycle's overage
    "scheduled": null,                    // or { "plan_id", "period", "starts_on" } — renews_on, or later while a hold runs (D3)
    "held_until": null,                   // after a monthly move up: last day of the next full cycle; a move down starts the day after at the earliest
    "numbers_used": 1
  },
  "usage": {
    "start": "2026-08-22", "end": "2026-09-21",
    "minutes_used": 1640,                 // = sum(by_day), counted as D9 says
    "by_day": [71, 82, 23, …],            // start → today; the last entry is today so far
    "projected_minutes": 2270             // null until three days have passed
  },                                      // no carried_minutes: nothing rolls over (D5)
  "pay_method": "vietqr",                 // "vietqr" | "card" | "momo" — a demo until billing is automated (Q26)
  "invoice_profile": { "legal_name": "…", "tax_code": "0109876543", "address": "…", "email": "…" },  // or null
  "invoices": [{ "id": "…", "issued_on": "2026-08-22", "kind": "plan", "plan_id": "standard", "number": null,
                 "period": { "start": "2026-08-22", "end": "2026-09-21" }, "overage_minutes": 0,
                 "amount_vnd": 4900000, "pdf_url": "…" }],
  "sessions": [{ "id": "…", "device": "desktop", "browser": "Chrome", "os": "Windows",
                 "city": "Hà Nội", "last_active_at": "…", "current": true }],
  "export": { "status": "none", "ready_at": null, "expires_at": null, "download_url": null },
  "deletion": null,                       // or { "scheduled_for": "2026-09-27" }
  "deletion_grace_days": 14               // decided: 14 (D13); server-owned so it can change without a release
}
```

- **Plan names and blurbs are not on the wire.** The app keys its own copy on `plan_id`, like
  every other machine code. `GET /plans` returns the figures: `price_monthly_vnd`,
  `price_annual_per_month_vnd`, `price_annual_vnd`, `minutes`, `overage_vnd_per_minute`,
  `numbers`, `concurrent_calls`, `own_voice`, `account_manager`. Prices include VAT.
- **The allowance is the plan's `minutes`, reset at every renewal.** Unused minutes do not roll
  over, and overage counts every minute past the plan's `minutes` (D5). Overage is settled against
  the plan in force when the cycle closes, so a move up this cycle covers minutes already used (D2).
- **`minutes_used` is the sum of `by_day`** and both come from the same cut-off, so the figure and
  the bars cannot disagree (ui-ux-principles §10). The app leaves today out of the daily average.
- **How a minute is counted (D9).** Per second, summed over the cycle — never rounded up per call.
  Spam, calls where the caller never speaks, and calls shorter than a threshold (10 s or 15 s, not
  yet chosen) are not counted. Tổng quan and Cuộc gọi must count the same calls.
- `invoice_profile` is the same record the Số điện thoại checkout invoices (Q25) — one place to
  set it.
- `city` is looked up from the session's IP, already in Vietnamese; `browser` and `os` are proper
  names shown as sent.

### Writes

| Call | Body | Answers | Errors |
|---|---|---|---|
| `PATCH /account/profile` | `{ display_name?, email? }` | `AccountProfile` | `422 name_required`, `invalid_email` · `403 email_from_google` |
| `POST /account/phone` | `{ phone }` — sends a code to the new number | `204` | `422 invalid_phone` · `409 phone_unchanged`, `phone_in_use` · `429 otp_rate_limited` |
| `POST /account/phone/verify` | `{ phone, code }` | `AccountProfile` | `422 otp_invalid`, `otp_expired` |
| `POST /account/google` | — | `{ redirect_url, profile }` — the page follows `redirect_url` to Google's consent screen; the return lands on `#/app/cai-dat` | — |
| `DELETE /account/google` | — | `AccountProfile` | `409 google_only_method` |
| `PATCH /account/billing` | `{ pay_method }` or `{ invoice_profile }` | `204` / `{ invoice_profile }` | `422 legal_name_required`, `invalid_tax_code`, `invalid_email` |
| `POST /account/password` | `{ current, next }` — signs every other session out | `204` | `422 password_wrong`, `weak_password` · `403 no_password` |
| `DELETE /account/sessions/{id}` | — | `204` | `409 session_current` |
| `POST /account/sessions/sign-out-others` | — | `204` | — |
| `POST /account/export` / `GET /account/export` | — | `DataExport`, polled every 2 s while `preparing` | — |
| `POST /account/deletion` | `{ confirm_name }` — the clinic's name, compared ignoring case and spacing | `{ scheduled_for }` | `422 confirm_mismatch` |
| `DELETE /account/deletion` | — | `204` | — |
| `POST /plans/quote` | `{ plan_id, period }` | `PlanQuote` | `409 plan_unchanged` |
| `POST /subscription/change` | `{ plan_id, period }` — charged to `pay_method` | `Subscription` | `409 plan_unchanged` · `422 payment_failed` |
| `DELETE /subscription/scheduled` | — | `Subscription` | — |

### `PlanQuote`

```jsonc
{ "plan_id": "advanced", "period": "monthly",
  "applies": "now",                 // a monthly move up starts today; anything else waits for renews_on
  "effective_on": "2026-09-13",     // a move down while a hold runs: the day after held_until
  "charge_today_vnd": 1452000,      // price difference × days left (today counted) ÷ days in cycle, to 1.000đ; 0 when it waits
  "next_charge_vnd": 9900000,       // from renews_on: a month, or the year paid at once
  "held_until": "2026-10-21" }      // a move up that applies now: held to the end of the next full cycle; otherwise null
```

The drawer shows `charge_today_vnd` (or `next_charge_vnd` when the change waits) and nothing the
page did not print first — except `held_until`, which the owner must read before the button (D3).
Every rule behind these figures is D1–D4 in [`account-billing-decisions.md`](./account-billing-decisions.md).

---

## 12. Shell — what the sidebar shows on every page

Three counts and the minutes. The app reads them on every navigation, when the owner comes back
to the window, and right after a page changes one of them (a callback made, a booking confirmed, a
plan changed). Mock: `src/api/shell.mock.ts`, which asks the calls, appointments and account mocks
rather than inventing numbers, so it cannot disagree with them.

### `GET /shell/summary` → `ShellSummary`

```jsonc
{
  "generated_at": "2026-09-14T09:12:00+07:00",
  "callbacks_owed": 3,          // = counts.callback of GET /calls?range=7d — the chip Cuộc gọi opens on
  "appointments_waiting": 2,    // = attention.length of GET /appointments — clinic-wide, whatever week
  "minutes": {
    "used": 1640,               // = usage.minutes_used of GET /account
    "included": 2500,           // = the current plan's minutes
    "renews_on": "2026-09-22"   // = subscription.renews_on
  },
  "plan_id": "standard"
}
```

- **Every figure is one another endpoint already returns, for the same moment.** The badge and the
  page it leads to are read seconds apart; if they disagree the owner trusts neither
  (ui-ux-principles §10).
- **Cheap on purpose.** No lists, no transcripts: it is read far more often than any page.
- **No copy.** The app words the badges (`3 cuộc cần gọi lại`) and decides when the minutes come
  onto the sidebar (from 80% used).
- `401` is handled as everywhere else. Any other failure is silent — the sidebar keeps what it last
  showed and reads again on the next page. The window for owed callbacks, cost and freshness are
  **Q27**.

---

## 13. Specified later — shape only

These have interfaces in `src/api/` so the UI can be built against them, but no agreed wire
format. Do not implement from this section.

| Surface | Needs | Notes |
|---|---|---|
| **Setup assistant chat** | Streaming (SSE) | Sends a turn, receives interleaved text deltas and structured `Partial<ReceptionistConfig>` patches. The assistant gets exactly the write authority today's canned parser has — it proposes a patch, the client applies it through the same path as a form |
| **Voice session** | WebSocket or WebRTC | Bidirectional audio plus a transcript event stream. The client owns no codec decisions; it toggles a microphone boolean |
| **Landing voice demo** | Cost control **first** | Unauthenticated, and every click costs Deepgram + Qwen + ElevenLabs. Needs a per-IP budget, a max duration and a kill switch before the endpoint exists. See Q21 |

---

## 14. Open questions

The decisions above that are genuinely open are collected in
**[`open-questions.md`](./open-questions.md)**, one per line, written so the list can be sent
to the backend team and struck through as answers arrive.

Several are cheap to answer now and expensive to discover later — particularly **Q1** (is the
wire format really catalogue snake_case?), **Q5** (who owns row ids?), **Q8** (concurrency),
and **Q10** (one owner, one clinic?).
