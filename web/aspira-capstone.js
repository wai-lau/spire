// /spire - the CAPSTONES (once "giga capstones"; renamed 2026-10-14) (owner, 2026-10-11: "add a 6th level to each of the axes for each tower that is a giga
// version of the capstone", "you can only get 1/3 of the capstones"): every axis gains a capstone tier, a big leap
// over the tier before it, and a tower may take ONE axis to it - the other two stop a tier short (axisCap). Thirteen purchases
// (5 + 4 + 4, SKILL_POINTS, tier redesign 2026-10-24; was sixteen points). Every per-tier table is extended here, in one place, so no
// capstone lookup is ever undefined. Loaded after aspira-skills.js, aspira-acid.js, aspira-frz.js and aspira-desc.js (the simulator too).
// TIERS ARE PURCHASES (owner, 2026-10-23: "drop all the god damn levels between that can not be bought, stop listing them everywhere";
// 2026-10-19: "there are only 4 tiers now, tier 4 is the capstone"; 2026-10-15: "merge upgrades 2-3 and 4-5 in one for each axis ...
// merge the prices too"): an axis level IS the tier shown, 0 I II III IV V (V the capstone since the tier redesign, 2026-10-24), every
// per-tier table holds exactly those six values. A buy is one tier; t.lvl stays the LADDER of price steps (SKILL_STEP_COST), so a buy from tier k takes TIER_STEPS[k]
// of them and costs exactly the steps it spans. (Before 2026-10-23 a table had seven slots, 0 1 2 3 4 5 6, and only 0 1 3 5 6 were ever
// bought: an old table's slot 3 is now tier II, 5 tier III, 6 tier IV; a save of that time is read through OLD_TIER, skillScaleFix.)
const CAPSTONE_TIER = SKILL_TIERS; // 5 (V; was IV until the tier redesign, 2026-10-24)
// every per-tier table is WRITTEN 0..III (today's tiers, 4 slots; tier names I..III): the capstone is pushed here and tier I inserted below
const WRITTEN_TIERS = 4;
// the most axis `id` of tower t may reach, with `add` (axis -> tiers) pulled on: one short of the capstone while another axis holds it
function capstoneHolder(t, id, add = {}) {
  return SKILL_TREES[t.kind].find(ax => ax.id !== id && skillOf(t, ax.id) + (add[ax.id] || 0) >= CAPSTONE_TIER) || null;
}
const axisCap = (t, id, add = {}) => (capstoneHolder(t, id, add) ? CAPSTONE_TIER - 1 : CAPSTONE_TIER);
// a CAPSTONE is TWO ladder steps (owner, 2026-10-12: "buying a capstone should cost the same as increasing the level by 2 (and also
// increase tower level by 2)"): it pays the next two ladder steps and raises t.lvl by 2 (upgradeTower, aspira-ui.js)
const CAPSTONE_LEVELS = 1; // ONE step, like every tier (tier redesign 2026-10-24: one purchase = one tier, the capstone included; was 2)
// the ladder steps tier k -> k+1 takes: I one, II and III two each (the two merged tiers), the capstone CAPSTONE_LEVELS
const TIER_STEPS = [1, 1, 1, 1, CAPSTONE_LEVELS]; // every tier one step (2026-10-24; was 1 2 2 2)
const stepsFor = (from, to) => TIER_STEPS.slice(from, to).reduce((a, b) => a + b, 0);
const tierSteps = (t, id) => TIER_STEPS[skillOf(t, id)]; // the steps one buy on axis `id` of t takes
// the purchases a tower has made (its card title's level): the sum over its axes, with `add` pulled on
const shownLevel = (t, add = {}) => SKILL_TREES[t.kind].reduce((a, ax) => a + skillOf(t, ax.id) + (add[ax.id] || 0), 0);
// the cheapest REAL purchase (owner, 2026-10-15: "upgrade tiles should stop flashing when you can no longer afford something"):
// a chart tower's next buy goes to an axis's next tier (TIER_STEPS ladder steps), not one step
function nextBuy(t) {
  if (t.lvl >= maxLvl(t)) return null;
  if (!hasSkills(t)) return { cost: upCost(t), t: { ...t, lvl: t.lvl + 1 } };
  let best = null;
  for (const ax of SKILL_TREES[t.kind]) {
    if (skillOf(t, ax.id) >= axisCap(t, ax.id)) continue;
    const n = tierSteps(t, ax.id), cost = n > 1 ? skillPointsCost(t, n) : upCost(t);
    if (!best || cost < best.cost) best = { cost, t: { ...t, lvl: t.lvl + n, skills: { ...t.skills, [ax.id]: skillOf(t, ax.id) + 1 } } };
  }
  return best;
}
// the ladder steps `add` (axis -> tiers) buys
const levelsFor = (t, add) => SKILL_TREES[t.kind].reduce((a, ax) => a + stepsFor(skillOf(t, ax.id), skillOf(t, ax.id) + (add[ax.id] || 0)), 0);
// OLD SAVES (owner, 2026-10-23): a run saved before the tiers became purchases holds axis levels 0..6 (old 2 / 4 read I / II); one saved now
// is stamped g.skillScale = SKILL_SCALE (aspira-autosave.js), so a save is never read twice. g.towers[].skills is all there is to fix
// ...and a 6.15 save (skillScale 2, tiers 0..IV) reads every bought tier ONE UP, tier I taken on its way (tier redesign 2026-10-24); an
// older one goes through OLD_TIER first
const SKILL_SCALE = 3, OLD_TIER = [0, 1, 1, 2, 2, 3, 4], tierUp = k => (k ? k + 1 : 0);
function skillScaleFix(g) {
  if (g.skillScale === SKILL_SCALE) return g;
  const fix = g.skillScale === 2 ? tierUp : k => tierUp(OLD_TIER[k] ?? 0);
  for (const t of g.towers || []) if (t.skills) { for (const id of Object.keys(t.skills)) t.skills[id] = fix(t.skills[id]); if (t.lvl != null) t.lvl = 1 + Object.values(t.skills).reduce((a, b) => a + b, 0); } // t.lvl: the new ladder's step, a purchase each
  g.skillScale = SKILL_SCALE;
  return g;
}

// ---------- the numbers: the capstone tier of every tier table (a leap, not a step) ----------
// AXIS BALANCE, every tower (owner, 2026-10-18: "do axis balance for all towers"): the top tiers of the weak axes x, the strong
// trimmed (countermx N=1, 41-109, mean % leaked before -> after): ARC_VOLTAGE_DMG x5 (90 -> 71), ARC_CAPACITANCE frac x5 (91 -> 76),
// FRZ_RIME_BITE x5 (70 -> 58), FRZ_MOON_BY x1.25 (57 -> 37), FRZ_BRITTLE III-IV x0.85 (Temp 31 -> 34), SOL_REFRACTION_DMG x2.5
// (76 -> 60), ACD_PUDDLE_HEAT x3 (61 -> 51), CRR_TETHER_K x9 (90 -> 60), CRR_SIDE_DMG x1.4 (57 -> 49), CRR_SHOT_MUL III-IV x0.85
// (Armament 38). SOL Breach (81) and ARC's single-target axes stay behind: count-limited, a mechanic question, not a number
const CAPSTONE_NUM = [
  // ARC: Conductivity six arcs chaining twice; Voltage each jump carries twice the hit; Capacitance eight charges
  [ARC_VOLTAGE_FALL, 2.56 /* x1.6 with its table (2026-10-25); was 1.6 */], [ARC_VOLTAGE_JUMP, 2], [ARC_STAT_SLOW, 0.55],
  [ARC_CONDUCTIVITY, { s: 4 /* was 6 (owner, 2026-10-24: hit counts grow slower; the share went to d and q) */, j: 4, f: 2 /* was 4 */, r: 2.1 /* was 3 */, q: 1.225, v: 4 }], [ARC_CAPACITANCE, { n: 6, frac: 0.2656 /* x0.25 (axis balance 2026-10-25: Capacitance focus leaked 0%; was 1.0625) */ /* was 0.15, kept above V when V went to 0.14 (2026-10-12) */ }],
  // FRZ: Temp a far deeper chill; Rime the fastest, deepest rings; Moons three moons with three moonlets each, burning far harder (capped 2026-10-20)
  /* (FRZ_TEMP_SLOW, _TICK, BRITTLE, RIME, RIME_PERIOD: written 0..V in aspira-frz.js since 2026-10-26) */ [FRZ_RIME_CRACK, 2.4 /* x2 with its table (2026-10-25) */],

  // SOL: Focus eight rays; Refraction a wider cone, harder hops; Breach armor stripped for good, far bigger crits
  [SOL_SHIELD_POP, 1],
  
  // ACD: Corrosion the strongest acid; Flow eleven jets landing far hotter, slowing hard; Contagion MASSIVE, long pools
  [ACD_CORRODE, 0.9], [ACD_DRIP_PULL, 150], [ACD_LINES, 11], [ACD_FLOW_CARRY, 0.9],
  [ACD_CONTAGION, { every: 0.9, life: 5, r: 165 }],
  // GRV (rework 2026-10-25): Void the biggest void (Singularity: twice the start mass, four times the cap); Nova the fastest novas, stripping the most (Hypernova);
  // Acceleration the widest, coldest aura (Event Horizon: the whole aura slows as hard as its inner tier)
  // CRR: Hangar seventeen interceptors; Tether the strongest beam (Chain: it runs on to one more enemy); Armament the hardest, fastest, longest sorties (Autopilot)
  [CRR_HANGAR, 17], [CRR_FOCUS, 0.7], [CRR_TETHER_SLOW, 0.75], [CRR_AMMO, 24 /* x1.5 with its table (2026-10-24 marks target); was 16, under IV - smoke "a capstone value never runs against its table" */],
  [GRV_AURA_R, 279.5], [GRV_SLOW, 1.2012 /* x1.3 x1.5 with its table (2026-10-24); was 0.616, under IV */], [GRV_NOVA_R, 230], /* (GRV_PELLETS gone with the GRV rework, 2026-10-25: its new tables are written 0..V in aspira-grv.js) */
  // IFR (axes redone 2026-10-20): Meteor a fan of 12 that fissures (Impact); Hellfire a fire six towers across; Flare the biggest, hottest, longest flares, three a landing
  [IFR_BALL_V, 540], [IFR_FAN, 9], [IFR_BALL_RAD, 5.4], [IFR_FIRE_R, 180], [IFR_FIRE_V, 660], [IFR_FIRE_DENS, 7.9], [IFR_BEAM_L, 100], [IFR_BEAM_W, 16], [IFR_BURN_S, 10], [IFR_TICK_S, 0.4 /* x2 (2026-10-24; was 0.2) */],
];
for (const [table, v] of CAPSTONE_NUM) if (table.length === WRITTEN_TIERS) table.push(v);

// ---------- the words: each axis's capstone tier, and the composers' (aspira-desc.js) ----------
const CAPSTONE_TIERS = {
  conductivity: { name: "Hyperstorm" },
  voltage: { name: "Gigavolt" },
  capacitance: { name: "Superstorm" },
  temp: { name: "Zero Point" },
  rime: { name: "Ice Age" },
  moons: { name: "Constellation" },
  focus: { name: "Solar Flare" },
  refraction: { name: "Corona" },
  breach: { name: "Starfire" },
  corrosion: { name: "Oblivion" },
  spray: { name: "Monsoon" },
  contagion: { name: "Extinction" },
  void: { name: "Singularity" } /* the capstones follow their parts (GRV rework 2026-10-25): Void V a heavier void */,
  supernova: { name: "Hypernova" },
  radiation: { name: "Event Horizon" },
  hangar: { name: "Full Wing" },
  launch: { name: "Anchor" } /* (owner, 2026-10-17: "have Anchor as the final level") - its beam chains on to one more enemy */,
  armament: { name: "Autopilot" },
  meteor: { name: "Impact" },
  hellfire: { name: "Hellfire" },
  firaga: { name: "Mega Firaga" } /* (owner, 2026-10-20; was Backdraft) */,
};
for (const axes of Object.values(SKILL_TREES)) for (const ax of axes) if (ax.tiers.length === WRITTEN_TIERS - 1 && CAPSTONE_TIERS[ax.id]) ax.tiers.push(CAPSTONE_TIERS[ax.id]);
// TIER I (tier redesign, owner 2026-10-24: "a new level 0 and a new level 1 (bumping everything else up)"): every per-tier table gets a
// tier I between tier 0 and today's tier I (now II) - a PLACEHOLDER the redesign's tower work replaces with each axis's first hint.
// tierMid: whole counts stay whole, multipliers grow evenly (the root of their product), objects field by field; never past either side
const zeroLike = v => typeof v === "number" ? 0 : Array.isArray(v) ? v.map(zeroLike) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).map(k => [k, zeroLike(v[k])])) : v;
function tierMid(a, b) {
  if (a == null && b != null) return tierMid(zeroLike(b), b); // (an untaken tier written null: half of tier II's)
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isInteger(a) && Number.isInteger(b)) return Math.round((a + b) / 2);
    const m = Number((a > 0 && b > 0 ? Math.sqrt(a * b) : (a + b) / 2).toPrecision(3)); // (3 figures: the card shows some of these)
    return Math.min(Math.max(a, b), Math.max(Math.min(a, b), m));
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => tierMid(v, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") return Object.fromEntries(Object.keys(a).map(k => [k, k in b ? tierMid(a[k], b[k]) : a[k]]));
  return a;
}
const withTierI = T => [T[0], tierMid(T[0], T[1]), ...T.slice(1)]; // (a new array: a table may be shared)
for (const entry of CAPSTONE_NUM) if (Array.isArray(entry[0]) && entry[0].length === CAPSTONE_TIER) entry[0].splice(0, entry[0].length, ...withTierI(entry[0]));
// ...and the tables WRITTEN with their capstone in (not in CAPSTONE_NUM): the same tier I
const FULL_TIER_TABLES = [VOLT_CARRY_N, CAP_BURST_K, CRR_HOLD_FRAC];
for (const T of FULL_TIER_TABLES) if (T.length === CAPSTONE_TIER) T.splice(0, T.length, ...withTierI(T));
// TIER I NAMES (tier redesign 2026-10-24; Claude's calls, the design doc lists them for the owner): each axis's first hint, put in front of
// its written tiers here, after the capstone's name is pushed (that push keys on the written count, so the trees cannot hold them)
const TIER_I_NAMES = { conductivity: "Lead", voltage: "Fork", capacitance: "Charge", focus: "Singe", refraction: "Glint", breach: "Crack",
  hangar: "Escort", launch: "Line", armament: "Twin", temp: "Nip", rime: "Rime", moons: "Crescent", corrosion: "Pit", spray: "Drip", contagion: "Seep",
  void: "Sink", supernova: "Halo", radiation: "Ember", meteor: "Split", hellfire: "Cinder", firaga: "Flicker" };
for (const axes of Object.values(SKILL_TREES)) for (const ax of axes) if (ax.tiers.length === CAPSTONE_TIER - 1) ax.tiers.unshift({ name: TIER_I_NAMES[ax.id] || "?" });
