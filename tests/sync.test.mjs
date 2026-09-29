import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { enqueue, clearQueue, listQueue, pushToEndpoint, setSyncEndpoint, registerAutoSync, SYNC_STATUS } from '../src/lib/sync.js'
import { idbPut, STORE } from '../src/lib/idb.js'
import { acceptedSyncHashes } from '../src/lib/syncReceipt.js'

const originalFetch = globalThis.fetch
beforeEach(async () => { await clearQueue(); setSyncEndpoint('https://sync.example.test/upload') })
afterEach(() => { globalThis.fetch = originalFetch })
const add = id => enqueue('attempt', id, { id, score: 80 })
const receipt = rows => ({ format: 'jaagruk-sync-receipt', version: 1,
  results: rows.map(row => ({ hash: row.contentHash, kind: row.kind, refId: row.refId, status: 'accepted' })) })

test('HTTP success without a matching receipt retains every record', async () => {
  await add('a')
  globalThis.fetch = async () => new Response('<html>login</html>', { status: 200 })
  const result = await pushToEndpoint()
  assert.equal(result.sent, 0)
  assert.equal(result.remaining, 1)
  assert.equal((await listQueue())[0].lastError, 'NOT_ACKNOWLEDGED')
})

test('partial receipt only removes exact accepted records', async () => {
  const a = await add('a'); await add('b')
  globalThis.fetch = async () => Response.json(receipt([a]))
  const result = await pushToEndpoint()
  assert.equal(result.status, SYNC_STATUS.PARTIAL)
  assert.equal(result.sent, 1)
  assert.deepEqual((await listQueue()).map(row => row.refId), ['b'])
})

test('temporary failures remain retryable after six attempts', async () => {
  const row = await add('a')
  await idbPut(STORE.SYNC_QUEUE, { ...row, attempts: 9, permanent: false })
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json(receipt([row])) }
  assert.equal((await pushToEndpoint()).sent, 1)
  assert.equal(calls, 1)
})

test('backoff retains accurate remaining status instead of claiming done', async () => {
  const row = await add('a')
  await idbPut(STORE.SYNC_QUEUE, { ...row, nextAttemptAt: Date.now() + 60000 })
  globalThis.fetch = async () => { throw new Error('must not request during backoff') }
  const result = await pushToEndpoint()
  assert.equal(result.remaining, 1)
  assert.equal(result.status, SYNC_STATUS.PARTIAL)
})

test('concurrent sync triggers share one upload', async () => {
  const row = await add('a')
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json(receipt([row])) }
  const first = pushToEndpoint(); const second = pushToEndpoint()
  assert.equal(first, second)
  await first
  assert.equal(calls, 1)
})

test('auth and rate-limit responses do not permanently strand records', async () => {
  for (const status of [401, 403, 408, 429, 503]) {
    await clearQueue(); await add(`a-${status}`)
    globalThis.fetch = async () => new Response('', { status })
    await pushToEndpoint()
    const [row] = await listQueue()
    assert.equal(row.permanent, false)
    assert.ok(row.nextAttemptAt > row.lastAttemptAt)
  }
})

test('mismatched identity, rejected, quarantined and conflicting receipts cannot acknowledge', async () => {
  const row = await add('a')
  const valid = receipt([row])
  for (const change of [{ refId: 'another' }, { kind: 'cert' }, { hash: 'wrong' }, { status: 'quarantined' }, { status: 'rejected' }]) {
    assert.equal(acceptedSyncHashes({ ...valid, results: [{ ...valid.results[0], ...change }] }, [row]).size, 0)
  }
  assert.equal(acceptedSyncHashes({ ...valid, results: [valid.results[0], valid.results[0]] }, [row]).size, 0)
})

test('endpoint rejects non-HTTP localhost schemes and embedded credentials', () => {
  assert.equal(setSyncEndpoint('ftp://localhost/upload').ok, false)
  assert.equal(setSyncEndpoint('https://user:password@example.test/upload').ok, false)
  assert.equal(setSyncEndpoint('http://localhost:8000/upload').ok, true)
})

test('supervisor retry can recover exhausted permanent failures', async () => {
  const row = await add('a')
  await idbPut(STORE.SYNC_QUEUE, { ...row, attempts: 6, permanent: true, nextAttemptAt: Date.now() + 60000 })
  globalThis.fetch = async () => Response.json(receipt([row]))
  assert.equal((await pushToEndpoint()).remaining, 1)
  assert.equal((await pushToEndpoint({ retryFailed: true })).sent, 1)
})

test('automatic retries run after backoff and cleanup cancels pending work', async t => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: new EventTarget() })
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() })
  let unsubscribe
  try {
    const row = await add('a')
    let calls = 0
    globalThis.fetch = async () => { calls++; return calls === 1 ? new Response('', { status: 503 }) : Response.json(receipt([row])) }
    unsubscribe = registerAutoSync()
    t.mock.timers.tick(3000)
    await new Promise(setImmediate)
    assert.equal(calls, 1)
    t.mock.timers.tick(1000)
    await new Promise(setImmediate)
    assert.equal(calls, 2)
    assert.equal((await listQueue()).length, 0)
    unsubscribe()
    unsubscribe = registerAutoSync()
    unsubscribe()
    t.mock.timers.tick(3000)
    await new Promise(setImmediate)
    assert.equal(calls, 2)
  } finally {
    unsubscribe?.()
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor)
    else delete globalThis.window
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor)
    else delete globalThis.document
  }
})
