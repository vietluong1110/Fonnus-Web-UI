/*
 * Assembles the Tổng quan mock artboards.
 *
 * Each `_<Name>.html` body is wrapped in the Design Component shell with the
 * shared `_kit.css`, and every `@icon(name,size)` token is expanded into the
 * repo's own glyph — the primitives are copied verbatim from
 * `src/design-system/icons.ts` so a mock icon is the shipped icon, not a
 * redrawing of it.
 *
 *   node build.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

const HANDSET = { d: 'M6 7.5A13 13 0 0 0 16.5 18', w: 3 }
const RING = { c: [12, 12, 8.7] }
const SHOULDERS = { d: 'M5 19.4a7 7 0 0 1 14 0' }
const CALENDAR_FRAME = [
  { d: 'M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z' },
  { d: 'M4.5 9.2h15' },
  { d: 'M8.5 2.8v3M15.5 2.8v3' },
]

const ICONS = {
  answered: [HANDSET, { d: 'M13 9A4.5 4.5 0 0 1 22 9', accent: true }],
  incoming: [HANDSET, { d: 'M21 4.5 15 10.5', accent: true }, { d: 'M15.2 6.6V10.8H19.4', accent: true }],
  missed: [HANDSET, { d: 'M15.5 5 21 10.5M21 5 15.5 10.5', accent: true }],
  appointment: [...CALENDAR_FRAME, { d: 'M9 13.9l2.3 2.3 4.2-4.7', accent: true }],
  hours: [RING, { d: 'M12 7.2V12l3.6 2.2', accent: true }],
  'always-on': [
    { d: 'M12 3.3a8.7 8.7 0 1 1-6.15 2.55' },
    { d: 'M5.85 5.85A8.7 8.7 0 0 1 12 3.3', accent: true, w: 3.4 },
    { c: [12, 12, 2], fill: true },
  ],
  price: [
    { d: 'M5 7.8h14a1.6 1.6 0 0 1 1.6 1.6v5.2a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6V9.4A1.6 1.6 0 0 1 5 7.8z' },
    { c: [12, 12, 2.6], accent: true },
  ],
  handoff: [
    { c: [7, 7.6, 2.9] },
    { d: 'M2.6 17.6a4.4 4.4 0 0 1 8.8 0' },
    { d: 'M13.6 12.6h6.8M17.6 9.8l2.8 2.8-2.8 2.8', accent: true },
  ],
  caller: [{ c: [12, 8.4, 3.4], accent: true }, SHOULDERS],
  settings: [
    { d: 'M4 7.6h16M4 12h16M4 16.4h16' },
    { c: [9, 7.6, 2.2], fill: true },
    { c: [15, 12, 2.2], fill: true, accent: true },
    { c: [7, 16.4, 2.2], fill: true },
  ],
  location: [
    { d: 'M12 20.5c4.4-4.6 6.6-8 6.6-10.6a6.6 6.6 0 1 0-13.2 0c0 2.6 2.2 6 6.6 10.6z' },
    { c: [12, 9.9, 2.4], accent: true },
  ],
  'time-saved': [
    { d: 'M7 3.6h10M7 20.4h10' },
    { d: 'M8.4 3.6v3.2L12 11l3.6-4.2V3.6M8.4 20.4v-3.2L12 13l3.6 4.2v3.2' },
    { c: [12, 12, 1.7], fill: true, accent: true },
  ],
  privacy: [
    { d: 'M6.4 10.6h11.2a1.8 1.8 0 0 1 1.8 1.8v6a1.8 1.8 0 0 1-1.8 1.8H6.4a1.8 1.8 0 0 1-1.8-1.8v-6a1.8 1.8 0 0 1 1.8-1.8z' },
    { d: 'M8.6 10.6V8.2a3.4 3.4 0 0 1 6.8 0v2.4', accent: true },
    { c: [12, 15.4, 1.7], fill: true },
  ],
  report: [{ d: 'M5.5 19V13.4M18.5 19V10.4', w: 2.6 }, { d: 'M12 19V6.6', accent: true, w: 2.6 }],
  'after-hours': [
    { d: 'M19.4 15.2A8.4 8.4 0 0 1 8.8 4.6a8.4 8.4 0 1 0 10.6 10.6z' },
    { c: [16.8, 6.6, 1.7], fill: true, accent: true },
  ],
  done: [RING, { d: 'M8.2 12.2l2.6 2.6 5-5.6', accent: true }],
  check: [{ d: 'M4.5 12.6l4.6 4.6L19.5 6.6', w: 2.2 }],
  'chevron-right': [{ d: 'M9.8 6.5l5.5 5.5-5.5 5.5', w: 2.2 }],
  'chevron-down': [{ d: 'M6.5 9.8l5.5 5.5 5.5-5.5', w: 2.2 }],
  plus: [{ d: 'M12 5.2v13.6M5.2 12h13.6', w: 2.2 }],
  'arrow-right': [{ d: 'M4.4 12h14.4M13.4 6.6 19 12l-5.6 5.4', w: 2.2 }],
  'arrow-up': [{ d: 'M12 19.6V5.2M6.6 10.6 12 5l5.4 5.6', w: 2.2 }],
  dot: [{ c: [12, 12, 2.6], fill: true, accent: true }],
  menu: [{ d: 'M4 7.2h16M4 12h16M4 16.8h16', w: 2.2 }],
  overview: [
    { r: [4.2, 4.2, 6.8, 6.8, 2] },
    { r: [13, 4.2, 6.8, 6.8, 2], accent: true },
    { r: [4.2, 13, 6.8, 6.8, 2] },
    { r: [13, 13, 6.8, 6.8, 2] },
  ],
  calendar: [...CALENDAR_FRAME, { c: [9.2, 14.2, 1.4], fill: true, accent: true }, { c: [14.8, 14.2, 1.4], fill: true }],
  guide: [
    { d: 'M12 6.8A5 5 0 0 0 4.5 5.2v13a5 5 0 0 1 7.5 1.6' },
    { d: 'M12 6.8A5 5 0 0 1 19.5 5.2v13a5 5 0 0 0-7.5 1.6' },
    { d: 'M12 6.8v13', accent: true },
  ],
  list: [
    { d: 'M9.6 7.2h10M9.6 12h10M9.6 16.8h10' },
    { d: 'M3.6 7.4l1.4 1.4 2.6-2.8', accent: true },
    { c: [5.2, 12, 1.4], fill: true },
    { c: [5.2, 16.8, 1.4], fill: true },
  ],
  mail: [
    { d: 'M5 6.5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2z' },
    { d: 'M3.6 8.6l6.6 5a3 3 0 0 0 3.6 0l6.6-5', accent: true },
  ],
  volume: [
    { c: [7, 12, 2.2], fill: true },
    { d: 'M12 8.2a5.4 5.4 0 0 1 0 7.6', accent: true },
    { d: 'M15.4 5.4a9.4 9.4 0 0 1 0 13.2' },
  ],
  'caller-lost': [
    { c: [7, 7.6, 2.9] },
    { d: 'M2.6 17.6a4.4 4.4 0 0 1 8.8 0' },
    { d: 'M15.4 10.4l4.8 4.8M20.2 10.4l-4.8 4.8', accent: true },
  ],
  practitioner: [{ c: [12, 8.4, 3.4] }, SHOULDERS, { c: [17.2, 14.6, 1.8], fill: true, accent: true }],
  alert: [RING, { d: 'M12 7.4v5.2', accent: true }, { c: [12, 16.2, 1.4], fill: true }],
  help: [RING, { d: 'M9.4 9.6a2.6 2.6 0 1 1 3.9 2.3c-.8.5-1.3 1-1.3 1.9v.4', accent: true }, { c: [12, 16.8, 1.3], fill: true }],
  insurance: [{ r: [3, 6, 18, 12, 2.5] }, { d: 'M6.6 12h3.6M8.4 10.2v3.6', accent: true }, { d: 'M13.4 10.6h4.6M13.4 13.8h3' }],
}

/** src/design-system/Icon.tsx — stroke compensates for size, shape never changes. */
function baseStroke(size) {
  if (size <= 16) return 2.2
  if (size >= 32) return 1.8
  return 2
}

function icon(name, size) {
  const prims = ICONS[name]
  if (!prims) throw new Error(`unknown icon: ${name}`)
  const base = baseStroke(size)
  const scale = base / 2
  const small = size <= 16
  const accent = 'var(--terracotta)'
  const body = prims
    .map((p) => {
      const paint = p.accent ? accent : 'currentColor'
      const w = p.w != null ? ` stroke-width="${(p.w * scale).toFixed(2)}"` : ''
      if (p.d) return `<path d="${p.d}" stroke="${paint}"${w}/>`
      if (p.c) {
        const [cx, cy, r] = p.c
        if (p.fill) return `<circle cx="${cx}" cy="${cy}" r="${small ? r + 0.2 : r}" fill="${paint}" stroke="none"/>`
        return `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${paint}"${w}/>`
      }
      const [x, y, rw, rh, rx] = p.r
      return `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" rx="${rx}" stroke="${paint}"${w}/>`
    })
    .join('')
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${base}" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;flex:0 0 auto">${body}</svg>`
}

const kit = readFileSync(join(here, '_kit.css'), 'utf8')

/*
 * One tweak per artboard, and it is a behavioural switch rather than copy:
 * Giao diện tối. Every colour is a custom property, so one class on the root
 * repaints the whole page — which is exactly what the shipped app does.
 */
const LOGIC = `<script data-dc-script data-props='{"dark":{"editor":"boolean","default":false,"section":"Giao diện"}}'>
class Component extends DCLogic {
  renderVals() {
    return { theme: this.props.dark ? 'app dark' : 'app' }
  }
}
</script>`

for (const file of readdirSync(here)) {
  if (!file.startsWith('_') || !file.endsWith('.html')) continue
  const name = file.slice(1, -5)
  const raw = readFileSync(join(here, file), 'utf8')
  const body = raw.replace(/@icon\(([a-z-]+),\s*(\d+)\)/g, (_, n, s) => icon(n, Number(s)))
  const out = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
${kit}
  </style>
</helmet>
${body}
</x-dc>
${LOGIC}
</body>
</html>
`
  writeFileSync(join(here, `${name}.dc.html`), out)
  console.log(`built ${name}.dc.html`)
}
