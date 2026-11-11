// /aspira - the tower card's STAT ROWS (split from aspira-ui.js at its 500-line cap,
// 2026-10-08): each kind's own rows (SPEC) and one "now -> next" row (statRow), its
// change painted red when it is for the worse. UI only; loaded before aspira-ui.js and
// called at run time (aspira-sliders.js cardStats, aspira-chooser.js).

// THE LATE SCALE (aspira-waves.js): every damage / HP / armor number on the card is shown x the CURRENT wave's scale - what it does to
// the enemies on the board now (raw tower numbers ran to millions late; owner, 2026-10-22: "no number past 9999")
// TOWER DAMAGE, td (owner, 2026-10-26: "Damage (td) should always be under tower! / Anything that deals a percentage of td should use that
// number instead like 100%td 130%td"): the hit the card's sentence counts as 100% (aspira-desc.js) - a bolt or beam (ARC, SOL, CRR), a meteor
// (IFR), a second of the full aura (FRZ), a second of a jet (ACD), a second of a tier 0 void's crush (GRV); every damage row a share of it
// THE td UNIT (owner, 2026-10-31: "Nothing should ever be above like 800%" / "Maybe do like 1/8xtd to 8x or something"): a tower whose
// ramp or crush runs past 8x its hit counts its td TD_UNIT x bigger - ACD's ramp then opens at 1/8 td and tops at 8 td (ACD_BASE_MAX 64 / 8),
// FRZ's chill and GRV's crush land under 8 td too. The LABEL only: the damage dealt is unchanged. TD_UNIT itself lives in aspira-desc.js,
// which the simulator loads too (the description graph runs there: with it here, the graph read ACD x8, FRZ x3, GRV x4 too high - 2026-11-06)
const tdOf = (kind, st, sk = statSk) => (TD_UNIT[kind] || 1) * tdBase(kind, st) * (typeof cardMain === "function" ? cardMain(kind, sk || {}) : 1); // x the main hit's share: it reads 100%td (cardMain, aspira-desc.js)
let statSk = null; // the skills of the tower whose SPEC rows are being built (SPEC, below)
const tdBase = (kind, st) => kind === "ifr" ? st.dmg * IFR_ROUTE_K0 : kind === "frz" ? (st.biteDmg || st.dmg) / FRZ_TEMP_TICK[0] : kind === "grv" ? st.dmg * GRV_INNER_K[0] * GRV_START_MASS : st.dmg;
const tdP = (kind, st, v) => { const T = tdOf(kind, st), r = T > 0 ? v / T : 0; return T > 0 ? +(100 * r).toFixed(r < 0.1 ? 1 : 0) + "%td" : "—"; };
const dmgW = v => dmgUnits(v * (typeof scaleOf === "function" && typeof G !== "undefined" && G ? scaleOf(Math.max(1, G.wave || 1)) : 1));
// SOL's form, in one short line for the popup (the same row at every level, so
// the next-level preview lines up)
function rayForm(st) {
  if (st.skill) return "—"; // a chart SOL: its beams are the Beams row (this read "3 beams" twice, 2026-10-14)
  if (st.critScale) return "crit chance ×" + st.critScale;
  if (st.ricochet) return "chains to " + st.ricochet;
  if (st.smash) return "kill bursts " + Math.round(st.smash.frac * 100) + "% r" + st.smash.r;
  if (st.beams > 2) return st.beams + " beams";
  return "—";
}
// The popup's RIGHT column (owner): stats only that tower type has, as
// [label, value] rows, computed for a level so the next one can be previewed.
const SPEC = {
  arc: st => {
    // THE ARC REDESIGN (owner, 2026-10-29): one strike, a chain of st.layers jumps, forking once at the strike from Voltage ARC_FORK_FROM
    // (branchFrom: each of the two chains runs the whole chain), Shock a slow and a strip on every hit; no charges, no bursts
    const forks = st.fork ? 2 : st.branch, hits = 1 + forks * st.layers;
    // ONE NUMBER A ROW (owner, 2026-10-26: "for the stats only have 1 number per line"): every compound row split
    return [["Hits", hits + " a bolt"], ["Forks", st.fork ? "once" : "—"], ["Arc dmg", tdP("arc", st, st.dmg * st.arcFall)],
      ...(st.resSlow ? [["Res slow", Math.round(st.resSlow * 100) + "%"], ["Res lasts", STAT_SLOW_T + "s"]] : []) /* only while Shock slows: none since the ARC brief (7.1.16), so no dead "—" rows */,
      ["Shocked", st.shockAmp ? "+" + Math.round(st.shockAmp * 100) + "% from every tower" : "—"], // (every tower since 7.11.0; owner, 2026-11-09: "shock should increase damage from all towers not just shock")
      ["Armor strip", st.resStrip ? Math.round(st.resStrip * 100) + "% of armor" : "—"],
      ...(st.skill ? [["Jumps", st.layers ? st.layers : "—"], ["Jump reach", st.layers ? Math.round(arcJumpR(st)) : "—"]] /* "—" at tier 0: no chain (tier redesign) */
        : [["Arc hop", Math.round(st.arcRange)], ["Reach", Math.round(chainReach(st))]]),
      ["Delay", hopDelay(st).toFixed(2) + "s"]];
  },
  frz: st => st.skill ? [["Aura slow", Math.round(st.aura * 100) + "%"], ["Aura tick", tdP("frz", st, st.dmg)], ["Ticks", +st.rate.toFixed(1) + "/s"] /* a TICK and how often (owner, 2026-10-25: "in stats show damage per tick and ticks per second") */, ["Damage taken", st.brittle > 1 ? "+" + Math.round((st.brittle - 1) * 100) + "%" : "—"] /* (was "Brittle": the axis took the name, 2026-11-01; the axis is Fracture since 2026-11-06) */,
    ["Pulse every", st.rime ? +(+st.rimeEvery).toFixed(2) + "s" : "—"], ["Pulse slow", st.rime ? "+" + Math.round(st.rime * 1000) / 10 + "%" : "—"] /* names WHAT it adds (owner, 2026-10-14: "+22% ... but what +22%"); tenths, since halving made 3.5 and 8.5 */, ["Frost armor", st.rimeCrack ? "−" + pc(Math.min(1, st.rimeCrack)) : "—"] /* at FULL frost (less frost, that share): frostArmor, a share of the enemy's armor (damage(); 2026-10-28 armor rework) */, ["Full frost", st.rime ? Math.round(FRZ_RIME_FULL * 100) + "% slow, then spreads" : "—"], ["Cold bite", st.chill ? "+" + FRZ_CHILL_K + "% dmg per 1% slow" : "—"] /* tier 0 nips flat; the bite is Fracture's (tier redesign) */ /* frzBite */ /* the prose's "seeps into their armor": frostArmor x an armored enemy's armor, by frost share (damage()) */, ["Moons", st.moonN ? st.moonN + " at " + Math.round(st.moonK * 100) + "%" + (st.subN ? " +" + st.subN + " small each" : "") : "—"]]
    : [["Slow", Math.round(st.slow * 100) + "%"], ["Lasts", st.permafrost ? "forever" : SLOW_TIME.toFixed(1) + "s"],
    ["Targets", st.all ? "all" : st.targets],
    ["Shatter", st.shatter ? dmgW(st.dmg * st.shatter.mul) + " r" + st.shatter.r : "—"],
    ["Extra", st.frostbite ? "blast slows " + st.frostbite + "s" : st.brittle ? "+" + Math.round((st.brittle - 1) * 100) + "% taken"
      : st.chillStop ? "95% for " + st.chillStop + "s" : "—"]],
  // acidic terms, never heat (owner, 2026-10-07): the acid CORRODES, BUILDS on its target, PEAKS
  acd: (st, t) => [["Jet tick", tdP("acd", st, st.dmg / st.rate)], ["Ticks", +st.rate.toFixed(1) + "/s"] /* per tick (owner, 2026-10-25) */, ["Doubles every", st.double + "s"],
    ["Peak tick", tdP("acd", st, st.dmg * st.cap / st.rate)], ["Jets", st.allInRange ? "all in range" : st.targets],
    ["Circle", st.plagueR ? Math.round(st.plagueR) + (st.bloom ? "→" + Math.round(st.plagueR * st.bloom) : "") : "—"],
    ["Armor", st.corrode ? "−" + pc(st.corrode) + " a tick" : "—"] /* a tick strips ACD_CORRODE of its damage, as a share of the armor now (shredPc, aspira-desc.js) */, /* no "Shields −1 / hit" rows: one charge a hit is the default, unsaid (owner, 2026-10-20) */
    ["Goo", st.corrode ? Math.round(ACD_GOO_STRIP[skillOf(t, "corrosion")] * 100) + "% armor, " + Math.round(ACD_GOO_DMG[skillOf(t, "corrosion")] * 100) + "%td" : "—"], ["Goo pull", st.corrode ? ACD_DRIP_PULL[skillOf(t, "corrosion")] : "—"] /* dripDrop / stepDrips: strips and burns that much */,
    // puddles one number a row (owner, 2026-10-07: "1 / 1.4s · 1.5s · r20" was unreadable), so each
    // reads now -> next on its own and its colour judges that one number
    // always the same rows ("—" with no puddles), so a pull from Spill 0 lines up now -> next
    ["Pool burn", st.contagion ? Math.round(st.contagionHeat * 100) + "% of jet" : "—"], ["Drips every", st.contagion ? st.contagion.every + "s" : "—"],
    ["Pool size", st.contagion ? st.contagion.r : "—"], ["Pool lasts", st.contagion ? st.contagion.life + "s" : "—"], ["Carry", st.carry ? Math.round(st.carry * 100) + "%" : "—"], ["Pool slow", st.burnSlow ? Math.round(st.burnSlow * 100) + "%" : "—"]],
  // CRR (aspira-crr.js): Damage + Rate are a SHOT's and an interceptor's
  crr: st => [["Interceptors", st.wing], ["Flight", Math.round(st.speed) + " out and home"], ["Salvo", st.bolts + " bolts at once"], ["Volley every", (CRR_VOLLEY_K * st.bolts / st.rate).toFixed(2) + "s"], ["Volleys", st.ammo + " a sortie"], ["Tether slow", st.tSlow ? Math.round(st.tSlow * 100) + "%" : "—"], ["Tether amp", st.tAmp ? "+" + Math.round(st.tAmp * 100) + "% taken / tether" : "—"], ["Chain", st.tChain ? "1 more" : "—"],
    ["Pellets", st.autopilot ? CRR_BURST_N + " a burst" : "—"], ["Pellet hit", st.autopilot ? tdP("crr", st, st.dmg * CRR_BURST_K) : "—"]] /* no Shields row: any damage pops one charge, unsaid (owner, 2026-10-26) */,
  // IFR (aspira-ifrit.js, axes redone 2026-10-20): Damage is the base every hit multiplies (each axis by its own K), Rate meteors a second
  ifr: st => [["Burst", st.fan + " meteors"], ["Stored", (st.store || 1) + " in orbit"] /* (fire, flares, fan "—" until bought - tier redesign 2026-10-24) */, ["Hit", tdP("ifr", st, st.dmg * st.routeK)], ["Charge", +st.chargeS.toFixed(2) + "s"], ["Ball speed", st.ballV], ["Meteor", "r" + st.ballR],
    ["Fire", st.fire ? "r" + Math.round(st.fireR) : "—"], ["Fire speed", st.fire ? st.fireV + "/s" : "—"], ["Fire flares", st.fireFlares ? Math.max(IFR_FIRE_MIN, Math.round(IFR_FIRE_FLARES * st.fireDens * (st.fireR / IFR_FIRE_FLARE_R0) ** 2)) : "—"] /* as many as it lights - at least IFR_FIRE_MIN, its hits split among them (the sentence's count) */,
    ["Flare length", st.flares ? (st.triple ? "≤" + IFR_V_SPAN / 2 : Math.round(st.beamL)) : "—"], ["Flare width", st.flares ? Math.round(st.beamW) : "—"], ["Flare tick", st.flares ? tdP("ifr", st, st.dmg * st.flareK * IFR_MAIN_FLARE_K) : "—"] /* the main meteor's flare, x IFR_MAIN_FLARE_K (7.7.6) - the sentence's */, ["Flare ticks", st.flares ? +(1 / st.tickS).toFixed(1) + "/s" : "—"], ["Flare lasts", st.flares ? +st.burnS.toFixed(2) + "s" : "—"],
    ["Flare capstone", st.triple ? "1 flare + a ring" : "—"]],
  // GRV (aspira-grv.js; rework 2026-10-25): at STARTING mass - a void grows up to x GRV_MASS_MAX with the damage it deals
  grv: st => [/* (no "Novas" row: one a shot at every tier since 2026-11-06 - a constant, said by the sentence, "A nova implodes") */ ["Nova hit", st.novaN ? tdP("grv", st, st.dmg * GRV_NOVA_K * (st.novaMul || 1)) : "—"], ["Nova reach", st.novaN ? st.novaR : "—"], ["Armor strip", st.strip ? "−" + pc(st.strip) + " / nova" : "—"] /* a SHARE of the armor left (GRV_NOVA_STRIP, compounded over novaMul - aspira-grv.js), as the sentence reads it; shredPc took it for a flat amount (2026-11-06) */,
    ["Void", "r" + Math.round(st.auraR * Math.sqrt(st.startM))], ["Grows", "×" + GRV_MASS_MAX + " by hitting"], ["Lasts", GRV_LIFE + "s unfed"] /* plain words (owner, 2026-10-16: "no one knows what mass 2 means"); THREE rows, so now -> next repeats no sentence (owner, 2026-10-26: "move sections so they fit on card") */,
    ["Crush tick", tdP("grv", st, st.hdmg * st.innerK * GRV_TICK)], ["Crush ticks", +(1 / GRV_TICK).toFixed(1) + "/s"] /* the void's crush, at starting mass (owner, 2026-10-25) */,
    ["Particles", st.pellets ? st.pellets + " / mass" : "—"], ["Particle hit", st.pellets ? tdP("grv", st, st.dmg * st.pelletK) : "—"], ["Particle reach", st.pellets ? "×" + st.pelReach + " void" : "—"],
    ["Aura size", st.auraOn ? "×" + st.accR + " void" : "—"] /* (the aura "—" until Gravity Well buys it) */,
    ["Aura slow", st.auraOn ? Math.round(Math.min(GRV_SLOW_MAX, st.slow) * 100) + "%" : "—"], ["Inner slow", st.auraOn ? Math.round(Math.min(GRV_CORE_MAX, Math.min(GRV_SLOW_MAX, st.slow) * GRV_CORE_MUL) * 100) + "%" + (st.horizon ? " all over" : "") : "—"]]  /* (no "Shields -1 / hit" row: every hit pops one - owner, 2026-10-16: "isn't this just default behaviour? maybe no need to list") */,
  sol: (st, t) => solTrackSpec(st, t), // the tracking beam's rows (below; the old shot's Locks / Prism / Parallel went with it, 2026-11-05)
};

// One stat row: "now" alone at max level, "now -> next" when an upgrade
// would change it, so the payoff of the upgrade is visible before buying it.
// A change for the WORSE shows red and bold (owner): compared on the last
// number in each value, lower-is-better for the rows in LOWER_BETTER, and a
// number giving way to "—" (a stat the upgrade removes) counts as worse.
const LOWER_BETTER = new Set(["Delay", "Doubles every", "Drips every", "Pulse every"]); // (Drips every: a shorter wait is better)
// the RAW number, its unit read (owner, 2026-11-09: "900 -> 1.1k damage should show as green not red" - "1.1k" read as 1.1): thousands commas
// dropped, a k / M / B suffix multiplied in
const NUM_UNIT = { k: 1e3, K: 1e3, m: 1e6, M: 1e6, b: 1e9, B: 1e9 };
function lastNum(v) { const m = [...String(v).matchAll(/(\d[\d,]*(?:\.\d+)?)(?:([kKmMbB])(?![a-zA-Z]))?/g)]; if (!m.length) return NaN; const [, n, u] = m[m.length - 1]; return Number(n.replace(/,/g, "")) * (NUM_UNIT[u] || 1); }
function worse(label, now, next) {
  const a = lastNum(now), b = lastNum(next);
  if (isNaN(b)) return !isNaN(a) && String(next) === "—";
  return !isNaN(a) && (LOWER_BETTER.has(label) ? b > a : b < a);
}
// A WORDED VALUE that changes shows ONCE, its number replaced in green (owner, 2026-10-26: "instead of having X void -> Y void, just
// replace the number in green"): the words of now and next the same, the number swapped for next's. A bare number keeps "now -> next"
const NUM_RE = /[−\-+]?\d[\d.,]*k?/g, wordsOf = v => String(v).replace(NUM_RE, "#");
function statRow(label, now, next) {
  const cls = next !== null && worse(label, now, next) ? "asp-next asp-worse" : "asp-next";
  if (next !== null && next !== now && String(now) === "—") return "<dt>" + label + '</dt><dd><span class="' + cls + '">' + next + "</span></dd>"; // NEW: no "— →" (owner, 2026-10-15: "if previously blank, don't need dash arrow")
  if (next !== null && next !== now && / [a-z]/i.test(String(next)) && wordsOf(now) === wordsOf(next)) return "<dt>" + label + "</dt><dd>" + String(next).replace(NUM_RE, m => '<span class="' + cls + '">' + m + "</span>") + "</dd>";
  const arrow = next !== null && next !== now ? ' <span class="' + cls + '">→ ' + next + "</span>" : "";
  return "<dt>" + label + "</dt><dd>" + now + arrow + "</dd>";
}

// SOL's TRACKING BEAM's rows (owner, 2026-11-04; aspira-sol.js): the beam's ticks, Reflection's splits and their carry (Breach's,
// SOL_TRACK_HOP), Breach's strip, the scorch a tick - no locks, prism or parallel beams ("no parallel beams")
function solTrackSpec(st0, t) {
  const st = solTrackSt(t, st0), d = st.dmg / SOL_SCORCH_M; // (d: a scorch stack's share of a shot - the pulse, 2026-11-05)
  return [["Crit", Math.round(st.crit * 100) + "%"], ["Crit ×", st.critMul], ["Shot", "every " + +(1 / (st.rate * SOL_PULSE_K)).toFixed(2) + "s × " + Math.round(st.dmg / SOL_PULSE_K / st0.dmg * 100) + "%td"],
    ["Splits", st.split ? st.split + "" : "—"], ["Carry", st.split ? "×" + st.hop + " / enemy" : "—"],
    ["Breach", st.bleedArmor ? "−" + pc(1 - (1 - st.bleedArmor) ** (st.breach || 1)) + " armor a hit" : "—"] /* a hit: SOL fires in pulses (2026-11-05) */,
    ...(st.dot ? [["Scorch tick", +(d * st.dot.k / st0.dmg * 100).toFixed(1) + "%td"], ["Scorch ticks", st.dot.n], ["Scorch slow", pc(SOL_SCORCH_SLOW) + " / stack"]] : []), ["Form", rayForm(st)]];
}
// each tower's rows read %td of ITS main hit at its build (tdOf, cardMain): the skills ride in statSk while the rows are built
for (const k of Object.keys(SPEC)) { const f = SPEC[k]; SPEC[k] = (st, t) => { const was = statSk; statSk = (t && t.skills) || {}; try { return f(st, t); } finally { statSk = was; } }; }
