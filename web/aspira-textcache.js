// /spire - TEXT AS STAMPS (owner, 2026-10-14: "a 10x improvement on perf ... avoid lowering resolution or reducing visual
// clarity"). A late 3D wave drew ~350 damage numbers a frame, each a fresh outline stroke and fill of glyphs on the
// full-density layer - 16 of a 26 ms frame on a desktop RTX (profiled with the GPU synced). Each text (its string, colour,
// outline, weight) is drawn ONCE at its real size in device pixels onto a small canvas of its own, and stamped from then
// on: one image a number, still at its exact pixel size, so it is as sharp as before. Sizes are kept in TEXT_Q px steps
// (a 1-2% scale at most). text() (aspira-draw.js) asks here first; under a skewed or rotated transform, before the font has
// loaded, or with the cache off, it draws the old way. Loaded after aspira-draw.js.
/* a desktop (a fine pointer) holds 3x the stamps: the slow logs showed the cache pinned at 899 of 900 on an RTX in late waves, every miss a new canvas (perf, 2026-10-17); phones keep the small budget */
const TEXT_BIG = (() => { try { return matchMedia("(pointer: fine)").matches && !/iPhone|iPad|Android/.test(navigator.userAgent); } catch (e) { return false; } })();
const TEXT_Q = 0.5, TEXT_CACHE_MAX = TEXT_BIG ? 2700 : 900;
// ...on a MEMORY budget too (2026-10-14: an iPhone died at wave 62-70 again and again - late damage numbers are big, glowing
// and drawn at 3x density, up to ~1 MB a stamp, and 900 of them run past iOS Safari's total canvas memory): at most
// TEXT_CACHE_PX pixels (~24 MB) held, the least recently used dropped first, each one's canvas zeroed so iOS frees it at once
const TEXT_CACHE_PX = TEXT_BIG ? 18e6 : 6e6;
const textSprites = new Map();
let textPx = 0;
const textPool = new Map(); /* evicted stamps' canvases by size bucket ("WxH"): kept at their size and reused - a canvas of a NEW size is an allocation + a texture the iPhone paid ~tens of ms for (slow logs 5.1.119: newCanvas on 53 of 89 slow frames) */
let textPoolPx = 0; const TEXT_POOL_PX = 2e6;
const textBucket = (w, h) => [Math.ceil(w / 16) * 16, Math.ceil(h / 8) * 8];
let textMade = 0; /* canvases created, for the slow logs */
function textFree(sp) { // a dropped stamp's canvas: back to its bucket while the spare pool is small, else zeroed so iOS frees it now
  const c = sp.c, n = c.width * c.height;
  if (textPoolPx + n <= TEXT_POOL_PX) { const k = c.width + "x" + c.height; (textPool.get(k) || textPool.set(k, []).get(k)).push(c); textPoolPx += n; } else { c.width = 0; c.height = 0; }
}
function textEvict(keep) { // keep: the one about to be drawn - never freed under its own draw
  for (const [k, sp] of textSprites) {
    if (textPx <= TEXT_CACHE_PX && textSprites.size < TEXT_CACHE_MAX) return;
    if (k === keep) continue;
    textSprites.delete(k); textPx -= sp.c.width * sp.c.height; textFree(sp);
  }
}
let textCacheOn = true, textBuilding = false; // textBuilding: text() drawing a stamp - the old way, no recursion
function textSprite(str, x, y, size, color, outline, bold, shrink = 1) {
  if (!textCacheOn || textBuilding || !(size > 0) || (document.fonts && document.fonts.status !== "loaded") || !(ctx instanceof CanvasRenderingContext2D)) return false; // (not the GPU stand-in - aspira-glctx.js)
  const m = ctx.getTransform();
  if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || m.a <= 0 || Math.abs(m.a - m.d) > 1e-6 * m.a) return false; // only a plain scale
  const dev = size * m.a, q = Math.max(TEXT_Q, Math.round(dev / TEXT_Q) * TEXT_Q);
  const col = COL[color] || color, oc = outline ? COL[outline === true ? "bg" : outline] : "", blur = 0; // (no glow on text since 2026-10-14 - aspira-draw.js text)
  const key = str + "|" + col + "|" + oc + "|" + (bold ? 1 : 0) + "|" + q + "|" + blur.toFixed(1);
  let sp = textSprites.get(key);
  if (sp) { textSprites.delete(key); textSprites.set(key, sp); } // used: to the back of the line (the Map keeps insertion order - the front is the least recently used)
  else {
    sp = textStamp(str, q, color, outline, bold, m.a, blur);
    textSprites.set(key, sp); textPx += sp.c.width * sp.c.height; textEvict(key);
  }
  const k = dev / q * shrink, X = m.a * x + m.e, Y = m.d * y + m.f; // shrink: the same stamp, drawn smaller (perf, 2026-10-16: a fading number made a stamp per 0.5 px step - the cache sat full and thrashed)
  const st = CanvasRenderingContext2D.prototype.setTransform; // (the prototype's: the full-density layer's own would scale it - entCtx)
  st.call(ctx, 1, 0, 0, 1, 0, 0); // device px; only the transform changes, so it alone is put back (a save / restore a number was most of its cost)
  ctx.drawImage(sp.c, 0, 0, sp.w, sp.h, X - sp.ox * k, Y - sp.oy * k, sp.w * k, sp.h * k); /* (the stamp fills the corner of a bucket-sized canvas) */
  st.call(ctx, m);
  return true;
}
// a stamp built AHEAD of the frame that needs it (the next wave's lane labels, aspira-lanes.js laneTextWarm): the same key and the same stamp text() would make, `a` the scale of the layer it will be drawn on; true when it built one
function textWarm(str, size, color, a) {
  if (!textCacheOn || textBuilding || !(size > 0) || !(a > 0) || (document.fonts && document.fonts.status !== "loaded")) return false;
  const q = Math.max(TEXT_Q, Math.round(size * a / TEXT_Q) * TEXT_Q), key = str + "|" + (COL[color] || color) + "||0|" + q + "|0.0";
  if (textSprites.has(key)) return false;
  const sp = textStamp(str, q, color, false, false, a, 0);
  textSprites.set(key, sp); textPx += sp.c.width * sp.c.height; textEvict(key);
  return true;
}
// draw the text the old way (text(), aspira-draw.js) at q device px onto a canvas just big enough: its outline, its glow
let textMeasureX = null;
function textStamp(str, q, color, outline, bold, sc, blur) {
  const sz = q / sc; // the size in the caller's units, so the outline's caps (TEXT_STROKE_MAX, in those units) scale as before
  const mx = textMeasureX ||= document.createElement("canvas").getContext("2d");
  mx.font = (bold ? "bold " : "") + q + "px " + CANVAS_FONT;
  const w0 = mx.measureText(str).width, pad = Math.ceil(Math.min(sz * 0.32, TEXT_STROKE_MAX) * sc + blur * 2 + 2);
  const w = Math.ceil(w0 + 2 * pad), h = Math.ceil(q * 1.3 + 2 * pad), [bw, bh] = textBucket(w, h), free = textPool.get(bw + "x" + bh);
  let c = free && free.pop(); const main = ctx;
  if (c) { textPoolPx -= bw * bh; if (c.getContext("2d").reset) c.getContext("2d").reset(); else c.width = bw; }
  else { c = document.createElement("canvas"); c.width = bw; c.height = bh; textMade++; }
  const x = c.getContext("2d");
  delete x.shadowBlur; /* (a reused canvas may carry the full-density override of an earlier stamp) */
  if (main.__ent) { const sb = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "shadowBlur"), bk = warp.entScale || 1; Object.defineProperty(x, "shadowBlur", { configurable: true, get() { return sb.get.call(this) / bk; }, set(v) { sb.set.call(this, v * bk); } }); } // the glow as the full-density layer draws it
  const ox = w / 2, oy = h / 2;
  ctx = x; textBuilding = true;
  try { x.setTransform(sc, 0, 0, sc, ox, oy); text(str, 0, 0, sz, color, outline, bold); } finally { ctx = main; textBuilding = false; }
  return { c, w, h, ox, oy };
}
