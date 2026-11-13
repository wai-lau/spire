// /spire - GRV, the GRAVITY tower (owner's design 2026-10-15, reworked 2026-10-25; ARCHITECTURE.md §4.5, GRV): designed for swarm + armor,
// mid reach, no projectile. Every shot leaves a VOID where its target is about to be; the void crushes what is inside and IS its mass -
// it grows with the damage it deals (to GRV_MASS_MAX), evaporates by its circumference, sheds PELLETS as it loses mass, and drifts into
// and merges with other voids. Nova: novas implode on the best spot before each void, striking and stripping armor. Gravity Well: an
// AURA round the void (never past twice its size) that slows (never the shielded) and draws enemies to the lane's centre; it deals
// nothing. Loaded after aspira-frz.js (the simulator too); towerStats calls grvSkillStats, the tower loop stepGrv, fire() novaAt,
// drawSceneTop drawGrv (the look: aspira-grv-draw.js).

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const GRV_AURA_R = [45, 80, 161.2, 247]; /* x1.25 with the faster evaporation (owner, 2026-10-16: "raise bh fire rate and bh size to compensate"; was 68 .. 122) */ // Void: the aura's radius at starting mass (x1.7, owner 2026-10-15: "use bigger nova and aura" once pellets could miss; was 40 .. 72)
// (GRV_RATE_MUL, GRV_NOVA_MUL, GRV_STRIP_MUL - the raw rate, nova hit and strip by tier - GONE with the tier redesign, 2026-10-24: the stat curve's)
const GRV_SLOW = [0.078, 0.195, 0.5733, 1.0517]; /* x1.3 (2026-10-24, GRV to fast -1) */ /* x1.5 (2026-10-24 marks target: better vs fast) */ // Void: the aura's slow at starting mass (x mass, to GRV_SLOW_MAX)
const GRV_NOVA_R = [71, 85, 112, 185]; // Supernova: the nova's reach (x1.7 with the aura; was 42 .. 82)
// THE GRV REWORK (owner, 2026-10-25): tier 0 the nova and a TINY void every third nova ("add void at 0 (every 3 novas) / But, tiny, no
// aura"); NOVA the implosion's rate, its armor strip, and so the void's size ("total damage + strip determines void size"); VOID the void's
// size, its crush and its pellets ("Pellet rate depends on decay mass loss"); ACCELERATION (id radiation, kept for saves) the aura on the void
// - pull and slow, its size and strength - and the pellets' damage and range ("Gravity Well determines damage and range"). Full 0..V tables,
// written here (not in CAPSTONE_NUM): PLACEHOLDERS the balance battery fits. The level curve gives no rate (owner, same day: "rate does
// not grow with just tiers, only tower range, tower mvmt and damage") - GRV's rate is Nova's alone
const GRV_NOVA_RATE = [1, 1.2, 1.5, 2.3, 4.0, 6.8]; /* 2026-11-13: III-V up (was 1.9, 2.4, 3.1) - Nova was the weakest GRV path, 11.7 leak points behind at 13 pts and 4.2 at 9 on 7.15.0; now all three GRV paths within 2.7, every step < 2x */ // Nova: the NOVA'S HIT, x (owner, 2026-11-06: "2. Also yes" - it was the implosions' fire rate; GRV fires at its base rate at every Nova tier now). Its void burns and radiates this much harder (hdmg) and its strip compounds this many times, so a second of GRV deals what it did; the nova hits fewer times, so shields hold longer
const GRV_NOVA_STRIP = [0, 0.175, 0.265, 0.37, 0.75, 0.901]; /* a SHARE of the armor an implosion, 6.18.0 (owner, 2026-10-28: "for armor, all strip should be changed to a % not a flat number"): tier III = today's 37% at waves 101-119 (stripprobe), the rest stacked shares of the old ladder 0 2.5 4 6 18 30 (x the nova's damage) */ /* x5, marks at 9 pts, 101-119 (6.16.0 battery, 2026-10-28) (armor) */ /* IV x2, V x1.5 (2026-10-27, late rows at 13 points: armor leaked 82% in 111-119 -> 70; the aura slow is no lever there - IV already sits over SLOW_CAP) */ /* x2 (axsweep, 2026-10-25: armor leaked 33-49% at x1) */ // (V: just more - owner, 2026-10-25: "Nova V, just removes more armor, not half") // Nova: armor each nova strips from what it hits, x its hit; the stripped armor sizes the void with the damage
const GRV_INNER_K = [2.4, 3.67, 4.6, 6, 8, 12]; // Void: the crush a second, x the tower's damage x mass (the void small again - its pellets carry the duo rule, owner 2026-10-25)
const GRV_ACC_R = [1, 1.4, 1.55, 1.7, 1.85, 2]; // Gravity Well: the aura's radius, x the VOID's (its black core, grvCoreR) - never past x2 (owner, 2026-10-25: "because voids are so big, auras should be smaller / aura radius never exceeds 2x void radius"; was x the void's field, 2.4 .. 6)
const GRV_PELLET_K = [3, 14.52, 19.8, 27, 36, 50.4]; /* x6 with GRV_PEL_PER_MASS /5 (marks at 9 pts, 101-119 (6.16.0 battery, 2026-10-28)): fewer, bigger pellets - armor takes less off a big hit, so armor becomes a check and shield (a charge a pellet) its weak type */ // Gravity Well: a pellet's hit, x the tower's damage - x3 from tier I (axsweep 2026-10-25, with GRV_ACC_PEL: Accel focus 42% leaked -> 12, Void 13, Nova 4)
const GRV_PEL_RANGE = [1, 1.4, 1.8, 2.3, 2.9, 3.6]; // Gravity Well: a pellet's flight, x the void's field
const GRV_ACC_PEL = [1, 1.1, 1.2, 1.3, 1.4, 1.5]; // Gravity Well: x the pellets a void sheds (count first, to x1.5 - owner 2026-10-25: "Add pellets")
let GRV_PEL_PER_MASS = 6; /* 30 -> 6 with GRV_PELLET_K x6 (marks at 9 pts, 101-119 (6.16.0 battery, 2026-10-28)) */ /* 20 -> 30 (owner, 2026-10-27, count first: GRV beat swarm alone - the two-type rule; each pellet pops a charge, so x1.5 pellets is its shield check) */ /* the duo rule (2026-10-25, the void small again and pellets at tier 0: 4 clean 17/21, 12 19/21, 20 21/21) (let: the simulator sweeps it) */ // pellets a unit of mass lost to decay (or past the cap in a merge) gives off
const GRV_LIFE = 2; /* x2.5 */ // s: an unfed BASE sphere's life (one bare hit's aura, starting mass 1) - x2 faster (owner, 2026-10-16: "some bh taking too long to evaporate if merged with too many / increase bh evaporation speed significantly"; was 5)
// EVAPORATION by the CIRCUMFERENCE (owner, 2026-10-16: "bh should evaporate faster the bigger it is, so, update bh size reduction
// and evaporation rate based on circle curcumference"): a sphere's AREA is its mass (aura radius = root of mass x its area-per-mass,
// set as its aura opens), and it loses mass at GRV_EVAP x its radius in base auras a second - so it SHRINKS all its life, and a big
// one (a fat nova, a merge) burns out faster. dm/dt = -E root(m) gives the base sphere 2 / E s: GRV_LIFE (was: a linear 1 / GRV_LIFE
// of the starting mass a second, whatever its size, and a shrink only in its last 0.8 s)
const GRV_R_MAX = 9; /* x3 (owner, 2026-10-16: "triple black hole visual max size"; was 3) */ //  // a hole's radius at most, in base auras (its MASS may go on: radiation, strip and slow scale by it)
const GRV_EVAP = 2 / GRV_LIFE, GRV_RAD_LIFE = 1.6; /* x0.32 of the linear sphere's pace (countermx 61-69 spread: 5 0/0/0/0, 2 1/10/7/2, 1.25 2/19/8/20; 4.6.15 was 2/27/13/7) */ // RAD_LIFE: the pellets a unit of mass gives off stay the linear 5 s sphere's (radiation is not the life)
const GRV_MASS_MAX = 3, GRV_GAIN = 0.12; // mass gained per one tower-hit of damage dealt (nova, aura, pellets)
// the slow in TWO RINGS (owner, 2026-10-15: "two tiers, much bigger slow close to the center"): the CORE (the black core's own size, grvCoreR -
// the hot bands) slows GRV_CORE_MUL x the outer ring; each capped
const GRV_SLOW_MAX = Infinity /* no cap of its own (owner, 2026-10-24 marks target: "remove that cap"; was 0.45) - SLOW_CAP still keeps 20% of the speed */, GRV_CORE_MUL = 2, GRV_CORE_MAX = Infinity; /* the aura in TWO TIERS always (owner, 2026-10-25: "1 outside void and 1 inside, inside should do 2x outer slow"; was x2.5 to 0.8, and Event Horizon a 90% hold) */ // Void VI (Event Horizon): a full-grown core
// the aura's SIZE comes from the NOVA's damage (owner, 2026-10-15: "make the max aura size depend on supernova damage"): x the
// square root of what the nova really dealt, in tower hits (one enemy taking a bare nova = x1), between these (a nova the
// shields swallowed leaves a small aura)
const GRV_START_MASS = 3, GRV_BIG_MASS = 2; // a void's starting mass (the three banked shots' it replaced), its cap GRV_MASS_MAX x that; Void V (Singularity - owner, 2026-10-25: "Void V: bigger start mass and cap") x2 both (was Hawking's last burst of 12 pellets)
const GRV_TICK = 0.25, GRV_FRONT_T = 0.2; // the nova's collapse, s (0.12 outward, then inward: a touch longer to read)
// THE NOVAS (three from 2026-10-18, owner: "3 novas in quick succession, then the bh forms"; ONE since 2026-11-06, below):
// GRV_NOVA_N fronts, one every GRV_NOVA_GAP s, each hitting every enemy it sweeps once; the hole opens after the last
// THE CRUSH NEVER OVER 8x td (owner, 2026-10-31: "Nothing should ever be above like 800%"): with the Nova factor on the void (one nova, 2026-11-06) a Void V +
// Nova V void crushed 2325%td a second at full mass; capped at GRV_CRUSH_TD x td (marks 9 pts 101-119: unchanged)
const GRV_CRUSH_TD = 8;
const GRV_NOVA_N = 1, GRV_NOVA_GAP = 0.3, GRV_NOVA_K = 9, GRV_NOVA_T = 0.8; /* ONE NOVA a shot (owner, 2026-11-06: "1. Yes, make this ring move slower too, so that it takes up the time of the three (can only hit an enemy once)"): its hit x3 (K 3 -> 9) and its front sweeps over GRV_NOVA_T s, the old three's span ((3 - 1) x 0.3 + 0.2); was N 3 */ /* THREE novas again, from Nova I only (owner, 2026-10-25: "Nova 1: 3 novas in quick succession before each void"; tier 0 "void only") - each its old x3 hit, at a third the shots */ // ONE nova at THREE times the hit (owner, 2026-10-21: "change the initial ring to 1 ring again, except triple damage"; three since 2026-10-18)
// THE CAPSTONES (owner, 2026-11-06; capstones-2026-11-06.md). NOVA V (Hypernova): every GRV_SUPER_EVERY-th nova a tower fires rings TWICE - a second front right after the
// first, GRV_SUPER_R x the reach (the same hit rules: an enemy both rings reach takes both). GRAVITY WELL V (Undertow): an enemy in the aura that is NEARER THE CORE than the
// tower (straight-line distance to the core, coreXY: CX/CY, a demo's exit edge) is reeled back toward the void's centre - back along its lane the whole way to the void's centre over GRV_REEL_T s - at most once
// every GRV_REEL_CD s a enemy (e.reelAt, game time; ALL GRVs share it, so three cannot hold a boss). VOID V (Event Horizon): each enemy the crush KILLS grows the void
// x GRV_EH_GROW (stacking, to x GRV_EH_MAX), fading back to x1 over GRV_EH_FADE s after the last kill (sp.evK / sp.evAt, on the sphere's own clock)
const GRV_SUPER_EVERY = 4, GRV_SUPER_R = 1.5, GRV_SUPER_GAP = GRV_NOVA_T;
const GRV_REEL_CD = 4, GRV_REEL_T = 0.6; // the reel runs ALL the way to the void's centre (owner: "reeled back into the center of void"), over GRV_REEL_T s
const GRV_EH_GROW = 1.1, GRV_EH_MAX = 1.5, GRV_EH_FADE = 3;
const novaGap = sp => sp.nN > 1 ? GRV_SUPER_GAP : GRV_NOVA_GAP; // two fronts run back to back; a lone one has no gap
const grvEvK = sp => sp.evK > 1 ? 1 + (sp.evK - 1) * Math.max(0, 1 - (sp.age - sp.evAt) / GRV_EH_FADE) : 1; // the void's size now: Event Horizon's growth, fading
const novaLocal = sp => { if (!sp.nN) return [-1, Infinity]; const g = novaGap(sp), k = Math.min(sp.nN - 1, Math.floor(sp.age / g)); return [k, sp.age - k * g]; }; // [which nova, its own age]
const novaEnd = sp => sp.nN ? (sp.nN - 1) * novaGap(sp) + GRV_NOVA_T : 0; // the nova GONE (collapsed into its centre) - only then the centre and aura (owner: "finish exploding before growing the circle")
// the nova's front: from its reach INWARD, ACCELERATING (owner, 2026-10-15: "explode inwards instead of outwards, accelerating")
const grvNovaReach = (sp, st) => st.novaR * (novaLocal(sp)[0] > 0 ? GRV_SUPER_R : 1); // the second ring of a double nova reaches GRV_SUPER_R x
const grvNovaR = (sp, st) => grvNovaReach(sp, st) * (1 - Math.min(1, novaLocal(sp)[1] / GRV_NOVA_T) ** 2); // s: the aura's tick; the yellow front's time to its reach
const GRV_PELLET_REACH = 1.4, GRV_PELLET_V = 320, GRV_PELLET_HIT = 3; // a pellet flies this x the aura's radius, at V a second; touches an enemy within its size + HIT
const GRV_PEL_ST = { noNum: true }; // a pellet hit: its flash, but its number goes to grvFloat (into the hole)
const GRV_AURA_ST = { noFx: true, noNum: true }; /* noNum: its number is grvFloat's alone (it showed twice once grvFloat became a plain dmgNumber) */
const GRV_INNER_K0 = GRV_INNER_K[1]; /* (was ONE number, 3.67) */ /* the inner burn, x the tower's damage x mass - ONE number since the tier redesign (2026-10-24: its tier I value; was 3 4.5 20 160, V 320) */ /* IV-VI x4 .. x21 (2026-10-18, Void up to Supernova; VI 15.37 -> 320) */ /* the inner burn by Void tier: a lone untaken GRV was beating the wave-10 Star (owner, 2026-10-17: early strength trimmed to tiers 0-I) */ const GRV_INNER_SHOW = 1, GRV_INNER_ST = { noFx: true, noNum: true }; // SHOW: its burn's number once a second an enemy, the sum (the FRZ aura's treatment - owner: "so it doesn't emit as many numbers") // the INNER AURA's damage a second, x the tower's damage x mass (owner, 2026-10-16: "the inner aura should do damage and feed the bh"); a hit there shows its own number // a nova hit: no flash, no number (its numbers drift INWARD - grvFloat)

SKILL_TREES.grv = [
  { id: "void", name: "Void", tiers: [{ name: "Well" }, { name: "Abyss" }, { name: "Void" }] },
  { id: "supernova" /* id kept (saves); shown as NOVA - tier redesign, owner 2026-10-24: "Nova: adds slowing aura" (was Supernova) */, name: "Nova", tiers: [{ name: "Flare" }, { name: "Nova" }, { name: "Supernova" }] },
  { id: "radiation" /* id kept (saves); shown as GRAVITY WELL - owner 2026-11-01, was Acceleration (2026-10-25) */, name: "Gravity Well", tiers: [{ name: "Glow" }, { name: "Spray" }, { name: "Radiance" }] },
];

function grvSkillStats(t, s, b) {
  const v = skillOf(t, "void"), n = skillOf(t, "supernova"), r = skillOf(t, "radiation");
  // HALF the fire-rate GAIN, the damage making up the rest (owner, 2026-10-17: "halve the increases in fire rate from any upgrades ...
  // keep damage the same and keep the min fire rate at level 0 rate"): a tier's rate x(1 + (m - 1) / 2), its damage x m / that - the
  // same damage a second from fewer, harder novas. The HOLES stay as they were (owner, 2026-10-17: "the fire rate will reduce the count
  // and size of bh (fewer bh to merge with), so they should try to keep that consistent as well"): each lives rm / rh longer (evapK), so
  // as many are open at once to merge with, and deals its pellets, burn and strip off the UNcompensated damage (hdmg) - the same holes
  // the late FIRE RATE comes from the DEEPEST axis and the nova's REACH from Void or Supernova (owner, 2026-10-18: "make sure each axis is
  // still equally powerful, move things between axes if necessary" - countermx N=1 had Supernova 0-17% leaked, Void 79-97%; Supernova alone
  // held the rate and the reach. A rate moved to Void instead cost every SOL/ACD/CRR + GRV trio its late game)
  // THE TIER REDESIGN (owner, 2026-10-24): tier 0 a nova that pulls inward, nothing after; Void I adds the black hole and its armor strip,
  // Nova I the slowing aura, Radiation I the pellets - each axis its own part of the sphere (hole / auraOn / pellets). The rate and the
  // hits are the STAT CURVE's (was GRV_RATE_MUL by the deepest axis, half to the rate - rm / rh - and GRV_NOVA_MUL)
  curveBase(t, s, b); s.dmgCurve = s.dmg; s.rateCurve = s.rate; s.novaMul = GRV_NOVA_RATE[n]; s.hdmg = s.dmg * s.novaMul; s.evapK = 1; /* one void a shot at the base rate: it burns and radiates x novaMul (hdmg) - the same a second as the faster voids it replaces (2026-11-06) */ s.targets = 1; // (rateCurve: the curve's, before Nova)
  s.hole = true; s.auraOn = r > 0; s.auraR = GRV_AURA_R[v]; s.accR = GRV_ACC_R[r]; s.slow = GRV_SLOW[r]; s.innerK = GRV_INNER_K[v]; s.horizon = r >= CAPSTONE_TIER; s.reel = r >= CAPSTONE_TIER; s.super = n >= CAPSTONE_TIER; s.eh = v >= CAPSTONE_TIER;
  s.novaR = GRV_NOVA_R[Math.max(n, v)]; s.strip = 1 - (1 - GRV_NOVA_STRIP[n]) ** s.novaMul; /* compounded over the novas it replaces: the same strip a second (2026-11-06) */
  s.pellets = GRV_PEL_PER_MASS * GRV_ACC_PEL[r]; /* every void, tier 0 too (owner, 2026-10-25: "Add pellets instead" of a bigger void) */ s.novaN = n > 0 ? GRV_NOVA_N : 0; s.startM = GRV_START_MASS * (v >= CAPSTONE_TIER ? GRV_BIG_MASS : 1); s.pelletK = GRV_PELLET_K[r]; s.pelReach = GRV_PEL_RANGE[r]; s.big = v >= CAPSTONE_TIER; s.skill = true; // pellets from Void I or Gravity Well I (owner, 2026-10-25: Accel alone too - "Yes"), novas from Nova I
}

// a sphere's scale from its mass: the aura's RADIUS grows as its square root (its area as the mass), the rest as the mass
const grvMassK = sp => Math.max(0, Math.min(sp.cap || GRV_MASS_MAX, sp.mass));
const grvAuraBase = (sp, st) => st.auraR; // the void's size is the Void axis's alone (owner, 2026-10-25: "Void size no longer depends on Nova"; was x the root of the nova's damage, GRV_GROW_MIN .. MAX)
function grvAuraR(sp, st) {
  if (!sp.apm) return grvAuraBase(sp, st); // (the nova still sweeping: its size is still being decided)
  const r = grvEvK(sp) * Math.min(st.auraR * GRV_R_MAX, Math.sqrt(sp.apm * Math.max(0, sp.mass))); // x Event Horizon's growth (Void V); capped (owner, 2026-10-16: "Perf issues as inversion circle gets very large / Limit size?" - merged areas added without end)
  return sp.mergeAt != null && sp.age - sp.mergeAt < GRV_MERGE_S ? sp.mergeFrom + (r - sp.mergeFrom) * (sp.age - sp.mergeAt) / GRV_MERGE_S : r; // a MERGE eases out to its summed area
}
// the aura's reach right now: nothing until the nova has FULLY exploded (owner, 2026-10-15: "make the nova fully explode before
// the aura and center"), then blown out from the centre at the nova front's speed until its size
const grvAuraNow = (sp, st) => Math.min(grvAuraR(sp, st), st.novaR / GRV_FRONT_T * Math.max(0, sp.age - novaEnd(sp)));
// (the LOOK shrank to nothing over its last 0.8 s here - owner, 2026-10-16: "black holes centers + aura from grv should
// shrink to 0 size to disappear"; they popped out at full size) - drawn only: the slow keeps its reach to the end
// shrink to 0 size to disappear" - until its size became its mass, above, and it shrinks all its life)

// fire(): a nova on the target - the sphere is born where it stands
// LEADS its target (owner, 2026-10-16: "grv should shoot slightly ahead of the enemy to account for explosion time"): the nova
// lands where the enemy will be GRV_LEAD_S on along its lane at its pace now (slows and stuns counted) - past the collapse and the
// aura's opening, so it WALKS INTO the hole (owner, 2026-10-16: "grv should be shooting slightly ahead of enemies": the collapse's
// 0.2 s alone put it ~25u ahead, on the enemy to the eye); still well inside the nova's reach (71u+)
const GRV_LEAD_S = 0.5;
// each NOVA lands where it CATCHES THE MOST (owner, 2026-10-18: "the novas should happen wherever it can hit the most enemies based on
// targetting alg, the bh forms in front of enemies like it does now"): on the enemy in range whose nova reach holds the most enemies,
// ties to the targeting mode's order (pickTargets); GRV_SPOT_N candidates at most (perf). The HOLE stays on the lead (novaAt)
const GRV_SPOT_N = 24;
function grvNovaSpot(t, st) {
  const c = pickTargets(t, st, GRV_SPOT_N), r2 = st.novaR * st.novaR; let best = null, bn = 0;
  for (const a of c) { let n = 0; for (const e of G.enemies) if (!e.dead && e.seen && (e.x - a.x) ** 2 + (e.y - a.y) ** 2 <= r2) n++; if (n > bn) { bn = n; best = a; } }
  return best && { x: best.x, y: best.y };
}
function novaAt(t, st, e) {
  const p0 = pathAt(e.pi, e.s, e.ang || 0), p1 = pathAt(e.pi, e.s + effSpeed(e) * GRV_LEAD_S, e.ang || 0);
  (t.spheres ||= []).push({ id: G.id++, x: e.x + p1.x - p0.x, y: e.y + p1.y - p0.y, vx: 0, vy: 0, ar: 0, age: 0, mass: st.startM, cap: GRV_MASS_MAX * st.startM, nN: st.novaN ? (st.super && (t.novaFired = (t.novaFired || 0) + 1) % GRV_SUPER_EVERY === 0 ? 2 : 1) : 0, hit: new Set(), tick: 0, pel: 0, hole: true }); // hole: its tower's Void, stamped at birth (grvPull)
  return true;
}
// one hit from a sphere: the damage it really dealt feeds its mass
let grvLastHit = 0;
function grvHit(sp, t, st, e, amt, opt) {
  const hp0 = e.hp;
  damage(e, amt, t, false, false, opt);
  const dealt = Math.max(0, hp0 - Math.max(0, e.hp)) / escale(e); /* (back to RAW: it is weighed against st.dmg - the LATE SCALE) */ grvLastHit = Math.max(0, hp0 - e.hp); // dealt: what fed the hole (to zero); grvLastHit: the WHOLE hit, overkill too - its NUMBER (owner, 2026-10-17: "On overkill, show damage that would have been dealt")
  if (dealt > 0) sp.mass = Math.min(sp.cap || GRV_MASS_MAX, sp.mass + GRV_GAIN * dealt / Math.max(1e-6, opt === GRV_INNER_ST ? st.hdmg : st.dmg)); /* (the burn's feed by the HOLE's damage, the nova's by its own) */
  return dealt;
}
// the burn's numbers: each enemy's sum, once GRV_INNER_SHOW s, or as soon as it leaves the centre or dies (sp.burn)
function grvBurnNums(sp, dt) {
  if (!sp.burn || !sp.burn.size) return;
  sp.burnT = (sp.burnT || 0) + dt;
  const all = sp.burnT >= GRV_INNER_SHOW || sp.mass <= 0 || sp.merged, r = grvCoreR(sp.ar || 0); // (a hole going: its last sums out)
  for (const [e, d] of sp.burn) if (all || e.dead || (e.x - sp.x) ** 2 + (e.y - sp.y) ** 2 > r * r) { grvFloat(sp, e, d); sp.burn.delete(e); }
  if (all) sp.burnT = 0;
}
function stepGrv(t, dt) {
  const st = towerStats(t);
  stepPellets(t, st, dt);
  if (!t.spheres || !t.spheres.length) return;
  for (const sp of t.spheres) { stepSphere(sp, t, st, dt); grvBurnNums(sp, dt); }
  grvPull(t, st, dt);
  t.spheres = t.spheres.filter(sp => sp.mass > 0 && !sp.merged);
}
// BLACK HOLES PULL AND MERGE (owner, 2026-10-16: "black holes should have a slow acceleration towards other nearby ones / when they
// overlap enough, merge them into a bigger one with higher radiation (calculate bh size as the additive component of currently
// linearly reducing parts)"): any two open spheres (any GRV's) within GRV_PULL_K x their summed auras accelerate toward each
// other - each by the OTHER's mass over the distance squared, so a light one falls into a heavy one; once their black centres touch (grvCoreR) the bigger takes the other in - every
// part that ADDS: mass, its cap, its linear loss a second (so it still dies when its parts would have, together), the nova damage
// behind it, and the aura's AREA (radius = root of the summed squares). Its mass - its radiation, strip and slow - can pass
// GRV_MASS_MAX: the cap is the parts' summed
const GRV_PULL_A = 45, GRV_PULL_D = 60, GRV_PULL_V = 110, GRV_PULL_K = 1.6, GRV_MERGE_S = 0.35, GRV_MERGE_D = 2; // u/s2 a unit of the other's mass at GRV_PULL_D u or closer (1 / d2 past it); u/s at most; reach; s to ease out
let grvAll = [];
function grvPull(t, st, dt) {
  grvAll = [];
  for (const o of G.towers) if (o.kind === "grv" && o.spheres) for (const sp of o.spheres) if (!sp.merged && sp.mass > 0 && sp.open) grvAll.push(sp);
  for (const a of t.spheres) {
    if (a.merged || a.mass <= 0 || !a.open) continue;
    for (const b of grvAll) {
      if (b === a || b.merged) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, reach = a.ar + b.ar;
      if (d > reach * GRV_PULL_K) continue;
      /* merged once their black CENTRES touch (owner, 2026-10-16: "require black hole spheres to actually touch before merging"; was 0.45 x the summed auras) */
      /* ... and now only when their CENTRES meet (owner, 2026-10-16: "dont instamerge when they touch, only when their centers are aligned"): under GRV_MERGE_D u, or the step carries them past each other (the closest approach of this step's relative motion), so a pair cannot overshoot and orbit; touching cores just keep pulling, damped near the end so they settle */
      const rvx = (b.vx || 0) - (a.vx || 0), rvy = (b.vy || 0) - (a.vy || 0), rv2 = rvx * rvx + rvy * rvy;
      const tc = rv2 > 1e-9 ? Math.min(dt, Math.max(0, -(dx * rvx + dy * rvy) / rv2)) : 0, cd = Math.hypot(dx + rvx * tc, dy + rvy * tc);
      const aBig = !!a.hole !== !!b.hole ? !!a.hole : a.ar >= b.ar; // a HOLE always takes a hole-less sphere in, whatever their sizes (tier redesign 2026-10-24: a Radiation- or Nova-only GRV's sphere ate a neighbour's Void hole)
      if (d <= GRV_MERGE_D || cd <= GRV_MERGE_D) { grvMerge(aBig ? a : b, aBig ? b : a); if (a.merged) break; continue; }
      if (d <= grvCoreR(a.ar) + grvCoreR(b.ar)) { a.vx = (a.vx || 0) * (1 - 3 * dt); a.vy = (a.vy || 0) * (1 - 3 * dt); } /* cores touching: settle */
      const f = GRV_PULL_A * dt * Math.max(0, b.mass) * (GRV_PULL_D / Math.max(d, GRV_PULL_D)) ** 2; // a's pull toward b: b's MASS over the distance squared (owner, 2026-10-16: "bh acceleration should be dependent on mass"; was a fixed 45 shared by mass)
      a.vx = (a.vx || 0) + dx / d * f; a.vy = (a.vy || 0) + dy / d * f;
    }
    const v = Math.hypot(a.vx || 0, a.vy || 0);
    if (v > GRV_PULL_V) { a.vx *= GRV_PULL_V / v; a.vy *= GRV_PULL_V / v; }
    a.x += (a.vx || 0) * dt; a.y += (a.vy || 0) * dt;
  }
}
// A HOLE ALWAYS DIES (owner, 2026-10-16: "this bh seems to just stay on screen forever emitting crazy rads" ... "the evaporation
// should be exponential with size"): fed by the damage it deals, a big merged hole in a thick wave gained as fast as it lost; its
// evaporation now grows EXPONENTIALLY with its size (stepSphere), so a giant burns off whatever it eats
const GRV_FADE_S = 2; const GRV_EVAP_EXP = 0.5; /* steeper (owner, 2026-10-16; was 0.25) */ // evaporation x e^(0.5 (R - 1)) for a hole R base auras across: R 3 ~x2.7, R 5 ~x7.4, R 9 ~x55 its old pace
// A VOID EVERY SHOT (owner, 2026-10-25: tier 0 "void only, atk speed 1/3"; Nova's nova comes before it): what was a hole every
// GRV_BH_EVERY shots, banking the shots between (2026-10-21), is now ONE shot at a third the rate, its void as heavy as the banked one
// (GRV_START_MASS) - grvBank went with it
function grvMerge(big, small) {
  const m = big.mass + small.mass, w = small.mass / Math.max(1e-6, m);
  big.x += (small.x - big.x) * w; big.y += (small.y - big.y) * w; // to the pair's centre of mass, momentum kept
  big.vx = (big.vx || 0) * (1 - w) + (small.vx || 0) * w; big.vy = (big.vy || 0) * (1 - w) + (small.vy || 0) * w;
  const area = big.apm * big.mass + small.apm * small.mass; // the AREAS add (each is its area-per-mass x its mass)
  big.span = Math.max(big.span || 0, small.span || 0); big.mergeFrom = big.ar; big.mergeAt = big.age;
  big.apm = area / Math.max(1e-6, m); big.cap = Math.max(big.cap || GRV_MASS_MAX, small.cap || GRV_MASS_MAX); // a void grows to 3x at most (owner, 2026-10-25): the caps no longer add
  big.mass = Math.min(m, big.cap); big.pel = (big.pel || 0) + GRV_PEL_PER_MASS * (m - big.mass); // ...the mass past it is lost, and shed as pellets ("release pellets lost during merge too")
  small.merged = true; small.mass = 0;
  if (typeof sfx === "function") sfx("grvaura");
}
function stepSphere(sp, t, st, dt) {
  if (sp.merged) return; // taken in by a bigger one (grvPull): no Hawking burst, nothing
  sp.age += dt;
  if (!sp.auraSnd && sp.age >= novaEnd(sp)) { sp.auraSnd = true; sp.apm = grvAuraBase(sp, st) ** 2; sfx("grvaura"); } // its AREA per mass, fixed as it opens // the AURA's own sound as it opens (owner, 2026-10-16; the nova is "grv")
  // the NOVA: the yellow front sweeps out; each enemy it reaches takes the hit once
  const [nk, na] = novaLocal(sp);
  if (nk !== sp.novaK && sp.age < novaEnd(sp)) { sp.novaK = nk; sp.hit.clear(); sp.nova = (nk > 0 && sp.nova) || grvNovaSpot(t, st) || { x: sp.x, y: sp.y }; } // a fresh front hits everyone again, where it catches the most
  if (sp.age < novaEnd(sp) + dt && na <= GRV_NOVA_T + dt) {
    const nx = sp.nova ? sp.nova.x : sp.x, ny = sp.nova ? sp.nova.y : sp.y;
    const r = grvNovaR(sp, st), nr = grvNovaReach(sp, st); // it IMPLODES: an enemy is hit as the front sweeps past it, inward (all within reach by the end)
    for (const e of G.enemies) {
      const d2 = (e.x - nx) ** 2 + (e.y - ny) ** 2;
      if (e.dead || !e.seen || sp.hit.has(e.id) || d2 > nr * nr || d2 < r * r) continue;
      sp.hit.add(e.id);
      const amt = st.dmg * GRV_NOVA_K * (st.novaMul || 1), a0 = e.armor;
      if (st.strip) shredPct(e, t, st.strip); // Nova: the implosion strips armor (owner, 2026-10-25; was the aura's)
      const dealt = grvHit(sp, t, st, e, amt, GRV_AURA_ST); // (no number of its own: it flies into the centre)
      if (dealt > 0) grvFloat(sp, e, grvLastHit); // the nova's number: the WHOLE hit, overkill too (grvLastHit)
    }
  }
  const k = grvMassK(sp), ar = grvAuraNow(sp, st);
  sp.ar = ar; sp.open ||= ar >= grvAuraR(sp, st) - 0.5; // (grvPull reads them: only a fully OPENED aura pulls or merges)
  // the AURA: NO damage (owner, 2026-10-15: "make the aura not do damage") - it strips positive armor and slows the unshielded,
  // in two rings: the core far harder
  sp.tick += dt;
  while (sp.tick >= GRV_TICK) {
    sp.tick -= GRV_TICK;
    const ring = Math.min(GRV_SLOW_MAX, st.slow * k), core = Math.min(GRV_CORE_MAX, ring * GRV_CORE_MUL), outer = st.horizon ? core : ring; // Gravity Well V: the WHOLE aura the inside's slow (owner, 2026-10-25)
    const inner = grvCoreR(ar), reach = st.auraOn ? inner * st.accR : inner; // the aura reaches past the void by Gravity Well; no aura, only the void itself crushes // the INNER AURA is the black core's own size (owner, 2026-10-16: "the inner aura should be the size of the core sphere"; was GRV_CORE_FRAC of the aura)
    for (const e of G.enemies) {
      const d2 = (e.x - sp.x) ** 2 + (e.y - sp.y) ** 2;
      if (e.dead || !e.seen || d2 > reach * reach) continue;
      const inIn = d2 <= inner * inner, slow = inIn ? core : outer;
      if (st.hole && inIn && sp.age >= novaEnd(sp)) { const d = grvHit(sp, t, st, e, Math.min(st.hdmg * st.innerK * k, GRV_CRUSH_TD * GRV_INNER_K[0] * GRV_START_MASS * tdU("grv") * st.dmg) * GRV_TICK, GRV_INNER_ST); if (d > 0) (sp.burn ||= new Map()).set(e, (sp.burn.get(e) || 0) + grvLastHit); /* its number sums the WHOLE hits */ if (e.dead) { if (st.eh) grvHorizon(sp); continue; } } // it BURNS and FEEDS the hole (grvHit); its number is summed (grvBurnNums)
      // the shielded are never slowed (applySlow refuses them); a fast enemy doubled like every other slow (owner, 2026-10-24 marks target: "Increase slow to make good vs fast")
      if (!st.auraOn) continue; // the slow and the pull are Nova's aura (tier redesign 2026-10-24)
      const lane = grvLane(e, sp), sk = lane.ahead ? GRV_AHEAD_K : 1;
      applySlow(e, slow * sk * grvSizeK(e), GRV_TICK * 1.5, "grv:" + t.id);
      grvPullTo(e, lane);
      if (st.reel) grvReel(e, t, sp);
    }
  }
  // EVAPORATION, by its circumference - and RADIATION paced by it (owner, 2026-10-16: "make sure the pellet output is the same, just
  // faster"): the old pellet rate x mass, x how much faster than the old linear life (1 / GRV_RAD_LIFE a second) it loses mass - a
  // sphere gives off what the linear one did over its life, a big one sooner (radiating only what it lost - pellets x 2.5 a unit
  // of mass - starved a FED sphere, which the old one kept near its cap: countermx 61-69 2/27/13/7 -> 48/89/87/76)
  const R = (sp.apm ? Math.sqrt(sp.apm * Math.max(0, sp.mass)) : grvAuraR(sp, st)) / st.auraR; // its UNCAPPED radius, in base auras
  const lost = Math.min(sp.mass, GRV_EVAP * (st.evapK || 1) * R * Math.exp(Math.max(0, R - 1) * GRV_EVAP_EXP) * dt); // EXPONENTIAL in its size (owner, 2026-10-16: "the evaporation should be exponential with size"): a base hole as before, xe^(0.25) a base radius more // by its UNCAPPED radius: a merge of many (its drawn size capped at GRV_R_MAX, its mass not) burnt out at the cap's pace and lingered
  sp.span = (sp.span || 0) + dt; const left = EFFECT_MAX_S - sp.span; sp.mass -= Math.max(lost, left <= dt ? sp.mass : left < GRV_FADE_S ? sp.mass * dt / left : 0); // GONE BY EFFECT_MAX_S (owner, 2026-10-18: no effect lasts longer): its last GRV_FADE_S it shrinks to nothing whatever it eats (span: its OLDEST part's age, merges keep it)
  sp.pel = st.pellets ? sp.pel + st.pellets * lost : 0; /* the pellets ARE the decay (owner, 2026-10-25: "Pellet rate depends on decay mass loss"; was x mass x GRV_RAD_LIFE) */ /* (a longer-lived hole - evapK - radiates at the same rate a second, not the same total) */ // the OLD rate (x mass) sped up by how much faster than the old linear 1 / 5 s it loses mass
  const w = Math.max(1, ((t.pellets ? t.pellets.length : 0) / GRV_PEL_SOFT) ** 2); // BUNDLED past GRV_PEL_SOFT in flight (perf): one pellet carrying w pellets' hit, w times fewer
  while (sp.pel >= w) { sp.pel -= w; grvPellet(sp, t, st, grvAuraR(sp, st) * st.pelReach, w); }
}
// GRV IS SUPPORT (owner, 2026-10-21: "For units that are ahead of the bh, it should slow way more, and also, pull units ... perpendicular
// to the lane"): the aura's slow x GRV_AHEAD_K on an enemy already PAST the hole along its lane; and every enemy in the aura is drawn ACROSS
// its lane toward the lane's CENTRE line (same day: "only pull towards the center of the lane instead of towards the BH") at GRV_LAT_V u/s
// (e.pull: a world offset, never past it), easing back GRV_LAT_BACK s after it leaves (grvPullStep, stepEnemies). (The slow by missing
// HP, x 1 + its share, lived a few hours: owner, "remove the thing with GRV slowing based on missing HP")
const GRV_AHEAD_K = 2.5, GRV_LAT_V = 60, GRV_LAT_BACK = 1;
// SMALLER ENEMIES SLOWED MORE (owner, 2026-10-21: "I wanted the slow to affect smaller enemies more" / "just grv slow"): the aura's
// slow x GRV_SIZE_REF over the body's size, held to GRV_SIZE_MIN .. GRV_SIZE_MAX - swarm (6) x2, fast (12) x1, armor (15) x0.8, bosses x0.5
const GRV_SIZE_REF = 12, GRV_SIZE_MIN = 0.5, GRV_SIZE_MAX = 2;
const grvSizeK = e => Math.max(GRV_SIZE_MIN, Math.min(GRV_SIZE_MAX, GRV_SIZE_REF / (ENEMIES[e.type].size * (e.sizeMul || 1))));
const GRV_LN = { x: 0, y: 0 }, GRV_LQ = { x: 0, y: 0 };
function grvLane(e, sp) { // the lane's heading at e: is it past the hole, and how far across is the lane's CENTRE line
  const a = pathAtInto(e.pi, e.s, e.ang, GRV_LN), b = pathAtInto(e.pi, e.s + 3, e.ang, GRV_LQ), tx = b.x - a.x, ty = b.y - a.y, L = Math.hypot(tx, ty) || 1;
  const ux = tx / L, uy = ty / L, hx = sp.x - e.x, hy = sp.y - e.y, cx = a.x - e.x, cy = a.y - e.y;
  return { ahead: hx * ux + hy * uy < 0, nx: -uy, ny: ux, across: cx * -uy + cy * ux };
}
// EVENT HORIZON: a kill by the crush grows the void x GRV_EH_GROW on top of what it is now (the fade so far kept), to GRV_EH_MAX; the clock restarts
function grvHorizon(sp) { sp.evK = Math.min(GRV_EH_MAX, grvEvK(sp) * GRV_EH_GROW); sp.evAt = sp.age; sp.evKills = (sp.evKills || 0) + 1; }
// UNDERTOW: an enemy the aura holds that is nearer the core than its tower is reeled back toward the void - once a GRV_REEL_CD, whichever GRV reels it. (G.clock: game time)
function grvReel(e, t, sp) {
  const [cx, cy] = coreXY(); if (e.reelAt > (G.clock || 0) || Math.hypot(e.x - cx, e.y - cy) >= Math.hypot(t.x - cx, t.y - cy)) return;
  e.reelAt = (G.clock || 0) + GRV_REEL_CD; e.reelLeft = Math.hypot(sp.x - e.x, sp.y - e.y); e.reelT = GRV_REEL_T; e.reelRate = e.reelLeft / GRV_REEL_T;
}
function grvReelStep(e, dt) { // from stepEnemies: the lane backward, the whole distance to the void over GRV_REEL_T s (never before the lane's start)
  const d = Math.min(e.reelLeft, e.reelRate * dt); e.reelLeft -= d; e.s = Math.max(0, e.s - d); if ((e.reelT -= dt) <= 0 || e.reelLeft <= 0) e.reelT = 0;
}
function grvPullTo(e, lane) { // each aura tick: which way, and how far to the hole's line (it GLIDES there - grvPullStep, every step)
  e.pull ||= [0, 0]; const sg = Math.sign(lane.across); e.pullDir = [lane.nx * sg, lane.ny * sg]; e.pullLeft = Math.abs(lane.across); e.pullT = GRV_TICK * 1.5;
}
function grvPullStep(e, dt) { // from stepEnemies: the offset this step, easing home once no hole holds it
  if ((e.pullT = (e.pullT || 0) - dt) > 0) {
    const d = Math.min(e.pullLeft || 0, GRV_LAT_V * dt * (effSpeed(e) > 0 ? 1 : 0)); e.pullLeft -= d; /* (stopped - a stun, Temporal Drive - it holds still) */
    if (e.pullDir) { e.pull[0] += e.pullDir[0] * d; e.pull[1] += e.pullDir[1] * d; }
    return e.pull;
  }
  const k = Math.exp(-dt / GRV_LAT_BACK); e.pull[0] *= k; e.pull[1] *= k;
  if (Math.abs(e.pull[0]) + Math.abs(e.pull[1]) < 0.05) e.pull = null;
  return e.pull;
}
// a PELLET is a projectile (owner, 2026-10-15: "I want pellets to be able to miss, not beams"): out from the sphere in a random
// direction at GRV_PELLET_V, hitting the FIRST enemy it touches - or nothing, fading at `reach`
// past GRV_PEL_SOFT of a tower's in flight, pellets are BUNDLED (perf, 2026-10-16: two Radiation V GRVs at wave 95 had 2851 in the air,
// 10 ms a frame to draw): each new one carries w pellets' hit and w times fewer are sent - every pellet hits or misses on its own
// flight, so the damage EXPECTED is the same, only lumpier
const GRV_PEL_SOFT = 80; // w = (in flight / this) squared past it: ~200 a tower at most (linear, 150: still ~500)
// EACH PELLET ITS OWN SIZE (owner, 2026-10-21: "for the GRV pellets, jitter the length, opacity, and damage (correlated) between 25% and
// 400% (same dps)"): one roll j = 0.25 + 3.75 u^4 (u uniform) - 25% .. 400%, its MEAN exactly 1, so the damage a second holds - sets its
// hit (x j), its streak (x j) and its opacity (GRV_PEL_A x j, to 1)
const GRV_PEL_J = () => 0.25 + 3.75 * Math.random() ** 4, GRV_PEL_A = 0.5 * 1.5; // x1.5 brighter (tier redesign, owner 2026-10-24)
function grvPellet(sp, t, st, reach, w = 1) {
  const a = Math.random() * 6.283, j = GRV_PEL_J();
  (t.pellets ||= []).push({ sp, x: sp.x, y: sp.y, vx: Math.cos(a) * GRV_PELLET_V, vy: Math.sin(a) * GRV_PELLET_V, left: reach / GRV_PELLET_V, dmg: st.hdmg * st.pelletK * w * j, j });
}
// the PROJECTILE GRID (perf, owner 2026-10-16: "do some perf work on the new towers" - at wave 89 three GRVs' ~360 pellets each tested
// every enemy, every step: 3.2 ms a frame): each living enemy listed in every GRID_S cell its body (+ GRID_PAD) touches, built
// once a step (G.clock) and shared - a projectile tests only its own cell's, in G.enemies order, so the FIRST it touches is the same
const GRID_S = 64, GRID_PAD = 4, GRID_NONE = [], GRID_OFF = 8, GRID_N = 32;
let egrid = null, egridAt = NaN;
/* perf (2026-10-16): the cells of the play field (and a margin round it) are a flat array of reused lists, not Map lookups; only a body or a projectile far outside the margin falls back to the Map */
function projGrid() { // (NOT enemyGrid: aspira-acid.js's pools have their own by that name, and a second global of it replaced theirs - its numeric keys left every pool and drip hitting NOTHING from 5.1.7; found 2026-10-16)
  if (egrid && egrid.G === G && egridAt === G.clock) return egrid;
  if (!egrid) egrid = { G: null, a: new Array(GRID_N * GRID_N).fill(null), used: [], m: new Map() };
  for (const i of egrid.used) egrid.a[i].length = 0;
  egrid.used.length = 0; egrid.m.clear(); egrid.G = G; egridAt = G.clock; // (no clock: NaN, never equal - rebuilt every call)
  const A = egrid.a, used = egrid.used, M = egrid.m;
  for (const e of G.enemies) {
    if (e.dead || !e.seen) continue;
    const r = ENEMIES[e.type].size * (e.sizeMul || 1) + GRID_PAD;
    for (let x = Math.floor((e.x - r) / GRID_S), x1 = Math.floor((e.x + r) / GRID_S); x <= x1; x++)
      for (let y = Math.floor((e.y - r) / GRID_S), y1 = Math.floor((e.y + r) / GRID_S); y <= y1; y++) {
        const ix = x + GRID_OFF, iy = y + GRID_OFF;
        if (ix >= 0 && ix < GRID_N && iy >= 0 && iy < GRID_N) {
          const k = ix * GRID_N + iy; let c = A[k];
          if (!c) c = A[k] = [];
          if (!c.length) used.push(k);
          c.push(e);
        } else {
          const k = x * 65536 + y, c = M.get(k);
          if (c) c.push(e); else M.set(k, [e]);
        }
      }
  }
  return egrid;
}
const enemiesNear = (x, y, g = projGrid()) => {
  const cx = Math.floor(x / GRID_S), cy = Math.floor(y / GRID_S), ix = cx + GRID_OFF, iy = cy + GRID_OFF;
  if (ix >= 0 && ix < GRID_N && iy >= 0 && iy < GRID_N) { const c = g.a[ix * GRID_N + iy]; return c && c.length ? c : GRID_NONE; }
  return g.m.get(cx * 65536 + cy) || GRID_NONE;
};
function stepPellets(t, st, dt) {
  if (!t.pellets || !t.pellets.length) return;
  const g = projGrid();
  for (const p of t.pellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt;
    for (const e of enemiesNear(p.x, p.y, g)) {
      if (e.dead) continue; // (a pellet POPS shield charges - owner, 2026-10-15; only the aura's slow skips the shielded)
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + GRV_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      const h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT; // the number on the pellet's way (HIT_AT, aspira-floats.js)
      const hp0 = e.hp;
      try { damage(e, p.dmg, t, false, false, GRV_PEL_ST); } finally { hitFrom = h0; } // RADIATION NEVER FEEDS its hole (owner, 2026-10-16: "things killed by the aura and rads should not add to the black hole" - a lone hole kept growing on its own radiation); only the nova does (grvHit)
      if (e.hp < hp0) grvFloat(p.sp, e, hp0 - e.hp); // its number flies off the enemy hit (grvFloat) - the WHOLE hit, overkill too
      p.left = 0; break;
    }
  }
  keepLive(t.pellets);
}

// the void's BLACK CORE radius for an aura's reach: the crush reaches it (stepSphere), the look draws it (drawGrvCore, aspira-grv-draw.js)
let GRV_CORE_PX = 11.7, GRV_CORE_A = 34; /* (x4 for a few hours, 2026-10-25, for the duo rule - owner: "Instead of making void bigger / Add pellets instead") (let: the simulator sweeps it) */ // a base aura (68u) keeps its 13u centre; x2 the aura 19u (linear: 24), x4 26u (linear: 46)
const grvCoreR = ar => GRV_CORE_PX * Math.log(1 + ar / GRV_CORE_A); // the black centre's radius for an aura's
function grvFloat(sp, e, amt) {
  if (typeof INSTANT_COINS !== "undefined" && INSTANT_COINS) return; // (the simulator draws nothing)
  dmgSum(e, amt, amt, dmgInk("grv"), sp);
}
