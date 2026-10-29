// /aspira - TOWER STATS AND PRICES: the level tables, towerStats (a tower's stats from its level, chart and aura) and what
// building, upgrading and selling cost. Split from aspira-defs.js at its cap; loaded right after it (the simulator too, sim.mjs FILES).

// Towers have four levels (L1-L4, matching the UI). Each table holds one
// value per level; L2 brings the path choice, L3 the final form, L4 the super
// form. (These are the old 15-level curves sampled at levels 1/5/10/15, so the
// balance is unchanged by the condensing.)
const LVL_DMG = [1, 1.874, 4.108, 9.007];
const LVL_RANGE = [1, 1.12, 1.27, 1.42];
const LVL_ARC_DMG = [1, 1.4, 2, 2.8], LVL_ARC_RANGE = [1, 1.1, 1.2, 1.3];
// (the rule "two L1 SOLs must clear wave 1" was dropped, owner 2026-10-06: SOL
// is no longer a swarm answer; its rate fell to 1, its shot rose to 189)
const LVL_SOL_RATE = [1, 1, 1, 1];
const LVL_SOL_CRIT = [0.1, 0.16, 0.235, 0.31];
const LVL_SLOW = [0.4, 0.45, 0.5, 0.55], FRZ_SLOW_MUL = 0.8; // owner: starts at 40%, grows modestly; capped at 0.85 in towerStats
// cost to go from level i+1 to i+2, as a multiple of the tower's build cost;
// the first upgrade HALVED (owner, 2026-10-05; was 5.9)
const STEP_COST = [2.95, 15.25, 24];

// Base stats come from the level tables; the chosen path's mods and then the
// final form's mods (aspira-upgrades.js) stack on top. A Spotter in range
// adds its aura; noAura stops the aura lookup recursing into other towers.
function towerStats(t, noAura = false) {
  const b = TOWERS[t.kind], i = t.lvl - 1;
  // RANGE_BONUS: every tower reaches 0.9x its table value (owner: 75% of the old 1.2, 2026-10-04)
  const s = {
    dmg: b.dmg * LVL_DMG[i], rate: b.rate, range: b.range * RANGE_BONUS * LVL_RANGE[i],
    targets: 1, critMul: 3, arcRange: 50, arcFall: 0.8,
    slide: 1, // x the slide extent (aspira-towers.js; a chart tier may raise it)
  };
  switch (t.kind) {
    // arc reach = the tower's own range (owner: tripled from half the old range),
    // measured from each arc's parent enemy
    // ARC levels up MODESTLY (owner, option A): the L2 path brings the big change
    // ARC runs on its SKILL CHART now (aspira-skills.js; owner 2026-10-05)
    case "arc": arcSkillStats(t, s, b); break;
    // SOL levels up MODESTLY like ARC and ACD (owner): the L2 path brings the change
    case "sol":
      if (hasSkills(t)) { solSkillStats(t, s, b); break; } // SOL's chart (aspira-skills.js)
      s.dmg = b.dmg * LVL_ARC_DMG[i]; s.range = b.range * RANGE_BONUS * LVL_ARC_RANGE[i];
      s.crit = LVL_SOL_CRIT[i]; s.rate = b.rate * LVL_SOL_RATE[i]; break;
    case "frz": if (hasSkills(t)) { frzSkillStats(t, s, b); break; } s.slow = LVL_SLOW[i]; s.targets = 3; break; // owner: 3 rays by default (2026-10-04; was 1 since 2026-10-02)
    // ACD levels up MODESTLY like ARC (owner): the L2 path brings the big change
    case "grv": grvSkillStats(t, s, b); break; // the gravity tower (aspira-grv.js)
    case "crr": carSkillStats(t, s, b); break; // the carrier (aspira-crr.js)
    case "ifr": ifrSkillStats(t, s, b); break; // Ifrit (aspira-ifrit.js)
    case "acd":
      if (hasSkills(t)) { acdSkillStats(t, s, b); break; } // ACD's chart (aspira-skills.js)
      s.dmg = b.dmg * LVL_ARC_DMG[i]; s.range = b.range * RANGE_BONUS * LVL_ARC_RANGE[i];
      s.double = ACD_BASE_DOUBLE; s.cap = ACD_BASE_MAX; s.plagueR = 0; break;
  }
  if (t.path != null) {
    const p = UPGRADES[t.kind][t.path];
    applyMods(s, p.mods);
    if (t.form != null) {
      const fm = p.finals[t.form].mods;
      const fin = p.finals[t.form];
      // L4: the form's own on-theme super on top of it, else the generic boost
      if (t.lvl >= MAX_LVL && fin.super) { applyMods(s, fm); applyMods(s, fin.super.mods); }
      else applyMods(s, t.lvl >= MAX_LVL ? superMods(fm) : fm);
    }
  }
  // every FRZ slow 20% weaker (owner, 2026-10-02) - base, Stasis, Permafrost,
  // Ice Age, Frostbite alike; Deep Freeze's 95% near-freeze is kept as is
  if (s.slow) s.slow = Math.min(0.85, s.slow * FRZ_SLOW_MUL);
  if (!noAura) {
    for (const u of G.towers) {
      if (u === t) continue;
      const us = towerStats(u, true);
      // the old Spotter's damage aura - NOT a chart FRZ, whose `aura` is its SLOW
      // (that clash cut every tower inside a FRZ to a third of its damage, 2026-10-06)
      if (us.aura && !us.skill && Math.hypot(u.x - t.x, u.y - t.y) <= us.range) s.dmg *= us.aura;
    }
  }
  if (typeof relayMul === "function") { const m = relayMul(t); if (m > 1) relayStats(s, t.kind, m); } // the core's Orbital Relay: the tower as three (aspira-core.js)
  if (G.power.RNG > 0) s.range *= 1.3;
  if (G.power.DAM > 0) { s.dmg *= 1.6; if (s.biteDmg) s.biteDmg *= 1.6; } // (biteDmg: FRZ Rime's, aspira-frz.js)
  return s;
}
// FREE BUILDS (owner, 2026-10-20: "auto-move should make upgrades and towers free"; "if any purchase is made during auto-move,
// DQ the player" - G.autoBuy -> autoBarred, aspira-ascend.js): every price reads 0 while it is on. Its OWN checkbox since
// 2026-10-21 (owner: "split up the checkboxes for auto-move and free towers/upgrades"; freeMode, aspira-positioning.js).
// typeof: the sim has no positioning.js
const freeBuild = () => typeof freeMode !== "undefined" && freeMode;
const upCost = t => freeBuild() ? 0 : Math.round(TOWERS[t.kind].cost * (hasSkills(t) ? SKILL_STEP_COST : STEP_COST)[t.lvl - 1]); // chart towers: six small steps
// each tower's default targeting, its natural job (owner, 2026-10-03): ARC
// starts its tree on whatever is nearest the core, FRZ slows what nothing has
// touched yet (Fresh), SOL saves its big hit for the most HP, ACD holds its
// ramping burn on the longest-lived (Biggest)
const DEFAULT_MODE = { arc: "close", frz: "close", sol: "close", acd: "close", grv: "close", crr: "close", ifr: "close" }; // every tower NEAR by default (owner, 2026-10-16: "by default, every tower should target near"; FRZ was Fresh, SOL + ACD Biggest)
// each new tower costs 1.5x the last (owner, 2026-10-04; was 2x): 40, 60, 90, 135, 203, 304
const towerCost = k => freeBuild() ? 0 : Math.round(TOWERS[k].cost * Math.pow(1.5, G.towers.length));
const sellValue = t => Math.floor(t.spent * 0.95); // 95% back (owner, 2026-10-13; was 70%)
for (let i = 0; i < N_PATHS; i++) PATHS.push(typeof SIM_LANES === "function" ? SIM_LANES(i, buildSpiral) : buildSpiral(i)); // (SIM_LANES: the simulator builds each lane once a process - scripts/aspira-sim/sim.mjs) // (pace 1 on every lane: one speed for all, owner 2026-10-08; here, after ENEMIES: the core twist reads the riders' speeds)
