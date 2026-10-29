// /spire - THE STAT CURVE (tier redesign, owner 2026-10-24: "base tower stats are tied to total level / and the axes just add
// mechanics based on those stats", "slightly steepening"; spec docs/superpowers/specs/2026-10-24-tier-redesign-design.md). A tower's
// damage, fire rate and range come from its TOTAL LEVEL alone - every point it bought, whichever axis - on one curve per tower:
// lo at level 0 (a bare tower, below the old bare one), hi at SKILL_POINTS, a POWER CURVE between (CURVE_P below; it was geometric - the late
// points add the most). The axes add MECHANICS - never range, movement or damage (owner, 2026-10-26); only ARC's Conductivity nudges RATE (NUDGE_MAX).
// Loaded after aspira-capstone.js (the simulator too, scripts/aspira-sim/sim.mjs FILES); the stats functions call curveBase.
// (hi: was MEASURED per tower on the old tables, 2026-10-24 - replaced by CURVE_DMG_X below, one growth for all, 2026-10-26)
// SLIDE ON THE CURVE TOO (owner, 2026-10-26: "no axis should directly increase tower range, tower movement, or tower damage ... this should
// all be based on the tower's cumulative tier"): the slide row's hi is the old best axis slide (SKILL_MOVE, gone) - range has no axis nudge
// NO RATE ON THE CURVE (owner, 2026-10-25: "as a general rule, rate does not grow with just tiers, only tower range, tower mvmt and damage"):
// every rate row is flat (lo = hi); a rate gain lives in an axis (GRV's Nova) - ARC's old x1.18 folded into its damage
// ONE DAMAGE GROWTH FOR EVERY TOWER (owner, 2026-10-26: "everything should grow similarly"): a tower's damage rises from its lo (dmg[0], the
// duo rule's tier 0) to lo x CURVE_DMG_X at SKILL_POINTS - the same curve shape and the same x for all seven. Its strength against the others
// is its base hit and its mechanics, never its growth (the old per-tower hi ran x1.26 for SOL to x375 for CRR - placeholders folded from
// the old tables). (let: the sims sweep it)
// EACH TOWER ITS OWN GROWTH (owner, 2026-10-28: "towers each having their own curve is fine / I just want them all to use a similar
// number for td"): dmg[1], when set, scales that tower's top (lo x CURVE_DMG_X x dmg[1]) - its late strength; the td NUMBER stays a
// similar size across towers (a tower whose td reads huge takes its td from a smaller unit, the damage unchanged)
let CURVE_DMG_X = 11; // (tribal 2026-10-26 at 12: 2 of 35 trios won both seeds - too weak; at 18, round 4: 8 of 35; 18 -> 11 2026-10-27: planner b87 at 18 won with 20-27 buys, eight winners under the 30-of-39 target - level 10 is to hit as level 7 did)
const STAT_CURVE = {
  arc: { dmg: [5.5125], rate: [1, 1], range: [1, 1.28], slide: [1, 3] },
  frz: { dmg: [0.9086, 0.65 /* its top (owner 2026-10-28: each tower its own curve) - late rows at 13 pts, 101-119, toward ~30% mean leaked */], rate: [1, 1], range: [1, 1.5], slide: [1, 3] }, // (FRZ's rate is its TICK - Sublimation's ticks, aspira-frz.js)
  sol: { dmg: [15.308 /* x2 (2026-10-29, the mark target SOL armor +2: owner "big damage for armor"; was 7.654) */ /* x4 (2026-10-28 SOL sweep C: x12 pulled a third of the way back - owner: "yes-ish ... don't need to go all the way back down"; was x12 22.962 for the armor rework, x1 1.9135 before) */, 2.5 /* its top (owner 2026-10-28: each tower its own curve) - late rows at 13 pts, 101-119, toward ~30% mean leaked */], rate: [1, 1], range: [1, 1.5], slide: [1, 3] }, // never raise SOL's fire rate (owner, 2026-10-23)
  acd: { dmg: [6.0708 /* x3.5 (armor rework 2026-10-28, as SOL: its ticks lost the negative-armor bonus; was 1.7345) */, 2.3 /* x2, marks at 9 pts, 101-119 (6.16.0 battery, 2026-10-28): ACD flat 82/62/56/60 -> +shield +armor -swarm */ /* its top (owner 2026-10-28: each tower its own curve) - late rows at 13 pts, 101-119, toward ~30% mean leaked */], rate: [1, 1], range: [1, 1.37], slide: [1, 2.1] },
  grv: { dmg: [0.256, 5.4 /* x3, marks at 9 pts, 101-119 (6.16.0 battery, 2026-10-28) (HP_LATE 1.14 left GRV leaking ~90% on every type) */ /* its top (owner 2026-10-28: each tower its own curve) - late rows at 13 pts, 101-119, toward ~30% mean leaked */], rate: [1, 1], range: [1, 1.36], slide: [1, 2.2] },
  crr: { dmg: [1.58473 /* /3 with the rate x3 (owner, 2026-10-29: 3x the bolts at a third; was 4.7542) */, 1.8 /* 1.5 -> 1.8 (2026-10-29 CRR late pass: good x2 seeds on the 13 CRR trios 7 -> 10 of 26 won, 2.1 no better; marks 101-119 -2 0 +3 -1 -> -2 +1 +2 -1, two checks) */ /* its top (owner 2026-10-28: each tower its own curve) - late rows at 13 pts, 101-119, toward ~30% mean leaked */], rate: [6, 6] /* x3 (2026-10-29; was 2 2) */, range: [1, 1], slide: [1, 1] },
  ifr: { dmg: [0.1047, 11.4 /* x3, marks at 9 pts, 101-119 (6.16.0 battery, 2026-10-28) (HP_LATE 1.14 left IFR leaking ~90% on every type) */ /* its top (owner 2026-10-28: each tower its own curve) - late rows at 13 pts, 101-119, toward ~30% mean leaked */], rate: [2.5, 2.5], range: [1, 1.27], slide: [1, 1.8] },
};
// lo: the DUO RULE's (plan 3, 2026-10-25 - scripts/aspira-sim/duo0.mjs), then x each tribal round's factor (triscale.py; round 4
// 2026-10-26: arc 1.09, sol 1.17, acd 1.04, grv 1.09, crr 0.90, ifr 0.92; round 5: arc 1.04, frz 1.06, sol 1.17, acd 0.96, grv 1.10,
// crr 0.98, ifr 0.90): ARC and SOL x0.95 (ARC+FRZ lost the Star at 0.8), IFR's
// round 7 (2026-10-27, CURVE_P 1.5, bosses skipped, 26 of 35 at a win score): arc 0.947, frz 1.041, sol 1.119, acd 1.002, grv 1.011, crr 1.036, ifr 0.954 - applied;
// and CRR's tier 0 RATE x2.5 / x2 (one meteor, one interceptor: a third and two thirds of the old bare tower's hits) - each still below
// the old bare tower in all, with the waves 1-12 ease (aspira-waves.js) and FRZ's nip (aspira-frz.js)
let CURVE_P = 1.5; // 2.5 -> 1.5 (owner, 2026-10-27: "if there is a buy that looks bad and then pays off too much later, then there's a problem with the scaling curve" - at 2.5 the first seven points bought a fifth of the growth and the last three half: banking beat buying, the planner hoarded 317k, a tower at 10 points died inside chapter 4 that was fine at 13; at 1.5 each point pays about the same) // the steepening: lo + (hi - lo) x (L / SKILL_POINTS) ** CURVE_P. Was GEOMETRIC (lo x (hi/lo) ** share, plan 2): with ARC's x171 and CRR's x25000 spans
// that held the mid game near lo - ARC hit 82 at five points (master's Voltage IV 310), and the axes that only SHAPE damage (Voltage, Conductivity,
// Armament, Tether, Permafrost) lost 4 of 16 pushed first (axis.mjs, plan 3 Task 2b, 2026-10-25). A power curve rises at every point for every kind
const NUDGE_MAX = 1.2; // an axis's stat nudge, all of a tower's together: x1 .. x1.2 (spec, Calls for the build)
const nudge = x => Math.min(NUDGE_MAX, Math.max(1, x));
// the tower's OWN axes only: a stray key an old save carries (another kind's axis, a renamed id) buys no level
const towerLevel = t => (SKILL_TREES[t.kind] || []).reduce((a, ax) => a + (((t.skills || {})[ax.id]) || 0), 0);
const curveStat = ([lo, hi], L) => lo + (hi - lo) * (Math.max(0, Math.min(SKILL_POINTS, L)) / SKILL_POINTS) ** CURVE_P;
// BIGGER STEPS (owner, 2026-10-29: "make it so that the upgrades are bigger steps then / we can merge upgrade #1 and #2 if that helps"):
// the first point bought stands at CURVE_FIRST on the curve, the rest spread evenly up to SKILL_POINTS (the top unchanged). 1 = as bought
let CURVE_FIRST = 1;
const curveLevel = L => (L <= 0 ? 0 : CURVE_FIRST + (L - 1) * (SKILL_POINTS - CURVE_FIRST) / (SKILL_POINTS - 1));
function curveAt(kind, L0) {
  const c = STAT_CURVE[kind], L = curveLevel(L0);
  return { dmg: curveStat([c.dmg[0], c.dmg[0] * CURVE_DMG_X * (c.dmg[1] ?? 1)], L), rate: curveStat(c.rate, L), range: curveStat(c.range, L), slide: curveStat(c.slide, L) };
}
// a stats function's first line: the tower's base stats off the curve
function curveBase(t, s, b) {
  const c = curveAt(t.kind, towerLevel(t));
  s.dmg = b.dmg * c.dmg; s.rate = b.rate * c.rate; s.range = b.range * RANGE_BONUS * c.range; s.slide = c.slide;
  return c;
}
