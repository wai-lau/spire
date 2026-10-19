// /aspira — the view: zoom in and drag to look around (owner). Loads after
// aspira-draw.js (which fits `cam` to the window in resize) and before
// aspira-ui.js (whose onTap this calls).
//
// THE VIEW IS FIXED (owner, 2026-10-11): no zoom (it fits the play box - resize, aspira-draw.js; a desktop's wheel zooms since 2026-10-19, below) and no pan
// ("don't allow camera pan either") - a drag on open board does nothing; a drag on a tower moves it. A press that moves less than DRAG_PX is a TAP and goes
// to onTap (select / place); the core is kept on screen. Double-click /
// double-tap recentres.
const DRAG_PX = 6;
const ptrs = new Map(); // pointerId -> { x, y } in device pixels
let fitK = 0, dragged = false, downAt = null, pinch = null;
// THE CORE'S POWER GESTURES (owner, 2026-10-06; aspira-core.js), only once the
// power is owned - otherwise a drag pans and a press taps, as ever:
//   press and HOLD the core HOLD_MS -> Temporal's freeze
//   drag from the CORE onto a tower -> the Orbital Relay: it acts as three
// ui.drag = { kind: "core" | "tower", t, from, at } while one is held (drawn by drawCoreFx)
// DRAGGING A TOWER (owner, 2026-10-10): a press on a tower and a drag MOVES it - it follows the
// finger, firing all the while, held to its leash (moveTower, aspira-towers.js); ui.drag = { kind:
// "move", t, dx, dy } (the grab's offset, so the tower does not jump to the fingertip). A short
// press is still a tap (its card). Not while placing or with the Relay armed - those taps pick.
// a held finger always wobbles: the hold survives HOLD_SLOP css px of drift
// (owner: hold did nothing on a phone - DRAG_PX 6 was too tight for a thumb)
const HOLD_MS = 400, CORE_GRAB = 1.8, HOLD_SLOP = 18; // the core grabs within CORE_GRAB x its radius
let holdTimer = 0, holdFired = false, holdMoved = false;
function grabPower(ev) {
  if (!G.core) return grabTower(ev); // a power is owned only once a boss handed it out (pickPower), so the levels below are the gate
  const w = toWorld(ev), pk = pickAt(ev), onCore = (pk && pk.core) || (!(pk && pk.t) && Math.hypot(w.x - CX, w.y - CY) <= CORE_R * CORE_GRAB);
  // only a power that is READY grabs (owner, 2026-10-07: no drag line for an
  // Overcharge still cooling down); otherwise the press pans and taps as ever
  const ready = id => powerLvl(id) && !cooldownLeft(id), rel = ready("relay");
  if (onCore && (ready("temporal") || rel)) {
    if (ready("temporal")) holdTimer = setTimeout(() => {
      if (ui.drag && ui.drag.kind === "core" && !holdMoved && temporalFreeze()) { holdFired = true; ui.drag = null; refreshPanels(); }
    }, HOLD_MS);
    return { kind: "core", from: { x: CX, y: CY }, at: null, drop: rel }; // drop: the drag line shows (drawCoreFx)
  }
  return grabTower(ev);
}
// towers STAY PUT while the game is paused or the boss sky turns over (owner, 2026-10-12: "no tower movement during game pause
// and inversion change"): no grab, no drag, no coasting (stepFlings)
const towersFrozen = () => ui.paused || (G.started && typeof skyTurning === "function" && skyTurning());
function grabTower(ev) {
  const w = toWorld(ev), t = !ui.build && !ui.relayArm && !towersFrozen() && pickTower(ev);
  return t ? { kind: "move", t, dx: t.x - w.x, dy: t.y - w.y } : null;
}
// a power drag let go: the Relay on the tower under it
function dropPower(d) {
  if (!d.at) return;
  if (d.kind === "core" && powerLvl("relay")) relay(pickTower(d.ev));
  refreshPanels();
}

function devXY(ev) {
  const r = cv.getBoundingClientRect(), dpr = canvasDpr();
  return { x: (ev.clientX - r.left) * dpr, y: (ev.clientY - r.top) * dpr };
}
// keep the core (the chart's centre) somewhere on the canvas
function clampView() {
  const cx = cam.ox + CX * cam.k, cy = cam.oy + CY * cam.k;
  const { w, h } = warpScreenFull(); // (the canvas is the picture's square)
  cam.ox += Math.max(0, Math.min(w, cx)) - cx;
  cam.oy += Math.max(0, Math.min(h, cy)) - cy;
}
function refit() { resize(); fitK = cam.fit; }

// THE WHEEL ZOOMS on a desktop (ZOOM_WHEEL, aspira-draw.js; owner, 2026-10-19): ~10% a mouse notch (100 px), smooth on a trackpad,
// shown in steps of ZOOM_STEP (each new scale redraws the tower sprites), clamped to [ZOOM_MIN, ZOOM_MAX]; about the core, never the
// cursor (no pan). The page never scrolls
const ZOOM_PER_PX = 0.001, ZOOM_STEP = 0.05;
let zoomRaw = viewZoom;
cv.addEventListener("wheel", ev => {
  ev.preventDefault();
  if (!ZOOM_WHEEL) return;
  const dy = ev.deltaY * (ev.deltaMode === 1 ? 33 : ev.deltaMode === 2 ? 800 : 1); // lines / pages to px
  zoomRaw = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRaw * Math.exp(-dy * ZOOM_PER_PX)));
  const z = Math.round(zoomRaw / ZOOM_STEP) * ZOOM_STEP;
  if (Math.abs(z - viewZoom) > 1e-9) { viewZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +z.toFixed(4))); zoomApply(); }
}, { passive: false });

// TWO TOWERS AT ONCE (owner, 2026-10-11: "now that zoom is fixed, allow moving two towers at once"): every finger that
// lands on a tower holds that tower (moves: pointerId -> { t, dx, dy, down, dragged }), each following its own finger;
// two fingers on open board still pan. ui.drag stays the FIRST finger's grab (a power, or a move) for everything else.
const moves = new Map();
const towerHeld = t => [...moves.values()].some(m => m.t === t); // (drawLeash / the held tower's look, aspira-towers.js)
cv.addEventListener("pointerdown", ev => {
  if (!fitK) fitK = cam.fit;
  cv.setPointerCapture(ev.pointerId);
  ptrs.set(ev.pointerId, devXY(ev));
  if (ptrs.size === 1) { dragged = false; downAt = devXY(ev); holdFired = holdMoved = false; ui.drag = grabPower(ev); if (ui.drag && ui.drag.kind === "move") { ui.drag.t.fling = null; moves.set(ev.pointerId, { ...ui.drag, down: devXY(ev), dragged: false }); } }
  if (ptrs.size === 2 && (moves.size || pickTower(ev))) { // a second tower in the other hand - never a pinch
    const g = grabTower(ev);
    if (g && !towerHeld(g.t)) { g.t.fling = null; moves.set(ev.pointerId, { ...g, down: devXY(ev), dragged: false }); }
    dragged = true; // two fingers never end in a tap
    return;
  }
  if (ptrs.size === 2) {
    clearTimeout(holdTimer); ui.drag = null; // a pinch is never a power gesture
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    dragged = true; // a pinch never ends in a tap
  }
});
cv.addEventListener("pointermove", ev => {
  ui.hover = toWorld(ev);
  if (!ptrs.has(ev.pointerId)) return;
  const prev = ptrs.get(ev.pointerId), now = devXY(ev);
  ptrs.set(ev.pointerId, now);
  const mv = moves.get(ev.pointerId);
  if (mv) { // this finger holds a tower: it follows the finger, held to its leash (moveTower), no pan
    if (!mv.dragged && Math.hypot(now.x - mv.down.x, now.y - mv.down.y) > DRAG_PX * canvasDpr()) mv.dragged = dragged = true;
    if (mv.dragged && !towersFrozen()) { const w = toWorld(ev); moveTower(mv.t, { x: w.x + mv.dx, y: w.y + mv.dy }); flingTrack(mv); }
    return;
  }
  if (moves.size) return; // the other finger holds a tower: this one does nothing
  if (ptrs.size >= 2 && pinch) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    pinch = { d, m }; // (no pan: the view is fixed)
    return;
  }
  const dpr = canvasDpr();
  if (!dragged && Math.hypot(now.x - downAt.x, now.y - downAt.y) > DRAG_PX * dpr) dragged = true;
  if (ui.drag) { // a power drag: no pan; the hold only breaks past HOLD_SLOP
    if (Math.hypot(now.x - downAt.x, now.y - downAt.y) > HOLD_SLOP * dpr) { holdMoved = true; clearTimeout(holdTimer); }
    if (dragged) { ui.drag.at = toWorld(ev); ui.drag.ev = { clientX: ev.clientX, clientY: ev.clientY }; }
    return;
  }
  // (a drag on open board does nothing: NO PAN - owner, 2026-10-11: "don't allow camera pan either")
});
function endPointer(ev, tap) {
  if (!ptrs.has(ev.pointerId)) return;
  ptrs.delete(ev.pointerId);
  if (ptrs.size < 2) pinch = null;
  const mv = moves.get(ev.pointerId);
  moves.delete(ev.pointerId);
  if (mv) { // a held tower let go
    if (ui.drag && ui.drag.t === mv.t) ui.drag = null;
    if (mv.dragged) flingRelease(mv);
    if (tap && !ptrs.size && !mv.dragged && !dragged) onTap(ev); // a press without a drag: its card
    return;
  }
  clearTimeout(holdTimer);
  const d = ui.drag;
  ui.drag = null;
  if (d && d.kind === "move") return;
  if (holdFired) { holdFired = false; return; } // the hold already froze: no tap
  if (d && holdMoved) { if (tap) dropPower(d); return; }
  if (d && !holdMoved) { if (tap && !ptrs.size) onTap(ev); return; } // a short wobble on a grab is still a TAP
  if (tap && !ptrs.size && !dragged) onTap(ev);
}
cv.addEventListener("pointerup", ev => endPointer(ev, true));
cv.addEventListener("pointercancel", ev => endPointer(ev, false));
cv.addEventListener("pointerleave", () => { if (!ptrs.size) ui.hover = null; });
cv.addEventListener("dblclick", refit); // (with zoom and pan fixed, only a stale view needs it)
// iOS: a long press would open the callout / magnifier / a text selection and
// CANCEL the pointer (owner: the core's hold and drags were finicky) - so the
// canvas swallows the touch itself; pointer events still arrive
cv.addEventListener("contextmenu", ev => ev.preventDefault());
cv.addEventListener("touchstart", ev => ev.preventDefault(), { passive: false });
cv.addEventListener("selectstart", ev => ev.preventDefault());
// THE CURSOR SHOWS ON ANY SKY (owner, 2026-10-12: "during boss, cannot see cursor" - the system crosshair vanished on the
// inverted boss sky): a crosshair of the light line laid over a dark outline, both from the palette (COL), so one of the
// two always stands out; the system crosshair is the fallback. ui.js calls it once the palette is read
function contrastCursor() {
  const line = (c, w) => `<path d="M12 2v8M12 14v8M2 12h8M14 12h8" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">${line(COL.bg, 4)}${line(COL.white, 1.6)}</svg>`;
  cv.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`;
}

// the phone's screen box and the cap it sets live in aspira-positioning.js (the simulator loads that one); here its drawing
const phonePath = (c, b) => { c.beginPath(); c.roundRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, b.r); };
// ONLY NEAR ITS EDGE (owner, 2026-10-13: "only show mobile outline when tower is near edge (like 20 units)"): shown while a tower
// stands within PHONE_NEAR world units of the furthest it may go (legalSpot's edge), easing in and out over PHONE_FADE s (real)
// ...and only an edge that HOLDS A TOWER BACK FOR NO REASON (owner, 2026-10-14: "don't show mobile phone outline when near edge
// that is already at edge of screen, only show when tower movement appears to be needlessly blocked"): an edge of the box INSIDE
// this screen, a tower near it - drawn as THREE thin lines, fainter inward ("increasing in opacity as you reach the exterior one")
const PHONE_NEAR = 20, PHONE_FADE = 0.25, PHONE_WALL_A = [0.3, 0.6, 1], PHONE_WALL_GAP = 4, PHONE_WALL_W = 0.75; // GAP, W: screen px
let phoneShow = 0, phoneAt = 0, phoneLast = [];
// the box's edges (l r t b) to show: b the box, the towers' spots and near in one space; open from boxOpen (S the screen, m an in-screen margin)
const boxOpen = (b, S, m) => ({ l: b.x0 > S.x0 + m, r: b.x1 < S.x1 - m, t: b.y0 > S.y0 + m, b: b.y1 < S.y1 - m });
function phoneWalls(b, open, pts, near) { // open: the edges inside the screen (boxOpen); pts: the towers' spots
  const out = new Set();
  for (const p of pts) {
    if (open.l && p.x - b.x0 < near) out.add("l"); if (open.r && b.x1 - p.x < near) out.add("r");
    if (open.t && p.y - b.y0 < near) out.add("t"); if (open.b && b.y1 - p.y < near) out.add("b");
  }
  return [...out];
}
function phoneFrameAlpha(walls) {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (phoneAt || now));
  phoneAt = now;
  if (walls.length) phoneLast = walls; // (fading out, the last ones shown)
  phoneShow = Math.max(0, Math.min(1, phoneShow + (walls.length ? 1 : -1) * dt / PHONE_FADE));
  return PHONE_ALPHA * phoneShow;
}
// one wall's line, d in from its edge, as [x0, y0, x1, y1] in b's space
const wallLine = (b, w, d) => w === "l" ? [b.x0 + d, b.y0, b.x0 + d, b.y1] : w === "r" ? [b.x1 - d, b.y0, b.x1 - d, b.y1] : w === "t" ? [b.x0, b.y0 + d, b.x1, b.y0 + d] : [b.x0, b.y1 - d, b.x1, b.y1 - d];
// map: b's space -> c's (the zoomed view: each line bent through it in PHONE_BENT pieces, a point it cannot place breaking the line)
const PHONE_BENT = 16;
function drawPhoneWalls(c, b, a, px, map) { // px: one screen px in c's units
  c.save(); c.strokeStyle = COL.white; c.lineWidth = PHONE_WALL_W * px; c.lineCap = "butt";
  PHONE_WALL_A.forEach((k, i) => {
    const d = (PHONE_WALL_A.length - 1 - i) * PHONE_WALL_GAP * px; // the faintest innermost, the strongest ON the edge
    c.globalAlpha = a * k; c.beginPath();
    for (const w of phoneLast) {
      const [x0, y0, x1, y1] = wallLine(b, w, d);
      if (!map) { c.moveTo(x0, y0); c.lineTo(x1, y1); continue; }
      let on = false;
      for (let j = 0; j <= PHONE_BENT; j++) { const q = map(x0 + (x1 - x0) * j / PHONE_BENT, y0 + (y1 - y0) * j / PHONE_BENT); if (!q) { on = false; continue; } if (on) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); on = true; }
    }
    c.stroke();
  });
  c.restore();
}
// ZOOMED (desktop zoom, aspira-draw.js): the outline is the GAMEPLAY box - the fit view's screen rectangle (fitView) - as its floor
// footprint seen through the zoomed view: smaller than the screen zoomed out, partly off it zoomed in. fitMap: a fit-view pixel to
// this view's, through the floor (floorAt under the fit, warpProject under this view)
const fitMap = (x, y) => { const f = fitView(() => floorAt(x, y)); return f && warpProject(f.x, f.y, 0); };
const phoneOutline3d = () => viewCam(() => { const b = fitView(phoneRect3d); return [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([x, y]) => fitMap(x, y)); }); // the corners (a test reads it)
function drawPhoneFrame3d() { // in warpEntities, under the texture camera, before the boss sky's flip: over the view, square to the screen
  const g = warp.ent.getContext("2d"), px = canvasDpr() * warpRes(), S = { x0: 0, y0: 0, x1: warp.ent.width, y1: warp.ent.height };
  const zoomed = typeof viewZoom !== "undefined" && viewZoom !== 1;
  // the box, the towers and near all in the FIT view's pixels; the open edges are those whose middle shows inside THIS screen
  const [b, near, pos] = fitView(() => [phoneRect3d(), (CELL_S * TOWER_K + MOVE_EDGE + PHONE_NEAR) * cam.k, G.towers.map(t => warpProject(t.x, t.y, 0))]);
  let open = boxOpen(b, S, 6 * px);
  if (zoomed) {
    const mid = { l: [b.x0, (b.y0 + b.y1) / 2], r: [b.x1, (b.y0 + b.y1) / 2], t: [(b.x0 + b.x1) / 2, b.y0], b: [(b.x0 + b.x1) / 2, b.y1] }, m = 6 * px;
    open = {};
    for (const w in mid) { const q = fitMap(...mid[w]); open[w] = !!q && q.x > m && q.x < S.x1 - m && q.y > m && q.y < S.y1 - m; }
  }
  const a = phoneFrameAlpha(phoneWalls(b, open, pos, near));
  if (!a) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); drawPhoneWalls(g, b, a, px, zoomed ? fitMap : null); g.restore();
}
// 3D: the LEASH RINGS (drawLeash, aspira-towers.js) on the screen layer - the floor circle's points projected, dashed in screen
// px so every dash is the same on the sides as in front. In warpEntities, under the texture camera, beside drawPhoneFrame3d
function drawLeashRings3d() {
  const rings = warp.leashRings;
  if (!rings || !rings.length) return;
  const g = warp.ent.getContext("2d"), px = canvasDpr() * warpRes();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.lineWidth = 1.5 * px; g.lineJoin = "round"; g.setLineDash([6 * px, 6 * px]);
  for (const r of rings) {
    g.strokeStyle = r.col; g.globalAlpha = r.A; g.lineDashOffset = -r.march * 18 * px; g.beginPath(); // (marching while it hints)
    for (let i = 0; i <= 96; i++) { const a = i / 96 * 6.283, p = warpProject(r.x + Math.cos(a) * r.R, r.y + Math.sin(a) * r.R, 0); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
    g.stroke();
  }
  g.restore();
}
