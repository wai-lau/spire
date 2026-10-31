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
// ARMOR STRIPS READ AS A SHARE OF THE ARMOR (2026-10-28 armor rework: a strip multiplies armor down, never below 0 - shredArmor,
// aspira-acid.js): a strip of `amt` armor (before the LATE SCALE) takes that share of what is left at the CURRENT wave (wording rule 10)
const descWave = () => Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1);
const shredPc = amt => { const w = descWave(); return pc(Math.min(SHRED_MAX, SHRED_K * amt * scaleOf(w) / armorRefOf(w))); };
// a chart tower's stats at these skills (as scripts/aspira-desc-graph.mjs reads them) - for strips sized by its damage
const descStats = (kind, sk) => towerStats({ id: -1, kind, x: CX, y: CY, lvl: 1 + towerLevel({ kind, skills: sk }), skills: sk });
const NUM_WORD = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
// thematic words where they fit (owner): chill, rime, brittle, moons; rays, refract, pierce; jets, etch.
// ONLY BEHAVIOUR is told here (owner, 2026-10-07): a tier that just moves a number - harder
// hits, a colder or wider aura, faster pulses, a stronger acid, more or bigger puddles -
// changes no words; the card's stat rows show that change (now -> next)
const DESCRIBE = {
  // "Arcs fork on hit, each jump carrying half the hit." -> Conductivity: chain once and / into
  // three / twin; Voltage: most of .. all of (its harder hit is a stat row); Capacitance: the charge sentence (owner's words)
  arc(sk) {
    // THE ARC REDESIGN (owner, 2026-10-29): one bolt, a chain (Voltage: its length), one fork at the strike from Voltage ARC_FORK_FROM,
    // Amperage the carry, Resistance a slow and an armor break on every hit - every number read live (Visual polishes the prose)
    const c = sk.conductivity || 0, v = sk.voltage || 0, z = sk.capacitance || 0, TIMES = ["", " once", " twice"];
    const fl = ARC_AMP_FALL[c], d = Math.round(Math.abs(fl - 1) * 100), j = ARC_VOLT_JUMPS[v], times = TIMES[j] || " " + NUM_WORD[j] + " times";
    const pc = (d === 0 ? "full damage" : d + "% " + (fl < 1 ? "less" : "more") + " damage") + " every chain";
    return "A bolt of lightning that " + (v >= ARC_FORK_FROM ? "forks once and " : "") + "chains" + times + " for " + pc + "." +
      (z ? " Hits slow by " + Math.round(ARC_RES_SLOW[z] * 100) + "% and break " + Math.round(ARC_RES_STRIP[z] * 100) + "% of armor." : "");
  },

  // FRZ (owner, 2026-10-22, shorter): "Emits an aura that slows enemies by 67% and hurts more the slower they are. Enemies in the aura take
  // 802% more damage." / Permafrost "Pulses of frost permanently slow by % and break n armor on [every] hit", VI "Rapid pulses" (n: since the 2026-10-28
  // armor rework the share of its armor a fully frosted enemy loses, FRZ_RIME_CRACK) / Moons: the moons and their satellites (owner: "satellites instead of moonlets") - every number read live
  frz(sk) {
    const tp = sk.temp || 0, rm = sk.rime || 0, mo = sk.moons || 0, pct = x => Math.round(x * 100) + "%", mn = FRZ_MOON_COUNT[mo], sub = FRZ_SUBMOON_N[mo];
    const hits = 1 / FRZ_TEMP_TICK[tp]; // ticks a second; 100% = a second of the full aura (Sublimation's - tier 0 nips FRZ_NIP of it)
    return "Emits aura that slows enemies by " /* owner's words, 2026-10-26 */ + pct(FRZ_TEMP_SLOW[tp]) + " and deals " + (tp ? ticking(1, hits, 1) + ", up to " + pc(1 + FRZ_CHILL_K * SLOW_CAP) + " the slower they are." : ticking(FRZ_NIP, hits, 1) + ".") + /* tier 0 slows and nips (owner, 2026-10-25) */
      (FRZ_BRITTLE[tp] > 1 ? " Enemies in the aura take " + pct(FRZ_BRITTLE[tp] - 1) + " more damage." : "") +
      (rm ? " " + (rm >= CAPSTONE_TIER ? "Rapid pulses" : "Pulses") + " of frost bite for " + pc(FRZ_RIME_BITE0 * FRZ_TEMP_TICK[0]) + " damage" /* a bite: FRZ_RIME_BITE0 full ticks */ + ", permanently slow by " + pct(FRZ_RIME[rm]) + ((ac => ac !== "0%" ? " and strip up to " + ac + " of armor" : "")(pc(Math.min(1, FRZ_RIME_CRACK[rm])))) /* nothing it does not do yet (owner, 2026-10-26) */ + " every hit." : "") +
      (mn ? " " + (mn > 1 ? cap(NUM_WORD[mn]) + " moons copy" : "A moon copies") + " the aura at " + pc(FRZ_MOON_BY[mo]) + (sub ? ", each with " + NUM_WORD[sub] + " satellite" + (sub > 1 ? "s" : "") + " at " + pc(FRZ_MOON_BY[mo] * FRZ_SUBMOON.k) : "") + "." : "");
  },
  // SOL (owner, 2026-10-26): one beam, straight through every hit and splitting at each to SOL_SPLIT more (Diffraction), each hit SOL_HOP
  // (Diffraction) x the one before; the armor every hit strips (SOL_BREACH_ARMOR, Breach); the stacking burn (SOL_SCORCH_N ticks, Scorch) - read live
  sol(sk) {
    const f = sk.focus || 0, r = sk.refraction || 0, b = sk.breach || 0, k = SOL_SPLIT[r], p = Math.round(SOL_HOP[r] * 100);
    const br = SOL_BREACH_ARMOR[b], sc = SOL_SCORCH_N[f];
    // (owner, 2026-10-26): "A solar ray refracts within a light prism..." / Diffraction "A solar ray diffracts into two rays on every hit..."
    return "A solar ray " + (!r ? "strikes the first enemy in its path." /* tier 0: the bare beam - no prism, no split (owner, 2026-10-28) */ : (k > 1 ? "diffracts into " + NUM_WORD[k] + " rays on every hit within a light prism" : k ? "refracts within a light prism" : "strikes the first enemy in its path, then refracts within a light prism") +
      (p >= 100 ? " without losing intensity." : ", losing " + (100 - p) + "% intensity" + (k > 1 ? "." : k ? " every hit." : " every bounce."))) + /* no split (Diffraction I, 2026-10-31): one enemy struck, the rest of the line only bounces */
      (br ? " Every hit strips " + pc(br) + " of armor." : "") +
      (SOL_PAR_N[b] ? " " + cap(NUM_WORD[SOL_PAR_N[b]]) + " parallel ray" + (SOL_PAR_N[b] > 1 ? "s pass" : " passes") + " through every enemy in line for " + pc(SOL_PAR_K) + "td." : "") + /* Breach's parallel beams (owner, 2026-10-28) */
      (sc ? " The light prism and hits scorch the enemy for " + ticking(SOL_SCORCH_TOTAL, sc, sc * SOL_SCORCH_Q) + ", each burn slowing it " + pc(SOL_SCORCH_SLOW) + " while it burns (shields block the slow)." : ""); /* the slow: SOL_SCORCH_SLOW a stack (2026-10-31) */ /* stacking unsaid; the prism's stacks are the stat block's */
  },

  // ACD (owner, 2026-10-22, shorter): the jets (ACD_LINES), Flow's carry (ACD_FLOW_CARRY), the pools' slow (ACD_POOL_SLOW, Contagion's since the tier redesign),
  // the pools (Contagion: the ray drips them; no kill pools since the tier redesign), Corrosion: the share of armor a full-ramp tick strips at the current wave (shredPc) - read live
  acd(sk) {
    const c = sk.contagion || 0, f = sk.spray || 0, k = sk.corrosion || 0, n = ACD_LINES[f], J = n > 1 ? "Jets" : "The jet", s = n > 1 ? "" : "s"; // tier 0: one ray, no pools (tier redesign 2026-10-24)
    const hits = TOWERS.acd.rate * curveAt("acd", 0).rate, pool = ACD_PUDDLE_CAP * ACD_POOL_HEAT, life = Math.min(POOL_MAX_S, (ACD_CONTAGION[c] || {}).life || 0); // 100% = a second of a jet, before its ramp
    return (n > 1 ? cap(NUM_WORD[n]) + " jets of acid each deal " : "A jet of acid deals ") + ticking(1, hits, 1) + ", doubling every " + secs(ACD_DOUBLE[0]) + " " + (n > 1 ? "they stay" : "it stays") + " on target, up to " + pc(ACD_BASE_MAX) + "." /* owner's words, 2026-10-26 */ + (f ? " Jets retain " + Math.round(ACD_FLOW_CARRY[f] * 100) + "% flow between enemies." : "") +
      (k ? " " + (n > 1 ? "The jets dissolve" : "The jet dissolves") + " up to " + (st => pc(st.corrode))(descStats("acd", sk)) + " of armor a tick, " /* a full-ramp tick (2026-10-28 armor rework; was "armor worth X% of its damage") */ + pc(DRIP_TAKE * (1 + DRIP_TIER_K * TIER_LEVEL[k])) + " of the armor lost is left behind as a corrosive goo doing the same." : "") /* owner's words, 2026-10-26 */ +
      (c ? " " + J + " leave" + s + " slimy acidic pools that " + (ACD_POOL_SLOW[c] ? "slow by " + Math.round(ACD_POOL_SLOW[c] * 100) + "% and " : "") + "burn for up to " + ticking(pool * life, hits * life, life) + "." : ""); // (a pool burns at its tower's tick, x the jet's heat when it dropped - up to ACD_PUDDLE_CAP)
  },
  // CRR (owner, 2026-10-15): Hangar more interceptors (primes); Tether a slowing, pulsing beam to what it fires at (Chain: on to one more enemy); Armament harder, faster,
  // longer sorties (Autopilot: a spent interceptor bursts into pellets)
  crr(sk) {
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
    return (n ? cap(NUM_WORD[GRV_NOVA_N]) + " novas implode in quick succession, each dealing " + pc(GRV_NOVA_K / U) + " damage" + (a => a !== "0%" ? " and stripping " + a + " of armor" : "")((st => st.strip ? pc(st.strip) : "0%")(descStats("grv", sk))) + "; then a" : "A") +
      " void" + (v >= CAPSTONE_TIER ? ", twice as heavy," : "") + " crushes for " + pc(lo) + " to " + ticking(lo * GRV_MASS_MAX, 1 / GRV_TICK, 1) + " as it grows." +
      " Particles radiate as it decays dealing " + pc(GRV_PELLET_K[r] / U) + " damage each." +
      (r ? " An aura around it pulls enemies together and slows them" + (r >= CAPSTONE_TIER ? " twice as hard." : ", twice as hard inside the void.") : ""); /* V (owner, 2026-10-26): "An aura... pulls enemies together and slows them twice as hard." */ /* (no "flings its particles farther": owner, 2026-10-26) */
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
