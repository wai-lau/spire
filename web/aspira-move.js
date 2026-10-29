// /aspira - TOWERS MOVE: the leash, legal spots and moveTower, and what is drawn on a tower beside its shots (the upgrade
// chevrons and rings, the leash and its arrows, the tower hex and its level glow). Split from aspira-towers.js at its cap;
// loaded right after it (the simulator too, sim.mjs FILES).

// ---------- towers MOVE (owner, 2026-10-10: "all of the towers can be dragged") ----------
// The player DRAGS a tower, any time, and it follows the finger while held - firing the
// whole way (aspira-camera.js); it never moves itself in a real game (the simulator's
// stand-in player does: autoPosition, aspira-positioning.js). It stays inside its LEASH,
// a circle round its own slot (its SPAWN), radius leashR - the slide travel it had on its
// spoke (2026-10-03 .. 2026-10-09; slideLimits below), so it reaches as far out as it did.
// The curve's slide grows it with the tower's total level (aspira-curve.js, owner 2026-10-26); a tower is where the finger is.
// THE LEASH BY KIND (owner, 2026-10-13: "do an audit of the tower movements now that the cap makes more sense" - "ok fix"): the
// phone's screen caps where a tower may stand (phoneInside, aspira-positioning.js), so each leash is its own length, sized so
// its slide tiers have room - about a third of the phone at base, all of it by tier V (and further at the capstone, VI). MOVE_BASE x the tier's slide
// (the curve's slide, once SKILL_MOVE by axis), up to SLIDE_MAX. (Was the old spoke's travel x MOVE_SPAN 3.375: ARC 434, FRZ 519, ACD 869 - most of the
// phone before a tier, so the slide tiers bought nothing - and SLIDE_MAX 2 voided every tier past x2; SOL halved to 74 that day)
const MOVE_BASE = { arc: 200, frz: 240, acd: 280, sol: 222 /* x3 (owner, 2026-10-26: "keep SOL range, and only 3x SOL mvmt range instead of 5x"; was 74) */, grv: 200, crr: 240 /* swapped with its range (owner, 2026-10-16: "Swap carrier mvmt range and range") */ /* 130: between SOL and ARC (owner, 2026-10-16: "give carrier some movement range actually, less than ARC, more than SOL, update range to match"); was 0 */, ifr: 120 /* 200 -> 120 (owner, 2026-10-20: "unnecessarily large") */ /* medium, like ARC and GRV (owner's design, 2026-10-19) */ }, SLIDE_MAX = 3;
const MOVE_EDGE = 12; // world units kept clear of the screen's edge
const leashR = t => MOVE_BASE[t.kind] * Math.min(towerStats(t, true).slide, SLIDE_MAX);
const slideSpan = t => Math.round(leashR(t)); // the card's Leash row
const towerAt = p => G.towers.find(t => Math.hypot(p.x - t.x, p.y - t.y) <= CELL_S);
// two towers' centres stay TOWER_GAP apart (a hex each plus a sliver), and the core
// blocks a tower only where their outlines would meet (owner, 2026-10-12: "right now
// there's an air gap"; was a SLOT_R circle): two pointy hexes of one orientation touch
// when the offset lies on a hex of their summed radii, coreKeep(a) out along angle a
const towerGap = () => 2 * CELL_S * TOWER_K + 4;
const coreKeepR = () => (typeof coreOuterR === "function" ? coreOuterR() : CORE_R) + CELL_S * TOWER_K + 2;
const KEEP_MAX = 2 / Math.sqrt(3) + 1e-6; // coreKeep at a hex corner over coreKeepR (its widest)
const coreKeep = a => { const s = Math.PI / 3, f = ((a % s) + s) % s; return coreKeepR() * Math.sqrt(3) / 2 / Math.cos(Math.min(f, s - f)); };
// the legal spot nearest p for t: inside its leash, off the core, clear of the
// other towers - or null when no nudge finds one (it then stays where it is)
function legalSpot(t, p) {
  const c = CELLS[t.cell], L = leashR(t), gap = towerGap(), edge = CELL_S * TOWER_K + MOVE_EDGE;
  let x = p.x, y = p.y, moved;
  const away = (ox, oy, min) => { const d = Math.hypot(x - ox, y - oy) || 1e-6; if (d < min) { x = ox + (x - ox) * min / d; y = oy + (y - oy) * min / d; moved = true; } };
  // (2026-10-15, simulation speed: a pass that moves nothing ends the nudging - most spots are legal as asked, and paid 4 passes;
  // the core's hex is never wider than KEEP_MAX x coreKeepR, so a spot clear of that skips its angle maths)
  const KR = coreKeepR(), keepMax2 = (KR * KEEP_MAX) ** 2, on3d = phoneOn3d(); // (asked once a call, not once a test - perf)
  const keep = a => { const s = Math.PI / 3, f = ((a % s) + s) % s; return KR * Math.sqrt(3) / 2 / Math.cos(Math.min(f, s - f)); }; // coreKeep, KR fixed
  for (let i = 0; i < 4; i++) {
    moved = false;
    for (const o of G.towers) if (o !== t) away(o.x, o.y, gap);
    if ((x - CX) ** 2 + (y - CY) ** 2 < keepMax2) away(CX, CY, keep(Math.atan2(y - CY, x - CX)));
    const d = Math.hypot(x - c.x, y - c.y);
    if (d > L) { x = c.x + (x - c.x) * L / d; y = c.y + (y - c.y) * L / d; moved = true; }
    if (!phoneInside(x, y, edge, on3d)) { // the phone's screen (aspira-camera.js): back toward the slot until it is on it
      let lo = 0, hi = 1;
      for (let j = 0; j < 14; j++) { const m = (lo + hi) / 2; if (phoneInside(c.x + (x - c.x) * m, c.y + (y - c.y) * m, edge, on3d)) lo = m; else hi = m; }
      x = c.x + (x - c.x) * lo; y = c.y + (y - c.y) * lo; moved = true;
    }
    if (!moved) break;
  }
  const clear = G.towers.every(o => o === t || Math.hypot(x - o.x, y - o.y) >= gap - 0.5) && Math.hypot(x - CX, y - CY) >= keep(Math.atan2(y - CY, x - CX)) - 0.5;
  return clear ? { x, y } : null;
}
function moveTower(t, p) { const s = legalSpot(t, p); if (s) { t.x = s.x; t.y = s.y; } return !!s; }

// UI only (aspira-draw.js): every moved tower's SPAWN, a faint hex in its colour on
// its slot, and the selected (or held) tower's LEASH, a dashed circle round it
// the leash SHOWN on its own for LEASH_HINT_S real seconds, its dashes marching, after the game's first tower is
// placed or a tower's leash grows (owner, 2026-10-10: "to indicate that it can be moved")
const LEASH_HINT_S = 4, LEASH_HINT_FADE_S = 1;
const hintLeash = t => { t.leashHint = performance.now() / 1000 + LEASH_HINT_S; };
// AN UPGRADE READY (owner, 2026-10-13: "when a tower's upgrade is available, show a plus, centered on the origin hexagon of the
// tower, flashing slowly, bold, flash the hex too at the same speed" - an UP CHEVRON since): affordable and not maxed; both pulse at UP_FLASH_HZ
const UP_FLASH_HZ = 0.5, UP_PLUS_PX = 13; // the chevron half the size (owner, 2026-10-21: "make the chevrons 50% of current size"; was 26)
const upReady = t => /* nextBuy: aspira-capstone.js */ { const b = nextBuy(t); return !!b && G.money >= b.cost; };
const upPulse = now => 0.5 + 0.5 * Math.sin(now * UP_FLASH_HZ * 2 * Math.PI);
// MORE OUTLINES, THE MORE YOU CAN BUY (owner, 2026-10-13: "more outlines ... levels of upgrades you can afford"): one hex per
// upgrade the bank covers in a row (upAfford), up to UP_RING_MAX, each UP_RING_K of the hex further out
// (on the map only - owner, 2026-10-13: "upgrade button on card should not have extra outlines")
const UP_RING_MAX = 6, UP_RING_K = 0.14;
function upAfford(t) {
  let m = G.money, n = 0, u = t;
  for (let b = nextBuy(u); b && b.cost <= m && n < UP_RING_MAX; b = nextBuy(u)) { m -= b.cost; u = b.t; n++; } // purchases, cheapest first
  return n;
}
const upRings = t => upAfford(t);
// an UP CHEVRON, h tall, centred on (x, y): a thick bent stroke in col over a dark outline (owner, 2026-10-13: "replace up arrow
// with up chevron"; it was an arrow, before that a plus)
function upArrow(x, y, h, col) {
  const w = h * 0.5, top = y - h * 0.25, bot = y + h * 0.25;
  ctx.beginPath(); ctx.moveTo(x - w, bot); ctx.lineTo(x, top); ctx.lineTo(x + w, bot);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = COL.bg; ctx.lineWidth = h * 0.3; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = h * 0.18; ctx.stroke();
}
function drawUpPlus(at = (c, fn) => fn()) { // at: 3D draws each one flat at its tower's spot on the TOP layer, over the boss's HP lane (drawButtonsOver, aspira-draw.js)
  const now = performance.now() / 1000;
  for (const t of G.towers) {
    if (!upReady(t)) continue;
    const c = CELLS[t.cell], col = COL[TOWERS[t.kind].color];
    at(c, () => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.2 + 0.7 * upPulse(now); // the hex FLASHES with the chevron, in more outlines the higher the tower (moved here from drawLeash, which turns over with the boss sky)
      for (let i = 0; i < upRings(t); i++) { towerHex(c, TOWER_K * (1 + UP_RING_K * i)); ctx.stroke(); } // the floor TILE, the size of a slot's (not the drawn tower's)
      ctx.globalAlpha = 1; upArrow(c.x, c.y, UP_PLUS_PX, col); }); // ON THE TILE and STILL (owner, 2026-10-21: "Keep them on the tiles, also, don't animate them"; was pulsing with the rings)
  }
  ctx.globalAlpha = 1;
}
function drawLeash() {
  ctx.save();
  ctx.lineWidth = 2;
  const now = performance.now() / 1000;
  if (typeof warp !== "undefined") warp.leashRings = [];
  for (const t of G.towers) {
    const c = CELLS[t.cell], col = COL[TOWERS[t.kind].color], held = towerHeld(t);
    ctx.strokeStyle = col;
    // its origin hex shows ONLY with an upgrade ready - drawUpPlus flashes it (owner, 2026-10-17: "don't show upgrade tiles unless you can buy an upgrade"; was a faint hex always)
    // a TETHER from the hex it was built on to the tower while it is dragged (owner, 2026-10-12)
    if (held && Math.hypot(t.x - c.x, t.y - c.y) > 1) { ctx.globalAlpha = 0.6; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.setLineDash([]); } // dashed like the leash ring
    const hint = t.leashHint > now ? Math.min(1, (t.leashHint - now) / LEASH_HINT_FADE_S) : 0;
    if ((t.id !== ui.sel && !held && !hint) || leashR(t) < 1) continue; /* no leash (ATC): no ring, no arrows */
    ctx.globalAlpha = Math.max(held ? 0.8 : t.id === ui.sel ? 0.5 : 0, 0.8 * hint);
    // 3D: the RING goes on the screen layer (drawLeashRings3d, aspira-camera.js), its dashes even in screen px - on the floor
    // the warp drew them long and slanted toward the sides (owner, 2026-10-14: "the mvmt range indicators look weird on the sides")
    (warp.leashRings ||= []).push({ x: c.x, y: c.y, R: leashR(t), col: (colOwn || COL)[TOWERS[t.kind].color] /* 3D: the tower's own colour, sky or not (drawn after the sky's flip - warpEntities) */, A: ctx.globalAlpha, march: hint ? now : 0 });
    if (!held) leashArrows(t, c, now, ctx.globalAlpha); // not while it is being dragged (owner, 2026-10-11)
  }
  ctx.globalAlpha = 1; ctx.restore();
}
// ARROWS POINTING AWAY from the tower (owner, 2026-10-11: "movement indicator should have arrows pointing away from
// tower"): LEASH_ARROWS chevrons, each gliding out along its own spoke from the tower's edge to the leash ring every
// LEASH_ARROW_T s, fading in and out, so the circle reads as "drag me this far"
const LEASH_ARROWS = 6, LEASH_ARROW_T = 1.2, LEASH_ARROW_W = 6;
function leashArrows(t, c, now, A) {
  const R = leashR(t), r0 = CELL_S * TOWER_K + 8, f = (now / LEASH_ARROW_T) % 1;
  for (let i = 0; i < LEASH_ARROWS; i++) {
    const a = (i + 0.5) * 2 * Math.PI / LEASH_ARROWS, ux = Math.cos(a), uy = Math.sin(a);
    // how far this spoke runs from the tower before it leaves the leash circle (the tower may stand off its slot)
    const ox = t.x - c.x, oy = t.y - c.y, b = ox * ux + oy * uy, end = -b + Math.sqrt(Math.max(0, b * b - (ox * ox + oy * oy - R * R)));
    if (end - r0 < 2 * LEASH_ARROW_W) continue;
    const d = r0 + (end - r0 - LEASH_ARROW_W) * f, x = t.x + ux * d, y = t.y + uy * d, w = LEASH_ARROW_W;
    ctx.globalAlpha = A * Math.sin(Math.PI * f); // in from nothing, out to nothing
    ctx.beginPath(); ctx.moveTo(x - ux * w - uy * w, y - uy * w + ux * w); ctx.lineTo(x, y); ctx.lineTo(x - ux * w + uy * w, y - uy * w - ux * w); ctx.stroke();
  }
}

// A tower is its cell's hexagon, inset a little; its label at the centroid.
// Level shows as concentric rings OUTSIDE it (drawTower).
const TOWER_K = 0.85; // bigger to press (owner, 2026-10-11; was 0.705) // a tower's (and slot's) hex size in cell sizes - 25% SMALLER (owner, 2026-10-06; was 0.94; before that 0.88, then 0.66)
function towerHex(c, k) {
  ctx.beginPath();
  c.pts.forEach((p, i) => {
    const x = c.x + (p.x - c.x) * k, y = c.y + (p.y - c.y) * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  });
  ctx.closePath();
}
// LEVEL READS AT A GLANCE (owner, 2026-10-02): the main hex stays full size
// and each level past L1 adds a BOLD ring OUTSIDE it, LEVEL_GAP further out
// each (the cells are two tiles apart, so there is room), under a glow that
// grows with the level.
const TOWER_GLOW = [8, 20, 34, 52], LEVEL_GAP = 0.135; // (0.18 before the 25% shrink, owner 2026-10-06) // rings 25% tighter with the smaller towers (was 0.24) // glow: shadow blur per level, world px
