import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openRearCamera, CAMERA_ERROR } from '../src/lib/siteMap.js'

test('explicit USB camera is requested exactly without silent fallback', async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const requests = []
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    mediaDevices: { getUserMedia: async constraints => {
      requests.push(constraints)
      throw Object.assign(new Error('unplugged'), { name: 'OverconstrainedError' })
    } },
  } })
  try {
    await assert.rejects(openRearCamera('usb-camera-123'), { message: CAMERA_ERROR.NOT_FOUND })
    assert.equal(requests.length, 1)
    assert.deepEqual(requests[0].video.deviceId, { exact: 'usb-camera-123' })
    assert.equal(requests[0].audio, false)
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else delete globalThis.window
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
    else delete globalThis.navigator
  }
})
