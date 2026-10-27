// EVERY TRIO (owner, 2026-10-15: "balance the towers then balance each trio"): all 20 trios of the six kinds, PERFECT play
// (the smart saver: banks, rewinds + buys before a leaked wave, both core powers), to wave 120. Per trio: wins, wave reached,
// lives left, rewinds. env KINDS, SEEDS, ASPIRA_PATCH, ASPIRA_WEB
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,car,ifr").split(",");
export default async function task({ trio, seed }) {
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true }, seed, 120, 0.02, process.env.ASPIRA_PATCH || "");
  p.runTo(121); const r = p.result();
  return { won: r.won, wave: r.wave, lives: r.lives, rewinds: r.rewinds || 0 };
}
if (isMainThread && process.argv[1].endsWith("tribal.mjs")) {
  const only = (process.env.TRIOS || "").split(",").filter(Boolean).map(t => t.split("+").sort().join("+")); // TRIOS=arc+grv+ifr,...: a chunk (battery.sh tribal <kind>: the trios holding one tower, ~20 min - a whole run is a 45 min monolith, 2026-10-27)
  const trios = []; for (let a = 0; a < ALL.length; a++) for (let b = a + 1; b < ALL.length; b++) for (let c = b + 1; c < ALL.length; c++) { const t = [ALL[a], ALL[b], ALL[c]]; if (!only.length || only.includes(t.slice().sort().join("+"))) trios.push(t); }
  const jobs = []; for (const trio of trios) for (const seed of (process.env.SEEDS || "1,2").split(",").map(Number)) jobs.push({ trio, seed });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  console.log("EVERY TRIO, perfect play (smart saver, both powers) to wave 120: wins / games, wave reached each game, lives left each game");
  const rows = trios.map(trio => { const m = res.filter((r, i) => jobs[i].trio === trio); return { trio, m, wins: m.filter(r => r.won).length, w: Math.min(...m.map(r => r.wave)) }; })
    .sort((x, y) => y.wins - x.wins || y.w - x.w);
  for (const r of rows) console.log(r.trio.join("+").toUpperCase().padEnd(12), `won ${r.wins}/${r.m.length}`.padEnd(9), "waves", r.m.map(x => x.wave).join("/").padEnd(8), "lives", r.m.map(x => x.lives).join("/"));
}
