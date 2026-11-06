// /spire - CRR, THE CARRIER: THE LOOK (split from aspira-crr.js at the 500-line cap, 2026-11-06) - the interceptors, their trails, the tether
// chain, the bolts and the pellets. Loaded right after aspira-crr.js (same global scope; the simulator loads only the logic).
// ---------- the look: thin, long darts - a fast enemy's triangle, stretched - and LIGHT-BLUE bolts and pellets (StarCraft) ----------
const CRR_DART = 33, CRR_DART_W = 7.8, /* x3 (owner, 2026-10-16: "make the interceptors like 3x bigger"; was 11, 2.6) */ CRR_PELLET_PX = 2, CRR_PELLET_TAIL = 0.03, CRR_BOLT_TAIL = 0.007 /* owner, 2026-10-16: "change the 5 bolts to each be much shorter" (was 0.02, 18u) */, CRR_BOLT_GROW = 0.3; // a bolt streak: at most this many s of its flight behind it, growing by GROW s a s of flight (6u by 21u out)
// its SIZE grows with Armament (owner, 2026-10-16: "halve interceptor size (grow this as armament increases)"): half the dart
// above, untaken, + CRR_DART_GROW a tier - the full dart at VI
const CRR_DART_K0 = 0.5, CRR_DART_GROW = 0.1;
const CRR_DART_DRAW = 0.5; // every interceptor DRAWN at half (owner, 2026-11-05: "Halve interceptor sizes") - its outline too; its jitter and its hold radius as they were (the draw only)
// (perf, 2026-11-01: ONE path a carrier, one fill and one stroke - was a fill and a stroke a dart, ~200 canvas calls a frame at 3 x 34;
// where two darts overlap the fill now shows once, not twice)
function carDart(i, z) { // adds the dart's triangle to the open path
  const a = i.ang, L = CRR_DART * z, W = CRR_DART_W * z; // nose along its heading
  const c = Math.cos(a), s = Math.sin(a), bx = i.x - c * L * 0.5, by = i.y - s * L * 0.5;
  ctx.moveTo(i.x + c * L * 0.5, i.y + s * L * 0.5);
  ctx.lineTo(bx - s * W, by + c * W); ctx.lineTo(bx + s * W, by - c * W); ctx.closePath();
}
// darts: the INTERCEPTORS alone, drawn in skyKeep - their colour is not inverted by a boss sky (owner, 2026-10-16: "Interceptor color
// should also not be inverted"); else the bolts and pellets, which turn over with it like every tower's shots
// THE TRAIL (owner, 2026-10-16: "add a super thin but long line along the paths travelled by interceptor"): each interceptor out of
// the carrier keeps its last CRR_TRAIL_N points, one every CRR_TRAIL_STEP u flown (drawn only - the simulator never draws), and a
// hairline runs back along them, fading out in CRR_TRAIL_BANDS steps; gone once it is back inside the carrier
const CRR_TRAIL_N = 60, CRR_TRAIL_STEP = 6, CRR_TRAIL_W = 0.8, CRR_TRAIL_A = 0.45, CRR_TRAIL_BANDS = 4;
// SHORTER AS THEY MULTIPLY (owner, 2026-11-02: "No to all except smaller CRR trails"; option C - WebKit drawCar at 3 x 34 2.83 -> 2.06 ms): a carrier with more than CRR_TRAIL_REF interceptors out keeps CRR_TRAIL_N x REF / out points a
// trail (never under CRR_TRAIL_MIN), so its trail segments a frame stay about today's at 17
const CRR_TRAIL_REF = 17, CRR_TRAIL_MIN = 20;
function carTrails(t) {
  ctx.strokeStyle = COL.blue; ctx.lineWidth = CRR_TRAIL_W; ctx.lineJoin = "round"; ctx.lineCap = "round"; // (keep ROUND: bevel joins + butt caps drew the trails ~3x SLOWER in WebKit, 2.5 -> 7.5 ms a frame at 3 x 17 - measured 2026-11-01)
  // a DRAGGED carrier carries its held interceptors' trails with it (owner, 2026-10-16: "don't show atc interceptor streaks
  // caused by dragging"): the tower's move since the last draw shifts them whole, so only their own orbit draws
  const mx = t.x - (t.trX ?? t.x), my = t.y - (t.trY ?? t.y); t.trX = t.x; t.trY = t.y;
  let out = 0; for (const i of t.icp) if (i.state !== "home" || i.hold) out++;
  const nMax = Math.max(CRR_TRAIL_MIN, Math.round(CRR_TRAIL_N * Math.min(1, CRR_TRAIL_REF / Math.max(1, out))));
  for (const i of t.icp) {
    if (i.state === "home" && !i.hold) { i.trail = null; continue; }
    if ((mx || my) && i.state === "home" && i.trail) for (let k = 0; k < i.trail.length; k += 2) { i.trail[k] += mx; i.trail[k + 1] += my; }
    const tr = i.trail ||= [i.x, i.y], n = tr.length;
    if ((tr[n - 2] - i.x) ** 2 + (tr[n - 1] - i.y) ** 2 >= CRR_TRAIL_STEP * CRR_TRAIL_STEP) { tr.push(i.x, i.y); } if (tr.length > nMax * 2) { const cut = tr.length - nMax * 2; tr.copyWithin(0, cut); tr.length -= cut; } /* in place: splice(0, 2) made a garbage array every push, ~170 a frame at 3 x 40 (2026-11-05) */
  }
  for (let b = 0; b < CRR_TRAIL_BANDS; b++) { // band b: the b-th quarter from the interceptor back, each fainter - one stroke a band for every trail
    ctx.globalAlpha = CRR_TRAIL_A * (1 - b / CRR_TRAIL_BANDS); ctx.beginPath();
    for (const i of t.icp) {
      const tr = i.trail; if (!tr || tr.length < 4) continue;
      const m = tr.length / 2, hi = Math.round(m * (1 - b / CRR_TRAIL_BANDS)), lo = Math.round(m * (1 - (b + 1) / CRR_TRAIL_BANDS));
      if (b === 0) ctx.moveTo(i.x, i.y); else ctx.moveTo(tr[(hi - 1) * 2], tr[(hi - 1) * 2 + 1]);
      for (let k = hi - 1; k >= Math.max(0, lo - 1); k--) ctx.lineTo(tr[k * 2], tr[k * 2 + 1]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
const CRR_TETHER_A0 = 0.7, CRR_TETHER_W = 0.6; // the tether chain: its least alpha (x CHAIN_A on top, as ARC's), its links x ARC's size
function drawCar(darts) {
  for (const t of G.towers) {
    if (t.kind !== "crr" || !t.icp) continue;
    if (darts) {
      carTrails(t);
      if (skillOf(t, "launch") > 0) { // the TETHER beams: interceptor -> target (-> the chained one), brighter on a pulse
        ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round";
        const st = towerStats(t);
        // an ARC-style CHAIN, thinner, in CRR's blue (owner, 2026-11-05: "replace the beam with a thinner arc chain (still blue)"), never under 70% (owner: "tether
        // should have a min opacity of 70%"); a pulse (i.tf) still flashes it brighter and wider. 3D: one GPU capsule a link (fxGlChain), 2D: drawChain2D
        const gl3 = !!(ctx && ctx.real && typeof fxGl !== "undefined" && fxGl.on && typeof fxGlChain === "function");
        const link = (x1, y1, x2, y2, a, w) => { if (gl3) fxGlChain({ x1, y1, x2, y2, color: "ltblue", thin: w }, a); else if (typeof drawChain2D === "function") { ctx.globalAlpha = a; drawChain2D(x1, y1, x2, y2, (x, y) => ({ x, y }), 1, COL.ltblue, w); } };
        for (const i of t.icp) {
          if (!carTethered(t, i, st)) continue;
          i.tf = Math.max(0, (i.tf || 0) - 0.08); const a = CRR_TETHER_A0 + (1 - CRR_TETHER_A0) * i.tf, w = CRR_TETHER_W * (1 + 0.6 * i.tf);
          link(i.x, i.y, i.ve.x, i.ve.y, a, w); if (i.tc && !i.tc.dead) link(i.ve.x, i.ve.y, i.tc.x, i.tc.y, a, w);
        }
      }
      ctx.fillStyle = COL.blue; ctx.strokeStyle = COL.blue; ctx.lineWidth = 2 * CRR_DART_DRAW; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
      const z = (CRR_DART_K0 + CRR_DART_GROW * TIER_LEVEL[skillOf(t, "armament")]) * CRR_DART_DRAW;
      ctx.beginPath(); for (const i of t.icp) if (i.state !== "home" || i.hold) carDart(i, z * (1 + CRR_SIZE_JIT * (i.oj || 0))); // its own size: smaller ones hold closer
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      continue;
    }
    ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round"; ctx.lineWidth = CRR_PELLET_PX; ctx.globalAlpha = 1;
    ctx.beginPath(); // bolts and pellets: ONE path, one stroke (perf)
    for (const b of t.carBolts || []) { // UNDER the darts: they leave from beneath. A DOT at the interceptor, stretching out as it flies (owner, 2026-10-16)
      const k = Math.min(CRR_BOLT_TAIL, (CRR_BOLT_REACH / CRR_BOLT_V - b.left) * CRR_BOLT_GROW), v = carBoltV(b), x = b.x + v[0], y = b.y + v[1]; // (in its V)
      ctx.moveTo(x - b.vx * k, y - b.vy * k); ctx.lineTo(x, y);
    }
    for (const p of t.carPellets || []) { ctx.moveTo(p.x - p.vx * CRR_PELLET_TAIL, p.y - p.vy * CRR_PELLET_TAIL); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
