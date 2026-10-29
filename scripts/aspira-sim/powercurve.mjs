// POWER CURVES BY ENEMY TYPE (owner, 2026-10-15: "2 curves for tower power vs cost: with a good build (players choose towers
// and upgrades that cover each other's weaknesses) and with bad build (one with a weakness with no answers) ... scale the
// enemies so that the enemy power line is smack in the middle of the 2 build lines", "the curves should be by type"):
//   1. CREDITS by wave: what a player who kills everything has earned by the start of wave w (bounty only - a spend-all
//      player banks no interest), from a game whose enemies all die.
//   2. BUILDS: every trio (one kind left out) x every tower either buying all three axes or SKIPPING one (never bought, however
//      rich) - 4 x 64 builds. Bought with those credits: the towers, then the cheapest next purchase on each tower's axis order.
//   3. RANK (per type, at SCOUT waves): every build against waves of ONLY that type, at enemy HP x 1 and 8 - the leak shares
//      summed. The best and the worst build per type and scout wave.
//   4. HOLD (per type and wave): the best and worst build's enemy HP x held (<= coverage floor + LEAK leaked), by bisection.
//   5. the ENEMY SCALE for that type at w: sqrt(best x worst) - the middle of the two lines on a log scale.
// usage: node powercurve.mjs [seeds=2] [rounds=7] [out.json]   env WAVES=6,18,..  SCOUT=18,42,66,90,114  ASPIRA_PATCH / ASPIRA_WEB
import fs from "node:fs";
import { isMainThread } from "node:worker_threads";
import { makeGame, cellScores } from "./sim.mjs";
import { runPool } from "./pool.mjs";

const LEAK = Number(process.env.LEAK || 0.01) /* hold = no leak past lane coverage (owner's closest-approach rule: a leak is 0% power; 1% for noise) */, SPAN = 4, FLOOR_HPX = 0.001, TYPES = ["swarm", "fast", "shield", "armor"];
const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,crr,ifr").split(","); // (grv: the gravity tower, 2026-10-15)
const AX = { arc: ["conductivity", "voltage", "capacitance"], frz: ["temp", "rime", "moons"], sol: ["focus", "refraction", "breach"], acd: ["corrosion", "spray", "contagion"], grv: ["void", "supernova", "radiation"] , crr: ["hangar", "launch", "armament"], ifr: ["meteor", "hellfire", "firaga"] };
// every build: a trio, and per tower the axis it skips (null = buys all three)
export const BUILDS = [];
for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) for (let l = j + 1; l < ALL.length; l++) {
  const trio = [ALL[i], ALL[j], ALL[l]], opts = k => [null, ...AX[k]]; // every trio of the kinds (10 with five)
  for (const a of opts(trio[0])) for (const b of opts(trio[1])) for (const c of opts(trio[2])) BUILDS.push({ trio, skip: { [trio[0]]: a, [trio[1]]: b, [trio[2]]: c } });
}
export const label = b => b.trio.map(k => k.toUpperCase() + (b.skip[k] ? "-" + b.skip[k].slice(0, 4) : "")).join(" ");

// build b bought with `credits` in game g (towers first, then the cheapest next purchase on an allowed axis)
function buy(g, b, credits) {
  g.run(`G.money = ${credits};`);
  for (const kind of b.trio) {
    const sc = cellScores(g, kind), free = g.run("CELLS.map((c, i) => i).filter(cellOpen)").filter(ci => !g.G.towers.some(t => t.cell === ci)).sort((x, y) => sc[y] - sc[x]);
    if (g.G.money < g.run(`towerCost("${kind}")`)) return;
    g.place(kind, free[0]);
  }
  for (let guard = 0; guard < 60; guard++) {
    let best = null;
    for (const t of g.G.towers) {
      const T = `G.towers.find(x => x.id === ${t.id})`;
      const ax = AX[t.kind].filter(id => id !== b.skip[t.kind]).find(id => g.run(`skillOf(${T}, "${id}") < axisCap(${T}, "${id}")`));
      if (!ax) continue;
      const c = g.run(`(() => { const t = ${T}, n = tierSteps(t, "${ax}"); return n > 1 ? skillPointsCost(t, n) : upCost(t); })()`);
      if (!best || c < best.c) best = { t, ax, c };
    }
    if (!best || best.c > g.G.money) return;
    g.upgrade(best.t, best.ax);
  }
}

export default async function task(job) {
  if (job.mode === "income") { // credits at the start of each wave, every enemy killed (tiny HP, long reach)
    const g = makeGame(job.seed, "for (const id in ENEMIES) ENEMIES[id].hp *= 1e-6; TOWERS.arc.range *= 20;"); g.reset();
    g.run("G.interest = 0; G.lives = 1e9;"); g.place("arc", 0);
    const at = {}; let guard = 0;
    while (g.G.wave <= 121 && guard++ < 2000000) { if (!(g.G.wave in at)) at[g.G.wave] = g.G.money; g.step(0.05); g.clearFx(); g.run("G.lives = 1e9; G.over = false; if (G.wave % 12 === 0) G.challenged = G.wave;"); if (g.run("G.won")) break; }
    return { at };
  }
  const { bi, type, credits, w, seed, hpx } = job;
  // the coverage FLOOR is lanes only: no shield charges either (they don't scale with HP - 2026-10-15, shields read x246)
  // enemy TOUGHNESS x hpx: HP and shield charges both (round 1: shields beat builds by charges, not HP)
  const g = makeGame(seed, `for (const id in ENEMIES) { ENEMIES[id].hp *= ${hpx}; if (ENEMIES[id].shield) ENEMIES[id].shield = Math.max(1, Math.round(ENEMIES[id].shield * ${hpx})); }` + (job.floor ? " for (const id in ENEMIES) ENEMIES[id].shield = 0;" : "")); g.reset();
  g.run(`G.started = true; G.wave = ${w - 1}; G.lives = 1e6; OPEN_SLOTS = SLOT_ANGLES.slice(); G.opened ||= {}; CELLS.forEach((c, i) => { if (c.unlock) G.opened[i] = true; });`);
  buy(g, BUILDS[bi], credits);
  g.run(`for (let n = ${w}; n < ${w} + ${SPAN} + 2; n++) if (n % 12) WAVE_TYPE_FORCE[n] = "${type}";`); // the window: only this type
  g.run(`G.lastType = "${type === "swarm" ? "fast" : "swarm"}"; G.nextIn = 0;`);
  const end = w + SPAN + (Math.floor((w + SPAN) / 12) - Math.floor((w - 1) / 12)); // (a boss wave inside is skipped)
  let leaked = 0, guard = 0, far = 0; const seen = new Set(); // far: the furthest one of the type got, of its lane (a leak = 1)
  while (g.G.wave < end && guard++ < 600000) {
    if (g.G.wave % 12 === 0) g.run("for (const e of G.enemies) if (e.type === 'bonus' || e.bossKin) { e.dead = true; e.gone = true; } G.spawns = G.spawns.filter(x => !x.list.includes('bonus'));");
    const alive = g.G.enemies.filter(e => !e.dead);
    for (const e of alive) if (e.type === type && !e.bossKin) seen.add(e.id);
    g.step(0.05); g.clearFx();
    for (const e of alive) if (e.dead && e.gone && e.hp > 0 && seen.has(e.id)) leaked++;
    for (const e of g.G.enemies) if (!e.dead && seen.has(e.id)) far = Math.max(far, e.s / g.PATHS[e.pi].len);
    g.run("G.lives = 1e6; G.over = false;");
  }
  // POWER by CLOSEST APPROACH (owner, 2026-10-15: "a leak is 0% tower power, a spawnkill is 100%")
  return { leaked, spawned: seen.size, power: leaked ? 0 : 1 - far };
}

if (isMainThread && process.argv[1] && process.argv[1].endsWith("powercurve.mjs")) {
  const SEEDS = Number(process.argv[2] || 2), ROUNDS = Number(process.argv[3] || 7), OUT = process.argv[4] || null;
  const WAVES = (process.env.WAVES || "6,18,30,42,54,66,78,90,102,114").split(",").map(Number);
  const SCOUT = (process.env.SCOUT || "18,42,66,90,114").split(",").map(Number);
  const url = new URL(import.meta.url);
  const inc = (await runPool(url, [{ mode: "income", seed: 1 }], { quiet: true }))[0].at, cr = w => Math.round(inc[w] || 0);
  const share = rs => rs.reduce((a, x) => a + x.leaked, 0) / Math.max(1, rs.reduce((a, x) => a + x.spawned, 0));
  // 3. RANK every build per type at each scout wave
  // PRIOR=<an earlier run's out.json> (2026-10-15, simulation speed): rank only the builds that run found best or worst for
  // some type, plus every no-skip trio (~40, not 256), and start each hold search +-PRIOR_SPAN log2 round its earlier answer
  const prior = process.env.PRIOR ? JSON.parse(fs.readFileSync(process.env.PRIOR, "utf8")) : null, PRIOR_SPAN = Number(process.env.PRIOR_SPAN || 3);
  const keep = prior ? new Set([...Object.values(prior).flatMap(rows => Object.values(rows).flatMap(r => [r.bestBuild, r.worstBuild])), ...BUILDS.filter(b => !Object.values(b.skip).some(Boolean)).map(label)]) : null;
  const jobs = [];
  for (const type of TYPES) for (const w of SCOUT) BUILDS.forEach((b, bi) => { if (keep && !keep.has(label(b))) return; for (const hpx of [1, 8]) jobs.push({ bi, type, w, credits: cr(w), seed: 1, hpx }); });
  const res = await runPool(url, jobs, { quiet: true });
  console.error("ranking done");
  const pick = {}; // type -> scout wave -> { best, worst }
  for (const type of TYPES) for (const w of SCOUT) {
    const score = BUILDS.map(() => null); // (null: not ranked this run - PRIOR)
    res.forEach((r, i) => { const j = jobs[i]; if (j.type === type && j.w === w) score[j.bi] = (score[j.bi] ?? 0) + r.leaked / Math.max(1, r.spawned); });
    const order = score.map((s, bi) => [s, bi]).filter(x => x[0] !== null).sort((x, y) => x[0] - y[0]);
    (pick[type] ||= {})[w] = { best: order[0][1], worst: order[order.length - 1][1] };
  }
  const nearest = w => SCOUT.reduce((a, s) => (Math.abs(s - w) < Math.abs(a - w) ? s : a), SCOUT[0]);
  // 4. HOLD of the best and worst build per type and wave
  const cells = [];
  for (const type of TYPES) for (const w of WAVES) for (const side of ["best", "worst"]) { const was = prior && prior[type] && prior[type][w] ? Math.log2(prior[type][w][side]) : null; cells.push({ type, w, side, bi: pick[type][nearest(w)][side], credits: cr(w), lo: was == null ? -10 : Math.max(-10, was - PRIOR_SPAN), hi: was == null ? 10 : Math.min(10, was + PRIOR_SPAN) }); }
  const run = async (hpxOf, floor = false) => { const js = []; cells.forEach((c, n) => { for (let seed = 1; seed <= SEEDS; seed++) js.push({ bi: c.bi, type: c.type, w: c.w, credits: c.credits, seed, hpx: hpxOf(c), n, floor }); }); const rs = await runPool(url, js, { quiet: true }); return cells.map((_, n) => share(rs.filter((x, i) => js[i].n === n))); };
  (await run(() => FLOOR_HPX, true)).forEach((f, n) => { cells[n].floor = f; });
  for (let r = 0; r < ROUNDS; r++) {
    cells.forEach(c => { c.m = (c.lo + c.hi) / 2; });
    (await run(c => +(2 ** c.m).toPrecision(4))).forEach((x, n) => { const c = cells[n]; if (x <= c.floor + LEAK) c.lo = c.m; else c.hi = c.m; });
    console.error(`round ${r + 1}/${ROUNDS} done`);
  }
  const pw = c => 2 ** ((c.lo + c.hi) / 2), edge = c => (c.hi - (-10) < 0.2 ? "<" : 10 - c.lo < 0.2 ? ">" : " "), table = {};
  console.log(`POWER CURVES BY TYPE: enemy HP x (today's = 1) the best and worst of ${BUILDS.length} builds hold against ${SPAN} waves of ONLY that type from wave w (<= coverage floor + ${LEAK * 100}% leaked), bought with a kill-everything player's bounty by w (no interest); MIDDLE = sqrt(best x worst), what that type's HP would x by; < / > = at the edge of the search (x1/1024 / x1024); ${SEEDS} seeds, ${ROUNDS} rounds`);
  for (const type of TYPES) {
    console.log(`\n${type.toUpperCase()}\n wave  credits    best  worst  MIDDLE   best build / worst build`);
    for (const w of WAVES) {
      const b = cells.find(c => c.type === type && c.w === w && c.side === "best"), x = cells.find(c => c.type === type && c.w === w && c.side === "worst"), mid = Math.sqrt(pw(b) * pw(x));
      (table[type] ||= {})[w] = { best: pw(b), worst: pw(x), mid, edge: edge(b) + edge(x), bestBuild: label(BUILDS[b.bi]), worstBuild: label(BUILDS[x.bi]) };
      console.log(`${String(w).padStart(5)} ${String(b.credits).padStart(8)} ${edge(b)}${pw(b).toFixed(2).padStart(7)} ${edge(x)}${pw(x).toFixed(2).padStart(6)} ${mid.toFixed(2).padStart(7)}   ${label(BUILDS[b.bi])} / ${label(BUILDS[x.bi])}`);
    }
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(table, null, 1));
  // RAW (2026-10-15, owner: "keep a record of all the stats"): every ranking game and every hold cell, for later analysis
  if (process.env.RAW) fs.writeFileSync(process.env.RAW, JSON.stringify({ credits: inc, builds: BUILDS.map(label), rank: jobs.map((j, i) => ({ bi: j.bi, type: j.type, w: j.w, hpx: j.hpx, leaked: res[i].leaked, spawned: res[i].spawned })), cells: cells.map(c => ({ type: c.type, w: c.w, side: c.side, build: label(BUILDS[c.bi]), credits: c.credits, floor: c.floor, hold: pw(c) })) }));
}
