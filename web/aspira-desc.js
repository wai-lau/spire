// /aspira - what a tower DOES, in prose (owner, 2026-10-07): one description
// per tower composed from its chart, each axis swapping a few words in one
// template, so the card's track changes (aspira-sliders.js) read as a single
// small edit from the locked tiers to the pulled ones. Loaded after
// aspira-skills.js (the simulator too, for scripts/aspira-desc-graph.mjs).
const cap = s => s[0].toUpperCase() + s.slice(1);
const ARC_CHARGES = ["", "a charge", "two charges", "three charges", "four charges", "five charges"]; // Capacitance (2026-10-08)
const ARC_KEEP = ["half", "most of", "nearly all of", "all of", "more than", "far more than"], ARC_RETURN = ["", "", "", "once", "twice", "three times"];
const ARC_STRIKES = ["", "", "twin", "three", "four"]; // by STRIKE COUNT (ARC_CONDUCTIVITY[c].s: 1 1 1 2 2 3, capstone 4), not by tier - IV read "three" while it fired two (2026-10-14)
// thematic words where they fit (owner): chill, rime, brittle, moons; rays, refract, pierce; jets, etch.
// ONLY BEHAVIOUR is told here (owner, 2026-10-07): a tier that just moves a number - harder
// hits, a colder or wider aura, faster pulses, a stronger acid, more or bigger puddles -
// changes no words; the card's stat rows show that change (now -> next)
const FRZ_MOONS = ["", " A moon copies it.", " Two moons copy it.", " Three moons copy it.", " Three moons copy it, each with a moonlet.", " Four moons copy it, each with five moonlets."];
const SOL_RAYS = ["A ray", "Two rays", "Three rays", "Four rays", "Five rays", "Eight rays"];
const SOL_REFRACT = ["refracting on to one more enemy", "refracting on to three more enemies", "refracting on to six more enemies", "refracting on to ten more enemies", "refracting on to thirteen more enemies", "refracting through every enemy ahead"];
const ACD_JETS = ["Two", "Three", "Four", "Six", "Seven", "Eight"]; // acidic terms, never heat (owner)
const DESCRIBE = {
  // "Arcs fork on hit, each jump carrying half the hit." -> Conductivity: chain once and / into
  // three / twin; Voltage: most of .. all of (its harder hit is a stat row); Capacitance: the charge sentence (owner's words)
  arc(sk) {
    const c = sk.conductivity || 0, v = sk.voltage || 0, z = sk.capacitance || 0;
    let s = [ARC_STRIKES[ARC_CONDUCTIVITY[c].s], "arcs", c >= 6 ? "chain twice and" : c >= 1 ? "chain once and" : "", "fork", c >= 2 ? "in three" : "", c >= 3 ? "on hit, re-striking " + ARC_RETURN[c] + "; each jump carries" : "on hit; each jump carries", ARC_KEEP[v], "the hit."].filter(Boolean).join(" ");
    if (z) s += " Hits leave " + ARC_CHARGES[ARC_CAPACITANCE[z].n] + (ARC_CAPACITANCE[z].n > 1 ? " that burst" : " that bursts") + " on a later hit, slowing all near.";
    return cap(s);
  },
  // "A chill slows all it holds." -> Temp III: and turns it brittle (its colder, wider aura is
  // stat rows); Rime: the rings of rime; Moons: the moons
  frz(sk) {
    const tp = sk.temp || 0, rm = sk.rime || 0; // Sublimation turns them brittle; Permafrost's frost takes ARMOR - reducing, shattering, decimating (owner, 2026-10-12)
    return "A chill that " + (tp >= 6 ? "makes them deeply brittle and hurts" : tp >= 1 ? "makes them brittle and hurts" : "hurts") + " more the colder they are." + // (owner, 2026-10-12: Sublimation "A chill that makes them brittle, and hurts more the colder they are")
      (rm ? " It leaves behind a frost that seeps into their armor, never leaving." : "") /* Permafrost (owner, 2026-10-12) */ + FRZ_MOONS[sk.moons || 0] + "";
  },
  // "A ray of light, stopping at the first enemy struck; each beam weakens its target's armor for
  // good." (Breach is SOL's own from the start, owner 2026-10-08) -> Focus: two .. six rays, each a
  // full strike; Refraction: refracting on to more; Breach: armor *greatly*, and pierces it so every tower crits it more
  sol(sk) {
    const f = sk.focus || 0, r = sk.refraction || 0, b = sk.breach || 0;
    return SOL_RAYS[f] + " of light" + (f ? ", each a full strike" : "") + ", " + SOL_REFRACT[r] + (b >= 6 ? "; each beam evaporates armor." : "; each beam weakens armor" + (b ? " greatly" : "") + " for good.") + " A breached enemy bursts into shrapnel as it dies." /* (breachShrapnel, aspira-skills.js) */;
  },
  // ACD roles rework (owner, 2026-10-12): Flow = more jets that slow and carry their acid on;
  // Corrosion = stronger acid that eats armor; Contagion = the always-on pools grow, massive at VI
  acd(sk) {
    const c = sk.contagion || 0, f = sk.spray || 0, k = sk.corrosion || 0; // pools from the start (owner, 2026-10-12)
    return ACD_JETS[f] + (f ? " slowing" : "") + " jets of " + "acid" + (k >= 6 ? " that dissolves armor" : k ? " that corrodes armor" : "") + ", dripping " + (c >= 6 ? "massive" : c >= 3 ? "huge" : c ? "larger" : "large") + " pools; each kill leaves one more. " + (c ? "What dies in a pool leaves one of its own. " : "") /* Contagion spreads (aspira-acid.js) */ + (k ? "Eaten armor drops a corrosive goo. " : "") /* the drip (aspira-acid.js) */ + (f ? "A jet keeps its flow on its next enemy." : "A jet starts cold on each new enemy.");
  },
  // CAR (owner, 2026-10-15): Hangar more interceptors (primes); Tether a slowing, pulsing beam to what it fires at (Chain: on to one more enemy); Armament harder, faster,
  // longer sorties (Autopilot: a spent interceptor bursts into pellets)
  car(sk) {
    const h = sk.hangar || 0, l = sk.launch || 0, a = sk.armament || 0;
    return "Launches " + CAR_HANGAR[h] + " interceptors " + (h ? (h + 1) + " at a time" : "one by one") + (h ? ", storing " + Math.ceil(carHoldFrac(h) * CAR_HANGAR[h]) + " of them circling it while there is nothing to hit" /* the COUNT, not a % (owner, 2026-10-16) */ : "") + ". Each flies to an enemy, fires " + /* FOCUS FIRE named (owner, 2026-10-18: "that wingmate thing should be added to description") */
      CAR_AMMO[a] + " volleys" + (CAR_FOCUS[h] ? " (each shot +" + Math.round(CAR_FOCUS[h] * 100) + "% for every other interceptor on the same enemy)" : "") + (l ? ", tethered to its target by a beam that slows it and pulses damage" + (l >= 6 ? ", running on to one more enemy nearby" : "") : "") + ", then " + (a >= 6 ? "bursts into pellets, rebuilt at home." : "flies home to reload.");
  },
  // GRV (owner, 2026-10-15): Supernova a wider nova (Hypernova tears armor away); Void a harder slow (Event Horizon all but
  // stops it); Radiation more pellets (Hawking: a last burst)
  grv(sk) {
    const v = sk.void || 0, n = sk.supernova || 0, r = sk.radiation || 0;
    return (n >= 6 ? "A hypernova that tears armor away" : "A nova") + " leaves a black hole" + (n >= 6 ? " twice as big as usual" : "") + ", its aura as big as the nova's hit. The aura " +
      (v >= 6 ? "holds what a fully grown core catches almost still and strips armor" : "slows and strips armor") + "; its black centre burns whatever it touches, and the hole grows with the nova's hit and that burn. Nearby holes pull together and merge. It radiates " +
      (r >= 6 ? "pellets and bursts as it fades." : "pellets.");
  },
};
// the description for a chart (`skills`): every chart tower has a composer - the only prose a chart tower shows
// (the per-tier `desc` / `base` sentences in SKILL_TREES were never shown once these existed, and had drifted; removed 2026-10-14)
const describeTower = (kind, skills) => DESCRIBE[kind](skills || {});
