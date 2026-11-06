// /spire - THE CARD'S DEMO SCENE, the private game (the card: aspira-demo-card.js; the layouts: aspira-demo-layouts.js) (owner, 2026-11-03: "replace the description text box with a tower attacking a group of
// immobile dummies"; "whether the scene switches to an upgrade while you're previewing it, yes"; "ensure that the demo shows off the
// upgrade (include damage numbers)"). A PRIVATE GAME: one tower and its walkers in a G of their own, run by the game's REAL step and
// drawn by the game's real draw code, so the scene can never show a mechanic the tower does not have.
// THE SWAP: the game keeps its run state in a few globals (G, fx, the damage numbers, coins, GRV's and CRR's lists ...). Every scene
// frame swaps the scene's own copies in, runs, and swaps the real ones back (demoIn / demoOut) - its sound quieter (or off) and the GPU
// effect batch off - so the real game, paused under the card, is left exactly as it was (smoke: "demo scene leaves the real game alone").
// A new global that step() writes must join demoIn / demoOut's swap, or it leaks between the two games (smoke: demo isolation).
// THE DRAW IS PLUGGABLE (demoFrame's draw): the scene only lends it the canvas and a camera; the owner picked 3D (demoDraw3d, below).
// EVERY WALKER IN SIGHT (owner, 2026-11-06: "ARC demo keeps reflecting between offscreen invincible enemies"): the scene's lanes run DEMO_BOX_OVER u past the
// box's edges (aspira-demo-layouts.js); a walker now walks in AT the right edge and is taken out AT the left one, so nothing a hop, a split or an
// interceptor can reach stands outside the box (was: in from 60 u out, back 40 u short of the lane's end - 20 u out)
const DEMO_BOX_OVER = 60;
const DEMO_HP_K = 50; // a walker's health x its wave-30 HP - rarely killed (a killing hit strips no armor), still finite for CRR's carTarget; // a dummy back to full health under this share (a kill in the private game is revived the same frame); its own wave-30 HP, so a
// tower that commits shots by HP (CRR's carTarget) spreads them as in a game
const DEMO_DT = 1 / 60, DEMO_STEP = 0.02, DEMO_VOL = 0.35; // DT: a bare demoFrame's real seconds; STEP: the longest one step (the game's, aspira-ui.js frame); // VOL: the scene's sounds x this
// the real game's state, kept while the scene runs (one scene at a time)
let demoHeld = null;
function demoIn(S) {
  if (demoHeld) throw new Error("demo scene: nested demoIn");
  if (S.lanes) { S.pi0 = PATHS.length; PATHS.push(...S.lanes); } // (a walker scene's own two lanes: on PATHS only while it runs)
  S.sumsHeld = new Map(dmgSums); dmgSums.clear(); for (const [k, v] of S.sums || []) dmgSums.set(k, v); // the tick numbers being summed (a const Map: its CONTENTS swap)
  demoHeld = { G, fx, dmgLive, dmgHold, hitFrom, coins, grvAll, carObs, sparkN, grvLastHit, bannerText, bannerT, bannerCol, shakeUntil, muted, sfxScale, fxBroken: fxGl.broken, gameOver, winGame, showOverlay };
  gameOver = winGame = showOverlay = demoNoEnd; // THE PRIVATE GAME NEVER ENDS ANYTHING (2026-11-03: on 7.2.4-5 a card left open ~18 laps leaked its walkers' lives to a game over - the page's end screen and its sound)
  G = S.G; fx = S.fx; dmgLive = S.dmgLive; dmgHold = S.dmgHold; hitFrom = S.hitFrom; coins = S.coins; grvAll = S.grvAll; carObs = S.carObs;
  sparkN = S.sparkN; grvLastHit = S.grvLastHit; bannerText = S.bannerText; bannerT = S.bannerT; bannerCol = S.bannerCol; shakeUntil = S.shakeUntil;
  if (S.sound) sfxScale = DEMO_VOL; else muted = true; fxGl.broken = true; // (sound: the tower's own, quieter - owner, 2026-11-03: "Real sounds"; the 2D way for hits and rings - the GPU batch belongs to the real frame)
}
function demoOut(S) {
  const H = demoHeld; if (!H) return;
  S.G = G; S.fx = fx; S.dmgLive = dmgLive; S.dmgHold = dmgHold; S.hitFrom = hitFrom; S.coins = coins; S.grvAll = grvAll; S.carObs = carObs;
  S.sparkN = sparkN; S.grvLastHit = grvLastHit; S.bannerText = bannerText; S.bannerT = bannerT; S.bannerCol = bannerCol; S.shakeUntil = shakeUntil;
  G = H.G; fx = H.fx; dmgLive = H.dmgLive; dmgHold = H.dmgHold; hitFrom = H.hitFrom; coins = H.coins; grvAll = H.grvAll; carObs = H.carObs;
  sparkN = H.sparkN; grvLastHit = H.grvLastHit; bannerText = H.bannerText; bannerT = H.bannerT; bannerCol = H.bannerCol; shakeUntil = H.shakeUntil;
  muted = H.muted; sfxScale = H.sfxScale; fxGl.broken = H.fxBroken; gameOver = H.gameOver; winGame = H.winGame; showOverlay = H.showOverlay; demoHeld = null;
  if (S.lanes) PATHS.length = S.pi0;
  S.sums = new Map(dmgSums); dmgSums.clear(); for (const [k, v] of S.sumsHeld) dmgSums.set(k, v); S.sumsHeld = null;
}
const demoNoEnd = () => { G.over = false; }; // (in the scene: gameOver / winGame / showOverlay do nothing)
const demoRun = (S, fn) => { demoIn(S); try { return fn(); } finally { demoOut(S); } };
// a scene: tower `kind` with `skills` on slot `cell`, and its WALKERS (the layouts: aspira-demo-layouts.js) - { type, lane, at }: on lane
// 0 or 1 of the scene's own two (list.lanes), starting `at` of the way along it. A walker moves at its real pace - slows, stuns, the core
// ease, the game's own movement. RESPAWNS ARE AT THE RIGHT EDGE (owner, 2026-11-03: "enemies always respawn from the right"): one that walks
// out at the left is taken out quietly and a fresh one enters at the right ("despawn and respawn, dont just reposition"); one KILLED dies for real (the game's own death; its ghost drifts
// off) and a fresh one of its type walks in at the right. Nothing is refilled mid-lane. S.T keeps every walker's tally (the dead ones too)
// - damage, the least armor and shield, the most pace lost - for the smoke (demoShows)
function demoScene(kind, skills, cell, list) {
  const S = { G: freshG(), fx: [], dmgLive: [], dmgHold: null, hitFrom: null, coins: [], grvAll: [], carObs: [], sparkN: 0, grvLastHit: 0, bannerText: "", bannerT: 0, bannerCol: "orange", shakeUntil: 0, t: 0, T: [] };
  S.lanes = list.lanes;
  demoRun(S, () => {
    G.started = true; G.wave = 1; G.nextIn = Infinity; G.money = 0; G.waveIn = { 30: 1 }; G.lives = 1e9; // (in reach: no off-screen x3; lives no walker can use up - a game over froze the scene)
    const c = CELLS[cell], t = { id: G.id++, kind, cell, x: c.x, y: c.y, lvl: 1, cd: 0, mode: DEFAULT_MODE[kind], spent: 0 };
    if (hasSkills(t)) { t.skills = { ...skills }; t.lvl = 1 + towerLevel(t); }
    G.towers.push(t);
    for (const d of list) demoWalker(S, d.type, d.lane, d.at || 0);
  });
  return S;
}
// one walker on lane `lane`, `at` of the way along it (0: the right edge), at DEMO_HP_K x a wave-30 body's health
function demoWalker(S, type, lane, at) {
  const pi = S.pi0 + lane, L = S.lanes[lane], s = Math.max(DEMO_BOX_OVER, L.len * at); // (never out past the box: the lanes' overhang is DEMO_BOX_OVER u)
  spawnEnemy(type, 30, pi, 0); const e = G.enemies[G.enemies.length - 1], p = pathAt(pi, s, 0);
  e.s = s; e.x = p.x; e.y = p.y; e.seen = true; e.hp = e.max = e.max * DEMO_HP_K;
  e.demo = { walk: true, lane, s0: 0, s1: L.len - DEMO_BOX_OVER, armor: e.armor || 0, shield: e.shield || 0 }; // (s1: it turns back short of the lane's end - at the end step() takes it for a leak at the core)
  e.tally = { type, demo: e.demo, dmg: 0, armor: e.armor || 0, shield: e.shield || 0, slow: 0 }; S.T.push(e.tally);
  return e;
}
// one scene frame: the real step and the effects' and numbers' ageing; tallies kept; a walker out at the left back at the right, whole; a
// killed one replaced at the right; then `draw` (pluggable) onto `c2d` under the scene's camera `view` ({ k, ox, oy, p }) - the real ctx,
// cam and 3D camera come back after
// THE SCENE'S CLOCK (Wai, 2026-11-06: "why does GRV nova so often"): `rdt` real seconds pass as rdt x `gk` game seconds, in steps of at most
// DEMO_STEP like the game's own loop - the card passes the frame's real time and BASE_SPEED (demoTick), so the scene runs at 1x play on any
// refresh rate (one DEMO_DT a drawn frame was 1.25x on 60 Hz, 2.5x on 120 Hz); the smoke's bare calls keep one DEMO_DT a call
function demoFrame(S, c2d, view, draw, rdt = DEMO_DT, gk = 1) {
  demoRun(S, () => {
    const before = G.enemies.filter(e => e.demo && !e.dead).map(e => [e, e.hp]);
    for (let left = rdt * gk; left > 1e-9;) { const h = Math.min(DEMO_STEP, left); step(h); stepFx(h); S.t += h; left -= h; }
    coins.length = 0; G.money = 0; /* NO CREDITS (Leader, 2026-11-03): a kill's coins and their "+Nc" pop would mislead - none change hands */ stepFloats(rdt); // (the effects and the numbers AGE outside step, as in the frame loop - the numbers in REAL time: without stepFx and stepFloats they never left the scene - owner, 2026-11-03: "carrier demo bug, numbers stuck")
    for (const [e, hp] of before) {
      const h = e.demo, T = e.tally;
      T.dmg += Math.max(0, hp - Math.max(0, e.hp)); T.armor = Math.min(T.armor, e.armor || 0); T.shield = Math.min(T.shield, e.shield || 0);
      T.slow = Math.max(T.slow, e.stunT > 0 ? 1 : e.slowT > 0 ? e.slowF || 0 : 0); // (the share of its pace it lost: what effSpeed takes off)
      if (e.dead) { demoWalker(S, e.type, h.lane, 0); continue; } // killed: a fresh one at the right edge (the dead one is the game's)
      if (e.s >= h.s1) { e.dead = e.gone = true; const k = G.enemies.indexOf(e); if (k >= 0) G.enemies.splice(k, 1); demoWalker(S, e.type, h.lane, 0); } // out at the left: TAKEN OUT quietly (no death, no leak - dead, so every chain, interceptor or void holding it lets go) and a fresh one enters at the right (owner, 2026-11-03: "ARC chaining across the demo, despawn and respawn, dont just reposition?") // out at the left: again at the right, whole (the ease from its start: coreEase, aspira-step.js)
    }
    if (!draw || !c2d) return;
    const ctx0 = ctx, cam0 = { ...cam }, p0 = typeof warp !== "undefined" ? warp.p : null, band0 = warpBand, fade0 = warpFade;
    ctx = c2d; Object.assign(cam, { k: view.k, ox: view.ox, oy: view.oy }); if (view.p) warp.p = view.p; warpBand = null; warpFade = 1;
    try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c2d.canvas.width, c2d.canvas.height); ctx.setTransform(cam.k, 0, 0, cam.k, cam.ox, cam.oy); draw(S); }
    finally { ctx = ctx0; Object.assign(cam, cam0); if (view.p) warp.p = p0; warpBand = band0; warpFade = fade0; }
  });
}
// THE 3D LOOK, SMALL (owner, 2026-11-03: "3D, but make the towers and enemies smaller so it all fits clearly in the box"): the scene's own
// camera - the game's tilt, a FLAT floor (no funnel) and a long lens, so the box reads like the board, only further off. The real 3D draws
// then work as they are: the tower's prism with its top (warpPrism, drawTower), the dice (warpSolid), the shields' floor lines, the pop-up
// numbers; the floor's own effects (beams, tethers, pools, voids) go down under ONE frame at the scene's middle - the long lens keeps the
// floor's perspective under a pixel across the box.
const DEMO_LENS = 24; // the lens: focal length x the canvas's size (a long one: next to no perspective)
// THE TOWER at (H/2, H/2) (owner, 2026-11-03: "the tower needs to be more centered, the area occluded by the top and bottom of the area should be
// the same"; then "move tower to the left so that the distance from top and bottom of box is equal to distance from left of box"; then "move demo tower slightly right": DEMO_TOWER_X): its floor
// point half the box's height from its top, bottom AND left edges, the scale fitting its range ellipse (2 r cos(tilt) tall) in the box's height with
// DEMO_FIT to spare - so the ring sits with equal room above and below at every tier; the box's width (DEMO_BOX_AR) is the walkers' run
const DEMO_FIT = 1.12, DEMO_BOX_AR = 372 / 180, DEMO_TOWER_X = 0.62; // X: the tower's floor point that many box heights from the left (owner, 2026-11-03: "move demo tower slightly right"; 0.5 before)
function demoView3d(S, w, h) {
  const t = S.G.towers[0], r = demoRun(S, () => towerStats(t).range) || 120, tilt = warpTilt(), c = Math.cos(tilt), s = Math.sin(tilt);
  const d = Math.min(w, h) * DEMO_TOWER_X, k = w - 2 * d > 0 ? (w - 2 * d) / r : h / (2 * r * c * DEMO_FIT) /* THE RANGE'S FAR EDGE as far from the right edge as the tower is from the left (owner, 2026-11-06: "zoom out enough so that the edge of the tower range is the same distance from the edge of the demo as the distance from the other edge to the tower"; was: the whole range ellipse fitted in the height) */, ox = d - t.x * k, /* LEFT (owner, 2026-11-03: "move tower to the left so that the distance from top and bottom of box is equal to distance from left of box") */ oy = h / 2 - CY * k - c * (t.y - CY) * k, f = DEMO_LENS * Math.max(w, h);
  S.mid = [t.x, t.y];
  return { k, ox, oy, p: { core: [ox + CX * k, oy + CY * k], D: 0, L: Infinity, T: Infinity, hc: 1, e: 1, P: 1, c, s, f, k, z: 1, oy: 0 } };
}
function demoDraw3d(S) {
  const up = (x, y, fn, h) => { const [a, b, c2, d, e, f] = warpFrame(x, y, h || 0); ctx.setTransform(a, b, c2, d, e, f); ctx.save(); fn(); ctx.restore(); };
  const t = G.towers[0], m = S.mid || [t.x, t.y];
  const th0 = drawThreat; drawThreat = () => {}; // (no threat marks: a walker's lane ends at the box's edge, not a core - its ETA would light them there)
  try { up(m[0], m[1], () => { ctx.save(); drawTowerRange(t, true); ctx.restore(); drawSceneTop(); drawFx("beams"); }); } finally { drawThreat = th0; } // the floor
  for (const e of G.enemies) { const w = enemyWallPieces(e); if (w.length) warpShieldLines(w, COL[ENEMIES[e.type].color], 0.8 * SHIELD_DRAW_A * enemyVis(e), [e.x, e.y]); }
  const dice = G.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of dice) up(e.x, e.y, () => drawEnemy(e, true));
  for (const e of dice) { e.geomAt = -1; warpSolid(e); } // (the geometry under this camera, never the board's cached one)
  if (t) {
    const c0 = CELLS[t.cell], h = towerH(t), col = COL[TOWERS[t.kind].color];
    drawOrbiters(t, true, up, t.x, t.y, h); // (what circles it: far side under the prism, near side over - aspira-warp-prism.js)
    warpPrism({ x: t.x, y: t.y, h, col, pts: c0.pts.map(p => ({ x: t.x + (p.x - c0.x) * TOWER_K * TOWER_DRAW_K, y: t.y + (p.y - c0.y) * TOWER_K * TOWER_DRAW_K })) });
    up(t.x, t.y, () => drawTower(t), h / 2);
    drawOrbiters(t, false, up, t.x, t.y, h);
  }
  const pp = (x, y, fn, far) => { const P = warpProjectScratch(x, y), k = cam.k * (far ? P.s : 1); ctx.setTransform(k, 0, 0, k, P.x - x * k, P.y - y * k); fn(); };
  ctx.save(); try { drawGrvCores((x, y, fn) => pp(x, y, fn, true)); } finally { ctx.restore(); } // GRV's VOIDS: the real frame draws them in its pop pass (warpEntities part B), not drawSceneTop (owner, 2026-11-03: "grv demo is not showing voids")
  ctx.save(); try { drawFx("dmg", (x, y, fn) => pp(x, y, fn, true)); drawFx("text", pp); } finally { ctx.restore(); }
}
