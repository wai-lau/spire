// /spire DEMO SCENE CHECKS (aspira-demo.js, aspira-demo-layouts.js; owner, 2026-11-03: "Add a mechanism to ensure demo scenes are always up
// to date"). Three gates, all on every game-file commit (exec-fn's pre-commit runs this smoke):
//   COVERAGE   every tower has a tier-0 layout and one for each of its axes (tiers I..V); no layout names a tower or axis that is gone
//   BEHAVIOUR  every layout at every tier, run seeded for DEMO_CHECK_S, shows what it declares (hits, many, strips, pops, slows, fast) -
//              a mechanic change that stops a scene showing its effect fails here (ARCHITECTURE §11)
//   ISOLATION  a scene run and drawn in 3D leaves the real game exactly as it was
// Registered into the smoke harness like waves.mjs.
import { boot, check } from "./harness.mjs";

const { run } = boot();
const DEMO_CHECK_S = 6;
const SHOWS = ["hits", "many", "strips", "pops", "slows", "fast"];

check("demo coverage: a layout for every tower's tier 0 and every axis, none for a tower or axis that is gone", () => {
  return run(`(() => { const bad = [], known = ${JSON.stringify(SHOWS)};
    for (const kind of Object.keys(SKILL_TREES)) { const L = DEMO_LAYOUTS[kind]; if (!L) { bad.push(kind + ": no layouts"); continue; }
      if (!L.base) bad.push(kind + ": no base (tier 0) layout");
      for (const ax of SKILL_TREES[kind]) if (!L[ax.id]) bad.push(kind + "." + ax.id + " (" + ax.name + "): no layout");
      for (const key of Object.keys(L)) { if (key !== "base" && !SKILL_TREES[kind].some(ax => ax.id === key)) bad.push(kind + "." + key + ": no such axis");
        const s = L[key].shows || []; if (!s.length) bad.push(kind + "." + key + ": shows nothing"); for (const x of s) if (!known.includes(x)) bad.push(kind + "." + key + ": unknown show " + x); } }
    for (const kind of Object.keys(DEMO_LAYOUTS)) if (!SKILL_TREES[kind]) bad.push(kind + ": no such tower");
    return bad.join("; "); })()`);
});

check("demo behaviour: every layout at every tier shows what it declares (seeded, " + DEMO_CHECK_S + " s each)", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), c = CELLS[cell], rnd0 = Math.random;
    try { for (const kind of Object.keys(DEMO_LAYOUTS)) for (const [key, L] of Object.entries(DEMO_LAYOUTS[kind]))
      for (let tier = key === "base" ? 0 : 1; tier <= (key === "base" ? 0 : SKILL_TIERS); tier++) {
        let sd = 777; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const skills = key === "base" ? {} : { [key]: tier }, t = { kind, cell, x: c.x, y: c.y, lvl: 1, skills }; t.lvl = 1 + towerLevel(t);
        const S = demoScene(kind, skills, cell, demoPlace(kind, towerStats(t), cell, L));
        for (let f = 0; f < ${DEMO_CHECK_S} * 60; f++) demoFrame(S);
        const got = demoShows(S), miss = L.shows.filter(x => !got.includes(x));
        if (miss.length) bad.push(kind + "." + key + " " + tier + ": no " + miss.join(", ") + " (showed " + (got.join(", ") || "nothing") + ")");
      } } finally { Math.random = rnd0; }
    return bad.join("; "); })()`);
});

// the real game's state, as a string: what a leak from the scene would change
const REAL = `JSON.stringify({ G: G === window.__G0, money: G.money, wave: G.wave, n: G.enemies.length, hp: G.enemies.reduce((a, e) => a + e.hp, 0),
  tw: G.towers.map(t => [t.id, t.cd, t.dealt || 0, t.x, t.y]), fx: fx === window.__fx0 && fx.length, dmg: dmgLive.length, coins: coins.length,
  grv: grvAll.length, car: carObs.length, muted, broken: fxGl.broken, ctx: ctx === window.__ctx0, cam: [cam.k, cam.ox, cam.oy], p: warp.p === window.__p0, held: demoHeld })`;
check("demo isolation: every tower's scene, run and drawn in 3D, leaves the real game alone", () => {
  run(`G = newGame(); G.money = 1e6; ui.build = "arc"; { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); }
       window.__G0 = G; window.__fx0 = fx; window.__ctx0 = ctx; window.__p0 = warp.p;`);
  for (let i = 0; i < 30; i++) run("step(1 / 60)");
  const before = run(REAL), bad = [];
  for (const kind of ["arc", "frz", "sol", "acd", "grv", "crr", "ifr"]) {
    const r = run(`(() => { const cell = CELLS.findIndex((c, i) => cellOpen(i)), c = CELLS[cell], t = { kind: "${kind}", cell, x: c.x, y: c.y, lvl: 1 };
      const S = demoScene("${kind}", {}, cell, demoPlace("${kind}", towerStats(t), cell, DEMO_LAYOUTS.${kind}.base)), cv = document.createElement("canvas"); cv.width = 372; cv.height = 180;
      const c2 = cv.getContext("2d"), view = demoView3d(S, 372, 180); for (let f = 0; f < 120; f++) demoFrame(S, c2, view, demoDraw3d);
      return S.t > 1.9 ? "" : "the scene did not run"; })()`); /* (what it shows is the behaviour gate's; this one is isolation) */
    if (r) bad.push(kind + ": " + r);
  }
  const after = run(REAL);
  if (after !== before) bad.push("the real game changed: " + before + " -> " + after);
  return bad.join("; ");
});

check("demo on the card: a placed tower's card shows its scene, the frame loop runs it, the i flips to the sentence, closing drops it", () => {
  const env = boot(), r = env.run; // (demoTick driven directly after one real frame: a fresh game's first frames cost ~2 s each in the fake DOM)
  r(`G = newGame(); G.money = 1e6; ui.build = "sol"; { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); } ui.sel = G.towers[0].id; refreshPanels();`);
  if (!r(`$("asp-pop").innerHTML.includes("<div id=\\"asp-desc-box\\"><div class=\\"asp-demo")`)) return "no scene in the card's description box";
  r("window.__ticks = 0; window.__dt0 = demoTick; demoTick = () => { __ticks++; __dt0(); }"); env.dom.tick(1000 / 60); r("demoTick = __dt0");
  if (!r("__ticks")) return "the frame loop never calls demoTick";
  for (let i = 0; i < 20; i++) r("demoTick()");
  if (!r("!!demoCard.S && demoCard.S.t > 0.2")) return "the scene does not run (t " + r("demoCard.S && demoCard.S.t") + ")";
  r(`document.querySelector(".asp-demo-i").onclick({ stopPropagation() {} })`);
  const t0 = r("demoCard.S.t"); for (let i = 0; i < 10; i++) r("demoTick()");
  if (!r("demoCard.text")) return "the i did not flip to the sentence";
  if (r("demoCard.S.t") !== t0) return "the scene ran while the sentence showed";
  r("closeCard(); demoTick();");
  return r("demoCard.S === null && demoCard.cv === null && !demoCard.text") ? "" : "the scene kept running after the card closed";
});

check("demo layouts: held dummies stand far enough apart that each one's damage numbers read (DEMO_NUM_GAP x the biggest number)", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), g = DEMO_NUM_GAP * (DMG_PX_MIN + DMG_PX_SPAN);
    for (const kind of Object.keys(DEMO_LAYOUTS)) for (const [key, L] of Object.entries(DEMO_LAYOUTS[kind])) { if (L.place === "walk") continue;
      const t = { kind, cell, x: CELLS[cell].x, y: CELLS[cell].y, lvl: 1 }, P = demoPlace(kind, towerStats(t), cell, L); let m = Infinity;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) m = Math.min(m, Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y));
      if (m < g * 0.9) bad.push(kind + "." + key + " " + Math.round(m) + " < " + Math.round(g)); }
    return bad.join("; "); })()`);
});
