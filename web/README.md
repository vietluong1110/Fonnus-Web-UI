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
  App.tsx                  page composition + the three page-level settings
  design-system/           Button, Icon, Badge, Input, Switch, Logo
  data/                    all copy and pricing, no markup
  hooks/                   useReveal, useIsNarrow, useCallDemo
  components/
    layout/                Header (+ drawer), Footer
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

## The orb

The orb is the page's signature and the fiddliest part of it. Three pieces:

- **`Orb.tsx`** — one `position: fixed` button, mounted once at the app root and
  never re-mounted. It is deliberately outside every section.
- **`useOrbPlacement.ts`** — decides which of four places the orb belongs in
  (`hidden` above the demo section, `docked` in it, `pinned` bottom-right after
  it, `call` inside the overlay) and drives it there with a transform. Sections
  contribute an empty placeholder div — `TryIt`'s dock and `CallOverlay`'s spot —
  which is what the hook measures. Comments in the file record which transitions
  fade and which fly, and why.
- **`useOrbField.ts`** — the animated gradient. A deforming scalar field
  rendered to a 144×144 canvas and blurred by CSS, not a gradient whose position
  is animated. Every temporal frequency is a multiple of `TAU / 44s`, so the
  loop closes with no visible reset.

`useCallDemo.ts` holds the demo's state machine. Nothing about the demo is real:
no microphone is opened, no audio plays, nothing is sent. A chip or a typed
question only decides how long the agent stays in its "speaking" state.

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
