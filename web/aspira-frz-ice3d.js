// /spire - FRZ'S ICE IN 3D (owner, 2026-11-06: "also ice crystals should be 3d"; "Allow poking in and out of perms"; "Never redraw the ice").
// Draw only. Every piece the generator makes (aspira-frz-ice.js) is a SOLID: its floor outline (the mockup's units, the tower's hex radius 40), a
// height above its base at each corner, its base's lift and a shard's lean (tv). Each tower's ice is projected ONCE, through an affine copy of the
// 3D camera taken at the tower's first view (ice3dProj: the floor's two axes and the up axis in device px a world unit), and baked with a
// PER-PIXEL DEPTH TEST - every wall and top, and the tower's own prism as a depth-only occluder - so a shard poking through a Permafrost crystal
// shows only what is outside it, in front or behind as it is, and what stands behind the tower is hidden by it. Then each pixel's colour (the
// opaque base, the ice tint fading down a wall by its height, the top's tint) and, last, the ridges - only where the depth test shows them - in a
// smooth glow. The whole bake runs in slices (ice3dRun), and the one image then only moves and scales with the tower (drawFrzIce).
const ICE3D_EPS = 0.02, ICE3D_BAND = 24; // BAND: rows put a step // depth slack, world units, for an edge lying on its own faces
// the camera at the tower's first view: device px per world unit along x, y and up, the view direction (nearer = larger), and the mockup's scales
function ice3dProj(x, y, top, Rw, Hs) {
  const P = (px, py, z) => { const F = warpFrame(px, py, z); return [F[0] * px + F[2] * py + F[4], F[1] * px + F[3] * py + F[5]]; };
  const B = P(x, y, 0), X = P(x + 1, y, 0), Y = P(x, y + 1, 0), Z = P(x, y, 1), ex = [X[0] - B[0], X[1] - B[1]], ey = [Y[0] - B[0], Y[1] - B[1]], ez = [Z[0] - B[0], Z[1] - B[1]];
  let n = [ey[0] * ez[1] - ez[0] * ey[1], ez[0] * ex[1] - ex[0] * ez[1], ex[0] * ey[1] - ey[0] * ex[1]]; if (n[2] < 0) n = n.map(q => -q); // (up is nearer the camera)
  const l = Math.hypot(...n) || 1;
  return { ex, ey, ez, n: n.map(q => q / l), s: Rw / 40, sh: (top + (typeof warpLift === "number" ? warpLift : 0)) / Hs, Hs }; // sh: world units a mockup height unit - the FULL visible height (floor to top) over Hs; it was top alone, half the lifted prism (7.8.11), so the bake's prism occluder stood half as tall and the ice behind its upper half drew over it (owner, 2026-11-08: "frz tower needs to occlude")
}
// a mockup point (u, v on the floor, h up) -> [px x, px y, depth] at `k` x the first view's scale, about the tower's floor point
function ice3dPt(J, u, v, h) {
  const Q = J.proj, wx = u * Q.s, wy = v * Q.s, wz = h * Q.sh, k = J.k;
  return [(Q.ex[0] * wx + Q.ey[0] * wy + Q.ez[0] * wz) * k, (Q.ex[1] * wx + Q.ey[1] * wy + Q.ez[1] * wz) * k, Q.n[0] * wx + Q.n[1] * wy + Q.n[2] * wz];
}
// one solid's faces: its walls and its top as 3D polygons (corner [x, y, depth, height share]); kind 0 a wall, 1 a top; lit: a wall's light
function ice3dFaces(J, P, pi, out) {
  const n = P.foot.length, tv = P.tv || [0, 0], lift = P.lift || 0, hmax = lift + Math.max(...P.hg), at = (i, top) => { const h = top ? P.hg[i] : 0, q = ice3dPt(J, P.foot[i][0] + tv[0] * h, P.foot[i][1] + tv[1] * h, lift + h); q.push((lift + h) / (hmax || 1)); return q; };
  const cu = P.foot.reduce((a, q) => a + q[0], 0) / n, cv = P.foot.reduce((a, q) => a + q[1], 0) / n;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = P.foot[i], b = P.foot[j]; let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if (nx * ((a[0] + b[0]) / 2 - cu) + ny * ((a[1] + b[1]) / 2 - cv) < 0) { nx = -nx; ny = -ny; }
    out.push({ pi, kind: 0, lit: Math.max(0.25, Math.min(0.9, 0.62 - 0.3 * nx)), pts: [at(i, false), at(j, false), at(j, true), at(i, true)] });
  }
  out.push({ pi, kind: 1, pts: P.foot.map((q, i) => at(i, true)) });
}
// the tower's prism (the mockup's hex at the tower's turn, its visible height): depth only, so what is behind it never shows
function ice3dTower(J, out) {
  const R = 40, rot = J.rot, ft = Array.from({ length: 6 }, (_, k) => { const a = (-90 + rot + 60 * k) * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; });
  for (let i = 0; i < 6; i++) { const a = ft[i], b = ft[(i + 1) % 6]; out.push({ pi: -1, kind: 2, pts: [ice3dPt(J, a[0], a[1], 0), ice3dPt(J, b[0], b[1], 0), ice3dPt(J, b[0], b[1], J.proj.Hs), ice3dPt(J, a[0], a[1], J.proj.Hs)] }); }
  out.push({ pi: -1, kind: 2, pts: ft.map(q => ice3dPt(J, q[0], q[1], J.proj.Hs)) });
}
const ice3dRgb = css => { const m = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(css || "") || [0, 0, 0, 0]; return [+m[1], +m[2], +m[3]]; };
// a bake job for the pieces `list` (one solid each) at k x the first view's scale: its canvas, depth buffer and phases
function ice3dBegin(list, proj, rot, k, ice, frz, glow) {
  if (!list.length) return null;
  const J = { list, proj, rot, k, ice, frz, glow, faces: [], phase: 0, i: 0 };
  list.forEach((P, pi) => ice3dFaces(J, P, pi, J.faces)); ice3dTower(J, J.faces);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const f of J.faces) if (f.kind < 2) for (const q of f.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const pad = Math.ceil(6 * k * proj.s), W = Math.ceil(x1 - x0) + 2 * pad, H = Math.ceil(y1 - y0) + 2 * pad;
  if (!(W > 0 && H > 0) || W * H > 6e6) return null;
  J.ox = x0 - pad; J.oy = y0 - pad; J.W = W; J.H = H; J.z = new Float32Array(W * H).fill(-1e9); J.id = new Int32Array(W * H).fill(-1); J.hf = new Float32Array(W * H);
  J.cv = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(1, 1); J.cv.width = W; J.cv.height = H; /* (in the ice worker an OffscreenCanvas: aspira-frz-ice.js iceBakeHere) */ J.g = J.cv.getContext("2d", { willReadFrequently: true }); // (a CPU canvas: putImageData on a GPU one cost ~110 ms a call in WebKit, whatever the size)
  return J;
}
// one triangle into the depth buffer, rows Y..: per pixel centre, the nearest face wins; -> the next row to do (past Y1: done)
function ice3dSetup(J, fi, A, B, C) {
  const ax = A[0] - J.ox, ay = A[1] - J.oy, bx = B[0] - J.ox, by = B[1] - J.oy, cx = C[0] - J.ox, cy = C[1] - J.oy, ar = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(ar) < 1e-9) return null;
  return { fi, A, B, C, ax, ay, bx, by, cx, cy, ar, X0: Math.max(0, Math.floor(Math.min(ax, bx, cx))), X1: Math.min(J.W - 1, Math.ceil(Math.max(ax, bx, cx))), Y: Math.max(0, Math.floor(Math.min(ay, by, cy))), Y1: Math.min(J.H - 1, Math.ceil(Math.max(ay, by, cy))) };
}
function ice3dRow(J, T) {
  const W = J.W, py = T.Y++, y = py + 0.5, { A, B, C, ax, ay, bx, by, cx, cy, ar, fi } = T;
  for (let px = T.X0; px <= T.X1; px++) {
    const x = px + 0.5, w0 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / ar, w1 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / ar, w2 = 1 - w0 - w1;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    const d = w0 * A[2] + w1 * B[2] + w2 * C[2], o = py * W + px;
    if (d > J.z[o]) { J.z[o] = d; J.id[o] = fi; J.hf[o] = w0 * A[3] + w1 * B[3] + w2 * C[3]; }
  }
  return T.Y <= T.Y1;
}
// the ridges of one solid: its uprights, its top's outline and its floor edges, each kept only where the depth test shows it
function ice3dEdges(J, f, path) {
  const P = f.pts, n = P.length, seg = (A, B) => { const L = Math.hypot(B[0] - A[0], B[1] - A[1]), st = Math.max(2, Math.ceil(L / 1.5)); let on = false;
    for (let s = 0; s <= st; s++) { const t = s / st, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, d = A[2] + (B[2] - A[2]) * t, px = Math.floor(x - J.ox), py = Math.floor(y - J.oy);
      let vis = false; for (let dy = -1; dy <= 1 && !vis; dy++) for (let dx = -1; dx <= 1 && !vis; dx++) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= J.W || qy >= J.H) { vis = true; continue; } const z = J.z[qy * J.W + qx]; vis = d >= z - ICE3D_EPS; }
      if (vis) { if (on) path.lineTo(x - J.ox, y - J.oy); else path.moveTo(x - J.ox, y - J.oy); } on = vis; } };
  for (let i = 0; i < n; i++) seg(P[i], P[(i + 1) % n]);
}
function ice3dRun(J, ms) { // its phases for up to ms: 0 the depth buffer, rows of a triangle; 1 the colours, a row; 3 onto the canvas, a band; 2 the ridges, a face; -> done
  const t0 = performance.now(), F = J.faces;
  while (performance.now() - t0 < ms) {
    if (J.phase === 0) { // a row of a triangle at a time (a tall shard at the bake's scale is a lot of pixels)
      if (!J.tris) { J.tris = []; F.forEach((f, fi) => { const p = f.pts; for (let q = 1; q + 1 < p.length; q++) { const T = ice3dSetup(J, fi, p[0], p[q], p[q + 1]); if (T) J.tris.push(T); } }); }
      if (J.i >= J.tris.length) { J.phase = 1; J.i = 0; J.img = J.g.createImageData(J.W, J.H); J.bg = ice3dRgb(J.bgCss || COL.bg); J.ic = ice3dRgb(J.ice); continue; }
      const T = J.tris[J.i]; for (let r = 0; r < 8; r++) if (!ice3dRow(J, T)) { J.i++; break; } continue; }
    if (J.phase === 1) { if (J.i >= J.H) { J.phase = 3; J.i = 0; continue; }
      const D = J.img.data; for (let x = 0, o = J.i * J.W; x < J.W; x++, o++) { const fi = J.id[o]; if (fi < 0) continue; const f = F[fi]; if (f.kind === 2) continue;
        const a = f.kind === 1 ? 0.17 : 0.4 * f.lit * (0.1 + 0.9 * Math.max(0, Math.min(1, J.hf[o]))), q = o * 4; // the ice tint over the opaque base: a wall 0.4 x its light at the top to a tenth of it at the floor, a top 0.17
        D[q] = J.bg[0] + (J.ic[0] - J.bg[0]) * a; D[q + 1] = J.bg[1] + (J.ic[1] - J.bg[1]) * a; D[q + 2] = J.bg[2] + (J.ic[2] - J.bg[2]) * a; D[q + 3] = 255; }
      J.i++; continue; }
    if (J.phase === 3) { if (J.i >= J.H) { J.phase = 2; J.i = 0; J.img = null; continue; } // the pixels onto the canvas in bands (a whole putImageData was 156 ms in WebKit)
      const h = Math.min(ICE3D_BAND, J.H - J.i), D = J.img.data;
      if (typeof ImageData === "function" && D && D.buffer) J.g.putImageData(new ImageData(new Uint8ClampedArray(D.buffer, D.byteOffset + J.i * J.W * 4, J.W * h * 4), J.W, h), 0, J.i); // (a band of its own: a dirty rect still cost the whole image)
      else { J.g.putImageData(J.img, 0, 0); J.i = J.H; continue; } // (no ImageData constructor - the smoke's stand-in: all at once)
      J.i += h; continue; }
    if (J.phase === 2) { if (J.i >= F.length) return true; const g = J.g, f = F[J.i++]; if (f.kind === 2) continue; const path = new Path2D(); ice3dEdges(J, f, path);
      const u = J.k * J.proj.s * Math.hypot(...J.proj.ex); /* px a mockup unit */ g.lineJoin = "round"; g.lineCap = "round";
      g.globalAlpha = f.kind === 1 ? 0.95 : 0.6; g.strokeStyle = J.ice; g.lineWidth = 0.9 * u; g.shadowColor = J.frz; g.shadowBlur = J.glow ? 3.2 * 0.9 * u : 0; g.stroke(path); g.shadowBlur = 0; g.globalAlpha = 1; continue; }
    return true;
  }
  return false;
}

