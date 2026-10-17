// /spire - CAR, the CARRIER (owner's design, 2026-10-15 - a StarCraft carrier, electric blue): strong against fast + shield,
// weak to swarm + armor, LONG reach. It never fires itself: it launches INTERCEPTORS, ONE BY ONE, each to its own enemy in
// range; an interceptor flies out, circles its target firing `ammo` small shots (retargeting when it dies), flies HOME and
// reloads, then goes again. Fast enemies cannot outrun them; every small shot pops a shield charge - the shield answer; one
// target an interceptor and small hits are why swarm and armor beat it. Hangar: prime counts from 5. Launch: reach and
// speed (WARP, VI: they teleport out and home). Armament: harder, faster shots, more of them (AUTOPILOT, VI: out of ammo, an
// interceptor bursts into pellets that can miss, and is rebuilt at home). Loaded after aspira-grv.js (the simulator too);
// towerStats calls carSkillStats, the tower loop stepCar, drawScene drawCar.

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const CAR_HANGAR = [3, 5, 7, 11, 11, 13]; // interceptors: PRIMES by purchase (owner: "prime numbers starting at 5") - bare 5, then I 7 (stop 1), II 11 (3), III 13 (5), IV 17 (6)
// each axis ITS OWN job (owner, 2026-10-15: "make sure each axis for each tower feels unique"): Hangar WIDTH (more interceptors),
// Launch TEMPO (faster there and back, a shorter reload ) - (Warp, a teleport, was removed: owner, 2026-10-17), Armament DEPTH (a far harder hit, more of them)
const CAR_SPEED_V = 1470, CAR_RELOAD_S = 0.4; // an interceptor's speed and its reload at home - FIXED since Tether replaced Launch (owner, 2026-10-17)
const CAR_AMMO = [4, 5, 5, 6, 6, 14]; /* halved, its bolts doubled into fewer, bigger VOLLEYS (CAR_VOLLEY_K, CAR_BOLTS) */ // Armament: volleys a sortie (owner, 2026-10-15: "reduce ammo"; was 12 .. 28)
// ONE TARGET A VOLLEY (owner, 2026-10-16: "to make ATC worse vs swarms reduce ammo (number of volleys), increase bolts per volley to
// match, then make it so that all bolts from a single volley need to target a single target, regardless of overkill, remaining bolts
// just keep going for a little bit and may chance a hit on something else"; then "don't shoot unshot parts of a volley if the enemy dies" - the rest of
// the volley waits for the next target): half the volleys, each CAR_VOLLEY_K x the hit in twice
// the bolts at half the rate - the same stream and damage a sortie - and a volley's bolts all go at the enemy it began on; one that
// died mid-volley is fired at anyway, the bolts flying on past it (stepCarBolts)
const CAR_VOLLEY_K = 2;
// the shot's HIT is SPREAD across the axes like ARC's (owner, 2026-10-15: "spread out armament damage like arc"): Armament half of
// it (log), Hangar and Launch a quarter each (CAR_SIDE_DMG). STEEPER than ARC's: on ARC's tables a mid build (III on every
// axis) dealt 2192/s on fast at wave 61, ARC 17449, SOL 22899 - ARC chains, and an interceptor spends ~40% flying and reloading
const CAR_SHOT_MUL = [0.6, 2, 4.5, 7.5, 145.7, 283.8]; /* V x9, VI x36 (steeper late tiers) */ // Armament (VI 15)
const CAR_SIDE_DMG = [1, 1.6, 2.4, 3.4, 11.31, 19.22]; /* V x3, VI x6 (steeper late tiers) */ // Hangar's and Launch's share (VI 5.1)
const CAR_RATE_MUL = [1, 1, 1, 1, 1, 1]; // (Armament's rate went into the hit: one lever an axis)
// TETHER (owner, 2026-10-17: "replace Launch with Tether"): once an interceptor fires at an enemy a BEAM joins them while it keeps at it;
// it SLOWS that enemy (the old Pin, which needs Tether now, and harder) and PULSES every CAR_TETHER_PULSE s for CAR_TETHER_K x the shot,
// a real hit that pops a shield charge; both grow with the tier. Capstone (Chain): the beam runs on to the nearest other enemy within
// the interceptor's circling range of its target, slowing and pulsing it too. Index 0 = untaken; capstone.js pushes VI
const CAR_TETHER_SLOW = [0, 0.45, 0.5, 0.55, 0.6, 0.65], CAR_TETHER_K = [0, 2, 3, 4, 12, 24] /* V 6 -> 24 (x4), VI 10 -> 40: Tether as impactful as Launch was (countermx 61-69 launch V: 32/47/39/55 -> 12/12/7/0 % leaked swarm/fast/shield/armor; 2026-10-17) */, CAR_TETHER_PULSE = 0.5, CAR_TETHER_ST = { noFx: true };
const CAR_SLOW = 0.2, CAR_SLOW_S = 0.6; // every bolt SLOWS (owner, 2026-10-15: "make interceptors slow") - one slow a tower, refreshed
const CAR_BOLT_PAIR = 2, CAR_BOLT_SIDE = 6; /* bolts a time and the u between them (owner, 2026-10-16: "for each interceptor volley, shoot 2 at a time instead of one, halve fire rate, round up to nearest number of bolts") */
const CAR_BOLTS = Math.ceil(10 / CAR_BOLT_PAIR) * CAR_BOLT_PAIR; /* 5 -> 10 with the volleys halved (2026-10-16); a whole number of pairs */ /* 4 -> 5 with the trio-scale x1.33 hit (2026-10-16: armor leak 8% -> 16%) */ /* 3 -> 4 (owner, 2026-10-16: "if armor is still strong, split interceptor shots into even more pellets per shot"; countermx 61-69 spread armor leak 3 bolts 9%, 4 17%, 5 37%) */ // bolts a shot, each 1/CAR_BOLTS of the hit
const CAR_GAP = 0.15; /* 0.11 -> 0.15 with the reload x0.5 (owner, 2026-10-16: "reduce launch rate of interceptors, but reduce reload time to compensate"; countermx 61-69 spread 30/2/0/21 -> 25/0/0/15 - at 0.25 no reload made up for it: 70% of swarms leaked) */ /* x1/1.75 (owner, 2026-10-16: "interceptor spawn speed"; was 0.2) */ // s between launches (owner: "one by one")
// Hangar's FOCUS FIRE (owner, 2026-10-15): every OTHER interceptor looping the same target adds this share to each shot on it -
// width turns into depth when the wing outnumbers the targets (they spread first: carTarget prefers an unheld enemy)
const CAR_FOCUS = [0, 0.15, 0.15, 0.3, 0.3, 0.45];
// (Launch's STRAFING PASS - a ram on arrival - was removed: owner, 2026-10-17, "I dont like the strafe idea")
// THE FLIGHT (owner, 2026-10-16: "a much smoother almost elliptical path, with a circle going around the enemy (stay about 100u
// away)"): a heading that turns at a capped rate, steered by a guidance field that spirals onto a CAR_ORBIT circle round the
// target - out at its Launch speed, easing to CAR_ORBIT_V on the circle, a wide turn out of it and home (was a 30u loop at 5 rad/s
// with straight legs and corners)
const CAR_ORBIT = 75 /* x0.5 (owner, 2026-10-16: "reduce enemy orbit distance to 0.5 of what it is now"; was 150, before that 100) */, CAR_ORBIT_V = 400; // a loop is 2 pi 75 / 400 = 1.18 s
// ORBIT JITTER (owner, 2026-10-16: "add orbit jitter to the interceptors, like 20%"): each interceptor's circle breathes +-20%
// on a slow wave of its own (a random phase and pace a sortie), so a wing's loops never stack into one ring
const CAR_ORBIT_JIT = 0.2, CAR_JIT_W = [1.2, 2.6]; // the radius's swing; its pace in rad/s, low .. high
const carR = i => CAR_ORBIT * (1 + CAR_ORBIT_JIT * Math.sin(i.jp || 0));
const CAR_TURN_R = 50; // the tightest turn, in u: turn rate = speed / this (twice the circle's, so the circle can be held)
const CAR_LEASH = 7.4; /* ~1180 at range 160 (as simmed 2026-10-16) */ /* the 960 chase at range 130 (owner, 2026-10-16: "Interceptor range should still be huge") */ /* 4: a 960 chase at range 240 (2026-10-16: 780, 960 and 1200 all leaked the same - the chase is not what binds) */ /* the same 780 chase at range 330 (2026-10-16) */ /* 3 at range 260: the same 780 chase now the range is 460 (2026-10-16) */ // a target further than this x the reach from the carrier is let go - the one tower that PURSUES (was 1.2: fast
// enemies left reach mid-sortie and ATC, built against fast, leaked them worst - counter matrix 2026-10-15)
const CAR_BURST_N = 10, CAR_BURST_K = 1.5, CAR_PELLET_V = 340, CAR_PELLET_REACH = 90, CAR_PELLET_HIT = 3; // Autopilot's pellets

SKILL_TREES.car = [
  { id: "hangar", name: "Hangar", tiers: [{ name: "Bay" }, { name: "Deck" }, { name: "Hold" }, { name: "Wing" }, { name: "Fleet" }] },
  { id: "launch" /* id kept (saves); shown as TETHER */, name: "Tether", tiers: [{ name: "Leash" }, { name: "Line" }, { name: "Rope" }, { name: "Cable" }, { name: "Tow" }] },
  { id: "armament", name: "Armament", tiers: [{ name: "Pulse" }, { name: "Burst" }, { name: "Strafe" }, { name: "Barrage" }, { name: "Salvo" }] },
];
SKILL_MOVE.car = { hangar: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], launch: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], armament: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]] };

// how much of the wing the Hangar can STORE in orbit, by tier (owner, 2026-10-16: "hanger tiers can store 25% 50% 75% 100% of interceptors
// in orbit"); s.hold = that many interceptors (rounded up), 0 untaken
const CAR_HOLD_FRAC = [0, 0.25, 0.5, 0.75, 1, 1, 1];
const carHoldFrac = h => CAR_HOLD_FRAC[Math.min(h, CAR_HOLD_FRAC.length - 1)];
function carSkillStats(t, s, b) {
  const h = skillOf(t, "hangar"), l = skillOf(t, "launch"), a = skillOf(t, "armament");
  s.range = b.range * RANGE_BONUS; s.rate = b.rate * CAR_RATE_MUL[a]; s.dmg = b.dmg * CAR_SHOT_MUL[a] * CAR_SIDE_DMG[h]; s.targets = 1;
  s.wing = CAR_HANGAR[h]; s.speed = CAR_SPEED_V; s.reload = CAR_RELOAD_S; s.tSlow = CAR_TETHER_SLOW[l]; s.tK = CAR_TETHER_K[l]; s.tChain = l >= CAPSTONE_TIER; s.focus = CAR_FOCUS[h]; s.ammo = CAR_AMMO[a]; s.autopilot = a >= CAPSTONE_TIER; s.hold = Math.ceil(carHoldFrac(h) * CAR_HANGAR[h]); s.skill = true;
}

// an interceptor: home (reloading), out (to its target, then circling it, firing), back (home)
function carWing(t, st) {
  t.icp ||= [];
  while (t.icp.length < st.wing) t.icp.push({ x: t.x, y: t.y, state: "home", reload: 0, ammo: 0, e: null, cd: 0, ang: Math.random() * 6.283, oj: Math.random() * 2 - 1 });
  if (t.icp.length > st.wing) t.icp.length = st.wing;
}
const carDist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
// a target for an interceptor: SEND ENOUGH - the first enemy in reach (pickTargets: the tower's targeting) whose HP is more than
// the damage already committed to it (the ammo x hit of the interceptors on it), else the first in reach. A tough enemy draws
// several (and their FOCUS FIRE); a weak one, one (2026-10-15: one interceptor an enemy let single-file fast waves through)
// the tower's RANGE only LAUNCHES (owner, 2026-10-16: "interceptor range should be huge, the tower range is just for launching"): an
// enemy inside it sends the wing out, and each interceptor then takes its own target from everything within the interceptors'
// reach (CAR_LEASH x the range, 960), in the tower's targeting order - a fast enemy further out is met early (diagnosis 2026-10-16:
// every ATC trio bled fast enemies once the range was 130)
// LAUNCHES only at what is IN RANGE (owner, 2026-10-16: "ATC should only launch when something comes into range, but the
// interceptors themselves can keep the range"): the wing's first target is inside the tower's range; once out, an interceptor
// hops on to anything within its reach (carHop, CAR_LEASH) - an in-range enemy already covered launches nothing more
function carTarget(t, st) {
  const sent = new Map(), cand = pickTargets(t, st, st.wing);
  if (!cand.length) return null;
  for (const i of t.icp) if (i.e && !i.e.dead && i.state === "out") sent.set(i.e.id, (sent.get(i.e.id) || 0) + i.ammo * st.dmg * CAR_VOLLEY_K); /* a volley is CAR_VOLLEY_K hits (it was counted as one since the volleys came in: an enemy looked half-covered and drew more interceptors than it needed) */
  return cand.find(e => e.hp + (e.shield || 0) * st.dmg / 2 > (sent.get(e.id) || 0)) || null;
}
// A WAIT CUT SHORT (owner, 2026-10-16: "if a wave is spawned from the previous wave being completely cleared, ATC should spawn
// interceptors (rounded down) based on the time that was cut short"): the cut seconds / the reload, rounded down, of the
// interceptors still reloading at home are made ready at once - the ones nearest ready first
function carCutShort(cut) {
  for (const t of G.towers) {
    if (t.kind !== "car" || !t.icp) continue;
    const st = towerStats(t);
    let k = Math.floor(cut / Math.max(0.01, st.reload));
    for (const i of t.icp.filter(o => o.state === "home" && o.reload > 0).sort((a, b) => a.reload - b.reload)) { if (k-- <= 0) break; i.reload = 0; }
  }
}
function stepCar(t, dt) {
  const st = towerStats(t);
  carWing(t, st);
  stepCarPellets(t, dt); stepCarBolts(t, st, dt); carObstacles(t);
  t.launchCd = Math.max(0, (t.launchCd || 0) - dt);
  for (const i of t.icp) stepIcp(i, t, st, dt);
}
// a SALVO: interceptors sent at once, then CAR_GAP - one more per Hangar level (owner, 2026-10-17: "each level of hangar should increase the
// number of interceptors deployed at once"), times the relay's RELAY_MUL
const carSalvo = t => (1 + skillOf(t, "hangar")) * relayMul(t);
function stepIcp(i, t, st, dt) {
  if (i.state === "home") {
    i.reload = Math.max(0, i.reload - dt);
    const held = st.hold > 0 && i.reload <= 0 && (i.hold || t.icp.reduce((n, o) => n + (o.hold ? 1 : 0), 0) < st.hold); // HELD: charged and orbiting the carrier, while the Hangar has room (st.hold of them)
    if (held) carHoldOrbit(i, t, dt); else { i.x = t.x; i.y = t.y; i.ho = undefined; }
    i.hold = held;
    if (i.reload > 0 || t.launchCd > 0) return; // held or not, ONE BY ONE on CAR_GAP (owner, 2026-10-16: "carrier should not spawn all waiting interceptors at once ... just that unused interceptors can be stored in orbit")
    const e = carTarget(t, st);
    if (!e) return;
    const fx = held ? i.x : t.x, fy = held ? i.y : t.y;
    i.e = e; i.ammo = st.ammo; i.bk = 0; i.state = "out"; i.cd = 0; i.orb = false; i.hold = false; i.ho = undefined; t.launchN = (t.launchN || 0) + 1; if (t.launchN >= carSalvo(t)) { t.launchN = 0; t.launchCd = CAR_GAP; } sfx("car"); /* RELAYED: RELAY_MUL leave per CAR_GAP slot, not one (owner, 2026-10-17: "orbital relay should also launch 3 interceptors at a time instead of just 1") */
    i.v = st.speed; i.ang = held ? i.ang : Math.atan2(e.y - fy, e.x - fx); i.jp = Math.random() * 6.283; i.jw = CAR_JIT_W[0] + Math.random() * (CAR_JIT_W[1] - CAR_JIT_W[0]); // (held: out along its orbit, turning in)
    for (let k = 0; k < 4 && !held; k++) { const [ax, ay] = carAvoid(i, e.x - fx, e.y - fy, 1); i.ang = Math.atan2(ay, ax); } // leaves already bent round the core (a carrier by it has no room to turn)
    return;
  }
  if (i.state === "out") {
    // the CLOTHESPIN (owner, 2026-10-15): straight out, loops its target firing until out of ammo, straight home. A target that
    // dies hands the loop to an enemy within CAR_HOP of the interceptor, else it goes home (ATC's swarm weakness: free to chain
    // kill to kill across reach it leaked 1% of swarms; one target a sortie, 85% - and 66% of fast, its own type)
    if (!i.e || i.e.dead || carDist2(i.e, t) > (st.range * CAR_LEASH) ** 2) { i.e = carHop(i.e || i, t, st); i.orb = false; if (!i.e) { carHome(i, t, st); return; } }
    const e = i.e, d = Math.sqrt(carDist2(i, e));
    carOrbit(i, e, st, d, dt);
    if (!i.orb && d > carR(i) * 1.3 && d > CAR_FIRE_R) return; // still on its way - but FIRING once within CAR_FIRE_R, before it is round its target (a fast enemy outran its chaser: 12 of 37 leakers were picked and never shot at, probe 2026-10-16)
    if (!i.orb && d <= carR(i) * 1.3) i.orb = true; // onto the circle round its target
    i.cd -= dt;
    while (i.cd <= 0 && i.ammo > 0) { // the stream: a volley's bolts spread over its interval
      if (!i.bk || !i.ve || i.ve.dead) { if (e.dead) break; if (!i.bk) sfx("carshot"); i.ve = e; } // a volley starts only on a LIVE target - and its target dying STOPS it: the unshot bolts go at the next one (owner, 2026-10-16: "just don't shoot unshot parts of a volley if the enemy dies")
      i.cd += CAR_VOLLEY_K * CAR_BOLT_PAIR / (st.rate * CAR_BOLTS); // ...its bolts at that one, CAR_BOLT_PAIR at a time, side by side
      for (let k = 0; k < CAR_BOLT_PAIR && i.bk < CAR_BOLTS; k++, i.bk++) carBolt(i, i.ve, t, st, (k - (CAR_BOLT_PAIR - 1) / 2) * CAR_BOLT_SIDE);
      if (i.bk >= CAR_BOLTS) { i.bk = 0; i.ammo--; }
    }
    if (st.tSlow > 0 && i.ve && !i.ve.dead) carTether(i, t, st, dt); else i.tc = null; // the TETHER, once it has fired at its target
    if (i.ammo <= 0) {
      if (st.autopilot) { carBurst(i, t, st); i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; i.e = null; return; } // rebuilt at home
      carHome(i, t, st);
    }
    return;
  }
  // back home
  const d = Math.sqrt(carDist2(i, t));
  if (d <= Math.max(i.v, 1) * dt * 1.5) { i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; i.e = null; return; }
  carSteer(i, t.x - i.x, t.y - i.y, st.speed, dt, Math.max(0, Math.min(1, (d - 39) / 78))); /* (78: the old SLOT_R - the last approach home, not the slots' distance) */ // the avoidance lets go on the last approach home
}
// the TETHER's work a frame (see CAR_TETHER_SLOW): slow its target (and the capstone's chained one), pulse both every CAR_TETHER_PULSE s
function carTether(i, t, st, dt) {
  const e = i.ve, r2 = (CAR_ORBIT * 1.2) ** 2;
  if (st.tChain && (!i.tc || i.tc.dead || i.tc === e || carDist2(i.tc, e) > r2)) { i.tc = null; let bd = r2; for (const o of G.enemies) { if (o.dead || o === e) continue; const d = carDist2(o, e); if (d < bd) { bd = d; i.tc = o; } } }
  applySlow(e, st.tSlow, 0.15, "tether:" + t.id); if (i.tc) applySlow(i.tc, st.tSlow, 0.15, "tether:" + t.id); // (doubled on fast, never the shielded - applySlow)
  i.tp = (i.tp || 0) + dt;
  if (i.tp < CAR_TETHER_PULSE) return;
  i.tp -= CAR_TETHER_PULSE; i.tf = 1; // (the beam's flash - drawCar)
  for (const o of [e, i.tc]) if (o && !o.dead) { damage(o, st.dmg * st.tK, t, false, false, CAR_TETHER_ST); onHit(o, t, st, st.dmg * st.tK); }
}
// THE HOLD (owner, 2026-10-16: "hangar upgrades should allow the atc tower to have charged interceptors orbit it (with orbit distance
// jitter) when idle, so that they can be released at once"): with any Hangar, an interceptor reloaded and given nothing to hit
// circles its carrier CAR_HOLD_R out (+- CAR_HOLD_JIT by its own oj, -1..1), easing onto it - STORED there, it still leaves one by one
// on CAR_GAP when a target comes (owner: "just that unused interceptors can be stored in orbit"), from where it circles. Its SIZE goes with the same oj ("smaller interceptors fly closer": carDart)
const CAR_HOLD_R = 80 /* 48 -> 80 (owner, 2026-10-16: "circling interceptors should circle further away from tower") */, CAR_HOLD_JIT = 0.25, CAR_HOLD_V = 110, CAR_SIZE_JIT = 0.15; // u; +-; u/s round the carrier; +- size
function carHoldOrbit(i, t, dt) {
  i.oj ??= Math.random() * 2 - 1;
  const R = CAR_HOLD_R * (1 + CAR_HOLD_JIT * i.oj);
  if (i.ho === undefined) { i.ho = Math.atan2(i.y - t.y, i.x - t.x) || Math.random() * 6.283; i.htx = t.x; i.hty = t.y; }
  i.x += t.x - i.htx; i.y += t.y - i.hty; i.htx = t.x; i.hty = t.y; // CARRIED with its carrier, as if fixed to it - a quick drag never pulls it through the tower (owner, 2026-10-16: "have the circling interceptors move as if physically connected to the tower")
  i.ho += CAR_HOLD_V / R * dt;
  const px = t.x + Math.cos(i.ho) * R, py = t.y + Math.sin(i.ho) * R, k = Math.min(1, dt * 6);
  i.x += (px - i.x) * k; i.y += (py - i.y) * k; i.ang = i.ho + Math.PI / 2; // nose along the orbit, counter-clockwise
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
const CAR_FIRE_R = 200; // u: an interceptor on its way fires once its target is this close (2026-10-16, countermx 61-69 spread swarm/fast/shield/armor with CAR_HOP 30: 0 39/13/0/18, 200 19/5/0/23; 150 20/8/0/20)
const CAR_BOLT_ON = 0.08; // s a bolt flies on past a dead target (~70u)
const CAR_BOLT_V = 900, CAR_BOLT_REACH = 390 /* x1.5 with the orbit (was 260) */, CAR_BOLT_HIT = 3; // u/s; u flown before it fades; u added to the enemy's size
function carBolt(i, e, t, st, side = 0) { // side: u across its flight, left or right of the interceptor (a pair)
  let n = 0;
  if (st.focus) for (const o of t.icp) if (o !== i && o.e === e && o.orb && o.state === "out") n++; // FOCUS FIRE: the others on it
  const a = Math.atan2(e.y - i.y, e.x - i.x);
  (t.carBolts ||= []).push({ x: i.x - Math.sin(a) * side, y: i.y + Math.cos(a) * side, e, vx: Math.cos(a) * CAR_BOLT_V, vy: Math.sin(a) * CAR_BOLT_V, left: CAR_BOLT_REACH / CAR_BOLT_V, dmg: st.dmg * CAR_VOLLEY_K * (1 + st.focus * n) / CAR_BOLTS, icp: i });
}
const CAR_ONE = [null];
function stepCarBolts(t, st, dt) {
  if (!t.carBolts || !t.carBolts.length) return;
  const g = projGrid();
  for (const b of t.carBolts) {
    if (b.e && b.e.dead) { b.e = null; b.left = Math.min(b.left, CAR_BOLT_ON); } // its target gone: straight on, only a little way (owner: "remaining bolts just keep going for a little bit" - the full reach let a volley's overkill land on the rest of a swarm)
    if (b.e) { const dx = b.e.x - b.x, dy = b.e.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * CAR_BOLT_V; b.vy = dy / d * CAR_BOLT_V; } // homing
    b.x += b.vx * dt; b.y += b.vy * dt; b.left -= dt;
    if (b.e) CAR_ONE[0] = b.e;
    for (const e of b.e ? CAR_ONE : enemiesNear(b.x, b.y, g)) { // (enemiesNear: the enemy grid, aspira-grv.js; CAR_ONE: its target, in a reused array)
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + CAR_BOLT_HIT;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      const hp0 = e.hp; damage(e, b.dmg, t, false, false, CAR_NO_NUM); onHit(e, t, st, b.dmg);
      carNum(b.icp, e, hp0 - e.hp, b.dmg, b.vx, b.vy);
      if (!e.dead) applySlow(e, CAR_SLOW, CAR_SLOW_S, "car:" + t.id); // (doubled on fast, never the shielded - applySlow)
      b.left = 0; break;
    }
  }
  keepLive(t.carBolts);
}
// ONE NUMBER PER CAR_NUM_HITS HITS of an interceptor (owner, 2026-10-16: "Interceptor damage output, change to 1 number per two hits
// per interceptor"; a number a bolt before, a shot's total before that): its bolts' damage adds up on the interceptor and pops as one
// number on the second hit's enemy, flying on the way that bolt was going, greyed by how much armor took off the pair
const CAR_NUM_HITS = 3, CAR_NO_NUM = { noNum: true }; /* 2 -> 3, the strafing pass's hit summed in too (owner, 2026-10-16: "only show 1 number per 3 hits from each interceptor bolt / that number should be the sum, not a single hit") */
function carNum(i, e, dealt, raw0, vx, vy) {
  i.numSum = (i.numSum || 0) + Math.max(0, dealt); i.numRaw = (i.numRaw || 0) + raw0;
  i.numN = (i.numN || 0) + 1;
  if (i.numN < CAR_NUM_HITS) return;
  const sum = i.numSum, raw = i.numRaw; i.numSum = i.numRaw = i.numN = 0;
  if (sum > 0 && !(typeof farFx === "function" && farFx(e))) dmgTick(e, sum, raw, dmgInk("car"), { x: e.x - vx, y: e.y - vy }, raw > sum ? 1 - sum / raw : 0, 0);
}
const CAR_HOP = 30; /* back to 30 with CAR_FIRE_R 200 */ /* 30 -> 40 with a volley STOPPING when its target dies (2026-10-16, countermx 61-69 spread swarm/fast/shield/armor: 30 39/13/0/18, 40 19/14/0/21, 50 9/13/0/21, 80 2/9/0/21) */ /* 35 -> 30 with the x1.33 hit (swarm 15% -> 24%) */ /* 40 -> 35 with the 100u circle and the homing stream (2026-10-16, countermx 61-69 spread: 25 leaked 47% of swarms, 35 25%, 45 9%) */ // (90: ATC leaked 1% of swarms; 20: 68% swarms but 50% fast - counter matrix 61-69, 2026-10-15)
// the NEXT target after a kill: the nearest enemy within CAR_HOP that no other interceptor of this carrier is already on, else the
// nearest at all (owner, 2026-10-16: "each interceptor should be able to target a different fast with their respective volley")
function carHop(i, t, st) { // (i: where the last target was - the interceptor itself circles CAR_ORBIT out)
  const r2 = CAR_HOP * CAR_HOP;
  let best = null, bd = r2, any = null, ad = r2;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = carDist2(e, i);
    if (d >= r2) continue;
    if (t.icp && t.icp.some(o => o !== i && o.e === e && o.state === "out")) { if (d < ad) { ad = d; any = e; } }
    else if (d < bd) { bd = d; best = e; }
  }
  return best || any;
}
function carHome(i, t, st) { i.state = "back"; i.e = null; i.orb = false; i.v = Math.max(i.v || 0, CAR_ORBIT_V); }

// AUTOPILOT: out of ammo, the interceptor bursts into pellets - projectiles that hit the first enemy they touch, or miss
function carBurst(i, t, st) {
  for (let k = 0; k < CAR_BURST_N; k++) {
    const a = Math.random() * 6.283;
    (t.carPellets ||= []).push({ x: i.x, y: i.y, vx: Math.cos(a) * CAR_PELLET_V, vy: Math.sin(a) * CAR_PELLET_V, left: CAR_PELLET_REACH / CAR_PELLET_V, dmg: st.dmg * CAR_BURST_K });
  }
}
function stepCarPellets(t, dt) {
  if (!t.carPellets || !t.carPellets.length) return;
  const g = projGrid();
  for (const p of t.carPellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt;
    for (const e of enemiesNear(p.x, p.y, g)) {
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + CAR_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      const h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT; // on the pellet's way (HIT_AT, aspira-floats.js)
      try { damage(e, p.dmg, t); } finally { hitFrom = h0; } p.left = 0; break;
    }
  }
  keepLive(t.carPellets);
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
// THE TRAIL (owner, 2026-10-16: "add a super thin but long line along the paths travelled by interceptor"): each interceptor out of
// the carrier keeps its last CAR_TRAIL_N points, one every CAR_TRAIL_STEP u flown (drawn only - the simulator never draws), and a
// hairline runs back along them, fading out in CAR_TRAIL_BANDS steps; gone once it is back inside the carrier
const CAR_TRAIL_N = 60, CAR_TRAIL_STEP = 6, CAR_TRAIL_W = 0.8, CAR_TRAIL_A = 0.45, CAR_TRAIL_BANDS = 4;
function carTrails(t) {
  ctx.strokeStyle = COL.blue; ctx.lineWidth = CAR_TRAIL_W; ctx.lineJoin = "round"; ctx.lineCap = "round";
  // a DRAGGED carrier carries its held interceptors' trails with it (owner, 2026-10-16: "don't show atc interceptor streaks
  // caused by dragging"): the tower's move since the last draw shifts them whole, so only their own orbit draws
  const mx = t.x - (t.trX ?? t.x), my = t.y - (t.trY ?? t.y); t.trX = t.x; t.trY = t.y;
  for (const i of t.icp) {
    if (i.state === "home" && !i.hold) { i.trail = null; continue; }
    if ((mx || my) && i.state === "home" && i.trail) for (let k = 0; k < i.trail.length; k += 2) { i.trail[k] += mx; i.trail[k + 1] += my; }
    const tr = i.trail ||= [i.x, i.y], n = tr.length;
    if ((tr[n - 2] - i.x) ** 2 + (tr[n - 1] - i.y) ** 2 >= CAR_TRAIL_STEP * CAR_TRAIL_STEP) { tr.push(i.x, i.y); if (tr.length > CAR_TRAIL_N * 2) tr.splice(0, 2); }
  }
  for (let b = 0; b < CAR_TRAIL_BANDS; b++) { // band b: the b-th quarter from the interceptor back, each fainter - one stroke a band for every trail
    ctx.globalAlpha = CAR_TRAIL_A * (1 - b / CAR_TRAIL_BANDS); ctx.beginPath();
    for (const i of t.icp) {
      const tr = i.trail; if (!tr || tr.length < 4) continue;
      const m = tr.length / 2, hi = Math.round(m * (1 - b / CAR_TRAIL_BANDS)), lo = Math.round(m * (1 - (b + 1) / CAR_TRAIL_BANDS));
      if (b === 0) ctx.moveTo(i.x, i.y); else ctx.moveTo(tr[(hi - 1) * 2], tr[(hi - 1) * 2 + 1]);
      for (let k = hi - 1; k >= Math.max(0, lo - 1); k--) ctx.lineTo(tr[k * 2], tr[k * 2 + 1]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawCar(darts) {
  for (const t of G.towers) {
    if (t.kind !== "car" || !t.icp) continue;
    if (darts) {
      carTrails(t);
      if (skillOf(t, "launch") > 0) { // the TETHER beams: interceptor -> target (-> the chained one), brighter on a pulse
        ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round";
        for (const i of t.icp) {
          if (i.state !== "out" || !i.ve || i.ve.dead) continue;
          i.tf = Math.max(0, (i.tf || 0) - 0.08); ctx.globalAlpha = 0.45 + 0.55 * i.tf; ctx.lineWidth = 1.2 + 1.8 * i.tf;
          ctx.beginPath(); ctx.moveTo(i.x, i.y); ctx.lineTo(i.ve.x, i.ve.y); if (i.tc && !i.tc.dead) ctx.lineTo(i.tc.x, i.tc.y); ctx.stroke();
        }
      }
      ctx.fillStyle = COL.blue; ctx.strokeStyle = COL.blue; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
      const z = CAR_DART_K0 + CAR_DART_GROW * skillOf(t, "armament");
      for (const i of t.icp) if (i.state !== "home" || i.hold) carDart(i, z * (1 + CAR_SIZE_JIT * (i.oj || 0))); // its own size: smaller ones hold closer
      continue;
    }
    ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round"; ctx.lineWidth = CAR_PELLET_PX; ctx.globalAlpha = 1;
    ctx.beginPath(); // bolts and pellets: ONE path, one stroke (perf)
    for (const b of t.carBolts || []) { // UNDER the darts: they leave from beneath. A DOT at the interceptor, stretching out as it flies (owner, 2026-10-16)
      const k = Math.min(CAR_BOLT_TAIL, (CAR_BOLT_REACH / CAR_BOLT_V - b.left) * CAR_BOLT_GROW);
      ctx.moveTo(b.x - b.vx * k, b.y - b.vy * k); ctx.lineTo(b.x, b.y);
    }
    for (const p of t.carPellets || []) { ctx.moveTo(p.x - p.vx * CAR_PELLET_TAIL, p.y - p.vy * CAR_PELLET_TAIL); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
