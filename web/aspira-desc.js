// /aspira - what a tower DOES, in prose (owner, 2026-10-07): one description
// per tower composed from its chart, each axis swapping a few words in one
// template, so the card's track changes (aspira-sliders.js) read as a single
// small edit from the locked tiers to the pulled ones. Loaded after
// aspira-skills.js (the simulator too, for scripts/aspira-desc-graph.mjs). THE WORDING RULES: docs/spire-wording.md
const cap = s => s[0].toUpperCase() + s.slice(1);
// DAMAGE AS A SHARE OF THE TOWER'S (owner, 2026-10-25: "for all damage things we should show it as a percentage of the tower damage"):
// 100% = the tower's MAIN hit - an ARC bolt, a second of FRZ's full aura, a SOL beam, a second of an ACD jet, a second of a tier 0 GRV void's crush, a CRR volley, an
// IFR meteor; and what TICKS reads "X%td over Z s" (owner, 2026-10-26: "no need to write the number of hits, just have them in the stat block"), a steady burn over 1s
const pc = x => Math.round(x * 100) + "%";
const secs = x => +x.toFixed(2) + "s";
const ticking = (x, hits, z) => pcd(x) + " damage over " + secs(z); // (hits: the stat block's, never the sentence's)
// PER UNIT, NEVER A TOTAL (owner, 2026-10-31: "Nothing should ever be above like 800%"): a steady burn reads its share A SECOND, a CRR
// sortie its share A BOLT; ACD, FRZ and GRV shares are of their td (TD_UNIT[kind] x the old unit - why: aspira-stats.js), so a table read here divides by it
const perSec = x => pcd(x) + " damage a second";
const TD_UNIT = { acd: 8, frz: 3, grv: 4 }; // HERE, not in aspira-stats.js: the simulator loads this file (the description graph) and not that one
const tdU = kind => TD_UNIT[kind] || 1;
// THE MAIN HIT READS 100%td (owner, 2026-11-09: "multiply td by 6.07 and this should say 100%td / check if this is the case with other towers and fix /
// For each tower, at each level, _something_ should do 100%td (update this without affecting actual damage) preferrably the most often applied piece of
// damage (or the median, if there is a big damage range and we want to avoid crazy numbers)"): the card's damage shares (pcd, perSec, ticking) and the
// stat block's %td (tdP, aspira-stats.js) are of the tower's MAIN hit at its build - cardMain, that hit's share of the old unit. FRZ a second of its
// aura, GRV the middle of its void's crush, SOL a shot; ARC, CRR and IFR already read 100%, and ACD's td is the middle of its jet's ramp (1x to 64x) already. Display only: the
// damage dealt and TD_UNIT (which the game's caps read) are unchanged
function cardMain(kind, sk = {}) {
  if (kind === "frz") return (sk.temp ? 1 : FRZ_NIP) / tdU("frz");
  /* (ACD: its jet ramps 1x to ACD_BASE_MAX; the ramp's middle is its td already - left as it was, the median rule) */
  if (kind === "grv") { const v = sk.void || 0, n = sk.supernova || 0, lo = GRV_INNER_K[v] * GRV_START_MASS * (v >= CAPSTONE_TIER ? GRV_BIG_MASS : 1) * GRV_NOVA_RATE[n] / (GRV_INNER_K[0] * GRV_START_MASS * tdU("grv")); return (Math.min(GRV_CRUSH_TD, lo) + Math.min(GRV_CRUSH_TD, lo * GRV_MASS_MAX)) / 2; }
  if (kind === "sol") { const t = { kind: "sol", x: 0, y: 0, lvl: 1, skills: { ...sk } }; t.lvl = 1 + towerLevel(t); const st0 = towerStats(t); return solTrackSt(t, st0).dmg / SOL_PULSE_K / st0.dmg; }
  return 1;
}
let descK = 1; // 1 / cardMain while a card's sentence is composed (describeTower)
const pcd = x => pc(x * descK); // a DAMAGE share, of the main hit
// ARMOR STRIPS READ AS A SHARE OF THE ARMOR (2026-10-28 armor rework: a strip multiplies armor down, never below 0 - shredArmor,
// aspira-acid.js): a strip of `amt` armor (before the LATE SCALE) takes that share of what is left at the CURRENT wave (wording rule 10)
const descWave = () => Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1);
const shredPc = amt => { const w = descWave(); return pc(Math.min(SHRED_MAX, SHRED_K * amt * scaleOf(w) / armorRefOf(w))); };
// a chart tower's stats at these skills (as scripts/aspira-desc-graph.mjs reads them) - for strips sized by its damage
const descStats = (kind, sk) => towerStats({ id: -1, kind, x: CX, y: CY, lvl: 1 + towerLevel({ kind, skills: sk }), skills: sk });
const NUM_WORD = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
// thematic words where they fit (owner): chill, rime, fracture, moons; rays, refract, pierce; jets, etch.
// ONLY BEHAVIOUR is told here (owner, 2026-10-07): a tier that just moves a number - harder
// hits, a colder or wider aura, faster pulses, a stronger acid, more or bigger puddles -
// changes no words; the card's stat rows show that change (now -> next)
const DESCRIBE = {
  arc(sk) {
    // THE ARC REDESIGN (owner, 2026-10-29): one bolt, a chain (Voltage: its length), one fork at the strike from Voltage ARC_FORK_FROM,
    // Conductivity the carry (ARC_AMP_FALL), Shock (id capacitance) an armor break, a harder bolt and a shock mark on every hit - no slow since
    // the ARC brief (2026-11-01); each jump only further out (2026-11-06); the capstones last - every number read live
    const c = sk.conductivity || 0, v = sk.voltage || 0, z = sk.capacitance || 0, TIMES = ["", " once", " twice"];
    const fl = ARC_AMP_FALL[c], d = Math.round(Math.abs(fl - 1) * 100), j = ARC_VOLT_JUMPS[v], times = TIMES[j] || " " + (NUM_WORD[j] || j) + " times"; /* (24 and 30 jumps at Voltage IV / V, 7.7.0: past NUM_WORD, a numeral) */
    const pc = (d === 0 ? "full damage" : d + "% " + (fl < 1 ? "less" : "more") + " damage") + " every chain";
    return "A bolt of lightning that " + (v >= ARC_FORK_FROM ? "forks once and " : "") + "chains" + times + " for " + pc + "." + (j > 0 ? " Each jump goes further out from ARC." : "") + /* the radial jumps (owner, 2026-11-06; Balance's line) */
      (z ? (ARC_RES_SLOW[z] ? " Hits slow by " + Math.round(ARC_RES_SLOW[z] * 100) + "% and break " : " Hits break ") + Math.round(ARC_RES_STRIP[z] * 100) + "% of the armor left." : "") + /* no slow since the ARC brief (2026-11-01) */
      (ARC_RES_DMG[z] > 1 ? " Its bolts hit ×" + +ARC_RES_DMG[z].toFixed(2) + " harder." : "") +
      (c >= CAPSTONE_TIER ? " The last jump of each chain bursts, hitting every enemy within " + ARC_GROUND_R + " u." : "") + /* Grounding (owner, 2026-11-06) */
      (v >= CAPSTONE_TIER ? " Every " + ["", "", "second", "third", "fourth", "fifth"][ARC_STORM_EVERY] + " strike forks " + NUM_WORD[ARC_STORM_FORK] + " ways." : "") + /* Storm */
      (z >= CAPSTONE_TIER ? " A shocked enemy that dies passes its shock to every enemy within " + ARC_SHOCK_PASS_R + " u." : "") + /* Shock V */
      (typeof ARC_SHOCK_AMP !== "undefined" && ARC_SHOCK_AMP[z] > 0 ? " Shocked enemies take " + Math.round(ARC_SHOCK_AMP[z] * 100) + "% more damage." : ""); /* Shock option 1 (Wai, 2026-11-01): its mark, e.shockT */ /* (and its hit factor, Wai approved 2026-11-01) */
  },

  // FRZ (owner, 2026-10-22, shorter): "Emits an aura that slows enemies by 67% and hurts more the slower they are. Enemies in the aura take
  // 802% more damage." / Permafrost "Pulses of frost permanently slow by % and break n armor on [every] hit", VI "Rapid pulses" (n: since the 2026-10-28
  // armor rework the share of its armor a fully frosted enemy loses, FRZ_RIME_CRACK) / Moons: the moons and their satellites (owner: "satellites instead of moonlets") - every number read live
  frz(sk) {
    const tp = sk.temp || 0, rm = sk.rime || 0, mo = sk.moons || 0, pct = x => Math.round(x * 100) + "%", mn = FRZ_MOON_COUNT[mo], sub = FRZ_SUBMOON_N[mo];
    const hits = 1 / FRZ_TEMP_TICK[tp]; // ticks a second; 100% = a second of the full aura (Fracture's - tier 0 nips FRZ_NIP of it)
    return "Emits aura that slows enemies by " /* owner's words, 2026-10-26 */ + pct(FRZ_TEMP_SLOW[tp]) + " and deals " + (tp ? perSec(1 / tdU("frz")) + ", up to " + Math.round(Math.min(FRZ_BITE_TD * tdU("frz"), 1 + FRZ_CHILL_K * fastSlowCap() * ENEMIES.fast.speed / ENEMY_BASE_SPEED)) + "× as much the more speed it takes." /* a multiplier of the aura, as the ACD ramp is (the cap read 800% of the old unit, 2400% of the new) */ : perSec(FRZ_NIP / tdU("frz")) + ".") + /* tier 0 slows and nips (owner, 2026-10-25) */
      (FRZ_BRITTLE[tp] > 1 ? " Enemies in the aura take " + pct(FRZ_BRITTLE[tp] - 1) + " more damage" + (tp >= CAPSTONE_TIER ? ", for " + FRZ_LINGER_S + " s after they leave." : ".") : "") +
      (rm ? " " + (rm >= CAPSTONE_TIER ? "Rapid pulses" : "Pulses") + " of frost bite for " + pcd(FRZ_RIME_BITE0 * FRZ_TEMP_TICK[0] / tdU("frz")) + " damage" /* a bite: FRZ_RIME_BITE0 full ticks */ + ", permanently slow by " + pct(FRZ_RIME[rm]) + ((ac => ac !== "0%" ? " and strip up to " + ac + " of armor" : "")(pc(Math.min(1, FRZ_RIME_CRACK[rm])))) /* nothing it does not do yet (owner, 2026-10-26) */ + " every hit." + (typeof FRZ_CONDUCT_R === "number" ? " A ring that reaches a fully frozen enemy passes on to the nearest enemy within " + FRZ_CONDUCT_R + " u." : "") + (rm >= CAPSTONE_TIER ? " A fully frozen enemy is frozen solid for " + FRZ_DEEP_S + " s, once per " + FRZ_DEEP_CD + " s." : "") /* Deep freeze */ /* conduction (owner, 2026-11-06: "Limit FRZ permafrost conduction to things that are within 200u of conducting target"; Balance's line) */ : "") +
      (mn ? " " + (mn > 1 ? cap(NUM_WORD[mn]) + " moons copy" : "A moon copies") + " the aura at " + pc(FRZ_MOON_BY[mo]) + (sub ? ", each with " + NUM_WORD[sub] + " satellite" + (sub > 1 ? "s" : "") + " at " + pc(FRZ_MOON_BY[mo] * FRZ_SUBMOON.k) : "") + "." : "");
  },
  // SOL: the tracking beam (owner, 2026-11-04) - its words, read live: solTrackDesc below (the old shot's went with it, 2026-11-05)
  sol(sk) { return solTrackDesc(sk); },

  // ACD (owner, 2026-10-22, shorter): the jets (ACD_LINES), Flow's carry (ACD_FLOW_CARRY), the pools' slow (ACD_POOL_SLOW, Spill's since the tier redesign),
  // the pools (Spill: the ray drips them; no kill pools since the tier redesign), Corrosion: the share of armor a full-ramp tick strips at the current wave (shredPc) - read live
  acd(sk) {
    const c = sk.contagion || 0, f = sk.spray || 0, k = sk.corrosion || 0, n = ACD_LINES[f], J = n > 1 ? "Jets" : "The jet", s = n > 1 ? "" : "s"; // tier 0: one ray, no pools (tier redesign 2026-10-24)
    const hits = TOWERS.acd.rate * curveAt("acd", 0).rate, pool = ACD_PUDDLE_CAP * ACD_POOL_HEAT, life = Math.min(POOL_MAX_S, (acdPools(c) || {}).life || 0); // 100% = a second of a jet, before its ramp
    return (n > 1 ? cap(NUM_WORD[n]) + " jets of acid each deal " : "A jet of acid deals ") + perSec(1 / tdU("acd")) + " (100%td at " + tdU("acd") + "×), growing up to " + ACD_BASE_MAX + "× the longer " /* the middle of its ramp, its td, named (owner, 2026-11-09: something reads 100%td on every card) */ + (n > 1 ? "they stay" : "it stays") + " on target." /* a multiplier, not a share (Leader, 2026-11-01); the doubling time: the stat block's */ /* owner's words, 2026-10-26 */ + (f ? " Jets retain " + Math.round(ACD_FLOW_CARRY[f] * 100) + "% flow between enemies." : "") +
      (k ? " " + (n > 1 ? "The jets dissolve" : "The jet dissolves") + " up to " + (st => pc(st.corrode))(descStats("acd", sk)) + " of the armor left a tick and " + (n > 1 ? "drop" : "drops") + " corrosive goo that strips " + pc(ACD_GOO_STRIP[k]) + " of the armor left and deals " + pcd(ACD_GOO_DMG[k]) + "td." /* a full-ramp tick (2026-10-28 armor rework); the goo in shares (7.1.4; Leader's wording, 2026-11-01) */ : "") /* owner's words, 2026-10-26 */ +
      (k >= CAPSTONE_TIER ? " Corroded enemies take " + Math.round(ACD_CORR_TAKE * 100) + "% more damage from every tower." : "") +
      (c ? " " + J + " leave" + s + " slimy acidic pools that " + (ACD_POOL_SLOW[c] ? "slow by " + Math.round(ACD_POOL_SLOW[c] * 100) + "% and " : "") + "burn for up to " + perSec(pool / tdU("acd")) + " for " + secs(life) + "." : "") +
      (c >= CAPSTONE_TIER ? " Overlapping pools merge into a lake that burns " + Math.round((ACD_LAKE_K - 1) * 100) + "% harder." : ""); // (a pool burns at its tower's tick, x the jet's heat when it dropped - up to ACD_PUDDLE_CAP)
  },
  // CRR (owner, 2026-10-15): Hangar more interceptors; Tether a slowing, pulsing beam to what it fires at (Chain: on to one more enemy); Armament harder, faster,
  // longer sorties (Autopilot: a spent interceptor bursts into pellets)
  crr(sk) {
    const h = sk.hangar || 0, l = sk.launch || 0, a = sk.armament || 0;
    const tn = CRR_TETHER_N[l], vo = CRR_AMMO[a]; // tier 0: one interceptor, one bolt a volley, no tether; 100% = one bolt (st.dmg, 2026-10-26)
    // (owner, 2026-10-26): "fires Y volleys per sortie for a total of Y%td, X interceptors can be stored in orbit" / "fires Y volleys and
    // tethers the target ... Tethered targets are slowed by Y% take an additional X% damage per tether" / Armament V "does not need to state rebuilt"
    // (owner, 2026-10-26: "CRR 0: Launches an available interceptor that flies towards an enemy and fires..." / "Hangar I: Launches 2 available interceptors at a time")
    // (owner, 2026-11-04: "make CRR ready interceptors wait in orbit around the tower / when launching interceptors, launch from orbit first,
    // FIFO"; "interceptors should only start firing once they enter orbit"; "remove bolt slow"; Hangar stays "how many interceptors" - every
    // ready one waits circling the carrier at every tier, so no "stored in orbit" clause)
    const n = CRR_HANGAR[h], many = n > 1;
    return (many ? cap(NUM_WORD[n] || String(n)) + " interceptors wait in orbit round the carrier and launch at enemies in range, the longest-waiting taking the first target." : "An interceptor waits in orbit round the carrier and launches at an enemy in range.") + /* all at once (no launch rate since 2026-10-26): FIFO decides who takes which (Leader, 2026-11-04) */
      (many ? " Each" : " It") + " circles its enemy and fires " + vo + " volleys of " + NUM_WORD[CRR_SALVO[a]] + " bolts once round it" /* SALVOS (owner, 2026-11-09): CRR_SALVO bolts a volley */ /* one bolt a volley since 2026-11-05 (its damage the volley's) */ +
      (l ? (tn === 1 && many ? " (the first one out tethering its target)" : ", tethering its target") : "") +
      ", then " + (a >= CAPSTONE_TIER ? "bursts into " + NUM_WORD[CRR_BURST_N] + " pellets of " + pcd(CRR_BURST_K) + " damage whenever it flies home, for any reason." : "flies home to reload what it used.") /* PARTIAL RELOAD (aspira-crr.js carHome) */ +
      " It stays on its target until it dies or the ammo runs out." + (h >= CAPSTONE_TIER ? " Warp Drive: interceptors vanish as they launch, fly out at " + CRR_WARP_V + " u a second, and reappear just before they turn to face their target." : "") /* WARP DRIVE (owner, 2026-11-09: "no retarget / instead, warp drive ..."; the fade: aspira-crr-draw.js carWarpA) */ /* no leash (the CRR rework, 2026-11-02) */ + " Each bolt deals " + pcd(1) + " damage." /* td = one bolt; no slow since 2026-11-04 */ +
      (l ? " Each tether slows its target " + pc(crrTetherSlow(l)) + " and adds " + pc(CRR_TETHER_AMP[l]) + " to the damage it takes, tethers stacking" + (l >= CRR_CHAIN_FROM ? "; tethers run on to one more enemy nearby" : "") + " (shields block the slow)." : "");
  },
  // GRV (rework, owner 2026-10-25): tier 0 a tiny void a shot; Nova one nova before it (three until 2026-11-06), harder by tier, stripping armor (Hypernova: the most);
  // Void a bigger void, pellets shed as it decays (Singularity: heavier); Gravity Well the aura - pull, slow - and the pellets' damage and
  // range (Event Horizon: the whole aura slows as hard as its inside)
  grv(sk) {
    const v = sk.void || 0, n = sk.supernova || 0, r = sk.radiation || 0, U = GRV_INNER_K[0] * GRV_START_MASS * tdU("grv"), lo = GRV_INNER_K[v] * GRV_START_MASS * (v >= CAPSTONE_TIER ? GRV_BIG_MASS : 1) * GRV_NOVA_RATE[n] / U; // 100% = a second of a tier 0 void's crush (owner, 2026-10-25: "yes" - it was a nova's hit, and tier 0 has none)
    // (owner, 2026-10-25): "0: void only" / "the void crushes" / "always call it a void, and an aura" / "122% to X% depending on the size"
    // (owner, 2026-10-26): "A void crushes for 100% to 300%td over 1s as it grows. Particles radiate as it decays dealing X%td each." - the merge sentence dropped
    return (n ? "A nova implodes, dealing " + pcd(GRV_NOVA_K * GRV_NOVA_RATE[n] / U) + " damage" + (a => a !== "0%" ? " and stripping " + a + " of armor" : "")((st => st.strip ? pc(st.strip) : "0%")(descStats("grv", sk))) + "; then a" : "A") +
      " void" + (v >= CAPSTONE_TIER ? ", twice as heavy," : "") + " crushes for " + pcd(Math.min(GRV_CRUSH_TD, lo)) + " to " + perSec(Math.min(GRV_CRUSH_TD, lo * GRV_MASS_MAX)) + " as it grows." +
      " Particles radiate as it decays dealing " + pcd(GRV_PELLET_K[r] * GRV_NOVA_RATE[n] / U) + " damage each." +
      (r ? " An aura around it pulls enemies together and slows them" + (r >= CAPSTONE_TIER ? " twice as hard." : ", twice as hard inside the void.") : "") +
      (n >= CAPSTONE_TIER ? " Every " + ["", "", "second", "third", "fourth"][GRV_SUPER_EVERY] + " nova rings twice, the second ring " + Math.round((GRV_SUPER_R - 1) * 100) + "% wider." : "") + /* Hypernova (owner, 2026-11-06) */
      (r >= CAPSTONE_TIER ? " Enemies nearer the core than the tower are reeled back to the void, each at most once every " + GRV_REEL_CD + "s." : "") + /* Undertow */
      (v >= CAPSTONE_TIER ? " Each enemy it crushes dead grows it " + Math.round((GRV_EH_GROW - 1) * 100) + "% (up to " + Math.round((GRV_EH_MAX - 1) * 100) + "%), fading over " + GRV_EH_FADE + "s." : ""); /* Event Horizon */ /* V (owner, 2026-10-26): "An aura... pulls enemies together and slows them twice as hard." */ /* (no "flings its particles farther": owner, 2026-10-26) */
  },
  // IFR (owner, 2026-10-20): Meteor the fan (Impact: each fan hit splits in two); Hellfire the fire, wider and longer (its capstone: six
  // towers across); Flare the flares - bigger, hotter, longer (its capstone: the flare's circle, IFR_RING_AT)
  ifr(sk) {
    const m = sk.meteor || 0, h = sk.hellfire || 0, f = sk.firaga || 0, n = m >= CAPSTONE_TIER ? IFR_FAN_CAP : IFR_FAN_N, st = IFR_STORE[m];
    // 100% = a meteor's hit (IFR_ROUTE_K0 x st.dmg); a fire flare's hit shrinks as the burst grows (hk), the fire's wall is IFR_RING_HIT_K of it
    const hf = IFR_TICK_K[0] * (f ? IFR_HF_FK : 1) * IFR_FIRE_HK * IFR_HF_HIT_K / Math.sqrt(1 + n) / IFR_ROUTE_K0;
    const fr = Math.max(IFR_BALL_RAD[m] * IFR_FIRE_FLOOR, IFR_FIRE_R[h]), n0 = Math.max(1, Math.round(IFR_FIRE_FLARES * IFR_FIRE_DENS[h] * (fr / IFR_FIRE_FLARE_R0) ** 2)), nf = Math.max(IFR_FIRE_MIN, n0); // as stepIfrFires lights them
    const ft = ifrFlareTiming(f), burn = ft.burn, fl = ft.n; // (a third as long, the same per flare: 2026-11-05)
    // (owner, 2026-10-26): "A meteor strikes the target for X%td and bursts into 6 more." / Hellfire "A wall of fire expands from the enemy, dealing X%td
    // and lights Y flares that singe for Z%td each" (no spread distance) / Flare "Meteor impacts light a bright flare that burns..." / Meteor: orbit storage
    return "A meteor strikes the target for " + pcd(1) + " damage and bursts into " + NUM_WORD[n] + " more." +
      (m >= CAPSTONE_TIER ? " One meteor in " + NUM_WORD[IFR_BIG_EVERY] + " is twice the size and strikes for " + pcd(IFR_BIG_HIT_K) + "." : "") +
      (st > 1 ? " " + cap(NUM_WORD[st]) + " meteors can be stored in orbit." : "") +
      " A wall of fire expands from the enemy, dealing " + pcd(hf * IFR_RING_HIT_K) + " damage" + (h ? " and lights " + nf + " flares that singe for " + pcd(hf * n0 / nf) + " damage each." : ".") + (h >= CAPSTONE_TIER ? " While it follows an enemy, " + NUM_WORD[IFR_HF_RINGS.length] + " burning chains circle its fire and scorch whatever they touch." : "") + // (every tier: owner, 2026-11-05, the circle at Hellfire 0, no flares)
      (f ? " The first impact lights " + (f >= CAPSTONE_TIER ? "a bright flare and a circle partway up its spokes that burn" : "a bright flare that burns") + " for " + pcd(IFR_MAIN_FLARE_K * IFR_TICK_K0 * ft.k / IFR_ROUTE_K0) + " damage a tick for " + secs(burn) + "." : ""); /* a tick at a time: x3 the main flare (IFR_MAIN_FLARE_K, 2026-11-05) put the per-second total over 800% ("Nothing should ever be above like 800%") */
  },
};
// the description for a chart (`skills`): every chart tower has a composer - the only prose a chart tower shows
// (the per-tier `desc` / `base` sentences in SKILL_TREES were never shown once these existed, and had drifted; removed 2026-10-14)
// A SHARE OF THE TOWER'S HIT READS "X%td" - tower damage, the card's "Damage (td)" row (owner, 2026-10-26: "use X%td as shorthand for
// tower damage") - a change ("50% less damage") is not a share and keeps its words
const describeTower = (kind, skills) => { const was = descK; descK = 1 / cardMain(kind, skills || {}); try { return DESCRIBE[kind](skills || {}).replace(/(\d%) damage/g, "$1td"); } finally { descK = was; } };

// SOL'S TRACKING BEAM (owner, 2026-11-04: "SOL 0: fire a single tracking beam at a target" / Reflection "splits towards N targets (max range
// SOL range but from enemy), other beams pierce" / Breach "Determines carryover damage of all reflecting and piercing, also determines armor
// reduction" / "pierce damage reduction is applied each time it passes through an enemy" / "It lasts as long as the first target is alive,
// the first target must be in range"): read from a tower with these skills (solTrackSt, aspira-sol.js) - per second, never a burn's total
function solTrackDesc(sk) {
  const t = { kind: "sol", x: 0, y: 0, lvl: 1, skills: { ...sk } }; t.lvl = 1 + towerLevel(t);
  const st0 = towerStats(t), st = solTrackSt(t, st0), td = st0.dmg, k = st.split || 0, br = SOL_BREACH_ARMOR[sk.breach || 0];
  const lasts = st.dot ? st.dot.n * SOL_SCORCH_Q : 0;
  // THE PULSE (owner, 2026-11-05: "fire, pause, fire, pause"): a shot every 1 / rate s, each the shot's damage; its splits pierce only with
  // Breach ("SOL reflections shouldn't pierce without breach"); no enemy twice a shot; scorch SOL_SCORCH_M stacks a shot ("scorch is what pops shields")
  const M = Math.max(1, Math.round(SOL_SCORCH_M / SOL_PULSE_K)), shot = st.dmg / SOL_PULSE_K / td, gap = 1 / (st.rate * SOL_PULSE_K), pb = st.dot ? (st.dmg / SOL_PULSE_K / M) * st.dot.k / SOL_SCORCH_Q / td : 0;
  return "A solar beam locks onto one enemy in range and fires every " + secs(gap) + " for " + pcd(shot) + " damage, holding until it dies or leaves range." +
    (k ? " Each shot splits from that enemy to " + (sk.breach ? (k > 1 ? NUM_WORD[k] + " other enemies" : "one other enemy") : k > 1 ? "the " + NUM_WORD[k] + " nearest other enemies" : "the nearest other enemy") + "" +
      (sk.breach ? "; " + (k > 1 ? "each split aims down the line through the most enemies and pierces" : "the split aims down the line through the most enemies and pierces") + " every enemy on it out to the edge." : ", dealing " + pc(st.hop) + " of the damage.") + " No enemy is hit twice by one shot." + (st.sub ? " Each split splits again into " + NUM_WORD[st.sub] + ", out to the edge of the screen." : "") : sk.breach ? " The beam pierces every enemy on its line out to the edge." : "") + /* (Reflection 0 + Breach: the main beam pierces - owner, 2026-11-05) */
    (br ? " Every hit strips " + pc(br) + " of the armor left, and " + (k ? "splits carry " : "the beam carries ") + pc(st.hop) + " of the damage into each enemy " + (k ? "they reach." : "beyond its target.") : "") + /* (Leader, 2026-11-05: Breach IV and V read the same while the carry rose) */
    (st.dot ? " Each shot scorches what it hits " + NUM_WORD[M] + " times, each burn dealing " + perSec(pb) + " for " + secs(lasts) + " and slowing it " + pc(SOL_SCORCH_SLOW) + " while it burns (shields block the slow)." : "") +
    (st.flare ? " Each shot's first hit also leaves a solar flare that burns whatever it touches." : "");
}
