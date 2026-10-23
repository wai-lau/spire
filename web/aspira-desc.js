// /aspira - what a tower DOES, in prose (owner, 2026-10-07): one description
// per tower composed from its chart, each axis swapping a few words in one
// template, so the card's track changes (aspira-sliders.js) read as a single
// small edit from the locked tiers to the pulled ones. Loaded after
// aspira-skills.js (the simulator too, for scripts/aspira-desc-graph.mjs).
const cap = s => s[0].toUpperCase() + s.slice(1);
const NUM_WORD = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const ARC_LAYERS = ["", "", " twice", " three times", " four times", " five times"]; // fork layers (ARC_CONDUCTIVITY[c].j); one layer says nothing
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
    return (sh.s > 1 ? cap(NUM_WORD[sh.s]) + " bolts of lightning, each forking " : "A bolt of lightning, forking ") + sh.f + " ways" + ARC_LAYERS[sh.j] + ", dealing " +
      Math.round(ARC_VOLTAGE_FALL[v] * 100) + "% damage each fork." + (sh.v ? " Lightning can strike the same place more than once." : "") +
      (n ? " Hits leave " + (n > 1 ? NUM_WORD[n] + " charges that slow and deal" : "a charge that slows and deals") + " damage when popped." : "");
  },
  // FRZ (owner, 2026-10-22, shorter): "Emits an aura that slows enemies by 67% and hurts more the slower they are. Enemies in the aura take
  // 802% more damage." / Permafrost "Pulses of frost permanently slow by % and break n armor on [every] hit", VI "Rapid pulses" (n: the ACTUAL armor at the
  // current wave - owner: "just put the actual current armor number" - FRZ_RIME_CRACK x armorRefOf, as fully frosted) / Moons: the moons and their satellites (owner: "satellites instead of moonlets") - every number read live
  frz(sk) {
    const tp = sk.temp || 0, rm = sk.rime || 0, mo = sk.moons || 0, pct = x => Math.round(x * 100) + "%", mn = FRZ_MOON_COUNT[mo], sub = FRZ_SUBMOON_N[mo];
    return "Emits an aura that slows enemies by " + pct(FRZ_TEMP_SLOW[tp]) + " and hurts more the slower they are." +
      (FRZ_BRITTLE[tp] > 1 ? " Enemies in the aura take " + pct(FRZ_BRITTLE[tp] - 1) + " more damage." : "") +
      (rm ? " " + (rm >= CAPSTONE_TIER ? "Rapid pulses" : "Pulses") + " of frost permanently slow by " + pct(FRZ_RIME[rm]) + " and break up to " + dmgUnits(FRZ_RIME_CRACK[rm] * armorRefOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))) + " armor on every hit." : "") +
      (mn ? " " + (mn > 1 ? cap(NUM_WORD[mn]) + " moons copy" : "A moon copies") + " the aura" + (sub ? ", each with " + NUM_WORD[sub] + " satellite" + (sub > 1 ? "s" : "") : "") + "." : "");
  },
  // SOL (owner, 2026-10-22, the rework): the beams on one enemy (SOL_BEAMS), the pass-through (SOL_PASS, by Focus), the reflections (SOL_REFRACTION in a
  // chain, each SOL_HOP x the last; VI three chains) and the armor every hit strips (SOL_BREACH_ARMOR) - every number read live
  sol(sk) {
    const f = sk.focus || 0, r = sk.refraction || 0, b = sk.breach || 0, n = SOL_BEAMS[f], k = SOL_REFRACTION[r], p = Math.round(SOL_HOP[r] * 100), TIMES = ["", "once", "twice"];
    return "Focuses " + n + " piercing beam" + (n > 1 ? "s" : "") + " onto an enemy, passing through at " + Math.round(SOL_PASS[f] * 100) + "%. " + /* Focus: beams + pass-through (owner, 2026-10-23) */
      "Reflects " + (TIMES[k] || k + " times") + " for " + (100 - p) + "% less damage" + (k > 1 ? " every reflection" : "") + "." + (r >= CAPSTONE_TIER ? " First reflection splits six ways." : " First reflection splits two ways.") /* (owner: st.fan, two chains, VI six) */ + " Beams break " + dmgUnits(SOL_BREACH_ARMOR[b] * scaleOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))) /* x the LATE SCALE */ + " armor and scorch for " + Math.round(SOL_SCORCH[b] * 100) + "% over " + SOL_SCORCH_T + "s."; // (owner: "Break X armor and scorch" / "and scorch for ...")
  },

  // ACD (owner, 2026-10-22, shorter): the jets (ACD_LINES), Flow's carry (ACD_FLOW_CARRY) and its slow - on the POOLS now (ACD_FLOW_SLOW),
  // the pools (Contagion: kills leave them too), Corrosion: the armor FLOOR it eats down to (minus the wave's armor, damage() in aspira-game.js) - read live
  acd(sk) {
    const c = sk.contagion || 0, f = sk.spray || 0, k = sk.corrosion || 0, n = ACD_LINES[f];
    return "Sprays " + n + " jets of acid that burn hotter the longer they hold an enemy." + (f ? " Jets retain " + Math.round(ACD_FLOW_CARRY[f] * 100) + "% flow between enemies." : "") +
      (k ? " Jets eat armor down to " + dmgUnits(-armorRefOf(Math.max(1, (typeof G !== "undefined" && G && G.wave) || 1))) + ", dropping goo that strips nearby enemies." : "") /* the FLOOR every enemy's armor stops at, the current wave's (owner, 2026-10-22: "boss armor floor to everything" / "the armor value should say the floor") */ +
      " " + (c ? "Jets and kills" : "Jets") + " leave " + (f ? "slimy acidic pools that slow by " + Math.round(ACD_FLOW_SLOW[f] * 100) + "%" : "acidic pools behind") + " for " + Math.min(POOL_MAX_S, ACD_CONTAGION[c].life) + "s.";
  },
  // CRR (owner, 2026-10-15): Hangar more interceptors (primes); Tether a slowing, pulsing beam to what it fires at (Chain: on to one more enemy); Armament harder, faster,
  // longer sorties (Autopilot: a spent interceptor bursts into pellets)
  car(sk) {
    const h = sk.hangar || 0, l = sk.launch || 0, a = sk.armament || 0;
    return "Launches " + CRR_HANGAR[h] + " interceptors " + (h ? carSalvoN(h) + " at a time" : "one by one") + (h ? ", storing " + Math.ceil(carHoldFrac(h) * CRR_HANGAR[h]) + " of them circling it while there is nothing to hit" /* the COUNT, not a % (owner, 2026-10-16) */ : "") + ". Each flies to an enemy, fires " + /* FOCUS FIRE named (owner, 2026-10-18: "that wingmate thing should be added to description") */
      CRR_AMMO[a] + " volleys" + (CRR_FOCUS[h] ? " (each shot +" + Math.round(CRR_FOCUS[h] * 100) + "% for every other interceptor on the same enemy)" : "") + (l ? ", tethered to its target by a beam that slows it and pulses damage" + (l >= CAPSTONE_TIER ? ", running on to one more enemy nearby" : "") : "") + ", then " + (a >= CAPSTONE_TIER ? "bursts into pellets, rebuilt at home." : "flies home to reload.");
  },
  // GRV (owner, 2026-10-15): Supernova a wider nova (Hypernova tears armor away); Void a harder slow (Event Horizon all but
  // stops it); Radiation more pellets (Hawking: a last burst)
  grv(sk) {
    const v = sk.void || 0, n = sk.supernova || 0, r = sk.radiation || 0;
    return (n >= CAPSTONE_TIER ? "Three hypernovas that tear armor away, each where it catches the most, leave" : "Three novas, each where it catches the most, leave") + " a black hole" + (n >= CAPSTONE_TIER ? " twice as big as usual" : "") + ", its aura as big as the nova's hit. The aura " +
      (v >= CAPSTONE_TIER ? "holds what a fully grown core catches almost still and strips armor" : "slows and strips armor") + "; its black centre burns whatever it touches, and the hole grows with the nova's hit and that burn. Nearby holes pull together and merge. It radiates " +
      (r >= CAPSTONE_TIER ? "pellets and bursts as it fades." : "pellets.");
  },
  // IFR (owner, 2026-10-20): Meteor the fan (Impact: each fan hit splits in two); Hellfire the fire, wider and longer (its capstone: six
  // towers across); Flare the flares - bigger, hotter, longer (its capstone: three a landing)
  ifr(sk) {
    const m = sk.meteor || 0, h = sk.hellfire || 0, f = sk.firaga || 0;
    return "Charges at its centre and launches a meteor that hunts down an enemy. Where it strikes a flare burns, a fire " + (h ? "spreads" + (h >= CAPSTONE_TIER ? " six towers wide" : "") : "flickers") +
      ", lighting many small flares as it grows, and " + IFR_FAN[m] + " meteors burst out all round, each hunting any enemy that comes near" + (m >= CAPSTONE_TIER ? " and splitting in two on a hit" : "") +
      "; where each lands a flare burns" + (f >= CAPSTONE_TIER ? " - three of them." : ".");
  },


};
// the description for a chart (`skills`): every chart tower has a composer - the only prose a chart tower shows
// (the per-tier `desc` / `base` sentences in SKILL_TREES were never shown once these existed, and had drifted; removed 2026-10-14)
const describeTower = (kind, skills) => DESCRIBE[kind](skills || {});
