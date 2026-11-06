// /spire - CRR, the CARRIER (owner's design, 2026-10-15 - a StarCraft carrier, electric blue): strong against fast + shield,
// weak to swarm + armor, LONG reach. It never fires itself: it launches INTERCEPTORS, ONE BY ONE, each to its own enemy in
// range; an interceptor flies out, circles its target firing `ammo` small shots (retargeting when it dies), flies HOME and
// reloads, then goes again. Fast enemies cannot outrun them; every small shot pops a shield charge - the shield answer; one
// target an interceptor and small hits are why swarm and armor beat it. Hangar: prime counts from 5. Launch: reach and
// speed (WARP, VI: they teleport out and home). Armament: harder, faster shots, more of them (AUTOPILOT, VI: out of ammo, an
// interceptor bursts into pellets that can miss, and is rebuilt at home). Loaded after aspira-grv.js (the simulator too);
// towerStats calls carSkillStats, the tower loop stepCar, drawScene drawCar.

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const CRR_HANGAR = [10, 21, 25, 33] /* +1 from Hangar I (2026-11-06: CRR trios the lowest; screen 50 games vs 7.7.46 +4.0, CRR trios 6/16 -> 8/16; was 20 24 32, tier01 14, capstone 40) */ /* x2 (owner, 2026-11-04, on picked-but-unshot leakers: "that's a problem of needing more interceptors"); was 5 10 12 16 */ /* x0.6 with the stuck-interceptor fix (owner, 2026-11-04: "b"; was 8 16 20 26) */ /* more interceptors with the slower flight (owner, 2026-11-01: "I want interceptors to fly and orbit way slower / Add more interceptors to compensate?"); was 3 5 11 13 (V: the capstone 34, was 17) */; // interceptors by Hangar tier: the ladder 0..V reads 10 14 20 24 32 40 (tier 0 and I set in aspira-tier01.js, V in aspira-capstone.js; no longer primes since 2026-11-02)
// each axis ITS OWN job (owner, 2026-10-15: "make sure each axis for each tower feels unique"): Hangar WIDTH (more interceptors),
// Launch TEMPO (faster there and back, a shorter reload ) - (Warp, a teleport, was removed: owner, 2026-10-17), Armament DEPTH (a far harder hit, more of them)
const CRR_SPEED_V = 500 /* 500 flat, out and home (owner, 2026-11-02: "Lets go with 500 flat whole journey"; 300 was "slower than some fast units") */ /* 600 -> 300 (owner, 2026-11-01: "I want interceptors to fly and orbit way slower / Add more interceptors to compensate?") */ /* 2500 -> 600 (owner, 2026-11-01: "Interceptor flight speed should be reduced to 600") */ /* 1900 -> 2500 (owner, 2026-10-19: CRR toward fast; countermx 61-69 spread with the rest of 6.4: fast 34% -> 22% leaked) */ /* x1.3: keeps up with fast (owner, 2026-10-18: "more good vs fast and less good vs shield"; was 1470) */, CRR_RELOAD_S = 0.8 /* x2 with x1.5 volleys, x1.1 hit (owner, 2026-10-24 marks target: "Lower interceptor reload speed, but increase volleys/damage to make it worse vs swarm"; was 0.4) */; // an interceptor's ONE speed (out, chasing, home) and its full reload at home (partial: x the share of ammo used, carHome) - FIXED since Tether replaced Launch (owner, 2026-10-17)
const CRR_AMMO = [8, 16, 24, 30, 30, 30] /* x2, at most 30 (owner, 2026-11-05: "I just wanted CRRs interceptors to circle the enemy and fire for longer" / "whatever minimizes impact to balance"; with CRR_BOLT_K: marks 9 pts 101-119, CRR leak 5/8/0/61 -> 10/8/0/64, its row and the distance held; was 4 8 12 16 18 24) */ /* mid tiers 6/9/13 -> 8/12/16 (owner, 2026-11-02: "Yes") */ /* volleys a sortie, never above 30 (owner, 2026-11-01: the owner's table; "volleys per sortie should never go above 30") */ /* x3 AT A THIRD THE BOLT (owner, 2026-10-29: "just 3x? keep the way shields are counted" - 3x the fire rate and the ammo, each bolt 1/3 the damage: a sortie is as long and does as much, pops 3x the charges; was 6 9 9 21) */ /* TIER 0 SIX VOLLEYS A SORTIE (owner, 2026-10-28: "interceptor should start with 6 ammo"; tier I 8 by tierMid, Armament II+ 9; was 9) */ /* (a x1.5 with the bolt at x2/3 was tried and backed out, 2026-10-27 - aspira-defs.js) */ /* x1.5 (2026-10-24 marks target; was 6 6 6 14) */ /* BATTERY 6.7.0 (2026-10-20): untaken 4 -> 6 - a lone L1 CRR lost 5-7 on the fast and shield waves */; /* doubled back (2026-10-19, CRR toward fast: more sorties keep up with a fast wave) */ /* HALVED again, each volley x2 (CRR_VOLLEY_K 4): the same damage in half the hits - half the shield pops (owner, 2026-10-18: CRR less good vs shield) */ /* halved, its bolts doubled into fewer, bigger VOLLEYS (CRR_VOLLEY_K, CRR_BOLTS) */ // Armament: volleys a sortie (owner, 2026-10-15: "reduce ammo"; was 12 .. 28)
// ONE TARGET A VOLLEY (owner, 2026-10-16: "to make ATC worse vs swarms reduce ammo (number of volleys), increase bolts per volley to
// match, then make it so that all bolts from a single volley need to target a single target, regardless of overkill, remaining bolts
// just keep going for a little bit and may chance a hit on something else"; then "don't shoot unshot parts of a volley if the enemy dies" - the rest of
// the volley waits for the next target): half the volleys, each CRR_VOLLEY_K x the hit in twice
// the bolts at half the rate - the same stream and damage a sortie - and a volley's bolts all go at the enemy it began on; one that
// died mid-volley is fired at anyway, the bolts flying on past it (stepCarBolts)
// every bolt x CRR_BOLT_K with the doubled ammo (7.7.3): the longer sorties at the strength they had
const CRR_BOLT_K = 0.7;
const CRR_VOLLEY_K = 4; /* 2 -> 4 with CRR_AMMO halved (2026-10-18) */
// the shot's HIT is SPREAD across the axes like ARC's (owner, 2026-10-15: "spread out armament damage like arc"): Armament half of
// it (log), Hangar and Launch a quarter each (CRR_SIDE_DMG). STEEPER than ARC's: on ARC's tables a mid build (III on every
// axis) dealt 2192/s on fast at wave 61, ARC 17449, SOL 22899 - ARC chains, and an interceptor spends ~40% flying and reloading
// (CRR_SHOT_MUL and CRR_SIDE_DMG - Armament's and the side axes' raw hit - GONE with the tier redesign, 2026-10-24: the stat curve's)
// TETHER (owner, 2026-10-17: "replace Launch with Tether"): once an interceptor fires at an enemy a BEAM joins them while it keeps at it;
// it SLOWS that enemy and MARKS it to take CRR_TETHER_AMP more damage from every tower - EACH TETHER its own slow and mark, so they
// stack (owner, 2026-10-26: "Each tether should add it's own slow, remove damage from the tether"; the pulse that hit for CRR_TETHER_K0
// x the shot is gone). Capstone (Chain): the beam runs on to the nearest other enemy within the interceptor's circling range of its
// target, slowing and marking it too. Index 0 = untaken; capstone.js pushes VI
const CRR_TETHER_SLOW = [0.175 /* (index 0 is rewritten by aspira-tier01.js: Tether 0 none, I 0.175) */ /* x0.5, EACH TETHER A MODEST SLOW so several on one target add up (owner, 2026-11-04: "for tether, also, reduce the slow, so that it matters to have multiple interceptors on a target"; was 0.35 0.45 0.55 0.65) */ /* every CRR tethers a little (owner, 2026-10-18: CRR better vs fast) */, 0.225, 0.275, 0.325], CRR_TETHER_PULSE = 0.5 /* the beam's flash only */;
const CRR_TETHER_AMP = [0, 0.1, 0.15, 0.2, 0.25, 0.3]; // + damage taken a tether, by Tether tier 0..V (written whole) - a first guess, the battery fits it
// (CRR_SLOW / CRR_SLOW_S - every bolt slowed 20% for 0.6 s, 2026-10-15 - GONE: owner, 2026-11-04 "remove bolt slow")
const CRR_BOLT_SIDE = 6; /* the u between bolts side by side in a volley (was CRR_BOLT_PAIR 2 with it, the pair stream; a volley is now its bolts at once) (owner, 2026-10-16: "for each interceptor volley, shoot 2 at a time instead of one, halve fire rate, round up to nearest number of bolts") */
// BOLTS A VOLLEY by Armament tier 0..V (tier redesign, owner 2026-10-24: tier 0 "one interceptor", Armament I "shots split in two"): one bolt, then
// two, then one more a tier - each bolt the tower's damage (2026-10-26)
// ONE BOLT A VOLLEY, CARRYING THE VOLLEY'S DAMAGE, AND THE TETHER x3 (owner, 2026-11-05, picked "C10" for CRR's marks gap: swarm 0 / armor -2
// vs its -2 / -1 targets): CRR_BOLTS_BY is now each bolt's damage x (the bolts a volley fired at once till 7.7.x - "My intent with volleys
// was to describe the number of bolts fired at once", owner 2026-11-01), every volley ONE bolt; the tether slow x CRR_TETHER_K, at most
// CRR_TETHER_MAX. Marks (9 pts, waves 101-119, 2 seeds): CRR leak 22/6/0/65 -> 20/2/0/37, row 0 +1 +1 -2 -> -1 +1 +1 -1, distance 16 -> 14
const CRR_TETHER_K = 3, CRR_TETHER_MAX = 0.9, crrTetherSlow = l => Math.min(CRR_TETHER_MAX, CRR_TETHER_SLOW[l] * CRR_TETHER_K);
const CRR_BOLTS_BY = [0.65, 1.3, 2, 3, 3, 3] /* now each bolt's damage x (2026-11-05, above); 0.65 / 1.3 at Armament 0 / I (was 1 / 2): the early gates (two untaken towers leak by 24 - owner 2026-10-29) - grv+crr and arc+crr had held wave 24 with C10, duos leaking 4/8 -> 7/8 (7.6.0 7/8); x0.8 left 5/8; I at 1.3 keeps each tier step <= 2x ("no level damage steps above 2x"); was 1 2 2 3 3 3 */ /* was */ /* bolts fired at ONCE, never above 3 (owner, 2026-11-01: "My intent with volleys was to describe the number of bolts fired at once ... It should not go above 3") */; // EVERY BOLT IS THE TOWER'S DAMAGE (td) - more bolts, more damage: Armament's mechanic (owner, 2026-10-26: "use a single bolt in a volley as the td" / "an axis can raise damage using a mechanic"); was 1 2 6 6 6 6 splitting one volley's damage
// interceptors that TETHER, by Tether tier 0..V: none at 0, Tether I "one tethered drone", then all of them
const CRR_TETHER_N = [0, 1, Infinity, Infinity, Infinity, Infinity];
// (Hangar's FOCUS FIRE - each wingmate on the same target +X% a shot - removed: owner, 2026-10-26, "Remove the increased damage from hangar")
// (Launch's STRAFING PASS - a ram on arrival - was removed: owner, 2026-10-17, "I dont like the strafe idea")
// THE FLIGHT (owner, 2026-10-16: "a much smoother almost elliptical path, with a circle going around the enemy (stay about 100u
// away)"): a heading that turns at a capped rate, steered by a guidance field that spirals onto a CRR_ORBIT circle round the
// target - out at its Launch speed, easing to CRR_ORBIT_V on the circle, a wide turn out of it and home (was a 30u loop at 5 rad/s
// with straight legs and corners)
const CRR_ORBIT = 75 /* x0.5 (owner, 2026-10-16: "reduce enemy orbit distance to 0.5 of what it is now"; was 150, before that 100) */, CRR_ORBIT_V = 200; /* 400 -> 200, the same ask */ // a loop is 2 pi 75 / 200 = 2.36 s
// ORBIT JITTER (owner, 2026-10-16: "add orbit jitter to the interceptors, like 20%"): each interceptor's circle breathes +-20%
// on a slow wave of its own (a random phase and pace a sortie), so a wing's loops never stack into one ring
const CRR_ORBIT_JIT = 0.2, CRR_JIT_W = [1.2, 2.6]; // the radius's swing; its pace in rad/s, low .. high
const carR = i => CRR_ORBIT * (1 + CRR_ORBIT_JIT * Math.sin(i.jp || 0));
const CRR_TURN_R = 50; // the tightest turn, in u: turn rate = speed / this (twice the circle's, so the circle can be held)
const CRR_LEASH = 7.4; /* ~1180 at range 160 (as simmed 2026-10-16) */ /* the 960 chase at range 130 (owner, 2026-10-16: "Interceptor range should still be huge") */ /* 4: a 960 chase at range 240 (2026-10-16: 780, 960 and 1200 all leaked the same - the chase is not what binds) */ /* the same 780 chase at range 330 (2026-10-16) */ /* 3 at range 260: the same 780 chase now the range is 460 (2026-10-16) */ // a target further than this x the reach from the carrier is let go - the one tower that PURSUES (was 1.2: fast
// enemies left reach mid-sortie and ATC, built against fast, leaked them worst - counter matrix 2026-10-15)
const CRR_BURST_N = 10, CRR_BURST_K = 1.125 /* x3 with the bolt at a third (2026-10-29): the pellet keeps its damage; was 0.375 */ /* x td: /4 when a bolt became td (2026-10-26; was 1.5 of the old st.dmg) */, CRR_PELLET_V = 340, CRR_PELLET_REACH = 90, CRR_PELLET_HIT = 3; // Autopilot's pellets

SKILL_TREES.crr = [
  { id: "hangar", name: "Hangar", tiers: [{ name: "Bay" }, { name: "Hold" }, { name: "Fleet" }] },
  { id: "launch" /* id kept (saves); shown as TETHER */, name: "Tether", tiers: [{ name: "Leash" }, { name: "Rope" }, { name: "Tow" }] },
  { id: "armament", name: "Armament", tiers: [{ name: "Pulse" }, { name: "Strafe" }, { name: "Salvo" }] },
];

// (CRR_HOLD_FRAC - the share of the wing the Hangar could STORE in orbit, 2026-10-16 - GONE 2026-11-04: s.hold is the whole wing at every tier)
const CRR_CHAIN_FROM = 2; /* today's I, tier II since the tier redesign (2026-10-24) */ // Tether runs on to one more enemy from tier II (owner, 2026-10-18, "from III" in the old numbering; was the capstone's alone)
function carSkillStats(t, s, b) {
  const h = skillOf(t, "hangar"), l = skillOf(t, "launch"), a = skillOf(t, "armament");
  curveBase(t, s, b); s.dmgCurve = s.dmg; s.rateCurve = s.rate; s.targets = 1; s.dmg *= CRR_BOLT_K; // the STAT CURVE (tier redesign 2026-10-24; was CRR_SHOT_MUL x CRR_SIDE_DMG)
  s.bolts = 1; s.dmg *= CRR_BOLTS_BY[a]; s.tetherN = CRR_TETHER_N[l];
  s.wing = CRR_HANGAR[h]; s.speed = CRR_SPEED_V; s.reload = CRR_RELOAD_S; s.tSlow = crrTetherSlow(l); s.tAmp = CRR_TETHER_AMP[l]; s.tChain = l >= CRR_CHAIN_FROM; s.ammo = CRR_AMMO[a]; s.autopilot = a >= CAPSTONE_TIER; s.hold = CRR_HANGAR[h]; /* EVERY ready interceptor waits in orbit round the carrier (owner, 2026-11-04: "make CRR ready interceptors wait in orbit around the tower / when launching interceptors, launch from orbit first, FIFO"); was CRR_HOLD_FRAC of the wing by Hangar tier */ s.skill = true;
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
// reach (CRR_LEASH x the range, 960), in the tower's targeting order - a fast enemy further out is met early (diagnosis 2026-10-16:
// every ATC trio bled fast enemies once the range was 130)
// LAUNCHES only at what is IN RANGE (owner, 2026-10-16: "ATC should only launch when something comes into range, but the
// interceptors themselves can keep the range"): the wing's first target is inside the tower's range; once out, an interceptor
// hops on to anything within its reach (carHop, CRR_LEASH) - an in-range enemy already covered launches nothing more
function carTarget(t, st) {
  const sent = new Map(), cand = pickTargets(t, st, st.wing);
  if (!cand.length) return null;
  for (const i of t.icp) if (i.e && !i.e.dead && i.state === "out") sent.set(i.e.id, (sent.get(i.e.id) || 0) + i.ammo * st.dmg * st.bolts); /* a bolt is td */ /* a volley is CRR_VOLLEY_K hits (it was counted as one since the volleys came in: an enemy looked half-covered and drew more interceptors than it needed) */
  // NO LOST SORTIE: never an enemy that reaches the core before the interceptor could reach it (its lane left / its pace, vs the flight
  // from the carrier at st.speed) - CRR's core-first order sent wings at enemies already slamming in (a picked-never-shot leaker was
  // picked with 0.02 s to go; Leader's call, 2026-11-04)
  const inTime = e => (PATHS[e.pi].len - e.s) / Math.max(1, effSpeed(e) * waveClock(e.n)) > Math.hypot(e.x - t.x, e.y - t.y) / Math.max(1, st.speed);
  return cand.find(e => inTime(e) && e.hp + (e.shield || 0) * st.dmg > (sent.get(e.id) || 0)) || null;
}
// A WAIT CUT SHORT (owner, 2026-10-16: "if a wave is spawned from the previous wave being completely cleared, ATC should spawn
// interceptors (rounded down) based on the time that was cut short"): the cut seconds / the reload, rounded down, of the
// interceptors still reloading at home are made ready at once - the ones nearest ready first
function carCutShort(cut) {
  for (const t of G.towers) {
    if (t.kind !== "crr" || !t.icp) continue;
    const st = towerStats(t);
    let k = Math.floor(cut / Math.max(0.01, st.reload));
    for (const i of t.icp.filter(o => o.state === "home" && o.reload > 0).sort((a, b) => a.reload - b.reload)) { if (k-- <= 0) break; i.reload = 0; }
  }
}
function stepCar(t, dt) {
  const st = towerStats(t);
  carWing(t, st);
  stepCarPellets(t, dt); stepCarBolts(t, st, dt); carObstacles(t);
  t.reloadCd = Math.max(0, (t.reloadCd || 0) - dt); if (t.readyQ) t.readyQ = t.readyQ.filter(o => o.state === "home" && t.icp.includes(o)); // ONE RELOAD FINISHES AT A TIME (CRR_RELOAD_GAP, below); (a wing that shrank, or one sent off, leaves the queue)
  // FIFO: the longest-held interceptor takes the first target (i.heldAt: the order it entered its orbit round the carrier)
  const order = t.icp.slice().sort((a, b) => (a.state === "home" && a.hold ? a.heldAt : Infinity) - (b.state === "home" && b.hold ? b.heldAt : Infinity));
  for (const i of order) stepIcp(i, t, st, dt);
}
// (the SALVO - carSalvoN at a time, then CRR_GAP - is gone: every ready interceptor launches at once, owner 2026-10-26: "Always launch as many
// interceptors as available")
// ONE OUT OF THE HANGAR AT A TIME (owner, 2026-11-05: "interceptors can launch all at once, but interceptors can only finish reloading one at
// a time, so the queue is from inside to orbit"): reloads run side by side inside the carrier, but at most one FINISHES each CRR_RELOAD_GAP s,
// in the order they came due (t.readyQ, FIFO); one done early waits inside till its turn. let: the balance lever ("the rate you can use as a
// lever for something, I'm thinking something minisacule like 0.05s")
let CRR_RELOAD_GAP = 0.05;
function stepIcp(i, t, st, dt) {
  if (i.state === "home") {
    i.reload = Math.max(0, i.reload - dt);
    if (i.reload <= 0 && !i.out) { // reloaded: in the queue out of the hangar (i.out: let out, till it launches)
      const q = (t.readyQ ||= []); if (!q.includes(i)) q.push(i);
      if (q[0] !== i || t.reloadCd > 0) { i.x = t.x; i.y = t.y; i.ho = undefined; i.hold = false; return; }
      q.shift(); i.out = true; t.reloadCd = CRR_RELOAD_GAP;
    }
    const held = st.hold > 0 && i.reload <= 0 && (i.hold || t.icp.reduce((n, o) => n + (o.hold ? 1 : 0), 0) < st.hold); // HELD: charged and orbiting the carrier, while the Hangar has room (st.hold of them)
    if (held) { if (!i.hold) i.heldAt = t.holdSeq = (t.holdSeq || 0) + 1; carHoldOrbit(i, t, dt); } else { i.x = t.x; i.y = t.y; i.ho = undefined; }
    i.hold = held;
    if (i.reload > 0) return; // EVERY ready interceptor goes the moment there is a target (owner, 2026-10-26: "Always launch as many interceptors as available"; one by one on CRR_GAP before)
    const e = carTarget(t, st);
    if (!e) return;
    const fx = held ? i.x : t.x, fy = held ? i.y : t.y;
    i.e = e; i.ammo = st.ammo; i.state = "out"; i.cd = 0; i.orb = false; i.hold = false; i.ho = undefined; i.out = false; sfx("crr"); /* RELAYED: a relayed carrier's wing is RELAY_MUL x as many, all launching at once like any (owner, 2026-10-17: "orbital relay should also launch 3 interceptors at a time instead of just 1"; the CRR_GAP launch slots are gone since 2026-10-26) */
    i.v = st.speed; i.ang = held ? i.ang : Math.atan2(e.y - fy, e.x - fx); i.jp = Math.random() * 6.283; i.jw = CRR_JIT_W[0] + Math.random() * (CRR_JIT_W[1] - CRR_JIT_W[0]); // (held: out along its orbit, turning in)
    for (let k = 0; k < 4 && !held; k++) { const [ax, ay] = carAvoid(i, e.x - fx, e.y - fy, 1); i.ang = Math.atan2(ay, ax); } // leaves already bent round the core (a carrier by it has no room to turn)
    return;
  }
  if (i.state === "out") {
    // the CLOTHESPIN (owner, 2026-10-15): straight out, loops its target firing until out of ammo, straight home. A target that
    // dies hands the loop to an enemy within CRR_HOP of the interceptor, else it goes home (ATC's swarm weakness: free to chain
    // kill to kill across reach it leaked 1% of swarms; one target a sortie, 85% - and 66% of fast, its own type)
    // HOME ON TWO CONDITIONS ONLY (owner, 2026-11-01: "Interceptor flies home only on one of two conditions: / Target is dead (or slammed
    // into core) / Or / Out of ammo"): no leash lets a target go; a dead target sends it home (CRR_HOP 0)
    if (!i.e || i.e.dead) { i.e = carHop(i.e || i, t, st); i.orb = false; if (!i.e) { carHome(i, t, st); return; } }
    const e = i.e, d = Math.sqrt(carDist2(i, e));
    carOrbit(i, e, st, d, dt);
    if (!i.orb && d > carR(i) * 1.3) return; /* FIRES ONLY IN ORBIT (owner, 2026-11-04: "interceptors should only start firing once they enter orbit"; CRR_FIRE_R 340 let it fire on the way, gone) */
    if (!i.orb && d <= carR(i) * 1.3) i.orb = true; // onto the circle round its target
    i.cd -= dt;
    // A VOLLEY IS ITS BOLTS AT ONCE (owner, 2026-11-01: "My intent with volleys was to describe the number of bolts fired at once"): all
    // st.bolts (at most 3) leave in the same frame, side by side - the lead and its wings (vk 0 / -1 / +1) - then one volley interval
    while (i.cd <= 0 && i.ammo > 0) {
      if (e.dead) break;
      sfx("carshot"); i.ve = e; i.cd += CRR_VOLLEY_K / st.rate;
      for (let k = 0; k < st.bolts; k++) { const vk = st.bolts === 2 ? (k ? 0.5 : -0.5) : k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2); /* two bolts sit side by side, half a gap each way; three are the lead and its wings */ carBolt(i, e, t, st, vk * CRR_BOLT_SIDE, vk); }
      i.ammo--;
    }
    if (st.tSlow > 0 && carTethered(t, i, st)) carTether(i, t, st, dt); else i.tc = null; // the TETHER, once it has fired at its target
    if (i.ammo <= 0) {
      if (st.autopilot) { carBurst(i, t, st); i.state = "home"; i.reload = st.reload; i.x = t.x; i.y = t.y; i.e = null; return; } // rebuilt at home
      carHome(i, t, st);
    }
    return;
  }
  // back home
  const d = Math.sqrt(carDist2(i, t));
  if (d <= Math.max(i.v, 1) * dt * 1.5) { i.state = "home"; i.reload = st.reload * (i.used ?? 1); i.used = 1; i.x = t.x; i.y = t.y; i.e = null; return; } // PARTIAL RELOAD
  if (d < CRR_TURN_R * 2) i.ang = Math.atan2(t.y - i.y, t.x - i.x); // within two turn radii of its carrier it points straight home: the turn limit kept a dry one circling ~50 u round the tower forever, never reloading (Visual, 2026-11-03: 8 of 8 stuck after 10 s)
  carSteer(i, t.x - i.x, t.y - i.y, st.speed, dt, Math.max(0, Math.min(1, (d - 39) / 78))); /* (78: the old SLOT_R - the last approach home, not the slots' distance) */ // the avoidance lets go on the last approach home
}
// the TETHER's work a frame (see CRR_TETHER_SLOW): slow its target (and the capstone's chained one), pulse both every CRR_TETHER_PULSE s
// TETHERED: the first st.tetherN interceptors OUT on a live target, in wing order - not interceptor 0 alone, which reloading
// left Tether I with nothing tethered (tier redesign 2026-10-25). Only those draw a beam (drawCar)
const carTethered = (t, i, st) => i.state === "out" && !!i.ve && !i.ve.dead && t.icp.filter(j => j.state === "out" && j.ve && !j.ve.dead).indexOf(i) < st.tetherN;
function carTether(i, t, st, dt) {
  const e = i.ve, r2 = (CRR_ORBIT * 1.2) ** 2;
  if (st.tChain && (!i.tc || i.tc.dead || i.tc === e || carDist2(i.tc, e) > r2)) { i.tc = null; let bd = r2; for (const o of G.enemies) { if (o.dead || !o.seen || o === e) continue; const d = carDist2(o, e); if (d < bd) { bd = d; i.tc = o; } } }
  const key = i.tkey ||= "tether:" + t.id + ":" + t.icp.indexOf(i); // EACH TETHER its own slow and mark: they stack (owner, 2026-10-26)
  for (const o of [e, i.tc]) if (o && !o.dead) { applySlow(o, st.tSlow, 0.15, key); if (st.tAmp) applyMark(o, 1 + st.tAmp, 0.15, key); } // (doubled on fast, never the shielded - applySlow)
  i.tp = (i.tp || 0) + dt;
  if (i.tp < CRR_TETHER_PULSE) return;
  i.tp -= CRR_TETHER_PULSE; i.tf = 1; // (the beam's flash - drawCar)
}
// THE HOLD (owner, 2026-10-16: "hangar upgrades should allow the atc tower to have charged interceptors orbit it (with orbit distance
// jitter) when idle, so that they can be released at once"): with any Hangar, an interceptor reloaded and given nothing to hit
// circles its carrier CRR_HOLD_R out (+- CRR_HOLD_JIT by its own oj, -1..1), easing onto it - WAITING there - every ready interceptor, at
// every tier (owner, 2026-11-04: "make CRR ready interceptors wait in orbit around the tower / when launching interceptors, launch from orbit first, FIFO"),
// the longest-held (i.heldAt) taking the first target, all launching at once from where they circle. Its SIZE goes with the same oj ("smaller interceptors fly closer": carDart)
const CRR_HOLD_R = 40 /* 80 -> 40 (owner, 2026-11-05: "CRR orbit around tower should be half current distance"; 48 -> 80 on 2026-10-16: "circling interceptors should circle further away from tower") */, CRR_HOLD_JIT = 0.25, CRR_HOLD_V = 55 /* 110 -> 55 with the radius: the same loop time (2.3 s), only the distance moves */, CRR_SIZE_JIT = 0.15; // u; +-; u/s round the carrier; +- size
function carHoldOrbit(i, t, dt) {
  i.oj ??= Math.random() * 2 - 1;
  const R = CRR_HOLD_R * (1 + CRR_HOLD_JIT * i.oj);
  if (i.ho === undefined) { i.ho = Math.atan2(i.y - t.y, i.x - t.x) || Math.random() * 6.283; i.htx = t.x; i.hty = t.y; }
  i.x += t.x - i.htx; i.y += t.y - i.hty; i.htx = t.x; i.hty = t.y; // CARRIED with its carrier, as if fixed to it - a quick drag never pulls it through the tower (owner, 2026-10-16: "have the circling interceptors move as if physically connected to the tower")
  i.ho += CRR_HOLD_V / R * dt;
  const px = t.x + Math.cos(i.ho) * R, py = t.y + Math.sin(i.ho) * R, k = Math.min(1, dt * 6);
  i.x += (px - i.x) * k; i.y += (py - i.y) * k; i.ang = i.ho + Math.PI / 2; // nose along the orbit, counter-clockwise
}
// steer: speed eases toward v, the heading turns toward (dx, dy) at most speed / CRR_TURN_R a second, then a step along it
function carSteer(i, dx, dy, v, dt, fade = 1) {
  i.v = (i.v || v) + (v - (i.v || v)) * Math.min(1, dt * 4);
  [dx, dy] = carAvoid(i, dx, dy, fade);
  let da = Math.atan2(dy, dx) - i.ang;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const w = i.v / CRR_TURN_R * dt;
  i.ang += Math.max(-w, Math.min(w, da));
  i.x += Math.cos(i.ang) * i.v * dt; i.y += Math.sin(i.ang) * i.v * dt;
}
// AVOIDANCE (owner, 2026-10-16: "make it so that interceptors avoid hitting the core and other towers (smooth path)"): every
// obstacle within CRR_AVOID_LOOK ahead bends the wanted heading round its near side (the heading's part across it), harder the
// closer, and one it is already inside pushes it out - the capped turn rate keeps the bend a smooth arc. Its own carrier is not
// one (it launches and lands there)
const CRR_AVOID_PAD = 14, CRR_AVOID_LOOK = 110; // u kept clear of a hex; u ahead it starts to bend
let carObs = [];
function carObstacles(t) {
  carObs = [{ core: true, x: CX, y: CY, r: (typeof coreOuterR === "function" ? coreOuterR() : CORE_R) + CRR_AVOID_PAD }];
  for (const o of G.towers) if (o !== t) carObs.push({ x: o.x, y: o.y, r: CELL_S * TOWER_K + CRR_AVOID_PAD });
}
function carAvoid(i, dx, dy, fade) {
  const g = Math.hypot(dx, dy) || 1, hx = Math.cos(i.ang), hy = Math.sin(i.ang);
  let ux = dx / g, uy = dy / g;
  if (i.orb && fade === 0) return [ux, uy]; // ORBITING ITS TARGET: nothing avoided, the core included (owner, 2026-11-04: "allow steering into things when orbiting an enemy")
  for (const o of carObs) {
    const ox = o.x - i.x, oy = o.y - i.y, d = Math.hypot(ox, oy) || 1, rx = ox / d, ry = oy / d, along = hx * rx + hy * ry;
    const lat = Math.abs(hx * oy - hy * ox), inside = d < o.r, f = o.core ? 1 : fade; // the core is never let go
    if (!inside && (d > o.r + CRR_AVOID_LOOK || along < 0 || lat > o.r * 1.6)) continue; // clear of it, behind it, or passing wide
    let tx = hx - along * rx, ty = hy - along * ry, tl = Math.hypot(tx, ty);
    if (tl < 1e-3) { tx = ry; ty = -rx; tl = 1; } // dead ahead: round it clockwise
    const near = Math.min(1, (o.r + CRR_AVOID_LOOK - d) / CRR_AVOID_LOOK) ** 2, wide = inside ? 1 : Math.min(1, (o.r * 1.6 - lat) / (o.r * 0.6));
    const w = f * 3 * near * wide, push = inside ? f * 2 * (o.r - d) / o.r : 0;
    ux += w * tx / tl - (w * 0.5 + push) * rx; uy += w * ty / tl - (w * 0.5 + push) * ry;
  }
  return [ux, uy];
}
// the GUIDANCE FIELD round e (a Lyapunov vector field): far out it points nearly straight in, near the circle it turns
// tangent, inside it pushes out - every path spirals smoothly onto the CRR_ORBIT circle, counter-clockwise
function carOrbit(i, e, st, d, dt) {
  if (i.te === e) { i.x += e.x - i.tx; i.y += e.y - i.ty; } // the circle RIDES with its target (a fast enemy dragged a world-frame circle off it: 13% of fast leaked)
  i.te = e; i.tx = e.x; i.ty = e.y; i.jp = (i.jp || 0) + (i.jw || 0) * dt;
  const x = i.x - e.x, y = i.y - e.y, R = carR(i), r = Math.max(d, 1), q = r * r - R * R, k = 2 * R * r;
  const f = Math.max(0, Math.min(1, (r - R * 1.2) / (R * 2))); // full Launch speed until 3 R out, easing to CRR_ORBIT_V by 1.2 R
  carSteer(i, -(x * q + y * k), -(y * q - x * k), CRR_ORBIT_V + (Math.max(st.speed, CRR_ORBIT_V) - CRR_ORBIT_V) * f, dt, i.orb ? 0 : 1); /* ORBITING, IT STEERS INTO THINGS (owner, 2026-11-04: "allow steering into things when orbiting an enemy"): no avoidance round the core or towers on its target's circle; on the way out and home as before */
}
// a shot: st.bolts light-blue bolts, each the tower's damage - armor takes a bigger share of small hits (armorTake: R / (R + hit), since 2026-10-28): ATC's armor weakness (with
// the steep hit tables a single big hit shrugged armor off). A STREAM (owner, 2026-10-16: "bolts should come from the center of the
// interceptor (from underneath) and shoot in a constant stream", "4 bolts evenly distributed over the time it takes to fire one
// salvo", "homing, and just keep going straight if the enemy dies"): one bolt every 1 / (rate x CRR_BOLTS) s, a projectile that
// homes on its target; its target gone, it flies on straight and hits the first enemy it touches, or nothing (was: three at once,
// side by side, landing the instant they were fired)
/* (CRR_FIRE_R - fire on the way in from 340 u - GONE 2026-11-04: interceptors fire only in orbit) */
const CRR_BOLT_ON = 0; /* was 0.08 (2026-10-19, CRR AWAY from swarm - owner: weak to swarm): a volley's spare bolts no longer fly on into the next swarmer */ // s a bolt flies on past a dead target (~70u)
const CRR_BOLT_V = 900, CRR_BOLT_REACH = 390 /* x1.5 with the orbit (was 260) */, CRR_BOLT_HIT = 3; // u/s; u flown before it fades; u added to the enemy's size
function carBolt(i, e, t, st, side = 0, vk = 0) { // side: u across its flight, left or right of the interceptor; vk: -1 / 0 / +1, its place in the volley
  const a = Math.atan2(e.y - i.y, e.x - i.x);
  (t.carBolts ||= []).push({ x: i.x - Math.sin(a) * side, y: i.y + Math.cos(a) * side, e, vx: Math.cos(a) * CRR_BOLT_V, vy: Math.sin(a) * CRR_BOLT_V, left: CRR_BOLT_REACH / CRR_BOLT_V, dmg: st.dmg, icp: i, vk });
}
// A VOLLEY FLIES AS A V (owner, 2026-11-01: "can you make volleys visually fly in a V formation"), DRAWN: the lead (vk 0) at the point,
// each wing (vk -1 / +1) CRR_V_W out and CRR_V_B back, opening over its first CRR_V_IN u and closing onto its true path inside CRR_V_SHUT u
// of its target - the bolts' game spots and hits are the release's (side by side, CRR_BOLT_SIDE); this moves only where one is drawn
const CRR_V_W = 7, CRR_V_B = 10, CRR_V_IN = 12, CRR_V_SHUT = 36, CRR_V0 = [0, 0], CRR_VD = [0, 0];
function carBoltV(b) { // -> [dx, dy] from its game spot to where it is drawn
  if (!b.vk || !b.e) return CRR_V0;
  const flown = (CRR_BOLT_REACH / CRR_BOLT_V - b.left) * CRR_BOLT_V, f = Math.max(0, Math.min(1, flown / CRR_V_IN, Math.hypot(b.e.x - b.x, b.e.y - b.y) / CRR_V_SHUT));
  const lat = b.vk * CRR_V_W * f, back = Math.abs(b.vk) * CRR_V_B * f, ux = b.vx / CRR_BOLT_V, uy = b.vy / CRR_BOLT_V;
  CRR_VD[0] = -ux * back - uy * lat; CRR_VD[1] = -uy * back + ux * lat; return CRR_VD;
}
const CRR_ONE = [null];
function stepCarBolts(t, st, dt) {
  if (!t.carBolts || !t.carBolts.length) return;
  const g = projGrid();
  for (const b of t.carBolts) {
    if (b.e && b.e.dead) { b.e = null; b.left = Math.min(b.left, CRR_BOLT_ON); } // its target gone: straight on, only a little way (owner: "remaining bolts just keep going for a little bit" - the full reach let a volley's overkill land on the rest of a swarm)
    if (b.e) { const dx = b.e.x - b.x, dy = b.e.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * CRR_BOLT_V; b.vy = dy / d * CRR_BOLT_V; } // homing
    b.x += b.vx * dt; b.y += b.vy * dt; b.left -= dt;
    if (b.e) CRR_ONE[0] = b.e;
    for (const e of b.e ? CRR_ONE : enemiesNear(b.x, b.y, g)) { // (enemiesNear: the enemy grid, aspira-grv.js; CRR_ONE: its target, in a reused array)
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + CRR_BOLT_HIT;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      const hp0 = e.hp; damage(e, b.dmg, t, false, false, CRR_NO_NUM); onHit(e, t, st, b.dmg);
      carNum(b.icp, e, hp0 - e.hp, b.dmg, b.vx, b.vy);
      /* (the bolt SLOW - CRR_SLOW 20% for CRR_SLOW_S - GONE: owner, 2026-11-04 "remove bolt slow") */
      b.left = 0; break;
    }
  }
  keepLive(t.carBolts);
}
// ONE NUMBER PER CRR_NUM_HITS HITS of an interceptor (owner, 2026-10-16: "Interceptor damage output, change to 1 number per two hits
// per interceptor"; a number a bolt before, a shot's total before that): its bolts' damage adds up on the interceptor and pops as one
// number on the second hit's enemy, flying on the way that bolt was going, greyed by how much armor took off the pair
const CRR_NUM_HITS = 1 /* EVERY BOLT ITS OWN NUMBER (owner, 2026-10-28: "Show damage for each CRR pellet"; was 3 since 2026-10-16) */, CRR_NO_NUM = { noNum: true }; /* 2 -> 3, the strafing pass's hit summed in too (owner, 2026-10-16: "only show 1 number per 3 hits from each interceptor bolt / that number should be the sum, not a single hit") */
function carNum(i, e, dealt, raw0, vx, vy) {
  i.numSum = (i.numSum || 0) + Math.max(0, dealt); i.numRaw = (i.numRaw || 0) + raw0;
  i.numN = (i.numN || 0) + 1;
  if (i.numN < CRR_NUM_HITS) return;
  const sum = i.numSum, raw = i.numRaw; i.numSum = i.numRaw = i.numN = 0;
  /* MORE OFTEN (owner, 2026-11-05: "CRR should show damage numbers more frequently"): its bolts on one enemy sum over CRR_NUM_WIN, not the half second (DMG_SUM_S) every
     other tower's stream sums over - a volley's 3x-rate bolts read as one number every 0.5 s; a number a bolt (10-28's ask) was ~65x as many, a pile no one reads */
  if (sum > 0 && !(typeof farFx === "function" && farFx(e))) dmgSum(e, sum, raw, dmgInk("crr"), { x: e.x - vx, y: e.y - vy }, raw > sum ? 1 - sum / raw : 0, CRR_NUM_WIN);
}
const CRR_HOP = 0; /* was 30 (2026-10-19, away from swarm): no hop to a neighbour after a kill - home or a fresh pick */ /* back to 30 with CRR_FIRE_R 200 */ /* 30 -> 40 with a volley STOPPING when its target dies (2026-10-16, countermx 61-69 spread swarm/fast/shield/armor: 30 39/13/0/18, 40 19/14/0/21, 50 9/13/0/21, 80 2/9/0/21) */ /* 35 -> 30 with the x1.33 hit (swarm 15% -> 24%) */ /* 40 -> 35 with the 100u circle and the homing stream (2026-10-16, countermx 61-69 spread: 25 leaked 47% of swarms, 35 25%, 45 9%) */ // (90: ATC leaked 1% of swarms; 20: 68% swarms but 50% fast - counter matrix 61-69, 2026-10-15)
// the NEXT target after a kill: the nearest enemy within CRR_HOP that no other interceptor of this carrier is already on, else the
// nearest at all (owner, 2026-10-16: "each interceptor should be able to target a different fast with their respective volley")
function carHop(i, t, st) { // (i: where the last target was - the interceptor itself circles CRR_ORBIT out)
  const r2 = CRR_HOP * CRR_HOP;
  let best = null, bd = r2, any = null, ad = r2;
  for (const e of G.enemies) {
    if (e.dead || !e.seen) continue;
    const d = carDist2(e, i);
    if (d >= r2) continue;
    if (t.icp && t.icp.some(o => o !== i && o.e === e && o.state === "out")) { if (d < ad) { ad = d; any = e; } }
    else if (d < bd) { bd = d; best = e; }
  }
  return best || any;
}
// PARTIAL RELOAD (owner, 2026-11-01, picked "1" of the interceptor reworks): a return reloads only the share of the magazine it used
function carHome(i, t, st) { i.used = Math.max(0, Math.min(1, 1 - Math.max(0, i.ammo) / Math.max(1, st.ammo))); i.state = "back"; i.e = null; i.orb = false; i.v = Math.max(i.v || 0, CRR_ORBIT_V); }

// AUTOPILOT: out of ammo, the interceptor bursts into pellets - projectiles that hit the first enemy they touch, or miss
function carBurst(i, t, st) {
  for (let k = 0; k < CRR_BURST_N; k++) {
    const a = Math.random() * 6.283;
    (t.carPellets ||= []).push({ x: i.x, y: i.y, vx: Math.cos(a) * CRR_PELLET_V, vy: Math.sin(a) * CRR_PELLET_V, left: CRR_PELLET_REACH / CRR_PELLET_V, dmg: st.dmg * CRR_BURST_K });
  }
}
function stepCarPellets(t, dt) {
  if (!t.carPellets || !t.carPellets.length) return;
  const g = projGrid();
  for (const p of t.carPellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt;
    for (const e of enemiesNear(p.x, p.y, g)) {
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + CRR_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      const h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT; // on the pellet's way (HIT_AT, aspira-floats.js)
      try { damage(e, p.dmg, t); } finally { hitFrom = h0; } p.left = 0; break;
    }
  }
  keepLive(t.carPellets);
}

// ---------- the look: thin, long darts - a fast enemy's triangle, stretched - and LIGHT-BLUE bolts and pellets (StarCraft) ----------
const CRR_DART = 33, CRR_DART_W = 7.8, /* x3 (owner, 2026-10-16: "make the interceptors like 3x bigger"; was 11, 2.6) */ CRR_PELLET_PX = 2, CRR_PELLET_TAIL = 0.03, CRR_BOLT_TAIL = 0.007 /* owner, 2026-10-16: "change the 5 bolts to each be much shorter" (was 0.02, 18u) */, CRR_BOLT_GROW = 0.3; // a bolt streak: at most this many s of its flight behind it, growing by GROW s a s of flight (6u by 21u out)
// its SIZE grows with Armament (owner, 2026-10-16: "halve interceptor size (grow this as armament increases)"): half the dart
// above, untaken, + CRR_DART_GROW a tier - the full dart at VI
const CRR_DART_K0 = 0.5, CRR_DART_GROW = 0.1;
const CRR_DART_DRAW = 0.5; // every interceptor DRAWN at half (owner, 2026-11-05: "Halve interceptor sizes") - its outline too; its jitter and its hold radius as they were (the draw only)
// (perf, 2026-11-01: ONE path a carrier, one fill and one stroke - was a fill and a stroke a dart, ~200 canvas calls a frame at 3 x 34;
// where two darts overlap the fill now shows once, not twice)
function carDart(i, z) { // adds the dart's triangle to the open path
  const a = i.ang, L = CRR_DART * z, W = CRR_DART_W * z; // nose along its heading
  const c = Math.cos(a), s = Math.sin(a), bx = i.x - c * L * 0.5, by = i.y - s * L * 0.5;
  ctx.moveTo(i.x + c * L * 0.5, i.y + s * L * 0.5);
  ctx.lineTo(bx - s * W, by + c * W); ctx.lineTo(bx + s * W, by - c * W); ctx.closePath();
}
// darts: the INTERCEPTORS alone, drawn in skyKeep - their colour is not inverted by a boss sky (owner, 2026-10-16: "Interceptor color
// should also not be inverted"); else the bolts and pellets, which turn over with it like every tower's shots
// THE TRAIL (owner, 2026-10-16: "add a super thin but long line along the paths travelled by interceptor"): each interceptor out of
// the carrier keeps its last CRR_TRAIL_N points, one every CRR_TRAIL_STEP u flown (drawn only - the simulator never draws), and a
// hairline runs back along them, fading out in CRR_TRAIL_BANDS steps; gone once it is back inside the carrier
const CRR_TRAIL_N = 60, CRR_TRAIL_STEP = 6, CRR_TRAIL_W = 0.8, CRR_TRAIL_A = 0.45, CRR_TRAIL_BANDS = 4;
// SHORTER AS THEY MULTIPLY (owner, 2026-11-02: "No to all except smaller CRR trails"; option C - WebKit drawCar at 3 x 34 2.83 -> 2.06 ms): a carrier with more than CRR_TRAIL_REF interceptors out keeps CRR_TRAIL_N x REF / out points a
// trail (never under CRR_TRAIL_MIN), so its trail segments a frame stay about today's at 17
const CRR_TRAIL_REF = 17, CRR_TRAIL_MIN = 20;
function carTrails(t) {
  ctx.strokeStyle = COL.blue; ctx.lineWidth = CRR_TRAIL_W; ctx.lineJoin = "round"; ctx.lineCap = "round"; // (keep ROUND: bevel joins + butt caps drew the trails ~3x SLOWER in WebKit, 2.5 -> 7.5 ms a frame at 3 x 17 - measured 2026-11-01)
  // a DRAGGED carrier carries its held interceptors' trails with it (owner, 2026-10-16: "don't show atc interceptor streaks
  // caused by dragging"): the tower's move since the last draw shifts them whole, so only their own orbit draws
  const mx = t.x - (t.trX ?? t.x), my = t.y - (t.trY ?? t.y); t.trX = t.x; t.trY = t.y;
  let out = 0; for (const i of t.icp) if (i.state !== "home" || i.hold) out++;
  const nMax = Math.max(CRR_TRAIL_MIN, Math.round(CRR_TRAIL_N * Math.min(1, CRR_TRAIL_REF / Math.max(1, out))));
  for (const i of t.icp) {
    if (i.state === "home" && !i.hold) { i.trail = null; continue; }
    if ((mx || my) && i.state === "home" && i.trail) for (let k = 0; k < i.trail.length; k += 2) { i.trail[k] += mx; i.trail[k + 1] += my; }
    const tr = i.trail ||= [i.x, i.y], n = tr.length;
    if ((tr[n - 2] - i.x) ** 2 + (tr[n - 1] - i.y) ** 2 >= CRR_TRAIL_STEP * CRR_TRAIL_STEP) { tr.push(i.x, i.y); } if (tr.length > nMax * 2) { const cut = tr.length - nMax * 2; tr.copyWithin(0, cut); tr.length -= cut; } /* in place: splice(0, 2) made a garbage array every push, ~170 a frame at 3 x 40 (2026-11-05) */
  }
  for (let b = 0; b < CRR_TRAIL_BANDS; b++) { // band b: the b-th quarter from the interceptor back, each fainter - one stroke a band for every trail
    ctx.globalAlpha = CRR_TRAIL_A * (1 - b / CRR_TRAIL_BANDS); ctx.beginPath();
    for (const i of t.icp) {
      const tr = i.trail; if (!tr || tr.length < 4) continue;
      const m = tr.length / 2, hi = Math.round(m * (1 - b / CRR_TRAIL_BANDS)), lo = Math.round(m * (1 - (b + 1) / CRR_TRAIL_BANDS));
      if (b === 0) ctx.moveTo(i.x, i.y); else ctx.moveTo(tr[(hi - 1) * 2], tr[(hi - 1) * 2 + 1]);
      for (let k = hi - 1; k >= Math.max(0, lo - 1); k--) ctx.lineTo(tr[k * 2], tr[k * 2 + 1]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
let CRR_NUM_WIN = 0.1; // s: CRR's damage numbers sum over this on an enemy (others: DMG_SUM_S 0.5)
const CRR_TETHER_A0 = 0.7, CRR_TETHER_W = 0.6; // the tether chain: its least alpha (x CHAIN_A on top, as ARC's), its links x ARC's size
function drawCar(darts) {
  for (const t of G.towers) {
    if (t.kind !== "crr" || !t.icp) continue;
    if (darts) {
      carTrails(t);
      if (skillOf(t, "launch") > 0) { // the TETHER beams: interceptor -> target (-> the chained one), brighter on a pulse
        ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round";
        const st = towerStats(t);
        // an ARC-style CHAIN, thinner, in CRR's blue (owner, 2026-11-05: "replace the beam with a thinner arc chain (still blue)"), never under 70% (owner: "tether
        // should have a min opacity of 70%"); a pulse (i.tf) still flashes it brighter and wider. 3D: one GPU capsule a link (fxGlChain), 2D: drawChain2D
        const gl3 = !!(ctx && ctx.real && typeof fxGl !== "undefined" && fxGl.on && typeof fxGlChain === "function");
        const link = (x1, y1, x2, y2, a, w) => { if (gl3) fxGlChain({ x1, y1, x2, y2, color: "ltblue", thin: w }, a); else if (typeof drawChain2D === "function") { ctx.globalAlpha = a; drawChain2D(x1, y1, x2, y2, (x, y) => ({ x, y }), 1, COL.ltblue, w); } };
        for (const i of t.icp) {
          if (!carTethered(t, i, st)) continue;
          i.tf = Math.max(0, (i.tf || 0) - 0.08); const a = CRR_TETHER_A0 + (1 - CRR_TETHER_A0) * i.tf, w = CRR_TETHER_W * (1 + 0.6 * i.tf);
          link(i.x, i.y, i.ve.x, i.ve.y, a, w); if (i.tc && !i.tc.dead) link(i.ve.x, i.ve.y, i.tc.x, i.tc.y, a, w);
        }
      }
      ctx.fillStyle = COL.blue; ctx.strokeStyle = COL.blue; ctx.lineWidth = 2 * CRR_DART_DRAW; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
      const z = (CRR_DART_K0 + CRR_DART_GROW * TIER_LEVEL[skillOf(t, "armament")]) * CRR_DART_DRAW;
      ctx.beginPath(); for (const i of t.icp) if (i.state !== "home" || i.hold) carDart(i, z * (1 + CRR_SIZE_JIT * (i.oj || 0))); // its own size: smaller ones hold closer
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      continue;
    }
    ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round"; ctx.lineWidth = CRR_PELLET_PX; ctx.globalAlpha = 1;
    ctx.beginPath(); // bolts and pellets: ONE path, one stroke (perf)
    for (const b of t.carBolts || []) { // UNDER the darts: they leave from beneath. A DOT at the interceptor, stretching out as it flies (owner, 2026-10-16)
      const k = Math.min(CRR_BOLT_TAIL, (CRR_BOLT_REACH / CRR_BOLT_V - b.left) * CRR_BOLT_GROW), v = carBoltV(b), x = b.x + v[0], y = b.y + v[1]; // (in its V)
      ctx.moveTo(x - b.vx * k, y - b.vy * k); ctx.lineTo(x, y);
    }
    for (const p of t.carPellets || []) { ctx.moveTo(p.x - p.vx * CRR_PELLET_TAIL, p.y - p.vy * CRR_PELLET_TAIL); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
