// /aspira - SKILL CHARTS (owner, 2026-10-05). A tower type with a chart (only
// ARC so far) levels up to 1 + SKILL_POINTS; each upgrade raises ONE of its
// three axes a tier (max SKILL_TIERS), like a JoJo Stand chart, and every tier
// is a named step. The other towers keep the path / form tree
// (aspira-upgrades.js). Loaded after aspira-towers.js (the simulator too):
// this file also holds ARC's skill-chart FIRING, kept out of towers.js (cap).
// NINE points (owner, 2026-10-07; was 6): every axis can be maxed. Points are bought
// by DRAGGING the axes of the chart on the tower card (aspira-sliders.js), any
// number at once; each still costs its own step of the ladder below
// FIVE tiers an axis (owner, 2026-10-07: "add another 2 tiers to each upgrade"; was 3), fifteen points a tower
// SIX with the capstone tier (owner, 2026-10-11; aspira-capstone.js): ONE axis a tower may take to VI, so sixteen points (5 + 5 + 6)
const SKILL_POINTS = 16, SKILL_TIERS = 6;
// cost of each of the six small upgrades, x the build cost (about the old
// three-step total, spread over six; balance later). DEARER (owner, 2026-10-06:
// "make the levels more expensive and more powerful"): was 2 / 3.5 / 5.5 / 8 / 10.5 / 13,
// a full chart 42.5 builds; now 62.5 (the first points stay near their old price, the last ones cost nearly double) - and every tier hits harder to match (below)
// ...and on, for the three points past the sixth (owner, 2026-10-07: "keep increasing
// the prices"): the step grows by one more each time, a full chart 174.5 builds (6,980c)
// (the six points past the ninth, 2026-10-07: each step grows by one more again - a full chart 695.5 builds, 27,820c)
const SKILL_STEP_COST = [4, 6.4, 11.2, 17.6, 25.6, 35.2, 46.4, 59.2, 73.6, 89.6, 107.2, 126.4, 147.2, 169.6, 193.6, 219.2, 246.4] /* x1.6 (owner, 2026-10-15: "the worst [no-weakness trio] is able to afford 100% upgrades with perfect play and interest" - eco.mjs: ARC+FRZ+ACD owned 109-287% of a max build at x1.5, 86-93% at x1.75; was 2.5 4 7 11 16 22 29 37 46 56 67 79 92 106 121 137 154) */; // the 17th: a capstone takes TWO levels (aspira-capstone.js) // the 16th: the capstone point (2026-10-11)
// Each axis: its `id`, its `name` (the slider) and its tiers' `name`s (the end screen). WHAT A TOWER DOES is
// one composed sentence for the whole chart, aspira-desc.js, each tier changing as few words as carry the
// gain (owner, 2026-10-07) - the card shows the change in track changes (aspira-sliders.js); the reach each
// tier buys is in SKILL_MOVE below. (Per-tier `desc` / `base` sentences lived here until 2026-10-14.)
const SKILL_TREES = {
  // ARC (owner): Conductivity = ALL the branching (owner, 2026-10-05) - how
  // many times the chain jumps AND how many ways each jump forks; Voltage =
  // raw power, damage and range; Static = an EXPLOSION on every hit that marks
  // what it catches. Base: one jump forking two ways, three enemies.
  arc: [
    { id: "conductivity", name: "Conductivity", tiers: [
      { name: "Transfer" },
      { name: "Conduit" },
      { name: "Superconductor" },
      { name: "Lattice" },
      { name: "Storm" },
    ] },
    { id: "voltage", name: "Voltage", tiers: [
      { name: "Spark" },
      { name: "Fry" },
      { name: "Vaporize" },
      { name: "Arc Flash" },
      { name: "Plasma" },
    ] },
    { id: "capacitance", name: "Capacitance", tiers: [
      { name: "Static" },
      { name: "Charge" },
      { name: "Overload" },
      { name: "Discharge" },
      { name: "Tempest" },
    ] },
  ],
};
// FRZ (owner, 2026-10-05): an AURA - everything inside is slowed (and loses it
// the moment it leaves) and ticks a little damage. Frost = a wider, colder
// aura; Rime = a ring PULSE out to the aura's edge leaving a STACKING
// PERMANENT slow on all it passes; Moons = 1 / 2 / 3 orbiting copies of the
// tower at half of everything.
SKILL_TREES.frz = [
  { id: "temp", name: "Sublimation" /* (owner, 2026-10-12; was Temp) */, tiers: [
    { name: "Chill" },
    { name: "Freeze" },
    { name: "Absolute Zero" },
    { name: "Permafrost" },
    { name: "Heat Death" },
  ] },
  { id: "rime", name: "Permafrost" /* (owner, 2026-10-12; was Rime) */, tiers: [
    { name: "Frost" },
    { name: "Glacier" },
    { name: "Cryosphere" },
    { name: "Ice Sheet" },
    { name: "Glaciation" },
  ] },
  { id: "moons", name: "Moons", tiers: [
    { name: "Moon" },
    { name: "Twin Moons" },
    { name: "Desolation" },
    { name: "Satellites" },
    { name: "Eclipse" },
  ] },
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
  { id: "focus", name: "Focus", tiers: [
    { name: "Convergence" },
    { name: "Crux" },
    { name: "Disintegration" },
    { name: "Lance" },
    { name: "Supernova" },
  ] },
  { id: "refraction", name: "Refraction", tiers: [
    { name: "Lens" },
    { name: "Prism" },
    { name: "Spectrum" },
    { name: "Halo" },
    { name: "Aurora" },
  ] },
  { id: "breach", name: "Breach", tiers: [
    { name: "Pierce" },
    { name: "Sear" },
    { name: "Flare" },
    { name: "Brand" },
    { name: "Sunfire" },
  ] },
];
// ACD (owner, 2026-10-05): its lines DRIP burning PUDDLES onto the lane by
// default, each burning at a share of its line's current heat. Catalyst = the
// burn ramps faster (tier III: a line whose enemy dies hands half its ramp to
// the next); Pour = 2 / 3 / 5 lines at once; Seep = more, longer, bigger puddles.
SKILL_TREES.acd = [
  { id: "corrosion", name: "Corrosion", tiers: [
    { name: "Etch" },
    { name: "Corrode" },
    { name: "Dissolve" },
    { name: "Erode" },
    { name: "Annihilate" },
  ] },
  { id: "spray", name: "Flow", tiers: [
    { name: "Mist" },
    { name: "Downpour" },
    { name: "Torrent" },
    { name: "Deluge" },
    { name: "Cascade" },
  ] },
  { id: "contagion", name: "Contagion", tiers: [
    { name: "Blister" },
    { name: "Plague" },
    { name: "Pandemic" },
    { name: "Epidemic" },
    { name: "Blight" },
  ] },
];
const hasSkills = t => !!SKILL_TREES[t.kind];
const maxLvl = t => (hasSkills(t) ? 2 + SKILL_POINTS : MAX_LVL); // (+1: the capstone is two levels - aspira-capstone.js)
const skillOf = (t, id) => (t.skills && t.skills[id]) || 0;
// the level the TOWER'S LOOK shows (its rings, max-level spokes): a chart
// tower's 7 levels fold onto the 4 drawn ones
const shownLvl = t => (!hasSkills(t) ? t.lvl : t.lvl >= maxLvl(t) ? MAX_LVL : 1 + Math.floor((t.lvl - 1) / 5)); // fifteen points, five a look

// REACH BY TIER (owner, 2026-10-06: ranges and movement were HALVED, and "no upgrade
// causes any stat to go down - balance by playing around with ranges and movement
// instead"; then: each tower through what is distinctive about IT, not generic
// multipliers). A tier multiplies the tower's range / leash (SLIDE_MAX 3, aspira-towers.js) by [range, slide] (slide SPEED is gone - owner, 2026-10-12); each tower buys them differently:
//   ARC  (a long-range ANCHOR, owner) Conductivity and Voltage = RANGE; Capacitance =
//        SLIDE extent (owner: "static should increase movement range")
//   FRZ  Temp = a wider aura (its range IS the aura); FRZ roams by kind (aspira-towers.js)
//   SOL  (a long-range ANCHOR) Focus and Refraction = RANGE; Breach = SLIDE extent (owner)
//   ACD  Spray = range (more lines need more targets in reach); Contagion = a roaming
//        plague (the puddles follow the lane): slide
const NO_MOVE = [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]];
const SKILL_MOVE = {
  // ARC's range tiers CUT (owner, 2026-10-11: "ranges way too high, late game players don't need to move towers"):
  // maxed it reached x4.3 - all of the plain lanes from a corner; now x1.25. SOL keeps its reach (owner, same day)
  arc:    { conductivity: [[1, 1], [1.02, 1], [1.04, 1], [1.07, 1], [1.09, 1], [1.12, 1]], voltage: [[1, 1], [1.02, 1], [1.04, 1], [1.07, 1], [1.09, 1], [1.12, 1]], capacitance: [[1, 1], [1, 1.3], [1, 1.6], [1, 2], [1, 2.2], [1, 2.4]] },
  frz: { temp: [[1, 1], [1.1, 1], [1.2, 1], [1.3, 1], [1.4, 1], [1.5, 1]] /* wider again (owner, 2026-10-11: FRZ's reach back now its leash is screen-capped; was 1.08 .. 1.2) */ /* a narrower aura per tier (owner, 2026-10-08; was 1.25 .. 2.2) */, rime: [[1, 1], [1, 4 / 3, 1], [1, 5 / 3, 1], [1, 2], [1, 2.2], [1, 2.4]], moons: NO_MOVE }, // Rime buys back FRZ's halved slide (owner)
  sol: { focus: [[1, 1], [1.2, 1], [1.4, 1], [1.7, 1], [1.85, 1], [2, 1]], refraction: [[1, 1], [1.1, 1], [1.2, 1], [1.35, 1], [1.45, 1], [1.55, 1]], breach: [[1, 1], [1, 1.3], [1, 1.6], [1, 2], [1, 2.2], [1, 2.4]] },
  acd:    { spray: [[1, 1], [1.02, 1], [1.04, 1], [1.06, 1], [1.12, 1], [1.3, 1]] /* V: RANGE instead of a hotter carry (owner, 2026-10-12; was 1.15) */ /* Spray's lever now that each jet stays a full strike (owner, 2026-10-08; was 1.2 .. 2.3) */, contagion: [[1, 1], [1, 1.15], [1, 1.3], [1, 1.5], [1, 1.65], [1, 1.8]], corrosion: NO_MOVE },
};
function skillMove(t, s) {
  for (const [ax, tiers] of Object.entries(SKILL_MOVE[t.kind])) {
    const m = tiers[skillOf(t, ax)];
    s.range *= m[0]; s.slide *= m[1];
  }
}

// ARC's numbers by tier (index 0 = untaken). Balance later (owner: ideas first).
// Voltage's damage FITTED to +25% / +50% / +100% dealt (owner; arcfit.mjs, waves 6-20)
// Voltage refit 2026-10-06 (drifted 4-6% low after the Static / slow / FRZ changes)
// REFIT 2026-10-06 (overnight phase 2: standard team, waves 20-40, HP scaled so it is pressed - the earlier thin-field fits ran 3-12x over target)
// REWORKED 2026-10-07 (owner): a dud axis - team damage 142% with it at 0, 105% at
// III; raw damage on the strike was worth less than the other axes' points. Now it
// is what each JUMP keeps of the hit before it (ARC_FALL 0.5 at 0; III = every jump
// at full damage), on top of its damage step; the `pierce` flag it sets is only
// the white core drawn in its arcs (aspira-draw.js), never a rule
// ARC's HIT, SPREAD over its three axes (owner, 2026-10-15: "spread the damage across the upgrades, but keep it mainly in
// voltage" -> "spread out a bit more" - a build without Voltage hit for 24 whatever it bought): the old Voltage curve's log shared
// 50% Voltage, 25% each Conductivity and Capacitance (ARC_SIDE_DMG); a full ARC (Voltage VI, the others V) x53.5, was x69.9 on Voltage alone
const ARC_SIDE_DMG = [1, 1.38, 1.69, 1.99, 2.01, 2.04, 2.08]; // Conductivity's and Capacitance's share, by tier (its VI here)
const ARC_VOLTAGE_DMG = [1, 1.91, 2.86, 26.595, 28.445, 39.385] /* was 1 3.64 8.16 15.55 26.14 40.76 (Voltage alone) */ /* x (1 + 0.1 tier) for the armor pierce it lost (owner, 2026-10-13: "arc voltage should just increase damage instead of pierce"; was 3.31 6.8 11.96 18.67 27.17) */ /* x (1 + 0.6 tier) (2026-10-11, roles: TEAM countermx 81-89 - Voltage leaks 4% of armor, Conductivity 10, Capacitance 12; was 2.068 3.093 4.272 5.492 6.793) */, ARC_VOLTAGE_FALL = [0.5, 0.65, 0.8, 1, 1.1, 1.25]; // IV / V (2026-10-07): a jump carries MORE than the hit before it // its RANGE is in SKILL_MOVE
// Conductivity's shape by tier (owner): strikes (separate first targets),
// jumps, and forks per jump - 3, 7, 13, then two separate 13-hit attacks -
// and r, how much further each JUMP reaches (owner; Voltage owns the tower's range)
// d: a damage multiplier, FITTED so each tier deals +25% / +50% / +100% over
// the base (owner), like Voltage's (scripts/aspira-sim: arcfit)
let ARC_CONDUCTIVITY = [{ s: 1, j: 1, f: 2, r: 1, d: 1, v: 0 }, { s: 1, j: 2, f: 2, r: 1.2, d: 1, v: 0 }, { s: 1, j: 2, f: 3, r: 1.4, d: 1, v: 0 }, { s: 3, j: 3, f: 3, r: 1.6, d: 1.5, v: 1 }, { s: 3, j: 3, f: 4, r: 1.8, d: 1.8, v: 2 }, { s: 4, j: 3, f: 4, r: 2.4, d: 2.4, v: 3 }] /* IV / V strikes cut 3 / 4 -> 2 / 3 (owner, 2026-10-11: "nerf arc and boost others") */ /* IV / V: three and four arcs at III's depth and forking (owner, 2026-10-08) */; // IV chains twice, V three arcs (2026-10-07) // owner 2026-10-06: a tier never lowers the hit (d was 1 / .775 / .613 / .394); the tree and the jump reach pay for it
// v: how many times a bolt may RETURN to an enemy it already struck (owner, 2026-10-08): from III a jump may hit any
// enemy but the one it leaps from - III once more (2 hits an enemy), IV twice (3), V three times (4)
// Capacitance by tier (owner, 2026-10-07): the charge, x the hit that left it, and
// how many times the charged enemy ARCS when next hit (dischargeStatic). The
// charge shares are the old ring's fits (2026-10-06: +25 / +50 / +100%); refit later
// owner, 2026-10-08 (isolation: the weakest ARC axis, 136% team at V): more charge and more arcs (were 1..5 arcs at .22 .. .45)
// BURSTS, NOT ARCS (owner, 2026-10-08: "Capa is too much like Cond now - circle AoE instead of arcs; add multiple
// charges instead of arcing more ... hits add more and more charges as you level up"): an ARC hit leaves `n`
// charges, each worth `frac` of the hit; the next hit from anything sets them ALL off, each a BURST of radius
// ARC_BURST_R round the enemy hitting everything inside (each burst its own hit: armor bites each, each pops a shield)
const ARC_CAPACITANCE = [null, { n: 1, frac: 0.14 }, { n: 2, frac: 0.14 }, { n: 4, frac: 0.875 }, { n: 6, frac: 0.875 }, { n: 5, frac: 0.745 }]; // frac 0.1 -> 0.14 (2026-10-12, chartvalue 30-60: tier III read 96% of the 2/2/2 team and 3/0/3 92% - now 99% / 98%) // a burst hits all round it, so each charge is small: isolation I..V 110 119 150 167 184% (with the slows below)
const ARC_BURST_R = 70, ARC_BURST_A = 0.45;
// each jump hits ARC_FALL as hard and reaches ARC_SHRINK as far as the one before (owner)
const ARC_FALL = 0.5, ARC_SHRINK = 0.7;
// a jump's reach, before Conductivity lengthens it (owner: longer by default). It
// was 1.5 x the tower's range; the range was HALVED (owner, 2026-10-06: "not their
// effects nor reach"), so the jump keeps its old absolute size: 1.5 x the old 156
// range, and Voltage still lengthens it by the old x1.15 / 1.3 / 1.45
const ARC_JUMP_BASE = 234, ARC_VOLTAGE_JUMP = [1, 1.15, 1.3, 1.45, 1.6, 1.75];
// VOLTAGE PIERCES ARMOR (owner, 2026-10-11: "make upgrade choices matter" - Voltage was ARC's dead axis, worst on every
// type): its arcs ignore this share of armor - Voltage is ARC's armor answer, Conductivity the shields, Capacitance the fast
function arcSkillStats(t, s, b) {
  const c = skillOf(t, "conductivity"), v = skillOf(t, "voltage"), z = skillOf(t, "capacitance");
  s.dmg = b.dmg * ARC_VOLTAGE_DMG[v] * ARC_SIDE_DMG[c] * ARC_SIDE_DMG[z] * ARC_CONDUCTIVITY[c].d; s.range = b.range * RANGE_BONUS;
  const sh = ARC_CONDUCTIVITY[c]; // Conductivity: strikes, jumps AND forks
  s.arcRange = ARC_JUMP_BASE * ARC_VOLTAGE_JUMP[v] * sh.r; s.targets = sh.s; s.layers = sh.j; s.branch = sh.f; s.revisit = sh.v || 0;
  s.carry = VOLT_CARRY_N[v]; s.arcFall = ARC_VOLTAGE_FALL[v]; s.arcShrink = ARC_SHRINK; s.charge = ARC_CAPACITANCE[z]; s.statSlow = ARC_STAT_SLOW[z]; s.skill = true;
}
// what the upgrade cards offer: the next tier of each axis not yet full
function skillOptions(t) {
  return SKILL_TREES[t.kind].filter(ax => skillOf(t, ax.id) < axisCap(t, ax.id)).map(ax => { // (one capstone VI a tower - aspira-capstone.js)
    const n = skillOf(t, ax.id), tier = ax.tiers[n];
    return { choice: ax.id, name: ax.name + " " + roman(shownTier(nextStop(n))) + " · " + tier.name, desc: describeTower(t.kind, withSkill(t, ax.id)) };
  });
}
const withSkill = (t, id) => ({ ...t.skills, [id]: skillOf(t, id) + 1 });
// the sliders' BASKET (aspira-sliders.js): the price of the tower's NEXT n points, each
// at its own step of the ladder, and its chart with `add` (axis -> points) pulled on
const skillPointsCost = (t, n) => { if (freeBuild()) return 0; let c = 0; for (let i = 0; i < n; i++) c += Math.round(TOWERS[t.kind].cost * SKILL_STEP_COST[t.lvl - 1 + i]); return c; };
const withSkills = (t, add) => { const s = { ...t.skills }; for (const [id, n] of Object.entries(add)) if (n) s[id] = (s[id] || 0) + n; return s; };

// ---------- ARC's chart firing ----------
// A bolt is a TREE grown a generation per hop: the strike, then every hit
// forks st.branch ways, st.layers jumps deep. A bolt NEVER hits the same
// enemy twice (owner) - so it can never strike more enemies than are in
// reach - and each jump hits ARC_FALL as hard and reaches ARC_SHRINK as far.
// Capacitance (owner, 2026-10-07: "Hits charge the target, charged targets arc
// once when hit by anything"): an ARC hit leaves a CHARGE on the enemy it struck,
// worth st.charge.frac of the hit; charges STACK. The next hit on that enemy from
// ANY tower - the ARC that charged it too (owner: it procs itself) - makes it ARC
// (dischargeStatic: every charge bursts round it) before the
// new charge lands, and the charge is gone; so does its DEATH (owner).
function fireSkillChain(t, st, e, seen) {
  if (seen && seen.has(e.id)) return; // a second strike never re-hits what the first took
  const col = TOWERS[t.kind].color, d = shotDamage(t, st, e, st.dmg);
  beam(t, e, col, CHAIN_BEAM_LIFE, 1.5, d);
  const root = { e, fx: Object.assign(fx[fx.length - 1], { soft: true, alpha: ARC_A }), up: null, kids: new Set() };
  // Voltage SHOWS (owner): a white-hot core in every arc, and at tier III the
  // strike point throws sparks
  const v = skillOf(t, "voltage");
  if (v) root.fx.pierce = true;
  if (v >= SKILL_TIERS - 1) burst(e.x, e.y, "white", v > SKILL_TIERS - 1 ? 12 : 6); // V sparks, the capstone VI twice as many
  const c = { t, st, col, skill: true, seen: seen || new Set(), hits: new Map() }; // shared by the attack's strikes
  c.seen.add(e.id); c.hits.set(e.id, 1);
  skillHit(c, e, d);
  branchFrom(c, root, 1);
}
// VOLTAGE CARRIES (owner, 2026-10-18: "a kill passes its leftover damage on to the nearest enemy"): a Voltage hit that kills arcs
// what the kill did not need on to the nearest enemy within VOLT_CARRY_R x the jump reach, up to VOLT_CARRY_N hops by tier - its
// single-target hit had nothing to spend on a swarm (countermx N=1: Voltage 71% leaked, Conductivity 35)
const VOLT_CARRY_N = [0, 1, 2, 3, 4, 6, 8], VOLT_CARRY_R = 0.8;
function voltCarry(c, e, left) {
  const seen = new Set([e]);
  for (let k = 0; k < c.st.carry && left > 0; k++) {
    let o = null, bd = (c.st.arcRange * VOLT_CARRY_R) ** 2;
    for (const x of G.enemies) { if (x.dead || !x.seen || seen.has(x)) continue; const dd = (x.x - e.x) ** 2 + (x.y - e.y) ** 2; if (dd < bd) { bd = dd; o = x; } }
    if (!o) return;
    beam(e, o, TOWERS.arc.color, CHAIN_BEAM_LIFE, 1, left);
    const h = o.hp; fromHit(e, () => damage(o, left, c.t, false, false, c.st)); seen.add(o);
    if (!o.dead) return; left -= Math.max(0, h); e = o;
  }
}
function skillHit(c, e, d) {
  const hp0 = e.hp;
  damage(e, d, c.t, false, false, c.st); onHit(e, c.t, c.st, d); // (discharges e's own charges, if any)
  if (c.st.carry && e.dead && hp0 > 0 && d > hp0) voltCarry(c, e, d - hp0);
  const b = c.st.charge;
  if (!b || e.dead) return;
  const ch = e.charge || (e.charge = { list: [], t: c.t });
  for (let k = 0; k < b.n; k++) ch.list.push(d * b.frac); // n charges a hit (the hit itself set off any it had)
  ch.t = c.t; ch.slow = Math.max(ch.slow || 0, c.st.statSlow || 0);
}
let staticQuiet = false;
// Overload's leaps SLOW what they hit (owner, 2026-10-06, the no-FRZ niche search):
// 30% for STAT_SLOW_T s - a late team without FRZ can answer the fast waves
const ARC_STAT_SLOW = [0, 0.25, 0.3, 0.35, 0.4, 0.45] /* from tier I and deeper (2026-10-11, roles: Capacitance is ARC's FAST answer - leaks 0% of fast, Conductivity 4; was 0 0 0 .15 .17 .2) */, STAT_SLOW_T = 0.6; // from III (owner, 2026-10-08: kept at III, not moved to V)
// a DISCHARGE: every charge the enemy holds BURSTS round it (ARC_CAPACITANCE; 2026-10-08, was a chain of
// arcs - too much like Conductivity). Quiet: a burst neither charges nor sets off charges, so there is
// no chain reaction (staticQuiet).
// ARC's LOOK only (owner, 2026-10-08: "overwhelming at high levels" -> "less visible overall, the strike most of all;
// still tied to damage, but less"): the strike draws at ARC_A, a jump at ARC_A x (its share of the strike)^ARC_CORR -
// so under Voltage IV-V, where a jump carries MORE than the strike, the far jumps outshine the shot; widths follow the
// damage at ARC_W_CORR of the usual slope; Capacitance's leaps thin and faint; the glow narrower and dimmer (drawFx, f.soft)
const ARC_A = 0.4, ARC_CORR = 0.5, ARC_W_CORR = 0.5, ARC_LEAP_A = 0.6 * ARC_A, ARC_LEAP_W = 0.6, ARC_GLOW_A = 0.16, ARC_GLOW_W = 2; // A and GLOW_A x1.33 (owner, 2026-10-19: "make arc visual effect slightly more intense"; were 0.3 / 0.12)
// CAPACITANCE CHAINS from tier CAP_CHAIN_FROM (owner, 2026-10-18: "a charged enemy that dies discharges into its neighbours" - it did,
// but not when a discharge killed it: no chain reaction): a charged enemy a discharge kills joins capQueue and goes off after the
// burst that killed it, once each (its charge is spent as it goes)
const CAP_CHAIN_FROM = 1, capQueue = [], CAP_BURST_K = [1, 1.1, 1.2, 1.35, 1.5, 1.7, 2]; // CAP_BURST_K: the burst's reach by Capacitance tier
function dischargeStatic(e) {
  const outer = !staticQuiet;
  dischargeOne(e);
  if (outer) while (capQueue.length) { const q = capQueue.shift(); if (q.charge) dischargeOne(q); }
}
function dischargeOne(e) {
  const ch = e.charge;
  e.charge = null;
  staticQuiet = true;
  try {
    // every charge BURSTS round the enemy: everything within ARC_BURST_R (the enemy too) takes it, a ring per charge
    // ONE thin, faint ring for the whole discharge, no glow (owner, 2026-10-08: "reduce intensity, no glow"; was a glowing ring per charge)
    ring(e.x, e.y, ARC_BURST_R, TOWERS.arc.color, 0.18, false); const rf = fx[fx.length - 1]; if (rf && rf.k === "ring") Object.assign(rf, { a: ARC_BURST_A, w: 1.2 }); // (the simulator stubs ring out)
    ch.list.forEach(dmg => {
      for (const o of G.enemies) {
        if (o.dead || !o.seen || Math.hypot(o.x - e.x, o.y - e.y) > ARC_BURST_R * CAP_BURST_K[skillOf(ch.t, "capacitance")]) continue;
        fromHit(e, () => damage(o, dmg, ch.t, false, false, null)); // away from the discharging enemy
        if (ch.slow && !o.dead) applySlow(o, ch.slow, STAT_SLOW_T, ch.t.id + ":stat");
      }
    });
  } finally { staticQuiet = false; }
}
// the nearest enemy this bolt has not hit yet, within this jump's (shrunk) reach
// CHAINS TARGET LIKE THEIR TOWER (owner, 2026-10-07: "chains should use the same targeting
// algorithm as the parent"): of the enemies a jump can reach, the one the tower's own mode
// ranks first (MODE_KEY: Near = closest to the core, Biggest = most HP, Fresh = undebuffed
// first); ties go to the nearest. Used by ARC's jumps, Capacitance's leaps and SOL's refraction
function chainPick(t, from, r2, skip) {
  const key = MODE_KEY[t.mode] || MODE_KEY.close;
  let best = null, bk = Infinity, bd = Infinity;
  for (const o of G.enemies) {
    if (o.dead || !o.seen || skip(o)) continue;
    const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2;
    if (d > r2) continue;
    const k = key({ e: o, d });
    if (k < bk || (k === bk && d < bd)) { bk = k; bd = d; best = o; }
  }
  return best;
}
function skillHop(c, node, depth) {
  const r = c.st.arcRange * c.st.arcShrink ** (depth - 1);
  // never the enemy it leaps from; an enemy already struck only while its hits are under 1 + st.revisit (Conductivity III+)
  const max = 1 + (c.st.revisit || 0);
  return chainPick(c.t, node.e, r * r, o => o.id === node.e.id || (c.hits.get(o.id) || 0) >= max);
}
function skillHopTo(c, node, nxt, depth) {
  const raw = c.st.dmg * c.st.arcFall ** depth, d = shotDamage(c.t, c.st, nxt, raw);
  node.kids.add(nxt.id); c.seen.add(nxt.id); c.hits.set(nxt.id, (c.hits.get(nxt.id) || 0) + 1);
  beam(node.e, nxt, c.col, CHAIN_BEAM_LIFE, 1.5, d);
  Object.assign(fx[fx.length - 1], { soft: true, alpha: Math.min(1, ARC_A * (raw / c.st.dmg) ** ARC_CORR) }); // brighter as its share of the strike grows (ARC_A)
  if (skillOf(c.t, "voltage")) fx[fx.length - 1].pierce = true; // Voltage's white-hot core
  const child = { e: nxt, fx: fx[fx.length - 1], up: node, kids: new Set() };
  keepLit(node, CHAIN_BEAM_LIFE);
  fromHit(node.e, () => skillHit(c, nxt, d)); // its number flies on from the enemy the arc jumped from
  return child;
}

// (FRZ's chart - aura, Rime, moons - lives in aspira-frz.js)

// ---------- SOL's chart: Focus beams, Refract cone, Pierce Breaches ----------
// Breach stacks per hit (owner: "each beam permanently weakens the target's armor" - Breach is what strips it; the base SOL strips nothing)
// Refraction from the start (owner, 2026-10-08): one hop in a 40-degree cone at tier 0; every tier one more hop than before
// (were 0 / 2 / 5 / 9 / 12 / 15); V has NO limit - every enemy ahead in the cone, then on out of sight (solRefraction)
const SOL_SHIELD_POP = [1, 1, 1, 1, 1, 1] /* one charge a beam, however deep the Focus (owner, 2026-10-16: "SOL should only pop based on the number of beams"); was 1 2 3 4 5 6, */ /* more per Focus tier (owner, 2026-10-12: SOL's shield help; was 1 1 2 2 3 3) */, SOL_REFRACT_POP = [0, 0, 0, 0, 0, 0] /* a refracted ray pops nothing extra (owner, 2026-10-16); was 0 1 1 2 2 3 */ /* Refraction breaks shields too (owner, 2026-10-12) */; // 2026-10-11: a concentrated beam punches through more than one shield
const SOL_BEAMS = [2, 3, 3, 10, 12, 17] /* BATTERY 6.7.0 (2026-10-20): untaken 2 rays (a lone L1 SOL lost a life to every wave-3 armor pair - 72 u apart since 6.5), Focus III 10 (SOL countered armor alone: shields 84% leaked -> 24%); were [1, 2, 3, 4, 5, 17] */ /* V 6 -> 8, VI 8 -> 12 (a beam is the one shield charge it pops now: SOL_SHIELD_POP) */, SOL_REFRACTION = [1, 3, 6, 10, 13, Infinity];
// BREACH IS SOL'S OWN, from the start (owner, 2026-10-08): every hit strips SOL_BREACH_ARMOR armor for good
// (below zero too: a flat bonus on every later hit from every tower); the Breach axis massively
// increases the strip and adds crit chance for every tower, SOL_BREACH_CRIT a hit (none at base)
// BREACH STRIPS A FLAT AMOUNT, big from the start (owner, 2026-10-12: "SOL with any upgrades should be good vs armor", then
// "dont scale breach with enemy armor" - it was x the wave's armor for an hour): a bare SOL strips 80 a hit (was 3)
const SOL_BREACH_ARMOR = [80, 200, 350, 550, 1219, 2359] /* bigger tiers (owner, 2026-10-12: "increase breach effect to make it better" - the Breach build: armor 61-69 16% -> 12%, 81-89 9% -> 5%); was 80 120 160 210 270 330, before that 3 24 72 150 261 300 */ /* x1.5 for the crit chance it no longer gives (owner, 2026-10-12: "remove extra crit chance, just reduce armor more") */ /* doubled back (2026-10-12, trio sim: ARC+FRZ+SOL, the trio without ACD, leaked 57% of armor at 81-89 - 45% with this) */ /* halved, rounded down (2026-10-08; was 2 16 49 101 174 200) */, SOL_BREACH_CRIT = [0, 0, 0, 0, 0, 0]; // NO crit chance any more (owner, 2026-10-12; was 0 .01 .02 .03 .04 .05)
// a refraction lands within SOL_CONE degrees of the first shot's direction (at
// any distance); one Breach = BREACH_ARMOR armor off and BREACH_CRIT crit
// chance for every tower
// the cone's half-angle by Refraction tier (owner, 2026-10-08: it WIDENS with the tier and starts wider, since every hop
// must now travel forward - see solRefraction; was a flat 8, before that 25)
const SOL_CONE_BY = [3, 6, 6, 8, 8, 9] /* NARROW (owner, 2026-10-19: "SOL should not be good vs swarm whatsoever" - the cone is the lever) */ /* x2/3 (owner, 2026-10-13: "tighten the refraction angle"; was 12 36 36 48 48 48, VI 60) */ /* x0.6 (owner, 2026-10-12: "doesn't that make sol too good? ... narrow SOL" - SOL was the most-needed tower, random teams won 27%) - before that x0.75 once the cone started at the first enemy (owner, 2026-10-12: "reduce refraction angle now for all levels"; soldiag ARC+FRZ+SOL armor leaks 3-9% -> 11-19%, Refraction builds 4%; was 20 60 60 80 80 80) */, SOL_CONE = SOL_CONE_BY[0], BREACH_CRIT = 0.01; // (the pre-chart path's per-stack crit; the chart SOL uses SOL_BREACH_CRIT)
// SOL's own lever (owner: more crit): Breach also raises the crit MULTIPLIER, x3 at base
const SOL_CRITMUL = [3, 5, 6.5, 9, 14.6, 25]; /* x1.3 from I (2026-10-18: Breach's shrapnel no longer deals damage) */
// FITTED 2026-10-06 to +25 / +50 / +100% (on an HP-scaled field, so nothing
// saturates): each Focus beam's share of the shot by tier, and each Refract
// hop's damage by tier (a hop is far weaker than the first hit)
// (owner 2026-10-06: every Focus beam is a FULL hit - 1 / 2 / 3 / 4 beams, no share - so no stat falls; SOL's base damage pays for it)
const SOL_HOP = [1, 1, 1, 1, 1, 1]; // every refraction hop a full strike (overnight fit 2026-10-08: even 1.5x reached only 133% - Refraction needs a mechanic change, not numbers) // II / III raised 2026-10-07 (were 0.3 / 0.455) with the cone narrowed to 8 degrees: fewer hops land, so each counts more
// Refraction peaked at I (107%) and fell by III (93%): range alone spread its fire
// thin, so II / III also hit harder (owner, 2026-10-07)
// (LIGHT OUTRUNS THE FAST, Refraction x the fast, removed 2026-10-12 - owner: no extra damage by enemy type)
const SOL_REFRACTION_DMG = [1, 1, 1.3, 4.6, 13.0987, 24.1275]; // III..V x1.15 / 1.35 / 1.5 with the 160-degree cone (owner, 2026-10-08: "even a 160 deg angle?" - the cone alone tops out at 156%)
// each Focus tier's beam STRENGTH (2026-10-08, the tier fit's lever for Focus: more beams alone measured 168% at V)
const SOL_PIERCE = [0.35, 0.6, 0.7, 0.8, 0.9, 1]; /* by Breach STOP: 0 35%, I 60%, II 80%, III 100%, IV (the capstone) 125% (owner, 2026-10-19: "100% carry earlier / capstone goes above 100%"; 2 and 4 are never bought) */ // the overkill a kill carries on (solPierce, aspira-towers.js) by Breach tier; VI 1 (capstone)
const SOL_FOCUS_DMG = [1, 1, 1, 1, 4.556, 4.704]; // never below 1 (owner, 2026-10-08: no upgrade lowers a stat) - more beams carry I..III (114 / 133 / 152%)
function solSkillStats(t, s, b) {
  s.dmg = b.dmg * SOL_REFRACTION_DMG[skillOf(t, "refraction")] * SOL_FOCUS_DMG[skillOf(t, "focus")]; s.range = b.range * RANGE_BONUS; s.crit = LVL_SOL_CRIT[0]; s.rate = b.rate;
  s.shieldPop = SOL_SHIELD_POP[skillOf(t, "focus")] + SOL_REFRACT_POP[skillOf(t, "refraction")]; // FOCUS pierces shields: each beam pops this many (SOL's shield help, counter matrix)
  s.beams = SOL_BEAMS[skillOf(t, "focus")]; s.refraction = SOL_REFRACTION[skillOf(t, "refraction")]; s.cone = SOL_CONE_BY[skillOf(t, "refraction")]; s.hop = SOL_HOP[skillOf(t, "refraction")]; s.twinCone = skillOf(t, "refraction") >= 6; // VI: two opposite cones (solRefraction)
  const bk = skillOf(t, "breach");
  s.breach = 1; s.pierce = SOL_PIERCE[bk]; s.critMul = SOL_CRITMUL[bk]; s.bleedArmor = SOL_BREACH_ARMOR[bk]; s.bleedCrit = SOL_BREACH_CRIT[bk]; s.skill = true;
}
// from fireRay: bend on from the first enemy hit to st.refraction more, each the nearest not yet hit to the last one,
// inside ONE light cone, SOL_CONE degrees either side - no reach limit between hops, nor the tower's range.
// THE CONE STARTS AT THE FIRST ENEMY STRUCK (owner, 2026-10-12: "on first bounce of any refraction, pretend like the cone
// originated from that enemy and direct that cone towards the optimal angle to hit the most"): it points where it holds
// the most living enemies (up to the hops it has - solConeDir), and every hop runs FORWARD, further from that first enemy
// than the last hit and along the cone (it was the TOWER's cone along the shot, which a lattice coming head-on mostly
// left: 3-4 hops of 10-13, soldiag.mjs); SOL's targeting picks among what the cone holds (chainPick)
const angOff = (a, b) => Math.abs(((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
function solConeDir(t, st, e, half) {
  const others = G.enemies.filter(o => !o.dead && o.seen && o !== e), ang = others.map(o => Math.atan2(o.y - e.y, o.x - e.x));
  let dir = Math.atan2(e.y - t.y, e.x - t.x), best = 0; // nothing round it: on along the shot
  for (const a of ang) { let n = 0; for (const b of ang) if (angOff(a, b) <= half) n++; n = Math.min(n, st.refraction); if (n > best) { best = n; dir = a; } }
  return dir;
}
function solRefraction(t, st, e) {
  const half = (st.cone || SOL_CONE) * Math.PI / 180, dir = solConeDir(t, st, e, half), hit = new Set([e]), ex = e.x, ey = e.y;
  const fromE = o => Math.hypot(o.x - ex, o.y - ey);
  // EVERYTHING inside the cone off the first enemy is fair game (owner, 2026-10-12: "everything needs to fit in the cone off the
  // first enemy") - each hop only further OUT along it than the last, never a check on the hop's own heading
  const forward = (from, o) => fromE(o) > (from === e ? 0 : fromE(from));
  let far = Math.hypot(ex - t.x, ey - t.y);
  // one CONE's chain, pointing `a` off the first enemy; returns how far out it reached
  const chain = a => {
    const inCone = o => angOff(Math.atan2(o.y - ey, o.x - ex), a) <= half;
    let prev = e, from0 = t, farE = 0;
    for (let k = 0; k < st.refraction; k++) {
      const from = prev, nxt = chainPick(t, prev, Infinity, o => hit.has(o) || !inCone(o) || !forward(from, o)); // within the cone, forward, by SOL's targeting
      if (!nxt) { if (prev !== e) solOutOfSight(t, st, from0, prev); break; } // no one left in the cone: on out of sight (owner, 2026-10-08)
      from0 = prev;
      rayHit(t, st, nxt, st.dmg * (st.hop || 1), prev); hit.add(nxt); prev = nxt;
      far = Math.max(far, Math.hypot(nxt.x - t.x, nxt.y - t.y)); farE = Math.max(farE, fromE(nxt));
    }
    // the cone AGAIN from the first enemy struck, the way the hops really bend (owner, 2026-10-12: "show the cone again")
    if (farE > 0) fx.push({ k: "cone", x: ex, y: ey, a, half, len: farE + 30, color: TOWERS[t.kind].color, t: 0, life: SOL_CONE_LIFE });
  };
  chain(dir);
  // REFRACTION VI fires TWO cones off the first enemy, the chosen way and straight OPPOSITE (owner, 2026-10-12)
  if (st.twinCone) chain(dir + Math.PI);
  // the cone DRAWN from the tower along the shot, as before (owner, 2026-10-12: "draw the cone from the tower still anyway")
  fx.push({ k: "cone", x: t.x, y: t.y, a: Math.atan2(ey - t.y, ex - t.x), half, len: far + 30, color: TOWERS[t.kind].color, t: 0, life: SOL_CONE_LIFE });
}
// a shot that runs OUT OF TARGETS goes on from the last enemy struck, along its last leg, far past the screen's edge (owner, 2026-10-08)
const SOL_OUT_LEN = 3000;
// it FOLLOWS, like every other beam (owner, 2026-10-08: "should track dead enemies like arc to avoid jumps"):
// it starts on the struck enemy (dead or alive - a ghost keeps moving) and its far end is read live
// along a -> b, so the extension never detaches from the leg it continues
function solOutOfSight(t, st, a, b) {
  const far = { get x() { const dx = b.x - a.x, dy = b.y - a.y; return b.x + dx / (Math.hypot(dx, dy) || 1) * SOL_OUT_LEN; },
    get y() { const dx = b.x - a.x, dy = b.y - a.y; return b.y + dy / (Math.hypot(dx, dy) || 1) * SOL_OUT_LEN; } };
  beam(b, far, TOWERS[t.kind].color, RAY_BEAM_LIFE, 3, st.dmg, true);
}
const SOL_CONE_LIFE = 0.6; // game seconds (1x runs 2 game s a real s): long enough to see the cubic fade
// UI (drawFx): the Refract light cone, a faint wedge that fades FAST (owner):
// its opacity falls with the cube of the time left, and with DISTANCE from the
// tower - full at the source, gone by SOL_CONE_FADE of its length (owner)
const SOL_CONE_FADE = 0.8;
// TWICE AS LONG AND TWICE AS STRONG (owner, 2026-10-21: "double opacity and length of SOL cones (should still fade to 0 by the end)"):
// every cone drawn SOL_CONE_LEN_K x its length at SOL_CONE_A (was 0.5), still clear by SOL_CONE_FADE of the way out
const SOL_CONE_LEN_K = 2, SOL_CONE_A = 1;
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
// BREACH SHRAPNEL (owner, 2026-10-12: "when breached enemy dies, it should fire shrapnel around based on total armor breached"):
// a breached enemy's death - by any tower - bursts into up to SHRAP_N pieces at enemies within SHRAP_R, EACH a hit of SHRAP_MUL x
// the armor it had LOST (healthy armor0 minus its armor now - owner: "a multiple of the armour diff between healthy and current"),
// so each pops a shield charge and armor blunts it as ever; credited to the SOL that breached it. Breach had stopped paying past
// armor (its strip was overkill); this spends the overkill on whatever is near
const SHRAP_MUL = 1, SHRAP_N = 8, SHRAP_R = 90, SHRAP_BREACH = 1;
function breachShrapnel(e) {
  const t = e.breachBy && G.towers.includes(e.breachBy) ? e.breachBy : null;
  const near = G.enemies.filter(o => !o.dead && o.seen && o !== e && Math.hypot(o.x - e.x, o.y - e.y) <= SHRAP_R)
    .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).slice(0, SHRAP_N);
  const each = SHRAP_MUL * Math.max(0, (e.armor0 || 0) - (e.armor || 0));
  if (!near.length || !each) return;
  if (typeof burst === "function") burst(e.x, e.y, TOWERS.sol.color, 6 + near.length);
  for (const o of near) {
    beam(e, o, TOWERS.sol.color, RAY_BEAM_LIFE, 1, 0, true, false);
    // BREACH, not damage (owner, 2026-10-18: "breach shrapnel should cause more breach to nearby units, not deal damage"): each piece
    // strips SHRAP_BREACH x the armor the dead one had lost off its target, as a Breach hit does (spokes, shrapnel of its own)
    const k = each * SHRAP_BREACH; o.armor = (o.armor || 0) - k; if (t) stripBy(o, t, k); o.breachN = (o.breachN || 0) + 1; o.breached = (o.breached || 0) + k; o.breachBy = t || o.breachBy;
  }
}
