// THE EARLY GATES (owner, 2026-10-29: "waves should increase in strength so that all 3 towers (or duo +1 upgrade) else leak something
// at 24, then require 3 towers with >2 upgrades by wave 36 else leak / Team never buying _surviving_ is OK, but it should leak
// significantly at 40"). Fixed builds, bought at once and never again, lives unlimited: lives lost by wave 24 / 36 / 40 (waves sent).
//   duo0  2 towers, nothing bought      must leak by 24
//   duo1  2 towers + 1 upgrade          must hold through 24
//   trio0 3 towers, nothing bought      must hold through 24; must leak significantly by 40
//   trio2 3 towers + 2 upgrades         must leak by 36
//   trio3 3 towers + 3 upgrades         must hold through 36
// Bosses skipped (BOSS_SKIP). usage: [HANDS=<positioning patch>] [SEEDS=1] [BUILDS=duo0,trio3] node gates.mjs [out.jsonl]
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
import { coveringTeams } from "./covering.mjs"; // covering teams only (owner, 2026-10-29)
process.env.BOSS_SKIP = "1";
const HANDS = process.env.HANDS || "POS_ONE = true; POS_EVERY = 1; POS_GLIDE = true; POS_JITTER = 50;"; // the human's hands (players3.mjs)
export const BUILDS = { duo0: [2, 0], duo1: [2, 1], trio0: [3, 0], trio2: [3, 2], trio3: [3, 3] };
const LIVES = 100000, AT = [24, 36, 41];
export default async function task({ team, build, seed }) {
  const [n, ups] = BUILDS[build];
  const p = makePlayer({ up: 0, maxTowers: n, opening: team, mix: Object.fromEntries(team.map(k => [k, 1])), econ: "spend", core: ["temporal", "relay"], useCore: true }, seed, 41, 0.02, HANDS);
  const G = p.g.G;
  G.money = 1e7; p.buy(n - G.towers.length + ups); G.money = 0; G.lives = LIVES; p.S.lastLives = LIVES;
  const out = { team: team.join("+"), build, seed, towers: G.towers.length, ups: p.S.buys.filter(b => b.a !== "build").length };
  for (const w of AT) { p.runTo(w); out["by" + Math.min(w, 40)] = LIVES - G.lives; }
  out.types = {}; // lives lost by enemy type, each wave's types sharing its losses (who breaks the gate)
  for (const [n, ws] of Object.entries(p.result().waveStats || {})) { const ts = Object.keys(ws.types).filter(x => x !== "bonus"); for (const ty of ts) out.types[ty] = (out.types[ty] || 0) + (ws.lost || 0) / ts.length * (+n <= 40 ? 1 : 0); }
  return out;
}
if (isMainThread && process.argv[1].endsWith("gates.mjs")) {
  const duos = coveringTeams(2), trios = coveringTeams(3);
  const builds = (process.env.BUILDS || Object.keys(BUILDS).join(",")).split(","), SEEDS = Number(process.env.SEEDS) || 1, jobs = [];
  for (const build of builds) for (const team of BUILDS[build][0] === 2 ? duos : trios) for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ team, build, seed });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  console.log("build   games  leaked by 24 (median lost)  by 36  by 40   (lives lost, unlimited lives, bosses skipped)");
  for (const build of builds) {
    const m = res.filter(r => r.build === build), f = k => `${m.filter(r => r[k] > 0).length}/${m.length} (${med(m.map(r => r[k]))})`;
    console.log(build.padEnd(7), String(m.length).padEnd(6), f("by24").padEnd(26), f("by36").padEnd(14), f("by40"));
  }
  for (const r of res) if (r.towers !== BUILDS[r.build][0] || r.ups !== BUILDS[r.build][1]) console.log("BUILD MISMATCH", r.team, r.build, r.towers, r.ups);
}
