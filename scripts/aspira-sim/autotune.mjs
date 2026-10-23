// AUTOTUNE (owner, 2026-10-22: "run the sims to balance types for each wave [section]"; break point leads): section by section, every
// type's BREAK POINT - the enemy-speed multiplier at which the average trio starts losing LOSE lives in that section (typecal.mjs's games:
// every trio, every wave one type, no rewinds; the speed stress on that section's waves only) - brought to the HARDEST type's (the lowest
// break), each type by ONE DIAL d that moves ALL its levers in a fixed MIX (TYPE_TUNE in aspira-waves.js) by secant steps; the earlier
// sections' tuning is held. THE MIX keeps each type itself (owner, 2026-10-22: "just try to find a mix that keeps each type unique"): its
// signature trait carries most of the rest - a factor lever x d^w over its floor, a share lever + SHARE_K (d^w - 1); COUNT FIRST (below). NEVER
// WEAKER (owner, 2026-10-22: "types should never get weaker along any axis"): a lever never goes under its untuned value, nor under its
// value in the section before (each section starts from the one before's) - so the easier types are raised to the hardest. A section's
// break is found by bisection on the ladder (few rungs a type). Prints the TYPE_TUNE to paste; ARCHITECTURE.md 5.6.
// env SECTIONS (1,2,3,4), SEEDS (1), ROUNDS (3), TOL (0.04: within 4% of the mean is done), LOSE (2), KINDS; argv[2] = the state file
// (json: the tune and every measure so far - resumable: a section already done is skipped)
import fs from "node:fs";
import { runPool } from "./pool.mjs";
const SECT = [[1, 24], [25, 60], [61, 96], [97, 120]];
const EARLY = { swarm: { count: 0.7, speed: 0.3 }, fast: { speed: 0.7, hp: 0.3 }, armor: { armor: 0.7, count: 0.3 }, shield: { shield: 0.7, count: 0.3 } };
const LATE = { // from 61 the new lever leads (what it was added for), the signature trait next
  swarm: { shield: 0.5, count: 0.35, speed: 0.15 }, fast: { armor: 0.5, speed: 0.35, hp: 0.15 },
  armor: { armor: 0.5, speed: 0.3, count: 0.2 }, shield: { shield: 0.5, speed: 0.3, count: 0.2 },
};
const MIX = [EARLY, EARLY, LATE, LATE], SHARE_K = 0.25; // SHARE_K: a share lever reaches 0.1 (the old late hybrids' share) at d^w = 1.4
const SHARE = { swarm: "shield", fast: "armor" }; // a SHARE lever starts at 0, not 1
const TYPES = ["swarm", "fast", "shield", "armor"];
const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,car,ifr").split(","), SEEDS = (process.env.SEEDS || "1").split(",").map(Number);
const ROUNDS = Number(process.env.ROUNDS || 3), TOL = Number(process.env.TOL || 0.04), LOSE = Number(process.env.LOSE || 2);
const trios = []; for (let a = 0; a < ALL.length; a++) for (let b = a + 1; b < ALL.length; b++) for (let c = b + 1; c < ALL.length; c++) trios.push([ALL[a], ALL[b], ALL[c]]);
const file = process.argv[2] || "autotune.json";
const S = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { tune: {}, done: [], log: [] };
const save = () => fs.writeFileSync(file, JSON.stringify(S, null, 1));
const val = (t, l, i) => ((S.tune[t] || {})[l] || [])[i] ?? (SHARE[t] === l ? 0 : 1);
const setVal = (t, l, i, v) => { ((S.tune[t] ||= {})[l] ||= [0, 1, 2, 3].map(j => (SHARE[t] === l ? 0 : 1)))[i] = v; };
const floorOf = (t, l, si) => Math.max(SHARE[t] === l ? 0 : 1, si > 0 ? val(t, l, si - 1) : 0); // NEVER WEAKER: the untuned value, or the section before's
const dialOf = (t, si) => ((S.dial ||= {})[si] ||= {})[t] ?? 1;
// COUNT FIRST (owner, 2026-10-22: "if count helps at all, we should raise count (to a max of 3x) before trying to balance with other
// levers" / "to a max of 1.5x"): the dial u raises COUNT alone up to COUNT_MAX (x its untuned 1), then the rest of the mix (its weights
// renormalized) by u over the dial where count capped; a type with no count lever, or whose count step did not lower its break
// (S.noCount: count does not help it there), is all rest from u = 1
const COUNT_MAX = 1.5;
const countOn = (t, si) => "count" in MIX[si][t] && !((S.noCount || {})[si] || {})[t];
const countCap = (t, si) => (countOn(t, si) ? Math.max(1, COUNT_MAX / floorOf(t, "count", si)) : 1); // the dial where count tops out
function setDial(t, si, u) {
  S.dial[si][t] = u;
  const uc = countCap(t, si), rest = Object.entries(MIX[si][t]).filter(([l]) => l !== "count"), W = rest.reduce((a, [, w]) => a + w, 0), d = Math.max(1, u / uc);
  if ("count" in MIX[si][t]) { const f = floorOf(t, "count", si); setVal(t, "count", si, countOn(t, si) ? Math.round(Math.max(f, Math.min(COUNT_MAX, f * u)) * 1000) / 1000 : f); }
  for (const [l, w0] of rest) { const w = w0 / W, f = floorOf(t, l, si), x = Math.pow(d, w); setVal(t, l, si, Math.round((SHARE[t] === l ? f + SHARE_K * (x - 1) : f * x) * 1000) / 1000); }
}
const patchOf = () => Object.entries(S.tune).flatMap(([t, ls]) => Object.entries(ls).map(([l, row]) => `TYPE_TUNE.${t}.${l} = ${JSON.stringify(row)};`)).join("\n");
// mean lives lost in section si at speed x k, for the given types (one pool run)
async function lost(si, ks) { // ks: { type: k }
  const [a, b] = SECT[si], patch = patchOf(), jobs = [];
  for (const [type, k] of Object.entries(ks)) for (const trio of trios) for (const seed of SEEDS) jobs.push({ trio, type, seed, typeHp: `${type}.speed:${k}`, probeWaves: `${a}-${b}`, patch, upTo: b });
  process.env.BANDS = SECT.map(s => s.join("-")).join(","); // (typecal's bands: the four sections)
  const res = await runPool(new URL("./typecal.mjs", import.meta.url), jobs, { quiet: true });
  const out = {};
  for (const type of Object.keys(ks)) { const g = res.filter((r, i) => jobs[i].type === type); out[type] = g.reduce((s, r) => s + (r.bands[si].lost ?? 18 - LOSE), 0) / g.length; } // (dead before it: the lives it had - it broke)
  return out;
}
// every type's break in section si: bisection on the speed ladder, all types in step (one pool run a rung)
async function breaks(si) {
  const lo = Object.fromEntries(TYPES.map(t => [t, 0.4])), hi = Object.fromEntries(TYPES.map(t => [t, 16])), at = {};
  let k = Object.fromEntries(TYPES.map(t => [t, 1]));
  for (let step = 0; step < 7; step++) {
    const l = await lost(si, k);
    for (const t of TYPES) { (at[t] ||= []).push([k[t], l[t]]); if (l[t] >= LOSE) hi[t] = Math.min(hi[t], k[t]); else lo[t] = Math.max(lo[t], k[t]); k[t] = Math.sqrt(lo[t] * hi[t]); }
  }
  const out = {};
  for (const t of TYPES) { // interpolate between the highest rung under LOSE and the lowest at or over it
    const pts = at[t].sort((p, q) => p[0] - q[0]), u = pts.filter(p => p[1] < LOSE).pop(), o = pts.find(p => p[1] >= LOSE);
    out[t] = u && o ? u[0] + (o[0] - u[0]) * (LOSE - u[1]) / Math.max(1e-6, o[1] - u[1]) : u ? hi[t] : lo[t];
  }
  return out;
}
for (const sn of (process.env.SECTIONS || "1,2,3,4").split(",").map(Number)) {
  const si = sn - 1;
  if (S.done.includes(si)) { console.log(`section ${sn}: done before`); continue; }
  if (si > 0) for (const [t, ls] of Object.entries(S.tune)) for (const l of Object.keys(ls)) setVal(t, l, si, Math.max(val(t, l, si), val(t, l, si - 1))); // (never weaker than the section before)
  for (const t of TYPES) setDial(t, si, dialOf(t, si)); // (the mix laid out from the dial - 1 at first: every lever at its floor)
  let br = await breaks(si), prev = {}, best = null;
  for (let round = 0; ; round++) {
    // the TARGET: the hardest UNTOUCHED type's break (its lever at its floor - its games are the same every round, so the target holds still;
    // the hardest of all re-taken each round crept: an overshoot became the next target, 2026-10-22); every type tuned: the hardest of all
    const free = TYPES.filter(t => dialOf(t, si) <= 1 + 1e-9), mean = Math.min(...(free.length ? free : TYPES).map(t => br[t])); // (named mean in the log)
    S.log.push({ section: sn, round, tune: JSON.parse(JSON.stringify(S.tune)), breaks: br, mean }); save();
    console.log(`section ${sn} round ${round}: mean x${mean.toFixed(2)}  ` + TYPES.map(t => `${t} x${br[t].toFixed(2)} (d ${dialOf(t, si).toFixed(2)}: ${Object.keys(MIX[si][t]).map(l => l + " " + val(t, l, si)).join(", ")})`).join("  "));
    // THE BEST ROUND KEPT (2026-10-22: section 2's last round overshot armor to -17% after -6% the round before): the round whose worst
    // type sits closest to the target is the one the section ends on
    const dev = Math.max(...TYPES.map(t => Math.abs(br[t] / mean - 1)));
    if (!best || dev < best.dev) best = { dev, tune: JSON.parse(JSON.stringify(S.tune)) };
    if (TYPES.every(t => Math.abs(br[t] / mean - 1) <= TOL) || round >= ROUNDS) { S.tune = best.tune; break; }
    for (const t of TYPES) {
      if (Math.abs(br[t] / mean - 1) <= TOL) continue;
      const v = dialOf(t, si), p = prev[t];
      if (p && countOn(t, si) && v <= countCap(t, si) + 1e-9 && br[t] >= p.b - 1e-3) { // a count-only step that did not lower the break: count does not help - the other levers from 1
        ((S.noCount ||= {})[si] ||= {})[t] = true; delete prev[t]; setDial(t, si, 1); console.log(`  ${t}: count does not help in section ${sn} - the other levers`); continue;
      }
      let nv = p && Math.abs(br[t] - p.b) > 1e-3 ? v + (mean - br[t]) * (v - p.v) / (br[t] - p.b) : v * Math.pow(br[t] / mean, 1.5); // secant; a first step ~ (break ratio)^1.5 (the 2026-10-22 sweeps)
      if (!(nv > 0)) nv = v * Math.pow(br[t] / mean, 1.5);
      prev[t] = { v, b: br[t] };
      setDial(t, si, Math.max(1, Math.min(v * 1.6, nv))); // never weaker: the dial never under 1 (every lever at its floor); at most x1.6 a step (a share lever bites hard: fast went x4 -> x1.17 in one x3 step)
    }
    br = await breaks(si);
  }
  S.done.push(si); save();
}
console.log("\nTYPE_TUNE (paste into aspira-waves.js):\n" + JSON.stringify(S.tune) + "\ndials: " + JSON.stringify(S.dial));
