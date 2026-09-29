import { test, expect } from '@playwright/test'
import { readdir } from 'node:fs/promises'

test('worker home fits desktop and narrow screens in all required languages', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Jaagruk', exact: true })).toBeVisible()
  await expect(page.locator('main section a[href^="#/train/"]')).toHaveCount(9)
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const language of ['en', 'hi', 'sat']) {
      await page.getByLabel('Select language').selectOption(language)
      await expect(page.getByLabel('Select language')).toHaveValue(language)
      const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')]
        .filter(element => element.getBoundingClientRect().right > window.innerWidth + 1)
        .map(element => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0, 60) })))
      expect(overflow, `${width}px / ${language}`).toEqual([])
      const clipped = await page.locator('.worker-home h3').evaluateAll(elements =>
        elements.some(element => element.scrollWidth > element.clientWidth + 1))
      expect(clipped).toBe(false)
    }
    await page.getByLabel('Select language').selectOption('en')
    await page.screenshot({ path: `test-results/worker-home-${width}.png`, fullPage: true })
  }
  expect(errors).toEqual([])
})

test('Santali also loads the self-hosted Hindi fallback fonts', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Select language').selectOption('sat')
  await expect.poll(() => page.evaluate(() => [...document.fonts].some(font =>
    font.family === 'Noto Sans Devanagari'))).toBe(true)
  const fallback = await page.evaluate(async () => {
    const fonts = await document.fonts.load('16px "Noto Sans Devanagari"', '\u0915\u0948\u092e\u0930\u093e')
    return {
      loaded: fonts.length > 0 && fonts.every(font => font.status === 'loaded'),
      stack: getComputedStyle(document.body).fontFamily,
    }
  })
  expect(fallback.loaded).toBe(true)
  expect(fallback.stack).toContain('Noto Sans Devanagari')
})

test('installed build restarts offline with camera binaries cached', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    }
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Jaagruk', exact: true })).toBeVisible()
  const assets = await page.evaluate(async () => {
    const manifest = await (await fetch('./vision/0.10.18/manifest.json')).json()
    return Promise.all(Object.entries(manifest.files).map(async ([name, info]) => {
      const response = await fetch(`./vision/0.10.18/${name}`)
      const bytes = await response.arrayBuffer()
      return { name, ok: response.ok, size: bytes.byteLength, expected: info.bytes }
    }))
  })
  expect(assets).toHaveLength(6)
  for (const asset of assets) { expect(asset.ok).toBe(true); expect(asset.size).toBe(asset.expected) }
  const runtime = (await readdir('dist/assets')).find(name => /^vision_bundle-.*\.js$/.test(name))
  expect(runtime).toBeTruthy()
  const inference = await page.evaluate(async runtimeName => {
    const { FilesetResolver, HandLandmarker, ObjectDetector } = await import(`/assets/${runtimeName}`)
    const files = await FilesetResolver.forVisionTasks('./vision/0.10.18')
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 64
    canvas.getContext('2d').fillRect(0, 0, 64, 64)
    const hand = await HandLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: './vision/0.10.18/hand_landmarker.task', delegate: 'CPU' },
      runningMode: 'IMAGE', numHands: 1,
    })
    let hands
    try { hands = hand.detect(canvas).landmarks.length } finally { hand.close() }
    const detector = await ObjectDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: './vision/0.10.18/efficientdet_lite0.tflite', delegate: 'CPU' },
      runningMode: 'IMAGE', scoreThreshold: 0.5,
    })
    let objects
    try { objects = detector.detect(canvas).detections.length } finally { detector.close() }
    return { hands, objects }
  }, runtime)
  expect(inference).toEqual({ hands: 0, objects: 0 })
})

test('3D fire drill renders and advances after an answer', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/#/train/fire-explosion')
  await page.getByRole('button', { name: 'This way out Use 3D view', exact: true }).click()
  const choice = page.locator('[data-gesture-target="choice-0"]')
  await expect(choice).toBeEnabled({ timeout: 30000 })
  await expect(page.locator('canvas')).toBeVisible()
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const canvas = page.locator('canvas')
    // Read pixels immediately after drawing the WebGL buffer into a 2D canvas.
    const colours = await canvas.evaluate(element => new Promise(resolve => requestAnimationFrame(() => {
      const copy = document.createElement('canvas')
      copy.width = element.width; copy.height = element.height
      const context = copy.getContext('2d')
      context.drawImage(element, 0, 0)
      const pixels = context.getImageData(0, 0, copy.width, copy.height).data
      const samples = new Set()
      for (let i = 0; i < pixels.length; i += 400) samples.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`)
      resolve(samples.size)
    })))
    expect(colours).toBeGreaterThan(20)
    await page.screenshot({ path: `test-results/fire-scene-${width}.png`, fullPage: true })
  }
  await page.screenshot({ path: 'test-results/fire-scene.png', fullPage: true })
  const canLoseContext = await page.locator('canvas').evaluate(canvas => {
    canvas.testContextLoss = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')
    canvas.testContextLoss?.loseContext()
    return !!canvas.testContextLoss
  })
  expect(canLoseContext).toBe(true)
  await expect(choice).toHaveCount(0)
  await page.locator('canvas').evaluate(canvas => canvas.testContextLoss.restoreContext())
  await expect(choice).toBeEnabled()
  await choice.click()
  const next = page.locator('[data-gesture-target="continue"]')
  await expect(next).toBeVisible()
  await next.click()
  await expect(choice).toBeEnabled()
  expect(errors).toEqual([])
})
