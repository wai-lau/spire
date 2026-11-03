// /spire - THE CARD'S DEMO SCENE, its foundation (owner, 2026-11-03: "replace the description text box with a tower attacking a group of
// immobile dummies"; "whether the scene switches to an upgrade while you're previewing it, yes"; "ensure that the demo shows off the
// upgrade (include damage numbers)"). A PRIVATE GAME: one tower and its dummies in a G of their own, run by the game's REAL step and
// drawn by the game's real draw code, so the scene can never show a mechanic the tower does not have.
// THE SWAP: the game keeps its run state in a few globals (G, fx, the damage numbers, coins, GRV's and CRR's lists ...). Every scene
// frame swaps the scene's own copies in, runs, and swaps the real ones back (demoIn / demoOut) - with the sound muted and the GPU
// effect batch off - so the real game, paused under the card, is left exactly as it was (smoke: "demo scene leaves the real game alone").
// A new global that step() writes must join DEMO_KEEP's swap, or it leaks between the two games.
// THE DRAW IS PLUGGABLE (demoFrame's draw): flat or 3D sits on top once the owner picks; the scene only lends it the canvas and a camera.
const DEMO_HP = 1e15; // a dummy's health: it never dies (no kill, no reward, no coin), and every hit still shows its number
const DEMO_DT = 1 / 60;
// the real game's state, kept while the scene runs (one scene at a time)
let demoHeld = null;
function demoIn(S) {
  if (demoHeld) throw new Error("demo scene: nested demoIn");
  demoHeld = { G, fx, dmgLive, dmgHold, hitFrom, coins, grvAll, carObs, sparkN, grvLastHit, bannerText, bannerT, bannerCol, shakeUntil, muted, fxBroken: fxGl.broken };
  G = S.G; fx = S.fx; dmgLive = S.dmgLive; dmgHold = S.dmgHold; hitFrom = S.hitFrom; coins = S.coins; grvAll = S.grvAll; carObs = S.carObs;
  sparkN = S.sparkN; grvLastHit = S.grvLastHit; bannerText = S.bannerText; bannerT = S.bannerT; bannerCol = S.bannerCol; shakeUntil = S.shakeUntil;
  muted = true; fxGl.broken = true; // (no sound; the 2D way for hits and rings - the GPU batch belongs to the real frame)
}
function demoOut(S) {
  const H = demoHeld; if (!H) return;
  S.G = G; S.fx = fx; S.dmgLive = dmgLive; S.dmgHold = dmgHold; S.hitFrom = hitFrom; S.coins = coins; S.grvAll = grvAll; S.carObs = carObs;
  S.sparkN = sparkN; S.grvLastHit = grvLastHit; S.bannerText = bannerText; S.bannerT = bannerT; S.bannerCol = bannerCol; S.shakeUntil = shakeUntil;
  G = H.G; fx = H.fx; dmgLive = H.dmgLive; dmgHold = H.dmgHold; hitFrom = H.hitFrom; coins = H.coins; grvAll = H.grvAll; carObs = H.carObs;
  sparkN = H.sparkN; grvLastHit = H.grvLastHit; bannerText = H.bannerText; bannerT = H.bannerT; bannerCol = H.bannerCol; shakeUntil = H.shakeUntil;
  muted = H.muted; fxGl.broken = H.fxBroken; demoHeld = null;
}
const demoRun = (S, fn) => { demoIn(S); try { return fn(); } finally { demoOut(S); } };
// a scene: tower `kind` with `skills` on slot `cell`, and its dummies - [{ type, pi, s }] spots on the lanes (the layouts come later, one a tower)
function demoScene(kind, skills, cell, dummies) {
  const S = { G: freshG(), fx: [], dmgLive: [], dmgHold: null, hitFrom: null, coins: [], grvAll: [], carObs: [], sparkN: 0, grvLastHit: 0, bannerText: "", bannerT: 0, bannerCol: "orange", shakeUntil: 0, t: 0 };
  demoRun(S, () => {
    G.started = true; G.wave = 1; G.nextIn = Infinity; G.money = 0;
    const c = CELLS[cell], t = { id: G.id++, kind, cell, x: c.x, y: c.y, lvl: 1, cd: 0, mode: DEFAULT_MODE[kind], spent: 0 };
    if (hasSkills(t)) { t.skills = { ...skills }; t.lvl = 1 + towerLevel(t); }
    G.towers.push(t);
    for (const d of dummies) {
      spawnEnemy(d.type, d.wave || 30, d.pi, 0); const e = G.enemies[G.enemies.length - 1], p = pathAt(d.pi, d.s, 0);
      e.s = d.s; e.x = p.x; e.y = p.y; e.seen = true; e.hp = e.max = DEMO_HP; e.demo = { s: d.s, x: p.x, y: p.y, armor: e.armor || 0, shield: e.shield || 0 };
    }
  });
  return S;
}
// one scene frame: the real step, then the dummies held where they stand (never moved, never leaked); then `draw` (pluggable) onto `c2d`
// under the scene's camera `view` ({ k, ox, oy }) - the real ctx and cam come back after
function demoFrame(S, c2d, view, draw) {
  demoRun(S, () => {
    step(DEMO_DT); S.t += DEMO_DT;
    for (const e of G.enemies) { const h = e.demo; if (!h) continue; e.s = h.s; e.x = h.x; e.y = h.y; e.dead = false; e.gone = false; if (e.hp < DEMO_HP * 0.15) e.hp = DEMO_HP; }
    if (!draw || !c2d) return;
    const ctx0 = ctx, cam0 = { ...cam };
    ctx = c2d; Object.assign(cam, view);
    try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c2d.canvas.width, c2d.canvas.height); ctx.setTransform(cam.k, 0, 0, cam.k, cam.ox, cam.oy); draw(S); }
    finally { ctx = ctx0; Object.assign(cam, cam0); }
  });
}
// a first FLAT draw (top-down, the 2D path), until the owner picks flat or 3D: the tower, the dummies, then the shots and the numbers
function demoDrawFlat(S) {
  ctx.save(); drawSceneTop(); ctx.restore();
  for (const e of G.enemies) { ctx.save(); drawEnemy(e, false); ctx.restore(); }
  for (const t of G.towers) { ctx.save(); drawTower(t); ctx.restore(); }
  ctx.save(); drawFx("beams"); drawFx("shots"); drawFx("dmg"); drawFx("text"); ctx.restore();
}
