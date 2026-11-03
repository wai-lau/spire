// /spire - THE CARD'S DEMO SCENE, the private game (the card: aspira-demo-card.js; the layouts: aspira-demo-layouts.js) (owner, 2026-11-03: "replace the description text box with a tower attacking a group of
// immobile dummies"; "whether the scene switches to an upgrade while you're previewing it, yes"; "ensure that the demo shows off the
// upgrade (include damage numbers)"). A PRIVATE GAME: one tower and its dummies in a G of their own, run by the game's REAL step and
// drawn by the game's real draw code, so the scene can never show a mechanic the tower does not have.
// THE SWAP: the game keeps its run state in a few globals (G, fx, the damage numbers, coins, GRV's and CRR's lists ...). Every scene
// frame swaps the scene's own copies in, runs, and swaps the real ones back (demoIn / demoOut) - its sound quieter (or off) and the GPU
// effect batch off - so the real game, paused under the card, is left exactly as it was (smoke: "demo scene leaves the real game alone").
// A new global that step() writes must join demoIn / demoOut's swap, or it leaks between the two games (smoke: demo isolation).
// THE DRAW IS PLUGGABLE (demoFrame's draw): the scene only lends it the canvas and a camera; the owner picked 3D (demoDraw3d, below).
const DEMO_HP_K = 50, DEMO_REFILL = 0.15; // HP_K: a dummy's health x its wave-30 HP - rarely killed (a killing hit strips no armor), still finite for CRR; // a dummy back to full health under this share (a kill in the private game is revived the same frame); its own wave-30 HP, so a
// tower that commits shots by HP (CRR's carTarget) spreads them as in a game
const DEMO_DT = 1 / 60, DEMO_VOL = 0.35; // VOL: the scene's sounds x this
// the real game's state, kept while the scene runs (one scene at a time)
let demoHeld = null;
function demoIn(S) {
  if (demoHeld) throw new Error("demo scene: nested demoIn");
  demoHeld = { G, fx, dmgLive, dmgHold, hitFrom, coins, grvAll, carObs, sparkN, grvLastHit, bannerText, bannerT, bannerCol, shakeUntil, muted, sfxScale, fxBroken: fxGl.broken };
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
  muted = H.muted; sfxScale = H.sfxScale; fxGl.broken = H.fxBroken; demoHeld = null;
}
const demoRun = (S, fn) => { demoIn(S); try { return fn(); } finally { demoOut(S); } };
// a scene: tower `kind` with `skills` on slot `cell`, and its enemies (the layouts: aspira-demo-layouts.js), each either
//   { type, x, y }            a DUMMY: held where it stands (on the lane point nearest, its tail drawn from there), never moves, or
//   { type, pi, s0, s1, at }  a WALKER (owner, 2026-11-03: "show moving enemies that get slowed to represent slow"): walks lane `pi` from
//                             s0 to s1 at its real pace - slows and all, the game's own movement - then starts over at s0 (`at`: its start, 0..1)
// Every enemy never dies (back to full under DEMO_REFILL, a kill revived), and its armor and shields come back every DEMO_REARM s, so strips and pops
// keep showing. S.tally keeps, per enemy, what the scene did to it - damage, the least armor and shield, the slowest pace - for the smoke
const DEMO_REARM = 4;
function demoScene(kind, skills, cell, list) {
  const S = { G: freshG(), fx: [], dmgLive: [], dmgHold: null, hitFrom: null, coins: [], grvAll: [], carObs: [], sparkN: 0, grvLastHit: 0, bannerText: "", bannerT: 0, bannerCol: "orange", shakeUntil: 0, t: 0, rearm: DEMO_REARM };
  demoRun(S, () => {
    G.started = true; G.wave = 1; G.nextIn = Infinity; G.money = 0; G.waveIn = { 30: 1 }; // (in reach: no off-screen x3)
    const c = CELLS[cell], t = { id: G.id++, kind, cell, x: c.x, y: c.y, lvl: 1, cd: 0, mode: DEFAULT_MODE[kind], spent: 0 };
    if (hasSkills(t)) { t.skills = { ...skills }; t.lvl = 1 + towerLevel(t); }
    G.towers.push(t);
    for (const d of list) {
      const walk = d.s1 != null, near = walk ? null : demoNearLane(d.x, d.y);
      const pi = walk ? d.pi : near.pi, s = walk ? d.s0 + (d.s1 - d.s0) * (d.at || 0) : near.s;
      spawnEnemy(d.type, 30, pi, 0); const e = G.enemies[G.enemies.length - 1], p = pathAt(pi, s, 0);
      e.s = s; e.x = walk ? p.x : d.x; e.y = walk ? p.y : d.y; e.seen = true; e.hp = e.max = e.max * DEMO_HP_K;
      e.demo = { walk, s, x: e.x, y: e.y, s0: d.s0, s1: d.s1, armor: e.armor || 0, shield: e.shield || 0 };
      e.tally = { dmg: 0, armor: e.armor || 0, shield: e.shield || 0, slow: 0 };
    }
  });
  return S;
}
function demoNearLane(x, y) { let best = { pi: 0, s: 0, d: Infinity }; PATHS.forEach((P, pi) => { for (let s = 0; s < P.len; s += 8) { const p = pathAt(pi, s, 0), d = Math.hypot(p.x - x, p.y - y); if (d < best.d) best = { pi, s, d }; } }); return best; }
// one scene frame: the real step; dummies held, walkers looped, the tallies kept; then `draw` (pluggable) onto `c2d` under the scene's
// camera `view` ({ k, ox, oy, p }) - the real ctx, cam and 3D camera come back after
function demoFrame(S, c2d, view, draw) {
  demoRun(S, () => {
    const before = G.enemies.map(e => [e, e.hp, e.s]);
    step(DEMO_DT); S.t += DEMO_DT;
    for (const [e, hp, s0] of before) {
      const h = e.demo; if (!h) continue; const T = e.tally;
      T.dmg += Math.max(0, hp - Math.max(0, e.hp)); T.armor = Math.min(T.armor, e.armor || 0); T.shield = Math.min(T.shield, e.shield || 0);
      e.dead = false; e.gone = false; if (!G.enemies.includes(e)) G.enemies.push(e); if (!(e.hp >= e.max * DEMO_REFILL)) e.hp = e.max;
      if (h.walk) {
        T.slow = Math.max(T.slow, e.stunT > 0 ? 1 : e.slowT > 0 ? e.slowF || 0 : 0); // (the share of its pace it lost: what effSpeed takes off)
        if (e.s >= h.s1) { e.s = h.s0; e.ease0 = undefined; const p = pathAt(e.pi, e.s, 0); e.x = p.x; e.y = p.y; } // (each lap eases from its start again: coreEase, aspira-step.js)
      } else { e.s = h.s; e.x = h.x; e.y = h.y; }
    }
    if ((S.rearm -= DEMO_DT) <= 0) { S.rearm = DEMO_REARM; for (const e of G.enemies) if (e.demo) { e.armor = e.demo.armor; e.shield = e.demo.shield; } }
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
// floor's perspective under a pixel across the box. A view for a w x h px canvas, fitting the tower and its dummies with `pad` world units round them
const DEMO_LENS = 24; // the lens: focal length x the canvas's size (a long one: next to no perspective)
function demoView3d(S, w, h, pad = 60) {
  const pts = [...S.G.towers, ...S.G.enemies], x0 = Math.min(...pts.map(o => o.x)) - pad, x1 = Math.max(...pts.map(o => o.x)) + pad;
  const y0 = Math.min(...pts.map(o => o.y)) - pad, y1 = Math.max(...pts.map(o => o.y)) + pad, tilt = warpTilt(), c = Math.cos(tilt), s = Math.sin(tilt);
  const k = Math.min(w / (x1 - x0), h / ((y1 - y0) * c + 90 * s)), mx = (x0 + x1) / 2, my = (y0 + y1) / 2; // (90: room for the prism standing up)
  const ox = w / 2 - mx * k, oy = h / 2 - CY * k - c * (my - CY) * k + 20 * s * k * 0.5, f = DEMO_LENS * Math.max(w, h);
  S.mid = [mx, my];
  return { k, ox, oy, p: { core: [ox + CX * k, oy + CY * k], D: 0, L: Infinity, T: Infinity, hc: 1, e: 1, P: 1, c, s, f, k, z: 1, oy: 0 } };
}
function demoDraw3d(S) {
  const up = (x, y, fn, h) => { const [a, b, c2, d, e, f] = warpFrame(x, y, h || 0); ctx.setTransform(a, b, c2, d, e, f); ctx.save(); fn(); ctx.restore(); };
  const t = G.towers[0], m = S.mid || [t.x, t.y];
  const th0 = drawThreat; drawThreat = () => {}; // (no threat marks: a dummy is no threat - its ETA reads as if it walked)
  try { up(m[0], m[1], () => { ctx.save(); drawTowerRange(t, true); ctx.restore(); drawSceneTop(); drawFx("beams"); }); } finally { drawThreat = th0; } // the floor
  for (const e of G.enemies) { const w = enemyWallPieces(e); if (w.length) warpShieldLines(w, COL[ENEMIES[e.type].color], 0.8 * SHIELD_DRAW_A * enemyVis(e), [e.x, e.y]); }
  const dice = G.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of dice) up(e.x, e.y, () => drawEnemy(e, true));
  for (const e of dice) { e.geomAt = -1; warpSolid(e); } // (the geometry under this camera, never the board's cached one)
  if (t) {
    const c0 = CELLS[t.cell], h = towerH(t), col = COL[TOWERS[t.kind].color];
    warpPrism({ x: t.x, y: t.y, h, col, pts: c0.pts.map(p => ({ x: t.x + (p.x - c0.x) * TOWER_K * TOWER_DRAW_K, y: t.y + (p.y - c0.y) * TOWER_K * TOWER_DRAW_K })) });
    up(t.x, t.y, () => drawTower(t), h / 2);
  }
  const pp = (x, y, fn, far) => { const P = warpProjectScratch(x, y), k = cam.k * (far ? P.s : 1); ctx.setTransform(k, 0, 0, k, P.x - x * k, P.y - y * k); fn(); };
  ctx.save(); try { drawFx("dmg", (x, y, fn) => pp(x, y, fn, true)); drawFx("text", pp); } finally { ctx.restore(); }
}
