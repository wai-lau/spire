// /spire - CAR, the CARRIER (owner's design, 2026-10-15 - a StarCraft carrier, electric blue): strong against fast + shield,
// weak to swarm + armor, LONG reach. It never fires itself: it launches INTERCEPTORS, ONE BY ONE, each to its own enemy in
// range; an interceptor flies out, circles its target firing `ammo` small shots (retargeting when it dies), flies HOME and
// reloads, then goes again. Fast enemies cannot outrun them; every small shot pops a shield charge - the shield answer; one
// target an interceptor and small hits are why swarm and armor beat it. Hangar: prime counts from 5. Launch: reach and
// speed (WARP, VI: they teleport out and home). Armament: harder, faster shots, more of them (AUTOPILOT, VI: out of ammo, an
// interceptor bursts into pellets that can miss, and is rebuilt at home). Loaded after aspira-grv.js (the simulator too);
// towerStats calls carSkillStats, the tower loop stepCar, drawScene drawCar.

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const CAR_HANGAR = [5, 7, 7, 11, 11, 13]; // interceptors: PRIMES by purchase (owner: "prime numbers starting at 5") - bare 5, then I 7 (stop 1), II 11 (3), III 13 (5), IV 17 (6)
// each axis ITS OWN job (owner, 2026-10-15: "make sure each axis for each tower feels unique"): Hangar WIDTH (more interceptors),
// Launch TEMPO (faster there and back, a shorter reload - Warp: no flight at all), Armament DEPTH (a far harder hit, more of them)
const CAR_SPEED = [1050, 1260, 1260, 1470, 1470, 1680]; /* x1.75 with the range 260 -> 460 (owner, 2026-10-16: "interceptor speed buff to make up for travel time"; was 600 .. 960) */ // Launch: an interceptor's speed (its reach is SKILL_MOVE) - x1.5 (owner, 2026-10-15: "increase launch speed")
const CAR_RELOAD = [0.75, 0.55, 0.55, 0.4, 0.4, 0.275]; /* x0.5 with CAR_GAP 0.15 (2026-10-16) */ // Launch: s at home reloading (60% of a sortie was flying + reloading at wave 61)
const CAR_AMMO = [8, 10, 10, 12, 12, 14]; // Armament: shots a sortie (owner, 2026-10-15: "reduce ammo"; was 12 .. 28)
// the shot's HIT is SPREAD across the axes like ARC's (owner, 2026-10-15: "spread out armament damage like arc"): Armament half of
// it (log), Hangar and Launch a quarter each (CAR_SIDE_DMG). STEEPER than ARC's: on ARC's tables a mid build (III on every
// axis) dealt 2192/s on fast at wave 61, ARC 17449, SOL 22899 - ARC chains, and an interceptor spends ~40% flying and reloading
const CAR_SHOT_MUL = [1, 2.6, 4.5, 7.5, 10, 12.5]; // Armament (VI 15)
const CAR_SIDE_DMG = [1, 1.6, 2.4, 3.4, 4, 4.6]; // Hangar's and Launch's share (VI 5.1)
const CAR_RATE_MUL = [1, 1, 1, 1, 1, 1]; // (Armament's rate went into the hit: one lever an axis)
const CAR_SLOW = 0.2, CAR_SLOW_S = 0.6; // every bolt SLOWS (owner, 2026-10-15: "make interceptors slow") - one slow a tower, refreshed
const CAR_BOLTS = 5; /* 4 -> 5 with the trio-scale x1.33 hit (2026-10-16: armor leak 8% -> 16%) */ /* 3 -> 4 (owner, 2026-10-16: "if armor is still strong, split interceptor shots into even more pellets per shot"; countermx 61-69 spread armor leak 3 bolts 9%, 4 17%, 5 37%) */ // bolts a shot, each 1/CAR_BOLTS of the hit
const CAR_GAP = 0.15; /* 0.11 -> 0.15 with the reload x0.5 (owner, 2026-10-16: "reduce launch rate of interceptors, but reduce reload time to compensate"; countermx 61-69 spread 30/2/0/21 -> 25/0/0/15 - at 0.25 no reload made up for it: 70% of swarms leaked) */ /* x1/1.75 (owner, 2026-10-16: "interceptor spawn speed"; was 0.2) */ // s between launches (owner: "one by one")
// Hangar's FOCUS FIRE (owner, 2026-10-15): every OTHER interceptor looping the same target adds this share to each shot on it -
// width turns into depth when the wing outnumbers the targets (they spread first: carTarget prefers an unheld enemy)
const CAR_FOCUS = [0, 0.15, 0.15, 0.3, 0.3, 0.45];
// Launch's STRAFING PASS (owner, 2026-10-15): an interceptor ARRIVING at a target rams it - this x the tower's base damage x its
// speed / 700 (Warp arrives at CAR_WARP_V)
const CAR_RAM = [0, 2, 2, 4, 4, 7], CAR_WARP_V = 2800; /* x1.75 with the speeds (was 1600) */
// THE FLIGHT (owner, 2026-10-16: "a much smoother almost elliptical path, with a circle going around the enemy (stay about 100u
// away)"): a heading that turns at a capped rate, steered by a guidance field that spirals onto a CAR_ORBIT circle round the
// target - out at its Launch speed, easing to CAR_ORBIT_V on the circle, a wide turn out of it and home (was a 30u loop at 5 rad/s
// with straight legs and corners)
const CAR_ORBIT = 100, CAR_ORBIT_V = 400; // a loop is 2 pi 100 / 400 = 1.57 s
// ORBIT JITTER (owner, 2026-10-16: "add orbit jitter to the interceptors, like 20%"): each interceptor's circle breathes +-20%
// on a slow wave of its own (a random phase and pace a sortie), so a wing's loops never stack into one ring
const CAR_ORBIT_JIT = 0.2, CAR_JIT_W = [1.2, 2.6]; // the radius's swing; its pace in rad/s, low .. high
const carR = i => CAR_ORBIT * (1 + CAR_ORBIT_JIT * Math.sin(i.jp || 0));
const CAR_TURN_R = 50; // the tightest turn, in u: turn rate = speed / this (twice the circle's, so the circle can be held)
const CAR_LEASH = 7.4; /* the 960 chase at range 130 (owner, 2026-10-16: "Interceptor range should still be huge") */ /* 4: a 960 chase at range 240 (2026-10-16: 780, 960 and 1200 all leaked the same - the chase is not what binds) */ /* the same 780 chase at range 330 (2026-10-16) */ /* 3 at range 260: the same 780 chase now the range is 460 (2026-10-16) */ // a target further than this x the reach from the carrier is let go - the one tower that PURSUES (was 1.2: fast
// enemies left reach mid-sortie and ATC, built against fast, leaked them worst - counter matrix 2026-10-15)
const CAR_BURST_N = 10, CAR_BURST_K = 1.5, CAR_PELLET_V = 340, CAR_PELLET_REACH = 90, CAR_PELLET_HIT = 3; // Autopilot's pellets

SKILL_TREES.car = [
  { id: "hangar", name: "Hangar", tiers: [{ name: "Bay" }, { name: "Deck" }, { name: "Hold" }, { name: "Wing" }, { name: "Fleet" }] },
  { id: "launch", name: "Launch", tiers: [{ name: "Catapult" }, { name: "Thrust" }, { name: "Afterburn" }, { name: "Slipstream" }, { name: "Hyperdrive" }] },
  { id: "armament", name: "Armament", tiers: [{ name: "Pulse" }, { name: "Burst" }, { name: "Strafe" }, { name: "Barrage" }, { name: "Salvo" }] },
];
SKILL_MOVE.car = { hangar: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], launch: [[1, 1], [1.05, 1], [1.1, 1], [1.15, 1], [1.2, 1], [1.25, 1]], armament: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]] };

function carSkillStats(t, s, b) {
  const h = skillOf(t, "hangar"), l = skillOf(t, "launch"), a = skillOf(t, "armament");
  s.range = b.range * RANGE_BONUS; s.rate = b.rate * CAR_RATE_MUL[a]; s.dmg = b.dmg * CAR_SHOT_MUL[a] * CAR_SIDE_DMG[h] * CAR_SIDE_DMG[l]; s.targets = 1;
  s.wing = CAR_HANGAR[h]; s.speed = CAR_SPEED[l]; s.reload = CAR_RELOAD[l]; s.focus = CAR_FOCUS[h]; s.ram = b.dmg * CAR_RAM[l] * (l >= CAPSTONE_TIER ? CAR_WARP_V : CAR_SPEED[l]) / 700; /* 700 (was 400): the x1.75 speeds leave the ram as it was */ s.warp = l >= CAPSTONE_TIER; s.ammo = CAR_AMMO[a]; s.autopilot = a >= CAPSTONE_TIER; s.skill = true;
}

// an interceptor: home (reloading), out (to its target, then circling it, firing), back (home)
function carWing(t, st) {
  t.icp ||= [];
  while (t.icp.length < st.wing) t.icp.push({ x: t.x, y: t.y, state: "home", reload: 0, ammo: 0, e: null, cd: 0, ang: Math.random() * 6.283 });
  if (t.icp.length > st.wing) t.icp.length = st.wing;
}
const carDist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
// a target for an interceptor: SEND ENOUGH - the first enemy in reach (pickTargets: the tower's targeting) whose HP is more than
// the damage already committed to it (the ammo x hit of the interceptors on it), else the first in reach. A tough enemy draws
// several (and their FOCUS FIRE); a weak one, one (2026-10-15: one interceptor an enemy let single-file fast waves through)
function carTarget(t, st) {
  const sent = new Map(), cand = pickTargets(t, st, st.wing);
  for (const i of t.icp) if (i.e && !i.e.dead && i.state === "out") sent.set(i.e.id, (sent.get(i.e.id) || 0) + i.ammo * st.dmg);
  return cand.find(e => e.hp + (e.shield || 0) * st.dmg / 2 > (sent.get(e.id) || 0)) || cand[0] || null;
}
function stepCar(t, dt) {
  const st = towerStats(t);
  carWing(t, st);
  stepCarPellets(t, dt); stepCarBolts(t, st, dt); carObstacles(t);
  t.launchCd = Math.max(0, (t.launchCd || 0) - dt);
  for (const i of t.icp) stepIcp(i, t, st, dt);
}
function stepIcp(i, t, st, dt) {
  if (i.state === "home") {
    i.x = t.x; i.y = t.y; i.reload = Math.max(0, i.reload - dt);
    if (i.reload > 0 || t.launchCd > 0) return;
    const e = carTarget(t, st);
    if (!e) return;
    i.e = e; i.ammo = st.ammo; i.bk = 0; i.state = "out"; i.cd = 0; i.orb = false; t.launchCd = CAR_GAP; sfx("car");
    i.v = st.speed; i.ang = Math.atan2(e.y - t.y, e.x - t.x); i.jp = Math.random() * 6.283; i.jw = CAR_JIT_W[0] + Math.random() * (CAR_JIT_W[1] - CAR_JIT_W[0]);
    for (let k = 0; k < 4; k++) { const [ax, ay] = carAvoid(i, e.x - t.x, e.y - t.y, 1); i.ang = Math.atan2(ay, ax); } // leaves already bent round the core (a carrier by it has no room to turn)
    if (st.warp) { const a = Math.random() * 6.283; i.x = e.x + Math.cos(a) * carR(i); i.y = e.y + Math.sin(a) * carR(i); i.ang = a + Math.PI / 2; } // WARP: on the circle at once
    return;
  }
  if (i.state === "out") {
    // the CLOTHESPIN (owner, 2026-10-15): straight out, loops its target firing until out of ammo, straight home. A target that
    // dies hands the loop to an enemy within CAR_HOP of the interceptor, else it goes home (ATC's swarm weakness: free to chain
    // kill to kill across reach it leaked 1% of swarms; one target a sortie, 85% - and 66% of fast, its own type)
    if (!i.e || i.e.dead || carDist2(i.e, t) > (st.range * CAR_LEASH) ** 2) { i.e = carHop(i.e || i, t, st); i.orb = false; if (!i.e) { carHome(i, t, st); return; } }
    const e = i.e, d = Math.sqrt(carDist2(i, e));
    carOrbit(i, e, st, d, dt);
    if (!i.orb && d > carR(i) * 1.3) return; // still on its way
    if (!i.orb) { i.orb = true; if (st.ram > 0) { damage(e, st.ram, t); onHit(e, t, st, st.ram); } } // onto the circle - the STRAFING PASS
    i.cd -= dt;
    while (i.cd <= 0 && i.ammo > 0 && !e.dead) { i.cd += 1 / (st.rate * CAR_BOLTS); if (!i.bk) sfx("carshot"); carBolt(i, e, t, st); if (++i.bk >= CAR_BOLTS) { i.bk = 0; i.ammo--; } } // the stream: a shot's bolts spread over its interval
    if (i.ammo <= 0) {
      if (st.autopilot) { carBurst(i, t, st); i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; i.e = null; return; } // rebuilt at home
      carHome(i, t, st);
    }
    return;
  }
  // back home
  const d = Math.sqrt(carDist2(i, t));
  if (st.warp || d <= Math.max(i.v, 1) * dt * 1.5) { i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; i.e = null; return; }
  carSteer(i, t.x - i.x, t.y - i.y, st.speed, dt, Math.max(0, Math.min(1, (d - SLOT_R * 0.5) / SLOT_R))); // the avoidance lets go on the last approach home
}
// steer: speed eases toward v, the heading turns toward (dx, dy) at most speed / CAR_TURN_R a second, then a step along it
function carSteer(i, dx, dy, v, dt, fade = 1) {
  i.v = (i.v || v) + (v - (i.v || v)) * Math.min(1, dt * 4);
  [dx, dy] = carAvoid(i, dx, dy, fade);
  let da = Math.atan2(dy, dx) - i.ang;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const w = i.v / CAR_TURN_R * dt;
  i.ang += Math.max(-w, Math.min(w, da));
  i.x += Math.cos(i.ang) * i.v * dt; i.y += Math.sin(i.ang) * i.v * dt;
}
// AVOIDANCE (owner, 2026-10-16: "make it so that interceptors avoid hitting the core and other towers (smooth path)"): every
// obstacle within CAR_AVOID_LOOK ahead bends the wanted heading round its near side (the heading's part across it), harder the
// closer, and one it is already inside pushes it out - the capped turn rate keeps the bend a smooth arc. Its own carrier is not
// one (it launches and lands there)
const CAR_AVOID_PAD = 14, CAR_AVOID_LOOK = 110; // u kept clear of a hex; u ahead it starts to bend
let carObs = [];
function carObstacles(t) {
  carObs = [{ core: true, x: CX, y: CY, r: (typeof coreOuterR === "function" ? coreOuterR() : CORE_R) + CAR_AVOID_PAD }];
  for (const o of G.towers) if (o !== t) carObs.push({ x: o.x, y: o.y, r: CELL_S * TOWER_K + CAR_AVOID_PAD });
}
function carAvoid(i, dx, dy, fade) {
  const g = Math.hypot(dx, dy) || 1, hx = Math.cos(i.ang), hy = Math.sin(i.ang);
  let ux = dx / g, uy = dy / g;
  for (const o of carObs) {
    const ox = o.x - i.x, oy = o.y - i.y, d = Math.hypot(ox, oy) || 1, rx = ox / d, ry = oy / d, along = hx * rx + hy * ry;
    const lat = Math.abs(hx * oy - hy * ox), inside = d < o.r, f = o.core ? 1 : fade; // the core is never let go
    if (!inside && (d > o.r + CAR_AVOID_LOOK || along < 0 || lat > o.r * 1.6)) continue; // clear of it, behind it, or passing wide
    let tx = hx - along * rx, ty = hy - along * ry, tl = Math.hypot(tx, ty);
    if (tl < 1e-3) { tx = ry; ty = -rx; tl = 1; } // dead ahead: round it clockwise
    const near = Math.min(1, (o.r + CAR_AVOID_LOOK - d) / CAR_AVOID_LOOK) ** 2, wide = inside ? 1 : Math.min(1, (o.r * 1.6 - lat) / (o.r * 0.6));
    const w = f * 3 * near * wide, push = inside ? f * 2 * (o.r - d) / o.r : 0;
    ux += w * tx / tl - (w * 0.5 + push) * rx; uy += w * ty / tl - (w * 0.5 + push) * ry;
  }
  return [ux, uy];
}
// the GUIDANCE FIELD round e (a Lyapunov vector field): far out it points nearly straight in, near the circle it turns
// tangent, inside it pushes out - every path spirals smoothly onto the CAR_ORBIT circle, counter-clockwise
function carOrbit(i, e, st, d, dt) {
  if (i.te === e) { i.x += e.x - i.tx; i.y += e.y - i.ty; } // the circle RIDES with its target (a fast enemy dragged a world-frame circle off it: 13% of fast leaked)
  i.te = e; i.tx = e.x; i.ty = e.y; i.jp = (i.jp || 0) + (i.jw || 0) * dt;
  const x = i.x - e.x, y = i.y - e.y, R = carR(i), r = Math.max(d, 1), q = r * r - R * R, k = 2 * R * r;
  const f = Math.max(0, Math.min(1, (r - R * 1.2) / (R * 2))); // full Launch speed until 3 R out, easing to CAR_ORBIT_V by 1.2 R
  carSteer(i, -(x * q + y * k), -(y * q - x * k), CAR_ORBIT_V + (Math.max(st.speed, CAR_ORBIT_V) - CAR_ORBIT_V) * f, dt);
}
// a shot: CAR_BOLTS light-blue bolts, each 1/CAR_BOLTS of the hit - armor takes its flat cut from each: ATC's armor weakness (with
// the steep hit tables a single big hit shrugged armor off). A STREAM (owner, 2026-10-16: "bolts should come from the center of the
// interceptor (from underneath) and shoot in a constant stream", "4 bolts evenly distributed over the time it takes to fire one
// salvo", "homing, and just keep going straight if the enemy dies"): one bolt every 1 / (rate x CAR_BOLTS) s, a projectile that
// homes on its target; its target gone, it flies on straight and hits the first enemy it touches, or nothing (was: three at once,
// side by side, landing the instant they were fired)
const CAR_BOLT_V = 900, CAR_BOLT_REACH = 260, CAR_BOLT_HIT = 3; // u/s; u flown before it fades; u added to the enemy's size
function carBolt(i, e, t, st) {
  let n = 0;
  if (st.focus) for (const o of t.icp) if (o !== i && o.e === e && o.orb && o.state === "out") n++; // FOCUS FIRE: the others on it
  const a = Math.atan2(e.y - i.y, e.x - i.x);
  (t.carBolts ||= []).push({ x: i.x, y: i.y, e, vx: Math.cos(a) * CAR_BOLT_V, vy: Math.sin(a) * CAR_BOLT_V, left: CAR_BOLT_REACH / CAR_BOLT_V, dmg: st.dmg * (1 + st.focus * n) / CAR_BOLTS, icp: i });
}
function stepCarBolts(t, st, dt) {
  if (!t.carBolts || !t.carBolts.length) return;
  for (const b of t.carBolts) {
    if (b.e && b.e.dead) b.e = null; // its target gone: straight on
    if (b.e) { const dx = b.e.x - b.x, dy = b.e.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * CAR_BOLT_V; b.vy = dy / d * CAR_BOLT_V; } // homing
    b.x += b.vx * dt; b.y += b.vy * dt; b.left -= dt;
    for (const e of b.e ? [b.e] : G.enemies) {
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + CAR_BOLT_HIT;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      damage(e, b.dmg, t, false, false, { from: { x: b.icp.x, y: b.icp.y } }); onHit(e, t, st, b.dmg); // its number flies AWAY from its interceptor, not the carrier (owner, 2026-10-16)
      if (!e.dead) applySlow(e, CAR_SLOW, CAR_SLOW_S, "car:" + t.id); // (doubled on fast, never the shielded - applySlow)
      b.left = 0; break;
    }
  }
  t.carBolts = t.carBolts.filter(b => b.left > 0);
}
// a NUMBER A BOLT again (owner, 2026-10-16: "ATC damage, go back to number per pellet, however position of emission should be away
// from interceptor, not tower"; a shot's total on its last bolt for an hour)
const CAR_HOP = 30; /* 35 -> 30 with the x1.33 hit (swarm 15% -> 24%) */ /* 40 -> 35 with the 100u circle and the homing stream (2026-10-16, countermx 61-69 spread: 25 leaked 47% of swarms, 35 25%, 45 9%) */ // (90: ATC leaked 1% of swarms; 20: 68% swarms but 50% fast - counter matrix 61-69, 2026-10-15)
function carHop(i, t, st) { // (i: where the last target was - the interceptor itself circles CAR_ORBIT out)
  let best = null, bd = CAR_HOP * CAR_HOP;
  for (const e of G.enemies) { if (e.dead) continue; const d = carDist2(e, i); if (d < bd) { bd = d; best = e; } }
  return best;
}
function carHome(i, t, st) { i.state = "back"; i.e = null; i.orb = false; i.v = Math.max(i.v || 0, CAR_ORBIT_V); if (st.warp) { i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; } }

// AUTOPILOT: out of ammo, the interceptor bursts into pellets - projectiles that hit the first enemy they touch, or miss
function carBurst(i, t, st) {
  for (let k = 0; k < CAR_BURST_N; k++) {
    const a = Math.random() * 6.283;
    (t.carPellets ||= []).push({ x: i.x, y: i.y, vx: Math.cos(a) * CAR_PELLET_V, vy: Math.sin(a) * CAR_PELLET_V, left: CAR_PELLET_REACH / CAR_PELLET_V, dmg: st.dmg * CAR_BURST_K });
  }
}
function stepCarPellets(t, dt) {
  if (!t.carPellets || !t.carPellets.length) return;
  for (const p of t.carPellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + CAR_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      damage(e, p.dmg, t); p.left = 0; break;
    }
  }
  t.carPellets = t.carPellets.filter(p => p.left > 0);
}

// ---------- the look: thin, long darts - a fast enemy's triangle, stretched - and LIGHT-BLUE bolts and pellets (StarCraft) ----------
const CAR_DART = 33, CAR_DART_W = 7.8, /* x3 (owner, 2026-10-16: "make the interceptors like 3x bigger"; was 11, 2.6) */ CAR_PELLET_PX = 2, CAR_PELLET_TAIL = 0.03, CAR_BOLT_TAIL = 0.007 /* owner, 2026-10-16: "change the 5 bolts to each be much shorter" (was 0.02, 18u) */, CAR_BOLT_GROW = 0.3; // a bolt streak: at most this many s of its flight behind it, growing by GROW s a s of flight (6u by 21u out)
// its SIZE grows with Armament (owner, 2026-10-16: "halve interceptor size (grow this as armament increases)"): half the dart
// above, untaken, + CAR_DART_GROW a tier - the full dart at VI
const CAR_DART_K0 = 0.5, CAR_DART_GROW = 0.1;
function carDart(i, z) {
  const a = i.ang, L = CAR_DART * z, W = CAR_DART_W * z; // nose along its heading
  const c = Math.cos(a), s = Math.sin(a), bx = i.x - c * L * 0.5, by = i.y - s * L * 0.5;
  ctx.beginPath(); ctx.moveTo(i.x + c * L * 0.5, i.y + s * L * 0.5);
  ctx.lineTo(bx - s * W, by + c * W); ctx.lineTo(bx + s * W, by - c * W); ctx.closePath();
  ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
}
// darts: the INTERCEPTORS alone, drawn in skyKeep - their colour is not inverted by a boss sky (owner, 2026-10-16: "Interceptor color
// should also not be inverted"); else the bolts and pellets, which turn over with it like every tower's shots
function drawCar(darts) {
  for (const t of G.towers) {
    if (t.kind !== "car" || !t.icp) continue;
    if (darts) {
      ctx.fillStyle = COL.blue; ctx.strokeStyle = COL.blue; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
      const z = CAR_DART_K0 + CAR_DART_GROW * skillOf(t, "armament");
      for (const i of t.icp) if (i.state !== "home") carDart(i, z);
      continue;
    }
    ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round"; ctx.lineWidth = CAR_PELLET_PX; ctx.globalAlpha = 1;
    for (const b of t.carBolts || []) { // UNDER the darts: they leave from beneath. A DOT at the interceptor, stretching out as it flies (owner, 2026-10-16)
      const k = Math.min(CAR_BOLT_TAIL, (CAR_BOLT_REACH / CAR_BOLT_V - b.left) * CAR_BOLT_GROW);
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * k, b.y - b.vy * k); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.lineWidth = CAR_PELLET_PX;
    for (const p of t.carPellets || []) { ctx.beginPath(); ctx.moveTo(p.x - p.vx * CAR_PELLET_TAIL, p.y - p.vy * CAR_PELLET_TAIL); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}
