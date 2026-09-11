/*
 * A hand-authored site, so the app can be shown without walking a real one.
 *
 * WHY THIS EXISTS
 *
 * The AR drill is only spatially real once a supervisor has walked the site and
 * recorded where the exits actually are. That is the correct design and it is also
 * a cold-start problem: anyone opening the app for the first time — a judge, an
 * evaluator, a safety officer deciding whether to trial it — gets the generic
 * fallback zone, which places six anchors at invented bearings and honestly says so
 * with an amber chip. The most convincing part of the product is invisible until
 * someone has done twenty minutes of setup in the building it was written for.
 *
 * So this is a realistic scan, authored once, that can be loaded in a tap. It goes
 * through importSiteBundle — the same path a real exported scan takes, with the same
 * validation — rather than writing to the store directly. If the bundle format ever
 * changes, this breaks in the same place a real bundle would, which is what we want.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not fabricate training history, attempts, scores or certificates. It would
 * be easy, it would make the dashboard look richer, and it would be wrong: this is a
 * compliance product whose certificates are signed and chained, and seeding invented
 * passes would put records in the ledger that are indistinguishable from earned ones.
 * A judge should see an empty dashboard fill up because they did a drill. So the demo
 * seeds the SITE — the thing a supervisor would have set up before any worker arrived
 * — and nothing a worker is supposed to earn.
 *
 * WHAT THE JUDGE CAN THEN DO WITH NO SETUP AT ALL
 *   · no API key      — drills, AR, certificates and the ledger are all on-device.
 *                       Only the photo hazard scan calls out, and it says so.
 *   · no second phone — every scenario runs solo; the buddy drill is the one feature
 *                       that needs a pair, and it is not on this path.
 *   · no site scan    — that is what this file replaces.
 *
 * ANCHOR LABELS ARE LEFT EMPTY ON PURPOSE
 *
 * ARDrill renders `anchor.label || t(meta.labelKey)`, so an empty label falls through
 * to the translated type name. Hardcoding "Main door" here would show English on a
 * marker to a Hindi or Santali reader. The descriptive detail lives in `note`
 * instead, which is supervisor-facing. Zone names are unavoidably English, exactly as
 * a real supervisor's typed names would be.
 *
 * BEARINGS ARE SPREAD AROUND THE COMPASS
 *
 * Not decoration: it means turning on the spot brings different objects into frame,
 * which is the only way to see that the overlay is registered to the world rather
 * than pinned to the screen. Elevations are negative for floor-level equipment and
 * positive for wall-mounted panels, so the vertical maths is visible too.
 */

import {
  ANCHOR_TYPE,
  SITE_BUNDLE_FORMAT,
  SITE_BUNDLE_VERSION,
  importSiteBundle,
} from './siteMap.js'
import { getActiveSiteId } from './identity.js'

/** Marks zones this file created, so the UI can say where they came from. */
export const DEMO_ZONE_PREFIX = 'demo-'

const anchor = (id, type, bearing, elevation, note) => ({
  id: `${DEMO_ZONE_PREFIX}${id}`,
  type,
  label: '',
  bearing,
  elevation,
  note,
})

export const DEMO_SITE_BUNDLE = Object.freeze({
  format: SITE_BUNDLE_FORMAT,
  version: SITE_BUNDLE_VERSION,
  site: {
    name: 'Jharia Demo Colliery',
    sector: 'coal',
    zones: [
      {
        /*
         * Surface plant. The densest zone, and the one to open first: it carries
         * a conveyor drive, a transfer point that raises dust, a lockout panel and
         * two separate exits, so the marker set is varied without being a wall of
         * icons.
         */
        id: `${DEMO_ZONE_PREFIX}conveyor-gallery`,
        name: 'Coal handling — conveyor gallery',
        anchors: [
          anchor('cg-exit-main', ANCHOR_TYPE.EXIT, 12, 0, 'Main gallery door, opens onto the yard'),
          anchor('cg-exit-rear', ANCHOR_TYPE.EXIT, 195, 0, 'Rear stair to the tippler floor'),
          anchor('cg-assembly', ANCHOR_TYPE.ASSEMBLY_POINT, 24, -3, 'Yard muster point, 40 m from the main door'),
          anchor('cg-ext', ANCHOR_TYPE.EXTINGUISHER, 46, -6, 'CO2, bracketed beside the drive house'),
          anchor('cg-aid', ANCHOR_TYPE.FIRST_AID, 330, -4, 'First-aid box on the gallery wall'),
          anchor('cg-machine', ANCHOR_TYPE.MACHINE, 90, -2, 'Conveyor head-end drive, unguarded nip point'),
          anchor('cg-dust', ANCHOR_TYPE.DUST_SOURCE, 106, -5, 'Transfer chute, respirable dust when the belt runs'),
          anchor('cg-loto', ANCHOR_TYPE.LOTO_PANEL, 78, 3, 'Isolation and lockout point for the head-end drive'),
        ],
      },
      {
        /*
         * Underground. Chosen because it is where the elevation values matter: a
         * gas layer sits low, roof hazards sit high, and a worker looking level
         * would miss both.
         */
        id: `${DEMO_ZONE_PREFIX}haulage-l3`,
        name: 'Underground — haulage level 3',
        anchors: [
          anchor('h3-exit', ANCHOR_TYPE.EXIT, 270, 0, 'Return airway, marked escape route'),
          anchor('h3-gas', ANCHOR_TYPE.GAS_ZONE, 155, -9, 'Fixed methane head, low point of the roadway'),
          anchor('h3-aid', ANCHOR_TYPE.FIRST_AID, 250, -4, 'Stretcher and first-aid station at the junction'),
          anchor('h3-ext', ANCHOR_TYPE.EXTINGUISHER, 288, -5, 'Dry powder, at the belt drive'),
          anchor('h3-hazard', ANCHOR_TYPE.HAZARD, 100, -14, 'Unsupported roof section, barred off'),
          anchor('h3-panel', ANCHOR_TYPE.ELECTRICAL_PANEL, 300, 4, 'Flameproof switchgear, wall-mounted'),
        ],
      },
      {
        /*
         * Despatch bay. The vehicle zone, which is also where the person and
         * vehicle detection has something real to find.
         */
        id: `${DEMO_ZONE_PREFIX}despatch-bay`,
        name: 'Warehouse — despatch bay',
        anchors: [
          anchor('db-exit-pedestrian', ANCHOR_TYPE.EXIT, 350, 0, 'Pedestrian door, separate from the vehicle roller'),
          anchor('db-exit-side', ANCHOR_TYPE.EXIT, 170, 0, 'Side fire exit, push bar'),
          anchor('db-assembly', ANCHOR_TYPE.ASSEMBLY_POINT, 356, -3, 'Muster point beyond the vehicle route'),
          anchor('db-ext', ANCHOR_TYPE.EXTINGUISHER, 60, -7, 'Foam, at the charging bay'),
          anchor('db-aid', ANCHOR_TYPE.FIRST_AID, 300, -3, 'First-aid point by the supervisor cabin'),
          anchor('db-machine', ANCHOR_TYPE.MACHINE, 120, -4, 'Forklift battery charging bay'),
          anchor('db-panel', ANCHOR_TYPE.ELECTRICAL_PANEL, 132, 5, 'Charger distribution board'),
          anchor('db-hazard', ANCHOR_TYPE.HAZARD, 210, -10, 'Vehicle route crosses the walkway here'),
        ],
      },
    ],
  },
})

/** Every anchor type the demo covers, for the tests and the UI blurb. */
export function demoAnchorTypes() {
  const seen = new Set()
  for (const zone of DEMO_SITE_BUNDLE.site.zones) {
    for (const a of zone.anchors) seen.add(a.type)
  }
  return [...seen]
}

export function demoAnchorCount() {
  return DEMO_SITE_BUNDLE.site.zones.reduce((n, z) => n + z.anchors.length, 0)
}

/**
 * Load the demo site into whichever site is currently active.
 *
 * Active rather than a hardcoded id, so it seeds the site the user is actually
 * looking at — signing in as a worker switches the active site, and a demo loaded
 * into some other id would be invisible.
 *
 * Idempotent, because importSiteBundle merges by zone and anchor id: loading twice
 * adds nothing the second time rather than producing eight duplicate exits.
 */
export async function loadDemoSite({ siteId = null } = {}) {
  const target = siteId || getActiveSiteId()
  return importSiteBundle(DEMO_SITE_BUNDLE, { siteId: target })
}
