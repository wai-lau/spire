// /spire - IFR, IFRIT (owner's design, 2026-10-19 - the fire aeon of FFX, orange): strong against swarm + shield, NEUTRAL to
// armor, weak to fast. It CHARGES balls on its hex corners (one slot at base, 2, 3, then all 6 at the capstone) and is never idle
// while a slot is free; a charged ball + an enemy in range = a launch, one every IFR_LAUNCH_GAP s. The ball flies SLOWLY at the
// enemy's spot at launch (no lead: a fast enemy walks out from under it), hitting what it passes through; where it lands a RING
// expands to the blast radius hitting everything it passes once, and PELLETS fly out in random directions to the blast radius (owner, 2026-10-19);
// where a pellet stops it bursts into a burning FLARE - six beams, a hexagonal star like the tower's own hex, quiet ticks that pop
// a shield charge (owner, 2026-10-19: six beams, never four). Meteor: slots, charge rate, ball speed, en-route hit (Impact: 6 slots,
// charging as fast as it launches). Hellfire: the flare (Hellfire VI: beams to the play-box edges). Firaga: the blast and the pellet count (Backdraft VI: a pellet bursts into a
// smaller ring too). Loaded after aspira-car.js (the simulator too); towerStats calls ifrSkillStats, the tower loop stepIfr,
// drawSceneTop drawIfr. Every list on the tower holds plain objects (ids and coordinates, never enemy refs): autosave clones G.
// Spec: docs/superpowers/specs/2026-10-19-ifrit-tower-design.md

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const IFR_SLOTS = [1, 2, 2, 3, 3, 3]; // Meteor: charge slots on the hex corners - 1, 2 (opposite), 3 (a triangle); VI all 6 (owner: "skip 4 and 5")
const IFR_CHARGE_S = [1.0, 0.85, 0.7, 0.55, 0.45, 0.35] /* was [2.0, 1.6, 1.3, 1.0, 0.8, 0.6] (solo.mjs 2026-10-19, ball 360: a lone L1 8/6/2 -> 0/2/0 - one ball a second catches the wave-4 swarm a ball every two let through) */; // Meteor: s to fill one ball (VI 0.1: "near the launch rate")
const IFR_BALL_V = [360, 390, 420, 450, 480, 510] /* was [140 .. 320] (solo.mjs 2026-10-19: a lone L1 lost 25/21/23 lives on waves 1-11 and x4 the hit barely moved it - at 140 u/s the ring opened after armor and swarm had walked out of it; 360: 8/6/2) */; // Meteor: u/s in flight - SLOW against fast (130 u/s walks out of the blast past ~150 u), the fast weakness (VI 540)
const IFR_ROUTE_K = [0.25, 0.5, 1, 2, 4, 8]; // Meteor: the en-route hit, x the blast hit ("a lot to make up for the faster travel speed"; VI 16)
const IFR_BEAM_L = [50, 65, 80, 100, 120, 140]; // Hellfire: a flare beam's length from its centre, u (VI: to the play-box edges)
const IFR_BEAM_W = [10, 12, 14, 16, 18, 20]; // Hellfire: its width, u
const IFR_BURN_S = [1.2, 1.4, 1.6, 2, 2.6, 3.2] /* was [1.5, 2, 2.5, 3, 4, 5] (countermx 61-69 spread @6pts, 2026-10-19, pellets in random directions: swarm/fast/shield/armor 8/35/9/56 -> 13/77/23/58 - a short burn: fast is clear of the flares round its old spot before the next tick, a slow body still burns; with the radius, the ball speed or the tick period fast stayed 33-47) */; // Hellfire: a flare burns this long (VI 10 = EFFECT_MAX_S)
const IFR_TICK_S = [0.9, 0.8, 0.72, 0.6, 0.5, 0.45] /* was [0.3 .. 0.15] VI 0.12, with TICK_K (countermx 61-69 spread @6pts, 2026-10-19: few big ticks - a slow body on a beam takes several, a fast one walks off between two, and a big tick gets through armor; 18/75/23/90 -> 20/69/39/51 at TICK_K x5, the shield fixed by the pellets) */; // Hellfire: s between burn ticks
const IFR_TICK_K = [0.34, 0.5, 0.76, 1.13, 1.68, 2.52] /* was [0.08 .. 0.6] VI 1 (x4.2, moved with TICK_S: x5 overshot armor to 35%, x3.5 left it 68%) */; // Hellfire: a tick, x the blast hit
const IFR_BLAST_R = [117, 117, 130, 150, 169, 195] /* x1.3: bigger and more visible (owner, 2026-10-19: "make the initial explosion slower and bigger and more visible"); was [90, 90, 100, 115, 130, 150], base 90, was 80 (solo.mjs 2026-10-19, after the random pellets and the slow ticks: a lone L1 1/0/0 -> 0/0/0, 5 seeds 1/0/0/2/2 -> 0/0/0/0/2 - a single wave-4 swarm body now and then) */ /* was [60 .. 130] VI 160 (solo.mjs 2026-10-19, ball 360 + a 1 s charge: a lone L1 0/2/0 -> 0/0/0, every L1 pair with IFR beats the Star on every slot pair) */; // Firaga: the ring's reach, u
const IFR_BLAST_K = [1.5, 2.25, 3.45, 5.25, 9, 15] /* was [1, 1.5, 2.3, 3.5, 6, 10] VI 18 (countermx 61-69 spread @6pts, 2026-10-19: leaked swarm/fast/shield/armor 27/91/42/100 -> 18/75/23/90) */; // Firaga: the blast hit, x TOWERS.ifr.dmg
const IFR_PELLETS = [5, 9, 12, 15, 18, 21] /* base 5 (owner, 2026-10-19: "start off by shooting 5 pellets"); was [5 .. 10] VI 12 (countermx 61-69 spread @6pts, 2026-10-19, when pellets flew at what stood in the blast: a pellet pops a shield and lights a flare; with the tick at x3 the period, x5 the hit: 20/69/39/51 -> 17/58/19/35) */; // Firaga: pellets a burst
const IFR_LAUNCH_GAP = 0.05, IFR_BALL_R = 10, IFR_RING_V = 220 /* was 600 (owner, 2026-10-19: the explosion slower) */, IFR_PELLET_V = 170 /* was 300 (owner, 2026-10-19: "make the hellfire pellets more visible and slower") */, IFR_RING_FADE = 0.15, IFR_PELLET_HIT = 4, IFR_PELLET_K = 0.25, IFR_MINI_K = 0.5; // s between launches; the ball's hit radius (+ the enemy's size); the ring's speed u/s; a pellet's speed and hit pad; a pellet hit x the blast hit; Backdraft's mini ring x radius and x hit
const IFR_PELLET_ARM = 16; // u a pellet flies before it can hit (about a body): born at the burst spot, it would else stop on the enemy standing there, and nothing would fly or miss (owner, 2026-10-19)
const IFR_FLARE_MAX = 60; // live flares a tower at most: the oldest goes (perf)
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
// ---------- the corners and the charge ----------
// a corner of the tower's drawn hex (the slot's pts shrunk to TOWER_K) at the tower's CURRENT spot (drawTower moves the hex the same way)
function ifrCorner(t, k) { const c = CELLS[t.cell], p = c.pts[k % 6]; return { x: (t.x ?? c.x) + (p.x - c.x) * TOWER_K, y: (t.y ?? c.y) + (p.y - c.y) * TOWER_K }; }
// the corners n slots use (owner, 2026-10-19): 1 = the FIRST corner (ifrSlot0), 2 = + the opposite, 3 = every other corner, 6 = all.
// The first corner is random, picked at the first step (ifrInit) and again whenever the last charged ball leaves (ifrLaunch -
// owner: "the first ball should spawn on a random corner whenever there are no charged balls"); the pattern follows from it
function ifrSlotCorners(t, n) {
  const a = t.ifrSlot0 ?? 0;
  if (n >= 6) return [0, 1, 2, 3, 4, 5];
  if (n >= 3) return [a, (a + 2) % 6, (a + 4) % 6];
  if (n >= 2) return [a, (a + 3) % 6];
  return [a];
}
function ifrInit(t) { if (t.ifrSlot0 == null) { t.ifrSlot0 = Math.floor(Math.random() * 6); t.ifrCharge = 0; t.ifrReady = 0; t.ifrLaunchCd = 0; t.ifrBalls = []; t.ifrRings = []; t.ifrPellets = []; t.ifrFlares = []; } }
// ALWAYS CHARGING while a slot is free (owner): the ball under way fills over chargeS, then waits in its slot; the next starts at once
function ifrCharge(t, st, dt) {
  if (t.ifrReady >= st.slots) { t.ifrCharge = 0; return; }
  t.ifrCharge += dt / Math.max(0.01, st.chargeS);
  while (t.ifrCharge >= 1 && t.ifrReady < st.slots) { t.ifrCharge -= 1; t.ifrReady++; }
  if (t.ifrReady >= st.slots) t.ifrCharge = 0;
}
// a launch: a charged ball + an enemy in range (the tower's targeting), one every IFR_LAUNCH_GAP s; aimed at the enemy's spot NOW,
// never led (the fast weakness). The ball leaves from the slot's corner (the last filled)
function ifrLaunch(t, st, dt) {
  t.ifrLaunchCd = Math.max(0, t.ifrLaunchCd - dt);
  if (t.ifrReady <= 0 || t.ifrLaunchCd > 0) return;
  const e = pickTargets(t, st, 1)[0];
  if (!e) return;
  const c = ifrCorner(t, ifrSlotCorners(t, st.slots)[t.ifrReady - 1]), d = Math.hypot(e.x - c.x, e.y - c.y) || 1;
  t.ifrBalls.push({ x: c.x, y: c.y, ax: e.x, ay: e.y, vx: (e.x - c.x) / d * st.ballV, vy: (e.y - c.y) / d * st.ballV, left: d / st.ballV, hit: [] }); /* hit: enemy ids struck en route */
  t.ifrReady--; t.ifrLaunchCd = IFR_LAUNCH_GAP; t.shots = (t.shots || 0) + 1; sfx("ifr");
  if (t.ifrReady <= 0) t.ifrSlot0 = Math.floor(Math.random() * 6); /* none charged: the next first ball takes a new random corner (owner) */
}
function stepIfr(t, dt) {
  ifrInit(t);
  const st = towerStats(t);
  ifrCharge(t, st, dt);
  ifrLaunch(t, st, dt);
  stepIfrBalls(t, st, dt); stepIfrRings(t, st, dt); stepIfrPellets(t, st, dt); stepIfrFlares(t, st, dt);
}
// ---------- the flight: slow, small, hitting what it passes; it bursts at its AIM spot whatever happened to the target ----------
function stepIfrBalls(t, st, dt) {
  if (!t.ifrBalls.length) return;
  const g = projGrid();
  for (const b of t.ifrBalls) {
    const s = Math.min(dt, b.left); b.x += b.vx * s; b.y += b.vy * s; b.left -= dt; /* s: the burst frame stops at the aim spot, never hit-tests past it */
    for (const e of enemiesNear(b.x, b.y, g)) {
      if (e.dead || b.hit.includes(e.id)) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + IFR_BALL_R;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      b.hit.push(e.id); const amt = st.dmg * st.routeK;
      const h0 = hitFrom; HIT_AT.x = b.x - b.vx; HIT_AT.y = b.y - b.vy; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_ROUTE_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
    }
    if (b.left <= 0) ifrBurst(t, st, b.ax, b.ay, 1);
  }
  keepLive(t.ifrBalls);
}
// the BURST: a ring from the spot, and pellets out in random directions to the blast radius, enemies there or not (owner, 2026-10-19:
// "shooting 5 pellets in random directions that each make asterisks"); k: 1 a ball, IFR_MINI_K a Backdraft pellet
function ifrBurst(t, st, x, y, k) {
  const R = st.blastR * k;
  t.ifrRings.push({ x, y, r: 0, R, k, hit: [], left: R / IFR_RING_V + IFR_RING_FADE /* stays on screen a moment after full size, fading (owner, 2026-10-19); it hits nothing then */ });
  sfx("ifrblast");
  if (k < 1) return; /* a mini ring sends no pellets */
  for (let i = 0; i < st.pellets; i++) {
    const a = Math.random() * 2 * Math.PI, cx = Math.cos(a), cy = Math.sin(a);
    t.ifrPellets.push({ x, y, ax: x + cx * R, ay: y + cy * R, vx: cx * IFR_PELLET_V, vy: cy * IFR_PELLET_V, left: R / IFR_PELLET_V, flown: 0 });
  }
}
// the RING: expands at IFR_RING_V to R; every enemy it passes takes the blast hit once (full splash - owner: good vs swarm)
function stepIfrRings(t, st, dt) {
  if (!t.ifrRings.length) return;
  for (const q of t.ifrRings) {
    const grew = q.r < q.R; /* hits only while the ring GROWS: the fade-out touches nothing */
    q.r = Math.min(q.R, q.r + IFR_RING_V * dt); q.left -= dt;
    if (!grew) continue;
    for (const e of G.enemies) {
      if (e.dead || !e.seen || q.hit.includes(e.id)) continue;
      const d2 = (e.x - q.x) ** 2 + (e.y - q.y) ** 2;
      if (d2 > q.r * q.r || d2 > q.R * q.R) continue;
      q.hit.push(e.id); const amt = st.dmg * q.k;
      const h0 = hitFrom; HIT_AT.x = q.x; HIT_AT.y = q.y; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_RING_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
    }
  }
  keepLive(t.ifrRings);
}
// the PELLETS: non-homing, straight out to the blast radius; the first enemy touched stops one (a hit), else it stops at the end of
// its reach (owner: "a missed pellet bursts where it was aimed"); where it stops, a FLARE - and at Backdraft a smaller ring too. It hits
// nothing until it has flown IFR_PELLET_ARM (it is born on top of whatever stood at the burst spot)
function stepIfrPellets(t, st, dt) {
  if (!t.ifrPellets.length) return;
  const g = projGrid();
  for (const p of t.ifrPellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt; p.flown += IFR_PELLET_V * dt;
    let sx = p.ax, sy = p.ay, stop = p.left <= 0;
    for (const e of p.flown < IFR_PELLET_ARM ? GRID_NONE : enemiesNear(p.x, p.y, g)) {
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + IFR_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      const amt = st.dmg * IFR_PELLET_K, h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_PELLET_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
      sx = p.x; sy = p.y; stop = true; break;
    }
    if (!stop) continue;
    p.left = 0; ifrFlare(t, st, sx, sy);
    if (st.backdraft) ifrBurst(t, st, sx, sy, IFR_MINI_K);
  }
  keepLive(t.ifrPellets);
}
function ifrFlare(t, st, x, y) {
  if (t.ifrFlares.length >= IFR_FLARE_MAX) t.ifrFlares.shift();
  t.ifrFlares.push({ x, y, L: st.beamL, W: st.beamW, life: st.burnS, left: st.burnS, tick: 0, edges: st.hellfire });
}
// the FLARE: six beams from the burst point, a hexagonal star like the tower's own hex (world angles: 3D is a view), burning for
// `life` - every tickS a QUIET tick on each enemy touching a beam, popping one shield charge. Hellfire VI runs each beam
// to the play box's edge (phoneBox)
const IFR_BODY_MAX = 150; // a generous bound on the biggest body: base size 28 (the biggest) x the HP-log growth (about x2 by wave 119) x a boss's arcana (up to about x2), rounded up
const IFR_BEAMS = 6; // beams a flare: a hexagonal star, like the tower's own hex (owner, 2026-10-19: six, never four)
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
function ifrBeamEnds(f) { const out = []; for (let k = 0; k < IFR_BEAMS; k++) out.push(ifrBeamEnd(f.x, f.y, k * Math.PI / 3, f.L, f.edges)); return out; }
// a flare's tick: every live on-screen enemy whose body touches ANY of its beams takes one quiet tick (one hit a flare a tick, on
// two beams too). Exact, not sampled: a cheap radius reject (a flare that cannot reach the enemy), then point-to-segment on its
// beams. 40 Hellfire-VI flares x 200 enemies x 6 beams is ~50k dot products, under the smoke's budget (2026-10-19; the grid
// sampling it replaced could skip a body a 60-degree beam clipped at a cell corner)
function ifrTickFlare(t, st, f) {
  const ends = ifrBeamEnds(f), half = f.W / 2, amt = st.dmg * st.tickK, reach = f.edges ? Infinity : f.L + half + IFR_BODY_MAX;
  const all = G.enemies, defs = ENEMIES; /* (locals: a global read in this loop costs more than the arithmetic) */
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
// ---------- the look: orange balls growing on the corners, a small ball in flight, a glowing ring, ember pellets, and the flares - a wide faint beam with a bright hairline, fading as they burn. Fills, strokes and lines only (the
// 3D moving layer turns them into GL instances; no gradient on the board context) ----------
const IFR_BALL_PX = 13, IFR_FLY_PX = 6;
/* a pellet is an EMBER (owner, 2026-10-19: "more visible"): a faint halo, an orange disc, a white core, and a tail of IFR_TAIL_N
   segments behind it at falling alpha. Sized for a phone (the board ~1000 u across 430 px) */
const IFR_EMBER_HALO = 9, IFR_EMBER_R = 4, IFR_EMBER_CORE = 1.5, IFR_TAIL_N = 3, IFR_TAIL_S = 0.05;
/* the RING is a glow, [width u, alpha] wide faint / mid / bright core, plus a faint disc inside the front */
const IFR_RING_GLOW = [[16, 0.14], [8, 0.3], [3, 0.9]], IFR_RING_DISC = 0.08;
function drawIfrCharge(t, st) {
  const corners = ifrSlotCorners(t, st.slots);
  ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.9;
  for (let i = 0; i < corners.length; i++) {
    const full = i < t.ifrReady, k = full ? 1 : i === t.ifrReady ? t.ifrCharge : 0;
    if (k <= 0) continue;
    const c = ifrCorner(t, corners[i]);
    ctx.beginPath(); ctx.arc(c.x, c.y, IFR_BALL_PX * (0.3 + 0.7 * k), 0, 6.283); ctx.fill();
    if (full) { ctx.fillStyle = COL.white; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(c.x, c.y, IFR_BALL_PX * 0.35, 0, 6.283); ctx.fill(); ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.9; }
  }
}
function drawIfrEmbers(t, low) {
  ctx.lineCap = "round"; ctx.strokeStyle = COL.tifr; ctx.lineWidth = IFR_EMBER_R;
  for (const p of t.ifrPellets) {
    if (!low) {
      for (let k = 0; k < IFR_TAIL_N; k++) {
        const a = k / IFR_TAIL_N, b = (k + 1) / IFR_TAIL_N; ctx.globalAlpha = 0.6 * (1 - a);
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * IFR_TAIL_S * a, p.y - p.vy * IFR_TAIL_S * a); ctx.lineTo(p.x - p.vx * IFR_TAIL_S * b, p.y - p.vy * IFR_TAIL_S * b); ctx.stroke();
      }
      ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, IFR_EMBER_HALO, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, IFR_EMBER_R, 0, 6.283); ctx.fill();
    ctx.fillStyle = COL.white; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, IFR_EMBER_CORE, 0, 6.283); ctx.fill();
  }
}
function drawIfrRings(t, low) {
  ctx.strokeStyle = COL.tifr; ctx.fillStyle = COL.tifr;
  for (const q of t.ifrRings) {
    const grow = q.r / q.R, fade = grow < 1 ? 1 : Math.max(0, q.left / IFR_RING_FADE), a = (0.9 * (1 - grow) + 0.1) * fade;
    if (!low && grow < 1) { ctx.globalAlpha = IFR_RING_DISC * (1 - grow); ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill(); }
    for (let g = low ? IFR_RING_GLOW.length - 1 : 0; g < IFR_RING_GLOW.length; g++) {
      ctx.lineWidth = IFR_RING_GLOW[g][0]; ctx.globalAlpha = IFR_RING_GLOW[g][1] * a / 0.9;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.stroke();
    }
  }
}
/* the ball: a disc, no line before it (owner, 2026-10-19: "remove the line that precedes the ball during launch") */
function drawIfrBalls(t) {
  ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.9;
  for (const b of t.ifrBalls) { ctx.beginPath(); ctx.arc(b.x, b.y, IFR_FLY_PX, 0, 6.283); ctx.fill(); }
}
// THE GLOW (owner, 2026-10-19: "hellfire highlight should be a glow which reduces in opacity gradually near the end of spoke"):
// each spoke is three stacked strokes - wide and faint, mid, a narrow bright core - [x the beam width, alpha], each cut into
// IFR_GLOW_BANDS lengths whose alpha falls off toward the tip as 1 - (k / bands)^2 (flat near the centre, fading at the end).
// No gradient: the board's path context takes none (ARCHITECTURE.md 11) - the bands are the gradient. lowQ keeps the core only
const IFR_GLOW = [[1.6, 0.12], [0.8, 0.28], [0.25, 0.85]], IFR_GLOW_BANDS = 6;
function drawIfrFlares(t) {
  if (!t.ifrFlares.length) return;
  const low = typeof lowQ === "function" && lowQ();
  ctx.strokeStyle = COL.tifr;
  for (const c of t.ifrFlares) {
    const f = Math.max(0, c.left / c.life), ends = ifrBeamEnds(c);
    for (let g = low ? IFR_GLOW.length - 1 : 0; g < IFR_GLOW.length; g++) {
      ctx.lineWidth = Math.max(1, c.W * IFR_GLOW[g][0]);
      for (let k = 0; k < IFR_GLOW_BANDS; k++) {
        const a0 = k / IFR_GLOW_BANDS, a1 = (k + 1) / IFR_GLOW_BANDS;
        ctx.globalAlpha = IFR_GLOW[g][1] * f * (1 - a0 * a0);
        ctx.beginPath();
        for (const [x0, y0, x1, y1] of ends) { ctx.moveTo(x0 + (x1 - x0) * a0, y0 + (y1 - y0) * a0); ctx.lineTo(x0 + (x1 - x0) * a1, y0 + (y1 - y0) * a1); }
        ctx.stroke();
      }
    }
  }
}
/* balls true (drawn in skyKeep, aspira-draw.js): the charge balls on the corners and the balls in flight, which keep their orange on a
   boss sky (owner, 2026-10-19: "ifrit balls should stay orange on boss inversion"); else the rings, pellets and spokes, which turn over with it */
function drawIfr(balls) {
  const low = typeof lowQ === "function" && lowQ();
  for (const t of G.towers) {
    if (t.kind !== "ifr" || t.ifrSlot0 == null) continue;
    ctx.lineCap = "butt"; ctx.lineJoin = "round";
    if (balls) { drawIfrBalls(t); drawIfrCharge(t, towerStats(t)); } else { drawIfrFlares(t); drawIfrRings(t, low); drawIfrEmbers(t, low); }
  }
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
}
