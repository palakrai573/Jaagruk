import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public/vision/0.10.18')
const lockPath = path.join(root, 'scripts/vision-assets.lock.json')
const record = process.argv.includes('--record-hashes')
const check = process.argv.includes('--check')
const modelSources = {
  'hand_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'efficientdet_lite0.tflite': 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite',
}
const wasmFiles = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const lock = record ? {} : JSON.parse(await readFile(lockPath, 'utf8'))
await mkdir(output, { recursive: true })

for (const name of [...wasmFiles, ...Object.keys(modelSources)]) {
  const target = path.join(output, name)
  let bytes = await readFile(target).catch(() => null)
  if (!check && wasmFiles.includes(name)) {
    await copyFile(path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm', name), target)
    bytes = await readFile(target)
  } else if (!bytes && !check) {
    console.log(`Downloading ${name}`)
    const response = await fetch(modelSources[name], { signal: AbortSignal.timeout(120000) })
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
    bytes = Buffer.from(await response.arrayBuffer())
    if (!record && hash(bytes) !== lock[name]?.sha256) throw new Error(`${name}: checksum mismatch`)
    await writeFile(target, bytes)
  }
  if (!bytes?.length) throw new Error(`${name}: missing; run npm run assets:prepare`)
  const sha256 = hash(bytes)
  if (record) lock[name] = { sha256, bytes: bytes.length, source: modelSources[name] || `@mediapipe/tasks-vision@0.10.18/wasm/${name}` }
  else if (sha256 !== lock[name]?.sha256 || bytes.length !== lock[name]?.bytes) {
    throw new Error(`${name}: asset integrity check failed`)
  }
  console.log(`Verified ${name} (${bytes.length} bytes)`)
}
if (record) await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n')
if (!check) await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ version: '0.10.18', files: lock }, null, 2) + '\n')
