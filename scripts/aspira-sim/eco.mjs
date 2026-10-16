// the NO-WEAKNESS trios (every tower buys all three axes), PERFECT play (the smart saver: banks, buys only to stop a leak,
// both powers): at wave 120, credits owned in total (spent + banked) vs what maxing every tower costs. env K = price x
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
const K = Number(process.env.K || 1), PATCH = `for (let i = 0; i < SKILL_STEP_COST.length; i++) SKILL_STEP_COST[i] *= ${K};`, ALL = ["arc", "frz", "sol", "acd"];
export default async function task({ trio, seed }) {
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true }, seed, 120, 0.02, PATCH);
  p.runTo(121); const r = p.result(), G = p.g.G;
  const full = trio.reduce((a, k, i) => a + Math.round(TOW(p.g, k) * Math.pow(1.5, i)) + p.g.run(`skillPointsCost({ kind: "${k}", lvl: 1 }, 17)`), 0);
  const spentBy = w => { const e = (r.econ || []).filter(x => x.wave <= w).pop(); return e ? e.spent : null; };
  return { won: r.won, wave: r.wave, spent: r.spent, bank: Math.round(G.money), full, s30: spentBy(31), s60: spentBy(61), s90: spentBy(91), s120: spentBy(121), skills: G.towers.map(t => t.kind + ":" + Object.values(t.skills || {}).join("/")).join(" ") };
}
const TOW = (g, k) => g.run(`TOWERS.${k}.cost`);
if (isMainThread && process.argv[1].endsWith("eco.mjs")) {
  const jobs = []; for (const out of ALL) for (const seed of (process.env.SEEDS || "1,2").split(",").map(Number)) jobs.push({ trio: ALL.filter(k => k !== out), seed });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
  console.log(`price x${K}: no-weakness trios, perfect play - total credits (spent + banked) at the end vs the cost of maxing all three`);
  res.forEach((r, i) => console.log(jobs[i].trio.join("+").toUpperCase().padEnd(12), "seed", jobs[i].seed, r.won ? "WON " : "died w" + r.wave, "spent by w30/60/90/120", [r.s30, r.s60, r.s90, r.s120].join("/"), "total", (r.spent + r.bank), "/ full", r.full, "=", Math.round(100 * (r.spent + r.bank) / r.full) + "%", " ", r.skills));
}
