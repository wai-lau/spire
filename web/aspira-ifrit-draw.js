// /spire - IFR, IFRIT: THE LOOK (split from aspira-ifrit.js at the 500-line cap, 2026-10-20) - the charge, the meteor in flight,
// the fire and the flares. Loaded right after aspira-ifrit.js (same global scope; the simulator loads only the logic).
// ---------- the look: the charge, the meteors, the fire and the flares. Fills, strokes and lines only (the
// 3D moving layer turns them into GL instances; no gradient on the board context) ----------
function drawIfrCharge(t, st, low) {
  if (t.ifrCharge <= 0) return;
  const c = ifrCentre(t); drawIfrMeteor(c.x, c.y, st.ballR * (0.3 + 0.7 * t.ifrCharge), true, low); /* grows to the meteor it launches */
}
// the ring's glow at radius r, alpha a (0.9 = full): IFR_RING_GLOW's layers, the blast's and the ball's alike
function drawIfrRingAt(x, y, r, a, low) {
  for (let g = low ? IFR_RING_GLOW.length - 2 : 0; g < IFR_RING_GLOW.length; g++) { /* lowQ: the orange core + the white */
    ctx.strokeStyle = COL[IFR_RING_GLOW[g][2]]; ctx.lineWidth = IFR_RING_THIN * IFR_RING_GLOW[g][0]; ctx.globalAlpha = IFR_RING_GLOW[g][1] * a / 0.9;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
  }
}
// THE METEOR (owner, 2026-10-20): a black disc (fill), the blast's outline glow, and an INNER GLOW - "a radial glow from the outline towards
// the center (it should start at 30%, then fall off to 0% about 30% of the way towards the center)": IFR_INNER_N rings inside the outline,
// alpha falling from IFR_INNER_A to 0 over IFR_INNER_DEPTH of the radius (stacked strokes - no gradient on the 3D board context). a: x alpha
const IFR_INNER_A = 0.3, IFR_INNER_DEPTH = 0.3, IFR_INNER_N = 6;
function drawIfrMeteor(x, y, r, fill, low, a = 1, inner = 1) { // fill: false, true (the black core) or a colour; inner: x the inner glow's alpha (a fire's rise)
  if (fill) { ctx.fillStyle = fill === true ? COL.bg : fill; ctx.globalAlpha = 0.95 * a; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
  const n = low ? 2 : IFR_INNER_N, w = r * IFR_INNER_DEPTH / n;
  ctx.strokeStyle = COL.glow; ctx.lineWidth = w; /* ember red-orange inside the rim (the fire colours, 2026-10-20) */
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n; ctx.globalAlpha = Math.min(1, IFR_INNER_A * (1 - u) * a * inner);
    ctx.beginPath(); ctx.arc(x, y, r * (1 - IFR_INNER_DEPTH * u), 0, 6.283); ctx.stroke();
  }
  drawIfrRingAt(x, y, r, 0.9 * a, low);
}
function drawIfrBalls(t, low) {
  for (const b of t.ifrBalls) if (!(b.wait > 0)) drawIfrMeteor(b.x, b.y, b.r, b.gen ? COL.yellow : true, low, b.gen ? Math.min(1, (b.flown || 0) / IFR_ARM_HIT_U) : 1); /* (wait: a fan meteor not released yet); a SPAWNED one fades in over its harmless first IFR_ARM_HIT_U (owner, 2026-10-20) */
}
// A FLARE'S INTENSITY REFLECTS ITS DAMAGE (owner, 2026-10-20): its glow's alpha x the root of its hit over the untaken flare's, kept in
// [IFR_FLARE_I0, IFR_FLARE_I_MAX] - the untaken flare IFR_FLARE_I0 bright (owner, 2026-10-20: "make level 0 flares much more visible"; was 1, the cap 3)
const IFR_FLARE_I0 = 3, IFR_FLARE_I_MAX = 6;
const IFR_FLARE_MAIN_K = 3 /* 2 -> 3 (owner, 2026-10-20: "make the non-hellfire stars brighter") */; // a METEOR's flare (not the fire's) x this - "make non-hellfire flares more opaque and intense" (owner, 2026-10-20)
function ifrFlareI(f) { return (f.hf ? 1 : IFR_FLARE_MAIN_K) * Math.min(IFR_FLARE_I_MAX, IFR_FLARE_I0 * Math.max(1, Math.sqrt((f.hit || 0) / (TOWERS.ifr.dmg * IFR_TICK_K[0])))); } // (the root: stop I's hit is ~4x the untaken one, VI's ~9x)
// THE GLOW (owner, 2026-10-19: "hellfire highlight should be a glow which reduces in opacity gradually near the end of spoke"):
// each spoke is three stacked strokes - wide and faint, mid, a narrow bright core - [x the beam width, alpha], each cut into
// IFR_GLOW_BANDS lengths whose alpha falls off toward the tip as 1 - (k / bands)^2 (flat near the centre, fading at the end).
// That is the 2D way (a canvas stroke takes no gradient that follows its length). In 3D (owner, 2026-10-19: "why can GRV have
// smooth aura gradients while IFR spokes cannot? fix") each spoke is instead two GLOW LINES on the GPU (shape 7, aspira-fxgl.js):
// a halo and a narrow core, each brightest on its centre line and clear at its edge, fading as 1 - t^2 to the tip - smooth, no
// bands. IFR_GLOW_GL: [half-width x the beam width, alpha, colour]. lowQ keeps the core only, both ways
const IFR_GLOW = [[1, 0.12, "glow"], [0.5, 0.28, "tifr"], [0.16, 0.85, "orange"], [0.05, 0.9, "yellow"]] /* the widest layer = the beam's hit band W (owner, 2026-10-20: "the glow should only be as wide as the hitbox"; was 1.6, 0.8, 0.25, 0.08) */, IFR_GLOW_BANDS = 6, IFR_GLOW_A = 0.11375; /* x0.5 (owner, 2026-10-20: "reduce flare opacity by 50%"; was 0.2275) */ /* a WHITE core in the orange (owner, 2026-10-19); IFR_GLOW_A: every spoke starts at 22.75% (owner, 2026-10-19: 65%, x0.7, then x0.5) */
const IFR_GLOW_GL = [[0.5, 0.5, "glow"], [0.125, 0.95, "orange"], [0.0375, 0.95, "yellow"]]; /* fire colours, no white (owner, 2026-10-20) */ /* half-widths: the widest = W / 2, the hit band (was 0.8, 0.2, 0.06) */
/* 3D, drawn through the GPU stand-in (glCtx, aspira-glctx.js - the real canvas keeps it as __glc): each spoke stops at a tower's edge like any
   beam (trimToTowers), its t range kept so the fade still runs over the whole spoke */
function drawIfrFlaresGl(t, low) {
  for (const c of t.ifrFlares) {
    const f = Math.max(0, c.left / c.life);
    for (const [x0, y0, x1, y1] of ifrBeamEnds(c)) {
      const s = trimToTowers(x0, y0, x1, y1); if (!s) continue;
      const L = Math.hypot(x1 - x0, y1 - y0) || 1, t0 = Math.hypot(s[0] - x0, s[1] - y0) / L, t1 = 1 - Math.hypot(x1 - s[2], y1 - s[3]) / L;
      for (let g = low ? IFR_GLOW_GL.length - 2 : 0; g < IFR_GLOW_GL.length; g++) { /* lowQ: the orange core + the white one */
        const q = IFR_GLOW_GL[g]; fxGlGlowLine(s[0], s[1], s[2], s[3], c.W * q[0], ifrFlareCol(q[2], c), Math.min(1, q[1] * f * IFR_GLOW_A * ifrFlareI(c)), t0, t1);
      }
    }
  }
}
// a flare layer's colour: the fire's flares glow BRIGHT RED outside (the palette's threat red) round an ORANGE core (owner, 2026-10-20: "bright red
// cores", then "this red should be the outer color, and the orange the inner color") - and a METEOR's burn WHITE-hot at the core, yellow round
// it ("make non-hellfire flares more white" - the one place IFR draws white since "no white", 2026-10-20)
const IFR_HF_COL = { glow: "threat", yellow: "tifr" }, IFR_MAIN_COL = { yellow: "white", orange: "yellow" };
const ifrFlareCol = (key, f) => COL[(f.hf ? IFR_HF_COL[key] : IFR_MAIN_COL[key]) || key];
function drawIfrFlares(t) {
  if (!t.ifrFlares.length) return;
  const low = typeof lowQ === "function" && lowQ();
  if (typeof fxGlGlowLine === "function" && fxGl.on && ctx.real && ctx.real.__glc === ctx) { drawIfrFlaresGl(t, low); return; } /* ctx IS the stand-in (glCtx) */
  ctx.strokeStyle = COL.tifr;
  for (const c of t.ifrFlares) {
    const f = Math.max(0, c.left / c.life), ends = ifrBeamEnds(c);
    for (let g = low ? IFR_GLOW.length - 2 : 0; g < IFR_GLOW.length; g++) {
      ctx.strokeStyle = ifrFlareCol(IFR_GLOW[g][2], c); ctx.lineWidth = Math.max(1, c.W * IFR_GLOW[g][0]);
      for (let k = 0; k < IFR_GLOW_BANDS; k++) {
        const a0 = k / IFR_GLOW_BANDS, a1 = (k + 1) / IFR_GLOW_BANDS;
        ctx.globalAlpha = Math.min(1, IFR_GLOW[g][1] * f * IFR_GLOW_A * ifrFlareI(c) * (1 - a0) ** 3); // fast falloff to the tip (owner, 2026-10-19; was 1 - a0^2)
        ctx.beginPath();
        for (const [x0, y0, x1, y1] of ends) { ctx.moveTo(x0 + (x1 - x0) * a0, y0 + (y1 - y0) * a0); ctx.lineTo(x0 + (x1 - x0) * a1, y0 + (y1 - y0) * a1); }
        ctx.stroke();
      }
    }
  }
}
/* balls true (drawn in skyKeep, aspira-draw.js): the balls in flight (the charge balls: drawIfrTop, on the prism's top), which keep their orange on a
   boss sky (owner, 2026-10-19: "ifrit balls should stay orange on boss inversion"); else the fires and spokes, which turn over with it */
function drawIfr(balls) {
  const low = typeof lowQ === "function" && lowQ();
  for (const t of G.towers) {
    if (t.kind !== "ifr" || !t.ifrInit0) continue;
    ctx.lineCap = "butt"; ctx.lineJoin = "round";
    if (balls) drawIfrBalls(t, low); else { drawIfrFlares(t); }
  }
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
}
// the CHARGE BALLS UNDER THE PRISM (owner, 2026-10-20: "centered on the corner of the hexagon where it meets the floor ... always tower
// occludes balls"): drawn with the tower (aspira-warp.js, warpEntities' `under`, at floor height, BEFORE the prism), each centred on a
// corner of the prism's floor hex. In the tower's own colours, as the tower (ownColours)
function drawIfrTop(t) {
  if (t.kind !== "ifr" || !t.ifrInit0) return;
  const low = typeof lowQ === "function" && lowQ();
  ctx.lineCap = "butt"; drawIfrCharge(t, towerStats(t), low); ctx.globalAlpha = 1;
}
