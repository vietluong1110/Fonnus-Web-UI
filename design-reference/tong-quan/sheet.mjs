import { readFileSync, writeFileSync } from 'node:fs'
const frames = [
  ['Main', 1440, 1500], ['VariantB', 1440, 1560], ['VariantC', 1440, 1580],
  ['PhoneA', 390, 2400], ['PhoneB', 390, 2160], ['PhoneC', 390, 2260], ['TabletA', 834, 1760],
]
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
let out = '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#ddd;font:12px system-ui}figure{margin:0;padding:8px}figcaption{padding:4px;font-weight:600}iframe{border:1px solid #999;background:#fff;display:block}#r{position:fixed;top:0;right:0;background:#fff;padding:8px;font:11px monospace;white-space:pre;z-index:9}</style><div id="r">measuring…</div>'
for (const [name, w, h] of frames) {
  const src = readFileSync(`_preview/${name}.html`, 'utf8')
  out += `<figure><figcaption>${name} — frame ${w}x${h}</figcaption><iframe id="f-${name}" width="${w}" height="${h}" srcdoc="${esc(src)}"></iframe></figure>`
}
out += `<script>
window.addEventListener('load', () => setTimeout(() => {
  const rows = ${JSON.stringify(frames)}.map(([n,w,h]) => {
    const d = document.getElementById('f-'+n).contentDocument
    d.getAnimations().forEach(a => a.finish())
    const sw = d.documentElement.scrollWidth, sh = d.documentElement.scrollHeight
    return n.padEnd(9) + ' w' + sw + '/' + w + (sw > w ? ' OVERFLOW' : ' ok') + '  h' + sh + '/' + h + (sh > h ? ' CLIPPED' : ' ok')
  })
  document.getElementById('r').textContent = rows.join('\n')
}, 900))
</script>`
writeFileSync('_preview/sheet.html', out)
console.log('sheet written')
