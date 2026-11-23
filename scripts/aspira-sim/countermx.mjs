// COUNTER MATRIX (owner, 2026-10-08: "at minimum, 1 tower that counters [each enemy],
// and 1 other tower that has a counter path"): every ordinary wave of a window is
// FORCED to one enemy type (WAVE_TYPE_FORCE), and a team of N towers of ONE kind
// plays it - charts spread evenly ("spread"), or one axis maxed with the rest spread.
// Lives refilled so every wave plays out. Prints % of that type LEAKED per window.
// TEAM=1 (2026-10-11, "make upgrade choices matter"): ONE tower of the kind under test plus one of every OTHER kind,
// those spread - a support axis (FRZ Rime cracking shields) only shows in a team that can kill what it opens up.
// usage: node countermx.mjs [seeds=2]   env N=3 POINTS=8 WINDOWS=41-49,61-69 KINDS=... BV_PATCH=<file> TEAM=1 SPREAD_ONLY=1 (spread builds only: marks.py's input)
// a window may carry its OWN points (owner, 2026-10-12: test each boss band at the points a player has there): WINDOWS=1-9:2,11-19:4
// - a focused build then takes the deepest TIER those points reach (stops.mjs: 0 I II III IV), capped at the capstone
import fs from "node:fs";
import { isMainThread } from "node:worker_threads";
import { makeGame, cellScores } from "./sim.mjs";
import { runPool } from "./pool.mjs";
import { spreadStops, focusStops, snapStop, STOPS, POINTS_AT } from "./stops.mjs"; // tiers bought whole (0 I II III IV V, a point a purchase since 2026-10-24; POINTS=6 kept until the balance battery re-picks it)

const KINDS = (process.env.KINDS || "arc,frz,sol,acd").split(","), TYPES = ["swarm", "fast", "shield", "armor"];
const TEAM = process.env.TEAM === "1", N = TEAM ? 1 : Number(process.env.N || 3), POINTS = Number(process.env.POINTS || 8);
const WINDOWS = (process.env.WINDOWS || "41-49,61-69").split(",").map(w => { const [r, p] = w.split(":"); return [...r.split("-").map(Number), p ? Number(p) : POINTS]; });
const PATCH = process.env.BV_PATCH ? fs.readFileSync(process.env.BV_PATCH, "utf8") : "";
// HELD (plan 3 Task 5, owner 2026-10-25: "make countermx consistent at the 4 different game chapters"): the build a perfect player
// HOLDS per tower in each window, from trioplan's buy logs - JSON {"13-19": {"arc": {"conductivity": 2, ...}, ...}, ...}. It replaces
// "spread" (same row label, so marks.py reads it unchanged); a tower's level is 1 + its tiers bought
const HELD = process.env.HELD ? JSON.parse(process.env.HELD.startsWith("{") ? process.env.HELD : fs.readFileSync(process.env.HELD, "utf8")) : null;
// DIFF=avg (2026-11-20): balanced mode runs both an EASY difficulty (enemy HP x0.35, shield charges x4) and a HARD difficulty (HP x2.5, shields x4)
// for every cell, then prints the mean of the two runs' percentages. Applied by patching spawnEnemy so ASPIRA_PATCH keeps working and stacks.
// DIFF=grid (2026-11-23): every game runs at FIVE difficulties - enemy HP and shield charges (rounded, at least 1) at x0.25, x0.5, x1, x2, x4 -
// each cell printed as the mean of those five; chosen so no marks cell saturates at 0% or 100%.
const DIFF = process.env.DIFF || "none";
function diffPatch(factor, shield) {
  return `{ const _s = spawnEnemy; spawnEnemy = (...a) => { const r = _s(...a); const e = G.enemies[G.enemies.length - 1]; if (e && !e._hpx) { e._hpx = 1; e.hp *= ${factor}; e.max *= ${factor}; if (e.shield > 0) { e.shield = Math.round(e.shield * ${shield}); if (e.shieldMax) e.shieldMax = Math.round(e.shieldMax * ${shield}); } } return r; }; }`;
}
function gridPatch(factor) {
  return `{ const _s = spawnEnemy; spawnEnemy = (...a) => { const r = _s(...a); const e = G.enemies[G.enemies.length - 1]; if (e && !e._hpx) { e._hpx = 1; e.hp *= ${factor}; e.max *= ${factor}; if (e.shield > 0) { e.shield = Math.max(1, Math.round(e.shield * ${factor})); if (e.shieldMax) e.shieldMax = Math.max(1, Math.round(e.shieldMax * ${factor})); } } return r; }; }`;
}

export default async function task({ kind, build, type, from, to, seed, points: POINTS, mates, diff, factor }) {
  let gamePatch = PATCH;
  if (diff === "easy") gamePatch = [PATCH, diffPatch(0.35, 4)].filter(Boolean).join("\n");
  else if (diff === "hard") gamePatch = [PATCH, diffPatch(2.5, 4)].filter(Boolean).join("\n");
  else if (factor != null) gamePatch = [PATCH, gridPatch(factor)].filter(Boolean).join("\n");
  const g = makeGame(seed, gamePatch); g.reset();
  g.run(`for (let n = ${from}; n <= ${to}; n++) if (n % 10) WAVE_TYPE_FORCE[n] = ${JSON.stringify(type)};`);
  g.run(`G.started = true; G.money = 1e12; G.lives = 1e6; G.wave = ${from - 1}; G.lastType = ${JSON.stringify(type)};`);
  if (TEAM) g.run("OPEN_SLOTS = SLOT_ANGLES.slice(); G.opened ||= {}; CELLS.forEach((c, i) => { if (c.unlock) G.opened[i] = true; });"); // every slot: four towers
  const sc = cellScores(g, kind), open = g.run("CELLS.map((c, i) => i).filter(cellOpen)").sort((a, b) => sc[b] - sc[a]);
  const axes = g.run(`SKILL_TREES[${JSON.stringify(kind)}].map(a => a.id)`);
  const sk = {};
  const held = build === "spread" && HELD && HELD[`${from}-${to}`]?.[kind];
  Object.assign(sk, held ? Object.fromEntries(axes.map(a => [a, held[a] || 0])) : build === "spread" ? spreadStops(axes, POINTS) : focusStops(axes, build, POINTS)); // by TIER (stops.mjs)
  const lvl = held ? 1 + Object.values(sk).reduce((a, v) => a + v, 0) : 1 + POINTS;
  let placed = 0;
  for (const ci of open) { if (placed >= N) break; const t = g.place(kind, ci); if (!t) continue; t.skills = { ...sk }; t.lvl = lvl; placed++; }
  if (TEAM) for (const m of mates || ["arc", "frz", "sol", "acd"].filter(k => k !== kind)) {
    const ax = g.run(`SKILL_TREES[${JSON.stringify(m)}].map(a => a.id)`), ms = {};
    Object.assign(ms, spreadStops(ax, POINTS)); // by TIER (stops.mjs; the raw point-levels it was included the ones that cannot be bought)
    const msc = cellScores(g, m), free = g.run("CELLS.map((c, i) => i).filter(cellOpen)").filter(ci => !g.G.towers.some(t => t.cell === ci)).sort((a, b) => msc[b] - msc[a]);
    for (const ci of free) { const t = g.place(m, ci); if (t) { t.skills = { ...ms }; t.lvl = 1 + POINTS; break; } }
  }
  g.run("G.nextIn = 0;");
  let leaked = 0, seen = new Set(), guard = 0;
  while (g.G.wave <= to && guard++ < 400000) {
    if (g.G.wave % 10 === 0) g.run("for (const e of G.enemies) if (e.type === 'bonus') { e.dead = true; e.gone = true; } G.spawns = G.spawns.filter(w => !w.list.includes('bonus'));");
    for (const e of g.G.enemies) if (e.type === type) seen.add(e.id);
    const alive = g.G.enemies.filter(e => !e.dead);
    g.step(0.05); g.clearFx();
    for (const e of alive) if (e.dead && e.gone && e.hp > 0 && e.type === type) leaked++;
    g.run("G.lives = 1e6; G.over = false;");
    if (g.G.wave === to && g.run("waveClear()")) break;
  }
  return { leaked, spawned: seen.size };
}

if (isMainThread && process.argv[1] && process.argv[1].endsWith("countermx.mjs")) {
  const SEEDS = Number(process.argv[2] || 2);
  // TRIO=1 (owner, 2026-10-12): the game holds THREE towers - the kind plus two others, each trio that
  // holds it in turn (four towers at the expected points leaked nothing anywhere: not a test)
  const TRIO = TEAM && process.env.TRIO === "1", TRIOS = k => { const o = ["arc", "frz", "sol", "acd"].filter(x => x !== k); return [[o[0], o[1]], [o[0], o[2]], [o[1], o[2]]]; };
  const AX = { arc: ["conductivity", "voltage", "capacitance"], frz: ["temp", "rime", "moons"], sol: ["focus", "refraction", "breach"], acd: ["corrosion", "spray", "contagion"], grv: ["void", "supernova", "radiation"], crr: ["hangar", "launch", "armament"], ifr: ["meteor", "hellfire", "firaga"] };
  const GRID = [0.25, 0.5, 1, 2, 4];
  const jobs = [];
  for (const [from, to, points] of WINDOWS) for (const kind of KINDS) for (const build of process.env.SPREAD_ONLY === "1" ? ["spread"] : ["spread", ...AX[kind]]) for (const type of TYPES) for (let seed = 1 + (Number(process.env.SEED0) || 0); seed <= SEEDS + (Number(process.env.SEED0) || 0); seed++) for (const mates of TRIO ? TRIOS(kind) : [null]) {
    if (DIFF === "avg") { jobs.push({ kind, build, type, from, to, seed, points, mates, diff: "easy" }); jobs.push({ kind, build, type, from, to, seed, points, mates, diff: "hard" }); }
    else if (DIFF === "grid") { for (const f of GRID) jobs.push({ kind, build, type, from, to, seed, points, mates, diff: null, factor: f }); }
    else jobs.push({ kind, build, type, from, to, seed, points, mates, diff: null });
  }
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
  const hdr = DIFF === "avg" ? " (avg of easy and hard): " : DIFF === "grid" ? " (grid average, enemy HP + shields x0.25..x4): " : ": ";
  console.log(TRIO ? "TRIO: the kind + two others (spread), every trio holding it," : TEAM ? "TEAM: one of the kind + one of every other kind (spread)," : `${N} towers of one kind,`, ` ${POINTS} points (spread, or that axis at ${["-", "I", "II", "III", "IV", "V"][snapStop(Math.min(POINTS, POINTS_AT[POINTS_AT.length - 1]))]} + rest spread), every ordinary wave forced to one type, ${SEEDS} seeds` + hdr + "% LEAKED");
  for (const [from, to, points] of WINDOWS) {
    console.log(`\nwaves ${from}-${to} (${points} pts)`.padEnd(26) + TYPES.map(t => t.padStart(8)).join(""));
    for (const kind of KINDS) for (const build of process.env.SPREAD_ONLY === "1" ? ["spread"] : ["spread", ...AX[kind]]) {
      const cells = TYPES.map(type => {
        if (DIFF === "avg") {
          const easyRs = jobs.map((j, i) => (j.kind === kind && j.build === build && j.type === type && j.from === from && j.diff === "easy" ? res[i] : null)).filter(Boolean);
          const hardRs = jobs.map((j, i) => (j.kind === kind && j.build === build && j.type === type && j.from === from && j.diff === "hard" ? res[i] : null)).filter(Boolean);
          if (easyRs.length === 0 || hardRs.length === 0) return "-".padStart(8);
          const el = easyRs.reduce((a, r) => a + r.leaked, 0), es = easyRs.reduce((a, r) => a + r.spawned, 0);
          const hl = hardRs.reduce((a, r) => a + r.leaked, 0), hs = hardRs.reduce((a, r) => a + r.spawned, 0);
          const ep = es ? Math.round(100 * el / es) : 0, hp = hs ? Math.round(100 * hl / hs) : 0;
          return (Math.round((ep + hp) / 2) + "%").padStart(8);
        } else if (DIFF === "grid") {
          let sumP = 0, count = 0;
          for (const f of GRID) {
            const rs = jobs.map((j, i) => (j.kind === kind && j.build === build && j.type === type && j.from === from && j.factor === f ? res[i] : null)).filter(Boolean);
            if (rs.length === 0) continue;
            const l = rs.reduce((a, r) => a + r.leaked, 0), s = rs.reduce((a, r) => a + r.spawned, 0);
            sumP += s ? 100 * l / s : 0;
            count++;
          }
          return (count ? Math.round(sumP / count) + "%" : "-").padStart(8);
        } else {
          const rs = jobs.map((j, i) => (j.kind === kind && j.build === build && j.type === type && j.from === from ? res[i] : null)).filter(Boolean);
          const l = rs.reduce((a, r) => a + r.leaked, 0), s = rs.reduce((a, r) => a + r.spawned, 0);
          return (s ? Math.round(100 * l / s) + "%" : "-").padStart(8);
        }
      });
      console.log(("  " + kind.toUpperCase() + " " + build).padEnd(25) + cells.join(""));
    }
  }
}
