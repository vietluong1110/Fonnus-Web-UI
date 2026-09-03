# Working in this repo

Conventions that are **decisions, not accidents**. Each one looks like something worth
"fixing" until you know why it is there. Read this before the first edit.

`README.md` explains how the app is built. `docs/` explains how it will meet the backend.
This file only lists the things an outsider gets wrong.

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

## Things that are load-bearing and look like they are not

- `src/App.module.css` uses `overflow-x: clip`, **not** `hidden`. `hidden` makes an ancestor
  the scroll container and silently kills `position: sticky` in `HowItWorks`.
- The runway under the last sticky card is a real element, not padding. Sticky items are
  bounded by their parent's *content* box, which padding does not extend.
- The orb is mounted once at the app root and never re-mounted. It is deliberately outside
  every section.
- `design-reference/` is an archive. Nothing imports it and nothing builds it.

## Before you finish

- `npm run typecheck` clean.
- The demo login still works: phone `0914378064`, code `111002`. This is the acceptance test
  for anything touching auth, routing or the config store.
- If you changed a field in `model.ts`, update `docs/field-catalogue-mapping.md` in the same
  commit.
