// /spire - enemy FORMATIONS (owner, 2026-10-11: "swarm has the jitter, fast uses these bird-like triangle patterns,
// armor ... a tight square lattice, shields continue to come in a line"). A formation is a SIDEWAYS offset across the
// lane (e.lat, world units, + = the lane's left) and a HEAD START along it; stepEnemies lays it across the lane at its
// current heading (formOffset), the across part shrinking to nothing inside FORM_FADE_R of the core so it funnels in.
// Swarms keep their wander (e.jit): no entry here.
const FORM_FADE_R = 160;
// SHIELDS: Vs of V_N - a leader, then pairs fanned back and out (owner, 2026-10-11: "fast in lines, Vs for shields";
// fast flew the Vs for an afternoon and now come single file)
const V_N = 5, V_LAT = 24, V_BACK = 28; // a third (owner, 2026-10-21: "shield units, 1/3 the distance between a pods wingmates"; was 72, 84 - tripled 2026-10-20 from these)
// ...and Vs of V_SMALL (owner, 2026-10-12: "for shield, allow groups for 3, not just 5"): a lane's shields fly as Vs of
// 5 where the rest still splits into 3s and 5s, else 3 - so any count vFits fills whole Vs
// and LONE shields too (owner, 2026-10-12: "allow shield waves of 1 3 and 5"): any count fits now - 5s, then a 3, then 1s
const V_SMALL = 3, vFits = () => true;
// FAST: PAIRS side by side, FAST_PAIR apart, spinning about their midpoint (owner, 2026-10-11: "for fast, make them
// come in pairs and spin also"); each pair FAST_PAIR behind the one before - a square ladder (owner: "side by side
// distance equal to distance prev and next ... a little smaller"; was 30 across and ~114 between pairs)
const FAST_PAIR = 78; // x3 (owner, 2026-10-20: "for fast waves, triple the distance between fast units"; was 26)
// ARMOR: one tight SQUARE lattice per lane copy, ARMOR_W abreast, rows ARMOR_PITCH apart - the same as the columns
const ARMOR_W = 3, ARMOR_PITCH = 36, ARMOR_FLEET_PITCH = 36; // HALVED (owner, 2026-10-23: "Halve spacing between armor units"; was 72). x2 (owner, 2026-10-20: "double the distance between armor units"; was 36). 216 for an hour: a wave of 24 walked its outer columns 216 u off the lane, out of every tower's reach - every trio died by wave 53 (battery 2026-10-20); owner: "back to 72"; a boss's armor fleet keeps the old 36 (aspira-bosses.js)
// SHIELDS: the gap after each pod (a V of 5, 3 or a lone 1), per member - halved (owner, 2026-10-20: "bring the distance between
// shield units closer together (distance between pods of 1 3 5)"; was 0.8, the rest's)
const SHIELD_POD_GAP = 0.4;
// THE SPIN (owner, 2026-10-11: "rotate about the center unit's axis (spin around them)", then "don't make shields do
// the spinning, make armor do the spinning"): a formation turns FLAT on the board about its CENTRE - the lattice's
// middle, or the boss its escorts surround - one radian every FORM_SPIN[type] world units it travels; the members orbit
// it. No entry = it never spins (the shield Vs)
const FORM_SPIN = { fast: 160 }; // (armor spun for an hour: owner, "remove armor spin")
// the slots for a group of m: [lat, ahead] each
const FORMS = {
  fast: { group: () => 2, slots: m => (m === 2 ? [[-FAST_PAIR / 2, 0], [FAST_PAIR / 2, 0]] : [[0, 0]]) },
  shield: { group: left => (left >= V_N ? V_N : left >= V_SMALL ? V_SMALL : 1), slots: m => Array.from({ length: m }, (_, i) => {
    const d = Math.ceil(i / 2), side = i % 2 ? 1 : -1; // 0 the leader; 1, 2 the first pair; 3, 4 the next
    return [side * d * V_LAT, (Math.ceil((m - 1) / 2) - d) * V_BACK];
  }) },
  armor: { group: m => m, slots: m => {
    const rows = Math.ceil(m / ARMOR_W);
    return Array.from({ length: m }, (_, i) => {
      const r = Math.floor(i / ARMOR_W), inRow = Math.min(ARMOR_W, m - r * ARMOR_W), c = i % ARMOR_W; // a short last row stays centred
      return [(c - (inRow - 1) / 2) * ARMOR_PITCH, (rows - 1 - r) * ARMOR_PITCH];
    });
  } },
};
// a wave's count is a whole number of these (waveCount): every V full (V_N, odd: 2n+1). Armor is NOT rounded (owner,
// 2026-10-11: "having centered 1 or 2 armored in the back looks nice") - a short last row sits centred at the back
const FORM_UNIT = { fast: 2 }, FORM_GROUP = { shield: V_N, armor: ARMOR_W, fast: 2 };
// how many lane copies a wave of `count` splits onto, at most `want`: shields only into whole Vs, armor into whole
// lattice rows (the largest k <= want that divides its number of groups); everything else as asked
// (2026-10-11: one armor block on one lane made armor free - all 36 sim games won, armor 0 lives - so armor splits
// again, in WHOLE ROWS; ARMOR_ONE_BLOCK true brings the single block back. let: the simulator sweeps it)
let ARMOR_ONE_BLOCK = false;
// HOW MANY LANES each type rides (owner, 2026-10-12: "swarm should always use 5-6 paths, fast 2-3, armor 1-3, shield
// 3-5"; was 1-6 for all): the wave's pick in the range, else the nearest in it that splits the groups evenly, else the
// pick with the odd groups dropped (laneCount rounds the count down to whole groups per lane)
const LANE_SPLIT = { fast: [3, 5] /* 3 or 5 (was 3-4, owner 2026-10-12; was 2-3) */ };
const NO_LANES = 4; // NOTHING rides exactly four lanes (owner, 2026-10-13: "make nothing use 4 lanes exactly")
// SWARM on 20 or 24 lanes, FOUR times its old 5-6 (owner, 2026-10-12: "double swarm lanes ... keep the number of enemies the
// same"; doubled again 2026-10-13, "mostly a visual change, double the swarm lanes again, but keep the counts"): the count is
// still rounded to the old lane-fulls (k / SWARM_K), then shared over the k lanes, some one more (sendWave)
const SWARM_LANES = [21, 24], SWARM_K = 4; // (kept with HALF the bodies - owner, 2026-10-14: "no same number of lanes"); 21 not 20 so three MAIN lanes sit on the grid (2026-10-26)
const ARMOR_LANES = 2; // ALWAYS two (owner, 2026-10-12: "armor should always use 2 paths"; was 1-3)
const SHIELD_LANES = [2, 3]; // 2-3 (owner, 2026-10-12; briefly 3 or 5, never 4)
// THREE MAIN LANES (owner, 2026-10-26: "choose 3 main lanes (these are the ones that the game should be rotating to equalize time on
// screen) / they should contain about 80% of the swarm, with a bell curve in terms of arrival density over distance / the remaining
// contains the rest"): the main three are 120 degrees apart at laneBestTurn's pick for THREE copies; the rest sit between them on the k
// grid. A main lane's bodies are released on a BELL (fixed normal quantiles, +-SWARM_BELL_Z sd over SWARM_BELL_SPAN x the even stream's
// time) - dense mid-stream, thin at the head and the tail; the others stream evenly as before
const SWARM_MAIN = 3, SWARM_MAIN_SHARE = 0.8, SWARM_BELL_SPAN = 4 /* x2 (owner, 2026-10-26: "last swarm units need to arrive much later than first ones (bigger time spread for main lanes)"; was 2) */, SWARM_BELL_Z = 2.5;
function swarmLanes(pi, k, n) { // [{ ang, main }], the main three first
  const t = laneBestTurn(pi, SWARM_MAIN, n, "swarm"), all = Array.from({ length: k }, (_, i) => ({ ang: (t + i * 2 * Math.PI / k) % (2 * Math.PI), main: i % (k / SWARM_MAIN) === 0 }));
  return [...all.filter(l => l.main), ...all.filter(l => !l.main)];
}
function swarmParts(N, k) { // bodies a lane, in swarmLanes' order: SWARM_MAIN_SHARE over the main three, the rest over the others (each lane at least none)
  const m = Math.min(N, Math.round(N * SWARM_MAIN_SHARE)), share = (n, j) => Array.from({ length: j }, (_, i) => Math.floor(n / j) + (i < n % j ? 1 : 0));
  return [...share(m, SWARM_MAIN), ...share(N - m, k - SWARM_MAIN)];
}
const normInv = p => { /* the standard normal's quantile (Acklam's rational fit, |err| < 1.2e-9) */
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924], b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857], c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878], d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const q0 = Math.min(p, 1 - p);
  if (q0 < 0.02425) { const q = Math.sqrt(-2 * Math.log(q0)), x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); return p < 0.5 ? x : -x; }
  const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};
function bellGaps(m, gap) { // m bodies' waits AFTER each (the last 0): an even stream's gap x SWARM_BELL_SPAN spread on the bell
  const S = m * gap * SWARM_BELL_SPAN, at = Array.from({ length: m }, (_, i) => S * (0.5 + Math.max(-SWARM_BELL_Z, Math.min(SWARM_BELL_Z, normInv((i + 0.5) / m))) / (2 * SWARM_BELL_Z)));
  return at.map((t, i) => (i + 1 < m ? at[i + 1] - t : 0));
}
// HALF SPEED (owner, 2026-10-26: "cut speed of all non-boss/boss-fleet enemies in half"): every plain enemy spawns at PLAIN_SPEED_K
// (spawnEnemy's spd; a boss's fleet rides at the boss's own pace - bossFleet); a stream's gaps stretch to match (stepSpawns)
const PLAIN_SPEED_K = 0.5;
function formSplit(type, count, n) {
  if (type === "armor") return ARMOR_ONE_BLOCK ? 1 : ARMOR_LANES; // always (laneCount rounds up)
  if (type === "swarm") return SWARM_LANES[Math.floor(fixedRand(n, 3) * SWARM_LANES.length)];
  if (type === "shield") return SHIELD_LANES[Math.floor(fixedRand(n, 3) * SHIELD_LANES.length)]; // always (laneCount rounds up)
  const [lo, hi] = LANE_SPLIT[type] || [1, 6], unit = FORM_GROUP[type] || 1, groups = Math.max(1, Math.floor(count / unit));
  const want = lo + Math.floor(fixedRand(n, 3) * (hi - lo + 1));
  for (let d = 0; d <= hi - lo; d++) for (const k of [want - d, want + d]) if (k !== NO_LANES && k >= lo && k <= hi && k <= groups && groups % k === 0) return k;
  const k = Math.min(want === NO_LANES ? NO_LANES - 1 : want, groups);
  return k === NO_LANES ? NO_LANES - 1 : k;
}
// shields ROUND UP (owner, 2026-10-12: "round up units to hit 3-5 lanes"): each lane a count of whole 3- and 5-Vs
const laneCount = (type, count, k) => {
  if (type === "shield") { let per = Math.ceil(count / k); while (!vFits(per)) per++; return per * k; }
  if (type === "armor") return Math.ceil(count / k) * k; // rounded UP to fill every lane (a short last row sits centred)
  if (type === "swarm") return Math.max(1, Math.round(count)); // the swarm is SHARED by weight over its lanes now (swarmParts), no lane-fulls (2026-10-26)
  const unit = FORM_GROUP[type] || 1; return Math.floor(count / (k * unit)) * k * unit || count;
};
// THE SPACING IS FOR THE 1x ZONE, AND NOTHING POPS IN (owner, 2026-10-21: "they get compressed as they slow down / The formations
// should have a target spacing for when they enter the 1x zone"; then "armor units feel like they teleport in / ensure that no unit
// does that"): a formation's FRONT spawns at the entry and the rest wait BEHIND it off the board (G.fleetQ, as a boss's fleet does -
// queueFleet, aspira-bosses.js), walking in at 1x while the board runs OFF_SCREEN_SPEED x: each gap opens by that much on the way
// in and closes back to its slot in a tower's reach. The next group waits the formation's length longer, so the gap between
// groups lands where it did
// from stepSpawns: spawn the next formation of `type` from wave part w at once; returns how many it took (0: none)
function formSpawn(w, type) {
  const f = FORMS[type];
  if (!f) return 0;
  let m = 0;
  const left = w.list.length - w.idx + 1, cap = f.group(left);
  while (m < cap && w.idx - 1 + m < w.list.length && w.list[w.idx - 1 + m] === type) m++;
  const slots = f.slots(m), mid = slots.reduce((a, q) => a + q[1], 0) / m; // the centre it spins about: its middle row
  for (let i = 0; i < m; i++) {
    spawnEnemy(type, w.n, w.lanes[type], w.ang || 0);
    const e = G.enemies[G.enemies.length - 1];
    e.form = true; e.lat = slots[i][0]; e.ahead = slots[i][1]; e.aheadC = mid; e.s += e.ahead; // aheadC: the formation's centre
  }
  const back = Math.max(...slots.map(q => q[1])), mem = G.enemies.slice(-m), s0 = entryS(mem[0].pi);
  for (const e of mem) { e.s -= back; if (e.s < s0 - 0.01) { G.enemies.splice(G.enemies.indexOf(e), 1); G.fleetQ.push(e); } } // (stepFleetQ)
  if (back > 0) w.timer += back / Math.max(1, effSpeed(mem[0])); // the formation's length, walked in at 1x
  w.idx += m - 1;
  return m;
}
// from stepEnemies: p (the lane at s) moved to this member's place in its formation - its offset from the CENTRE UNIT
// (along the lane, and e.lat across it toward the lane's left) turned by the spin, the across part faded near the core.
// s: where along the lane (the enemy itself by default; its tracer asks for points behind it - drawStarTrail)
// pathAt (aspira-defs.js) WITHOUT a new object: the lane point written into `out` (perf, 2026-10-16: two fresh {x, y} - three with
// a turned lane - an enemy a step were most of a late step's ~60-90 KB of garbage); the same arithmetic, so the same point
const ROT_TRIG = new Map();
function pathAtInto(pi, s, ang, out) {
  const { pts, len } = PATHS[pi];
  let x, y;
  if (s <= 0) { x = pts[0].x; y = pts[0].y; } else if (s >= len) { x = pts[pts.length - 1].x; y = pts[pts.length - 1].y; } else {
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], f = (s - a.s) / (b.s - a.s || 1);
    x = a.x + (b.x - a.x) * f; y = a.y + (b.y - a.y) * f;
  }
  if (ang) { let T = ROT_TRIG.get(ang); if (!T) { if (ROT_TRIG.size > 256) ROT_TRIG.clear(); ROT_TRIG.set(ang, (T = [Math.cos(ang), Math.sin(ang)])); } const dx = x - CX, dy = y - CY; x = CX + dx * T[0] - dy * T[1]; y = CY + dx * T[1] + dy * T[0]; } // (rotAbout's - a lane copy's turn is one of a few angles: its cos / sin kept, as the simulator's rotAbout does)
  out.x = x; out.y = y;
  return out;
}
const FORM_B = { x: 0, y: 0 }, FORM_Q = { x: 0, y: 0 }, ENEMY_AT = { x: 0, y: 0 }; // scratch points - each read before the next call writes it
function formOffset(e, p, s = e.s) {
  // (a boss's escorts never spin about it - bossKin)
  const spin = e.bossKin ? 0 : FORM_SPIN[e.type], c = s - (e.ahead || 0) + (e.aheadC || 0), phi = spin ? c / spin : 0; // c: the centre unit's place - one phase for all
  const a0 = (e.ahead || 0) - (e.aheadC || 0), cs = Math.cos(phi), sn = Math.sin(phi);
  const along = a0 * cs - e.lat * sn, across = a0 * sn + e.lat * cs;
  const b = pathAtInto(e.pi, c + along, e.ang, FORM_B), q = pathAtInto(e.pi, c + along + 3, e.ang, FORM_Q), tx = q.x - b.x, ty = q.y - b.y, L = Math.hypot(tx, ty) || 1;
  const k = across * Math.min(1, Math.hypot(b.x - CX, b.y - CY) / FORM_FADE_R) / L;
  p.x = b.x - ty * k; p.y = b.y + tx * k; if (s === e.s) e.faceA = Math.atan2(ty, tx); /* (not a trail point's - aspira-enemies.js) */ // ITS OWN SPOT'S LANE heading - a corner points along the lane (owner, 2026-10-26)
}
