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
      {
        id: 'fe4',
        prompt: 'You are evacuating. You pass a fire door held open with a wooden wedge.',
        choices: [
          { text: 'Leave it — you are in the middle of an evacuation', points: -15, feedback: 'A wedged fire door is a hole in the compartment that is supposed to hold the fire back. It takes one kick to clear and it protects everyone still behind you.' },
          { text: 'Kick the wedge clear so the door can swing shut behind you', points: 20, feedback: 'Correct. Fire doors buy the time the evacuation depends on. Clearing a wedge costs a second and restores the compartment.' },
          { text: 'Stop and find maintenance to report the wedge', points: -20, feedback: 'The reporting is right, the timing is wrong. Standing still in a smoke path to find someone is how people are overcome. Clear it, keep moving, report it at the muster point.' },
        ],
      },
      {
        id: 'fe5',
        prompt: 'At the assembly point the supervisor counts heads. One worker from your section is not there.',
        choices: [
          { text: 'Go back in to look for them — you know where they usually work', points: -30, feedback: 'This is the decision that turns one casualty into two. Unplanned re-entry by an untrained person is a leading cause of secondary fatalities. You are the person who knows where they were, and that information is worth far more than your entry.' },
          { text: 'Report the name and their last known location to the incident controller', points: 30, feedback: 'Correct. You hold information the rescue team cannot get anywhere else. Handing it over immediately is the highest-value action available to you.' },
          { text: 'Assume they used a different exit and stay quiet', points: -25, feedback: 'A silent assumption removes them from the search. If you have not seen them, say so — an unnecessary check costs minutes, an unreported absence can cost a life.' },
        ],
      },
      {
        id: 'fe6',
        prompt: 'The fire is out. A colleague starts setting up to resume the grinding job to make up lost time.',
        choices: [
          { text: 'Help them restart — the fire is out and the shift is behind', points: -25, feedback: 'The ignition source has not been eliminated and the area has not been re-checked. Restarting hot work over ground that has just burned is how a second fire starts in the same shift.' },
          { text: 'Stop the restart until the hot-work permit is re-issued and the area re-inspected', points: 25, feedback: 'Correct. A hot-work permit is void once an incident occurs. Re-inspection and re-issue is the control that stops a repeat.' },
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
      {
        id: 'gc4',
        prompt: 'You are inside. Fifteen minutes in, your detector alarms and the reading is climbing.',
        choices: [
          { text: 'Finish the task quickly — you are nearly done and it is only just alarming', points: -30, feedback: 'A climbing reading means the atmosphere is getting worse, not that you have time. "Nearly done" is the reasoning found in most confined-space fatality reports. The alarm is the point at which you leave, not the point at which you hurry.' },
          { text: 'Leave immediately by the route you came in and tell the attendant why', points: 30, feedback: 'Correct. An alarm is an exit instruction. Leaving by the known route and reporting the reading lets the space be re-tested before anyone re-enters.' },
          { text: 'Take the detector to the far end to find where the gas is coming from', points: -25, feedback: 'Locating the source is a job for a re-entry with the right equipment, not for the person currently breathing it. Walking further in takes you further from the exit as the atmosphere deteriorates.' },
        ],
      },
      {
        id: 'gc5',
        prompt: 'Outside now. The attendant says a contractor lifted the barrier and went in to look for you while you were exiting.',
        choices: [
          { text: 'Go back in after him — he does not know the layout', points: -30, feedback: 'Two untrained people in an alarming space is two casualties. This is the exact sequence that produces multiple-fatality confined-space incidents, and good intent is what drives it every time.' },
          { text: 'Raise the alarm for a trained rescue team and hold the entry so nobody else follows', points: 30, feedback: 'Correct. Controlling the entry point and calling equipped rescue is the only action that reduces the casualty count rather than adding to it.' },
        ],
      },
      {
        id: 'gc6',
        prompt: 'The space has been ventilated. The supervisor asks you to go back in and finish the inspection.',
        choices: [
          { text: 'Re-enter — it has been ventilated and you know the space', points: -25, feedback: 'Ventilation is not evidence. Gas can stratify and pool low or in dead ends, and a space that reads clear at the opening can still be lethal three metres in. Re-entry requires a fresh test, not a ventilation run.' },
          { text: 'Ask for a fresh atmospheric test at working depth and a new entry permit first', points: 25, feedback: 'Correct. The permit is void once the space alarms. A fresh test at the depth you will actually work at, and a re-issued permit, are what make re-entry defensible.' },
          { text: 'Re-enter but leave the door open and keep the detector in your hand', points: -15, feedback: 'Better instinct, still an unpermitted entry. Carrying a detector tells you when you are already in trouble; a pre-entry test at depth tells you not to go.' },
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
      {
        id: 'ms4',
        prompt: 'You have isolated the press and fitted your lock. A fitter arrives to help and asks you to open up so he can fit his own lock.',
        choices: [
          { text: 'Remove your lock so he can fit his, then put yours back on', points: -25, feedback: 'For the seconds your lock is off, the machine can be energised by anyone. Group isolation exists precisely so nobody has to remove a lock to add one — a multi-lock hasp takes both without ever leaving the isolation open.' },
          { text: 'Fit a multi-lock hasp so both locks are on at once and the isolation is never broken', points: 25, feedback: 'Correct. Every person working on the machine holds their own lock, and the isolation stays continuous. The machine cannot start while any one lock remains.' },
          { text: 'Tell him your lock covers both of you', points: -20, feedback: 'One lock protects one person. If you finish first and remove it, he is still inside a machine that is now live and he has no way to know. Each worker holds their own.' },
        ],
      },
      {
        id: 'ms5',
        prompt: 'Work is done. You are about to remove your lock and hand the press back.',
        choices: [
          { text: 'Remove the lock and press start to check it runs', points: -30, feedback: 'Nothing has confirmed the danger zone is clear. Starting a machine while a hand or a tool may still be inside it is the final step where LOTO discipline usually fails.' },
          { text: 'Clear tools, confirm everyone is clear of the danger zone, refit the guard, then remove the lock', points: 30, feedback: 'Correct. The order matters: tools out, people clear, guard on, lock off. Reversing any of those turns a completed job into an incident.' },
        ],
      },
      {
        id: 'ms6',
        prompt: 'Next shift, the press runs but the two-hand start control now works with one hand.',
        choices: [
          { text: 'Keep running it — the machine works and output is behind', points: -30, feedback: 'A two-hand control exists so both hands are outside the die when it closes. Defeated, it is not a minor fault; it is the specific guard that prevents an amputation, and it has been removed.' },
          { text: 'Stop the machine, tag it out of service and report the defeated control', points: 30, feedback: 'Correct. A defeated safety control is a stop-work condition. Tagging it prevents the next operator inheriting an unguarded machine that looks normal.' },
          { text: 'Run it carefully and mention it at the end of the shift', points: -25, feedback: 'Care is not a substitute for a guard, and the next operator will not know. The whole risk of a defeated control is that the machine looks and behaves as usual until it takes a hand.' },
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
      {
        id: 'eh4',
        prompt: 'A workmate is gripping a live cable and cannot let go. He is conscious but rigid.',
        choices: [
          { text: 'Pull him off by the arm — every second counts', points: -30, feedback: 'Touching him puts the same current through you, and rescuers become the second casualty in a large share of electrical fatalities. He is rigid because the current has locked his muscles; adding your body to the circuit helps neither of you.' },
          { text: 'Isolate the supply first, then reach him', points: 30, feedback: 'Correct. Isolation is the rescue. Until the current stops he is part of a live circuit, and the fastest safe route to him is the switch, not his arm.' },
          { text: 'Use a dry wooden plank to push him clear without isolating', points: -10, feedback: 'A recognised last resort when isolation is genuinely impossible, and far better than bare hands — but the isolator is right there. Insulated separation is what you do when you cannot kill the supply, not instead of killing it.' },
        ],
      },
      {
        id: 'eh5',
        prompt: 'You are asked to work on a panel that has been switched off at the breaker.',
        choices: [
          { text: 'Start work — the breaker is off and labelled', points: -25, feedback: 'A label records an intention, not a state. Breakers are mislabelled, wired back-fed, or switched by someone else while you work. Nothing but a test on the conductors you are about to touch proves they are dead.' },
          { text: 'Lock off, then prove dead on every conductor with an approved tester before touching anything', points: 25, feedback: 'Correct. Isolate, lock, prove dead, then work — and prove it on the conductors you will actually contact. Testing the tester first is part of it.' },
        ],
      },
      {
        id: 'eh6',
        prompt: 'Water from a leaking pipe is pooling under a live floor-standing distribution board.',
        choices: [
          { text: 'Mop it up before it reaches the board', points: -30, feedback: 'That puts you standing in a conductive pool beside live equipment. Water plus an energised board is a step-and-touch shock risk, and the person mopping is the one completing the path to earth.' },
          { text: 'Keep everyone back, isolate the board upstream, then deal with the water', points: 30, feedback: 'Correct. De-energise first and clear people from the area. The water is a hazard only because the board is live, so removing the energy removes the hazard.' },
          { text: 'Put down a rubber mat and mop from on top of it', points: -15, feedback: 'A mat is not rated for this and gives false confidence. Standing on an untested insulator next to a live board in standing water is still an unacceptable exposure when isolation is available.' },
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
      {
        id: 'dr4',
        prompt: 'You put your respirator on. It sits loose against your cheek because you have a beard.',
        choices: [
          { text: 'Wear it as is — a loose respirator is better than none', points: -25, feedback: 'It is not. A tight-fitting respirator works by seal, and air takes the easy path around a broken seal rather than through the filter. You get the discomfort of the mask and almost none of the protection, plus the false confidence that you are protected.' },
          { text: 'Ask for a loose-fitting powered respirator or hood that does not rely on a face seal', points: 25, feedback: 'Correct. Where a seal cannot be achieved, the answer is equipment that does not need one. Fit is not a formality — it is the entire mechanism.' },
          { text: 'Pull the straps as tight as they will go to force a seal', points: -15, feedback: 'Over-tightening does not seal against hair and it makes the mask painful enough that it will come off within the hour. The seal fails at the hair, not at the strap tension.' },
        ],
      },
      {
        id: 'dr5',
        prompt: 'The extraction hood over the splitting bench has been swung aside so workers can reach the material more easily.',
        choices: [
          { text: 'Leave it — the work is faster and everyone is wearing masks', points: -25, feedback: 'Extraction removes dust from the air; a mask only protects the one person wearing it, and only while it is sealed and fitted. Losing extraction raises exposure for the whole bench and loads every filter faster.' },
          { text: 'Reposition the hood over the dust source before work continues', points: 25, feedback: 'Correct. Controlling dust at source protects everyone in the area at once. PPE is the last line, not the first, and it is not a substitute for extraction.' },
        ],
      },
      {
        id: 'dr6',
        prompt: 'Your respirator filter is past its change date but still breathes easily.',
        choices: [
          { text: 'Keep using it — it does not feel blocked', points: -25, feedback: 'Breathing resistance tells you a particulate filter is loading, but it is not a reliable indicator of remaining life and it tells you nothing at all on a gas or vapour cartridge, which can be exhausted while still breathing freely.' },
          { text: 'Change the filter and record it, on schedule rather than on feel', points: 25, feedback: 'Correct. Filter life is managed by a change schedule, not by sensation. Recording the change is what makes the schedule real rather than a habit.' },
          { text: 'Blow the filter clean with the airline and carry on', points: -30, feedback: 'Compressed air drives trapped dust through the media and damages it, so a filter cleaned this way is worse than the one you started with. It is also a good way to inhale a concentrated cloud of what it had already captured.' },
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
      {
        id: 'w4',
        prompt: 'You need to cross the yard. A loaded forklift is heading for the same gap and the driver is looking over his shoulder at his load.',
        choices: [
          { text: 'Walk through quickly before he gets there', points: -30, feedback: 'A loaded forklift has a blind side, poor forward visibility past the load, and cannot stop or swerve like a car. Winning the gap depends on him seeing you, which is the one thing you have just established he is not doing.' },
          { text: 'Stop, stay in the walkway, and wait until you have eye contact and he has acknowledged you', points: 30, feedback: 'Correct. Pedestrian-vehicle separation plus positive acknowledgement is what prevents struck-by incidents. If he has not seen you, you do not have right of way whatever the markings say.' },
          { text: 'Wave your arms so he notices you and keep walking', points: -25, feedback: 'You are relying on him looking up at the exact moment you enter his path. Signalling is not a substitute for staying out of the vehicle route until it is clear.' },
        ],
      },
      {
        id: 'w5',
        prompt: 'A driver leaves his forklift on the loading ramp, engine running, to go and sign a docket.',
        choices: [
          { text: 'Say nothing — he is only away for a moment', points: -25, feedback: 'An unattended machine on a slope with the engine running can roll. "Only a moment" is how a runaway happens, and it is also the moment someone else decides to move it because it is in the way.' },
          { text: 'Ask him to lower the forks, apply the brake, neutral, engine off, and take the key', points: 25, feedback: 'Correct. Forks down, brake on, neutral, off, key out — that is what "unattended" means. On a ramp it is not a formality.' },
        ],
      },
      {
        id: 'w6',
        prompt: 'A pallet on the third tier is leaning out over the walkway below.',
        choices: [
          { text: 'Push it back into place from the ladder', points: -30, feedback: 'Correcting a leaning load by hand from a ladder puts you underneath it while destabilising it. If it goes, it goes onto you, and a ladder gives you nowhere to move.' },
          { text: 'Barrier off the walkway underneath and get it brought down mechanically', points: 30, feedback: 'Correct. Clear the drop zone first, then use the machine that put it up there to bring it down. Nobody should be under a suspect load, including you.' },
          { text: 'Leave it and warn people walking past to keep to the far side', points: -20, feedback: 'A verbal warning does not survive the shift change, and the next person through will not have heard it. An unstable load overhead needs the area closed and the load removed, not a caution passed on by word of mouth.' },
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
