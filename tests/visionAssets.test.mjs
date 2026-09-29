import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HAND_MODEL_URL, OBJECT_MODEL_URL, VISION_WASM_ROOT } from '../src/lib/visionAssets.js'

test('vision URLs remain local at root, deployment sub-path and Capacitor origin', () => {
  for (const base of ['https://example.test/', 'https://example.test/jaagruk/', 'https://localhost/']) {
    for (const asset of [HAND_MODEL_URL, OBJECT_MODEL_URL, VISION_WASM_ROOT]) {
      const resolved = new URL(asset, base)
      assert.equal(resolved.origin, new URL(base).origin)
      assert.ok(resolved.href.startsWith(`${base}vision/0.10.18`))
    }
  }
})
