// /spire - THE MOVING LAYER ON THE GPU (owner, 2026-10-14: "a 10x improvement on perf ... avoid lowering resolution or
// reducing visual clarity"). In 3D the moving layer (drawSceneTop: ranges, tethers, acid lines and pools, aims, the boss
// bar, leashes...) was drawn on a 2D canvas and that canvas sent up to the GPU EVERY frame - the cost the iPhone felt most.
// warpRender now hands drawSceneTop this stand-in for the 2D context instead: it keeps the same state (it sets every style
// and transform on the real one too) and turns what the batch can draw - full circles filled or stroked, the radial
// gradient discs (gradDisc), straight strokes - into GPU shapes (fxGlPush, aspira-fxgl.js), at the board picture's full
// size. Anything else (text, dashes, glows, clips, polygons filled, part arcs, images, blend modes) is drawn on the real
// canvas exactly as before, and only a frame that drew something there sends it up. Loaded after aspira-fxgl.js.
const GLCTX_PASS = ["globalAlpha", "fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalCompositeOperation",
  "shadowBlur", "shadowColor", "font", "textAlign", "textBaseline", "lineDashOffset", "miterLimit", "filter", "imageSmoothingEnabled", "shadowOffsetX", "shadowOffsetY"];
const GLCTX_TAU = 6.283;
function glCtx(real, toWorld) { // toWorld: the real canvas's pixels -> world units (the camera the layer was drawn under)
  if (real.__glc) { fxGl.clipC = null; return Object.assign(real.__glc, { used: false, dash: false, m: [1, 0, 0, 1, 0, 0], stack: [], w2: toWorld, clipC: null }); } // one a canvas, made once
  const g = real.__glc = { real, used: false, dash: false, m: [1, 0, 0, 1, 0, 0], stack: [], w2: toWorld, clipC: null }; fxGl.clipC = null;
  for (const k of GLCTX_PASS) Object.defineProperty(g, k, { get: () => real[k], set: v => { real[k] = v; } });
  g.canvas = real.canvas;
  // POOLS (perf, 2026-11-05: a moving-layer path allocated an op entry, its args, a point and a part every call - the Carrier's trails
  // alone ~1.5 MB a late frame): each reused from the last path, reset at beginPath; nothing keeps a path past the next beginPath
  const ptPool = [], opPool = [], partPool = []; let ptN = 0, opsN = 0, partN = 0;
  const T = (x, y) => { const q = ptPool[ptN] || (ptPool[ptN] = [0, 0]); ptN++; q[0] = g.m[0] * x + g.m[2] * y + g.m[4]; q[1] = g.m[1] * x + g.m[3] * y + g.m[5]; return q; };
  const part = () => { const p = partPool[partN] || (partPool[partN] = { pts: [] }); partN++; p.pts.length = 0; p.closed = false; p.circle = undefined; return p; };
  const sc = () => Math.sqrt(Math.abs(g.m[0] * g.m[3] - g.m[1] * g.m[2]));
  // the path as recorded (user units, under the transform of the moment) and as GPU parts (device px)
  const ops = opPool, parts = []; let odd = false, cur = null;
  const op = (name, a) => { const o = opPool[opsN] || (opPool[opsN] = [null, null, null, [0, 0]]); opsN++; o[0] = name; o[1] = a; o[2] = g.m; }; // (g.m is replaced, never changed in place: safe to keep)
  const op2 = (name, x, y) => { const o = opPool[opsN] || (opPool[opsN] = [null, null, null, [0, 0]]); opsN++; o[0] = name; o[3][0] = x; o[3][1] = y; o[1] = o[3]; o[2] = g.m; }; // (its args in the entry's own pair)
  g.beginPath = () => { opsN = 0; ptN = 0; partN = 0; parts.length = 0; odd = false; cur = null; };
  g.moveTo = (x, y) => { op2("moveTo", x, y); cur = part(); cur.pts.push(T(x, y)); parts.push(cur); };
  g.lineTo = (x, y) => { op2("lineTo", x, y); if (!cur) { cur = part(); parts.push(cur); } cur.pts.push(T(x, y)); };
  g.closePath = () => { op("closePath", []); if (cur) cur.closed = true; };
  g.arc = (x, y, r, a0, a1, ccw) => {
    op("arc", [x, y, r, a0, a1, ccw]);
    const full = Math.abs(a1 - a0) >= GLCTX_TAU - 1e-3, uni = Math.abs(g.m[1]) < 1e-9 && Math.abs(g.m[2]) < 1e-9 && Math.abs(g.m[0] - g.m[3]) < 1e-9;
    if (!uni) { odd = "arc:skewed"; return; }
    if (!full) { // a PART arc (the threat ring): short straight pieces on from the current point, as the canvas would join it
      const span = ccw ? -(((a0 - a1) % GLCTX_TAU + GLCTX_TAU) % GLCTX_TAU) : ((a1 - a0) % GLCTX_TAU + GLCTX_TAU) % GLCTX_TAU, n = Math.max(8, Math.min(160, Math.round(Math.abs(span) * r * sc() / 3)));
      if (!cur || cur.circle) { cur = part(); parts.push(cur); }
      for (let i = 0; i <= n; i++) { const t = a0 + span * i / n; cur.pts.push(T(x + r * Math.cos(t), y + r * Math.sin(t))); }
      return;
    }
    if (cur && cur.pts.length === 1 && !cur.circle) parts.pop(); // a moveTo just before a whole circle (its start): no line
    const [cx, cy] = T(x, y);
    cur = part(); cur.circle = [cx, cy, r * sc()]; parts.push(cur);
  };
  for (const name of ["rect", "quadraticCurveTo", "bezierCurveTo", "arcTo", "roundRect"]) g[name] = (...a) => { op(name, a); odd = name; };
  g.ellipse = (x, y, rx, ry, rot, a0, a1, ccw) => { // a whole one: a closed line of short straight pieces (the moons' orbit)
    op("ellipse", [x, y, rx, ry, rot, a0, a1, ccw]);
    if (Math.abs(a1 - a0) < GLCTX_TAU - 1e-3) { odd = "ellipse:part"; return; }
    const n = Math.max(48, Math.min(160, Math.round(Math.max(rx, ry) * sc() / 3))), c = Math.cos(rot), sn = Math.sin(rot); // a piece every ~3 px
    cur = part(); cur.closed = true; parts.push(cur);
    for (let i = 0; i < n; i++) { const t = i / n * GLCTX_TAU, ex = rx * Math.cos(t), ey = ry * Math.sin(t); cur.pts.push(T(x + ex * c - ey * sn, y + ex * sn + ey * c)); }
  };
  const replay = (why, quiet) => { // the path onto the real context, each op under its own transform (quiet: the moving layer is not marked as drawn on)
    if (!quiet) glcWhy(why);
    const m0 = real.getTransform();
    real.beginPath();
    for (let i = 0; i < opsN; i++) { const [name, a, m] = ops[i]; real.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); real[name](...a); }
    real.setTransform(m0); if (!quiet) g.used = true;
  };
  const plain = s => typeof s === "string";
  g.fill = (...a) => {
    const st = real.fillStyle, grad = st && (st.__disc || (glcMultiOn && st.__multi && fxGl.lutRows && glcMulti(st.__multi)));
    const why = odd ? "fill:" + odd : a.length ? "fill:rule" : real.globalCompositeOperation !== "source-over" ? "fill:" + real.globalCompositeOperation : real.shadowBlur > 0 ? "fill:shadow" : (real.filter || "none") !== "none" ? "fill:filter" : !plain(st) && !grad ? "fill:style" : !glcFill(g, parts, st, grad) ? "fill:shape" + parts.map(p => (p.circle ? "o" : p.pts.length)).join("") : null;
    if (why) { replay(why); real.fill(...a); }
  };
  g.stroke = (...a) => {
    const st = real.strokeStyle, dash = g.dash ? real.getLineDash() : null, glow = real.shadowBlur > 0 && plain(real.shadowColor) && real.shadowColor; // a glow: soft rings under it in the SHADOW's colour (glcGlow) - any colour since 2026-10-28 (perf: GRV's nova ring glows violet under a whitening stroke, and that one difference sent the whole moving layer up ~35 times a second, the iPhone logs' stroke:shadow)
    const why = odd ? "stroke:" + odd : a.length ? "stroke:path" : dash && dash.length !== 2 ? "stroke:dash" + dash.length : real.globalCompositeOperation !== "source-over" ? "stroke:" + real.globalCompositeOperation :
      real.shadowBlur > 0 && !glow ? "stroke:shadow" : (real.filter || "none") !== "none" ? "stroke:filter" : !plain(st) ? "stroke:style" :
      real.lineJoin !== "round" && parts.some(p => !p.circle && p.pts.length + (p.closed ? 1 : 0) > 2 && !glcRegular(p, g.w2)) ? "stroke:join-" + real.lineJoin : null; // (a mitred corner: the canvas - but a regular polygon's is the batch's shape 5)
    if (why) { replay(why); real.stroke(...a); return; }
    glcStroke(g, parts, st, dash, sc(), glow);
  };
  g.setLineDash = d => { g.dash = !!(d && d.length); real.setLineDash(d); };
  g.getLineDash = () => real.getLineDash();
  g.setTransform = (a, b, c, d, e, f) => { if (typeof a === "object") { const M = a; g.m = [M.a, M.b, M.c, M.d, M.e, M.f]; real.setTransform(M); } else { g.m = [a, b, c, d, e, f]; real.setTransform(a, b, c, d, e, f); } };
  g.getTransform = () => real.getTransform();
  g.transform = (a, b, c, d, e, f) => { real.transform(a, b, c, d, e, f); const M = real.getTransform(); g.m = [M.a, M.b, M.c, M.d, M.e, M.f]; };
  g.translate = (x, y) => g.transform(1, 0, 0, 1, x, y);
  g.scale = (x, y) => g.transform(x, 0, 0, y, 0, 0);
  g.rotate = a => g.transform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0);
  g.resetTransform = () => g.setTransform(1, 0, 0, 1, 0, 0);
  g.save = () => { g.stack.push([g.m.slice(), g.dash, g.clipC]); real.save(); };
  g.restore = () => { const s = g.stack.pop(); if (s) { [g.m, g.dash, g.clipC] = s; fxGl.clipC = g.clipC; } real.restore(); };
  // a radial gradient from clear at its centre to one colour at the rim (gradDisc) is drawn by the batch; any other by the canvas
  g.createRadialGradient = (x0, y0, r0, x1, y1, r1) => {
    const gr = real.createRadialGradient(x0, y0, r0, x1, y1, r1), add = gr.addColorStop.bind(gr), stops = [];
    gr.addColorStop = (o, c) => { stops.push([o, c]); add(o, c); gr.__disc = r0 === 0 && x0 === x1 && y0 === y1 && stops.length === 2 && stops[0][0] === 0 && stops[0][1] === "transparent" && stops[1][0] === 1 ? { col: stops[1][1] } : null; gr.__multi = r0 === 0 && x0 === x1 && y0 === y1 && stops.length >= 3 ? stops : null; };
    return gr;
  };
  // everything else straight to the canvas (and the layer is then sent up this frame)
  for (const name of ["fillText", "strokeText", "drawImage", "fillRect", "strokeRect", "putImageData"]) g[name] = (...a) => { g.used = true; glcWhy(name); return real[name](...a); };
  g.clearRect = (...a) => real.clearRect(...a);
  /* the boss sky's two passes (skyKeep, aspira-bosses.js) clip to the sky's circle - inside it, or everything OUTSIDE it (an even-odd circle + a huge rect): the batch clips its shapes to that circle itself (mode 1 / 2 in the instance), so the moving layer is not sent up for them */
  g.clip = (...a) => {
    const c0 = parts.length === 1 && parts[0].circle, evenodd = a[0] === "evenodd";
    if (glcClipOn && c0 && !g.clipC && (evenodd ? odd === "rect" : !odd)) {
      const [cx, cy] = g.w2(c0[0], c0[1]); g.clipC = fxGl.clipC = [cx, cy, c0[2] / g.w2.k, evenodd ? 2 : 1];
      replay("clip", true); real.clip(...a); return; // (the real canvas is clipped too, for anything it must still draw)
    }
    // ...and the sky is a TRIANGLE since (skyTriPath): its three corners (world units) ride in fxGl.clipT for the batch's uniforms, mode 3
    // inside / 4 outside - a circle-only clip sent the whole moving layer up every frame of a spreading or collapsing sky (perf, 2026-10-28)
    const t0 = parts.length === 1 && !parts[0].circle && parts[0].closed && parts[0].pts.length === 3 && parts[0].pts;
    if (glcClipOn && t0 && !g.clipC && (evenodd ? odd === "rect" : !odd)) {
      g.clipC = fxGl.clipC = [0, 0, 0, evenodd ? 4 : 3]; fxGl.clipT = t0.flatMap(q => g.w2(q[0], q[1]));
      replay("clip", true); real.clip(...a); return;
    }
    replay("clip"); real.clip(...a);
  };
  for (const name of ["measureText", "createLinearGradient", "createPattern", "isPointInPath", "getImageData", "createImageData", "createConicGradient"]) g[name] = (...a) => real[name](...a);
  return g;
}
// the batch's fills: whole circles (a plain colour or the gradDisc) and REGULAR POLYGONS (FRZ's moons, poly() - the canvas
// fallback sent the whole moving layer up every frame on a phone, 2026-10-14); false: something else, the canvas draws it
let glcMultiOn = true, glcClipOn = true; // (switches for comparing)
const glcMulti = stops => { const row = fxGlLutRow(stops); return row >= 0 ? { row } : null; };
function glcFill(g, parts, st, grad) {
  const shapes = parts.map(p => p.circle ? null : glcRegular(p, g.w2) || glcTri(p, g.w2));
  if (parts.some((p, i) => !p.circle && !shapes[i]) || (grad && shapes.some(Boolean))) return false;
  const A = g.real.globalAlpha;
  parts.forEach((p, i) => {
    if (shapes[i] && shapes[i].tri) { const [[ax, ay], [bx, by], [cx, cy]] = shapes[i].tri; fxGlPush(ax, ay, bx, by, 1, 0, st, A, st, 0, 6, cx, cy); return; } // (shape 6: the third corner in the joint slot)
    if (shapes[i]) { const q = shapes[i]; fxGlPush(q.x, q.y, q.x + Math.cos(q.rot) * q.n, q.y + Math.sin(q.rot) * q.n, q.r, 0, st, A, st, 0, 5); return; } // (shape 5: p1 - p0 its direction, its length the sides)
    const [x, y] = g.w2(p.circle[0], p.circle[1]), r = p.circle[2] / g.w2.k;
    if (grad && grad.row !== undefined) { const b = fxGlPush(x, y, x, y, r, 0, COL.white, A, COL.white, 1, 3); fxGl.inst[b + 11] = grad.row + 1; } // the GRV aura: many stops, from the LUT (fxGlLutRow)
    else if (grad) fxGlPush(x, y, x, y, r, 0, grad.col, A, grad.col, 0, 3); // the gradDisc: clear at the centre to its colour at the rim
    else fxGlPush(x, y, x, y, r, 0, st, A, st, 0);
  });
  return true;
}
// any THREE corners (a fill closes its path): {tri} in world units - the threat marks (aspira-threat.js)
function glcTri(p, w2) { return p.pts.length === 3 ? { tri: p.pts.map(q => w2(q[0], q[1])) } : null; }
// a closed path of 3-12 corners all as far from their middle and as far apart round it: {x, y, r, rot, n} in world units
function glcRegular(p, w2) {
  const n = p.pts.length;
  if (!p.closed || n < 3 || n > 12) return null;
  const P = p.pts.map(q => w2(q[0], q[1])), x = P.reduce((s, q) => s + q[0], 0) / n, y = P.reduce((s, q) => s + q[1], 0) / n;
  const r = Math.hypot(P[0][0] - x, P[0][1] - y), rot = Math.atan2(P[0][1] - y, P[0][0] - x);
  if (!(r > 0)) return null;
  for (let i = 0; i < n; i++) {
    const a = rot + i * GLCTX_TAU / n;
    if (Math.hypot(P[i][0] - (x + r * Math.cos(a)), P[i][1] - (y + r * Math.sin(a))) > r * 0.01 + 0.01) return null;
  }
  return { x, y, r, rot, n };
}
// the batch's strokes: whole circles (with a glow, soft rings under it) and polylines cut at their joints
let GLC_X = new Float64Array(0), GLC_Y = GLC_X, GLC_DX = GLC_X, GLC_DY = GLC_X; const GLC_SEG = [0, 0, 0, 0]; // glcStroke's scratch
// a glow's two rings' alphas x [outer, middle] while a draw sets it (GRV's nova: owner, 2026-11-05: "for nova, visually halve the opacity of the middle ring,
// and quarter opacity of the outermost"); null: as drawn
let GLC_GLOW_K = null; const GLC_GLOW_A = 0.55; // a segment glow's centre alpha x the stroke's (the two old bands summed to ~0.45 near the line)
function glcStroke(g, parts, st, dash, scale, glow) {
  const real = g.real, lw = real.lineWidth * scale / g.w2.k, A = real.globalAlpha, dk = scale / g.w2.k, butt = real.lineCap === "butt";
  const dOn = dash ? dash[0] * dk : 0, dOff = dash ? dash[1] * dk : 0, dAt0 = dash ? real.lineDashOffset * dk : 0; // (a dash: on, off, its offset - world units)
  for (const p of parts) {
    if (p.circle) {
      const [x, y] = g.w2(p.circle[0], p.circle[1]), r = p.circle[2] / g.w2.k;
      if (glow) { const b = real.shadowBlur / g.w2.k, gk = GLC_GLOW_K; fxGlPush(x, y, x, y, r, 2 * (lw / 2 + b), glow, Math.min(1, A * GLC_GLOW_A * (gk ? (gk[0] + gk[1]) / 2 : 1)), glow, 0, 9); } // a canvas glow: ONE smooth ring glow (shape 9; was two soft rings, 0.18 and 0.3)
      fxGlPush(x, y, x, y, r, lw, st, 0, st, A, 0, 0, 0, 0, 0, dOn, dOff, dAt0);
      continue;
    }
    const reg = real.lineJoin !== "round" && glcRegular(p, g.w2); // a sharp-cornered regular polygon (Temporal Drive's octagons): shape 5, its corners exact
    if (reg) { fxGlPush(reg.x, reg.y, reg.x + Math.cos(reg.rot) * reg.n, reg.y + Math.sin(reg.rot) * reg.n, reg.r, lw, st, 0, st, A, 5); continue; }
    // (PERF, 2026-11-05: plain numbers in reused buffers - an array a point, a direction and a joint were most of glcStroke's time; the
    // same arithmetic in the same order, so the same instances to the bit)
    const closed = p.closed && p.pts.length > 2, m = p.pts.length + (closed ? 1 : 0), n = m - 1, w2 = g.w2, inl = w2.ox !== undefined;
    if (GLC_X.length < m) { GLC_X = new Float64Array(m * 2); GLC_Y = new Float64Array(m * 2); GLC_DX = new Float64Array(m * 2); GLC_DY = new Float64Array(m * 2); }
    const X = GLC_X, Y = GLC_Y, DX = GLC_DX, DY = GLC_DY;
    for (let k = 0; k < m; k++) { const q = p.pts[k < p.pts.length ? k : 0]; if (inl) { X[k] = (q[0] - w2.ox) / w2.k; Y[k] = (q[1] - w2.oy) / w2.k; } else { const w = w2(q[0], q[1]); X[k] = w[0]; Y[k] = w[1]; } }
    for (let k = 0; k < n; k++) { const dx = X[k + 1] - X[k], dy = Y[k + 1] - Y[k], l = Math.hypot(dx, dy) || 1; DX[k] = dx / l; DY[k] = dy / l; }
    // each segment cut at its joints (the bisector of its direction and its neighbour's): seen-through lines never overlap
    let along = 0; // the dash carries on round the corners
    for (let i = 0; i < n; i++) {
      const pi = i > 0 ? i - 1 : closed ? n - 1 : -1, ni = i < n - 1 ? i + 1 : closed ? 0 : -1, prev = pi >= 0, next = ni >= 0;
      let b0x = 0, b0y = 0, b1x = 0, b1y = 0;
      if (prev) { const x = DX[pi] + DX[i], y = DY[pi] + DY[i], l = Math.hypot(x, y); if (l > 1e-6) { b0x = x / l; b0y = y / l; } }
      if (next) { const x = DX[i] + DX[ni], y = DY[i] + DY[ni], l = Math.hypot(x, y); if (l > 1e-6) { b1x = x / l; b1y = y / l; } }
      const ax = X[i], ay = Y[i], bx = X[i + 1], by = Y[i + 1];
      const seg = inTowerHex(ax, ay) || inTowerHex(bx, by) ? trimToTowers(ax, ay, bx, by) : GLC_SEG; // nothing of a line inside a tower's hexagon (aspira-fxgl.js); clear of them all, it is whole
      if (seg === GLC_SEG) { GLC_SEG[0] = ax; GLC_SEG[1] = ay; GLC_SEG[2] = bx; GLC_SEG[3] = by; }
      if (seg) {
        const cutA = seg[0] !== X[i] || seg[1] !== Y[i], cutB = seg[2] !== X[i + 1] || seg[3] !== Y[i + 1], j0x = cutA ? 0 : b0x, j0y = cutA ? 0 : b0y, j1x = cutB ? 0 : b1x, j1y = cutB ? 0 : b1y; // (a cut end is a plain end)
        if (glow) { const b = real.shadowBlur / g.w2.k, gk = GLC_GLOW_K; fxGlGlowLine(seg[0], seg[1], seg[2], seg[3], lw / 2 + b, glow, Math.min(1, A * GLC_GLOW_A * (gk ? (gk[0] + gk[1]) / 2 : 1)), 0, 0, 2); } // a glow: ONE smooth glow line under it (owner, 2026-11-06: "never use step glow unless huge perf gains"; was two wider soft strokes, 0.18 and 0.3) // a glow: two soft wider strokes under it (the Relay's beam)
        fxGlPush(seg[0], seg[1], seg[2], seg[3], lw / 2, 0, st, A, st, 0, butt && !prev && !next ? 2 : 0, j0x, j0y, j1x, j1y, dOn, dOff, dAt0 + along + (cutA ? Math.hypot(seg[0] - X[i], seg[1] - Y[i]) : 0));
      }
      along += Math.hypot(X[i + 1] - X[i], Y[i + 1] - Y[i]);
    }
  }
}
// WHY the moving layer went to the canvas (and up to the GPU) - counted for the slow logs (perfSplit, aspira-perflog.js): a phone
// still sent it every frame on 2026-10-14 after every known case was moved to the batch
const glcWhyN = {};
function glcWhy(why) { if (why) glcWhyN[why] = (glcWhyN[why] || 0) + 1; }
