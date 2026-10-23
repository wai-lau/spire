// /spire - the CAPSTONES (once "giga capstones"; renamed 2026-10-14) (owner, 2026-10-11: "add a 6th level to each of the axes for each tower that is a giga
// version of the capstone", "you can only get 1/3 of the capstones"): every axis gains a capstone tier, a big leap
// over the tier before it, and a tower may take ONE axis to it - the other two stop a tier short (axisCap). Sixteen points
// (5 + 5 + 6, SKILL_POINTS; the ladder steps t.lvl counts). Every per-tier table is extended here, in one place, so no
// capstone lookup is ever undefined. Loaded after aspira-skills.js, aspira-acid.js, aspira-frz.js and aspira-desc.js (the simulator too).
// TIERS ARE PURCHASES (owner, 2026-10-23: "drop all the god damn levels between that can not be bought, stop listing them everywhere";
// 2026-10-19: "there are only 4 tiers now, tier 4 is the capstone"; 2026-10-15: "merge upgrades 2-3 and 4-5 in one for each axis ...
// merge the prices too"): an axis level IS the tier shown, 0 I II III IV (IV the capstone), every per-tier table holds exactly those
// five values. A buy is one tier; t.lvl stays the LADDER of price steps (SKILL_STEP_COST), so a buy from tier k takes TIER_STEPS[k]
// of them and costs exactly the steps it spans. (Before 2026-10-23 a table had seven slots, 0 1 2 3 4 5 6, and only 0 1 3 5 6 were ever
// bought: an old table's slot 3 is now tier II, 5 tier III, 6 tier IV; a save of that time is read through OLD_TIER, skillScaleFix.)
const CAPSTONE_TIER = SKILL_TIERS; // 4
// the most axis `id` of tower t may reach, with `add` (axis -> tiers) pulled on: one short of the capstone while another axis holds it
function capstoneHolder(t, id, add = {}) {
  return SKILL_TREES[t.kind].find(ax => ax.id !== id && skillOf(t, ax.id) + (add[ax.id] || 0) >= CAPSTONE_TIER) || null;
}
const axisCap = (t, id, add = {}) => (capstoneHolder(t, id, add) ? CAPSTONE_TIER - 1 : CAPSTONE_TIER);
// a CAPSTONE is TWO ladder steps (owner, 2026-10-12: "buying a capstone should cost the same as increasing the level by 2 (and also
// increase tower level by 2)"): it pays the next two ladder steps and raises t.lvl by 2 (upgradeTower, aspira-ui.js)
const CAPSTONE_LEVELS = 2;
// the ladder steps tier k -> k+1 takes: I one, II and III two each (the two merged tiers), the capstone CAPSTONE_LEVELS
const TIER_STEPS = [1, 2, 2, CAPSTONE_LEVELS];
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
const SKILL_SCALE = 2, OLD_TIER = [0, 1, 1, 2, 2, 3, 4];
function skillScaleFix(g) {
  if (g.skillScale === SKILL_SCALE) return g;
  for (const t of g.towers || []) if (t.skills) for (const id of Object.keys(t.skills)) t.skills[id] = OLD_TIER[t.skills[id]] ?? 0;
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
  [ARC_VOLTAGE_DMG, 51.6 /* the spread hit (aspira-skills.js ARC_SIDE_DMG; was 69.9) */], [ARC_VOLTAGE_FALL, 1.6], [ARC_VOLTAGE_JUMP, 2], [ARC_STAT_SLOW, 0.55],
  [ARC_CONDUCTIVITY, { s: 6 /* was 6 - the ARC nerf, 2026-10-11; trimmed and restored with the axis balance, 2026-10-18 */, j: 4, f: 4, r: 3, d: 3.5, v: 4 }], [ARC_CAPACITANCE, { n: 6, frac: 1.0625 /* was 0.15, kept above V when V went to 0.14 (2026-10-12) */ }],
  // FRZ: Temp a far deeper chill; Rime the fastest, deepest rings; Moons three moons with three moonlets each, burning far harder (capped 2026-10-20)
  [FRZ_TEMP_SLOW, 0.67], [FRZ_TEMP_TICK, 0.0495], [FRZ_BRITTLE, 9.0185], [FRZ_RIME, 0.9], [FRZ_RIME_BITE, 300], [FRZ_RIME_PERIOD, 0.1925] /* both halved 2026-10-14; were 0.3, 0.7 */, [FRZ_RIME_CRACK, 1.2],
  [FRZ_MOON_COUNT, 3], [FRZ_MOON_BY, 1.625], [FRZ_SUBMOON_N, 3], [FRZ_MOON_HIT, 2.75] /* (owner, 2026-10-20: max 3 and 3; were 5 and 6) */,
  // SOL: Focus eight rays; Refraction a wider cone, harder hops; Breach armor stripped for good, far bigger crits
  [SOL_BEAMS, 25], [SOL_PASS, 1], [SOL_SHIELD_POP, 1], [SOL_REFRACTION, 6] /* IV: six chains of six (SOL rework, s.fan; three until 2026-10-23) */, [SOL_REFRACTION_DMG, 1.6],
  [SOL_CONE_BY, 12], [SOL_HOP, 0.5], [SOL_CRITMUL, 33], [SOL_BREACH_ARMOR, 3216], [SOL_SCORCH, 1.7], [SOL_REFRACT_POP, 0], [SOL_BREACH_CRIT, 0],
  // ACD: Corrosion the strongest acid; Flow eleven jets landing far hotter, slowing hard; Contagion MASSIVE, long pools
  [ACD_CORROSION_DMG, 26.98], [ACD_CORRODE, 0.9], [ACD_DRIP_PULL, 150], [ACD_LINES, 11], [ACD_FLOW_CARRY, 0.9], [ACD_FLOW_SLOW, 0.2], [ACD_SPRAY_MUL, 26.98],
  [ACD_CONTAGION, { every: 0.9, life: 5, r: 165 }], [ACD_PUDDLE_HEAT, 34.17],
  // GRV: Void the widest, coldest aura (Event Horizon: a full sphere nearly stops what it holds); Supernova the biggest nova
  // (Hypernova: it tears half the armor away, spheres start heavy); Radiation the most pellets (Hawking: a last burst)
  // CRR: Hangar seventeen interceptors; Tether the strongest beam (Chain: it runs on to one more enemy); Armament the hardest, fastest, longest sorties (Autopilot)
  [CRR_HANGAR, 17], [CRR_FOCUS, 0.7], [CRR_TETHER_SLOW, 0.75], [CRR_TETHER_K, 351], [CRR_AMMO, 16], [CRR_SHOT_MUL, 1446.7], [CRR_SIDE_DMG, 55.944], [CRR_RATE_MUL, 1],
  [GRV_AURA_R, 279.5], [GRV_STRIP_MUL, 138.3], [GRV_RATE_MUL, 8.525], [GRV_INNER_T, 320], [GRV_SLOW, 0.616], [GRV_NOVA_R, 230], [GRV_NOVA_MUL, 36], [GRV_PELLETS, 9], [GRV_PELLET_K, 236],
  // IFR (axes redone 2026-10-20): Meteor a fan of 12 that fissures (Impact); Hellfire a fire six towers across; Flare the biggest, hottest, longest flares, three a landing
  [IFR_CHARGE_S, 0.6], [IFR_BALL_V, 540], [IFR_ROUTE_K, 800], [IFR_FAN, 9], [IFR_BALL_RAD, 5.4], [IFR_FIRE_R, 180], [IFR_FIRE_V, 660], [IFR_FIRE_DENS, 7.9], [IFR_FIRE_HK, 10], [IFR_HF_FK, 1.6], [IFR_BEAM_L, 100], [IFR_BEAM_W, 16], [IFR_BURN_S, 10], [IFR_TICK_S, 0.2], [IFR_TICK_K, 2.5],
];
for (const [table, v] of CAPSTONE_NUM) if (table.length === CAPSTONE_TIER) table.push(v);
// the reach a capstone tier buys ([range, slide], SKILL_MOVE): ARC stays near today's cut (owner, 2026-10-11)
const CAPSTONE_MOVE = {
  arc: { conductivity: [1.15, 1], voltage: [1.15, 1], capacitance: [1, 3] },
  frz: { temp: [1.7, 1], rime: [1, 3], moons: [1, 1] },
  sol: { focus: [2.3, 1], refraction: [1.7, 1], breach: [1, 3] },
  acd: { corrosion: [1, 1], spray: [1.5, 1] /* IV: range, not a hotter carry (owner, 2026-10-12; was 1.25) */, contagion: [1, 2.1] },
  car: { hangar: [1, 1], launch: [1, 1], armament: [1, 1] },
  grv: { void: [1.15, 1], supernova: [1.25, 1], radiation: [1, 2.2] },
  ifr: { meteor: [1.3, 1], hellfire: [1, 1], firaga: [1, 1.8] }, /* (owner, 2026-10-20: smaller; were 1.6 / 1.4 / 3) */
};
for (const [kind, axes] of Object.entries(CAPSTONE_MOVE)) {
  for (const [id, m] of Object.entries(axes)) {
    const tiers = SKILL_MOVE[kind][id];
    SKILL_MOVE[kind][id] = tiers.length === CAPSTONE_TIER ? [...tiers, m] : tiers; // a copy: NO_MOVE is shared between axes
  }
}

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
  void: { name: "Event Horizon" },
  supernova: { name: "Hypernova" },
  radiation: { name: "Hawking" },
  hangar: { name: "Full Wing" },
  launch: { name: "Anchor" } /* (owner, 2026-10-17: "have Anchor as the final level") - its beam chains on to one more enemy */,
  armament: { name: "Autopilot" },
  meteor: { name: "Impact" },
  hellfire: { name: "Hellfire" },
  firaga: { name: "Mega Firaga" } /* (owner, 2026-10-20; was Backdraft) */,
};
for (const axes of Object.values(SKILL_TREES)) for (const ax of axes) if (ax.tiers.length === CAPSTONE_TIER - 1 && CAPSTONE_TIERS[ax.id]) ax.tiers.push(CAPSTONE_TIERS[ax.id]);
