// TEAM SURFACE (Wai 2026-11-08: "when checking axis combinations, check all, not just one axis at a time"; 2026-11-07: every upgrade path
// about equally useful): tower T at EVERY legal build (tiers 0..V, at most one V) at 3 / 6 / 9 / 13 points, beside partner PAIRS of other
// towers (spread at the same points), every ordinary wave of a window forced to one enemy type, lives refilled - % of that type LEAKED.
// HP is scaled per (level, window, type) so a spread build leaks ~25% of each type (hpk.json; TEAM_HPK in aspira-waves.js), so no type sits
// at the 0% / 100% floor. Levels 4 / 7 / 10 (ONE_UP) play the spread build one point up on the waves and HP of 3 / 6 / 9: the adaptive
// buyer's gain a point (surfvalue.py). Readers: teamsurf.py-style path gaps, surfvalue.py -> surface.json (sim-buyer.mjs).
// usage: node teamsurf.mjs [seeds=1] > out.jsonl   env KINDS=ifr LEVELS=3,4,6,7,9,10,13 TEAM=1 PAIRS_N=2 BV_PATCH=<file> HPK=<json> CAL=<k,...>
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

export default async function task({ kind, build, type, from, to, seed, points: POINTS, mates, hpk }) {
  const g = makeGame(seed, PATCH); g.run(`TEAM_HPK = ${hpk || 1};`); g.reset();
  g.run(`for (let n = ${from}; n <= ${to}; n++) if (n % 10) WAVE_TYPE_FORCE[n] = ${JSON.stringify(type)};`);
  g.run(`G.started = true; G.money = 1e12; G.lives = 1e6; G.wave = ${from - 1}; G.lastType = ${JSON.stringify(type)};`);
  if (TEAM) g.run("OPEN_SLOTS = SLOT_ANGLES.slice(); G.opened ||= {}; CELLS.forEach((c, i) => { if (c.unlock) G.opened[i] = true; });"); // every slot: four towers
  const sc = cellScores(g, kind), open = g.run("CELLS.map((c, i) => i).filter(cellOpen)").sort((a, b) => sc[b] - sc[a]);
  const axes = g.run(`SKILL_TREES[${JSON.stringify(kind)}].map(a => a.id)`);
  const sk = {};
  const held = build === "spread" && HELD && HELD[`${from}-${to}`]?.[kind];
  const bt = build.split("/").map(Number); axes.forEach((a, i) => { sk[a] = bt[i]; }); const lvl = 1 + bt.reduce((x, y) => x + y, 0); // BUILD SWEEP: build = tiers "a/b/c" in SKILL_TREES order
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

if (isMainThread && process.argv[1] && process.argv[1].endsWith("teamsurf.mjs")) {
  // TEAM SURFACE (Wai 2026-11-08: "when checking axis combinations, check all, not just one axis at a time"): tower T at EVERY legal build
  // (tiers 0..V, at most one V) at 3 / 6 / 9 / 13 points, beside partner PAIRS (spread at the same points), every ordinary wave forced to one
  // type, TEAM=1. PAIRS_N partner pairs of the 3 disjoint ones (all six partners at 3). JSON lines out
  const SEEDS = Number(process.argv[2] || 1), ALL = ["arc", "frz", "sol", "acd", "grv", "crr", "ifr"], PN = Number(process.env.PAIRS_N || 3);
  const PAIRS = k => { const o = ALL.filter(x => x !== k); return [[o[0], o[3]], [o[1], o[4]], [o[2], o[5]]].slice(0, PN); };
  const LV = (process.env.LEVELS || "3,6,9,13").split(",").map(Number), WIN = { 3: [[55, 65]], 4: [[55, 65]], 6: [[81, 89]], 7: [[81, 89]], 9: [[101, 109], [111, 119]], 10: [[101, 109], [111, 119]], 13: [[111, 119]] }, ONE_UP = { 4: 3, 7: 6, 10: 9 }; // ONE_UP: a spread build one point up, on the waves and HP of the level below (the buyer's gain a point)
  const builds = P => { const out = []; for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) { const c = P - a - b; if (c < 0 || c > 5 || [a, b, c].filter(x => x === 5).length > 1) continue; out.push(a + "/" + b + "/" + c); } return out; };
  const jobs = [], CAL = process.env.CAL ? process.env.CAL.split(",").map(Number) : null, HPK = JSON.parse(process.env.HPK || fs.readFileSync(new URL("./hpk.json", import.meta.url), "utf8")); // per-type HP calibration (hpk.json: each type ~25% leaked by the spread build at each level)
  const spr = P => { const a = Math.floor(P / 3), r = P - 3 * a; return [a + (r > 0), a + (r > 1), a].join("/"); };
  if (CAL) for (const kind of KINDS) for (const P of LV) for (const hpk of CAL) for (const mates of PAIRS(kind).slice(0, 1)) for (const [from, to] of WIN[P]) for (const type of TYPES) jobs.push({ kind, build: spr(P), type, from, to, seed: 1, points: P, mates, hpk });
  else
  for (const kind of KINDS) for (const P of LV) for (const build of (ONE_UP[P] ? [spr(P)] : builds(P))) for (const mates of PAIRS(kind)) for (const [from, to] of WIN[P]) for (const type of TYPES) for (let seed = 1; seed <= SEEDS; seed++)
    jobs.push({ kind, build, type, from, to, seed, points: P, mates, hpk: HPK[`${ONE_UP[P] || P}|${from}|${type}`] || HPK[P] || 1 });
  console.error("jobs", jobs.length);
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
  jobs.forEach((j, i) => console.log(JSON.stringify({ ...j, ...res[i] })));
}
