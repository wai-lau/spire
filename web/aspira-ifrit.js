// /spire - IFR, IFRIT (owner's design 2026-10-19, axes redone 2026-10-20 - the fire aeon of FFX, fire colours): strong against swarm
// + shield. ONE charge fills at the tower's centre; full + an enemy in range = ONE meteor, homing onto it (led) from any distance - onto its
// corpse if it dies. Its FIRST hit makes the FIRE (Hellfire: it grows to its max, burns what stands in it in many small ticks, lingers, and
// once grown lights flares inside it, as many as its area) and a 360-degree FAN of meteors (Meteor's count) that home within 50 u and hit
// for damage, each lighting a FLARE where it lands (Flare, id firaga: their size, damage and burn; its capstone three a landing). Meteor's
// capstone fissures each fan hit into two. Loaded after aspira-car.js (the simulator too); the look is aspira-ifrit-draw.js. Every list
// on the tower holds plain objects (ids and coordinates, never enemy refs): autosave clones G.
// Spec: docs/superpowers/specs/2026-10-20-ifrit-axes-redesign-design.md (much changed since by the owner's notes, 2026-10-20 - the code is the truth)

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const IFR_CHARGE_S0 = 1.4; // s to fill THE charge at tier 0 - the STAT CURVE's rate shortens it (tier redesign 2026-10-24; was Meteor's table 1.4 1.4 1.4 1.2, V 0.6)
const IFR_BALL_V = [360, 390, 450, 510] /* was [140 .. 320] (solo.mjs 2026-10-19: a lone L1 lost 25/21/23 lives on waves 1-11 and x4 the hit barely moved it - at 140 u/s the ring opened after armor and swarm had walked out of it; 360: 8/6/2) */; // Meteor: u/s in flight - SLOW against fast (130 u/s walks out of the blast past ~150 u), the fast weakness (VI 540)
const IFR_ROUTE_K0 = 1.5; // the meteor's hit, x the tower's damage - ONE number since the tier redesign (2026-10-24; was Meteor's 1.5 2 3 80, V 800 - the curve's now)
const IFR_FAN = [6, 7, 7, 8] /* BATTERY 6.6.0 (2026-10-20): fewer at the top (each fan hit pops a shield - Meteor was the shield answer); VI 9 */; // Meteor: the meteors the first impact fans out round 360 degrees (owner, 2026-10-20: "initial fan counts should be something like 0:5 1:7 2:9 3:12"; VI 12, its fissure the capstone)
const IFR_FAN_T = 0.4, IFR_FAN_SD = 0.3, IFR_FAN_MAX_S = 1; // the fan's release times: a bell round FAN_T s, sd FAN_SD, kept in [0, FAN_MAX_S] ("increase timing jitter to 0.3s around 0.4s")
let IFR_HOME_R = 400; // BATTERY 6.6.0: 50 -> 400 (owner's lever: homing distance). (let: the sims sweep it) // HOMING (owner, 2026-10-20: "start homing in on target at 50u"): an enemy whose body comes within this of a meteor is locked and the meteor steers straight at it
const IFR_FORK_DEG = 60, IFR_FISSURE_DEG = 30, IFR_FLY_S = 10, IFR_FLY_R = 1400; // the capstone's two fissure meteors fly this far either side of the one that hit; a meteor's longest flight (s); the simulator's 'off screen' (no view): this far from the core
const IFR_BALL_RAD = [2.7, 3, 3.7, 4.7] /* x0.2 (owner, 2026-10-20: "reduce meteor size to 20% of current"; was [13.5 .. 23.5] VI 27) */ /* HALVED (owner, 2026-10-20: "meteor is also too big, halve all the current sizes"); was [27 .. 47] VI 54 */; // Meteor: the meteor's radius, u (solo.mjs 2026-10-20: the hex's width across untaken - half of it leaked the wave-4 swarm, 15 lives; owner: "twice the size" of it at VI: 54, capstone.js)
// Hellfire: THE FIRE the meteor leaves (owner, 2026-10-20; no ring, no burn - stepIfrFires): it opens at the meteor's size, grows at FIRE_V to FIRE_R (never below IFR_FIRE_FLOOR x the meteor) ("small ticks, many"), lingers FIRE_LINGER s at full size
const IFR_FIRE_FLOOR = 16; // the fire's max is never under this x the meteor's radius - with no Hellfire too (owner, 2026-10-20: "even with no hellfire bought, fire should start at 16x meteor size"; was 1x)
const IFR_FIRE_R = [0, 60, 85, 160] /* BATTERY 6.6.0 (2026-10-20): owner: "spread hellfire across more time and space"; VI 180 */; // u radius (VI 160: "6 towers across", capstone.js)
const IFR_FIRE_V = [180, 240, 360, 540]; // u/s (VI 660) - x3 (owner, 2026-10-21: "triple hellfire expansion speed"; was 60 .. 180, VI 220)
// FLARE SIZES (owner, 2026-10-20; LOCKED - no size change without asking): the capstone (VI) is the old III, 100 x 16 ("don't make flares
// larger than the current one for III"); the untaken flare is twice its scaled size ("double the size of the bottom end, squeeze the others
// between") and the stops between keep their places, squeezed into the range left (ifrSqueeze). The old scale: 50 .. 140 (VI 210) x 10 .. 20 (VI 24)
const ifrSqueeze = (old, oldTop, top, bottom) => old.map(v => bottom + (v - old[0]) / (oldTop - old[0]) * (top - bottom));
const IFR_BEAM_L = ifrSqueeze([50, 65, 100, 140], 210, 100, 2 * 50 * 100 / 210); // Flare: a flare beam's length from its centre, u (47.6 .. 77.1, VI 100)
const IFR_BEAM_W = ifrSqueeze([10, 12, 16, 20], 24, 16, 2 * 10 * 16 / 24); // Flare: its width, u (13.3 .. 15.2, VI 16)
const IFR_BURN_S = [1.2, 1.4, 2, 6] /* BATTERY 6.6.0 (2026-10-20): Flare burns long at the top (more ticks, more shields popped); VI 10 */ /* HALVED, the ticks x2 (owner, 2026-10-19: "reduce duration of spokes and increase damage" - the same burn a flare in half the time); was [2.4 .. 6.4], VI 10 */ /* x2, longer flares (owner, 2026-10-19: "make the flares last longer"), with CATCHING FIRE and faster, harder ticks (countermx 61-69 spread @6pts 4 seeds: 9/69/8/37 swarm/fast/shield/armor); was [1.2, 1.4, 1.6, 2, 2.6, 3.2] - was [1.5, 2, 2.5, 3, 4, 5] (countermx 61-69 spread @6pts, 2026-10-19, pellets in random directions: swarm/fast/shield/armor 8/35/9/56 -> 13/77/23/58 - a short burn: fast is clear of the flares round its old spot before the next tick, a slow body still burns; with the radius, the ball speed or the tick period fast stayed 33-47) */; // Blk Magic: a flare burns this long (VI 10 = EFFECT_MAX_S)
const IFR_TICK_S = [0.5, 0.5, 0.48, 0.44] /* x2, the hit unchanged (owner, 2026-10-24, marks target C: "!4 seem OK" - half the shield pops; was 0.25 0.25 0.24 0.22) */ /* untaken 0.54 -> 0.25 (solo.mjs 2026-10-20, after the halved meteor and charge: a lone L1 leaked the wave-4 swarm, 6 lives, whatever the damage - a flare needs two ticks to burn) */ /* stop I faster (axis balance 2026-10-19: the 6-point spread build sits on Hellfire I - shields 35% -> 16% leaked); was [0.54, 0.48, 0.43, 0.36, 0.3, 0.27] - x0.6 with the longer flares (2026-10-19); was [0.9, 0.8, 0.72, 0.6, 0.5, 0.45] - was [0.3 .. 0.15] VI 0.12, with TICK_K (countermx 61-69 spread @6pts, 2026-10-19: few big ticks - a slow body on a beam takes several, a fast one walks off between two, and a big tick gets through armor; 18/75/23/90 -> 20/69/39/51 at TICK_K x5, the shield fixed by the pellets) */; // Blk Magic: s between burn ticks
const IFR_TICK_K0 = 0.784; // a Flare tick, x the tower's damage - ONE number since the tier redesign (2026-10-24: its tier I value); IFR_TICK_K[0] below stays the FIRE flares' base
const IFR_TICK_K = [0.41, 1.5, 1.6, 1.6] /* BATTERY 6.6.0 (2026-10-20): Flare: VI 2.5 */ /* x0.5 with the flares x3 (sweep 2026-10-19: more ticks to pop shields, less each - armor shrugs them off) */ /* x2 with the flares halved (2026-10-19); was [0.41, 0.6, 0.91, 1.36, 1.52, 2.27], VI 3.78 */ /* AXIS BALANCE (2026-10-19): stops IV and VI x0.75 - Hellfire carried the tower (81-89 mean leak 22 vs Meteor 80); was [0.41, 0.6, 0.91, 1.36, 2.02, 3.02] */ /* x1.2 with the longer flares (2026-10-19); was [0.34, 0.5, 0.76, 1.13, 1.68, 2.52] - was [0.08 .. 0.6] VI 1 (x4.2, moved with TICK_S: x5 overshot armor to 35%, x3.5 left it 68%) */; // Hellfire: a tick, x the blast hit
const IFR_BIG_S = 2.8 /* 1260 / (IFR_FLARE_K 4.5 x the VI length 100): the big flare kept at its pinned 1260 u when the flares shrank (2026-10-20; was 4/3 x 210) */, IFR_BIG_K = 4, IFR_BIG_X = 1 / 9; // the Flare capstone's BIG flare, dead centre of a fire once all its flares are lit (owner, 2026-10-20): size x BIG_S the largest flare, hit x BIG_K, its x BIG_X as long (the old giant flare's)
const IFR_ARM_U = 50, IFR_ARM_HIT_U = 100; // a SPAWNED meteor (fan, fissure) flies straight for its first ARM_U, then homes, and hits nothing until it has flown ARM_HIT_U (owner, 2026-10-20: "no homing for first 50", "100u instead of 50u for the non-hit")
const IFR_FUSE_U = 200, IFR_FUSE_SD = 50, IFR_FUSE_LO = 150, IFR_FUSE_HI = 300; // owner, 2026-10-20: "meteors should explode around 200u, spread between 150u and 300u instead" (was round 400, sd 300); sd 50 my call // a SPAWNED meteor's FUSE: unspent, it bursts (a flare) once it has flown a distance drawn from a bell round FUSE_U, sd FUSE_SD, kept in [FUSE_LO, FUSE_HI] (owner, 2026-10-20: "a chance of exploding as it travels, time bell curve explosions around 400u away")
const ifrFuse = () => { let d; do d = IFR_FUSE_U + IFR_FUSE_SD * ifrNormal(); while (d < IFR_FUSE_LO || d > IFR_FUSE_HI); return d; }; // (a draw outside [LO, HI] drawn again)
const IFR_FAN_REF = 6; // the fan size the release bell is set for (ifrFanDelay; was IFR_FAN[0], 0 since the tier redesign)
const IFR_FAN_V = 0.25, IFR_FAN_R = 0.25; // FAN_R: a spawned meteor's size (and reach) x the launched one's (owner, 2026-10-20: "1/2 the size", then "change the core to yellow and make it smaller again" - a quarter, a yellow core) // a fan meteor (and a fissure's) flies at this x the launch speed (owner, 2026-10-20: "quarter the speed of the fissured meteors")
const IFR_TRIPLE_JIT = 10; // the Flare capstone: a landing fan meteor lights THREE flares, each up to this far off its spot (owner, 2026-10-20)
// THE FIRE'S FLARES (owner, 2026-10-20: "after hellfire expands fully, spawn X (start with 6) flares, each 0.1s apart within hellfire radius ...
// more likely closer to center"; "when hellfire levels up, increase flare count to preserve flare density"): IFR_FIRE_FLARES in a fire of radius
// IFR_FIRE_FLARE_R0, as many more as its area is bigger, at r x u^IFR_LAND_POW from its centre (r: the fire's radius as each is lit)
const IFR_FIRE_WINDOW_S = 2, IFR_FIRE_WINDOW_SD = 0.5; // (a fire with no window of its own) a fire lights ALL its flares within this, a bell round 1 s (owner, 2026-10-20: "IFR hellfire lasts way too long, condense all flare spawn times to 2s"; they spread over ~8 s at Hellfire VI before - the count's root x IFR_FIRE_TIME_K, now unused)
let IFR_FIRE_TIME_K = 0.5; // BATTERY 6.6.0: 0.25 -> 0.5 (owner: "spread hellfire across more time" - weaker against fast). (let: the sims sweep it) // every fire flare's time x this - "the hellfire flares are spread over too much time, condense the hellfire ones into a quarter of the time" (owner, 2026-10-20)
// Hellfire: its fire flares' hit x this (VI 1) - Hellfire's own damage lever (battery 2026-10-20; the owner: balance Hellfire by its flare density and damage)
const IFR_FIRE_HK = 1 /* ONE number since the tier redesign (owner, 2026-10-25: a factor on the tower's own damage is one constant, the curve carries the rest; was 1 1 3 6, V 10 by Hellfire tier) */;
const IFR_FIRE_DENS = [1, 1.25, 1.75, 3.96] /* BATTERY 6.6.0 (2026-10-20): denser at the top, thinned to hold the count over the wider fire; VI 7.9 */; // Hellfire: its flares' density x this (VI 3) - "density of hellfire flares should increase as hellfire is levelled" (owner, 2026-10-20)
const IFR_HF_FK = 1.05; // ONE number from Flare I since the tier redesign (2026-10-25; its tier I value - was 1 1.1 1.3 1.5, V 1.6). Flare: the FIRE's flares' hit x this (was VI 1.6; their glow follows the root of the hit, ~x1.26 at VI) - "levelling flare should also raise hellfire damage slightly and increase opacity/brightness slightly" (owner, 2026-10-20)
const IFR_HF_HIT_K = 2, IFR_HF_SHOW = 0.4, ifrHfLife = () => IFR_HF_SHOW; /* 0.5 REAL s each at 1x - 0.4 game s, 1x running BASE_SPEED 0.8 a real s (owner, 2026-10-21: "make it last 0.5s"; was 0.2-3 game s) */ // a FIRE flare HITS ONCE as it appears - x HIT_K its untaken tick, what the old 0.5 s burn dealt - and shows 0.2-3 s, harmless (owner, 2026-10-20: "they should just appear and hit instead of burn, they should each last 0.2-3 seconds")
const IFR_HF_TICK = 0.05; // a FIRE flare ticks this often, each tick that share of its untaken tick's hit (the same burn a second) - "increase tick rate as much as possible" (owner, 2026-10-20): every step cost ~70 ms a frame with 700 flares; 0.05 with staggered phases is what a frame affords
let IFR_HF_LIFE = Math.min(EFFECT_MAX_S, 0.55 * 20) / 20 /* /20 again (owner, 2026-10-20: "shorten by 20x"): 0.5 s */ /* x20 (owner, 2026-10-20: "for hellfire, reduce the number of flares by 20x, make them last 20x longer"), capped by "no effect should last more than 10s" - 10 s; was 0.55 (battery), 0.3 */, IFR_HF_MIN = 0.2, IFR_HF_MAX = 0.35, ifrHfS = () => IFR_FLARE_K * (IFR_HF_MIN + (IFR_HF_MAX - IFR_HF_MIN) * Math.random()); /* SMALLER, less jitter (owner, 2026-10-21: "make the hellfire flares smaller, less size jitter"): IFR_HF_MIN .. IFR_HF_MAX of a full flare (was 10-100%) */ // the fire's flares: each burns 0.5 s, a size drawn evenly from 10% to 100% of the largest (owner, 2026-10-20: "hellfire flares should have a 10-100% size jitter ... they should only last 0.5 seconds each just very numerous and frequent")
const IFR_FIRE_MIN = 6; // a fire lights at least this many (stepIfrFires: same total hit)
let IFR_FIRE_FLARES = 12 / 20 /* /20 (owner, 2026-10-20, with the flares x20 longer): 0.6 - an untaken fire lights one; was 12 */ /* (owner, 2026-10-20: "much more numerous" -> 18, then "reduce the number of hellfire flares" with the jitter: 12 my call; was 6) */, IFR_FIRE_FLARE_R0 = 43.2 /* the untaken fire: 16 x the untaken meteor */, IFR_FIRE_FLARE_T = 1, IFR_FIRE_FLARE_SD = 1 /* owner, 2026-10-20: "spread 1s" (was 0.3) */, IFR_FIRE_FLARE_MAX_S = 4; // each flare's time: a bell round FLARE_T s after the impact, sd FLARE_SD, a draw under 0 drawn again, at most FLARE_MAX_S (owner, 2026-10-20: "bell curve the flare landing around the first second of the fire (allow multiple to be spawned closer together than 0.1s)"; was one each 0.1 s once grown)
// (no cap on live flares - owner, 2026-10-20: "actually no cap"; IFR_FLARE_MAX 240 dropped the oldest)
// a flare's SIZE (owner, 2026-10-19): a normal draw round half the max (mean IFR_FLARE_MEAN, sd IFR_FLARE_SD, kept in [IFR_FLARE_MIN, 1])
// times IFR_FLARE_K x the Flare tier's length and width; IFR_LAND_POW > 1 puts a fire's flares nearer its centre more often (u^POW, u uniform)
// a power over 1 lands more of them near). let: the balance runs sweep IFR_FLARE_K and IFR_LAND_POW
let IFR_FLARE_K = 4.5 /* x0.375 (owner, 2026-10-20: "capstone big flare should be the size of the current 4th upgrade normal flare / reduce 4upgrade normal flare size and all other flares accordingly" - the big flare (IFR_BIG_S x this) = a typical VI flare at 12; then "do not change the flare sizes further without asking"); was 12, 6, 3 */, IFR_LAND_POW = 1.5, IFR_FLARE_WS = 1; /* swept 2026-10-19 (countermx 61-69 spread @6pts, swarm/fast/shield/armor % leaked): K 1 POW 2: 17/74/64/49 - small flares popped no shields; K 3 POW 1.5 + ticks x0.5: 11/63/18/51 (the old six-beam IFR: 11/69/14/56) */ // IFR_FLARE_WS: the width's share of the jitter (W x s^WS; 0 = a full-width spoke at any length)
const IFR_FLARE_MEAN = 0.5, IFR_FLARE_SD = 0.45 /* x3 (owner, 2026-10-20: "triple flare size jitter"; was 0.15) - more of them hit the [MIN, 1] clamp */, IFR_FLARE_MIN = 0.15;
const ifrNormal = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()); // (Box-Muller; Math.random is the sim's seeded one)
const IFR_ROUTE_ST = {}, IFR_BURN_ST = { noFx: true, noNum: true }; // (the burn is quiet; any hit pops one shield charge - damage())

SKILL_TREES.ifr = [
  { id: "meteor", name: "Meteor", tiers: [{ name: "Pebble" }, { name: "Rock" }, { name: "Meteor" }] },
  { id: "hellfire", name: "Hellfire", tiers: [{ name: "Kindle" }, { name: "Blaze" }, { name: "Conflagration" }] },
  { id: "firaga", name: "Flare", tiers: [{ name: "Fire" }, { name: "Fira" }, { name: "Firaga" }] }, /* Blk Magic: Fire, Fira, Firaga, Mega Firaga (owner, 2026-10-20; was the Firaga axis - id kept for saves). Stops I III V VI: the 2 and 4 an old save may hold read as the stop below */
];

function ifrSkillStats(t, s, b) {
  const m = skillOf(t, "meteor"), h = skillOf(t, "hellfire"), f = skillOf(t, "firaga");
  s.targets = 1;
  // EACH AXIS ITS OWN PART, ITS OWN DAMAGE (owner, 2026-10-20: "axes don't feel unique nor impactful"), every hit x TOWERS.ifr.dmg:
  // Meteor the meteors, Hellfire the fire the first one leaves, Flare (id firaga) the flares
  s.fan = IFR_FAN[m]; s.fissure = m >= CAPSTONE_TIER;
  s.ballV = IFR_BALL_V[m]; s.ballR = IFR_BALL_RAD[m]; s.routeK = IFR_ROUTE_K0;
  s.fire = h > 0; s.flares = f > 0; // tier 0: a meteor that just hits - the fire is Hellfire's, the flares Flare's (tier redesign 2026-10-24)
  s.fireR = Math.max(s.ballR * IFR_FIRE_FLOOR, IFR_FIRE_R[h]); s.fireV = IFR_FIRE_V[h]; s.fireDens = IFR_FIRE_DENS[h]; s.fireHK = IFR_FIRE_HK; 
  s.triple = f >= CAPSTONE_TIER; s.hfK = f ? IFR_HF_FK : 1;
  s.beamL = IFR_BEAM_L[f]; s.beamW = IFR_BEAM_W[f]; s.burnS = Math.min(EFFECT_MAX_S, IFR_BURN_S[f]); s.tickS = IFR_TICK_S[f]; s.flareK = IFR_TICK_K0;
  // every hit is st.dmg x its axis's K AT THE HIT, so what towerStats does to dmg after this (the DAM core power, an aura) reaches all of them
  const c = curveBase(t, s, b); s.dmgCurve = s.dmg; s.rateCurve = s.rate; s.range = b.range * RANGE_BONUS * c.range; // the STAT CURVE (tier redesign 2026-10-24)
  s.chargeS = IFR_CHARGE_S0 / c.rate; s.rate = 1 / s.chargeS; // the card's Damage and Rate: the base every hit multiplies, meteors a second
  s.skill = true;
}
// ---------- the charge ----------
// ONE CHARGE (owner, 2026-10-20: "always one charge ... charge is centered on the hexagon formed by intersection of tower and floor"):
// it fills over chargeS at the tower's centre and waits there, full, until an enemy is in range
const ifrCentre = t => { const c = CELLS[t.cell]; return { x: t.x ?? c.x, y: t.y ?? c.y }; };
function ifrInit(t) {
  if (t.ifrInit0) return;
  for (const k of ["ifrSlot0", "ifrReady", "ifrLaunchCd", "ifrRings", "ifrFs"]) delete t[k]; /* a 6.4 tower's slots */
  t.ifrInit0 = true; t.ifrCharge = 1; /* built CHARGED - no wind-up before its first meteor (owner, 2026-10-20) */ t.ifrBalls = []; t.ifrFires = []; t.ifrFlares = [];
}
function ifrCharge(t, st, dt) { t.ifrCharge = Math.min(1, t.ifrCharge + dt / Math.max(0.01, st.chargeS)); }
// "Always launch when meteor available" (owner): full + an enemy in range (the tower's targeting) = it flies, LED (owner, 2026-10-20:
// "fire the meteor with lead"; never led before - it was the fast weakness): aimed where the enemy will be when it lands; its size is fixed at launch
// where e will be when a meteor from c at speed v reaches it: its spot on its lane IFR_LEAD_N flight times on (its current offset from the lane kept)
const IFR_LEAD_N = 3;
function ifrLead(c, e, v) {
  const sp = typeof effSpeed === "function" && !(e.stunT > 0) ? effSpeed(e) : 0;
  if (!(sp > 0) || e.pi == null) return { x: e.x, y: e.y };
  const p0 = pathAt(e.pi, e.s, e.ang), ox = e.x - p0.x, oy = e.y - p0.y; let a = { x: e.x, y: e.y };
  for (let i = 0; i < IFR_LEAD_N; i++) { const T = Math.hypot(a.x - c.x, a.y - c.y) / v, q = pathAt(e.pi, e.s + sp * T, e.ang); a = { x: q.x + ox, y: q.y + oy }; }
  return a;
}
function ifrLaunch(t, st) {
  if (t.ifrCharge < 1) return;
  const e = pickTargets(t, st, 1)[0];
  if (!e) return;
  const c = ifrCentre(t), a = ifrLead(c, e, st.ballV);
  ifrMeteor(t, st, c.x, c.y, Math.atan2(a.y - c.y, a.x - c.x), 0, null); t.ifrBalls[t.ifrBalls.length - 1].lock = e.id; /* ONE meteor, homing onto e from any distance */
  t.ifrCharge = 0; t.shots = (t.shots || 0) + 1; sfx("ifr");
}
function stepIfr(t, dt) {
  ifrInit(t);
  const st = towerStats(t);
  ifrCharge(t, st, dt);
  ifrLaunch(t, st);
  stepIfrBalls(t, st, dt); stepIfrFires(t, st, dt); stepIfrFlares(t, st, dt);
}
// ---------- the flight (METEOR, owner 2026-10-20: "meteor should no longer pass through, they should just explode on first hit ... they
// should keep going until hit or offscreen"): straight on until the FIRST enemy its body touches - that one takes st.dmg x st.routeK and the
// meteor bursts there (the fire, the fan) - or until it leaves the VIEW (ifrOnView: what the camera shows, not the play box), gone without a
// burst. The capstone FISSURES: a hit spawns two meteors IFR_FISSURE_DEG either side of its heading (gen 1: they do not fissure, and skip that enemy) ----------
function ifrMeteor(t, st, x, y, ang, gen, skip, wait = 0) { // gen 0 the launched one, 1 the fan, 2 a fissure's; wait: s before it leaves
  const v = st.ballV * (gen ? IFR_FAN_V : 1);
  t.ifrBalls.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: st.ballR * (gen ? IFR_FAN_R : 1), gen, skip, left: IFR_FLY_S, wait, fuse: gen ? ifrFuse() : null });
}
// is (x, y) in the camera's view (r world units of slack)? 3D: projected onto the canvas; the simulator has no view - within IFR_FLY_R of the core
function ifrOnView(x, y, r) {
  if (typeof warp !== "undefined" && warp && warp.gl && typeof warpProject === "function" && typeof warpScreen === "function") {
    const p = warpProject(x, y, 0), sc = warpScreen(), m = r * (cam.k || 1) * (p.s || 1);
    if (sc.w > 0 && sc.h > 0) return p.s > 0 && p.x >= -m && p.x <= sc.w + m && p.y >= -m && p.y <= sc.h + m;
  }
  return (x - CX) ** 2 + (y - CY) ** 2 < IFR_FLY_R * IFR_FLY_R;
}
// HOMING: a meteor keeps its lock (b.lock, an enemy id) and steers at that enemy's LED spot (an instant turn); unlocked, it locks the nearest
// enemy whose body is within IFR_HOME_R (the launched one: already locked at launch). If its enemy DIES it flies on to the CORPSE - the
// last spot it saw it (b.cx, b.cy; owner, 2026-10-20: "if target dies, lock on to corpse") - never re-locking. Returns true on reaching it
function ifrHome(b, all, dt) {
  if (b.cx != null) { /* bound for a corpse */
    const dx = b.cx - b.x, dy = b.cy - b.y, d = Math.hypot(dx, dy), v = Math.hypot(b.vx, b.vy);
    if (d <= v * dt) { b.x = b.cx; b.y = b.cy; return true; }
    b.vx = dx / d * v; b.vy = dy / d * v; return false;
  }
  let e = null;
  if (b.lock != null) {
    e = all.find(x => x.id === b.lock && !x.dead) || null;
    if (!e) { b.lock = null; if (b.lx != null) { b.cx = b.lx; b.cy = b.ly; return ifrHome(b, all, dt); } }
  }
  if (!e) {
    let best = Infinity;
    for (const x of all) {
      if (x.dead || !x.seen || x.id === b.skip) continue;
      const d = Math.hypot(x.x - b.x, x.y - b.y) - ENEMIES[x.type].size * (x.sizeMul || 1);
      if (d <= IFR_HOME_R && d < best) { best = d; e = x; }
    }
    if (e) b.lock = e.id;
  }
  if (!e) return false;
  b.lx = e.x; b.ly = e.y; /* where it was last seen alive */
  const v = Math.hypot(b.vx, b.vy), p = ifrLead(b, e, v), d = Math.hypot(p.x - b.x, p.y - b.y) || 1; /* at where it WILL be (the lead), not where it is */
  b.vx = (p.x - b.x) / d * v; b.vy = (p.y - b.y) / d * v;
  return false;
}
// THE FAN: st.fan meteors round 360 degrees from (x, y), evenly (a random start), each released after a bell-curve delay
function ifrFan(born, st, x, y, skip) {
  const n = st.fan, a0 = Math.random() * 2 * Math.PI;
  for (let i = 0; i < n; i++) born.push([x, y, a0 + i * 2 * Math.PI / n, skip, 1, ifrFanDelay(n)]);
}
// a fan meteor's release: the bell, its mean, sd and cap all x the root of the fan's size over the untaken one's (owner, 2026-10-20: "spread them out more in time, the more of them there are")
const ifrFanDelay = n => { const k = Math.sqrt(n / IFR_FAN_REF); return Math.min(IFR_FAN_MAX_S * k, Math.max(0, k * (IFR_FAN_T + IFR_FAN_SD * ifrNormal()))); };
// a FAN meteor lands (a hit, or its dead target's spot): a flare there - THREE within IFR_TRIPLE_JIT at the Flare capstone
function ifrLandFlares(t, st, x, y) {
  if (!st.triple) { ifrFlare(t, st, x, y); return; }
  for (let i = 0; i < 3; i++) { const a = Math.random() * 2 * Math.PI, d = IFR_TRIPLE_JIT * Math.sqrt(Math.random()); ifrFlare(t, st, x + Math.cos(a) * d, y + Math.sin(a) * d); }
}
function stepIfrBalls(t, st, dt) {
  if (!t.ifrBalls.length) return;
  const all = G.enemies, born = [];
  for (const b of t.ifrBalls) {
    if (b.wait > 0) { b.wait -= dt; continue; } /* a fan meteor not released yet */
    const homes = !b.gen || (b.flown || 0) >= IFR_ARM_U, armed = !b.gen || (b.flown || 0) >= IFR_ARM_HIT_U, atCorpse = homes && ifrHome(b, all, dt); /* a spawned one flies straight for IFR_ARM_U, hits only from IFR_ARM_HIT_U */
    if (!atCorpse) { b.x += b.vx * dt; b.y += b.vy * dt; b.flown = (b.flown || 0) + Math.hypot(b.vx, b.vy) * dt; }
    b.left -= dt;
    let hit = null;
    if (armed) for (const e of all) { /* every enemy, not projGrid's cell (a few meteors a tower - cheap); a spawned one only once armed */
      if (e.dead || !e.seen || e.id === b.skip) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + b.r;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 <= r * r) { hit = e; break; }
    }
    if (hit) {
      const amt = st.dmg * st.routeK, h0 = hitFrom; HIT_AT.x = b.x - b.vx; HIT_AT.y = b.y - b.vy; hitFrom = HIT_AT;
      try { damage(hit, amt, t, false, false, IFR_ROUTE_ST); } finally { hitFrom = h0; } onHit(hit, t, st, amt);
      b.left = 0; b.hitId = hit.id; /* the fire it lights rides this enemy (ifrImpact) */
      if (!b.gen) { /* THE FIRST IMPACT (owner, 2026-10-20: "only first impact causes hellfire"): the fire and the 360-degree fan */
        b.ax = b.x; b.ay = b.y; ifrImpact(t, st, b); ifrFan(born, st, b.x, b.y, hit.id);
      } else { b.ax = b.x; b.ay = b.y; ifrImpact(t, st, b, false); }
      if (b.gen === 1 && st.fissure) { const a = Math.atan2(b.vy, b.vx), d = IFR_FISSURE_DEG * Math.PI / 180; born.push([b.x, b.y, a - d, hit.id, 2, 0], [b.x, b.y, a + d, hit.id, 2, 0]); } /* the capstone: a fan meteor's hit fissures */
    } else if (atCorpse) { /* at its dead target's spot: the launched one bursts there (fire, the fan); a fan meteor just goes */
      b.left = 0;
      b.ax = b.x; b.ay = b.y; if (!b.gen) { ifrImpact(t, st, b); ifrFan(born, st, b.x, b.y, null); } else ifrImpact(t, st, b, false);
    } else if (b.gen && b.fuse != null && (b.flown || 0) >= b.fuse) { b.left = 0; b.ax = b.x; b.ay = b.y; ifrImpact(t, st, b, false); } /* its fuse: it bursts mid-flight */
    else if (!b.gen && b.left <= 0) { b.ax = b.x; b.ay = b.y; ifrImpact(t, st, b); ifrFan(born, st, b.x, b.y, null); } /* the launched one never goes silently: out of time, it bursts where it is */
    else if ((b.gen || (b.lock == null && b.cx == null)) && !ifrOnView(b.x, b.y, b.r)) b.left = 0; /* off the view: gone, no burst - never the launched one while it hunts (its seen target may sit where the camera does not reach; owner, 2026-10-20: "initial meteor kinda just disappears with nothing happening") */
  }
  keepLive(t.ifrBalls);
  for (const [x, y, a, id, gen, wait] of born) ifrMeteor(t, st, x, y, a, gen, id, wait);
}
// THE IMPACT: the meteor's black fill is gone, its outline and glow become the FIRE (Hellfire, owner 2026-10-20), no flare (owner, 2026-10-20: "no flare on initial meteor hit"). The fire's numbers are fixed at impact; fires stack (owner: few, heavy meteors keep that rare)
// EVERY METEOR'S landing (owner, 2026-10-20: "all meteors, main incl, each create their own hellfire"): a flare, and a Hellfire of its own -
// lighting its small flares across that flare's life ("hellfire lasts the lifetime of the flare"), each Hellfire 1 / sqrt(1 + the fan) as
// dense and as hot ("since there are more hellfires, reduce damage and density to keep similar dps"). main: the launched one (the sound, and
// the Flare capstone's big centre flare)
function ifrImpact(t, st, b, main = true) {
  const hk = 1 / Math.sqrt(1 + st.fan);
  if (st.fire) (t.ifrFires ||= []).push({ x: b.ax, y: b.ay, r: Math.min(b.r, st.fireR), R: st.fireR, v: st.fireV, dens: st.fireDens * hk, hk, win: st.burnS, big: main && st.triple, left: 1, eid: b.hitId ?? null });
  if (st.flares) ifrLandFlares(t, st, b.ax, b.ay); /* every meteor lights a flare where it strikes, the first too (owner, 2026-10-20) */
  if (main) sfx("ifrblast");
}
// CATCHING FIRE (the flares' rule, the fire's too): an enemy burns only at a tick it was ALSO in the fire at the tick before - what stands
// in it burns, what runs through it does not (the fast weakness). was / now: ids touching at the last tick / this one (plain data)
function ifrCatch(was, now, id) { now[id] = 1; return !IFR_CATCH || !!was[id]; }
// THE FIRE (Hellfire; owner, 2026-10-20: "remove the hellfire ring ... keep hellfire flares"): no ring and no burn of its own - an area
// that grows at v to R from the meteor's size and lights its flares inside it as it grows (the UNTAKEN Flare's - "scaled independently from
// flare level ... level 0 flares, but much more numerous"), each at a time from a bell round IFR_FIRE_FLARE_T; it goes with its last flare
// (and the Flare capstone's big one, dead centre)
// THE RING HITS (owner, 2026-10-21: "make the hellfire ring do damage (lets say 3x hellfire flare hit)"): as the circle grows, each
// enemy it reaches takes ONE hit of IFR_RING_HIT_K x a fire flare's (ifrFlare's hf hit), once a fire (f.hitIds - plain data)
let IFR_RING_HIT_K = 3; // (let: the simulator sweeps it - 2026-10-21: 0 .. 3 moved IFR's spread marks by 2 points at most)
function ifrRingHit(t, st, f) {
  const amt = IFR_RING_HIT_K * st.dmg * IFR_TICK_K[0] * st.hfK * st.fireHK * IFR_HF_HIT_K * (f.hk ?? 1), had = (f.hitIds ||= {});
  for (const e of G.enemies) {
    if (e.dead || !e.seen || had[e.id]) continue;
    const r = f.r + ENEMIES[e.type].size * (e.sizeMul || 1), dx = e.x - f.x, dy = e.y - f.y;
    if (dx * dx + dy * dy > r * r) continue;
    had[e.id] = 1; damage(e, amt, t); onHit(e, t, st, amt);
  }
}
function stepIfrFires(t, st, dt) {
  if (!t.ifrFires || !t.ifrFires.length) return;
  for (const f of t.ifrFires) {
    if (!f.flq) { const n0 = Math.max(1, Math.round(IFR_FIRE_FLARES * (f.dens || 1) * (f.R / IFR_FIRE_FLARE_R0) ** 2)), n = Math.max(IFR_FIRE_MIN, n0); f.split = n0 / n; f.flq = []; f.age0 = 0; /* AT LEAST IFR_FIRE_MIN, the fire's hits SPLIT among them (owner, 2026-10-21: "can't see the hellfire flares from IFR at 0 upgrades" - an untaken fire lit one) */ /* its flares' times, a bell round IFR_FIRE_FLARE_T */
      const w = f.win ?? IFR_FIRE_WINDOW_S; for (let i = 0; i < n; i++) f.flq.push(Math.min(w, Math.max(0, w / 2 + w / 4 * ifrNormal()))); f.flq.sort((a, b) => b - a); } /* ALL within its meteor's flare's life (f.win), a bell round its middle */
    f.age0 += dt;
    if (f.eid != null) { const e = G.enemies.find(o => o.id === f.eid); if (e && !e.dead) { f.x = e.x; f.y = e.y; } else f.eid = null; } /* A FIRE RIDES ITS ENEMY (owner, 2026-10-24: "make hellfires track enemies (keep them in the center of the hellfire) / they fall off on enemy death"): the meteor's hit, kept dead centre; its death drops the fire where it fell. Flares already lit stay put */
    if (f.r < f.R) { f.r = Math.min(f.R, f.r + f.v * dt); ifrRingHit(t, st, f); }
    while (f.flq.length && f.flq[f.flq.length - 1] <= f.age0) { f.flq.pop(); const a = Math.random() * 2 * Math.PI, d = f.r * Math.sqrt(Math.random()); /* EVEN over the fire's area (owner, 2026-10-21: "change the positional randomness to not prefer the center"; was u^IFR_LAND_POW) */ const fl = ifrFlare(t, st, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, ifrHfS(), false, true, (f.hk ?? 1) * (f.split ?? 1)); if (fl) fl.split = f.split; f.until = Math.max(f.until || 0, f.age0 + ((fl && fl.life) || 0)); /* (fl: a stand-in may return nothing) */
      if (!f.flq.length && f.big) ifrFlare(t, st, f.x, f.y, IFR_FLARE_K * IFR_BIG_S, true); } /* inside the fire as it is then; the last one lit, the Flare capstone's BIG flare dead centre */
    if (!f.flq.length && f.r >= f.R && f.age0 >= (f.until || 0)) f.left = 0; /* its last flare OUT: it goes (owner, 2026-10-21: "hellfire ring should remain on screen until all hellfire flares have gone out") */
  }
  keepLive(t.ifrFires);
}
// a flare's size s (x the Flare length): a normal draw round half the max
function ifrFlareS() { return IFR_FLARE_K * Math.min(1, Math.max(IFR_FLARE_MIN, IFR_FLARE_MEAN + IFR_FLARE_SD * ifrNormal())); }
function ifrFlare(t, st, x, y, s = ifrFlareS(), big = false, hf = false, hk = 1) { // hk: a fire flare's hit x its Hellfire's share // big: the Flare capstone's (hit x IFR_BIG_K, its x IFR_BIG_X as long); hf: the fire's - the UNTAKEN Flare's size, burn, tick and hit, whatever Flare's level
  const L = hf ? IFR_BEAM_L[0] : st.beamL, W = hf ? IFR_BEAM_W[0] : st.beamW, life = hf ? ifrHfLife() : st.burnS;
  const f = { x, y, L: L * s, W: W * IFR_FLARE_K * (s / IFR_FLARE_K) ** IFR_FLARE_WS, life, left: life, tick: hf ? Math.random() * IFR_HF_TICK : 0, tickS: hf ? IFR_HF_TICK : st.tickS, cont: hf,
    hit: st.dmg * (hf ? IFR_TICK_K[0] * st.hfK * st.fireHK * IFR_HF_HIT_K * hk : st.flareK) * (big ? IFR_BIG_K : 1), xk: IFR_X_K * (big ? IFR_BIG_X : 1), big, hf, edges: false }; t.ifrFlares.push(f); /* hit, tick: fixed at birth; (edges: the old VI, beams to the box edge - off since 2026-10-19; ifrBeamEnd keeps the path) */
  if (hf) ifrTickFlare(t, st, f); /* the fire's flare strikes ONCE, as it appears */
  return f;
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
function ifrBeamEnds(f) { const out = []; for (let k = 0; k < IFR_BEAMS; k++) out.push(ifrBeamEnd(f.x, f.y, k * Math.PI / 4, k % 2 ? f.L * (f.xk ?? IFR_X_K) : f.L, f.edges)); return out; } // (even k: the +, odd: the x)
// a flare's tick: every live on-screen enemy whose body touches ANY of its beams takes one quiet tick (one hit a flare a tick, on
// two beams too). Exact, not sampled: a cheap radius reject (a flare that cannot reach the enemy), then point-to-segment on its
// beams. 40 Hellfire-VI flares x 200 enemies x 6 beams is ~50k dot products, under the smoke's budget (2026-10-19; the grid
// sampling it replaced could skip a body a diagonal beam clipped at a cell corner)
// CATCHING FIRE (2026-10-19, with the owner's longer flares): an enemy burns only at a tick it was ALSO on a spoke at the tick
// before - what stands in the fire burns, what runs through it does not. Long flares blanket the lanes; without this the fast
// weakness (owner's design) was gone (countermx 61-69: fast 30% leaked, armor 77%). let: the simulator can switch it off
let IFR_CATCH = false; // OFF (owner, 2026-10-20: "just don't require lit for either flares"): every tick burns what touches a spoke
const IFR_NONE = {};
function ifrTickFlare(t, st, f, k = 1) { // k: x the flare's hit (a burning fire flare's step share of its tick)
  const ends = ifrBeamEnds(f), half = f.W / 2, amt = (f.hit ?? st.dmg * st.flareK) * k, reach = f.edges ? Infinity : f.L + half + IFR_BODY_MAX;
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
    if (f.hf) continue; /* a fire flare struck as it appeared - it only shows now */
    const ts = f.tickS || st.tickS; if (f.tick < ts) continue;
    f.tick -= ts; ifrTickFlare(t, st, f);
  }
  keepLive(t.ifrFlares);
}
// ---------- sizes the logic shares with the look (aspira-ifrit-draw.js): the ember, the ring's glow ----------
/* the RING is a glow, [width u, alpha] wide faint / mid / bright core, plus a faint disc inside the front */
const IFR_RING_GLOW = [[22, 0.22, "glow"], [11, 0.45, "tifr"], [4, 1, "orange"], [1.5, 0.95, "yellow"]] /* FIRE COLOURS, no white (owner, 2026-10-20: a flame photo, "no white"): ember red-orange out, IFR orange, marigold, pale yellow core; was tifr x3 + white */, IFR_RING_DISC = 0.14, IFR_RING_THIN = 0.5; /* every layer's WIDTH x this (owner, 2026-10-20: "keep opacity, reduce thickness"; for a moment it was the alpha) */ /* + a WHITE core (owner, 2026-10-19) */ /* brighter, wider (owner, 2026-10-19: "more visible"; were [16, 0.14], [8, 0.3], [3, 0.9], disc 0.08) */
