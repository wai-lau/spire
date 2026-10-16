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
const CAR_SPEED = [600, 720, 720, 840, 840, 960]; // Launch: an interceptor's speed (its reach is SKILL_MOVE) - x1.5 (owner, 2026-10-15: "increase launch speed")
const CAR_RELOAD = [1.5, 1.1, 1.1, 0.8, 0.8, 0.55]; // Launch: s at home reloading (60% of a sortie was flying + reloading at wave 61)
const CAR_AMMO = [8, 10, 10, 12, 12, 14]; // Armament: shots a sortie (owner, 2026-10-15: "reduce ammo"; was 12 .. 28)
// the shot's HIT is SPREAD across the axes like ARC's (owner, 2026-10-15: "spread out armament damage like arc"): Armament half of
// it (log), Hangar and Launch a quarter each (CAR_SIDE_DMG). STEEPER than ARC's: on ARC's tables a mid build (III on every
// axis) dealt 2192/s on fast at wave 61, ARC 17449, SOL 22899 - ARC chains, and an interceptor spends ~40% flying and reloading
const CAR_SHOT_MUL = [1, 2.6, 4.5, 7.5, 10, 12.5]; // Armament (VI 15)
const CAR_SIDE_DMG = [1, 1.6, 2.4, 3.4, 4, 4.6]; // Hangar's and Launch's share (VI 5.1)
const CAR_RATE_MUL = [1, 1, 1, 1, 1, 1]; // (Armament's rate went into the hit: one lever an axis)
const CAR_BOLTS = 3; // bolts a shot, each 1/CAR_BOLTS of the hit
const CAR_GAP = 0.2; // s between launches (owner: "one by one")
// Hangar's FOCUS FIRE (owner, 2026-10-15): every OTHER interceptor looping the same target adds this share to each shot on it -
// width turns into depth when the wing outnumbers the targets (they spread first: carTarget prefers an unheld enemy)
const CAR_FOCUS = [0, 0.15, 0.15, 0.3, 0.3, 0.45];
// Launch's STRAFING PASS (owner, 2026-10-15): an interceptor ARRIVING at a target rams it - this x the tower's base damage x its
// speed / 400 (Warp arrives at CAR_WARP_V)
const CAR_RAM = [0, 2, 2, 4, 4, 7], CAR_WARP_V = 1600;
const CAR_ORBIT = 30, CAR_ORBIT_W = 5; // it circles its target at this radius, this many radians a second
const CAR_LEASH = 3; // a target further than this x the reach from the carrier is let go - the one tower that PURSUES (was 1.2: fast
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
  s.wing = CAR_HANGAR[h]; s.speed = CAR_SPEED[l]; s.reload = CAR_RELOAD[l]; s.focus = CAR_FOCUS[h]; s.ram = b.dmg * CAR_RAM[l] * (l >= CAPSTONE_TIER ? CAR_WARP_V : CAR_SPEED[l]) / 400; s.warp = l >= CAPSTONE_TIER; s.ammo = CAR_AMMO[a]; s.autopilot = a >= CAPSTONE_TIER; s.skill = true;
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
  stepCarPellets(t, dt);
  t.launchCd = Math.max(0, (t.launchCd || 0) - dt);
  for (const i of t.icp) stepIcp(i, t, st, dt);
}
function stepIcp(i, t, st, dt) {
  if (i.state === "home") {
    i.x = t.x; i.y = t.y; i.reload = Math.max(0, i.reload - dt);
    if (i.reload > 0 || t.launchCd > 0) return;
    const e = carTarget(t, st);
    if (!e) return;
    i.e = e; i.ammo = st.ammo; i.state = "out"; i.cd = 0; i.orb = false; t.launchCd = CAR_GAP; sfx("car");
    if (st.warp) { i.x = e.x; i.y = e.y; } // WARP: there at once
    return;
  }
  if (i.state === "out") {
    // the CLOTHESPIN (owner, 2026-10-15): straight out, loops its target firing until out of ammo, straight home. A target that
    // dies hands the loop to an enemy within CAR_HOP of the interceptor, else it goes home (ATC's swarm weakness: free to chain
    // kill to kill across reach it leaked 1% of swarms; one target a sortie, 85% - and 66% of fast, its own type)
    if (!i.e || i.e.dead || carDist2(i.e, t) > (st.range * CAR_LEASH) ** 2) { i.e = carHop(i, t, st); i.orb = false; if (!i.e) { carHome(i, t, st); return; } }
    const e = i.e, d = Math.sqrt(carDist2(i, e));
    if (!i.orb && d > CAR_ORBIT) { carFly(i, e, st.speed * dt, d); return; } // still on its way, straight
    if (!i.orb) { i.orb = true; i.ang = Math.atan2(i.y - e.y, i.x - e.x); if (st.ram > 0) { damage(e, st.ram, t); onHit(e, t, st, st.ram); } } // into the loop where it arrived (no snap) - the STRAFING PASS
    i.ang += CAR_ORBIT_W * dt; i.x = e.x + Math.cos(i.ang) * CAR_ORBIT; i.y = e.y + Math.sin(i.ang) * CAR_ORBIT; // circling it
    i.cd -= dt;
    while (i.cd <= 0 && i.ammo > 0 && !e.dead) { i.cd += 1 / st.rate; i.ammo--; carTwin(i, e, t, st); } // TWO bolts a shot (owner: "two at a time")
    if (i.ammo <= 0) {
      if (st.autopilot) { carBurst(i, t, st); i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; i.e = null; return; } // rebuilt at home
      carHome(i, t, st);
    }
    return;
  }
  // back home
  const d = Math.sqrt(carDist2(i, t));
  if (st.warp || d <= st.speed * dt) { i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; i.e = null; return; }
  carFly(i, t, st.speed * dt, d);
}
// a shot: THREE light-blue bolts side by side (owner, 2026-10-15: "make the two shots into three"), each a THIRD of the hit -
// armor takes its flat cut from each,
// ATC's armor weakness (with the steep hit tables a single big hit shrugged armor off: 5% leaked vs armor, its best type)
function carTwin(i, e, t, st) {
  let n = 0;
  if (st.focus) for (const o of t.icp) if (o !== i && o.e === e && o.orb && o.state === "out") n++; // FOCUS FIRE: the others on it
  const d = st.dmg * (1 + st.focus * n) / CAR_BOLTS;
  for (let k = 0; k < CAR_BOLTS && !e.dead; k++) { damage(e, d, t); onHit(e, t, st, d); }
  if (typeof INSTANT_COINS !== "undefined" && INSTANT_COINS) return; // (the simulator draws nothing)
  const a = Math.atan2(e.y - i.y, e.x - i.x), ox = -Math.sin(a) * CAR_TWIN, oy = Math.cos(a) * CAR_TWIN;
  for (const s of [1, 0, -1]) (t.carBolts ||= []).push({ x0: i.x + ox * s, y0: i.y + oy * s, x1: e.x + ox * s, y1: e.y + oy * s, t: 0 });
}
const CAR_HOP = 40; // (90: ATC leaked 1% of swarms; 20: 68% swarms but 50% fast - counter matrix 61-69, 2026-10-15)
function carHop(i, t, st) {
  let best = null, bd = CAR_HOP * CAR_HOP;
  for (const e of G.enemies) { if (e.dead) continue; const d = carDist2(e, i); if (d < bd) { bd = d; best = e; } }
  return best;
}
function carHome(i, t, st) { i.state = "back"; i.e = null; i.orb = false; if (st.warp) { i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; } }
function carFly(i, to, step, d) { i.ang = Math.atan2(to.y - i.y, to.x - i.x); i.x += (to.x - i.x) / d * step; i.y += (to.y - i.y) / d * step; }

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
const CAR_DART = 11, CAR_DART_W = 2.6, CAR_PELLET_PX = 2, CAR_PELLET_TAIL = 0.03, CAR_TWIN = 2.5, CAR_BOLT_S = 0.07, CAR_BOLT_LEN = 0.35;
function carDart(i) {
  const a = i.state === "out" && i.orb ? i.ang + Math.PI / 2 : i.ang; // circling: nose along the orbit
  const c = Math.cos(a), s = Math.sin(a), bx = i.x - c * CAR_DART * 0.5, by = i.y - s * CAR_DART * 0.5;
  ctx.beginPath(); ctx.moveTo(i.x + c * CAR_DART * 0.5, i.y + s * CAR_DART * 0.5);
  ctx.lineTo(bx - s * CAR_DART_W, by + c * CAR_DART_W); ctx.lineTo(bx + s * CAR_DART_W, by - c * CAR_DART_W); ctx.closePath();
  ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
}
function drawCar() {
  const dt = drawCar.last ? Math.min(0.1, (performance.now() - drawCar.last) / 1000 * (ui.speed || 1)) : 0;
  drawCar.last = performance.now();
  for (const t of G.towers) {
    if (t.kind !== "car" || !t.icp) continue;
    ctx.fillStyle = COL.blue; ctx.strokeStyle = COL.blue; ctx.lineWidth = 1.3; ctx.lineJoin = "round";
    for (const i of t.icp) if (i.state !== "home") carDart(i);
    ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round"; ctx.lineWidth = CAR_PELLET_PX; ctx.globalAlpha = 1;
    for (const b of t.carBolts || []) {
      b.t += dt;
      const f = Math.min(1, b.t / CAR_BOLT_S), g = Math.max(0, f - CAR_BOLT_LEN);
      ctx.beginPath(); ctx.moveTo(b.x0 + (b.x1 - b.x0) * g, b.y0 + (b.y1 - b.y0) * g); ctx.lineTo(b.x0 + (b.x1 - b.x0) * f, b.y0 + (b.y1 - b.y0) * f); ctx.stroke();
    }
    if (t.carBolts) t.carBolts = t.carBolts.filter(b => b.t < CAR_BOLT_S);
    for (const p of t.carPellets || []) { ctx.beginPath(); ctx.moveTo(p.x - p.vx * CAR_PELLET_TAIL, p.y - p.vy * CAR_PELLET_TAIL); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}
