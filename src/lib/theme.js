// Theme: dark (default) and light, both first-class.
//
// WHY DARK IS THE DEFAULT
// The primary environment is an underground shaft or a night shift. A white
// screen at 2 a.m. underground destroys dark adaptation, and the worker then
// cannot see the corridor he is being trained to evacuate. Light exists because
// a projector in a bright hall washes out dark UI, and because a safety officer
// reading a roster at a desk should not be forced into a dark theme.
//
// WHY THE PRE-PAINT SCRIPT IN index.html MATTERS
// Reading localStorage from React means the first paint happens before the theme
// is known, which flashes the wrong theme. index.html sets data-theme inline
// before any stylesheet resolves. This module keeps that in sync afterwards and
// must apply exactly the same rule, or the flash comes back.

import { LS, lsGet, lsSet } from './local.js'

export const THEME = { DARK: 'dark', LIGHT: 'light', SYSTEM: 'system' }

const VALID = new Set([THEME.DARK, THEME.LIGHT, THEME.SYSTEM])

/** What the OS is asking for. Defaults to dark when the query is unsupported. */
export function systemPrefersLight() {
  try {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false
  } catch {
    return false
  }
}

/** The stored preference, which may be 'system'. */
export function getThemePreference() {
  const stored = lsGet(LS.THEME, THEME.SYSTEM)
  return VALID.has(stored) ? stored : THEME.SYSTEM
}

/** The theme actually in effect right now — never 'system'. */
export function resolveTheme(preference = getThemePreference()) {
  if (preference === THEME.LIGHT) return THEME.LIGHT
  if (preference === THEME.DARK) return THEME.DARK
  return systemPrefersLight() ? THEME.LIGHT : THEME.DARK
}

/**
 * Write the theme to the document.
 *
 * `color-scheme` is set alongside data-theme so native form controls,
 * scrollbars and the on-screen keyboard match. Without it you get a light
 * scrollbar on a dark page, which is the kind of detail that reads as unfinished.
 */
export function applyTheme(preference = getThemePreference()) {
  const effective = resolveTheme(preference)
  const root = document.documentElement

  root.setAttribute('data-theme', effective)
  root.style.colorScheme = effective

  // Keep the address bar / status bar in step with the surface colour.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', effective === THEME.LIGHT ? '#F7F8F9' : '#0D0F11')

  return effective
}

export function setThemePreference(preference) {
  const next = VALID.has(preference) ? preference : THEME.SYSTEM
  lsSet(LS.THEME, next)
  return applyTheme(next)
}

/** Cycle dark -> light -> system, which is what a three-state toggle needs. */
export function cycleTheme() {
  const order = [THEME.DARK, THEME.LIGHT, THEME.SYSTEM]
  const current = getThemePreference()
  const next = order[(order.indexOf(current) + 1) % order.length]
  return setThemePreference(next)
}

/**
 * Re-apply when the OS flips, but only while the preference is 'system' —
 * an explicit choice must not be overridden by the operating system.
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(onChange) {
  let media
  try {
    media = window.matchMedia?.('(prefers-color-scheme: light)')
  } catch {
    return () => {}
  }
  if (!media) return () => {}

  const handler = () => {
    if (getThemePreference() !== THEME.SYSTEM) return
    const effective = applyTheme(THEME.SYSTEM)
    onChange?.(effective)
  }

  // Safari below 14 only has the deprecated listener API.
  if (media.addEventListener) media.addEventListener('change', handler)
  else media.addListener?.(handler)

  return () => {
    if (media.removeEventListener) media.removeEventListener('change', handler)
    else media.removeListener?.(handler)
  }
}

/** Read a token as a usable CSS colour. Charts need real values, not variables. */
export function tokenColor(name, alpha = 1) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
    if (!raw) return null
    return alpha === 1 ? `rgb(${raw})` : `rgb(${raw} / ${alpha})`
  } catch {
    return null
  }
}
