import { test, expect } from '@playwright/test'

async function setupCamera(page, delayed = false) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(({ delayed }) => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined })
    window.DeviceOrientationEvent = class extends Event {
      static async requestPermission() { return 'granted' }
    }
    window.cameraRequests = []
    window.cameraStreams = []
    window.cameraFrames = true
    window.delayedCamera = null
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
      value: async () => ['camera-a', 'camera-b'].map(deviceId => ({
        deviceId, kind: 'videoinput', label: deviceId,
      })),
    })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: constraints => {
        const deviceId = constraints.video.deviceId?.exact || 'camera-a'
        window.cameraRequests.push(deviceId)
        const canvas = document.createElement('canvas')
        canvas.width = 320; canvas.height = 480
        const context = canvas.getContext('2d')
        const stream = canvas.captureStream(0)
        const track = stream.getVideoTracks()[0]
        track.getSettings = () => ({ deviceId, width: 320, height: 480 })
        let frame = 0
        const timer = setInterval(() => {
          if (track.readyState === 'ended') { clearInterval(timer); return }
          if (!window.cameraFrames) return
          context.fillStyle = ++frame % 2 ? '#14b8a6' : '#e11d48'
          context.fillRect(0, 0, 320, 480)
          track.requestFrame()
        }, 50)
        window.cameraStreams.push(stream)
        return delayed ? new Promise(resolve => { window.delayedCamera = () => resolve(stream) }) : Promise.resolve(stream)
      },
    })
    setInterval(() => {
      for (const type of ['deviceorientation', 'deviceorientationabsolute']) {
        const event = new Event(type)
        Object.assign(event, { alpha: 0, beta: 90, gamma: 0, absolute: true })
        window.dispatchEvent(event)
      }
    }, 100)
  }, { delayed })
  await page.goto('/#/train/fire-explosion')
}

const answer = page => page.locator('[data-gesture-target="choice-0"]')

test('live camera stalls pause choices, recover, and release replaced streams', async ({ page }) => {
  await setupCamera(page)
  await page.getByRole('button', { name: 'Allow motion access' }).click()
  await expect(answer(page)).toBeEnabled({ timeout: 30000 })
  await expect(page.locator('video')).toBeVisible()
  await page.evaluate(() => { window.cameraFrames = false })
  await expect(answer(page)).toHaveCount(0)
  await expect(page.getByText('Camera feed interrupted. Assessment paused.', { exact: true })).toBeVisible()
  await expect(page.getByText('Timer paused', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/camera-interrupted-390.png', fullPage: true })
  await page.evaluate(() => { window.cameraFrames = true })
  await expect(answer(page)).toBeEnabled()
  await page.evaluate(() => { window.cameraFrames = false })
  await expect(page.getByRole('button', { name: 'Retry camera', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retry camera', exact: true }).click()
  await page.evaluate(() => { window.cameraFrames = true })
  await expect.poll(() => page.evaluate(() => window.cameraRequests.length)).toBe(2)
  await expect(answer(page)).toBeEnabled()
  await page.getByRole('combobox', { name: 'Use camera AR' }).selectOption('camera-b')
  await expect.poll(() => page.evaluate(() => window.cameraRequests.at(-1))).toBe('camera-b')
  await expect.poll(() => page.evaluate(() => window.cameraStreams[0].getVideoTracks()[0].readyState)).toBe('ended')
  await expect(answer(page)).toBeEnabled()
  await page.getByRole('button', { name: 'This way out Use 3D view', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.cameraStreams.every(stream =>
    stream.getVideoTracks().every(track => track.readyState === 'ended')))).toBe(true)
  await expect(answer(page)).toBeEnabled()
})

test('camera permission resolving after leaving AR cannot revive its stream', async ({ page }) => {
  await setupCamera(page, true)
  await expect.poll(() => page.evaluate(() => window.cameraRequests.length)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'This way out Use 3D view', exact: true }).click()
  await page.evaluate(() => window.delayedCamera())
  await expect.poll(() => page.evaluate(() => window.cameraStreams.every(stream =>
    stream.getVideoTracks().every(track => track.readyState === 'ended')))).toBe(true)
  await expect(page.locator('video')).toHaveCount(0)
  await expect(answer(page)).toBeEnabled({ timeout: 30000 })
})
