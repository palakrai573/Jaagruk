// Each scenario maps to one of the 5 safety domains named in the SIH CY-1
// problem statement. `domain` is the official domain label; `id` and
// `sector` are used for routing/display. A 6th bonus module (manual
// handling) goes beyond the minimum "at least two modules" requirement.

export const SCENARIOS = [
  {
    id: 'fire-explosion',
    domain: 'Fire & Explosion Response',
    sector: 'Steel Plant',
    title: 'Fire & Explosion Response',
    intro:
      'A spark from a grinding operation near a fuel storage area has ignited a small fire on the steel plant floor. You are the nearest worker.',
    steps: [
      {
        id: 'fe1',
        prompt: 'You spot the fire. What is your first action?',
        choices: [
          { text: 'Try to put it out yourself with whatever is nearby', points: -20, feedback: 'Acting without identifying the fire type or your nearest exit first risks trapping you. Always confirm your evacuation route before engaging any fire.' },
          { text: 'Identify your nearest marked exit, then raise the alarm', points: 20, feedback: 'Correct. Exit identification comes first — you can only fight a fire safely if your escape route is confirmed and clear.' },
        ],
      },
      {
        id: 'fe2',
        prompt: 'The fire is small, contained to a waste bin, and you are trained on extinguisher use. Which extinguisher do you grab?',
        choices: [
          { text: 'Any extinguisher within reach', points: -15, feedback: 'Using the wrong extinguisher class on a fuel or electrical fire can make it worse — water on an oil fire, for example, spreads flame violently.' },
          { text: 'Check the label for the correct class (e.g. CO2/foam for flammable liquid) before using it', points: 20, feedback: 'Correct. Confirming the extinguisher class takes two seconds and prevents turning a small fire into a major one.' },
        ],
      },
      {
        id: 'fe3',
        prompt: 'The fire suddenly grows and black smoke fills the area. What now?',
        choices: [
          { text: 'Keep trying to extinguish it since you already started', points: -30, feedback: 'Once a fire exceeds what a handheld extinguisher can control, continuing to fight it risks your life. Evacuation always overrides firefighting at this point.' },
          { text: 'Abandon extinguishing, follow the evacuation sequence, and account for your team at the muster point', points: 30, feedback: 'Correct. Evacuation sequencing — stop, exit via the nearest safe route, report to muster point — is the standard protocol once a fire escalates.' },
        ],
      },
    ],
  },
  {
    id: 'gas-leak-confined-space',
    domain: 'Gas Leak & Confined Space Protocol',
    sector: 'Mining',
    title: 'Gas Leak & Confined Space Protocol',
    intro:
      'You are about to enter a confined underground shaft in a Jharkhand coal mine to inspect a suspected gas leak. Protocol requires a hazard check before entry.',
    steps: [
      {
        id: 'gc1',
        prompt: 'Before entry, your gas detector shows a low-battery warning. What do you do?',
        choices: [
          { text: 'Enter anyway, the reading still seems to work', points: -20, feedback: 'A malfunctioning gas detector cannot be trusted in a confined space — methane and CO buildup are silent killers. Hazard zone recognition depends entirely on working equipment.' },
          { text: 'Report it and swap for a fully charged detector before entry', points: 20, feedback: 'Correct. Confirming hazard zone readings with reliable equipment is the first step of confined space protocol.' },
        ],
      },
      {
        id: 'gc2',
        prompt: 'The detector confirms elevated gas levels in the shaft. What PPE do you select before entry?',
        choices: [
          { text: 'A standard dust mask, since it is quick to put on', points: -25, feedback: 'A dust mask does not filter gas. Selecting the wrong PPE for a confirmed gas hazard is one of the most dangerous mistakes in confined space work.' },
          { text: 'A self-contained breathing apparatus (SCBA) or gas-rated respirator rated for the confirmed gas', points: 25, feedback: 'Correct. PPE selection must match the specific hazard — gas-rated respiratory protection is mandatory once elevated gas is confirmed.' },
        ],
      },
      {
        id: 'gc3',
        prompt: 'You are ready to enter the confined space. Your usual buddy is on a break.',
        choices: [
          { text: 'Enter alone since it will only take a few minutes', points: -30, feedback: 'Confined space entry alone is a critical violation. If you are overcome by gas, no one will know until it is too late — the buddy system exists specifically for this scenario.' },
          { text: 'Wait for a buddy or assign a stand-by attendant before entry', points: 30, feedback: 'Correct. The buddy system is mandatory for confined space entry — a second person monitoring from outside can call for rescue immediately if something goes wrong.' },
        ],
      },
    ],
  },
  {
    id: 'machinery-safety',
    domain: 'Machinery Safety & Lockout-Tagout',
    sector: 'Manufacturing',
    title: 'Machinery Safety & Lockout-Tagout',
    intro:
      'You are operating a hydraulic metal press on a steel fabrication line. Your shift has just started.',
    steps: [
      {
        id: 'ms1',
        prompt: 'You notice the machine guard on the press has been removed for "faster access."',
        choices: [
          { text: 'Use the machine without the guard to save time', points: -25, feedback: 'Machine guards exist specifically to prevent crush injuries. Operating without one is one of the most common causes of factory-floor amputations.' },
          { text: 'Refuse to operate until the guard is reinstalled', points: 25, feedback: 'Correct. Never operate unguarded machinery — reinstalling safety guards is a prerequisite, not optional.' },
        ],
      },
      {
        id: 'ms2',
        prompt: 'The press jams mid-cycle and needs to be cleared. What do you do?',
        choices: [
          { text: 'Reach in quickly while the machine is still powered, since it looks stopped', points: -30, feedback: 'A machine that "looks stopped" can still cycle unexpectedly. Reaching into unlocked machinery is a leading cause of severe crush and amputation injuries.' },
          { text: 'Follow lockout-tagout procedure — power down, lock the isolator, tag it, then clear the jam', points: 30, feedback: 'Correct. Lockout-tagout (LOTO) ensures machinery cannot re-energize while you are clearing it — this is mandatory before any maintenance or unjamming task.' },
        ],
      },
      {
        id: 'ms3',
        prompt: 'A colleague asks you to help lift a heavy metal sheet using an improper bent-back posture.',
        choices: [
          { text: 'Lift it quickly the way they suggest', points: -15, feedback: 'Improper lifting posture is a leading cause of long-term spinal injury in manufacturing workers.' },
          { text: 'Suggest proper lifting technique or use lifting equipment', points: 15, feedback: 'Correct. Bend at the knees, keep the load close, or use mechanical aids — this prevents chronic injuries.' },
        ],
      },
    ],
  },
  {
    id: 'electrical-hazard',
    domain: 'Electrical Hazard Response',
    sector: 'Manufacturing',
    title: 'Electrical Hazard Response',
    intro: 'You are doing a routine floor walk near the plant\'s main electrical distribution panel.',
    steps: [
      {
        id: 'eh1',
        prompt: 'You notice a frayed, exposed wire running across a walkway near the panel.',
        choices: [
          { text: 'Step over it carefully and continue on', points: -25, feedback: 'An exposed live wire is a shock and fire hazard for everyone who walks that path after you, not just you. Stepping over it does not make it safe.' },
          { text: 'Cordon off the area, de-energize if trained to, and report it immediately', points: 25, feedback: 'Correct. Exposed wiring must be isolated from foot traffic and reported for repair right away.' },
        ],
      },
      {
        id: 'eh2',
        prompt: 'A technician needs to service equipment connected to this panel. What is required before they start?',
        choices: [
          { text: 'They can start immediately since they are experienced', points: -25, feedback: 'Experience does not replace lockout-tagout. Skipping isolation before electrical maintenance is how experienced technicians get seriously injured.' },
          { text: 'The circuit must be locked out, tagged, and tested dead before any work begins', points: 25, feedback: 'Correct. Lockout-tagout plus a dead-test confirmation is mandatory before touching any electrical equipment for maintenance.' },
        ],
      },
      {
        id: 'eh3',
        prompt: 'You smell a faint burning odor coming from the panel area.',
        choices: [
          { text: 'Keep working, someone else will notice eventually', points: -30, feedback: 'A burning smell near electrical equipment is an early fire warning sign. Delayed reporting can lead to a major electrical fire.' },
          { text: 'Stop work, report it, and alert the fire safety team', points: 30, feedback: 'Correct. Early reporting of electrical burning smells is critical fire-prevention behavior.' },
        ],
      },
    ],
  },
  {
    id: 'dust-respiratory',
    domain: 'Dust & Respiratory Hazard Protection',
    sector: 'Mica Mining',
    title: 'Dust & Respiratory Hazard Protection',
    intro:
      'You are working in a mica processing unit where fine mineral dust is a constant part of the job. Long-term exposure without protection can cause silicosis and other lung disease.',
    steps: [
      {
        id: 'dr1',
        prompt: 'You are about to start a shift splitting mica sheets, which generates fine dust. What PPE do you select?',
        choices: [
          { text: 'A cloth covering over your nose and mouth, since it is what is available', points: -20, feedback: 'Cloth coverings do not filter fine mineral dust. This is exactly the kind of exposure that leads to silicosis over years of work.' },
          { text: 'A properly rated dust/respirator mask (N95 or better) approved for mineral dust', points: 20, feedback: 'Correct. Fine mica and silica dust requires a rated respirator — general cloth coverings offer no real protection.' },
        ],
      },
      {
        id: 'dr2',
        prompt: 'The work area floor is covered in settled dust and needs to be cleaned before shift change.',
        choices: [
          { text: 'Dry sweep it to clear it quickly', points: -25, feedback: 'Dry sweeping re-suspends fine dust into the air, increasing everyone\'s exposure. This is one of the most common dust-safety mistakes on a mica floor.' },
          { text: 'Use wet suppression or a vacuum with a dust filter', points: 25, feedback: 'Correct. Wet suppression keeps dust from becoming airborne again — dry sweeping should never be used in a high dust environment.' },
        ],
      },
      {
        id: 'dr3',
        prompt: 'A co-worker mentions they have had a persistent cough and shortness of breath for several weeks.',
        choices: [
          { text: 'Tell them it is probably nothing, dust exposure is normal in this job', points: -30, feedback: 'Normalizing respiratory symptoms delays diagnosis of silicosis and other occupational lung disease, which is far more treatable when caught early.' },
          { text: 'Encourage them to report it and get a medical check as per occupational health protocol', points: 30, feedback: 'Correct. Persistent respiratory symptoms in a dust environment should always be reported and medically checked — early detection saves lives.' },
        ],
      },
    ],
  },
  {
    id: 'warehouse-loading',
    domain: 'Manual Handling & Site Housekeeping',
    sector: 'Manufacturing',
    title: 'Warehouse & Loading Bay',
    intro:
      'You are working in a materials warehouse attached to the plant, coordinating forklift movement and stacked inventory during a busy shift.',
    steps: [
      {
        id: 'w1',
        prompt: 'A forklift is reversing near you with its warning beeper disabled because "it was too noisy."',
        choices: [
          { text: 'Continue walking through the area as usual', points: -25, feedback: 'A disabled reversing alarm removes the only warning pedestrians get. Struck-by-forklift incidents are a leading cause of warehouse fatalities.' },
          { text: 'Stop, report the disabled alarm, and avoid the forklift\'s path', points: 25, feedback: 'Correct. Reversing alarms must never be disabled — report it immediately and keep clear until it is fixed.' },
        ],
      },
      {
        id: 'w2',
        prompt: 'You see steel drums stacked three-high without any strapping, swaying slightly.',
        choices: [
          { text: 'Walk past quickly, it has been like that for days', points: -20, feedback: 'Unsecured stacked loads can topple with no warning. Normalizing a known hazard is exactly how warehouse crush injuries happen.' },
          { text: 'Cordon off the area and report it for proper restacking', points: 20, feedback: 'Correct. Unstable stacked loads must be secured or cordoned off immediately — this prevents crush injuries from a sudden collapse.' },
        ],
      },
      {
        id: 'w3',
        prompt: 'You need to reach a box on a high shelf and the only ladder nearby has a visibly cracked step.',
        choices: [
          { text: 'Use it carefully, just this once', points: -20, feedback: 'A cracked step can fail under any load, "careful" use included. Faulty equipment must be taken out of service, not worked around.' },
          { text: 'Tag it as damaged and get a proper ladder', points: 20, feedback: 'Correct. Damaged equipment should be tagged and removed from use immediately, not risked "just this once."' },
        ],
      },
    ],
  },
]

// The 5 domains required for full certification eligibility (matches the
// official problem statement's 5 named safety domains).
export const CERTIFICATION_DOMAINS = [
  'Fire & Explosion Response',
  'Gas Leak & Confined Space Protocol',
  'Machinery Safety & Lockout-Tagout',
  'Electrical Hazard Response',
  'Dust & Respiratory Hazard Protection',
]

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id)
}
