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
const CAR_SPEED = [400, 440, 480, 530, 580, 640]; // Launch: an interceptor's speed (its reach is SKILL_MOVE)
const CAR_AMMO = [6, 7, 8, 9, 10, 12]; // Armament: shots a sortie
const CAR_SHOT_MUL = [1, 1.2, 1.4, 1.6, 1.8, 2]; // Armament: a shot's hit, x the tower's damage
const CAR_RATE_MUL = [1, 1.1, 1.2, 1.3, 1.4, 1.5]; // Armament: shots a second, x the tower's rate
const CAR_RELOAD = 1.5, CAR_GAP = 0.2; // s: an interceptor's reload at home; between launches (owner: "one by one")
const CAR_ORBIT = 22, CAR_ORBIT_W = 5; // it circles its target at this radius, this many radians a second
const CAR_LEASH = 1.2; // a target further than this x the reach from the carrier is let go
const CAR_BURST_N = 10, CAR_BURST_K = 1.5, CAR_PELLET_V = 340, CAR_PELLET_REACH = 90, CAR_PELLET_HIT = 3; // Autopilot's pellets

SKILL_TREES.car = [
  { id: "hangar", name: "Hangar", tiers: [{ name: "Bay" }, { name: "Deck" }, { name: "Hold" }, { name: "Wing" }, { name: "Fleet" }] },
  { id: "launch", name: "Launch", tiers: [{ name: "Catapult" }, { name: "Thrust" }, { name: "Afterburn" }, { name: "Slipstream" }, { name: "Hyperdrive" }] },
  { id: "armament", name: "Armament", tiers: [{ name: "Pulse" }, { name: "Burst" }, { name: "Strafe" }, { name: "Barrage" }, { name: "Salvo" }] },
];
SKILL_MOVE.car = { hangar: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], launch: [[1, 1], [1.05, 1], [1.1, 1], [1.15, 1], [1.2, 1], [1.25, 1]], armament: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]] };

function carSkillStats(t, s, b) {
  const h = skillOf(t, "hangar"), l = skillOf(t, "launch"), a = skillOf(t, "armament");
  s.range = b.range * RANGE_BONUS; s.rate = b.rate * CAR_RATE_MUL[a]; s.dmg = b.dmg * CAR_SHOT_MUL[a]; s.targets = 1;
  s.wing = CAR_HANGAR[h]; s.speed = CAR_SPEED[l]; s.warp = l >= CAPSTONE_TIER; s.ammo = CAR_AMMO[a]; s.autopilot = a >= CAPSTONE_TIER; s.skill = true;
}

// an interceptor: home (reloading), out (to its target, then circling it, firing), back (home)
function carWing(t, st) {
  t.icp ||= [];
  while (t.icp.length < st.wing) t.icp.push({ x: t.x, y: t.y, state: "home", reload: 0, ammo: 0, e: null, cd: 0, ang: Math.random() * 6.283, flash: 0 });
  if (t.icp.length > st.wing) t.icp.length = st.wing;
}
const carDist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
// a target for an interceptor: one in reach no other interceptor holds, else any in reach (pickTargets: the tower's targeting)
function carTarget(t, st) {
  const held = new Set(t.icp.filter(i => i.e && !i.e.dead).map(i => i.e.id)), cand = pickTargets(t, st, st.wing);
  return cand.find(e => !held.has(e.id)) || cand[0] || null;
}
function stepCar(t, dt) {
  const st = towerStats(t);
  carWing(t, st);
  stepCarPellets(t, dt);
  t.launchCd = Math.max(0, (t.launchCd || 0) - dt);
  for (const i of t.icp) stepIcp(i, t, st, dt);
}
function stepIcp(i, t, st, dt) {
  i.flash = Math.max(0, i.flash - dt);
  if (i.state === "home") {
    i.x = t.x; i.y = t.y; i.reload = Math.max(0, i.reload - dt);
    if (i.reload > 0 || t.launchCd > 0) return;
    const e = carTarget(t, st);
    if (!e) return;
    i.e = e; i.ammo = st.ammo; i.state = "out"; i.cd = 0; t.launchCd = CAR_GAP; sfx("car");
    if (st.warp) { i.x = e.x; i.y = e.y; } // WARP: there at once
    return;
  }
  if (i.state === "out") {
    if (!i.e || i.e.dead || carDist2(i.e, t) > (st.range * CAR_LEASH) ** 2) { i.e = carTarget(t, st); if (!i.e) { carHome(i, t, st); return; } }
    const e = i.e, d = Math.sqrt(carDist2(i, e));
    if (d > CAR_ORBIT * 1.5) { carFly(i, e, st.speed * dt, d); return; } // still on its way
    i.ang += CAR_ORBIT_W * dt; i.x = e.x + Math.cos(i.ang) * CAR_ORBIT; i.y = e.y + Math.sin(i.ang) * CAR_ORBIT; // circling it
    i.cd -= dt;
    while (i.cd <= 0 && i.ammo > 0 && !e.dead) { i.cd += 1 / st.rate; i.ammo--; i.flash = 0.06; damage(e, st.dmg, t); onHit(e, t, st, st.dmg); }
    if (i.ammo <= 0) {
      if (st.autopilot) { carBurst(i, t, st); i.state = "home"; i.reload = CAR_RELOAD; i.x = t.x; i.y = t.y; i.e = null; return; } // rebuilt at home
      carHome(i, t, st);
    }
    return;
  }
  // back home
  const d = Math.sqrt(carDist2(i, t));
  if (st.warp || d <= st.speed * dt) { i.state = "home"; i.reload = CAR_RELOAD; i.x = t.x; i.y = t.y; i.e = null; return; }
  carFly(i, t, st.speed * dt, d);
}
function carHome(i, t, st) { i.state = "back"; i.e = null; if (st.warp) { i.state = "home"; i.reload = CAR_RELOAD; i.x = t.x; i.y = t.y; } }
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

// ---------- the look: small blue darts, a thin firing line when one shoots, the burst's pellets ----------
const CAR_DART = 6, CAR_PELLET_PX = 2, CAR_PELLET_TAIL = 0.03;
function drawCar() {
  for (const t of G.towers) {
    if (t.kind !== "car" || !t.icp) continue;
    for (const i of t.icp) {
      if (i.state === "home") continue;
      if (i.flash > 0 && i.e && !i.e.dead) { ctx.globalAlpha = 0.9; ctx.strokeStyle = COL.blue; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(i.x, i.y); ctx.lineTo(i.e.x, i.e.y); ctx.stroke(); }
      const a = i.state === "out" && i.e && Math.sqrt(carDist2(i, i.e)) <= CAR_ORBIT * 1.5 ? i.ang + Math.PI / 2 : i.ang; // circling: nose along the orbit
      ctx.globalAlpha = 1; ctx.fillStyle = COL.blue; ctx.beginPath();
      ctx.moveTo(i.x + Math.cos(a) * CAR_DART, i.y + Math.sin(a) * CAR_DART);
      ctx.lineTo(i.x + Math.cos(a + 2.5) * CAR_DART * 0.7, i.y + Math.sin(a + 2.5) * CAR_DART * 0.7);
      ctx.lineTo(i.x + Math.cos(a - 2.5) * CAR_DART * 0.7, i.y + Math.sin(a - 2.5) * CAR_DART * 0.7);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = COL.blue; ctx.lineCap = "round"; ctx.lineWidth = CAR_PELLET_PX;
    for (const p of t.carPellets || []) { ctx.beginPath(); ctx.moveTo(p.x - p.vx * CAR_PELLET_TAIL, p.y - p.vy * CAR_PELLET_TAIL); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}
