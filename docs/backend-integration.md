# Connecting the backend

For a backend engineer who has never opened this repo, and for whoever keeps it
consistent afterwards.

**You do not need to read any React to do this work.** Everything you need is in one
folder, and the type checker tells you when you are done.

---

## The one idea

A component never calls `fetch`. It calls an **interface**, and one environment variable
decides which of two implementations answers.

```
Component  →  api.tenant.getConfig()   ─┬─→  tenant.mock.ts   (faked in the browser)
                                        └─→  tenant.live.ts   (fetch → your backend)
                                                  ↑
                                    VITE_API_MODE / VITE_API_LIVE_GROUPS
```

Both files are typed `: TenantApi`. **If the live one drifts from the interface, the build
fails.** That is the entire safety mechanism, and it means your job is small and checkable:

> Fill in the `.live.ts` files. Run `npm run typecheck`. Done.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5180
```

It works with no backend at all — that is the default. Sign in with phone **0914378064**,
code **111002**.

```bash
npm run typecheck  # the only gate; this is what catches contract drift
npm run build      # typecheck + static build into dist/
```

---

## The folder

```
src/api/
  contracts.ts      Every interface and wire type. Types only — read this first.
  index.ts          The switch. The one file that picks mock or live.
  env.ts            Reads the environment variables. Nothing else does.
  http.ts           The fetch wrapper: cookies, timeout, ApiError, the 401 hook.
  errors.ts         ApiError + the Vietnamese message for every failure.

  auth.ts?          (no separate file — AuthApi lives in contracts.ts)
  auth.mock.ts      Faked in the browser        ┐
  auth.live.ts      Real HTTP                   │ same interface,
  tenant.mock.ts    Faked in the browser        │ mirror-image files
  tenant.live.ts    Real HTTP                   ┘
  assistant.mock.ts / assistant.live.ts
  receptionist.mock.ts / receptionist.live.ts   the "gọi thử" panel's reply
  voice.mock.ts     / voice.live.ts
  insights.mock.ts  / insights.live.ts          everything Tổng quan draws
  calls.mock.ts     / calls.live.ts             the Cuộc gọi list, one call, callbacks
  appointments.mock.ts / appointments.live.ts   the Lịch hẹn week, and its actions
  leads.mock.ts     / leads.live.ts

  mock-support.ts   delay(), maybeFail(), the demo fixtures
  attachments.ts    file-kind classification
  event-queue.ts    push-in / for-await-out, for the streaming transports
  greeting-player.ts  the demo greeting clip and its amplitude tap
```

`contracts.ts` is the specification in TypeScript form.
[`api-contract.md`](./api-contract.md) is the same thing in prose, with request and response
bodies.

---

## Switching one endpoint at a time

Copy `.env.example` to `.env.local` (gitignored) and edit.

```bash
# Everything faked. The committed default.
VITE_API_MODE=mock

# Just the tenant config against the real backend; everything else stays faked.
VITE_API_LIVE_GROUPS=tenant

# Everything real.
VITE_API_MODE=live
```

**This is the point of the per-group switch.** You will ship endpoints one at a time over
weeks. A single global on/off would mean nobody could test your first endpoint until every
other one existed.

Groups: `auth`, `tenant`, `assistant`, `receptionist`, `voice`, `insights`, `calls`, `appointments`, `leads`.

The console says which is which on every page load:

```
[fonnus] API mode: mock. Faked in the browser: auth, assistant, voice, insights, calls, leads.
```

### No CORS in development

```bash
VITE_API_BASE_URL=/api/v1
VITE_DEV_API_TARGET=http://localhost:3000
```

The Vite dev server proxies `/api` to your backend, so the browser only ever talks to
`localhost:5180`. No preflight, no `Access-Control-Allow-Credentials`, no `SameSite`
argument to have until production.

The proxy strips the `/api` prefix — `/api/v1/tenant/config` reaches you as
`/v1/tenant/config`. If you mount at the root instead, drop the `rewrite` line in
`vite.config.ts`.

---

## Suggested order

Each row is independently shippable and independently testable.

| # | Group | Endpoint | Why here |
|---|-------|----------|----------|
| 1 | `auth` | `GET /me` | Smallest possible thing. Proves cookies, CORS and the proxy all work before anything depends on them. |
| 2 | `tenant` | `GET /tenant/config` | The biggest payload and the one that settles the wire format. Get this right and the rest follows. |
| 3 | `tenant` | `PATCH /tenant/config` | The first write. See the open questions on row ids and concurrency first. |
| 4 | `auth` | the OTP routes | Needs a real SMS provider, so it is usually gated on something outside this repo. |
| 5 | `tenant` | knowledge-file upload | Multipart, plus whatever indexes the file. |
| 6 | `voice` | `POST /tts/preview` | Cheap, visible, and it makes ten play buttons real. |
| 7 | `assistant` | the chat stream | Needs the model. Wire format not agreed — talk first. **No UI consumes it since Sept 2026** — the setup assistant was removed; the group stays so it can come back as its own project. |
| 8 | `voice` | the session | Needs the pipeline **and** the cost controls. See open-questions Q21. |
| 9 | `insights` | `GET /insights/overview` | The Tổng quan tab. Needs call records to exist first, so it is naturally late — but it is one read-only endpoint with no writes and no concurrency, so it is the easiest of the lot once there is data to aggregate. |
| 10 | `calls` | `GET /calls`, `GET /calls/{id}`, `POST /calls/{id}/callback` | The Cuộc gọi tab. The call log already stores transcripts and recordings; the work is the events, the gaps and the summary (Q24), and making `counts` agree with row 9's figures for the same range. |

Tick them off in this table as you go.

---

## Seeing the error states

This is the part people skip, and then discover in production.

```bash
VITE_MOCK_FAILURE_RATE=1     # every faked call fails
VITE_MOCK_FAILURE_RATE=0.3   # one in three
VITE_MOCK_LATENCY_MS=2000    # slow, to see the loading states
```

With failures on you can walk every path a real network produces, with no backend running:

- The Lễ tân tab shows a **retry card**, not an empty form. It deliberately does *not* fall
  back to the dental template — an owner shown a stranger's clinic would start editing it.
- A failed save keeps the **save bar open**, in red, with "Thử lại", and rolls the record
  back. The owner's typing stays on screen.
- A failed session probe shows **"Không kết nối được máy chủ"** with a retry, rather than
  bouncing a signed-in owner to a login screen they also cannot reach.

If you change an error path, check it with this before you call it done.

---

## Things worth knowing before you write the first line

**The session is an httpOnly cookie.** Every request already sends
`credentials: 'include'`. Two consequences:

- `Access-Control-Allow-Origin: *` is **illegal** with credentials. Echo the exact origin
  and send `Access-Control-Allow-Credentials: true`.
- Put the API on a subdomain of the app's registrable domain (`app.fonnus.vn` ↔
  `api.fonnus.vn`). Same-site, so the cookie stays `SameSite=Lax` and no CSRF-token
  machinery is needed. An unrelated domain forces `SameSite=None; Secure` and reopens CSRF.

**A 401 signs the owner out** from anywhere in the app — except on `GET /me` and `/auth/*`,
where the client passes `expect401` because a 401 there means "anonymous", not "expired".

**Send machine codes, not sentences.** The frontend owns every Vietnamese string; the
mapping lives in `errors.ts`. A server-authored sentence will not match the voice of the
screen around it. Add a code, add a line to `BY_CODE`.

**Field names are catalogue `snake_case`, verbatim.** `business_name`, not `businessName`.
There is no mapping layer anywhere in this repo and there should never need to be one. See
[`field-catalogue-mapping.md`](./field-catalogue-mapping.md).

**Answer the open questions early.** [`open-questions.md`](./open-questions.md) — especially
Q1 (wire format), Q5 (who owns row ids), Q8 (concurrency) and Q10 (one owner, one clinic?).
Q5 has a concrete failure mode: if the server mints its own row ids but the PATCH response
does not return the full array, the form re-sends the client's ids on the next save and you
get twelve duplicate services.

---

## When you change a contract

1. Edit `contracts.ts`.
2. `npm run typecheck` — it lists every mock and live file now out of date.
3. Update both sides. **Keep the mock working**: it is what lets the rest of the team demo
   and design without your backend running, and the demo login is the acceptance test.
4. Update [`api-contract.md`](./api-contract.md) in the same commit.
