// /aspira - the SIMULATOR'S PLAYER dragging towers (2026-10-10): in a real game the
// player drags them (aspira-camera.js) - or ticks AUTO-MOVE (autoGlide, below); the balance
// simulator turns AUTO_POS on, and each tower then jumps, every POS_EVERY s, to the spot
// in its leash that MAXIMISES ANTICIPATED HITS (it was the towers' own spoke-slider from
// 2026-10-04 to 2026-10-09). Loaded after aspira-towers.js (the simulator too).
//
// Each living enemy's path is predicted over the next POS_HORIZON s, sampled every
// POS_DT s along its lane - computed once and shared by every tower. A spot (POS_RINGS x
// POS_ANGLES points over the leash, plus the slot and where it stands) scores each
// predicted sample inside the tower's range, weighed by URGENCY (nearer the core counts
// more), by SOONER, and by the tower's own TARGETING (see bestSpot). It only jumps for a
// spot POS_SWITCH times better than where it stands. A drag is instant, so there is no
// travel time to weigh.
let AUTO_POS = false; // the simulator sets it
const POS_RINGS = [1 / 3, 2 / 3, 1], POS_ANGLES = 12;
const POS_SOON = 1; // s: a hit this far ahead counts 1/e as much
let POS_EVERY = 0.5, POS_HORIZON = 5, POS_DT = 0.5, POS_SWITCH = 1.1;
const POS_STALE = 0.2; // Fresh: what a debuffed enemy's hits are still worth
let POS_URGENCY = 6, POS_MODE_MIX = 1; // FULL targeting (owner: 0.3 barely counted); urgency 6 keeps the lives - swept u 3/6/10/20 x mix 0.3/1. let: the simulator sweeps both
let posPred = null, posPredAt = -1;
// [{ e, pts: [{ x, y, t }] }], recomputed at most once per POS_EVERY of game time
function predictions() {
  // fresh for a NEW GAME too (2026-10-08, owner: "towers stuck positionally"): G.clock restarts at 0, so
  // the last game's posPredAt left the clock "behind" it and the stale predictions (dead enemies) were kept
  if (posPred && posPred.G === G && G.clock >= posPredAt && G.clock - posPredAt < POS_EVERY / 2) return posPred;
  posPredAt = G.clock;
  posPred = [];
  posPred.G = G;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const v = effSpeed(e), pts = [];
    for (let t = 0; t <= POS_HORIZON + 1e-9; t += POS_DT) {
      const s = e.s + v * t, p = pathAt(e.pi, s, e.ang || 0);
      // URGENCY: a hit counts more the nearer that point is to the core (x1 at entry .. x7 at the core)
      // ... and SOONER counts more (owner, 2026-10-06: a tower sat waiting on far
      // future passes while it could reach the action now): x exp(-t / POS_SOON)
      pts.push({ x: p.x, y: p.y, t, w: (1 + POS_URGENCY * Math.min(1, s / PATHS[e.pi].len) ** 2) * Math.exp(-t / POS_SOON) });
    }
    posPred.push({ e, pts });
  }
  posPred.maxHp = Math.max(1, ...posPred.map(q => q.e.hp));
  return posPred;
}
// the spots a tower may jump to: rings over its leash, the slot, and where it stands - each made legal
function posSpots(t) {
  const c = CELLS[t.cell], L = leashR(t), out = [{ x: t.x, y: t.y }, { x: c.x, y: c.y }];
  for (const f of POS_RINGS) for (let k = 0; k < POS_ANGLES; k++) {
    const a = k * 2 * Math.PI / POS_ANGLES;
    out.push({ x: c.x + Math.cos(a) * L * f, y: c.y + Math.sin(a) * L * f });
  }
  return out.slice(0, 1).concat(out.slice(1).map(p => legalSpot(t, p)).filter(Boolean));
}
// where to jump, or null to stay (nothing alive, or nowhere clearly better)
function bestSpot(t, range) {
  const pred = predictions();
  if (!pred.length) return null;
  const spots = posSpots(t), r2 = range * range;
  // each enemy's hits weighed by the tower's TARGETING (owner): Biggest by its
  // HP against the biggest on the field, Fresh full for the undebuffed and
  // POS_STALE for the rest. NEAR is ABSOLUTE (owner, 2026-10-06): only the enemy
  // nearest the core counts - unless no spot reaches it, then every enemy does
  let f = pred.map(({ e }) => POS_MODE_MIX * (t.mode === "biggest" ? (e.arcana ? 1 : e.hp / pred.maxHp) : t.mode === "fresh" ? (debuffed(e) ? POS_STALE : 1) : 1) + 1 - POS_MODE_MIX);
  const all = f;
  if (t.mode === "close") {
    let ni = 0;
    pred.forEach(({ e }, i) => { if (coreD2(e) < coreD2(pred[ni].e)) ni = i; });
    f = pred.map((_, i) => (i === ni ? 1 : 0));
  }
  // NEAR: the same hits, each worth more the CLOSER it passes - only a tie-break
  // (a range covering the whole board scores every spot the same)
  // CULLED (2026-10-15, simulation speed): every spot lies within the leash of the slot (or where the tower stands), so a
  // predicted point farther than that + range can count for none of them - dropped once, the rest scored from flat arrays
  const c0 = CELLS[t.cell], reach = Math.max(leashR(t), Math.hypot(t.x - c0.x, t.y - c0.y)) + range + 1, xs = [], ys = [], ws = [], is = [], tsA = [];
  pred.forEach(({ pts }, i) => { for (const p of pts) if ((p.x - c0.x) ** 2 + (p.y - c0.y) ** 2 <= reach * reach) { xs.push(p.x); ys.push(p.y); ws.push(p.w); is.push(i); tsA.push(p.t); } });
  let wf = null, wfOf = null; // each point's weight x its enemy's targeting factor, made once a pass (f changes between passes)
  // GLIDE TIME (owner, 2026-10-16: "it also treats a move as instant (it was written when towers jumped) ... fix this"): a gliding
  // tower (auto-move, or the simulator's POS_GLIDE) reaches a spot only after its distance / HUMAN_V, so a hit predicted before
  // that counts for nothing there - a far spot pays only for what it catches once the tower has arrived
  const glide = POS_GLIDE || !AUTO_POS;
  const score = s => {
    if (wfOf !== f) { wfOf = f; wf = ws.map((w, k) => w * f[is[k]]); }
    const arrive = glide ? Math.hypot(s.x - t.x, s.y - t.y) / HUMAN_V : 0;
    let n = 0;
    for (let k = 0; k < xs.length; k++) if (tsA[k] >= arrive && (xs[k] - s.x) ** 2 + (ys[k] - s.y) ** 2 <= r2) n += wf[k];
    return n;
  };
  // NEAR only for a TIE (rare): the square roots it costs were paid for every spot (2026-10-15, simulation speed)
  const nearOf = s => { let m = 0; for (let k = 0; k < xs.length; k++) { const d2 = (xs[k] - s.x) ** 2 + (ys[k] - s.y) ** 2; if (d2 <= r2) m += wf[k] * (1 - Math.sqrt(d2) / range); } return m; };
  let best = null, bestScore = 0, bestNear = null;
  for (let pass = 0; pass < 2 && !bestScore; pass++) {
    if (pass) { if (f === all) break; f = all; }
    for (const s of spots) {
      const sc = score(s);
      if (sc > bestScore) { bestScore = sc; best = s; bestNear = null; }
      else if (sc === bestScore && sc > 0) { if (bestNear === null) bestNear = nearOf(best); const nn = nearOf(s); if (nn > bestNear) { best = s; bestNear = nn; } }
    }
  }
  // nothing in range: the spot CLOSEST to the action (owner, 2026-10-06)
  if (!bestScore) {
    let bd = Infinity;
    for (const s of spots) pred.forEach(({ pts }, i) => { if (f[i] > 0) for (const p of pts) { const d2 = (p.x - s.x) ** 2 + (p.y - s.y) ** 2; if (d2 < bd) { bd = d2; best = s; } } });
    return best;
  }
  // stay put unless the new spot is clearly better
  return score(spots[0]) * POS_SWITCH >= bestScore ? null : best;
}
// AUTO-MOVE (owner, 2026-10-13: "add an auto-move checkbox that uses the simulator movement, but limit the movement speed to
// something a human can process, i.e. avoid teleporting"): the simulator's choice of spot (bestSpot, every POS_EVERY s of
// game time), but the tower GLIDES there at up to HUMAN_V world units a game second (at 1x, so the eye can follow it). The checkbox: aspira-ui.js
let freeMode = false; // FREE towers and upgrades (freeBuild, aspira-defs.js): the same lifecycle as autoMove (G.freeMode)
let autoMove = false; // OFF on every new game (owner, 2026-10-17: "auto mode should default to off when starting a new game"; was remembered in
// localStorage) - kept on the game itself (G.autoMove), so a resumed run comes back as it was (runResume, aspira-autosave.js)
const HUMAN_V = 450; // a phone's width (500 units) in about a game second (x1.5, owner 2026-10-14: "increase auto-move speed by 1.5x"; was 300, halved 2026-10-13 from 600)
const GLIDE_TURNS = [0, 0.5, -0.5, 1, -1, 1.4, -1.4], GLIDE_GIVE_UP = 2; // radians off the straight line, tried in order
const GLIDE_ESCAPE = 4; // a tower caught overlapping glides out this many times faster (at the halved HUMAN_V one sat overlapped 42 frames - stuck.mjs)
// ROUND THE CORE (owner, 2026-10-16: a GRV left of the core never went for its target top right - "may have been stuck behind
// core?"): every step had to bring it NEARER its goal, and going round the core means stepping sideways first, so it gave up.
// When the straight line passes the core, it aims instead at a WAYPOINT on a circle round the core, GLIDE_ROUND radians further
// round toward the goal's side, until the line is clear
const GLIDE_ROUND = 0.6, GLIDE_CORE_PAD = 12;
function glideAround(t, g) {
  const kr = coreKeepR() + GLIDE_CORE_PAD, sx = g.x - t.x, sy = g.y - t.y, L2 = sx * sx + sy * sy || 1;
  const u = Math.max(0, Math.min(1, ((CX - t.x) * sx + (CY - t.y) * sy) / L2));
  if (Math.hypot(t.x + sx * u - CX, t.y + sy * u - CY) >= kr) return g; // a clear line: straight at it
  const a = Math.atan2(t.y - CY, t.x - CX), da = Math.atan2(Math.sin(Math.atan2(g.y - CY, g.x - CX) - a), Math.cos(Math.atan2(g.y - CY, g.x - CX) - a));
  const na = a + Math.sign(da || 1) * Math.min(Math.abs(da), GLIDE_ROUND), R = Math.max(kr, Math.hypot(t.x - CX, t.y - CY));
  return { x: CX + Math.cos(na) * R, y: CY + Math.sin(na) * R };
}
function autoGlide(t, dt) {
  // two towers gliding at once can each step clear of where the other WAS and end up overlapping (stuck.mjs found one): a
  // tower that cannot stay where it stands heads home to its slot first
  const caught = !legalSpot(t, t);
  if (!t.goal && caught) { t.goal = { x: CELLS[t.cell].x, y: CELLS[t.cell].y }; }
  if (POS_ONE && AUTO_POS) { if (!posOneTurn(t, dt) && !caught) return; }
  else {
    t.posT = (t.posT || 0) - dt;
    if (t.posT <= 0) { t.posT = POS_EVERY; const s = bestSpot(t, towerStats(t).range); if (s) t.goal = s; }
  }
  if (!t.goal || (typeof towerHeld === "function" && towerHeld(t)) || t.fling) return;
  // GAME time (owner, 2026-10-15: "auto-move at 10x should be 10x speed"): at a REAL-time pace a 10x game outran the towers
  // tenfold, and the simulator (no game speed) never saw it
  const dx = t.goal.x - t.x, dy = t.goal.y - t.y, d = Math.hypot(dx, dy), step = HUMAN_V * (caught ? GLIDE_ESCAPE : 1) * dt;
  if (d <= step) { moveTower(t, t.goal); t.goal = null; return; }
  // NEVER STUCK (owner, 2026-10-13: "ensure that the towers don't get stuck during simulations"): straight at it, else STEERED
  // round what is in the way (another tower, the core) - the first heading GLIDE_TURNS off the line that both moves it and
  // brings it nearer; none: the goal is dropped and the next plan waits GLIDE_GIVE_UP x POS_EVERY (a sim: 3-6% of steps stalled)
  const w = glideAround(t, t.goal), a0 = Math.atan2(w.y - t.y, w.x - t.x), dw = Math.hypot(w.x - t.x, w.y - t.y);
  for (const da of GLIDE_TURNS) {
    const s = legalSpot(t, { x: t.x + Math.cos(a0 + da) * step, y: t.y + Math.sin(a0 + da) * step });
    if (s && Math.hypot(s.x - t.x, s.y - t.y) > step * 0.3 && Math.hypot(w.x - s.x, w.y - s.y) < dw) { t.x = s.x; t.y = s.y; return; }
  }
  t.goal = null; t.posT = POS_EVERY * GLIDE_GIVE_UP;
}
// ONE AT A TIME (owner, 2026-10-28: "mimics human behaviour, only one tower checks/moves at a time round robin"): with
// POS_ONE the simulator's player has one pair of hands. The tower holding the TURN plans (bestSpot) as the turn reaches it,
// jumps there (or glides, POS_GLIDE), and passes the turn on (G.towers order) once it has arrived AND POS_EVERY has gone by.
// The rest stand still (a gliding tower caught overlapping still escapes). The HUMAN model is POS_EVERY 0.5 (owner, 2026-10-28:
// "it should check every 0.5s then / so each tower gets checked by a human every 1.5s" - three towers). Simulator only (AUTO_POS):
// a real auto-move tower may be skipped (not ascended, frozen) and would stall the turn. let: the simulator sweeps it
let POS_ONE = false;
// HUMAN AIM (owner, 2026-10-29: "jitter the destination by 50u (for human sims)"): the human's spot lands anywhere within POS_JITTER
// of the planned one (uniform over the disc, the seeded Math.random), nudged legal. 0 = exact (perfect). let: the simulator sets it
let POS_JITTER = 0;
const posJitter = s => {
  if (!(POS_JITTER > 0)) return s;
  const a = Math.random() * Math.PI * 2, r = POS_JITTER * Math.sqrt(Math.random());
  return { x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r };
};
function posOneTurn(t, dt) {
  const ts = G.towers;
  if (!ts.some(x => x.id === G.posTurn)) { G.posTurn = ts[0].id; G.posTurnT = 0; } // first turn, or its tower sold
  if (G.posTurn !== t.id) return false;
  if (G.posTurnT === 0) { const s = bestSpot(t, towerStats(t).range); if (s) t.goal = legalSpot(t, posJitter(s)) || s; }
  G.posTurnT += dt;
  if (!t.goal && G.posTurnT >= POS_EVERY) { G.posTurn = ts[(ts.indexOf(t) + 1) % ts.length].id; G.posTurnT = 0; }
  return true;
}
// the simulator's player, every step (aspira-step.js) - it TELEPORTS (owner, 2026-10-28: "when simulating, all moves should be
// teleports"; it glided like auto-move from 2026-10-13, "limit the tower movements to the current auto-move settings"). POS_GLIDE
// true brings the glide back. let: the simulator sets it
let POS_GLIDE = false;
function autoPosition(t, dt) {
  if (POS_GLIDE) { autoGlide(t, dt); return; }
  if (POS_ONE) { if (posOneTurn(t, dt) && t.goal) { moveTower(t, t.goal); t.goal = null; } return; } // its turn: plan, jump, hold the turn POS_EVERY
  t.posT = (t.posT || 0) - dt;
  if (t.posT > 0) return;
  t.posT = POS_EVERY;
  const s = bestSpot(t, towerStats(t).range);
  if (s) moveTower(t, s);
}

// THE PLAY BOX (owner, 2026-10-13: "draw a faint outline of the mobile screen with rounded corners on the map"): the view EVERY
// standard phone shares ("standardize the limit so that it works the same way on all standardish phones") - the tightest of
// PHONES at PHONE_ZOOM. The CORE IS CENTRED in it (owner, 2026-10-19; was 1.5 x as far from the top as the sides): BOX_SHORT
// either side of it across the short axis, BOX_LONG either side along the long one (world units; BOX_LONG keeps the old
// total height, halved). TWO SHAPES: portrait is BOX_SHORT wide x BOX_LONG tall (half-extents BOX_HX,
// BOX_HY), landscape the same box TURNED 90 degrees; setPlayBox(wide) picks one, and boxWanted() follows the window.
// EVERY screen zooms so the box fits it ("the zoom should be adjusted so that either the top and bottom touch, or the
// sides"), centred on the other axis (resize, aspira-draw.js); and it is the towers' MOVEMENT
// CAP ("the cap should be that the movement is within this range"): legalSpot (aspira-move.js)
// PHONES: [w, h] CSS px of the page in the browser (bars taken off), small Android to iPhone 15 Pro Max
const PHONES = [[360, 640], [375, 667], [390, 664], [393, 659], [412, 732], [430, 740]];
const BOX_SHORT = Math.min(...PHONES.map(([w]) => w / 2)) / PHONE_ZOOM;
const BOX_LONG = /* the 1.5 is the frozen old VIEW_UP_K */ (BOX_SHORT * 1.5 + Math.min(...PHONES.map(([w, h]) => h - 1.5 * w / 2)) / PHONE_ZOOM) / 2;
const PHONE_CORNER = 40 / PHONE_ZOOM, PHONE_ALPHA = 0.35 /* "less faint" (owner, 2026-10-13; was 0.15) */;
let BOX_HX = BOX_SHORT, BOX_HY = BOX_LONG, BOX_WIDE = false;
let phoneBoxC = null;
const boxWanted = () => innerWidth > innerHeight;
function setPlayBox(wide) { // the box's shape, and everything cached against it
  BOX_WIDE = !!wide; BOX_HX = wide ? BOX_LONG : BOX_SHORT; BOX_HY = wide ? BOX_SHORT : BOX_LONG;
  phoneBoxC = null;
  if (typeof laneTurnCache !== "undefined") laneTurnCache.clear();
  if (typeof resize === "function") { resize(); if (typeof fitK !== "undefined") fitK = cam.fit; }
  if (typeof turnSlots === "function") turnSlots(BOX_WIDE);
}
// THE SLOTS TURN WITH THE BOX (landscape = the portrait box turned +90 degrees about the core): each cell keeps its portrait
// x, y, pts (px, py, ppts) the first time; wide sets them turned, portrait restores them exactly. A built tower and its goal
// move with their slot (offset from the old slot spot, turned by the same quarter turn), then legalSpot if off the slot.
const quarter = (x, y, back) => back ? { x: CX + (y - CY), y: CY - (x - CX) } : { x: CX - (y - CY), y: CY + (x - CX) };
let slotsWide = false;
function turnSlots(wide) {
  wide = !!wide;
  if (wide === slotsWide) return;
  const old = CELLS.map(c => ({ x: c.x, y: c.y }));
  for (const c of CELLS) {
    if (c.px === undefined) { c.px = c.x; c.py = c.y; c.ppts = c.pts.map(p => ({ ...p })); }
    if (wide) { const q = quarter(c.px, c.py); c.x = q.x; c.y = q.y; c.pts = c.ppts.map(p => ({ ...p, x: p.x - c.px + q.x, y: p.y - c.py + q.y })); } // the SPOT turns, the hex does not: still point-up (owner, 2026-10-19: a turned hex laid the tower and its chart on their side)
    else { c.x = c.px; c.y = c.py; c.pts = c.ppts.map(p => ({ ...p })); }
    delete c.cornerOf; // aspira-chart.js's snapped corners, memoised on the cell: stale once it turns
    if (c.home) { c.home.x = c.x; c.home.y = c.y; c.home.pts = c.pts.map(p => ({ ...p })); } // pushCells (newGame) goes home to THIS shape
  }
  slotsWide = wide;
  if (typeof G !== "object" || !G || !G.towers) return;
  for (const t of G.towers) {
    const c0 = old[t.cell], c1 = CELLS[t.cell];
    if (!c0 || !c1) continue;
    const turn = o => { const dx = o.x - c0.x, dy = o.y - c0.y; return wide ? { x: c1.x - dy, y: c1.y + dx } : { x: c1.x + dy, y: c1.y - dx }; };
    if (t.goal) { const g = turn(t.goal); t.goal.x = g.x; t.goal.y = g.y; }
    const p = turn(t); t.x = p.x; t.y = p.y;
    if (typeof moveTower === "function") moveTower(t, t); // off the slot (a box edge, the core, a neighbour): the nearest legal spot
  }
}
// THE LANDSCAPE TILT (owner, 2026-10-19: "change the tilt between portrait and landscape so that the area on screen is the same"):
// the 3D play box is a SCREEN rectangle, so the floor it covers grows with the tilt. Portrait keeps WARP.tilt; wide solves tiltWide
// so boxFloorArea() matches portraitFloorGoal(). Every reader of the tilt goes through warpTilt().
const WARP_TILT_DEFAULT = 0.55, TILT_SETTLE_MS = 200, GRID_R = 900, TILT_MAX = 0.7;
// tiltSeen: the screen size last seen and since when; tiltSolved: the one tiltWide was solved for. A resize is solved once the
// size has held TILT_SETTLE_MS (the first solve at once), so a drag-resize keeps the last tilt meanwhile
let tiltWide = WARP_TILT_DEFAULT, tiltSeen = "", tiltSeenAt = 0, tiltSolved = "", tiltBusy = false;
function tiltCheck() { // wide only, from warpTilt (a frame: warpParams)
  if (tiltBusy || typeof warpParams !== "function" || typeof q3d !== "function" || !q3d()) return;
  const sc = warpScreenFull(), key = sc.w + "x" + sc.h, now = performance.now();
  if (key !== tiltSeen) { tiltSeen = key; tiltSeenAt = now; }
  if (key === tiltSolved || (tiltSolved !== "" && now - tiltSeenAt < TILT_SETTLE_MS)) return;
  fitTiltWide(key);
}
// LANDSCAPE'S PERSPECTIVE (owner, 2026-10-19: "when rotated the towers and enemies should stay the same size", with the floor area kept
// equal): the focal length from the screen's LONG side x WIDE_FOCAL_K, so a tower's height on a turned phone matches portrait's (60u tall:
// 38.8 px both, 844x390 vs 390x844; 1280x800 39.8) while fitTiltWide keeps the area (tilt ~0.565). From the short side it drew 16% shorter
const WIDE_FOCAL_K = 0.63;
function warpTilt() { // every reader of the tilt
  if (BOX_WIDE) tiltCheck();
  return BOX_WIDE ? tiltWide : WARP.tilt;
}
// the camera resize() would fit for a w x h window and this box, under the texture scale the 3D maths runs in
function fitCamFor(w, h) {
  const k = Math.min(w / (2 * BOX_HX), h / (2 * BOX_HY)), m = canvasDpr() * warpRes();
  cam.k = k * m; cam.ox = (w / 2 - CX * k) * m; cam.oy = (h / 2 - CY * k) * m;
}
// the floor the phone covers at the CURRENT tilt, under the FIT camera (not the live one, which a pinch can clamp off its fit): per
// column (step 40) the y span whose projection is on the phone (it is convex) - a coarse scan, then the two edges bisected - in
// cells of 20 x 20. Exact edges instead of counting points: a point count at this step is +-1% noise
function boxFloorArea() {
  const p0 = warp.p, f0 = warp.inFrame, h0 = fitHeld, c0 = { k: cam.k, ox: cam.ox, oy: cam.oy }, r = cv.getBoundingClientRect();
  const ins = (x, y) => phoneInside(x, y, 0, true);
  let sum = 0;
  try {
    fitHeld = true; fitCamFor(r.width, r.height); warp.inFrame = true; warp.p = warpParams(); // (fitHeld: this IS the fit camera - fitView keeps out)
    for (let x = CX - GRID_R; x <= CX + GRID_R; x += 40) {
      let first = -1, last = -1;
      for (let i = 0; i <= 30; i++) if (ins(x, CY - GRID_R + i * 60)) { if (first < 0) first = i; last = i; }
      if (first < 0) continue;
      const edge = (y0, y1) => { for (let j = 0; j < 6; j++) { const m = (y0 + y1) / 2; if (ins(x, m) === ins(x, y1)) y1 = m; else y0 = m; } return (y0 + y1) / 2; };
      const lo = first ? edge(CY - GRID_R + (first - 1) * 60, CY - GRID_R + first * 60) : CY - GRID_R;
      const hi = last < 30 ? edge(CY - GRID_R + last * 60, CY - GRID_R + (last + 1) * 60) : CY + GRID_R;
      sum += hi - lo;
    }
  } finally { fitHeld = h0; warp.inFrame = f0; warp.p = p0; Object.assign(cam, c0); }
  return sum * 40 / 400;
}
// THE GOAL, PER SCREEN: the floor area portrait would cover on THIS window held the other way (w and h swapped, the portrait box,
// the default tilt). Floor area depends on the screen's aspect, so no constant fits every screen. Inputs are swapped for one
// measurement and restored in the finally: cv's rect (warpScreen), the box, the shape (warpTilt)
function portraitFloorGoal() {
  const r = cv.getBoundingClientRect(), w = r.height, h = r.width, hx = BOX_HX, hy = BOX_HY, wide = BOX_WIDE;
  const own = Object.getOwnPropertyDescriptor(cv, "getBoundingClientRect");
  try {
    cv.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: w, height: h, right: w, bottom: h });
    BOX_WIDE = false; BOX_HX = BOX_SHORT; BOX_HY = BOX_LONG;
    return boxFloorArea();
  } finally {
    if (own) Object.defineProperty(cv, "getBoundingClientRect", own); else delete cv.getBoundingClientRect;
    BOX_WIDE = wide; BOX_HX = hx; BOX_HY = hy;
  }
}
// bisect tiltWide (area grows with tilt) to within 1% of the goal; warm from the last solve (a narrow bracket round it), the
// whole [0.2, TILT_MAX] if that misses. A throw leaves the last good tilt and the screen unsolved, so the next frame retries
function fitTiltWide(key) {
  const good = tiltWide;
  let ok = false;
  tiltBusy = true;
  try {
    const goal = portraitFloorGoal(), bisect = (lo, hi) => {
      for (let i = 0; i < 10; i++) {
        tiltWide = (lo + hi) / 2;
        const a = boxFloorArea();
        if (Math.abs(a - goal) <= goal * 0.01) return true;
        if (a > goal) hi = tiltWide; else lo = tiltWide;
      }
      return false;
    };
    if (!(tiltSolved !== "" && bisect(Math.max(0.2, good - 0.04), Math.min(TILT_MAX, good + 0.04)))) bisect(0.2, TILT_MAX);
    ok = true;
  } finally { tiltBusy = false; if (!ok) tiltWide = good; }
  tiltSolved = key;
  if (typeof laneTurnCache !== "undefined") laneTurnCache.clear(); // the lane turns were scored under the old view
  if (typeof starAt !== "undefined") starAt.k = NaN; // so were the cached star spots
}
function phoneBox() { // 2D: world units (fixed per shape: made once - legalSpot asks for it thousands of times a second in a simulation)
  return (phoneBoxC ||= { x0: CX - BOX_HX, y0: CY - BOX_HY, x1: CX + BOX_HX, y1: CY + BOX_HY, r: PHONE_CORNER });
}
// in 3D it is a SCREEN rectangle (owner, 2026-10-13: "it should be rectangular not trapezoidal"), not a box on the floor: the
// same rectangle on screen as 2D's (it fits the window), in the 3D view's pixels (under the texture camera);
// a spot is on the phone when it PROJECTS inside
const phoneOn3d = () => typeof q3d === "function" && q3d() && typeof warp !== "undefined" && !!warp.p;
function viewCam(fn) { // the 3D maths runs under the texture camera (warp3d sets warp.inFrame); outside a frame scale to it
  if (warp.inFrame) return fn();
  const c0 = { k: cam.k, ox: cam.ox, oy: cam.oy };
  cam.k *= warpRes(); cam.ox *= warpRes(); cam.oy *= warpRes();
  try { return fn(); } finally { Object.assign(cam, c0); }
}
// THE GAMEPLAY BOX IGNORES THE ZOOM (desktop zoom, owner 2026-10-19: "with the same limiting borders"): the box is the FIT view's
// screen rectangle, so every gameplay test of it (phoneInside: enemySeen, legalSpot, flings, lane turns, the boss bar) runs under the
// fit camera (zoom 1, the texture scale) and its params warp.pFit - made once per warp.p (a frame), never per call: phoneInside runs
// thousands of times a second. Every swap restored in the finally. fitHeld: boxFloorArea already set the fit camera up itself
let fitHeld = false;
function fitView(fn) {
  if (fitHeld || typeof viewZoom === "undefined" || viewZoom === 1) return fn();
  const k = cam.k, ox = cam.ox, oy = cam.oy, p0 = warp.p, f0 = warp.inFrame, m = warpRes();
  fitHeld = true;
  try {
    cam.k = cam.fit * m; cam.ox = cam.fitOx * m; cam.oy = cam.fitOy * m; warp.inFrame = true;
    if (warp.pFitFor !== p0) { warp.pFit = warpParams(); warp.pFitFor = p0; }
    warp.p = warp.pFit;
    return fn();
  } finally { fitHeld = false; cam.k = k; cam.ox = ox; cam.oy = oy; warp.p = p0; warp.inFrame = f0; }
}
// a view pixel back to the world spot on the FLOOR (height 0) seen there: warpProject(x, y, 0)'s inverse; null above the horizon
function floorAt(sx, sy) {
  const p = warp.p, u = (sx - p.core[0]) / (p.z * p.f), v = (sy - p.core[1] - p.oy) / (p.z * p.f), d = p.c + v * p.s;
  if (d <= 1e-9) return null;
  const py = v * p.f / d, px = u * (p.f - p.s * py), r = Math.hypot(px, py), m = r ? warpUnview(p, r) / r : 1 / p.hc;
  return { x: (p.core[0] + px * m - cam.ox) / cam.k, y: (p.core[1] + py * m - cam.oy) / cam.k };
}
function phoneRect3d() { // 3D: the view's pixels (call under viewCam) - the SAME screen rectangle as 2D's, so it fits the window too
  const k = cam.k;
  return { x0: cam.ox + (CX - BOX_HX) * k, y0: cam.oy + (CY - BOX_HY) * k, x1: cam.ox + (CX + BOX_HX) * k, y1: cam.oy + (CY + BOX_HY) * k, r: PHONE_CORNER * k };
}
// OFF-SCREEN = UNTOUCHABLE (owner, 2026-10-17: "untargetable and completely immune to effects or damage until they are within the screen
// area"): e.seen latches on the phone's screen (phoneInside); every enemy loop, damage and applySlow test it
// BY ITS LANE, NOT ITS BODY (owner, 2026-10-23: "Off-screeness should be determined by lane offscreeness not unit"): the lane's point at
// the unit's distance along it (pathAt) - a formation's sideways offset no longer brings a flank unit on screen early, or late
const enemySeen = e => { if (typeof phoneInside !== "function") return true; const p = e.pi != null ? pathAt(e.pi, e.s, e.ang || 0) : e; return phoneInside(p.x, p.y); };
// is (x, y) on the phone, `inset` world units clear of its edge?
function phoneInside(x, y, inset = 0, on3d = phoneOn3d()) { // on3d: asked once by a caller testing many points (legalSpot - perf)
  if (!on3d) { const b = phoneBox(); return x >= b.x0 + inset && x <= b.x1 - inset && y >= b.y0 + inset && y <= b.y1 - inset; }
  return fitView(() => viewCam(() => { // (fitView: the gameplay box is the FIT view's at any zoom)
    const b = phoneRect3d(), p = warpProject(x, y, 0), e = inset * cam.k;
    return p.s > 0 && p.x >= b.x0 + e && p.x <= b.x1 - e && p.y >= b.y0 + e && p.y <= b.y1 - e;
  }));
}

// OUT OF REACH = OFF SCREEN (owner, 2026-10-19: "enemy speed should also be 3x when outside of mvmt+range of all towers"): an enemy no
// tower could touch - beyond every tower's movement range + its range, measured from the slot it was built on - moves at
// OFF_SCREEN_SPEED like an unseen one (stepEnemies, aspira-step.js). The circles are worked out once a step
const reachCircles = () => G.towers.map(t => { const c = CELLS[t.cell] || t, R = leashR(t) + towerStats(t).range; return [c.x, c.y, R * R]; });
const inReach = (e, reach) => reach.some(([x, y, r2]) => (e.x - x) ** 2 + (e.y - y) ** 2 <= r2);
// THE BOX SWITCHES BETWEEN WAVES ONLY: a resize/rotation just sets boxPending; boxSwitchIfIdle (before each step of the frame loop, aspira-ui.js: a clear field lasts one step, the next wave
// goes at once; plus a 250 ms timer for a paused game - never step(), the simulator must not see it) applies it once the field is clear and no lane is lit (or before the run starts)
let boxPending = null;
function boxSwitchIfIdle() {
  if (boxPending === null) return;
  if (boxPending === BOX_WIDE) { boxPending = null; return; }
  if (typeof G === "object" && G && G.started && !(waveClear() && !laneSoon().length)) return; // (a lit preview over a clear field is unreachable since the 2026-10-24 laneSoon rule - a clear field sends at once; test_no_switch_mid_wave covers the rest)
  const w = boxPending; boxPending = null; setPlayBox(w);
}
if (typeof addEventListener === "function") {
  addEventListener("resize", () => { boxPending = boxWanted(); });
  setInterval(boxSwitchIfIdle, 250);
}
setPlayBox(boxWanted()); // once, as this loads: before any draw, before runOffer
