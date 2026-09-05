# Working in this repo

Conventions that are **decisions, not accidents**. Each one looks like something worth
"fixing" until you know why it is there. Read this before the first edit.

`README.md` explains how the app is built. `docs/` explains how it will meet the backend.
`design-reference/ui-ux-principles.md` is the standing UI/UX rulebook for every `#/app`
screen — **read it before redesigning one, and add to it after**. This file only lists
the things an outsider gets wrong.

---

## Do not add dependencies

Runtime dependencies are `react` and `react-dom`. That is the entire list, and it is
deliberate — this is a static site that has to drop on any host, and every dependency is
something a two-person team maintains forever.

**Never `npm install` without asking first.** If a problem seems to need a library, say so and
name the trade-off; do not just add it. The router, the state layer, the HTTP client and the
mocking layer are all hand-written for this reason, and each is under 200 lines.

## Routing is hash-based on purpose

`#/dang-ky`, `#/app/le-tan/...`. Not React Router, not the History API.

The build ships with `base: './'` and the README promises `dist/` drops on any host —
history routes would need an SPA fallback rule configured on every one of them. Only hashes
starting with `#/` are routes, so the landing page's section anchors (`#bang-gia`, `#lien-he`)
still work. See `src/hooks/useRoute.ts`.

Do not suggest a router library.

## `model.ts` is snake_case on purpose

`src/app/letan/model.ts` names ~60 fields as `business_name`, `pricing_disclosure_policy`,
`endpointing_silence_ms`. This mirrors the backend's context field catalogue **1:1**, so a
section save maps straight onto the tenant record with no translation layer.

Do not "fix" it to camelCase. Do not add a field the catalogue does not define without
marking it `[ext]` and adding a row to `docs/field-catalogue-mapping.md`.

## All user-facing copy is Vietnamese

Every string a clinic owner reads. No English leaks onto the screen — including error
messages, empty states, and anything a server sends back. **The frontend owns all Vietnamese
copy**; a server-authored sentence will not match the voice of the surrounding screen, so the
API returns machine codes and this app maps them.

Code, comments and documentation are in English.

## Network access goes through `src/api/`

No component calls `fetch`. Shared state reaches the API through one of three providers —
`SessionProvider`, `ConfigProvider`, `SetupChatProvider`.

The one exception: a **one-shot form submission** with no shared result may call
`api.*` directly with local `busy` / `error` state. The test is *does more than one component
need to see the result?* If no, call it directly; wrapping a fire-and-forget POST in a context
is ceremony.

Mock and live implementations are typed against the same interface, so `npm run typecheck` is
what catches contract drift. See `docs/backend-integration.md`.

## `npm run typecheck` is the only gate

There is no ESLint, no Prettier, no test runner. That is a decision for a repo this size, not
an oversight — do not add them without asking.

(`src/app/letan/store.tsx` carries one `eslint-disable` comment, left from the design bundle.
It is inert.)

```bash
npm run typecheck
```

## Styling

- One co-located `*.module.css` per component. No Tailwind, no CSS-in-JS.
- Colours, spacing, radii, type and easing come from the tokens in `src/styles/tokens/`.
  **No hard-coded hex values** outside the orb's gradient ramp, which is one continuous
  artwork rather than a set of token stops.
- One shape rule so radii stop disagreeing: **controls are pills, containers are rounded
  rectangles.**
- **Dates and times are drawn too**, for the same reason selects are: the
  native pickers are system-blue and English on a Vietnamese page. Use
  `DateField` / `DateRangeField` / `TimeField` from `src/app/ui` — never
  `<input type="date">` or `type="time"`. They store ISO dates and 24-hour
  `HH:MM` and only change the reading. A new anchored panel should use
  `useAnchoredPopup` / `AnchoredPopup` from `ui/Pickers.tsx` rather than
  writing the listeners again: pop-ups nest, and both the outside-press rule
  and the "scroll by `scrollTop`, never `scrollIntoView`" rule live there.
  One pair of native `type="time"` inputs is left, in `skills/BookingSkill.tsx`
  — they sit *inside* a bordered pill, so they need that row reworked rather
  than a drop-in swap. Convert them when that page is next touched.
- The shape of a list is fixed: one `Card` per list, its `AddButton` in the head's
  `actions` slot, repeated records as `entries`/`entry` blocks inside it, an `EmptyState`
  when it is empty, and `Suggestions` inside the same card when there are ready-made
  lines to adopt. Dashed means *content* — an empty state or a suggestion — never a
  button that makes a row. Reasons and the checks: `design-reference/ui-ux-principles.md`.
- **Icons are drawn, not installed.** Every icon, shape and pattern is an arc-and-dot
  drawing in `src/design-system/icons.ts` / `Shape.tsx` / `Pattern.tsx` with exactly one
  terracotta accent (`--icon-accent`). No Lucide, no stock set, no emoji glyphs (✓ ▾ →) in
  markup — draw the missing icon in the same grammar and mark it `[ext]`. A night surface
  sets `--icon-accent: var(--terracotta-night)`; a terracotta surface sets it to
  `currentColor`. Rules and catalogue: `docs/visual-language.md`.

## Things that are load-bearing and look like they are not

- `src/App.module.css` uses `overflow-x: clip`, **not** `hidden`. `hidden` makes an ancestor
  the scroll container and silently kills `position: sticky` in `HowItWorks`.
- The runway under the last sticky card is a real element, not padding. Sticky items are
  bounded by their parent's *content* box, which padding does not extend.
- The orb is mounted once at the app root and never re-mounted. It is deliberately outside
  every section.
- A two-column grid that collapses to `flex-direction: column` **must** restate
  `align-items: stretch`. `align-items: start` is a grid instruction; left in place
  on a flex column it sizes every child to its own *max-content*. On `Hồ sơ` that
  quietly shortened the hub cards on a tablet and blew the page 620px wide inside a
  375px phone. Both stacked layouts in `LeTanPage.module.css` / `Profile.module.css`
  carry the reset — copy it with the pattern.
- The bottom edge of a section page is one sticky stack, anchored by the save bar
  (`.saveStack` in `Bits.module.css`). On a phone it clears the tab bar by reading
  `--tabbar-h` (published by `AppShell.module.css`). Anything else that wants that
  edge while there are unsaved changes — the assistant's button — is handed to the
  bar through `BottomStackProvider` and rides above it. On a wide page the assistant
  window stands at the foot of the rail column instead, sticky at the same 16px as
  the bar, so the two share a bottom edge. Never pin something to the bottom with a
  hard-coded offset, and never measure the bar — its height changes as the message
  wraps.
- `html { scrollbar-gutter: stable }` in `global.css`. A hub page fits the viewport
  and a section page does not, so without it the scrollbar appears on one and not the
  other and the centred content column shifts 7–8px between them. It looked like the
  two pages had different margins; they had different scrollbars.
- The rail beside a form is separated by the **gutter**, not by a fill: 380px column,
  40px gap, a hairline down the middle of it (`.withRail` in `LeTanPage.module.css`,
  `.work` in `Profile.module.css` — restated in both, change them together). A milk
  panel beside milk cards is correct; the rule is what does the work.
- Blush (`--surface-warm`) means **speech**: the Fonnus assistant panel, and the
  receptionist's own line inside a call preview. Never a callout or a badge inside a
  form — that is what drained the tint of meaning last time.
- `design-reference/` is an archive. Nothing imports it and nothing builds it — with one
  exception: `ui-ux-principles.md`, which is a living document and is meant to be edited.

## Before you finish

- `npm run typecheck` clean.
- The demo login still works: phone `0914378064`, code `111002`. This is the acceptance test
  for anything touching auth, routing or the config store.
- If you changed a field in `model.ts`, update `docs/field-catalogue-mapping.md` in the same
  commit.
