// THE THREE PLAYERS (owner, 2026-10-28, the difficulty targets): "all the winnable trios should be able to beat the game with rewinds /
// random(spenders + bad build) human players should lose around 60 / good(smartsavers + good build) human players should be able to beat
// the game with every winnable trio". WINNABLE (owner, 2026-10-28): the trio's three towers together check every type in VS_MARKS.
// One MODEL a run (a chunk), every trio, SEEDS seeds each, to the end of the game:
//   perfect  smart saver WITH rewind (hindsight), the threat-adaptive axis picks, every tower repositioned every 0.5 s     target: wins
//   good     smart saver WITH rewind ("as if the human went to replay the game with the same game", owner 2026-10-28), the same
//            adaptive axis picks, human hands (POS_ONE: one tower moved every 0.5 s) - differs from perfect in its hands only  target: wins
//   random   spends as it goes (econ "spend"), a RANDOM open axis but never the right pick (bad build), NO rewind, human hands   target: dies ~60
// usage: MODEL=perfect|good|random [SEEDS=1] [TRIOS=arc+frz+sol,...] [TO=120] node players3.mjs [out.jsonl]
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
import { coveringTeams } from "./covering.mjs";
// BOSSES SKIPPED, ALWAYS (owner, 2026-10-28: "bosses must never cause a loss in the balance sims"): every boss-wave unit dies at once,
// bounty, drop and unlocks paid (sim.mjs BOSS_SKIP). Set here, not by env, so no run forgets it; bosses balance in bossbal/bossvs.
process.env.BOSS_SKIP = "1";
const HUMAN_HANDS = process.env.HANDS || "POS_ONE = true; POS_EVERY = 1; POS_GLIDE = true; POS_JITTER = 50;"; // owner, 2026-10-29: "humans glide, perfect does not, stick with 1s for humans, and also jitter the destination by 50u"; was "POS_ONE = true; POS_EVERY = 0.5;" // env HANDS: the cadence sweep (2026-10-28) - // owner, 2026-10-28: each tower checked by a human every 1.5 s with three
const MODELS = {
  perfect: { econ: "smart", rewind: true, pos: "POS_EVERY = 0.5;" },
  good: { econ: "smart", rewind: true, pos: HUMAN_HANDS },
  random: { econ: "spend", rewind: false, pos: HUMAN_HANDS, randomAxis: true },
  rightspend: { econ: "spend", rewind: false, pos: HUMAN_HANDS }, // diagnostic (2026-10-28): the planner's axis, spending at once - the axis part
  goodnorewind: { econ: "smart", rewind: false, pos: HUMAN_HANDS }, // diagnostic (2026-10-28): good without the replay
  randomsave: { econ: "smart", rewind: false, pos: HUMAN_HANDS, randomAxis: true }, // diagnostic (2026-10-28): random's bad build on the smart saver's economy - how much of its wave is money
};
export default async function task({ trio, seed, model, to }) {
  const m = MODELS[model];
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: m.econ, randomAxis: !!m.randomAxis, threat: 220,
    core: ["temporal", "relay"], useCore: true, rewind: m.rewind }, seed, to, 0.02, m.pos);
  p.runTo(to + 1); const r = p.result();
  // LEAK RECORD (2026-10-28, the wave-84 diagnosis): each origin wave from 40 on - its types, lives lost, closest approach (u)
  const late = {};
  for (const [n, w] of Object.entries(r.waveStats || {})) if (+n >= 40) late[n] = { t: Object.keys(w.types).filter(x => x !== "bonus").join("+") || "boss", lost: w.lost, near: Number.isFinite(w.near) ? Math.round(w.near) : null };
  return { trio: trio.join("+"), seed, model, wave: r.wave, won: r.won, lives: r.lives, late, kill: r.won ? null : (late[r.wave] || {}).t || null, buys: (r.buys || []).map(b => [b.w, b.k, b.id, b.a, b.to]) }; // buys: [wave, kind, tower id, axis, tier] (the build-convergence check, 2026-10-28)
}
if (isMainThread && process.argv[1].endsWith("players3.mjs")) {
  const all = coveringTeams(3); // COVERING trios only, every model (owner, 2026-10-29: "Ignore teams that don't cover every enemy type")
  const model = process.env.MODEL || "good", to = Number(process.env.TO) || 120, SEEDS = Number(process.env.SEEDS) || 1;
  if (!MODELS[model]) throw new Error("MODEL: " + Object.keys(MODELS).join("|"));
  const trios = process.env.TRIOS ? process.env.TRIOS.split(",").map(t => t.split("+")) : all;
  const jobs = []; for (const trio of trios) for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ trio, seed, model, to });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  const won = res.filter(r => r.won).length, waves = res.map(r => r.wave).sort((a, b) => a - b);
  console.log(`${model}: ${won}/${res.length} won; wave reached median ${waves[waves.length >> 1]}, min ${waves[0]}, max ${waves[waves.length - 1]}`);
  for (const r of res) console.log(r.trio.padEnd(12), "s" + r.seed, r.won ? "WON " : "lost", "w" + r.wave, "lives", r.lives, r.kill ? "killed by " + r.kill : "");
}
