// /spire - FRZ'S ICE: PERMAFROST AND FRACTURE CRYSTALS (owner, 2026-11-06: "Permafrost: Add tower shaped hexagonal prisms ... with at least one face fully touching
// the tower or another permafrost prism ... fill innermost faces before expanding" / "Fracture: Same, except triangular prisms, and have the top face at a steep
// angle ... positionally distributed normally (less likely further from tower) allow and calculated intersections, then save final geometry or something to
// save on render" - and the day's refinements: counts 8/16/24/36/48 and 9/15/24/33/45, sizes, heights 10-40% / 80-220%, the top face never covered, nothing
// wholly hidden behind the tower, no shard straddling a hex, left / right volume balanced, heights falling off toward the edge, opaque faces). The generator
// is the approved mockup's (tower-looks.html, I_genPerma / I_genFrac / I_paintOrder), run per tower IN THAT TOWER'S OWN VIEW (Gm: its screen squash and visible
// height and its hex's turn, from its 3D frame - frzIceView), in the mockup's units (a hex of radius 40, screen y down from the top face's centre), seeded
// by its cell, and TIME-SLICED (frzIceStep: a few ms a frame - a full set is ~2 s of work; the crystals appear in their first-n order, growing in). Each
// tower's pieces are BAKED into two canvases - behind its prism and in front of it - redrawn only when its tiers, its grown count or the zoom change; a frame
// draws two images a FRZ (drawFrzIce, from drawOrbiters). Look only
const ICE_SLICE_MS = 3;
const I_TAU = Math.PI * 2;
// the tower whose ice is being built or drawn: the generator reads these (iceUse sets them from that tower's own maker, so the code stays the mockup's)
let I_G = null, I_HEX_ROT = 0, I_ST = null, I_SEED_P = 0, I_SEED_F = 0, I_HAX, I_TOP_CLEAR, I_TOWER_SIL, I_TOWER_FOOT, I_TOWER_NODE;
function iceHull(P) { // the convex hull (monotone chain)
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function iceUse(M) {
  I_G = M.G; I_HEX_ROT = M.rot; I_ST = M.ST; I_SEED_P = M.sp; I_SEED_F = M.sf;
  if (!M.d) M.d = {};
  I_HAX = M.d.HAX ||= ([0, 60, 120].map(d => [Math.cos((d + I_HEX_ROT) * Math.PI / 180), Math.sin((d + I_HEX_ROT) * Math.PI / 180)]));
  I_TOP_CLEAR = M.d.TOP_CLEAR ||= (I_inflate(I_hexPts(I_G, I_G.R, 0), 5));
  I_TOWER_SIL = M.d.TOWER_SIL ||= iceHull(I_hexPts(I_G, I_G.R, 0).concat(I_hexPts(I_G, I_G.R, -I_G.Hs))); // (the prism's outline on screen: the hull of its top and bottom - any turn)
  I_TOWER_FOOT = M.d.TOWER_FOOT ||= ([0, 1, 2, 3, 4, 5].map(k => [I_G.R * Math.cos((-90 + I_HEX_ROT + 60 * k) * Math.PI / 180), I_G.R * Math.sin((-90 + I_HEX_ROT + 60 * k) * Math.PI / 180)]));
  I_TOWER_NODE = M.d.TOWER_NODE ||= ({ foot: I_TOWER_FOOT, key: 0, hostPr: null, tower: true });
}
const I_clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function I_rng(seed) { let a = seed | 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function I_hexPts(g, r, z) { const o = []; for (let k = 0; k < 6; k++) { const a = (-90 + I_HEX_ROT + 60 * k) * Math.PI / 180; o.push([g.cx + r * Math.cos(a), g.cy - z + r * g.sq * Math.sin(a)]); } return o; }
const I_poly = () => null; // (the mockup's Path2D: the game draws from the points - frzIceBake)
// ---------- FRZ ----------
// Wai 11-06 FRZ pass. PERMAFROST = ice hex prisms glued face to face (same orientation as the tower's hex); FRACTURE = triangular ice shards with a steep slanted
// top, scattered round the tower. Each feature's geometry is built ONCE from one seeded sequence (a tier takes the first n, so earlier pieces stay), the prism
// paths are cached per tier pair, and a cell only paints them back to front: pieces behind the tower first, then the tower, then the pieces in front.
const I_ICE_N = { perma: [0, 8, 16, 24, 36, 48], frac: [0, 9, 15, 24, 33, 45] };
const I_ICE_STATS = { perma: [0, 0], frac: [0, 0], hidden: 0, shards: { free: 0, in: 0, moveIn: 0, moveOut: 0 } }; // [placed at V, shortened to clear the tower's top face]
const I_COS30 = Math.cos(Math.PI / 6);
const I_hexHit = (c1, a1, c2, a2) => I_HAX.every(n => Math.abs((c1[0] - c2[0]) * n[0] + (c1[1] - c2[1]) * n[1]) < a1 + a2 - 0.4); // same-orientation hexes overlap (SAT)
const I_lerp = (a, b, f) => a + (b - a) * f;
// one prism's drawing data: its floor outline [u, v], a height above its base at each vertex (a hex is flat topped, a shard slanted) and the base's own lift
// above the floor (a shard standing on a hex starts at that hex's top). Only the faces that FACE THE VIEWER are kept, as for any convex solid: the walls whose
// normal points toward the viewer and the top only when its real 3D normal does (a slanted top can face away). `key` is the depth the piece is sorted by.
function I_buildPrism(base, hg, lift = 0, key) {
  const g = I_G, tv = base.tv || [0, 0], S = (p, h) => [g.cx + p[0] + tv[0] * h, g.cy + (p[1] + tv[1] * h) * g.sq + g.Hs - lift - h], n = base.length; // tv: a shard's lean, floor units a unit up

  const cen = [base.reduce((s, p) => s + p[0], 0) / n, base.reduce((s, p) => s + p[1], 0) / n];
  let topVis = true;
  if (n === 3) { // the view direction toward the viewer is (0, 1, sq) in (u, v, up); a slanted top is visible only if its 3D normal has a positive component along it
    const T3 = base.map((p, i) => [p[0] + tv[0] * hg[i], p[1] + tv[1] * hg[i], hg[i]]), e1 = [T3[1][0] - T3[0][0], T3[1][1] - T3[0][1], T3[1][2] - T3[0][2]], e2 = [T3[2][0] - T3[0][0], T3[2][1] - T3[0][1], T3[2][2] - T3[0][2]];
    let nm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; if (nm[2] < 0) nm = nm.map(q => -q);
    topVis = nm[1] + g.sq * nm[2] > 0.02 * Math.hypot(nm[0], nm[1], nm[2]) * Math.hypot(1, g.sq);
  }
  const topPts = base.map((p, i) => S(p, hg[i])), walls = [], ridge = { moveTo() {}, lineTo() {}, addPath() {} }, floor = { moveTo() {}, lineTo() {} };
  let y0 = 1e9, y1 = -1e9;
  topPts.forEach(q => { y0 = Math.min(y0, q[1]); });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = base[i], b = base[j];
    let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    if (nx * ((a[0] + b[0]) / 2 - cen[0]) + ny * ((a[1] + b[1]) / 2 - cen[1]) < 0) { nx = -nx; ny = -ny; }
    if (ny < 0.05) continue; // a wall facing away (or edge-on) is hidden, as on the tower
    const p0 = S(a, 0), p1 = S(b, 0), p2 = S(b, hg[j]), p3 = S(a, hg[i]);
    walls.push({ path: I_poly([p0, p1, p2, p3], true), lit: I_clamp(0.62 - 0.3 * nx, 0.25, 0.9), pts: [p0, p1, p2, p3] });
    floor.moveTo(p0[0], p0[1]); floor.lineTo(p1[0], p1[1]);
    ridge.moveTo(p0[0], p0[1]); ridge.lineTo(p3[0], p3[1]); ridge.moveTo(p1[0], p1[1]); ridge.lineTo(p2[0], p2[1]);
    if (!topVis) { ridge.moveTo(p3[0], p3[1]); ridge.lineTo(p2[0], p2[1]); } // a hidden top leaves only the walls' own top edges
    y1 = Math.max(y1, p0[1], p1[1]);
  }
  if (topVis) ridge.addPath(I_poly(topPts, true));
  return { walls, top: I_poly(topPts, true), topPts, topVis, ridge, floor, y0, y1: Math.max(y1, y0 + 1), v: cen[1], key: key === undefined ? cen[1] : key, foot: base, hg, lift, tv }; // (foot, hg, lift, tv: the solid itself - the 3D bake)
}
// NEVER OCCLUDE THE TOP FACE (Wai 11-06): a piece in front of the tower (centre v >= 0) whose silhouette (visible walls + top polygon, in screen space) would
// overlap the tower's top-face hex has its heights scaled down (slant kept) by the largest factor that clears it with 3 units to spare (stroke + glow). Done once, at generation.
function I_inflate(pts, d) { // a convex polygon with every edge pushed outward by d (mitred corners)
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n, E = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    if (nx * ((a[0] + b[0]) / 2 - mx) + ny * ((a[1] + b[1]) / 2 - my) < 0) { nx = -nx; ny = -ny; }
    E.push([nx, ny, nx * a[0] + ny * a[1] + d]);
  }
  return pts.map((q, i) => { const p = E[(i + n - 1) % n], e = E[i], det = p[0] * e[1] - p[1] * e[0]; return [(p[2] * e[1] - p[1] * e[2]) / det, (p[0] * e[2] - p[2] * e[0]) / det]; });
}
function I_polyHit(A, B) { // do two convex polygons overlap (SAT, strict)
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = b[1] - a[1], ny = a[0] - b[0]; if (Math.abs(nx) + Math.abs(ny) < 1e-9) continue;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const q of A) { const d = q[0] * nx + q[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const q of B) { const d = q[0] * nx + q[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (a1 <= b0 + 1e-6 || b1 <= a0 + 1e-6) return false; // touching (to rounding) is not overlapping
  }
  return true;
}
// Wai 11-06: a back-group piece whose whole silhouette sits inside the tower's silhouette (walls + top face; FRZ draws both opaque) would be invisible: never placed
const I_inPoly = (P, q) => { let pos = false, neg = false; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], cr = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); if (cr > 1e-6) pos = true; if (cr < -1e-6) neg = true; } return !(pos && neg); }; // q inside (or on) a convex polygon
const I_inTower = q => I_inPoly(I_TOWER_SIL, q);
const I_hiddenByTower = pr => pr.key < 0 && pr.walls.every(w => w.pts.every(I_inTower)) && pr.topPts.every(I_inTower);
const I_hitsTop = pr => pr.walls.map(w => w.pts).concat([pr.topPts]).some(sh => I_polyHit(sh, I_TOP_CLEAR));
function I_fitFront(base, hg, lift = 0, key) { /* returns its prism, cut (0 or 1) and k (the height scale used), or null when even a flat piece would sit on the top face */
  const at = k => I_buildPrism(base, hg.map(h => h * k), lift, key), pr = at(1);
  if (pr.key < 0 || !I_hitsTop(pr)) return { pr, cut: 0, k: 1 }; // behind the tower, or in front but clear: heights stay
  let lo = 0.02, hi = 1; if (I_hitsTop(at(lo))) return null;
  for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (I_hitsTop(at(mid))) hi = mid; else lo = mid; } // lo = kmax, the longest height that still clears
  const k = lo * (0.35 + 0.65 * I_rng(Math.round(base[0][0] * 997 + base[0][1] * 31))()); // a random cut, 0.35 kmax..kmax (Wai 11-06): a smaller scale always clears too
  return { pr: at(k), cut: 1, k };
}
// PERMAFROST: each new crystal's face lies fully on a face of the tower or of an earlier crystal (the shorter face inside the longer); the tower's six faces
// are tried first, then ring 1 crystals, and so on outward. Radius 1/3..2/3 of the tower's, height 20-70% of its height, both biased big/tall near the tower.
// LEFT / RIGHT BALANCE BY VOLUME (Wai 11-06: "try to balance by volume the shards on the left and right sides"): a piece's volume is its footprint area x height (a shard: its
// average height), its side the sign of its centre's u. Each placement is the BEST of a pool of valid candidates (all other rules already satisfied): the one that leaves the
// running left/right volumes closest to equal, so every first-n prefix (every tier) stays balanced; hexes and shards are each balanced on their own, hence together too.
// HEIGHT FALLOFF (Wai 11-06: "a stronger height reduction as fracs and perma approach the edge"): a crystal's height is multiplied by 1 - 0.75 s^1.5, s = how far its centre is from
// the tower's edge over the largest practical distance (I_FALL_DMAX), so the outermost crystals stand at ~25% and the inner ones are nearly untouched; the volumes below use it.
const I_FALL_DMAX = 60;
const I_edgeDist = c => Math.max(0, Math.max(...I_HAX.map(n => Math.abs(c[0] * n[0] + c[1] * n[1]))) - I_G.R * I_COS30);
const I_heightFall = c => 1 - 0.75 * Math.pow(I_clamp(I_edgeDist(c) / I_FALL_DMAX, 0, 1), 1.5);
const I_balScore = (vol, v, u) => { const l = vol[0] + (u < 0 ? v : 0), r = vol[1] + (u < 0 ? 0 : v); return Math.abs(l - r) / (l + r); };
function* I_genPerma(N) {
  const g = I_G, r = I_rng(I_SEED_P), aT = g.R * I_COS30, nodes = [{ c: [0, 0], a: aT, side: g.R, ring: 0, used: new Set() }], out = I_ST.hexes, vol = [0, 0], rMin = g.R / 9; // radius R/9..2R/3
  let k = 1; // when it runs out of room the outer pieces shrink (k) toward the smallest allowed size
  const candidates = (nd, ring) => { // every feasible crystal glued to a free face of nd (the shorter face inside the longer)
    const pool = [];
    for (let f = 0; f < 6; f++) { if (nd.used.has(f)) continue;
      for (let tr = 0; tr < 8; tr++) {
        const rad = Math.max(rMin, I_lerp(rMin, g.R * 2 / 3, Math.pow(r(), 0.55 + 0.4 * (ring - 1))) * k), a = rad * I_COS30, hgt0 = g.Hs * (0.1 + 0.3 * Math.pow(r(), 0.6 + 0.35 * (ring - 1))); // height 10-40% of the tower's, then the falloff below
        const ph = (-60 + I_HEX_ROT + 60 * f) * Math.PI / 180, n = [Math.cos(ph), Math.sin(ph)], s = (r() * 2 - 1) * Math.abs(nd.side - rad) / 2;
        const c = [nd.c[0] + n[0] * (nd.a + a) - n[1] * s, nd.c[1] + n[1] * (nd.a + a) + n[0] * s];
        if (Math.abs(c[0]) + a > 86 || c[1] + rad > 100 || c[1] - rad < -105) continue;
        if (I_hexHit(c, a, [0, 0], aT) || out.some(o => I_hexHit(c, a, o.c, o.a))) continue;
        const hgt = hgt0 * I_heightFall(c);
        const fit = I_fitFront(Array.from({ length: 6 }, (v, q) => [c[0] + rad * Math.cos((-90 + I_HEX_ROT + 60 * q) * Math.PI / 180), c[1] + rad * Math.sin((-90 + I_HEX_ROT + 60 * q) * Math.PI / 180)]), Array(6).fill(hgt));
        if (!fit) continue;
        if (I_hiddenByTower(fit.pr)) { I_ICE_STATS.hidden++; continue; } // wholly behind the tower: invisible, try another spot
        pool.push({ nd, f, c, a, rad, hgt, fit, ring, v: 2.598 * rad * rad * hgt * fit.k, back: Math.sin(ph) < -0.1, hRaw: hgt0, d: I_edgeDist(c) });
      } }
    return pool;
  };
  while (out.length < N) {
    let pick = null;
    for (const rg of [...new Set(nodes.map(x => x.ring))].sort((x, y) => x - y)) { // the innermost ring that has any feasible crystal (the tower's faces first)
      const pool = []; for (const nd of nodes) if (nd.ring === rg) { pool.push(...candidates(nd, rg + 1)); yield -1; } // (yield: a slice may end between nodes - frzIceMaker's step)
      if (pool.length) { pick = pool.map(q => [I_balScore(vol, q.v, q.c[0]) + (q.back ? 0.02 : 0), q]).sort((x, y) => x[0] - y[0])[0][1]; break; } // faces turned away from the viewer only as a tie-breaker
    }
    if (!pick) { if (k < 0.12) break; k *= 0.75; continue; }
    yield out.length; pick.nd.used.add(pick.f); I_ICE_STATS.perma[1] += pick.fit.cut; vol[pick.c[0] < 0 ? 0 : 1] += pick.v;
    const nn = { c: pick.c, a: pick.a, side: pick.rad, ring: pick.ring, used: new Set([(pick.f + 3) % 6]), prism: pick.fit.pr, hgt: pick.hgt * pick.fit.k, vol: pick.v, hRaw: pick.hRaw, hDrawn: pick.hgt * pick.fit.k, d: pick.d }; nodes.push(nn); out.push(nn); // hgt: its real top height, for a shard that stands on it
  }
  return out;
}
// FRACTURE: triangular prisms sprouting anywhere round the tower (a 2D normal falloff from its centre, none inside its footprint); the top face slants steeply
// from one tall vertex, so each is a sharp shard. NO SHARD STRADDLES A HEX (Wai 11-06): a shard whose base overlaps a Permafrost hex is moved either wholly
// inside that hex (then it rises out of the hex's top face) or wholly outside every hex, whichever needs the smaller move. Shard-on-shard overlaps are fine.
const I_centroid3 = t => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];
function I_shiftInside(tri, hp) { // the smallest move that puts the whole triangle inside convex polygon hp, or null when it cannot fit
  const c0 = I_centroid3(tri), off = tri.map(q => [q[0] - c0[0], q[1] - c0[1]]), hc = [hp.reduce((s, q) => s + q[0], 0) / hp.length, hp.reduce((s, q) => s + q[1], 0) / hp.length], E = [];
  for (let i = 0; i < hp.length; i++) {
    const a = hp[i], b = hp[(i + 1) % hp.length]; let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    if (nx * (a[0] - hc[0]) + ny * (a[1] - hc[1]) < 0) { nx = -nx; ny = -ny; }
    E.push({ n: [nx, ny], lim: nx * a[0] + ny * a[1] - Math.max(...off.map(o => nx * o[0] + ny * o[1])) - 1e-4 }); // the centre may go no further than this along the edge's normal
  }
  const c = c0.slice();
  for (let it = 0; it < 80; it++) { let moved = false; for (const e of E) { const s = e.n[0] * c[0] + e.n[1] * c[1] - e.lim; if (s > 0) { c[0] -= s * e.n[0]; c[1] -= s * e.n[1]; moved = true; } } if (!moved) break; }
  const t2 = off.map(o => [c[0] + o[0], c[1] + o[1]]);
  return t2.every(q => I_inPoly(hp, q)) ? { tri: t2, dist: Math.hypot(c[0] - c0[0], c[1] - c0[1]) } : null;
}
function I_shiftOutside(tri, hexP, ok, a0) { // the nearest spot (a ring search from the shard) where the triangle touches no hex
  for (let rho = 0.5; rho <= 45; rho += 0.5) for (let j = 0; j < 24; j++) {
    const a = a0 + j * I_TAU / 24, t2 = tri.map(q => [q[0] + rho * Math.cos(a), q[1] + rho * Math.sin(a)]);
    if (ok(t2) && !hexP.some(h => I_polyHit(t2, h))) return { tri: t2, dist: rho };
  }
  return null;
}
const I_fitShard = (s, lift, hostV) => I_fitFront(s.tri, s.hg, lift, lift ? Math.max(s.v, hostV + 0.01) : s.v); // a shard standing on a hex sorts just after it
function* I_genFrac(N, hexes) {
  const g = I_G, r = I_rng(I_SEED_F), aT = g.R * I_COS30, out = I_ST.specs, vol = [0, 0], gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(I_TAU * r());
  const hexP = hexes.map(h => [0, 1, 2, 3, 4, 5].map(k => [h.c[0] + h.side * Math.cos((-90 + I_HEX_ROT + 60 * k) * Math.PI / 180), h.c[1] + h.side * Math.sin((-90 + I_HEX_ROT + 60 * k) * Math.PI / 180)]));
  const spot = (t, rs) => { const p = I_centroid3(t), hd = Math.max(...I_HAX.map(n => Math.abs(p[0] * n[0] + p[1] * n[1]))); return hd >= aT + 0.35 * rs && Math.abs(p[0]) + rs * 0.87 <= 86 && p[1] + rs <= 100 && p[1] - rs >= -105; }; // outside the tower, inside the canvas
  const make = () => { // one valid candidate shard (every rule satisfied), or null
    const p = [gauss() * 0.65 * g.R, gauss() * 0.65 * g.R] /* tighter round the tower (Wai 11-06: more likely near it; sd was R) */, hd = Math.max(...I_HAX.map(n => Math.abs(p[0] * n[0] + p[1] * n[1]))), near = I_clamp((hd - aT) / 40, 0, 2);
    const rs = I_lerp(g.R / 6, g.R / 3, /* side R/6..R/3: footprint halved, height kept (Wai 11-06) */ Math.pow(r(), 0.55 + 0.4 * near)) / Math.sqrt(3), hmax = g.Hs * (0.8 + 1.4 * Math.pow(r(), 0.3 + 0.7 * near)); /* taller near the tower (Wai 11-06; exponent was 0.6 + 0.35 near) */ // rs: circumradius; height 80-220% of the tower's
    const psi = r() * I_TAU, tri0 = [0, 1, 2].map(k => [p[0] + rs * Math.cos(psi + k * I_TAU / 3), p[1] + rs * Math.sin(psi + k * I_TAU / 3)]);
    if (!spot(tri0, rs)) return null;
    const th = (50 + 20 * r()) * Math.PI / 180; let ga; do { ga = r() * I_TAU; } while (Math.tan(th) * Math.sin(ga) > 0.45); // ga: the direction the top RISES toward; not strongly toward the viewer, or the top face would face away
    const gd = [Math.cos(ga), Math.sin(ga)], pr = tri0.map(q => q[0] * gd[0] + q[1] * gd[1]), pm = Math.max(...pr), hg = pr.map(x => I_clamp(hmax - Math.tan(th) * (pm - x), 0.15 * hmax, hmax));
    // POKING THROUGH IS FINE (owner, 2026-11-06: "Allow poking in and out of perms" - the old rule moved a shard wholly inside a hex or wholly out): a shard
    // stands on the floor wherever it falls, a crossing drawn right by the bake's depth test (frzIce3dBake). LEANING OUT (owner: "Tilt fracs away from centre of
    // tower, random amounts between 15 and 30 deg"): its axis tilts away from the tower's centre by a seeded 15-30 deg from upright, the base on the floor
    // (tv: floor units a unit up, in the mockup's units - g.K3 turns a real angle into them); its tips stay inside the canvas (and so inside the moons' orbit)
    const tri = tri0, host = -1, how = 'free', ct = I_centroid3(tri0), cl = Math.hypot(ct[0], ct[1]) || 1, lean = Math.tan((15 + 15 * r()) * Math.PI / 180) * (g.K3 || 1);
    tri.tv = [ct[0] / cl * lean, ct[1] / cl * lean];
    if (!tri.every((q, i) => { const x = q[0] + tri.tv[0] * hg[i], y = q[1] + tri.tv[1] * hg[i]; return Math.abs(x) <= 86 && y <= 100 && y >= -105; })) return null;
    const c2 = I_centroid3(tri), f = I_heightFall(c2), hgS = hg.map(h => h * f), spec = { tri, hg: hgS, host, hostH: host >= 0 ? hexes[host].hgt : 0, v: c2[1], u: c2[0] };
    let fit = null; // it must work in every scene it can appear in: on its hex (hex shown) and on the floor (hex not shown)
    for (const lift of host >= 0 ? [0, spec.hostH] : [0]) { fit = I_fitShard(spec, lift, host >= 0 ? hexes[host].c[1] : 0); if (!fit || I_hiddenByTower(fit.pr)) { I_ICE_STATS.hidden++; return null; } }
    spec.vol = 1.299 * rs * rs * (hgS[0] + hgS[1] + hgS[2]) / 3 * fit.k; // footprint area x average height (with the falloff)
    spec.hRaw = (hg[0] + hg[1] + hg[2]) / 3; spec.hDrawn = spec.vol / (1.299 * rs * rs); spec.d = I_edgeDist(c2);
    return { spec, how, fit };
  };
  while (out.length < N) {
    const want = I_ICE_N.frac.includes(out.length + 1) ? 200 : 24; // a tier boundary gets a bigger pool, so the ratio there is tight
    const pool = []; for (let tr = 0; tr < 6000 && pool.length < want; tr++) { const cnd = make(); if (cnd) pool.push(cnd); if ((tr & 15) === 15) yield -1; } // (yield: slices end inside the pool)
    if (!pool.length) break;
    let pick = null;
    pick = pool.map(q => [I_balScore(vol, q.spec.vol, q.spec.u), q]).sort((x, y) => x[0] - y[0])[0][1]; // (no painter-order test: the 3D bake's depth test draws any crossing right)
    yield out.length;
    vol[pick.spec.u < 0 ? 0 : 1] += pick.spec.vol; I_ICE_STATS.frac[1] += pick.fit.cut; I_ICE_STATS.shards[pick.how] = (I_ICE_STATS.shards[pick.how] || 0) + 1; out.push(pick.spec);
  }
  return out;
}
const I_shardPrism = (s, nP) => { const lift = s.host >= 0 && s.host < nP ? s.hostH : 0; return I_fitShard(s, lift, lift ? I_ST.hexes[s.host].c[1] : 0).pr; };
// PAINTER ORDER (Wai 11-06): for every pair of prisms whose screen silhouettes overlap, the one nearer the viewer is drawn later. "Nearer" comes from a separating
// axis between their FLOOR footprints (the vertical plane between them has the camera on one side; the view direction on the floor is +v); a shard standing on a hex
// goes right after it; then a topological sort (a cycle, or a pair the footprints cannot separate, is broken by centre depth). The tower is a node too: the pieces
// ordered before it are painted before it ('under'), the rest after its top face.
function I_frontOf(A, B) { // 1: footprint A is nearer the viewer than B; -1: farther; 0: not decided
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length]; let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny); if (l < 1e-9) continue; nx /= l; ny /= l;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const q of A) { const d = q[0] * nx + q[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const q of B) { const d = q[0] * nx + q[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (Math.abs(ny) < 1e-3) continue; // a plane along the view direction orders nothing
    if (a1 <= b0 + 1e-6) return ny > 0 ? -1 : 1; // B lies on the + side of the plane, A on the - side: the camera is on the + side when ny > 0
    if (b1 <= a0 + 1e-6) return ny > 0 ? 1 : -1;
  }
  return 0;
}
function I_paintOrder(list) {
  const nodes = list.concat([I_TOWER_NODE]), n = nodes.length;
  const info = nodes.map(P => {
    const f = P.tower ? [I_TOWER_SIL] : P.walls.map(w => w.pts).concat(P.topVis ? [P.topPts] : []), xs = f.flat().map(q => q[0]), ys = f.flat().map(q => q[1]);
    return { f, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  const out = nodes.map(() => new Set()), indeg = Array(n).fill(0), add = (a, b) => { if (!out[a].has(b)) { out[a].add(b); indeg[b]++; } }; // a is painted before b
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const P = nodes[i], Q = nodes[j], A = info[i], B = info[j];
    if (Q.hostPr === P) { add(i, j); continue; } if (P.hostPr === Q) { add(j, i); continue; } // a shard goes right after its host hex
    if (A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0) continue; // bounding boxes apart
    if (!A.f.some(fa => B.f.some(fb => I_polyHit(fa, fb)))) continue; // silhouettes apart
    const o = I_frontOf(P.foot, Q.foot);
    if (o > 0) add(j, i); else if (o < 0) add(i, j); else if (P.key <= Q.key) add(i, j); else add(j, i);
  }
  const done = Array(n).fill(false), seq = [], pos = Array(n).fill(0);
  for (let c = 0; c < n; c++) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && indeg[i] <= 0 && (pick < 0 || nodes[i].key < nodes[pick].key)) pick = i; // the farthest free one first
    if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || indeg[i] < indeg[pick] || (indeg[i] === indeg[pick] && nodes[i].key < nodes[pick].key))) pick = i; // a cycle
    done[pick] = true; pos[pick] = c; seq.push(nodes[pick]); out[pick].forEach(b => { indeg[b]--; });
  }
  let bad = 0; out.forEach((set, a) => set.forEach(b => { if (pos[a] > pos[b]) bad++; })); // edges the order could not honour (a cycle)
  const t = seq.indexOf(I_TOWER_NODE);
  return { back: seq.slice(0, t), front: seq.slice(t + 1), bad };
}

function frzIceMaker(sp, sf, Gm, rot) {
  const M = { G: Gm, rot, sp, sf, ST: { hexes: [], specs: [] }, gp: null, gf: null, done: false };
  iceUse(M); M.gp = I_genPerma(I_ICE_N.perma[5]);
  M.step = ms => { iceUse(M); const t0 = performance.now(); while (!M.done && performance.now() - t0 < ms) { if (!M.gf) { if (M.gp.next().done) M.gf = I_genFrac(I_ICE_N.frac[5], M.ST.hexes); } else if (M.gf.next().done) M.done = true; } return M.done; };
  M.count = () => M.ST.hexes.length + M.ST.specs.length;
  M.scene = (np, nf) => {
    iceUse(M); const nP = Math.min(I_ICE_N.perma[np], M.ST.hexes.length), nF = M.gf ? Math.min(I_ICE_N.frac[nf], M.ST.specs.length) : 0, perma = M.ST.hexes.slice(0, nP).map(h => h.prism);
    const shards = M.ST.specs.slice(0, nF).map(s => { const pr = I_shardPrism(s, nP); pr.hostPr = s.host >= 0 && s.host < nP ? perma[s.host] : null; return pr; });
    return I_paintOrder(perma.concat(shards));
  };
  return M;
}
// ---------- in the game: each FRZ's own view, maker, bake and draw ----------
// THE TOWER'S VIEW, in the mockup's units: m px a unit (its hex radius is 40), its screen squash (sq), its prism's visible height (Hs) and its hex's turn
// (rot, degrees from the mockup's corner-up) - read off its 3D frame at its top and its floor; T: the top face's centre on screen (device px)
function frzIceView(t, x, y, top, Rw) {
  const Ft = warpFrame(x, y, top), Fb = warpFrame(x, y, 0), k = Math.hypot(Ft[0], Ft[1]), sq = Math.hypot(Ft[2], Ft[3]) / k, m = Rw * k / 40;
  const T = { x: Ft[0] * x + Ft[2] * y + Ft[4], y: Ft[1] * x + Ft[3] * y + Ft[5] }, by = Fb[1] * x + Fb[3] * y + Fb[5];
  const c0 = CELLS[t.cell], p = c0.pts[0], dx = p.x - c0.x, dy = p.y - c0.y, sx = Ft[0] * dx + Ft[2] * dy, syy = Ft[1] * dx + Ft[3] * dy;
  const rot = ((Math.atan2(syy / sq, sx) * 180 / Math.PI + 90) % 60 + 60) % 60;
  const Hs = Math.max(4, (by - T.y) / m);
  return { T, m, sq, Hs, rot, K3: (top * 40) / (Hs * Rw) }; // K3: the mockup's floor units a height unit, for a real angle (top / Hs world a height unit, Rw / 40 a floor unit)
}
let iceFrameAt = -1, iceBudget = 0; const iceOf = new WeakMap(); // (per tower, off the tower: the autosave's structuredClone takes no generator or canvas)
// OFF THE MAIN THREAD (WebKit, 2026-11-06: one generator step reached 116 ms in the rig - a candidate check cannot be split finer): a WORKER (this very
// file, importScripts) builds each tower's ice and posts its scene - the pieces for the asked tiers, back and front, plain data - a few times a second as
// it grows and once done; the frame only bakes what arrives. No Worker (the smoke's stand-in): the time-sliced maker on the main thread, as before
const ICE_POST_MS = 250, ICE_GLOW_MS = 2;
let iceWk = null, iceWkSeq = 0, iceWkIds = 0; const iceWkWait = new Map();
const ICE_WK_WAIT_MS = 3000; // no word from the worker this long after a post: the main-thread maker takes over (a worker that loads but never answers)
// THE WORKER'S SCRIPT IS THE PAGE'S OWN, ?v= AND ALL (live bug, 7.7.92 - owner: "FRZ perm and frac not appearing in game"): the bare
// /aspira-frz-ice.js is served cacheable for a day, so a browser that had 7.7.89's copy (no worker half) loaded THAT into the worker, which
// never answered - and the board waited on it for ever. The script tag's src carries the content hash the server stamps on every page
const iceWkSrc = () => { const el = typeof document !== "undefined" && document.querySelector('script[src*="aspira-frz-ice.js"]'); return el && el.src ? el.src : location.origin + "/aspira-frz-ice.js"; };
const icePlain = L => L.map(P => ({ walls: P.walls.map(w => ({ lit: w.lit, pts: w.pts })), topPts: P.topPts, topVis: P.topVis, y0: P.y0, y1: P.y1, foot: P.foot.map(q => [q[0], q[1]]), hg: P.hg, lift: P.lift, tv: P.tv, v: P.v }));
function iceWorker() {
  if (iceWk !== null) return iceWk || null;
  try { iceWk = new Worker(URL.createObjectURL(new Blob(["importScripts(" + JSON.stringify(iceWkSrc()) + ");"], { type: "text/javascript" })));
    iceWk.onmessage = e => { const w = iceWkWait.get(e.data.id); if (w && e.data.seq === w.seq) { w.I.scene = e.data.scene; w.I.sceneAt = (w.I.sceneAt || 0) + 1; if (e.data.scene.done) iceWkWait.delete(e.data.id); } };
    iceWk.onerror = () => { iceWk = false; };
  } catch (e) { iceWk = false; }
  return iceWk || null;
}
if (typeof importScripts === "function" && typeof window === "undefined") { // THE WORKER: EVERY tower's job grown in turn (one at a time dropped the rest), a scene posted for each every round
  const makers = new Map(), jobs = new Map(); let busy = false;
  const round = () => {
    const per = Math.max(30, ICE_POST_MS / Math.max(1, jobs.size));
    for (const [id, { M, msg }] of jobs) { const t0 = performance.now(); while (!M.done && performance.now() - t0 < per) M.step(per);
      const sc = M.scene(msg.np, msg.nf); postMessage({ id, seq: msg.seq, scene: { back: icePlain(sc.back), front: icePlain(sc.front), done: M.done } }); if (M.done) jobs.delete(id); }
    busy = jobs.size > 0; if (busy) setTimeout(round, 0);
  };
  onmessage = e => { const m = e.data, k = m.id + "|" + m.key; let M = makers.get(k); if (!M) makers.set(k, M = frzIceMaker(m.sp, m.sf, m.G, m.rot)); jobs.set(m.id, { M, msg: m }); if (!busy) { busy = true; setTimeout(round, 0); } };
}
// MADE ONCE A TOWER (owner, 2026-11-06: "FRZ perm and frac get regenerated every time frz moves / it should only be generated once, and follow
// movement of tower"): the ice is grown in the view the tower FIRST has (its squash, height and hex turn then - frozen in I.view) from a seed of
// its id; a move never makes it again (the key was the view at its current spot: every move grew it anew). A tier bought only shows more of
// the same pieces (first-n). The bake follows the tower (drawFrzIce)
function frzIceGet(t, v0, np, nf) { // the tower's ice: its scene for these tiers (from the worker, or grown here a few ms a frame)
  let I = iceOf.get(t); if (!I) iceOf.set(t, I = { view: { sq: v0.sq, Hs: v0.Hs, rot: v0.rot, K3: v0.K3 }, M: null, bake: null, scene: null, want: "" });
  const v = I.view, key = [Math.round(v.sq * 50), Math.round(v.Hs), Math.round(v.rot / 3)].join(","), want = key + "|" + np + "," + nf;
  const id = t.id | 0, sp = 40117 + 7919 * id, sf = 90211 + 104729 * id, Gm = { cx: 0, cy: 0, R: 40, sq: v.sq, Hs: v.Hs, K3: v.K3 }, wk = iceWorker();
  if (wk && I.want === want && !I.scene && performance.now() - I.postAt > ICE_WK_WAIT_MS) { iceWk = false; wk.terminate(); } // (silent: build here instead)
  else if (wk) { if (I.want !== want) { I.want = want; I.postAt = performance.now(); const seq = ++iceWkSeq, wid = I.wid ||= ++iceWkIds; iceWkWait.set(wid, { I, seq }); wk.postMessage({ id: wid, seq, key, sp, sf, G: Gm, rot: v.rot, np, nf }); } return I; }
  I.M ||= frzIceMaker(sp, sf, Gm, v.rot);
  const now = performance.now(); if (now - iceFrameAt > 8) { iceFrameAt = now; iceBudget = ICE_SLICE_MS; }
  if (!I.M.done && iceBudget > 0) { const a = performance.now(); I.M.step(iceBudget); iceBudget -= performance.now() - a; }
  const c = I.M.count(); if (I.c !== c || I.want !== want) { I.c = c; I.want = want; const sc = I.M.scene(np, nf); I.scene = { back: sc.back, front: sc.front, done: I.M.done }; I.sceneAt = (I.sceneAt || 0) + 1; }
  return I;
}
// NEVER REDRAWN (owner, 2026-11-06: "Never redraw the ice"): the pieces are baked ONCE, at I.mB px a unit - the first view's scale with room for
// the closest zoom (ICE_ZOOM_ROOM, capped) - and the image then only moves and scales with the tower: no re-bake on a move, a pan or a zoom. While
// it first grows, each grown step shows (a quick bake, no ridge glow) and the full bake lands once grown; a tier bought later keeps the old image up
// while the new one bakes (in slices) and swaps in whole, so what is already shown never changes
const ICE_ZOOM_ROOM = 2;
function drawFrzIce(t, far, x, y, top, Rw) { // from drawOrbiters, after the tower's top (far: nothing - the 3D bake hides what the prism covers)
  const np = skillOf(t, "rime"), nf = skillOf(t, "temp"); if (!np && !nf) return;
  const v = frzIceView(t, x, y, top, Rw), I = frzIceGet(t, v, np, nf); if (!I.scene || far || typeof ice3dBegin !== "function") return;
  const sc = I.scene, frz = COL[TOWERS.frz.color], ice = typeof mixRgb === "function" ? mixRgb(frz, COL.white, 0.6) : COL.white, list = sc.back.concat(sc.front);
  I.proj ||= ice3dProj(x, y, top, Rw, I.view.Hs); I.m0 ||= v.m; // (the camera of its first view, frozen)
  const kB = I.kB ||= (typeof ZOOM_MAX === "number" && typeof viewZoom === "number" && viewZoom > 0 ? Math.min(ICE_ZOOM_ROOM, Math.max(1, ZOOM_MAX / viewZoom)) : 1);
  // growing: QUICK bakes (no ridge glow, the first view's own scale) of the latest grown step, each in slices - the last one stays up meanwhile;
  // grown: the FULL bake, the same way. The image on screen changes only when a bake is whole
  const want = sc.done ? "f" + I.sceneAt : "q" + I.sceneAt;
  if ((!I.bake || I.bake.want !== want) && (!I.glow || I.glow.want !== want)) I.glow = { at: I.sceneAt, want, J: sc.done ? ice3dBegin(list, I.proj, I.view.rot, kB, ice, frz, true) : ice3dBegin(list, I.proj, I.view.rot, 1, ice, frz, false) };
  // THE FULL BAKE IN SLICES (no frame pays it whole - owner, 2026-11-05: "No bursts, just faster consistently"), swapped in whole once done
  if (I.glow) { if (!I.glow.J || ice3dRun(I.glow.J, ICE_GLOW_MS)) { I.bake = { want: I.glow.want, J: I.glow.J }; I.glow = null; } }
  const J = I.bake && I.bake.J; if (!J) return;
  const F = warpFrame(x, y, 0), bx = F[0] * x + F[2] * y + F[4], by = F[1] * x + F[3] * y + F[5], z = v.m / I.m0 / J.k; // (the one image, at this spot's scale, on its floor point)
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(J.cv, bx + J.ox * z, by + J.oy * z, J.W * z, J.H * z); ctx.restore();
}
