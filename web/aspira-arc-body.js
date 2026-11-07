// /spire - ARC's BODY and BOLT LOOK (owner, 2026-11-06, ported from the approved mockup). Draw only - the simulator never loads it, nothing
// here touches the game, and no Math.random (a seeded hash keyed by tower and time slot picks every jag and flash).
//   VOLTAGE   hexagonal rings round the prism, 1 + tier of them (1 at tier 0 .. 6 at V), corner radius R + 10 mockup units, spread over
//             the middle 60% of the prism, each turning about the vertical axis at 1 turn / ARC_RING_T s, ring i lagging i/(n-1) of a turn
//             (the first and last line up), always already mid-spin; the back edges before the prism, the front after (drawOrbiters)
//   CONDUCTIVITY  those rings thicker and glowier (V about 2x I)
//   SHOCK     ~70 ms jagged arcs between random ADJACENT top-face corners, 4 / 8 / 12 / 20 / 28 flashes a second for I-V
//   THE BOLT  ARC's strike is a jagged lightning bolt from the top-face corner nearest the target, re-jagged every 35 ms, gone in half the
//             old chain's life (fxGlArcBolt in 3D, drawArcBolt2D in 2D - aspira-chains.js hands the soft beams here)
// Axis ids (SKILL_TREES.arc): voltage = "Voltage", conductivity = "Conductivity", capacitance = "Shock".
// Mockup units are for a hex radius of 40; the game tower's is g.R (21.76), so lengths scale by g.R / 40.
const ARC_RING_W = [0.8, 1.0, 1.25, 1.5, 1.75, 2.0], ARC_RING_GL = [0.45, 0.9, 1.15, 1.4, 1.6, 1.8], ARC_RING_T = 5; // thickness / glow spread by Conductivity tier (V = 2x I)
const ARC_SHOCK_RATE = [0, 4, 8, 12, 20, 28], ARC_SHOCK_LEN = 0.07, ARC_BOLT_SLOT = 0.035, ARC_BOLT_S = 21.76 / 40, ARC_BOLT_LIFE = 2; // ARC_BOLT_LIFE: x the old speed
const arcTAU = Math.PI * 2;
function arcH(a, b) { let h = (Math.imul(a | 0, 0x9E3779B1) ^ Math.imul((b | 0) + 0x7F4A7C15, 0x85EBCA6B)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D) >>> 0; h ^= h >>> 12; return h >>> 0; }
function arcRng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const arcMixMemo = new Map();
function arcMix(a, f) { const k = a + "|" + f, m = arcMixMemo.get(k); if (m) return m; const v = mixRgb(a, COL.white, f); arcMixMemo.set(k, v); return v; }
// the tower's footprint hex as drawn: its corner radius and the angle of corner 0
function arcGeom(t) { const c = CELLS[t.cell], p = c.pts[0], k = TOWER_K * TOWER_DRAW_K, dx = (p.x - c.x) * k, dy = (p.y - c.y) * k; return { R: Math.hypot(dx, dy), a0: Math.atan2(dy, dx) }; }
// a glowing stroke of `path` in the current frame: a smooth shadowBlur halo (device px, so scaled by the frame) round a bright line
function arcStroke(path, css, core, w, glow, a) {
  const sc = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowColor = css; ctx.shadowBlur = glow * sc;
  ctx.globalAlpha = a; ctx.lineWidth = w; ctx.strokeStyle = core; ctx.stroke(path); ctx.restore();
}
function arcRing(g, rr, th, back, mt, cx, cy) { // one ring's back or front edges as a path (world coords in the frame mt)
  const path = new Path2D(), cyS = mt.b * cx + mt.d * cy + mt.f;
  const pt = k => { const a = g.a0 + arcTAU / 6 * k + th; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  for (let k = 0; k < 6; k++) {
    const a = pt(k), b = pt((k + 1) % 6), sy = mt.b * (a[0] + b[0]) / 2 + mt.d * (a[1] + b[1]) / 2 + mt.f;
    if ((sy < cyS) === back) { path.moveTo(a[0], a[1]); path.lineTo(b[0], b[1]); }
  }
  return path;
}
function drawArcRings(t, far, up, x, y, h) {
  const n = 1 + skillOf(t, "voltage"), ct = skillOf(t, "conductivity"), g = arcGeom(t), s = g.R / 40, now = performance.now() / 1000;
  const sk = t.stormT > 0 ? t.stormT / ARC_STORM_LIVE : 0, ph = t.stormPh || 0; // a Storm strike spins the rings up (stormPh turns, banked in arcBurnStep) and flashes them
  const css = arcMix(COL[TOWERS.arc.color], Math.min(1, 0.6 + 0.08 * ct + ARC_STORM_WHITE * sk)), gl = (0.6 + 3.2 * ARC_RING_GL[ct]) * s * (1 + ARC_STORM_GLOW * sk);
  for (let i = 0; i < n; i++) {
    const z = h / 2 - h * (n === 1 ? 0.5 : 0.2 + 0.6 * i / (n - 1)), ti = n > 1 ? i * ARC_RING_T / (n - 1) : 0, th = arcTAU * ((now + ARC_RING_T - ti) / ARC_RING_T + ph); // ring 0 is the lowest
    up(x, y, () => { const mt = ctx.getTransform(); arcStroke(arcRing(g, g.R * 1.25, th, far, mt, x, y), css, css, ARC_RING_W[ct] * s, gl, 0.8 + 0.04 * ct); }, z);
  }
}
const ARC_STORM_GLOW = 1.5, ARC_STORM_WHITE = 0.3; // STORM (Voltage V, aspira-arc.js): a Storm strike's flash - the rings' glow up to x(1 + this) and whiter by this much at the peak
const ARC_SHOCK_W = 1.7; // the Shock arc's core, mockup units (x2 the first cut: it read as a faint flicker at 1x)
function drawArcShock(t) { // in the frame of the prism's top; x, y the tower's centre
  const tier = skillOf(t, "capacitance"); if (!tier) return;
  const g = arcGeom(t), c = CELLS[t.cell], x = t.x ?? c.x, y = t.y ?? c.y, s = g.R / 40, lam = ARC_SHOCK_RATE[tier], now = performance.now() / 1000, id = t.cell + 1, col = COL[TOWERS.arc.color];
  const p = []; for (let k = 0; k < 6; k++) { const a = g.a0 + arcTAU / 6 * k; p.push([x + g.R * 0.98 * Math.cos(a), y + g.R * 0.98 * Math.sin(a)]); }
  const j0 = Math.floor(now * lam), core = arcMix(col, 0.7);
  for (let j = Math.max(0, j0 - 1); j <= j0; j++) { // one flash a slot, started at a random point in it
    const r = arcRng(arcH(id * 7919 + tier, j)), age = now - (j + r()) / lam, k = Math.floor(r() * 6);
    if (age < 0 || age > ARC_SHOCK_LEN) continue;
    const fa = 1 - 0.55 * age / ARC_SHOCK_LEN, rj = arcRng(arcH(id * 131 + tier + k, j * 977 + Math.floor(age / ARC_BOLT_SLOT)));
    const a = p[k], b = p[(k + 1) % 6], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, amp = (2.6 + rj() * 2.8) * s, path = new Path2D();
    path.moveTo(a[0], a[1]);
    for (let q = 1; q < 7; q++) { const f = q / 7, jg = (rj() - 0.5) * 2 * amp; path.lineTo(a[0] + dx * f + nx * jg, a[1] + dy * f + ny * jg); }
    path.lineTo(b[0], b[1]);
    const px = (typeof devicePixelRatio === "number" ? devicePixelRatio : 1) / (Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1), w = Math.max(ARC_SHOCK_W * s, px); // x2, and never under 1 css px (Leader, 2026-11-06: "make it read at default zoom")
    arcStroke(path, col, core, w, 3.2 * w, 0.95 * fa);
    ctx.save(); ctx.fillStyle = core; ctx.globalAlpha = fa; ctx.beginPath();
    for (const e of [a, b]) { ctx.moveTo(e[0] + 1.45 * s, e[1]); ctx.arc(e[0], e[1], 1.45 * s, 0, arcTAU); }
    ctx.fill(); ctx.restore();
  }
}
// drawOrbiters' ARC line (aspira-warp-prism.js): the rings' back edges before the prism, their front edges and the Shock arcs after it
function drawArcBody(t, far, up, x, y, h) {
  drawArcRings(t, far, up, x, y, h);
  if (!far) up(x, y, () => drawArcShock(t), h / 2);
  drawArcBolts3d(t, far, h / 2);
}
// THE FIRST BOLT FROM THE PRISM'S TOP (owner, 2026-11-06: ARC's first bolt leaves the top-face corner, on the 3D layer): in 3D, a strike that leaves
// this tower is drawn here, on the towers' layer - from the top-face corner nearest its target at the prism's top, sinking to the floor at the target,
// each jag projected at its own height; behind the prism when the target is behind the tower, else in front. The floor pass leaves these to it
// (arcIn3d: drawn here in the last 250 ms); a hop (from an enemy) stays on the floor. Device px (identity transform), one smooth glow stroke a bolt
const arc3dAt = new WeakMap(), arcIn3d = t => !!t && t.kind === "arc" && performance.now() - (arc3dAt.get(t) || -1e9) < 250;
function drawArcBolts3d(t, far, top) {
  arc3dAt.set(t, performance.now());
  if (typeof fx === "undefined" || !fx.length) return;
  const scr = (px, py, hh) => { const F = warpFrame(px, py, hh); return [F[0] * px + F[2] * py + F[4], F[1] * px + F[3] * py + F[5]]; };
  let saved = false;
  for (const f of fx) {
    if (!f.soft || f.a !== t) continue;
    const x2 = f.b ? f.b.x : f.x2, y2 = f.b ? f.b.y : f.y2; if ((y2 < t.y) !== far) continue;
    const al = arcBoltFade(f); if (al <= 0) continue;
    if (!saved) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = "round"; ctx.lineJoin = "round"; saved = true; }
    const o = arcBoltFrom(f, t.x, t.y, x2, y2), { pts, fork } = arcBoltPts(f, o[0], o[1], x2, y2), css = COL[f.color], F0 = warpFrame(o[0], o[1], top);
    const n = pts.length / 2 - 1, w = (f.thin || 1) * ARC_BOLT_S * 1.5 * Math.hypot(F0[0], F0[1]), hAt = q => top * (1 - q / n), path = new Path2D(), fk = new Path2D();
    for (let q = 0; q <= n; q++) { const P = scr(pts[q * 2], pts[q * 2 + 1], hAt(q)); q ? path.lineTo(P[0], P[1]) : path.moveTo(P[0], P[1]); }
    const m = n >> 1; for (let q = 0; q * 2 + 1 < fork.length; q++) { const P = scr(fork[q * 2], fork[q * 2 + 1], hAt(m)); q ? fk.lineTo(P[0], P[1]) : fk.moveTo(P[0], P[1]); }
    ctx.shadowColor = css; ctx.shadowBlur = 3.2 * w; ctx.strokeStyle = arcMix(css, 0.7); ctx.globalAlpha = al;
    ctx.lineWidth = w; ctx.stroke(path); ctx.lineWidth = w * 0.6; ctx.stroke(fk);
  }
  if (saved) ctx.restore();
}
// ---------- THE BOLT ----------
function arcBoltFrom(f, x1, y1, x2, y2) { // the strike leaves the top-face corner of its tower nearest the target (the footprint corner: a beam lies on the floor); a hop starts on its enemy
  const t = f.a; if (!t || t.kind !== "arc" || !CELLS[t.cell]) return [x1, y1];
  const g = arcGeom(t), c = CELLS[t.cell], tx = t.x ?? c.x, ty = t.y ?? c.y; let best = null, bd = Infinity;
  for (let k = 0; k < 6; k++) { const a = g.a0 + arcTAU / 6 * k, px = tx + g.R * Math.cos(a), py = ty + g.R * Math.sin(a), d = (px - x2) ** 2 + (py - y2) ** 2; if (d < bd) { bd = d; best = [px, py]; } }
  return best;
}
let arcBoltId = 0;
function arcBoltPts(f, ax, ay, bx, by) { // the jagged polyline [x, y, ...] (and a short fork [x, y, ...]), fresh every ARC_BOLT_SLOT
  const id = f.arcId ||= ++arcBoltId, r = arcRng(arcH(id, Math.floor(performance.now() / 1000 / ARC_BOLT_SLOT))), S = ARC_BOLT_S;
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, n = Math.min(40, Math.max(5, Math.round(len / (8 * S)))), pts = [ax, ay];
  for (let q = 1; q < n; q++) { const u = q / n, j = (r() - 0.5) * 2 * 6 * S * Math.sin(Math.PI * u) * (0.6 + 0.8 * r()); pts.push(ax + dx * u + nx * j, ay + dy * u + ny * j); }
  pts.push(bx, by);
  const m = (n >> 1) * 2, side = r() < 0.5 ? -1 : 1, ang = Math.atan2(dy, dx) + side * (0.7 + 0.4 * r());
  const fork = [pts[m], pts[m + 1], pts[m] + Math.cos(ang) * 6 * S + (r() - 0.5) * 3 * S, pts[m + 1] + Math.sin(ang) * 6 * S, pts[m] + Math.cos(ang) * 12 * S, pts[m + 1] + Math.sin(ang) * 12 * S + (r() - 0.5) * 4 * S];
  return { pts, fork };
}
const arcBoltFade = f => { const k = Math.max(0, 1 - ARC_BOLT_LIFE * f.t / f.life); return Math.min(1, k * 2); }; // twice the old speed
function fxGlArcBolt(f) { // 3D: a glow capsule and a thin bright core a jag
  if (arcIn3d(f.a)) return; // (drawn from its prism's top: drawArcBolts3d)
  const x2 = f.b ? f.b.x : f.x2, y2 = f.b ? f.b.y : f.y2, x1 = f.a ? f.a.x : f.x1, y1 = f.a ? f.a.y : f.y1, al = arcBoltFade(f); if (al <= 0) return;
  const o = arcBoltFrom(f, x1, y1, x2, y2), { pts, fork } = arcBoltPts(f, o[0], o[1], x2, y2), col = COL[f.color], core = arcMix(col, 0.7), S = ARC_BOLT_S, w = f.thin || 1;
  const run = (p, k) => { for (let i = 0; i + 3 < p.length; i += 2) { fxGlGlowLine(p[i], p[i + 1], p[i + 2], p[i + 3], 2.6 * S * k * w, col, al * 0.8); fxGlPush(p[i], p[i + 1], p[i + 2], p[i + 3], 0.75 * S * k * w, 0, core, al, core, 0); } };
  run(pts, 1); run(fork, 0.6);
}
function drawArcBolt2D(f, x1, y1, x2, y2, pt, ws) { // 2D: pt projects a world point to device px (the canvas is in device px here)
  if (arcIn3d(f.a)) return; // (drawn from its prism's top: drawArcBolts3d)
  const al = arcBoltFade(f); if (al <= 0) return;
  const o = arcBoltFrom(f, x1, y1, x2, y2), { pts, fork } = arcBoltPts(f, o[0], o[1], x2, y2), css = COL[f.color], core = arcMix(css, 0.7), w = (f.thin || 1) * ARC_BOLT_S * 1.5 * ws;
  const path = (p) => { const q = new Path2D(); for (let i = 0; i + 1 < p.length; i += 2) { const P = pt(p[i], p[i + 1]); i ? q.lineTo(P.x, P.y) : q.moveTo(P.x, P.y); } return q; };
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowColor = css; ctx.shadowBlur = 3.2 * w; ctx.strokeStyle = core; ctx.globalAlpha = al;
  ctx.lineWidth = w; ctx.stroke(path(pts)); ctx.lineWidth = w * 0.6; ctx.stroke(path(fork)); ctx.restore();
}
