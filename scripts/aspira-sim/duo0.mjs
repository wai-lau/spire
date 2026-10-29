// DUO RULE SCAN (tier redesign, plan 3 Task 1): the duo rule (any two DIFFERENT tier-0 towers clear waves 1-12, the Star too, no
// life lost - solo.mjs's TWO L1 TOWERS table) over a grid of patches at once, so the ease (EASE_HP, aspira-waves.js) and each kind's
// tier-0 damage (STAT_CURVE[k].dmg[0]) can be fitted in one run. A pair passes on its BEST slot pair, every seed clean.
// usage: node duo0.mjs [seeds=2]   env DUO_GRID = JSON {label: patch, ...} (default: the ease alone, x1 .. x0.5), KINDS, ASPIRA_WEB
import { isMainThread } from "node:worker_threads";
import { makeGame } from "./sim.mjs";
import { runPool } from "./pool.mjs";
import { simBanner } from "./simver.mjs";

const K = (process.env.KINDS || "arc,frz,sol,acd,grv,crr,ifr").split(","), LAST = 12;
function game(towers, seed, patch) {
  const g = makeGame(seed, patch);
  g.reset();
  const G = g.G;
  G.money = 1e9;
  for (const [kind, ci] of towers) if (!g.place(kind, ci)) return null;
  G.money = 0;
  G.lives = 1000; // count every leak; a breach (the Star through) still ends it
  const l0 = G.lives;
  for (let i = 0; i < 200000 && !G.over && G.wave <= LAST; i++) g.step(0.02);
  return { lost: G.over ? 999 : l0 - G.lives };
}
export default async function task({ towers, seed, patch }) { return game(towers, seed, patch); }

if (isMainThread && process.argv[1] && process.argv[1].endsWith("duo0.mjs")) {
  const SEEDS = Number(process.argv[2] || 2);
  const grid = process.env.DUO_GRID ? JSON.parse(process.env.DUO_GRID) : Object.fromEntries([1, 0.8, 0.65, 0.5].map(e => ["ease" + e, `EASE_HP = ${e};`]));
  console.log(simBanner());
  const g0 = makeGame(1); g0.reset();
  const cells = [...Array(g0.run("CELLS.length")).keys()].filter(i => g0.cellOpen(i));
  const pairs = []; for (let a = 0; a < K.length; a++) for (let b = a + 1; b < K.length; b++) pairs.push([K[a], K[b]]);
  const jobs = [];
  for (const [label, patch] of Object.entries(grid)) for (const [a, b] of pairs) for (const c1 of cells) for (const c2 of cells) if (c1 !== c2) for (let s = 1; s <= SEEDS; s++) jobs.push({ label, pair: a + "+" + b, slots: c1 + "," + c2, towers: [[a, c1], [b, c2]], seed: s, patch });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
  for (const label of Object.keys(grid)) {
    const rows = pairs.map(([a, b]) => {
      const pair = a + "+" + b, by = new Map();
      jobs.forEach((j, i) => { if (j.label === label && j.pair === pair) by.set(j.slots, (by.get(j.slots) || 0) + (res[i] ? res[i].lost : 999)); });
      return [pair, Math.min(...by.values())]; // the best slot pair's lives lost over every seed
    });
    const fails = rows.filter(r => r[1] > 0).sort((x, y) => y[1] - x[1]);
    console.log(`${label.padEnd(28)} clean ${rows.length - fails.length}/${rows.length}  ${fails.map(([p, n]) => p + ":" + n).join(" ")}`);
  }
}
