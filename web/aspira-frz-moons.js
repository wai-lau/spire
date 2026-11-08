// /spire - FRZ'S MOONS AS ICE D12s (owner, 2026-11-06: "can we make the moons d12s"; "make sure the moons are at the right place (above the floor where the
// triangle moon indicator used to be)"): each moon is a lit dodecahedron in pale ice, hovering FRZ_MOON_ALT x its size above the game's moon spot
// (frzSources, aspira-frz.js - the aura copy's centre), rolling slowly, with a soft glow under it; Moons V's satellites stay small dots at theirs.
// Drawn on the towers' layer with the tower (drawOrbiters, aspira-warp-prism.js): the far side before its prism, the near side after. In 3D they
// replace the floor triangle (drawFrzSkill). Look only: no positions, counts or motion of the game's are touched
const FRZ_MOON_BASE = 0.35; // the opaque face under the ice: x of the way from the background to FRZ's colour
const FRZ_MOON_SIZE = 9, FRZ_MOON_ALT = 1.6, FRZ_MOON_ROLL = 0.35, FRZ_SAT_R = 2.2; // u; x the size; rad a s; u
const D12 = (() => { // the dodecahedron: 20 corners, 12 pentagons (each round one of the icosahedron's corners - its dual)
  const p = (1 + Math.sqrt(5)) / 2, q = 1 / p, V = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) V.push([a, b, c]);
  for (const a of [-1, 1]) for (const b of [-1, 1]) V.push([0, a * q, b * p], [a * q, b * p, 0], [a * p, 0, b * q]);
  const r = Math.hypot(p, 0, q), U = V.map(v => v.map(c => c / r)), N = [];
  for (const a of [-1, 1]) for (const b of [-p, p]) N.push([0, b, a], [b, a, 0], [a, 0, b]); // the face normals in THESE corners' orientation (2026-11-08, owner: "also moons are still fucked up?"): the old (0, 1, p) set was the icosahedron turned 90 degrees, so no face's five corners were coplanar - each "face" was five corners at different depths, drawn as a crumpled knot with holes
  const F = N.map(n => {
    const nl = Math.hypot(...n), m = n.map(c => c / nl), five = U.map((v, i) => [v[0] * m[0] + v[1] * m[1] + v[2] * m[2], i]).sort((x, y) => y[0] - x[0]).slice(0, 5).map(x => x[1]);
    const ax = Math.abs(m[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], e1 = [m[1] * ax[2] - m[2] * ax[1], m[2] * ax[0] - m[0] * ax[2], m[0] * ax[1] - m[1] * ax[0]], e2 = [m[1] * e1[2] - m[2] * e1[1], m[2] * e1[0] - m[0] * e1[2], m[0] * e1[1] - m[1] * e1[0]];
    return five.sort((i, j) => { const A = U[i], B = U[j]; return Math.atan2(A[0] * e2[0] + A[1] * e2[1] + A[2] * e2[2], A[0] * e1[0] + A[1] * e1[1] + A[2] * e1[2]) - Math.atan2(B[0] * e2[0] + B[1] * e2[1] + B[2] * e2[2], B[0] * e1[0] + B[1] * e1[1] + B[2] * e1[2]); });
  });
  return { V: U, F };
})();
const D12_Q = D12.V.map(() => ({ x: 0, y: 0 })), D12_R = D12.V.map(() => [0, 0, 0]);
function drawD12(x, y, size, th, ice, edge, base) { // base: an OPAQUE face colour under the lit ice (2026-11-07, Wai: "Frz moons look fucked up" - see-through faces let the aura rings show through, a wireframe in the card demo) // one die at the world spot x, y, its centre FRZ_MOON_ALT x size up; th its roll
  const p = warp.p, P = warpProject(x, y), k = cam.k * P.s, hz = FRZ_MOON_ALT * size, ct = Math.cos(th), st = Math.sin(th), c2 = Math.cos(th * 0.6), s2 = Math.sin(th * 0.6);
  for (let i = 0; i < D12.V.length; i++) { const v = D12.V[i], y1 = v[1] * ct - v[2] * st, z1 = v[1] * st + v[2] * ct, x1 = v[0] * c2 - z1 * s2, z2 = v[0] * s2 + z1 * c2, r = D12_R[i]; r[0] = x1; r[1] = y1; r[2] = z2;
    const q = D12_Q[i]; q.x = P.x + k * x1 * size; q.y = P.y + k * (p.c * y1 * size - p.s * (z2 * size + hz)); }
  const lx = CX - x, ly = CY - y, lz = warp.lightZ || 1, ll = Math.hypot(lx, ly, lz); // lit from the core's top, as the dice
  ctx.lineJoin = "round"; ctx.lineWidth = Math.max(0.6, 0.06 * size * k); ctx.strokeStyle = edge;
  for (const f of D12.F) {
    let n0 = 0, n1 = 0, n2 = 0; for (const i of f) { n0 += D12_R[i][0]; n1 += D12_R[i][1]; n2 += D12_R[i][2]; }
    if (n1 * p.s + n2 * p.c <= 0) continue; // turned away from the camera
    const lit = Math.max(0, (n0 * lx + n1 * ly + n2 * lz) / (ll * Math.hypot(n0, n1, n2)));
    ctx.beginPath(); f.forEach((i, j) => (j ? ctx.lineTo(D12_Q[i].x, D12_Q[i].y) : ctx.moveTo(D12_Q[i].x, D12_Q[i].y))); ctx.closePath();
    if (base) { ctx.globalAlpha = 1; ctx.fillStyle = base; ctx.fill(); } ctx.globalAlpha = 0.45 + 0.5 * lit; ctx.fillStyle = ice; ctx.fill(); ctx.globalAlpha = 0.9; ctx.stroke();
  }
}
function drawFrzMoons(t, far) {
  if (t.kind !== "frz" || typeof frzSources !== "function" || typeof warpProject !== "function") return;
  const st = towerStats(t), src = frzSources(t, st); if (src.length < 2) return;
  const frz = COL[TOWERS.frz.color], ice = typeof mixRgb === "function" ? mixRgb(frz, COL.white, 0.55) : COL.white, base = typeof mixRgb === "function" ? mixRgb(COL.bg, frz, FRZ_MOON_BASE) : null, now = performance.now() / 1000;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  try {
    src.forEach((s, i) => {
      if (!i || (s.y < t.y) !== far) return;
      const P = warpProject(s.x, s.y), k = cam.k * P.s;
      if (s.small) { ctx.globalAlpha = 0.9 * MOON_FX; ctx.fillStyle = ice; ctx.beginPath(); ctx.arc(P.x, P.y - k * warp.p.s * FRZ_MOON_ALT * FRZ_MOON_SIZE * 0.6, Math.max(1, FRZ_SAT_R * k), 0, 6.283); ctx.fill(); return; } // a satellite: a small dot, up
      if (typeof ifrFadeGrad === "function") { ctx.save(); ctx.translate(P.x, P.y - k * warp.p.s * FRZ_MOON_ALT * FRZ_MOON_SIZE); const R = 2.4 * FRZ_MOON_SIZE * k; ctx.scale(R, R); ctx.globalAlpha = 0.5; ctx.fillStyle = ifrFadeGrad(frz); ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.283); ctx.fill(); ctx.restore(); } // the soft glow (a cached unit fade)
      drawD12(s.x, s.y, FRZ_MOON_SIZE, now * FRZ_MOON_ROLL + i * 1.7, ice, frz, base);
    });
  } finally { ctx.restore(); }
}
