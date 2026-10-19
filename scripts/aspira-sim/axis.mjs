// AXIS POWER (owner, 2026-10-18: "make the three axes of each tower roughly equal"): for each tower and axis, that axis is pushed FIRST
// (the rest take what is left, in tree order) inside the real trios that hold the tower - perfect player (smart saver, both powers),
// 120 waves. Per phase: margin = mean of each wave's closest approach (u from the core, capped 400) - 10 u per life lost; and the wins.
// env KINDS, SEEDS, ASPIRA_WEB, ASPIRA_PATCH; usage: node axis.mjs out.jsonl
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "/home/wai/src/exec-fn/apps/spire/scripts/aspira-sim/sim.mjs";
import { runPool } from "/home/wai/src/exec-fn/apps/spire/scripts/aspira-sim/pool.mjs";
const AX = { arc: ["conductivity", "voltage", "capacitance"], frz: ["temp", "rime", "moons"], sol: ["focus", "refraction", "breach"], acd: ["corrosion", "spray", "contagion"], grv: ["void", "supernova", "radiation"], car: ["hangar", "launch", "armament"], ifr: ["meteor", "hellfire", "firaga"] };
const ALL = ["arc", "frz", "sol", "acd", "grv", "car", "ifr"];
// FREE trios (not guaranteed winnable): the PAIRS of mains their towers cover miss an enemy type - the owner's square, IFR swarm+shield
// (2026-10-19: 10 of 35 - the old 4 + ARC+FRZ+IFR, ARC+ACD+IFR, ARC+GRV+IFR, ARC+CAR+IFR, FRZ+CAR+IFR, ACD+GRV+IFR)
const PAIR = { arc: ["swarm", "shield"], frz: ["fast", "swarm"], sol: ["armor", "fast"], acd: ["shield", "armor"], grv: ["swarm", "armor"], car: ["fast", "shield"], ifr: ["swarm", "shield"] };
const isFree = t => new Set(t.flatMap(k => PAIR[k])).size < 4;
export default async function task({ trio, kind, axis, seed }) {
  const skills = axis ? { [kind]: [axis, ...AX[kind].filter(a => a !== axis)] } : {};
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true, skills, cheapSaver: true }, seed, 120, 0.02, process.env.ASPIRA_PATCH || "");
  p.runTo(121); const r = p.result();
  const PH = [[1, 40], [41, 80], [81, 120]], ws = r.waveStats || {};
  const phases = PH.map(([a, b]) => { let sum = 0, cnt = 0, lost = 0; for (let n = a; n <= b; n++) { const w = ws[n]; if (!w) continue; lost += w.lost || 0; if (Number.isFinite(w.near)) { sum += Math.min(400, w.near); cnt++; } } return cnt ? { avg: sum / cnt, lost } : null; });
  return { won: r.won, wave: r.wave, lives: r.lives, phases };
}
if (isMainThread && process.argv[1].endsWith("axis.mjs")) {
  const kinds = (process.env.KINDS || ALL.join()).split(","), seeds = (process.env.SEEDS || "1,2").split(",").map(Number), per = +(process.env.TRIOS_PER || 8);
  const jobs = [];
  for (const kind of kinds) {
    const trios = []; const n = ALL.length; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) { const t = [ALL[a], ALL[b], ALL[c]]; if (t.includes(kind) && !isFree(t)) trios.push(t); }
    for (const trio of trios.slice(0, per)) for (const axis of AX[kind]) for (const seed of seeds) jobs.push({ trio, kind, axis, seed });
  }
  await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  console.log("done", jobs.length);
}
