// /spire - SOL's BODY (owner, 2026-11-06, the SOL pass of the tower-looks mockup). Draw only - the simulator never loads it, nothing here
// touches the game, and no Math.random.
//   REFLECTION  the tower itself gains faces: its cross-section a regular polygon of 6 + the split targets sides - 6 at tier 0, then
//               8 / 9 / 10 / 12 / 14 for I-V - same corner radius and height, its first corner where the hex's is. The prism's walls
//               (warpPrism, shaded from the core), its opaque top, the tower sprite's outline and the pick outline all take it (solPolyPts)
//   SCORCH      the top face's outline thicker (x1 -> x2.3), whiter (pink -> white-hot) and glowier (x1 -> x2.5) a tier - baked into
//               the tower's sprite (towerSprite, aspira-draw.js), so it costs nothing a frame
//   BREACH      Senbonzakura (owner: "make each edge like the senbonsakura bankai with edges facing outward"): a straight katana blade
//               up out of the floor on EVERY corner, its spine SOL_BLADE_OUT (the mockup's 15 at a hex radius of 40) out from the
//               corner, the cutting edge outward, a sharp angled tip, a faint hamon; each blade's plane radial, aligned with the tower's
//               edges ("blades should be aligned with tower edges (undo the slight rotations)" - was turned 180/n); its height by its
//               corner's distance left or right of the centre ON SCREEN, 160% of the tower at the centremost to 320% at the sides along an
//               exponential ("double heights of breach swords"); the tier only ramps the intensity (dim steel at I, a white-hot edge
//               in a pink glow at V); each fades out toward the floor, transparent at 8% of its height, full from 40% ("every sword
//               should fade out before they touch the ground"); smooth glows. BAKED per tower into a back and a front canvas, rebuilt
//               only when its tiers, its view's shape or the zoom change; a frame draws two images a SOL (drawSolBlades, drawOrbiters)
const SOL_SIDES = [6, 8, 9, 10, 12, 14];
const solSides = t => (t && t.kind === "sol" ? SOL_SIDES[Math.max(0, Math.min(5, skillOf(t, "refraction")))] : 6);
// the tower's outline as `solSides` corners at (x, y), scaled like towerPts (g: x TOWER_K); null for a hex (the cell's own points stand)
// A FLAT FACE DUE SOUTH (owner, 2026-11-07: "for SOL, always rotate the tower so that one of the flat faces faces directly south when reflection level
// is higher than 0"): with Reflection's faces (n > 6) the first two corners sit half a face either side of straight down-screen (+y), so the face between
// them points south; a hex keeps its cell's turn. Every outline reads it (the prism, the top sprite, the pick, the blades). Draw only
const solA0 = (t, n) => { const c = CELLS[t.cell], p = c.pts[0]; return n === 6 ? Math.atan2(p.y - c.y, p.x - c.x) : Math.PI / 2 - Math.PI / n; };
function solPolyPts(t, x, y, g = 1) {
  const n = solSides(t); if (n === 6) return null;
  const c = CELLS[t.cell], p = c.pts[0], k = TOWER_K * g, R = Math.hypot(p.x - c.x, p.y - c.y) * k, a0 = solA0(t, n);
  return Array.from({ length: n }, (_, i) => ({ x: x + R * Math.cos(a0 + 2 * Math.PI * i / n), y: y + R * Math.sin(a0 + 2 * Math.PI * i / n) }));
}
// SCORCH on the sprite's outline: its width, colour and glow by tier (towerSprite)
const solScorch = (t, col) => { const bt = t && t.kind === "sol" ? skillOf(t, "focus") : 0, wh = bt / 5; return { bt, w: 1 + 0.27 * bt, col: bt ? mixRgb(col, COL.white, 0.95 * wh) : col, glow: bt ? mixRgb(col, COL.white, 0.6 * wh) : col, gk: 1 + 0.3 * bt }; };

// ---------- BREACH: the blades ----------
const SOL_BLADE_VQ = 0.04; // the view-shape key's step (a share of the floor's px a unit)
const SOL_BLADE_BACK_A = 0.7, SOL_BLADE_OUT = 15 / 40, SOL_BLADE_TH = 0.7 / 40, SOL_BLADE_FADE = [0.08, 0.4], SOL_BLADE_INT = [0, 0.3, 0.45, 0.62, 0.8, 1];
const solBladeProfile = d => 1.6 + 1.6 * (Math.exp(3 * d) - 1) / (Math.exp(3) - 1); // x a LEVEL-4 tower's visible height (SOL_BLADE_LVL): 160% centre -> 320% sides
// ONE BLADE HEIGHT AT EVERY LEVEL (owner, 2026-11-07: "breach blades, always use the level 4 tower height for the blade height, instead of the
// current tower height"): the profile runs on a level-SOL_BLADE_LVL tower's visible height, whatever this tower's level
const SOL_BLADE_LVL = 4;
// THE BLADES RIDE THE TOWER (owner, 2026-11-09: "For SOL breach blade appearance, I like the current look at level 8 / Calculate in a nonrelative unit how
// much taller/shorter each blade is than the tower at level 8 / Then do tower height +/- that calculated height for each blade, no need to render blades
// that are completely in the ground"): each blade's top sits its level-SOL_BLADE_REF offset (absolute, in towerH units) above or below THIS tower's height,
// so level 8 looks as it did and a blade whose top would be underground is skipped
const SOL_BLADE_REF = 8;
const solBodyOf = new WeakMap();
let solScratch = null;
// device px of the world point (px, py) at height z (identity transform)
const solScr = (px, py, z) => { const F = warpFrame(px, py, z); return [F[0] * px + F[2] * py + F[4], F[1] * px + F[3] * py + F[5]]; };
function solBladeGeo(t, x, y, top) { // each blade's outline in device px, sorted back to front; -> { list, key }. top: the prism's top as drawOrbiters gives it
  const n = solSides(t), c = CELLS[t.cell], p = c.pts[0], R = Math.hypot(p.x - c.x, p.y - c.y) * TOWER_K * TOWER_DRAW_K, a0 = solA0(t, n), z0 = warpFloor(), u = (top + warpLift) / towerH(t), hT = towerH(t), h4 = towerH({ lvl: SOL_BLADE_LVL }), h8 = towerH({ lvl: SOL_BLADE_REF }); // z0: the REAL floor (the tower is lifted, warpLift); u: visible units a towerH unit
  const s = R / 40, R5 = R + SOL_BLADE_OUT * 40 * s, w = 2 * R * Math.sin(Math.PI / n) / 6, th = SOL_BLADE_TH * 40 * s, base = solScr(x, y, z0);
  const cx = Array.from({ length: n }, (_, k) => solScr(x + R * Math.cos(a0 + 2 * Math.PI * k / n), y + R * Math.sin(a0 + 2 * Math.PI * k / n), z0)[0] - base[0]);
  const mx = Math.max(1e-6, ...cx.map(Math.abs)), list = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + 2 * Math.PI * k / n, ca = Math.cos(a), sa = Math.sin(a), bA = a, cb = Math.cos(bA), sb = Math.sin(bA), H = u * (hT + h4 * solBladeProfile(Math.abs(cx[k]) / mx) - h8); if (!(H > 0)) continue; // the tower's height +/- the blade's level-8 offset; one wholly underground is not drawn
    const pt = (u, z, off) => { const q = solScr(x + R5 * ca + u * cb - off * sb, y + R5 * sa + u * sb + off * cb, z0 + z); return [q[0] - base[0], q[1] - base[1]]; };
    const sh = [[0, 0], [w, 0], [0.88 * w, 0.8 * H], [0, H]], plates = [-th, th].map(off => sh.map(q => pt(q[0], q[1], off)));
    const ham = []; for (let z = 0.05 * H, i = 0; z < 0.74 * H; z += H * 0.03, i++) ham.push(pt(w - 0.12 * w * (z / (0.8 * H)) - 0.2 * w + 0.03 * w * Math.sin(i * 1.3), z, 0));
    const d = -sb * -0.8 + cb * 0.6;
    list.push({ plates, edge: [pt(w, 0, 0), pt(0.88 * w, 0.8 * H, 0), pt(0, H, 0)], spine: [pt(0, 0, 0), pt(0, H, 0)], ham, shade: 0.35 + 0.65 * Math.max(0, Math.abs(d)),
      y0: pt(0, 0, 0)[1], yH: pt(0, H, 0)[1], back: sa * (solScr(x, y + 1, z0)[1] - base[1]) < 0 });
  }
  list.sort((p, q) => p.y0 - q.y0); // far to near
  // DEPTH OPACITY (owner, 2026-11-06: "blades further back are less opaque, going from 100% at front, to 70% at back"): by its foot's depth on screen in this view
  const y0s = list.map(b => b.y0), lo = Math.min(...y0s), hi = Math.max(...y0s); for (const b of list) b.op = SOL_BLADE_BACK_A + (1 - SOL_BLADE_BACK_A) * (hi > lo ? (b.y0 - lo) / (hi - lo) : 1);
  return list;
}
function solPath(g, P, close) { g.beginPath(); P.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); if (close) g.closePath(); }
function solBladePaint(g, b, tier, col, core, k) { // one blade, opaque under its steel, its glows smooth (shadowBlur)
  const gl = (tier - 1) / 4, inten = SOL_BLADE_INT[tier];
  g.lineJoin = "round"; g.lineCap = "round"; g.globalAlpha = 1; g.fillStyle = COL.bg; for (const P of b.plates) { solPath(g, P, true); g.fill(); }
  g.fillStyle = mixRgb(col, core, 0.3 + 0.4 * gl); g.globalAlpha = (0.2 + 0.45 * inten) * b.shade; for (const P of b.plates) { solPath(g, P, true); g.fill(); }
  if (gl > 0) { g.save(); g.shadowColor = col; g.shadowBlur = (3 + 7 * gl) * k; g.strokeStyle = col; g.globalAlpha = 0.5 * gl + 0.2; g.lineWidth = 0.7 * k; for (const P of b.plates) { solPath(g, P, true); g.stroke(); } g.restore(); }
  g.globalAlpha = 0.35 + 0.4 * inten; g.strokeStyle = col; g.lineWidth = 0.8 * k; solPath(g, b.spine); g.stroke();
  g.globalAlpha = 0.2 + 0.2 * inten; g.strokeStyle = core; g.lineWidth = 0.5 * k; solPath(g, b.ham); g.stroke();
  g.save(); g.shadowColor = mixRgb(col, COL.white, 0.6 * gl); g.shadowBlur = (2 + 6 * gl) * k; g.strokeStyle = mixRgb(core, COL.white, 0.9 * gl); g.globalAlpha = 0.3 + 0.7 * inten;
  g.lineWidth = (0.55 + 0.75 * gl) * k; solPath(g, b.edge); g.stroke(); g.stroke(); g.restore();
}
// the fade to the floor: clear below SOL_BLADE_FADE[0] of its height, a ramp (the SOL beam's alpha strip, no colour strings) up to [1]
function solBladeFade(g, b, W, Hh, ox, oy) {
  const y0 = b.y0 + (b.yH - b.y0) * SOL_BLADE_FADE[0] - oy, y1 = b.y0 + (b.yH - b.y0) * SOL_BLADE_FADE[1] - oy;
  g.save(); g.globalCompositeOperation = "destination-out"; g.globalAlpha = 1; g.fillStyle = COL.bg; g.fillRect(0, y0, W, Hh - y0);
  try {
    const r = solRamp(COL.bg), pat = g.createPattern(r.c, "repeat-y"); // clear (left) -> full (right): turned so full sits at y0 and clear at y1
    pat.setTransform(new DOMMatrix().translateSelf(0, y1).rotateSelf(90).scaleSelf((y0 - y1) / 256, 1));
    g.fillStyle = pat; g.fillRect(0, Math.min(y0, y1), W, Math.abs(y0 - y1));
  } catch (e) { /* (no pattern transform: the hard cut at y0 stands) */ }
  g.restore();
}
function solBladeBake(list, tier, k) { // -> { cv, ox, oy } in device px about the tower's floor point
  if (!list.length) return null;
  const col = COL[TOWERS.sol.color], core = mixRgb(col, COL.white, 0.6), m = 14 * k, xs = list.flatMap(b => b.plates.flat().map(q => q[0])), ys = list.flatMap(b => b.plates.flat().map(q => q[1]));
  const ox = Math.min(...xs) - m, oy = Math.min(...ys) - m, W = Math.ceil(Math.max(...xs) + m - ox), Hh = Math.ceil(Math.max(...ys) + m - oy);
  if (!(W > 0 && Hh > 0) || W * Hh > 4e6) return null;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = Hh; const g = cv.getContext("2d");
  solScratch ||= document.createElement("canvas"); const S = solScratch; S.width = W; S.height = Hh; const sg = S.getContext("2d");
  for (const b of list) { // each blade alone (its fade must not cut the ones behind it), then laid on
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, W, Hh); sg.setTransform(1, 0, 0, 1, -ox, -oy); solBladePaint(sg, b, tier, col, core, k);
    sg.setTransform(1, 0, 0, 1, 0, 0); solBladeFade(sg, b, W, Hh, ox, oy); g.globalAlpha = b.op ?? 1; g.drawImage(S, 0, 0); g.globalAlpha = 1;
  }
  return { cv, ox, oy };
}
function drawSolBlades(t, far, x, y, top) { // NEVER REDRAWN on a move, a pan or a zoom (as FRZ's ice - owner, 2026-11-06: "Never redraw the ice"): built
  // in the tower's first view, the image then moves and scales with it; a new Breach or Reflection tier builds it anew, swapped in whole
  const tier = skillOf(t, "breach"); if (!tier || typeof warpFrame !== "function") return;
  const z0 = warpFloor(), base = solScr(x, y, z0), e1 = solScr(x + 10, y, z0), k = Math.hypot(e1[0] - base[0], e1[1] - base[1]) / 10;
  // REBUILT WHEN THE VIEW'S SHAPE CHANGES (owner, 2026-11-07: "make sure the breach blades are rendered in 3d" - "tower and blade angle mismatch here"): an image
  // baked in one view and only moved and scaled showed that view's angles anywhere else on the board; the key holds the floor's two axes and the up axis
  // there (device px a unit / k, in SOL_BLADE_VQ steps), so a tower in a new spot, a new zoom or a changed tilt bakes anew - never per frame while it holds
  const F = warpFrame(x, y, z0), U = solScr(x, y, z0 + 10), vq = v => Math.round(v / k / SOL_BLADE_VQ);
  const key = tier + "," + solSides(t) + "," + [F[0], F[1], F[2], F[3], (U[0] - base[0]) / 10, (U[1] - base[1]) / 10].map(vq).join(",") + "," + Math.round(top + warpLift);
  let B = solBodyOf.get(t);
  if (!B || B.key !== key) { const list = solBladeGeo(t, x, y, top); B = { key, k, back: solBladeBake(list.filter(b => b.back), tier, k), front: solBladeBake(list.filter(b => !b.back), tier, k) }; solBodyOf.set(t, B); }
  const S = far ? B.back : B.front; if (!S) return;
  const z = k / B.k;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(S.cv, base[0] + S.ox * z, base[1] + S.oy * z, S.cv.width * z, S.cv.height * z); ctx.restore();
}
