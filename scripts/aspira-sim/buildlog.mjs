// BUILD LOG (owner, 2026-10-14: "just get me the frz acd arc builds that succeed and at what times they buy which
// upgrades"): one trio, full games to the win, the smart saver with both core powers - every way of choosing each
// tower's CAPSTONE axis (that axis first, to VI, then the other two in chart order), plus all-spread. Per build:
// wins, lives, rewinds; then each winning build's purchases by wave (sim.mjs's purchase log, S.buys).
// usage: node buildlog.mjs [seeds=2] [out.jsonl]   env TRIO=arc,frz,acd  ASPIRA_PATCH / ASPIRA_WEB as everywhere
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";

const TRIO = (process.env.TRIO || "arc,frz,acd").split(",");
const AX = { arc: ["conductivity", "voltage", "capacitance"], frz: ["temp", "rime", "moons"], sol: ["focus", "refraction", "breach"], acd: ["corrosion", "spray", "contagion"], grv: ["void", "supernova", "radiation"], car: ["hangar", "launch", "armament"] };
const WIN = 120;
// a build: kind -> its capstone axis (null = spread, the lowest axis first)
const order = (k, cap) => (cap ? [cap, ...AX[k].filter(a => a !== cap)] : undefined);

export default async function task({ build, seed }) {
  const skills = {}; for (const k of TRIO) if (build[k]) skills[k] = order(k, build[k]);
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: TRIO, mix: Object.fromEntries(TRIO.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true, skills }, seed, WIN);
  p.runTo(WIN + 1); const r = p.result();
  return { wave: r.wave, won: r.won, lives: r.lives, rewinds: p.rewinds || 0, buys: r.buys };
}

const label = b => TRIO.map(k => k.toUpperCase() + " " + (b[k] || "spread")).join(", ");
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI"];
// one tower's purchases as "w3 build, w5 voltage I, ..." - consecutive buys in one wave folded
function timeline(buys, k) {
  const mine = buys.filter(b => b.k === k), out = [];
  for (const b of mine) out.push("w" + b.w + " " + (b.a === "build" ? "build" : b.a + " " + ROMAN[b.to]));
  return out.join(", ");
}

if (isMainThread && process.argv[1] && process.argv[1].endsWith("buildlog.mjs")) {
  const SEEDS = Number(process.argv[2] || 2), OUT = process.argv[3] || null;
  const builds = [Object.fromEntries(TRIO.map(k => [k, null]))];
  const rec = (i, b) => { if (i === TRIO.length) { builds.push(b); return; } for (const a of AX[TRIO[i]]) rec(i + 1, { ...b, [TRIO[i]]: a }); };
  rec(0, {});
  const jobs = []; for (const build of builds) for (let seed = 1; seed <= SEEDS; seed++) jobs.push({ build, seed });
  const res = await runPool(new URL(import.meta.url), jobs, { out: OUT });
  console.log(`${TRIO.join("+").toUpperCase()}: full games to ${WIN}, smart saver, both core powers, ${SEEDS} seeds; capstone axis first to VI, then the others\n`);
  const rows = builds.map(build => {
    const rs = jobs.map((j, i) => (j.build === build ? res[i] : null)).filter(Boolean);
    return { build, rs, won: rs.filter(r => r.won).length, lives: rs.reduce((a, r) => a + (r.won ? r.lives : 0), 0) / Math.max(1, rs.filter(r => r.won).length), rewinds: rs.reduce((a, r) => a + r.rewinds, 0) / rs.length };
  }).sort((a, b) => b.won - a.won || a.rewinds - b.rewinds || b.lives - a.lives);
  for (const r of rows) console.log(label(r.build).padEnd(58), `won ${r.won}/${r.rs.length}`.padEnd(9), `lives ${r.lives.toFixed(0)}`.padEnd(10), `rewinds ${r.rewinds.toFixed(1)}`.padEnd(13), "ends " + r.rs.map(x => (x.won ? "W" : x.wave)).join(" "));
  console.log("\n== PURCHASES of each build that won every seed (seed 1)");
  for (const r of rows.filter(r => r.won === r.rs.length)) {
    console.log("\n" + label(r.build) + `  (rewinds ${r.rewinds.toFixed(1)})`);
    for (const k of TRIO) console.log("  " + k.toUpperCase() + ": " + timeline(r.rs[0].buys || [], k));
  }
}
