# Design reference — archive

**This is not built code. Nothing here is imported, compiled, or deployed.**
It is the original Claude Design handoff bundle, kept as a visual reference.

The landing page it describes has already been implemented in React, along with
the auth flows and the signed-in app shell that came later. If you are looking
for the app, it is not here — see the repository root.

## What's in here

| Path                     | What it is                                                     |
| ------------------------ | -------------------------------------------------------------- |
| `Fonnus Landing.dc.html` | The original prototype, one ~1,100-line design-canvas document  |
| `support.js`             | The design-canvas runtime the prototype needs (`x-dc`, `sc-if`) |
| `_ds/`                   | The full design system: 18 primitives, tokens, guidelines       |
| `assets/SVG/`            | Logo marks the prototype links to                               |

`Fonnus Landing.dc.html` opens directly in a browser and renders standalone —
`_ds/` and `assets/` are the files it links, which is why they are still here
even though the implementation carries its own copies.

Only the **landing page** prototype is in this bundle. The auth screens and the
app shell were built from separate design bundles (`Fonnus App Hi-fi.dc.html`
and the context field catalogue) that were never committed here, so this archive
will not answer questions about those.

## When to open it

Rarely. The implementation is the source of truth for anything already built,
and its README documents every decision that survived. Come here for:

- **Porting another design-system primitive.** `_ds/…/_ds_bundle.js` holds all
  18; the app ships the handful it uses. Port from the bundle rather than
  writing new ones.
- **Checking a detail of a landing-page section**, or settling what the
  prototype actually did when the implementation is ambiguous.

Note that the tokens under `_ds/…/tokens/` are byte-identical to the app's
`src/styles/tokens/`. If you change a token, change it in the app — this copy
exists only so the prototype still renders, and it is not wired to anything.
