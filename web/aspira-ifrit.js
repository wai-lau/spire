// /spire - IFR, IFRIT (owner's design 2026-10-19, axes redone 2026-10-20 - the fire aeon of FFX, orange): strong against swarm +
// shield, NEUTRAL to armor, weak to fast. ONE charge fills at the tower's centre; full + an enemy in range = a launch, aimed at the
// spot it will reach (led, 2026-10-20), forked across 60 degrees, each bursting on the first enemy it touches. EACH AXIS ITS OWN PART AND ITS OWN DAMAGE (x TOWERS.ifr.dmg): METEOR the meteor in flight - charge time,
// speed, size, the en-route hit on every enemy its body touches (Impact: a huge meteor); HELLFIRE the FIRE it leaves - opening at the
// meteor's size, growing to its max, burning what stands in it by catching fire in small, many ticks, lingering (its capstone: six
// towers across); BLK MAGIC the PELLETS that fly out (passing through, hitting) and the FLARES they light where they land - a big +
// over a small x (Mega Firaga: one giant flare where the meteor struck). Loaded after aspira-car.js (the simulator too); the look is
// aspira-ifrit-draw.js. towerStats calls ifrSkillStats, the tower loop stepIfr. Every list on the tower holds plain objects (ids and
// coordinates, never enemy refs): autosave clones G.
// Spec: docs/superpowers/specs/2026-10-20-ifrit-axes-redesign-design.md (on 2026-10-19-ifrit-tower-design.md)

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const IFR_CHARGE_S = [2.0, 1.9, 1.8, 1.6, 1.4, 1.2] /* x2 (owner, 2026-10-20: "fire rate is too high, halve it, double damage" - TOWERS.ifr.dmg 60 -> 120); was [1.0 .. 0.6] VI 0.3 */ /* AXES REDONE (owner, 2026-10-20: "greatly lower initial meteor fire rate and increase damage"; one charge, no slots); was [0.5, 0.5, 0.5, 0.45, 0.4, 0.35] VI 0.1 */; // Meteor: s to fill THE charge (VI capstone.js)
const IFR_BALL_V = [360, 390, 420, 450, 480, 510] /* was [140 .. 320] (solo.mjs 2026-10-19: a lone L1 lost 25/21/23 lives on waves 1-11 and x4 the hit barely moved it - at 140 u/s the ring opened after armor and swarm had walked out of it; 360: 8/6/2) */; // Meteor: u/s in flight - SLOW against fast (130 u/s walks out of the blast past ~150 u), the fast weakness (VI 540)
const IFR_ROUTE_K = [1.5, 2, 2.5, 3, 4, 5] /* FLATTER (owner, 2026-10-20: "meteor should increase damage less" - with the fork and one burst a meteor); was [1.5, 2, 4, 10, 60, 400] VI 8000 */ /* AXES REDONE (2026-10-20): x TOWERS.ifr.dmg, Meteor's own - was x the Blk Magic blast hit, [0.25, 0.5, 1, 4, 10, 60] VI 150 */; // Meteor: the en-route hit, its ONLY damage
const IFR_FORKS = [1, 3, 3, 3, 5, 5]; // Meteor: meteors a launch, an odd number fanned evenly across IFR_FORK_DEG, the middle at the target (owner, 2026-10-20: "fork at launch into an odd number of copies of itself across an angle of 60deg"; VI 5 + the fissure)
const IFR_FORK_DEG = 60, IFR_FISSURE_DEG = 30, IFR_FLY_S = 10, IFR_FLY_R = 1400; // the capstone's two fissure meteors fly this far either side of the one that hit; a meteor's longest flight (s); the simulator's 'off screen' (no view): this far from the core
const IFR_BALL_RAD = [2.7, 3, 3.3, 3.7, 4.2, 4.7] /* x0.2 (owner, 2026-10-20: "reduce meteor size to 20% of current"; was [13.5 .. 23.5] VI 27) */ /* HALVED (owner, 2026-10-20: "meteor is also too big, halve all the current sizes"); was [27 .. 47] VI 54 */; // Meteor: the meteor's radius, u (solo.mjs 2026-10-20: the hex's width across untaken - half of it leaked the wave-4 swarm, 15 lives; owner: "twice the size" of it at VI: 54, capstone.js)
// Hellfire: THE FIRE the meteor leaves (owner, 2026-10-20) - it opens at the meteor's size, grows at FIRE_V to FIRE_R (never below IFR_FIRE_FLOOR x the meteor), burns by catching fire every IFR_FIRE_TICK_S for FIRE_K x TOWERS.ifr.dmg a tick ("small ticks, many"), lingers FIRE_LINGER s at full size
const IFR_FIRE_FLOOR = 16; // the fire's max is never under this x the meteor's radius - with no Hellfire too (owner, 2026-10-20: "even with no hellfire bought, fire should start at 16x meteor size"; was 1x)
const IFR_FIRE_R = [0, 60, 60, 85, 110, 130]; // u radius (VI 160: "6 towers across", capstone.js)
const IFR_FIRE_V = [60, 80, 100, 120, 150, 180]; // u/s (VI 220)
const IFR_FIRE_LINGER = [0.5, 2, 2, 2, 2.5, 3]; // s at full size, still burning (VI 5)
const IFR_FIRE_K = [0.1, 0.6, 0.7, 1, 2.5, 5]; // a tick, x TOWERS.ifr.dmg (VI 15)
let IFR_FIRE_TICK_S = 0.05 /* battery 2026-10-20: 0.2 left Hellfire VI leaking 95% of shields at 101-109 - each tick pops one charge */; const IFR_FIRE_FADE = 0.3, IFR_FIRE_GLOW_S = 1.5, IFR_FIRE_GLOW_K = 3; // (let: the sims sweep the tick) // s between ticks (fixed); s it fades out at the end, hitting nothing; its inner glow rises SLOWLY to GLOW_K x over GLOW_S after impact (owner, 2026-10-20: "after meteor impact, slowly triple the inner glow's opacity")
const IFR_BEAM_L = [50, 65, 80, 100, 120, 140]; // Blk Magic (Hellfire's until 2026-10-20): a flare beam's length from its centre, u (VI 210, capstone.js - was to the play-box edges, owner 2026-10-19: "looks ridiculous ... maybe half")
const IFR_BEAM_W = [10, 12, 14, 16, 18, 20]; // Blk Magic: its width, u
const IFR_BURN_S = [1.2, 1.4, 1.6, 2, 2.6, 3.2] /* HALVED, the ticks x2 (owner, 2026-10-19: "reduce duration of spokes and increase damage" - the same burn a flare in half the time); was [2.4 .. 6.4], VI 10 */ /* x2, longer flares (owner, 2026-10-19: "make the flares last longer"), with CATCHING FIRE and faster, harder ticks (countermx 61-69 spread @6pts 4 seeds: 9/69/8/37 swarm/fast/shield/armor); was [1.2, 1.4, 1.6, 2, 2.6, 3.2] - was [1.5, 2, 2.5, 3, 4, 5] (countermx 61-69 spread @6pts, 2026-10-19, pellets in random directions: swarm/fast/shield/armor 8/35/9/56 -> 13/77/23/58 - a short burn: fast is clear of the flares round its old spot before the next tick, a slow body still burns; with the radius, the ball speed or the tick period fast stayed 33-47) */; // Blk Magic: a flare burns this long (VI 10 = EFFECT_MAX_S)
const IFR_TICK_S = [0.25, 0.25, 0.25, 0.24, 0.23, 0.22] /* untaken 0.54 -> 0.25 (solo.mjs 2026-10-20, after the halved meteor and charge: a lone L1 leaked the wave-4 swarm, 6 lives, whatever the damage - a flare needs two ticks to burn) */ /* stop I faster (axis balance 2026-10-19: the 6-point spread build sits on Hellfire I - shields 35% -> 16% leaked); was [0.54, 0.48, 0.43, 0.36, 0.3, 0.27] - x0.6 with the longer flares (2026-10-19); was [0.9, 0.8, 0.72, 0.6, 0.5, 0.45] - was [0.3 .. 0.15] VI 0.12, with TICK_K (countermx 61-69 spread @6pts, 2026-10-19: few big ticks - a slow body on a beam takes several, a fast one walks off between two, and a big tick gets through armor; 18/75/23/90 -> 20/69/39/51 at TICK_K x5, the shield fixed by the pellets) */; // Blk Magic: s between burn ticks
const IFR_TICK_K = [0.41, 1.5, 1.55, 1.6, 1.8, 2.27] /* x0.5 with the flares x3 (sweep 2026-10-19: more ticks to pop shields, less each - armor shrugs them off) */ /* x2 with the flares halved (2026-10-19); was [0.41, 0.6, 0.91, 1.36, 1.52, 2.27], VI 3.78 */ /* AXIS BALANCE (2026-10-19): stops IV and VI x0.75 - Hellfire carried the tower (81-89 mean leak 22 vs Meteor 80); was [0.41, 0.6, 0.91, 1.36, 2.02, 3.02] */ /* x1.2 with the longer flares (2026-10-19); was [0.34, 0.5, 0.76, 1.13, 1.68, 2.52] - was [0.08 .. 0.6] VI 1 (x4.2, moved with TICK_S: x5 overshot armor to 35%, x3.5 left it 68%) */; // Hellfire: a tick, x the blast hit
const IFR_PELLETS = [4, 5, 6, 7, 8, 10] /* HALVED with the flares x2 (owner, 2026-10-20: "reduce flare counts, increase flare sizes" - a pellet lights one flare); was [8, 9, 11, 13, 16, 20] VI 24 */ /* HALVED (owner, 2026-10-20: "still too many pellets, halve the counts" - they pass through and re-hit now); was [10, 12, 15, 20, 28, 38] */ /* DOUBLED, each flare a random size (owner, 2026-10-19: "double the number of pellets (and hellfires) but add size jitter"; were 5 .. 21, VI 24) */ /* base 5 (owner, 2026-10-19: "start off by shooting 5 pellets"); was [5 .. 10] VI 12 (countermx 61-69 spread @6pts, 2026-10-19, when pellets flew at what stood in the blast: a pellet pops a shield and lights a flare; with the tick at x3 the period, x5 the hit: 20/69/39/51 -> 17/58/19/35) */; // Firaga: pellets a burst
const IFR_PELLET_DK = [0.5, 1.5, 1.6, 1.7, 2, 2.5]; // Blk Magic: a pellet's pass-through hit, x TOWERS.ifr.dmg (owner, 2026-10-20: "pellets should also deal damage en route, scaled by blk magic"; VI 4)
const IFR_GIANT_K = 4, IFR_GIANT_S = 4 / 3, IFR_GIANT_X = 1 / 9; // Mega Firaga (Blk Magic VI, owner 2026-10-20): ONE giant flare at the impact spot - its hit x GIANT_K a VI flare's, its size x GIANT_S the largest ("way too big, 1/3 of that size"; was x4), its x GIANT_X as long as a flare's ("shrink the x to 1/3 of 1/3")
const IFR_PELLET_V = 100 /* was 170 (owner, 2026-10-20: "slow down the pellets so that they have a chance to hit the same enemy more than once") - was 300 (owner, 2026-10-19: "make the hellfire pellets more visible and slower") */, IFR_PELLET_HIT = 4; // a pellet's speed and hit pad; a pellet hit x the blast hit (x Firaga's blastK: the passthrough hit grows with the tier)
const IFR_PELLET_R = 150; // u: the pellets' reach before IFR_PELLET_REACH - fixed, the old blast radius (2026-10-20: the fire's size is Hellfire's, the pellets Blk Magic's)
const IFR_PELLET_SPREAD_S = 0.5; // s: a burst's pellets leave at random times over this (owner, 2026-10-20: "randomize the pellet launch times over 0.5s")
const IFR_PELLET_REHIT = 0.2; // s: a pellet still touching an enemy it hit hits it again this often (a slow pellet riding along a body hits it several times)
const IFR_PELLET_ARM = 16; // u a pellet flies before it can hit (about a body): born at the burst spot, it would else stop on the enemy standing there, and nothing would fly or miss (owner, 2026-10-19)
let IFR_PELLET_REACH = 1.2; /* x3, landing NEAR more often than far (IFR_LAND_POW) (owner, 2026-10-19: "triple the range that the pellets can end up in ... make the probability of landing closer be higher") */ // a pellet flies this x the blast radius (owner, 2026-10-19: "reduce pellet range" 1.0 -> 0.6, then "further reduce spread" -> 0.4 - its flare lands nearer the burst, on the crowd; was the whole radius). let: the simulator sweeps it
const IFR_FLARE_MAX = 240; // live flares a tower at most: the oldest goes (perf; 120 before Backdraft's triple flare, 60 before the pellets doubled)
// a flare's SIZE (owner, 2026-10-19): a normal draw round half the max (mean IFR_FLARE_MEAN, sd IFR_FLARE_SD, kept in [IFR_FLARE_MIN, 1])
// times IFR_FLARE_K x the Hellfire tier's length and width; a pellet lands at IFR_PELLET_REACH x the blast radius x u^IFR_LAND_POW (u uniform:
// a power over 1 lands more of them near). let: the balance runs sweep IFR_FLARE_K and IFR_LAND_POW
let IFR_FLARE_K = 12 /* x2 again with the pellets halved (owner, 2026-10-20: "reduce flare counts, increase flare sizes"); was 6, 3 */, IFR_LAND_POW = 1.5, IFR_FLARE_WS = 1; /* swept 2026-10-19 (countermx 61-69 spread @6pts, swarm/fast/shield/armor % leaked): K 1 POW 2: 17/74/64/49 - small flares popped no shields; K 3 POW 1.5 + ticks x0.5: 11/63/18/51 (the old six-beam IFR: 11/69/14/56) */ // IFR_FLARE_WS: the width's share of the jitter (W x s^WS; 0 = a full-width spoke at any length)
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
  s.forks = IFR_FORKS[m]; s.fissure = m >= CAPSTONE_TIER;
  s.chargeS = IFR_CHARGE_S[m]; s.ballV = IFR_BALL_V[m]; s.ballR = IFR_BALL_RAD[m]; s.routeK = IFR_ROUTE_K[m];
  s.fireR = Math.max(s.ballR * IFR_FIRE_FLOOR, IFR_FIRE_R[h]); s.fireV = IFR_FIRE_V[h]; s.fireLinger = IFR_FIRE_LINGER[h]; s.fireK = IFR_FIRE_K[h];
  s.pellets = IFR_PELLETS[f]; s.pelletK = IFR_PELLET_DK[f]; s.giant = f >= CAPSTONE_TIER;
  s.beamL = IFR_BEAM_L[f]; s.beamW = IFR_BEAM_W[f]; s.burnS = Math.min(EFFECT_MAX_S, IFR_BURN_S[f]); s.tickS = IFR_TICK_S[f]; s.flareK = IFR_TICK_K[f];
  // every hit is st.dmg x its axis's K AT THE HIT, so what towerStats does to dmg after this (the DAM core power, an aura) reaches all of them
  s.dmg = b.dmg; s.rate = 1 / s.chargeS; // the card's Damage and Rate: the base every hit multiplies, meteors a second
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
  const c = ifrCentre(t), a = ifrLead(c, e, st.ballV), mid = Math.atan2(a.y - c.y, a.x - c.x), n = st.forks, step = n > 1 ? IFR_FORK_DEG * Math.PI / 180 / (n - 1) : 0;
  for (let i = 0; i < n; i++) ifrMeteor(t, st, c.x, c.y, mid + (i - (n - 1) / 2) * step, 0, null); /* THE FORK: n meteors, the middle at the (led) target */
  t.ifrCharge = 0; t.shots = (t.shots || 0) + 1; sfx("ifr");
}
function stepIfr(t, dt) {
  ifrInit(t);
  const st = towerStats(t);
  ifrCharge(t, st, dt);
  ifrLaunch(t, st);
  stepIfrBalls(t, st, dt); stepIfrFires(t, st, dt); stepIfrPellets(t, st, dt); stepIfrFlares(t, st, dt);
}
// ---------- the flight (METEOR, owner 2026-10-20: "meteor should no longer pass through, they should just explode on first hit ... they
// should keep going until hit or offscreen"): straight on until the FIRST enemy its body touches - that one takes st.dmg x st.routeK and the
// meteor bursts there (the fire, the pellets) - or until it leaves the VIEW (ifrOnView: what the camera shows, not the play box), gone without a
// burst. The capstone FISSURES: a hit spawns two meteors IFR_FISSURE_DEG either side of its heading (gen 1: they do not fissure, and skip that enemy) ----------
function ifrMeteor(t, st, x, y, ang, gen, skip) {
  t.ifrBalls.push({ x, y, vx: Math.cos(ang) * st.ballV, vy: Math.sin(ang) * st.ballV, r: st.ballR, gen, skip, left: IFR_FLY_S });
}
// is (x, y) in the camera's view (r world units of slack)? 3D: projected onto the canvas; the simulator has no view - within IFR_FLY_R of the core
function ifrOnView(x, y, r) {
  if (typeof warp !== "undefined" && warp && warp.gl && typeof warpProject === "function" && typeof warpScreen === "function") {
    const p = warpProject(x, y, 0), sc = warpScreen(), m = r * (cam.k || 1) * (p.s || 1);
    if (sc.w > 0 && sc.h > 0) return p.s > 0 && p.x >= -m && p.x <= sc.w + m && p.y >= -m && p.y <= sc.h + m;
  }
  return (x - CX) ** 2 + (y - CY) ** 2 < IFR_FLY_R * IFR_FLY_R;
}
function stepIfrBalls(t, st, dt) {
  if (!t.ifrBalls.length) return;
  const all = G.enemies, born = [];
  for (const b of t.ifrBalls) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.left -= dt;
    let hit = null;
    for (const e of all) { /* every enemy, not projGrid's cell (a few meteors a tower - cheap) */
      if (e.dead || !e.seen || e.id === b.skip) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + b.r;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 <= r * r) { hit = e; break; }
    }
    if (hit) {
      const amt = st.dmg * st.routeK, h0 = hitFrom; HIT_AT.x = b.x - b.vx; HIT_AT.y = b.y - b.vy; hitFrom = HIT_AT;
      try { damage(hit, amt, t, false, false, IFR_ROUTE_ST); } finally { hitFrom = h0; } onHit(hit, t, st, amt);
      b.ax = b.x; b.ay = b.y; ifrImpact(t, st, b); b.left = 0;
      if (st.fissure && !b.gen) { const a = Math.atan2(b.vy, b.vx), d = IFR_FISSURE_DEG * Math.PI / 180; born.push([b.x, b.y, a - d, hit.id], [b.x, b.y, a + d, hit.id]); }
    } else if (!ifrOnView(b.x, b.y, b.r)) b.left = 0; /* off the view: gone, no burst */
  }
  keepLive(t.ifrBalls);
  for (const [x, y, a, id] of born) ifrMeteor(t, st, x, y, a, 1, id);
}
// THE IMPACT: the meteor's black fill is gone, its outline and glow become the FIRE (Hellfire, owner 2026-10-20), and the pellets fly
// (Blk Magic). The fire's numbers are fixed at impact; fires stack (owner: few, heavy meteors keep that rare)
function ifrImpact(t, st, b) {
  (t.ifrFires ||= []).push({ x: b.ax, y: b.ay, r: Math.min(b.r, st.fireR), R: st.fireR, v: st.fireV, hold: st.fireLinger, fade: IFR_FIRE_FADE, tick: 0, hit: st.dmg * st.fireK, left: 1 });
  ifrPelletBurst(t, st, b.ax, b.ay);
  if (st.giant) ifrFlare(t, st, b.ax, b.ay, IFR_FLARE_K * IFR_GIANT_S, true); /* MEGA FIRAGA: one giant flare where it struck */
  sfx("ifrblast");
}
// the pellets out in random directions, enemies there or not (owner, 2026-10-19: "shooting 5 pellets in random directions that each make asterisks")
function ifrPelletBurst(t, st, x, y) {
  const R = IFR_PELLET_R, fs = ifrPelletFlares(st); /* out to IFR_PELLET_R x IFR_PELLET_REACH, whatever the fire's size (Blk Magic's own) */
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
    f.age = (f.age || 0) + dt; /* (the look: the inner glow's rise) */
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
// passthrough + deal damage on passthrough based on firaga lvl"): every enemy touched takes st.dmg x st.pelletK (Blk Magic's own), again every
// IFR_PELLET_REHIT s it stays touching, and the pellet flies on; where it lands, a FLARE.
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
      p.hit[e.id] = p.age; const amt = st.dmg * st.pelletK, h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_PELLET_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
    }
    if (p.left > 0) continue;
    ifrFlare(t, st, p.ax, p.ay, (p.fs || ifrFlareSizes())[0]);
  }
  keepLive(t.ifrPellets);
}
// a flare's size s (x the Hellfire length): rolled when its BALL LAUNCHES (owner, 2026-10-20: "pellet size should be relative the size of
// the flare that it will produce"), so the pellet - and the ball, the area of all its pellets - is drawn to it
function ifrFlareS() { return IFR_FLARE_K * Math.min(1, Math.max(IFR_FLARE_MIN, IFR_FLARE_MEAN + IFR_FLARE_SD * ifrNormal())); }
function ifrFlareSizes() { return [ifrFlareS()]; } // one pellet's flare (a list: the ember's size reads it)
function ifrPelletFlares(st) { const out = []; for (let i = 0; i < st.pellets; i++) out.push(ifrFlareSizes()); return out; } // a burst's pellets'
function ifrFlare(t, st, x, y, s = ifrFlareS(), giant = false) { // giant: Mega Firaga's (size s = IFR_GIANT_K x the max), hitting IFR_GIANT_K x
  if (t.ifrFlares.length >= IFR_FLARE_MAX) { const k = t.ifrFlares.findIndex(f => !f.giant); t.ifrFlares.splice(k < 0 ? 0 : k, 1); } /* the oldest goes - never a giant first */
  t.ifrFlares.push({ x, y, L: st.beamL * s, W: st.beamW * IFR_FLARE_K * (s / IFR_FLARE_K) ** IFR_FLARE_WS, life: st.burnS, left: st.burnS, tick: 0, hit: st.dmg * st.flareK * (giant ? IFR_GIANT_K : 1), giant, xk: IFR_X_K * (giant ? IFR_GIANT_X : 1), edges: false }); /* hit: fixed at birth; (edges: the old VI, beams to the box edge - off since 2026-10-19; ifrBeamEnd keeps the path) */
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
let IFR_CATCH = true;
const IFR_NONE = {};
function ifrTickFlare(t, st, f) {
  const ends = ifrBeamEnds(f), half = f.W / 2, amt = f.hit ?? st.dmg * st.flareK, reach = f.edges ? Infinity : f.L + half + IFR_BODY_MAX;
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
/* a pellet is an EMBER (owner, 2026-10-19: "more visible"): a faint halo, an orange disc, a yellow core, and a tail of IFR_TAIL_N
   segments behind it at falling alpha. Sized for a phone (the board ~1000 u across 430 px) */
const IFR_EMBER_HALO = 9, IFR_EMBER_R = 4, IFR_EMBER_CORE = 1.5, IFR_TAIL_N = 3, IFR_TAIL_S = 0.05;
/* the RING is a glow, [width u, alpha] wide faint / mid / bright core, plus a faint disc inside the front */
const IFR_RING_GLOW = [[22, 0.22, "glow"], [11, 0.45, "tifr"], [4, 1, "orange"], [1.5, 0.95, "yellow"]] /* FIRE COLOURS, no white (owner, 2026-10-20: a flame photo, "no white"): ember red-orange out, IFR orange, marigold, pale yellow core; was tifr x3 + white */, IFR_RING_DISC = 0.14, IFR_RING_THIN = 0.5; /* every layer's WIDTH x this (owner, 2026-10-20: "keep opacity, reduce thickness"; for a moment it was the alpha) */ /* + a WHITE core (owner, 2026-10-19) */ /* brighter, wider (owner, 2026-10-19: "more visible"; were [16, 0.14], [8, 0.3], [3, 0.9], disc 0.08) */
// an ember's SIZE x IFR_EMBER_*: a pellet's, its flare's mean size over the average flare's (owner, 2026-10-20: "pellet size should be
// relative the size of the flare that it will produce"); a ball's, the AREA of all its pellets (owner: "meteor should use same visuals
// as pellet, except have the same area as total pellets") - the root of the summed squares
function ifrEmberK(fs) { if (!fs) return 1; let a = 0; for (const s of fs) a += s; return a / fs.length / (IFR_FLARE_K * IFR_FLARE_MEAN); }
function ifrBallK(fs) { if (!fs) return 1; let a = 0; for (const f of fs) a += ifrEmberK(f) ** 2; return Math.sqrt(a); }
