/*
 * Demo site tests.
 *
 * These exist because importSiteBundle fails SILENTLY. Its filter drops any anchor
 * without an id, with a type that is not a key of ANCHOR_TYPE, or with a bearing
 * that is not a finite number — no throw, no warning, the anchor simply is not
 * there. A single mistyped type in this hand-authored file would therefore produce a
 * demo that loads successfully and is quietly missing an exit, and the only way to
 * notice would be to walk the AR view looking for something absent.
 *
 * So the bundle is validated here against the same predicate the importer uses,
 * plus the things that make it a useful DEMO rather than merely a valid one: every
 * mesh reachable, every zone escapable, and bearings spread far enough apart that
 * turning on the spot actually reveals the overlay is world-registered.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEMO_SITE_BUNDLE,
  DEMO_ZONE_PREFIX,
  demoAnchorTypes,
  demoAnchorCount,
} from '../src/lib/demoSite.js'
import {
  ANCHOR_TYPE,
  SITE_BUNDLE_FORMAT,
  SITE_BUNDLE_VERSION,
  GENERIC_ZONE_ID,
  normaliseHeadingStrict,
  projectAnchor,
} from '../src/lib/siteMap.js'

const zones = DEMO_SITE_BUNDLE.site.zones
const allAnchors = zones.flatMap((z) => z.anchors)

describe('the bundle is one importSiteBundle will accept', () => {
  test('the envelope matches the importer exactly', () => {
    // Hardcoding 'jaagruk-site' here would let the two drift apart silently.
    assert.equal(DEMO_SITE_BUNDLE.format, SITE_BUNDLE_FORMAT)
    assert.equal(DEMO_SITE_BUNDLE.version, SITE_BUNDLE_VERSION)
    assert.equal(typeof DEMO_SITE_BUNDLE.site, 'object')
  })

  test('every anchor survives the importer’s filter', () => {
    /*
     * This IS the importer's predicate, copied deliberately:
     *   a?.id && ANCHOR_TYPE[a.type] && normaliseHeadingStrict(a.bearing) !== null
     * If this test fails, the demo would load with fewer anchors than authored.
     */
    for (const a of allAnchors) {
      assert.ok(a.id, `an anchor has no id: ${JSON.stringify(a)}`)
      assert.ok(
        ANCHOR_TYPE[a.type],
        `anchor ${a.id} has type "${a.type}", which is not an ANCHOR_TYPE and would be dropped`,
      )
      assert.ok(
        normaliseHeadingStrict(a.bearing) !== null,
        `anchor ${a.id} has bearing ${a.bearing}, which would be dropped`,
      )
    }
  })

  test('nothing is lost to truncation', () => {
    // The importer slices labels at 40 and notes at 200.
    for (const a of allAnchors) {
      assert.ok(a.note.length <= 200, `${a.id} note is ${a.note.length} chars and would be cut`)
      assert.ok((a.label || '').length <= 40, `${a.id} label would be cut`)
    }
    for (const z of zones) {
      assert.ok(z.name.length <= 60, `${z.id} name is ${z.name.length} chars and would be cut`)
    }
  })

  test('ids are unique, so re-importing cannot duplicate anything', () => {
    // importSiteBundle dedupes by id. Duplicate ids in the source would instead
    // mean one anchor silently shadowing another.
    const ids = allAnchors.map((a) => a.id)
    assert.equal(new Set(ids).size, ids.length, 'duplicate anchor ids')
    const zoneIds = zones.map((z) => z.id)
    assert.equal(new Set(zoneIds).size, zoneIds.length, 'duplicate zone ids')
  })

  test('elevations are inside the range the importer normalises to', () => {
    for (const a of allAnchors) {
      assert.ok(
        Number.isFinite(a.elevation) && a.elevation >= -90 && a.elevation <= 90,
        `${a.id} elevation ${a.elevation}`,
      )
    }
  })
})

describe('the bundle is preferred over the generic fallback', () => {
  test('no zone collides with the generic zone id', () => {
    // Scenario.jsx picks a scanned zone with anchors over the generic one. A zone
    // reusing the generic id would be treated as the fallback and defeat the point.
    for (const z of zones) {
      assert.notEqual(z.id, GENERIC_ZONE_ID, `${z.id} must not be the generic zone`)
    }
  })

  test('every zone carries anchors, so any of them wins the preference', () => {
    for (const z of zones) {
      assert.ok(z.anchors.length > 0, `${z.id} has no anchors`)
    }
  })

  test('zones are identifiable as demo data', () => {
    for (const z of zones) {
      assert.ok(z.id.startsWith(DEMO_ZONE_PREFIX), `${z.id} is not marked as demo data`)
    }
    for (const a of allAnchors) {
      assert.ok(a.id.startsWith(DEMO_ZONE_PREFIX), `${a.id} is not marked as demo data`)
    }
  })
})

describe('the bundle is a useful demonstration', () => {
  test('every anchor type is represented, so every 3D mesh is reachable', () => {
    // ARScene3D maps all ten types to geometry. A type absent here is a mesh
    // nobody can see without scanning a real site.
    const covered = demoAnchorTypes()
    for (const type of Object.values(ANCHOR_TYPE)) {
      assert.ok(covered.includes(type), `${type} is not in the demo, so its mesh is unreachable`)
    }
  })

  test('every zone has a way out', () => {
    // A safety product demonstrating a room with no exit would be an odd choice.
    for (const z of zones) {
      assert.ok(
        z.anchors.some((a) => a.type === ANCHOR_TYPE.EXIT),
        `${z.id} has no exit`,
      )
    }
  })

  test('bearings are spread around the compass, not clustered ahead', () => {
    // If everything sat within one field of view the overlay could be pinned to
    // the screen and look identical. Spread is what makes registration visible.
    for (const z of zones) {
      const quadrants = new Set(z.anchors.map((a) => Math.floor(a.bearing / 90)))
      assert.ok(
        quadrants.size >= 3,
        `${z.id} only uses ${quadrants.size} quadrant(s); turning would not reveal much`,
      )
    }
  })

  test('elevation is used in both directions', () => {
    // Floor-level equipment below, wall-mounted panels above. Otherwise the
    // vertical half of the projection maths is never exercised.
    assert.ok(allAnchors.some((a) => a.elevation < -3), 'nothing is meaningfully below eye level')
    assert.ok(allAnchors.some((a) => a.elevation > 2), 'nothing is meaningfully above eye level')
  })

  test('labels are left empty so markers use the translated type name', () => {
    // ARDrill renders `anchor.label || t(meta.labelKey)`. An English label here
    // would show English on a marker to a Hindi or Santali reader.
    for (const a of allAnchors) {
      assert.equal(a.label, '', `${a.id} has a hardcoded label that would not translate`)
    }
  })

  test('every anchor carries a supervisor-facing note', () => {
    for (const a of allAnchors) {
      assert.ok(a.note && a.note.length > 8, `${a.id} has no useful note`)
    }
  })

  test('the site is substantial enough to be worth showing', () => {
    assert.ok(zones.length >= 3, `only ${zones.length} zones`)
    assert.ok(demoAnchorCount() >= 18, `only ${demoAnchorCount()} anchors`)
  })
})

describe('the demo anchors project sensibly', () => {
  test('facing each anchor puts it in the centre of frame', () => {
    // End-to-end sanity across the real data: point the camera at an anchor's own
    // bearing and elevation, and it must land dead centre and be visible. Catches
    // a bearing typed outside 0..360 or an absurd elevation.
    for (const a of allAnchors) {
      const p = projectAnchor(a, { heading: a.bearing, elevation: a.elevation, hFov: 50, vFov: 65 })
      assert.ok(Math.abs(p.x - 0.5) < 1e-9, `${a.id} x=${p.x}`)
      assert.ok(Math.abs(p.y - 0.5) < 1e-9, `${a.id} y=${p.y}`)
      assert.equal(p.visible, true, `${a.id} is not visible when aimed at directly`)
      assert.equal(p.behind, false, `${a.id} reported as behind the camera`)
    }
  })

  test('from any single heading, at least one anchor is off-screen', () => {
    // The converse of the spread test, measured through the real projection: if a
    // zone ever fitted entirely in one frame there would be no reason to turn.
    for (const z of zones) {
      const view = { heading: 0, elevation: 0, hFov: 50, vFov: 65 }
      const offscreen = z.anchors.filter((a) => projectAnchor(a, view).offScreen)
      assert.ok(offscreen.length > 0, `${z.id} fits entirely in one view`)
    }
  })

  test('no two anchors in a zone sit exactly on top of each other', () => {
    // Coincident markers are unreadable and look like a rendering fault.
    for (const z of zones) {
      for (let i = 0; i < z.anchors.length; i += 1) {
        for (let j = i + 1; j < z.anchors.length; j += 1) {
          const a = z.anchors[i]
          const b = z.anchors[j]
          const dBearing = Math.abs(((a.bearing - b.bearing + 540) % 360) - 180)
          const separated = dBearing > 2 || Math.abs(a.elevation - b.elevation) > 2
          assert.ok(separated, `${a.id} and ${b.id} overlap`)
        }
      }
    }
  })
})
