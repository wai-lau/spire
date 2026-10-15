// /spire - the CAPSTONES, tier VI (once "giga capstones"; renamed 2026-10-14) (owner, 2026-10-11: "add a 6th level to each of the axes for each tower that is a giga
// version of the capstone", "you can only get 1/3 of the capstones"): every axis gains tier VI, a big leap
// over its capstone V, and a tower may take ONE axis to VI - the other two stop at V (axisCap). Sixteen points
// (5 + 5 + 6, SKILL_POINTS). Every per-tier table is extended here, in one place, so no index-6 lookup is ever
// undefined. Loaded after aspira-skills.js, aspira-acid.js, aspira-frz.js and aspira-desc.js (the simulator too).
const CAPSTONE_TIER = SKILL_TIERS; // 6
// the most axis `id` of tower t may reach, with `add` (axis -> points) pulled on: V while another axis is at VI
function capstoneHolder(t, id, add = {}) {
  return SKILL_TREES[t.kind].find(ax => ax.id !== id && skillOf(t, ax.id) + (add[ax.id] || 0) >= CAPSTONE_TIER) || null;
}
const axisCap = (t, id, add = {}) => (capstoneHolder(t, id, add) ? CAPSTONE_TIER - 1 : CAPSTONE_TIER);
// MERGED TIERS (owner, 2026-10-15: "merge upgrades 2-3 and 4-5 in one for each axis ... merge the prices too"): an axis rests
// only on these tiers - a buy from I lands on III, from III on V, each priced as the two steps it is (a tier is a level)
const SKILL_STOPS = [0, 1, 3, 5, CAPSTONE_TIER];
const nextStop = k => SKILL_STOPS.find(s => s > k) ?? k;
const prevStop = k => SKILL_STOPS.filter(s => s < k).pop() ?? 0;
// the levels one buy on axis `id` of t makes: to the next stop, and the capstone's extra level
const stopLevels = (t, id) => { const k = skillOf(t, id), to = nextStop(k); return to - k + (to >= CAPSTONE_TIER && k < CAPSTONE_TIER ? CAPSTONE_LEVELS - 1 : 0); };
// a CAPSTONE is TWO levels (owner, 2026-10-12: "buying a capstone should cost the same as increasing the level by 2 (and also
// increase tower level by 2)"): it pays the next two ladder steps and raises t.lvl by 2 (upgradeTower, aspira-ui.js)
const CAPSTONE_LEVELS = 2;
// the levels `add` (axis -> points) buys: its points, plus one when it takes an axis to the capstone
const levelsFor = (t, add) => Object.values(add).reduce((a, b) => a + b, 0) +
  (SKILL_TREES[t.kind].some(ax => skillOf(t, ax.id) < CAPSTONE_TIER && skillOf(t, ax.id) + (add[ax.id] || 0) >= CAPSTONE_TIER) ? CAPSTONE_LEVELS - 1 : 0);

// ---------- the numbers: index 6 of every tier table (a leap, not a step) ----------
const CAPSTONE_NUM = [
  // ARC: Conductivity six arcs chaining twice; Voltage each jump carries twice the hit; Capacitance eight charges
  [ARC_VOLTAGE_DMG, 69.9], [ARC_VOLTAGE_FALL, 1.6], [ARC_VOLTAGE_JUMP, 2], [ARC_STAT_SLOW, 0.55],
  [ARC_CONDUCTIVITY, { s: 4 /* was 6 - the ARC nerf, 2026-10-11 */, j: 3, f: 3, r: 2.4, d: 1, v: 4 }], [ARC_CAPACITANCE, { n: 8, frac: 0.2 /* was 0.15, kept above V when V went to 0.14 (2026-10-12) */ }],
  // FRZ: Temp a far deeper chill; Rime the fastest, deepest rings; Moons FOUR moons, each with four small moons
  [FRZ_TEMP_SLOW, 0.55], [FRZ_TEMP_TICK, 0.2], [FRZ_BRITTLE, 2], [FRZ_RIME, 0.15], [FRZ_RIME_PERIOD, 0.35] /* both halved 2026-10-14; were 0.3, 0.7 */, [FRZ_RIME_CRACK, 1.2],
  [FRZ_MOON_COUNT, 4], [FRZ_MOON_BY, 1], [FRZ_SUBMOON_N, 4],
  // SOL: Focus eight rays; Refraction a wider cone, harder hops; Breach armor stripped for good, far bigger crits
  [SOL_BEAMS, 8], [SOL_FOCUS_DMG, 1.3], [SOL_SHIELD_POP, 8], [SOL_REFRACTION, Infinity], [SOL_REFRACTION_DMG, 4],
  [SOL_CONE_BY, 40], [SOL_HOP, 1], [SOL_CRITMUL, 12], [SOL_BREACH_ARMOR, 1500], [SOL_REFRACT_POP, 4], [SOL_BREACH_CRIT, 0],
  // ACD: Corrosion the strongest acid; Flow eleven jets landing far hotter, slowing hard; Contagion MASSIVE, long pools
  [ACD_CORROSION_DMG, 1], [ACD_CORRODE, 0.9], [ACD_DRIP_PULL, 150], [ACD_LINES, 11], [ACD_FLOW_CARRY, 0.9], [ACD_FLOW_SLOW, 0.2], [ACD_SPRAY_MUL, 1],
  [ACD_CONTAGION, { every: 1, life: 40, r: 150 }], [ACD_PUDDLE_HEAT, 0.2],
];
for (const [table, v] of CAPSTONE_NUM) if (table.length === CAPSTONE_TIER) table.push(v);
// the reach a capstone tier buys ([range, slide], SKILL_MOVE): ARC stays near today's cut (owner, 2026-10-11)
const CAPSTONE_MOVE = {
  arc: { conductivity: [1.15, 1], voltage: [1.15, 1], capacitance: [1, 3] },
  frz: { temp: [1.7, 1], rime: [1, 3], moons: [1, 1] },
  sol: { focus: [2.3, 1], refraction: [1.7, 1], breach: [1, 3] },
  acd: { corrosion: [1, 1], spray: [1.5, 1] /* VI: range, not a hotter carry (owner, 2026-10-12; was 1.25) */, contagion: [1, 2.1] },
};
for (const [kind, axes] of Object.entries(CAPSTONE_MOVE)) {
  for (const [id, m] of Object.entries(axes)) {
    const tiers = SKILL_MOVE[kind][id];
    SKILL_MOVE[kind][id] = tiers.length === CAPSTONE_TIER ? [...tiers, m] : tiers; // a copy: NO_MOVE is shared between axes
  }
}

// ---------- the words: each axis's tier VI, and the composers' (aspira-desc.js) index 6 ----------
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
};
for (const axes of Object.values(SKILL_TREES)) for (const ax of axes) if (ax.tiers.length === CAPSTONE_TIER - 1 && CAPSTONE_TIERS[ax.id]) ax.tiers.push(CAPSTONE_TIERS[ax.id]);
ARC_KEEP.push("over one and a half times") /* ARC_VOLTAGE_FALL VI 1.6 (read "twice" - 2026-10-14) */; ARC_RETURN.push("four times");
ARC_CHARGES.push("six charges", "seven charges", "eight charges"); // indexed by the charge COUNT (ARC_CAPACITANCE[z].n)
FRZ_MOONS.push(" Four moons copy it, each with four moonlets.");
SOL_RAYS.push("Eight rays");
SOL_REFRACT.push("refracting through every enemy in two opposite cones");
ACD_JETS.push("Eleven");
