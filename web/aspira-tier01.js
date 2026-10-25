// /spire - TIER 0 AND TIER I, by hand (tier redesign, owner 2026-10-24: "level 0 is basic beam or circle, first level of each axis gives
// the first inkling of what the tower does"; spec docs/superpowers/specs/2026-10-24-tier-redesign-design.md, "Per tower: tier 0 and
// tier I"). aspira-capstone.js gave every per-tier table a tier I between tier 0 and today's I (tierMid); here each tower's tier 0
// becomes the plain attack and its tier I the axis's first hint. Loaded after aspira-curve.js (the simulator too, sim.mjs FILES),
// so every table already holds its six tiers 0..V.

// ARC: one beam, no chain (Conductivity 0: no jump); Conductivity I one jump. (Voltage I's fork: VOLT_FORK, aspira-skills.js)
ARC_CONDUCTIVITY[0] = { ...ARC_CONDUCTIVITY[0], j: 0 };
ARC_CONDUCTIVITY[1] = { ...ARC_CONDUCTIVITY[0], j: 1 };

// SOL: one beam that stops at its first enemy (SOL_PASS_N), no reflection, no burn, no armor strip; Focus I one beam passing one more,
// Reflection I one bounce (SOL_FAN_BY one chain), Breach I a short burn that pops a shield (its strip from II, today's I)
SOL_BEAMS[0] = 1; SOL_BEAMS[1] = 1; SOL_REFRACTION[0] = 0; SOL_REFRACTION[1] = 1; SOL_SCORCH[0] = 0; SOL_BREACH_ARMOR[0] = 0; SOL_BREACH_ARMOR[1] = 0;
