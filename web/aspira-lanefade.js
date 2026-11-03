// /spire - A LANE FADING IN (split from aspira-lanes.js at its 500-line cap, 2026-11-03): which lit lanes are the fade layer's
// (laneSplit), the fade layer drawn in its box (laneFadeLayer), a boss lane's rise. Loads right after aspira-lanes.js.
// SMOOTH FADE-IN (owner, 2026-10-22: "boss lane fades in in steps, want it to be a smooth fade in / same with all lanes actually"): lanes
// were painted into the board picture, re-sent to the GPU at most every WARP_STAT_MS (600 ms on an iPhone, where each send stalls ~40 ms) at
// 1/LIT_STEPS of brightness - a 1-2 s fade showed as a few steps. In 3D a lane still FADING IN is drawn instead, at full brightness, on its
// own FADE LAYER - sent up once - and the bell's shader lays it over the board at the fade's brightness every frame (litA); once whole it goes
// to the board, and leaves the fade layer only when that board is on the GPU (warp.boardLanes), so it never blinks out between the two.
// One brightness for the layer: the lanes fading together light together (a wave's copies, a boss's lanes) - it is the least of theirs
const laneFadeGl = () => typeof warp !== "undefined" && warp.litOk === true && !(typeof laneGlOn === "function" && laneGlOn()) && !(typeof DIAG === "string" && DIAG.includes("nofade")); // the bell's shader takes the fade layer (warpLayersBind); diag nofade: no fade layer (the lanes light on the board - a stalling device at full brightness at once), to see what it costs
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
let LANE_FADE_OWN = !(typeof DIAG === "string" && DIAG.includes("fadeborrow")); // (diag fadeborrow: the old borrow, to compare)
// THE FADE LAYER IN ITS BOX (perf, 2026-10-31 - a 7.0.14 iPhone: its in-frame upload 41 ms on average, 529 at worst, and its build ~5 full 2048-px passes): every
// draw into it is strokeSoft's, so the rect those draws covered (laneRec) holds ALL of it - a rebuild clears the last one's box, masks and copies only its own, and
// the GPU copy is sent only the union of the boxes changed since its last upload (dirty, LANE_ALL: the whole layer). The same pixels: outside the box it was clear
const LANE_ALL = "all";
let laneRec = null; // { r }: while set, strokeSoft records the canvas rect it drew
const rectOr = (a, b) => { if (!a || !(a.w > 0 && a.h > 0)) return b && b.w > 0 && b.h > 0 ? b : a; if (!b || !(b.w > 0 && b.h > 0)) return a; const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; };
const laneFadeL = { sig: "", box: null, dirty: LANE_ALL };
function laneFadeLayer() { // under the board's camera: { cv, sig, a } or null (nothing fading in)
  if (!laneFadeGl()) return null;
  const { fade } = laneSplit(litLanes());
  if (!fade.length) return null;
  const a = Math.min(...fade.map(u => u.f)), sig = laneKeyCam() + "," + COL.bg + "|" + fade.map(u => laneKeyOf(u) + ":" + (u.star ? 1 : 0) + ":" + litLevel(u.a0, u.star)).join(",");
  if (sig !== laneFadeL.sig) {
    const L = laneFadeL; L.sig = "";
    L.cv ||= document.createElement("canvas");
    const x = L.cv.getContext("2d"); if (!x) throw new Error("lane fade: no 2d context");
    if (LANE_FADE_OWN) { // glow into L.cv itself, the line over it from L.lcv: the same pixels as the borrow's clear + glow + line
      L.lcv ||= document.createElement("canvas");
      const lx = L.lcv.getContext("2d"); if (!lx) throw new Error("lane fade: no 2d context");
      const W = laneW(), H = laneH(), whole = !L.box || L.cv.width !== W || L.cv.height !== H || L.lcv.width !== W || L.lcv.height !== H, old = whole ? null : L.box; // (whole: a first build or a new size - all cleared)
      laneLayer(L.lcv, lx, W, H, old); laneLayer(L.cv, x, W, H, old);
      let B = null; laneRec = { r: null }; try { strokeLit(lx, x, fade.map(u => ({ ...u, a: u.a0 }))); } finally { B = laneRec.r; laneRec = null; }
      if (B) {
        applyMask(x, GLOW_FALLOFF, B); applyMask(lx, 1, B);
        x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.drawImage(L.lcv, B.x, B.y, B.w, B.h, B.x, B.y, B.w, B.h);
      }
      L.dirty = whole || L.dirty === LANE_ALL ? LANE_ALL : rectOr(rectOr(L.dirty, old), B); L.box = B || { x: 0, y: 0, w: 0, h: 0 };
    } else {
      L.box = null; L.dirty = LANE_ALL;
      const S = laneSet(), { laneCv, lctx, glowCv, gctx } = S; // (the board's own line and glow layers as scratch: the board rebuilds its own next time)
      S.litKey = "";
      laneLayer(laneCv, lctx, laneW(), laneH()); laneLayer(glowCv, gctx, laneW(), laneH());
      strokeLit(lctx, gctx, fade.map(u => ({ ...u, a: u.a0 })));
      applyMask(gctx, GLOW_FALLOFF); applyMask(lctx, 1);
      if (L.cv.width !== laneW() || L.cv.height !== laneH()) { L.cv.width = laneW(); L.cv.height = laneH(); }
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
