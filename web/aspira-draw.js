// /aspira — canvas rendering. Every colour is a COL key (aspira-defs.js);
// fades are globalAlpha, never a colour with its own alpha.

const cv = document.getElementById("asp-cv");
// DESYNCHRONIZED canvases on ?desync=1 (perf, 2026-10-13): the low-latency path skips part of the compositor's queue - it can
// tear, so it is opt-in to try on a given browser (the board and the 3D bell, aspira-warp.js)
const DESYNC = typeof location !== "undefined" && /[?&]desync=1/.test(location.search);
let ctx = cv.getContext("2d", DESYNC ? { desynchronized: true } : undefined); // let: tower sprites and other offscreen draws borrow it
// The canvas fills the screen; the camera fits the 1000-unit chart into the
// band between the header and the bottom build bar. cam is in device pixels.
// THE ZOOM FITS THE PLAY BOX (owner, 2026-10-13: "the zoom should be adjusted so that either the top and bottom touch, or the
// sides", "center the rectangle on the remaining axis"): every screen shows the same box (phoneBox, aspira-positioning.js),
// as big as its band allows. (Fixed at 0.72 CSS px a unit 2026-10-11..13 - PHONE_ZOOM, still the box's measure)
// THE CORE: centred in the box, and so at the window's centre (owner, 2026-10-19; it sat 1.5 x as far from the top as the
// sides 2026-10-13..19). The box has two shapes, portrait and landscape (setPlayBox, aspira-positioning.js)
// DESKTOP ZOOM (owner, 2026-10-19: "allow scroll to zoom on desktop, default zoom out like 30% with the same limiting borders"): on a
// fine pointer the wheel (aspira-camera.js) sets viewZoom, the view's scale over the fit, in [ZOOM_MIN, ZOOM_MAX], about the CORE's
// fitted spot (no pan); it starts at ZOOM_DEFAULT. A touch screen stays at 1. cam.fit / fitOx / fitOy keep the fit: the GAMEPLAY box
// is the fit's at any zoom (fitView, aspira-positioning.js)
const cam = { k: 1, ox: 0, oy: 0, fit: 1, fitOx: 0, fitOy: 0 };
const ZOOM_WHEEL = typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches, ZOOM_MIN = 0.5, ZOOM_MAX = 1.5, ZOOM_DEFAULT = 0.7;
let viewZoom = ZOOM_WHEEL ? ZOOM_DEFAULT : 1;
function zoomApply() { // the view from the fit: x viewZoom about the core (a resize keeps the zoom, laid on the new fit)
  cam.k = cam.fit * viewZoom; cam.ox = cam.fitOx + CX * (cam.fit - cam.k); cam.oy = cam.fitOy + CY * (cam.fit - cam.k);
}
// the canvas draws at most RES_CAP device pixels per CSS pixel (owner: "need
// more perf"): a phone at 3x drew 3.4 million pixels a frame; 2x is 2.25x fewer
// for a barely softer line. EVERY dpr use in the game reads canvasDpr().
let RES_CAP_3D = 2; // full until frames run slow, then down to 1.25 (stepDetail, aspira-quality.js)
const canvasDpr = () => Math.min(window.devicePixelRatio || 1, RES_CAP_3D);
function resize() {
  const r = cv.getBoundingClientRect(), dpr = canvasDpr();
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  // the play box fits the WHOLE window (owner, 2026-10-13: "zoom should fit window!"; it fitted the band between the header
  // and the bottom bar, which left a gap above and below), centred on the other axis
  const k = Math.min(r.width / (2 * BOX_HX), r.height / (2 * BOX_HY));
  cam.fit = k * dpr; cam.fitOx = (r.width / 2 - CX * k) * dpr; cam.fitOy = (r.height / 2 - CY * k) * dpr;
  zoomApply();
}
// Re-fit ONLY when the canvas itself changes size (window resize). Nothing in
// the overlays — the placing note, a send-wave label rewrapping — may move the
// board (owner: nothing should bump the game).
// (the zoom/pan view in aspira-camera.js resets to this fit on a resize)
new ResizeObserver(() => { resize(); if (typeof fitK !== "undefined") fitK = cam.fit; }).observe(cv);

function poly(x, y, r, n, rot, star) {
  ctx.beginPath();
  const pts = star ? n * 2 : n;
  for (let i = 0; i < pts; i++) {
    const a = rot + i * Math.PI * 2 / pts, rr = star && i % 2 ? r * (star === true ? 0.45 : star) : r; // star: true, or the inner corners' share
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

// outline: a thick black stroke wrapped in a soft dark glow (shadow blur)
// under the fill, so overlapping damage numbers stay separate and readable
// outline: true = the background colour, or a palette key (the credits' white halo)
const TEXT_STROKE_MAX = 5;
// shrink: drawn this x smaller, from the stamp at `size` (a fading damage number's every step of shrink was a new stamp - aspira-textcache.js)
function text(str, x, y, size, color, outline = false, bold = false, shrink = 1) {
  if (typeof textSprite === "function" && textSprite(str, x, y, size, color, outline, bold, shrink)) return;
  size *= shrink; ctx.font = (bold ? "bold " : "") + size + "px " + CANVAS_FONT;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (outline) {
    ctx.save();
    const oc = COL[outline === true ? "bg" : outline];
    // AN OUTLINE ONLY, no glow on any text (owner, 2026-10-14: "remove all glow on numbers, just use an outline"; big text had a
    // soft shadow and a second stroke), stroke CAPPED (owner: big titles carried a slab of shadow)
    ctx.strokeStyle = oc; ctx.lineWidth = Math.min(size * 0.32, TEXT_STROKE_MAX); ctx.lineJoin = "round";
    ctx.strokeText(str, x, y);
    ctx.restore();
  }
  ctx.fillStyle = COL[color] || color; // a palette key, or a colour already resolved (the boss title's red)
  ctx.fillText(str, x, y);
}

// The board is drawn as a star chart: a graduated rim in hours, a polar
// graticule, a fixed star field, and the twelve lanes as fine orbit lines
// numbered at their entry like a chart's catalogue labels.
function roman(n) {
  const T = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, r] of T) while (n >= v) { out += r; n -= v; }
  return out || "0";
}

// the GRATICULE (rings, hour spokes, the graduated rim, the ruler) never
// changes for a given camera and palette, so it is drawn ONCE into a cached
// layer and stamped each frame (2026-10-05: it stroked 384 separate paths a
// frame); one cache per palette, the boss sky drawing it inverted
const gratSets = {};
function drawGraticule() {
  const key = [cv.width, cv.height, cam.k, cam.ox, cam.oy].join();
  let g = gratSets[COL.bg];
  if (!g || g.key !== key) {
    g = gratSets[COL.bg] ||= { cv: document.createElement("canvas") };
    g.key = key;
    g.cv.width = cv.width; g.cv.height = cv.height;
    const gx = g.cv.getContext("2d"), main = ctx;
    gx.setTransform(cam.k, 0, 0, cam.k, cam.ox, cam.oy);
    ctx = gx;
    try { drawGraticuleLive(); } finally { ctx = main; }
  }
  const m = ctx.getTransform(); // carries the screen shake: stamp the layer shaken too
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.drawImage(g.cv, m.e - cam.ox, m.f - cam.oy);
  ctx.restore();
}
function drawGraticuleLive() {
  ctx.strokeStyle = COL.grid; ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let r = 125; r <= 375; r += 125) { ctx.moveTo(CX + r, CY); ctx.arc(CX, CY, r, 0, 6.283); }
  for (let h = 0; h < 24; h++) {
    const a = h * Math.PI / 12 - Math.PI / 2;
    ctx.moveTo(CX + Math.cos(a) * INNER_R, CY + Math.sin(a) * INNER_R);
    ctx.lineTo(CX + Math.cos(a) * 480, CY + Math.sin(a) * 480);
  }
  ctx.stroke();
  // graduated rim: a tick per degree, longer every 5 (no hour labels: owner)
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(CX + 482, CY); ctx.arc(CX, CY, 482, 0, 6.283);
  ctx.moveTo(CX + 494, CY); ctx.arc(CX, CY, 494, 0, 6.283);
  for (let d = 0; d < 360; d++) {
    const a = d * Math.PI / 180 - Math.PI / 2, len = d % 15 === 0 ? 12 : d % 5 === 0 ? 7 : 3;
    ctx.moveTo(CX + Math.cos(a) * 482, CY + Math.sin(a) * 482);
    ctx.lineTo(CX + Math.cos(a) * (482 + len), CY + Math.sin(a) * (482 + len));
  }
  ctx.stroke();
  drawScaleBar();
}
// the chart's ruler (drawScaleBar) lives in aspira-lanes.js

// the lanes (strokes, labels, fades) are drawn by aspira-lanes.js

function drawBoard() {
  drawBoardLayers(); // (the slots and the first-tower arrow: warpEntities)
}

const LIFE_RINGS = 5, LIFE_GAP = 3.75; // (5 before the 25% shrink) // room kept for 5 rings of life segments (20 lives fill 3 and a bit)

function drawTower(t, ghost) {
  // drawn where the tower IS (it slides along its spoke), its slot's hex moved with it
  const b = TOWERS[t.kind], c0 = CELLS[t.cell], x = t.x ?? c0.x, y = t.y ?? c0.y;
  // its glowing body is a cached SPRITE (towerSprite): the glow is a shadow blur
  // stroked once per level, and at max level that was by far the costliest
  // draw of a late-game frame (profiled 2026-10-05). Stamped here 1:1 with the
  // canvas's pixels, then the label on top.
  const sp = towerSprite(t.kind, shownLvl(t), c0), w = sp.width / cam.k; // a chart tower's 9 points drawn as 4 glows
  ctx.save(); ctx.translate(x, y); ctx.scale(TOWER_DRAW_K, TOWER_DRAW_K); ctx.translate(-x, -y); // drawn smaller, clicked the same (aspira-defs.js)
  ctx.globalAlpha = ghost ? 0.55 : 1;
  ctx.drawImage(sp, x - w / 2, y - w / 2, w, w);
  // as BIG as fits (owner): every label is 3 monospace letters, 1.5 em wide, and
  // the hex is ~44 across inside its outline: 28 fits, 23 sits easier (owner: "reduce a bit"; was 12)
  // after TWO chart points the label gives way to the tower's STAT TRIANGLE
  // (owner, 2026-10-06; boardChart, aspira-skills.js) - the build at a glance
  if (hasSkills(t)) boardChart(t, x, y, ghost ? 0.55 : 1, c0); // ALWAYS the triangle, never the label (owner; was from the first point)
  else text(towerAb(t), x, y + 1, TOWER_LABEL_PX, b.color, false, true);
  ctx.restore(); ctx.globalAlpha = 1;
  if (!ghost) drawPickOutline(t, x, y, b.color);
}
// THE CLICKABLE AREA, DOTTED (owner, 2026-10-21: "for towers, add a dotted outline around the top layer's solid outline in order to
// indicate the clickable area"): exactly what a press hits (aspira-pick.js) - in 3D the hex grown by PICK_GROW (towerPts), in 2D
// towerPick's circle
const PICK_DASH = [3, 4], PICK_A = 0.45;
function drawPickOutline(t, x, y, color) {
  ctx.save(); ctx.strokeStyle = COL[color]; ctx.globalAlpha = PICK_A; ctx.lineWidth = 1.2; ctx.setLineDash(PICK_DASH); ctx.beginPath();
  if (phoneOn3d()) towerPts({ ...t, x, y }, PICK_GROW).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  else ctx.arc(x, y, CELL_S * PICK_GROW, 0, 6.283);
  ctx.closePath(); ctx.stroke(); ctx.restore();
}
// one sprite per kind + level + colours + zoom + the hex's turn (Horizon orbits
// the slots), drawn exactly as the tower used to be drawn each frame
const SOL_BEAM_W = 0.9, SOL_GLOW_A = 0.45 /* (bolder 1.2 / 0.7 tried 2026-10-07 and reverted - owner: "SOL was OK before") */, TOWER_LINE = 2.6, towerSprites = new Map(), TOWER_LABEL_PX = 23;
function towerSprite(kind, lvl, c0) {
  const b = TOWERS[kind], turn = Math.round(Math.atan2(c0.pts[0].y - c0.y, c0.pts[0].x - c0.x) * 90 / Math.PI); // 2-degree steps
  const key = [kind, lvl, COL[b.color], COL.bg, cam.k.toFixed(4), turn].join("|");
  let sp = towerSprites.get(key);
  if (sp) return sp;
  if (towerSprites.size > 300) towerSprites.clear();
  // ONE hex, no level rings and no max-level spokes (owner, 2026-10-07): the level
  // shows only in the glow, the build in the chart drawn on it (boardChart)
  const reach = CELL_S * TOWER_K + 4 + TOWER_GLOW[lvl - 1] * 1.6;
  sp = document.createElement("canvas");
  sp.width = sp.height = Math.ceil(2 * reach * cam.k);
  const sx = sp.getContext("2d"), main = ctx;
  sx.setTransform(cam.k, 0, 0, cam.k, sp.width / 2, sp.height / 2);
  const c = { x: 0, y: 0, pts: c0.pts.map(p => ({ x: p.x - c0.x, y: p.y - c0.y })) };
  ctx = sx;
  try {
    ctx.fillStyle = COL.bg; ctx.strokeStyle = COL[b.color]; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
    towerHex(c, TOWER_K); ctx.fill(); // the background colour under the tower (owner)
    ctx.shadowColor = COL[b.color]; ctx.shadowBlur = TOWER_GLOW[lvl - 1] * cam.k;
    // the glow stacks one pass per level, since a lone wide shadow thins out
    ctx.globalAlpha = 1; ctx.lineWidth = TOWER_LINE; // thinner (owner, 2026-10-06; was 4.5)
    towerHex(c, TOWER_K);
    for (let i = 0; i < lvl; i++) ctx.stroke();
  } finally { ctx = main; }
  towerSprites.set(key, sp);
  return sp;
}

function cellPath(c, k = 1) {
  ctx.beginPath();
  c.pts.forEach((p, i) => {
    const x = c.x + (p.x - c.x) * k, y = c.y + (p.y - c.y) * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  });
  ctx.closePath();
}

// Shown while placing: every OPEN slot at full strength (owner: "fully show"),
// free cells in the colour of the tower being placed (owner), occupied ones grey.
const SLOT_POOR_A = 0.3; // a free slot's outline and price when the bank cannot cover a tower
function drawCells(at = (c, fn) => fn()) { // at: 3D draws each slot flat at its own point (warpEntities)
  ctx.lineWidth = 2;
  CELLS.forEach((c, ci) => at(c, () => {
    if (!cellOpen(ci)) return; // a corner slot shows once its wave opens it
    const free = canPlace(ci);
    // before the first tower the free slots FLASH (owner; the build buttons used to)
    // a slot the bank cannot fill is FADED (owner, 2026-10-07), its price too
    if (!ui.build) { if (free) { const poor = G.money < towerCost("arc"), fade = poor ? SLOT_POOR_A : 1; cellPath(c, TOWER_K); ctx.strokeStyle = COL.white; ctx.lineWidth = 3.5; ctx.globalAlpha = fade * (G.towers.length ? 0.55 : 0.6 + 0.4 * Math.sin(performance.now() / 250)); ctx.stroke(); ctx.lineWidth = 2; ctx.globalAlpha = 0.9 * fade; text("-" + towerCost("arc") + "c", c.x, c.y, 14, "white"); } return; } // thicker, more opaque; the build price inside (owner)
    cellPath(c, TOWER_K);
    const col = COL[TOWERS[ui.build].color];
    if (free) { ctx.fillStyle = col; ctx.globalAlpha = 0.15; ctx.fill(); }
    ctx.strokeStyle = free ? col : COL.grid; ctx.globalAlpha = free ? 0.8 : 0.4; ctx.stroke();
  }));
  ctx.globalAlpha = 1;
}

// pink cross: "can't place here"
function drawBlocked(x, y, r) {
  ctx.strokeStyle = COL.pink; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
  ctx.stroke(); ctx.globalAlpha = 1;
}

// Every tower's reach is always drawn faintly; the selected tower (and the
// build ghost) draws at full strength. dim = the faint pass.
function drawRange(x, y, r, color, dim = false) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283);
  // only the SELECTED tower's disc is filled: a dim one's 2.5% fill was all
  // but invisible, and nine big discs (three a moon tower) were the costliest
  // single draw of a late frame (2026-10-05)
  if (!dim) { ctx.fillStyle = COL[color]; ctx.globalAlpha = 0.08; ctx.fill(); }
  ctx.strokeStyle = COL[color]; ctx.globalAlpha = dim ? 0.35 : 0.75; ctx.lineWidth = dim ? 2 : 3.5; ctx.stroke();
  ctx.globalAlpha = 1;
}

// a tower's range; the Reaper's outer HOLD ring (2x) is not drawn (owner),
// ARC's REACH ring (how far its arcs may land, chainReach) is, dashed (owner)
function drawTowerRange(t, dim, colKey) {
  const st = towerStats(t), r = st.range, col = colKey || TOWERS[t.kind].color;
  // Moons / Desolation: each moon's slowing circle INSTEAD of the tower's range (owner)
  if (st.moons) { for (const m of moonSpots(t, st)) drawRange(m.x, m.y, r, col, dim); return; }
  drawRange(t.x, t.y, r, col, dim);
  // a chart FRZ's moon ORBIT, drawn like its range (owner, 2026-10-08): faint always, bright when selected
  if (st.moonN) { const o = moonOrbit(t, st.moonN); ctx.beginPath(); ctx.ellipse(o.x, o.y, o.a, o.b, o.phi, 0, 6.283); ctx.strokeStyle = COL[col]; ctx.globalAlpha = (dim ? 0.35 : 0.75) * MOON_FX; ctx.lineWidth = dim ? 2 : 3.5; ctx.stroke(); ctx.globalAlpha = 1; }
  if (t.kind !== "arc") return;
  if (st.skill) return; // a chart ARC has no reach from the tower: each jump reaches from its own enemy (owner)
  ctx.beginPath(); ctx.arc(t.x, t.y, chainReach(st), 0, 6.283);
  ctx.strokeStyle = COL[col]; ctx.setLineDash([8, 10]); ctx.lineWidth = dim ? 1.5 : 2.5;
  ctx.globalAlpha = dim ? 0.2 : 0.5; ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}

// an area effect's disc (owner): a radial gradient from nothing at the centre
// to GRAD_EDGE (10%) at the outline - Plague/Bloom, Contagion, Whiteout, Shatter, Supernova
const GRAD_EDGE = 0.1; // owner: 50% -> 10%
function gradDisc(x, y, r, col, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "transparent"); g.addColorStop(1, col);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283);
  ctx.fillStyle = g; ctx.globalAlpha = GRAD_EDGE * a; ctx.fill();
}
const DMG_HOLD = 0.1; // s a damage number stays whole before it shrinks + fades (owner: 0.5 was too long)
const TWIN_GAP = 3.5; // Charge's parallel beams sit 2 x this apart
// Two passes so towers sit on top of their own shots but under the numbers:
// pass "shots" draws beams/rings/sparks, pass "text" draws floating numbers.
// Passes: "dmg" = damage numbers (`under` text), drawn right over the
// background beneath everything else (owner); "shots" = beams/rings/sparks;
// "text" = every other floating text, on top.
// at / map (3D, warpEntities): each effect drawn flat at its spot; a beam STRAIGHT between its projected ends (owner: "make beams 3d and ignore the curvature")
function drawFx(pass, at = (x, y, fn) => fn(), map = null) {
  const glFx = pass === "shots" && typeof fxGlTake === "function" && fxGlTake(); // 3D: hits, sparks, flashes and rings go to the GPU in one batch (aspira-fxgl.js)
  for (const f of fx) {
    const kind = f.k !== "text" ? "shots" : f.under ? "dmg" : "text";
    if (kind !== pass || f.t >= f.life) continue; // a retired damage number (dmgNumber) is not drawn
    // full strength for the first half of the effect's life, then fade out
    const k = 1 - f.t / f.life;
    if (glFx && fxGlFx(f, k, Math.min(1, k * 2))) continue; // (before the canvas's alpha is touched: thousands a frame)
    ctx.globalAlpha = Math.min(1, k * 2);
    const one = () => {
    if (f.k === "beam") {
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * (f.alpha ?? 1) * BEAM_BRIGHT); // ARC: an arc as opaque as its damage share; x BEAM_BRIGHT (owner)
      // glow underlay + core, both widening with the damage behind the shot
      ctx.strokeStyle = COL[f.color]; ctx.lineCap = "round";
      // a following beam reads its endpoints live from the tower/enemy it joins
      const x1 = f.a ? f.a.x : f.x1, y1 = f.a ? f.a.y : f.y1, x2 = f.b ? f.b.x : f.x2, y2 = f.b ? f.b.y : f.y2;
      const pt = (x, y) => (map ? map(x, y) : { x, y, s: 1 }), B = pt(x2, y2), ws = map ? cam.k * (pt(x1, y1).s + B.s) / 2 : 1;
      if (map) ctx.setTransform(1, 0, 0, 1, 0, 0); // device px: the ends are already projected
      ctx.beginPath();
      if (f.beams > 1) {
        // Charge / Quad / Horizon: n beams, 2 x TWIN_GAP apart at the tower,
        // CONVERGING on the enemy (owner)
        const len = Math.hypot(x2 - x1, y2 - y1) || 1, px = -(y2 - y1) / len, py = (x2 - x1) / len;
        for (let i = 0; i < f.beams; i++) {
          const o = (i - (f.beams - 1) / 2) * 2 * TWIN_GAP;
          const A = pt(x1 + px * o, y1 + py * o); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
        }
      } else { const A = pt(x1, y1); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
      // the core's width is the DAMAGE of this hit (owner: every tower) - a
      // multi-beam shot's beams each carry the whole hit (rayHit)
      const core = (f.soft ? BEAM_MIN + ((f.bw ??= beamWidth(f.d || 0)) - BEAM_MIN) * ARC_W_CORR : (f.bw ??= beamWidth(f.d || 0))) * (f.thin || 1) * ws; // (soft: a chart ARC's, flatter with damage - aspira-skills.js; thin: its leaps)
      if (f.m) {
        const a = ctx.globalAlpha;
        if (f.slim) {
          // RPR (owner): a super-bright WHITE core in a pink glow that is a
          // GRADIENT - densest at the core, fading out by twice its width.
          // Four nested strokes, widest first, stack into that falloff.
          for (let i = 4; i >= 1; i--) {
            ctx.globalAlpha = Math.min(1, a * SOL_GLOW_A * BEAM_BRIGHT); ctx.lineWidth = core * SOL_BEAM_W * (1 + i * 0.25); ctx.stroke(); // SOL: thicker, more opaque (owner, 2026-10-06; was 0.5 wide, 0.3)
          }
        } else {
          ctx.globalAlpha = Math.min(1, a * (f.soft ? ARC_GLOW_A : 0.22) * BEAM_BRIGHT); ctx.lineWidth = core * (f.soft ? ARC_GLOW_W : 3); ctx.stroke(); // soft: a chart ARC's (aspira-skills.js)
        }
        ctx.globalAlpha = a;
      }
      if (f.slim) { ctx.strokeStyle = COL.white; ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.5); }
      ctx.lineWidth = f.slim ? core * SOL_BEAM_W : core; ctx.stroke();
      // Ion: a thin WHITE core down the middle of the arc - it pierces (owner)
      if (f.pierce) { ctx.strokeStyle = COL.white; ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.35); ctx.stroke(); }
    } else if (f.k === "hit") {
      const a = ctx.globalAlpha, rr = f.r * (0.5 + 0.5 * (1 - k));
      ctx.fillStyle = COL[f.color]; ctx.globalAlpha = a * 0.3;
      ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, 6.283); ctx.fill();
      ctx.strokeStyle = COL[f.color]; ctx.globalAlpha = a; ctx.lineWidth = 1 + f.m * 0.6; ctx.stroke();
    } else if (f.k === "flash") {
      // Execute / Verdict: a white flash where the enemy was (owner)
      ctx.fillStyle = COL.white; ctx.globalAlpha = k;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.3 - 0.3 * k), 0, 6.283); ctx.fill();
    } else if (f.k === "blast") {
      // Supernova / Collapse: a filled blast that lingers (owner)
      const a = ctx.globalAlpha, rr = f.r * (0.85 + 0.15 * (1 - k));
      gradDisc(f.x, f.y, rr, COL[f.color], a); // same gradient fill as the other area discs (owner)
      ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, 6.283);
      ctx.strokeStyle = COL[f.color]; ctx.globalAlpha = a; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (f.k === "zen") {
      // Zen's wave: its front spreads to the pulse's reach and FADES TO
      // NOTHING as it gets there (owner)
      const p = Math.min(1, f.t / f.life);
      gradDisc(CX, CY, Math.max(1, f.r * p), COL.white, 1 - p);
    } else if (f.k === "ring") {
      if (f.grad) { const a = ctx.globalAlpha; gradDisc(f.x, f.y, f.r * (1 - k * 0.5), COL[f.color], a); ctx.globalAlpha = a; }
      if (f.outline === false) return; // Zen's pulse: the gradient wave alone
      ctx.strokeStyle = COL[f.color]; ctx.lineWidth = f.w || 2; if (f.a) ctx.globalAlpha *= f.a; // a: a fainter ring (Capacitance's burst)
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.5), 0, 6.283); ctx.stroke();
    } else if (f.k === "cone") {
      drawCone(f, k); // SOL's Refract light cone (aspira-skills.js)
    } else if (f.k === "spark") {
      ctx.fillStyle = COL[f.color]; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3);
    } else if (f.k === "text") {
      // a DAMAGE number holds DMG_HOLD s, then shrinks and fades together, at
      // the same rate, to nothing at the end of its life (owner)
      const sh = f.under || f.shrink; // the kill's "+Nc" too (owner)
      const g = sh ? (f.t < DMG_HOLD ? 1 : Math.max(0, (f.life - f.t) / Math.max(0.01, f.life - DMG_HOLD))) : 1;
      if (sh) ctx.globalAlpha = g;
      ctx.globalAlpha *= f.alpha ?? 1;
      at(f.x, f.y, () => text(f.text, f.x, f.y, f.size, dmgColor(f), f.outline, false, g)); // (armor-blunted: greyer with the share taken; g: shrunk from ONE stamp)
    }
    };
    if (f.k === "beam" || f.k === "text" || !map) one(); else at(f.x ?? CX, f.y ?? CY, one, f);
  }
  ctx.globalAlpha = 1;
}

// The ghost under the pointer: tower + range in its colour when the tap would
// build, a pink cell and cross when it would not (occupied, or too few
// credits), and a bare pink cross off the grid.
function drawPlacement() {
  const hc = snapCell(ui.hover.x, ui.hover.y), b = TOWERS[ui.build];
  if (hc < 0) { drawBlocked(ui.hover.x, ui.hover.y, 12); return; }
  const c = CELLS[hc];
  if (canPlace(hc) && G.money >= towerCost(ui.build)) {
    drawRange(c.x, c.y, towerStats({ kind: ui.build, lvl: 1 }).range, b.color);
    drawTower({ kind: ui.build, cell: hc, lvl: 1 }, true);
    return;
  }
  cellPath(c, TOWER_K); ctx.fillStyle = COL.pink; ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
  drawBlocked(c.x, c.y, 14);
}

// The core taking damage SHAKES the screen (owner): a jolt that decays over
// SHAKE_LEN real seconds. Leaks in a burst re-arm it rather than stacking.
const SHAKE_LEN = 0.35, SHAKE_PX = 14;
let shakeUntil = 0;
function shakeScreen() { shakeUntil = performance.now() / 1000 + SHAKE_LEN; }
function shakeOffset() {
  const left = shakeUntil - performance.now() / 1000;
  if (left <= 0) return [0, 0];
  const a = SHAKE_PX * canvasDpr() * (left / SHAKE_LEN);
  return [(Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a];
}

// the BOARD under everything - in 3D its own layer, redrawn only every WARP_STAT_MS (aspira-warplayers.js)
function drawSceneBase() {
  ctx.fillStyle = COL.bg; ctx.globalAlpha = 1; ctx.fillRect(CX - 4000, CY - 4000, 8000, 8000);
  drawBoard();
}
// everything that MOVES, over the board - in 3D its own layer, every frame
function drawSceneTop() {
  drawBossBar(); // a live boss's HP line along the horizon, UNDER the towers and their effects (owner)
  const sel = ui.sel && G.towers.find(t => t.id === ui.sel);
  const ranges = k => () => { for (const t of G.towers) if (t !== sel) drawTowerRange(t, !k, k); if (sel) drawTowerRange(sel, false, k); }; // (sky: every one at full strength - "range should be visible during boss waves") // tower colours survive the boss sky (2026-10-11) - but RANGES go white, unkept, so the inversion turns them BLACK (owner, 2026-10-12)
  if (skyOn()) ranges("white")(); else skyKeep(ranges());
  // BEAMS turn over with the boss sky (owner, 2026-10-11: "inversion should invert tower movement indicators and tower
  // beams"; they kept their colours since earlier that day) - only the towers and their ranges keep theirs
  drawTethers(); drawAcd(); drawGrv(); drawCar(); drawIfr(); skyKeep(() => drawIfr(true)); skyKeep(() => drawCar(true)); drawAims(); drawFx("shots"); // on the board in 3D too (owner: "beams and tower effects can appear on the plane")
  drawCoreFx(); if (G.core) drawTimeStop(G.core); /* (3D's Relay hexagons: drawRelayHex3d, on the overlay before the towers) */ // the core's struts and beams, under the towers (aspira-core.js); 3D: Temporal Drive's field ON the floor
  // in 3D the towers, the core and the enemies are drawn FLAT over the bell instead (warpEntities, aspira-warp.js)
  skyKeep(drawLeash); // the movement indicator keeps its TOWER'S colour on a boss sky (owner, 2026-10-19: "should not be inverted in color"; it turned over with the sky, owner 2026-10-11)
  drawSlotFlash(); drawDrips(); drawCoins(); skyKeep(drawUpPlus); /* (aspira-towers.js) - the upgrade chevron and its hex keep the TOWER'S colour on a boss sky (owner, 2026-10-16: "Tower upgrade indicators should retain color on inversion") */ if (typeof drawThreat === "function") skyKeep(drawThreat); // (drawThreat: the nearest danger's ring and spoke, aspira-ui.js) a corner slot that just opened (aspira-waves.js); the credits flying home (aspira-floats.js)
}
// the whole palette inverted while fn draws (invertColor keeps alpha); the
// inverted set is built once, COL being fixed after resolveColors
let colOwn = null, colInv = null, inverted = false;
function withPalette(fn) {
  colOwn ||= { ...COL };
  colInv ||= Object.fromEntries(Object.entries(colOwn).map(([k, v]) => [k, invertColor(v)]));
  Object.assign(COL, colInv); inverted = true;
  try { fn(); } finally { Object.assign(COL, colOwn); inverted = false; }
}
function ownColours(fn) {
  if (!inverted) { fn(); return; }
  Object.assign(COL, colOwn);
  try { fn(); } finally { Object.assign(COL, colInv); }
}
