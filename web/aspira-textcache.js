// /spire - TEXT AS STAMPS (owner, 2026-10-14: "a 10x improvement on perf ... avoid lowering resolution or reducing visual
// clarity"). A late 3D wave drew ~350 damage numbers a frame, each a fresh outline stroke and fill of glyphs on the
// full-density layer - 16 of a 26 ms frame on a desktop RTX (profiled with the GPU synced). Each text (its string, colour,
// outline, weight) is drawn ONCE at its real size in device pixels onto a small canvas of its own, and stamped from then
// on: one image a number, still at its exact pixel size, so it is as sharp as before. Sizes are kept in TEXT_Q px steps
// (a 1-2% scale at most). text() (aspira-draw.js) asks here first; under a skewed or rotated transform, before the font has
// loaded, or with the cache off, it draws the old way. Loaded after aspira-draw.js.
/* a desktop (a fine pointer) holds 3x the stamps: the slow logs showed the cache pinned at 899 of 900 on an RTX in late waves, every miss a new canvas (perf, 2026-10-17); phones keep the small budget */
const TEXT_BIG = (() => { try { return matchMedia("(pointer: fine)").matches && !/iPhone|iPad|Android/.test(navigator.userAgent); } catch (e) { return false; } })();
const TEXT_Q = 0.5, TEXT_CACHE_MAX = TEXT_BIG ? 2700 : 2200; /* (phones: the 6M px budget below is the memory bound; 900 stamps held only ~2.3M px and churned 27 builds a second in a wave-73-80 phone log) */
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
// STAMPS SHARE A FEW BIG CANVASES (perf, 2026-10-31 - a 7.0.14 iPhone log: 1978 stamps in 173 s, every one a NEW canvas - the cache never filled, so the pool
// above never refilled - and 37 of its 71 slow frames made one): a stamp is a slot on an atlas PAGE (TEXT_PAGE px a side, at most TEXT_PAGES of them), packed
// on shelves of its bucket's height, TEXT_GUT px of clear round each so a scaled draw never samples its neighbour; a dropped stamp's slot is reused by the
// next of its height that fits (textSlotFree). Drawn exactly as on its own canvas - the same transform from the slot's corner, clipped to the slot - and stamped
// from its sub-rect. A stamp too big for a page, or with every page full, gets its own canvas as before
const TEXT_PAGE = 1024, TEXT_PAGES = TEXT_BIG ? 18 : 6, TEXT_GUT = 2;
const textPages = [], textSlotFree = new Map(); // pages: { c, x, shelves: [{ y, h, x }], top }; free slots by height: [{ p, x, y, w, h }]
// a slot a stamp may take: no smaller, at most 2 buckets taller and 32 px wider (the stamp sits in its corner)
const textSlotFits = (s, bw, bh) => s.h >= bh && s.h <= bh + 16 && s.w >= bw && s.w <= bw + 32;
function textSlot(bw, bh) {
  if (bw + 2 * TEXT_GUT > TEXT_PAGE || bh + 2 * TEXT_GUT > TEXT_PAGE / 4) return null;
  for (let h = bh; h <= bh + 16; h += 8) { const fl = textSlotFree.get(h); if (fl) for (let i = 0; i < fl.length; i++) if (textSlotFits(fl[i], bw, bh)) return fl.splice(i, 1)[0]; }
  const W = bw + 2 * TEXT_GUT, H = bh + 2 * TEXT_GUT;
  for (const p of textPages) {
    for (const s of p.shelves) if (s.h === H && s.x + W <= TEXT_PAGE) { const sl = { p, x: s.x + TEXT_GUT, y: s.y + TEXT_GUT, w: bw, h: bh }; s.x += W; return sl; }
    if (p.top + H <= TEXT_PAGE) { p.shelves.push({ y: p.top, h: H, x: W }); const sl = { p, x: TEXT_GUT, y: p.top + TEXT_GUT, w: bw, h: bh }; p.top += H; return sl; }
  }
  if (textPages.length >= TEXT_PAGES) return textSlotTake(bw, bh);
  const c = document.createElement("canvas"); c.width = TEXT_PAGE; c.height = TEXT_PAGE; const x = c.getContext("2d"); if (!x) { c.width = 0; c.height = 0; return null; } // (iOS past its canvas budget: the old way)
  textMade++; textPages.push({ c, x, shelves: [], top: 0 });
  return textSlot(bw, bh);
}
// EVERY PAGE FULL (2026-10-31 - a 7.0.17 iPhone log, waves 15-31: shelves and gutters filled the 6 pages before the px budget evicted anything, and 722 stamps
// went back to a canvas each): the least recently used stamp whose slot fits gives it up, rather than a new canvas; none fits - its own canvas, as before.
// (The page cap stays: it holds the atlas's memory)
let textTaken = 0; /* slots taken from a live stamp, for the slow logs */
function textSlotTake(bw, bh) {
  for (const [k, sp] of textSprites) if (sp.slot && textSlotFits(sp.slot, bw, bh)) { textSprites.delete(k); textPx -= sp.px; textTaken++; return sp.slot; }
  return null;
}
function textFree(sp) { // a dropped stamp: its atlas slot back for reuse; its own canvas back to its bucket while the spare pool is small, else zeroed so iOS frees it now
  if (sp.slot) { const s = sp.slot, fl = textSlotFree.get(s.h); if (fl) fl.push(s); else textSlotFree.set(s.h, [s]); return; }
  const c = sp.c, n = c.width * c.height;
  if (textPoolPx + n <= TEXT_POOL_PX) { const k = c.width + "x" + c.height; (textPool.get(k) || textPool.set(k, []).get(k)).push(c); textPoolPx += n; } else { c.width = 0; c.height = 0; }
}
function textEvict(keep) { // keep: the one about to be drawn - never freed under its own draw
  for (const [k, sp] of textSprites) {
    if (textPx <= TEXT_CACHE_PX && textSprites.size < TEXT_CACHE_MAX) return;
    if (k === keep) continue;
    textSprites.delete(k); textPx -= sp.px; textFree(sp);
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
    textSprites.set(key, sp); textPx += sp.px; textEvict(key);
  }
  const k = dev / q * shrink, X = m.a * x + m.e, Y = m.d * y + m.f; // shrink: the same stamp, drawn smaller (perf, 2026-10-16: a fading number made a stamp per 0.5 px step - the cache sat full and thrashed)
  const st = CanvasRenderingContext2D.prototype.setTransform; // (the prototype's: the full-density layer's own would scale it - entCtx)
  st.call(ctx, 1, 0, 0, 1, 0, 0); // device px; only the transform changes, so it alone is put back (a save / restore a number was most of its cost)
  ctx.drawImage(sp.c, sp.sx, sp.sy, sp.w, sp.h, X - sp.ox * k, Y - sp.oy * k, sp.w * k, sp.h * k); /* (the stamp fills the corner of a bucket-sized slot: its page's, or its own canvas's at 0, 0) */
  st.call(ctx, m);
  return true;
}
// a stamp built AHEAD of the frame that needs it (the next wave's lane labels, aspira-lanes.js laneTextWarm): the same key and the same stamp text() would make, `a` the scale of the layer it will be drawn on; true when it built one
function textWarm(str, size, color, a) {
  if (!textCacheOn || textBuilding || !(size > 0) || !(a > 0) || (document.fonts && document.fonts.status !== "loaded")) return false;
  const q = Math.max(TEXT_Q, Math.round(size * a / TEXT_Q) * TEXT_Q), key = str + "|" + (COL[color] || color) + "||0|" + q + "|0.0";
  if (textSprites.has(key)) return false;
  const sp = textStamp(str, q, color, false, false, a, 0);
  textSprites.set(key, sp); textPx += sp.px; textEvict(key);
  return true;
}
// draw the text the old way (text(), aspira-draw.js) at q device px onto a canvas just big enough: its outline, its glow
let textMeasureX = null;
function textStamp(str, q, color, outline, bold, sc, blur) {
  const sz = q / sc; // the size in the caller's units, so the outline's caps (TEXT_STROKE_MAX, in those units) scale as before
  const mx = textMeasureX ||= document.createElement("canvas").getContext("2d");
  mx.font = (bold ? "bold " : "") + q + "px " + CANVAS_FONT;
  const w0 = mx.measureText(str).width, pad = Math.ceil(Math.min(sz * 0.32, TEXT_STROKE_MAX) * sc + blur * 2 + 2);
  const w = Math.ceil(w0 + 2 * pad), h = Math.ceil(q * 1.3 + 2 * pad), [bw, bh] = textBucket(w, h), main = ctx, ox = w / 2, oy = h / 2, slot = textSlot(bw, bh);
  if (slot) { // on an atlas page: cleared and clipped to its slot, drawn from the slot's corner (the transform a canvas of its own would get, moved there)
    const x = slot.p.x;
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.beginPath(); x.rect(slot.x, slot.y, slot.w, slot.h); x.clip(); x.clearRect(slot.x, slot.y, slot.w, slot.h);
    delete x.shadowBlur; textEntBlur(x, main);
    ctx = x; textBuilding = true;
    try { x.setTransform(sc, 0, 0, sc, slot.x + ox, slot.y + oy); text(str, 0, 0, sz, color, outline, bold); } finally { ctx = main; textBuilding = false; x.restore(); }
    return { c: slot.p.c, sx: slot.x, sy: slot.y, w, h, ox, oy, px: slot.w * slot.h, slot };
  }
  const free = textPool.get(bw + "x" + bh);
  let c = free && free.pop();
  if (c) { textPoolPx -= bw * bh; if (c.getContext("2d").reset) c.getContext("2d").reset(); else c.width = bw; }
  else { c = document.createElement("canvas"); c.width = bw; c.height = bh; textMade++; }
  const x = c.getContext("2d");
  delete x.shadowBlur; /* (a reused canvas may carry the full-density override of an earlier stamp) */
  textEntBlur(x, main);
  ctx = x; textBuilding = true;
  try { x.setTransform(sc, 0, 0, sc, ox, oy); text(str, 0, 0, sz, color, outline, bold); } finally { ctx = main; textBuilding = false; }
  return { c, sx: 0, sy: 0, w, h, ox, oy, px: bw * bh, slot: null };
}
// the glow as the full-density layer draws it: a stamp for that layer reads shadowBlur through its scale
function textEntBlur(x, main) {
  if (main.__ent) { const sb = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "shadowBlur"), bk = warp.entScale || 1; Object.defineProperty(x, "shadowBlur", { configurable: true, get() { return sb.get.call(this) / bk; }, set(v) { sb.set.call(this, v * bk); } }); }
}
