// /spire - SOL'S BEAMS, DRAWN (2D; in 3D the entity layer's "beams" pass draws every beam this way - drawFx, aspira-draw.js). Draw only.
// (owner, 2026-11-06) "never use step glow unless huge perf gains": ONE glow, a shadowBlur in SOL's colour round the beam's body, for the old four
// stacked strokes; "when a beam increases in width after a hit, make it a cone, start at current width, and end at target width": a segment that goes
// on from another's end widens from that one's width (a filled trapezoid); "the initial beam opacity should start at 0% right outside the tower and fade
// in to 100% at 20% of the distance to target"; "for beams heading off the screen beam should fade from 100% current opacity to 20% at edge of screen";
// "draw all white core of beam last so that they merged together": every SOL beam of the frame queued (solBeamPush), then ALL the glows, then ALL the
// white cores (solBeamFlush). The along-fades are an alpha ramp PATTERN a colour (made once from pixel values - no colour strings), laid along the beam
const SOLB_FADE_IN = 0.2, SOLB_OFF_END = 0.2, SOLB_GLOW = 1.6, SOLB_TOWER_R = 22; // fade-in share; off-screen end alpha; glow blur x the body width; u
const solBeamQ = [], solRamps = new Map();
function solRamp(css) { // a 256 x 1 strip of `css` going from clear (left) to full (right), as a pattern; one a colour
  let p = solRamps.get(css); if (p) return p;
  const m = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(css) || [0, 255, 255, 255], c = document.createElement("canvas"); c.width = 256; c.height = 1;
  const x = c.getContext("2d"), im = x.createImageData(256, 1);
  for (let i = 0; i < 256; i++) { im.data[4 * i] = +m[1]; im.data[4 * i + 1] = +m[2]; im.data[4 * i + 2] = +m[3]; im.data[4 * i + 3] = i; }
  x.putImageData(im, 0, 0); p = { c, pat: null }; solRamps.set(css, p); return p;
}
// f: the beam; A, B: its ends as drawn (world, or device px under `map`); w1: its core width there; a: its alpha; ws: world-to-drawn width scale
function solBeamPush(f, A, B, w1, a, ws, map) {
  f._w = w1; // (read by the segment after it: its cone's start)
  const w0 = f.prev && f.prev._w && f.prev._w < w1 ? f.prev._w : w1;
  solBeamQ.push({ ax: A.x, ay: A.y, bx: B.x, by: B.y, w0, w1, a, first: f.first, off: f.off, ws, m: map ? null : ctx.getTransform() });
}
function solBeamShape(q, k) { // the body as a closed path: w0 -> w1 wide (x k), round-ended
  const dx = q.bx - q.ax, dy = q.by - q.ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, h0 = q.w0 * k / 2, h1 = q.w1 * k / 2, ang = Math.atan2(dy, dx);
  ctx.beginPath(); ctx.moveTo(q.ax + nx * h0, q.ay + ny * h0); ctx.lineTo(q.bx + nx * h1, q.by + ny * h1); ctx.arc(q.bx, q.by, h1, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.lineTo(q.ax - nx * h0, q.ay - ny * h0); ctx.arc(q.ax, q.ay, h0, ang - Math.PI / 2, ang + Math.PI / 2, true); ctx.closePath();
}
function solBeamFill(q, css, k, glow) { // the body in `css`, faded along it as the beam asks; glow: its shadowBlur (device px)
  const dx = q.bx - q.ax, dy = q.by - q.ay, L = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  if (q.m) ctx.setTransform(q.m); else ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowColor = css; ctx.shadowBlur = glow; ctx.globalAlpha = Math.min(1, q.a);
  solBeamShape(q, k);
  if (!q.first && !q.off) { ctx.fillStyle = css; ctx.fill(); return; }
  try { solBeamFade(q, css, k, dx, dy, L, ang); } catch (e) { solBeamShape(q, k); ctx.fillStyle = css; ctx.fill(); } // (a canvas without pattern transforms - the smoke's stand-in: plain)
}
function solBeamFade(q, css, k, dx, dy, L, ang) {
  // the faded run: the ramp pattern laid along it (256 pattern px = the ramp's span; outside it the pattern is clear), each part its own shape so the
  // glow (the shadow of what is drawn) fades with it
  const r = solRamp(css), pat = r.pat || (r.pat = ctx.createPattern(r.c, "repeat-y"));
  if (!pat || typeof pat.setTransform !== "function" || typeof DOMMatrix !== "function") throw new Error("no pattern transform");
  const part = (u0, u1) => ({ ax: q.ax + dx * u0, ay: q.ay + dy * u0, bx: q.ax + dx * u1, by: q.ay + dy * u1, w0: q.w0 + (q.w1 - q.w0) * u0, w1: q.w0 + (q.w1 - q.w0) * u1 });
  if (q.first) { // clear to t0 (the tower), the ramp t0 -> t1, solid past it
    const t0 = Math.min(0.9, SOLB_TOWER_R * q.ws / L), t1 = t0 + SOLB_FADE_IN * (1 - t0);
    pat.setTransform(new DOMMatrix().translateSelf(q.ax, q.ay).rotateSelf(ang * 180 / Math.PI).translateSelf(L * t0, 0).scaleSelf(L * (t1 - t0) / 256, 1));
    solBeamShape(part(t0, t1), k); ctx.fillStyle = pat; ctx.fill();
    solBeamShape(part(t1, 1), k); ctx.fillStyle = css; ctx.fill();
  } else { // off screen: from full at its start to SOLB_OFF_END at its end - that much solid, the rest the ramp reversed
    const a = ctx.globalAlpha; ctx.globalAlpha = a * SOLB_OFF_END; ctx.fillStyle = css; ctx.fill();
    pat.setTransform(new DOMMatrix().translateSelf(q.bx, q.by).rotateSelf(ang * 180 / Math.PI + 180).scaleSelf(L / 256, 1));
    ctx.globalAlpha = a * (1 - SOLB_OFF_END); ctx.fillStyle = pat; ctx.fill(); ctx.globalAlpha = a;
  }
}
function solBeamFlush() {
  if (!solBeamQ.length) return;
  ctx.save();
  try {
    const glow = COL[TOWERS.sol.color];
    for (const q of solBeamQ) solBeamFill(q, glow, SOL_BEAM_W, SOLB_GLOW * q.w1 * (q.m ? Math.hypot(q.m.a, q.m.b) : 1)); // every glow first
    ctx.shadowBlur = 0;
    for (const q of solBeamQ) solBeamFill(q, COL.white, SOL_BEAM_W * 0.55, 0); // then every white core, over all of them
  } finally { ctx.restore(); solBeamQ.length = 0; }
}
