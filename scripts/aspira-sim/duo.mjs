// TWO TOWERS ONLY (owner, 2026-10-21: "can you run a test to see if playing the game with just 2 towers is possible?"): every pair of the
// kinds, a kind twice included, played as tribal.mjs plays a trio (the smart saver: banks, rewinds + buys before a leaked wave, both core
// powers) but never more than TWO towers, to wave 120. Per pair: wins, wave reached, lives left. env KINDS, SEEDS, ASPIRA_PATCH, ASPIRA_WEB
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,crr,ifr").split(",");
export default async function task({ duo, seed }) {
  const p = makePlayer({ up: 0.5, maxTowers: 2, opening: duo, mix: Object.fromEntries(duo.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true }, seed, 120, 0.02, process.env.ASPIRA_PATCH || "");
  p.runTo(121); const r = p.result();
  return { won: r.won, wave: r.wave, lives: r.lives };
}
if (isMainThread && process.argv[1].endsWith("duo.mjs")) {
  const duos = []; for (let a = 0; a < ALL.length; a++) for (let b = a; b < ALL.length; b++) duos.push([ALL[a], ALL[b]]);
  const jobs = []; for (const duo of duos) for (const seed of (process.env.SEEDS || "1,2").split(",").map(Number)) jobs.push({ duo, seed });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  console.log("EVERY PAIR, two towers at most, perfect play (smart saver, both powers) to wave 120: wins / games, wave reached each game, lives left each game");
  const rows = duos.map(duo => { const m = res.filter((r, i) => jobs[i].duo === duo); return { duo, m, wins: m.filter(r => r.won).length, w: Math.min(...m.map(r => r.wave)) }; })
    .sort((x, y) => y.wins - x.wins || y.w - x.w);
  for (const r of rows) console.log(r.duo.join("+").toUpperCase().padEnd(9), `won ${r.wins}/${r.m.length}`.padEnd(9), "waves", r.m.map(x => x.wave).join("/").padEnd(8), "lives", r.m.map(x => x.lives).join("/"));
}
