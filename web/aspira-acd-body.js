// /spire - ACD's BODY LOOK (owner, 2026-11-06, the ACD pass): Flow = drips running down the prism's front faces, Spill = a puddle that is
// always alive under the tower at its tier's size, Corrosion = bubbles rising inside the prism that pop on its top face. Look only: the game never
// reads any of it, the simulator never loads it. Drawn with the tower by drawOrbiters (aspira-warp-prism.js): the puddle FIRST (far pass, before
// the prism), the drips and bubbles AFTER it and its top (near pass); the card's demo calls the same. Loaded after aspira-ifrit-draw.js.
// Numbers are the approved mockup's, in its units (a hex of radius 40); ACD_S = world u a mockup unit. No Math.random: every jitter is hashed from
// the tower's id and the time slot. Drips and bubbles are COL.drip's hue (yellower than the tower's green), the puddle the tower's own.
const ACD_FLOW = { // per front face (left, right): [centre along the face 0..1, drips in the group], by Flow tier
  1: [[[0.5, 2]], []],
  2: [[[0.5, 2]], [[0.5, 2]]],
  3: [[[0.5, 3]], [[0.5, 3]]],
  4: [[[0.3, 2], [0.7, 2]], [[0.3, 2], [0.7, 2]]],
  5: [[[0.3, 3], [0.74, 2]], [[0.26, 2], [0.7, 3]]],
};
const ACD_KM = { L: [1.3, 0.3], M: [0.8, 0.2], S: [0.38, 0.14] }; // a drip's length factor by class: low end + spread
const ACD_BASE = [0, 10, 11, 12, 13, 14], ACD_SPILL_RX = [0, 40, 48, 56, 67, 80], ACD_BUBBLES = [0, 6, 10, 14, 18, 24];
const ACD_SIDE = 30, ACD_RISE = 0.94, ACD_COS30 = Math.cos(Math.PI / 6); // ACD_SIDE: a side face's height (mockup units): bubbles rise through it, drips stay inside it
const acdRng = seed => { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const acdDrip = () => ({ hex: COL.drip || COL.tacd, lite: COL.driplite || COL.white }); // the drip colour and its light tint, palette swatches
// the screen-upright frame on the tower's top face: local x is world u, local y the top plane squashed by sq; V: local y a mockup unit of height spans
function acdFrame(x, y, top, S) {
  const F = warpFrame(x, y, top), k = Math.hypot(F[0], F[1]), sq = Math.hypot(F[2], F[3]) / k, G2 = warpFrame(x, y, top - 1);
  const oy = F[1] * x + F[3] * y + F[5], zs = (G2[1] * x + G2[3] * y + G2[5] - oy) / k; // screen px (in k) one world unit down
  return { k, sq, V: Math.max(0.2, zs) * S, ox: F[0] * x + F[2] * y + F[4], oy, F, x, y, top };
}
function drawAcdBody(t, far, x, y, top) { // top: the prism top's height (warpFrame units)
  const sp = skillOf(t, "contagion"), fl = skillOf(t, "spray"), co = skillOf(t, "corrosion");
  if (far ? !sp : !(fl || co)) return;
  const c0 = CELLS[t.cell], kk = TOWER_K * TOWER_DRAW_K, off = c0.pts.map(p => [(p.x - c0.x) * kk, (p.y - c0.y) * kk]);
  const R = Math.hypot(off[0][0], off[0][1]), S = R / 40, now = performance.now() / 1000, id = t.id || 0, dp = acdDrip();
  ctx.save();
  try {
    ctx.setLineDash([]); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.globalAlpha = 1;
    if (far) { acdSpill(sp, x, y, R, now); return; }
    const f = acdFrame(x, y, top, S);
    ctx.setTransform(f.k * S, 0, 0, f.k * S, f.ox, f.oy);
    if (fl) acdFlow(fl, off, S, f, now, id, dp, 2 * top / S / ACD_SIDE); // drips scale with the prism's height (its side, mockup units, over the side they were tuned on)
    if (co) acdCorr(co, S, f, now, id, dp, R / S);
  } finally { ctx.restore(); ctx.globalAlpha = 1; }
}
// SPILL: a translucent puddle on the floor round the base, drifting edge and ripples going out (the tower's own colour)
function acdSpill(tier, x, y, R, t) {
  const F = warpFrame(x, y, warpFloor()), rx = ACD_SPILL_RX[tier] * R / 40; // (on the REAL floor, round the lifted tower's foot)
  ctx.setTransform(F[0], F[1], F[2], F[3], F[4], F[5]);
  const blob = k => { // the edge wobble drifts round the puddle with time
    const p = new Path2D();
    for (let i = 0; i <= 28; i++) {
      const a = 6.283185 * i / 28, w = 1 + 0.07 * Math.sin(3 * a + 1 + 0.55 * t) + 0.05 * Math.sin(5 * a + 2 - 0.4 * t) + 0.035 * Math.sin(2 * a + 0.7 * t);
      const px = x + rx * k * w * Math.cos(a), py = y + rx * k * w * Math.sin(a); i ? p.lineTo(px, py) : p.moveTo(px, py);
    }
    p.closePath(); return p;
  };
  const w = rx / 40, big = blob(1), small = blob(0.68);
  ctx.fillStyle = COL.tacd; ctx.strokeStyle = COL.tacd;
  ctx.globalAlpha = 0.17; ctx.fill(big); ctx.globalAlpha = 0.14; ctx.fill(small);
  ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2 * w; ctx.stroke(big); ctx.globalAlpha = 0.25; ctx.lineWidth = 0.8 * w; ctx.stroke(small);
  for (let k = 0; k < 3; k++) { const p = (t / 3 + k / 3) % 1; ctx.globalAlpha = 0.4 * (1 - p) * Math.min(p / 0.12, 1); ctx.lineWidth = 0.9 * w; ctx.stroke(blob(0.3 + 0.7 * p)); } // ripples
  if (tier >= 3) { // a few bubbles drifting in it
    ctx.globalAlpha = 0.55; ctx.lineWidth = 0.7 * w;
    [[0.7, 0.35, 2], [-0.55, 0.5, 1.6], [0.2, -0.45, 1.4]].forEach((b, i) => { ctx.beginPath(); ctx.arc(x + rx * b[0] + 0.075 * rx * Math.sin(t * 0.6 + i * 2), y + rx * 0.36 * b[1] + 0.03 * rx * Math.sin(t * 0.8 + i), b[2] * w, 0, 6.283185); ctx.stroke(); });
  }
  ctx.globalAlpha = 1;
}
// FLOW: drips down the two front faces. A pair is long + short, a three has the long one in the middle; groups nearer the tower's middle run
// longer (x1.45) than the side ones (x0.65); lengths jittered hard and oozing. The drop latches at the line's bottom when it forms, fades in
// there, falls while fading and never rides upward
// DRIPS GROW WITH THE TOWER (owner, 2026-11-06: "ACD drip length should correlate to tower height at each level"): every length and the cap
// x hk = the prism's side height / ACD_SIDE (the side they were tuned on), so a drip keeps its share of the wall at every level
// DRIPS RUN DOWN THE WALL (owner, 2026-11-06: "drip direction should be along the side faces, might need to be 3d"): a drip's way down is the
// projected vertical at its own spot - its top on the face's top edge and a point one world unit lower, both through warpFrame - so in 3D it
// follows the wall's slant on screen (straight down in 2D, where the projection has no slant); local units, per world unit of height
function acdDown(f, px, py, S) {
  const wx = f.x + px * S, wy = f.y + py * S / f.sq, A = warpFrame(wx, wy, f.top), B = warpFrame(wx, wy, f.top - 1);
  const dx = (B[0] - A[0]) * wx + (B[2] - A[2]) * wy + B[4] - A[4], dy = (B[1] - A[1]) * wx + (B[3] - A[3]) * wy + B[5] - A[5];
  if (!(dy > 0)) return [0, f.V / S]; // (no downward way: the old straight drop)
  return [dx / f.k, dy / f.k];
}
function acdFlow(tier, off, S, f, now, id, dp, hk = 1) {
  const lay = ACD_FLOW[tier]; if (!lay) return;
  const pt = off.map(o => [o[0] / S, o[1] / S * f.sq]), faces = [];
  for (let i = 0; i < 6; i++) { const a = off[i], b = off[(i + 1) % 6]; if ((a[1] + b[1]) / 2 > 0.02 * 40 * S) faces.push([pt[i], pt[(i + 1) % 6]]); } // EVERY face turned toward the camera, the side ones at the left and right edges too
  faces.sort((p, q) => p[0][0] + p[1][0] - q[0][0] - q[1][0]);
  // ON EVERY SIDE FACE (owner, 2026-11-08: "ACD drips should be on side faces too, not just front two faces"): the tier's groups (ACD_FLOW, the same
  // count) spread over the visible faces left to right, one a face at its middle while there are enough faces; more groups than faces keeps the old
  // two-face layout (left-most / right-most). The near pass draws them after the prism, so a hidden face never gets one
  const groups = [...(lay[0] || []).map(g => [0, g]), ...(lay[1] || []).map(g => [1, g])], spread = faces.length >= groups.length && groups.length > 0;
  const front = spread ? faces : faces.length > 2 ? [faces[0], faces[faces.length - 1]] : faces, base = ACD_BASE[tier] * hk, maxLen = ACD_SIDE * hk - 3;
  const layOf = face => spread ? groups.map((g, j) => [j, g]).filter(([j]) => Math.round(groups.length > 1 ? j * (faces.length - 1) / (groups.length - 1) : (faces.length - 1) / 2) === face).map(([, g]) => [0.5, g[1][1]]) : lay[face] || [];
  const lines = new Path2D(), drops = [];
  front.forEach(([a, b], face) => {
    const W = Math.abs(b[0] - a[0]) || 1;
    layOf(face).forEach(([fc, cnt], gi) => {
      const r = acdRng(face * 977 + gi * 131 + 7 + id * 7919);
      const offs = cnt === 2 ? [-1, 1].map(s => s * (2 + 3 * r()) / 2) : [-(2 + 3 * r()), 0, 2 + 3 * r()]; // 2-5 u between neighbours
      const kinds = cnt === 2 ? (r() < 0.5 ? ["L", "S"] : ["S", "L"]) : (r() < 0.5 ? ["S", "L", "M"] : ["M", "L", "S"]);
      offs.forEach((du, di) => {
        const rr = acdRng((face * 31 + gi * 7 + di) * 101 + 3 + id * 7919), fr = fc + du / W * Math.sign(b[0] - a[0] || 1), px = a[0] + (b[0] - a[0]) * fr, py = a[1] + (b[1] - a[1]) * fr;
        const kd = ACD_KM[kinds[di]], m = kd[0] + kd[1] * rr(), ph0 = rr() * 6.283185, per = 3.4 + 2.4 * rr(), dph = rr();
        const pf = 1.45 - 0.8 * Math.min(1, Math.abs(px) / (40 * ACD_COS30));
        const lenAt = tt => Math.min(maxLen, base * m * pf * (1 + 0.28 * Math.sin(tt * 6.283185 / per + ph0))), len = lenAt(now);
        const [dx, dy] = acdDown(f, px, py, S); // the wall's way down here, per height unit
        lines.moveTo(px, py); lines.lineTo(px + len * dx, py + len * dy);
        const DP = 2.4, u = now / DP + dph, ph = u - Math.floor(u), d0 = lenAt((Math.floor(u) - dph) * DP) + 1.6, IN = 0.25;
        const dd = d0 + (ph < IN ? 0 : Math.pow((ph - IN) / (1 - IN), 1.6) * 10); // only ever further down the wall
        drops.push(px + dd * dx, py + dd * dy, ph < IN ? ph / IN : 1 - (ph - IN) / (1 - IN)); // x, y, alpha
      });
    });
  });
  ctx.save(); ctx.shadowColor = dp.hex; ctx.shadowBlur = 3.2 * 1.8 * f.k * S; ctx.globalAlpha = 0.95; ctx.lineWidth = 1.8; ctx.strokeStyle = dp.lite; ctx.stroke(lines); ctx.restore(); // the neon line, ONE smooth glow
  ctx.fillStyle = dp.lite; ctx.strokeStyle = dp.hex; ctx.lineWidth = 0.8;
  for (let i = 0; i < drops.length; i += 3) { ctx.globalAlpha = drops[i + 2]; ctx.beginPath(); ctx.arc(drops[i], drops[i + 1], 2.2, 0, 6.283185); ctx.fill(); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// CORROSION: bubbles rise inside the prism (more a tier, the biggest bigger a tier), faster the bigger, brighter toward the front, ever fainter
// lower down (opacity ~ the rise^3), swelling as they climb, and pop with a ring and a flash on the top face
function acdCorr(tier, S, f, now, id, dp, R) {
  const n = ACD_BUBBLES[tier], rb = 1.45 + 0.2 * tier, sq = f.sq, V = f.V / S;
  for (let i = 0; i < n; i++) {
    const r0 = acdRng(i * 7919 + 11 + id * 104729), ju = r0(), j = 0.4 + 1.2 * ju + 0.25 * tier * ju ** 4, per = 0.95 / Math.min(j * j, 1.5);
    const u = now / per + i / n + 0.13 * r0(), cyc = Math.floor(u), p = u - cyc;
    const r = acdRng(i * 977 + cyc * 131 + 5 + id * 104729), th = r() * 6.283185, rho = R * (0.15 + 0.6 * Math.pow(r(), 0.35)), size = (rb + 1) / 4 * j;
    const bu = rho * Math.cos(th), bv = rho * Math.sin(th), q = Math.min(p / ACD_RISE, 1), dA = 0.7 + 0.3 * Math.max(0, Math.min(1, (bv / (R * 0.75) + 1) / 2));
    const x = bu + 1.7 * Math.sin(i * 1.9 + q * 9), floorY = bv * sq;
    if (p < ACD_RISE) {
      const yy = floorY + ACD_SIDE * V * (1 - q), al = dA * q * q * q, sz = size * (0.55 + 0.6 * q);
      ctx.fillStyle = dp.hex; ctx.strokeStyle = dp.lite; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(x, yy, sz, 0, 6.283185); ctx.globalAlpha = al * 0.2; ctx.fill(); ctx.globalAlpha = al; ctx.stroke();
      ctx.fillStyle = COL.white; ctx.globalAlpha = al * 0.8; ctx.beginPath(); ctx.arc(x - sz * 0.3, yy - sz * 0.35, sz * 0.28, 0, 6.283185); ctx.fill();
    } else { // the pop on the top face
      const k = (p - ACD_RISE) / (1 - ACD_RISE), rr = size * 1.15 * (1 + 3.2 * k);
      ctx.strokeStyle = dp.lite; ctx.globalAlpha = 0.9 * dA * (1 - k); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(x, floorY, rr, rr * sq, 0, 0, 6.283185); ctx.stroke();
      ctx.fillStyle = COL.white; ctx.globalAlpha = 0.8 * dA * (1 - k); ctx.beginPath(); ctx.ellipse(x, floorY, size * (1 - k) * 0.9, size * (1 - k) * 0.9 * sq, 0, 0, 6.283185); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
