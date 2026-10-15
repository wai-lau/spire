// UPGRADE PAYOFFS (owner, 2026-10-15: "merge upgrades 2-3 and 4-5 in one for each axis ... test what the payoffs look
// like"): every axis bought ALONE up its STOPS (I, III, V, VI - aspira-capstone.js SKILL_STOPS), as in isolation.mjs -
// the test tower at cell 0, one L1 helper of each other kind, lives refilled, waves FROM..TO. Per buy: the team's damage
// vs the stop before it, the leaks, and the buy's price (that axis alone, from level 1), so gain per credit reads off.
// usage: node payoff.mjs [seeds=2] [out.jsonl]   env WINDOWS=25-45,60-85  KINDS=arc,frz  ASPIRA_PATCH / ASPIRA_WEB
import { isMainThread } from "node:worker_threads";
import { makeGame } from "./sim.mjs";
import { runPool } from "./pool.mjs";

const KINDS = (process.env.KINDS || "arc,frz,sol,acd").split(","), ALL = ["arc", "frz", "sol", "acd"];
const WINDOWS = (process.env.WINDOWS || "25-45,60-85").split(",").map(w => w.split("-").map(Number));
const STOPS = [0, 1, 3, 5, 6], ROMAN = ["0", "I", "II", "III", "IV", "V", "VI"];
// the levels a tower with one axis at tier k has bought (the capstone is two)
const lvlAt = k => 1 + k + (k >= 6 ? 1 : 0);

export default async function task({ kind, axis, k, seed, from, to }) {
  const g = makeGame(seed); g.reset();
  g.run(`G.money = 1e12; G.started = true; G.wave = ${from - 1}; G.lives = 1e6;`);
  const t = g.place(kind, 0);
  if (axis && k) { t.skills = { [axis]: k }; t.lvl = lvlAt(k); }
  ALL.filter(x => x !== kind).forEach((x, i) => g.place(x, [2, 3, 4][i]));
  g.run(`let prev = "swarm"; for (let n = 1; n < ${from}; n++) { const w = wavePlan(n, prev); if (w.type !== "bonus") prev = w.type; } G.lastType = prev; G.nextIn = 0;`);
  let guard = 0, lost = 0;
  while (g.G.wave <= to && guard++ < 300000) {
    g.step(0.05); g.clearFx();
    lost += 1e6 - g.G.lives;
    g.run("G.lives = 1e6; G.over = false;");
    if (g.G.wave === to && g.run("waveClear()")) break;
  }
  return { team: Math.round(g.G.towers.reduce((a, x) => a + (x.dealt || 0), 0)), lost };
}

if (isMainThread && process.argv[1] && process.argv[1].endsWith("payoff.mjs")) {
  const SEEDS = Number(process.argv[2] || 2), OUT = process.argv[3] || null;
  const g0 = makeGame(1);
  const axesOf = kind => g0.run(`SKILL_TREES[${JSON.stringify(kind)}].map(a => a.id)`);
  // the price of the buy that takes the axis from stop a to stop b, from level lvlAt(a)
  const price = (kind, a, b) => g0.run(`skillPointsCost({ kind: ${JSON.stringify(kind)}, lvl: ${lvlAt(a)} }, ${lvlAt(b) - lvlAt(a)})`);
  const jobs = [];
  for (const [from, to] of WINDOWS) for (const kind of KINDS) {
    for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ kind, axis: null, k: 0, seed, from, to });
    for (const axis of axesOf(kind)) for (const k of STOPS.slice(1)) for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ kind, axis, k, seed, from, to });
  }
  const res = await runPool(new URL(import.meta.url), jobs, { out: OUT });
  const mean = (rs, f) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
  const pick = f => jobs.map((j, i) => (f(j) ? res[i] : null)).filter(Boolean);
  for (const [from, to] of WINDOWS) {
    console.log(`\n=== waves ${from}-${to}, ${SEEDS} seeds: each buy on ONE axis - team damage vs the bare trio (and the buy's own gain), leaks, price, gain per 1000c`);
    for (const kind of KINDS) {
      const base = pick(j => j.kind === kind && !j.axis && j.from === from), bt = mean(base, r => r.team);
      console.log(`${kind.toUpperCase()}  bare: team ${Math.round(bt)}, leaks ${mean(base, r => r.lost).toFixed(0)}`);
      for (const axis of axesOf(kind)) {
        let prevTeam = bt;
        const cells = STOPS.slice(1).map((k, i) => {
          const rs = pick(j => j.kind === kind && j.axis === axis && j.k === k && j.from === from), team = mean(rs, r => r.team), a = STOPS[i];
          const c = price(kind, a, k), gain = 100 * (team - prevTeam) / bt; prevTeam = team;
          const name = a + 1 === k ? ROMAN[k] : ROMAN[a + 1] + "-" + ROMAN[k];
          return `${name.padEnd(6)} ${(100 * team / bt).toFixed(0).padStart(4)}% (+${gain.toFixed(0)}) lk ${mean(rs, r => r.lost).toFixed(0).padStart(3)} ${String(c).padStart(5)}c ${(1000 * gain / c).toFixed(1).padStart(5)}/k`;
        });
        console.log(`   ${axis.padEnd(13)} ${cells.join("  ")}`);
      }
    }
  }
}
