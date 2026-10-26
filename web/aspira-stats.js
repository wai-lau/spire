// /aspira - the tower card's STAT ROWS (split from aspira-ui.js at its 500-line cap,
// 2026-10-08): each kind's own rows (SPEC) and one "now -> next" row (statRow), its
// change painted red when it is for the worse. UI only; loaded before aspira-ui.js and
// called at run time (aspira-sliders.js cardStats, aspira-chooser.js).

// THE LATE SCALE (aspira-waves.js): every damage / HP / armor number on the card is shown x the CURRENT wave's scale - what it does to
// the enemies on the board now (raw tower numbers ran to millions late; owner, 2026-10-22: "no number past 9999")
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
    const tree = [1]; for (let l = 1; l <= st.layers; l++) tree.push(st.branch ** l);
    return [["Hits", (st.targets > 1 ? st.targets + " × " : "") + tree.join("→")] /* × the STRIKES (Conductivity III+: "twin arcs") */, ["Arc dmg", dmgW(st.dmg * st.arcFall)],
      ["Charge", st.charge ? st.charge.n + " × " + Math.round(st.charge.frac * 100) + "% of hit · burst r" + ARC_BURST_R : "—"],
      ["Re-strikes", st.revisit ? "up to " + st.revisit + "× an enemy" : "—"],
      ["Burst slow", st.statSlow ? Math.round(st.statSlow * 100) + "% · " + STAT_SLOW_T + "s" : "—"], // the prose's "slowing all near" (ARC_STAT_SLOW)
      // a chart ARC: no reach from the tower - EACH JUMP its own, shrinking (owner)
      ...(st.skill ? [["Jumps", st.layers ? st.layers + (st.layers > 1 ? " jumps" : " jump") + " · first " + Math.round(st.arcRange) : "—"]] /* "—" at tier 0: no chain (tier redesign) */ // (the first jump's reach LAST: it only rises, the card reads the last number)
        : [["Arc hop", Math.round(st.arcRange)], ["Reach", Math.round(chainReach(st))]]),
      ["Delay", hopDelay(st).toFixed(2) + "s"]];
  },
  frz: st => st.skill ? [["Aura slow", Math.round(st.aura * 100) + "%"], ["Aura tick", dmgW(st.dmg)], ["Ticks", +st.rate.toFixed(1) + "/s"] /* a TICK and how often (owner, 2026-10-25: "in stats show damage per tick and ticks per second") */, ["Brittle", st.brittle > 1 ? "+" + Math.round((st.brittle - 1) * 100) + "% taken" : "—"],
    ["Permafrost", st.rime ? "every " + st.rimeEvery + "s, +" + Math.round(st.rime * 1000) / 10 + "% slow, stacking" /* names WHAT it adds (owner, 2026-10-14: "+22% ... but what +22%"); tenths, since halving made 3.5 and 8.5 */ : "—"], ["Frost armor", st.rimeCrack ? "−" + Math.round(st.rimeCrack * 100) + "% armor (−" + dmgW(st.rimeCrack * armorRefOf(G.wave || 1)) + " now)" : "—"] /* at FULL frost (less frost, that share): frostArmor x the wave's armor reference (an armored enemy's armor), and that in armor at THIS wave (damage()) */, ["Full frost", st.rime ? Math.round(FRZ_RIME_FULL * 100) + "% slow, then spreads" : "—"], ["Cold bite", st.chill ? "+" + FRZ_CHILL_K + "% dmg per 1% slow" : "—"] /* tier 0 nips flat; the bite is Sublimation's (tier redesign) */ /* frzBite */ /* the prose's "seeps into their armor": frostArmor x an armored enemy's armor, by frost share (damage()) */, ["Moons", st.moonN ? st.moonN + " at " + Math.round(st.moonK * 100) + "%" + (st.subN ? " +" + st.subN + " small each" : "") : "—"]]
    : [["Slow", Math.round(st.slow * 100) + "%"], ["Lasts", st.permafrost ? "forever" : SLOW_TIME.toFixed(1) + "s"],
    ["Targets", st.all ? "all" : st.targets],
    ["Shatter", st.shatter ? dmgW(st.dmg * st.shatter.mul) + " r" + st.shatter.r : "—"],
    ["Extra", st.frostbite ? "blast slows " + st.frostbite + "s" : st.brittle ? "+" + Math.round((st.brittle - 1) * 100) + "% taken"
      : st.chillStop ? "95% for " + st.chillStop + "s" : "—"]],
  // acidic terms, never heat (owner, 2026-10-07): the acid CORRODES, BUILDS on its target, PEAKS
  acd: (st, t) => [["Jet tick", dmgW(st.dmg / st.rate)], ["Ticks", +st.rate.toFixed(1) + "/s"] /* per tick (owner, 2026-10-25) */, ["Builds", "×2 / " + st.double + "s"],
    ["Peak tick", "×" + st.cap + " (" + dmgW(st.dmg * st.cap / st.rate) + ")"], ["Jets", st.allInRange ? "all in range" : st.targets],
    ["Circle", st.plagueR ? Math.round(st.plagueR) + (st.bloom ? "→" + Math.round(st.plagueR * st.bloom) : "") : "—"],
    ["Armor", st.corrode ? "−" + Math.round(st.corrode * 100) + "% of dmg" : "—"] /* a tick strips ACD_CORRODE OF ITS DAMAGE; dmgW(0.1) read "−0" (2026-10-14) */, /* no "Shields −1 / hit" rows: one charge a hit is the default, unsaid (owner, 2026-10-20) */
    ["Goo", st.corrode ? "×" + Math.round(DRIP_TAKE * (1 + DRIP_TIER_K * TIER_LEVEL[skillOf(t, "corrosion")]) * 10) / 10 + " eaten armor · pull " + ACD_DRIP_PULL[skillOf(t, "corrosion")] : "—"] /* dripDrop / stepDrips: strips and burns that much */,
    // puddles one number a row (owner, 2026-10-07: "1 / 1.4s · 1.5s · r20" was unreadable), so each
    // reads now -> next on its own and its colour judges that one number
    // always the same rows ("—" with no puddles), so a pull from Contagion 0 lines up now -> next
    ["Pool burn", st.contagion ? Math.round(st.contagionHeat * 100) + "% of jet" : "—"], ["Drips every", st.contagion ? st.contagion.every + "s" : "—"],
    ["Pool size", st.contagion ? st.contagion.r : "—"], ["Pool lasts", st.contagion ? st.contagion.life + "s" : "—"], ["Carry", st.carry ? Math.round(st.carry * 100) + "%" : "—"], ["Pool slow", st.burnSlow ? Math.round(st.burnSlow * 100) + "%" : "—"]],
  // CRR (aspira-car.js): Damage + Rate are a SHOT's and an interceptor's
  car: st => [["Interceptors", st.wing], ["Focus fire", st.focus ? "+" + Math.round(st.focus * 100) + "% / wingmate" : "—"], ["Ammo", st.ammo + " shots"], ["Tether slow", st.tSlow ? Math.round(st.tSlow * 100) + "%" : "—"], ["Tether pulse", st.tK ? dmgW(st.dmg * st.tK) : "—"], ["Pulses", st.tK ? +(1 / CRR_TETHER_PULSE).toFixed(1) + "/s" : "—"], ["Chain", st.tChain ? "1 more" : "—"],
    ["Autopilot", st.autopilot ? CRR_BURST_N + " pellets × " + dmgW(st.dmg * CRR_BURST_K) : "—"], ["Slow", Math.round(CRR_SLOW * 100) + "% · " + CRR_SLOW_S + "s"], ["Shields", "−" + st.bolts + " / shot"] /* a bolt a charge: Armament's count (tier redesign 2026-10-24) */],
  // IFR (aspira-ifrit.js, axes redone 2026-10-20): Damage is the base every hit multiplies (each axis by its own K), Rate meteors a second
  ifr: st => [["Meteors", st.fan ? "1 + a fan of " + st.fan + (st.fissure ? " · fissure" : "") : "1"] /* (fire, flares, fan "—" until bought - tier redesign 2026-10-24) */, ["Hit", dmgW(st.dmg * st.routeK)], ["Charge", +st.chargeS.toFixed(2) + "s"], ["Ball speed", st.ballV], ["Meteor", "r" + st.ballR],
    ["Fire", st.fire ? "r" + Math.round(st.fireR) + " · " + st.fireV + "/s" : "—"], ["Fire flares", st.fire ? Math.round(IFR_FIRE_FLARES * st.fireDens * (st.fireR / IFR_FIRE_FLARE_R0) ** 2) + " untaken flares" : "—"],
    ["Flare", st.flares ? Math.round(st.beamL) + " long · " + Math.round(st.beamW) + " wide" : "—"], ["Flare tick", st.flares ? dmgW(st.dmg * st.flareK) : "—"], ["Flare ticks", st.flares ? +(1 / st.tickS).toFixed(1) + "/s" : "—"], ["Flare lasts", st.flares ? +st.burnS.toFixed(1) + "s" : "—"],
    ["Flare capstone", st.triple ? "3 flares a landing" : "—"]],
  // GRV (aspira-grv.js; rework 2026-10-25): at STARTING mass - a void grows up to x GRV_MASS_MAX with the damage it deals
  grv: st => [["Nova hit", st.novaN ? st.novaN + " × " + dmgW(st.dmg * GRV_NOVA_K) : "—"], ["Nova reach", st.novaN ? st.novaR : "—"], ["Armor strip", st.strip ? "−" + dmgW(st.dmg * GRV_NOVA_K * st.strip) + " / nova" : "—"],
    ["Void", "r" + Math.round(st.auraR * Math.sqrt(st.startM)) + " · grows up to " + GRV_MASS_MAX + "× by hitting · lasts " + GRV_LIFE + "s if it hits nothing"] /* plain words (owner, 2026-10-16: "no one knows what mass 2 means") */,
    ["Crush tick", dmgW(st.dmg * st.innerK * GRV_TICK)], ["Crush ticks", +(1 / GRV_TICK).toFixed(1) + "/s"] /* the void's crush, at starting mass (owner, 2026-10-25) */,
    ["Pellets", st.pellets ? st.pellets + " / mass lost" : "—"], ["Pellet hit", st.pellets ? dmgW(st.dmg * st.pelletK) : "—"], ["Pellet reach", st.pellets ? "×" + st.pelReach + " void" : "—"],
    ["Aura size", st.auraOn ? "×" + st.accR + " the void's radius" : "—"] /* (the aura "—" until Acceleration buys it) */,
    ["Aura slow", st.auraOn ? Math.round(Math.min(GRV_SLOW_MAX, st.slow) * 100) + "% · inner " + Math.round(Math.min(GRV_CORE_MAX, Math.min(GRV_SLOW_MAX, st.slow) * GRV_CORE_MUL) * 100) + "%" + (st.horizon ? " · all inner" : "") : "—"]]  /* (no "Shields -1 / hit" row: every hit pops one - owner, 2026-10-16: "isn't this just default behaviour? maybe no need to list") */,
  sol: st => [["Crit", Math.round(st.crit * 100) + "%"], ["Crit ×", st.critMul], ["Locks", st.targets],
    ...(st.skill ? [["Carry", "×" + st.hop + " / enemy"]] : []) /* one beam always (2026-10-25): the pass-through and reflection falloff */, ...(st.skill && st.shieldPop > 1 ? [["Shields", "−" + st.shieldPop + " / beam"]] : []) /* only when over the default 1 (owner, 2026-10-20) */ /* SOL_SHIELD_POP + SOL_REFRACT_POP */, ...(st.skill ? [["Splits", st.split + " / hit"], ["Cone", "±" + st.cone + "°"]] : []),
    // short enough for the card's right column (owner, 2026-10-07: "1 × (−1.5 armor, +1% crit) / hit" ran off it)
    [st.skill ? "Breach" : "Bleed", st.bleedArmor ? "−" + dmgW(st.bleedArmor) + " armor" + (st.bleedCrit ? ", +" + Math.round(st.bleedCrit * 100) + "% crit" : "") + (st.breach > 1 ? " ×" + st.breach : "") + "/hit" : "—"],
    ...(st.skill && st.dot ? [["Scorch tick", +(st.dot.k * 100).toFixed(1) + "% tower damage"], ["Scorch ticks", st.dot.n + " · " + +st.dot.t.toFixed(1) + "s · stacks"], ["Cone scorch", st.dot.cone + " / shot"]] : []) /* SOL_SCORCH */, ["Form", rayForm(st)]],
};

// One stat row: "now" alone at max level, "now -> next" when an upgrade
// would change it, so the payoff of the upgrade is visible before buying it.
// A change for the WORSE shows red and bold (owner): compared on the last
// number in each value, lower-is-better for the rows in LOWER_BETTER, and a
// number giving way to "—" (a stat the upgrade removes) counts as worse.
const LOWER_BETTER = new Set(["Delay", "Builds", "Drips every"]); // (Drips every: a shorter wait is better)
function lastNum(v) { const m = String(v).match(/\d+(\.\d+)?/g); return m ? Number(m[m.length - 1]) : NaN; }
function worse(label, now, next) {
  const a = lastNum(now), b = lastNum(next);
  if (isNaN(b)) return !isNaN(a) && String(next) === "—";
  return !isNaN(a) && (LOWER_BETTER.has(label) ? b > a : b < a);
}
function statRow(label, now, next) {
  const cls = next !== null && worse(label, now, next) ? "asp-next asp-worse" : "asp-next";
  if (next !== null && next !== now && String(now) === "—") return "<dt>" + label + '</dt><dd><span class="' + cls + '">' + next + "</span></dd>"; // NEW: no "— →" (owner, 2026-10-15: "if previously blank, don't need dash arrow")
  const arrow = next !== null && next !== now ? ' <span class="' + cls + '">→ ' + next + "</span>" : "";
  return "<dt>" + label + "</dt><dd>" + now + arrow + "</dd>";
}
