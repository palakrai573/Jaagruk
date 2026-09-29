import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monitorVideoReadiness } from '../src/lib/videoReadiness.js'

function setup(frameCallbacks = false) {
  let time = 0, tick, frame, hidden = false
  const changes = []
  const track = { readyState: 'live', muted: false, enabled: true }
  const video = { currentTime: 0, paused: false, readyState: 2, videoWidth: 640,
    srcObject: { getVideoTracks: () => [track] } }
  if (frameCallbacks) {
    video.requestVideoFrameCallback = callback => { frame = callback; return 1 }
    video.cancelVideoFrameCallback = () => { frame = null }
  }
  const stop = monitorVideoReadiness(video, value => changes.push(value), {
    now: () => time, hidden: () => hidden,
    schedule: callback => { tick = callback; return 1 }, cancel: () => {},
  })
  return { video, track, changes, stop,
    tick: (ms = 200) => { time += ms; tick() },
    frame: () => frame?.(), hide: value => { hidden = value } }
}

test('metadata alone is not a usable frame; fallback detects progress and stall', () => {
  const s = setup()
  s.tick()
  assert.deepEqual(s.changes, [])
  s.video.currentTime = 0.1
  s.tick()
  assert.deepEqual(s.changes, [true])
  s.tick(1600)
  assert.deepEqual(s.changes, [true, false])
  s.video.currentTime = 0.2
  s.tick()
  assert.deepEqual(s.changes, [true, false, true])
  s.stop()
})

test('frame callback readiness rejects muted, hidden, paused and ended streams', () => {
  const s = setup(true)
  s.frame(); s.tick()
  assert.equal(s.changes.at(-1), true)
  for (const [disable, enable] of [
    [() => { s.track.muted = true }, () => { s.track.muted = false }],
    [() => s.hide(true), () => s.hide(false)],
    [() => { s.video.paused = true }, () => { s.video.paused = false }],
    [() => { s.track.readyState = 'ended' }, () => { s.track.readyState = 'live' }],
  ]) {
    disable(); s.frame(); s.tick()
    assert.equal(s.changes.at(-1), false)
    enable(); s.frame(); s.tick()
    assert.equal(s.changes.at(-1), true)
  }
  s.stop()
  assert.equal(s.changes.at(-1), false)
  s.frame(); s.tick()
  assert.equal(s.changes.at(-1), false)
})
