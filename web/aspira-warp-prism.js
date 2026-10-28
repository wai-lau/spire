// /aspira - THE 3D PRISMS: towers and the core stand as hexagonal prisms on the bell (heights, Temporal Drive's core slam,
// the prism walls) and unwarp, a screen point back to the board. Split from aspira-warp.js at its cap; loaded right after it.
// a tower's height: as TALL as its level (owner: "make towers shorter, but make their height proportional to their level"):
// every chart POINT (t.lvl - 1) adds WARP.prism.perPoint - the look's own level (shownLvl) moves only every five points.
// The CORE stands (all towers' heights) / 6 + the tallest's (owner, 2026-10-09), a fresh tower's with none built
const towerH = t => WARP.prism.tower + WARP.prism.perPoint * (t.lvl - 1);
const coreH3dFull = () => { const hs = G.towers.map(towerH); return hs.length ? hs.reduce((a, b) => a + b, 0) / 6 + Math.max(...hs) : WARP.prism.tower; };
// TEMPORAL DRIVE SLAMS THE CORE (owner, 2026-10-12: "when starting temporal drive, slam the core into the floor so that the credit
// count is just barely over the floor; bring it back up when temporal drive is ready again"): down in CORE_SLAM_DOWN s to
// CORE_SLAM_H, held there while the power cools down, risen over CORE_SLAM_UP s once it is ready
const CORE_SLAM_H = 2, CORE_SLAM_DOWN = 0.12, CORE_SLAM_UP = 0.8, coreSlam = { k: 1, at: 0 };
function coreH3d() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (coreSlam.at || now)), down = (powerLvl("temporal") > 0 && cooldownLeft("temporal") > 0) || (!!G.core && DIAL.some(d => powerLvl(d.id) && d.active(G.core) > 0)); // ANY power running slams it too (owner, 2026-10-15)
  coreSlam.at = now; coreSlam.k = Math.max(0, Math.min(1, coreSlam.k + (down ? -dt / CORE_SLAM_DOWN : dt / CORE_SLAM_UP)));
  const fz = G.core && G.core.freeze; if (fz && fz.ring0 == null && (!down || coreSlam.k === 0)) fz.ring0 = fz.t; // LANDED: Temporal Drive's first ring goes out now (drawTimeStop)
  const k = down ? coreSlam.k ** 2 : 1 - (1 - coreSlam.k) ** 2, full = coreH3dFull(); // a hard slam, an eased rise
  return CORE_SLAM_H + (full - CORE_SLAM_H) * k;
}
// the canvas transform that lays world (x, y) on the level plane h world units up, as seen at (x, y): its
// projection there and one world unit along x and along y
function warpFrame(x, y, h) {
  const H = h * cam.k, P = warpProject(x, y, H), X = warpProject(x + 1, y, H), Y = warpProject(x, y + 1, H);
  const a = X.x - P.x, b = X.y - P.y, c = Y.x - P.x, d = Y.y - P.y;
  return [a, b, c, d, P.x - a * x - c * y, P.y - b * x - d * y];
}
// one hexagonal PRISM's walls: its floor hex `pts` raised `h` world units, the walls farthest first, each
// filled with the background and tinted by how squarely it faces the camera, its edges in the colour
const WARP_PRISM_STOPS = 6, WARP_PRISM_GONE = 0.95; // GONE: the share of a prism's height, from its top, where it has faded out; STOPS: its gradient's (the blend is not linear)
function warpPrism(o) {
  const pf = 1 - (1 - warpFade) * WARP_PRISM_FADE; // they fade less below the floor than the dice
  // CENTRED on the floor (owner: "their center is on the plane, not the bottom"): half below it, half above
  // its top and bottom outlines in the SAME frame the top's drawing gets (up: one squash for all), so the drawing
  // sits exactly on the walls (owner: "tower tops are not sitting on top")
  const H = o.h * cam.k / 2, n = o.pts.length, frame = h => { const [a, b, c2, d, e, f] = warpFrame(o.x, o.y, h / cam.k); return p => ({ x: a * p.x + c2 * p.y + e, y: b * p.x + d * p.y + f }); };
  // ... and it comes to a POINT below (owner: "instead of hexagonal prisms, make them all come to a point at the bottom")
  // (a POINTED bottom was tried and dropped: "change the towers and core back to prisms instead of pointy")
  // (perf: built once a frame - the object is this frame's - though it is drawn in two passes, below and above the floor)
  if (!o.geo) o.geo = (() => {
  const ft = frame(H), fb = frame(-H * WARP.prism.below), B = o.pts.map(p => ({ ...fb(p), z: -o.h / 2 * WARP.prism.below })), T = o.pts.map(p => ({ ...ft(p), z: o.h / 2 })); // z in world units (aspira-fog.js) // below: x the half height under the floor (owner: "3x the distance below plane")
  return { B, T, grads: {}, walls: o.pts.map((p, i) => { const q = o.pts[(i + 1) % n], mx = (p.x + q.x) / 2 - o.x, my = (p.y + q.y) / 2 - o.y; const ml = Math.hypot(mx, my) || 1, lx = CX - o.x, ly = CY - o.y, ll = Math.hypot(lx, ly); return { i, j: (i + 1) % n, face: my / ml, lit: ll < 1 ? 1 : Math.max(0, (mx * lx + my * ly) / (ml * ll)) }; }).sort((a, b) => a.face - b.face) }; // lit: the wall faces the core (the core's own: all lit); +y faces the camera
  })();
  const { B, T, walls, grads } = o.geo;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineJoin = "round"; ctx.lineWidth = 1.5 * cam.k;
  if (o.dash) { // an empty slot: a DOTTED wireframe, nothing filled
    ctx.setLineDash([2 * cam.k, 3 * cam.k]); ctx.strokeStyle = o.col; ctx.globalAlpha = 0.45 * pf; ctx.beginPath();
    for (let i = 0; i < n; i++) { warpLine(B[i], B[(i + 1) % n]); warpLine(B[i], T[i]); } // (the top ring is the slot's own outline, drawn on it)
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; return;
  }
  // FADING DOWN its own height (owner, 2026-10-09: "towers should be 100% opaque at top, 0% 95% of the way down, same for
  // core"): each wall ONE fill with a gradient whose lines of equal opacity run along its top edge, from opaque at the
  // top to nothing WARP_PRISM_GONE of the way down - the floor's own fade is not applied on top. (PERF 2026-10-09: was
  // 16 stepped slices a wall, each two fills, in each of the nine floor passes; the parts below the floor are drawn in
  // ONE pass now, the last before the floor, since they no longer fade by floor slice.)
  ctx.setLineDash([]); // (a tower's own drawing can leave one set)
  let band = warpBand || { lo: -Infinity, hi: Infinity };
  if (band.hi < 0) return; // a deeper floor slice: drawn with the one at the floor (whose hi is -0)
  if (band.hi === 0) { band = { lo: -Infinity, hi: 0 }; warpBand = band; }
  const top = o.h / 2, end = top - WARP_PRISM_GONE * (o.h / 2 + o.h / 2 * WARP.prism.below);
  // the point of an upright P -> Q at height `end`
  const at = (P, Q) => { const t = (top - end) / (P.z - Q.z); return { x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t }; };
  for (const w of walls) {
    const quad = [B[w.i], B[w.j], T[w.j], T[w.i]];
    if (warpPath(quad)) {
      ctx.globalAlpha = 1; ctx.fillStyle = grads[w.i] ||= (() => {
        const P = T[w.i], E = at(P, B[w.i]), dx = T[w.j].x - P.x, dy = T[w.j].y - P.y, nn = dx * dx + dy * dy;
        const k = nn > 1e-6 ? ((E.x - P.x) * -dy + (E.y - P.y) * dx) / nn : 0, gx = k ? P.x - dy * k : E.x, gy = k ? P.y + dx * k : E.y;
        const g = ctx.createLinearGradient(P.x, P.y, gx, gy), l = 0.12 + 0.28 * w.lit; // lit from the CORE (owner: "the light source should come from the core")
        for (let s = 0; s <= WARP_PRISM_STOPS; s++) { const a = 1 - s / WARP_PRISM_STOPS; g.addColorStop(s / WARP_PRISM_STOPS, blendFill([[COL.bg, a], [o.col, l * a]])); }
        return g;
      })();
      ctx.fill();
    }
    // the edges whole, once, with the parts above the floor (stroked per floor slice they showed every cut as a gap)
    ctx.globalAlpha = 0.8;
    if (band.lo > 0 || band.hi < Infinity) continue;
    { ctx.beginPath(); ctx.moveTo(T[w.i].x, T[w.i].y); ctx.lineTo(T[w.j].x, T[w.j].y); ctx.strokeStyle = o.col; ctx.stroke(); }
    for (const v of [w.i, w.j]) {
      const E = at(T[v], B[v]), g = ctx.createLinearGradient(T[v].x, T[v].y, E.x, E.y);
      g.addColorStop(0, o.col); g.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.moveTo(T[v].x, T[v].y); ctx.lineTo(E.x, E.y); ctx.strokeStyle = g; ctx.stroke();
    }
  }
  warpBand = band.lo === -Infinity && band.hi === Infinity ? null : band; ctx.globalAlpha = 1;
}
// a screen point (2D canvas device px) back to the canvas spot drawn there:
// march the eye's ray down to the bell, then bisect. null off it.
function unwarp(sx, sy) {
  const p = warp.p;
  if (!p) return { x: sx, y: sy };
  const dx = (sx - p.core[0]) / (p.f * p.z), dy = -(sy - p.core[1] - p.oy) / (p.f * p.z);
  const at = t => { // the ray at t, in the bell's frame, and its height above it
    const qx = t * dx, qy = t * dy, qz = p.f - t, py = p.s * qz - p.c * qy, pz = p.s * qy + p.c * qz;
    return { x: qx, y: py, g: pz - warpHeight(p, Math.hypot(qx, py)) };
  };
  const end = p.f * 30, steps = 1200;
  let lo = 0, prev = at(0);
  for (let i = 1; i <= steps; i++) {
    const t = end * i / steps, cur = at(t);
    if (Math.sign(cur.g) !== Math.sign(prev.g)) {
      let hi = t;
      for (let j = 0; j < 24; j++) { const mid = (lo + hi) / 2, m = at(mid); if (Math.sign(m.g) === Math.sign(prev.g)) lo = mid; else hi = mid; }
      const hit = at((lo + hi) / 2), v = Math.hypot(hit.x, hit.y), m = v ? warpUnview(p, v) / v : 1 / p.hc; // back to the world's radius
      return { x: p.core[0] + hit.x * m, y: p.core[1] + hit.y * m };
    }
    lo = t; prev = cur;
  }
  return null;
}
