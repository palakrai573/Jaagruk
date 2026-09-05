// Santali (ᱥᱟᱱᱛᱟᱲᱤ, Ol Chiki) — the 332 strings that were falling back to Hindi.
//
// READ THIS BEFORE TRUSTING ANY STRING IN THIS FILE
// None of it is verified by a native speaker. It was written against the glossary
// already established by the 241 Santali strings elsewhere in the app, so the
// terminology is at least internally consistent, but consistency is not accuracy.
// Santali is a Munda language with no significant machine-translation corpus, and
// this is safety training content: a wrong verb in an evacuation prompt teaches the
// wrong reaction.
//
// The app does not pretend otherwise. `SANTALI_VERIFIED` below is false, and the
// in-app coverage notice keys off that flag rather than off the coverage
// percentage — so reaching 100% coverage does NOT silence the warning. That
// decoupling is the whole point: before this file existed, filling the last slot
// would have made the notice disappear and left the app quietly claiming reviewed
// Santali.
//
// TO GET THIS REVIEWED
//   npm run santali:worksheet   -> docs/santali-worksheet.csv
// Hand that to a Santali speaker (a local ITI, a Santali studies department, or a
// community organisation in Jharkhand). Rows are ordered by consequence: drill and
// hazard instructions first, supervisor dashboards last. When a batch comes back,
// correct it here and record the reviewer in SANTALI_REVIEW.
//
// WHY A SEPARATE FILE
// Organisational, not a quality boundary — the strings in i18n.js and
// i18nJaagruk.js are equally unreviewed. Those two files are already 573 keys
// across six languages each; adding a sixth value to 332 of them would have made
// the review diff unreadable. One file a reviewer can work top-to-bottom is worth
// more than perfect co-location.
//
// CONVENTIONS FOLLOWED
//   ᱡᱚᱠᱷᱚᱢ hazard · ᱨᱠᱷᱟ safety · ᱛᱟᱞᱤᱢ training · ᱠᱟᱹᱢᱤ work · ᱦᱚᱲ person
//   ᱠᱷᱚᱵᱚᱨ report · ᱨᱮᱠᱚᱰ record · ᱯᱚᱨᱢᱟᱱ certificate · ᱛᱮᱭᱟᱨᱤ readiness
//   ᱚᱠᱛᱚ time · ᱴᱷᱟᱶ location · ᱡᱚᱱ zone · ᱡᱚᱲᱟᱣ buddy/connect · ᱚᱰᱚᱠ exit
//   ᱢᱮ imperative · ᱠᱟᱱᱟ progressive · ᱮᱱᱟ completed · ᱵᱟᱝ negation
// Loanwords are written in Ol Chiki rather than left in Latin, because a Santali
// reader expects the script even for a borrowed word. Identifiers that are not
// words (URL, QR, CSV, API, AR, 3D, PPE, https, PIN codes) stay as they are.

/** False until a native speaker signs off. The UI notice reads this, not coverage. */
export const SANTALI_VERIFIED = false

export const SANTALI_REVIEW = {
  verified: SANTALI_VERIFIED,
  reviewer: null,
  reviewedAt: null,
  note: 'Machine-authored against the app glossary. Pending native-speaker review.',
}

export const SANTALI_STRINGS = {
  /* ---------------- admin / supervisor ---------------- */
  ad_auth_warning:
    'ᱱᱚᱶᱟ ᱯᱤᱱ ᱫᱚ ᱠᱷᱟᱲᱤᱡ ᱨᱚᱠᱚᱴ ᱜᱮ ᱠᱟᱱᱟ, ᱥᱟᱹᱨᱤ ᱦᱩᱠᱩᱢ ᱵᱟᱝ ᱾ ᱥᱟᱹᱨᱤ ᱵᱮᱵᱷᱟᱨ ᱞᱟᱹᱜᱤᱫ ᱥᱟᱨᱵᱷᱟᱨ ᱠᱷᱚᱱ ᱮᱢ ᱠᱟᱱ ᱨᱚᱞ ᱞᱟᱹᱠᱛᱤ ᱾',
  ad_export_dgms: 'ᱠᱟᱱᱩᱱ ᱵᱟᱱᱰᱚᱞ ᱵᱟᱦᱨᱮ ᱠᱩᱞ',
  ad_gate_enter: 'ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ ᱯᱤᱱ ᱚᱞ ᱢᱮ',
  ad_gate_lock: 'ᱰᱮᱥᱵᱚᱨᱰ ᱛᱟᱞᱟ',
  ad_gate_set_body: 'ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱯᱤᱱ ᱵᱟᱝ ᱾ ᱡᱟᱨᱣᱟ ᱯᱷᱚᱱ ᱨᱮ ᱱᱚᱶᱟ ᱰᱮᱥᱵᱚᱨᱰ ᱨᱠᱷᱟ ᱞᱟᱹᱜᱤᱫ ᱢᱤᱫ ᱵᱟᱪᱷᱟᱣ ᱢᱮ ᱾',
  ad_gate_set_title: 'ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ ᱯᱤᱱ ᱛᱮᱭᱟᱨ ᱢᱮ',
  ad_gate_title: 'ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ ᱵᱚᱞᱚ',
  ad_gate_unlock: 'ᱡᱷᱤᱡ ᱢᱮ',
  ad_gate_wrong: 'ᱵᱷᱩᱞ ᱯᱤᱱ ᱾',
  ad_gossip_desc:
    'ᱠᱷᱟᱰ ᱨᱮ ᱱᱮᱴᱣᱟᱨᱠ ᱵᱟᱝ ᱛᱟᱦᱮᱸᱠᱷᱟᱱ, ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ ᱯᱷᱚᱱ ᱥᱟᱶ ᱡᱚᱲᱟᱣ ᱢᱮ ᱟᱨ ᱨᱮᱠᱚᱰ ᱠᱚ ᱥᱚᱡᱷᱮ ᱠᱩᱞ ᱢᱮ ᱾ ᱩᱱᱠᱩ ᱩᱯᱨᱩᱢ ᱠᱟᱛᱮ ᱟᱯᱞᱳᱰ ᱠᱚ ᱮᱢᱟ ᱾',
  ad_gossip_title: 'ᱱᱟᱜᱟᱢ ᱯᱷᱚᱱ ᱛᱮ ᱮᱢ ᱢᱮ',
  ad_hazard_ack: 'ᱢᱟᱱᱟᱣ ᱢᱮ',
  ad_hazard_dismiss: 'ᱚᱰᱚᱠ ᱢᱮ',
  ad_hazard_reopen: 'ᱫᱚᱦᱲᱟ ᱡᱷᱤᱡ',
  ad_hazard_resolve: 'ᱴᱷᱤᱠ ᱢᱮᱱ ᱢᱮ',
  ad_hazards_none: 'ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱡᱚᱠᱷᱚᱢ ᱠᱷᱚᱵᱚᱨ ᱵᱟᱝ ᱾',
  ad_hesitation_desc:
    'ᱱᱚᱶᱟ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱠᱚ ᱴᱷᱤᱠ ᱢᱮᱱ ᱠᱮᱫᱟ ᱢᱮᱱᱠᱷᱟᱱ ᱟᱲᱟᱜ ᱛᱮ ᱾ ᱠᱟᱜᱚᱡ ᱨᱮ ᱩᱱᱠᱩ ᱯᱟᱥ, ᱵᱟᱹᱲᱛᱤ ᱡᱚᱨ ᱨᱮ ᱩᱱᱠᱩ ᱜᱮ ᱛᱷᱤᱨ ᱚᱲᱟᱜᱚᱜᱼᱟ ᱾ ᱩᱱᱠᱩ ᱫᱚᱦᱲᱟ ᱛᱟᱞᱤᱢ ᱮᱢ ᱢᱮ ᱾',
  ad_hesitation_none: 'ᱡᱟᱦᱟᱸ ᱟᱲᱟᱜ ᱨᱮᱠᱚᱰ ᱵᱟᱝ ᱾',
  ad_import_bundle: 'ᱵᱟᱱᱰᱚᱞ ᱟᱹᱜᱩ ᱢᱮ',
  ad_import_done: 'ᱟᱹᱜᱩ ᱦᱩᱭ ᱮᱱᱟ',
  ad_import_failed: 'ᱱᱚᱶᱟ ᱯᱷᱟᱭᱤᱞ ᱡᱟᱜᱨᱩᱠ ᱵᱟᱱᱰᱚᱞ ᱵᱟᱝ ᱠᱟᱱᱟ ᱾',
  ad_import_trust: 'ᱱᱚᱶᱟ ᱵᱟᱱᱰᱚᱞ ᱨᱮᱭᱟᱜ ᱥᱩᱦᱤ ᱡᱤᱱᱤᱥ ᱠᱚ ᱦᱚᱸ ᱯᱟᱛᱭᱟᱣ ᱢᱮ',
  ad_ledger_empty: 'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱮ ᱡᱟᱦᱟᱸ ᱯᱚᱨᱢᱟᱱ ᱵᱟᱝ ᱮᱢ ᱞᱮᱱᱟ ᱾',
  ad_ledger_intact: 'ᱡᱚᱛᱚ ᱨᱮᱠᱚᱰ ᱴᱷᱤᱠ',
  ad_ledger_intact_to: 'ᱨᱮᱠᱚᱰ ᱦᱟᱹᱵᱤᱡ ᱥᱟᱸᱠᱞᱤ ᱴᱷᱤᱠ',
  ad_ledger_records: 'ᱨᱮᱠᱚᱰ',
  ad_ledger_verify: 'ᱡᱚᱛᱚ ᱞᱮᱡᱚᱨ ᱡᱟᱹᱨᱩᱭ ᱢᱮ',
  ad_oldest_open: 'ᱡᱟᱥᱛᱤ ᱢᱟᱨᱮ ᱡᱷᱤᱡ, ᱢᱟᱦᱟᱸ',
  ad_open_high: 'ᱡᱷᱤᱡ ᱡᱟᱥᱛᱤ ᱡᱚᱠᱷᱚᱢ',
  ad_statutory_note:
    'ᱠᱷᱟᱰ ᱠᱟᱱᱩᱱ 1952 ᱟᱨ ᱠᱟᱨᱠᱷᱟᱱᱟ ᱠᱟᱱᱩᱱ 1948 ᱨᱮᱭᱟᱜ ᱨᱮᱠᱚᱰ ᱞᱟᱹᱜᱤᱫ ᱵᱟᱦᱨᱮ ᱠᱩᱞ ᱾ ᱛᱮᱭᱟᱨᱤ ᱫᱚ ᱵᱟᱦᱨᱮ ᱠᱩᱞ ᱢᱟᱦᱟᱸ ᱨᱮᱭᱟᱜ ᱠᱟᱱᱟ, ᱢᱟᱲᱟᱝ ᱡᱟᱹᱨᱩᱭ ᱢᱟᱦᱟᱸ ᱨᱮᱭᱟᱜ ᱵᱟᱝ ᱾',
  ad_sync_done: 'ᱥᱤᱸᱠ ᱦᱩᱭ ᱮᱱᱟ',
  ad_sync_failed: 'ᱥᱤᱸᱠ ᱵᱟᱝ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾ ᱨᱮᱠᱚᱰ ᱠᱚ ᱨᱠᱷᱟ ᱨᱮ ᱟᱨ ᱵᱟᱠᱤ ᱨᱮ ᱢᱮᱱᱟᱜᱼᱟ ᱾',
  ad_sync_no_endpoint: 'ᱡᱟᱦᱟᱸ ᱟᱯᱞᱳᱰ URL ᱵᱟᱝ ᱛᱮᱭᱟᱨ, ᱚᱱᱟᱛᱮ ᱨᱮᱠᱚᱰ ᱠᱚ ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱮ ᱜᱮ ᱛᱟᱦᱮᱸᱱᱟ ᱾',
  ad_sync_now: 'ᱱᱤᱛᱚᱜ ᱥᱤᱸᱠ ᱢᱮ',
  ad_sync_offline: 'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱚᱯᱷᱞᱟᱭᱤᱱ ᱠᱟᱱᱟ ᱾ ᱨᱮᱠᱚᱰ ᱠᱚ ᱛᱟᱭᱚᱢ ᱟᱡᱛᱮ ᱪᱟᱞᱟᱜᱼᱟ ᱾',
  ad_sync_pending: 'ᱨᱮᱠᱚᱰ ᱵᱟᱠᱤ',
  ad_tab_compliance: 'ᱠᱟᱱᱩᱱ ᱢᱟᱱᱟᱣ',
  ad_tab_hazards: 'ᱡᱚᱠᱷᱚᱢ ᱵᱚᱨᱰ',
  ad_tab_hesitation: 'ᱟᱲᱟᱜ ᱡᱚᱠᱷᱚᱢ',
  ad_tab_ledger: 'ᱞᱮᱡᱚᱨ',
  ad_tab_verify: 'QR ᱡᱟᱹᱨᱩᱭ',
  ad_worst_pause: 'ᱡᱟᱥᱛᱤ ᱡᱤᱞᱤᱧ ᱟᱲᱟᱜ',
  ad_zone_clusters: 'ᱠᱷᱚᱵᱚᱨ ᱠᱚ ᱚᱠᱟ ᱨᱮ ᱡᱟᱨᱣᱟ',
  admin_certified_workers: 'ᱥᱚᱨᱴᱤᱯᱤᱠᱮᱴ ᱦᱩᱭ ᱠᱟᱱ ᱠᱟᱹᱢᱤ ᱦᱚᱲ',
  admin_domain_breakdown: 'ᱮᱞᱟᱠᱟ ᱞᱮᱠᱟᱛᱮ ᱟᱣᱥᱚᱛ',
  admin_export_csv: 'CSV ᱵᱟᱦᱨᱮ ᱠᱩᱞ',
  admin_eyebrow: 'ᱮᱰᱢᱤᱱ',
  admin_no_certs: 'ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱡᱟᱦᱟᱸ ᱯᱚᱨᱢᱟᱱ ᱵᱟᱝ ᱮᱢ ᱞᱮᱱᱟ ᱾',
  admin_search: 'ᱧᱩᱛᱩᱢ ᱛᱮ ᱯᱟᱱᱛᱮ ᱢᱮ…',
  admin_title: 'ᱠᱟᱱᱩᱱ ᱢᱟᱱᱟᱣ ᱰᱮᱥᱵᱚᱨᱰ',
  admin_total_certs: 'ᱮᱢ ᱠᱟᱱ ᱯᱚᱨᱢᱟᱱ',
  anchor_loto: 'ᱞᱚᱠᱟᱣᱴ ᱯᱟᱱᱮᱞ',

  /* ---------------- AR ---------------- */
  ar_camera_denied:
    'ᱠᱮᱢᱨᱟ ᱦᱩᱠᱩᱢ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ ᱾ AR ᱛᱟᱞᱤᱢ ᱞᱟᱹᱜᱤᱫ ᱵᱨᱟᱣᱡᱚᱨ ᱥᱮᱴᱤᱝᱥ ᱨᱮ ᱠᱮᱢᱨᱟ ᱵᱚᱞᱚ ᱮᱢ ᱢᱮ ᱾',
  ar_camera_in_use: 'ᱠᱮᱢᱨᱟ ᱮᱴᱟᱜ ᱮᱯ ᱨᱮ ᱠᱟᱹᱢᱤ ᱠᱟᱱᱟ ᱾ ᱚᱱᱟ ᱵᱚᱸᱫᱚᱭ ᱠᱟᱛᱮ ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ ᱢᱮ ᱾',
  ar_camera_missing: 'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱮ ᱠᱮᱢᱨᱟ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ ᱾',
  ar_camera_unknown: 'ᱠᱮᱢᱨᱟ ᱵᱟᱝ ᱮᱦᱚᱵ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾',
  ar_camera_unsupported: 'ᱱᱚᱶᱟ ᱵᱨᱟᱣᱡᱚᱨ ᱠᱮᱢᱨᱟ ᱵᱟᱝ ᱡᱷᱤᱡ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  ar_enable_motion: 'ᱢᱳᱥᱚᱱ ᱵᱚᱞᱚ ᱮᱢ ᱢᱮ',
  ar_generic_zone:
    'ᱱᱚᱶᱟ ᱴᱷᱟᱶ ᱵᱟᱝ ᱥᱠᱮᱱ ᱦᱩᱭ ᱟᱠᱟᱱᱟ ᱾ ᱥᱟᱫᱷᱟᱨᱚᱱ ᱱᱚᱠᱥᱟ ᱩᱫᱩᱜ ᱠᱟᱱᱟ — ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ ᱛᱮ ᱴᱷᱟᱶ ᱥᱟᱡᱟᱣ ᱠᱟᱹᱢᱤ ᱠᱟᱠᱷᱟᱨ ᱢᱮ ᱾',
  ar_no_compass_body:
    'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱮ ᱠᱟᱹᱢᱤᱭᱟᱜ ᱠᱚᱢᱯᱟᱥ ᱵᱟᱝ, ᱚᱱᱟᱛᱮ ᱢᱟᱨᱠᱚᱨ ᱠᱚ ᱥᱟᱹᱨᱤ ᱦᱚᱨ ᱨᱮ ᱵᱟᱝ ᱡᱚᱲᱟᱣ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾ 3D ᱧᱮᱞ ᱚᱱᱟ ᱜᱮ ᱴᱷᱮᱭᱟᱣ ᱠᱚ ᱦᱚᱠᱚᱭᱟ ᱾',
  ar_no_compass_title: 'ᱢᱳᱥᱚᱱ ᱥᱮᱱᱥᱚᱨ ᱵᱟᱝ',
  ar_permission_body: 'ᱡᱟᱜᱨᱩᱠ ᱠᱚᱢᱯᱟᱥ ᱛᱮ ᱡᱚᱠᱷᱚᱢ ᱢᱟᱨᱠᱚᱨ ᱠᱚ ᱥᱟᱹᱨᱤ ᱡᱤᱱᱤᱥ ᱛᱮ ᱩᱫᱩᱜ ᱮᱫᱟᱭ ᱾',
  ar_permission_title: 'ᱢᱳᱥᱚᱱ ᱵᱚᱞᱚ ᱞᱟᱹᱠᱛᱤ',
  ar_relative_heading:
    'ᱠᱚᱢᱯᱟᱥ ᱯᱟᱲᱦᱟᱣ ᱵᱟᱝ — ᱢᱟᱨᱠᱚᱨ ᱠᱚ ᱚᱲᱟᱜᱚᱜᱼᱟ ᱾ ᱢᱟᱲᱟᱝ ᱚᱰᱚᱠ ᱦᱚᱨ ᱛᱮ ᱜᱩᱨᱮᱭ ᱠᱟᱛᱮ ᱫᱚᱦᱲᱟ ᱛᱷᱤᱠ ᱢᱮ ᱾',
  ar_retry: 'ᱠᱮᱢᱨᱟ ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ',

  /* ---------------- assessment / voice input ---------------- */
  as_AUDIO: 'ᱢᱟᱭᱠ ᱵᱟᱝ ᱡᱷᱤᱡ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾',
  as_grade_unknown: 'ᱚᱠᱛᱚ ᱵᱟᱝ ᱞᱮᱠᱷᱟ',
  as_NETWORK: 'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱮ ᱨᱚᱲ ᱵᱟᱰᱟᱭ ᱞᱟᱹᱜᱤᱫ ᱡᱚᱲᱟᱣ ᱞᱟᱹᱠᱛᱤ ᱾',
  as_NO_MATCH: 'ᱵᱟᱝ ᱟᱸᱡᱚᱢ ᱞᱮᱱᱟ ᱾ "ᱢᱤᱫ" ᱥᱮ "ᱵᱟᱨ" ᱨᱚᱲ ᱢᱮ, ᱥᱮ ᱛᱚᱯᱟᱣ ᱢᱮ ᱾',
  as_NO_SPEECH: 'ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ ᱟᱸᱡᱚᱢ ᱞᱮᱱᱟ ᱾ ᱯᱷᱚᱱ ᱱᱟᱜᱟᱢ ᱨᱮ ᱨᱚᱲ ᱢᱮ ᱾',
  as_PERMISSION_DENIED: 'ᱢᱟᱭᱠ ᱦᱩᱠᱩᱢ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ, ᱚᱱᱟᱛᱮ ᱨᱚᱲ ᱛᱮ ᱛᱮᱞᱟ ᱵᱚᱸᱫᱚ ᱾',
  as_UNKNOWN: 'ᱨᱚᱲ ᱵᱚᱞᱚ ᱨᱮ ᱫᱩᱠ ᱦᱩᱭ ᱮᱱᱟ ᱾ ᱛᱚᱯᱟᱣ ᱢᱮ ᱾',
  as_UNSUPPORTED: 'ᱱᱚᱶᱟ ᱵᱨᱟᱣᱡᱚᱨ ᱨᱚᱲ ᱛᱮᱞᱟ ᱵᱟᱝ ᱟᱸᱡᱚᱢ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',

  /* ---------------- buddy drill ---------------- */
  bd_bad_code: 'ᱱᱚᱶᱟ ᱠᱚᱰ ᱵᱟᱝ ᱯᱟᱲᱦᱟᱣ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾ ᱫᱚᱦᱲᱟ ᱥᱠᱮᱱ ᱢᱮ ᱾',
  bd_buddy_score: 'ᱟᱢᱟᱜ ᱡᱚᱲᱟᱣ ᱨᱮᱭᱟᱜ ᱯᱷᱚᱞ',
  bd_checkin_done: 'ᱧᱮᱞ ᱨᱮᱠᱚᱰ ᱦᱩᱭ ᱮᱱᱟ',
  bd_checkin_missed: 'ᱧᱮᱞ ᱵᱟᱹᱰᱨᱟᱹ ᱮᱱᱟ',
  bd_checkins_label: 'ᱧᱮᱞ ᱠᱚ',
  bd_copied: 'ᱠᱚᱯᱤ ᱦᱩᱭ ᱮᱱᱟ',
  bd_copy_code: 'ᱠᱚᱰ ᱠᱚᱯᱤ ᱢᱮ',
  bd_desc:
    'ᱡᱚᱲᱟᱣ ᱥᱤᱥᱴᱚᱢ ᱫᱚ ᱵᱟᱨᱭᱟ ᱦᱚᱲ ᱢᱤᱫ ᱢᱤᱫᱟᱜ ᱧᱮᱞ ᱠᱟᱱᱟ ᱾ ᱱᱚᱶᱟ ᱮᱠᱞᱟ ᱛᱮ ᱵᱟᱝ ᱛᱟᱞᱤᱢ ᱦᱩᱭ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ, ᱚᱱᱟᱛᱮ ᱱᱚᱶᱟ ᱛᱟᱞᱤᱢ ᱞᱟᱹᱜᱤᱫ ᱵᱟᱨᱭᱟ ᱯᱷᱚᱱ ᱞᱟᱹᱠᱛᱤ — ᱤᱱᱴᱚᱨᱱᱮᱴ ᱵᱟᱝ ᱠᱟᱛᱮ, ᱥᱚᱡᱷᱮ ᱡᱚᱲᱟᱣ ᱾',
  bd_end_drill: 'ᱛᱟᱞᱤᱢ ᱢᱩᱪᱟᱹᱫ',
  bd_failed: 'ᱵᱟᱝ ᱡᱚᱲᱟᱣ ᱦᱩᱭ ᱞᱮᱱᱟ',
  bd_failed_hint: 'ᱵᱟᱨᱭᱟ ᱯᱷᱚᱱ ᱢᱤᱫ ᱣᱟᱭᱯᱷᱟᱭ ᱥᱮ ᱦᱚᱴᱥᱯᱚᱴ ᱨᱮ ᱛᱟᱦᱮᱸᱱ ᱞᱟᱹᱠᱛᱤ ᱾ ᱚᱱᱟ ᱧᱮᱞ ᱠᱟᱛᱮ ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ ᱢᱮ ᱾',
  bd_host_step1: 'ᱱᱚᱶᱟ ᱠᱚᱰ ᱟᱢᱟᱜ ᱡᱚᱲᱟᱣ ᱛᱮ ᱩᱫᱩᱜ ᱢᱮ',
  bd_host_step2: 'ᱱᱤᱛᱚᱜ ᱩᱱᱤ ᱩᱫᱩᱜ ᱠᱟᱱ ᱠᱚᱰ ᱥᱠᱮᱱ ᱢᱮ',
  bd_join_step1: 'ᱟᱢᱟᱜ ᱡᱚᱲᱟᱣ ᱨᱮᱭᱟᱜ ᱠᱚᱰ ᱥᱠᱮᱱ ᱢᱮ',
  bd_join_step2: 'ᱱᱚᱶᱟ ᱠᱚᱰ ᱩᱱᱤ ᱛᱮ ᱫᱚᱦᱲᱟ ᱩᱫᱩᱜ ᱢᱮ',
  bd_monitoring_note:
    'ᱦᱩᱥᱤᱭᱟᱨ ᱛᱟᱦᱮᱸᱱ ᱢᱮ ᱾ ᱚᱠᱛᱚ ᱚᱠᱛᱚ ᱨᱮ ᱢᱤᱫ ᱢᱤᱫᱟᱜ ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱠᱟᱠᱷᱟᱨ ᱦᱩᱭᱩᱜᱼᱟ — ᱟᱨ ᱟᱯᱮ ᱠᱷᱚᱱ ᱢᱤᱫ ᱦᱚᱲ ᱨᱮ ᱫᱩᱠ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
  bd_no_webrtc: 'ᱱᱚᱶᱟ ᱵᱨᱟᱣᱡᱚᱨ ᱯᱷᱚᱱ ᱠᱷᱚᱱ ᱯᱷᱚᱱ ᱥᱚᱡᱷᱮ ᱡᱚᱲᱟᱣ ᱵᱟᱝ ᱛᱮᱭᱟᱨ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  bd_notice_time: 'ᱧᱮᱞ ᱚᱠᱛᱚ',
  bd_partial_note:
    'ᱱᱚᱶᱟ ᱛᱟᱞᱤᱢ ᱞᱟᱦᱟ ᱢᱩᱪᱟᱹᱫ ᱮᱱᱟ, ᱚᱱᱟᱛᱮ ᱟᱫᱷᱟ ᱞᱮᱠᱟ ᱨᱮᱠᱚᱰ ᱦᱩᱭ ᱟᱠᱟᱱᱟ ᱟᱨ ᱥᱚᱨᱴᱤᱯᱤᱠᱮᱴ ᱨᱮ ᱵᱟᱝ ᱞᱮᱠᱷᱟᱜᱼᱟ ᱾',
  bd_paste_instead: 'ᱥᱮ ᱠᱚᱰ ᱚᱞ ᱞᱮᱠᱟ ᱮᱢ ᱢᱮ',
  bd_paste_placeholder: 'JGKP1… ᱱᱚᱰᱮ ᱮᱢ ᱢᱮ',
  bd_phase_aborted: 'ᱛᱟᱞᱤᱢ ᱞᱟᱦᱟ ᱢᱩᱪᱟᱹᱫ',
  bd_phase_briefing: 'ᱵᱚᱞᱚ ᱞᱟᱦᱟ',
  bd_phase_debrief: 'ᱛᱟᱞᱤᱢ ᱦᱩᱭ ᱮᱱᱟ',
  bd_phase_distress: 'ᱪᱮᱫ ᱵᱷᱩᱞ ᱠᱟᱱᱟ',
  bd_phase_entry: 'ᱵᱚᱞᱚ ᱫᱩᱣᱟᱹᱨ ᱨᱮ',
  bd_phase_monitoring: 'ᱵᱷᱤᱛᱤᱨ — ᱡᱚᱲᱟᱣ ᱫᱚᱦᱚᱭ ᱢᱮ',
  bd_phase_response: 'ᱛᱮᱞᱟ ᱢᱮ',
  bd_qr_unsupported: 'ᱱᱚᱶᱟ ᱵᱨᱟᱣᱡᱚᱨ QR ᱵᱟᱝ ᱥᱠᱮᱱ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾ ᱠᱚᱰ ᱚᱞ ᱠᱚᱯᱤ ᱠᱟᱛᱮ ᱮᱢ ᱢᱮ ᱾',
  bd_role_casualty: 'ᱵᱷᱤᱛᱤᱨ ᱨᱮᱱ ᱠᱟᱹᱢᱤ ᱦᱚᱲ',
  bd_role_responder: 'ᱧᱮᱞ ᱠᱟᱱ ᱡᱚᱲᱟᱣ',
  bd_same_device: 'ᱢᱤᱫ ᱡᱤᱱᱤᱥ ᱨᱮ ᱛᱟᱞᱤᱢ',
  bd_same_device_note:
    'ᱵᱟᱨᱭᱟ ᱵᱨᱟᱣᱡᱚᱨ ᱴᱮᱵ ᱛᱟᱞᱟ ᱨᱮ ᱛᱟᱞᱤᱢ ᱮᱦᱚᱵᱚᱜᱼᱟ ᱾ ᱦᱚᱨ ᱵᱟᱰᱟᱭ ᱞᱟᱹᱜᱤᱫ ᱵᱮᱥ, ᱢᱮᱱᱠᱷᱟᱱ ᱱᱚᱶᱟ ᱥᱟᱹᱨᱤ ᱵᱟᱨᱭᱟ ᱦᱚᱲ ᱛᱟᱞᱤᱢ ᱵᱟᱝ ᱠᱟᱱᱟ ᱾',
  bd_saved: 'ᱯᱷᱚᱞ ᱟᱢᱟᱜ ᱨᱮᱠᱚᱰ ᱨᱮ ᱥᱟᱸᱪᱟᱣ ᱮᱱᱟ',
  bd_title: 'ᱡᱚᱲᱟᱣ ᱥᱤᱥᱴᱚᱢ ᱛᱟᱞᱤᱢ',
  bd_use_code: 'ᱱᱚᱶᱟ ᱠᱚᱰ ᱵᱮᱵᱷᱟᱨ ᱢᱮ',
  bd_waiting_score: 'ᱟᱢᱟᱜ ᱡᱚᱲᱟᱣ ᱨᱮᱭᱟᱜ ᱯᱷᱚᱞ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱠᱟᱱᱟ…',

  /* ---------------- buddy drill feedback (safety-critical prose) ---------------- */
  buddy_fb_cas_right:
    'ᱴᱷᱤᱠ ᱾ ᱞᱟᱦᱟ ᱛᱮ ᱠᱷᱚᱵᱚᱨ ᱮᱢ ᱜᱮ ᱵᱟᱺᱪᱟᱣ ᱦᱩᱭ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾ ᱡᱟᱦᱟᱸ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ ᱞᱟᱭᱮᱫᱟᱭ, ᱩᱱᱤ ᱧᱟᱢᱚᱜᱼᱟ, ᱵᱟᱺᱪᱟᱣ ᱵᱟᱝ ᱾',
  buddy_fb_cas_wrong:
    'ᱛᱮᱸᱜᱚᱱ ᱡᱟᱭᱜᱟ ᱨᱮ ᱵᱚᱦᱚᱜ ᱜᱩᱨ ᱫᱚ ᱚᱠᱥᱤᱡᱚᱱ ᱠᱚᱢ ᱥᱮ ᱜᱮᱥ ᱛᱮ ᱦᱩᱭᱩᱜᱼᱟ ᱾ ᱚᱱᱟ ᱥᱮᱠᱮᱸᱰ ᱠᱚ ᱜᱮ ᱡᱟᱦᱟᱸ ᱦᱚᱲ ᱛᱮ ᱞᱟᱭ ᱞᱟᱹᱜᱤᱫ ᱢᱤᱫ ᱜᱮ ᱚᱠᱛᱚ ᱛᱟᱦᱮᱸᱠᱟᱱᱟ — ᱚᱱᱟ ᱛᱟᱭᱚᱢ ᱚᱠᱚᱭ ᱦᱚᱸ ᱵᱟᱝ ᱵᱟᱰᱟᱭᱟ ᱡᱮ ᱟᱢ ᱫᱩᱠ ᱨᱮ ᱢᱮᱱᱟᱢᱟ ᱾',
  buddy_fb_entry_right:
    'ᱴᱷᱤᱠ ᱾ ᱡᱟᱭᱜᱟ ᱵᱟᱦᱨᱮ ᱢᱤᱫ ᱧᱮᱞᱚᱜᱤᱡ ᱛᱟᱦᱮᱸᱱ ᱫᱚ ᱠᱟᱱᱩᱱ ᱠᱟᱱᱟ, ᱟᱹᱰᱤ ᱵᱮᱥ ᱠᱟᱹᱢᱤ ᱵᱟᱝ ᱾ ᱩᱱᱤ ᱵᱟᱝ ᱛᱟᱦᱮᱸᱠᱷᱟᱱ ᱚᱠᱚᱭ ᱦᱚᱸ ᱟᱞᱟᱨᱢ ᱵᱟᱝ ᱮᱢ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  buddy_fb_entry_wrong:
    'ᱜᱮᱥ ᱯᱮᱨᱮᱡ ᱡᱟᱭᱜᱟ ᱨᱮ ᱵᱟᱨᱭᱟ ᱦᱚᱲ ᱵᱚᱞᱚ ᱫᱚ ᱵᱟᱨᱭᱟ ᱜᱷᱟᱭᱚᱞ ᱠᱟᱱᱟ ᱾ ᱧᱮᱞᱚᱜᱤᱡ ᱨᱮᱭᱟᱜ ᱢᱩᱬᱩᱛ ᱜᱮ ᱱᱚᱶᱟ ᱠᱟᱱᱟ ᱡᱮ ᱩᱱᱤ ᱵᱟᱦᱨᱮ ᱨᱠᱷᱟ ᱛᱮ ᱛᱟᱦᱮᱸᱱᱟ ᱟᱨ ᱵᱟᱺᱪᱟᱣ ᱠᱟᱠᱷᱟᱨ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  buddy_fb_ppe_right:
    'ᱴᱷᱤᱠ ᱾ ᱜᱮᱥ ᱥᱟᱹᱨᱤ ᱦᱩᱭ ᱛᱟᱭᱚᱢ, ᱚᱱᱟ ᱜᱮᱥ ᱞᱟᱹᱜᱤᱫ ᱥᱟᱶᱦᱮᱫ ᱥᱟᱶᱥ ᱨᱠᱷᱟ ᱡᱚᱛᱚ ᱵᱚᱞᱚ ᱦᱚᱲ ᱞᱟᱹᱜᱤᱫ ᱠᱟᱱᱩᱱ ᱠᱟᱱᱟ ᱾',
  buddy_fb_ppe_wrong:
    'ᱫᱷᱩᱲᱤ ᱢᱟᱥᱠ ᱫᱚ ᱫᱷᱩᱲᱤ ᱪᱷᱟᱱᱟᱣᱮᱫᱟ, ᱜᱮᱥ ᱵᱟᱝ ᱾ ᱜᱮᱥ ᱥᱟᱹᱨᱤ ᱠᱟᱱ ᱛᱮᱸᱜᱚᱱ ᱡᱟᱭᱜᱟ ᱨᱮ ᱱᱚᱶᱟ ᱛᱤᱱᱟᱹᱜ ᱦᱚᱸ ᱨᱠᱷᱟ ᱵᱟᱝ ᱮᱢᱟ — ᱵᱟᱰᱟᱭ ᱞᱟᱦᱟ ᱜᱮ ᱟᱢ ᱜᱤᱛᱤᱡᱚᱜᱼᱟᱢ ᱾',
  buddy_fb_resp1_right:
    'ᱴᱷᱤᱠ ᱾ ᱵᱟᱦᱨᱮ ᱠᱷᱚᱱ ᱟᱞᱟᱨᱢ ᱮᱢ ᱜᱮ ᱢᱤᱫ ᱜᱚᱲᱚ ᱠᱟᱹᱢᱤ ᱠᱟᱱᱟ ᱾ ᱢᱚᱱ ᱨᱮ ᱵᱟᱝ ᱦᱮᱡᱚᱜᱼᱟ ᱢᱮᱱᱠᱷᱟᱱ ᱱᱚᱶᱟ ᱜᱮ ᱟᱯᱮ ᱵᱟᱨᱭᱟ ᱛᱮ ᱵᱟᱺᱪᱟᱣᱮᱫᱟ ᱾',
  buddy_fb_resp1_wrong:
    'ᱱᱚᱶᱟ ᱵᱷᱩᱞ ᱜᱮ ᱢᱤᱫ ᱜᱷᱟᱭᱚᱞ ᱠᱷᱚᱱ ᱵᱟᱨᱭᱟ ᱛᱮᱭᱟᱨᱮᱫᱟ ᱾ ᱛᱮᱸᱜᱚᱱ ᱡᱟᱭᱜᱟ ᱨᱮᱱ ᱟᱭᱢᱟ ᱜᱚᱡᱚᱜ ᱦᱚᱲ ᱫᱚ ᱵᱟᱺᱪᱟᱣ ᱪᱟᱞᱟᱜ ᱦᱚᱲ ᱠᱚ ᱠᱟᱱᱟ ᱾ ᱚᱠᱟ ᱜᱮᱥ ᱟᱢᱟᱜ ᱡᱚᱲᱟᱣ ᱜᱤᱛᱤᱡ ᱠᱮᱫᱮᱭᱟ, ᱚᱱᱟ ᱜᱮᱥ ᱮᱱᱟᱜ ᱥᱮᱠᱮᱸᱰ ᱨᱮ ᱟᱢ ᱦᱚᱸ ᱜᱤᱛᱤᱡ ᱢᱮᱭᱟ ᱾',
  buddy_fb_resp2_right:
    'ᱴᱷᱤᱠ ᱾ ᱵᱚᱞᱚ ᱫᱩᱣᱟᱹᱨ ᱫᱚᱦᱚᱭ ᱟᱨ ᱛᱟᱞᱤᱢ ᱦᱩᱭ ᱠᱟᱱ ᱫᱚᱞ ᱛᱮ ᱠᱷᱚᱵᱚᱨ ᱮᱢ ᱜᱮ ᱡᱟᱥᱛᱤ ᱵᱮᱥ ᱠᱟᱹᱢᱤ ᱠᱟᱱᱟ ᱾ ᱟᱢ ᱜᱮ ᱢᱤᱫ ᱦᱚᱲ ᱠᱟᱱᱟᱢ ᱡᱮ ᱵᱟᱰᱟᱭᱮᱫᱟᱢ ᱩᱱᱤ ᱚᱠᱟ ᱨᱮ ᱜᱤᱛᱤᱡ ᱮᱱᱟᱭ ᱾',
  buddy_fb_resp2_wrong:
    'ᱫᱷᱩᱲᱤ ᱢᱟᱥᱠ ᱜᱮᱥ ᱟᱹᱭᱩᱨ ᱨᱮ ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ ᱠᱟᱹᱢᱤᱭᱟ ᱾ ᱯᱩᱱ ᱢᱤᱱᱤᱴ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱫᱚ ᱟᱹᱰᱤ ᱫᱩᱠ ᱞᱟᱹᱜᱤᱫᱟ, ᱢᱮᱱᱠᱷᱟᱱ ᱨᱠᱷᱟ ᱵᱟᱝ ᱠᱟᱛᱮ ᱵᱚᱞᱚ ᱠᱷᱟᱱ ᱚᱱᱟ ᱢᱤᱫ ᱦᱚᱲ ᱦᱚᱸ ᱪᱟᱞᱟᱜᱼᱟ ᱡᱟᱦᱟᱭ ᱵᱟᱰᱟᱭᱮᱫᱟᱭ ᱡᱚᱲᱟᱣ ᱚᱠᱟ ᱨᱮ ᱢᱮᱱᱟᱭᱟ ᱾',

  /* ---------------- certification ---------------- */
  cert_chain_position: 'ᱞᱮᱡᱚᱨ ᱡᱟᱭᱜᱟ',
  cert_decay_note:
    'ᱱᱚᱶᱟ ᱛᱮᱦᱮᱸᱟᱜ ᱱᱚᱢᱵᱚᱨ ᱠᱟᱱᱟ, ᱯᱟᱥ ᱦᱩᱭ ᱢᱟᱦᱟᱸ ᱨᱮᱭᱟᱜ ᱵᱟᱝ ᱾ ᱫᱚᱦᱲᱟ ᱛᱟᱞᱤᱢ ᱵᱟᱹᱰᱨᱟᱹ ᱠᱷᱟᱱ ᱱᱚᱶᱟ ᱠᱚᱢ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
  cert_desc: 'ᱡᱟᱹᱨᱩᱭ ᱦᱩᱭᱩᱜ ᱠᱟᱱ QR ᱯᱚᱨᱢᱟᱱ ᱞᱟᱹᱜᱤᱫ ᱡᱚᱛᱚ 5 ᱨᱠᱷᱟ ᱮᱞᱟᱠᱟ ᱯᱟᱥ ᱢᱮ ᱾',
  cert_domains_passed: 'ᱯᱟᱥ ᱮᱞᱟᱠᱟ',
  cert_eligible_title: 'ᱟᱢ ᱞᱟᱭᱠᱚ ᱠᱟᱱᱟᱢ! ᱟᱢᱟᱜ ᱯᱚᱨᱢᱟᱱ ᱛᱮᱭᱟᱨ ᱢᱮ',
  cert_existing_note: 'ᱟᱢᱟᱜ ᱯᱚᱨᱢᱟᱱ ᱢᱮᱱᱟᱜᱼᱟ ᱾ ᱫᱚᱦᱲᱟ ᱮᱢ ᱠᱷᱟᱱ ᱱᱟᱶᱟ ᱛᱮᱭᱟᱨᱤ ᱨᱮᱠᱚᱰ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
  cert_eyebrow: 'ᱥᱚᱨᱴᱤᱯᱤᱠᱮᱴ',
  cert_issue_again: 'ᱱᱟᱶᱟ ᱯᱚᱨᱢᱟᱱ ᱮᱢ ᱢᱮ',
  cert_issue_btn: 'ᱯᱚᱨᱢᱟᱱ ᱛᱮᱭᱟᱨ ᱢᱮ',
  cert_issued_label: 'ᱯᱚᱨᱢᱟᱱ ᱮᱢ ᱮᱱᱟ',
  cert_not_attempted: 'ᱵᱟᱝ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱞᱮᱱᱟ',
  cert_not_eligible: 'ᱟᱢᱟᱜ ᱯᱚᱨᱢᱟᱱ ᱞᱟᱹᱜᱤᱫ ᱡᱚᱛᱚ ᱮᱞᱟᱠᱟ ᱯᱩᱨᱟᱹᱣ ᱟᱨ ᱯᱟᱥ ᱢᱮ ᱾ ᱱᱚᱰᱮ ᱪᱟᱞᱟᱜ ᱢᱮ:',
  cert_pass_threshold: 'ᱯᱟᱥ ᱥᱤᱢᱟ:',
  cert_prev_hash: 'ᱡᱚᱲᱟᱣ ᱠᱟᱱᱟ',
  cert_print: 'ᱯᱨᱤᱱᱴ / PDF ᱥᱟᱸᱪᱟᱣ',
  cert_record_hash: 'ᱨᱮᱠᱚᱰ ᱦᱮᱥ',
  cert_retry_needed: 'ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱞᱟᱹᱠᱛᱤ',
  cert_sign_in_first: 'ᱯᱚᱨᱢᱟᱱ ᱦᱟᱛᱟᱣ ᱞᱟᱹᱜᱤᱫ ᱵᱚᱞᱚᱭ ᱢᱮ',
  cert_sign_in_why:
    'ᱯᱚᱨᱢᱟᱱ ᱨᱮ ᱢᱤᱫ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱨᱮᱭᱟᱜ ᱧᱩᱛᱩᱢ ᱛᱟᱦᱮᱸᱱᱟ, ᱚᱱᱟᱛᱮ ᱵᱚᱞᱚ ᱨᱮᱠᱚᱰ ᱞᱟᱹᱠᱛᱤ, ᱧᱩᱛᱩᱢ ᱵᱟᱝ ᱠᱟᱱ ᱥᱮᱥᱚᱱ ᱵᱟᱝ ᱾',
  cert_title: 'ᱟᱢᱟᱜ ᱨᱠᱷᱟ ᱯᱚᱨᱢᱟᱱ',
  cert_view_verification: 'ᱡᱟᱹᱨᱩᱭ ᱥᱟᱦᱴᱟ ᱧᱮᱞ ᱢᱮ',
  cert_weak_crypto:
    'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱦᱟᱨᱰᱣᱮᱨ ᱛᱚᱨᱟᱦ ᱥᱩᱦᱤ ᱵᱟᱝ ᱵᱮᱵᱷᱟᱨ ᱫᱟᱲᱮ ᱞᱮᱱᱟ, ᱚᱱᱟᱛᱮ ᱱᱚᱰᱮ ᱠᱷᱚᱱ ᱮᱢ ᱠᱟᱱ ᱯᱚᱨᱢᱟᱱ ᱨᱮᱭᱟᱜ ᱥᱩᱦᱤ ᱞᱟᱲᱟᱭ ᱾ ᱡᱟᱹᱨᱩᱭ ᱫᱚ ᱛᱟᱦᱮᱸᱱ ᱦᱚᱸ ᱦᱟᱹᱴᱤᱧ ᱵᱟᱰᱟᱭᱮᱫᱟ ᱾',
  ch_decay_label: 'ᱫᱚᱦᱲᱟ ᱵᱟᱝ ᱛᱟᱞᱤᱢ ᱠᱷᱟᱱ ᱛᱮᱭᱟᱨᱤ',
  ch_falls_below: 'ᱯᱟᱥ ᱱᱚᱢᱵᱚᱨ ᱠᱷᱚᱱ ᱞᱟᱛᱟᱨ ᱜᱤᱛᱤᱡᱚᱜᱼᱟ',

  /* ---------------- chain verification ---------------- */
  chain_BAD_HASH: 'ᱥᱩᱦᱤ ᱛᱟᱭᱚᱢ ᱨᱮᱠᱚᱰ ᱵᱚᱫᱚᱞ ᱮᱱᱟ',
  chain_BAD_SIGNATURE: 'ᱥᱩᱦᱤ ᱵᱟᱝ ᱡᱟᱹᱨᱩᱭ ᱦᱩᱭ ᱞᱮᱱᱟ',
  chain_BROKEN_LINK: 'ᱨᱮᱠᱚᱰ ᱟᱭᱟᱜ ᱞᱟᱦᱟᱛᱮ ᱵᱟᱝ ᱡᱚᱲᱟᱣ ᱠᱟᱱᱟ',
  chain_DOMAIN_MISMATCH: 'ᱨᱮᱠᱚᱰ ᱮᱴᱟᱜ ᱮᱞᱟᱠᱟ ᱨᱮᱭᱟᱜ ᱠᱟᱱᱟ',
  chain_FORK: 'ᱵᱟᱨᱭᱟ ᱨᱮᱠᱚᱰ ᱢᱤᱫ ᱜᱮ ᱡᱟᱭᱜᱟ ᱫᱟᱵᱤ ᱮᱫᱟ',
  chain_SEQ_GAP: 'ᱠᱨᱚᱢ ᱨᱮ ᱢᱤᱫ ᱨᱮᱠᱚᱰ ᱵᱟᱝ ᱢᱮᱱᱟᱜᱼᱟ',
  chain_UNKNOWN_SIGNER: 'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱵᱟᱝ ᱵᱟᱰᱟᱭ ᱠᱟᱱ ᱡᱤᱱᱤᱥ ᱛᱮ ᱥᱩᱦᱤ ᱦᱩᱭ ᱟᱠᱟᱱᱟ',
  chain_UNSUPPORTED_VERSION: 'ᱨᱮᱠᱚᱰ ᱱᱟᱶᱟ ᱯᱷᱚᱨᱢᱮᱴ ᱨᱮ ᱢᱮᱱᱟᱜᱼᱟ',

  /* ---------------- assistant ---------------- */
  chat_greeting:
    'ᱡᱚᱦᱟᱨ! ᱤᱧ ᱡᱟᱜᱨᱩᱠ ᱜᱚᱲᱚ ᱠᱟᱱᱟᱹᱧ ᱾ ᱱᱚᱶᱟ ᱮᱯ ᱪᱮᱫ ᱞᱮᱠᱟ ᱠᱟᱹᱢᱤᱭᱟ — AR ᱛᱟᱞᱤᱢ, ᱚᱠᱛᱚ ᱞᱮᱠᱷᱟ, ᱡᱚᱲᱟᱣ ᱛᱟᱞᱤᱢ, ᱯᱚᱨᱢᱟᱱ, ᱡᱚᱠᱷᱚᱢ ᱠᱷᱚᱵᱚᱨ, ᱥᱮ ᱡᱟᱦᱟᱸ ᱠᱟᱛᱷᱟ ᱵᱟᱝ ᱵᱩᱡᱷᱟᱹᱣ ᱠᱷᱟᱱ — ᱤᱧ ᱛᱮ ᱠᱩᱠᱞᱤ ᱢᱮ ᱾',
  chat_no_key:
    'ᱢᱟᱲᱟᱝ ᱥᱮᱴᱤᱝᱥ ᱨᱮ ᱢᱤᱫ ᱢᱩᱯᱷᱚᱛ API ᱠᱩᱸᱡᱤ ᱮᱢ ᱢᱮ ᱚᱱᱟᱛᱮ ᱤᱧ ᱛᱮᱞᱟ ᱫᱟᱲᱮᱭᱟᱜᱼᱟᱹᱧ — ᱥᱮᱴᱤᱝᱥ ᱴᱮᱵ ᱛᱮ ᱪᱟᱞᱟᱜ ᱠᱟᱛᱮ Gemini ᱠᱩᱸᱡᱤ ᱮᱢ ᱢᱮ ᱾',
  chat_placeholder: 'ᱱᱚᱶᱟ ᱮᱯ ᱵᱟᱵᱚᱛ ᱠᱩᱠᱞᱤ ᱢᱮ…',

  /* ---------------- activity log ---------------- */
  dash_clear: 'ᱞᱚᱜ ᱯᱷᱟᱹᱨᱪᱟ ᱢᱮ',
  dash_empty: 'ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱠᱟᱹᱢᱤ ᱵᱟᱝ ᱾ ᱟᱢᱟᱜ ᱨᱮᱠᱚᱰ ᱱᱚᱰᱮ ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱡᱚᱠᱷᱚᱢ ᱥᱠᱮᱱ ᱥᱮ ᱥᱮᱱᱟᱨᱤᱭᱚ ᱮᱦᱚᱵ ᱢᱮ ᱾',
  dash_eyebrow: 'ᱞᱟᱦᱟᱱᱛᱤ',
  dash_hazard_scan: 'ᱡᱚᱠᱷᱚᱢ ᱥᱠᱮᱱ',
  dash_scenario_training: 'ᱥᱮᱱᱟᱨᱤᱭᱚ ᱛᱟᱞᱤᱢ',
  dash_sessions: 'ᱥᱮᱥᱚᱱ',

  /* ---------------- dashboard ---------------- */
  db_by_domain: 'ᱨᱠᱷᱟ ᱮᱞᱟᱠᱟ ᱞᱮᱠᱟᱛᱮ',
  db_consistency_hint:
    'ᱡᱟᱦᱟᱸ ᱢᱟᱦᱟᱸ ᱨᱮ ᱦᱩᱰᱤᱧ ᱥᱮᱥᱚᱱ ᱫᱚ ᱢᱤᱫ ᱡᱤᱞᱤᱧ ᱥᱮᱥᱚᱱ ᱠᱷᱚᱱ ᱵᱮᱥ ᱾ ᱱᱚᱢᱵᱚᱨ ᱫᱚ ᱱᱚᱶᱟ ᱛᱟᱞᱟ ᱚᱠᱛᱚ ᱨᱮ ᱛᱮᱞᱟᱭᱮᱫᱟ ᱾',
  db_decayed_from: 'ᱛᱟᱦᱮᱸᱠᱟᱱᱟ',
  db_flagged_slow: 'ᱟᱲᱟᱜ ᱛᱮᱞᱟ ᱞᱟᱹᱜᱤᱫ ᱪᱤᱱᱦᱟᱹ',
  db_last_passed: 'ᱢᱩᱪᱟᱹᱫ ᱯᱟᱥ',
  db_mode_ar: 'AR',
  db_mode_buddy: 'ᱡᱚᱲᱟᱣ',
  db_mode_refresher: 'ᱫᱚᱦᱲᱟ ᱛᱟᱞᱤᱢ',
  db_mode_solo: 'ᱮᱠᱞᱟ',
  db_radar_hint:
    'ᱥᱚᱨᱴᱤᱯᱤᱠᱮᱴ ᱞᱟᱹᱜᱤᱫ ᱢᱚᱬᱮᱭᱟ ᱜᱮ ᱜᱟᱨ ᱠᱷᱚᱱ ᱩᱯᱨᱩᱢ ᱛᱟᱦᱮᱸᱱ ᱞᱟᱹᱠᱛᱤ ᱾ ᱟᱠᱟᱨ ᱨᱮ ᱚᱠᱟ ᱦᱟᱹᱴᱩᱵ ᱟᱠᱟᱱᱟ, ᱟᱶᱜᱟ ᱠᱟᱹᱢᱤ ᱚᱱᱟ ᱜᱮ ᱠᱟᱱᱟ ᱾',
  db_radar_title: 'ᱡᱚᱛᱚ ᱢᱚᱬᱮ ᱮᱞᱟᱠᱟ ᱨᱮ ᱛᱮᱭᱟᱨᱤ',
  db_reaction_hint: 'ᱟᱢ ᱮᱢ ᱠᱟᱱ ᱡᱚᱛᱚ ᱴᱷᱮᱭᱟᱣ, ᱛᱤᱱᱟᱹᱜ ᱞᱚᱜᱚᱱ ᱛᱮ ᱮᱢ ᱠᱮᱫᱟᱢ ᱚᱱᱟ ᱞᱮᱠᱟᱛᱮ ᱡᱟᱨᱣᱟ ᱟᱠᱟᱱᱟ ᱾',
  db_showing: 'ᱩᱫᱩᱜ ᱠᱟᱱᱟ',
  db_storage_temp:
    'ᱱᱚᱶᱟ ᱵᱨᱟᱣᱡᱚᱨ ᱡᱟᱜᱨᱩᱠ ᱛᱮ ᱰᱟᱴᱟ ᱥᱚᱨᱮᱥ ᱛᱮ ᱵᱟᱝ ᱥᱟᱸᱪᱟᱣ ᱮᱢᱟ, ᱚᱱᱟᱛᱮ ᱟᱢᱟᱜ ᱞᱟᱦᱟᱱᱛᱤ ᱱᱚᱶᱟ ᱥᱮᱥᱚᱱ ᱦᱟᱹᱵᱤᱡ ᱜᱮ ᱛᱟᱦᱮᱸᱱᱟ ᱾',

  /* ---------------- errors ---------------- */
  err_attempts_left: 'ᱠᱩᱨᱩᱢᱩᱴᱩ ᱵᱟᱠᱤ',
  err_LOCKED_OUT: 'ᱟᱭᱢᱟ ᱫᱷᱟᱣ ᱵᱷᱩᱞ ᱮᱱᱟ ᱾ ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩ ᱞᱟᱦᱟ ᱛᱷᱤᱨ ᱢᱮ ᱾',
  err_NAME_TOO_LONG: 'ᱱᱚᱶᱟ ᱧᱩᱛᱩᱢ ᱟᱹᱰᱤ ᱡᱤᱞᱤᱧ ᱾',
  err_NAME_TOO_SHORT: 'ᱠᱚᱢ ᱛᱮ ᱠᱚᱢ 2 ᱟᱹᱠᱷᱚᱨ ᱚᱞ ᱢᱮ ᱾',
  err_PHONE_INVALID: '10 ᱮᱞ ᱯᱷᱚᱱ ᱱᱟᱢᱵᱚᱨ ᱚᱞ ᱢᱮ, ᱥᱮ ᱠᱷᱟᱞᱤ ᱵᱟᱰᱟᱭ ᱢᱮ ᱾',
  err_PHONE_TAKEN: 'ᱱᱚᱶᱟ ᱱᱟᱢᱵᱚᱨ ᱱᱚᱶᱟ ᱴᱷᱟᱶ ᱨᱮ ᱢᱟᱲᱟᱝ ᱠᱷᱚᱱ ᱨᱮᱠᱚᱰ ᱟᱠᱟᱱᱟ ᱾',
  err_PIN_FORMAT: 'ᱯᱤᱱ 4 ᱠᱷᱚᱱ 6 ᱮᱞ ᱛᱟᱦᱮᱸᱱ ᱞᱟᱹᱠᱛᱤ ᱾',
  err_PIN_MISMATCH: 'ᱵᱟᱨᱭᱟ ᱯᱤᱱ ᱵᱟᱝ ᱢᱮᱞᱟᱣ ᱠᱟᱱᱟ ᱾',
  err_PIN_TOO_SIMPLE: 'ᱟᱹᱰᱤ ᱥᱚᱦᱚᱡ ᱯᱤᱱ ᱵᱟᱝ ᱵᱟᱪᱷᱟᱣ ᱢᱮ — 1234 ᱥᱮ ᱡᱚᱛᱚ ᱢᱤᱫ ᱮᱞ ᱵᱟᱝ ᱾',
  err_WORKER_NOT_FOUND: 'ᱱᱚᱶᱟ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱨᱮᱠᱚᱰ ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮ ᱵᱟᱝ ᱢᱮᱱᱟᱜᱼᱟ ᱾',

  /* ---------------- gesture ---------------- */
  gesture_degraded: 'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱥᱟᱶ ᱵᱟᱝ ᱮᱢ ᱫᱟᱲᱮᱭᱮᱫᱟ — ᱛᱚᱯᱟᱣ ᱡᱟᱥᱛᱤ ᱞᱚᱜᱚᱱ ᱦᱩᱭᱩᱜᱼᱟ ᱾',
  gesture_error: 'ᱛᱤ ᱴᱨᱮᱠᱤᱝ ᱵᱟᱝ ᱮᱦᱚᱵ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾',
  gesture_idle: 'ᱛᱤ ᱴᱨᱮᱠᱤᱝ ᱵᱚᱸᱫᱚ',
  gesture_loading: 'ᱛᱤ ᱴᱨᱮᱠᱤᱝ ᱞᱟᱫᱮᱫ ᱠᱟᱱᱟ…',
  gesture_model_failed:
    'ᱛᱤ ᱴᱨᱮᱠᱤᱝ ᱢᱳᱰᱮᱞ ᱵᱟᱝ ᱰᱟᱣᱱᱞᱳᱰ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾ ᱢᱤᱫ ᱫᱷᱟᱣ ᱡᱚᱲᱟᱣ ᱢᱮ, ᱚᱱᱟ ᱛᱟᱭᱚᱢ ᱚᱯᱷᱞᱟᱭᱤᱱ ᱠᱟᱹᱢᱤᱭᱟ ᱾',
  gesture_no_camera: 'ᱢᱟᱲᱟᱝ ᱠᱮᱢᱨᱟ ᱵᱟᱝ ᱢᱮᱱᱟᱜᱼᱟ ᱾',
  gesture_permission_denied: 'ᱠᱮᱢᱨᱟ ᱦᱩᱠᱩᱢ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ, ᱚᱱᱟᱛᱮ ᱛᱤ ᱴᱨᱮᱠᱤᱝ ᱵᱚᱸᱫᱚ ᱾',
  gesture_unsupported: 'ᱱᱚᱶᱟ ᱵᱨᱟᱣᱡᱚᱨ ᱛᱤ ᱴᱨᱮᱠᱤᱝ ᱵᱟᱝ ᱮᱦᱚᱵ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',

  /* ---------------- home ---------------- */
  home_cta_scan: 'ᱡᱚᱠᱷᱚᱢ ᱥᱠᱮᱱ ᱢᱮ',
  home_cta_train: 'ᱥᱤᱢᱩᱞᱮᱴᱚᱨ ᱮᱦᱚᱵ ᱢᱮ',
  home_eyebrow: 'ᱡᱷᱟᱲᱠᱷᱚᱸᱰ · ᱠᱷᱟᱰ ᱟᱨ ᱠᱟᱨᱠᱷᱟᱱᱟ ᱨᱠᱷᱟ',
  home_how: 'ᱱᱚᱶᱟ ᱪᱮᱫ ᱞᱮᱠᱟ ᱠᱟᱹᱢᱤᱭᱟ',
  home_l1_body:
    'ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ ᱢᱤᱫ ᱫᱷᱟᱣ ᱪᱤᱱᱦᱟᱹᱭᱮᱫᱟ ᱡᱮ ᱚᱰᱚᱠ ᱟᱨ ᱥᱮᱸᱜᱮᱞ ᱦᱩᱭᱩᱠ ᱚᱠᱟ ᱨᱮ ᱥᱟᱹᱨᱤ ᱢᱮᱱᱟᱜᱼᱟ ᱾ ᱚᱱᱟ ᱛᱟᱭᱚᱢ ᱡᱚᱛᱚ ᱛᱟᱞᱤᱢ ᱡᱚᱠᱷᱚᱢ ᱠᱚ ᱥᱟᱹᱨᱤ ᱦᱚᱨ ᱨᱮ ᱩᱫᱩᱜᱟ, ᱚᱱᱟᱛᱮ ᱟᱢ ᱚᱱᱟ ᱦᱚᱨ ᱜᱮ ᱛᱟᱞᱤᱢᱚᱜᱼᱟᱢ ᱡᱟᱦᱟᱸ ᱛᱮ ᱟᱢ ᱥᱟᱹᱨᱤ ᱛᱮ ᱱᱤᱨᱟᱹᱣᱟᱢ ᱾',
  home_l1_title: 'ᱟᱢᱟᱜ ᱜᱮ ᱦᱚᱨ ᱨᱮ ᱛᱟᱞᱤᱢ',
  home_l2_body:
    'ᱴᱷᱤᱠ ᱛᱮᱞᱟ ᱵᱟᱰᱟᱭ ᱟᱨ ᱚᱱᱟ ᱯᱩᱱ ᱥᱮᱠᱮᱸᱰ ᱨᱮ ᱮᱢ ᱫᱚ ᱢᱤᱫ ᱠᱟᱛᱷᱟ ᱵᱟᱝ ᱾ ᱡᱚᱛᱚ ᱴᱷᱮᱭᱟᱣ ᱨᱮᱭᱟᱜ ᱚᱠᱛᱚ ᱞᱮᱠᱷᱟᱜᱼᱟ, ᱟᱨ ᱴᱷᱤᱠ ᱢᱮᱱᱠᱷᱟᱱ ᱟᱲᱟᱜ ᱛᱮᱞᱟ ᱫᱚ ᱪᱩᱯ ᱠᱟᱛᱮ ᱯᱟᱥ ᱵᱟᱝ, ᱫᱚᱦᱲᱟ ᱞᱟᱹᱜᱤᱫ ᱪᱤᱱᱦᱟᱹᱜᱼᱟ ᱾',
  home_l2_title: 'ᱥᱟᱹᱨᱤ ᱡᱚᱠᱷᱚᱢ ᱞᱮᱠᱟ ᱚᱠᱛᱚ',
  home_l3_body:
    'ᱡᱚᱛᱚ ᱯᱚᱨᱢᱟᱱ ᱟᱭᱟᱜ ᱞᱟᱦᱟᱛᱮ ᱠᱨᱤᱯᱴᱳ ᱦᱮᱥ ᱛᱮ ᱡᱚᱲᱟᱣ ᱟᱠᱟᱱᱟ ᱾ QR ᱨᱮ ᱡᱚᱛᱚ ᱥᱩᱦᱤ ᱨᱮᱠᱚᱰ ᱛᱟᱦᱮᱸᱱᱟ, ᱚᱱᱟᱛᱮ ᱧᱮᱞᱚᱜᱤᱡ ᱠᱷᱟᱰ ᱢᱩᱦᱟᱹᱲ ᱨᱮ ᱛᱮᱸᱜᱚ ᱠᱟᱛᱮ ᱥᱤᱜᱱᱟᱞ ᱵᱟᱝ ᱠᱟᱛᱮ ᱦᱚᱸ ᱡᱟᱹᱨᱩᱭ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  home_l3_title: 'ᱚᱱᱟ ᱯᱚᱨᱢᱟᱱ ᱡᱟᱦᱟᱸ ᱪᱩᱯ ᱠᱟᱛᱮ ᱵᱟᱝ ᱵᱚᱫᱚᱞ ᱦᱩᱭᱩᱜᱼᱟ',
  home_l4_body:
    'ᱛᱟᱞᱤᱢ ᱛᱟᱭᱚᱢ ᱢᱤᱫ ᱴᱟᱲᱟᱝ ᱨᱮ ᱵᱚᱸᱫᱚ ᱚᱰᱚᱠ ᱧᱮᱞ ᱠᱮᱫᱟᱢ? ᱢᱤᱫ ᱯᱷᱚᱴᱚ ᱟᱨ ᱢᱤᱫ ᱛᱚᱯᱟᱣ ᱛᱮ ᱚᱱᱟ ᱨᱠᱷᱟ ᱚᱯᱷᱤᱥᱚᱨ ᱨᱮᱭᱟᱜ ᱵᱚᱨᱰ ᱨᱮ ᱮᱦᱚᱵᱚᱜᱼᱟ ᱾ ᱫᱚᱦᱲᱟ ᱛᱟᱞᱤᱢ ᱵᱟᱹᱰᱨᱟᱹ ᱠᱷᱟᱱ ᱛᱮᱭᱟᱨᱤ ᱦᱚᱸ ᱠᱚᱢ ᱦᱩᱭᱩᱜᱼᱟ, ᱚᱱᱟᱛᱮ ᱯᱚᱨᱢᱟᱱ ᱨᱮᱭᱟᱜ ᱢᱩᱬᱩᱛ ᱛᱮᱦᱮᱸᱟᱜ ᱠᱟᱹᱢᱤ ᱠᱟᱱᱟ, ᱞᱟᱦᱟᱨᱮᱱ ᱢᱟᱦᱟᱸ ᱵᱟᱝ ᱾',
  home_l4_title: 'ᱡᱚᱛᱚ ᱛᱟᱞᱤᱢ ᱦᱩᱭ ᱠᱟᱱ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱢᱤᱫ ᱥᱮᱱᱥᱚᱨ ᱦᱩᱭᱩᱜᱼᱟ',
  home_problem_ref:
    'SIH ᱫᱩᱠ ᱠᱟᱛᱷᱟ 26041 ᱞᱟᱹᱜᱤᱫ ᱛᱮᱭᱟᱨ — ᱡᱷᱟᱲᱠᱷᱚᱸᱰ ᱥᱚᱨᱠᱟᱨ, ᱩᱯᱨᱩᱢ ᱟᱨ ᱴᱮᱠᱱᱤᱠᱟᱞ ᱥᱮᱪᱮᱫ ᱵᱤᱵᱷᱟᱜ ᱾',
  home_stat1_l:
    'ᱟᱭᱢᱟ ᱠᱷᱟᱰ ᱟᱨ ᱠᱟᱨᱠᱷᱟᱱᱟ ᱡᱚᱠᱷᱚᱢ ᱫᱚ ᱚᱱᱟ ᱡᱚᱠᱷᱚᱢ ᱥᱟᱶ ᱡᱚᱲᱟᱣ ᱠᱟᱱᱟ ᱡᱟᱦᱟᱸ ᱡᱟᱦᱟᱭ ᱟᱹᱰᱤ ᱞᱟᱦᱟ ᱛᱮ ᱵᱟᱰᱟᱭ ᱠᱮᱫᱟᱭ — ᱥᱮ ᱛᱤᱱᱟᱹᱜ ᱦᱚᱸ ᱵᱟᱝ ᱾',
  home_stat1_n: 'ᱨᱚᱠᱚᱴ ᱦᱩᱭ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ',
  home_stat2_l:
    'ᱮᱱᱟᱜ ᱜᱮ ᱞᱚᱜᱚᱱ ᱛᱮ ᱢᱤᱫ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱡᱷᱤᱡ ᱛᱟᱨ, ᱜᱟᱨᱰ ᱵᱟᱝ ᱠᱟᱱ ᱢᱮᱥᱤᱱ, ᱥᱮ ᱵᱟᱝ ᱠᱟᱱ ᱜᱮᱥ ᱟᱞᱟᱨᱢ ᱵᱟᱰᱟᱭ ᱞᱟᱹᱠᱛᱤ ᱾',
  home_stat2_n: 'ᱥᱮᱠᱮᱸᱰ',
  home_stat3_l:
    'ᱡᱟᱦᱟᱸ AR ᱦᱮᱰᱥᱮᱴ ᱵᱟᱝ, ᱡᱟᱦᱟᱸ ᱥᱤᱢᱩᱞᱮᱴᱚᱨ ᱞᱮᱵ ᱵᱟᱝ ᱾ ᱢᱤᱫ ᱯᱷᱚᱱ ᱠᱮᱢᱨᱟ ᱟᱨ ᱢᱤᱫ AI ᱧᱮᱞᱚᱜᱤᱡ ᱚᱱᱟ ᱠᱟᱹᱢᱤ ᱠᱚ ᱠᱟᱹᱢᱤᱭᱮᱫᱟ ᱡᱟᱦᱟᱸ ᱠᱞᱟᱥᱨᱩᱢ ᱵᱟᱝ ᱦᱩᱭ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  home_stat3_n: 'ᱡᱟᱦᱟᱸ ᱠᱷᱚᱨᱚᱪ ᱵᱟᱝ',
  home_step1_b:
    'ᱥᱟᱹᱨᱤ ᱠᱟᱹᱢᱤ ᱡᱟᱭᱜᱟ, ᱥᱮ ᱛᱟᱞᱤᱢ ᱯᱷᱚᱴᱚ ᱦᱟᱛᱟᱣ ᱢᱮ ᱾ ᱟᱞᱮᱭᱟᱜ AI ᱧᱮᱞᱚᱜᱤᱡ ᱚᱱᱟ ᱠᱷᱟᱰ ᱟᱨ ᱠᱟᱨᱠᱷᱟᱱᱟ ᱨᱠᱷᱟ ᱠᱟᱱᱩᱱ ᱥᱟᱶ ᱧᱮᱞᱮᱫᱟ ᱾',
  home_step1_e: 'ᱢᱤᱫ ᱫᱷᱟᱯ',
  home_step1_t: 'ᱟᱢᱟᱜ ᱠᱮᱢᱨᱟ ᱩᱫᱩᱜ ᱢᱮ',
  home_step2_b:
    'ᱡᱚᱠᱷᱚᱢ ᱠᱚ ᱪᱤᱛᱟᱹᱨ ᱨᱮ ᱜᱮ ᱡᱚᱠᱷᱚᱢ ᱢᱟᱨᱟᱝ ᱟᱨ ᱥᱚᱦᱚᱡ ᱟᱹᱲᱟᱹ ᱛᱮ ᱪᱤᱱᱦᱟᱹᱜᱼᱟ — ᱦᱮᱞᱢᱮᱴ ᱵᱟᱝ, ᱛᱟᱨ ᱡᱷᱤᱡ, ᱜᱟᱨᱰ ᱚᱜᱟᱲ ᱟᱠᱟᱱᱟ ᱾',
  home_step2_e: 'ᱵᱟᱨ ᱫᱷᱟᱯ',
  home_step2_t: 'ᱧᱮᱞ ᱢᱮ ᱱᱚᱶᱟ ᱪᱮᱫ ᱧᱮᱞᱮᱫᱟ',
  home_step3_b:
    'ᱢᱤᱫ ᱨᱚᱲ ᱛᱮ ᱦᱚᱠᱚᱭ ᱠᱟᱱ AI ᱛᱟᱞᱤᱢᱤᱭᱟᱹ ᱥᱟᱶ ᱦᱟᱹᱴᱤᱧ ᱦᱟᱹᱴᱤᱧ ᱥᱟᱯᱷᱴ ᱟᱨ ᱠᱟᱨᱠᱷᱟᱱᱟ ᱥᱮᱱᱟᱨᱤᱭᱚ ᱮᱦᱚᱵ ᱢᱮ, ᱡᱟᱦᱟᱸ ᱟᱢᱟᱜ ᱵᱟᱪᱷᱟᱣ ᱨᱮ ᱚᱱᱟ ᱚᱠᱛᱚ ᱨᱮ ᱜᱮ ᱛᱮᱞᱟᱭᱮᱫᱟ ᱾',
  home_step3_e: 'ᱯᱮ ᱫᱷᱟᱯ',
  home_step3_t: 'ᱛᱮᱞᱟ ᱛᱟᱞᱤᱢ ᱢᱮ',
  home_title_1: 'ᱡᱚᱛᱚ ᱥᱤᱯᱷᱴ',
  home_title_2: 'ᱢᱩᱪᱟᱹᱫ ᱦᱩᱭ ᱞᱟᱹᱠᱛᱤ',
  home_title_3: 'ᱢᱤᱫ ᱜᱮ ᱞᱮᱠᱟᱛᱮ ᱾',

  /* ---------------- hazard reporting ---------------- */
  hz_cat_loto: 'ᱞᱚᱠᱟᱣᱴ ᱵᱟᱝ ᱠᱟᱛᱮ ᱠᱟᱹᱢᱤ',
  hz_location_note: 'GPS ᱡᱟᱭᱜᱟ ᱨᱮ ᱦᱚᱨ ᱨᱮᱠᱚᱰ ᱦᱩᱭᱩᱜᱼᱟ, ᱪᱮᱫᱟᱜ ᱥᱮ GPS ᱞᱟᱛᱟᱨ ᱨᱮ ᱵᱟᱝ ᱠᱟᱹᱢᱤᱭᱟ ᱾',
  hz_MIC_DENIED: 'ᱢᱟᱭᱠ ᱦᱩᱠᱩᱢ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ ᱾',
  hz_MIC_UNSUPPORTED: 'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱚᱲ ᱵᱟᱝ ᱨᱮᱠᱚᱰ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  hz_no_direction: 'ᱦᱚᱨ ᱵᱟᱝ ᱢᱮᱱᱟᱜᱼᱟ',
  hz_none_yet: 'ᱟᱢ ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ ᱠᱷᱚᱵᱚᱨ ᱮᱢ ᱠᱮᱫᱟᱢ ᱾',
  hz_note_optional: 'ᱢᱤᱫ ᱠᱟᱛᱷᱟ ᱮᱢ ᱢᱮ (ᱢᱚᱬᱮ ᱛᱮ)',
  hz_note_placeholder: 'ᱴᱷᱤᱠ ᱚᱠᱟ ᱨᱮ, ᱟᱨ ᱪᱮᱫ ᱵᱷᱩᱞ ᱠᱟᱱᱟ?',
  hz_photo_failed: 'ᱱᱚᱶᱟ ᱪᱤᱛᱟᱹᱨ ᱵᱟᱝ ᱯᱟᱲᱦᱟᱣ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾ ᱮᱴᱟᱜ ᱯᱷᱚᱴᱚ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ ᱢᱮ ᱾',
  hz_photo_optional: 'ᱯᱷᱚᱴᱚ ᱜᱚᱲᱚᱭᱟ ᱢᱮᱱᱠᱷᱟᱱ ᱞᱟᱹᱠᱛᱤ ᱵᱟᱝ',
  hz_RECORD_FAILED: 'ᱨᱮᱠᱚᱰᱤᱝ ᱵᱟᱝ ᱦᱩᱭ ᱞᱮᱱᱟ ᱾ ᱫᱚᱦᱲᱟ ᱠᱩᱨᱩᱢᱩᱴᱩᱭ ᱢᱮ ᱾',
  hz_status_acknowledged: 'ᱨᱠᱷᱟ ᱚᱯᱷᱤᱥᱚᱨ ᱧᱮᱞ ᱠᱮᱫᱟᱭ',
  hz_status_dismissed: 'ᱠᱟᱹᱢᱤ ᱵᱟᱝ ᱠᱟᱛᱮ ᱵᱚᱸᱫᱚ',
  hz_storage_full:
    'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮ ᱡᱟᱭᱜᱟ ᱵᱟᱝ, ᱚᱱᱟᱛᱮ ᱠᱷᱚᱵᱚᱨ ᱱᱚᱶᱟ ᱥᱮᱥᱚᱱ ᱦᱟᱹᱵᱤᱡ ᱜᱮ ᱛᱟᱦᱮᱸᱱᱟ ᱾ ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ ᱛᱮ ᱞᱟᱦᱟ ᱥᱤᱸᱠ ᱠᱟᱠᱷᱟᱨ ᱢᱮ ᱾',
  hz_submitting: 'ᱠᱩᱞ ᱠᱟᱱᱟ…',
  hz_voice_remove: 'ᱨᱚᱲ ᱚᱜᱟᱲ ᱢᱮ',
  hz_zone_label: 'ᱡᱚᱱ',

  /* ---------------- scenario list ---------------- */
  list_desc:
    'ᱥᱟᱹᱨᱤ ᱠᱷᱟᱰ ᱟᱨ ᱠᱟᱨᱠᱷᱟᱱᱟ ᱠᱟᱛᱷᱟ ᱠᱷᱚᱱ ᱛᱮᱭᱟᱨ ᱦᱟᱹᱴᱤᱧ ᱦᱟᱹᱴᱤᱧ, ᱨᱚᱲ ᱛᱮ ᱦᱚᱠᱚᱭ ᱠᱟᱱ ᱥᱮᱱᱟᱨᱤᱭᱚ ᱾ ᱡᱚᱛᱚ ᱵᱟᱪᱷᱟᱣ ᱨᱮᱭᱟᱜ ᱱᱚᱢᱵᱚᱨ ᱦᱩᱭᱩᱜᱼᱟ — ᱱᱚᱶᱟ ᱟᱢᱟᱜ ᱨᱠᱷᱟ ᱛᱮᱞᱟ ᱨᱮᱭᱟᱜ ᱡᱟᱹᱨᱩᱭ ᱠᱟᱱᱟ ᱾',
  list_eyebrow: 'ᱥᱤᱢᱩᱞᱮᱴᱚᱨ',
  list_points: 'ᱴᱷᱮᱭᱟᱣ ᱴᱷᱟᱶ',
  list_title: 'ᱢᱤᱫ ᱥᱮᱱᱟᱨᱤᱭᱚ ᱵᱟᱪᱷᱟᱣ ᱢᱮ',

  /* ---------------- onboarding ---------------- */
  ob_continue_guest: 'ᱵᱚᱞᱚ ᱵᱟᱝ ᱠᱟᱛᱮ ᱟᱶᱜᱟ ᱪᱟᱞᱟᱜ ᱢᱮ',
  ob_guest_note: 'ᱟᱢ ᱠᱷᱟᱛᱟ ᱵᱟᱝ ᱠᱟᱛᱮ ᱦᱚᱸ ᱛᱟᱞᱤᱢ ᱫᱟᱲᱮᱭᱟᱜᱼᱟᱢ, ᱢᱮᱱᱠᱷᱟᱱ ᱯᱚᱨᱢᱟᱱ ᱞᱟᱹᱜᱤᱫ ᱧᱩᱛᱩᱢ ᱠᱟᱱ ᱨᱮᱠᱚᱰ ᱞᱟᱹᱠᱛᱤ ᱾',
  ob_name_placeholder: 'ᱟᱢᱟᱜ ᱡᱚᱛᱚ ᱧᱩᱛᱩᱢ ᱚᱞ ᱢᱮ',
  ob_no_workers: 'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮ ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱚᱠᱚᱭ ᱦᱚᱸ ᱨᱮᱠᱚᱰ ᱵᱟᱝ ᱾',
  ob_phone_why: 'ᱡᱟᱨᱣᱟ ᱯᱷᱚᱱ ᱨᱮ ᱟᱢᱟᱜ ᱨᱮᱠᱚᱰ ᱧᱟᱢ ᱞᱟᱹᱜᱤᱫ ᱜᱮ ᱵᱮᱵᱷᱟᱨᱚᱜᱼᱟ ᱾ ᱛᱤᱱᱟᱹᱜ ᱦᱚᱸ ᱵᱟᱝ ᱠᱩᱞᱚᱜᱼᱟ ᱾',
  ob_pin_why: 'ᱟᱢᱟᱜ ᱯᱤᱱ ᱛᱮ ᱥᱤᱜᱱᱟᱞ ᱵᱟᱝ ᱠᱟᱛᱮ ᱞᱟᱛᱟᱨ ᱨᱮ ᱵᱚᱞᱚ ᱫᱟᱲᱮᱭᱟᱜᱼᱟᱢ ᱾ ᱱᱚᱶᱟ ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮ ᱜᱮ ᱛᱟᱦᱮᱸᱱᱟ ᱾',

  /* ---------------- refresher ---------------- */
  rf_failed: 'ᱯᱟᱥ ᱵᱟᱝ — ᱱᱚᱶᱟ ᱵᱟᱨ ᱢᱟᱦᱟᱸ ᱨᱮ ᱫᱚᱦᱲᱟ ᱦᱮᱡᱚᱜᱼᱟ',
  rf_overdue_by: 'ᱟᱲᱟᱜ ᱦᱩᱭ ᱮᱱᱟ',
  rf_reminders_blocked: 'ᱟᱢᱟᱜ ᱵᱨᱟᱣᱡᱚᱨ ᱥᱮᱴᱤᱝᱥ ᱨᱮ ᱠᱷᱚᱵᱚᱨ ᱵᱚᱸᱫᱚ ᱟᱠᱟᱱᱟ ᱾',
  rf_reminders_on: 'ᱩᱭᱦᱟᱹᱨ ᱦᱚᱪᱚ ᱡᱷᱤᱡ',
  rf_reminders_unsupported: 'ᱱᱚᱶᱟ ᱵᱨᱟᱣᱡᱚᱨ ᱩᱭᱦᱟᱹᱨ ᱦᱚᱪᱚ ᱵᱟᱝ ᱩᱫᱩᱜ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',
  rf_web_limit:
    'ᱩᱭᱦᱟᱹᱨ ᱦᱚᱪᱚ ᱫᱚ ᱮᱯ ᱡᱷᱤᱡ ᱚᱠᱛᱚ ᱩᱫᱩᱜᱚᱜᱼᱟ ᱾ ᱣᱮᱵ ᱥᱟᱦᱴᱟ ᱠᱷᱚᱱ ᱯᱷᱚᱱ ᱚᱠᱛᱚ ᱨᱮ ᱵᱟᱝ ᱩᱠᱩᱢ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ — ᱮᱥᱮᱫ ᱠᱟᱱ Android ᱵᱤᱞᱰ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾',

  /* ---------------- scenario runtime ---------------- */
  sc_complete: 'ᱥᱮᱱᱟᱨᱤᱭᱚ ᱦᱩᱭ ᱮᱱᱟ',
  sc_continue: 'ᱟᱶᱜᱟ ᱪᱟᱞᱟᱜ ᱢᱮ',
  sc_dashboard: 'ᱰᱮᱥᱵᱚᱨᱰ ᱧᱮᱞ ᱢᱮ',
  sc_decision: 'ᱴᱷᱮᱭᱟᱣ',
  sc_finish: 'ᱥᱮᱱᱟᱨᱤᱭᱚ ᱢᱩᱪᱟᱹᱫ ᱢᱮ',
  sc_more: 'ᱟᱨᱦᱚ ᱥᱮᱱᱟᱨᱤᱭᱚ',
  sc_of: 'ᱠᱷᱚᱱ',
  sc_safe: 'ᱨᱠᱷᱟ ᱵᱟᱪᱷᱟᱣ',
  sc_trainer_thinking: 'AI ᱛᱟᱞᱤᱢᱤᱭᱟᱹ ᱵᱷᱟᱵᱤᱡ ᱠᱟᱱᱟ…',
  sc_unsafe: 'ᱵᱟᱝ ᱨᱠᱷᱟ ᱵᱟᱪᱷᱟᱣ',

  /* ---------------- hazard scan ---------------- */
  scan_analyzing: 'ᱧᱮᱞ ᱠᱟᱱᱟ…',
  scan_another: 'ᱮᱴᱟᱜ ᱯᱷᱚᱴᱚ ᱥᱠᱮᱱ ᱢᱮ',
  scan_desc:
    'ᱠᱟᱹᱢᱤ ᱡᱟᱭᱜᱟ ᱨᱮᱭᱟᱜ ᱯᱷᱚᱴᱚ ᱟᱯᱞᱳᱰ ᱥᱮ ᱦᱟᱛᱟᱣ ᱢᱮ ᱾ AI ᱧᱮᱞᱚᱜᱤᱡ ᱪᱤᱛᱟᱹᱨ ᱨᱮ ᱜᱮ ᱡᱚᱠᱷᱚᱢ ᱠᱚ ᱪᱤᱱᱦᱟᱹᱭᱮᱫᱟ, ᱡᱮᱞᱮᱠᱟ ᱨᱠᱷᱟ ᱚᱯᱷᱤᱥᱚᱨ ᱡᱟᱭᱜᱟ ᱧᱮᱞ ᱚᱠᱛᱚ ᱨᱮ ᱠᱟᱹᱢᱤᱭᱮᱫᱟᱭ ᱾',
  scan_eyebrow: 'ᱡᱚᱠᱷᱚᱢ ᱥᱠᱮᱱ',
  scan_hint: 'ᱡᱟᱦᱟᱸ ᱠᱟᱹᱢᱤ ᱡᱟᱭᱜᱟ ᱥᱮ ᱛᱟᱞᱤᱢ ᱯᱷᱚᱴᱚ ᱥᱟᱶ ᱠᱟᱹᱢᱤᱭᱟ ᱾',
  scan_no_hazards: 'ᱡᱟᱦᱟᱸ ᱡᱚᱠᱷᱚᱢ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ ᱾',
  scan_no_key_body: 'ᱧᱮᱞ ᱠᱟᱹᱢᱤ ᱮᱦᱚᱵ ᱞᱟᱹᱜᱤᱫ ᱥᱮᱴᱤᱝᱥ ᱨᱮ ᱢᱤᱫ ᱢᱩᱯᱷᱚᱛ Gemini ᱥᱮ OpenAI ᱠᱩᱸᱡᱤ ᱮᱢ ᱢᱮ ᱾',
  scan_no_key_title: 'API ᱠᱩᱸᱡᱤ ᱵᱟᱝ ᱛᱮᱭᱟᱨ',
  scan_open: 'ᱠᱮᱢᱨᱟ ᱡᱷᱤᱡ / ᱯᱷᱚᱴᱚ ᱟᱯᱞᱳᱰ',
  scan_retake: 'ᱫᱚᱦᱲᱟ ᱦᱟᱛᱟᱣ',
  scan_run: 'AI ᱧᱮᱞ ᱠᱟᱹᱢᱤ ᱮᱦᱚᱵ ᱢᱮ',
  scan_title: 'ᱩᱫᱩᱜ ᱢᱮ ᱾ ᱦᱟᱛᱟᱣ ᱢᱮ ᱾ ᱧᱮᱞ ᱢᱮ ᱾',

  /* ---------------- settings ---------------- */
  set_eyebrow: 'ᱥᱮᱴᱤᱝᱥ',
  set_getting_key: 'ᱢᱩᱯᱷᱚᱛ ᱠᱩᱸᱡᱤ ᱧᱟᱢ ᱦᱚᱨ:',
  set_key_hint1: 'ᱟᱢᱟᱜ ᱵᱨᱟᱣᱡᱚᱨ ᱨᱮᱭᱟᱜ ᱞᱚᱠᱟᱞ ᱥᱴᱳᱨᱮᱡ ᱨᱮ ᱜᱮ ᱥᱟᱸᱪᱟᱣ ᱟᱠᱟᱱᱟ ᱾ ᱱᱚᱶᱟ ᱵᱟᱹᱭᱨᱮ ᱛᱤᱱᱟᱹᱜ ᱦᱚᱸ ᱵᱟᱝ ᱠᱩᱞᱚᱜᱼᱟ',
  set_key_label: 'API ᱠᱩᱸᱡᱤ',
  set_key_placeholder: 'ᱟᱢᱟᱜ API ᱠᱩᱸᱡᱤ ᱮᱢ ᱢᱮ',
  set_language_label: 'ᱮᱯ ᱨᱮᱭᱟᱜ ᱯᱟᱹᱨᱥᱤ',
  set_provider_hint: 'Gemini ᱨᱮᱭᱟᱜ ᱢᱩᱯᱷᱚᱛ ᱴᱤᱭᱟᱨ ᱡᱟᱥᱛᱤ ᱡᱟᱹᱥᱛᱤ — ᱦᱮᱠᱟᱛᱚᱱ ᱰᱮᱢᱳ ᱞᱟᱹᱜᱤᱫ ᱵᱮᱥ ᱾',
  set_provider_label: 'ᱮᱢᱚᱜᱤᱡ',
  set_save: 'ᱥᱮᱴᱤᱝᱥ ᱥᱟᱸᱪᱟᱣ ᱢᱮ',
  set_saved: 'ᱥᱟᱸᱪᱟᱣ ᱮᱱᱟ ✓',
  set_title: 'AI ᱮᱢᱚᱜᱤᱡ',

  /* ---------------- site setup ---------------- */
  site_aim_and_tap: 'ᱡᱤᱱᱤᱥ ᱛᱮ ᱩᱫᱩᱜ ᱢᱮ, ᱚᱱᱟ ᱛᱟᱭᱚᱢ ᱚᱱᱟ ᱪᱮᱫ ᱠᱟᱱᱟ ᱛᱚᱯᱟᱣ ᱢᱮ',
  site_anchors_count: 'ᱢᱟᱨᱠᱚᱨ',
  site_delete_zone: 'ᱡᱚᱱ ᱜᱷᱟᱹᱴᱟᱣ ᱢᱮ',
  site_desc:
    'ᱢᱤᱫ ᱫᱷᱟᱣ ᱡᱟᱭᱜᱟ ᱨᱮ ᱜᱩᱨᱮᱭ ᱠᱟᱛᱮ ᱪᱤᱱᱦᱟᱹ ᱢᱮ ᱡᱮ ᱚᱰᱚᱠ, ᱥᱮᱸᱜᱮᱞ ᱦᱩᱭᱩᱠ ᱟᱨ ᱡᱚᱠᱷᱚᱢ ᱚᱠᱟ ᱨᱮ ᱥᱟᱹᱨᱤ ᱢᱮᱱᱟᱜᱼᱟ ᱾ ᱱᱚᱶᱟ ᱡᱚᱱ ᱨᱮ ᱛᱟᱞᱤᱢ ᱡᱷᱤᱡ ᱠᱟᱱ ᱡᱚᱛᱚ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱚᱱᱟ ᱠᱚ ᱥᱟᱹᱨᱤ ᱦᱚᱨ ᱨᱮ ᱧᱮᱞᱟ ᱾',
  site_export_scan: 'ᱱᱚᱶᱟ ᱥᱠᱮᱱ ᱦᱟᱹᱴᱤᱧ ᱢᱮ',
  site_eyebrow: 'ᱥᱩᱯᱚᱨᱣᱟᱭᱡᱚᱨ',
  site_heading_now: 'ᱦᱚᱨ',
  site_import_done: 'ᱥᱠᱮᱱ ᱞᱟᱫᱮᱫ ᱮᱱᱟ',
  site_import_scan: 'ᱥᱠᱮᱱ ᱞᱟᱫᱮᱫ ᱢᱮ',
  site_marked: 'ᱪᱤᱱᱦᱟᱹ',
  site_name_label: 'ᱴᱷᱟᱶ ᱧᱩᱛᱩᱢ',
  site_new_zone: 'ᱱᱟᱶᱟ ᱡᱚᱱ',
  site_no_zones: 'ᱛᱮᱦᱮᱸ ᱦᱟᱹᱵᱤᱡ ᱡᱟᱦᱟᱸ ᱡᱚᱱ ᱵᱟᱝ ᱾ ᱮᱸᱠᱚᱨ ᱪᱤᱱᱦᱟᱹ ᱮᱦᱚᱵ ᱞᱟᱹᱜᱤᱫ ᱢᱤᱫ ᱛᱮᱭᱟᱨ ᱢᱮ ᱾',
  site_scan_note:
    'ᱢᱟᱨᱠᱚᱨ ᱠᱚ ᱠᱚᱢᱯᱟᱥ ᱦᱚᱨ ᱥᱟᱶ ᱡᱚᱲᱟᱣ ᱟᱠᱟᱱᱟ, ᱞᱟᱛᱟᱨ ᱥᱟᱶ ᱵᱟᱝ ᱾ ᱞᱚᱦᱟ ᱡᱤᱱᱤᱥ ᱠᱚᱢᱯᱟᱥ ᱵᱚᱫᱚᱞ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ — ᱵᱷᱩᱞ ᱧᱮᱞᱚᱜ ᱠᱷᱟᱱ ᱫᱚᱦᱲᱟ ᱛᱷᱤᱠ ᱢᱮ ᱾',
  site_start_marking: 'ᱮᱸᱠᱚᱨ ᱪᱤᱱᱦᱟᱹ ᱢᱮ',
  site_title: 'ᱟᱢᱟᱜ ᱴᱷᱟᱶ ᱥᱠᱮᱱ ᱢᱮ',
  site_zone_name_prompt: 'ᱱᱚᱶᱟ ᱡᱚᱱ ᱨᱮᱭᱟᱜ ᱧᱩᱛᱩᱢ (ᱡᱮᱞᱮᱠᱟ ᱥᱟᱯᱷᱴ ᱠᱚᱨᱤᱰᱚᱨ B)',
  site_zones: 'ᱡᱚᱱ ᱠᱚ',

  /* ---------------- settings hints ---------------- */
  st_ar_hint: '3D ᱢᱳᱰᱮᱞ ᱡᱟᱭᱜᱟ ᱨᱮ ᱟᱢᱟᱜ ᱥᱟᱹᱨᱤ ᱟᱲᱟᱝ ᱨᱮ ᱡᱚᱠᱷᱚᱢ ᱩᱫᱩᱜᱮᱫᱟ ᱾',
  st_ENDPOINT_INVALID: 'ᱱᱚᱶᱟ ᱴᱷᱤᱠ URL ᱵᱟᱝ ᱠᱟᱱᱟ ᱾',
  st_ENDPOINT_NOT_HTTPS: 'ᱟᱯᱞᱳᱰ URL https ᱛᱟᱦᱮᱸᱱ ᱞᱟᱹᱠᱛᱤ ᱾',
  st_gesture_hint:
    'ᱢᱟᱲᱟᱝ ᱠᱮᱢᱨᱟ ᱛᱮ ᱟᱢᱟᱜ ᱛᱤ ᱧᱮᱞᱮᱫᱟ, ᱚᱱᱟᱛᱮ ᱥᱠᱨᱤᱱ ᱵᱟᱝ ᱡᱩᱢᱤᱫ ᱠᱟᱛᱮ ᱵᱟᱪᱷᱟᱣ ᱫᱟᱲᱮᱭᱟᱜᱼᱟᱢ ᱾ ᱢᱤᱫ ᱫᱷᱟᱣ ᱰᱟᱣᱱᱞᱳᱰ ᱞᱟᱹᱠᱛᱤ ᱾',
  st_pictogram_hint: 'ᱚᱞ ᱡᱟᱭᱜᱟ ᱨᱮ ᱨᱠᱷᱟ ᱪᱤᱱᱦᱟᱹ ᱟᱨ ᱨᱚᱲ ᱛᱮ ᱦᱩᱠᱩᱢ ᱩᱫᱩᱜᱮᱫᱟ ᱾',
  st_reset_confirm: 'ᱥᱟᱹᱨᱤ ᱞᱟᱹᱜᱤᱫ ERASE ᱚᱞ ᱢᱮ',
  st_reset_device: 'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱠᱷᱚᱱ ᱡᱚᱛᱚ ᱜᱷᱟᱹᱴᱟᱣ ᱢᱮ',
  st_reset_warning:
    'ᱱᱚᱶᱟ ᱱᱚᱰᱮ ᱥᱟᱸᱪᱟᱣ ᱠᱟᱱ ᱡᱚᱛᱚ ᱠᱟᱹᱢᱤ ᱦᱚᱲ ᱨᱮᱠᱚᱰ, ᱯᱚᱨᱢᱟᱱ ᱟᱨ ᱡᱚᱠᱷᱚᱢ ᱠᱷᱚᱵᱚᱨ ᱜᱷᱟᱹᱴᱟᱣᱮᱫᱟ, ᱥᱩᱦᱤ ᱠᱩᱸᱡᱤ ᱦᱚᱸ ᱾ ᱢᱟᱲᱟᱝ ᱵᱟᱱᱰᱚᱞ ᱵᱟᱦᱨᱮ ᱠᱩᱞ ᱢᱮ ᱾',
  st_sync_hint:
    'ᱱᱚᱶᱟ ᱠᱷᱟᱞᱤ ᱵᱟᱰᱟᱭ ᱢᱮ ᱟᱨ ᱡᱤᱱᱤᱥ ᱠᱷᱚᱱ ᱛᱤᱱᱟᱹᱜ ᱦᱚᱸ ᱵᱟᱦᱨᱮ ᱵᱟᱝ ᱪᱟᱞᱟᱜᱼᱟ ᱾ ᱟᱢᱟᱜ ᱥᱚᱝᱜᱚᱛᱚᱱ ᱨᱮ ᱡᱟᱨᱣᱟ ᱮᱱᱰᱯᱚᱭᱱᱴ ᱢᱮᱱᱟᱜ ᱠᱷᱟᱱ, ᱟᱭᱟᱜ https URL ᱱᱚᱰᱮ ᱮᱢ ᱢᱮ ᱾',
  st_sync_title: 'ᱡᱟᱨᱣᱟ ᱟᱯᱞᱳᱰ (ᱢᱚᱬᱮ ᱛᱮ)',
  st_voice_check: 'ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱮ ᱨᱚᱲ ᱢᱮᱱᱟᱜ ᱵᱟᱝ',
  st_voice_hint: 'ᱛᱚᱯᱟᱣ ᱡᱟᱭᱜᱟ ᱨᱮ "ᱢᱤᱫ" ᱥᱮ "ᱵᱟᱨ" ᱨᱚᱲ ᱢᱮ ᱾ ᱛᱤᱥᱟᱠᱟᱢ ᱦᱚᱸ ᱠᱟᱹᱢᱤᱭᱟ ᱾',
  st_voice_missing: 'ᱡᱟᱦᱟᱸ ᱨᱚᱲ ᱵᱟᱝ ᱮᱥᱮᱫ',

  /* ---------------- verification ---------------- */
  verify_eyebrow: 'ᱯᱚᱨᱢᱟᱱ ᱡᱟᱹᱨᱩᱭ',
  verify_invalid: 'ᱯᱚᱨᱢᱟᱱ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ',
  verify_invalid_desc: 'ᱱᱚᱶᱟ ᱯᱚᱨᱢᱟᱱ ID ᱱᱚᱶᱟ ᱡᱤᱱᱤᱥ ᱨᱮ ᱮᱢ ᱠᱟᱱ ᱡᱟᱦᱟᱸ ᱯᱚᱨᱢᱟᱱ ᱥᱟᱶ ᱵᱟᱝ ᱢᱮᱞᱟᱣ ᱠᱟᱱᱟ ᱾',
  verify_issued: 'ᱮᱢ ᱮᱱᱟ',
  vf_in_ledger: 'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮᱭᱟᱜ ᱞᱮᱡᱚᱨ ᱨᱮ ᱢᱮᱱᱟᱜᱼᱟ ᱟᱨ ᱴᱷᱤᱠ ᱡᱚᱲᱟᱣ ᱟᱠᱟᱱᱟ',
  vf_not_in_ledger: 'ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱨᱮᱭᱟᱜ ᱞᱮᱡᱚᱨ ᱨᱮ ᱵᱟᱝ — QR ᱠᱷᱚᱱ ᱜᱮ ᱡᱟᱹᱨᱩᱭ ᱦᱩᱭ ᱟᱠᱟᱱᱟ',
  vf_paste_placeholder: 'JGK1… ᱱᱚᱰᱮ ᱮᱢ ᱢᱮ',
  vf_scan_or_paste: 'ᱯᱚᱨᱢᱟᱱ QR ᱥᱠᱮᱱ ᱢᱮ, ᱥᱮ ᱟᱭᱟᱜ ᱠᱚᱰ ᱮᱢ ᱢᱮ',
  vf_signer_known: 'ᱥᱩᱦᱤ ᱡᱤᱱᱤᱥ ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱵᱟᱰᱟᱭᱮᱫᱟ',
  vf_signer_unknown:
    'ᱥᱩᱦᱤ ᱴᱷᱤᱠ ᱠᱟᱱᱟ, ᱢᱮᱱᱠᱷᱟᱱ ᱱᱚᱶᱟ ᱯᱷᱚᱱ ᱮᱢᱚᱜᱤᱡ ᱡᱤᱱᱤᱥ ᱵᱟᱝ ᱵᱟᱰᱟᱭᱮᱫᱟ ᱾ ᱢᱟᱱᱟᱣ ᱞᱟᱦᱟ ᱴᱷᱟᱶ ᱥᱟᱹᱨᱤ ᱢᱮ ᱾',
  vf_unreadable: 'ᱱᱚᱶᱟ ᱡᱟᱜᱨᱩᱠ ᱯᱚᱨᱢᱟᱱ ᱵᱟᱝ ᱠᱟᱱᱟ ᱾',
}
