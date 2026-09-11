/*
 * Scenario 3D scene coverage.
 *
 * WHY THIS IS A SOURCE-TEXT TEST
 *
 * SafetyScene3D.jsx imports three.js and react-three-fiber, so it cannot be
 * imported into a plain `node --test` process. The alternative to reading the
 * source would be no test at all, and the fault this guards against is one that
 * shipped and survived three phases unnoticed: the switch in ScenarioObjects had
 * no case for the three modules added in Phase 11, so `roof-strata-control`,
 * `working-at-height` and `mine-haulage` all fell through to `default`, which
 * returned <Fire />. A trainee opening the Working at Height briefing was shown a
 * burning fire.
 *
 * Nothing failed. No error, no warning, no blank screen — just the wrong hazard,
 * confidently rendered, teaching the wrong association before a word of the drill
 * was read. That is exactly the class of bug worth spending a crude test on.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCENARIOS } from '../src/lib/scenarios.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = readFileSync(join(ROOT, 'src/components/SafetyScene3D.jsx'), 'utf8')

/** The scenario ids the switch in ScenarioObjects explicitly handles. */
const handled = new Set([...SRC.matchAll(/case\s+'([a-z0-9-]+)'\s*:/g)].map((m) => m[1]))

describe('every module has its own 3D scene', () => {
  test('no scenario falls through to the default branch', () => {
    const missing = SCENARIOS.map((s) => s.id).filter((id) => !handled.has(id))
    assert.deepEqual(
      missing,
      [],
      `these modules have no scene of their own and would render the default: ${missing.join(', ')}`,
    )
  })

  test('the switch does not handle scenarios that no longer exist', () => {
    // A renamed module would otherwise leave a dead case and a live default.
    const ids = new Set(SCENARIOS.map((s) => s.id))
    const orphans = [...handled].filter((id) => !ids.has(id))
    assert.deepEqual(orphans, [], `dead cases: ${orphans.join(', ')}`)
  })

  test('the default branch renders no hazard', () => {
    /*
     * The specific regression. `default: return <Fire />` is the shape of the
     * original bug — showing an unrelated hazard is worse than showing none,
     * because it is indistinguishable from a correct scene.
     */
    const defaultBranch = SRC.slice(SRC.indexOf('default:'), SRC.indexOf('default:') + 400)
    assert.ok(SRC.includes('default:'), 'the switch must still have a default')
    for (const hazard of ['<Fire', '<GasDetector', '<DustMachine', '<Machinery', '<ElectricalPanel']) {
      assert.ok(
        !defaultBranch.includes(hazard),
        `the default branch must not render ${hazard} — an unrelated hazard teaches the wrong association`,
      )
    }
  })
})

describe('the scenes stay usable on a phone', () => {
  test('animation is gated on the reduced-motion preference', () => {
    // Every useFrame in this file drives decorative motion. Each one has to be
    // skippable, or the scene keeps moving for someone who asked the OS to stop.
    const frames = (SRC.match(/useFrame\(/g) || []).length
    assert.ok(frames > 0, 'expected animated scenes')
    const guards = (SRC.match(/if \(reduced\) return/g) || []).length
    assert.ok(
      guards >= frames,
      `${frames} useFrame blocks but only ${guards} reduced-motion guards`,
    )
  })

  test('the pixel ratio is capped', () => {
    // An uncapped 3x display renders nine times the pixels for a briefing diagram.
    assert.ok(/dpr=\{\[1,\s*[\d.]+\]\}/.test(SRC), 'Canvas should cap dpr')
  })

  test('labels remain suppressible for the AR overlay', () => {
    // AR draws its own DOM label layer; doubling it up gives every object two
    // captions. The context wrapper is what lets AR switch these off.
    assert.ok(SRC.includes('HideMeshLabels'), 'the label context wrapper must survive')
    assert.ok(!/<Html\s+position=/.test(SRC), 'labels should go through <Label>, not <Html> directly')
  })
})

describe('the meshes stay reusable by the AR overlay', () => {
  test('every mesh the AR scene imports is still exported', () => {
    // ARScene3D imports these by name. A rename here would break the AR overlay
    // at runtime, in a lazy chunk, on a phone.
    const arSide = readFileSync(join(ROOT, 'src/components/ARScene3D.jsx'), 'utf8')
    const imported = arSide
      .slice(arSide.indexOf("from './SafetyScene3D.jsx'") - 400, arSide.indexOf("from './SafetyScene3D.jsx'"))
      .match(/\b(?:Fire|FireExtinguisher|ElectricalPanel|Machinery|GasDetector|DustMachine|Worker|MineTunnel|Warehouse|HideMeshLabels)\b/g)
    assert.ok(imported && imported.length > 0, 'expected AR to import shared meshes')
    for (const name of new Set(imported)) {
      assert.ok(
        new RegExp(`\\b${name}\\b`).test(SRC.slice(SRC.indexOf('export {'))) ||
          SRC.includes(`export function ${name}`),
        `${name} is imported by ARScene3D but not exported from SafetyScene3D`,
      )
    }
  })

  test('shared meshes accept a position so AR can place them', () => {
    // AR re-centres each mesh on its anchor by passing position={[0,0,0]}. A mesh
    // with a hardcoded position would sit metres off target.
    for (const name of ['FireExtinguisher', 'ElectricalPanel', 'Machinery', 'GasDetector', 'DustMachine']) {
      const decl = new RegExp(`function ${name}\\(\\{[^}]*position`)
      assert.ok(decl.test(SRC), `${name} must take a position prop`)
    }
  })
})
