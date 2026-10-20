// /spire - IFR, IFRIT: THE LOOK (split from aspira-ifrit.js at the 500-line cap, 2026-10-20) - the charge, the meteor in flight,
// the fire, the pellets and the flares. Loaded right after aspira-ifrit.js (same global scope; the simulator loads only the logic).
// ---------- the look: orange balls growing on the corners, a small ball in flight, a glowing ring, ember pellets, and the flares - a wide faint beam with a bright hairline, fading as they burn. Fills, strokes and lines only (the
// 3D moving layer turns them into GL instances; no gradient on the board context) ----------
function drawIfrCharge(t, st, low) {
  const corners = ifrSlotCorners(t, st.slots);
  for (let i = 0; i < corners.length; i++) {
    const k = i < t.ifrReady ? 1 : i === t.ifrReady ? t.ifrCharge : 0;
    if (k <= 0) continue;
    const c = ifrCorner(t, corners[i]);
    const q = t.ifrFs && t.ifrFs[i], K = q ? q.k : Math.sqrt(st.pellets); /* the ball it launches: IFR_EMBER_R x its k */
    drawIfrBlastBall(c.x, c.y, IFR_EMBER_R * K * (0.3 + 0.7 * k), low);
  }
}
// one ember, k x IFR_EMBER_*: a halo, an orange disc, a white core and its tail (lowQ: disc and core)
function drawIfrEmber(p, k, low) {
  if (!low) {
    ctx.lineWidth = IFR_EMBER_R * k;
    for (let n = 0; n < IFR_TAIL_N; n++) {
      const a = n / IFR_TAIL_N, b = (n + 1) / IFR_TAIL_N; ctx.globalAlpha = 0.6 * (1 - a);
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * IFR_TAIL_S * a, p.y - p.vy * IFR_TAIL_S * a); ctx.lineTo(p.x - p.vx * IFR_TAIL_S * b, p.y - p.vy * IFR_TAIL_S * b); ctx.stroke();
    }
    ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, IFR_EMBER_HALO * k, 0, 6.283); ctx.fill();
  }
  ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, IFR_EMBER_R * k, 0, 6.283); ctx.fill();
  ctx.fillStyle = COL.white; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, IFR_EMBER_CORE * k, 0, 6.283); ctx.fill();
}
function drawIfrEmbers(t, low) {
  ctx.lineCap = "round"; ctx.strokeStyle = COL.tifr;
  for (const p of t.ifrPellets) if (p.wait <= 0) drawIfrEmber(p, ifrEmberK(p.fs), low); /* (wait: not launched yet) */
}
// the ring's glow at radius r, alpha a (0.9 = full): IFR_RING_GLOW's layers, the blast's and the ball's alike
function drawIfrRingAt(x, y, r, a, low) {
  for (let g = low ? IFR_RING_GLOW.length - 2 : 0; g < IFR_RING_GLOW.length; g++) { /* lowQ: the orange core + the white */
    ctx.strokeStyle = COL[IFR_RING_GLOW[g][2]]; ctx.lineWidth = IFR_RING_THIN * IFR_RING_GLOW[g][0]; ctx.globalAlpha = IFR_RING_GLOW[g][1] * a / 0.9;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
  }
}
function drawIfrRings(t, low) {
  ctx.fillStyle = COL.tifr;
  for (const q of t.ifrRings) {
    const grow = q.r / q.R, fade = grow < 1 ? 1 : Math.max(0, q.left / IFR_RING_FADE), a = (0.9 * (1 - grow) + 0.1) * fade;
    if (!low && grow < 1) { ctx.globalAlpha = IFR_RING_DISC * (1 - grow); ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill(); }
    drawIfrRingAt(q.x, q.y, q.r, a, low);
  }
}
/* the ball LOOKS LIKE THE BLAST (owner, 2026-10-20: "ball is a black circle with ring, on impact, ring starts expanding from current
   size"): a black disc ringed by the blast's glow, IFR_EMBER_R x k across - the area of all its pellets; on the corner as in flight */
function drawIfrBlastBall(x, y, r, low) {
  ctx.fillStyle = COL.bg; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  drawIfrRingAt(x, y, r, 0.9, low);
}
function drawIfrBalls(t, low) {
  for (const b of t.ifrBalls) drawIfrBlastBall(b.x, b.y, IFR_EMBER_R * (b.k ??= ifrBallK(b.fs)), low); /* (k cached on the ball: a plain number, G clones) */
}
// THE GLOW (owner, 2026-10-19: "hellfire highlight should be a glow which reduces in opacity gradually near the end of spoke"):
// each spoke is three stacked strokes - wide and faint, mid, a narrow bright core - [x the beam width, alpha], each cut into
// IFR_GLOW_BANDS lengths whose alpha falls off toward the tip as 1 - (k / bands)^2 (flat near the centre, fading at the end).
// That is the 2D way (a canvas stroke takes no gradient that follows its length). In 3D (owner, 2026-10-19: "why can GRV have
// smooth aura gradients while IFR spokes cannot? fix") each spoke is instead two GLOW LINES on the GPU (shape 7, aspira-fxgl.js):
// a halo and a narrow core, each brightest on its centre line and clear at its edge, fading as 1 - t^2 to the tip - smooth, no
// bands. IFR_GLOW_GL: [half-width x the beam width, alpha, colour]. lowQ keeps the core only, both ways
const IFR_GLOW = [[1.6, 0.12, "tifr"], [0.8, 0.28, "tifr"], [0.25, 0.85, "tifr"], [0.08, 0.9, "white"]], IFR_GLOW_BANDS = 6, IFR_GLOW_A = 0.11375; /* x0.5 (owner, 2026-10-20: "reduce flare opacity by 50%"; was 0.2275) */ /* a WHITE core in the orange (owner, 2026-10-19); IFR_GLOW_A: every spoke starts at 22.75% (owner, 2026-10-19: 65%, x0.7, then x0.5) */
const IFR_GLOW_GL = [[0.8, 0.5, "tifr"], [0.2, 0.95, "tifr"], [0.06, 0.95, "white"]];
/* 3D, drawn through the GPU stand-in (glCtx, aspira-glctx.js - the real canvas keeps it as __glc): each spoke stops at a tower's edge like any
   beam (trimToTowers), its t range kept so the fade still runs over the whole spoke */
function drawIfrFlaresGl(t, low) {
  for (const c of t.ifrFlares) {
    const f = Math.max(0, c.left / c.life);
    for (const [x0, y0, x1, y1] of ifrBeamEnds(c)) {
      const s = trimToTowers(x0, y0, x1, y1); if (!s) continue;
      const L = Math.hypot(x1 - x0, y1 - y0) || 1, t0 = Math.hypot(s[0] - x0, s[1] - y0) / L, t1 = 1 - Math.hypot(x1 - s[2], y1 - s[3]) / L;
      for (let g = low ? IFR_GLOW_GL.length - 2 : 0; g < IFR_GLOW_GL.length; g++) { /* lowQ: the orange core + the white one */
        const q = IFR_GLOW_GL[g]; fxGlGlowLine(s[0], s[1], s[2], s[3], c.W * q[0], COL[q[2]], q[1] * f * IFR_GLOW_A, t0, t1);
      }
    }
  }
}
function drawIfrFlares(t) {
  if (!t.ifrFlares.length) return;
  const low = typeof lowQ === "function" && lowQ();
  if (typeof fxGlGlowLine === "function" && fxGl.on && ctx.real && ctx.real.__glc === ctx) { drawIfrFlaresGl(t, low); return; } /* ctx IS the stand-in (glCtx) */
  ctx.strokeStyle = COL.tifr;
  for (const c of t.ifrFlares) {
    const f = Math.max(0, c.left / c.life), ends = ifrBeamEnds(c);
    for (let g = low ? IFR_GLOW.length - 2 : 0; g < IFR_GLOW.length; g++) {
      ctx.strokeStyle = COL[IFR_GLOW[g][2]]; ctx.lineWidth = Math.max(1, c.W * IFR_GLOW[g][0]);
      for (let k = 0; k < IFR_GLOW_BANDS; k++) {
        const a0 = k / IFR_GLOW_BANDS, a1 = (k + 1) / IFR_GLOW_BANDS;
        ctx.globalAlpha = IFR_GLOW[g][1] * f * IFR_GLOW_A * (1 - a0) ** 3; // fast falloff to the tip (owner, 2026-10-19; was 1 - a0^2)
        ctx.beginPath();
        for (const [x0, y0, x1, y1] of ends) { ctx.moveTo(x0 + (x1 - x0) * a0, y0 + (y1 - y0) * a0); ctx.lineTo(x0 + (x1 - x0) * a1, y0 + (y1 - y0) * a1); }
        ctx.stroke();
      }
    }
  }
}
/* balls true (drawn in skyKeep, aspira-draw.js): the balls in flight (the charge balls: drawIfrTop, on the prism's top), which keep their orange on a
   boss sky (owner, 2026-10-19: "ifrit balls should stay orange on boss inversion"); else the rings, pellets and spokes, which turn over with it */
function drawIfr(balls) {
  const low = typeof lowQ === "function" && lowQ();
  for (const t of G.towers) {
    if (t.kind !== "ifr" || t.ifrSlot0 == null) continue;
    ctx.lineCap = "butt"; ctx.lineJoin = "round";
    if (balls) drawIfrBalls(t, low); else { drawIfrFlares(t); drawIfrRings(t, low); drawIfrEmbers(t, low); }
  }
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
}
// the CHARGE BALLS UNDER THE PRISM (owner, 2026-10-20: "centered on the corner of the hexagon where it meets the floor ... always tower
// occludes balls"): drawn with the tower (aspira-warp.js, warpEntities' `under`, at floor height, BEFORE the prism), each centred on a
// corner of the prism's floor hex. In the tower's own colours, as the tower (ownColours)
function drawIfrTop(t) {
  if (t.kind !== "ifr" || t.ifrSlot0 == null) return;
  const low = typeof lowQ === "function" && lowQ();
  ctx.lineCap = "butt"; drawIfrCharge(t, towerStats(t), low); ctx.globalAlpha = 1;
}
