// /spire SLOW LOGS (owner, 2026-10-12: "this is just my partner's brave - can we make it so that each session takes slowlogs
// and sends them back to the server every 3 min of play?"): every frame's real time is tallied (aspira-ui.js frame calls
// perfTick), with the display mode, the board's size and the AUDIO's state - whether it unlocked, how many samples loaded, and how
// many sounds were asked for against how many played - and every PERF_SEND_S seconds of PLAY (unpaused, the tab showing)
// one summary goes to /api/spire/perflog (api/spire_perflog.py, a temp folder on the server). Never in the way of the game:
// every failure is swallowed.
const PERF_SEND_S = 180, PERF_BUCKETS = [16.7, 33, 50, 100, Infinity];
const perfSid = Math.random().toString(36).slice(2, 10);
let perf = null;
const perfReset = () => { perf = { secs: 0, frames: 0, sum: 0, buckets: PERF_BUCKETS.map(() => 0), worst: [], maxEnemies: 0, sfxCalls: 0, sfxPlayed: 0, simMs: 0, drawMs: 0, warpMs: 0, glMs: 0, entMs: 0, speed: 0, picMs: 0, fxMs: 0, bindMs: 0, fxN: 0, fxMax: 0, upBoard: 0, upDyn: 0, cbMs: 0, lagMs: 0, up: 0, upPx: 0, read: 0, glCopy: 0, opFill: 0, opStroke: 0, opRect: 0, opImage: 0, opText: 0, opState: 0 }; if (typeof glcWhyN !== "undefined") for (const k in glcWhyN) delete glcWhyN[k]; };
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
(function () {
  const P = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype; if (!P) return;
  const count = (nm, key) => { const f = P[nm]; if (!f) return; P[nm] = function () { perf[key]++; return f.apply(this, arguments); }; };
  for (const nm of ["fill", "stroke"]) count(nm, nm === "fill" ? "opFill" : "opStroke");
  for (const nm of ["fillRect", "strokeRect", "clearRect"]) count(nm, "opRect");
  count("drawImage", "opImage"); count("fillText", "opText"); count("strokeText", "opText");
  for (const nm of ["save", "restore", "setTransform"]) count(nm, "opState");
})();
const perfOps = () => { const n = Math.max(1, perf.frames), r = v => Math.round(v / n); return { draw: r(perf.opFill + perf.opStroke + perf.opRect + perf.opImage + perf.opText), fill: r(perf.opFill), stroke: r(perf.opStroke), rect: r(perf.opRect), image: r(perf.opImage), text: r(perf.opText), state: r(perf.opState) }; };
const perfSync = () => { const s = Math.max(1, perf.secs); return { upPerSec: +(perf.up / s).toFixed(1), upMpxPerSec: +(perf.upPx / s / 1e6).toFixed(2), readPerSec: +(perf.read / s).toFixed(2), glCopyPerSec: +(perf.glCopy / s).toFixed(2) }; };
function perfTick(dt) {
  if (!(dt > 0) || dt > 1 || ui.paused || document.hidden) return; // a stall or a tab switch is not a frame
  const ms = dt * 1000;
  perf.secs += dt; perf.frames++; perf.sum += ms;
  perf.buckets[PERF_BUCKETS.findIndex(b => ms < b)]++;
  if (perf.worst.length < 5 || ms > perf.worst[4]) { perf.worst.push(Math.round(ms)); perf.worst.sort((a, b) => b - a); perf.worst.length = Math.min(5, perf.worst.length); }
  perf.maxEnemies = Math.max(perf.maxEnemies, G.enemies.length); perf.speed += typeof speedX === "function" ? speedX() : 1;
  if (perf.secs >= PERF_SEND_S) perfSend();
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
  const n = Math.max(1, perf.frames), r = v => +(v / n).toFixed(1);
  return { picMs: r(perf.picMs), fxMs: r(perf.fxMs), bindMs: r(perf.bindMs), fxN: Math.round(perf.fxN / n), fxMax: perf.fxMax, upBoard: +(perf.upBoard / n).toFixed(2), upDyn: +(perf.upDyn / n).toFixed(2), textPx: typeof textPx !== "undefined" ? Math.round(textPx / 1e3) : null, canvasK: perfCanvasK(), textN: typeof textSprites !== "undefined" ? textSprites.size : null, why: typeof glcWhyN !== "undefined" ? Object.fromEntries(Object.entries(glcWhyN).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, +(v / n).toFixed(2)])) : null, tex: typeof cv !== "undefined" ? cv.width : null, fxTex: typeof fxGl !== "undefined" && fxGl.S ? fxGl.S : null };
}
function perfSend() {
  const ver = document.querySelector(".asp-ver span");
  const body = {
    sid: perfSid, v: ver ? ver.textContent + "+" + (ver.parentNode.dataset.build || "?") : "?", /* the version + the files' stamp (a cached phone shows an old one) */ secs: Math.round(perf.secs), frames: perf.frames, avgMs: +(perf.sum / Math.max(1, perf.frames)).toFixed(1),
    buckets: Object.fromEntries(PERF_BUCKETS.map((b, i) => ["<" + b, perf.buckets[i]])), worst: perf.worst, maxEnemies: perf.maxEnemies,
    gpuSplit: perfSplit(), perFrame: { simMs: +(perf.simMs / Math.max(1, perf.frames)).toFixed(1), drawMs: +(perf.drawMs / Math.max(1, perf.frames)).toFixed(1), warpMs: +(perf.warpMs / Math.max(1, perf.frames)).toFixed(1), glMs: +(perf.glMs / Math.max(1, perf.frames)).toFixed(1), entMs: +(perf.entMs / Math.max(1, perf.frames)).toFixed(1), speed: +(perf.speed / Math.max(1, perf.frames)).toFixed(2), cbMs: +(perf.cbMs / Math.max(1, perf.frames)).toFixed(1), lagMs: +(perf.lagMs / Math.max(1, perf.frames)).toFixed(1), dpr: typeof canvasDpr === "function" ? +canvasDpr().toFixed(2) : null }, // (3D: drawMs is inside warpMs; cbMs: the whole frame callback, lagMs: the browser's delay handing it the frame - an avgMs far above both is the compositor / GPU, outside our code)
    detailR: typeof detailFarR !== "undefined" ? Math.round(detailFarR) : null, texCap: typeof warpTexCap !== "undefined" ? Math.round(warpTexCap) : null, warpRes: typeof WARP_RES !== "undefined" ? +WARP_RES.toFixed(2) : null, // 3D's full-detail radius at send time
    sync: perfSync(), ops: perfOps(), diag: typeof DIAG !== "undefined" ? DIAG : "", quality: qMode, wave: G.wave, brave: !!navigator.brave,
    screen: [innerWidth, innerHeight, devicePixelRatio], canvas: [cv.width, cv.height],
    gpu: perfGpu(), // the WebGL renderer ("SwiftShader" / "llvmpipe" = software, no GPU)
    audio: { ac: typeof AC !== "undefined" && AC ? AC.state : null, samples: typeof SAMPLES !== "undefined" ? Object.values(SAMPLES).filter(s => s.length).length : null, calls: perf.sfxCalls, played: perf.sfxPlayed, muted: typeof muted !== "undefined" ? muted : null, volume: typeof volume !== "undefined" ? volume : null },
  };
  perfReset();
  try { fetch("/api/spire/perflog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch (e) { /* never in the way */ }
}
