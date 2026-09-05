# Fonnus

Landing page, auth flows and signed-in app shell for Fonnus — an AI
receptionist that answers the phone for Vietnamese clinics, in Vietnamese, 24/7.

A static React + Vite site. It runs with **no backend** — every call is faked in
the browser, and one env variable swaps each group for the real thing when it
exists (see "The backend seam"). It covers the landing page, the
sign-up / sign-in flows, and the app shell behind them with the **Lễ tân**
(receptionist configuration) tab. The landing page was built from the Claude
Design handoff bundle in `design-reference/`; the app screens from the
`Fonnus App Hi-fi.dc.html` frames of the sign-in redesign bundle and the context
field catalogue.

That prototype was a single 1,100-line `.dc.html` file driven by the design
canvas runtime (`support.js`, `x-dc` / `sc-if` / `sc-for` / `DCLogic`). This app
reproduces the same page as ordinary React components with no canvas runtime.
`design-reference/` keeps the prototype as a visual reference — nothing imports
it and nothing builds it.

```
npm install
npm run dev        # dev server
npm run build      # typecheck + static build into dist/
npm run preview    # serve the build
```

Output is a fully static site — `dist/` can be dropped on any host.

## Layout

```
src/
  Root.tsx                 picks the page for the current route
  App.tsx                  landing page composition + the three page-level settings
  design-system/           Button, Icon, Shape, Pattern, Badge, Input, Switch, Logo
  data/                    all copy and pricing, no markup
  hooks/                   useReveal, useIsNarrow, useCallDemo, useRoute
  api/                     every call to the backend — see "The backend seam"
  auth/                    the sign-up and sign-in flows, plus the session
  app/                     everything behind sign-in — see "The app shell"
  components/
    layout/                Header (floating pill + menus + drawer), Footer
    sections/              one component per landing section
    orb/                   Orb, CallOverlay, and the two hooks that drive them
  styles/
    tokens/                design tokens, copied verbatim from the bundle
    global.css             page resets + the shared keyframes
    section.module.css     shared section chrome (eyebrow, heading, card, …)
public/                    logo SVGs and the greeting audio, served as-is
design-reference/          archived design handoff; not built, not imported
docs/                      the API contract and the field-catalogue mapping
CONTEXT.md                 product and market context
CLAUDE.md                  conventions that look like accidents but are not
```

Each component owns a co-located `*.module.css`. Colours, spacing, radii, type
and easing come from the design tokens — no hard-coded hex values outside the
orb's gradient ramp, which is a single continuous artwork rather than a set of
token stops.

### Design system

`src/design-system/` holds the six primitives the page uses, ported from the
bundle's compiled `_ds_bundle.js` back into readable source. The full system
(18 primitives, guidelines, UI kits) lives in
`design-reference/_ds/fonnus-design-system-…/` — port more from there as they are
needed rather than writing new ones.

Icons, shapes and patterns are the Fonnus visual language ("Cung và chấm": every
drawing is a rising arc and an ink dot on a 24 grid, one terracotta accent each).
They are inline SVG drawn from `design-system/icons.ts`, `Shape.tsx` and
`Pattern.tsx` — no icon library. `docs/visual-language.md` is the working copy
of the rules; `design-reference/Fonnus Visual Language.dc.html` is the handoff.
Web fonts still come from Google Fonts, via `styles/tokens/fonts.css` —
self-host those before production.

## Routing

Three pages, three hash routes, no router dependency:

| Route          | Page                       |
| -------------- | -------------------------- |
| `#` (anything) | landing                    |
| `#/dang-ky`    | sign-up                    |
| `#/dang-nhap`  | sign-in                    |
| `#/app/…`      | the app shell (needs a session; bounces to sign-in otherwise) |

Hash routing rather than the History API because the build ships with
`base: './'` and `dist/` is meant to drop on any host — history routes would
need an SPA fallback rule configured on each one. Only hashes starting with
`#/` are routes, so the landing page's section anchors (`#bang-gia`,
`#lien-he`, …) are untouched. See `hooks/useRoute.ts`.

## Sign-up and sign-in

`src/auth/` implements the twelve auth screens from the design bundle's
`Fonnus App Hi-fi.dc.html`. Three ways in, deliberately different lengths:

| Method | Steps                                              |
| ------ | -------------------------------------------------- |
| Phone  | number → SMS code → name (skippable)               |
| Google | account picker → in                                |
| Email  | email → code in inbox → name + optional number     |

There are no passwords anywhere. The phone number is verified only in the flow
where it *is* the login identity; elsewhere it is an ordinary profile field.
The clinic's own hotline is never asked for during sign-up — that belongs in
setup, next to call forwarding. A number that already has an account silently
becomes a sign-in with a code rather than an error, which is the single biggest
drop-off in phone-first flows.

Entering a number in the landing hero hands it to sign-up through
`auth/handoff.ts` (sessionStorage, so it stays out of the URL) and opens
straight on the code step.

**No server is required.** Every call goes through `api.auth`, which is faked in
the browser by default (`api/auth.mock.ts`). One demo account signs in — phone
**0914378064**, code **111002** — and any other code shows the wrong-code
state.

`auth/SessionProvider.tsx` holds who is signed in, as three states rather than
a boolean: `checking`, `authenticated`, `anonymous`. "Still checking" is a real
answer, because the session is meant to be an httpOnly cookie this app cannot
read — the only way to know is `GET /me`, and bouncing to sign-in while that is
in flight would throw out a good session on every reload. `auth/session.ts` is
now only a *hint* — a flag saying "this browser signed in recently", used to
pick the placeholder to show while the probe runs. It is not a credential and
gates nothing.

## The app shell

`src/app/` is everything behind sign-in. `AppRoot` guards the session and
picks a page from the first path segment; `AppShell` is the frame: a 216px
milk sidebar (logo, the six tabs, the clinic / owner block with a sign-out
menu) and a paper content column. Below 900px the sidebar narrows to an icon
rail. Only **Lễ tân** is built; the other five tabs are honest placeholders.

### Lễ tân

The tab where the owner tells the receptionist about the clinic. Three
sub-tabs, all under `#/app/le-tan/`:

| Path                       | What it configures                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `ho-so`                    | Who she is: name, voice (4 voices = gender × accent), speed, style, English, greeting, steering text, turn-taking |
| `kien-thuc`                | Hub: seven rows in two groups, each a one-line summary of what is set, beside the Fonnus assistant. Files and websites go to the assistant, which reads them into the sections |
| `kien-thuc/dia-diem`       | Business identity + address (R1), directions / parking / links / VAT, branches               |
| `kien-thuc/gio-mo-cua`     | Weekly hours (R1) as shifts on a scrolling week calendar — drag to add, move or resize, click to type; the gap between shifts is the break — live "open now", and holiday exceptions pre-seeded with Vietnamese holidays incl. Tết (R2) — one page, one confirmation |
| `kien-thuc/dich-vu`        | Price list: 12 dental template rows under renamable, collapsible group cards (drag rows between groups), one row open for editing at a time; combo packages, pricing policy, not-offered, payments, promotions |
| `kien-thuc/bao-hiem`       | Clinic pack: BHYT / insurance (R2), consultation fee, facilities, what to bring              |
| `kien-thuc/bac-si`         | Practitioner roster                                                                          |
| `kien-thuc/cau-hoi`        | FAQ pairs                                                                                    |
| `kien-thuc/tu-khoa`        | STT keyterms: derived + vertical pack (read-only) + tenant additions                         |
| `ky-nang/chuyen-may`       | Escalation targets (R1), triggers, after-hours behaviour, emergency line, red flags, system safety scripts |
| `ky-nang/gui-email`        | Email rules per call intent, recipients, templates with insertable variables                 |
| `ky-nang/dat-lich`         | Booking windows per weekday, slots / duration / buffer / cap, confirmation, policies, identity rule |

**The model is the catalogue.** `app/letan/model.ts` names every field exactly
as `Fonnus_context-field-catalogue.md` does (`business_name`,
`pricing_disclosure_policy`, `endpointing_silence_ms`, …), with its origin and
gate in a comment, so a section save maps straight onto the tenant record.
Fields the wireframes added on top of the catalogue are marked `[ext]`
(`agent_name`, `escalation_window`, `greeting_by_daypart`, `email_rules`, the
two `*_confirmed` flags). System-written values — compliance block, red-flag
pack, refusal scripts, verbosity cap — live in `system.ts` and render
read-only with a "Hệ thống" tag.

**State and the backend seam.** `store.tsx` holds one `ReceptionistConfig`,
loaded through `api.tenant.getConfig()`. Every section edits a draft
(`useDraft(keys, label)`) and commits through `saveSection(patch)` — one PATCH
per section, carrying only that section's catalogue keys. The question rail and
the setup assistant write through `update()` immediately.

The save is optimistic and rolls back per key on failure, so a failure in one
section cannot undo a concurrent write from another or from the rail. No
storage key appears in this file: persistence belongs to the mock, because a
localStorage mirror that outlives the server's truth is a stale cache. See
"The backend seam" below.

**Readiness** (`readiness.ts`) applies the catalogue's gates: R1 = the agent
can pick up, say the address and hours, and hand off; R2 = it can quote, book,
and is safe with real patients. Each check deep-links to the page that fixes
it. `isOpenNow` derives the catalogue's `is_open_now` from hours, breaks and
holidays for the live indicator.

**"Linh hỏi — bạn trả lời"** (`questions.ts`, `assistant/queue.ts`) turns the missing
fields into one question at a time with quick-reply chips and a free-text
line; every answer writes the field it belongs to, so the forms and the meter
move at once. Skips are per browser session.

**"Gọi thử"** (`letan/tryout/TryPanel.tsx`, `api/receptionist.*`) is the rail beside every
Lễ tân form: a call you can hold. It opens with the compliance line and the greeting, then
the owner types or speaks (the browser's own Vietnamese speech recognition) and the
receptionist answers from the record as it is on screen, unsaved edits included, voiced as
soon as the reply lands. Mocked, the reply is intent matching in `receptionist.mock.ts`;
live it is `POST /receptionist/preview`.

**"Nghe thử"** (`ui/speak.ts`) asks `api.voice.previewTts` to voice a line in
the tenant's chosen voice. With no TTS server it falls back to the browser's
own Vietnamese voice where one is installed — a stand-in that ignores the
chosen voice and speed, and is not the product voice.

**Form controls** (`ui/Field.tsx`). Selects are a listbox we draw ourselves,
not a native `<select>`: the native popup is painted by the OS — on Windows a
white list with a system-blue highlight — which has nothing to do with the
brand. The panel is portalled to `<body>` and positioned `fixed`, because the
tables that hold selects clip their overflow and would otherwise cut it off at
the cell edge; it flips above the trigger when the page runs out of room below,
and takes arrows, Home/End, type-ahead, Enter and Escape. The focus ring is
drawn once, by the `.control` shell — the inner input suppresses the global
`:focus-visible` outline, which used to add a second box inside the first.
State on `.control` and on the play button goes through custom properties
rather than competing `box-shadow` / `background` declarations, so `:hover` and
the "on" state resolve by cascade order instead of by specificity.

Prices are one `MoneyRangeField`, not two boxes under two headings: a range is
one answer, the way the receptionist says it.

A `compact` field carries a compact label: 12px in soft ink rather than 13.5px
in full ink. The full-size pairing puts a 13.5px label over a 14px value; keep
it over a 13px value and the label is louder than the thing it names, which is
backwards — the value is what the owner wrote, the label is only chrome.

**Dates and times** (`ui/Pickers.tsx`) are drawn for the same reason selects
are. The native pickers are the one piece of chrome on these screens that is
not ours: system blue, and English — "AM", "PM", a month-first date — on a page
that is otherwise Vietnamese. Three controls replace them, exported from
`app/ui` and meant to be reused wherever a date or a time is edited:

| Control | For | Reads |
|---|---|---|
| `DateField` | one date | `14/02/2027` |
| `DateRangeField` | a span — a holiday, a promotion | `14/02 – 22/02/2027` |
| `TimeField` | a clock time | `08:30` |

Values are what the catalogue stores — ISO dates and 24-hour `HH:MM` — and only
the reading changes, so nothing downstream knows the difference. The calendar
is Monday-first with Vietnamese month names; a range is picked start-then-end
with the band following the pointer. `TimeField` is a text input first: `8h30`,
`8:30`, `08.30` and `0830` all parse, and the quarter-hour list is an offer, not
the only way in. `pill` swaps the field skin for a pill, for a picker that sits
in a row rather than in a form.

All three (and any panel that needs the same behaviour — see `ClosurePill` on
the hours page) hang off `useAnchoredPopup` / `AnchoredPopup` from the same
file: one implementation of measuring, flipping above the trigger, and closing
on an outside press. Three rules there are load-bearing and were each a bug
first.

Pop-ups nest, and all of them are portalled to `<body>`, so none contains
another and "outside" cannot be read from the DOM. They keep a stack instead:
a press closes a pop-up unless it landed inside it, on its trigger, or inside
one opened *from* it. Pressing the holiday panel closes the time list it
opened and stays; pressing the page closes both; Escape peels one layer.

A list scrolls itself by setting its own `scrollTop`, never with
`scrollIntoView`, which fires a scroll event that escapes the pop-up and reads
to the panel underneath as "the page moved".

And the highlighted row follows the keyboard only. Hovering a row must not
move the cursor a list auto-scrolls to: scrolling drags a new row under a
still pointer, which would hover, which would scroll, and the list runs away
to one end. The mouse highlights in CSS; arrows scroll from the key handler.

## The hero

Three things and nothing else: the claim, one control, and the orb.

The sign-up control is a single pill — `+84`, the field, and the button share
one rounded container — rather than a label, a field and two buttons. A number
typed here is handed to sign-up through `auth/handoff.ts`, which opens it
straight on the SMS code step.

The orb docks in the hero's right column and flies to the bottom-right corner
once the section scrolls away, so trying the voice stays one click from
anywhere on the page. There is no separate "Nghe thử" section any more — the
hero is it.

The proof row's clinic marks in `sections/clinic-logos.tsx` are **placeholders**
for invented clinics. Swap them for real customer logos before launch, and only
with each clinic's permission: a real logo there reads as an endorsement.

## Shape

One rule, so radii stop disagreeing: **controls are pills, containers are
rounded rectangles.** Every `Button` is `--radius-pill` (that lives in the
component, not in per-call-site overrides), as are the navbar and the hero's
sign-up control; cards, panels and sections stay on `--radius-lg`. Before this
the navbar and hero buttons were pilled inline while every other button was
12px — buttons disagreeing with each other, which was the actual inconsistency.

## The sticky step stack

`HowItWorks` is a sticky card stack: each step pins under the navbar and the
next slides up over it, leaving a 14px sliver of the one below. Two things it
is easy to break:

- `.page` uses `overflow-x: clip`, **not** `hidden`. `hidden` makes an ancestor
  the scroll container and silently kills `position: sticky`.
- The runway under the last card is a real element, not padding on the stack.
  Sticky items are bounded by their parent's *content* box, which padding does
  not extend — with padding alone the third card never reaches its pin and the
  first releases early.

Each card's right half plays a small scene once, when it first settles on
screen (`usePlayedOnce`): the clinic's details being typed in, the forwarding
wire drawing and the switch flipping, a call arriving and being booked. Below
900px the pinning is dropped — a card taller than the viewport cannot stick.

## Interactive call demos

Three of the four capabilities carry a `CallDemoPlayer` instead of a static
picture: press play and the call replays turn by turn, ending in the action
Fonnus took — the appointment landing in a calendar, the matching row lighting
up in the clinic's price list, the call hopping to a named doctor.

`data/callDemos.ts` holds the scripts; `capability-actions.tsx` holds the three
endings. The scripts are SAMPLE calls for a fictional clinic — prices and staff
names are illustrative. `audioSrc` is optional and currently unset, so the
transcript rolls silently; drop a recording in `public/audio/`, point
`audioSrc` at it, and the same widget plays it in step with the turns.

Only one player runs at a time: each registers a stopper in a module-level set
and clears the others before starting.

## Motion

Deliberately restrained; the audience is clinic owners, not designers. The
whole vocabulary is: sections lift in on scroll (`useReveal`), capability rows
slide in from their own side on wide screens only, the step cards pin and
stack, the call players roll their transcripts, the navbar condenses past 24px,
and the orb breathes. Everything honours `prefers-reduced-motion`.

`data-reveal-from="left|right"` opts an element into a sideways entrance
instead of a lift — ignored below 900px, where a stacked column makes a
sideways slide meaningless and pushes content past the screen edge.

## Colour

The landing page is clay, brown, cream and ink. Lá sả (`--sage`,
`--lemongrass`, `--success`) is in the palette but is neither primary nor
secondary, and it was carrying structural weight — every checkmark, every
"resolved" ground — which pulled focus off clay. It is out of the landing page
entirely; the tokens remain for the app, where a genuine success state earns a
different hue. Red survives in exactly one place: the missed call.

## The navigation

A floating glass pill, centred and sticky, that tightens and goes more opaque
past 24px of scroll. The glass is tinted cream (`--milk`), not grey — that tint
is what keeps it reading as Fonnus rather than as a generic SaaS bar.

Seven flat links became four entries, two of them menus (`NAV_GROUPS` in
`data/content.ts`). Every destination is a real section on this page; the nav
never promises a page that does not exist. One menu row opens the call demo
instead of navigating, which is why `Header` takes an `onTryCall` prop.

## The orb

The orb is the page's signature and the fiddliest part of it. Three pieces:

- **`Orb.tsx`** — one `position: fixed` button, mounted once at the app root and
  never re-mounted. It is deliberately outside every section.
- **`useOrbPlacement.ts`** — decides which of three places the orb belongs in
  (`docked` in the hero, `pinned` bottom-right once the hero scrolls away,
  `call` inside the overlay) and drives it there with a transform. Two empty
  placeholder divs are what the hook measures: the hero's dock and
  `CallOverlay`'s spot. Because the dock is in the hero, the orb is on screen
  from the first paint — there is no "before" state to fade in from. Comments in
  the file record which transitions fade and which fly, and why.
- **`useOrbField.ts`** — the animated gradient. A deforming scalar field
  rendered to a 144×144 canvas and blurred by CSS, not a gradient whose position
  is animated. Every temporal frequency is a multiple of `TAU / 44s`, so the
  loop closes with no visible reset.

`useCallDemo.ts` holds the demo's state machine. No microphone is opened and
nothing is sent anywhere. A chip or a typed question only decides how long the
agent stays in its "speaking" state — but the opening greeting is real audio.

### The greeting and the sound waves

Opening the call screen plays `public/audio/linh-greeting.wav` at once. No
button to press: the click that opened the screen is the gesture browsers
require for autoplay, so `useGreetingAudio.ts` simply calls `play()` and awaits
it. If it is refused anyway, the demo falls back to the old scripted
ring-then-speak timings, so the screen is never silent *and* frozen.

While it plays, the greeting also drives the orb. `useGreetingAudio` taps the
element through a Web Audio `AnalyserNode`, takes the RMS of the waveform each
frame and shapes it into an envelope with a fast attack and a slow release —
so the waves snap open on a syllable and settle through a pause rather than
flickering. `Orb.tsx` runs one `requestAnimationFrame` loop that writes that
number to a single CSS custom property, `--amp`, on the orb's root; the wave
brightness and spread, the sphere's swell and the halo are all `calc()`s off
it. Nothing about the envelope touches React state, so a 60fps signal costs
zero re-renders.

The waves themselves are driven by two things at once: `fnWave` keyframes carry
each of the three rings outward on a steady beat, and `--amp` decides how bright
and how far each one gets. The ripple never stutters, but its strength tracks
the voice. When no waveform is available — a chip reply, or a browser without
Web Audio — the loop substitutes a slow sine so the orb still breathes.

Replacing the greeting is a file swap: drop a new clip at that path. The agent
speaks for exactly as long as the recording lasts, so no timing needs updating.

## Page settings

`App` takes three props, carried over from the prototype's design-canvas
controls:

| Prop | Default | Effect |
| --- | --- | --- |
| `motion` | `'reveal'` | `'tắt'` renders sections settled, with no entrance |
| `pricingHighlight` | `'Tiêu chuẩn'` | which plan gets the terracotta outline |
| `matrixDefaultOpen` | `false` | whether the comparison table starts expanded |

## The backend seam

There is no backend yet, and the app does not need one: it runs entirely on
in-browser fakes and that is the committed default. But nothing is faked
*inline* any more. Every call — auth, the tenant record, file upload, TTS, the
setup assistant, the voice session — goes through one interface in `src/api/`,
and one environment variable decides which of two implementations answers it.

```
Component  →  api.tenant.getConfig()   ─┬─→  tenant.mock.ts   (faked in the browser)
                                        └─→  tenant.live.ts   (fetch → the backend)
                                                  ↑
                                    VITE_API_MODE / VITE_API_LIVE_GROUPS
```

Both files are typed against the same interface in `api/contracts.ts`, so
`npm run typecheck` fails the moment a live implementation drifts from the mock
it replaces. Groups switch **one at a time** (`VITE_API_LIVE_GROUPS=tenant`),
because the backend will ship endpoints over weeks and a single global switch
would mean nothing could be tested until everything existed.

Copy `.env.example` to `.env.local` to change any of it. Two knobs matter more
than they look:

| | |
| --- | --- |
| `VITE_MOCK_FAILURE_RATE=1` | every faked call fails. **The only way to see the loading, rollback and retry states before a backend exists** — use it before shipping anything that touches them. |
| `VITE_MOCK_LATENCY_MS=0` | instant, for a live demo. |

Because a real network is slow and fails, three screens exist that the design
bundle never needed: a boot skeleton, a retry card when the record cannot load
(it deliberately does *not* fall back to the dental template — an owner shown a
stranger's clinic would start editing it), and a save bar that stays open in red
with "Thử lại" when a save fails, having rolled the record back.

`docs/` is the handoff:

| | |
| --- | --- |
| [`docs/api-contract.md`](docs/api-contract.md) | every endpoint, request and response |
| [`docs/backend-integration.md`](docs/backend-integration.md) | how to fill in the live half, in order |
| [`docs/field-catalogue-mapping.md`](docs/field-catalogue-mapping.md) | how `model.ts` maps to the context field catalogue, and the `[ext]` fields it adds |
| [`docs/open-questions.md`](docs/open-questions.md) | the decisions the backend team still owes an answer to |

## Still faked

The parts with an interface but no implementation behind it: the setup
assistant's replies come from the regex parsers in `questions.ts` rather than a
model, and the voice demo plays a recording on a scripted beat rather than
opening a microphone. Both have a defined transport (`AssistantApi`,
`VoiceApi`) that a real one drops into.
