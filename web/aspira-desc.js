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
const ticking = (x, hits, z) => pc(x) + " damage over " + secs(z); // (hits: the stat block's, never the sentence's)
const NUM_WORD = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
// thematic words where they fit (owner): chill, rime, brittle, moons; rays, refract, pierce; jets, etch.
// ONLY BEHAVIOUR is told here (owner, 2026-10-07): a tier that just moves a number - harder
// hits, a colder or wider aura, faster pulses, a stronger acid, more or bigger puddles -
// changes no words; the card's stat rows show that change (now -> next)
const DESCRIBE = {
  // "Arcs fork on hit, each jump carrying half the hit." -> Conductivity: chain once and / into
  // three / twin; Voltage: most of .. all of (its harder hit is a stat row); Capacitance: the charge sentence (owner's words)
  arc(sk) {
    // (owner, 2026-10-22, shorter): "Six bolts of lightning, each forking 4 ways four times, dealing 160% damage each fork. Lightning can
    // strike the same place more than once. Hits leave six charges that slow and deal damage when popped." - every number read live
    const c = sk.conductivity || 0, v = sk.voltage || 0, z = sk.capacitance || 0, sh = ARC_CONDUCTIVITY[c], n = z ? ARC_CAPACITANCE[z].n : 0;
    const f = VOLT_FORK[v], layers = Math.max(sh.j, f > 1 ? 1 : 0), TIMES = ["", " once", " twice"]; // tier 0: one beam, no chain (tier redesign 2026-10-24)
    // (owner, 2026-10-25): "Two bolts of lightning." / "Two bolts of lightning that fork for X% damage after striking." - the double strike
    // is TWO bolts, so every strike counts twice; a fork wider than two names its ways, more than one layer its times
    // (owner, 2026-10-25): Conductivity "chains" (was "jump on"); Voltage "forks for X% damage every chain"
    // ...then (owner, 2026-10-25): "35% less damage every chain" - the fall as a change, like SOL's reflections; full / more past 100%
    const fl = ARC_VOLTAGE_FALL[v], d = Math.round(Math.abs(fl - 1) * 100), times = TIMES[sh.j] || " " + NUM_WORD[sh.j] + " times";
    const pc = (d === 0 ? "full damage" : d + "% " + (fl < 1 ? "less" : "more") + " damage") + " every chain";
    const fork = " fork" + (f > 2 ? " " + NUM_WORD[f] + " ways" : "") + " for " + pc;
    const tree = !layers ? "" : f > 1 ? (sh.j ? " that chain" + times + " and" + fork : " that" + fork) : " that chain" + times + " for " + pc;
    return cap(NUM_WORD[ARC_BURST_N * sh.s]) + " bolts of lightning" /* a burst of ARC_BURST_N a target (2026-10-26; was 2) */ + tree + "." + (sh.v ? " Lightning can strike the same place more than once." : "") +
      (n ? " Hits leave " + (n > 1 ? NUM_WORD[n] + " charges that slow and deal" : "a charge that slows and deals") + " damage when popped." : "");
  },
  // FRZ (owner, 2026-10-22, shorter): "Emits an aura that slows enemies by 67% and hurts more the slower they are. Enemies in the aura take
  // 802% more damage." / Permafrost "Pulses of frost permanently slow by % and break n armor on [every] hit", VI "Rapid pulses" (n: the ACTUAL armor at the
  // current wave - owner: "just put the actual current armor number" - FRZ_RIME_CRACK x armorRefOf, as fully frosted) / Moons: the moons and their satellites (owner: "satellites instead of moonlets") - every number read live
  frz(sk) {
    const tp = sk.temp || 0, rm = sk.rime || 0, mo = sk.moons || 0, pct = x => Math.round(x * 100) + "%", mn = FRZ_MOON_COUNT[mo], sub = FRZ_SUBMOON_N[mo];
    const hits = 1 / FRZ_TEMP_TICK[tp]; // ticks a second; 100% = a second of the full aura (Sublimation's - tier 0 nips FRZ_NIP of it)
    return "Emits aura that slows enemies by " /* owner's words, 2026-10-26 */ + pct(FRZ_TEMP_SLOW[tp]) + " and deals " + (tp ? ticking(1, hits, 1) + ", up to " + pc(1 + FRZ_CHILL_K * SLOW_CAP) + " the slower they are." : ticking(FRZ_NIP, hits, 1) + ".") + /* tier 0 slows and nips (owner, 2026-10-25) */
      (FRZ_BRITTLE[tp] > 1 ? " Enemies in the aura take " + pct(FRZ_BRITTLE[tp] - 1) + " more damage." : "") +
      (rm ? " " + (rm >= CAPSTONE_TIER ? "Rapid pulses" : "Pulses") + " of frost bite for " + pc(FRZ_RIME_BITE0 * FRZ_TEMP_TICK[0]) + " damage" /* a bite: FRZ_RIME_BITE0 full ticks */ + ", permanently slow by " + pct(FRZ_RIME[rm]) + ((ac => String(ac) !== "0" ? " and break up to " + ac + " armor" : "")(dmgUnits(FRZ_RIME_CRACK[rm] * armorRefOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))))) /* nothing it does not do yet (owner, 2026-10-26) */ + " every hit." : "") +
      (mn ? " " + (mn > 1 ? cap(NUM_WORD[mn]) + " moons copy" : "A moon copies") + " the aura at " + pc(FRZ_MOON_BY[mo]) + (sub ? ", each with " + NUM_WORD[sub] + " satellite" + (sub > 1 ? "s" : "") + " at " + pc(FRZ_MOON_BY[mo] * FRZ_SUBMOON.k) : "") + "." : "");
  },
  // SOL (owner, 2026-10-26): one beam, straight through every hit and splitting at each to SOL_SPLIT more (Diffraction), each hit SOL_HOP
  // (Diffraction) x the one before; the armor every hit strips (SOL_BREACH_ARMOR, Breach); the stacking burn (SOL_SCORCH_N ticks, Scorch) - read live
  sol(sk) {
    const f = sk.focus || 0, r = sk.refraction || 0, b = sk.breach || 0, k = SOL_SPLIT[r], p = Math.round(SOL_HOP[r] * 100);
    const br = SOL_BREACH_ARMOR[b], sc = SOL_SCORCH_N[f];
    // (owner, 2026-10-26): "A solar ray refracts within a light prism..." / Diffraction "A solar ray diffracts into two rays on every hit..."
    return "A solar ray " + (k > 1 ? "diffracts into " + NUM_WORD[k] + " rays on every hit within a light prism" : "refracts within a light prism") +
      (p >= 100 ? " without losing intensity." : ", losing " + (100 - p) + "% intensity" + (k > 1 ? "." : " every hit.")) +
      (br ? " Every hit breaks " + dmgUnits(br * scaleOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))) /* x the LATE SCALE */ + " armor." : "") +
      (sc ? " The light prism and hits scorch the enemy for " + ticking(SOL_SCORCH_TOTAL, sc, sc * SOL_SCORCH_Q) + "." : ""); /* stacking unsaid; the prism's stacks are the stat block's */
  },

  // ACD (owner, 2026-10-22, shorter): the jets (ACD_LINES), Flow's carry (ACD_FLOW_CARRY), the pools' slow (ACD_POOL_SLOW, Contagion's since the tier redesign),
  // the pools (Contagion: the ray drips them; no kill pools since the tier redesign), Corrosion: the armor FLOOR it eats down to (minus the wave's armor, damage() in aspira-game.js) - read live
  acd(sk) {
    const c = sk.contagion || 0, f = sk.spray || 0, k = sk.corrosion || 0, n = ACD_LINES[f], J = n > 1 ? "Jets" : "The jet", s = n > 1 ? "" : "s"; // tier 0: one ray, no pools (tier redesign 2026-10-24)
    const hits = TOWERS.acd.rate * curveAt("acd", 0).rate, pool = ACD_PUDDLE_CAP * ACD_POOL_HEAT, life = Math.min(POOL_MAX_S, (ACD_CONTAGION[c] || {}).life || 0); // 100% = a second of a jet, before its ramp
    return (n > 1 ? cap(NUM_WORD[n]) + " jets of acid each deal " : "A jet of acid deals ") + ticking(1, hits, 1) + ", doubling every " + secs(ACD_DOUBLE[0]) + " " + (n > 1 ? "they stay" : "it stays") + " on target, up to " + pc(ACD_BASE_MAX) + "." /* owner's words, 2026-10-26 */ + (f ? " Jets retain " + Math.round(ACD_FLOW_CARRY[f] * 100) + "% flow between enemies." : "") +
      (k ? " " + (n > 1 ? "The jets dissolve" : "The jet dissolves") + " armor worth " + pc(ACD_CORRODE[k]) + " of " + (n > 1 ? "their" : "its") + " damage, " + pc(DRIP_TAKE * (1 + DRIP_TIER_K * TIER_LEVEL[k])) + " of the armor lost is left behind as a corrosive goo doing the same." : "") /* owner's words, 2026-10-26 */ +
      (c ? " " + J + " leave" + s + " slimy acidic pools that slow by " + Math.round(ACD_POOL_SLOW[c] * 100) + "% and burn for up to " + ticking(pool * life, hits * life, life) + "." : ""); // (a pool burns at its tower's tick, x the jet's heat when it dropped - up to ACD_PUDDLE_CAP)
  },
  // CRR (owner, 2026-10-15): Hangar more interceptors (primes); Tether a slowing, pulsing beam to what it fires at (Chain: on to one more enemy); Armament harder, faster,
  // longer sorties (Autopilot: a spent interceptor bursts into pellets)
  car(sk) {
    const h = sk.hangar || 0, l = sk.launch || 0, a = sk.armament || 0;
    const nb = CRR_BOLTS_BY[a], tn = CRR_TETHER_N[l], vo = CRR_AMMO[a]; // tier 0: one interceptor, one bolt a volley, no tether; 100% = one bolt (st.dmg, 2026-10-26)
    // (owner, 2026-10-26): "fires Y volleys per sortie for a total of Y%td, X interceptors can be stored in orbit" / "fires Y volleys and
    // tethers the target ... Tethered targets are slowed by Y% take an additional X% damage per tether" / Armament V "does not need to state rebuilt"
    // (owner, 2026-10-26: "CRR 0: Launches an available interceptor that flies towards an enemy and fires..." / "Hangar I: Launches 2 available interceptors at a time")
    return "Launches " + (CRR_HANGAR[h] > 1 ? CRR_HANGAR[h] + " available interceptors at a time that fly towards an enemy and fire " : "an available interceptor that flies towards an enemy and fires ") +
      vo + " volleys" + (nb > 1 ? " of " + NUM_WORD[nb] + " bolts" : "") + " per sortie for a total of " + pc(vo * nb) + " damage" /* td = one bolt (2026-10-26) */ +
      (l ? (tn === 1 ? ", the first one tethering" : CRR_HANGAR[h] > 1 ? " and tether" : " and tethers") + " its target" : "") +
      ", then " + (a >= CAPSTONE_TIER ? (CRR_HANGAR[h] > 1 ? "burst" : "bursts") + " into " + NUM_WORD[CRR_BURST_N] + " pellets of " + pc(CRR_BURST_K) + " damage." : (CRR_HANGAR[h] > 1 ? "fly" : "flies") + " home to reload.") +
      (h ? ((n => " " + n + (n > 1 ? " interceptors" : " interceptor") + " can be stored in orbit.")(Math.ceil(carHoldFrac(h) * CRR_HANGAR[h]))) : "") +
      (l ? " Tethered targets are slowed by " + pc(CRR_TETHER_SLOW[l]) + " and take " + pc(CRR_TETHER_AMP[l]) + " more damage per tether" + (l >= CAPSTONE_TIER ? "; tethers run on to one more enemy nearby." : ".") : "");
  },
  // GRV (rework, owner 2026-10-25): tier 0 a tiny void a shot; Nova three novas before it, faster, stripping armor (Hypernova: the most);
  // Void a bigger void, pellets shed as it decays (Singularity: heavier); Acceleration the aura - pull, slow - and the pellets' damage and
  // range (Event Horizon: the whole aura slows as hard as its inside)
  grv(sk) {
    const v = sk.void || 0, n = sk.supernova || 0, r = sk.radiation || 0, U = GRV_INNER_K[0] * GRV_START_MASS, lo = GRV_INNER_K[v] * GRV_START_MASS * (v >= CAPSTONE_TIER ? GRV_BIG_MASS : 1) / U; // 100% = a second of a tier 0 void's crush (owner, 2026-10-25: "yes" - it was a nova's hit, and tier 0 has none)
    // (owner, 2026-10-25): "0: void only" / "the void crushes" / "always call it a void, and an aura" / "122% to X% depending on the size"
    // (owner, 2026-10-26): "A void crushes for 100% to 300%td over 1s as it grows. Particles radiate as it decays dealing X%td each." - the merge sentence dropped
    return (n ? cap(NUM_WORD[GRV_NOVA_N]) + " novas implode in quick succession, each dealing " + pc(GRV_NOVA_K / U) + " damage and stripping armor worth " + pc(GRV_NOVA_STRIP[n]) + " of its hit; then a" : "A") +
      " void" + (v >= CAPSTONE_TIER ? ", twice as heavy," : "") + " crushes for " + pc(lo) + " to " + ticking(lo * GRV_MASS_MAX, 1 / GRV_TICK, 1) + " as it grows." +
      " Particles radiate as it decays dealing " + pc(GRV_PELLET_K[r] / U) + " damage each." +
      (r ? " An aura around it pulls enemies together and slows them, twice as hard inside the void" + (r >= CAPSTONE_TIER ? " - and as hard all the way out" : "") + "." : ""); /* (no "flings its particles farther": owner, 2026-10-26) */
  },
  // IFR (owner, 2026-10-20): Meteor the fan (Impact: each fan hit splits in two); Hellfire the fire, wider and longer (its capstone: six
  // towers across); Flare the flares - bigger, hotter, longer (its capstone: three a landing)
  ifr(sk) {
    const m = sk.meteor || 0, h = sk.hellfire || 0, f = sk.firaga || 0, n = m >= CAPSTONE_TIER ? IFR_FAN_CAP : IFR_FAN_N, st = IFR_STORE[m];
    // 100% = a meteor's hit (IFR_ROUTE_K0 x st.dmg); a fire flare's hit shrinks as the burst grows (hk), the fire's wall is IFR_RING_HIT_K of it
    const hf = IFR_TICK_K[0] * (f ? IFR_HF_FK : 1) * IFR_FIRE_HK * IFR_HF_HIT_K / Math.sqrt(1 + n) / IFR_ROUTE_K0;
    const fr = Math.max(IFR_BALL_RAD[m] * IFR_FIRE_FLOOR, IFR_FIRE_R[h]), n0 = Math.max(1, Math.round(IFR_FIRE_FLARES * IFR_FIRE_DENS[h] * (fr / IFR_FIRE_FLARE_R0) ** 2)), nf = Math.max(IFR_FIRE_MIN, n0); // as stepIfrFires lights them
    const burn = Math.min(EFFECT_MAX_S, IFR_BURN_S[f]), fl = Math.floor(burn / IFR_TICK_S[f] + 1e-9);
    // (owner, 2026-10-26): "A meteor strikes the target for X%td and bursts into 6 more." / Hellfire "A wall of fire expands from the enemy, dealing X%td
    // and lights Y flares that singe for Z%td each" (no spread distance) / Flare "Meteor impacts light a bright flare that burns..." / Meteor: orbit storage
    return "A meteor strikes the target for " + pc(1) + " damage and bursts into " + NUM_WORD[n] + " more." +
      (st > 1 ? " " + cap(NUM_WORD[st]) + " meteors can be stored in orbit." : "") +
      (h ? " A wall of fire expands from the enemy, dealing " + pc(hf * IFR_RING_HIT_K) + " damage and lights " + nf + " flares that singe for " + pc(hf * n0 / nf) + " damage each." : "") +
      (f ? " Meteor impacts light " + (f >= CAPSTONE_TIER ? "three bright flares that burn" : "a bright flare that burns") + " for " + ticking(IFR_TICK_K0 / IFR_ROUTE_K0 * fl, fl, burn) + "." : "");
  },
};
// the description for a chart (`skills`): every chart tower has a composer - the only prose a chart tower shows
// (the per-tier `desc` / `base` sentences in SKILL_TREES were never shown once these existed, and had drifted; removed 2026-10-14)
// A SHARE OF THE TOWER'S HIT READS "X%td" - tower damage, the card's "Damage (td)" row (owner, 2026-10-26: "use X%td as shorthand for
// tower damage") - a change ("50% less damage") is not a share and keeps its words
const describeTower = (kind, skills) => DESCRIBE[kind](skills || {}).replace(/(\d%) damage/g, "$1td");
