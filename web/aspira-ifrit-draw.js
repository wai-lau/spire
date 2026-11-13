// /spire - IFR, IFRIT: THE LOOK (split from aspira-ifrit.js at the 500-line cap, 2026-10-20) - the charge, the meteor in flight,
// the fire and the flares. Loaded right after aspira-ifrit.js (same global scope; the simulator loads only the logic).
// ---------- the look: the charge, the meteors, the fire and the flares. Fills, strokes and lines only (the
// 3D moving layer turns them into GL instances; no gradient on the board context) ----------
// DRAWN BIGGER UP THE METEOR AXIS (owner, 2026-11-05: "IFR meteor should visually increase meteor and shard sizes"): the meteor in flight, its trail and its
// burst shards are drawn x IFR_METEOR_DRAW_K per Meteor tier (V x3.05) on top of their radius - the DRAWING only; the hit sizes (IFR_BALL_RAD) are the logic's
// TWICE AS BIG (owner, 2026-11-09: "double the size of all meteors and secondary meteors; leave special meteor V meteors alone"): every meteor
// DRAWN x IFR_METEOR_SIZE_K - in flight with its tracer, the burst shards, the charges in orbit (their Hellfire ring and Flare rays with them) -
// but not Meteor V's big ones (b.big, IFR_BIG_DRAW_K, as they were); the hit sizes (IFR_BALL_RAD) untouched
const IFR_METEOR_SIZE_K = 2;
const IFR_METEOR_DRAW_K = 1.25, ifrDrawK = t => IFR_METEOR_DRAW_K ** (typeof skillOf === "function" ? skillOf(t, "meteor") : 0);
const IFR_MINI_R = 20, IFR_MINI_L = 0.5; // the tertiary meteor's hit ring: radius 20 u (40 u across: the owner's "40u circle"), fading over 0.5 s (owner, 2026-11-10: "just visually, tertiary meteors should show a small 40u circle on hit as well")
// THE TERTIARY HIT CIRCLE (owner, 2026-11-10: "just visually, tertiary meteors should show a small 40u circle on hit as well"): a look only -
// where a re-split small meteor hits, a ring in the fire circle's look that grows from 30% to full while it fades over IFR_MINI_L
function drawIfrMini(t) {
  if (!t.ifrMini) return;
  for (const m of t.ifrMini) {
    const a = 1 - m.age / IFR_MINI_L, r = IFR_MINI_R * (0.3 + 0.7 * (1 - a)); // grows 30% -> 100% while it fades
    drawIfrRingAt(m.x, m.y, r, a * 0.9, false, 1);
  }
}
function drawIfrCharge(t, st, low, far) { // far: true the meteors behind the tower's centre only, false those in front, undefined all
  if (t.ifrCharge <= 0) return;
  const cy = ifrCentre(t).y;
  const n = Math.max(1, st.store || 1); // the stored meteors, evenly round the orbit; the one still charging grows to the meteor it launches
  const h = skillOf(t, "hellfire"), fl = skillOf(t, "firaga");
  for (let k = 0; k < n && k < t.ifrCharge; k++) { const c = ifrChargeAt(t, k, n); if (far != null && (c.y < cy) !== far) continue; const f = Math.min(1, t.ifrCharge - k), r = st.ballR * (0.3 + 0.7 * f) * IFR_METEOR_SIZE_K; drawIfrMeteor(c.x, c.y, r, true, low); ifrBodyMarks(c.x, c.y, r, h, fl, f); } // (the charges in orbit x IFR_METEOR_SIZE_K since 2026-11-09; they had kept their size so as not to crowd the tower's hex)
}
// THE BODY SHOWS THE BUILD (owner, 2026-11-06: "I want the upgrades to each update a visual feature of the tower as well as their attacks / for example
// with IFR / for the meteors that orbit it / meteor: bigger (already exists) / hellfire: brighter/thicker red ring around / flare: little flare on top of
// meteor (up to 2x the size of IFR 0 meteor at flare V)"): on each ORBITING meteor (the charges, not the ones in flight) - Hellfire a red ring round it,
// wider and brighter each tier (none untaken); Flare a little four-ray flare over it, its rays IFR_BODY_FL_K x the untaken meteor's radius a tier, 2x at V.
// The look only; 3 strokes a meteor at most. h, fl: the Hellfire and Flare tiers; f: the charge's fill (the marks grow in with it)
const IFR_BODY_HF_GAP = 2.6, IFR_BODY_HF_W = [0, 0.7, 1.1, 1.5, 1.9, 2.4], IFR_BODY_HF_A = [0, 0.5, 0.62, 0.74, 0.87, 1], IFR_BODY_FL_K = 0.4, IFR_BODY_FL_X = 0.55;
function ifrBodyMarks(x, y, r, h, fl, f) {
  if (h > 0) { ctx.strokeStyle = COL.threat; ctx.lineWidth = IFR_BODY_HF_W[h]; ctx.globalAlpha = IFR_BODY_HF_A[h] * f; ctx.beginPath(); ctx.arc(x, y, r + IFR_BODY_HF_GAP, 0, 6.283); ctx.stroke(); }
  if (fl > 0) {
    const L = IFR_BALL_RAD[0] * IFR_METEOR_SIZE_K * IFR_BODY_FL_K * fl * f, d = L * IFR_BODY_FL_X * Math.SQRT1_2; // the long four + a shorter x, one path
    ctx.lineCap = "round"; ctx.beginPath();
    ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x - d, y + d); ctx.lineTo(x + d, y - d);
    ctx.strokeStyle = COL.orange; ctx.lineWidth = 1.2 + 0.15 * fl; ctx.globalAlpha = 0.55 * f; ctx.stroke(); /* an orange halo, then the white-hot core over it - a meteor's flare's colours (IFR_MAIN_COL) */
    ctx.strokeStyle = COL.white; ctx.lineWidth = 0.45 + 0.08 * fl; ctx.globalAlpha = Math.min(1, 0.6 + 0.08 * fl) * f; ctx.stroke(); ctx.lineCap = "butt";
  }
  ctx.globalAlpha = 1;
}
// the ring's glow at radius r, alpha a (0.9 = full): ONE SMOOTH GLOW (owner, 2026-11-06: "never use step glow unless huge perf gains"; it was IFR_RING_GLOW's
// four flat bands stacked) - the orange core with a shadowBlur halo in the outer layer's colour reaching the old widest band, the thin yellow core on
// top; on the 3D board's context the halo is one GPU ring glow (aspira-glctx.js, shape 9). The blast's ring and the ball's alike
function drawIfrRingAt(x, y, r, a, low, wk = 1, cols = null) { // wk: x every layer's width (the fire's ring: IFR_FIRE_W); cols: a layer colour map (the fire's: IFR_HF_COL)
  const L = IFR_RING_GLOW, col = k => COL[(cols && cols[k]) || k], m = ctx.getTransform(), sc = Math.hypot(m.a, m.b);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283);
  if (!low) { ctx.shadowColor = col(L[0][2]); ctx.shadowBlur = IFR_RING_THIN * (L[0][0] - L[2][0]) / 2 * wk * sc; }
  ctx.strokeStyle = col(L[2][2]); ctx.lineWidth = IFR_RING_THIN * L[2][0] * wk; ctx.globalAlpha = Math.min(1, L[2][1] * a / 0.9); ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = col(L[3][2]); ctx.lineWidth = IFR_RING_THIN * L[3][0] * wk; ctx.globalAlpha = Math.min(1, L[3][1] * a / 0.9); ctx.stroke();
  ctx.restore();
}
// THE METEOR (owner, 2026-10-20): a black disc (fill), the blast's outline glow, and an INNER GLOW - "a radial glow from the outline towards
// the center (it should start at 30%, then fall off to 0% about 30% of the way towards the center)": one smooth glow inside the outline,
// alpha falling from IFR_INNER_A to 0 over IFR_INNER_DEPTH of the radius (was IFR_INNER_N stacked rings). a: x alpha
const IFR_INNER_A = 0.3, IFR_INNER_DEPTH = 0.3;
function drawIfrMeteor(x, y, r, fill, low, a = 1, inner = 1, wk = 1, cols = null, noRing = false) { // noRing: the inner glow alone (a Hellfire V ring draws the ring) // fill: false, true (the black core) or a colour; inner: x the inner glow's alpha (a fire's rise)
  if (fill) { ctx.fillStyle = fill === true ? COL.bg : fill; ctx.globalAlpha = 0.95 * a; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
  // THE INNER GLOW, SMOOTH (owner, 2026-11-06: "never use step glow unless huge perf gains"; was IFR_INNER_N stacked rings): IFR_INNER_A at the rim
  // falling linearly to clear IFR_INNER_DEPTH of the radius in - on the GPU one inside-only ring glow (shape 9), on a 2D canvas one radial gradient
  const col = COL[(cols && cols.glow) || "glow"], A = Math.min(1, IFR_INNER_A * a * inner); /* ember red-orange inside the rim (the fire colours, 2026-10-20) */
  if (A > 0.003) {
    if (ctx && ctx.real && ctx.real.__glc === ctx && typeof fxGl !== "undefined" && fxGl.on && typeof fxGlPush === "function") fxGlPush(x, y, x, y, r, r * IFR_INNER_DEPTH, col, A, col, 0, 9, 0, 0, 1, 1);
    else { ctx.save(); ctx.translate(x, y); ctx.scale(r, r); ctx.globalAlpha = A; ctx.fillStyle = ifrRimGrad(col); ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.283); ctx.fill(); ctx.restore(); }
  }
  if (!noRing) drawIfrRingAt(x, y, r, 0.9 * a, low, wk, cols);
}
// THE FIRE'S CIRCLE, back at IFR_FIRE_A (owner, 2026-10-21: "visually restore the hellfire circle at 20% opacity"; gone 2026-10-20):
// the meteor without its black fill at the fire's radius, as it grows - the look only (stepIfrFires still draws and burns nothing)
const IFR_FIRE_A = 0.16, IFR_FIRE_W = 2; // its glow TWICE as wide, a little fainter (owner, 2026-10-21: "on the ring, double glow width, slightly reduce opacity"; was 0.2, x1)
// TRACKED x3, UNTRACKED FADES (owner, 2026-11-05: "triple the opacity of tracked hellfires / untracking hellfires should fade out after they've done the
// damage without waiting for all minifires"): a fire riding its enemy (f.eid) draws at IFR_FIRE_TRACK_K its alpha; one that rides nothing (never did, or its
// enemy died), once grown - its ring has hit all it reached - fades out over IFR_FIRE_FADE_S game s (f.fadeAt, its age then). The LOOK only: the fire lives on,
// lighting its queued flares (stepIfrFires); was every fire held at half till its flares were out (owner, 2026-10-21)
const IFR_FIRE_TRACK_K = 3, IFR_FIRE_FADE_S = 0.4;
function drawIfrFires(t, low) {
  for (const f of t.ifrFires || []) {
    let a = f.r < f.R ? IFR_FIRE_A : IFR_FIRE_A / 2;
    if (f.eid != null) a = Math.min(1, a * IFR_FIRE_TRACK_K);
    else if (f.r >= f.R) { if (f.fadeAt == null) f.fadeAt = f.age0 || 0; a *= Math.max(0, 1 - ((f.age0 || 0) - f.fadeAt) / IFR_FIRE_FADE_S); if (a <= 0) continue; }
    if (f.chq && f.eid != null) { drawIfrMeteor(f.x, f.y, f.r, false, low, a, 1, IFR_FIRE_W, IFR_HF_COL, true); continue; } /* Hellfire V tracking: its outer chain ring is the ring (ifrChainDraw) - only the inner glow here */
    drawIfrMeteor(f.x, f.y, f.r, false, low, a, 1, IFR_FIRE_W, IFR_HF_COL); /* RED, its flares' colours (owner, 2026-10-22: "hellfire's fire ring should be red") */
  }
}
const IFR_FADE_IN_U = 8; // a burst meteor is full within 8 u of flight (owner, 2026-10-26: "IFR should fade in faster"; was 25)
const IFR_BIG_DRAW_K = 2; // Meteor V: a big meteor (b.big, aspira-ifrit.js) is drawn this x - its tracer too; the hitbox is unchanged
const IFR_CHAIN_I = 3; // Hellfire V's rings as flares: their glow intensity (as a flare's, IFR_FLARE_I0) where a flare path reads it (ifrFlareI); the chain links' own look: ifrChainDraw
const IFR_SHARD_DRAW = 1 / 3 * 2; /* x2 again on 7.14.1's x2 (owner, 2026-11-10: "visual, double size of ifr secondary and tertiary meteors") - the burst shards drawn at 2/3 of their radius x IFR_METEOR_SIZE_K */ // (IFR_TRACER_U: aspira-ifrit.js - the sim loads no draw file)
// THE LAUNCHED METEOR'S TRACER, like an enemy's (owner, 2026-10-26: "meteor tracer should depend on movement and fade out like enemies"):
// the path it FLEW (b.trail, the last IFR_TRACER_U of it - stepIfrBalls), not a line along its heading, as one tapered shape fading
// from the meteor's colour to nothing at the tail (drawStarTrail, aspira-enemies.js)
function drawMeteorTrail(b, dk = 1) {
  const tr = b.trail; if (!tr || tr.length < 2) return;
  const pts = [{ x: b.x, y: b.y }]; for (let i = tr.length - 1; i >= 0; i--) pts.push(tr[i]);
  const n = pts.length - 1, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n, i + 1)], len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    const w = b.r * dk * 0.8 * (1 - i / n), nx = -(c.y - a.y) / len * w, ny = (c.x - a.x) / len * w;
    L.push({ x: pts[i].x + nx, y: pts[i].y + ny }); R.push({ x: pts[i].x - nx, y: pts[i].y - ny });
  }
  const ends = [pts[0].x, pts[0].y, pts[n].x, pts[n].y]; if (!ends.every(Number.isFinite)) return; // (a NaN end: the gradient THROWS)
  const g = ctx.createLinearGradient(...ends); g.addColorStop(0, COL.orange); g.addColorStop(1, "transparent");
  ctx.beginPath(); ctx.moveTo(L[0].x, L[0].y); for (const p of L) ctx.lineTo(p.x, p.y); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i].x, R[i].y); ctx.closePath();
  ctx.fillStyle = g; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
} // a burst meteor DRAWN at a third of its size - its reach unchanged (owner, 2026-10-26: "make shards also visible 1/3 the current size")
function drawIfrBalls(t, low) {
  const dk = ifrDrawK(t);
  for (const b of t.ifrBalls) if (!(b.wait > 0)) {
    const bk = b.big ? IFR_BIG_DRAW_K : IFR_METEOR_SIZE_K; /* Meteor V's big one as it was; every other meteor and shard x2 */
    const sizeK = b.gen === 1 ? IFR_SHARD_DRAW : (b.gen === 2 ? IFR_SHARD_DRAW * IFR_METEOR_SIZE_K : 1); // tertiaries (gen 2) drawn x2 more, the hitbox unchanged (owner, 2026-11-10: "visual, double size of ifr secondary and tertiary meteors"; the secondaries got theirs in 7.14.x)
    if (!b.gen) drawMeteorTrail(b, dk * bk);
    drawIfrMeteor(b.x, b.y, b.r * sizeK * dk * bk, b.gen ? COL.yellow : true, low, b.gen ? Math.min(1, (b.flown || 0) / IFR_FADE_IN_U) : 1);
    if (!b.gen) ifrBodyMarks(b.x, b.y, b.r * dk * bk, skillOf(t, "hellfire"), skillOf(t, "firaga"), 1); // IN FLIGHT AS IN ORBIT (owner, 2026-11-10: "primary IFR meteors should look like the ones that are orbiting, not blank"): the Hellfire ring and Flare rays
  } /* (IFR_FADE_IN_U: full by 25 u - owner, 2026-10-21: "make the IFR secondary meteors fade in much faster (like 100% around 25u away)"; was over its harmless 100) */ /* (wait: a fan meteor not released yet); a SPAWNED one fades in over its harmless first IFR_ARM_HIT_U (owner, 2026-10-20) */
}
// THE MINES' LOOK (owner, 2026-11-12: "secondary and tertiary meteors should be mines that take some time to arm"): a landed meteor at its
// flight size, dim while it arms (rising smoothly), a bright pulse the moment it is armed, then steady, fading out over its last IFR_MINE_FADE_S
const IFR_MINE_DIM = 0.3, IFR_MINE_LIT = 0.85, IFR_MINE_PULSE_S = 0.3, IFR_MINE_FADE_S = 1;
function drawIfrMines(t, low) {
  if (!t.ifrMines || !t.ifrMines.length) return;
  const dk = ifrDrawK(t);
  for (const m of t.ifrMines) {
    const sizeK = (m.gen === 2 ? IFR_SHARD_DRAW * IFR_METEOR_SIZE_K : IFR_SHARD_DRAW) * IFR_METEOR_SIZE_K, since = m.age - IFR_MINE_ARM_S;
    let a = since < 0 ? IFR_MINE_DIM + (0.55 - IFR_MINE_DIM) * (m.age / IFR_MINE_ARM_S) : IFR_MINE_LIT, inner = 1;
    if (since >= 0 && since < IFR_MINE_PULSE_S) { const p = 1 - since / IFR_MINE_PULSE_S; a = IFR_MINE_LIT + (1 - IFR_MINE_LIT) * p; inner = 1 + 1.5 * p; }
    const left = IFR_MINE_LIFE_S - m.age; if (left < IFR_MINE_FADE_S) a *= Math.max(0, left / IFR_MINE_FADE_S);
    drawIfrMeteor(m.x, m.y, m.r * sizeK * dk, COL.yellow, low, a, inner);
  }
}
// A FLARE'S INTENSITY REFLECTS ITS DAMAGE (owner, 2026-10-20): its glow's alpha x the root of its hit over the untaken flare's, kept in
// [IFR_FLARE_I0, IFR_FLARE_I_MAX] - the untaken flare IFR_FLARE_I0 bright (owner, 2026-10-20: "make level 0 flares much more visible"; was 1, the cap 3)
const IFR_FLARE_I0 = 3, IFR_FLARE_I_MAX = 6;
const IFR_FLARE_MAIN_K = 3 /* 2 -> 3 (owner, 2026-10-20: "make the non-hellfire stars brighter") */; // a METEOR's flare (not the fire's) x this - "make non-hellfire flares more opaque and intense" (owner, 2026-10-20)
function ifrFlareI(f) { if (f.hitI != null) return f.hitI; if (f.chain) return IFR_CHAIN_I; return (f.hf ? 1 : IFR_FLARE_MAIN_K) * Math.min(IFR_FLARE_I_MAX, IFR_FLARE_I0 * Math.max(1, Math.sqrt((f.hit || 0) / (TOWERS.ifr.dmg * IFR_TICK_K[0])))); } // (the root: stop I's hit is ~4x the untaken one, VI's ~9x)
// THE GLOW (owner, 2026-10-19: "hellfire highlight should be a glow which reduces in opacity gradually near the end of spoke"; 2026-11-04: "replace
// all stepped opacity flares to use a faded glow instead"): each spoke is three glow layers - a halo, a mid and a narrow core, each brightest on
// its centre line, clear at the hit band's edge and fading as (1 - t)^3 to the tip. 3D: GLOW LINES on the GPU (shape 7, aspira-fxgl.js); 2D:
// drawIfrFlares. IFR_GLOW_GL: [half-width x the beam width, alpha, colour, falloff power]. lowQ keeps the two inner. IFR_GLOW_A: every spoke
// starts at 11.375% (owner, 2026-10-19: 65%, x0.7, then x0.5; 2026-10-20: "reduce flare opacity by 50%"). The widest = the beam's hit band W
// (owner, 2026-10-20: "the glow should only be as wide as the hitbox"); fire colours, no white but a meteor's core (owner, 2026-10-20)
const IFR_GLOW_A = 0.11375;
// ONE FADED GLOW, NO STEPS (owner, 2026-11-04: "replace all stepped opacity flares to use a faded glow instead"): every layer spans the whole hit
// band (W / 2 each side) and narrows by its falloff power instead (4th: (1 - off)^pw, shape 7) - the old widths 0.5 / 0.125 / 0.0375 ended
// each layer at its own edge, a step at each; the powers put each layer's half-bright point where its edge-to-edge bell had it
const IFR_GLOW_GL = [[0.5, 0.5, "glow", 2], [0.5, 0.95, "orange", 9], [0.5, 0.95, "yellow", 31]]; /* fire colours, no white (owner, 2026-10-20) */ /* half-widths: the widest = W / 2, the hit band (was 0.8, 0.2, 0.06) */
/* 3D, drawn through the GPU stand-in (glCtx, aspira-glctx.js - the real canvas keeps it as __glc): each spoke stops at a tower's edge like any
   beam (trimToTowers), its t range kept so the fade still runs over the whole spoke */
// ALIVE, LIKE FIRE (owner, 2026-11-05: "flares should glow like fire"): every flare flickers on its own - its brightness by up to ~IFR_FLICK_B either
// way, its size by ~IFR_FLICK_S - two waves each at a phase hashed from its spot (nothing stored, no Math.random); real time, so it burns on paused
const IFR_FLICK_B = 0.22, IFR_FLICK_S = 0.06, IFR_FLICK_HZ = [1.9, 4.3, 2.6];
function ifrFlick(c, now) { // [brightness x, size x]; c.ph: a chain's own seeded phase (it moves with its fire: a phase from its spot would jitter)
  const ph = c.ph != null ? c.ph * 43758.5453 : Math.sin(c.x * 12.9898 + c.y * 78.233) * 43758.5453, h = (ph - Math.floor(ph)) * 6.283, w = 6.283 * now;
  return [1 + IFR_FLICK_B * (0.65 * Math.sin(w * IFR_FLICK_HZ[0] + h) + 0.35 * Math.sin(w * IFR_FLICK_HZ[1] + 2.7 * h)), 1 + IFR_FLICK_S * Math.sin(w * IFR_FLICK_HZ[2] + 1.9 * h)];
}
// A FLAT glow line (no fade along it: t0 = t1 = 0): each IFR_GLOW_GL layer across, smooth (shape 7)
function ifrGlowFlat(x0, y0, x1, y1, c, f, low) {
  const s = trimToTowers(x0, y0, x1, y1); if (!s) return;
  for (let g = low ? IFR_GLOW_GL.length - 2 : 0; g < IFR_GLOW_GL.length; g++) { const q = IFR_GLOW_GL[g]; fxGlGlowLine(s[0], s[1], s[2], s[3], c.W * q[0], ifrFlareCol(q[2], c), Math.min(1, q[1] * f * IFR_GLOW_A * ifrFlareI(c) * ifrLayerK(q[2], c)), 0, 0, q[3]); }
}
// FLARE V's CIRCLE AND HELLFIRE V's CHAINS, DRAWN AS THE SPOKES ARE (owner, 2026-11-06: "ifr flare V should be styled like the flare, i.e. white
// core with glow", then "IFR flare v ring should have same thicknmess and glow as main spokes"; "hellfire V chains should be styled like hellfire
// flares"): every IFR_GLOW_GL layer at the spoke's own half-width (c.W x the size flicker x q[0]), falloff (q[3]), colour and alpha at the same
// moment of the flare's life - only flat along (a ring and a chain have no tip to fade to). 3D: a GPU ring glow (shape 9, the spoke's falloff) a
// layer for the circle, a glow line (shape 7) a layer for a chain; 2D: each layer as the spoke's IFR_GLOW_LV strokes (ifrFlareStrokes' widths)
function ifrSpokeLayers(c, f, low, fs, each) {
  for (let g = low ? IFR_GLOW_GL.length - 2 : 0; g < IFR_GLOW_GL.length; g++) { const q = IFR_GLOW_GL[g]; each(c.W * fs * q[0], ifrFlareCol(q[2], c), Math.min(1, q[1] * f * IFR_GLOW_A * ifrFlareI(c) * ifrLayerK(q[2], c)), q[3]); }
}
function ifrRingGl(c, f, low, fs = 1) { ifrSpokeLayers(c, f, low, fs, (w, col, a, pw) => fxGlPush(c.x, c.y, c.x, c.y, c.circ, w, col, a, col, 0, 9, 0, 0, pw)); }
function ifrSpoke2D(c, f, low, path) { // the 2D spoke's strokes along `path` (world units): solid colour, no fade along
  ctx.save(); ctx.lineCap = "round";
  ifrSpokeLayers(c, f, low, 1, (w, col, a, pw) => { ctx.strokeStyle = col; ctx.globalAlpha = a / IFR_GLOW_LV.length * 1.6; for (const lv of IFR_GLOW_LV) { ctx.lineWidth = Math.max(0.05, 2 * w * (1 - lv ** (1 / pw))); path(); ctx.stroke(); } });
  ctx.restore();
}
// HELLFIRE V's RINGS (owner, 2026-11-07: "make the ring a thick chain" .. "2 rings, one inside and the other outside, have them both rotating
// in opposite directions slowly"; 21:20: "they need to use the same palette and glow as the ring / the links need to be longer, like an 0 not
// an O / replace the ring with the outside ring"): each ring is the fire's OWN ring (drawIfrRingAt, IFR_HF_COL, IFR_FIRE_W, a tracked fire's
// alpha) with LINKS over it in the ring's colours - long ovals along the ring (IFR_HFL_LEN x IFR_HFL_W u), each other link a bar seen edge-on,
// a red body and the orange core line on top. The links turn once each IFR_HF_RING_TURN_S on the ring's own direction (c.dir), on the game's
// clock (its age: still when paused). The tracked fire draws no plain ring of its own (drawIfrFires): the outer chain ring is it
const IFR_HF_RING_TURN_S = 7, IFR_HFL_LEN = 18, IFR_HFL_W = 7, IFR_HFL_LW = [2.2, 0.8], IFR_HFL_A = 0.95, IFR_HFL_GLOW = [1.3, 0.35];
function ifrRingLinks(c, each) { // each(ax, ay, bx, by, odd): a link's axis ends, tangent to the ring
  const r = c.circ, pitch = IFR_HFL_LEN * 0.78, n = Math.max(8, 2 * Math.round(Math.PI * r / pitch)), a0 = c.dir * 2 * Math.PI * (c.life - c.left) / IFR_HF_RING_TURN_S;
  const h = (IFR_HFL_LEN - IFR_HFL_W) / 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * 2 * Math.PI / n, cx = c.x + Math.cos(a) * r, cy = c.y + Math.sin(a) * r, tx = -Math.sin(a), ty = Math.cos(a), hh = i & 1 ? h + IFR_HFL_W * 0.3 : h;
    each(cx - tx * hh, cy - ty * hh, cx + tx * hh, cy + ty * hh, i & 1);
  }
}
function ifrChainDraw(c, f, low, fs = 1) {
  if (!(c.circ > 1)) return;
  /* NO RING LINE UNDER THE LINKS (owner, 21:40: "the centers of the ovals laying flat are struck through"): the links carry the ring's glow
     themselves - a soft halo in the ring's outer colour round each one (IFR_HFL_GLOW: x the link's width, alpha) - so a flat link's hole stays open */
  const gl3 = !!(ctx && ctx.real && ctx.real.__glc === ctx && typeof fxGl !== "undefined" && fxGl.on && typeof fxGlPush === "function");
  const a = Math.min(1, IFR_HFL_A * f), cols = [COL[IFR_HF_COL.orange], COL[IFR_HF_COL.yellow]], R = IFR_HFL_W / 2;
  const glowCol = COL[IFR_HF_COL.glow], ga = Math.min(1, IFR_HFL_GLOW[1] * f);
  if (gl3) {
    if (!low) ifrRingLinks(c, (ax, ay, bx, by, odd) => { /* the halo along each long side of a flat link (never down its middle, the hole) and along a bar */
      const d = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / d * R, ny = (bx - ax) / d * R, gw = IFR_HFL_W * IFR_HFL_GLOW[0] / 2;
      if (odd) fxGlGlowLine(ax, ay, bx, by, gw, glowCol, ga, 0, 0, 2); else for (const sg of [1, -1]) fxGlGlowLine(ax + nx * sg, ay + ny * sg, bx + nx * sg, by + ny * sg, gw, glowCol, ga, 0, 0, 2); });
    for (let k = 0; k < 2; k++) ifrRingLinks(c, (ax, ay, bx, by, odd) => {
      if (odd) fxGlPush(ax, ay, bx, by, IFR_HFL_LW[k] / 2, 0, cols[k], a, cols[k], 0);
      else fxGlPush(ax, ay, bx, by, R, IFR_HFL_LW[k], cols[k], 0, cols[k], a);
    });
    return;
  }
  const ev = new Path2D(), od = new Path2D();
  ifrRingLinks(c, (ax, ay, bx, by, odd) => {
    if (odd) { od.moveTo(ax, ay); od.lineTo(bx, by); return; }
    const th = Math.atan2(by - ay, bx - ax);
    ev.moveTo(bx + Math.cos(th - Math.PI / 2) * R, by + Math.sin(th - Math.PI / 2) * R);
    ev.arc(bx, by, R, th - Math.PI / 2, th + Math.PI / 2); ev.arc(ax, ay, R, th + Math.PI / 2, th + 3 * Math.PI / 2); ev.closePath();
  });
  ctx.save(); ctx.lineCap = "round"; ctx.globalAlpha = a;
  if (!low) { const m = ctx.getTransform(); ctx.shadowColor = glowCol; ctx.shadowBlur = IFR_HFL_W * IFR_HFL_GLOW[0] * Math.hypot(m.a, m.b); } /* the halo on the body pass only */
  for (let k = 0; k < 2; k++) { ctx.strokeStyle = cols[k]; ctx.lineWidth = IFR_HFL_LW[k]; ctx.stroke(ev); ctx.stroke(od); ctx.shadowBlur = 0; }
  ctx.restore();
}
function ifrRing2D(c, f, low) { ifrSpoke2D(c, f, low, () => { ctx.beginPath(); ctx.arc(c.x, c.y, c.circ, 0, 2 * Math.PI); }); }
function drawIfrFlaresGl(t, low, hf) {
  for (const c of t.ifrFlares) {
    if (!(c.hf || c.chain) !== !hf) continue; /* Hellfire V's rings are drawn with the fire */
    const [fb, fs] = ifrFlick(c, performance.now() / 1000), f = Math.max(0, c.left / c.life) * fb;
    if (c.chain) { ifrChainDraw(c, f, low, fs); continue; }
    if (c.circ) ifrRingGl(c, f, low, fs);
    for (const [x0, y0, xe, ye] of ifrBeamEnds(c)) {
      const x1 = x0 + (xe - x0) * fs, y1 = y0 + (ye - y0) * fs, s = trimToTowers(x0, y0, x1, y1); if (!s) continue; /* (the ray x its size flicker - the look only) */
      const L = Math.hypot(x1 - x0, y1 - y0) || 1, t0 = Math.hypot(s[0] - x0, s[1] - y0) / L, t1 = 1 - Math.hypot(x1 - s[2], y1 - s[3]) / L;
      for (let g = low ? IFR_GLOW_GL.length - 2 : 0; g < IFR_GLOW_GL.length; g++) { /* lowQ: the orange core + the white one */
        const q = IFR_GLOW_GL[g]; fxGlGlowLine(s[0], s[1], s[2], s[3], c.W * fs * q[0], ifrFlareCol(q[2], c), Math.min(1, q[1] * f * IFR_GLOW_A * ifrFlareI(c) * ifrLayerK(q[2], c)), t0, t1, q[3]);
      }
    }
  }
}
// a flare layer's colour: the fire's flares glow BRIGHT RED outside (the palette's threat red) round an ORANGE core (owner, 2026-10-20: "bright red
// cores", then "this red should be the outer color, and the orange the inner color") - and a METEOR's burn WHITE-hot at the core, yellow round
// it ("make non-hellfire flares more white" - the one place IFR draws white since "no white", 2026-10-20)
const IFR_HF_COL = { glow: "threat", tifr: "threat", orange: "threat", yellow: "orange" } /* RED through the core, only the thinnest line orange (owner, 2026-10-21: "make sure it's red") */, IFR_MAIN_COL = { yellow: "white", orange: "orange", glow: "threat" }; /* LIKE FIRE (owner, 2026-11-05: "flares should glow like fire"): white-hot core, orange round it, an ember-red halo at the edge (was white / yellow / the orange glow) */
const SOL_FLARE_COL = { glow: "solar", tifr: "solar", orange: "solar", yellow: "white" }; // SCORCH V's flare (SOL colour, a white-hot core)
const ifrFlareCol = (key, f) => COL[(f.sol ? SOL_FLARE_COL[key] : (f.hf || f.chain) ? IFR_HF_COL[key] : IFR_MAIN_COL[key]) || key];
// a FIRE flare's layers: its outer glow IFR_HF_GLOW_K as strong, the rest IFR_HF_OPAQ x (owner, 2026-10-21: "reduce the amount of glow on the
// hellfire stars but increase the opacity") - the look only: sizes stay (owner-locked, 2026-10-20)
// then (same day) "much less glow, double core opacity": the glow 0.4 -> 0.1, the core (orange and yellow) 1.6 -> 3.2; the mid layer 1.6
const IFR_HF_GLOW_K = 0.3, IFR_HF_OPAQ = 1.6, IFR_HF_CORE = 3.2; // glow 0.1 -> 0.3 (owner, 2026-10-21, the smaller flares faint: "A, make sure it's red")
const ifrLayerK = (key, f) => (f.hf ? (key === "glow" ? IFR_HF_GLOW_K : key === "orange" || key === "yellow" ? IFR_HF_CORE : IFR_HF_OPAQ) : 1);
// 2D, THE SAME FADE (owner, 2026-11-04: "faded glow instead" of the stepped bands): ALONG a ray, one unit RADIAL gradient a colour (cached,
// (1 - t)^3 to the tip like the GPU's), scaled to the flare - every ray is radial, so one gradient fades them all (the x rays, IFR_X_K
// shorter, under their own scale; Hellfire VI's rays to the box's edge one by one). ACROSS, each IFR_GLOW_GL layer as IFR_GLOW_LV strokes
// at the widths where its (1 - off)^pw bell crosses those levels - a canvas stroke is flat across, so the bell is three thin steps
const IFR_GLOW_LV = [0.8, 0.5, 0.2], ifrFade = new Map();
const ifrRim = new Map();
function ifrRimGrad(css) { // the unit disc's rim glow: clear at 1 - IFR_INNER_DEPTH, full at 1 (as the ranges' fill: "transparent" to the colour)
  let g = ifrRim.get(css); if (g) return g;
  g = ctx.createRadialGradient(0, 0, 1 - IFR_INNER_DEPTH, 0, 0, 1); g.addColorStop(0, "transparent"); g.addColorStop(1, css);
  ifrRim.set(css, g); return g;
}
function ifrFadeGrad(css) {
  let g = ifrFade.get(css); if (g) return g;
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(css), h = /^#([0-9a-f]{6})$/i.exec(css.trim()); // (COL: computed "rgb(r, g, b)")
  const rgb = m ? m.slice(1, 4).join(",") : h ? [0, 2, 4].map(k => parseInt(h[1].slice(k, k + 2), 16)).join(",") : null;
  for (let k = 0; k <= 6; k++) { const t = k / 6, a = (1 - t) ** 3; g.addColorStop(t, rgb ? "rgba(" + rgb + "," + a.toFixed(3) + ")" : k < 6 ? css : "transparent"); }
  ifrFade.set(css, g); return g;
}
function ifrRays(S, ends, sel) { // one path: the rays of `sel` (0 the long four, 1 the x), from the centre, in units of the scale
  for (let k = sel; k < ends.length; k += 2) { const e = ends[k]; ctx.moveTo(0, 0); ctx.lineTo((e[2] - e[0]) / S, (e[3] - e[1]) / S); }
}
function drawIfrFlares(t, hf) { // hf: the fire's flares only, else the meteors' only
  if (!t.ifrFlares.length) return;
  const low = typeof lowQ === "function" && lowQ();
  if (typeof fxGlGlowLine === "function" && fxGl.on && ctx.real && ctx.real.__glc === ctx) { drawIfrFlaresGl(t, low, hf); return; } /* ctx IS the stand-in (glCtx) */
  ctx.lineCap = "butt";
  for (const c of t.ifrFlares) {
    if (!(c.hf || c.chain) !== !hf) continue;
    const f = Math.max(0, c.left / c.life) * ifrFlick(c, performance.now() / 1000)[0]; // (2D: the brightness flicker only - a stamp's fade step, no new strokes)
    if (c.chain) { ifrChainDraw(c, f, low); continue; }
    if (c.circ) ifrRing2D(c, f, low);
    if (IFR_STAMP_ON && !c.edges && ifrSpriteDraw(c, f, low)) continue; // one stamp, not ~18 strokes (perf, below)
    ifrFlareStrokes(c, f, low);
  }
}
// THE STROKED FLARE (2D): every IFR_GLOW_GL layer as IFR_GLOW_LV strokes of its rays, under the flare's own scale
function ifrFlareStrokes(c, f, low) {
  const ends = ifrBeamEnds(c), x = ends[0][0], y = ends[0][1];
  const groups = c.edges ? ends.map((e, k) => [Math.hypot(e[2] - e[0], e[3] - e[1]) || 1, k]) : [[c.L, 0], [c.L * (c.xk ?? IFR_X_K), 1]]; // [scale, which rays]
  for (const [S, sel] of groups) {
    ctx.save(); ctx.translate(x, y); ctx.scale(S, S);
    for (let g = low ? IFR_GLOW_GL.length - 2 : 0; g < IFR_GLOW_GL.length; g++) {
      const q = IFR_GLOW_GL[g], col = ifrFlareCol(q[2], c), a = Math.min(1, q[1] * f * IFR_GLOW_A * ifrFlareI(c) * ifrLayerK(q[2], c));
      ctx.strokeStyle = ifrFadeGrad(col); ctx.globalAlpha = a / IFR_GLOW_LV.length * 1.6;
      for (const lv of IFR_GLOW_LV) {
        ctx.lineWidth = Math.max(1 / S, c.W * 2 * q[0] * (1 - lv ** (1 / q[3])) / S); ctx.beginPath();
        if (c.edges) { const e = ends[sel]; ctx.moveTo(0, 0); ctx.lineTo((e[2] - e[0]) / S, (e[3] - e[1]) / S); } else ifrRays(S, ends, sel);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
// FLARE STAMPS (perf, 2026-11-05 - Wai: "Fix IFR hellfire demo slow"; a 7.7.7 iPhone log: the tower card's menu at 58.7 ms a frame): the card's
// demo draws on a 2D canvas, where a flare was ~18 strokes - Hellfire V's ~107 live flares ~1900 strokes a frame. A flare's look is fixed by its
// kind, its size in px, its intensity and its life's fade, so each look is drawn ONCE (ifrFlareStrokes, onto a small canvas, at the screen's scale
// and the same sub-pixel phase) and stamped. Keys round the life fade to 1/IFR_STAMP_F and the size to whole px; at most IFR_STAMP_MAX looks, the
// set dropped whole past it (a palette flip - the boss sky - or a zoom makes new ones). Built once each, never a canvas a frame
// BOUNDED (2026-11-07: the 13-point Meteor V card demo built 5.3 stamps a frame - the life fade was in the key, ~50 flares x 16 fade steps
// overran the 400 looks and the set was dropped whole, again and again: 150-370 ms a frame, 243 stamps = 46 Mpx = ~180 MB of canvas held, and a
// test WebKit grew to 6.6 GB): the FADE is no longer a look - a stamp is built at full strength and drawn at the fade's alpha; the set is an LRU
// held under IFR_STAMP_PX pixels (and IFR_STAMP_MAX looks), each evicted canvas freed at once (width 0)
const IFR_STAMP_F = 16, IFR_STAMP_MAX = 400, IFR_STAMP_PX = 8e6, IFR_STAMP_R = 96, ifrStamps = new Map(); let ifrStampPx = 0;
let ifrScratchCv = null;
function ifrStampScratch(n) { const c = (ifrScratchCv ||= document.createElement("canvas")); if (c.width < n || c.height < n) { c.width = Math.max(c.width, n); c.height = Math.max(c.height, n); } return c; }
function ifrStampEvict() { const [k, sp] = ifrStamps.entries().next().value; ifrStamps.delete(k); ifrStampPx -= sp.cv.width * sp.cv.height; sp.cv.width = sp.cv.height = 0; }
let IFR_STAMP_ON = true; // (let: a test draws the strokes to compare)
// A STAMP'S PIXELS, AS THE BOARD DRAWS THEM (owner, 2026-11-06: "never use step glow unless huge perf gains" - the 2D strokes were three steps a layer):
// every pixel from the GPU glow line's own formula (aspira-fxgl.js shape 7) - each IFR_GLOW_GL layer (1 - off / w)^pw across a spoke, (1 - t)^3 along
// it, the layers and spokes laid over each other in order - once a look (the stamps are cached), through the view's linear part m
const ifrRgb = css => { const m = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(css || ""); return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0]; };
function ifrStampPixels(g, q, f, low, m, R) {
  if (typeof g.createImageData !== "function" || typeof g.putImageData !== "function") return false;
  const N = 2 * R, img = g.createImageData(N, N), D = img.data; if (!D || !D.length) return false;
  const det = m.a * m.d - m.b * m.c; if (Math.abs(det) < 1e-12) return false;
  const rays = Array.from({ length: IFR_BEAMS }, (_, k) => { const a = k * Math.PI / 4; return [Math.cos(a), Math.sin(a), k % 2 ? q.L * (q.xk ?? IFR_X_K) : q.L]; });
  const L = []; for (let g2 = low ? IFR_GLOW_GL.length - 2 : 0; g2 < IFR_GLOW_GL.length; g2++) { const k = IFR_GLOW_GL[g2]; L.push({ c: ifrRgb(ifrFlareCol(k[2], q)), A: Math.min(1, k[1] * f * IFR_GLOW_A * ifrFlareI(q) * ifrLayerK(k[2], q)), w: q.W * k[0], pw: k[3] }); }
  for (let py = 0, o = 0; py < N; py++) for (let px = 0; px < N; px++, o += 4) {
    const dx = px + 0.5 - (R + 0.5), dy = py + 0.5 - (R + 0.5), wx = (m.d * dx - m.c * dy) / det, wy = (-m.b * dx + m.a * dy) / det;
    let r = 0, gg = 0, b = 0, al = 0; // premultiplied
    for (const [cx, sx, Lr] of rays) {
      const sa = wx * cx + wy * sx; if (sa < 0 || sa > Lr) continue;
      const off = Math.abs(wx * sx - wy * cx), along = (1 - sa / Lr) ** 3;
      for (const l of L) { if (off >= l.w) continue; const a = l.A * (1 - off / l.w) ** l.pw * along; if (a <= 0) continue; r = l.c[0] * a + r * (1 - a); gg = l.c[1] * a + gg * (1 - a); b = l.c[2] * a + b * (1 - a); al = a + al * (1 - a); }
    }
    if (al > 0) { D[o] = r / al; D[o + 1] = gg / al; D[o + 2] = b / al; D[o + 3] = al * 255; }
  }
  g.putImageData(img, 0, 0); return true;
}
function ifrSpriteDraw(c, f, low) {
  if (typeof document === "undefined") return false;
  const m = ctx.getTransform(), px = m.a * c.x + m.c * c.y + m.e, py = m.b * c.x + m.d * c.y + m.f, k = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)); // (the view's linear part goes INTO the stamp: the card demo's floor is squeezed)
  const fq = Math.round(f * IFR_STAMP_F) / IFR_STAMP_F, I = Math.round(ifrFlareI(c) * 4) / 4, L = Math.round(c.L * k) / k, W = Math.round(c.W * k * 2) / (2 * k);
  const key = (c.hf ? 1 : 0) + "|" + (low ? 1 : 0) + "|" + L.toFixed(3) + "|" + W.toFixed(3) + "|" + (c.xk ?? IFR_X_K) + "|" + I + "|" + [m.a, m.b, m.c, m.d].map(v => v.toFixed(3)).join() + "|" + COL.orange + COL.threat + (c.sol ? "S" + COL.solar : "");
  let sp = ifrStamps.get(key);
  if (sp) { ifrStamps.delete(key); ifrStamps.set(key, sp); } // (the LRU: a hit moves to the newest end)
  else {
    const R0 = Math.ceil((L + W) * k) + 3, sc = Math.min(1, IFR_STAMP_R / R0), R = Math.ceil(R0 * sc); // a BIG flare (Meteor V's at the card's 3x: ~300k px) is BUILT at sc of the screen's size (at most IFR_STAMP_R px out) and drawn scaled up - the glow is smooth; the build and its memory x sc^2
    const cv = document.createElement("canvas"); cv.width = cv.height = 2 * R; const ms = sc < 1 ? { a: m.a * sc, b: m.b * sc, c: m.c * sc, d: m.d * sc } : m;
    while (ifrStamps.size && (ifrStamps.size >= IFR_STAMP_MAX || ifrStampPx + cv.width * cv.height > IFR_STAMP_PX)) ifrStampEvict();
    // BUILT ON ONE SHARED CPU CANVAS (willReadFrequently: putImageData on a GPU one is the WebKit trap), then COPIED ONCE into the stamp's own plain
    // canvas - drawing a CPU canvas into the frame made WebKit copy it on every drawImage (the demo's 0.7-2.5 GB memory sawtooth, 2026-11-07)
    const sc0 = ifrStampScratch(2 * R), g = sc0.getContext("2d", { willReadFrequently: true }), c0 = ctx, q = Object.assign({}, c, { L, W, hitI: I }); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 2 * R, 2 * R); ctx = g; // (q: the key's look - its rounded size and intensity)
    try { if (!ifrStampPixels(g, q, 1, low, ms, R)) { g.setTransform(ms.a, ms.b, ms.c, ms.d, R + 0.5 - (ms.a * c.x + ms.c * c.y), R + 0.5 - (ms.b * c.x + ms.d * c.y)); g.lineCap = "butt"; ifrFlareStrokes(q, 1, low); } } finally { ctx = c0; }
    cv.getContext("2d").drawImage(sc0, 0, 0, 2 * R, 2 * R, 0, 0, 2 * R, 2 * R);
    sp = { cv, R, sc }; ifrStamps.set(key, sp); ifrStampPx += cv.width * cv.height;
  }
  const a0 = ctx.globalAlpha; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, fq); // (the fade: the stamp's alpha, not a look)
  if (sp.sc < 1) { const D = 2 * sp.R / sp.sc; ctx.drawImage(sp.cv, px - D / 2, py - D / 2, D, D); } else ctx.drawImage(sp.cv, px - 0.5 - sp.R, py - 0.5 - sp.R); ctx.restore(); ctx.globalAlpha = a0; // (at its exact spot: the stamp's centre is px (R + 0.5))
  return true;
}
/* balls true (drawn in skyKeep, aspira-draw.js): the balls in flight (the charge balls: drawIfrTop, on the prism's top), which keep their orange on a
   boss sky (owner, 2026-10-19: "ifrit balls should stay orange on boss inversion"); else the fires and spokes, which turn over with it */
function drawIfr(balls) {
  const low = typeof lowQ === "function" && lowQ();
  // HELLFIRE ON TOP (owner, 2026-10-22: "render hellfire flares and circle above the other flares"): every IFR's meteor flares first, then every
  // fire's circle and its flares
  const ifrs = G.towers.filter(t => t.kind === "ifr" && t.ifrInit0);
  ctx.lineCap = "butt"; ctx.lineJoin = "round";
  if (balls) { for (const t of ifrs) { drawIfrMines(t, low); drawIfrBalls(t, low); } }
  else { for (const t of ifrs) drawIfrFlares(t, false); for (const t of ifrs) { drawIfrFlares(t, true); drawIfrFires(t, low); } for (const t of ifrs) drawIfrMini(t); for (const t of G.towers) if (t.kind === "sol" && t.solFlares && t.solFlares.length) drawIfrFlares({ ifrFlares: t.solFlares }, false); } // (the circle over its own flares, as before; SCORCH V's SOL flares last)
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
}
// the CHARGE BALLS UNDER THE PRISM (owner, 2026-10-20: "centered on the corner of the hexagon where it meets the floor ... always tower
// occludes balls"): drawn with the tower (aspira-warp.js, warpEntities' `under`, at floor height, BEFORE the prism), each centred on a
// corner of the prism's floor hex. In the tower's own colours, as the tower (ownColours)
function drawIfrTop(t, far) {
  if (t.kind !== "ifr" || !t.ifrInit0) return;
  const low = typeof lowQ === "function" && lowQ();
  ctx.lineCap = "butt"; drawIfrCharge(t, towerStats(t), low, far); ctx.globalAlpha = 1;
}
