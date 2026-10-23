// TOWER DAMAGE FIT (2026-10-22, the SOL rework / ACD changes - owner: "keep same strength", "every other non repeating pair of towers"):
// a CELL is the tower bare, or one axis alone at a tier (I, II, III, IV); its TEAM the tower + every pair of two different other kinds
// (15), each pair tower with as many chart points spread (stops.mjs); it plays the waves its tier is bought for (WIN) for a FIXED time
// (the waves come on their timer), every enemy's HP x HPX so nothing dies, lives refilled. The measure: the tower's own CREDITED damage
// (damageCredit: what its debuffs - Breach, Corrosion - add to the others' hits counts as its). Monotone in its damage, no player
// choices (the closest-approach and lives measures were swamped by the smart saver's spending - solmatch.mjs).
//   node solfit.mjs measure old.json        (ASPIRA_WEB=<the reference web>)
//   node solfit.mjs fit old.json [rounds=7]  (the live web): base damage on the BARE cell, then each (axis, tier) lever to its old dealt
// env KIND (sol), SEEDS (1), HPX (1000)
import fs from "node:fs";
import { isMainThread } from "node:worker_threads";
import { makeGame } from "./sim.mjs";
import { runPool } from "./pool.mjs";
import { spreadStops, POINTS_AT } from "./stops.mjs";

const KIND = process.env.KIND || "sol", HPX = Number(process.env.HPX || 1000), SEEDS = Number(process.env.SEEDS || 1), SHARE = process.env.SHARE === "1";
const LEVERS = { sol: { focus: "SOL_PASS", refraction: "SOL_REFRACTION_DMG", breach: "SOL_SCORCH" }, acd: { spray: "ACD_SPRAY_MUL", corrosion: "ACD_CORROSION_DMG", contagion: "ACD_PUDDLE_HEAT" } };
const OTHERS = ["arc", "frz", "sol", "acd", "grv", "car", "ifr"].filter(k => k !== KIND), PAIRS = OTHERS.flatMap((a, i) => OTHERS.slice(i + 1).map(b => [a, b]));
const WIN = { 0: [10, 30], 1: [20, 40], 2: [40, 60], 3: [60, 80], 4: [80, 100] }, STOPS = [1, 2, 3, 4], LEVER = LEVERS[KIND], AXES = Object.keys(LEVER);

export default async function task({ axis, k, pair, seed, patch = "" }) {
  const [from, to] = WIN[k];
  const g = makeGame(seed, `for (const q in ENEMIES) ENEMIES[q].hp *= ${HPX};\n${patch}`); g.reset();
  g.run(`G.money = 1e12; G.started = true; G.wave = ${from - 1}; G.lives = 1e6;`);
  const me = g.place(KIND, 0); if (axis && k) { me.skills = { [axis]: k }; me.lvl = 1 + POINTS_AT[k]; }
  pair.forEach((kind, i) => { const t = g.place(kind, [2, 4][i]); if (k) { t.skills = spreadStops(g.run(`SKILL_TREES[${JSON.stringify(kind)}].map(a => a.id)`), POINTS_AT[k]); t.lvl = 1 + POINTS_AT[k]; } });
  g.run(`let prev = "swarm"; for (let n = 1; n < ${from}; n++) { const w = wavePlan(n, prev); if (w.type !== "bonus") prev = w.type; } G.lastType = prev; G.nextIn = 0;`);
  let guard = 0;
  while (g.G.wave <= to && guard++ < 400000) { g.step(0.05); g.clearFx(); g.run("G.lives = 1e6; G.over = false;"); }
  // SHARE=1: the tower's share of the team's credited damage (real HP, kills happen - a stronger tower takes a bigger slice)
  return { dealt: SHARE ? g.run(`(G.towers[0].dealt || 0) / Math.max(1, G.towers.reduce((a, t) => a + (t.dealt || 0), 0))`) * 1e6 : g.run(`G.towers[0].dealt || 0`) };
}
async function dealt(cells) {
  const jobs = [];
  cells.forEach((c, ci) => { for (const pair of PAIRS) for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ ci, axis: c.axis, k: c.k, pair, seed, patch: c.patch || "" }); });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
  // the geometric mean over the pairs (a pair that lets it deal 10x must not outvote the rest)
  return cells.map((c, ci) => { const rs = res.filter((r, i) => jobs[i].ci === ci); return Math.exp(rs.reduce((a, r) => a + Math.log(Math.max(1, r.dealt)), 0) / rs.length); });
}
const CELLS = [{ axis: null, k: 0 }, ...AXES.flatMap(axis => STOPS.map(k => ({ axis, k })))];
if (isMainThread && process.argv[1].endsWith("solfit.mjs")) {
  const [mode, file] = process.argv.slice(2);
  if (mode === "measure") {
    const d = await dealt(CELLS);
    fs.writeFileSync(file, JSON.stringify(CELLS.map((c, i) => ({ ...c, dealt: d[i], v: 2 }))));
    CELLS.forEach((c, i) => console.log(`${(c.axis || "bare").padEnd(11)} ${c.k}: ${Math.round(d[i])}`));
  } else if (mode === "fit") {
    const old = JSON.parse(fs.readFileSync(file, "utf8")).map(c => (c.v === 2 ? c : { ...c, k: [0, 1, 1, 2, 2, 3, 4][c.k] })), ROUNDS /* (a file measured before 2026-10-23 holds the old levels 0 1 3 5 6) */ = Number(process.argv[4] || 7), g0 = makeGame(1);
    const at = (axis, k) => old.find(c => c.axis === axis && c.k === k).dealt;
    let lo = -4, hi = 4, bestB = null;
    for (let r = 0; r <= ROUNDS; r++) {
      const m = r === 0 ? 0 : (lo + hi) / 2, patch = `TOWERS[${JSON.stringify(KIND)}].dmg *= ${+(2 ** m).toPrecision(4)};`, [d] = await dealt([{ axis: null, k: 0, patch }]), want = at(null, 0);
      if (!bestB || Math.abs(Math.log(d / want)) < Math.abs(Math.log(bestB.d / want))) bestB = { m, d, patch };
      if (r > 0) { if (d < want) lo = m; else hi = m; }
      console.error(`bare round ${r}: x${(2 ** m).toFixed(3)} dealt ${Math.round(d)} (old ${Math.round(want)})`);
    }
    const cells = AXES.flatMap(axis => STOPS.map(k => ({ axis, k, want: at(axis, k), cur: g0.run(`${LEVER[axis]}[${k}]`), lo: -5, hi: 5, best: null })));
    for (let r = 0; r <= ROUNDS; r++) {
      for (const c of cells) { c.m = r === 0 ? 0 : (c.lo + c.hi) / 2; c.v = +(c.cur * 2 ** c.m).toPrecision(4); c.patch = `${bestB.patch}\n${LEVER[c.axis]}[${c.k}] = ${c.v};`; }
      const d = await dealt(cells);
      cells.forEach((c, i) => { if (!c.best || Math.abs(Math.log(d[i] / c.want)) < Math.abs(Math.log(c.best.d / c.want))) c.best = { v: c.v, d: d[i] }; if (r > 0) { if (d[i] < c.want) c.lo = c.m; else c.hi = c.m; } });
      console.error(`stops round ${r} done`);
    }
    console.log(`${KIND} DAMAGE FIT (${PAIRS.length} pairs x ${SEEDS} seeds, HP x${HPX}): base damage x${(2 ** bestB.m).toFixed(4)} (bare ${Math.round(bestB.d)} vs old ${Math.round(at(null, 0))})`);
    for (const axis of AXES) console.log(`${axis} (${LEVER[axis]}): ` + cells.filter(c => c.axis === axis).map(c => `${c.k}: ${c.cur} -> ${c.best.v} (${Math.round(100 * c.best.d / c.want)}%)`).join("  "));
  } else console.log("usage: node solfit.mjs measure|fit <old.json> [rounds]");
}
