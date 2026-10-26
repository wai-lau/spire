// /spire - TIER 0 AND TIER I, by hand (tier redesign, owner 2026-10-24: "level 0 is basic beam or circle, first level of each axis gives
// the first inkling of what the tower does"; spec docs/superpowers/specs/2026-10-24-tier-redesign-design.md, "Per tower: tier 0 and
// tier I"). aspira-capstone.js gave every per-tier table a tier I between tier 0 and today's I (tierMid); here each tower's tier 0
// becomes the plain attack and its tier I the axis's first hint. Loaded after aspira-curve.js (the simulator too, sim.mjs FILES),
// so every table already holds its six tiers 0..V.

// ARC: one beam, no chain (Conductivity 0: no jump); Conductivity I one jump. (Voltage I's fork: VOLT_FORK, aspira-skills.js)
ARC_CONDUCTIVITY[0] = { ...ARC_CONDUCTIVITY[0], j: 0 };
ARC_CONDUCTIVITY[1] = { ...ARC_CONDUCTIVITY[0], j: 1 };

// SOL: one beam passing through at the carry, no reflection, no burn, no armor strip; Reflection I one bounce (SOL_FAN_BY one chain)
SOL_REFRACTION[0] = 0; SOL_REFRACTION[1] = 1; // (one beam always, armor strip written 0..V - aspira-skills.js, 2026-10-25)

// CRR: one interceptor, no tether, one bolt a volley (CRR_BOLTS_BY); Hangar I two interceptors, one held circling (CRR_HOLD_FRAC's tier I);
// Tether I one tethered drone (CRR_TETHER_N) at today's base slow, its pulse from II
CRR_HANGAR[0] = 1; CRR_HANGAR[1] = 2; CRR_TETHER_SLOW[0] = 0; CRR_TETHER_SLOW[1] = 0.35;

// FRZ: Sublimation I is the hurt alone - no Brittle until II, today's I (owner, 2026-10-25: "zero" - tierMid gave it +7%)
FRZ_BRITTLE[1] = 1;

// ACD: one acid ray, no pools (ACD_CONTAGION null); Flow I two rays and the carry; Contagion I the ray drips a slowing pool (ACD_POOL_SLOW)
ACD_LINES[0] = 1; ACD_LINES[1] = 2; ACD_CONTAGION[0] = null;

// GRV: the nova and a TINY void every third nova, no aura (owner, 2026-10-25: "add void at 0 (every 3 novas) / But, tiny, no aura")
GRV_AURA_R[0] = 30;

// IFR: a meteor that just hits (no fan; the fire and the flares off - ifrSkillStats); Meteor I a fan of two
IFR_FAN[0] = 0; IFR_FAN[1] = 2;
