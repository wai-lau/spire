// /aspira - SKILL CHARTS (owner, 2026-10-05). A tower type with a chart (only
// ARC so far) levels up to 1 + SKILL_POINTS; each upgrade raises ONE of its
// three axes a tier (max SKILL_TIERS, four), like a JoJo Stand chart, and every tier
// is a named step. The other towers keep the path / form tree
// (aspira-upgrades.js). Loaded after aspira-towers.js (the simulator too):
// this file also holds ARC's skill-chart FIRING, kept out of towers.js (cap).
// NINE points (owner, 2026-10-07; was 6): every axis can be maxed. Points are bought
// by DRAGGING the axes of the chart on the tower card (aspira-sliders.js), any
// number at once; each still costs its own step of the ladder below
// FIVE tiers an axis (owner, 2026-10-07: "add another 2 tiers to each upgrade"; was 3), fifteen points a tower
// SIX with the capstone tier (owner, 2026-10-11; aspira-capstone.js): ONE axis a tower may take to the capstone, so sixteen points (5 + 5 + 6)
// FIVE TIERS since the tier redesign (owner 2026-10-24: tier 0 the plain tower, tier I a first hint; damage, rate and range from the stat
// curve, aspira-curve.js). Before: FOUR TIERS (owner, 2026-10-23: "drop all the god damn levels between that can not be bought"): an axis level is a PURCHASE, 0 I II III IV
// (SKILL_TIERS, IV the capstone), and every per-tier table below holds those five values (the capstone's pushed by aspira-capstone.js). The
// price LADDER below (SKILL_POINTS, SKILL_STEP_COST) keeps its steps: a tier takes TIER_STEPS of them. NOTE: dated comments in this file
// and its tower files speak the old seven-slot tables (0 1 2 3 4 5 6) - an old slot 3 is now tier II, 5 tier III, 6 tier IV
const SKILL_POINTS = 13, SKILL_TIERS = 5; // tiers 0..V, V the capstone, 13 purchases a tower (5 + 4 + 4) (tier redesign, owner 2026-10-24; was 16 points / tiers 0..IV)
// the ladder step a tier stands on, on the old seven-slot scale: what a formula that grew LINEARLY with the level (DRIP_TIER_K, CRR_DART_GROW) keeps its numbers through
const TIER_LEVEL = [0, 0.5, 1, 3, 5, 6]; // tier I halfway to today's I (tier redesign 2026-10-24; was 0 1 3 5 6)
// cost of each of the six small upgrades, x the build cost (about the old
// three-step total, spread over six; balance later). DEARER (owner, 2026-10-06:
// "make the levels more expensive and more powerful"): was 2 / 3.5 / 5.5 / 8 / 10.5 / 13,
// a full chart 42.5 builds; now 62.5 (the first points stay near their old price, the last ones cost nearly double) - and every tier hits harder to match (below)
// ...and on, for the three points past the sixth (owner, 2026-10-07: "keep increasing
// the prices"): the step grows by one more each time, a full chart 174.5 builds (6,980c)
// (the six points past the ninth, 2026-10-07: each step grows by one more again - a full chart 695.5 builds, 27,820c)
const SKILL_STEP_COST = [6.5, 13, 25, 41.5, 63.125, 89, 95.4, 123.7, 155.5, 190.8, 230.2, 273, 319.3] /* the first six x1.25 (owner, 2026-10-29: "let's try the mild econ"; were 5.2 10.4 20 33.2 50.5 71.2) */ /* 13 steps, one a purchase (tier redesign 2026-10-24: tiers 0..V, 13 purchases): the 17-step curve resampled, the full tower's total kept - a PLACEHOLDER, the redesign's balance battery sets the economy; was 4 6.4 11.2 17.6 25.6 35.2 46.4 59.2 73.6 89.6 107.2 126.4 147.2 169.6 193.6 219.2 246.4 */ /* x1.6 (owner, 2026-10-15: "the worst [no-weakness trio] is able to afford 100% upgrades with perfect play and interest" - eco.mjs: ARC+FRZ+ACD owned 109-287% of a max build at x1.5, 86-93% at x1.75; was 2.5 4 7 11 16 22 29 37 46 56 67 79 92 106 121 137 154) */; // the 17th: a capstone takes TWO levels (aspira-capstone.js) // the 16th: the capstone point (2026-10-11)
// Each axis: its `id`, its `name` (the slider) and its tiers' `name`s (the end screen). WHAT A TOWER DOES is
// one composed sentence for the whole chart, aspira-desc.js, each tier changing as few words as carry the
// gain (owner, 2026-10-07) - the card shows the change in track changes (aspira-sliders.js); range and movement come
// from the curve by total level (aspira-curve.js). (Per-tier `desc` / `base` sentences lived here until 2026-10-14.)
const SKILL_TREES = {
  // ARC (owner): Conductivity = ALL the branching (owner, 2026-10-05) - how
  // many times the chain jumps AND how many ways each jump forks; Voltage =
  // raw power, damage and range; Static = an EXPLOSION on every hit that marks
  // what it catches. Base: one jump forking two ways, three enemies.
  arc: [
    // THE ARC REDESIGN (owner, 2026-10-29): the ids stay (saves, sims, smoke); the axes are AMPERAGE (id conductivity), VOLTAGE and
    // RESISTANCE (id capacitance) - arcSkillStats below
    { id: "conductivity", name: "Conductivity", tiers: [{ name: "Transfer" }, { name: "Superconductor" }, { name: "Storm" }] },
    { id: "voltage", name: "Voltage", tiers: [{ name: "Spark" }, { name: "Vaporize" }, { name: "Plasma" }] },
    { id: "capacitance", name: "Shock", tiers: [{ name: "Static" }, { name: "Overload" }, { name: "Tempest" }] },
  ],
};
// FRZ (owner, 2026-10-05): an AURA - everything inside is slowed (and loses it
// the moment it leaves) and ticks a little damage. Frost = a wider, colder
// aura; Rime = a ring PULSE out to the aura's edge leaving a STACKING
// PERMANENT slow on all it passes; Moons = 1 / 2 / 3 orbiting copies of the
// tower at half of everything.
SKILL_TREES.frz = [
  { id: "temp", name: "Brittle" /* (owner, 2026-11-01, was Sublimation; 2026-10-12, was Temp) */, tiers: [{ name: "Chill" }, { name: "Absolute Zero" }, { name: "Heat Death" }] },
  { id: "rime", name: "Permafrost" /* (owner, 2026-10-12; was Rime) */, tiers: [{ name: "Frost" }, { name: "Cryosphere" }, { name: "Glaciation" }] },
  { id: "moons", name: "Moons", tiers: [{ name: "Moon" }, { name: "Desolation" }, { name: "Eclipse" }] },
];
// SOL (owner, 2026-10-05): Focus = more beams (the old Quad look: side by
// side at the tower, CONVERGING on the target - not parallel, owner), each its
// own full hit, 2 / 3 / 4; Refract = the beam bends on to 2 / 5 / 9 more
// enemies, each within SOL_CONE degrees of the first shot's direction (a light
// cone shows it); Pierce (was Impale; owner: light-themed) = 1 / 2 / 4 BREACH
// stacks per hit (the old bleed: armor down and crit up for every tower, for
// good). Focus x Pierce multiply:
// 4 beams x 6 = 24 Breaches a volley on one target.
SKILL_TREES.sol = [
  { id: "focus", name: "Scorch" /* (owner, 2026-10-25: SOL is always one beam - Focus became Scorch; the id stays - saves, sims) */, tiers: [{ name: "Sear" }, { name: "Blaze" }, { name: "Inferno" }] },
  { id: "refraction", name: "Reflection" /* (owner, 2026-11-04, the tracking-beam spec: "Reflection: First beam no longer pierces, instead it splits towards N targets"; 2026-10-25: "Rename Reflection to Diffraction"; 2026-10-22 Reflection; the id stays - saves) */, tiers: [{ name: "Lens" }, { name: "Spectrum" }, { name: "Aurora" }] },
  { id: "breach", name: "Breach", tiers: [{ name: "Pierce" }, { name: "Glare" }, { name: "Sunfire" }] },
];
// ACD (owner, 2026-10-05): its lines DRIP burning PUDDLES onto the lane by
// default, each burning at a share of its line's current heat. Catalyst = the
// burn ramps faster (tier III: a line whose enemy dies hands half its ramp to
// the next); Pour = 2 / 3 / 5 lines at once; Seep = more, longer, bigger puddles.
SKILL_TREES.acd = [
  { id: "corrosion", name: "Corrosion", tiers: [{ name: "Etch" }, { name: "Dissolve" }, { name: "Annihilate" }] },
  { id: "spray", name: "Flow", tiers: [{ name: "Mist" }, { name: "Torrent" }, { name: "Cascade" }] },
  { id: "contagion", name: "Spill", tiers: [{ name: "Blister" }, { name: "Pandemic" }, { name: "Blight" }] },
];
const hasSkills = t => !!SKILL_TREES[t.kind];
const maxLvl = t => (hasSkills(t) ? 1 + SKILL_POINTS : MAX_LVL); // a ladder step a purchase, the capstone too (tier redesign 2026-10-24; was 2 + 16, the capstone two levels)
const skillOf = (t, id) => (t.skills && t.skills[id]) || 0;
// the level the TOWER'S LOOK shows (its rings, max-level spokes): a chart
// tower's ladder steps fold onto the 4 drawn ones
const shownLvl = t => (!hasSkills(t) ? t.lvl : t.lvl >= maxLvl(t) ? MAX_LVL : Math.min(MAX_LVL, 1 + Math.floor((t.lvl - 1) / 4))); // thirteen purchases, four a look (2026-10-24; was five)

// REACH BY TIER (owner, 2026-10-06: ranges and movement were HALVED, and "no upgrade
// causes any stat to go down - balance by playing around with ranges and movement
// instead"; then: each tower through what is distinctive about IT, not generic
// multipliers). A tier multiplies the tower's range / leash (SLIDE_MAX 3, aspira-move.js) by [range, slide] (slide SPEED is gone - owner, 2026-10-12); each tower buys them differently:
//   ARC  (a long-range ANCHOR, owner) Conductivity and Voltage = RANGE; Capacitance =
//        SLIDE extent (owner: "static should increase movement range")
//   FRZ  Temp = a wider aura (its range IS the aura); FRZ roams by kind (aspira-towers.js)
//   SOL  (a long-range ANCHOR) Focus and Refraction = RANGE; Breach = SLIDE extent (owner)
//   ACD  Spray = range (more lines need more targets in reach); Spill = a roaming
//        plague (the puddles follow the lane): slide
// (SKILL_MOVE / skillMove - each axis's range and slide factors - GONE: owner, 2026-10-26 "no axis should directly increase tower range,
// tower movement, or tower damage"; both ride the curve by total level now, aspira-curve.js)

// what the upgrade cards offer: the next tier of each axis not yet full
function skillOptions(t) {
  return SKILL_TREES[t.kind].filter(ax => skillOf(t, ax.id) < axisCap(t, ax.id)).map(ax => { // (one capstone a tower - aspira-capstone.js)
    const n = skillOf(t, ax.id), tier = ax.tiers[n];
    return { choice: ax.id, name: ax.name + " " + roman(n + 1) + " · " + tier.name, desc: describeTower(t.kind, withSkill(t, ax.id)) };
  });
}
const withSkill = (t, id) => ({ ...t.skills, [id]: skillOf(t, id) + 1 });
// the sliders' BASKET (aspira-sliders.js): the price of the tower's NEXT n ladder steps, each
// at its own step of the ladder, and its chart with `add` (axis -> tiers) pulled on
const skillPointsCost = (t, n) => { if (freeBuild()) return 0; let c = 0; for (let i = 0; i < n; i++) c += Math.round(TOWERS[t.kind].cost * SKILL_STEP_COST[t.lvl - 1 + i]); return c; };
const withSkills = (t, add) => { const s = { ...t.skills }; for (const [id, n] of Object.entries(add)) if (n) s[id] = (s[id] || 0) + n; return s; };

// (FRZ's chart - aura, Rime, moons - lives in aspira-frz.js)

// ---------- SOL's chart: Focus beams, Refract cone, Pierce Breaches ----------
// Breach stacks per hit (owner: "each beam permanently weakens the target's armor" - Breach is what strips it; the base SOL strips nothing)
// (SOL_BEAMS - Focus's beam count, 2 3 10 17, capstone 25 - GONE: SOL is ALWAYS ONE BEAM, owner 2026-10-25)
const SOL_SPLIT = [0, 1, 1, 2, 3, 3]; /* DIFFRACTION I SPLITS AGAIN (owner, 2026-10-31: "3" - tier I hit no one; was 0 0 1 2 3 3 in 7.0.8) */ /* ONE TIER LESS (2026-10-31, owner: "Make SOL scorch slow" + "Reduce fire rate and diffraction / Increase other things"); was 0 1 2 3 3 4 */ /* TIER 0 SPLITS NOTHING (owner, 2026-10-28: "I wanted tier 0 to be a minimal version of the tower with few effects" - one beam, its first enemy alone struck (it flies on past it), the spec's row; was 1 since 2026-10-26, "SOL should start with bouncing") */ /* II refracts TWICE (owner, 2026-10-26: "SOL diffraction 2 should say, refracts twice"; was 1 2 2 3 3 4) */ /* SPLITS A HIT by Diffraction tier 0..V (owner, 2026-10-26: "SOL should start with bouncing ... bounces have no limit" - solSpread, aspira-sol.js; Claude's numbers. Was SOL_REFRACTION, a chain's length 0 2 3 6 9 9) */
// BREACH IS SOL'S OWN, from the start (owner, 2026-10-08): every hit strips armor for good - SOL_BREACH_ARMOR over the
// wave's armor reference, as a share of what is left (shredArmor, 2026-10-28 armor rework; it was flat, below zero too); the Breach axis massively
// increases the strip
// BREACH STRIPS A FLAT AMOUNT, big from the start (owner, 2026-10-12: "SOL with any upgrades should be good vs armor", then
// "dont scale breach with enemy armor" - it was x the wave's armor for an hour): a bare SOL strips 80 a hit (was 3)
const SOL_BREACH_ARMOR = [0, 0.162, 0.252, 0.666, 0.95, 0.95] /* x1.5, at most 0.95 (2026-10-31, owner: "Make SOL scorch slow" + "Reduce fire rate and diffraction / Increase other things"); was 0 .108 .168 .444 .95 .95 */ /* x4, at most 0.95 (2026-10-29, the mark target SOL armor +2: owner "big damage for armor"; was 0 .027 .042 .111 .396 .497) */ /* a SHARE of the armor a hit, 6.18.0 (owner, 2026-10-28: "for armor, all strip should be changed to a % not a flat number"): tier III = today's 11.1% at waves 101-119 (stripprobe), the rest stacked shares of the old flat ladder 0 127 200 550 2359 3216 */ /* 0..V written whole (2026-10-25 SOL axes: Breach I strips - it is the armor axis now; was tier01 0 and the capstone push 3216) */ /* bigger tiers (owner, 2026-10-12: "increase breach effect to make it better" - the Breach build: armor 61-69 16% -> 12%, 81-89 9% -> 5%); was 80 120 160 210 270 330, before that 3 24 72 150 261 300 */ /* x1.5 for the crit chance it no longer gives (owner, 2026-10-12: "remove extra crit chance, just reduce armor more") */ /* doubled back (2026-10-12, trio sim: ARC+FRZ+SOL, the trio without ACD, leaked 57% of armor at 81-89 - 45% with this) */ /* halved, rounded down (2026-10-08; was 2 16 49 101 174 200) */; // (SOL_BREACH_CRIT, crit chance a hit, was 0 at every tier since 2026-10-12 - gone with the tier redesign)
// THE SHOT'S BAND half-width, u, by Diffraction tier (owner, 2026-10-26: "instead of a cone, change the shape (not just visually) to an
// expanding rectangle") - first guess: the old cone's half-width at SOL's range (227 x tan 15 .. 36 deg); the battery fits it (solInBand, aspira-sol.js)
const SOL_BAND_W = [25.5, 25.5, 31.875, 38.25, 46.75, 85] /* x0.85 (owner, 2026-11-01: "refraction width can also be a good lever for SOL"; the mark target SOL swarm -3): a narrower band, worse vs swarm; was 30 30 37.5 45 55 100 */; /* ONE TIER LESS (2026-10-31, owner: "Make SOL scorch slow" + "Reduce fire rate and diffraction / Increase other things"); was 30 37.5 45 55 100 100 */ /* HALVED (owner, 2026-10-29: "thin the diffraction rectangle to make it bad for both swarm and fast"; was 60 75 90 110 200 200) */ /* IV 130 -> 200, V 165 -> 200 (2026-10-28, the FAST lever - Diffraction is SOL's fast axis: 111-119 at 13 pts swarm/fast/shield/armor 12/77/18/23 -> 7/60/4/9; more splits did nothing, a wider band let them reach the fast lines; a lower curve made fast WORSE) */
// (was the cone's half-angle:) const SOL_CONE_BY = [15, 18, 22, 26, 30, 36] /* WIDENS with Diffraction (owner, 2026-10-26: "cone size increases with diffraction level" - ladder A, Diffraction focus 79% leaked -> 67) */ /* +/- 15 from the TOWER (owner, 2026-10-26: "go back to +/-15 first" - the shot's cone; +/- 30 for a day, "yes go to +/- 30"; before that "widen cone to 30deg (+/- 15 deg)" - bounces go anywhere in it; was 3 6 8 9, capstone 12) */ /* NARROW (owner, 2026-10-19: "SOL should not be good vs swarm whatsoever" - the cone is the lever) */ /* x2/3 (owner, 2026-10-13: "tighten the refraction angle"; was 12 36 36 48 48 48, VI 60) */ /* x0.6 (owner, 2026-10-12: "doesn't that make sol too good? ... narrow SOL" - SOL was the most-needed tower, random teams won 27%) - before that x0.75 once the cone started at the first enemy (owner, 2026-10-12: "reduce refraction angle now for all levels"; soldiag ARC+FRZ+SOL armor leaks 3-9% -> 11-19%, Refraction builds 4%; was 20 60 60 80 80 80) */
// NO PIERCE (owner, 2026-10-30: "Nothing should have pierce"): SOL_ARMOR_PIERCE (6.18.14-27, every SOL hit saw a fifth of the armor) is
// gone; SOL's armor target comes from damage, the Breach share and Scorch, like every tower.
const SOL_BAND0 = SOL_BAND_W[0], BREACH_CRIT = 0.01; // (the pre-chart path's per-stack crit)
// SOL's crit hits x SOL_CRIT_K - ONE number since the tier redesign (owner, 2026-10-25: "fix all the left for later things": a factor on the
// tower's own damage is one constant, the curve carries the rest; was 3 5 9 25, V 33 by Breach tier)
const SOL_CRIT_K = 3;
// FITTED 2026-10-06 to +25 / +50 / +100% (on an HP-scaled field, so nothing
// saturates): each Focus beam's share of the shot by tier, and each Refract
// hop's damage by tier (a hop is far weaker than the first hit)
// (owner 2026-10-06: every Focus beam is a FULL hit - 1 / 2 / 3 / 4 beams, no share - so no stat falls; SOL's base damage pays for it)
const SOL_HOP = [0.7, 0.8, 0.85, 0.9, 0.95, 1]; /* tier 0 0.5 -> 0.7, the rest spread above it (owner, 2026-10-27, on the planner: three tribal rounds at +37% damage left SOL's factor at 1.14-1.17 and its marks row flat - the line's energy halving per hit, not its damage, is its limit) */ /* (owner, 2026-10-26: "SOL 0 should carry 50% or less / Diffraction 1 should raise carry to 70% / Allow Diffraction V to get to 100%"; was 0.8 .. 0.9) */ /* by DIFFRACTION tier since 2026-10-26 (was Breach's) */ /* CAPPED at 0.9 (owner, 2026-10-26: "we should cap carry to 0.9 or something" - 1.0 never fell, so a split chain ran the whole cone; was 0.8 0.85 0.9 0.95 1 1) */ /* raised (axis balance, owner 2026-10-25: "Try increasing carryover"; was 0.5 0.55 0.6 0.7 0.8 0.9) */ /* THE CARRY, PER ENEMY HIT (owner, 2026-10-25: "pierce carryover applies per enemy hit whether reflection or pierce"): every enemy past the first, on a reflection chain or the pass-through line, takes this x the hit before it */ /* by BREACH tier 0..V (owner, 2026-10-25: "Breach increases more reflection carry and burn"; was fixed 0.5 by Reflection - 2026-10-23 "reflection just increases the reflections") */ // REFLECTION'S SHARE, FIXED (owner, 2026-10-23: "reflection just increases the reflections"; was 0.5 .. 0.75, VI 0.8): each reflection hits at this x the last one's (compounding: p, p^2, p^3..); (SOL rework 2026-10-22) was 1 a hop // every refraction hop a full strike (overnight fit 2026-10-08: even 1.5x reached only 133% - Refraction needs a mechanic change, not numbers) // II / III raised 2026-10-07 (were 0.3 / 0.455) with the cone narrowed to 8 degrees: fewer hops land, so each counts more
// Refraction peaked at I (107%) and fell by III (93%): range alone spread its fire
// thin, so II / III also hit harder (owner, 2026-10-07)
// (LIGHT OUTRUNS THE FAST, Refraction x the fast, removed 2026-10-12 - owner: no extra damage by enemy type)
// (SOL_REFRACTION_DMG - Reflection's slight damage gain - GONE with the tier redesign, 2026-10-24: the hit is the stat curve's)
// each Focus tier's beam STRENGTH (2026-10-08, the tier fit's lever for Focus: more beams alone measured 168% at V)
// (SOL_PIERCE - the pass-through by Breach tier, 35% .. 125% - is GONE with the SOL rework: every beam passes through at 100%, aspira-sol.js)
const SOL_PIERCE_OLD = [0.35, 0.6, 0.8, 1]; /* by Breach STOP: 0 35%, I 60%, II 80%, III 100%, IV (the capstone) 125% (owner, 2026-10-19: "100% carry earlier / capstone goes above 100%"; 2 and 4 are never bought) */ // the overkill a kill carries on (solPierce, aspira-towers.js) by Breach tier; VI 1 (capstone)
// (SOL_PASS / SOL_PASS_N - the pass-through share and count by Focus - GONE 2026-10-25: every beam passes through every enemy on its line
// (owner: "All beams always breach"), each enemy at SOL_HOP x the one before)
// FEWER, HARDER SHOTS (2026-10-31, owner: "Make SOL scorch slow" + "Reduce fire rate and diffraction / Increase other things"): the curve's rate x SOL_RATE_K, its damage x SOL_DMG_K
const SOL_RATE_K = 0.75, SOL_DMG_K = 2.07; /* 1.8 -> 2.07, x1.15 (2026-11-02: wins back part of the strength the narrower band costs - Wai's swarm ask) */
function solSkillStats(t, s, b) {
  curveBase(t, s, b); s.rate = b.rate * SOL_RATE_K; s.dmg *= SOL_DMG_K; s.dmgCurve = s.dmg; s.rateCurve = s.rate; s.crit = LVL_SOL_CRIT[0]; // the STAT CURVE (tier redesign 2026-10-24); SOL's rate never rises (owner, 2026-10-23)
  s.beams = 1; // ONE BEAM, always (owner, 2026-10-25)
  s.split = SOL_SPLIT[skillOf(t, "refraction")]; s.band = SOL_BAND_W[skillOf(t, "refraction")]; s.hop = SOL_HOP[skillOf(t, "refraction")]; /* the carry is DIFFRACTION's (owner, 2026-10-26: "move the carry increase from breach to diffraction") */
  const bk = skillOf(t, "breach"); s.par = SOL_PAR_N[bk] || 0; // Breach's parallel beams (aspira-sol.js)
  s.breach = 1; s.pierce = skillOf(t, "refraction") > 0 ? 1 : 0; /* THE BAND IS DIFFRACTION'S (owner, 2026-10-28: tier 0 "a minimal version of the tower with few effects"): a plain SOL's beam strikes its first enemy and flies on straight past it, striking no one - no split, no mirror, no prism (fireRay, solSpread, drawAims); was 1 at every tier since 2026-10-26 ("SOL should start with bouncing") */ const sc = skillOf(t, "focus"); s.dot = sc ? { k: SOL_SCORCH_TOTAL / SOL_SCORCH_N[sc], n: SOL_SCORCH_N[sc], t: SOL_SCORCH_N[sc] * SOL_SCORCH_Q } : null; /* SCORCH (owner, 2026-10-25): a burn of frac x the hit that landed - reflections and pass-throughs burn at their own falloff - stacking without cap (solScorch) */ s.critMul = SOL_CRIT_K; s.bleedArmor = SOL_BREACH_ARMOR[bk]; s.bleedCrit = 0; s.skill = true;
}
// THE SHOT (owner, 2026-10-22 rework .. 2026-10-26): one beam that goes on STRAIGHT through every hit and SPLITS at each one to st.split
// more enemies inside the shot's cone (st.cone degrees either side of tower -> first enemy, seen from the tower, each farther from SOL than
// the one before), every hit at st.hop x the one before, ending only under 5% of the shot - solSpread, aspira-sol.js (history ARCHAEOLOGY.md)
const SOL_CONE_EDGE = 1600; // the charge cone's reach, to the screen's edge (drawAims - the only cone drawn, owner 2026-10-26)
// a shot goes on past its last enemy far beyond the screen's edge (owner, 2026-10-08), FIXED where it struck (2026-10-26: no visual tracks the enemy)
const SOL_OUT_LEN = 3000;
// it ENDS AT THE PLAY BOX's edge (owner, 2026-10-27: "SOL shooting backwards? / when SOL is above target"): a far end 3000 u down
// the screen fell BEHIND the 3D camera and projected flipped - the line drawn up past the tower
function solOutLen(x, y, ux, uy) {
  if (typeof phoneBox !== "function") return SOL_OUT_LEN;
  const bx = phoneBox(); let k = SOL_OUT_LEN;
  if (ux > 1e-9) k = Math.min(k, (bx.x1 - x) / ux); else if (ux < -1e-9) k = Math.min(k, (bx.x0 - x) / ux);
  if (uy > 1e-9) k = Math.min(k, (bx.y1 - y) / uy); else if (uy < -1e-9) k = Math.min(k, (bx.y0 - y) / uy);
  k = Math.max(0, k);
  if (typeof warp !== "undefined" && warp && warp.gl && warp.p && typeof warpProject === "function") { /* 3D: never behind the camera - */
    const behind = () => { for (let i = 0; i < 12 && k > 1 && !(warpProject(x + ux * k, y + uy * k, 0).s > 0); i++) k /= 2; };
    if (typeof viewCam === "function") viewCam(behind); else behind(); /* - under the TEXTURE camera (viewCam): a shot fires in the game tick, outside warp3d, where the page's camera put points 1/WARP_RES too far out and could halve a line the simulator keeps (2026-11-01) */
  }
  return k;
}
// UI (drawFx): the Refract light cone, a faint wedge that fades FAST (owner):
// its opacity falls with the cube of the time left, and with DISTANCE from the
// tower - full at the source, gone by SOL_CONE_FADE of its length (owner)
const SOL_CONE_FADE = 0.8;
// TWICE AS LONG AND TWICE AS STRONG (owner, 2026-10-21: "double opacity and length of SOL cones (should still fade to 0 by the end)"):
// every cone drawn SOL_CONE_LEN_K x its length at SOL_CONE_A (was 0.5), still clear by SOL_CONE_FADE of the way out
const SOL_CONE_LEN_K = 2, SOL_CONE_A = 0.525 /* x0.75 (owner, 2026-10-26: "reduce cone opacity by 25%"; was 0.7) */; // then 30% fainter (owner, 2026-10-21: "reduce SOL cone opacity by 30%"; 1)
// THE BAND (owner, 2026-10-26: "an expanding rectangle" / "the indicator should fade to 0% opacity as it nears the tower, opacity should
// increase as distance from the tower increases and go back down starting around 10 towers away"): f.half u either side of the line from
// (f.x, f.y) along f.a, f.len long, drawn as ONE gradient: clear at the tower, full by SOL_BAND_RISE towers out, fading from
// SOL_BAND_FALL towers to clear at SOL_BAND_GONE (a tower: its hexagon's width, 2 x CELL_S x TOWER_K)
const SOL_BAND_RISE = 3, SOL_BAND_FALL = 10, SOL_BAND_GONE = 20; // (one gradient, 2D and GPU alike - owner, 2026-10-26: "fade gradually instead of step", "a gradient, not steps!")
const SOL_BAND_A = 0.2625; // the band's full opacity: half the cone's SOL_CONE_A (owner, 2026-10-26: "half current opacity")
function drawBand(f, k) {
  const a = Math.min(1, SOL_BAND_A * k * k * k), c = Math.cos(f.a), s = Math.sin(f.a), T = 2 * CELL_S * TOWER_K, len = Math.min(f.len, T * SOL_BAND_GONE);
  if (!(f.half > 0) || !(a > 0)) return;
  if (typeof fxGlBand === "function" && fxGl.on && !(ctx instanceof CanvasRenderingContext2D)) { // 3D: ONE quad, the profile per pixel (aspira-fxgl.js shape 8) - no steps
    fxGlBand(f.x, f.y, f.x + c * len, f.y + s * len, f.half, COL[f.color], a, Math.min(1, SOL_BAND_RISE * T / len), Math.min(1, SOL_BAND_FALL * T / len), Math.min(1, SOL_BAND_GONE * T / len));
    return;
  }
  const g = ctx.createLinearGradient(0, 0, len, 0), at = u => Math.min(1, u * T / len); // 2D: ONE rectangle, a linear gradient through the profile's corners
  g.addColorStop(0, "transparent"); g.addColorStop(at(SOL_BAND_RISE), COL[f.color]); g.addColorStop(at(SOL_BAND_FALL), COL[f.color]); g.addColorStop(at(SOL_BAND_GONE), "transparent");
  ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.fillStyle = g; ctx.globalAlpha = a; ctx.fillRect(0, -f.half, len, 2 * f.half); ctx.restore();
}
function drawCone(f0, k) {
  const f = { ...f0, len: f0.len * SOL_CONE_LEN_K }, a = Math.min(1, SOL_CONE_A * k * k * k);
  if (typeof fxGlCone === "function" && fxGl.on && !(ctx instanceof CanvasRenderingContext2D)) { fxGlCone(f, a); return; } // 3D: by the GPU (aspira-glctx.js)
  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.len * SOL_CONE_FADE);
  g.addColorStop(0, COL[f.color]); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.globalAlpha = a;
  ctx.beginPath(); ctx.moveTo(f.x, f.y);
  ctx.arc(f.x, f.y, f.len, f.a - f.half, f.a + f.half); ctx.closePath(); ctx.fill();
}
// ACD's chart numbers, stats and puddles live in aspira-acid.js
// SCORCH (owner, 2026-10-22: "replace shrapnel with short, high damage DoT"; history ARCHAEOLOGY.md): every SOL hit - beam, pass-through,
// reflection - burns; each tick a loud-free hit that pops one shield charge (SOL_DOT_ST, owner 2026-10-23)
// A BURN IS 1x ITS HIT AT MOST (owner, 2026-10-26: "scorch burn should never be higher than 1x the hit"): SOL_SCORCH_N ticks of
// SOL_SCORCH_TOTAL / n of the hit, one every SOL_SCORCH_Q s (the max tick rate) - a higher Scorch tier burns LONGER, popping more shields
// (each stack its own, solScorchTick), never harder (was 0.21 a tick: Scorch V a 33x burn)
let SOL_SCORCH_TOTAL = 6; /* 4 -> 6 (2026-10-31, owner: "Make SOL scorch slow" + "Reduce fire rate and diffraction / Increase other things") */ /* 5 -> 4 (2026-10-28, after the band-200 fast lever: SOL sat under the others, 111-119 mean 20% -> 22; fast kept 63%) */ /* 2026-10-28 SOL sweep C (owner: "I don't want to put all the pressure on scorch" - raised, beside the curve cut; was 1) */ const SOL_SCORCH_Q = 0.1, SOL_SCORCH_N = [0, 60, 78, 96, 120, 156];
// THE CONE SCORCHES (owner, 2026-10-26: "make the cone apply 1 stack of scorch to all enemies within it (can increase with levels)"):
// (SOL_CONE_STACKS - burns a shot put on every enemy in its cone - GONE 2026-10-26: the scorch ROD puts one, solRodStep); Claude's ladder
const SOL_DOT_ST = { noFx: true }; /* its ticks SUM into a number every half second like any tick (dmgTick; noNum gone - owner, 2026-10-26: "SOL scorch damage not popping up, all ticks should show a cumulative damage every 0.5 seconds") */ // ONE a tick (owner, 2026-10-23: "No stop making thing pop more per tick"; was 5 for a day - three SOLs leaked 62% of shields at 61-69 with 1, 36% with 5)
