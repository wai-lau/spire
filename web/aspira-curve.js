// /spire - THE STAT CURVE (tier redesign, owner 2026-10-24: "base tower stats are tied to total level / and the axes just add
// mechanics based on those stats", "slightly steepening"; spec docs/superpowers/specs/2026-10-24-tier-redesign-design.md). A tower's
// damage, fire rate and range come from its TOTAL LEVEL alone - every point it bought, whichever axis - on one curve per tower:
// lo at level 0 (a bare tower, below the old bare one), hi at SKILL_POINTS, GEOMETRIC between (each point the same x, so the late
// points add the most). The axes add MECHANICS; one may NUDGE a stat up, never down, at most NUDGE_MAX over the curve in all.
// Loaded after aspira-capstone.js (the simulator too, scripts/aspira-sim/sim.mjs FILES); the stats functions call curveBase.
// hi: MEASURED on the old tables (the mean of the three V/IV/IV builds, 2026-10-24), floored at x2 where the old damage sat in
// per-hit K tables (FRZ, SOL, GRV) and x20 for IFR (its meteor's x53 at the top) - PLACEHOLDERS, the balance battery fits them
const STAT_CURVE = {
  arc: { dmg: [0.8, 163], rate: [1, 1.18], range: [1, 1.28] },
  frz: { dmg: [0.8, 2], rate: [1, 1], range: [1, 1.5] }, // (FRZ's rate is its TICK - Sublimation's ticks, aspira-frz.js)
  sol: { dmg: [0.8, 2], rate: [1, 1], range: [1, 1.5] }, // never raise SOL's fire rate (owner, 2026-10-23)
  acd: { dmg: [0.8, 16.2], rate: [1, 1], range: [1, 1.37] },
  grv: { dmg: [0.8, 2], rate: [1, 4.76], range: [1, 1.36] },
  car: { dmg: [0.8, 20300], rate: [1, 1], range: [1, 1] },
  ifr: { dmg: [0.8, 20], rate: [1, 2.22], range: [1, 1.27] },
};
const CURVE_P = 1; // the steepening: the level's share is (L / SKILL_POINTS) ** CURVE_P before the geometric step (1 = evenly geometric)
const NUDGE_MAX = 1.2; // an axis's stat nudge, all of a tower's together: x1 .. x1.2 (spec, Calls for the build)
const nudge = x => Math.min(NUDGE_MAX, Math.max(1, x));
const towerLevel = t => Object.values(t.skills || {}).reduce((a, n) => a + (n || 0), 0);
const curveStat = ([lo, hi], L) => lo * (hi / lo) ** ((Math.max(0, Math.min(SKILL_POINTS, L)) / SKILL_POINTS) ** CURVE_P);
function curveAt(kind, L) {
  const c = STAT_CURVE[kind];
  return { dmg: curveStat(c.dmg, L), rate: curveStat(c.rate, L), range: curveStat(c.range, L) };
}
// a stats function's first line: the tower's base stats off the curve
function curveBase(t, s, b) {
  const c = curveAt(t.kind, towerLevel(t));
  s.dmg = b.dmg * c.dmg; s.rate = b.rate * c.rate; s.range = b.range * RANGE_BONUS * c.range;
  return c;
}
