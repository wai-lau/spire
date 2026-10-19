// /spire - IFR, IFRIT (owner's design, 2026-10-19 - the fire aeon of FFX, orange): strong against swarm + shield, NEUTRAL to
// armor, weak to fast. It CHARGES balls on its hex corners (one slot at base, 2, 3, then all 6 at the capstone) and is never idle
// while a slot is free; a charged ball + an enemy in range = a launch, one every IFR_LAUNCH_GAP s. The ball flies SLOWLY at the
// enemy's spot at launch (no lead: a fast enemy walks out from under it), hitting what it passes through; where it lands a RING
// expands to the blast radius hitting everything it crosses once, and PELLETS fly at the units inside the blast (they can miss);
// where a pellet stops it bursts into a burning CROSS - four beams along the board's axes, quiet ticks that pop a shield charge.
// Meteor: slots, charge rate, ball speed, en-route hit (Impact: 6 slots, charging as fast as it launches). Hellfire: the cross
// (Hellfire VI: beams to the play-box edges). Firaga: the blast and the pellet count (Backdraft VI: a pellet bursts into a
// smaller ring too). Loaded after aspira-car.js (the simulator too); towerStats calls ifrSkillStats, the tower loop stepIfr,
// drawSceneTop drawIfr. Every list on the tower holds plain objects (ids and coordinates, never enemy refs): autosave clones G.
// Spec: docs/superpowers/specs/2026-10-19-ifrit-tower-design.md

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const IFR_SLOTS = [1, 2, 2, 3, 3, 3]; // Meteor: charge slots on the hex corners - 1, 2 (opposite), 3 (a triangle); VI all 6 (owner: "skip 4 and 5")
const IFR_CHARGE_S = [2.0, 1.6, 1.3, 1.0, 0.8, 0.6]; // Meteor: s to fill one ball (VI 0.1: "near the launch rate")
const IFR_BALL_V = [140, 170, 200, 240, 280, 320]; // Meteor: u/s in flight - SLOW, the fast weakness (VI 360)
const IFR_ROUTE_K = [0.25, 0.5, 1, 2, 4, 8]; // Meteor: the en-route hit, x the blast hit ("a lot to make up for the faster travel speed"; VI 16)
const IFR_BEAM_L = [50, 65, 80, 100, 120, 140]; // Hellfire: a cross beam's half-length, u (VI: to the play-box edges)
const IFR_BEAM_W = [10, 12, 14, 16, 18, 20]; // Hellfire: its width, u
const IFR_BURN_S = [1.5, 2, 2.5, 3, 4, 5]; // Hellfire: a cross burns this long (VI 10 = EFFECT_MAX_S)
const IFR_TICK_S = [0.3, 0.27, 0.24, 0.2, 0.17, 0.15]; // Hellfire: s between burn ticks
const IFR_TICK_K = [0.08, 0.12, 0.18, 0.27, 0.4, 0.6]; // Hellfire: a tick, x the blast hit
const IFR_BLAST_R = [60, 70, 80, 95, 110, 130]; // Firaga: the ring's reach, u
const IFR_BLAST_K = [1, 1.5, 2.3, 3.5, 6, 10]; // Firaga: the blast hit, x TOWERS.ifr.dmg
const IFR_PELLETS = [5, 6, 7, 8, 9, 10]; // Firaga: pellets a burst
const IFR_LAUNCH_GAP = 0.05, IFR_BALL_R = 10, IFR_RING_V = 600, IFR_PELLET_V = 300, IFR_PELLET_HIT = 4, IFR_PELLET_K = 0.25, IFR_MINI_K = 0.5; // s between launches; the ball's hit radius (+ the enemy's size); the ring's speed u/s; a pellet's speed and hit pad; a pellet hit x the blast hit; Backdraft's mini ring x radius and x hit
const IFR_CROSS_MAX = 60; // live crosses a tower at most: the oldest goes (perf)
const IFR_ROUTE_ST = { shieldPop: 1 }, IFR_RING_ST = { shieldPop: 1 }, IFR_PELLET_ST = { shieldPop: 1 }, IFR_BURN_ST = { noFx: true, noNum: true, shieldPop: 1 }; // (damage: st.shieldPop; the burn is quiet)

SKILL_TREES.ifr = [
  { id: "meteor", name: "Meteor", tiers: [{ name: "Pebble" }, { name: "Stone" }, { name: "Rock" }, { name: "Boulder" }, { name: "Meteor" }] },
  { id: "hellfire", name: "Hellfire", tiers: [{ name: "Kindle" }, { name: "Flare" }, { name: "Blaze" }, { name: "Inferno" }, { name: "Conflagration" }] },
  { id: "firaga", name: "Firaga", tiers: [{ name: "Ember" }, { name: "Fire" }, { name: "Fira" }, { name: "Firaga" }, { name: "Pyre" }] },
];
SKILL_MOVE.ifr = { meteor: [[1, 1], [1.1, 1], [1.2, 1], [1.3, 1], [1.4, 1], [1.5, 1]], hellfire: [[1, 1], [1.06, 1], [1.12, 1], [1.18, 1], [1.24, 1], [1.3, 1]], firaga: [[1, 1], [1, 1.3], [1, 1.6], [1, 2], [1, 2.2], [1, 2.4]] }; // Meteor and Hellfire = range, Firaga = slide (the fire roams)

function ifrSkillStats(t, s, b) {
  const m = skillOf(t, "meteor"), h = skillOf(t, "hellfire"), f = skillOf(t, "firaga");
  s.range = b.range * RANGE_BONUS; s.targets = 1;
  s.slots = IFR_SLOTS[m]; s.chargeS = IFR_CHARGE_S[m]; s.ballV = IFR_BALL_V[m]; s.routeK = IFR_ROUTE_K[m]; s.impact = m >= CAPSTONE_TIER;
  s.beamL = IFR_BEAM_L[h]; s.beamW = IFR_BEAM_W[h]; s.burnS = Math.min(EFFECT_MAX_S, IFR_BURN_S[h]); s.tickS = IFR_TICK_S[h]; s.tickK = IFR_TICK_K[h]; s.hellfire = h >= CAPSTONE_TIER;
  s.blastR = IFR_BLAST_R[f]; s.blastK = IFR_BLAST_K[f]; s.pellets = IFR_PELLETS[f]; s.backdraft = f >= CAPSTONE_TIER;
  s.dmg = b.dmg * s.blastK; s.rate = 1 / s.chargeS; // the card's Damage and Rate: the blast hit, balls a second
  s.skill = true;
}
function stepIfr(t, dt) { /* Task 3 */ }
function drawIfr() { /* Task 5 */ }
