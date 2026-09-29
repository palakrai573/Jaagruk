import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDecisionClock } from '../src/lib/decisionClock.js'

function fixture() {
  let time = 0
  return { clock: createDecisionClock(() => time), advance: (ms) => { time += ms } }
}

test('camera setup after narration is not charged to the worker', () => {
  const { clock, advance } = fixture()
  advance(5000)
  clock.narrationEnded()
  advance(30000)
  assert.equal(clock.snapshot().elapsedMs, 0)
  clock.setReady(true)
  advance(1200)
  assert.equal(clock.snapshot().elapsedMs, 1200)
})

test('a reader can answer before narration; a listener is not charged narration', () => {
  const { clock, advance } = fixture()
  clock.setReady(true)
  advance(1500)
  assert.equal(clock.snapshot().elapsedMs, 1500)
  clock.narrationEnded()
  advance(700)
  assert.equal(clock.snapshot().elapsedMs, 700)
})

test('tracking, visibility and mode interruptions preserve only active elapsed time', () => {
  const { clock, advance } = fixture()
  clock.narrationEnded()
  clock.setReady(true)
  advance(800)
  clock.setReady(false)
  advance(60000)
  assert.equal(clock.snapshot().elapsedMs, 800)
  clock.setReady(true)
  advance(400)
  assert.equal(clock.snapshot().elapsedMs, 1200)
})

test('a new step discards the previous timer and waits for readiness', () => {
  const { clock, advance } = fixture()
  clock.setReady(true)
  clock.narrationEnded()
  advance(2000)
  clock.reset()
  advance(9000)
  assert.deepEqual(clock.snapshot(), { ready: false, narrated: false, elapsedMs: 0 })
})

test('repeated readiness and narration events do not reset elapsed time', () => {
  const { clock, advance } = fixture()
  clock.narrationEnded()
  clock.setReady(true)
  advance(600)
  clock.setReady(true)
  clock.narrationEnded()
  advance(400)
  assert.equal(clock.snapshot().elapsedMs, 1000)
})
