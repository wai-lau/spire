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
      const spots = []; for (let s = entryS(0); s < PATHS[0].len && spots.length < 5; s += 6) { const p = pathAt(0, s, 0), d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d < range * 0.7 && (!spots.length || s - spots[spots.length - 1].s > 18)) spots.push({ type: spots.length % 2 ? "armor" : "swarm", pi: 0, s }); }
      if (!spots.length) return "no lane spot in reach";
      const S = demoScene("${kind}", {}, cell, spots), cv = document.createElement("canvas"); cv.width = 372; cv.height = 180;
      const c2 = cv.getContext("2d"), view = { k: 0.5, ox: 186 - c.x * 0.5, oy: 90 - c.y * 0.5 };
      for (let f = 0; f < 240; f++) demoFrame(S, c2, view, demoDrawFlat);
      const e = S.G.enemies, hit = e.some(x => x.hp < DEMO_HP) || S.G.towers[0].dealt > 0, moved = e.some(x => x.s !== x.demo.s || x.x !== x.demo.x);
      return !hit ? "the tower never hit a dummy" : moved ? "a dummy moved" : e.length !== spots.length ? "dummies " + e.length + " of " + spots.length : "";
    })()`);
    if (r) bad.push(kind + ": " + r);
  }
  const after = run(REAL);
  if (after !== before) bad.push("the real game changed: " + before + " -> " + after);
  return bad.join("; ");
});
