// /aspira - what a tower DOES, in prose (owner, 2026-10-07): one description
// per tower composed from its chart, each axis swapping a few words in one
// template, so the card's track changes (aspira-sliders.js) read as a single
// small edit from the locked tiers to the pulled ones. Loaded after
// aspira-skills.js (the simulator too, for scripts/aspira-desc-graph.mjs).
const cap = s => s[0].toUpperCase() + s.slice(1);
// DAMAGE AS A SHARE OF THE TOWER'S (owner, 2026-10-25: "for all damage things we should show it as a percentage of the tower damage"):
// 100% = the tower's MAIN hit - an ARC bolt, a second of FRZ's full aura, a SOL beam, a second of an ACD jet, a second of a tier 0 GRV void's crush, a CRR volley, an
// IFR meteor; and what TICKS reads "X% damage over Y hits in Z seconds" (owner), a steady burn over 1s
const pc = x => Math.round(x * 100) + "%";
const secs = x => +x.toFixed(2) + "s";
const ticking = (x, hits, z) => pc(x) + " damage over " + Math.max(1, Math.round(hits)) + (Math.round(hits) === 1 ? " hit" : " hits") + " in " + secs(z);
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
    return cap(NUM_WORD[2 * sh.s]) + " bolts of lightning" + tree + "." + (sh.v ? " Lightning can strike the same place more than once." : "") +
      (n ? " Hits leave " + (n > 1 ? NUM_WORD[n] + " charges that slow and deal" : "a charge that slows and deals") + " damage when popped." : "");
  },
  // FRZ (owner, 2026-10-22, shorter): "Emits an aura that slows enemies by 67% and hurts more the slower they are. Enemies in the aura take
  // 802% more damage." / Permafrost "Pulses of frost permanently slow by % and break n armor on [every] hit", VI "Rapid pulses" (n: the ACTUAL armor at the
  // current wave - owner: "just put the actual current armor number" - FRZ_RIME_CRACK x armorRefOf, as fully frosted) / Moons: the moons and their satellites (owner: "satellites instead of moonlets") - every number read live
  frz(sk) {
    const tp = sk.temp || 0, rm = sk.rime || 0, mo = sk.moons || 0, pct = x => Math.round(x * 100) + "%", mn = FRZ_MOON_COUNT[mo], sub = FRZ_SUBMOON_N[mo];
    const hits = 1 / FRZ_TEMP_TICK[tp]; // ticks a second; 100% = a second of the full aura (Sublimation's - tier 0 nips FRZ_NIP of it)
    return "Emits an aura that slows enemies by " + pct(FRZ_TEMP_SLOW[tp]) + " and deals " + (tp ? ticking(1, hits, 1) + ", up to " + pc(1 + FRZ_CHILL_K * SLOW_CAP) + " the slower they are." : ticking(FRZ_NIP, hits, 1) + ".") + /* tier 0 slows and nips (owner, 2026-10-25) */
      (FRZ_BRITTLE[tp] > 1 ? " Enemies in the aura take " + pct(FRZ_BRITTLE[tp] - 1) + " more damage." : "") +
      (rm ? " " + (rm >= CAPSTONE_TIER ? "Rapid pulses" : "Pulses") + " of frost bite for " + pc(FRZ_RIME_BITE0 * FRZ_TEMP_TICK[0]) /* a bite: FRZ_RIME_BITE0 full ticks */ + ", pop a shield charge, permanently slow by " + pct(FRZ_RIME[rm]) + " and break up to " + dmgUnits(FRZ_RIME_CRACK[rm] * armorRefOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))) + " armor on every hit." : "") +
      (mn ? " " + (mn > 1 ? cap(NUM_WORD[mn]) + " moons copy" : "A moon copies") + " the aura at " + pc(FRZ_MOON_BY[mo]) + (sub ? ", each with " + NUM_WORD[sub] + " satellite" + (sub > 1 ? "s" : "") + " at " + pc(FRZ_MOON_BY[mo] * FRZ_SUBMOON.k) : "") + "." : "");
  },
  // SOL (owner, 2026-10-22, the rework): the beams on one enemy (SOL_BEAMS), the pass-through (SOL_PASS, by Focus), the reflections (SOL_REFRACTION in a
  // chain, each SOL_HOP x the last; VI three chains) and the armor every hit strips (SOL_BREACH_ARMOR) - every number read live
  sol(sk) {
    const f = sk.focus || 0, r = sk.refraction || 0, b = sk.breach || 0, n = SOL_BEAMS[f], k = SOL_REFRACTION[r], p = Math.round(SOL_HOP[b] * 100) /* the carry is Breach's (2026-10-25) */, TIMES = ["", "once", "twice"];
    const pn = SOL_PASS_N[f], fan = SOL_FAN_BY[r], br = SOL_BREACH_ARMOR[b], sc = SOL_SCORCH_KS[b], scorch = "scorch for " + ticking(sc, SOL_SCORCH_TICKS, SOL_SCORCH_T); // tier 0: one beam, stopping at its enemy (tier redesign 2026-10-24)
    return "Focuses " + (n > 1 ? n + " beams" : "a beam") + " onto an enemy" + (pn === 1 ? ", passing through to one more at " + Math.round(SOL_PASS[f] * 100) + "%" : pn ? ", passing through at " + Math.round(SOL_PASS[f] * 100) + "%" : "") + "." + /* Focus: beams + pass-through (owner, 2026-10-23) */
      (k ? " Reflects " + (TIMES[k] || k + " times") + " for " + (100 - p) + "% less damage" + (k > 1 ? " every reflection" : "") + "." + (fan > 1 ? " First reflection splits " + NUM_WORD[fan] + " ways." : "") : "") /* (owner: st.fan, two chains, VI six) */ +
      (br ? " Beams break " + dmgUnits(br * scaleOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))) /* x the LATE SCALE */ + " armor" + (sc ? " and " + scorch : "") + "." : sc ? " Beams " + scorch + "." : ""); // (owner: "Break X armor and scorch" / "and scorch for ...")
  },

  // ACD (owner, 2026-10-22, shorter): the jets (ACD_LINES), Flow's carry (ACD_FLOW_CARRY), the pools' slow (ACD_POOL_SLOW, Contagion's since the tier redesign),
  // the pools (Contagion: the ray drips them; no kill pools since the tier redesign), Corrosion: the armor FLOOR it eats down to (minus the wave's armor, damage() in aspira-game.js) - read live
  acd(sk) {
    const c = sk.contagion || 0, f = sk.spray || 0, k = sk.corrosion || 0, n = ACD_LINES[f], J = n > 1 ? "Jets" : "The jet", s = n > 1 ? "" : "s"; // tier 0: one ray, no pools (tier redesign 2026-10-24)
    const hits = TOWERS.acd.rate * curveAt("acd", 0).rate, pool = ACD_PUDDLE_CAP * ACD_POOL_HEAT, life = Math.min(POOL_MAX_S, (ACD_CONTAGION[c] || {}).life || 0); // 100% = a second of a jet, before its ramp
    return "Sprays " + (n > 1 ? n + " jets" : "a jet") + " of acid that " + (n > 1 ? "each deal " : "deals ") + ticking(1, hits, 1) + ", doubling every " + secs(ACD_DOUBLE[0]) + " " + (n > 1 ? "they hold" : "it holds") + " an enemy, up to " + pc(ACD_BASE_MAX) + "." + (f ? " Jets retain " + Math.round(ACD_FLOW_CARRY[f] * 100) + "% flow between enemies." : "") +
      (k ? " " + J + " eat" + s + " armor down to " + dmgUnits(-armorRefOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))) + ", dropping goo that strips nearby enemies." : "") /* the FLOOR every enemy's armor stops at, the current wave's (owner, 2026-10-22: "boss armor floor to everything" / "the armor value should say the floor") */ +
      (c ? " " + J + " leave" + s + " slimy acidic pools that slow by " + Math.round(ACD_POOL_SLOW[c] * 100) + "% and burn for up to " + ticking(pool * life, hits * life, life) + "." : ""); // (a pool burns at its tower's tick, x the jet's heat when it dropped - up to ACD_PUDDLE_CAP)
  },
  // CRR (owner, 2026-10-15): Hangar more interceptors (primes); Tether a slowing, pulsing beam to what it fires at (Chain: on to one more enemy); Armament harder, faster,
  // longer sorties (Autopilot: a spent interceptor bursts into pellets)
  car(sk) {
    const h = sk.hangar || 0, l = sk.launch || 0, a = sk.armament || 0;
    const nb = CRR_BOLTS_BY[a], tn = CRR_TETHER_N[l]; // tier 0: one interceptor, one bolt a volley, no tether (tier redesign 2026-10-24)
    return "Launches " + (CRR_HANGAR[h] > 1 ? CRR_HANGAR[h] + " interceptors " + (h ? carSalvoN(h) + " at a time" : "one by one") : "an interceptor") + (h ? ", storing " + Math.ceil(carHoldFrac(h) * CRR_HANGAR[h]) + " of them circling it while there is nothing to hit" /* the COUNT, not a % (owner, 2026-10-16) */ : "") + ". Each flies to an enemy, fires " + /* FOCUS FIRE named (owner, 2026-10-18: "that wingmate thing should be added to description") */
      CRR_AMMO[a] + " volleys" + (nb > 1 ? " of " + NUM_WORD[nb] + " bolts at " + pc(1 / nb) + " each" : "") /* 100% = a volley (CRR_VOLLEY_K x st.dmg), its bolts share it */ + (CRR_FOCUS[h] ? " (each shot +" + Math.round(CRR_FOCUS[h] * 100) + "% for every other interceptor on the same enemy)" : "") + (l ? (tn === 1 ? ", the first one tethered" : ", tethered") + " to its target by a beam that slows it" + (l >= 2 ? " and pulses " + ticking(CRR_TETHER_K0 / CRR_VOLLEY_K / CRR_TETHER_PULSE, 1 / CRR_TETHER_PULSE, 1) : "") + (l >= CAPSTONE_TIER ? ", running on to one more enemy nearby" : "") : "") + ", then " + (a >= CAPSTONE_TIER ? "bursts into " + NUM_WORD[CRR_BURST_N] + " pellets of " + pc(CRR_BURST_K / CRR_VOLLEY_K) + " damage, rebuilt at home." : "flies home to reload.");
  },
  // GRV (rework, owner 2026-10-25): tier 0 a tiny void a shot; Nova three novas before it, faster, stripping armor (Hypernova: the most);
  // Void a bigger void, pellets shed as it decays (Singularity: heavier); Acceleration the aura - pull, slow - and the pellets' damage and
  // range (Event Horizon: the whole aura slows as hard as its inside)
  grv(sk) {
    const v = sk.void || 0, n = sk.supernova || 0, r = sk.radiation || 0, U = GRV_INNER_K[0] * GRV_START_MASS, lo = GRV_INNER_K[v] * GRV_START_MASS * (v >= CAPSTONE_TIER ? GRV_BIG_MASS : 1) / U; // 100% = a second of a tier 0 void's crush (owner, 2026-10-25: "yes" - it was a nova's hit, and tier 0 has none)
    // (owner, 2026-10-25): "0: void only" / "the void crushes" / "always call it a void, and an aura" / "122% to X% depending on the size"
    return (n ? NUM_WORD[GRV_NOVA_N][0].toUpperCase() + NUM_WORD[GRV_NOVA_N].slice(1) + " novas implode in quick succession, each dealing " + pc(GRV_NOVA_K / U) + " damage and stripping armor worth " + pc(GRV_NOVA_STRIP[n]) + " of its hit; then a" : "A") +
      (v ? "" : " tiny") + " void forms" + (v >= CAPSTONE_TIER ? ", twice as heavy," : "") + " and crushes for " + pc(lo) + " to " + ticking(lo * GRV_MASS_MAX, 1 / GRV_TICK, 1) + " as it grows." +
      " As it decays it sheds pellets of " + pc(GRV_PELLET_K[r] / U) + " damage." +
      (r ? " An aura around it pulls enemies together and slows them, twice as hard inside the void" + (r >= CAPSTONE_TIER ? " - and as hard all the way out" : "") + ", and flings its pellets farther." : "") +
      " Nearby voids pull together and merge, shedding what they cannot hold as pellets.";
  },
  // IFR (owner, 2026-10-20): Meteor the fan (Impact: each fan hit splits in two); Hellfire the fire, wider and longer (its capstone: six
  // towers across); Flare the flares - bigger, hotter, longer (its capstone: three a landing)
  ifr(sk) {
    const m = sk.meteor || 0, h = sk.hellfire || 0, f = sk.firaga || 0, n = IFR_FAN[m]; // tier 0: a meteor that just hits (tier redesign 2026-10-24)
    // 100% = a meteor's hit (IFR_ROUTE_K0 x st.dmg); a fire flare's hit shrinks as Meteor fans out (hk), the fire's ring is IFR_RING_HIT_K of it
    const hf = IFR_TICK_K[0] * (f ? IFR_HF_FK : 1) * IFR_FIRE_HK * IFR_HF_HIT_K / Math.sqrt(1 + n) / IFR_ROUTE_K0;
    const burn = Math.min(EFFECT_MAX_S, IFR_BURN_S[f]), fl = Math.floor(burn / IFR_TICK_S[f] + 1e-9);
    const parts = [f ? "a flare burns for " + ticking(IFR_TICK_K0 / IFR_ROUTE_K0 * fl, fl, burn) : "", h ? "a fire " + (h > 1 ? "spreads" + (h >= CAPSTONE_TIER ? " six towers wide" : "") : "rides its enemy") + ", hitting for " + pc(hf * IFR_RING_HIT_K) + " as it grows and lighting many small flares of " + pc(hf) : "",
      n ? NUM_WORD[n] + " meteors burst out all round, each hunting any enemy that comes near" + (m >= CAPSTONE_TIER ? " and splitting in two on a hit" : "") + (f ? "; where each lands a flare burns" + (f >= CAPSTONE_TIER ? " - three of them" : "") : "") : ""].filter(Boolean);
    return "Charges at its centre and launches a meteor that hunts down an enemy." + (parts.length ? " Where it strikes " + parts.join(", and ") + "." : "");
  },
};
// the description for a chart (`skills`): every chart tower has a composer - the only prose a chart tower shows
// (the per-tier `desc` / `base` sentences in SKILL_TREES were never shown once these existed, and had drifted; removed 2026-10-14)
const describeTower = (kind, skills) => DESCRIBE[kind](skills || {});
