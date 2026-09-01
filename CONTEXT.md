# Fonnus - Product, Objectives, Constraints

## What this is

Fonnus is an AI-powered phone and customer communication platform for small and
medium-sized businesses in Vietnam. It acts as an autonomous virtual receptionist:
handling inbound calls, scheduling appointments, and transcribing inquiries 24/7.

The system is an inbound-only, real-time STT → LLM → TTS voice pipeline. Appointment
auto-confirmation against an internal availability ledger (no calendar API integration)
is target scope, not built: the schema has no `appointment` or `availability_slot` table
yet, and both arrive in Phase 3 (`PLAN.md`).

Tenancy today is single-tenant. One `TENANT_ID` per process (default `pilot`), one
hardcoded system prompt, and a `tenant_config` row that holds an id and a clinic name.
Giving each tenant its own phone number, system prompt, and configuration, isolated from
every other tenant, is target scope — the W4-A tenant-runtime step. The groundwork is in
place: the DID the switch resolved is persisted on `call_log`, so a future DID→tenant
lookup has a stored value to resolve against.

**The platform is sector-agnostic. The go-to-market is not.** Nothing in the pipeline,
data model, or configuration layer should assume healthcare. We are betting on
healthcare clinics first because that is where the call pain, the willingness to pay,
and our access are strongest, not because the technology is specialised for it.

**Design principle: generalise at the config layer, not the code layer.** The
abstraction boundary is already defined in `docs/context-field-catalogue.md`: a General
field set that every tenant needs regardless of industry, plus a vertical-specific field
set layered on top. Adding an industry means adding a vertical field set and its
prompt-assembly rules, not forking the pipeline. Keep it that way.

- Do not hardcode clinic vocabulary, clinic flows, or clinic policies into pipeline code.
- Do not build a plugin framework or an industry abstraction layer before a second
  vertical actually exists. Premature generality costs pilot time we do not have.
- The test for any new code: could a restaurant, a spa, or a law office tenant be added
  by populating configuration alone? If not, the logic is in the wrong layer.

**Number provisioning.** Fonnus purchases a pool of fixed-line numbers from FPT Telecom
and holds them as inventory. During onboarding the tenant selects a number from that
pool at no charge. Tenants do not port, configure, or forward from their own line in
order to go live. Whether a pilot tenant additionally forwards its existing published
number to the Fonnus number is a per-tenant decision, not a product requirement.

**First vertical:** dental and aesthetic clinics in Vietnam (1-2 sites,
owner-operated). Ophthalmology, ENT, paediatrics, OB/GYN follow within healthcare.
Restaurants, and other high-inbound-volume SMB categories, are named future directions
and explicitly out of scope now.

## Objectives

Ship a working AI voice receptionist that a Vietnamese SMB can go live on within
minutes of a configured tenant record existing. First pilot target: a dental or
aesthetic clinic, mid-November 2026.

### MVP use cases

| # | Use case | Why it matters | MVP scope |
|---|----------|----------------|-----------|
| UC-5 | Pre-visit logistics and eligibility | Largest share of minutes. Pure system-prompt Q&A, no tool calls. Carries the gross margin. | P0 - in MVP |
| UC-1 | Price inquiry / price shopping | Top of funnel. Caller is ringing three clinics in ten minutes. | P0 - in MVP |
| UC-4 | Post-procedure problem call | Lowest volume, highest consequence. Hard refusal + immediate escalation. Safety-critical. | P0 - in MVP |
| UC-2 | New appointment booking | The revenue event. Requires tool calls against the availability ledger. | P0 - in MVP |
| UC-3 | Reschedule, cancel, confirm | Unhandled reschedule becomes a no-show. Requires a read/write path into existing records plus identity verification. | P1 - after UC-2 is stable, not in the pilot |

Full definitions, failure modes, and per-flow required context fields:
`docs/inbound-call-use-cases-v1.md`.

### What MVP includes

This is the scope the MVP is aimed at, not a description of what exists today. Each item
is labelled with its current state; `PLAN.md` holds the step that delivers it.

- **Built.** Real-time voice pipeline (STT → LLM → TTS). It runs end to end, but the
  clinic answers themselves land in W4.
- **Built.** Consent gate at call open. Pipeline constraint, not a form field. See
  Constraints.
- **Built.** Call logging: transcripts, recordings, metadata.
- **Not built.** Per-tenant system prompt assembled from the context field catalogue.
  The prompt in the code is a hardcoded placeholder constant and `tenant_config` carries
  no catalogue fields. The catalogue itself (`docs/context-field-catalogue.md`) is the
  authority for the field set and its taxonomy; the older "88 fields, 68 Static / 16
  Session / 4 Tool" count quoted here does not match it and is superseded by whatever
  the catalogue says when the field set is frozen (`PLAN.md` backlog). Delivered by W2-C
  and W4-A.
- **Not built.** Tool calling for appointment booking (availability check + slot write).
  No tool definitions are sent to the LLM and the reducer has no `tool_wait` phase;
  Phase 3 / M3.
- **Not built.** **Tenant configuration UI**, operator-assisted, to be built in this
  repo. The entire HTTP surface today is `/healthz` and `/metrics` — there is no web
  code of any kind. Four population paths into the context fields are planned:
  1. Direct text input per field.
  2. File upload (price lists, service menus, business documents) with extraction.
  3. Website scrape and research against the tenant's public pages.
  4. Auto-generated FAQ list with draft answers, reviewed and edited before go-live.

  The operator will populate a prospect's tenant record live during a demo. This is
  operator-assisted configuration, not self-serve onboarding. Self-serve stays deferred.
  Delivered by W2-C (form) and W4-D (upload → confirm).
- **Not built.** Basic tenant dashboard: calls today, appointments booked, recent call
  list with transcripts and audio playback. Post-W4 (`PLAN.md` M4/M5 leftovers).
- **Not built.** Number selection from the FPT inventory pool during tenant setup — part
  of the same tenant UI.

### What MVP does not include

- Self-serve tenant onboarding (operator-assisted only at pilot).
- Auto-built or episodic caller memory (hallucination + PDPL risk).
- Calendar API integration (internal availability ledger instead).
- UC-3 reschedule / cancel (ships post-launch).
- Automated billing (manual invoicing for the first 5-10 tenants).
- Restaurant vertical.
- Zalo staff notifications, daily Zalo summary, staff-confirm booking mode.

Milestones and exit gates: `PLAN.md`. Consumed planning input: `docs/build-plan-v1.md`.

## Constraints

### Language

Vietnamese is a hard constraint, not a localisation layer. It drives every vendor
choice. No vendor publishes Vietnamese-specific WER, TTS MOS, or tool-calling
benchmarks. Every "supports Vietnamese" claim is a language-count claim until
independently tested on our own eval datasets.

### Latency

Definitions in ADR 0007. Two clocks, never conflated:

- **Pipeline latency** (`endpoint_decision → first_audio_out`): P95 < 1200 ms no-tool.
  The < 2500 ms with-a-tool-call budget, with a filler phrase covering the gap, is a
  Phase 3 target: there is no tool calling, no `tool_wait` phase and no filler phrase
  today.
- **Caller-perceived silence** (`speech_end → first_audio_out`): alarm at P95 ≥ 3600 ms.
  Aspirational — nothing alarms today, and the percentiles are computed offline by
  `tools/report-calls.ts` rather than exported for scraping.
- **Barge-in response:** < 200 ms. Flag-gated behind `BARGE_IN_ENABLED`, which is
  `false` in `config/prod.env` — barge-in is off in production, so this target binds
  nothing that currently runs (W3-A).

### Cost

1,438 VND/min is the variable-cost model every measured cost/min is compared against
(first measurement: `tools/report-calls.ts`, W1-D). TTS dominates variable cost (60%+ of the
blend), not LLM. LLM selection is locked on Eval Ops data, not preference; prompt
caching behaviour is part of the selection criteria, because 68 Static fields are
prefilled on every single call.

### Quality gates

No self-grading. Each pipeline leg has its own eval track:

- **STT:** WER + entity error rate. Entities (names, dates, prices, phone numbers)
  matter more than aggregate WER.
- **LLM:** exact-match tool accuracy + false-positive rate.
- **TTS:** human MOS ≥ 4.0 graded over an 8 kHz phone channel, not studio WAV.
- **End-to-end:** pass rate on scripted scenarios over a real call.

Booking execution accuracy (agent-controlled) and booking conversion rate
(caller-dependent) are separate metrics and are never merged.

### Legal (Vietnam)

- **PDPL (Law 91/2025/QH15) and Decree 356/2025/ND-CP:** transcripts and health details
  are sensitive personal data requiring separate explicit consent, distinct from general
  processing consent. The A05 data-processing licence is the primary launch gate. A
  cross-border transfer impact assessment is required for every foreign STT / LLM / TTS
  provider.
- **AI disclosure (Law 134/2025/QH15):** the caller must be told they are speaking to an
  AI. Legal requirement, not a UX choice. `ai_disclosure_script` is a Block field.
- **Consent gate:** must fire before the first caller utterance is recorded. Call audio
  captures every sensitive utterance regardless of which fields are formally stored, so
  the gate is a pipeline architecture constraint, not a database flag. Nothing
  caller-derived persists before consent. See ADR 0008.
- **Medical advice:** hard refusal script plus immediate escalation. Never triage,
  diagnose, suggest medication or dosage, say a symptom is normal, or read back lab or
  imaging results. See UC-4.
- **No auto-built memory.** Returning caller means a lookup by `phone_e164`, not
  episodic recall. No cross-tenant caller graph: that would make Fonnus a controller
  rather than a processor.
- Three consent questions are open with counsel (build plan §3.2). Nothing in this repo
  is legal advice.

### Team capacity

~2 FTE engineering. Telephony is the least familiar and least reversible layer. It was
built first on purpose. That figure, and the mid-November 2026 pilot date under
§Objectives, are sized against the full MVP scope above — including the parts marked not
built. Neither has been re-derived from the code that exists today.

## Stack

| Layer | Component | Notes |
|-------|-----------|-------|
| Runtime | Node.js / TypeScript | No framework (ADR 0002) |
| Telephony | FreeSWITCH + `mod_audio_stream` | FPT Telecom direct SIP trunk. Inbound free, 20K VND/mo per number, 400K VND one-time provisioning per number. |
| STT | Deepgram Nova-3 | ~239 VND/min. Vietnamese quality under eval. |
| LLM | Qwen-3.5-397B via OpenRouter | Selection gated on Eval Ops data. Intent-routing spike (small fast model for simple intents) planned. |
| TTS | ElevenLabs (current adapter, ADR 0010) | Provider decision open — decided at M1 on dataset C (PLAN backlog "TTS provider decision"). Build-plan candidate was Cartesia Sonic 3.5 (~764 VND/min raw, ~382 VND/min effective at 50% agent speaking ratio). |
| VAD | Amplitude threshold (`VAD_SPEECH_THRESHOLD`) | Barge-in signal 2 only: peak absolute int16 per caller frame (`app/src/session/audio-energy.ts`). Endpointing is Deepgram's, remote. A local neural VAD (Silero) is a future seam, not built — PLAN backlog. |
| Database | PostgreSQL + Drizzle ORM | ADR 0005. Hybrid fixed-column + JSONB `caller_profile` per tenant. |
| Tenant UI | Planned, in this repo | Operator-assisted tenant config + dashboard. Not built: the HTTP surface is `/healthz` + `/metrics` and there is no UI dependency. |

Provider decisions are gated on eval results, not preference. See the PLAN backlog for
pending evals.
