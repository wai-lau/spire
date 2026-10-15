// HOLD POWER (owner, 2026-10-15: "x1.6 in terms of simulated power level of the tower, not x1.6 in terms of damage"): a
// tower's POWER LEVEL is how tough the enemies it can hold are - the enemy HP multiplier at which the test tower (with one L1
// helper of each other kind, as payoff.mjs) lets through at most LEAK of what spawns over waves FROM..TO (no boss wave).
// Found by bisection on log2(HP x), per bare tower and per purchase (I..IV = internal stops 1 3 5 6) of each axis alone;
// each purchase reads as x the power before it. COVERAGE is not toughness: a lane no tower reaches leaks whatever the
// HP, so each setup's FLOOR (its leak share at HP x FLOOR_HPX, near zero) is measured first and the bar is FLOOR + LEAK.
// usage: node holdpower.mjs [seeds=2] [rounds=7] [out.jsonl]   env FROM=61 TO=71 LEAK=0.05 KINDS=arc,frz  ASPIRA_PATCH / ASPIRA_WEB
import { isMainThread } from "node:worker_threads";
import { makeGame } from "./sim.mjs";
import { runPool } from "./pool.mjs";

const KINDS = (process.env.KINDS || "arc,frz,sol,acd").split(","), ALL = ["arc", "frz", "sol", "acd"];
const FROM = Number(process.env.FROM || 61), TO = Number(process.env.TO || 71), LEAK = Number(process.env.LEAK || 0.05);
export const FLOOR_HPX = 0.001;
const STOPS = [1, 3, 5, 6], lvlAt = k => 1 + k + (k >= 6 ? 1 : 0);

export default async function task({ kind, axis, k, seed, hpx, patch = "" }) {
  const g = makeGame(seed, `for (const id in ENEMIES) ENEMIES[id].hp *= ${hpx};\n` + patch); g.reset(); // patch: a stat under fit (holdfit.mjs)
  g.run(`G.money = 1e12; G.started = true; G.wave = ${FROM - 1}; G.lives = 1e6;`);
  const t = g.place(kind, 0);
  if (axis && k) { t.skills = { [axis]: k }; t.lvl = lvlAt(k); }
  ALL.filter(x => x !== kind).forEach((x, i) => g.place(x, [2, 3, 4][i]));
  g.run(`let prev = "swarm"; for (let n = 1; n < ${FROM}; n++) { const w = wavePlan(n, prev); if (w.type !== "bonus") prev = w.type; } G.lastType = prev; G.nextIn = 0;`);
  let guard = 0, leaked = 0;
  const seen = new Set();
  while (g.G.wave <= TO && guard++ < 400000) {
    if (g.G.wave % 12 === 0) g.run("for (const e of G.enemies) if (e.type === 'bonus' || e.bossKin) { e.dead = true; e.gone = true; } G.spawns = G.spawns.filter(w => !w.list.includes('bonus'));");
    const alive = g.G.enemies.filter(e => !e.dead);
    for (const e of alive) if (e.type !== "bonus" && !e.bossKin) seen.add(e.id);
    g.step(0.05); g.clearFx();
    for (const e of alive) if (e.dead && e.gone && e.hp > 0 && seen.has(e.id)) leaked++;
    g.run("G.lives = 1e6; G.over = false;");
    if (g.G.wave === TO && g.run("waveClear()")) break;
  }
  return { leaked, spawned: seen.size };
}

if (isMainThread && process.argv[1] && process.argv[1].endsWith("holdpower.mjs")) {
  const SEEDS = Number(process.argv[2] || 2), ROUNDS = Number(process.argv[3] || 7), OUT = process.argv[4] || null;
  const g0 = makeGame(1), axesOf = kind => g0.run(`SKILL_TREES[${JSON.stringify(kind)}].map(a => a.id)`);
  const cells = [];
  for (const kind of KINDS) { cells.push({ kind, axis: null, k: 0 }); for (const axis of axesOf(kind)) for (const k of STOPS) cells.push({ kind, axis, k }); }
  for (const c of cells) { c.lo = -8; c.hi = 7; } // log2 of the HP multiplier
  const share = rs => rs.reduce((a, x) => a + x.leaked, 0) / Math.max(1, rs.reduce((a, x) => a + x.spawned, 0));
  { // each setup's coverage floor
    const jobs = []; for (const c of cells) for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ kind: c.kind, axis: c.axis, k: c.k, seed, hpx: FLOOR_HPX });
    const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
    for (const c of cells) c.floor = share(res.filter((x, i) => jobs[i].kind === c.kind && jobs[i].axis === c.axis && jobs[i].k === c.k));
  }
  for (let r = 0; r < ROUNDS; r++) {
    const jobs = [];
    for (const c of cells) { c.m = (c.lo + c.hi) / 2; for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ kind: c.kind, axis: c.axis, k: c.k, seed, hpx: +(2 ** c.m).toPrecision(4) }); }
    const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: OUT && OUT + "." + r });
    for (const c of cells) {
      const rs = res.filter((x, i) => jobs[i].kind === c.kind && jobs[i].axis === c.axis && jobs[i].k === c.k);
      if (share(rs) <= c.floor + LEAK) c.lo = c.m; else c.hi = c.m;
    }
    console.error(`round ${r + 1}/${ROUNDS} done`);
  }
  const pw = c => 2 ** ((c.lo + c.hi) / 2), ROMAN = ["I", "II", "III", "IV"];
  console.log(`HOLD POWER: enemy HP x the trio holds (<= ${LEAK * 100}% leaked), waves ${FROM}-${TO}, ${SEEDS} seeds, ${ROUNDS} bisection rounds; each purchase as x the power before it`);
  for (const kind of KINDS) {
    const bare = cells.find(c => c.kind === kind && !c.axis);
    console.log(`\n${kind.toUpperCase()}  bare holds HP x${pw(bare).toFixed(3)} (coverage floor ${(100 * bare.floor).toFixed(0)}% leaked)`);
    for (const axis of axesOf(kind)) {
      let prev = pw(bare);
      const row = STOPS.map((k, i) => { const c = cells.find(c => c.kind === kind && c.axis === axis && c.k === k), p = pw(c), x = p / prev; prev = p; return `${ROMAN[i]} x${x.toFixed(2)} (fl ${(100 * c.floor).toFixed(0)}%)`; });
      console.log(`   ${axis.padEnd(13)} ${row.join("   ")}   (maxed x${(prev / pw(bare)).toFixed(1)} bare)`);
    }
  }
}
