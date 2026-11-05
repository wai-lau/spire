// /aspira - the WAVES' LANES (split out of aspira-waves.js 2026-11-05, the 500-line cap): which lane each enemy type of a wave rides
// (laneMap, TYPE_PAIR), the lanes live and soon (activeLanes, laneSoon), and the turn that keeps a lane on the screen (laneBestTurn,
// laneTurnScores, firstTurn). Same global scope; loaded right after aspira-waves.js (the simulator too, sim.mjs FILES).

// Each enemy TYPE rides ITS OWN spiral pair (owner, 2026-10-08: one speed for all, the
// spiral sets the pace - fast takes the most direct; turns solved per type, PAIR_TURNS
// in aspira-defs.js), always the pair's CLOCKWISE twin (EVERYTHING rides clockwise,
// owner 2026-10-05: the odd lane of a pair). So the entry still moves round the rim,
// each wave turns the whole set laneTurn(n) about the core (5 slots a wave, as the
// old (n*5 + k*7) % 12 rotation did) - the parts of a split group ride copies turned on from there.
// (Was: type k of wave n took lane (n*5 + k*7) % 12, each type at its own speed.)
const TYPE_PAIR = { fast: 4, bonus: 1, swarm: 2, shield: 3, armor: 0 }; // fast and armor SWAPPED (owner, 2026-10-12: "make fast use more windy paths, make armor use more direct paths"; fast took pair 0, the most direct, armor pair 4, the windiest)
const TYPE_ORDER = Object.keys(ENEMIES);
const laneTurn = n => ((n * 5) % N_PATHS) * 2 * Math.PI / N_PATHS;
function laneMap(n) {
  const out = {};
  for (const type of TYPE_ORDER) out[type] = 2 * TYPE_PAIR[type] + 1;
  if (n > 0 && n % STAR_EVERY === 0 && arcanaOf(n).id === "devil") out.bonus = DEVIL_PI; // the Devil's own, untwisted lane (aspira-defs.js)
  return out;
}

// Lanes in use right now (a live enemy on them), keyed by
// lane + rotation ("pi:ang"): { pi, ang, color, n, star, a } with the riding
// type's colour and its wave number; feeds the lane highlight and the
// wave:track labels in aspira-lanes.js. ang 0 is the lane itself, else a
// rotated copy. Brightness a = ALIVE / SENT on that lane (owner, 2026-10-02,
// replacing a timed fade): it fills in as the group spawns and drains as it
// dies, and the lane's count is forgotten once nothing is alive or queued.
const laneKey = (pi, ang) => pi + ":" + ang.toFixed(3);
// LANES BEFORE THEIR ENEMIES (owner, 2026-10-19: "show lanes a few seconds before the enemy spawns" / "except for bosses" / "don't
// delay the waves, just show the lanes early"): the last LANE_LEAD s of the countdown light the NEXT ordinary wave's lanes, fading
// in (laneSoon - the same lanes and turns sendWave will pick: wavePlan, formSplit and laneBestTurn are all fixed by the wave number)
const LANE_LEAD = 3;
function laneSoon() {
  const n = G.wave + 1;
  if (!G.started || G.over || !(G.nextIn > 0 && G.nextIn <= LANE_LEAD) || n % STAR_EVERY === 0 || G.wave % STAR_EVERY === 0 /* the wave after a boss: no early lanes (owner, 2026-10-24: "after boss wave, no need to show lanes early") */ || (typeof bossUp === "function" && bossUp())) return [];
  const p = wavePlan(n, G.lastType), pi = laneMap(n)[p.type], k = firstOne(n) ? 1 : Math.min(p.count, formSplit(p.type, p.count, n)), a = 1 - G.nextIn / LANE_LEAD;
  if (p.type === "swarm" && k - k % SWARM_MAIN > SWARM_MAIN) { const k3 = k - k % SWARM_MAIN, sz = swarmParts(p.count, k3); return swarmLanes(pi, k3, n).map((l, i) => ({ pi, ang: l.ang, color: ENEMIES.swarm.color, n, star: false, swarm: true, alive: 0, a, sent: sz[i] })).filter(u => u.sent > 0); } // (a lane that gets no one is no preview) // (the same three main lanes + the rest, each with its share of the swarm: sendWave)
  return Array.from({ length: k }, (_, j) => ({ pi, ang: (laneBestTurn(pi, k, n, p.type) + (j / k) * Math.PI * 2) % (Math.PI * 2), color: ENEMIES[p.type].color, n, star: false, swarm: p.type === "swarm", alive: 0, a }));
}
function activeLanes() {
  const out = new Map(), totals = G.laneTotals || {};
  // G.fleetQ too: a formation's rear (and a boss's fleet) waits there to walk in - it is sent, so it is on its lane. Left out, every group's
  // spawn dipped the lane to 1/m for the walk-in - a wave's lanes read bright/dim by which had a group entering (owner, 2026-10-26)
  for (const list of [G.enemies, G.fleetQ]) for (const e of list) {
    if (e.dead) continue;
    const key = laneKey(e.pi, e.ang || 0), u = out.get(key);
    if (u) { u.alive++; if (ENEMIES[e.type].star && !u.star) Object.assign(u, { star: true, color: ENEMIES[e.type].color }); } // a boss lane whichever rider comes first
    else out.set(key, { pi: e.pi, ang: e.ang || 0, color: ENEMIES[e.type].color, n: e.n, star: !!ENEMIES[e.type].star, swarm: e.type === "swarm", alive: 1 });
  }
  // A LANE IS LIT FROM THE MOMENT ITS WAVE IS SENT (owner, 2026-10-26: "lane previews disappear before lane appears, should just use those as
  // the lanes instead of spawning a second set"): its units still queued count as on it, so the preview (laneSoon) hands straight over at
  // full brightness and the lane drains as they die - not dark till the first unit is out, then 1/N (a boss's lane still waits for its sky)
  const queued = new Map();
  for (const w of G.spawns) for (let i = w.idx; i < w.list.length; i++) {
    const t = w.list[i], key = laneKey(w.lanes[t], w.ang || 0); queued.set(key, (queued.get(key) || 0) + 1);
    if (!out.has(key) && !ENEMIES[t].star) out.set(key, { pi: w.lanes[t], ang: w.ang || 0, color: ENEMIES[t].color, n: w.n, star: false, swarm: t === "swarm", alive: 0 });
  }
  for (const key in totals) if (!out.has(key) && !queued.has(key)) delete totals[key];
  for (const [key, u] of out) { const q = queued.get(key) || 0; u.sent = totals[key] || u.alive + q; u.a = Math.min(1, (u.alive + q) / u.sent); } // sent: a swarm lane's share of the swarm (litLanes)
  for (const u of laneSoon()) { const key = laneKey(u.pi, u.ang); if (!out.has(key)) out.set(key, u); } // the next wave's lanes, early
  return out;
}

// EVERY LANE TURNED TO THE SCREEN (owner, 2026-10-14: bosses first - "rotate them so that they stay on screen for as long as
// possible" - then "rotate all paths to maximize time on screen"), AND ITS COPIES EVENED OUT (landscape box): of LANE_TURNS
// turns of a group's lane (its k split copies with it), keep those whose copies' on-screen lengths differ least (spread =
// longest - shortest, within LANE_EVEN_SLACK of the biggest total); of those, the ones keeping within LANE_TURN_SLACK of the
// most lane on the screen (total) - and of those, the nearest the wave's usual turn, so the waves still come round from new
// directions. k = 1 has no spread, so it is just the old most-on-screen rule. Scores cached per lane and split.
// ONE PICK FOR BOTH VIEWS (owner, 2026-10-22: "all lanes should be the same orientation between the two views / just rotate them
// alongside the board"): scored on the PORTRAIT box in world units (BOX_SHORT x BOX_LONG round the core), never the screen - so the
// pick is the same on every device and view, and the landscape box gets it turned the box's quarter turn (laneBestTurn).
// The simulator (no screen) keeps laneTurn
const LANE_TURNS = 72, LANE_TURN_SLACK = 0.005, LANE_EVEN_SLACK = 0.02, laneTurnCache = new Map(); /* finer (owner, 2026-10-18: "the lanes are rotated about the core such that as much of it is visible as possible"): 5-degree turns, within 0.5% of the best (was 24 turns, 2%) */
const laneTurnKey = (pi, k) => pi + "|" + k, inPortraitBox = p => Math.abs(p.x - CX) <= BOX_SHORT && Math.abs(p.y - CY) <= BOX_LONG;
function laneTurnScores(pi, k) {
  const pts = PATHS[pi].pts, key = laneTurnKey(pi, k);
  let sc = laneTurnCache.get(key);
  if (sc) return sc;
  sc = [];
  for (let i = 0; i < LANE_TURNS; i++) {
    let total = 0, lo = Infinity, hi = 0, axis = null;
    for (let j = 0; j < k; j++) {
      const a = i / LANE_TURNS * Math.PI * 2 + (j / k) * Math.PI * 2;
      let prev = null, len = 0, entry = null;
      for (let q = 0; q < pts.length; q += 6) { const p = rotAbout(pts[q], a), on = inPortraitBox(p); if (on && !entry) entry = p; if (on && prev) len += Math.hypot(p.x - prev.x, p.y - prev.y); prev = on ? p : null; }
      total += len; lo = Math.min(lo, len); hi = Math.max(hi, len);
      const ax = !entry ? "" : Math.abs(entry.y - CY) > Math.abs(entry.x - CX) ? "v" : "h"; axis = axis === null || axis === ax ? ax : ""; // the side every copy comes on screen from: v top/bottom, h left/right, "" mixed
    }
    sc.push({ spread: hi - lo, total, axis });
  }
  laneTurnCache.set(key, sc);
  return sc;
}
/* PRE-WARMED (perf, 2026-10-16: each of the first waves scored 3-6 new lane / split pairs on the spot, ~10 ms each - a 60 ms hitch as a wave starts; 12 lanes x 6 splits in all): once the 3D view is up, a quiet timer scores the missing pairs a few ms at a time (the same pure scores, only earlier; it re-checks after a resize) */
(function laneTurnWarm() {
  if (typeof setTimeout !== "function" || typeof document === "undefined" || (typeof INSTANT_COINS !== "undefined" && INSTANT_COINS)) return;
  const tick = () => {
    if (typeof warp === "undefined" || !warp.p || document.hidden || typeof phoneInside !== "function") return setTimeout(tick, 1000); /* (warp: a later script's - looked up when the timer runs) */
    const t0 = performance.now();
    for (let pi = 0; pi < PATHS.length; pi++) for (let k = 1; k <= 6; k++) {
      if (laneTurnCache.has(laneTurnKey(pi, k))) continue;
      laneTurnScores(pi, k);
      if (performance.now() - t0 > 4) return setTimeout(tick, 150);
    }
    setTimeout(tick, 2000);
  };
  setTimeout(tick, 2000);
})();
// the game turns lanes to the screen (not the simulator's player, unless SIM_REAL_LANES - REAL_LANES=1)
const realLanes = () => !((typeof AUTO_POS !== "undefined" && AUTO_POS && !(typeof SIM_REAL_LANES !== "undefined" && SIM_REAL_LANES)) || typeof phoneInside !== "function");
// THE FIRST WAVE MEETS THE BUILD HINT (owner, 2026-10-21: "have the first fast wave come from the side that spends the most time within the
// tower with the build hint"): wave 1 rides ONE lane copy, turned so the most of it lies within the towers' mean reach of the hint's slot
// (the top-left open one - drawSlotArrow, aspira-chooser.js), among the turns that come onto the SCREEN through its TOP in portrait and
// its LEFT in landscape (owner, 2026-10-22: "in portrait from top / landscape from left" - wave 1 alone is not turned with the board)
const firstOne = n => n === 1 && realLanes(), firstTurnCache = new Map();
function hintCell() { let c = null; CELLS.forEach((cell, ci) => { if (cellOpen(ci) && (!c || cell.y < c.y - 1 || (Math.abs(cell.y - c.y) <= 1 && cell.x < c.x))) c = cell; }); return c; }
function screenSide(p) { // the screen edge a point just off the screen lies past (3D: in the view's pixels; past the horizon is the top)
  const side = (b, x, y) => { const dx = x < b.x0 ? b.x0 - x : x > b.x1 ? x - b.x1 : 0, dy = y < b.y0 ? b.y0 - y : y > b.y1 ? y - b.y1 : 0; return dy >= dx ? (y < b.y0 ? "top" : "bottom") : x < b.x0 ? "left" : "right"; };
  if (!phoneOn3d()) return side(phoneBox(), p.x, p.y);
  return fitView(() => viewCam(() => { const s = warpProject(p.x, p.y, 0); return s.s > 0 ? side(phoneRect3d(), s.x, s.y) : "top"; }));
}
function firstTurn(pi) {
  const c = hintCell(); if (!c) return null;
  const want = typeof BOX_WIDE !== "undefined" && BOX_WIDE ? "left" : "top", key = pi + "|" + want + "|" + innerWidth + "x" + innerHeight + "|" + c.x + "," + c.y;
  if (firstTurnCache.has(key)) return firstTurnCache.get(key); // (laneSoon asks every frame of the lead)
  const ks = Object.keys(TOWERS), R = ks.reduce((a, k) => a + TOWERS[k].range, 0) / ks.length * RANGE_BONUS, pts = PATHS[pi].pts;
  let best = null, bl = -1, any = 0, al = -1;
  for (let i = 0; i < LANE_TURNS; i++) {
    const a = i / LANE_TURNS * Math.PI * 2; let prev = null, len = 0, from = null, last = null;
    for (let q = 0; q < pts.length; q += 3) {
      const p = rotAbout(pts[q], a), on = Math.hypot(p.x - c.x, p.y - c.y) <= R;
      if (!from && phoneInside(p.x, p.y)) from = last ? screenSide(last) : "top"; last = p;
      if (on && prev) len += Math.hypot(p.x - prev.x, p.y - prev.y); prev = on ? p : null;
    }
    if (len > al) { al = len; any = a; }
    if (from === want && len > bl) { bl = len; best = a; }
  }
  firstTurnCache.set(key, best ?? any);
  return best ?? any;
}
// ARMOR DOWN THE LONG AXIS (owner, 2026-10-22: "for vertical screen, armour should come from top + bottom / for horizontal, sides"): an
// armor wave's turns are only those whose copies all come into the portrait box from its top/bottom (turned with the box, the sides in
// landscape); the rules above pick among them. Any turn when none qualifies
function laneBestTurn(pi, k, n, type) {
  const wide = typeof BOX_WIDE !== "undefined" && BOX_WIDE ? Math.PI / 2 : 0, base = laneTurn(n); // landscape = the portrait pick turned the box's quarter turn (rotAbout sense)
  if (!realLanes() || !PATHS[pi]) return base + wide;
  if (n === 1 && k === 1) { const f = firstTurn(pi); if (f !== null) return f; } // (the screen's own turn: not turned with the board)
  // THE SAME LANES AGAIN while they are still lit (owner, 2026-10-26: "lane previews disappear before lane appears, should just use those
  // as the lanes instead of spawning a second set"): two waves of one type in a row took turns 150 degrees apart, so the next wave's k
  // copies previewed BETWEEN the last wave's k still-lit ones - the same colour, alternating bright and faint round the board. If this
  // lane's k lit copies are up (the last wave's, k-fold), the next wave rides them
  { const lit = Object.keys(G.laneTotals || {}).filter(key => key.startsWith(pi + ":")).map(key => +key.split(":")[1]), per = Math.PI * 2 / k;
    if (lit.length === k && lit.every(a => Math.abs((((a - lit[0]) % per) + per) % per) < 1e-3 || Math.abs((((a - lit[0]) % per) + per) % per - per) < 1e-3)) return lit[0]; } // (the angle holds the box's quarter turn already)
  const all = laneTurnScores(pi, k), step = Math.PI * 2 / LANE_TURNS;
  const sc = type === "armor" && all.some(s => s.axis === "v") ? all.map(s => (s.axis === "v" ? s : { spread: Infinity, total: 0 })) : all; // (index = turn: the others kept as never-picks)
  const flat = Math.min(...sc.map(s => s.spread)) + LANE_EVEN_SLACK * Math.max(...sc.map(s => s.total)), even = sc.filter(s => s.spread <= flat);
  const best = Math.max(...even.map(s => s.total));
  let pick = base, gap = Infinity;
  sc.forEach((s, i) => { if (s.spread > flat || s.total < best * (1 - LANE_TURN_SLACK)) return; const t = i * step, d = Math.abs(((t - base) % (Math.PI * 2) + 3 * Math.PI) % (Math.PI * 2) - Math.PI); if (d < gap) { gap = d; pick = t; } });
  return pick + wide;
}
