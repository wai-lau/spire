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
const POS_HORIZON_SET = h => { POS_HORIZON = h; }; // (the simulator sweeps it)
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
  t.posT = (t.posT || 0) - dt;
  if (t.posT <= 0) { t.posT = POS_EVERY; const s = bestSpot(t, towerStats(t).range); if (s) t.goal = s; }
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
// the simulator's player, every step (aspira-game.js) - GLIDING like auto-move when POS_GLIDE (owner, 2026-10-13: "limit the
// tower movements to the current auto-move settings"; it jumped). let: the simulator sets it
let POS_GLIDE = true;
function autoPosition(t, dt) {
  if (POS_GLIDE) { autoGlide(t, dt); return; }
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
// total height, VIEW_UP + VIEW_DOWN, halved). TWO SHAPES: portrait is BOX_SHORT wide x BOX_LONG tall (half-extents BOX_HX,
// BOX_HY), landscape the same box TURNED 90 degrees; setPlayBox(wide) picks one, and boxWanted() follows the window.
// EVERY screen zooms so the box fits it ("the zoom should be adjusted so that either the top and bottom touch, or the
// sides"), centred on the other axis (resize, aspira-draw.js); and it is the towers' MOVEMENT
// CAP ("the cap should be that the movement is within this range"): legalSpot (aspira-towers.js)
// PHONES: [w, h] CSS px of the page in the browser (bars taken off), small Android to iPhone 15 Pro Max
const PHONES = [[360, 640], [375, 667], [390, 664], [393, 659], [412, 732], [430, 740]];
const BOX_SHORT = Math.min(...PHONES.map(([w]) => w / 2)) / PHONE_ZOOM;
const BOX_LONG = (BOX_SHORT * 1.5 + Math.min(...PHONES.map(([w, h]) => h - 1.5 * w / 2)) / PHONE_ZOOM) / 2;
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
function phoneRect3d() { // 3D: the view's pixels (call under viewCam) - the SAME screen rectangle as 2D's, so it fits the window too
  const k = cam.k;
  return { x0: cam.ox + (CX - BOX_HX) * k, y0: cam.oy + (CY - BOX_HY) * k, x1: cam.ox + (CX + BOX_HX) * k, y1: cam.oy + (CY + BOX_HY) * k, r: PHONE_CORNER * k };
}
// OFF-SCREEN = UNTOUCHABLE (owner, 2026-10-17: "untargetable and completely immune to effects or damage until they are within the screen
// area"): e.seen latches on the phone's screen (phoneInside); every enemy loop, damage and applySlow test it
const enemySeen = e => typeof phoneInside !== "function" || phoneInside(e.x, e.y);
// is (x, y) on the phone, `inset` world units clear of its edge?
function phoneInside(x, y, inset = 0, on3d = phoneOn3d()) { // on3d: asked once by a caller testing many points (legalSpot - perf)
  if (!on3d) { const b = phoneBox(); return x >= b.x0 + inset && x <= b.x1 - inset && y >= b.y0 + inset && y <= b.y1 - inset; }
  return viewCam(() => {
    const b = phoneRect3d(), p = warpProject(x, y, 0), e = inset * cam.k;
    return p.s > 0 && p.x >= b.x0 + e && p.x <= b.x1 - e && p.y >= b.y0 + e && p.y <= b.y1 - e;
  });
}

// OUT OF REACH = OFF SCREEN (owner, 2026-10-19: "enemy speed should also be 3x when outside of mvmt+range of all towers"): an enemy no
// tower could touch - beyond every tower's movement range + its range, measured from the slot it was built on - moves at
// OFF_SCREEN_SPEED like an unseen one (stepEnemies, aspira-game.js). The circles are worked out once a step
const reachCircles = () => G.towers.map(t => { const c = CELLS[t.cell] || t, R = leashR(t) + towerStats(t).range; return [c.x, c.y, R * R]; });
const inReach = (e, reach) => reach.some(([x, y, r2]) => (e.x - x) ** 2 + (e.y - y) ** 2 <= r2);
setPlayBox(boxWanted()); // once, as this loads: before any draw, before runOffer
