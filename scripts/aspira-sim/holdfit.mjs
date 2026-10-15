// HOLD FIT (owner, 2026-10-15: "the first level is x1.6, then since the next two are 2 levels stacked, it should be x2.56 each,
// then capstone should be even more, something like an x3"): each purchase of each axis multiplies the tower's HOLD POWER
// (holdpower.mjs: the enemy HP x the trio holds at <= LEAK leaked) by TARGET - cumulatively x1.6, x4.1, x10.5, x31.5 the
// bare tower. Per (axis, purchase): the enemies are set to the bare hold x that cumulative target, and ONE lever of the
// axis's own (its table entry at that internal tier) is bisected until the trio just holds them. Prints each table.
// usage: node holdfit.mjs [seeds=2] [rounds=8]   env AXES=voltage,rime  TARGET=1.6,2.56,2.56,3  FROM / TO / LEAK as holdpower
import { isMainThread } from "node:worker_threads";
import { makeGame } from "./sim.mjs";
import { runPool } from "./pool.mjs";
import { FLOOR_HPX } from "./holdpower.mjs";

// one lever an axis, its own mechanic (as tierfit.mjs); min/max only where the mechanic has a real bound (a slow under 0.85)
const LEVERS = {
  conductivity: { kind: "arc", get: k => `ARC_CONDUCTIVITY[${k}].d`, set: (k, v) => `ARC_CONDUCTIVITY[${k}] = { ...ARC_CONDUCTIVITY[${k}], d: ${v} };`, min: 0.1 },
  voltage: { kind: "arc", get: k => `ARC_VOLTAGE_DMG[${k}]`, set: (k, v) => `ARC_VOLTAGE_DMG[${k}] = ${v};`, min: 0.1 },
  capacitance: { kind: "arc", get: k => `ARC_CAPACITANCE[${k}].frac`, set: (k, v) => `ARC_CAPACITANCE[${k}] = { ...ARC_CAPACITANCE[${k}], frac: ${v} };`, min: 0.001 },
  temp: { kind: "frz", get: k => `FRZ_TEMP_SLOW[${k}]`, set: (k, v) => `FRZ_TEMP_SLOW[${k}] = ${v};`, min: 0.05, max: 0.85 },
  rime: { kind: "frz", get: k => `FRZ_RIME[${k}]`, set: (k, v) => `FRZ_RIME[${k}] = ${v};`, min: 0.001, max: 0.6 },
  moons: { kind: "frz", get: k => `FRZ_MOON_BY[${k}]`, set: (k, v) => `FRZ_MOON_BY[${k}] = ${v};`, min: 0.05 },
  focus: { kind: "sol", get: k => `SOL_FOCUS_DMG[${k}]`, set: (k, v) => `SOL_FOCUS_DMG[${k}] = ${v};`, min: 0.1 },
  refraction: { kind: "sol", get: k => `SOL_REFRACTION_DMG[${k}]`, set: (k, v) => `SOL_REFRACTION_DMG[${k}] = ${v};`, min: 0.1 },
  breach: { kind: "sol", get: k => `SOL_BREACH_ARMOR[${k}]`, set: (k, v) => `SOL_BREACH_ARMOR[${k}] = ${v};`, min: 1 },
  corrosion: { kind: "acd", get: k => `ACD_CORROSION_DMG[${k}]`, set: (k, v) => `ACD_CORROSION_DMG[${k}] = ${v};`, min: 0.1 },
  spray: { kind: "acd", get: k => `ACD_SPRAY_MUL[${k}]`, set: (k, v) => `ACD_SPRAY_MUL[${k}] = ${v};`, min: 0.1 },
  contagion: { kind: "acd", get: k => `ACD_PUDDLE_HEAT[${k}]`, set: (k, v) => `ACD_PUDDLE_HEAT[${k}] = ${v};`, min: 0.01 },
};
const AXES = process.env.AXES ? process.env.AXES.split(",") : Object.keys(LEVERS);
const TARGET = (process.env.TARGET || "1.6,2.56,2.56,3").split(",").map(Number), STOPS = [1, 3, 5, 6], ROMAN = ["I", "II", "III", "IV"];
const CUM = TARGET.map((_, i) => TARGET.slice(0, i + 1).reduce((a, b) => a * b, 1));
const LEAK = Number(process.env.LEAK || 0.05);
const clampV = (axis, v) => Math.min(LEVERS[axis].max ?? Infinity, Math.max(LEVERS[axis].min ?? 0, v));

if (isMainThread && process.argv[1] && process.argv[1].endsWith("holdfit.mjs")) {
  const SEEDS = Number(process.argv[2] || 2), ROUNDS = Number(process.argv[3] || 8);
  const task = new URL("./holdpower.mjs", import.meta.url), g0 = makeGame(1);
  const share = rs => rs.reduce((a, x) => a + x.leaked, 0) / Math.max(1, rs.reduce((a, x) => a + x.spawned, 0));
  // 1. each kind's BARE hold (log2 HP x)
  const bare = {}; for (const kind of new Set(AXES.map(a => LEVERS[a].kind))) bare[kind] = { lo: -8, hi: 6 };
  const floorOf = async specs => { const jobs = []; specs.forEach((sp, n) => { for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ ...sp, seed, hpx: FLOOR_HPX, n }); }); const res = await runPool(task, jobs, { quiet: true }); return specs.map((_, n) => share(res.filter((x, i) => jobs[i].n === n))); };
  { const ks = Object.keys(bare), fl = await floorOf(ks.map(kind => ({ kind, axis: null, k: 0 }))); ks.forEach((k, i) => { bare[k].floor = fl[i]; }); }
  for (let r = 0; r < ROUNDS; r++) {
    const jobs = [];
    for (const [kind, b] of Object.entries(bare)) { b.m = (b.lo + b.hi) / 2; for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ kind, axis: null, k: 0, seed, hpx: +(2 ** b.m).toPrecision(4) }); }
    const res = await runPool(task, jobs, { quiet: true });
    for (const [kind, b] of Object.entries(bare)) { if (share(res.filter((x, i) => jobs[i].kind === kind)) <= b.floor + LEAK) b.lo = b.m; else b.hi = b.m; }
  }
  for (const b of Object.values(bare)) b.hold = 2 ** ((b.lo + b.hi) / 2);
  console.error("bare holds: " + Object.entries(bare).map(([k, b]) => k + " x" + b.hold.toFixed(3)).join(", "));
  // 2. each (axis, purchase): the lever (log2 x its current value) bisected until the trio just holds bare x CUM
  const cells = [];
  for (const axis of AXES) STOPS.forEach((k, i) => { const cur = g0.run(LEVERS[axis].get(k)); cells.push({ axis, k, i, cur, lo: -5, hi: 5, hpx: +(bare[LEVERS[axis].kind].hold * CUM[i]).toPrecision(4) }); });
  { const fl = await floorOf(cells.map(c => ({ kind: LEVERS[c.axis].kind, axis: c.axis, k: c.k }))); cells.forEach((c, i) => { c.floor = fl[i]; }); }
  for (let r = 0; r < ROUNDS; r++) {
    const jobs = [];
    for (const c of cells) { c.m = (c.lo + c.hi) / 2; c.v = +clampV(c.axis, c.cur * 2 ** c.m).toPrecision(4); for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ kind: LEVERS[c.axis].kind, axis: c.axis, k: c.k, seed, hpx: c.hpx, patch: LEVERS[c.axis].set(c.k, c.v), cell: cells.indexOf(c) }); }
    const res = await runPool(task, jobs, { quiet: true });
    for (const c of cells) { const ok = share(res.filter((x, i) => jobs[i].cell === cells.indexOf(c))) <= c.floor + LEAK; if (ok) { c.hi = c.m; c.best = c.v; } else c.lo = c.m; }
    console.error(`round ${r + 1}/${ROUNDS} done`);
  }
  console.log(`HOLD FIT: each purchase x${TARGET.join(" / x")} hold power (cumulative x${CUM.map(c => c.toFixed(1)).join(" / x")} bare), waves via holdpower.mjs, ${SEEDS} seeds, ${ROUNDS} rounds`);
  for (const axis of AXES) {
    const cs = cells.filter(c => c.axis === axis);
    console.log(`\n${axis} (${LEVERS[axis].get("k")})`);
    for (const c of cs) console.log(`  ${ROMAN[c.i].padEnd(3)} (tier ${c.k})  ${String(c.cur).padStart(8)} -> ${c.best == null ? "NOT REACHED (top " + clampV(c.axis, c.cur * 32) + ")" : String(c.best).padStart(8)}${c.best != null && Math.abs(c.lo - 5) < 0.2 ? "  (at the bracket top)" : ""}${c.best != null && c.hi < -4.8 ? "  (at the bracket bottom)" : ""}`);
  }
}
