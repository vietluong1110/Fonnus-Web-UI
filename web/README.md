# Fonnus landing page

React implementation of the Fonnus landing page, built from the Claude Design
handoff bundle in `../project/`.

The prototype was a single 1,100-line `.dc.html` file driven by the design
canvas runtime (`support.js`, `x-dc` / `sc-if` / `sc-for` / `DCLogic`). This app
reproduces the same page as ordinary React components with no canvas runtime.
`../project/` is left untouched as the visual reference.

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
  design-system/           Button, Icon, Badge, Input, Switch, Logo
  data/                    all copy and pricing, no markup
  hooks/                   useReveal, useIsNarrow, useCallDemo, useRoute
  auth/                    the sign-up and sign-in flows
  components/
    layout/                Header (floating pill + menus + drawer), Footer
    sections/              one component per landing section
    orb/                   Orb, CallOverlay, and the two hooks that drive them
  styles/
    tokens/                design tokens, copied verbatim from the bundle
    global.css             page resets + the shared keyframes
    section.module.css     shared section chrome (eyebrow, heading, card, …)
```

Each component owns a co-located `*.module.css`. Colours, spacing, radii, type
and easing come from the design tokens — no hard-coded hex values outside the
orb's gradient ramp, which is a single continuous artwork rather than a set of
token stops.

### Design system

`src/design-system/` holds the six primitives the page uses, ported from the
bundle's compiled `_ds_bundle.js` back into readable source. The full system
(18 primitives, guidelines, UI kits) lives in
`../project/_ds/fonnus-design-system-…/` — port more from there as they are
needed rather than writing new ones.

Icons are Lucide glyphs applied as CSS masks so they inherit `currentColor`, as
the design system specifies. The bundle fetched them from a CDN at runtime;
here they are vendored into `public/icons/`, so the page makes no network
requests of its own. Web fonts still come from Google Fonts, via
`styles/tokens/fonts.css` — self-host those before production.

## Routing

Three pages, three hash routes, no router dependency:

| Route          | Page                       |
| -------------- | -------------------------- |
| `#` (anything) | landing                    |
| `#/dang-ky`    | sign-up                    |
| `#/dang-nhap`  | sign-in                    |

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

**Nothing here talks to a server.** `auth/mockAuth.ts` stands in for every call,
each marked with a `TODO` naming the endpoint it should become; any six digits
verify except `000000`, which is reserved so the wrong-code state stays
reachable. Both flows end by calling `navigate('landing')` — replace that with
the redirect into the app shell (Tổng quan) once it exists.

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

## Not wired up

The sign-up form moves to its success state locally — add a real endpoint in
`sections/Contact.tsx`. The voice demo needs a backend before it can do
anything; the UI is ready for one.
