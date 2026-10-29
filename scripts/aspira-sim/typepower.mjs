// TOWER POWER BY ENEMY TYPE (owner, 2026-10-21: "Determine the power of a tower by run full games with the tower in question + each
// possible pairing"; "no bosses in this simulation, just replace boss with forced ordinary type"): every trio of the kinds, no repeats,
// played as tribal.mjs plays them (the smart saver, both core powers) to wave 120 - but EVERY wave forced to ONE enemy type, the boss
// waves too (an ordinary wave of that type in the boss's place). A game scores 120 + lives left on a win, else the wave reached; a
// kind's power against a type = its mean over the trios it is in, and the seven are ranked +3 (best) .. -3 (worst) per type.
// env KINDS, SEEDS (1,2), TYPES, ASPIRA_PATCH, ASPIRA_WEB; argv[2] = a resumable results file
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,crr,ifr").split(",");
const TYPES = (process.env.TYPES || "swarm,fast,shield,armor").split(",");
// every wave this type; a boss wave planned as an ordinary one (wavePlan is a function binding: reassignable; sendWave splits by the list)
export const force = type => `for (let n = 1; n <= 130; n++) WAVE_TYPE_FORCE[n] = ${JSON.stringify(type)};
const __wavePlan = wavePlan;
wavePlan = function (n, prev) {
  if (n % STAR_EVERY) return __wavePlan(n, prev);
  const type = WAVE_TYPE_FORCE[n], split = formSplit(type, waveCount(type, n, false), n), count = laneCount(type, waveCount(type, n), split);
  return { type, count: type === "swarm" ? Math.max(Math.round(SWARM_WAVE_MIN / earlyX(n)), count) : Math.max(split, count), split, star: false };
};`;
export default async function task({ trio, type, seed }) {
  const patch = force(type); // (ASPIRA_PATCH: makeGame adds it itself)
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true }, seed, 120, 0.02, patch);
  p.runTo(121); const r = p.result();
  return { won: r.won, wave: r.wave, lives: r.lives };
}
if (isMainThread && process.argv[1].endsWith("typepower.mjs")) {
  const trios = []; for (let a = 0; a < ALL.length; a++) for (let b = a + 1; b < ALL.length; b++) for (let c = b + 1; c < ALL.length; c++) trios.push([ALL[a], ALL[b], ALL[c]]);
  const jobs = []; for (const type of TYPES) for (const trio of trios) for (const seed of (process.env.SEEDS || "1,2").split(",").map(Number)) jobs.push({ trio, type, seed });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  const score = r => r.won ? 120 + r.lives : r.wave;
  const power = {}; // power[type][kind] = mean score over its trios' games
  for (const type of TYPES) { power[type] = {}; for (const k of ALL) { const s = res.filter((r, i) => jobs[i].type === type && jobs[i].trio.includes(k)).map(score); power[type][k] = s.reduce((a, b) => a + b, 0) / s.length; } }
  console.log("TOWER POWER BY TYPE: every wave (bosses too) one type, every trio to wave 120; mean score over a kind's trios (win = 120 + lives, loss = wave)");
  console.log("kind ".padEnd(6) + TYPES.map(t => t.padStart(14)).join(""));
  const rank = {}; for (const type of TYPES) { const o = [...ALL].sort((a, b) => power[type][b] - power[type][a]); o.forEach((k, i) => (rank[k] ||= {})[type] = Math.round((ALL.length - 1) / 2 - i)); }
  for (const k of ALL) console.log(k.toUpperCase().padEnd(6) + TYPES.map(t => `${power[t][k].toFixed(1)} (${rank[k][t] > 0 ? "+" : ""}${rank[k][t]})`.padStart(14)).join(""));
  console.log("\nper type, trios that LOST a game:");
  for (const type of TYPES) console.log(type.padEnd(7), trios.filter(t => res.some((r, i) => jobs[i].type === type && jobs[i].trio === t && !r.won)).map(t => t.join("+").toUpperCase()).join(", ") || "none");
}
