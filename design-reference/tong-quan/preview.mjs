import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
mkdirSync('_preview', { recursive: true })
for (const f of readdirSync('.')) {
  if (!f.endsWith('.dc.html')) continue
  let s = readFileSync(f, 'utf8')
  s = s.replace('<script src="./support.js"></script>', '')
  s = s.replace(/<x-dc>/, '').replace(/<\/x-dc>/, '')
  s = s.replace(/<helmet>/, '').replace(/<\/helmet>/, '')
  s = s.replace(/<script data-dc-script[\s\S]*?<\/script>/, '')
  s = s.replace(/\{\{theme\}\}/g, 'app')
  writeFileSync(`_preview/${f.replace('.dc.html', '.html')}`, s)
}
console.log('ok')
