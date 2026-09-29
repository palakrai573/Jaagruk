import { test, expect } from '@playwright/test'

async function prepare(page) {
  await page.addInitScript(() => {
    window.testOffset = 0
    // Only explicit test advances consume decision time, not software-GPU latency.
    performance.now = () => window.testOffset
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => new Promise(() => {}),
    })
    window.testSpeech = []
    window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text }
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [{ lang: 'en-IN', name: 'Test voice', localService: true }],
        addEventListener() {},
        cancel: () => { window.testSpeech = [] },
        speak: utterance => { window.testSpeech.push(utterance); utterance.onstart?.() },
      },
    })
    window.finishSpeech = () => {
      let count = 0
      while (window.testSpeech.length && count++ < 100) window.testSpeech.shift().onend?.()
    }
    window.testVisibility = hidden => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
      document.dispatchEvent(new Event('visibilitychange'))
    }
  })
  await page.goto('/#/train/fire-explosion')
}

const choice = page => page.locator('[data-gesture-target="choice-0"]')
const fill = page => page.locator('.bar-fill--tick')
const ratio = page => fill(page).evaluate(element => Number(element.style.getPropertyValue('--fill')))
async function advance(page, milliseconds) {
  await page.evaluate(ms => { window.testOffset += ms }, milliseconds)
  // Let the real React refresh interval publish the monotonic clock snapshot.
  await page.waitForTimeout(150)
}

test('camera permission waits and mode changes do not consume decision time', async ({ page }) => {
  await prepare(page)
  await page.evaluate(() => window.finishSpeech())
  await advance(page, 60000)
  await expect(choice(page)).toHaveCount(0)
  expect(await ratio(page)).toBe(0.02)

  await page.getByRole('button', { name: 'This way out Use 3D view', exact: true }).click()
  await expect(choice(page)).toBeEnabled({ timeout: 30000 })
  expect(await ratio(page)).toBeLessThan(0.3)
  await advance(page, 1000)
  const before = await ratio(page)
  await page.getByRole('button', { name: /Use camera AR/ }).click()
  await expect(choice(page)).toHaveCount(0)
  const paused = await ratio(page)
  await advance(page, 60000)
  expect(await ratio(page)).toBe(paused)
  await page.getByRole('button', { name: 'This way out Use 3D view', exact: true }).click()
  await expect(choice(page)).toBeEnabled({ timeout: 30000 })
  expect(await ratio(page)).toBeGreaterThanOrEqual(before)
  expect(await ratio(page)).toBeLessThan(0.6)
})

test('narration completion, replay, backgrounding and next step preserve timing', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'This way out Use 3D view', exact: true }).click()
  await expect(choice(page)).toBeEnabled({ timeout: 30000 })
  await advance(page, 20000)
  expect(await ratio(page)).toBe(0.02)
  await page.evaluate(() => window.finishSpeech())
  await advance(page, 1000)
  const initial = await ratio(page)
  expect(initial).toBeGreaterThan(0.02)
  await page.getByRole('button', { name: /Read it aloud again/i }).click()
  await page.evaluate(() => window.finishSpeech())
  await advance(page, 1000)
  expect(await ratio(page)).toBeGreaterThan(initial)

  await page.evaluate(() => window.testVisibility(true))
  await expect(choice(page)).toHaveCount(0)
  const paused = await ratio(page)
  await advance(page, 60000)
  expect(await ratio(page)).toBe(paused)
  await page.evaluate(() => window.testVisibility(false))
  await expect(choice(page)).toBeEnabled()
  await choice(page).click()
  await page.locator('[data-gesture-target="continue"]').click()
  await expect(choice(page)).toBeEnabled()
  expect(await ratio(page)).toBe(0.02)
  await page.evaluate(() => window.finishSpeech())
  await advance(page, 500)
  expect(await ratio(page)).toBeLessThan(initial)
})

test('delayed coaching cannot replace feedback for a later decision', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jaagruk_api_key', 'browser-test-only')
    localStorage.setItem('jaagruk_provider', 'gemini')
    const fetch = window.fetch.bind(window)
    window.testCoaching = []
    window.fetch = (url, options) => String(url).startsWith('https://generativelanguage.googleapis.com/')
      ? new Promise(resolve => window.testCoaching.push(text => resolve(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text }] } }],
      }), { headers: { 'Content-Type': 'application/json' } }))))
      : fetch(url, options)
  })
  await prepare(page)
  await page.getByRole('button', { name: 'This way out Use 3D view', exact: true }).click()
  await expect(choice(page)).toBeEnabled({ timeout: 30000 })
  await choice(page).click()
  await expect.poll(() => page.evaluate(() => window.testCoaching.length)).toBe(1)
  await page.locator('[data-gesture-target="continue"]').click()
  await expect(choice(page)).toBeEnabled()
  await page.getByRole('button', { name: /Check the label for the correct class/ }).click()
  await expect.poll(() => page.evaluate(() => window.testCoaching.length)).toBe(2)
  await page.evaluate(() => window.testCoaching[1]('Current decision coaching'))
  await expect(page.getByText('Current decision coaching', { exact: true })).toBeVisible()
  await page.evaluate(() => window.testCoaching[0]('Stale first decision coaching'))
  await page.waitForTimeout(150)
  await expect(page.getByText('Stale first decision coaching', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Current decision coaching', { exact: true })).toBeVisible()
})
