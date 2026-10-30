// /aspira — the twelve lanes on the chart: their strokes (masked to fade out
// past the rim), lit copies in their riders' colours, the wave:track labels
// (placed so they never overlap) and the fade in/out of lit lanes. Loaded
// right after aspira-draw.js, whose drawBoard calls drawLanes.

// Lanes in use this wave are drawn bright in the colour of the enemy type
// riding them; idle lanes drop to a faint trace.
// every lane is a SOLID line (owner; the per-pair dash styles are gone)
// Lane STROKES go to an offscreen layer that is then masked by a radial
// gradient: full at the centre, fading linearly to nothing just beyond the
// lanes' mouths (LANE_FADE_R), so lanes do not trail across the open sky.
// Labels are drawn unmasked.
// owner, 2026-10-09: "draw lanes further out (or just don't ramp down opacity as fast)" - was a linear fade
// to nothing at 550, just past the rim circle, while lanes start at R0 760; now FULL to LANE_FULL of the way, then
// fading to nothing just past the lanes' mouths
// then ("lanes have sharp cutoff"): the fade reached nothing past the mouths, so a lane STARTED at 13% - now it is
// nothing exactly AT the mouths (R0): full to LANE_FULL of the way, then a linear fade to none at R0
const LANE_FADE_R = R0, LANE_FULL = 0.45, GLOW_FADE_R = 550, LANE_END_IN = 0.5, LANE_END_OUT = 6; // LANE_END: a lit lane gone inside 0.5 core radii, whole from 6 (laneCoreFade)
// the live lanes' GLOW, on its own layer so it can fade much faster outward:
// its radial mask is applied GLOW_FALLOFF times (alpha ~ (1 - r/R)^n)
const GLOW_FALLOFF = 5; // harder (owner; was 3)
// the FAINT trace of all twelve lanes never changes, so it is drawn once into
// baseCv and only redrawn when the camera or the canvas size moves (it was
// most of every frame: ~300ms of ~1s in headless WebKit, 2026-10-02)
// ONE SET of these cached layers per PALETTE (keyed by the background colour):
// the boss sky draws the board in inverted colours too (render), and sharing
// one set would rebuild them twice a frame while the sky spreads
const laneSets = {};
// lane labels much SMALLER (owner, 2026-10-06; were 30 live / 20 idle)
const LANE_LABEL_PX = 14, LANE_IDLE_PX = 11;
function laneSet() {
  return laneSets[COL.bg] ||= (() => {
    const mk = () => { const c = document.createElement("canvas"), x = c.getContext("2d"); if (!x) throw new Error("lane layer: no 2d context"); return [c, x]; };
    const [laneCv, lctx] = mk(), [glowCv, gctx] = mk(), [baseCv, bctx] = mk();
    return { laneCv, lctx, glowCv, gctx, baseCv, bctx, baseKey: "", litKey: "", litCam: "", litAt: 0 };
  })();
}
function laneLayer(c, x, w, h) {
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over";
  x.clearRect(0, 0, w, h);
  x.setTransform(cam.k, 0, 0, cam.k, cam.ox, cam.oy);
  x.lineJoin = "round"; x.lineCap = "round";
}
// mask: only alpha matters under destination-in, so transparent -> bg works
// glow: the GLOW's own mask keeps the old linear fade to GLOW_FADE_R - the strokes' plateau, applied
// GLOW_FALLOFF times, turned the glow into a solid mass
function laneMask(x, glow) {
  const g = x.createRadialGradient(CX, CY, 0, CX, CY, glow ? GLOW_FADE_R : LANE_FADE_R);
  g.addColorStop(0, COL.bg); if (!glow) g.addColorStop(LANE_FULL, COL.bg); g.addColorStop(1, "transparent");
  x.globalCompositeOperation = "destination-in"; x.globalAlpha = 1; x.fillStyle = g;
  x.fillRect(CX - 4000, CY - 4000, 8000, 8000);
}
// the lit lanes FADE OUT toward the core (owner, 2026-10-16: "Fix the way that the lane ends (square cutoff on highlight)", then
// "make the lane fade near the core more of a gradient, right now it is still very sharp"): one destination-out ramp on each mask,
// ONCE (inside the glow's GLOW_FALLOFF passes it was raised to the 5th power - a 0.5 .. 2 core-radii ramp read as an edge) - gone
// inside LANE_END_IN core radii, whole by LANE_END_OUT, straight in between; the glow only
function laneCoreFade(x) {
  const g = x.createRadialGradient(CX, CY, 0, CX, CY, LANE_END_OUT * CORE_R);
  g.addColorStop(0, COL.bg); g.addColorStop(LANE_END_IN / LANE_END_OUT, COL.bg); g.addColorStop(1, "transparent");
  x.globalCompositeOperation = "destination-out"; x.globalAlpha = 1; x.fillStyle = g;
  x.fillRect(CX - LANE_END_OUT * CORE_R, CY - LANE_END_OUT * CORE_R, 2 * LANE_END_OUT * CORE_R, 2 * LANE_END_OUT * CORE_R);
}
// the masks are the SAME every frame for a given camera, so each is drawn once
// into its own canvas (n passes for the glow) and applied with ONE drawImage -
// it was GLOW_FALLOFF + 1 full-screen gradient fills a frame, most of the
// late-game frame time (profiled 2026-10-05)
const maskCvs = {};
let maskKey = "";
function applyMask(x, n) {
  const key = [cv.width, cv.height, cam.k, cam.ox, cam.oy].join();
  if (key !== maskKey) { maskKey = key; dropMasks(); }
  let m = maskCvs[n];
  if (!m) {
    m = document.createElement("canvas");
    const mx = m.getContext("2d");
    if (!mx) throw new Error("lane mask: no 2d context");
    laneLayer(m, mx, cv.width, cv.height);
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.fillStyle = COL.bg; mx.fillRect(0, 0, m.width, m.height);
    mx.setTransform(cam.k, 0, 0, cam.k, cam.ox, cam.oy);
    for (let i = 0; i < n; i++) laneMask(mx, n > 1);
    if (n > 1) laneCoreFade(mx); // the GLOW only - the lane line runs on into the core (owner, 2026-10-16: "don't fade the lane line, only the highlight")
    maskCvs[n] = m; // cached only once whole: a half-built mask erased or unmasked the lanes till the camera moved
  }
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "destination-in"; x.globalAlpha = 1;
  x.drawImage(m, 0, 0); x.restore();
}
// a dropped canvas is sized to 0 first: iOS holds a canvas's memory until then, and past its canvas budget
// getContext returns null
const freeCv = c => { if (c) { c.width = 0; c.height = 0; } };
function dropMasks() { for (const k in maskCvs) { freeCv(maskCvs[k]); delete maskCvs[k]; } }
// a lane layer that FAILED to build (iOS out of canvas memory, 2026-10-10: the boss lane flashed full, vanished,
// then faded in): every cached layer and mask is thrown away and rebuilt from scratch next frame, and nothing is
// drawn this frame - never a stale or unmasked layer
let laneFails = 0;
function laneFail(err) {
  if (!laneFails++) console.warn("spire lanes:", err);
  for (const k in laneSets) { const S = laneSets[k]; [S.laneCv, S.glowCv, S.baseCv, S.comboCv].forEach(freeCv); delete laneSets[k]; }
  freeCv(laneFadeL.cv); freeCv(laneFadeL.lcv); laneFadeL.sig = ""; // (the fade layer's own pair too)
  dropMasks(); maskKey = "";
}
function blit(c) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(c, 0, 0); ctx.restore(); }
const laneSeen = new Map(), LANE_FADE_IN_MS = 2000;
/* a device whose board upload stalls (warpUpSlow, aspira-warplayers.js) gets its lanes at full brightness at once: the fade-in was most of its board resends (14 of 19 a wave) */
const laneFadeMs = () => (!laneFadeGl() && typeof warpUpSlow !== "undefined" && warpUpSlow >= 3 ? 0 : LANE_FADE_IN_MS); // (the GPU fade layer costs such a device one upload, not a resend a step)
const LIT_MIN_MS = 200;
const LIT_STEPS = 16;
/* the lane brightness a board redraw is keyed on: 16 steps; on a device whose board upload stalls just lit or not (the lane then keeps the brightness it had when it lit - one redraw as a wave starts, one as it ends) */
const litLevel = (a, star) => (!star && typeof warpUpSlow !== "undefined" && warpUpSlow >= 3 ? (a > 0.02 ? 1 : 0) : Math.round(a * LIT_STEPS)); /* a BOSS lane keeps its steps even there (owner, 2026-10-18: the boss lane froze at the faint brightness it lit at and seemed to vanish) */
/* ...and such a device does not redraw the board when a lane goes DARK mid-wave (they end one by one - 31 of its 38 board uploads): the lit set it keys on only grows, until every lane is dark */
const laneHeld = new Map();
function laneHold(live) {
  if (!(typeof warpUpSlow !== "undefined" && warpUpSlow >= 3)) return live;
  if (!live.length) { laneHeld.clear(); return live; }
  for (const u of live) if (!u.star) laneHeld.set(u.pi + ":" + u.ang.toFixed(3) + ":" + u.color + ":0", u);
  return [...laneHeld.values(), ...live.filter(u => u.star)]; /* (a boss lane is never held: it fades with its sky) */
}
// an ordinary lit lane, MUCH more apparent (owner, 2026-10-12: "make the non boss lanes much more apparent"; was
// line 0.3 x1.4, haze 0.03, glow 0.22) - a boss lane keeps the old numbers, scaled by BOSS_LANE_K / BOSS_LANE_W
const SWARM_LANE_MIN = 0.1; // a swarm lane's brightness is its SHARE of the swarm - the fullest lane of its wave at 1, the rest in proportion, never under this (owner, 2026-10-26: "swarm lane opacity should be correlated to the number of units in that lane"; was a flat SWARM_LANE_A 0.25 on every one)
const swarmMax = (live, n) => live.reduce((m, v) => (v.swarm && v.n === n ? Math.max(m, v.sent || 0) : m), 0);
const LIT_GLOW_A = 0.34; // (the line's numbers are LIT_LINE_SOFT, below)
const BOSS_LANE_W = 3.5, BOSS_LANE_K = 1.5; // a boss lane: x its glow's widths, x brightness (its line: BOSS_LINE_SOFT) (owner, 2026-10-09: "make boss lanes half as intense"; was 3)
function drawLaneStrokes(all) {
  const S = laneSet(), { laneCv, lctx, glowCv, gctx, baseCv, bctx } = S, live = laneSplit(all).board; // (a lane still fading in is the fade layer's - laneFadeLayer)
  const holds = set => { if (typeof warp !== "undefined") warp.statLanes = set; }; // the lanes this board holds (on the GPU once it is sent up: warp.boardLanes)
  const key = [cv.width, cv.height, cam.k, cam.ox, cam.oy].join();
  if (key !== S.baseKey) {
    S.baseKey = key;
    laneLayer(baseCv, bctx, cv.width, cv.height);
    bctx.strokeStyle = COL.cyan; bctx.globalAlpha = 0.05; bctx.lineWidth = 1.2;
    for (const path of PATHS) bctx.stroke(path.p2d);
    laneMask(bctx);
  }
  if (!live.length) { S.litKey = ""; holds(new Set()); blit(baseCv); return; }
  const now = performance.now(); // (the swarm share and the fade-in are litLanes')
  // the lit layers are REBUILT only when what they show changes - which lanes,
  // their colours, their brightness to 1/LIT_STEPS, the camera; otherwise last
  // frame's finished layers are blitted again (profiled 2026-10-05: rebuilding
  // them every frame was most of a late-game frame)
  // ...and at most every LIT_MIN_MS: at 10x the lanes' brightness moves every
  // frame, and rebuilding each time was the late game's frame spikes (a camera
  // move still rebuilds at once, or the layers would sit misaligned)
  const camSig = [cv.width, cv.height, cam.k, cam.ox, cam.oy].join();
  const sig = camSig + "|" +
    laneHold(live).map(u => u.pi + ":" + u.ang.toFixed(3) + ":" + u.color + ":" + (u.star ? 1 : 0) + ":" + litLevel(u.a, u.star)).join(",");
  if (sig === S.litKey || (camSig === S.litCam && now - S.litAt < LIT_MIN_MS)) { holds(S.litLanes || new Set()); blitLanes(S); return; } // (what the cached layers hold, not what was asked)
  S.litKey = ""; // until the layers are whole (laneFail)
  // each lane IN USE lit in its rider's colour - drawn rotated when a split
  // wave rides a rotated copy of it (u.ang)
  laneLayer(laneCv, lctx, cv.width, cv.height);
  laneLayer(glowCv, gctx, cv.width, cv.height);
  strokeLit(lctx, gctx, live);
  applyMask(gctx, GLOW_FALLOFF);
  applyMask(lctx, 1);
  S.litKey = sig; S.litCam = camSig; S.litAt = now; S.litLanes = new Set(live.map(laneKeyOf)); holds(S.litLanes);
  S.comboKey = ""; blitLanes(S);
}
// A LIT LANE IS A GLOW, NOT A BAND (owner, 2026-10-25: "Circles on the path / Path should be glow not hard edge"): each layer is a
// PROFILE of strokes, widest + faintest first, and each level is stroked OPAQUE onto a scratch layer for every lane of one colour and
// brightness, then laid on at its alpha (each a flush of the scratch: five levels a lane colour, perf) - so where lanes (or a lane and itself) cross, the levels UNION instead of adding: no darker
// lens at a crossing, and the edge fades out level by level. [width (world px, x w on a boss lane), alpha (x the layer's)] each
const LIT_LINE_SOFT = [[12, 0.08], [5, 0.22], [2.2, 0.55]]; // (was a 6-wide haze at 0.07 under a 2.4 line at 0.75)
const BOSS_LINE_SOFT = [[22, 0.07], [9, 0.15], [3, 0.3]]; // x BOSS_LANE_K (was a 22 halo at 0.06, a 21 haze at 0.045, a 4.9 line at 0.45)
const LIT_GLOW_SOFT = [[36, 0.2], [30, 0.2], [24, 0.2], [18, 0.2], [12, 0.2], [7, 0.2]]; // x LIT_GLOW_A, widths x w - six even steps so the glow fades to nothing at its sides (owner, 2026-10-26: "glow should fade to 0% opacity at the sides"; was 32 at 0.4 + 14 at 0.6, before that ONE 32-wide stroke)
let laneScratch = null;
const LANE_SOFT_DS = 1; // FULL resolution (owner, 2026-10-26: "can we render lanes at higher res?"; was 2, half and scaled up) - a rebuild only when the lit lanes change
function strokeSoft(dst, list, key, prof, alphaOf, wk, cap) {
  const groups = new Map();
  for (const u of list) { const g = u.color + ":" + (u.star ? 1 : 0) + ":" + u.a.toFixed(3); groups.set(g, [...(groups.get(g) || []), u]); }
  laneScratch ||= (() => { const c = document.createElement("canvas"), x = c.getContext("2d"); if (!x) throw new Error("lane scratch: no 2d context"); return { c, x }; })();
  const { c, x } = laneScratch, W = Math.ceil(cv.width / LANE_SOFT_DS), H = Math.ceil(cv.height / LANE_SOFT_DS);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  for (const us of groups.values()) for (const [lw, la] of prof) {
    const b = laneBox(us, lw * wk(us[0]), W, H); if (!b) continue; // (no pixel of these lanes inside the mask on this canvas)
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.clearRect(b.x, b.y, b.w, b.h);
    x.save(); x.beginPath(); x.rect(b.x, b.y, b.w, b.h); x.clip();
    x.setTransform(cam.k / LANE_SOFT_DS, 0, 0, cam.k / LANE_SOFT_DS, cam.ox / LANE_SOFT_DS, cam.oy / LANE_SOFT_DS); x.lineJoin = "round";
    x.strokeStyle = COL[us[0].color]; x.lineWidth = lw * wk(us[0]); x.lineCap = cap;
    for (const u of us) { x.save(); x.translate(CX, CY); x.rotate(u.ang); x.translate(-CX, -CY); x.stroke(PATHS[u.pi][key]); x.restore(); }
    x.restore();
    const D = LANE_SOFT_DS; dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalAlpha = Math.min(1, alphaOf(us[0]) * la); dst.drawImage(c, b.x, b.y, b.w, b.h, b.x * D, b.y * D, b.w * D, b.h * D); dst.restore();
  }
}
// THE BOX A LEVEL TOUCHES (perf, 2026-10-30: the phone's 100-700 ms spikes were lane rebuilds - each level cleared and copied the WHOLE
// 2048-px board, 9 levels a lane colour, twice a wave): the lanes' points (rotated, + the core every path ends on) padded by half the
// stroke and 2 px of antialiasing, cut to the square round the R0 disk - both masks are nothing past R0 (laneMask), so nothing outside
// it survives - and to the canvas; in scratch px, null when empty. The same picture: outside the box the old full copy laid only what
// the mask then erased
const laneBoxW = new Map(); // "pi:ang" -> the world box of that lane's points
function laneBox(us, lw, W, H) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const u of us) {
    const kk = u.pi + ":" + u.ang;
    let B = laneBoxW.get(kk);
    if (!B) {
      const c = Math.cos(u.ang), s = Math.sin(u.ang); B = [CX, CY, CX, CY];
      for (const p of PATHS[u.pi].pts) { const dx = p.x - CX, dy = p.y - CY, X = CX + dx * c - dy * s, Y = CY + dx * s + dy * c; if (X < B[0]) B[0] = X; if (Y < B[1]) B[1] = Y; if (X > B[2]) B[2] = X; if (Y > B[3]) B[3] = Y; }
      laneBoxW.set(kk, B);
    }
    x0 = Math.min(x0, B[0]); y0 = Math.min(y0, B[1]); x1 = Math.max(x1, B[2]); y1 = Math.max(y1, B[3]);
  }
  const p = lw / 2;
  x0 = Math.max(x0 - p, CX - R0); y0 = Math.max(y0 - p, CY - R0); x1 = Math.min(x1 + p, CX + R0); y1 = Math.min(y1 + p, CY + R0);
  const k = cam.k / LANE_SOFT_DS, ox = cam.ox / LANE_SOFT_DS, oy = cam.oy / LANE_SOFT_DS;
  const X0 = Math.max(0, Math.floor(x0 * k + ox) - 2), Y0 = Math.max(0, Math.floor(y0 * k + oy) - 2), X1 = Math.min(W, Math.ceil(x1 * k + ox) + 2), Y1 = Math.min(H, Math.ceil(y1 * k + oy) + 2);
  return X1 > X0 && Y1 > Y0 ? { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 } : null;
}
function strokeLit(lctx, gctx, list) { // each lane IN USE lit in its rider's colour, at u.a, onto the line and glow layers (unmasked)
  // a wide GLOW that grows in intensity toward the core (owner), on its own layer with a much steeper fade outward (owner: "stronger
  // gradient"); butt ends - a round end was a disc by the core. A BOSS lane is much THICKER (w) with much more GLOW (owner)
  const w = u => (u.star ? BOSS_LANE_W : 1);
  strokeSoft(gctx, list, "glow2d", LIT_GLOW_SOFT, u => Math.min(1, (u.star ? 0.22 * BOSS_LANE_K : LIT_GLOW_A) * u.a), w, "butt");
  // the line: the bonus STAR's lane burns brighter than the rest (owner); its halo is the profile's wide faint levels - one stroke
  // each, never a shadowBlur along the whole (doubled) lane (with the Devil's six lanes the blur was ~60% of an 82 ms rebuild, 2026-10-11)
  const plain = list.filter(u => !u.star), boss = list.filter(u => u.star);
  if (plain.length) strokeSoft(lctx, plain, "lit2d", LIT_LINE_SOFT, u => u.a, () => 1, "round");
  if (boss.length) strokeSoft(lctx, boss, "lit2d", BOSS_LINE_SOFT, u => BOSS_LANE_K * u.a, () => 1, "round");
}
// the faint base, the glow and the lit lines laid onto ONE cached layer whenever any of them changes, and that blitted:
// one full-canvas draw a frame instead of three (perf, 2026-10-09; source-over is associative, so the same picture)
function blitLanes(S) {
  const key = S.baseKey + "|" + S.litKey;
  if (key !== S.comboKey) {
    S.comboKey = key;
    S.comboCv ||= document.createElement("canvas");
    const c = S.comboCv, x = c.getContext("2d");
    if (!x) { S.comboKey = ""; throw new Error("lane combo: no 2d context"); }
    if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, c.width, c.height);
    x.drawImage(S.baseCv, 0, 0); x.drawImage(S.glowCv, 0, 0); x.drawImage(S.laneCv, 0, 0);
  }
  blit(S.comboCv);
}

// numerals sit on an even ring at each lane's nominal 30-degree slot, not
// at the rim crossing: elliptical lanes cross the rim too close to others
const slotAng = i => ((i + 0.5) / N_PATHS) * Math.PI * 2 - Math.PI / 2;
const LABEL_R = 430;
// Labels never overlap (owner): each is placed at its slot, and while its box
// hits one already placed it steps one line DOWN (lower half of the circle)
// or UP (upper half), so crowded slots read as a short list. Lit labels go
// first and keep their spot; idle ones under an identical lit slot are skipped.
function placeLabels(items) {
  const boxes = [];
  for (const it of items) {
    const w = it.text.length * it.size * 0.58, h = it.size * 1.05, dir = it.y < CY ? -1 : 1;
    let y = it.y;
    const hits = () => boxes.some(b => Math.abs(b.x - it.x) * 2 < b.w + w && Math.abs(b.y - y) * 2 < b.h + h);
    for (let n = 0; n < 12 && hits(); n++) y += dir * h;
    boxes.push({ x: it.x, y, w, h });
    ctx.globalAlpha = it.alpha;
    text(it.text, it.x, y, it.size, it.color);
  }
}
// Lit lanes are as bright as the share of their group still alive (owner:
// alive / sent, from activeLanes) - no timed fade any more.
// a BOSS lane waits for its sky (owner, 2026-10-09: "boss lanes should fade in after inversion, and fade out before
// inversion goes away"): it fades in over BOSS_LANE_FADE s once the inverted sky is full, and when the boss dies it
// lingers (bossLanes, the last ones seen) fading out over the first BOSS_LANE_FADE s of the sky's collapse
const BOSS_LANE_FADE = 1;
let bossLanes = [];
function litLanes() {
  const live = [...activeLanes().values()], stars = live.filter(u => u.star);
  const since = performance.now() / 1000 - bossInv.t0, clamp01 = v => Math.max(0, Math.min(1, v));
  if (stars.length) bossLanes = stars.map(u => ({ ...u }));
  let k = 0;
  if (bossInv.phase === "in") k = typeof barInT === "function" ? clamp01((barInT() - bossBarInT()) / BOSS_LANE_FADE) : clamp01((since - BOSS_SKY_T) / BOSS_LANE_FADE); // ...and for the boss's HP bar to fly in (owner, 2026-10-27: "draw lane and lane glow after hp slides in" - aspira-bossbar.js)
  else if (bossInv.phase === "out") { k = 1 - clamp01(since / BOSS_LANE_FADE); if (!stars.length && k > 0) live.push(...bossLanes.map(u => ({ ...u }))); }
  else bossLanes = [];
  for (const u of live) { u.a0 = u.a; if (u.star) u.a *= k; }
  bossLaneRise(live);
  // EACH LANE'S FADE-IN, u.f 0..1 (u.a0 its brightness without it): an ordinary lane over LANE_FADE_IN_MS of REAL time from when it is
  // first seen, whatever the game speed (owner); a boss lane by its sky (above); swarm lanes at SWARM_LANE_A (owner, 2026-10-12)
  const now = performance.now(), fm = laneFadeMs();
  for (const key of laneSeen.keys()) if (!live.some(u => u.pi + ":" + u.ang === key)) laneSeen.delete(key); // gone dark: fades in again next time
  for (const u of live) {
    if (u.swarm) { const m = swarmMax(live, u.n), sh = m ? Math.max(SWARM_LANE_MIN, (u.sent || 0) / m) : 1; u.a *= sh; u.a0 *= sh; }
    u.rise = !(u.star && bossInv.phase === "out"); // (a boss lane fading OUT stays on the board, stepped)
    if (u.star) { u.f = u.a0 > 0 ? Math.min(1, u.a / u.a0) : 1; continue; }
    const key = u.pi + ":" + u.ang; if (!laneSeen.has(key)) laneSeen.set(key, now);
    u.f = fm ? Math.min(1, (now - laneSeen.get(key)) / fm) : 1; u.a = u.a0 * u.f;
  }
  return live.filter(u => !u.star || u.a > 0);
}
// SMOOTH FADE-IN (owner, 2026-10-22: "boss lane fades in in steps, want it to be a smooth fade in / same with all lanes actually"): lanes
// were painted into the board picture, re-sent to the GPU at most every WARP_STAT_MS (600 ms on an iPhone, where each send stalls ~40 ms) at
// 1/LIT_STEPS of brightness - a 1-2 s fade showed as a few steps. In 3D a lane still FADING IN is drawn instead, at full brightness, on its
// own FADE LAYER - sent up once - and the bell's shader lays it over the board at the fade's brightness every frame (litA); once whole it goes
// to the board, and leaves the fade layer only when that board is on the GPU (warp.boardLanes), so it never blinks out between the two.
// One brightness for the layer: the lanes fading together light together (a wave's copies, a boss's lanes) - it is the least of theirs
const laneFadeGl = () => typeof warp !== "undefined" && warp.litOk === true; // the bell's shader takes the fade layer (warpLayersBind)
const laneKeyOf = u => u.pi + ":" + u.ang.toFixed(3) + ":" + u.color;
function laneSplit(live) {
  if (!laneFadeGl()) return { board: live, fade: [] };
  const have = warp.boardLanes || new Set(), board = [], fade = [];
  for (const u of live) (u.rise && u.f < 1 ? fade : board).push(u);
  for (const u of board) if (u.rise && !have.has(laneKeyOf(u))) fade.push(u); // whole, but its board not up yet: both, till it is
  return { board, fade };
}
// the fade layer's OWN scratch (owner, 2026-10-30: "Yes" to the memory): its glow is built straight into L.cv and its line in L.lcv, so a
// fade change no longer borrows the board's line and glow layers and wipes S.litKey - the board kept rebuilding every lane a second time
// each wave (~200 ms in WebKit at 430x775@3). +1 full-size canvas (~16 MB at 2048x2048). false = the old borrow, if the phone runs out of canvas memory
let LANE_FADE_OWN = true;
const laneFadeL = { sig: "" };
function laneFadeLayer() { // under the board's camera: { cv, sig, a } or null (nothing fading in)
  if (!laneFadeGl()) return null;
  const { fade } = laneSplit(litLanes());
  if (!fade.length) return null;
  const a = Math.min(...fade.map(u => u.f)), sig = [cv.width, cv.height, cam.k, cam.ox, cam.oy, COL.bg].join() + "|" + fade.map(u => laneKeyOf(u) + ":" + (u.star ? 1 : 0) + ":" + litLevel(u.a0, u.star)).join(",");
  if (sig !== laneFadeL.sig) {
    const L = laneFadeL; L.sig = "";
    L.cv ||= document.createElement("canvas");
    const x = L.cv.getContext("2d"); if (!x) throw new Error("lane fade: no 2d context");
    if (LANE_FADE_OWN) { // glow into L.cv itself, the line over it from L.lcv: the same pixels as the borrow's clear + glow + line
      L.lcv ||= document.createElement("canvas");
      const lx = L.lcv.getContext("2d"); if (!lx) throw new Error("lane fade: no 2d context");
      laneLayer(L.lcv, lx, cv.width, cv.height); laneLayer(L.cv, x, cv.width, cv.height);
      strokeLit(lx, x, fade.map(u => ({ ...u, a: u.a0 })));
      applyMask(x, GLOW_FALLOFF); applyMask(lx, 1);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.drawImage(L.lcv, 0, 0);
    } else {
      const S = laneSet(), { laneCv, lctx, glowCv, gctx } = S; // (the board's own line and glow layers as scratch: the board rebuilds its own next time)
      S.litKey = "";
      laneLayer(laneCv, lctx, cv.width, cv.height); laneLayer(glowCv, gctx, cv.width, cv.height);
      strokeLit(lctx, gctx, fade.map(u => ({ ...u, a: u.a0 })));
      applyMask(gctx, GLOW_FALLOFF); applyMask(lctx, 1);
      if (L.cv.width !== cv.width || L.cv.height !== cv.height) { L.cv.width = cv.width; L.cv.height = cv.height; }
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, L.cv.width, L.cv.height);
      x.drawImage(glowCv, 0, 0); x.drawImage(laneCv, 0, 0);
    }
    L.sig = sig;
  }
  return { cv: laneFadeL.cv, sig: laneFadeL.sig, a };
}
// a boss lane only ever BRIGHTENS at 1/BOSS_LANE_FADE a second, from 0 when it is new (2026-10-10, the owner's
// iPhone: it flashed full a frame before its fade) - so no jump in what feeds it can show as a flash
const bossLaneA = new Map();
function bossLaneRise(live) {
  const now = performance.now() / 1000, seen = new Set();
  for (const u of live) {
    if (!u.star) continue;
    const key = u.pi + ":" + u.ang, p = bossLaneA.get(key);
    u.a = Math.min(u.a, p ? p.a + Math.min(0.1, now - p.t) / BOSS_LANE_FADE : 0);
    bossLaneA.set(key, { a: u.a, t: now }); seen.add(key);
  }
  for (const [key, p] of bossLaneA) if (!seen.has(key) && now - p.t > 1.5) bossLaneA.delete(key); // kept 1.5 s unseen: a gap of a frame or two no longer restarts its fade from dark (owner, 2026-10-18: "disappears randomly")
}
function drawLanes() {
  const live = litLanes();
  try { drawLaneStrokes(live); } catch (err) { laneFail(err); }
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  // an idle label fades out as a lit one fades in over its slot (and back)
  const litAt = a => live.reduce((m, u) => {
    const b = slotAng(u.pi) + u.ang;
    return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.05 ? Math.max(m, u.a) : m;
  }, 0);
  const items = [];
  // in use: full size and opacity, at the (rotated) slot, in the rider's colour;
  // rim circles are WHITE (owner), labels stay coloured (owner);
  // label = wave:track in roman (owner)
  for (const u of live) {
    const rim = rotAbout(PATHS[u.pi].rim, u.ang), na = slotAng(u.pi) + u.ang;
    ctx.strokeStyle = COL.white; ctx.globalAlpha = u.a; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rim.x, rim.y, 4, 0, 6.283); ctx.stroke();
    items.push({ text: roman(u.n) + ":" + roman(u.pi + 1), x: CX + Math.cos(na) * LABEL_R, y: CY + Math.sin(na) * LABEL_R, size: LANE_LABEL_PX, alpha: u.a, color: u.color });
  }
  // idle: a small faint label + rim circle per lane
  PATHS.forEach((path, i) => {
    const idle = 1 - litAt(slotAng(i));
    if (idle <= 0.01) return;
    ctx.strokeStyle = COL.white; ctx.globalAlpha = 0.7 * idle; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(path.rim.x, path.rim.y, 4, 0, 6.283); ctx.stroke();
    const na = slotAng(i);
    items.push({ text: roman(Math.max(1, G.wave)) + ":" + roman(i + 1), x: CX + Math.cos(na) * LABEL_R, y: CY + Math.sin(na) * LABEL_R, size: LANE_IDLE_PX, alpha: 0.3 * idle, color: "cyan" });
  });
  placeLabels(items);
  ctx.globalAlpha = 1;
  laneLblA = ctx.getTransform().a;
}
/* the NEXT wave's twelve idle labels (WAVE:LANE), one stamp a frame while the board is quiet: a new wave used to build all twelve in the frame it started (a canvas, a measure and a fill each - a slow frame on a phone) */
let laneLblA = 0;
function laneTextWarm() {
  if (!laneLblA || typeof textWarm !== "function") return;
  const w = roman(Math.max(1, G.wave) + 1);
  for (let i = 0; i < PATHS.length; i++) if (textWarm(w + ":" + roman(i + 1), LANE_IDLE_PX, "cyan", laneLblA)) return;
}

// the chart's RULER (owner: show how long X units are, on the flat line left
// and right of the centre): a horizontal line through the centre and on to the
// screen's edges, graduated in units from the core's centre. Finer near the
// middle, sparser outward (owner): a notch every 10 out to 200, every 50 out to
// 1000, then every 100; numbered every 100 to 500, every 200 to 1000, then 500.
const RULER_R = 2000;
const rulerNotch = r => r <= 200 || (r <= 1000 ? r % 50 === 0 : r % 100 === 0);
const rulerLabel = r => r % (r <= 500 ? 100 : r <= 1000 ? 200 : 500) === 0;
function drawScaleBar() {
  ctx.strokeStyle = COL.grid; ctx.globalAlpha = 1; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CX - RULER_R, CY); ctx.lineTo(CX + RULER_R, CY);
  for (let r = 10; r <= RULER_R; r += 10) {
    if (!rulerNotch(r)) continue;
    const h = r % 100 === 0 ? 8 : r % 50 === 0 ? 5 : 2.5;
    for (const sx of [-1, 1]) { ctx.moveTo(CX + sx * r, CY - h); ctx.lineTo(CX + sx * r, CY + h); }
  }
  ctx.stroke();
  for (let r = 100; r <= RULER_R; r += 100) if (rulerLabel(r)) for (const sx of [-1, 1]) text(String(r), CX + sx * r, CY + 18, 12, "grid");
}// Stars TWINKLE (owner): each one's brightness breathes on its own rate and
// phase (fixed per star from its index, so the field never reshuffles), on
// real time so it keeps going while paused. Colour never changes.
// at: the 3D view's placer (warpEntities) - each star a ROUND dot at its projected spot, sized by the
// perspective there, never stretched with the floor (owner, 2026-10-09: "stars in bg should not get distorted")
// PERF (2026-10-09): the stars are filled in STAR_LEVELS batches of the same alpha (one path each) rather than one
// fill per star - each star's twinkle rounded to the nearest of STAR_LEVELS steps
const STAR_LEVELS = 24;
const STAR_LV = Array.from({ length: STAR_LEVELS + 1 }, () => []), STAR_N = new Int32Array(STAR_LEVELS + 1); // the batches and how much of each is this frame's, kept from frame to frame - never truncated, which frees the store (perf, 2026-10-28: 25 fresh arrays grown to ~3300 numbers a frame were 100 KB of garbage)
function drawStars(at) {
  const now = performance.now() / 1000, red = starRed(); // reddening before a boss (aspira-bosses.js)
  const lv = STAR_LV, ln = STAR_N, W = ctx.canvas.width, Hh = ctx.canvas.height; ln.fill(0);
  STARS.forEach((st, i) => {
    const P = at ? at(st.x, st.y, i) : { x: st.x, y: st.y, k: 1 }; /* the spot first: a star off the view needs no twinkle (perf: most of them are, in 3D) */
    if (!(P.k > 0) || (at && (P.x < -4 || P.y < -4 || P.x > W + 4 || P.y > Hh + 4))) return; // (3D: off the view, skipped)
    const rate = 0.6 + ((i * 0.618) % 1) * 1.8, ph = (i * 2.399) % 6.283;
    const tw = 0.5 + 0.5 * Math.sin(now * rate + ph), a = Math.min(1, 0.25 + st.m * 0.3) * (0.35 + 0.65 * tw);
    const b = Math.round(a * STAR_LEVELS), L = lv[b], j = ln[b]; L[j] = P.x; L[j + 1] = P.y; L[j + 2] = st.m * (0.85 + 0.15 * tw) * P.k; ln[b] = j + 3;
  });
  // white fading into Ember (the palette's red) as `red` goes 0 -> 1
  lv.forEach((L, k) => {
    if (!ln[k]) return;
    ctx.beginPath();
    for (let i = 0; i < ln[k]; i += 3) { ctx.moveTo(L[i] + L[i + 2], L[i + 1]); ctx.arc(L[i], L[i + 1], L[i + 2], 0, 6.283); }
    const a = k / STAR_LEVELS;
    if (red < 1) { ctx.fillStyle = COL.white; ctx.globalAlpha = a * (1 - red); ctx.fill(); }
    if (red > 0) { ctx.fillStyle = COL.glow; ctx.globalAlpha = a * red; ctx.fill(); }
  });
  ctx.globalAlpha = 1;
}
function drawBoardLayers() { drawGraticule(); drawLanes(); } // (3D redraws this board layer only when it changes - warpBoardSig, aspira-warplayers.js)
