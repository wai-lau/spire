// /spire - THE BOSS FLEETS of the boss redesign (owner, 2026-11-05; split out of aspira-bosses.js at its 500-line cap): the fixed
// lattices (the Star, Strength, Temperance, Justice's cross), the scattered fleets (the Lovers; Judgement's rise) and the Devil's host.
// bossFleet / bossRise / sendWave / stepSpawns (aspira-bosses.js, aspira-waves.js, aspira-step.js) call into it; loaded right after
// aspira-bosses.js (the simulator too, sim.mjs FILES).
// THE LATTICE FLEETS (owner, 2026-11-05, the boss redesign: "Star, 3 x 10 fast in a lattice as fleet" / "Strength, at center of 3 x 12
// armor lattice" / "Temperance, center of 3 x 12 shield lattice, same mechanic"): a FIXED grid, 3 across the lane and n along (not a
// share of a wave), in place of FLEET for that boss; "centre": the boss in its middle row (the rings of fleetForm's armor lattice),
// "behind": the whole grid after the boss (the Star goes first, its pack after - owner, 2026-10-12)
const FLEET_LATTICE = { star: { k: "fast", n: 30, at: "behind" }, strength: { k: "armor", n: 36, at: "centre" }, temperance: { k: "shield", n: 36, at: "centre" },
  // (owner, 2026-11-05: "Justice, a center of armored shield cross (armor and hp or armor, shield count of shield), 1x7 across, 1x13 down"):
  // a plus, 7 across the lane and 13 along it, Justice at its crossing - 18 armor escorts, each with a shield escort's charges too
  justice: { k: "armor", n: 18, at: "cross", w: 7, h: 13, shield: true } };
const LATTICE_W = 3;
function latticeSlots(m, R, size, at) {
  const P = Math.max(ARMOR_FLEET_PITCH, 2 * size + FLEET_GAP), out = [];
  if (at && at.at === "cross") { // the arms out from the boss: across first (col +-1 .. +-(w-1)/2), then along (row +-1 .. +-(h-1)/2)
    const g0 = R + size + FLEET_GAP, arm = (i, Pk) => (i === 1 ? g0 : g0 + (i - 1) * Pk);
    for (let i = 1; i <= (at.w - 1) / 2; i++) out.push([arm(i, P), 0], [-arm(i, P), 0]);
    for (let i = 1; i <= (at.h - 1) / 2; i++) out.push([0, arm(i, P)], [0, -arm(i, P)]);
    return out.slice(0, m);
  }
  if (at === "behind") { for (let i = 0; i < m; i++) out.push([(i % LATTICE_W - (LATTICE_W - 1) / 2) * P, -(R + FLEET_GAP + size + Math.floor(i / LATTICE_W) * P)]); return out; }
  // "centre": half the rows ahead, half behind, the boss in the gap between the middle two (3 x 12: six rows a side), each row clear of it
  const g0 = R + size + FLEET_GAP;
  for (let k = 0; out.length < m; k++) for (const side of [1, -1]) for (let c = 0; c < LATTICE_W && out.length < m; c++) out.push([(c - (LATTICE_W - 1) / 2) * P, side * (g0 + k * P)]);
  return out;
}
// THE SCATTERED FLEETS (owner, 2026-11-05, the boss redesign: "Lovers: spawns with one wave of armor, except scattered like swarm"): a
// share of a plain wave of each type (typeWaveCount; split among a pair's bodies), strewn round the boss like a swarm - each at a random
// spot across SCATTER_W either side of the lane and along SCATTER_U a body of lane, ahead and behind, clear of the boss, wandering like a
// swarmer (jit) at the boss's pace
// Death (owner, 2026-11-05: "Death 1/2 of each wave at the same time + death itself"; 2026-11-09: her escort cut to a third): a third of a plain
// wave of each of the four types, all at once round her (100 games bosses on, adaptive buyer: her depth 0.74 -> 0.47, runs ending there 17 -> 8%)
const FLEET_SCATTER = { lovers: [["armor", 1]], death: [["fast", 1 / 6], ["swarm", 1 / 6], ["armor", 1 / 6], ["shield", 1 / 6]] }; // Death: a sixth of a plain wave of each type on its own lane (owner, 2026-11-11: fewer escorts on each lane, the five lanes unlit; was a third)
const SCATTER_W = 52, SCATTER_U = 14, SCATTER_UK = { death: 0.35 }; // (Death's host packed ~3x tighter along the lane: "at the same time")
function bossScatter(e, n, R, parts = FLEET_SCATTER[e.arcana], rise = false) { // rise: Judgement's second coming - all behind her, held at the mouth, no queueFleet (she is already on the board)
  const bodies = rise ? 1 : bossCount(n), span = [R, R], s0 = entryS(e.pi);
  const all = parts.map(([k, mul]) => [k, Math.max(1, Math.round(typeWaveCount(k, n) * mul / bodies))]), tot = all.reduce((a, [, c]) => a + c, 0), along = Math.max(4 * R, tot * SCATTER_U * (SCATTER_UK[e.arcana] ?? 1));
  for (const [k, count] of all) for (let c = 0; c < count; c++) {
    spawnEnemy(k, n, e.pi, e.ang || 0);
    const m = G.enemies[G.enemies.length - 1], r = ENEMIES[k].size;
    m.max = Math.floor(m.max * BOSS_HEFT); m.hp = m.max; // (BOSS_HEFT, as every escort)
    let lat, ahead; do { lat = (Math.random() * 2 - 1) * SCATTER_W; ahead = (Math.random() - (rise ? 1 : 0.5)) * along; } while (Math.hypot(lat, ahead) < R + r + FLEET_GAP);
    m.form = true; m.lat = lat; m.s = e.s + ahead; m.ahead = ahead; m.aheadC = 0;
    span[0] = Math.max(span[0], ahead + r); span[1] = Math.max(span[1], -ahead + r);
    m.spd = (e.spd || 1) * ENEMIES.bonus.speed / ENEMIES[k].speed; m.jit = 18 + Math.random() * 45; // a swarmer's wander (spawnEnemy's)
    m.bossKin = true; m.fleetSpd = m.spd; e.fleet.push(m);
    if (rise) { if (m.s < s0 - 0.01) { G.enemies.splice(G.enemies.lastIndexOf(m), 1); G.fleetQ.push(m); } continue; } // (walks in at the mouth, stepFleetQ; her HP is not raised again)
    const moved = Math.floor(m.max * FLEET_TO_BOSS); m.max -= moved; m.hp = m.max; e.max += moved; e.hp = e.max; // (FLEET_TO_BOSS)
  }
  if (rise) return;
  e.fleetSpan = span[0] + span[1]; G.lastBoss = e;
  queueFleet(e);
}
// THE DEVIL'S HOST (owner, 2026-11-05, the boss redesign: "Devil, spawns 1/2 wave worth of fast and 1/2 wave worth swarm scattered like
// swarm, when half are onscreen, spawn devils, same mechanic"): half a plain fast wave and half a plain swarm wave (typeWaveCount), mixed,
// stream in on the Devil's three lanes like a swarm wave (a bell of swarm gaps, no formations, wandering); the six devils (two a lane, a
// sixth of the lives each, the last pays) are HELD (devilGateShut) till half the host has been on screen - or died: a sim's boss skip
// kills them unseen. G.devilEsc: { n, total, seen }
const DEVIL_ESC = [["fast", 0.5], ["swarm", 0.5]];
function devilEscorts(lanes, n) {
  const list = [];
  for (const [k, mul] of DEVIL_ESC) for (let i = 0, c = Math.max(1, Math.round(typeWaveCount(k, n) * mul)); i < c; i++) list.push(k);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  G.devilEsc = { n, total: list.length, seen: 0 };
  const L = DEVIL_LANES, base = laneBestTurn(lanes.bonus, L, n, "bonus"), lane = { ...lanes, fast: lanes.bonus, swarm: lanes.bonus }, gap = 0.024 / ENEMY_SPEED;
  for (let j = 0; j < L; j++) {
    const part = list.filter((_, i) => i % L === j), ang = (base + (j / L) * Math.PI * 2) % (Math.PI * 2); if (!part.length) continue;
    G.spawns.push({ n, list: part, lanes: lane, ang, idx: 0, timer: 0, gaps: bellGaps(part.length, gap), kin: true, loose: true });
    const key = laneKey(lanes.bonus, ang); (G.laneTotals ||= {})[key] = (G.laneTotals[key] || 0) + part.length;
  }
}
// DEATH ON FIVE LANES (owner, 2026-11-09: "Death boss should have 5 lanes, 1 for each type, do not show lanes for non-boss"): her escort -
// FLEET_SCATTER.death's share of a plain wave of each type - walks one lane per type, each type on its own usual lane in its own formations,
// Death on hers; the four escort lanes walk UNLIT (no laneTotals: only her lane lights). Each body BOSS_HEFT tough and hers (bossKin) like
// any escort. Was (2026-11-05): scattered round her on her lane
function deathEscorts(lanes, n) {
  for (const [k, mul] of FLEET_SCATTER.death) {
    const list = Array(Math.max(1, Math.round(typeWaveCount(k, n) * mul))).fill(k), ang = laneBestTurn(lanes[k], 1, n, k);
    G.spawns.push({ n, list, lanes, ang, idx: 0, timer: 0, heft: true });
  }
}
const devilGateShut = w => !!(w.gate && G.devilEsc && G.devilEsc.n === w.n && G.devilEsc.seen < G.devilEsc.total / 2);
function devilCount(e) { if (e.devilEsc && !e.devilCounted && G.devilEsc) { e.devilCounted = true; G.devilEsc.seen++; } } // seen, or dead first
