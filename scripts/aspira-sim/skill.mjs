// SKILL CEILING (owner, 2026-10-28: "perfect play vs regular human - measure the skill impact and skill ceiling"): the same trio,
// economy and build, played with hindsight (the smart saver's rewind) or without, and with perfect / human / no tower positioning.
// env REWIND=0|1 (one chunk each), TO (wave, default 108). Per variant: wave reached, lives, lives lost
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
const POS = { perfect: "POS_EVERY = 0.5;", human: "POS_ONE = true; POS_EVERY = 0.5;" /* owner, 2026-10-28: "it should check every 0.5s then, so each tower gets checked by a human every 1.5s" */, none: "autoPosition = () => {};" };
export default async function task({ trio, seed, pos, rewind, to }) {
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true, rewind }, seed, to, 0.02, POS[pos]);
  p.runTo(to + 1); const r = p.result();
  return { wave: r.wave, lives: r.lives, leaks: Object.values(r.leaks).reduce((a, n) => a + n, 0) };
}
if (isMainThread && process.argv[1].endsWith("skill.mjs")) {
  const TRIOS = [["arc", "frz", "sol"], ["acd", "grv", "car"], ["ifr", "arc", "grv"], ["sol", "car", "frz"]];
  const rewind = process.env.REWIND !== "0", to = Number(process.env.TO) || 108, SEEDS = Number(process.env.SEEDS) || 3; // SEEDS: games a variant (3: the gaps were one seed's)
  const jobs = []; for (const pos of Object.keys(POS)) for (const trio of TRIOS) for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ trio, seed, pos, rewind, to });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  console.log(`SKILL CEILING, rewind ${rewind ? "ON (hindsight)" : "OFF (human economy)"}, to wave ${to}; trios ${TRIOS.map(t => t.join("+")).join(" | ")}`);
  for (const pos of Object.keys(POS)) {
    const m = res.filter((r, i) => jobs[i].pos === pos);
    console.log(pos.padEnd(8), "waves", m.map(r => r.wave).join("/").padEnd(16), "lives", m.map(r => r.lives).join("/").padEnd(14), "leaks", m.map(r => r.leaks).join("/"));
  }
}
