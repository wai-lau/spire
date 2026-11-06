// /spire - CRR, THE CARRIER: THE LOOK (split from aspira-crr.js at the 500-line cap, 2026-11-06) - the interceptors, their trails, the tether
// chain, the bolts and the pellets. Loaded right after aspira-crr.js (same global scope; the simulator loads only the logic).
// ---------- the look: thin, long darts - a fast enemy's triangle, stretched - and LIGHT-BLUE bolts and pellets (StarCraft) ----------
const CRR_DART = 33, CRR_DART_W = 7.8, /* x3 (owner, 2026-10-16: "make the interceptors like 3x bigger"; was 11, 2.6) */ CRR_PELLET_PX = 2, CRR_PELLET_TAIL = 0.03, CRR_BOLT_TAIL = 0.007 /* owner, 2026-10-16: "change the 5 bolts to each be much shorter" (was 0.02, 18u) */, CRR_BOLT_GROW = 0.3; // a bolt streak: at most this many s of its flight behind it, growing by GROW s a s of flight (6u by 21u out)
// its SIZE grows with Armament (owner, 2026-10-16: "halve interceptor size (grow this as armament increases)"): half the dart
// above, untaken, + CRR_DART_GROW a tier - the full dart at VI
const CRR_DART_K0 = 0.5, CRR_DART_GROW = 0.1;
const CRR_DART_DRAW = 0.5; // every interceptor DRAWN at half (owner, 2026-11-05: "Halve interceptor sizes") - its outline too; its jitter and its hold radius as they were (the draw only)
// V=V (owner, 2026-11-06: "change the interceptors for it to look like V=V (V = current triangle, this is interceptor facing down, bolts fire out of
// tip of Vs alternating between) / tether should be connected to the = part"): two of the old darts side by side, noses (the V tips) forward,
// joined by two bars (the "="); the tether leaves the middle of the "=" (carBar). One path a carrier still: one fill, one stroke
// (perf, 2026-11-01: ONE path a carrier - was a fill and a stroke a dart, ~200 canvas calls a frame at 3 x 34)
const CRR_VV_GAP = 0.9, CRR_VV_BARS = [0, -0.22]; // gap: the bar between the two Vs, x a V's half-width; bars: along the heading, x its length (0 = the middle)
const carVVOff = W => W * (1 + CRR_VV_GAP); // a V's centre, across the heading from the interceptor's
function carDart(i, z) { // adds the V=V to the open path, facing i.fa (its drawn heading, carFace)
  const a = i.fa ?? i.ang, L = CRR_DART * z, W = CRR_DART_W * z, c = Math.cos(a), s = Math.sin(a), o = carVVOff(W);
  for (const k of [-1, 1]) {
    const cx = i.x - s * o * k, cy = i.y + c * o * k, bx = cx - c * L * 0.5, by = cy - s * L * 0.5;
    ctx.moveTo(cx + c * L * 0.5, cy + s * L * 0.5); ctx.lineTo(bx - s * W, by + c * W); ctx.lineTo(bx + s * W, by - c * W); ctx.closePath();
  }
  for (const u of CRR_VV_BARS) { // the "=": from the inner edge of one V to the other's, where the Vs are that wide
    const hw = W * (0.5 - u), ax = i.x + c * L * u, ay = i.y + s * L * u, r = o - hw;
    ctx.moveTo(ax - s * r, ay + c * r); ctx.lineTo(ax + s * r, ay - c * r);
  }
}
const carBar = (i, z) => { const a = i.fa ?? i.ang, u = (CRR_VV_BARS[0] + CRR_VV_BARS[1]) / 2 * CRR_DART * z; return { x: i.x + Math.cos(a) * u, y: i.y + Math.sin(a) * u }; }; // the "=" middle
const carTip = (i, z, k) => { const a = i.fa ?? i.ang, L = CRR_DART * z * 0.5, o = carVVOff(CRR_DART_W * z) * k, c = Math.cos(a), s = Math.sin(a); return [i.x - s * o + c * L, i.y + c * o + s * L]; }; // k -1 / +1
// FACING (owner, 2026-11-06: "when in orbit, have the interceptors rotate to face the target being orbited"; "when in orbit around the tower, also face
// the way they fly"): orbiting an enemy, the V tips turn to it; otherwise (flying, or the hold orbit round the carrier) along its heading. The DRAWN
// heading i.fa turns at CRR_FACE_W rad a real second - the look only (the game's heading, i.ang, is untouched)
const CRR_FACE_W = 14; // ~0.11 s for a quarter turn
let carFaceT = 0, carFaceDt = 0;
function carFace(i) {
  const want = i.state === "out" && i.orb && i.e && !i.e.dead ? Math.atan2(i.e.y - i.y, i.e.x - i.x) : i.ang;
  if (i.fa == null || !(carFaceDt > 0)) { i.fa = i.fa ?? want; if (i.fa === want || carFaceDt <= 0) return; }
  let d = want - i.fa; d -= 6.283185307 * Math.round(d / 6.283185307);
  const w = CRR_FACE_W * carFaceDt; i.fa += Math.max(-w, Math.min(w, d));
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
  carChainTrails(t, out);
}
// THE TRAIL IS THE CHAIN (owner, 2026-11-06: "Tether: change interceptor tracer to be the chain (that fades out at tail), higher level = bigger/longer,
// when tethered, attach the same chain to the enemy instead as current"): the tether's links (chainLinks' step and length, aspira-chains.js) laid back
// along the path it flew from the "=" (carBar), fading to nothing at the tail; CRR_CHAIN_L0 + CRR_CHAIN_LK a Tether tier long, its links
// CRR_CHAIN_Q0 + CRR_CHAIN_QK a tier x ARC's. A TETHERED interceptor draws none: its chain runs to its enemy instead (drawCar). Fewer out, the
// same shortening as the old hairline (CRR_TRAIL_REF). 3D: one GPU capsule a link; 2D: CRR_TRAIL_BANDS alpha bands, two strokes each, all trails
const CRR_CHAIN_L0 = 36, CRR_CHAIN_LK = 18, CRR_CHAIN_Q0 = 0.5, CRR_CHAIN_QK = 0.1, CRR_CHAIN_A = 0.55;
const carCur = [{ k: 0, s0: 0 }, { k: 0, s0: 0 }], carPt = { x: 0, y: 0 };
function carAlong(P, n, cur, s) { // the point s along the polyline P (n points, x y pairs), the cursor kept moving forward
  while (cur.k < n - 2) { const d = Math.hypot(P[cur.k * 2 + 2] - P[cur.k * 2], P[cur.k * 2 + 3] - P[cur.k * 2 + 1]); if (cur.s0 + d >= s) break; cur.s0 += d; cur.k++; }
  const x0 = P[cur.k * 2], y0 = P[cur.k * 2 + 1], x1 = P[cur.k * 2 + 2] ?? x0, y1 = P[cur.k * 2 + 3] ?? y0, d = Math.hypot(x1 - x0, y1 - y0) || 1, f = Math.max(0, Math.min(1, (s - cur.s0) / d));
  carPt.x = x0 + (x1 - x0) * f; carPt.y = y0 + (y1 - y0) * f; return carPt;
}
const carPoly = [];
function carChainTrails(t, out) {
  const tier = skillOf(t, "launch"), q = CRR_CHAIN_Q0 + CRR_CHAIN_QK * tier, st = towerStats(t), z = carZ(t);
  const Lc = (CRR_CHAIN_L0 + CRR_CHAIN_LK * tier) * Math.max(CRR_TRAIL_MIN / CRR_TRAIL_N, Math.min(1, CRR_TRAIL_REF / Math.max(1, out)));
  const gl3 = !!(ctx && ctx.real && typeof fxGl !== "undefined" && fxGl.on && typeof fxGlPush === "function"), col = COL.ltblue;
  const ev = gl3 ? null : Array.from({ length: CRR_TRAIL_BANDS }, () => new Path2D()), od = gl3 ? null : Array.from({ length: CRR_TRAIL_BANDS }, () => new Path2D());
  for (const i of t.icp) {
    const tr = i.trail; if (!tr || tr.length < 4 || carTethered(t, i, st)) continue;
    const b0 = carBar(i, z * (1 + CRR_SIZE_JIT * (i.oj || 0))); carPoly.length = 0; carPoly.push(b0.x, b0.y);
    for (let k = tr.length - 2; k >= 0; k -= 2) carPoly.push(tr[k], tr[k + 1]);
    const n = carPoly.length / 2; let tot = 0; for (let k = 0; k < n - 1; k++) tot += Math.hypot(carPoly[k * 2 + 2] - carPoly[k * 2], carPoly[k * 2 + 3] - carPoly[k * 2 + 1]);
    const L = Math.min(Lc, tot); if (L < 2) continue;
    carCur[0].k = carCur[1].k = 0; carCur[0].s0 = carCur[1].s0 = 0;
    for (let j = 0, c = 0; c < L; j++, c = j * CHAIN_STEP) {
      const A = carAlong(carPoly, n, carCur[0], Math.max(0, c - CHAIN_LEN / 2)), ax = A.x, ay = A.y, B = carAlong(carPoly, n, carCur[1], Math.min(L, c + CHAIN_LEN / 2)), bx = B.x, by = B.y;
      const odd = j & 1, r = (odd ? CHAIN_ODD_R : CHAIN_R) * q, d = Math.hypot(bx - ax, by - ay) || 1, ix = (bx - ax) / d * Math.min(r, d / 2), iy = (by - ay) / d * Math.min(r, d / 2);
      if (gl3) { const al = Math.min(1, CRR_CHAIN_A * CHAIN_A * (1 - c / L) ** 1.5); if (odd) fxGlPush(ax + ix, ay + iy, bx - ix, by - iy, r, 0, col, al, col, 0); else fxGlPush(ax + ix, ay + iy, bx - ix, by - iy, r, CHAIN_LW * q, col, 0, col, al); continue; }
      const band = Math.min(CRR_TRAIL_BANDS - 1, Math.floor(c / L * CRR_TRAIL_BANDS)), Px = ax + ix, Py = ay + iy, Qx = bx - ix, Qy = by - iy;
      if (odd) { od[band].moveTo(Px, Py); od[band].lineTo(Qx, Qy); continue; }
      const th = Math.atan2(by - ay, bx - ax); ev[band].moveTo(Qx + Math.cos(th - Math.PI / 2) * r, Qy + Math.sin(th - Math.PI / 2) * r);
      ev[band].arc(Qx, Qy, r, th - Math.PI / 2, th + Math.PI / 2); ev[band].arc(Px, Py, r, th + Math.PI / 2, th + 3 * Math.PI / 2); ev[band].closePath();
    }
  }
  if (gl3) return;
  ctx.strokeStyle = col; ctx.lineCap = "round";
  for (let b = 0; b < CRR_TRAIL_BANDS; b++) { // band b: the b-th quarter from the interceptor back, each fainter
    ctx.globalAlpha = Math.min(1, CRR_CHAIN_A * CHAIN_A * (1 - (b + 0.5) / CRR_TRAIL_BANDS) ** 1.5);
    ctx.lineWidth = CHAIN_LW * q; ctx.stroke(ev[b]); ctx.lineWidth = 2 * CHAIN_ODD_R * q; ctx.stroke(od[b]);
  }
  ctx.globalAlpha = 1;
}
const carZ = t => (CRR_DART_K0 + CRR_DART_GROW * TIER_LEVEL[skillOf(t, "armament")]) * CRR_DART_DRAW; // a carrier's interceptor size (x its own jitter, oj)
// OUT OF THE TIPS, LEFT THEN RIGHT (owner, 2026-11-06: "bolts fire out of tip of Vs alternating between"): the game's bolt leaves the interceptor's
// centre (aspira-crr.js, untouched); it is DRAWN from a V's tip - the offset from its release spot to that tip, taken once, the interceptor's
// tips taking turns (i.tk) - closing onto its true path over its first CRR_TIP_IN u
const CRR_TIP_IN = 24, CRR_TIP0 = [0, 0];
function carBoltTip(b, t, fl) {
  if (b.tp) return b.tp; const i = b.icp; if (!i) return CRR_TIP0;
  i.tk = i.tk === 1 ? -1 : 1; const ux = b.vx / CRR_BOLT_V, uy = b.vy / CRR_BOLT_V, [tx, ty] = carTip(i, carZ(t) * (1 + CRR_SIZE_JIT * (i.oj || 0)), i.tk);
  return (b.tp = [tx - (b.x - ux * fl), ty - (b.y - uy * fl)]);
}
const CRR_TETHER_A0 = 0.7, CRR_TETHER_W = 0.6; // the tether chain: its least alpha (x CHAIN_A on top, as ARC's), its links x ARC's size
function drawCar(darts) {
  if (darts) { const now = performance.now() / 1000; carFaceDt = carFaceT ? Math.min(0.1, now - carFaceT) : 0; carFaceT = now; } // (real time: the turn eases on paused too)
  for (const t of G.towers) {
    if (t.kind !== "crr" || !t.icp) continue;
    if (darts) {
      for (const i of t.icp) if (i.state !== "home" || i.hold) carFace(i);
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
          const b0 = carBar(i, carZ(t) * (1 + CRR_SIZE_JIT * (i.oj || 0))); link(b0.x, b0.y, i.ve.x, i.ve.y, a, w); /* from the "=" (owner, 2026-11-06) */ if (i.tc && !i.tc.dead) link(i.ve.x, i.ve.y, i.tc.x, i.tc.y, a, w);
        }
      }
      ctx.fillStyle = COL.blue; ctx.strokeStyle = COL.blue; ctx.lineWidth = 2 * CRR_DART_DRAW; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
      const z = carZ(t);
      ctx.beginPath(); for (const i of t.icp) if (i.state !== "home" || i.hold) carDart(i, z * (1 + CRR_SIZE_JIT * (i.oj || 0))); // its own size: smaller ones hold closer
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      continue;
    }
    ctx.strokeStyle = COL.ltblue; ctx.lineCap = "round"; ctx.lineWidth = CRR_PELLET_PX; ctx.globalAlpha = 1;
    ctx.beginPath(); // bolts and pellets: ONE path, one stroke (perf)
    for (const b of t.carBolts || []) { // UNDER the darts: they leave from beneath. A DOT at the interceptor, stretching out as it flies (owner, 2026-10-16)
      const fl = (CRR_BOLT_REACH / CRR_BOLT_V - b.left) * CRR_BOLT_V, tp = carBoltTip(b, t, fl), f = Math.max(0, 1 - fl / CRR_TIP_IN);
      const k = Math.min(CRR_BOLT_TAIL, (CRR_BOLT_REACH / CRR_BOLT_V - b.left) * CRR_BOLT_GROW), v = carBoltV(b), x = b.x + v[0] + tp[0] * f, y = b.y + v[1] + tp[1] * f; // (in its V; from its tip)
      ctx.moveTo(x - b.vx * k, y - b.vy * k); ctx.lineTo(x, y);
    }
    for (const p of t.carPellets || []) { ctx.moveTo(p.x - p.vx * CRR_PELLET_TAIL, p.y - p.vy * CRR_PELLET_TAIL); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
