// /spire DEMO SCENE CHECKS (aspira-demo.js, 2026-11-03): the card's private game runs the real step and draw for every tower, its dummies
// stay put and take hits, and the real game under the card is left exactly as it was. Registered into the smoke harness like waves.mjs.
import { boot, check } from "./harness.mjs";

const { run } = boot();
// the real game's state, as a string: what a leak from the scene would change
const REAL = `JSON.stringify({ G: G === window.__G0, money: G.money, wave: G.wave, n: G.enemies.length, hp: G.enemies.reduce((a, e) => a + e.hp, 0),
  tw: G.towers.map(t => [t.id, t.cd, t.dealt || 0, t.x, t.y]), fx: fx === window.__fx0 && fx.length, dmg: dmgLive.length, coins: coins.length,
  grv: grvAll.length, car: carObs.length, muted, broken: fxGl.broken, ctx: ctx === window.__ctx0, cam: [cam.k, cam.ox, cam.oy], held: demoHeld })`;
check("demo scene: every tower's private game runs the real step and draw, dummies hold and take hits, the real game is left alone", () => {
  run(`G = newGame(); G.money = 1e6; ui.build = "arc"; { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); }
       window.__G0 = G; window.__fx0 = fx; window.__ctx0 = ctx;`);
  for (let i = 0; i < 30; i++) run("step(1 / 60)");
  const before = run(REAL), bad = [];
  for (const kind of ["arc", "frz", "sol", "acd", "grv", "crr", "ifr"]) {
    const r = run(`(() => {
      const cell = CELLS.findIndex((c, i) => cellOpen(i)), c = CELLS[cell], range = towerStats({ kind: "${kind}", lvl: 1, cell, x: c.x, y: c.y }).range;
      // DETERMINISTIC (2026-11-03: GRV missed 1 run in 3): a seeded random for the scene's run, and the five lane points NEAREST the tower, any lane
      const rnd0 = Math.random; let sd = 777; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      try {
      const cand = []; PATHS.forEach((P, pi) => { for (let s = entryS(pi); s < P.len; s += 6) { const p = pathAt(pi, s, 0); cand.push({ pi, s, d: Math.hypot(p.x - c.x, p.y - c.y) }); } });
      cand.sort((a, b) => a.d - b.d); const spots = [];
      for (const q of cand) { if (spots.length >= 5) break; if (q.d > 24 && spots.every(o => o.pi !== q.pi || Math.abs(o.s - q.s) > 18)) spots.push({ type: spots.length % 2 ? "armor" : "swarm", pi: q.pi, s: q.s, d: q.d }); }
      if (!spots.length || spots[0].d > range) return "no lane spot in reach";
      const S = demoScene("${kind}", {}, cell, spots), cv = document.createElement("canvas"); cv.width = 372; cv.height = 180;
      const c2 = cv.getContext("2d"), view = demoView3d(S, 372, 180);
      const e = S.G.enemies, hits = () => e.some(x => x.hp < DEMO_HP) || S.G.towers[0].dealt > 0; /* up to 10 s: GRV's first void can take a while to land */
      for (let f = 0; f < 600 && (f < 240 || !hits()); f++) demoFrame(S, c2, view, demoDraw3d);
      const hit = hits(), moved = e.some(x => x.s !== x.demo.s || x.x !== x.demo.x);
      return !hit ? "the tower never hit a dummy" : moved ? "a dummy moved" : e.length !== spots.length ? "dummies " + e.length + " of " + spots.length : "";
      } finally { Math.random = rnd0; }
    })()`);
    if (r) bad.push(kind + ": " + r);
  }
  const after = run(REAL);
  if (after !== before) bad.push("the real game changed: " + before + " -> " + after);
  return bad.join("; ");
});
