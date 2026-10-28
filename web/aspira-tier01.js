// /spire - TIER 0 AND TIER I, by hand (tier redesign, owner 2026-10-24: "level 0 is basic beam or circle, first level of each axis gives
// the first inkling of what the tower does"; spec docs/superpowers/specs/2026-10-24-tier-redesign-design.md, "Per tower: tier 0 and
// tier I"). aspira-capstone.js gave every per-tier table a tier I between tier 0 and today's I (tierMid); here each tower's tier 0
// becomes the plain attack and its tier I the axis's first hint. Loaded after aspira-curve.js (the simulator too, sim.mjs FILES),
// so every table already holds its six tiers 0..V.

// ARC: one bolt that CHAINS ONCE (owner, 2026-10-28: "ARC to chain once"; the spec's chainless tier 0, 2026-10-24, is gone) - the table's own
// tier 0 (ARC_CONDUCTIVITY, aspira-skills.js), nothing written here; Conductivity I chains twice (tierMid's tier I). (Voltage I's fork: VOLT_FORK)

// SOL: one beam that strikes its first enemy and flies on straight past it, striking no one (owner, 2026-10-28: "go straight even if there is
// nobody to hit") - no band, split, bounce or prism (st.pierce 0, SOL_SPLIT[0] 0 - solSkillStats), no burn, no armor strip (owner,
// 2026-10-28: tier 0 "a minimal version of the tower with few effects"; 2026-10-26 had it splitting and bouncing from the start).
// Diffraction I the band and one split, Scorch I the burn and the rod, Breach I the strip
// (SOL's tables are written 0..V in aspira-skills.js since 2026-10-25)

// CRR: one interceptor, no tether, one bolt a volley (CRR_BOLTS_BY); Hangar I two interceptors, one held circling (CRR_HOLD_FRAC's tier I);
// Tether I one tethered drone (CRR_TETHER_N) at today's base slow, its pulse from II
CRR_HANGAR[0] = 1; CRR_HANGAR[1] = 2; CRR_TETHER_SLOW[0] = 0; CRR_TETHER_SLOW[1] = 0.35;

// FRZ: Sublimation I is the hurt alone - no Brittle until II, today's I (owner, 2026-10-25: "zero" - tierMid gave it +7%)
// (FRZ_BRITTLE written 0..V since 2026-10-26: I = 1)

// ACD: one acid ray, no pools (ACD_CONTAGION null); Flow I two rays and the carry; Contagion I the ray drips a slowing pool (ACD_POOL_SLOW)
ACD_LINES[0] = 1; ACD_LINES[1] = 2; ACD_CONTAGION[0] = null;

// GRV: the nova and a TINY void every third nova, no aura (owner, 2026-10-25: "add void at 0 (every 3 novas) / But, tiny, no aura")
GRV_AURA_R[0] = 30;

// IFR: tier 0 a meteor that bursts into 6 (IFR_FAN_N, aspira-ifrit.js); the fire and the flares off until bought - ifrSkillStats

