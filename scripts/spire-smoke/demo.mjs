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
        /* NUMBERS EXPIRE (owner, 2026-11-03: "carrier demo bug, numbers stuck" - the scene never aged its effects): none past its life, the list bounded */
        const old = S.fx.filter(f => !(f.t < f.life)).length + S.dmgLive.filter(f => !(f.t < f.life)).length;
        if (old || S.fx.length > 600 || S.G.over) bad.push(kind + "." + key + " " + tier + ": " + old + " effects past their life, " + S.fx.length + " in all" + (S.G.over ? ", game over" : ""));
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
  // 1x play on any screen (Wai, 2026-11-06: "why does GRV nova so often" - one step a drawn frame was 2.5x on a 120 Hz phone): one real
  // second is BASE_SPEED game seconds at 120 Hz and at 60 Hz alike, and a stalled tab's long frame steps no more than 0.05 s of it
  for (const hz of [120, 60]) { const a = r("demoCard.S.t"); for (let i = 0; i < hz; i++) r(`demoTick(${1 / hz})`); const g = r("demoCard.S.t") - a; if (Math.abs(g - 0.8) > 1e-6) return `one real second at ${hz} Hz ran ${g.toFixed(4)} game s, not BASE_SPEED 0.8`; }
  { const a = r("demoCard.S.t"); r("demoTick(3)"); const g = r("demoCard.S.t") - a; if (Math.abs(g - 0.04) > 1e-6) return `a 3 s stall stepped ${g.toFixed(4)} game s, not 0.05 x 0.8`; }
  r(`document.querySelector(".asp-demo-i").onclick({ stopPropagation() {} })`);
  const t0 = r("demoCard.S.t"); for (let i = 0; i < 10; i++) r("demoTick()");
  if (!r("demoCard.text")) return "the i did not flip to the sentence";
  if (r("demoCard.S.t") !== t0) return "the scene ran while the sentence showed";
  r("closeCard(); demoTick();");
  return r("demoCard.S === null && demoCard.cv === null && !demoCard.text") ? "" : "the scene kept running after the card closed";
});



check("demo layouts: walkers in packs the number gap apart, both lanes and every walker's die and number inside the box, every layout at every tier", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), C = CELLS[cell], g = DEMO_NUM_GAP * (DMG_PX_MIN + DMG_PX_SPAN);
    for (const kind of Object.keys(DEMO_LAYOUTS)) for (const [key, L] of Object.entries(DEMO_LAYOUTS[kind])) for (let tier = key === "base" ? 0 : 1; tier <= (key === "base" ? 0 : SKILL_TIERS); tier++) {
      const t = { kind, cell, x: C.x, y: C.y, lvl: 1, skills: key === "base" ? {} : { [key]: tier } }; t.lvl = 1 + towerLevel(t);
      const r = towerStats(t).range, { c, hh } = demoSpan(r), P = demoPlace(kind, towerStats(t), cell, L);
      for (let ln = 0; ln < P.lanes.length; ln++) { const on = P.filter(d => d.lane === ln && d.at > 0).map(d => d.at * P.lanes[ln].len).sort((a, b) => a - b);
        for (let i = 1; i < on.length; i++) if (on[i] - on[i - 1] < g * 0.9) { bad.push(kind + "." + key + " " + tier + " lane " + ln + ": " + Math.round(on[i] - on[i - 1]) + " u apart"); break; }
        const Y = c * (P.lanes[ln].pts[0].y - C.y);
        for (const d of P.filter(d => d.lane === ln)) { const sz = demoReach(d.type); if (Y + sz * c > hh + 0.5 || Y - sz - demoNumRoom() < -hh - 0.5) { bad.push(kind + "." + key + " " + tier + " lane " + ln + " " + d.type + " outside the box"); break; } } } }
    return bad.slice(0, 6).join("; "); })()`);
});

check("demo isolation: a scene left running (60 s of fast laps) never ends a game - no game over, win, end screen, end stats, leaderboard or end sound (2026-11-03)", () => {
  const env = boot(), r = env.run;
  return r(`(() => { const seen = []; const wrap = n => { const f = window[n]; window[n] = function (...a) { seen.push(n); return f.apply(this, a); }; return f; };
    const keep = ["gameOver", "winGame", "showOverlay", "renderEndStats", "showAscendants", "showAscend"].map(n => [n, wrap(n)]), sfx0 = sfx; sfx = (n, ...a) => { if (n === "over") seen.push("sfx over"); return sfx0(n, ...a); };
    try { const cell = CELLS.findIndex((c, i) => cellOpen(i)), t = { kind: "frz", cell, x: CELLS[cell].x, y: CELLS[cell].y, lvl: 1 };
      const S = demoScene("frz", {}, cell, demoPlace("frz", towerStats(t), cell, DEMO_LAYOUTS.frz.base)); S.G.lives = 18; // (a real game's lives: no walker may cost one)
      for (let f = 0; f < 3600; f++) demoFrame(S);
      return seen.length ? "called: " + [...new Set(seen)].join(", ") : S.G.over ? "the private game is over" : S.G.lives !== 18 ? "walkers cost " + (18 - S.G.lives) + " lives" : "";
    } finally { for (const [n, f] of keep) window[n] = f; sfx = sfx0; } })()`);
});

// LATE BUILDS (2026-11-07, Leader: "a demo that shows no pools for 5 of 7 s misreads ACD"): every axis's layout at 13 points (that axis V, the
// others IV), 7 s. No scene may send a real wave (a gap between lattice rows read as a clear field: step sent one onto the board's lanes), every
// enemy is a demo walker, and ACD's Spill V keeps pools from 2 s on (its goo one-shot wave-30 walkers before a jet held one - walkers now take
// the health of the wave the tower's points reach, demoWave)
check("demo late builds: at 13 points no scene sends a real wave or holds a non-demo enemy, and ACD Spill V keeps pools all the way (7 s, every axis)", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), c = CELLS[cell], rnd0 = Math.random;
    try { for (const kind of Object.keys(DEMO_LAYOUTS)) for (const [key, L] of Object.entries(DEMO_LAYOUTS[kind])) {
      if (key === "base") continue;
      let sd = 777; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const skills = {}; for (const ax of SKILL_TREES[kind]) skills[ax.id] = ax.id === key ? SKILL_TIERS : SKILL_TIERS - 1;
      const t = { kind, cell, x: c.x, y: c.y, lvl: 1, skills }; t.lvl = 1 + towerLevel(t);
      const S = demoScene(kind, skills, cell, demoPlace(kind, towerStats(t), cell, L)); let dry = 0;
      for (let f = 0; f < 7 * 60; f++) { demoFrame(S); if (f >= 120 && f % 30 === 0 && kind === "acd" && key === "contagion" && !(S.G.towers[0].puddles || []).length) dry++; }
      if (S.G.wave !== 1) bad.push(kind + "." + key + ": the scene sent wave " + S.G.wave);
      const odd = S.G.enemies.filter(e => !e.dead && !e.demo).length; if (odd) bad.push(kind + "." + key + ": " + odd + " non-demo enemies");
      { const done = S.G.enemies.length >= 0 ? S.T.filter(x => !S.G.enemies.some(e => !e.dead && e.tally === x)) : [], hurt = done.filter(x => x.dmg > 0).length; /* THE TOWER REACHES THEM (Leader, 2026-11-07: 7.8.4's SOL aimed its beam off the demo's lanes - "hits" passed on one walker): at least half the walkers that left the scene took damage */
        if (done.length >= 4 && hurt < done.length / 2) bad.push(kind + "." + key + ": only " + hurt + " of " + done.length + " walkers that left took any damage"); }
      if (dry > 2) bad.push(kind + "." + key + ": no pools at " + dry + " of 10 checks from 2 s"); /* (at most 2 dry: since ~90% of walkers die (demoTune, 2026-11-07) the box can clear for a moment) */
    } } finally { Math.random = rnd0; }
    return bad.join("; "); })()`);
});

// ~90% DIE (owner, 2026-11-07: "For all demo try to have ~90% enemies die"): every layout at tier 0 or 13 points, 10 s in, then 30 s counted -
// the share of walkers killed (demoTune's S.kills / S.exits) at least DEMO_KILL_PIN. (Measured 2026-11-07: 36 of 49 builds in 0.8-0.97, the sparse
// tier-0 ones and GRV's void lower - the floor catches a scene that stops killing; the old scenes sat near 0)
const DEMO_KILL_PIN = 0.25; // (IFR's tier 0, one meteor and no flares, sits at ~0.28: fewer walkers lost its first hit in the 6 s behaviour check)
check("demo kills: every layout, at tier 0 or 13 points, kills at least " + DEMO_KILL_PIN + " of the walkers that leave the scene (10 s in, 30 s counted)", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), c = CELLS[cell], rnd0 = Math.random;
    try { for (const kind of Object.keys(DEMO_LAYOUTS)) for (const [key, L] of Object.entries(DEMO_LAYOUTS[kind])) {
      let sd = 777; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const sk = {}; if (key !== "base") for (const ax of SKILL_TREES[kind]) sk[ax.id] = ax.id === key ? SKILL_TIERS : SKILL_TIERS - 1;
      const t = { kind, cell, x: c.x, y: c.y, lvl: 1, skills: sk }; t.lvl = 1 + towerLevel(t);
      const S = demoScene(kind, sk, cell, demoPlace(kind, towerStats(t), cell, L));
      for (let f = 0; f < 600; f++) demoFrame(S); const k0 = S.kills || 0, e0 = S.exits || 0;
      for (let f = 0; f < 1800; f++) demoFrame(S); const k = (S.kills || 0) - k0, e = (S.exits || 0) - e0;
      if (k + e && k / (k + e) < ${DEMO_KILL_PIN}) bad.push(kind + "." + key + ": " + k + " killed, " + e + " left");
    } } finally { Math.random = rnd0; }
    return bad.join("; "); })()`);
});

// THE SIGNATURE (owner, 2026-11-03: "grv demo is not showing voids" - the scene never ran the pass that draws them): every tower's scene,
// drawn in 3D, must DRAW its main effect - canvas calls made inside that effect's own draw function (GRV the void core, ACD the jets,
// IFR the meteors and fires, CRR the interceptors, FRZ the aura), or ARC's chain / SOL's beam in the shared effects in the tower's colour
const SIGNATURE = { grv: "drawGrvCore", acd: "drawAcd", ifr: "drawIfr", crr: "drawCar", frz: "drawFrzSkill", arc: "beam", sol: "beam" };
check("demo signature: every tower's scene draws its main effect (GRV voids, ARC chains, SOL beam, ACD jets, IFR meteor, CRR interceptors, FRZ aura), base and every axis", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), C = CELLS[cell], SIG = ${JSON.stringify(SIGNATURE)}, rnd0 = Math.random;
    try { for (const kind of Object.keys(DEMO_LAYOUTS)) for (const key of Object.keys(DEMO_LAYOUTS[kind])) {
      let sd = 777; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const skills = key === "base" ? {} : { [key]: 3 }, t = { kind, cell, x: C.x, y: C.y, lvl: 1, skills }; t.lvl = 1 + towerLevel(t);
      const S = demoScene(kind, skills, cell, demoPlace(kind, towerStats(t), cell, DEMO_LAYOUTS[kind][key])), cv = document.createElement("canvas"); cv.width = 372; cv.height = 180;
      const c2 = cv.getContext("2d"), view = demoView3d(S, 372, 180), sig = SIG[kind]; let on = false, ops = 0, beams = 0, held = 0;
      const marks = ["fill", "stroke", "drawImage", "fillRect", "strokeRect", "fillText"].map(m => [m, c2[m]]); for (const [m, f] of marks) c2[m] = function (...a) { if (on) ops++; return f.apply(this, a); };
      const f0 = sig !== "beam" ? window[sig] : null; if (f0) window[sig] = function (...a) { const was = on; on = true; try { return f0.apply(this, a); } finally { on = was; } };
      try { for (let f = 0; f < 360; f++) { demoFrame(S, c2, view, demoDraw3d); if (sig === "beam") { beams += S.fx.filter(x => x.k === "beam" && x.color === TOWERS[kind].color).length; if (kind === "sol") { const tb = demoRun(S, () => solTrackBeams()) || []; beams += tb.length; held = Math.max(held, tb.length); } } } }
      finally { if (f0) window[sig] = f0; for (const [m, f] of marks) c2[m] = f; }
      if (kind === "sol" && key === "refraction" && held < 2) bad.push("sol.refraction III: no split beam drawn (at most " + held + " held beam at once)"); // REFLECTION's splits (owner, 2026-11-04: "splits towards N targets")
      if (sig === "beam" ? !beams : !ops) bad.push(kind + "." + key + " III: no " + (sig === "beam" ? kind + "-coloured beam" : sig + " drawing"));
    } } finally { Math.random = rnd0; }
    return bad.join("; "); })()`);
});

// RESPAWN, NOT REPOSITION (owner, 2026-11-03: "ARC chaining across the demo, despawn and respawn, dont just reposition?"): a walker out at the
// left used to be the same object put back at the right, so ARC's chain (its beam holds the enemy itself) stretched across the whole box. Over a
// full lap of every ARC layout (tier III; base at 0) no ARC beam, read at its live ends, may run longer than 1.3 x its reach (the tower's range or its jump, ARC_VOLT_REACH)
check("demo in sight: every walker stays inside the box and every beam lands inside it, every tower and layout (owner, 2026-11-06: \"ARC demo keeps reflecting between offscreen invincible enemies\")", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), C = CELLS[cell], rnd0 = Math.random;
    try { for (const kind of Object.keys(DEMO_LAYOUTS)) for (const key of Object.keys(DEMO_LAYOUTS[kind])) {
      let sd = 4242; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const skills = key === "base" ? {} : { [key]: 3 }, t = { kind, cell, x: C.x, y: C.y, lvl: 1, skills }; t.lvl = 1 + towerLevel(t);
      const S = demoScene(kind, skills, cell, demoPlace(kind, towerStats(t), cell, DEMO_LAYOUTS[kind][key])), lo = DEMO_BOX_OVER - 1;
      const inBox = e => !e.demo || !e.demo.walk || (e.s >= lo && e.s <= S.lanes[e.demo.lane].len - lo);
      for (let f = 0; f < 600; f++) { demoFrame(S); let msg = "";
        for (const e of S.G.enemies) if (!e.dead && !inBox(e)) { msg = "a walker at s " + e.s.toFixed(0); break; }
        if (!msg) for (const b of S.fx) if (b.k === "beam" && b.b && b.b.demo && !b.b.dead && !(b.t > 0) && !inBox(b.b)) { msg = "a beam onto a walker outside the box"; break; }
        if (msg) { bad.push(kind + "." + key + " frame " + f + ": " + msg); break; } }
    } } finally { Math.random = rnd0; }
    return bad.slice(0, 6).join("; "); })()`);
});
check("demo respawn: no ARC chain runs across the scene - walkers leave at the left and fresh ones enter at the right (a full lap, every layout)", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), C = CELLS[cell], rnd0 = Math.random;
    try { for (const key of Object.keys(DEMO_LAYOUTS.arc)) {
      let sd = 777; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const skills = key === "base" ? {} : { [key]: 3 }, t = { kind: "arc", cell, x: C.x, y: C.y, lvl: 1, skills }; t.lvl = 1 + towerLevel(t);
      const st = towerStats(t), S = demoScene("arc", skills, cell, demoPlace("arc", st, cell, DEMO_LAYOUTS.arc[key])), lim = Math.max(st.range, st.arcRange || 0) * 1.3;
      let worst = 0, laps = 0; const n0 = S.T.length;
      for (let f = 0; f < 1500; f++) { demoFrame(S); for (const b of S.fx) { if (b.k !== "beam" || b.color !== TOWERS.arc.color) continue;
        const x1 = b.a ? b.a.x : b.x1, y1 = b.a ? b.a.y : b.y1, x2 = b.b ? b.b.x : b.x2, y2 = b.b ? b.b.y : b.y2; worst = Math.max(worst, Math.hypot(x2 - x1, y2 - y1)); } }
      laps = S.T.length - n0;
      if (worst > lim) bad.push("arc." + key + ": a chain " + worst.toFixed(0) + " u long (reach " + (lim / 1.3).toFixed(0) + ")");
      if (!laps) bad.push("arc." + key + ": no walker replaced in 25 s (no lap to check)");
    } } finally { Math.random = rnd0; }
    return bad.join("; "); })()`);
});

// CRR'S WING COMES HOME (owner, 2026-11-03: "CRR demo not launching interceptors properly"): run dry near its carrier - the scene's lanes pass
// 0.45 r from it - an interceptor's turn limit circled it ~50 u out for good, and with the whole wing circling nothing launched again. In every
// CRR layout at every tier, no interceptor may spend over 2 s flying home, and every interceptor launches at least once
check("demo CRR: every interceptor gets home within 2 s and the wing keeps launching (every layout, every tier, 12 s)", () => {
  return run(`(() => { const bad = [], cell = CELLS.findIndex((c, i) => cellOpen(i)), C = CELLS[cell], rnd0 = Math.random;
    try { for (const key of Object.keys(DEMO_LAYOUTS.crr)) for (const tier of key === "base" ? [0] : [1, 2, 3, 4, 5]) {
      let sd = 777; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const skills = key === "base" ? {} : { [key]: tier }, t = { kind: "crr", cell, x: C.x, y: C.y, lvl: 1, skills }; t.lvl = 1 + towerLevel(t);
      const S = demoScene("crr", skills, cell, demoPlace("crr", towerStats(t), cell, DEMO_LAYOUTS.crr[key])), T = S.G.towers[0], back = new Map(), was = new Map();
      let longest = 0, sorties = 0;
      for (let f = 0; f < 720; f++) { demoFrame(S); for (const i of T.icp || []) { /* 12 s: a sortie is up to 30 volleys since 2026-11-05 ("fire for longer"), so Armament III-V make ~one sortie an interceptor in 10 */
        if (was.get(i) === "home" && i.state === "out") sorties++; was.set(i, i.state);
        const n = i.state === "back" ? (back.get(i) || 0) + 1 : 0; back.set(i, n); longest = Math.max(longest, n); } }
      const wing = (T.icp || []).length;
      if (longest > 120) bad.push("crr." + key + " " + tier + ": an interceptor " + (longest / 60).toFixed(1) + " s flying home");
      if (sorties < wing) bad.push("crr." + key + " " + tier + ": " + sorties + " sorties for " + wing + " interceptors in 12 s");
    } } finally { Math.random = rnd0; }
    return bad.join("; "); })()`);
});
