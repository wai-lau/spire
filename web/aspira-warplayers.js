// /aspira - THE 3D PICTURE IN TWO LAYERS (owner, 2026-10-13: "do the rework" - the iPhone spent ~28 of a 32 ms frame
// sending the whole 2D board up to the GPU, every frame, for the bell's texture). Split from aspira-warp.js at its cap.
// The BOARD (background, graticule, lanes and their labels - drawSceneBase) changes slowly: it is redrawn and sent up at
// most every WARP_STAT_MS. What MOVES (beams, shots, ranges, coins, goo, threats - drawSceneTop) is drawn every frame
// on a layer of its own at WARP_DYN_K of the picture's size a side, and the bell's shader lays it over the board
// (WARP_FS). The screen shake rides on the shader's texCam (warpDraw), so both layers shake together.
let WARP_STAT_MS = 150, warpUpSlow = 0; // WARP_STAT_MS: the least time between two board redraws - 4x longer on a device whose board upload stalls (below)
let WARP_DYN_K = 0.5; // let: the moving layer's share of the picture's size, a side (a quarter of the pixels to send)
// the picture's camera for a square of S px: the whole board (WARP_TEX_R world units round the core) in it
function warpTexCamFor(S) {
  const k = S / (2 * WARP_TEX_R);
  Object.assign(cam, { k, ox: S / 2 - CX * k, oy: S / 2 - CY * k });
}
function warpRender() {
  // SHARP (owner: "all these are so blurry, make them sharp"): the picture is a SQUARE as fine as the view's own scale
  // (capped at WARP_TEX_MAX px), not the screen-sized canvas squeezed to fit the board - that was ~3x coarser than the view
  const S = Math.min(WARP_TEX_MAX, Math.round(warpTexCap / 64) * 64, Math.ceil(2 * WARP_TEX_R * cam.k)); // warpTexCap follows the frame rate (aspira-quality.js), stepped by 64 so it is not resized every frame
  const view = { ...cam }, main = ctx, now = performance.now();
  if (typeof laneTextWarm === "function") laneTextWarm(); // (the next wave's lane labels, a stamp a frame)
  try {
    warpTexCamFor(S);
    bossSkyStep(); // the sky's state: phase, radius, full (aspira-bosses.js) - render()'s first step in 2D
    warp.shake = shakeOffset();
    const key = [S, COL.bg].join();
    if (cv.width !== S || cv.height !== S) { cv.width = S; cv.height = S; warp.statKey = ""; } // (resize() sets it back for 2D)
    // THE BOARD on the main canvas: at once for a new size or palette, else only when what it shows has changed (the lit
    // lanes, their brightness, the wave's labels - warpBoardSig), at most every WARP_STAT_MS (a still board is never resent)
    const sig = warpBoardSig(now);
    if (key !== warp.statKey || (sig !== warp.statSig && now - (warp.statAt || 0) >= WARP_STAT_MS)) {
      /* why this redraw (logged with the upload): the size or palette, the wave, the boss sky, the lit lanes, or only a lane fading in */
      { const p = (warp.statSig || "").split("|"), c = sig.split("|"); warp.statWhy = key !== warp.statKey ? "key" : p[0] !== c[0] ? "wave" : p[1] !== c[1] ? "sky" : p[2] !== c[2] ? "lanes" : "fade"; }
      // a STRIP, not the board: when only the boss bar's HP moved (bossBoardSig, the last part) and/or - with the GPU lanes - only the lanes' labels
      // and rim circles (laneDirty, aspira-lanes.js), only the box round what changed goes up (warpLayersBind); the wave or the sky: the whole board
      const ps = (warp.statSig || "").split("|"), cs = sig.split("|"), gpuL = typeof laneGlOn === "function" && laneGlOn();
      const bossMv = ps[ps.length - 1] !== cs[ps.length - 1] || ps.length !== cs.length, laneMv = ps.slice(2, -1).join("|") !== cs.slice(2, -1).join("|");
      const part = key === warp.statKey && !!warp.statSig && ps[0] === cs[0] && ps[1] === cs[1] && ps.length === cs.length && (!laneMv || gpuL);
      const pending = warp.statNew; warp.statKey = key; warp.statSig = sig; warp.statAt = now; warp.statNew = true;
      ctx.setTransform(cam.k, 0, 0, cam.k, cam.ox, cam.oy); ctx.save(); drawSceneBase(); ctx.restore();
      const moved = bossBarOnBoard() ? warpBossBarBoard() : null; // the boss's HP bar, settled: on the board, under every tower FX (below)
      const lbl = laneMv && gpuL && typeof laneDirty === "function" ? laneDirty() : null; // (a list of world boxes, [] when nothing changed)
      const boxes = part && (!bossMv || moved) && (!laneMv || lbl) ? [...(bossMv ? [moved] : []), ...(laneMv ? lbl : [])] : null;
      // ...a pending whole upload stays whole; ONE STRIP A CHANGED BOX (2026-11-01): two labels across the board were one strip half its size
      if (boxes && !(pending && !warp.statRect)) {
        warp.statWhy = laneMv ? "labels" : "boss";
        const px = boxes.map(m => { const r = { x: Math.max(0, Math.floor(m.x0 * cam.k + cam.ox)), y: Math.max(0, Math.floor(m.y0 * cam.k + cam.oy)) }; r.w = Math.max(0, Math.min(S, Math.ceil(m.x1 * cam.k + cam.ox)) - r.x); r.h = Math.max(0, Math.min(S, Math.ceil(m.y1 * cam.k + cam.oy)) - r.y); return r; }).filter(r => r.w > 0 && r.h > 0);
        warp.statRect = stripsMerge(pending && warp.statRect ? warp.statRect.concat(px) : px);
      } else warp.statRect = null;
    }
    warp.texCam = { ...cam };
    const D = Math.max(64, Math.round(S * WARP_DYN_K)), d = warp.dynCv ||= document.createElement("canvas");
    if (d.width !== D || d.height !== D) { d.width = D; d.height = D; }
    const real = warp.dynCtx ||= d.getContext("2d");
    warpTexCamFor(D); // the same board, D px across: the layers line up in the shader's 0..1
    // the stand-in context (aspira-glctx.js): what the GPU batch can draw goes there; the canvas gets the rest, and is cleared
    // and sent up only when it held something this frame or the last (warp.dynUp, warpLayersBind)
    const k = cam.k, ox = cam.ox, oy = cam.oy, toWorld = Object.assign((x, y) => [(x - ox) / k, (y - oy) / k], { k });
    const g = typeof glCtx === "function" && fxGlTake() ? glCtx(real, toWorld) : null;
    if (warp.dynDirty || !g) { real.setTransform(1, 0, 0, 1, 0, 0); real.clearRect(0, 0, D, D); }
    ctx = g || real;
    real.lineJoin = "round"; real.lineCap = "round"; // (as drawLanes leaves them for what follows, in 2D)
    ctx.setTransform(cam.k, 0, 0, cam.k, cam.ox, cam.oy); ctx.save(); drawSceneTop(); ctx.restore();
    warp.dynUp = !g || g.used || warp.dynDirty; warp.dynDirty = !g || g.used;
  } finally { ctx = main; Object.assign(cam, view); }
}
// what the board layer shows, as a string: the lanes lit (each one's lane, turn, colour, wave and brightness to 1/LIT_STEPS -
// as aspira-lanes.js keys its own layers), the wave (the idle labels), the boss sky's phase; while a lane is still fading in,
// the time too, so the fade is drawn
function warpBoardSig(now) {
  const live = typeof litLanes === "function" ? litLanes() : [];
  let fading = false;
  const gpuL = typeof laneGlOn === "function" && laneGlOn(); // the GPU lanes: the board holds no lit lane, so a lane fading in is not the board's (it changed the sig's length, and that sent the whole board, 2026-11-01)
  const lanes = laneHold(typeof laneSplit === "function" ? laneSplit(live).board : live).map(u => { // (a lane fading in on the fade layer is not the board's)
    const t0 = laneSeen.get(u.pi + ":" + u.ang);
    if (!gpuL && !u.star && !laneFadeGl() && laneFadeMs() && (t0 === undefined || now - t0 < laneFadeMs())) fading = true;
    return u.pi + ":" + u.ang.toFixed(3) + ":" + u.color + ":" + u.n + ":" + litLevel(u.a, u.star);
  }).join(",");
  return G.wave + "|" + bossInv.phase + "|" + lanes + (fading ? "|" + Math.floor(now / WARP_STAT_MS) : "") + "|" + bossBoardSig();
}
// THE BOSS BAR ON THE BOARD (owner, 2026-10-27: "all tower FX should appear over boss hp bar if possible" - option 1 of three): once the
// fly-in and the numbers' fade are done the bar leaves the overlay (where it lay over the moving layer: the prism, the scorch rods, the
// pools, fires and shots) for the BOARD - full resolution, so still crisp, and under the moving layer. The board is redrawn when a boss's
// HP moves a 1/BOSS_BOARD_STEPS step, at most every WARP_STAT_MS: the drain steps ~7 times a second. The fly-in stays on the overlay
const BOSS_BOARD_STEPS = 400;
const bossBarOnBoard = () => typeof drawBossBarFloor === "function" && typeof barInT === "function" && barInT() >= bossBarInT() + BAR_LABEL_FADE; // (Infinity off the "in" phase: settled)
const bossBoardSig = () => bossBarOnBoard() ? G.enemies.filter(e => e.arcana && !e.dead && e.bar).map(e => e.id + ":" + Math.round(Math.max(0, e.hp) / e.max * BOSS_BOARD_STEPS)).join(",") : "";
// the same drawing (aspira-bossbar.js), its projection swapped for the board's flat one (world -> picture px, no perspective); under a
// FULL sky the GPU turns the whole board over (warpFlip), so the bar's whites go down pre-inverted (`inverted`, as barWhite reads it)
let warpBossBarFlat = false; // (the bar's board pass: bossScreenS must not read the flat projection)
function warpBossBarBoard() {
  const wp = warpProject, ws = warpProjectScratch, inv = inverted, flat = (x, y) => ({ x: x * cam.k + cam.ox, y: y * cam.k + cam.oy, s: 1 });
  warpProject = flat; warpProjectScratch = flat; warpBossBarFlat = true; if (skyPal()) inverted = true;
  ctx.save(); try { drawBossBarFloor(); } finally { ctx.restore(); warpProject = wp; warpProjectScratch = ws; warpBossBarFlat = false; inverted = inv; }
  return bossBarMoved();
}
// THE STRIP THE HP CROSSED (perf, 2026-10-28: a settled bar draining re-sent the WHOLE board - 2048 px a side on a phone - on every
// other frame of a boss fight): the world box round the pieces between where the board last drew each lane's HP and where it is now,
// BOARD_DIRTY_PAD round it (outlines, labels); null when it cannot be told (a new boss, a first draw) - send it all
const BOARD_DIRTY_PAD = 30;
function bossBarMoved() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, all = false;
  for (const { e, f } of barLeadSet) {
    const B = e.bar; if (!B || !B.pieces) { all = true; continue; }
    const hp = bossSpan(e, f).hp, was = B.boardHp; B.boardHp = hp;
    if (was == null) { all = true; continue; }
    const lo = Math.min(was, hp), hi = Math.max(was, hp);
    for (const g of B.pieces) if (g.s1 >= lo && g.s0 <= hi) for (const q of g.Lp.concat(g.Rp)) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
  }
  if (all) return null;
  return x0 > x1 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0: x0 - BOARD_DIRTY_PAD, y0: y0 - BOARD_DIRTY_PAD, x1: x1 + BOARD_DIRTY_PAD, y1: y1 + BOARD_DIRTY_PAD }; // (nothing crossed: an empty strip)
}
// the board's strips (px rects): boxes that overlap or come within STRIP_JOIN px are one; past STRIP_MAX strips, one box round them all
const STRIP_JOIN = 8, STRIP_MAX = 8;
function stripsMerge(rs) {
  const out = rs.map(r => ({ ...r }));
  for (let hit = true; hit;) {
    hit = false;
    for (let i = 0; i < out.length && !hit; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j];
      if (a.x > b.x + b.w + STRIP_JOIN || b.x > a.x + a.w + STRIP_JOIN || a.y > b.y + b.h + STRIP_JOIN || b.y > a.y + a.h + STRIP_JOIN) continue;
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); out[i] = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; out.splice(j, 1); hit = true; break;
    }
  }
  if (out.length <= STRIP_MAX) return out;
  const x = Math.min(...out.map(r => r.x)), y = Math.min(...out.map(r => r.y));
  return [{ x, y, w: Math.max(...out.map(r => r.x + r.w)) - x, h: Math.max(...out.map(r => r.y + r.h)) - y }];
}
// both layers onto their texture units for the bell (warpDraw): the board sent up only when it was redrawn
function warpLayersBind(gl, u) {
  if (!warp.dynTex) {
    warp.dynTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, warp.dynTex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  }
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, warp.tex);
  if (warp.bmp) { /* the snapshot resolved off the frame: only this upload is left, from decoded pixels */
    const t0 = performance.now(), R = warp.bmpRect, bs = warp.bmp; // (R: the strips alone, one bitmap each)
    if (R) R.forEach((r, i) => gl.texSubImage2D(gl.TEXTURE_2D, 0, r.x, r.y, gl.RGBA, gl.UNSIGNED_BYTE, bs[i])); else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bs[0]); warp.statSize = bs[0].width; } const ms = performance.now() - t0;
    for (const b of bs) b.close(); warp.bmp = null; warp.boardLanes = warp.bmpLanes; // (the lanes in that board are on the GPU now: laneSplit)
    if (typeof perfBoardUp === "function") perfBoardUp("bmp:" + (warp.bmpWhy || "first") + (R ? ":strip" : ":whole"), ms); // (2026-11-02: plain "bmp" hid why - a wave, labels, a boss strip, a resize)
  }
  /* a stalling device (an Apple GPU blocks ~40-50 ms in texImage2D(canvas)) snapshots the board with createImageBitmap, which resolves off the frame, and uploads it a frame or so later; the bell shows the old board till then */
  const bmpOk = warpUpSlow >= 3 && warp.statUp === warp.tex && typeof createImageBitmap === "function";
  if (bmpOk) {
    if (warp.statNew && !warp.bmpP) {
      warp.bmpP = performance.now(); warp.bmpTok = typeof perfWaitTok === "function" ? perfWaitTok() : 0; warp.statNew = false; warp.bmpLanes = warp.statLanes; warp.bmpWhy = warp.statWhy;
      const R = warp.statRect && warp.statSize === cv.width ? warp.statRect : null; warp.statRect = null; // (the strip alone - over a texture already the board's size)
      if (R && !R.length) { warp.bmpP = 0; } else
      Promise.all(R ? R.map(r => createImageBitmap(cv, r.x, r.y, r.w, r.h)) : [createImageBitmap(cv)]).then(b => { if (typeof perfBoardWait === "function") perfBoardWait("bmpWait", warp.bmpP, warp.bmpTok); warp.bmpP = 0; warp.bmp = b; warp.bmpRect = R; }, () => { warp.bmpP = 0; warpUpSlow = 0; warp.statNew = true; });
    }
  } else if (warp.statNew || warp.statUp !== warp.tex) {
    const R = warp.statNew && warp.statUp === warp.tex && warp.statSize === cv.width ? warp.statRect : null, t0 = performance.now(); warp.statRect = null;
    if (R) { for (const r of R) { const c = warp.stripCv ||= document.createElement("canvas"); if (c.width !== r.w || c.height !== r.h) { c.width = r.w; c.height = r.h; } const x = c.getContext("2d"); x.clearRect(0, 0, r.w, r.h); x.drawImage(cv, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h); gl.texSubImage2D(gl.TEXTURE_2D, 0, r.x, r.y, gl.RGBA, gl.UNSIGNED_BYTE, c); } /* (a canvas the strip's size: no pixel readback) */ } // the strips alone
    else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); warp.statSize = cv.width; }
    const ms = performance.now() - t0; warp.statNew = false; warp.statUp = warp.tex; warp.boardLanes = warp.statLanes;
    if (typeof perfBoardUp === "function") perfBoardUp(warp.statWhy || "first", ms);
    /* an Apple GPU blocks ~40 ms in this call (slow logs, iPhone: 98% of the frames after one were over 40 ms): such a device (3 uploads over 20 ms) redraws and resends the board a quarter as often */
    if (ms > 20 && ++warpUpSlow >= 3) WARP_STAT_MS = 600;
  }
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, warp.dynTex);
  if (!DIAG.includes("nodyn") && (warp.dynUp !== false || warp.dynSize !== warp.dynCv.width)) { // only when the canvas held something (warpRender); diag nodyn: never sent (the moving layer then shows nothing) to see what its uploads cost
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // premultiplied, so its soft edges filter without a dark fringe
    const dk = warp.dynCv.width + "x" + warp.dynCv.height; /* same size as the texture's storage: overwrite it, don't reallocate it (perf) */
    if (warp.dynAlloc === dk && warp.dynTexOf === warp.dynTex) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, warp.dynCv);
    else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, warp.dynCv); warp.dynAlloc = dk; warp.dynTexOf = warp.dynTex; }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); warp.dynSize = warp.dynCv.width;
  }
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, typeof fxGl !== "undefined" && fxGl.tex ? fxGl.tex : warp.dynTex); // the hits (aspira-fxgl.js)
  gl.activeTexture(gl.TEXTURE0);
  laneFadeBind(gl, u);
  gl.uniform1i(u("tex"), 0); gl.uniform1i(u("dyn"), 1); gl.uniform1i(u("fxt"), 2);
  hullUniforms(gl, u, warp.cv.height); // the towers' outlines: no beam under one (aspira-fog.js)
}
// the lanes FADING IN (laneFadeLayer, aspira-lanes.js) onto texture unit 3, sent up only when which lanes they are changes; the shader lays
// it over the board at litA, set every frame - a smooth fade for one upload (owner, 2026-10-22)
function laneFadeBind(gl, u) {
  gl.activeTexture(gl.TEXTURE3);
  if (!warp.litTex) {
    warp.litTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, warp.litTex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); warp.litSig = ""; warp.litSize = ""; // (clear till a lane fades in)
  } else gl.bindTexture(gl.TEXTURE_2D, warp.litTex);
  let L = null;
  if (typeof laneFadeLayer === "function" && warp.texCam) { const c0 = { ...cam }; Object.assign(cam, warp.texCam); try { L = laneFadeLayer(); } catch (err) { L = null; laneFail(err); } finally { Object.assign(cam, c0); } }
  if (warp.litBmp) { /* the snapshot resolved off the frame: only this upload is left (premultiplied when it was made - an ImageBitmap ignores the unpack flag) */
    const t0 = performance.now(), R = warp.litBmpRect; if (R) gl.texSubImage2D(gl.TEXTURE_2D, 0, R.x, R.y, gl.RGBA, gl.UNSIGNED_BYTE, warp.litBmp); else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, warp.litBmp); warp.litSize = warp.litBmpSize; }
    warp.litBmp.close(); warp.litBmp = null; warp.litSig = warp.litBmpSig; // (R: only the boxes the layer changed in - laneFadeL.dirty, aspira-lanes.js)
    if (typeof perfBoardUp === "function") perfBoardUp("fadeBmp", performance.now() - t0);
  }
  /* THE FADE LAYER OFF THE FRAME (perf, 2026-10-31 - Wai: "seems a bit laggy"; a 7.0.7 iPhone log had 44 frames over 100 ms, 34 of its 36 canvas uploads on slow frames): a
     device whose board upload stalls (warpUpSlow) snapshots the fade layer with createImageBitmap like the board and sends it a frame or so later - the bell lays the
     old fade layer till then (a lane that just went whole shows a frame or two brighter, one that just lit starts its fade a frame or two late). diag fadesync: the old in-frame upload */
  const litOk = DIAG.includes("fadebmp") && warpUpSlow >= 3 && typeof createImageBitmap === "function" && !warp.litNoBmp; // OFF by default (7.0.18, Wai: "Lanes not appearing/leaving at the right times": the snapshot waits up to ~1 s on an iPhone, and litA follows the live layer meanwhile); diag fadebmp opts in // (litNoBmp: a snapshot failed - the in-frame way from then on)
  if (L && L.sig !== warp.litSig && litOk && !warp.litP) {
    const sig = L.sig, F = laneFadeL, size = L.cv.width + "x" + L.cv.height, D = F.dirty, R = D !== LANE_ALL && warp.litSize === size ? D : null; F.dirty = null; // (the changes since this snapshot: the next one's)
    if (R && !(R.w > 0 && R.h > 0)) warp.litSig = sig; else { // (nothing changed on the GPU copy's pixels: no upload)
      warp.litP = performance.now(); warp.litTok = typeof perfWaitTok === "function" ? perfWaitTok() : 0;
      (R ? createImageBitmap(L.cv, R.x, R.y, R.w, R.h, { premultiplyAlpha: "premultiply" }) : createImageBitmap(L.cv, { premultiplyAlpha: "premultiply" })).then(b => { if (typeof perfBoardWait === "function") perfBoardWait("fadeWait", warp.litP, warp.litTok); warp.litP = 0; if (warp.litBmp) warp.litBmp.close(); warp.litBmp = b; warp.litBmpSig = sig; warp.litBmpRect = R; warp.litBmpSize = size; }, () => { warp.litP = 0; warp.litNoBmp = true; F.dirty = LANE_ALL; });
    }
  } else if (L && L.sig !== warp.litSig && !litOk && !warp.litP) {
    /* IN-FRAME, ONLY THE BOX (perf, 2026-10-31 - a 7.0.20 iPhone log: this whole-layer upload 231 ms on average, 582 at worst, on 36 of its 47 frames over 100 ms): over a
       GPU copy already the layer's size, only the rect changed since the last upload (laneFadeL.dirty) is copied into a box-sized canvas and sent with texSubImage2D - in
       the same frame, so lane timing is exact (the 7.0.14 snapshot's lag is what broke it); nothing changed, no upload. A new size or LANE_ALL: the whole layer as before */
    const t0 = performance.now(), size = L.cv.width + "x" + L.cv.height, D = laneFadeL.dirty, R = D !== LANE_ALL && warp.litSize === size ? D : null;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    if (R && !(R.w > 0 && R.h > 0)) { /* nothing changed on the GPU copy's pixels */ } else if (R) {
      const b = warp.litBox ||= document.createElement("canvas"), bx = b.getContext("2d");
      if (b.width !== R.w || b.height !== R.h) { b.width = R.w; b.height = R.h; } else bx.clearRect(0, 0, R.w, R.h);
      bx.drawImage(L.cv, R.x, R.y, R.w, R.h, 0, 0, R.w, R.h); gl.texSubImage2D(gl.TEXTURE_2D, 0, R.x, R.y, gl.RGBA, gl.UNSIGNED_BYTE, b);
    } else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, L.cv); warp.litSize = size; }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); warp.litSig = L.sig; laneFadeL.dirty = null; // (all sent: nothing left over)
    if (typeof perfBoardUp === "function") perfBoardUp(R ? "fadeBox" : "fade", performance.now() - t0);
  }
  gl.uniform1i(u("lit"), 3); gl.uniform1f(u("litA"), L ? L.a : 0);
  warp.litOk = u("lit") !== null && u("litA") !== null;
}
