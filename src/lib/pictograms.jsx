// Pictogram set for zero-text mode.
//
// These follow ISO 7010 sign *geometry and colour semantics*, not just "some
// icons": green square for safe condition, red square for fire equipment, red
// circle with a bar for prohibition, yellow triangle for warning, blue circle
// for mandatory action. That matters because these are the same shape/colour
// conventions already painted on the walls of a DGMS-regulated mine, so a
// worker who cannot read still arrives with the vocabulary.
//
// Everything is inline SVG — no icon font, no network fetch, no extra bytes at
// runtime, works offline on first load.

export const SHAPE = {
  SAFE: 'safe', // green square — safe condition / escape
  FIRE: 'fire', // red square — fire-fighting equipment
  PROHIBITION: 'prohibition', // red circle + bar — do not
  WARNING: 'warning', // yellow triangle — hazard
  MANDATORY: 'mandatory', // blue circle — you must
  PLAIN: 'plain', // glyph only
}

const SHAPE_COLOR = {
  [SHAPE.SAFE]: { bg: '#2E7D4F', fg: '#FFFFFF' },
  [SHAPE.FIRE]: { bg: '#D93025', fg: '#FFFFFF' },
  [SHAPE.PROHIBITION]: { bg: '#FFFFFF', fg: '#1C1F22', ring: '#D93025' },
  [SHAPE.WARNING]: { bg: '#FFB020', fg: '#1C1F22' },
  [SHAPE.MANDATORY]: { bg: '#1565C0', fg: '#FFFFFF' },
  [SHAPE.PLAIN]: { bg: 'transparent', fg: '#F2F1ED' },
}

/* ================================================================== */
/* Glyphs — drawn in a 24x24 box, centred                              */
/* ================================================================== */

const G = {
  exit: (c) => (
    <>
      <path d="M4 3h7v2H6v14h5v2H4z" fill={c} />
      <path d="M13 12h6l-2.5-2.5 1.4-1.4L22.3 12l-4.4 4.4-1.4-1.4L19 12.5" fill={c} />
      <circle cx="9" cy="7.5" r="1.4" fill={c} />
      <path d="M8 9.5l2 1v3l1.5 4h-1.5l-1.2-3.2L7 17h-1.5l1.5-4v-2z" fill={c} />
    </>
  ),
  exitArrow: (c) => <path d="M4 11h10.2l-3.6-3.6L12 6l6 6-6 6-1.4-1.4L14.2 13H4z" fill={c} />,
  // U-turn, for "you are facing the wrong way". Drawn rather than reusing the
  // warning triangle, because Pictogram falls back to `warning` for unknown
  // names and a silent fallback would have hidden the missing glyph.
  uTurn: (c) => (
    <>
      <path
        d="M6.6 19V11a5.4 5.4 0 0 1 10.8 0v2.6"
        fill="none"
        stroke={c}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M17.4 19.4L13.9 13.2h7z" fill={c} />
    </>
  ),
  fire: (c) => (
    <path
      d="M12 2s5.2 4.6 5.2 9.4A5.2 5.2 0 0 1 6.8 11.4c0-2 1-3.6 2.1-4.7 0 1.6.5 2.6 1.6 3.1-.1-2.6 1.5-5.5 1.5-7.8z"
      fill={c}
    />
  ),
  extinguisher: (c) => (
    <>
      <rect x="9" y="7" width="6" height="13" rx="1.6" fill={c} />
      <rect x="10.6" y="4" width="2.8" height="3" fill={c} />
      <path d="M13.4 5h4l-1 2h-3z" fill={c} />
      <rect x="8" y="11" width="8" height="1.6" fill={SHAPE_COLOR[SHAPE.FIRE].bg} opacity="0.35" />
    </>
  ),
  gasMask: (c) => (
    <>
      <path d="M12 3c4 0 6.5 2.4 6.5 5.6 0 3.4-2.6 6.4-6.5 6.4S5.5 12 5.5 8.6C5.5 5.4 8 3 12 3z" fill={c} />
      <circle cx="9.6" cy="8" r="1.5" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} />
      <circle cx="14.4" cy="8" r="1.5" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} />
      <rect x="10.4" y="14" width="3.2" height="3" fill={c} />
      <rect x="9" y="16.6" width="6" height="4.4" rx="1" fill={c} />
    </>
  ),
  dustMask: (c) => (
    <>
      <path d="M4 9c2.6-1.6 5.2-2.4 8-2.4S17.4 7.4 20 9v2.6c0 3.4-3.6 6.4-8 6.4s-8-3-8-6.4z" fill={c} />
      <path d="M4 11.4h16" stroke={SHAPE_COLOR[SHAPE.MANDATORY].bg} strokeWidth="1.2" />
      <path d="M2 8l2.4 1.4M22 8l-2.4 1.4" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  helmet: (c) => (
    <>
      <path d="M4 15a8 8 0 0 1 16 0z" fill={c} />
      <rect x="2.5" y="15" width="19" height="2.6" rx="1.3" fill={c} />
      <path d="M11 7.2h2V15h-2z" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} opacity="0.5" />
    </>
  ),
  gloves: (c) => (
    <>
      <path d="M7 21V10.5a1.5 1.5 0 0 1 3 0V8a1.5 1.5 0 0 1 3 0v2.5a1.5 1.5 0 0 1 3 0V13l1.6 1.6a2 2 0 0 1 .4 2.2L17 21z" fill={c} />
      <path d="M7 12.5H5.6a1.6 1.6 0 0 0 0 3.2H7z" fill={c} />
    </>
  ),
  goggles: (c) => (
    <>
      <rect x="3" y="8.5" width="18" height="7" rx="3.4" fill={c} />
      <circle cx="8.5" cy="12" r="2.1" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} />
      <circle cx="15.5" cy="12" r="2.1" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} />
      <path d="M1 10.5h2v3H1zM21 10.5h2v3h-2z" fill={c} />
    </>
  ),
  handStop: (c) => (
    <path
      d="M8 21v-6.6L6.2 12a1.4 1.4 0 0 1 2.2-1.7l.6.7V4.4a1.4 1.4 0 0 1 2.8 0V9h.4V3.4a1.4 1.4 0 0 1 2.8 0V9h.4V4.6a1.4 1.4 0 0 1 2.8 0V15c0 3.4-1.6 6-4.2 6z"
      fill={c}
    />
  ),
  warning: (c) => (
    <>
      <rect x="10.9" y="7" width="2.2" height="7.4" rx="1.1" fill={c} />
      <circle cx="12" cy="17.2" r="1.5" fill={c} />
    </>
  ),
  electric: (c) => <path d="M13.4 2L6 13.4h4.6L9.8 22 18 10.2h-4.8z" fill={c} />,
  lockout: (c) => (
    <>
      <path d="M8 10V8a4 4 0 0 1 8 0v2h-2V8a2 2 0 0 0-4 0v2z" fill={c} />
      <rect x="5.5" y="10" width="13" height="9.5" rx="1.8" fill={c} />
      <rect x="11" y="13" width="2" height="4" rx="1" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} />
    </>
  ),
  machineGuard: (c) => (
    <>
      <path
        d="M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 6.9a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6z"
        fill={c}
      />
      <path d="M11 2h2v3.4h-2zM11 18.6h2V22h-2zM2 11h3.4v2H2zM18.6 11H22v2h-3.4z" fill={c} />
      <path d="M4.6 5.2l2.4 2.4-1.4 1.4L3.2 6.6zM17 15l2.4 2.4-1.4 1.4L15.6 16.4z" fill={c} />
    </>
  ),
  firstAid: (c) => <path d="M9.6 3h4.8v6.6H21v4.8h-6.6V21H9.6v-6.6H3V9.6h6.6z" fill={c} />,
  alarm: (c) => (
    <>
      <path d="M12 3a5.6 5.6 0 0 0-5.6 5.6c0 4-1.6 5.4-1.6 5.4h14.4s-1.6-1.4-1.6-5.4A5.6 5.6 0 0 0 12 3z" fill={c} />
      <path d="M9.8 16.4h4.4a2.2 2.2 0 0 1-4.4 0z" fill={c} />
      <path d="M11 1h2v1.8h-2z" fill={c} />
    </>
  ),
  buddy: (c) => (
    <>
      <circle cx="8" cy="6.4" r="2.6" fill={c} />
      <path d="M3.4 20v-5.2a4.6 4.6 0 0 1 9.2 0V20z" fill={c} />
      <circle cx="16.8" cy="7.6" r="2.2" fill={c} />
      <path d="M12.8 20v-4.4a4 4 0 0 1 8 0V20z" fill={c} opacity="0.75" />
    </>
  ),
  ladder: (c) => (
    <>
      <rect x="5" y="2" width="2" height="20" fill={c} />
      <rect x="17" y="2" width="2" height="20" fill={c} />
      <rect x="7" y="5" width="10" height="1.8" fill={c} />
      <rect x="7" y="9.6" width="10" height="1.8" fill={c} />
      <rect x="7" y="14.2" width="10" height="1.8" fill={c} />
      <rect x="7" y="18.8" width="10" height="1.8" fill={c} />
    </>
  ),
  forklift: (c) => (
    <>
      <path d="M3 12h8v5H3z" fill={c} />
      <rect x="11.4" y="4" width="1.8" height="13" fill={c} />
      <path d="M13.6 15h6v1.8h-6z" fill={c} />
      <rect x="13.6" y="7" width="5" height="5" fill={c} opacity="0.7" />
      <circle cx="5.6" cy="19" r="2.2" fill={c} />
      <circle cx="10.4" cy="19" r="1.7" fill={c} />
    </>
  ),
  drums: (c) => (
    <>
      <rect x="4" y="13" width="6.4" height="8" rx="1" fill={c} />
      <rect x="12" y="13" width="6.4" height="8" rx="1" fill={c} />
      <rect x="8" y="4" width="6.4" height="8" rx="1" fill={c} opacity="0.75" />
    </>
  ),
  wetClean: (c) => (
    <>
      <path d="M5 11h14l-1.4 9.4a1.6 1.6 0 0 1-1.6 1.4H8a1.6 1.6 0 0 1-1.6-1.4z" fill={c} />
      <path d="M8 3.4c0 1.4-1.6 2-1.6 3.4a1.6 1.6 0 0 0 3.2 0c0-1.4-1.6-2-1.6-3.4zM15.4 2c0 1.8-2 2.6-2 4.4a2 2 0 0 0 4 0c0-1.8-2-2.6-2-4.4z" fill={c} />
    </>
  ),
  medical: (c) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke={c} strokeWidth="2" />
      <path d="M10.6 6.6h2.8v4h4v2.8h-4v4h-2.8v-4h-4v-2.8h4z" fill={c} />
    </>
  ),
  report: (c) => (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.4" fill={c} />
      <rect x="8" y="5" width="8" height="11" rx="1" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} opacity="0.45" />
      <rect x="11.2" y="7" width="1.6" height="5" rx="0.8" fill={c} />
      <circle cx="12" cy="14" r="1.1" fill={c} />
      <circle cx="12" cy="19" r="1.2" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} opacity="0.45" />
    </>
  ),
  assembly: (c) => (
    <>
      <rect x="8.8" y="8.8" width="6.4" height="6.4" rx="1" fill={c} />
      <path d="M12 1.4l2.4 3.2H9.6zM12 22.6l-2.4-3.2h4.8zM1.4 12l3.2-2.4v4.8zM22.6 12l-3.2 2.4V9.6z" fill={c} />
    </>
  ),
  check: (c) => <path d="M9.6 17.4L4.8 12.6l1.8-1.8 3 3 7.8-7.8L19.2 7.8z" fill={c} />,
  cross: (c) => (
    <path d="M18.4 7.2L16.8 5.6 12 10.4 7.2 5.6 5.6 7.2 10.4 12l-4.8 4.8 1.6 1.6L12 13.6l4.8 4.8 1.6-1.6L13.6 12z" fill={c} />
  ),
  clock: (c) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke={c} strokeWidth="2" />
      <path d="M11 6.4h2V12h4.4v2H11z" fill={c} />
    </>
  ),
  listen: (c) => (
    <>
      <path d="M8 9.4a4 4 0 1 1 8 0c0 2-1.4 2.8-2 4-.4.8-.4 1.6-.4 2.6h-3.2c0-1.4.2-2.4-.6-3.6C8.9 11.2 8 10.8 8 9.4z" fill={c} />
      <rect x="10.4" y="18" width="3.2" height="1.8" rx="0.9" fill={c} />
      <path d="M18.4 5.6a9 9 0 0 1 0 12.8" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  ),
  confinedSpace: (c) => (
    <>
      <path d="M3 21V12a9 9 0 0 1 18 0v9h-3.4v-9a5.6 5.6 0 0 0-11.2 0v9z" fill={c} />
      <circle cx="12" cy="12" r="1.8" fill={c} />
      <path d="M10.4 14.4h3.2l.8 6.6h-4.8z" fill={c} />
    </>
  ),
  smoke: (c) => (
    <>
      <path d="M3 7c2.4-2 4.8 2 7.2 0s4.8 2 7.2 0 2.4 0 3.6-1" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M3 12.4c2.4-2 4.8 2 7.2 0s4.8 2 7.2 0 2.4 0 3.6-1" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M3 17.8c2.4-2 4.8 2 7.2 0s4.8 2 7.2 0 2.4 0 3.6-1" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  ),
  gasZone: (c) => (
    <>
      <circle cx="7" cy="9" r="2.6" fill={c} opacity="0.8" />
      <circle cx="14" cy="7" r="1.8" fill={c} opacity="0.6" />
      <circle cx="17" cy="12" r="2.2" fill={c} opacity="0.7" />
      <circle cx="10" cy="13.5" r="1.5" fill={c} opacity="0.5" />
      <path d="M4 18h16v2H4z" fill={c} />
    </>
  ),
  detector: (c) => (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" fill={c} />
      <rect x="9" y="5.6" width="6" height="4.4" rx="0.8" fill={SHAPE_COLOR[SHAPE.SAFE].bg} />
      <circle cx="10.4" cy="14.4" r="1.2" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} opacity="0.5" />
      <circle cx="13.6" cy="14.4" r="1.2" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} opacity="0.5" />
      <circle cx="12" cy="18" r="1.2" fill={SHAPE_COLOR[SHAPE.MANDATORY].bg} opacity="0.5" />
    </>
  ),
  worker: (c) => (
    <>
      <path d="M7.4 8.4a4.6 4.6 0 0 1 9.2 0z" fill={c} />
      <rect x="6.4" y="8.4" width="11.2" height="1.6" rx="0.8" fill={c} />
      <circle cx="12" cy="12" r="1.8" fill={c} />
      <path d="M8 14.6h8V21H8z" fill={c} />
    </>
  ),
  lift: (c) => (
    <>
      <circle cx="12" cy="4.4" r="2.4" fill={c} />
      <path d="M8.4 8h7.2l1.6 4.4h-2L14 10.4V13l2 3.6V21h-2.4v-4l-1.6-3-1.6 3v4H8v-4.4L10 13v-2.6l-1.2 2H6.8z" fill={c} />
      <rect x="8.8" y="17.6" width="6.4" height="2" fill={c} opacity="0.6" />
    </>
  ),
  spark: (c) => (
    <path
      d="M12 1.6l1.8 5.4 5.4-1.8-3.6 4.4 4.4 3.6-5.6-.4.4 5.6-3.6-4.4-4.4 3.6 1.8-5.4-5.4 1.8 3.6-4.4L2.4 7.8l5.6.4L7.6 2.6z"
      fill={c}
    />
  ),
}

/* ================================================================== */
/* Registry — the vocabulary scenarios and UI refer to by key           */
/* ================================================================== */

export const PICTOGRAMS = {
  // Escape / safe condition (green square)
  exit: { glyph: 'exit', shape: SHAPE.SAFE, label: 'Emergency exit' },
  exit_arrow: { glyph: 'exitArrow', shape: SHAPE.SAFE, label: 'This way out' },
  assembly_point: { glyph: 'assembly', shape: SHAPE.SAFE, label: 'Assembly point' },
  first_aid: { glyph: 'firstAid', shape: SHAPE.SAFE, label: 'First aid' },
  buddy: { glyph: 'buddy', shape: SHAPE.SAFE, label: 'Buddy system' },
  medical_check: { glyph: 'medical', shape: SHAPE.SAFE, label: 'Medical check' },
  correct: { glyph: 'check', shape: SHAPE.SAFE, label: 'Safe choice' },

  // Fire equipment (red square)
  extinguisher: { glyph: 'extinguisher', shape: SHAPE.FIRE, label: 'Fire extinguisher' },
  alarm: { glyph: 'alarm', shape: SHAPE.FIRE, label: 'Fire alarm' },

  // Prohibition (red circle + bar)
  do_not_enter: { glyph: 'handStop', shape: SHAPE.PROHIBITION, label: 'Do not enter' },
  no_dry_sweep: { glyph: 'smoke', shape: SHAPE.PROHIBITION, label: 'No dry sweeping' },
  do_not_operate: { glyph: 'machineGuard', shape: SHAPE.PROHIBITION, label: 'Do not operate' },
  no_lone_entry: { glyph: 'worker', shape: SHAPE.PROHIBITION, label: 'No lone working' },
  incorrect: { glyph: 'cross', shape: SHAPE.PROHIBITION, label: 'Unsafe choice' },

  // Warning (yellow triangle)
  fire: { glyph: 'fire', shape: SHAPE.WARNING, label: 'Fire risk' },
  electric: { glyph: 'electric', shape: SHAPE.WARNING, label: 'Electrical hazard' },
  gas: { glyph: 'gasZone', shape: SHAPE.WARNING, label: 'Gas hazard' },
  dust: { glyph: 'smoke', shape: SHAPE.WARNING, label: 'Dust hazard' },
  confined_space: { glyph: 'confinedSpace', shape: SHAPE.WARNING, label: 'Confined space' },
  machinery: { glyph: 'machineGuard', shape: SHAPE.WARNING, label: 'Machinery hazard' },
  forklift: { glyph: 'forklift', shape: SHAPE.WARNING, label: 'Forklift traffic' },
  unstable_load: { glyph: 'drums', shape: SHAPE.WARNING, label: 'Unstable load' },
  damaged_ladder: { glyph: 'ladder', shape: SHAPE.WARNING, label: 'Damaged ladder' },
  spark: { glyph: 'spark', shape: SHAPE.WARNING, label: 'Hot work / sparks' },
  warning: { glyph: 'warning', shape: SHAPE.WARNING, label: 'Warning' },
  slow: { glyph: 'clock', shape: SHAPE.WARNING, label: 'Too slow' },

  // Mandatory (blue circle)
  helmet: { glyph: 'helmet', shape: SHAPE.MANDATORY, label: 'Wear a helmet' },
  gloves: { glyph: 'gloves', shape: SHAPE.MANDATORY, label: 'Wear gloves' },
  goggles: { glyph: 'goggles', shape: SHAPE.MANDATORY, label: 'Wear eye protection' },
  dust_mask: { glyph: 'dustMask', shape: SHAPE.MANDATORY, label: 'Wear a dust mask' },
  gas_mask: { glyph: 'gasMask', shape: SHAPE.MANDATORY, label: 'Wear breathing apparatus' },
  lockout: { glyph: 'lockout', shape: SHAPE.MANDATORY, label: 'Lockout / tagout' },
  gas_detector: { glyph: 'detector', shape: SHAPE.MANDATORY, label: 'Use a gas detector' },
  report_it: { glyph: 'report', shape: SHAPE.MANDATORY, label: 'Report it' },
  proper_lift: { glyph: 'lift', shape: SHAPE.MANDATORY, label: 'Lift correctly' },
  wet_suppression: { glyph: 'wetClean', shape: SHAPE.MANDATORY, label: 'Use wet suppression' },
  listen: { glyph: 'listen', shape: SHAPE.PLAIN, label: 'Listen' },
  rotate: { glyph: 'uTurn', shape: SHAPE.MANDATORY, label: 'Turn around' },
  ppe: { glyph: 'worker', shape: SHAPE.MANDATORY, label: 'Wear PPE' },
}

export function pictogramExists(key) {
  return !!PICTOGRAMS[key]
}

export function pictogramLabel(key) {
  return PICTOGRAMS[key]?.label || ''
}

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */

/**
 * Render a safety pictogram inside its correct ISO 7010 shape.
 *
 * Accessibility: when `label` is provided the SVG is exposed as an image with
 * that accessible name. Unknown keys fall back to a generic warning triangle
 * rather than rendering nothing, so a data typo can never produce an invisible
 * choice button in zero-text mode.
 */
export default function Pictogram({ name, size = 48, label, className = '', title }) {
  const entry = PICTOGRAMS[name] || PICTOGRAMS.warning
  const glyph = G[entry.glyph] || G.warning
  const colors = SHAPE_COLOR[entry.shape] || SHAPE_COLOR[SHAPE.PLAIN]

  const accessibleName = label ?? title ?? entry.label
  const a11y = accessibleName
    ? { role: 'img', 'aria-label': accessibleName }
    : { 'aria-hidden': 'true', focusable: 'false' }

  // Inset the glyph so it sits inside the surrounding shape.
  const inset = {
    [SHAPE.SAFE]: 0.66,
    [SHAPE.FIRE]: 0.66,
    [SHAPE.PROHIBITION]: 0.54,
    [SHAPE.WARNING]: 0.5,
    [SHAPE.MANDATORY]: 0.6,
    [SHAPE.PLAIN]: 1,
  }[entry.shape]

  const glyphSize = 24 * inset
  const offset = (24 - glyphSize) / 2
  // Warning triangles are bottom-heavy, so nudge the glyph down into the mass.
  const yOffset = entry.shape === SHAPE.WARNING ? offset + 3 : offset

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...a11y}>
      {accessibleName && <title>{accessibleName}</title>}

      {entry.shape === SHAPE.SAFE && <rect width="24" height="24" rx="2.5" fill={colors.bg} />}
      {entry.shape === SHAPE.FIRE && <rect width="24" height="24" rx="2.5" fill={colors.bg} />}
      {entry.shape === SHAPE.MANDATORY && <circle cx="12" cy="12" r="12" fill={colors.bg} />}
      {entry.shape === SHAPE.WARNING && (
        <>
          <path d="M12 1.2L23.2 21.6H0.8z" fill={colors.bg} />
          <path d="M12 5.2l7.8 14.2H4.2z" fill="none" />
        </>
      )}
      {entry.shape === SHAPE.PROHIBITION && <circle cx="12" cy="12" r="12" fill={colors.bg} />}

      <g transform={`translate(${offset} ${yOffset}) scale(${inset})`}>{glyph(colors.fg)}</g>

      {entry.shape === SHAPE.PROHIBITION && (
        <>
          <circle cx="12" cy="12" r="10.4" fill="none" stroke={colors.ring} strokeWidth="3.2" />
          <path d="M4.9 4.9L19.1 19.1" stroke={colors.ring} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/**
 * A row of pictograms, used for the multi-icon summary on results screens.
 */
export function PictogramRow({ names = [], size = 32, gap = 6, className = '' }) {
  const valid = names.filter(Boolean)
  if (!valid.length) return null
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap }}>
      {valid.map((name, i) => (
        <Pictogram key={`${name}-${i}`} name={name} size={size} />
      ))}
    </span>
  )
}
