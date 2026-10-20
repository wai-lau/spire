// /spire - IFR, IFRIT (owner's design, 2026-10-19 - the fire aeon of FFX, orange): strong against swarm + shield, NEUTRAL to
// armor, weak to fast. It CHARGES balls on its hex corners (one slot at base, 2, 3, then all 6 at the capstone) and is never idle
// while a slot is free; a charged ball + an enemy in range = a launch, one every IFR_LAUNCH_GAP s. The ball flies SLOWLY at the
// enemy's spot at launch (no lead: a fast enemy walks out from under it), hitting what it passes through; where it lands a RING
// expands to the blast radius hitting everything it passes once, and PELLETS fly out in random directions to the blast radius (owner, 2026-10-19);
// where a pellet stops it bursts into a burning FLARE - a big + over a tiny x (owner, 2026-10-19; was a six-beam star), quiet ticks that pop
// a shield charge. Meteor: slots, charge rate, ball speed, en-route hit (Impact: 6 slots,
// charging as fast as it launches). Hellfire: the flare (Hellfire VI: the longest beams). Firaga: the blast and the pellet count (Backdraft VI: a pellet lands as THREE flares,
// a little apart - owner, 2026-10-20). Loaded after aspira-car.js (the simulator too); towerStats calls ifrSkillStats, the tower loop stepIfr,
// drawSceneTop drawIfr. Every list on the tower holds plain objects (ids and coordinates, never enemy refs): autosave clones G.
// Spec: docs/superpowers/specs/2026-10-19-ifrit-tower-design.md

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const IFR_CHARGE_S = [2.0, 1.8, 1.6, 1.4, 1.2, 1.0] /* AXES REDONE (owner, 2026-10-20: "greatly lower initial meteor fire rate and increase damage"; one charge, no slots); was [0.5, 0.5, 0.5, 0.45, 0.4, 0.35] VI 0.1 */; // Meteor: s to fill THE charge (VI capstone.js)
const IFR_BALL_V = [360, 390, 420, 450, 480, 510] /* was [140 .. 320] (solo.mjs 2026-10-19: a lone L1 lost 25/21/23 lives on waves 1-11 and x4 the hit barely moved it - at 140 u/s the ring opened after armor and swarm had walked out of it; 360: 8/6/2) */; // Meteor: u/s in flight - SLOW against fast (130 u/s walks out of the blast past ~150 u), the fast weakness (VI 540)
const IFR_ROUTE_K = [1.5, 2, 4, 10, 25, 60] /* AXES REDONE (2026-10-20): x TOWERS.ifr.dmg, Meteor's own - was x the Blk Magic blast hit, [0.25, 0.5, 1, 4, 10, 60] VI 150 */; // Meteor: the en-route hit, its ONLY damage
const IFR_BALL_RAD = [13.5, 16, 18.5, 21, 24, 27]; // Meteor: the meteor's radius, u (owner, 2026-10-20: about half the tower's hex across untaken, "twice the size" of it at VI: 54, capstone.js)
// Hellfire: THE FIRE the meteor leaves (owner, 2026-10-20) - it opens at the meteor's size, grows at FIRE_V to FIRE_R (never below the meteor: untaken
// it does not grow), burns by catching fire every IFR_FIRE_TICK_S for FIRE_K x TOWERS.ifr.dmg a tick ("small ticks, many"), lingers FIRE_LINGER s at full size
const IFR_FIRE_R = [0, 40, 60, 85, 110, 130]; // u radius (VI 160: "6 towers across", capstone.js)
const IFR_FIRE_V = [60, 80, 100, 120, 150, 180]; // u/s (VI 220)
const IFR_FIRE_LINGER = [0.5, 1, 1.5, 2, 2.5, 3]; // s at full size, still burning (VI 4)
const IFR_FIRE_K = [0.1, 0.15, 0.25, 0.4, 0.6, 0.8]; // a tick, x TOWERS.ifr.dmg (VI 1.2)
const IFR_FIRE_TICK_S = 0.2, IFR_FIRE_FADE = 0.3; // s between ticks (fixed); s it fades out at the end, hitting nothing
const IFR_BEAM_L = [50, 65, 80, 100, 120, 140]; // Blk Magic (Hellfire's until 2026-10-20): a flare beam's length from its centre, u (VI 210, capstone.js - was to the play-box edges, owner 2026-10-19: "looks ridiculous ... maybe half")
const IFR_BEAM_W = [10, 12, 14, 16, 18, 20]; // Blk Magic: its width, u
const IFR_BURN_S = [1.2, 1.4, 1.6, 2, 2.6, 3.2] /* HALVED, the ticks x2 (owner, 2026-10-19: "reduce duration of spokes and increase damage" - the same burn a flare in half the time); was [2.4 .. 6.4], VI 10 */ /* x2, longer flares (owner, 2026-10-19: "make the flares last longer"), with CATCHING FIRE and faster, harder ticks (countermx 61-69 spread @6pts 4 seeds: 9/69/8/37 swarm/fast/shield/armor); was [1.2, 1.4, 1.6, 2, 2.6, 3.2] - was [1.5, 2, 2.5, 3, 4, 5] (countermx 61-69 spread @6pts, 2026-10-19, pellets in random directions: swarm/fast/shield/armor 8/35/9/56 -> 13/77/23/58 - a short burn: fast is clear of the flares round its old spot before the next tick, a slow body still burns; with the radius, the ball speed or the tick period fast stayed 33-47) */; // Blk Magic: a flare burns this long (VI 10 = EFFECT_MAX_S)
const IFR_TICK_S = [0.54, 0.38, 0.37, 0.36, 0.3, 0.27] /* stop I faster (axis balance 2026-10-19: the 6-point spread build sits on Hellfire I - shields 35% -> 16% leaked); was [0.54, 0.48, 0.43, 0.36, 0.3, 0.27] - x0.6 with the longer flares (2026-10-19); was [0.9, 0.8, 0.72, 0.6, 0.5, 0.45] - was [0.3 .. 0.15] VI 0.12, with TICK_K (countermx 61-69 spread @6pts, 2026-10-19: few big ticks - a slow body on a beam takes several, a fast one walks off between two, and a big tick gets through armor; 18/75/23/90 -> 20/69/39/51 at TICK_K x5, the shield fixed by the pellets) */; // Blk Magic: s between burn ticks
const IFR_TICK_K = [0.41, 0.6, 0.91, 1.36, 1.52, 2.27] /* x0.5 with the flares x3 (sweep 2026-10-19: more ticks to pop shields, less each - armor shrugs them off) */ /* x2 with the flares halved (2026-10-19); was [0.41, 0.6, 0.91, 1.36, 1.52, 2.27], VI 3.78 */ /* AXIS BALANCE (2026-10-19): stops IV and VI x0.75 - Hellfire carried the tower (81-89 mean leak 22 vs Meteor 80); was [0.41, 0.6, 0.91, 1.36, 2.02, 3.02] */ /* x1.2 with the longer flares (2026-10-19); was [0.34, 0.5, 0.76, 1.13, 1.68, 2.52] - was [0.08 .. 0.6] VI 1 (x4.2, moved with TICK_S: x5 overshot armor to 35%, x3.5 left it 68%) */; // Hellfire: a tick, x the blast hit
const IFR_BLAST_R = [117, 150, 150, 150, 169, 195] /* stop I 117 -> 150 (marks rule, 2026-10-19: every tower needs checks on 2 types - swarm 14% was too near the seven-tower mean for one; 10% at 150) - x1.3: bigger and more visible (owner, 2026-10-19: "make the initial explosion slower and bigger and more visible"); was [90, 90, 100, 115, 130, 150], base 90, was 80 (solo.mjs 2026-10-19, after the random pellets and the slow ticks: a lone L1 1/0/0 -> 0/0/0, 5 seeds 1/0/0/2/2 -> 0/0/0/0/2 - a single wave-4 swarm body now and then) */ /* was [60 .. 130] VI 160 (solo.mjs 2026-10-19, ball 360 + a 1 s charge: a lone L1 0/2/0 -> 0/0/0, every L1 pair with IFR beats the Star on every slot pair) */; // Firaga: the ring's reach, u
const IFR_BLAST_K = [1.5, 2.25, 3.45, 5.25, 12, 22] /* AXIS BALANCE (2026-10-19): Firaga's top stops up (101-109 mean leak 82 -> 78); was [1.5, 2.25, 3.45, 5.25, 9, 15] */ /* was [1, 1.5, 2.3, 3.5, 6, 10] VI 18 (countermx 61-69 spread @6pts, 2026-10-19: leaked swarm/fast/shield/armor 27/91/42/100 -> 18/75/23/90) */; // Firaga: the blast hit, x TOWERS.ifr.dmg
const IFR_PELLETS = [5, 6, 8, 10, 14, 19] /* HALVED (owner, 2026-10-20: "still too many pellets, halve the counts" - they pass through and re-hit now); was [10, 12, 15, 20, 28, 38] */ /* DOUBLED, each flare a random size (owner, 2026-10-19: "double the number of pellets (and hellfires) but add size jitter"; were 5 .. 21, VI 24) */ /* base 5 (owner, 2026-10-19: "start off by shooting 5 pellets"); was [5 .. 10] VI 12 (countermx 61-69 spread @6pts, 2026-10-19, when pellets flew at what stood in the blast: a pellet pops a shield and lights a flare; with the tick at x3 the period, x5 the hit: 20/69/39/51 -> 17/58/19/35) */; // Firaga: pellets a burst
const IFR_PELLET_DK = [0.3, 0.45, 0.7, 1, 1.6, 2.5]; // Blk Magic: a pellet's pass-through hit, x TOWERS.ifr.dmg (owner, 2026-10-20: "pellets should also deal damage en route, scaled by blk magic"; VI 4)
const IFR_GIANT_K = 4; // Mega Firaga (Blk Magic VI, owner 2026-10-20): ONE giant flare at the impact spot, its size and hit x a VI flare's
const IFR_PELLET_V = 100 /* was 170 (owner, 2026-10-20: "slow down the pellets so that they have a chance to hit the same enemy more than once") - was 300 (owner, 2026-10-19: "make the hellfire pellets more visible and slower") */, IFR_PELLET_HIT = 4, IFR_PELLET_K = 0.25; // a pellet's speed and hit pad; a pellet hit x the blast hit (x Firaga's blastK: the passthrough hit grows with the tier)
const IFR_PELLET_SPREAD_S = 0.5; // s: a burst's pellets leave at random times over this (owner, 2026-10-20: "randomize the pellet launch times over 0.5s")
const IFR_PELLET_REHIT = 0.2; // s: a pellet still touching an enemy it hit hits it again this often (a slow pellet riding along a body hits it several times)
const IFR_PELLET_ARM = 16; // u a pellet flies before it can hit (about a body): born at the burst spot, it would else stop on the enemy standing there, and nothing would fly or miss (owner, 2026-10-19)
let IFR_PELLET_REACH = 1.2; /* x3, landing NEAR more often than far (IFR_LAND_POW) (owner, 2026-10-19: "triple the range that the pellets can end up in ... make the probability of landing closer be higher") */ // a pellet flies this x the blast radius (owner, 2026-10-19: "reduce pellet range" 1.0 -> 0.6, then "further reduce spread" -> 0.4 - its flare lands nearer the burst, on the crowd; was the whole radius). let: the simulator sweeps it
const IFR_FLARE_MAX = 240; // live flares a tower at most: the oldest goes (perf; 120 before Backdraft's triple flare, 60 before the pellets doubled)
const IFR_TRIPLE_N = 3, IFR_TRIPLE_JIT = 14; // Backdraft (Firaga VI, owner 2026-10-20: "triple flare, small position jitter"): flares a landed pellet, each up to JIT u off the spot
// a flare's SIZE (owner, 2026-10-19): a normal draw round half the max (mean IFR_FLARE_MEAN, sd IFR_FLARE_SD, kept in [IFR_FLARE_MIN, 1])
// times IFR_FLARE_K x the Hellfire tier's length and width; a pellet lands at IFR_PELLET_REACH x the blast radius x u^IFR_LAND_POW (u uniform:
// a power over 1 lands more of them near). let: the balance runs sweep IFR_FLARE_K and IFR_LAND_POW
let IFR_FLARE_K = 6 /* x2 (owner, 2026-10-20: "double flare sizes"); was 3 */, IFR_LAND_POW = 1.5, IFR_FLARE_WS = 1; /* swept 2026-10-19 (countermx 61-69 spread @6pts, swarm/fast/shield/armor % leaked): K 1 POW 2: 17/74/64/49 - small flares popped no shields; K 3 POW 1.5 + ticks x0.5: 11/63/18/51 (the old six-beam IFR: 11/69/14/56) */ // IFR_FLARE_WS: the width's share of the jitter (W x s^WS; 0 = a full-width spoke at any length)
const IFR_FLARE_MEAN = 0.5, IFR_FLARE_SD = 0.45 /* x3 (owner, 2026-10-20: "triple flare size jitter"; was 0.15) - more of them hit the [MIN, 1] clamp */, IFR_FLARE_MIN = 0.15;
const ifrNormal = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()); // (Box-Muller; Math.random is the sim's seeded one)
const IFR_ROUTE_ST = { shieldPop: 1 }, IFR_FIRE_ST = { noFx: true, noNum: true, shieldPop: 1 }, IFR_PELLET_ST = { shieldPop: 1 }, IFR_BURN_ST = { noFx: true, noNum: true, shieldPop: 1 }; // (damage: st.shieldPop; the burn is quiet)

SKILL_TREES.ifr = [
  { id: "meteor", name: "Meteor", tiers: [{ name: "Pebble" }, { name: "Stone" }, { name: "Rock" }, { name: "Boulder" }, { name: "Meteor" }] },
  { id: "hellfire", name: "Hellfire", tiers: [{ name: "Kindle" }, { name: "Flare" }, { name: "Blaze" }, { name: "Inferno" }, { name: "Conflagration" }] },
  { id: "firaga", name: "Blk Magic", tiers: [{ name: "Fire" }, { name: "Fire" }, { name: "Fira" }, { name: "Fira" }, { name: "Firaga" }] }, /* Blk Magic: Fire, Fira, Firaga, Mega Firaga (owner, 2026-10-20; was the Firaga axis - id kept for saves). Stops I III V VI: the 2 and 4 an old save may hold read as the stop below */
];
SKILL_MOVE.ifr = { meteor: [[1, 1], [1.1, 1], [1.2, 1], [1.3, 1], [1.4, 1], [1.5, 1]], hellfire: [[1, 1], [1.06, 1], [1.12, 1], [1.18, 1], [1.24, 1], [1.3, 1]], firaga: [[1, 1], [1, 1.3], [1, 1.6], [1, 2], [1, 2.2], [1, 2.4]] }; // Meteor and Hellfire = range, Firaga = slide (the fire roams)

function ifrSkillStats(t, s, b) {
  const m = skillOf(t, "meteor"), h = skillOf(t, "hellfire"), f = skillOf(t, "firaga");
  s.range = b.range * RANGE_BONUS; s.targets = 1;
  // EACH AXIS ITS OWN PART, ITS OWN DAMAGE (owner, 2026-10-20: "axes don't feel unique nor impactful"), every hit x TOWERS.ifr.dmg:
  // Meteor the ball in flight, Hellfire the fire it leaves, Blk Magic the pellets and their flares
  s.chargeS = IFR_CHARGE_S[m]; s.ballV = IFR_BALL_V[m]; s.ballR = IFR_BALL_RAD[m]; s.routeHit = b.dmg * IFR_ROUTE_K[m];
  s.fireR = Math.max(s.ballR, IFR_FIRE_R[h]); s.fireV = IFR_FIRE_V[h]; s.fireLinger = IFR_FIRE_LINGER[h]; s.fireHit = b.dmg * IFR_FIRE_K[h];
  s.pellets = IFR_PELLETS[f]; s.pelletHit = b.dmg * IFR_PELLET_DK[f]; s.giant = f >= CAPSTONE_TIER;
  s.beamL = IFR_BEAM_L[f]; s.beamW = IFR_BEAM_W[f]; s.burnS = Math.min(EFFECT_MAX_S, IFR_BURN_S[f]); s.tickS = IFR_TICK_S[f]; s.flareHit = b.dmg * IFR_TICK_K[f];
  // (the old shape, read by the code Tasks 3-5 of the 2026-10-20 plan replace; gone with it)
  s.routeK = IFR_ROUTE_K[m]; s.tickK = IFR_TICK_K[f]; s.blastR = IFR_BLAST_R[f]; s.blastK = IFR_BLAST_K[f]; s.backdraft = s.giant;
  s.dmg = b.dmg * s.blastK; s.rate = 1 / s.chargeS;
  s.skill = true;
}
// ---------- the charge ----------
// ONE CHARGE (owner, 2026-10-20: "always one charge ... charge is centered on the hexagon formed by intersection of tower and floor"):
// it fills over chargeS at the tower's centre and waits there, full, until an enemy is in range
const ifrCentre = t => { const c = CELLS[t.cell]; return { x: t.x ?? c.x, y: t.y ?? c.y }; };
function ifrInit(t) {
  if (t.ifrInit0) return;
  for (const k of ["ifrSlot0", "ifrReady", "ifrLaunchCd", "ifrRings", "ifrFs"]) delete t[k]; /* a 6.4 tower's slots */
  t.ifrInit0 = true; t.ifrCharge = 0; t.ifrBalls = []; t.ifrFires = []; t.ifrPellets = []; t.ifrFlares = [];
}
function ifrCharge(t, st, dt) { t.ifrCharge = Math.min(1, t.ifrCharge + dt / Math.max(0.01, st.chargeS)); }
// "Always launch when meteor available" (owner): full + an enemy in range (the tower's targeting) = it flies, aimed at where that enemy
// stands NOW, never led (the fast weakness); its size is fixed at launch
function ifrLaunch(t, st) {
  if (t.ifrCharge < 1) return;
  const e = pickTargets(t, st, 1)[0];
  if (!e) return;
  const c = ifrCentre(t), d = Math.hypot(e.x - c.x, e.y - c.y) || 1;
  t.ifrBalls.push({ x: c.x, y: c.y, ax: e.x, ay: e.y, vx: (e.x - c.x) / d * st.ballV, vy: (e.y - c.y) / d * st.ballV, left: d / st.ballV, r: st.ballR, hit: [] }); /* hit: enemy ids struck en route */
  t.ifrCharge = 0; t.shots = (t.shots || 0) + 1; sfx("ifr");
}
function stepIfr(t, dt) {
  ifrInit(t);
  const st = towerStats(t);
  ifrCharge(t, st, dt);
  ifrLaunch(t, st);
  stepIfrBalls(t, st, dt); stepIfrFires(t, st, dt); stepIfrPellets(t, st, dt); stepIfrFlares(t, st, dt);
}
// ---------- the flight (METEOR, owner 2026-10-20: "meteor only affects en route damage"): every enemy its body touches is hit once for
// st.routeHit; it lands at its AIM spot whatever happened to the target ----------
function stepIfrBalls(t, st, dt) {
  if (!t.ifrBalls.length) return;
  const all = G.enemies;
  for (const b of t.ifrBalls) {
    const s = Math.min(dt, b.left); b.x += b.vx * s; b.y += b.vy * s; b.left -= dt; /* s: the landing frame stops at the aim spot, never hit-tests past it */
    for (const e of all) { /* every enemy, not projGrid's cell: a meteor is wider than a cell's pad (one or two a tower - cheap) */
      if (e.dead || !e.seen || b.hit.includes(e.id)) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + b.r;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      b.hit.push(e.id); const amt = st.routeHit;
      const h0 = hitFrom; HIT_AT.x = b.x - b.vx; HIT_AT.y = b.y - b.vy; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_ROUTE_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
    }
    if (b.left <= 0) ifrImpact(t, st, b);
  }
  keepLive(t.ifrBalls);
}
// THE IMPACT: the meteor's black fill is gone, its outline and glow become the FIRE (Hellfire, owner 2026-10-20), and the pellets fly
// (Blk Magic). The fire's numbers are fixed at impact; fires stack (owner: few, heavy meteors keep that rare)
function ifrImpact(t, st, b) {
  (t.ifrFires ||= []).push({ x: b.ax, y: b.ay, r: Math.min(b.r, st.fireR), R: st.fireR, v: st.fireV, hold: st.fireLinger, fade: IFR_FIRE_FADE, tick: 0, hit: st.fireHit, left: 1 });
  ifrPelletBurst(t, st, b.ax, b.ay);
  sfx("ifrblast");
}
// the pellets out in random directions, enemies there or not (owner, 2026-10-19: "shooting 5 pellets in random directions that each make asterisks")
function ifrPelletBurst(t, st, x, y) {
  const R = st.blastR, fs = ifrPelletFlares(st);
  for (let i = 0; i < st.pellets; i++) {
    /* ANY direction, evenly (owner, 2026-10-19: "remove the backwards bias"); a RANDOM distance weighted near (IFR_LAND_POW > 1) */
    const a = Math.random() * 2 * Math.PI, cx = Math.cos(a), cy = Math.sin(a), d = R * IFR_PELLET_REACH * Math.random() ** IFR_LAND_POW;
    t.ifrPellets.push({ x, y, ax: x + cx * d, ay: y + cy * d, vx: cx * IFR_PELLET_V, vy: cy * IFR_PELLET_V, left: d / IFR_PELLET_V, flown: 0, age: 0, wait: Math.random() * IFR_PELLET_SPREAD_S, hit: {}, fs: fs[i] }); /* hit: enemy id -> age at its last hit (plain data: G clones) */
  }
}
// CATCHING FIRE (the flares' rule, the fire's too): an enemy burns only at a tick it was ALSO in the fire at the tick before - what stands
// in it burns, what runs through it does not (the fast weakness). was / now: ids touching at the last tick / this one (plain data)
function ifrCatch(was, now, id) { now[id] = 1; return !IFR_CATCH || !!was[id]; }
// THE FIRE: grows at v to R, then holds (still burning), then fades (hitting nothing); every IFR_FIRE_TICK_S a quiet tick on each enemy
// inside it (its body within r), popping a shield charge
function stepIfrFires(t, st, dt) {
  if (!t.ifrFires || !t.ifrFires.length) return;
  for (const f of t.ifrFires) {
    if (f.r < f.R) f.r = Math.min(f.R, f.r + f.v * dt);
    else if (f.hold > 0) f.hold -= dt;
    else { f.fade -= dt; if (f.fade <= 0) f.left = 0; continue; }
    f.tick += dt;
    if (f.tick < IFR_FIRE_TICK_S) continue;
    f.tick -= IFR_FIRE_TICK_S; ifrTickFire(t, st, f);
  }
  keepLive(t.ifrFires);
}
function ifrTickFire(t, st, f) {
  const was = f.on || IFR_NONE, now = f.on = {}, all = G.enemies, defs = ENEMIES;
  for (let i = 0; i < all.length; i++) {
    const e = all[i];
    if (e.dead || !e.seen) continue;
    const r = f.r + defs[e.type].size * (e.sizeMul || 1), ex = e.x - f.x, ey = e.y - f.y;
    if (ex * ex + ey * ey > r * r || !ifrCatch(was, now, e.id)) continue;
    damage(e, f.hit, t, false, false, IFR_FIRE_ST); onHit(e, t, st, f.hit);
  }
}
// the PELLETS: non-homing, straight out to their random distance, PASSING THROUGH (owner, 2026-10-20: "pellets should always
// passthrough + deal damage on passthrough based on firaga lvl"): every enemy touched takes the pellet hit, again every IFR_PELLET_REHIT s it stays touching (st.dmg x IFR_PELLET_K
// - st.dmg is the Firaga blast hit, so it grows with the tier), and the pellet flies on; where it lands, a FLARE (three at Backdraft).
// It hits nothing until it has flown IFR_PELLET_ARM (it is born on top of whatever stood at the burst spot)
function stepIfrPellets(t, st, dt) {
  if (!t.ifrPellets.length) return;
  const g = projGrid();
  for (const p of t.ifrPellets) {
    if (p.wait > 0) { p.wait -= dt; continue; } /* not launched yet (IFR_PELLET_SPREAD_S) */
    const s = Math.min(dt, p.left); p.x += p.vx * s; p.y += p.vy * s; p.left -= dt; p.flown += IFR_PELLET_V * s; p.age += dt; /* s: the landing frame stops at the aim spot */
    for (const e of p.flown < IFR_PELLET_ARM ? GRID_NONE : enemiesNear(p.x, p.y, g)) {
      if (e.dead || p.age - (p.hit[e.id] ?? -1e9) < IFR_PELLET_REHIT) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + IFR_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      p.hit[e.id] = p.age; const amt = st.dmg * IFR_PELLET_K, h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_PELLET_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
    }
    if (p.left > 0) continue;
    const fs = p.fs || ifrFlareSizes(st);
    if (st.backdraft) for (let i = 0; i < IFR_TRIPLE_N; i++) { const a = Math.random() * 2 * Math.PI, d = IFR_TRIPLE_JIT * Math.sqrt(Math.random()); ifrFlare(t, st, p.ax + Math.cos(a) * d, p.ay + Math.sin(a) * d, fs[i % fs.length]); }
    else ifrFlare(t, st, p.ax, p.ay, fs[0]);
  }
  keepLive(t.ifrPellets);
}
// a flare's size s (x the Hellfire length): rolled when its BALL LAUNCHES (owner, 2026-10-20: "pellet size should be relative the size of
// the flare that it will produce"), so the pellet - and the ball, the area of all its pellets - is drawn to it
function ifrFlareS() { return IFR_FLARE_K * Math.min(1, Math.max(IFR_FLARE_MIN, IFR_FLARE_MEAN + IFR_FLARE_SD * ifrNormal())); }
function ifrFlareSizes(st) { const n = st.backdraft ? IFR_TRIPLE_N : 1, out = []; for (let i = 0; i < n; i++) out.push(ifrFlareS()); return out; } // one pellet's flares
function ifrPelletFlares(st) { const out = []; for (let i = 0; i < st.pellets; i++) out.push(ifrFlareSizes(st)); return out; } // a burst's pellets'
function ifrFlare(t, st, x, y, s = ifrFlareS()) {
  if (t.ifrFlares.length >= IFR_FLARE_MAX) t.ifrFlares.shift();
  t.ifrFlares.push({ x, y, L: st.beamL * s, W: st.beamW * IFR_FLARE_K * (s / IFR_FLARE_K) ** IFR_FLARE_WS, life: st.burnS, left: st.burnS, tick: 0, edges: false }); /* (edges: the old VI, beams to the box edge - off since 2026-10-19; ifrBeamEnd keeps the path) */
}
// the FLARE: IFR_BEAMS beams from the burst point, a + and a small x (world angles: 3D is a view), burning for
// `life` - every tickS a QUIET tick on each enemy touching a beam, popping one shield charge (Hellfire VI: the longest beams;
// to the play box's edge until 2026-10-19 - the edges path below stays, unused)
const IFR_BODY_MAX = 150; // a generous bound on the biggest body: base size 28 (the biggest) x the HP-log growth (about x2 by wave 119) x a boss's arcana (up to about x2), rounded up
// a flare's SHAPE (owner, 2026-10-19: "a big + overlapping with a tiny x"; was a six-beam star): four long beams on the axes and four short
// ones, IFR_X_K as long, on the diagonals - IFR_BEAMS in all
const IFR_BEAMS = 8, IFR_X_K = 0.15; /* the x half as big again (owner, 2026-10-19; was 0.3) */
// one beam from (x, y) at angle a: len u long, or to the play box's edge at Hellfire VI (the first wall the ray meets)
function ifrBeamEnd(x, y, a, len, edges) {
  const c = Math.cos(a), s = Math.sin(a);
  if (edges) {
    const b = phoneBox(); let t = Infinity;
    if (c > 1e-9) t = Math.min(t, (b.x1 - x) / c); else if (c < -1e-9) t = Math.min(t, (b.x0 - x) / c);
    if (s > 1e-9) t = Math.min(t, (b.y1 - y) / s); else if (s < -1e-9) t = Math.min(t, (b.y0 - y) / s);
    len = Math.max(0, t);
  }
  return [x, y, x + c * len, y + s * len];
}
function ifrBeamEnds(f) { const out = []; for (let k = 0; k < IFR_BEAMS; k++) out.push(ifrBeamEnd(f.x, f.y, k * Math.PI / 4, k % 2 ? f.L * IFR_X_K : f.L, f.edges)); return out; } // (even k: the +, odd: the x)
// a flare's tick: every live on-screen enemy whose body touches ANY of its beams takes one quiet tick (one hit a flare a tick, on
// two beams too). Exact, not sampled: a cheap radius reject (a flare that cannot reach the enemy), then point-to-segment on its
// beams. 40 Hellfire-VI flares x 200 enemies x 6 beams is ~50k dot products, under the smoke's budget (2026-10-19; the grid
// sampling it replaced could skip a body a diagonal beam clipped at a cell corner)
// CATCHING FIRE (2026-10-19, with the owner's longer flares): an enemy burns only at a tick it was ALSO on a spoke at the tick
// before - what stands in the fire burns, what runs through it does not. Long flares blanket the lanes; without this the fast
// weakness (owner's design) was gone (countermx 61-69: fast 30% leaked, armor 77%). let: the simulator can switch it off
let IFR_CATCH = true;
const IFR_NONE = {};
function ifrTickFlare(t, st, f) {
  const ends = ifrBeamEnds(f), half = f.W / 2, amt = st.dmg * st.tickK, reach = f.edges ? Infinity : f.L + half + IFR_BODY_MAX;
  const all = G.enemies, defs = ENEMIES; /* (locals: a global read in this loop costs more than the arithmetic) */
  const was = f.on || IFR_NONE, now = f.on = {}; /* CATCHING FIRE: who touched a spoke at the last tick (ids - plain data, G clones) */
  for (let i = 0; i < all.length; i++) {
    const e = all[i];
    if (e.dead || !e.seen) continue;
    const r = defs[e.type].size * (e.sizeMul || 1) + half, ex = e.x - f.x, ey = e.y - f.y;
    if (ex * ex + ey * ey > reach * reach) continue; /* no beam this short can reach it */
    let hit = false;
    for (let k = 0; k < ends.length; k++) {
      const b = ends[k], x0 = b[0], y0 = b[1], dx = b[2] - x0, dy = b[3] - y0, L2 = dx * dx + dy * dy || 1;
      let u = ((e.x - x0) * dx + (e.y - y0) * dy) / L2; if (u < 0) u = 0; else if (u > 1) u = 1; /* (no Math calls in the hot loop) */
      const px = x0 + dx * u, py = y0 + dy * u;
      const qx = e.x - px, qy = e.y - py; if (qx * qx + qy * qy <= r * r) { hit = true; break; }
    }
    if (!hit) continue;
    if (!ifrCatch(was, now, e.id)) continue; /* it burns only if it was on a spoke at the last tick too: a fast enemy crosses between ticks */
    damage(e, amt, t, false, false, IFR_BURN_ST); onHit(e, t, st, amt); /* not quiet=true: damage() lets a shield bounce a quiet hit unpopped; IFR_BURN_ST's noFx + noNum keep it silent (ACD's pools, the same way) */
  }
}
function stepIfrFlares(t, st, dt) {
  if (!t.ifrFlares.length) return;
  for (const f of t.ifrFlares) {
    f.left -= dt; f.tick += dt;
    if (f.tick < st.tickS) continue;
    f.tick -= st.tickS; ifrTickFlare(t, st, f);
  }
  keepLive(t.ifrFlares);
}
// ---------- sizes the logic shares with the look (aspira-ifrit-draw.js): the ember, the ring's glow ----------
/* a pellet is an EMBER (owner, 2026-10-19: "more visible"): a faint halo, an orange disc, a white core, and a tail of IFR_TAIL_N
   segments behind it at falling alpha. Sized for a phone (the board ~1000 u across 430 px) */
const IFR_EMBER_HALO = 9, IFR_EMBER_R = 4, IFR_EMBER_CORE = 1.5, IFR_TAIL_N = 3, IFR_TAIL_S = 0.05;
/* the RING is a glow, [width u, alpha] wide faint / mid / bright core, plus a faint disc inside the front */
const IFR_RING_GLOW = [[22, 0.22, "tifr"], [11, 0.45, "tifr"], [4, 1, "tifr"], [1.5, 0.95, "white"]], IFR_RING_DISC = 0.14, IFR_RING_THIN = 0.5; /* every layer's WIDTH x this (owner, 2026-10-20: "keep opacity, reduce thickness"; for a moment it was the alpha) */ /* + a WHITE core (owner, 2026-10-19) */ /* brighter, wider (owner, 2026-10-19: "more visible"; were [16, 0.14], [8, 0.3], [3, 0.9], disc 0.08) */
// an ember's SIZE x IFR_EMBER_*: a pellet's, its flare's mean size over the average flare's (owner, 2026-10-20: "pellet size should be
// relative the size of the flare that it will produce"); a ball's, the AREA of all its pellets (owner: "meteor should use same visuals
// as pellet, except have the same area as total pellets") - the root of the summed squares
function ifrEmberK(fs) { if (!fs) return 1; let a = 0; for (const s of fs) a += s; return a / fs.length / (IFR_FLARE_K * IFR_FLARE_MEAN); }
function ifrBallK(fs) { if (!fs) return 1; let a = 0; for (const f of fs) a += ifrEmberK(f) ** 2; return Math.sqrt(a); }
