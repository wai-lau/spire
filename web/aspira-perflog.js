// /spire SLOW LOGS (owner, 2026-10-12: "this is just my partner's brave - can we make it so that each session takes slowlogs
// and sends them back to the server every 3 min of play?"): every frame's real time is tallied (aspira-ui.js frame calls
// perfTick), with the display mode, the board's size and the AUDIO's state - whether it unlocked, how many samples loaded, and how
// many sounds were asked for against how many played - and every PERF_SEND_S seconds of PLAY (unpaused, the tab showing)
// one summary goes to /api/spire/perflog (api/spire_perflog.py, a temp folder on the server). Never in the way of the game:
// every failure is swallowed.
const PERF_SEND_S = 180, PERF_BUCKETS = [16.7, 33, 50, 100, Infinity];
const perfSid = Math.random().toString(36).slice(2, 10);
let perf = null;
const perfReset = () => { perf = { secs: 0, frames: 0, sum: 0, buckets: PERF_BUCKETS.map(() => 0), worst: [], maxEnemies: 0, sfxCalls: 0, sfxPlayed: 0, simMs: 0, drawMs: 0, warpMs: 0, glMs: 0, entMs: 0, speed: 0, picMs: 0, fxMs: 0, bindMs: 0, fxN: 0, fxMax: 0, upBoard: 0, upDyn: 0, cbMs: 0, lagMs: 0, up: 0, upPx: 0, read: 0, glCopy: 0, lastUp: 0, fUp: 0, sUp: 0, fNo: 0, sNo: 0, opFill: 0, opStroke: 0, opRect: 0, opImage: 0, opText: 0, opState: 0, opFrames: 0, bu: { n: 0, sum: 0, max: 0, why: {} }, rframes: 0, rsecs: 0, causes: { stamp: [0, 0, 0], fadeBuild: [0, 0, 0] }, slow: { n: 0, ms: {}, tags: {}, phase: {}, first: 0 }, mk: new Set(), pv: [0, 0, 0, 0, 0, 0, 0], act: {}, actSecs: 0, clicks: 0, keys: 0, wMin: 1e9, wMax: 0, made0: typeof textMade !== "undefined" ? textMade : 0 }; if (typeof glcWhyN !== "undefined") for (const k in glcWhyN) delete glcWhyN[k]; };
perfReset();
// the sound calls counted on their way through (sfx is a global function: every caller looks it up by name)
if (typeof sfx === "function") { const sfx0 = sfx; sfx = function (...a) { perf.sfxCalls++; const r = sfx0.apply(this, a); if (r) perf.sfxPlayed++; return r; }; }
// WHERE a frame's time goes (2026-10-12: her frames split fast / 50-100 ms): the simulation (step), the 2D picture (render) and
// the 3D pass (warp3d), summed by wrapping the globals - every caller looks them up by name
const perfWrap = (name, key) => { if (typeof window[name] !== "function") return; const f0 = window[name]; window[name] = function (...a) { const t0 = performance.now(); try { return f0.apply(this, a); } finally { perf[key] += performance.now() - t0; } }; };
perfWrap("step", "simMs"); perfWrap("render", "drawMs"); perfWrap("warp3d", "warpMs");
// ...and INSIDE the 3D pass (perf, 2026-10-13: an iPhone spent 19.6 of its 23.5 ms there with the picture itself 0.5): the GL draw with
// the picture's upload (warpDraw, which INCLUDES the next) and the flat towers / dice / enemies layer (warpEntities)
perfWrap("warpDraw", "glMs"); perfWrap("warpEntities", "entMs");
// ...and inside THAT (2026-10-14: the new build still spent ~20 ms of an iPhone's frame in warpDraw): the board picture drawn
// (warpRender), the effects batch (fxGlRender - its shapes counted), the two layers sent up (warpLayersBind - how often each).
// A GPU that cannot keep up makes the call that waits on it slow, so these say WHERE, not only how long
perfWrap("warpRender", "picMs"); perfWrap("warpLayersBind", "bindMs");
// PER-CAUSE TIMERS (2026-10-31, Wai: "Use slow logs? I dont want to do the diag things" - a normal game's log must tell the causes apart): each text STAMP made
// (textStamp, aspira-textcache.js - a new canvas, drawn) and each lane FADE LAYER build (laneFadeLayer when its sig moves, aspira-lanes.js - apart from its upload,
// boardUp fadeBmp): [count, total ms, max ms] in `causes`, and this frame's share in perfFr for the slow frame's split (slowWhy.ms)
const perfFr = { stamp: 0, fade: 0 };
const perfCause = (c, ms) => { const a = perf.causes[c]; a[0]++; a[1] += ms; if (ms > a[2]) a[2] = ms; };
if (typeof textStamp === "function") { const f0 = textStamp; textStamp = function (...a) { const t0 = performance.now(); try { return f0.apply(this, a); } finally { const ms = performance.now() - t0; perfCause("stamp", ms); perfFr.stamp += ms; } }; }
if (typeof laneFadeLayer === "function") { const f0 = laneFadeLayer; laneFadeLayer = function (...a) { const was = typeof laneFadeL !== "undefined" ? laneFadeL.sig : "", t0 = performance.now(); try { return f0.apply(this, a); } finally { if (typeof laneFadeL !== "undefined" && laneFadeL.sig && laneFadeL.sig !== was) { const ms = performance.now() - t0; perfCause("fadeBuild", ms); perfFr.fade += ms; } } }; }
const perfCausesOut = () => Object.fromEntries(Object.entries(perf.causes).map(([k, a]) => [k, [a[0], a[0] ? +(a[1] / a[0]).toFixed(1) : 0, Math.round(a[2])]]));
if (typeof fxGlRender === "function") { const f0 = fxGlRender; fxGlRender = function (...a) { const n = typeof fxGl !== "undefined" ? fxGl.n : 0; perf.fxN += n; perf.fxMax = Math.max(perf.fxMax, n); const t0 = performance.now(); try { return f0.apply(this, a); } finally { perf.fxMs += performance.now() - t0; } }; }
if (typeof warpLayersBind === "function") { const b0 = warpLayersBind; warpLayersBind = function (...a) { if (typeof warp !== "undefined") { if (warp.statNew) perf.upBoard++; if (warp.dynUp) perf.upDyn++; } return b0.apply(this, a); }; }
/* the whole frame callback's own time, and how late the browser called it (2026-10-16: a Brave averaged 48 ms a frame with ~10 ms of timed JS - this says whether the rest is the page or the browser) */
function perfCb(now, t0) { if (document.hidden || ui.paused) return; const t1 = performance.now(); perf.cbMs += t1 - t0; perf.lagMs += Math.max(0, Math.min(100, t0 - now)); }
/* CPU <-> GPU SYNCS, counted (2026-10-16: a Radeon / ANGLE D3D11 laptop's GPU process stalled ~25 ms a frame with ~3 ms of our JS): canvas -> WebGL texture uploads (and their pixels), readbacks (getImageData, readPixels, toDataURL, toBlob), and WebGL -> 2D copies (warp.js) */
(function () {
  const wrap = (C, nm, fn) => { if (!C || !C.prototype[nm]) return; const f = C.prototype[nm]; C.prototype[nm] = function (...a) { try { fn(a); } catch (e) { /* never in the way */ } return f.apply(this, a); }; };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    for (const nm of ["texImage2D", "texSubImage2D"]) wrap(C, nm, a => { const s = a[a.length - 1]; if (s && s.tagName === "CANVAS") { perf.up++; perf.upPx += s.width * s.height; } });
    wrap(C, "readPixels", () => { perf.read++; });
  }
  wrap(window.CanvasRenderingContext2D, "getImageData", () => { perf.read++; });
  wrap(window.HTMLCanvasElement, "toDataURL", () => { perf.read++; }); wrap(window.HTMLCanvasElement, "toBlob", () => { perf.read++; });
})();
/* 2D OPS a frame (2026-10-16: the Radeon laptop ran every layer case at the display rate yet the game at ~55 ms - cost per DRAW CALL is the suspect): the drawing calls and the state changes between them, counted on their way through */
/* (counted for the first 6 s of each window only - the wrappers themselves cost ~3% of a frame's CPU, measured; swapped in and out of the prototype) */
const perfOpsHook = (() => {
  const P = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype, saved = {}; let on = false;
  const names = { fill: "opFill", stroke: "opStroke", fillRect: "opRect", strokeRect: "opRect", clearRect: "opRect", drawImage: "opImage", fillText: "opText", strokeText: "opText", save: "opState", restore: "opState", setTransform: "opState" };
  return want => {
    if (!P || want === on) return; on = want;
    for (const nm in names) {
      if (!want) { if (saved[nm]) P[nm] = saved[nm]; continue; }
      const f = saved[nm] = P[nm], key = names[nm]; if (!f) continue;
      P[nm] = function () { perf[key]++; return f.apply(this, arguments); };
    }
  };
})();
const perfOps = () => { const n = Math.max(1, perf.opFrames), r = v => Math.round(v / n); return { draw: r(perf.opFill + perf.opStroke + perf.opRect + perf.opImage + perf.opText), fill: r(perf.opFill), stroke: r(perf.opStroke), rect: r(perf.opRect), image: r(perf.opImage), text: r(perf.opText), state: r(perf.opState), frames: perf.opFrames }; };
/* the board texture's uploads: how many, what each cost (the call blocks on an Apple GPU) and why it was redrawn (aspira-warplayers.js) */
/* ...and per reason (byWhy: [count, total ms, max ms] - 2026-10-28: the totals mixed bmpWait, createImageBitmap's wait OFF the frame, with the uploads that block IN it, so the in-frame cost could not be read) */
const perfBoardUp = (why, ms) => { const b = perf.bu; b.n++; b.sum += ms; if (ms > b.max) b.max = ms; b.why[why] = (b.why[why] || 0) + 1; const w = (b.byWhy ||= {})[why] ||= [0, 0, 0]; w[0]++; w[1] += ms; if (ms > w[2]) w[2] = ms; };
const perfSync = () => { const s = Math.max(1, perf.rsecs); return { upPerSec: +(perf.up / s).toFixed(1), upMpxPerSec: +(perf.upPx / s / 1e6).toFixed(2), readPerSec: +(perf.read / s).toFixed(2), glCopyPerSec: +(perf.glCopy / s).toFixed(2), framesUp: perf.fUp, slowUp: perf.sUp, framesNoUp: perf.fNo, slowNoUp: perf.sNo }; };
/* WHAT THE PLAYER IS DOING (owner, 2026-10-16: "sometimes they are not playing"): every frame's time goes to one state - over (the game-over / resume card), menu (an upgrade chooser or a tower card open), paused, idle (no input for 30 s), playing (a wave on the field) or waiting (between waves) - and the tab's hidden time is counted on its own (no frames then); [seconds, frames, ms, slow frames] a state */
let perfLastIn = performance.now();
const perfIn = kind => () => { perf[kind]++; perfLastIn = performance.now(); };
addEventListener("pointerdown", perfIn("clicks"), true); addEventListener("keydown", perfIn("keys"), true);
let perfHidAt = 0;
document.addEventListener("visibilitychange", () => { const now = performance.now(); if (document.hidden) perfHidAt = now; else if (perfHidAt) { const s = (now - perfHidAt) / 1000; perfHidAt = 0; (perf.act.hidden ||= [0, 0, 0, 0])[0] += s; perf.actSecs += s; if (perf.actSecs >= PERF_SEND_S) perfSend(); } });
function perfState() {
  const ov = $("asp-ov"), pop = $("asp-pop");
  if ((ov && !ov.hidden) || G.over) return "over";
  if (chooser.t || (pop && !pop.hidden)) return "menu";
  if (ui.paused) return "paused";
  if (performance.now() - perfLastIn > 30000) return "idle";
  return G.started && G.enemies.length ? "playing" : "waiting";
}
/* THE WAITS OFF THE FRAME (bmpWait / fadeWait, aspira-warplayers.js) are wall-clock time, so one spanning a pause, an idle spell or the game-over card read 1085 ms
   (2026-10-31, a 7.0.14 log): perfOffSeq counts every frame outside play (paused / idle / over / menu) and every hide, and a wait logs only when none fell inside it */
let perfOffSeq = 0;
const perfWaitTok = () => perfOffSeq;
function perfBoardWait(why, t0, tok) { if (tok === perfOffSeq && !document.hidden) perfBoardUp(why, performance.now() - t0); }
document.addEventListener("visibilitychange", () => { perfOffSeq++; });
function perfActive(dt) {
  const st = perfState(), a = (perf.act[st] ||= [0, 0, 0, 0]), ms = dt * 1000;
  if (st !== "playing" && st !== "waiting") perfOffSeq++;
  a[0] += dt; a[1]++; a[2] += ms; if (ms > 40) a[3]++;
  perf.actSecs += dt; perf.wMin = Math.min(perf.wMin, G.wave); perf.wMax = Math.max(perf.wMax, G.wave);
}
const perfActOut = () => { const o = {}; for (const k in perf.act) { const a = perf.act[k]; o[k] = [Math.round(a[0]), a[1] ? +(a[2] / a[1]).toFixed(1) : 0, a[3]]; } return { states: o, clicks: perf.clicks, keys: perf.keys, waves: [perf.wMin === 1e9 ? 0 : perf.wMin, perf.wMax] }; };
/* WHAT A SLOW FRAME COINCIDED WITH (coordinator, 2026-10-17: 29 slow iPhone frames in 106 s with no upload near them): events mark the frame they happen in; a frame over 40 ms counts each mark it carried, and the phase that took most of it (step / 2D picture / GL draw / entity layer / the rest = outside our code: the browser's compositor, GC, the GPU) */
const perfMark = t => perf.mk.add(t);
for (const [fn, tag] of [["sendWave", "wave"], ["openChooser", "chooser"], ["placeTower", "place"], ["buildTower", "place"], ["upgradeTower", "upgrade"], ["spawnBoss", "boss"]]) if (typeof window[fn] === "function") { const f0 = window[fn]; window[fn] = function (...a) { perfMark(tag); return f0.apply(this, a); }; }
{ const ce = document.createElement; document.createElement = function (n, ...a) { if (String(n).toLowerCase() === "canvas") perfMark("newCanvas"); return ce.call(this, n, ...a); }; }
let perfPrevE = 0, perfPrevT = 0, perfPrevSfx = 0, perfPrevCoin = 0;
function perfSlow(ms) {
  const e = G.enemies.length, t = G.towers ? G.towers.length : 0, sf = perf.sfxPlayed - perfPrevSfx;
  if (perfPrevE - e >= 3) perfMark("kills"); if (e - perfPrevE >= 3) perfMark("spawns"); if (t > perfPrevT) perfMark("towerAdd"); if (sf >= 4) perfMark("sfx" + (sf >= 8 ? "8+" : "4+")); else if (sf) perfMark("sfx");
  perfPrevE = e; perfPrevT = t; perfPrevSfx = perf.sfxPlayed;
  const cur = [perf.simMs, perf.drawMs, perf.glMs, perf.entMs, perf.fxMs, perf.bindMs], d = cur.map((v, i) => v - perf.pv[i]); perf.pv = cur.concat(0);
  const fr = { stamp: perfFr.stamp, fade: perfFr.fade }; perfFr.stamp = 0; perfFr.fade = 0;
  if (ms <= 40) { perf.mk.clear(); return; }
  const s = perf.slow; s.n++;
  const tags = perf.mk.size ? [...perf.mk] : ["none"]; for (const k of tags) s.tags[k] = (s.tags[k] || 0) + 1; perf.mk.clear();
  /* ent (2026-10-31): the entity layer (warpEntities - towers, enemies, every damage-number stamp) is timed INSIDE warpDraw; it is its own phase now, glDraw the rest of warpDraw */
  const own = d[0] + d[1] + d[2], part = [d[0], d[1], Math.max(0, d[2] - d[3]), d[3]], names = ["step", "picture", "glDraw", "ent"], big = part.indexOf(Math.max(...part));
  const ph = own < ms * 0.4 ? "outside" : names[big]; s.phase[ph] = (s.phase[ph] || 0) + 1;
  /* ...and WHERE ITS MS WENT, summed over the slow frames: the four phases, rest = the frame minus all of our timed work (the browser, its GPU process, GC), and of the
     phases' time the stamps made (stamp: inside ent or picture) and the fade layer built (fade: inside glDraw) - whole ms */
  const add = (k, v) => { s.ms[k] = (s.ms[k] || 0) + Math.round(Math.max(0, v)); };
  names.forEach((k, i) => add(k, part[i])); add("rest", ms - own); add("stamp", fr.stamp); add("fade", fr.fade);
}
function perfTick(dt) {
  if (!(dt > 0) || dt > 1 || document.hidden) return; // a stall or a tab switch is not a frame
  perfActive(dt);
  perf.rframes++; perf.rsecs += dt; /* (the timing counters run on every rendered frame, paused ones too: they are divided by these) */
  { const want = perf.rsecs < 6; perfOpsHook(want); if (want) perf.opFrames++; }
  if (perf.actSecs >= PERF_SEND_S && ui.paused) perfSend();
  if (ui.paused) return;
  const ms = dt * 1000;
  perf.secs += dt; perf.frames++; perf.sum += ms;
  perf.buckets[PERF_BUCKETS.findIndex(b => ms < b)]++;
  /* does a slow frame (over 40 ms) line up with a canvas -> texture upload in the frame before it (perf.up is counted as it happens)? */
  perfSlow(ms);
  { const had = perf.up > perf.lastUp; perf.lastUp = perf.up; if (had) { perf.fUp++; if (ms > 40) perf.sUp++; } else { perf.fNo++; if (ms > 40) perf.sNo++; } }
  if (perf.worst.length < 5 || ms > perf.worst[4]) { perf.worst.push(Math.round(ms)); perf.worst.sort((a, b) => b - a); perf.worst.length = Math.min(5, perf.worst.length); }
  perf.maxEnemies = Math.max(perf.maxEnemies, G.enemies.length); perf.speed += typeof speedX === "function" ? speedX() : 1;
  if (perf.secs >= PERF_SEND_S || perf.actSecs >= PERF_SEND_S) perfSend();
}
// which GPU the browser hands WebGL - read once (the 3D view's own context if it has one, else a throwaway one)
let perfGpuName = null;
function perfGpu() {
  if (perfGpuName) return perfGpuName;
  try {
    const gl = (typeof warp !== "undefined" && warp.gl) || document.createElement("canvas").getContext("webgl"), x = gl && gl.getExtension("WEBGL_debug_renderer_info");
    perfGpuName = !gl ? "no webgl" : x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  } catch (e) { perfGpuName = "?"; }
  return perfGpuName;
}
// the 3D pass's parts a frame (ms), the effects batch's shapes (mean, most), and the share of frames that sent each layer up
// the big canvases' pixels (thousands; x4 = bytes), each named, + the text stamps and the effects texture - iOS kills a page past
// its canvas memory, and the crashes came late in long games (2026-10-14); heapMB where the browser tells (Chrome)
function perfCanvasK() {
  try {
    const px = c => (c ? c.width * c.height : 0), w = typeof warp !== "undefined" ? warp : {}, out = { board: px(cv), gl: px(w.cv), ent: px(w.ent), top: px(w.top), dyn: px(w.dynCv), fx: typeof fxGl !== "undefined" && fxGl.S ? fxGl.S * fxGl.S : 0, text: typeof textPx !== "undefined" ? textPx : 0, dom: [...document.querySelectorAll("canvas")].reduce((a, c) => a + px(c), 0) };
    for (const k in out) out[k] = Math.round(out[k] / 1e3);
    if (performance.memory) out.heapMB = Math.round(performance.memory.usedJSHeapSize / 1e6);
    return out;
  } catch (e) { return null; }
}
function perfSplit() {
  const n = Math.max(1, perf.rframes), r = v => +(v / n).toFixed(1);
  return { picMs: r(perf.picMs), fxMs: r(perf.fxMs), bindMs: r(perf.bindMs), fxN: Math.round(perf.fxN / n), fxMax: perf.fxMax, upBoard: +(perf.upBoard / n).toFixed(2), upDyn: +(perf.upDyn / n).toFixed(2), textPx: typeof textPx !== "undefined" ? Math.round(textPx / 1e3) : null, canvasK: perfCanvasK(), textN: typeof textSprites !== "undefined" ? textSprites.size : null, textMade: typeof textMade !== "undefined" ? textMade : null, textMadeNew: typeof textMade !== "undefined" ? textMade - perf.made0 : null, textTaken: typeof textTaken !== "undefined" ? textTaken : null, /* (atlas slots taken from a live stamp, page session) */ /* (textMade is for the whole page session; textMadeNew since the last send) */ why: typeof glcWhyN !== "undefined" ? Object.fromEntries(Object.entries(glcWhyN).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, +(v / n).toFixed(2)])) : null, tex: typeof cv !== "undefined" ? cv.width : null, fxTex: typeof fxGl !== "undefined" && fxGl.S ? fxGl.S : null };
}
function perfSend() {
  { const pl = perf.act.playing, wt = perf.act.waiting; if (!((pl && pl[0] >= 1) || (wt && wt[0] >= 1))) { perfReset(); return; } } /* a window with no play or waiting time (paused, menu, idle, hidden, over only) carries nothing: not sent, so an idle tab cannot push real logs out of the server's 400 files */
  const ver = document.querySelector(".asp-ver span");
  const body = {
    sid: perfSid, v: ver ? ver.textContent + "+" + (ver.parentNode.dataset.build || "?") : "?", /* the version + the files' stamp (a cached phone shows an old one) */ secs: Math.round(perf.secs), frames: perf.frames, avgMs: +(perf.sum / Math.max(1, perf.frames)).toFixed(1),
    buckets: Object.fromEntries(PERF_BUCKETS.map((b, i) => ["<" + b, perf.buckets[i]])), worst: perf.worst, maxEnemies: perf.maxEnemies,
    gpuSplit: perfSplit(), perFrame: { simMs: +(perf.simMs / Math.max(1, perf.rframes)).toFixed(1), drawMs: +(perf.drawMs / Math.max(1, perf.rframes)).toFixed(1), warpMs: +(perf.warpMs / Math.max(1, perf.rframes)).toFixed(1), glMs: +(perf.glMs / Math.max(1, perf.rframes)).toFixed(1), entMs: +(perf.entMs / Math.max(1, perf.rframes)).toFixed(1), speed: +(perf.speed / Math.max(1, perf.frames)).toFixed(2), cbMs: +(perf.cbMs / Math.max(1, perf.rframes)).toFixed(1), lagMs: +(perf.lagMs / Math.max(1, perf.rframes)).toFixed(1), dpr: typeof canvasDpr === "function" ? +canvasDpr().toFixed(2) : null }, // (3D: drawMs is inside warpMs; cbMs: the whole frame callback, lagMs: the browser's delay handing it the frame - an avgMs far above both is the compositor / GPU, outside our code)
    detailR: typeof detailFarR !== "undefined" ? Math.round(detailFarR) : null, texCap: typeof warpTexCap !== "undefined" ? Math.round(warpTexCap) : null, warpRes: typeof WARP_RES !== "undefined" ? +WARP_RES.toFixed(2) : null, // 3D's full-detail radius at send time
    act: perfActOut(), boardUp: { n: perf.bu.n, avgMs: perf.bu.n ? +(perf.bu.sum / perf.bu.n).toFixed(1) : 0, maxMs: Math.round(perf.bu.max), why: perf.bu.why, byWhy: Object.fromEntries(Object.entries(perf.bu.byWhy || {}).map(([k, [c, t, m]]) => [k, { n: c, avgMs: +(t / c).toFixed(1), maxMs: Math.round(m) }])), gapMs: typeof WARP_STAT_MS !== "undefined" ? WARP_STAT_MS : null }, sync: perfSync(), slowWhy: perf.slow, causes: perfCausesOut(), ops: perfOps(), diag: typeof DIAG !== "undefined" ? DIAG : "", quality: "3d", wave: G.wave, brave: !!navigator.brave,
    box: BOX_WIDE ? "wide" : "tall", screen: [innerWidth, innerHeight, devicePixelRatio], canvas: [cv.width, cv.height],
    gpu: perfGpu(), // the WebGL renderer ("SwiftShader" / "llvmpipe" = software, no GPU)
    audio: { ac: typeof AC !== "undefined" && AC ? AC.state : null, samples: typeof SAMPLES !== "undefined" ? Object.values(SAMPLES).filter(s => s.length).length : null, calls: perf.sfxCalls, played: perf.sfxPlayed, muted: typeof muted !== "undefined" ? muted : null, volume: typeof volume !== "undefined" ? volume : null },
  };
  perfReset();
  try { fetch("/api/spire/perflog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch (e) { /* never in the way */ }
}
