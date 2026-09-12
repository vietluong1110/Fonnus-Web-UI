# Tổng quan — the three directions

The design exploration that settled what `#/app` looks like, September 2026. Three
directions were drawn at desktop, tablet and phone widths; **B was chosen**, and is now
built for real in `src/app/pages/overview/`.

**The code is the source of truth.** These artboards are the record of what was
considered, not a spec to edit. Changing a mock here changes nothing in the product, and
the two have already diverged in one deliberate way: the shipped charts use one terracotta
hue in five steps (`--chart-step-1…5`), because `--chart-1/2/3` do not separate for a
colour-blind reader. See `docs/visual-language.md` § Charts.

| Direction | What led the page | Why not |
|---|---|---|
| **A** — Hôm nay, rồi cả tuần | one big figure, four small cards beside it | the four charts fell below the fold |
| **B** — Bảng số ✅ | four equal figures with trends, then the plots | chosen: fastest to scan, most information per screen |
| **C** — Một ngày của Linh | the day drawn once, one dot per call | hard to compare day with day; a new shape the whole product would have to learn |

## Working on it

```bash
node build.mjs     # _<Name>.html + _kit.css  →  <Name>.dc.html
node preview.mjs   # strips the DC runtime so a browser can open the artboards
node sheet.mjs     # _preview/sheet.html — every artboard in a correctly sized iframe
```

`build.mjs` expands `@icon(name,size)` using the primitives copied verbatim from
`src/design-system/icons.ts`, so a mock icon is the shipped icon rather than a redrawing.

`canvas.json` lays the artboards out; the canvas itself is seeded with the `design` skill's
`seed-canvas.mjs` and published as an Artifact. Neither the generated `*.dc.html` nor the
seeded page is committed — see `.gitignore`.
