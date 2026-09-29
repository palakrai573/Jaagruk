import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)
const lock = JSON.parse(await readFile(new URL('scripts/vision-assets.lock.json', root), 'utf8'))
const worker = await readFile(new URL('dist/sw.js', root), 'utf8')
for (const [name, expected] of Object.entries(lock)) {
  const relative = `vision/0.10.18/${name}`
  const bytes = await readFile(new URL(`dist/${relative}`, root))
  if (createHash('sha256').update(bytes).digest('hex') !== expected.sha256) {
    throw new Error(`Built asset differs from lock: ${name}`)
  }
  if (!worker.includes(`url:"${relative}"`) && !worker.includes(`"url":"${relative}"`)) {
    throw new Error(`Not precached: ${name}`)
  }
}
console.log(`Offline build verified: ${Object.keys(lock).length} vision assets packaged and precached.`)
