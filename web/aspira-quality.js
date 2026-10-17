// /spire - DISPLAY MODE (2026-10-16, owner: "remove the other quality levels. optimize only 3D"): the game is the 3D view.
// qMode is "3d", or "flat" for a browser that cannot make a WebGL context (aspira-ui.js frame switches to it once, so such a
// device sees the board drawn flat instead of nothing). The 2D drawing paths stay for that fallback and for the smoke test
// (no WebGL there); the slider, the High and Low looks and the automatic step-down between them are gone. Loaded just BEFORE aspira-draw.js.
let qMode = "3d";
const q3d = () => qMode === "3d";
const updateQuality = () => $("asp").classList.toggle("asp-3d", q3d());
// no WebGL: the flat picture (called once by the frame loop when warpInit() finds no context)
function flatFallback() {
  qMode = "flat";
  if (typeof towerSprites !== "undefined") towerSprites.clear();
  if (typeof resize === "function") { resize(); if (typeof fitK !== "undefined") fitK = cam.fit; }
  updateQuality();
}
// DETAIL BY DISTANCE (owner, 2026-10-12: "details by distance yes"): in 3D, past DETAIL_FAR_R from the core - the far half of
// the board, where little is decided - no tracers, no hit flashes, no damage numbers, and swarmers draw flat (CPU per frame
// was the slow machines' limit); the centre keeps everything
// ...SCALED BY THE FRAME RATE (owner, 2026-10-12: "3d detail by distance should be scaled based on FPS - try to stay above 600
// units"): the radius shrinks while frames run slow (an average over DETAIL_SLOW_MS) and grows back while they are quick, never
// under DETAIL_MIN_R; a fast machine keeps every detail everywhere
const DETAIL_MIN_R = 600, DETAIL_MAX_R = 1600, DETAIL_SLOW_MS = 28, DETAIL_FAST_MS = 20, DETAIL_RATE = 300; // RATE: world units a second
let detailFarR = DETAIL_MAX_R, detailEma = 16;
const warpTexCap = 2048; // the 3D board picture's side, px (aspira-warplayers.js): it stays at its best
function stepDetail(dt) {
  if (!(dt > 0) || dt > 0.5) return;
  detailEma += (dt * 1000 - detailEma) * 0.05;
  const slow = detailEma > DETAIL_SLOW_MS, quick = detailEma < DETAIL_FAST_MS;
  // slow: the detail radius comes in (glows always stay - owner, 2026-10-12); quick: back out. (Until 2026-10-14 the 3D picture,
  // then the view's resolution, then its pixel density shrank after it)
  // ...ONLY the detail radius now (owner, 2026-10-14: never lower the resolution; slow logs: the picture shrinking and growing
  // back, 1024 <-> 2048 and res 0.5 <-> 0.75, reallocated the big 3D canvases over and over - 380-540 ms hitches on an iPhone,
  // and a likely cause of its crashes): the 3D picture and resolution stay at their best
  if (slow) { if (detailFarR > DETAIL_MIN_R) detailFarR = Math.max(DETAIL_MIN_R, detailFarR - DETAIL_RATE * dt); }
  else if (quick) detailFarR = Math.min(DETAIL_MAX_R, detailFarR + DETAIL_RATE * dt);
}
const farFx = e => q3d() && (e.x - CX) ** 2 + (e.y - CY) ** 2 > detailFarR * detailFarR;
/* DIAGNOSTICS (2026-10-16: an empty board cost a Brave laptop ~38 ms a frame - is it the canvases or the page's own layers?): localStorage "spire.diag" holds a comma list read once at load:
   nocanvas = the board is not drawn at all (the frame loop still runs), nohud = the HUD panels are hidden (visibility). The slow log reports it, so a run's avgMs can be read against it */
const DIAG = (() => { try { return localStorage.getItem("spire.diag") || ""; } catch (e) { return ""; } })();
if (DIAG.includes("nohud")) document.documentElement.classList.add("asp-diag-nohud");
