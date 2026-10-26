// /spire - THE STAT CURVE (tier redesign, owner 2026-10-24: "base tower stats are tied to total level / and the axes just add
// mechanics based on those stats", "slightly steepening"; spec docs/superpowers/specs/2026-10-24-tier-redesign-design.md). A tower's
// damage, fire rate and range come from its TOTAL LEVEL alone - every point it bought, whichever axis - on one curve per tower:
// lo at level 0 (a bare tower, below the old bare one), hi at SKILL_POINTS, a POWER CURVE between (CURVE_P below; it was geometric - the late
// points add the most). The axes add MECHANICS - never range, movement or damage (owner, 2026-10-26); only ARC's Conductivity nudges RATE (NUDGE_MAX).
// Loaded after aspira-capstone.js (the simulator too, scripts/aspira-sim/sim.mjs FILES); the stats functions call curveBase.
// hi: MEASURED on the old tables (the mean of the three V/IV/IV builds, 2026-10-24), floored at x2 where the old damage sat in
// per-hit K tables (FRZ, SOL, GRV) and x20 for IFR (its meteor's x53 at the top) - PLACEHOLDERS, the balance battery fits them
// SLIDE ON THE CURVE TOO (owner, 2026-10-26: "no axis should directly increase tower range, tower movement, or tower damage ... this should
// all be based on the tower's cumulative tier"): the slide row's hi is the old best axis slide (SKILL_MOVE, gone) - range has no axis nudge
// NO RATE ON THE CURVE (owner, 2026-10-25: "as a general rule, rate does not grow with just tiers, only tower range, tower mvmt and damage"):
// every rate row is flat (lo = hi); a rate gain lives in an axis (GRV's Nova) - ARC's old x1.18 folded into its damage
const STAT_CURVE = {
  arc: { dmg: [0.95, 192.3 /* x1.18, its old rate gain (2026-10-25) */], rate: [1, 1], range: [1, 1.28], slide: [1, 3] },
  frz: { dmg: [0.8, 2], rate: [1, 1], range: [1, 1.5], slide: [1, 3] }, // (FRZ's rate is its TICK - Sublimation's ticks, aspira-frz.js)
  sol: { dmg: [0.95, 2], rate: [1, 1], range: [1, 1.5], slide: [1, 3] }, // never raise SOL's fire rate (owner, 2026-10-23)
  acd: { dmg: [0.8, 16.2], rate: [1, 1], range: [1, 1.37], slide: [1, 2.1] },
  grv: { dmg: [0.8, 5 /* axsweep 2026-10-25 (3.6 placed first);  the old x4.76 rate gain split: x1.8 here, Nova's GRV_NOVA_RATE the rest (2026-10-25) */], rate: [1, 1], range: [1, 1.36], slide: [1, 2.2] },
  car: { dmg: [0.8, 20300], rate: [2, 2], range: [1, 1], slide: [1, 1] },
  ifr: { dmg: [0.8, 20], rate: [2.5, 2.5], range: [1, 1.27], slide: [1, 1.8] },
};
// lo: the DUO RULE's (plan 3, 2026-10-25 - scripts/aspira-sim/duo0.mjs): ARC and SOL x0.95 (ARC+FRZ lost the Star at 0.8), IFR's
// and CRR's tier 0 RATE x2.5 / x2 (one meteor, one interceptor: a third and two thirds of the old bare tower's hits) - each still below
// the old bare tower in all, with the waves 1-12 ease (aspira-waves.js) and FRZ's nip (aspira-frz.js)
let CURVE_P = 2.5; // the steepening: lo + (hi - lo) x (L / SKILL_POINTS) ** CURVE_P. Was GEOMETRIC (lo x (hi/lo) ** share, plan 2): with ARC's x171 and CRR's x25000 spans
// that held the mid game near lo - ARC hit 82 at five points (master's Voltage IV 310), and the axes that only SHAPE damage (Voltage, Conductivity,
// Armament, Tether, Permafrost) lost 4 of 16 pushed first (axis.mjs, plan 3 Task 2b, 2026-10-25). A power curve rises at every point for every kind
const NUDGE_MAX = 1.2; // an axis's stat nudge, all of a tower's together: x1 .. x1.2 (spec, Calls for the build)
const nudge = x => Math.min(NUDGE_MAX, Math.max(1, x));
// the tower's OWN axes only: a stray key an old save carries (another kind's axis, a renamed id) buys no level
const towerLevel = t => (SKILL_TREES[t.kind] || []).reduce((a, ax) => a + (((t.skills || {})[ax.id]) || 0), 0);
const curveStat = ([lo, hi], L) => lo + (hi - lo) * (Math.max(0, Math.min(SKILL_POINTS, L)) / SKILL_POINTS) ** CURVE_P;
function curveAt(kind, L) {
  const c = STAT_CURVE[kind];
  return { dmg: curveStat(c.dmg, L), rate: curveStat(c.rate, L), range: curveStat(c.range, L), slide: curveStat(c.slide, L) };
}
// a stats function's first line: the tower's base stats off the curve
function curveBase(t, s, b) {
  const c = curveAt(t.kind, towerLevel(t));
  s.dmg = b.dmg * c.dmg; s.rate = b.rate * c.rate; s.range = b.range * RANGE_BONUS * c.range; s.slide = c.slide;
  return c;
}
