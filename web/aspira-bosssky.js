// /spire - THE BOSS SKY (split from aspira-bosses.js at its 500-line cap, 2026-11-09): the inverted sky's state and triangle, the
// spokes before it, the Star's tint, the boss shown under the powers, skyKeep. UI only; same global scope, loaded right after
// aspira-bosses.js (the simulator too: the step reads bossInv). ARCHITECTURE.md §5.4.

// ---------- the inverted sky (UI only; render() in aspira-draw.js draws it) ----------
// owner: when a boss appears, colour INVERSION spreads as a circle from the
// core, filling the screen over BOSS_INV_T s; when the last boss dies, it
// collapses over the same time back onto the core. This only keeps the STATE
// (phase, radius r, full); render() draws the inverted frame (withPalette).
// The HTML over the board flips by CSS once the circle covers the screen
// (bossInv.full -> #asp.asp-boss).
const BOSS_INV_T = 3;
// THE SPOKES BEFORE THE SKY (owner, 2026-10-27: "before the triangle spreads, add three white spokes coming off the core, aligned with the
// tips of the triangle" / "the spokes should grow out of the core and reach the edge of the screen before the triangle starts"): for
// the first BOSS_SPOKE_T s of the sky's "in" phase the triangle holds at nothing while three white lines grow from the core along the
// rays to its corners, out to the screen's edge; then the triangle spreads over BOSS_INV_T as before, the spokes fading with it.
// The whole sky takes BOSS_SKY_T; the bar's fly-in and the boss lane's fade-in wait on that
const BOSS_SPOKE_T = 0.8, BOSS_SKY_T = BOSS_SPOKE_T + BOSS_INV_T, BOSS_SPOKE_W = 3;
// THE TRIANGLE'S SHAPE IS CAPPED (owner, 2026-10-28: "cap the height and width ratio to be no more than 1.5:1 and 1:1.5, allow triangle
// edge collision timing to suffer a touch"): height : top-side width, either way - a wide screen had made it a sliver several screens wide
const BOSS_SKY_RATIO = 1.5;
function drawSkySpokes() { // on the top layer (warpEntities' part B), crisp; bossInv.spoke: their growth 0..1 (bossSkyStep)
  if (bossInv.phase !== "in" || bossInv.full || !bossInv.triS || !bossInv.coreS) return;
  const c = bossInv.coreS, g = bossInv.spoke || 0, ease = g * (2 - g), W = ctx.canvas.width, H = ctx.canvas.height, a = 1 - (bossInv.k || 0); // (ease out of the core; gone as the triangle fills) // W, H: THE CANVAS DRAWN ON - in 3D the entity layer, sized like the view, not cv (the 2D board canvas): measured on cv the spokes stopped short of the edge (owner, 2026-10-28: "Ensure spokes reach the edge of the screen")
  if (!(ease > 0) || !(a > 0)) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = COL.white; ctx.lineWidth = BOSS_SPOKE_W; ctx.lineCap = "round"; ctx.globalAlpha = a; ctx.beginPath();
  for (const T of bossInv.triS) { const dx = T.x - c.x, dy = T.y - c.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; // the ray to this corner...
    let exit = Infinity; for (const [e, u, o] of [[0, -ux, c.x], [W, ux, W - c.x], [0, -uy, c.y], [H, uy, H - c.y]]) if (u > 1e-9) exit = Math.min(exit, o / u); // ...and where it leaves the screen
    if (!isFinite(exit)) continue; exit += BOSS_SPOKE_W; /* past the edge by its width: the round cap never shows a gap there */ ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + ux * exit * ease, c.y + uy * exit * ease); }
  ctx.stroke(); ctx.globalAlpha = 1;
}
const bossInv = { phase: "off", t0: 0, x: 0, y: 0, full: false, r: 0 };
// THE SKY SPREADS AS A TRIANGLE pointing down (owner, 2026-10-27: "replace the expanding circle with an expanding triangle for bosses /
// point down" / "change the shape of the triangle so that the diagonal sides touch the screen corner at the same time as the top side"):
// the FULL triangle is laid out ON THE SCREEN (view pixels - the 3D view is what the player sees; owner: "isosceles / the sides touch
// the bottom corners, the top touch the top of screen" / "center of mass of the triangle is where core is"): its top side along the
// screen's top edge, its two sides through the bottom corners, its centroid on the core's screen point (isosceles when the core is
// centred); the sky is that triangle scaled about the core by bossInv.k (0..1). skyTriS: the three corners now, screen; skyTri: the
// same on the floor (floorAt), for the board-space clip; inSkyPt: is a world point under the sky (its screen point tested).
// (bossInv.r stays for skyOn)
function skyTriS() { const k = bossInv.k || 0, T = bossInv.triS, c = bossInv.coreS; return T && c ? T.map(p => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k })) : [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]; }
function skyTri() { const k = bossInv.k || 0, T = bossInv.triW; return T ? T.map(p => ({ x: CX + (p.x - CX) * k, y: CY + (p.y - CY) * k })) : [{ x: CX, y: CY }, { x: CX, y: CY }, { x: CX, y: CY }]; } // (the full floor triangle scaled about the core: near enough for the board-space clip)
// THE LAYOUT, under the VIEW camera (warpEntities, aspira-warp.js - bossSkyStep runs under the board texture's camera, where the screen
// is not the screen): the full screen triangle and the core's screen point, and the floor under the triangle (a corner above the
// horizon, with no floor, is pushed far out along its edge from the core)
function skyLayout() {
  if (bossInv.phase === "off") return;
  const sc = typeof warp !== "undefined" && warp.cv ? warp.cv : cv, W = sc.width, H = sc.height, c = warpProject(CX, CY, 0);
  // height h puts the centroid (a third of the way down) on the core; the apex xa and base ends x1, x2 then follow from the sides passing
  // through the bottom corners and the centroid's x on the core (a core in the top third of the screen gets a triangle just past the bottom)
  const h = Math.max(H * 1.02, 3 * c.y), f = H / h, xa = Math.abs(1 - 3 * f) < 0.05 ? c.x : (3 * c.x * (1 - f) - W) / (1 - 3 * f), x1 = -xa * f / (1 - f), x2 = (W - xa * f) / (1 - f);
  let tri = [{ x: xa, y: h }, { x: x2, y: 0 }, { x: x1, y: 0 }];
  // past BOSS_SKY_RATIO either way (a flat sliver on a wide screen, a needle on a tall one) the triangle becomes an ISOSCELES at that
  // ratio, apex under the core, centroid still on the core, the SMALLEST that holds all four screen corners - so the screen is covered
  // when it is full; its sides and top then meet the edges a moment apart (owner, 2026-10-28). Within the ratio: the layout above, exact
  const ratio = h / (x2 - x1);
  if (!(ratio <= BOSS_SKY_RATIO && ratio >= 1 / BOSS_SKY_RATIO)) {
    const r = Math.min(BOSS_SKY_RATIO, Math.max(1 / BOSS_SKY_RATIO, ratio)); // height : top-side width
    const U = [{ x: 0, y: 2 * r / 3 }, { x: 0.5, y: -r / 3 }, { x: -0.5, y: -r / 3 }]; // the unit triangle about its centroid: top side 1, height r, apex down (y down)
    let s = 0; // the scale holding every screen corner: the largest edge gauge (n . P / d, n an edge's outward normal, d its offset from the centroid) over the corners
    for (const [px, py] of [[0, 0], [W, 0], [0, H], [W, H]]) for (let i = 0; i < 3; i++) {
      const a = U[i], b = U[(i + 1) % 3], nx = a.y - b.y, ny = b.x - a.x, d = nx * a.x + ny * a.y;
      s = Math.max(s, (nx * (px - c.x) + ny * (py - c.y)) / d);
    }
    tri = U.map(p => ({ x: c.x + p.x * s * 1.02, y: c.y + p.y * s * 1.02 }));
  }
  bossInv.triS = tri; bossInv.coreS = { x: c.x, y: c.y };
  bossInv.triW = bossInv.triS.map(p => { const w = typeof floorAt === "function" ? floorAt(p.x, p.y) : null; if (w) return w; const dx = p.x - c.x, dy = p.y - c.y, l = Math.hypot(dx, dy) || 1; return { x: CX + dx / l * 1e5, y: CY + dy / l * 1e5 }; });
}
function inSkyPt(px, py) {
  if (bossInv.phase === "off") return false; if (bossInv.full) return true;
  const P = typeof warpProject === "function" ? warpProject(px, py, 0) : { x: cam.ox + px * cam.k, y: cam.oy + py * cam.k }, sx = P.x, sy = P.y;
  const [a, b, c] = skyTriS(), cr = (p, q) => (q.x - p.x) * (sy - p.y) - (q.y - p.y) * (sx - p.x), s1 = cr(a, b), s2 = cr(b, c), s3 = cr(c, a);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}
function skyTriPath(fn) { for (const [i, p] of skyTri().entries()) fn(p.x, p.y, i); } // (the three corners, in order)
// the game HOLDS while the sky turns over, both ways (owner, 2026-10-12: "maybe we should pause the game while inverting"):
// BOSS_INV_T of real time with nothing moving, so the flip is watched, not fought through
const skyTurning = () => (bossInv.phase === "in" && !bossInv.full) || bossInv.phase === "out";
function bossSkyStep() {
  // the sky stays inverted while ANY boss-related enemy lives - the boss and its
  // brood (owner) - and only then collapses
  // ...and from the moment the boss WAVE is sent, before anything spawns (owner, 2026-10-12: "finish inversion before spawning
  // first units"): the game holds while it turns (skyTurning), so the boss's intro timer only starts once the sky is over
  const now = performance.now() / 1000, pending = G.spawns.some(w => w.n % STAR_EVERY === 0 && w.idx < w.list.length);
  const alive = pending || G.enemies.some(e => (e.arcana || e.bossKin) && !e.dead);
  if (alive && (bossInv.phase === "off" || bossInv.phase === "out")) {
    Object.assign(bossInv, { phase: "in", t0: now, x: CX, y: CY }); // spreads from the CORE (owner: was the boss)
  } else if (!alive && bossInv.phase === "in") {
    Object.assign(bossInv, { phase: "out", t0: now, x: CX, y: CY }); // collapses onto the CORE too (owner)
  }
  if (bossInv.phase === "out" && now - bossInv.t0 >= BOSS_INV_T) { bossInv.phase = "off"; bossInv.offAt = now; } // offAt: the Challenge button waits on it (CHALLENGE_DELAY)
  if (bossInv.phase === "off") { bossInv.full = false; bossInv.r = 0; bossInv.k = 0; return; }
  // the circle must reach the canvas corner furthest from its centre
  const corners = [[0, 0], [cv.width, 0], [0, cv.height], [cv.width, cv.height]].map(([px, py]) => ({ x: (px - cam.ox) / cam.k, y: (py - cam.oy) / cam.k }));
  const R = Math.max(...corners.map(c => Math.hypot(c.x - bossInv.x, c.y - bossInv.y))) * 1.05;
  const tin = now - bossInv.t0, p = Math.min(1, Math.max(0, bossInv.phase === "in" ? (tin - BOSS_SPOKE_T) / BOSS_INV_T : tin / BOSS_INV_T)), ease = p * p * (3 - 2 * p); // ("in": the spokes' BOSS_SPOKE_T first, the triangle still)
  bossInv.spoke = bossInv.phase === "in" ? Math.min(1, tin / BOSS_SPOKE_T) : 0;
  bossInv.r = bossInv.phase === "in" ? R * ease : R * (1 - ease); // the boss's HP line grows and shrinks with this edge (drawBossBar)
  bossInv.k = bossInv.phase === "in" ? ease : 1 - ease; // (the triangle itself: skyLayout, under the view camera)
  bossInv.full = bossInv.phase === "in" && p >= 1;
}

// the STARS redden ahead of a boss (owner): over the wave before it they drift
// from white to red, stay red while it is queued or alive, and drift back to
// white over STAR_FADE_T s once it is dead
const STAR_FADE_T = 3;
const starTint = { k: 0, at: 0 };
function starRed() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (starTint.at || now));
  starTint.at = now;
  const before = G.started && G.wave % STAR_EVERY === STAR_EVERY - 1 && !G.over;
  if (G.started && !G.over && bossUp()) starTint.k = 1;
  else if (before) starTint.k = Math.max(starTint.k, 1 - Math.max(0, G.nextIn) / WAVE_TIMER);
  else starTint.k = Math.max(0, starTint.k - dt / STAR_FADE_T);
  return starTint.k;
}

// ---------- the boss's HP, on the board (UI only; aspira-draw.js calls it) ----------
// a THICK line in the boss's colour (owner) - along its lane since 2026-10-26 (drawBossBar below). Drawn before the inversion, so cyan reads red.
// THE BOSS SHOWN under the powers (owner, 2026-10-23: "Game should start by saying The Star / Get rid of \"The Source\" / Then just have the
// boss name and poem on the right"): the live boss (or its fleet), else the one on its way this wave, else the NEXT boss
const bossShownN = () => {
  const b = G.enemies.find(e => (e.arcana || e.bossKin) && !e.dead); if (b) return b.n;
  if (G.wave > 0 && G.wave % STAR_EVERY === 0 && bossUp()) return G.wave;
  return Math.min(WIN_WAVE, (Math.floor(G.wave / STAR_EVERY) + 1) * STAR_EVERY);
};
// the shown boss's haiku for the HTML above the title (updateHud)
const bossHint = () => arcanaOf(bossShownN()).hint.join("\n");
// (the boss's NAME is the page title while it is out now - updateHud, aspira-ui.js; drawBossTitle drew it on the board)
// THE SKY'S FLIP (owner, 2026-10-09: "make inversion animation way less laggy, need like 10x improvement"): the frame is
// drawn ONCE and the sky's circle (the whole canvas once full, or at once on low quality) turned over with a single
// `difference` fill of white - the same colours the inverted palette gave (inverting a blend = blending the inverted
// colours), where the old way drew the whole scene twice while the sky spread and kept a second set of lane layers
const skyOn = () => bossInv.phase !== "off" && (bossInv.full || bossInv.r > 1);
const skyAll = () => bossInv.full;
// once the sky covers it all, NO flip of any kind (owner, 2026-10-11: "invert has huge cost" - a full-canvas `difference`
// fill made the GPU copy the whole canvas, ~5 ms a frame, and the CSS invert that replaced it in 2D was a full-screen
// filter pass every frame): the frame is simply DRAWN in the inverted palette (render, warpEntities), towers in their own
const skyPal = () => skyOn() && skyAll();
// the TOWERS keep their own colours on the sky (owner): inside the circle they are drawn in the INVERTED palette (with
// ownColours disarmed), so the flip turns them back; outside it, as they are
function skyKeep(fn) {
  if (!skyOn()) { ownColours(fn); return; }
  const flipped = () => withPalette(() => { inverted = false; try { fn(); } finally { inverted = true; } });
  if (skyAll()) { flipped(); return; } // (3D: the bell's picture stays plain and its shader turns it over - warpDraw)
  const circle = () => { ctx.beginPath(); skyTriPath((x, y, i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }; // (the sky's triangle - skyTri)
  ctx.save(); circle(); ctx.rect(CX - 4000, CY - 4000, 8000, 8000); ctx.clip("evenodd"); fn(); ctx.restore();
  ctx.save(); circle(); ctx.clip(); flipped(); ctx.restore();
}
