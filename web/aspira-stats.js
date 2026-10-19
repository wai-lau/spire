// /aspira - the tower card's STAT ROWS (split from aspira-ui.js at its 500-line cap,
// 2026-10-08): each kind's own rows (SPEC) and one "now -> next" row (statRow), its
// change painted red when it is for the worse. UI only; loaded before aspira-ui.js and
// called at run time (aspira-sliders.js cardStats, aspira-chooser.js).

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
    return [["Hits", (st.targets > 1 ? st.targets + " × " : "") + tree.join("→")] /* × the STRIKES (Conductivity III+: "twin arcs") */, ["Arc dmg", dmgUnits(st.dmg * st.arcFall)],
      ["Charge", st.charge ? st.charge.n + " × " + Math.round(st.charge.frac * 100) + "% of hit · burst r" + ARC_BURST_R : "—"],
      ["Re-strikes", st.revisit ? "up to " + st.revisit + "× an enemy" : "—"],
      ["Burst slow", st.statSlow ? Math.round(st.statSlow * 100) + "% · " + STAT_SLOW_T + "s" : "—"], // the prose's "slowing all near" (ARC_STAT_SLOW)
      // a chart ARC: no reach from the tower - EACH JUMP its own, shrinking (owner)
      ...(st.skill ? [["Jumps", st.layers + (st.layers > 1 ? " jumps" : " jump") + " · first " + Math.round(st.arcRange)]] // (the first jump's reach LAST: it only rises, the card reads the last number)
        : [["Arc hop", Math.round(st.arcRange)], ["Reach", Math.round(chainReach(st))]]),
      ["Delay", hopDelay(st).toFixed(2) + "s"]];
  },
  frz: st => st.skill ? [["Aura slow", Math.round(st.aura * 100) + "%"], ["Aura dmg", dmgUnits(st.dmg * st.rate) + "/s"], ["Brittle", st.brittle > 1 ? "+" + Math.round((st.brittle - 1) * 100) + "% taken" : "—"], ["Shields", "−1 / tick"],
    ["Permafrost", st.rime ? "every " + st.rimeEvery + "s, +" + Math.round(st.rime * 1000) / 10 + "% slow, stacking" /* names WHAT it adds (owner, 2026-10-14: "+22% ... but what +22%"); tenths, since halving made 3.5 and 8.5 */ : "—"], ["Frost armor", st.rimeCrack ? "−" + Math.round(st.rimeCrack * 100) + "% armor (−" + dmgUnits(st.rimeCrack * armorRefOf(G.wave || 1)) + " now)" : "—"] /* at FULL frost (less frost, that share): frostArmor x the wave's armor reference (an armored enemy's armor), and that in armor at THIS wave (damage()) */, ["Full frost", st.rime ? Math.round(FRZ_RIME_FULL * 100) + "% slow, then spreads" : "—"], ["Cold bite", "+" + FRZ_CHILL_K + "% dmg per 1% slow"] /* frzBite */ /* the prose's "seeps into their armor": frostArmor x an armored enemy's armor, by frost share (damage()) */, ["Moons", st.moonN ? st.moonN + " at " + Math.round(st.moonK * 100) + "%" + (st.subN ? " +" + st.subN + " small each" : "") : "—"]]
    : [["Slow", Math.round(st.slow * 100) + "%"], ["Lasts", st.permafrost ? "forever" : SLOW_TIME.toFixed(1) + "s"],
    ["Targets", st.all ? "all" : st.targets],
    ["Shatter", st.shatter ? dmgUnits(st.dmg * st.shatter.mul) + " r" + st.shatter.r : "—"],
    ["Extra", st.frostbite ? "blast slows " + st.frostbite + "s" : st.brittle ? "+" + Math.round((st.brittle - 1) * 100) + "% taken"
      : st.chillStop ? "95% for " + st.chillStop + "s" : "—"]],
  // acidic terms, never heat (owner, 2026-10-07): the acid CORRODES, BUILDS on its target, PEAKS
  acd: (st, t) => [["Corrode", dmgUnits(st.dmg) + "/s"], ["Builds", "×2 / " + st.double + "s"],
    ["Peak", "×" + st.cap + " (" + dmgUnits(st.dmg * st.cap) + "/s)"], ["Jets", st.allInRange ? "all in range" : st.targets],
    ["Circle", st.plagueR ? Math.round(st.plagueR) + (st.bloom ? "→" + Math.round(st.plagueR * st.bloom) : "") : "—"],
    ["Armor", st.corrode ? "−" + Math.round(st.corrode * 100) + "% of dmg" : "—"] /* a tick strips ACD_CORRODE OF ITS DAMAGE; dmgUnits(0.1) read "−0" (2026-10-14) */, ["Shields", "−1 / tick"],
    ["Goo", st.corrode ? "×" + Math.round(DRIP_TAKE * (1 + DRIP_TIER_K * skillOf(t, "corrosion")) * 10) / 10 + " eaten armor · pull " + ACD_DRIP_PULL[skillOf(t, "corrosion")] : "—"] /* dripDrop / stepDrips: strips and burns that much */,
    ["Pool spread", st.spread ? "kill in pool → pool ×" + ACD_SPREAD_R + " size" : "—"],
    // puddles one number a row (owner, 2026-10-07: "1 / 1.4s · 1.5s · r20" was unreadable), so each
    // reads now -> next on its own and its colour judges that one number
    // always the same rows ("—" with no puddles), so a pull from Contagion 0 lines up now -> next
    ["Pool burn", st.contagion ? Math.round(st.contagionHeat * 100) + "% of jet" : "—"], ["Drips every", st.contagion ? st.contagion.every + "s" : "—"],
    ["Pool size", st.contagion ? st.contagion.r : "—"], ["Pool lasts", st.contagion ? st.contagion.life + "s" : "—"], ["Carry", st.carry ? Math.round(st.carry * 100) + "%" : "—"], ["Jet slow", st.burnSlow ? Math.round(st.burnSlow * 100) + "%" : "—"]],
  // CRR (aspira-car.js): Damage + Rate are a SHOT's and an interceptor's
  car: st => [["Interceptors", st.wing], ["Focus fire", st.focus ? "+" + Math.round(st.focus * 100) + "% / wingmate" : "—"], ["Ammo", st.ammo + " shots"], ["Tether slow", st.tSlow ? Math.round(st.tSlow * 100) + "%" : "—"], ["Tether pulse", st.tK ? dmgUnits(st.dmg * st.tK) + " / " + CRR_TETHER_PULSE + "s" : "—"], ["Chain", st.tChain ? "1 more" : "—"],
    ["Autopilot", st.autopilot ? CRR_BURST_N + " pellets × " + dmgUnits(st.dmg * CRR_BURST_K) : "—"], ["Slow", Math.round(CRR_SLOW * 100) + "% · " + CRR_SLOW_S + "s"], ["Shields", "−" + CRR_BOLTS + " / shot"]],
  // IFR (aspira-ifrit.js): Damage is the blast hit, Rate balls a second from one slot
  ifr: st => [["Slots", st.slots], ["Charge", st.chargeS + "s"], ["Ball speed", st.ballV], ["En route", dmgUnits(st.dmg * st.routeK)], ["Blast", "r" + st.blastR], ["Pellets", st.pellets + " × " + dmgUnits(st.dmg * IFR_PELLET_K)],
    ["Cross", (st.hellfire ? "to the edges" : "±" + st.beamL) + " · " + st.beamW + " wide"], ["Burn", dmgUnits(st.dmg * st.tickK) + " / " + st.tickS + "s · " + st.burnS + "s"], ["Shields", "−1 / hit, −1 / tick"],
    ["Backdraft", st.backdraft ? "pellets burst r" + Math.round(st.blastR * IFR_MINI_K) : "—"]],
  // GRV (aspira-grv.js): at STARTING mass - a sphere grows up to x GRV_MASS_MAX with the damage it deals
  grv: st => [["Nova hit", dmgUnits(st.dmg * st.novaMul)], ["Nova reach", st.novaR], ["Aura size", st.auraR + " × nova dmg (×" + GRV_GROW_MIN + "–" + GRV_GROW_MAX + ")"],
    ["Aura slow", Math.round(Math.min(GRV_SLOW_MAX, st.slow) * 100) + "% · core " + (st.horizon ? "90% full" : Math.round(Math.min(GRV_CORE_MAX, Math.min(GRV_SLOW_MAX, st.slow) * GRV_CORE_MUL) * 100) + "%")],
    ["Armor strip", "−" + dmgUnits(st.dmg * GRV_AURA_K * GRV_STRIP * GRV_STRIP_OUT) + "/s edge · −" + dmgUnits(st.dmg * GRV_AURA_K * GRV_STRIP * GRV_STRIP_IN) + "/s centre"] /* more the closer: in the numbers, not the words (owner, 2026-10-16) */, ["Pellets", +st.pellets.toFixed(1) + "/s" + (st.hawking ? " · last burst" : "")],
    ["Pellet hit", dmgUnits(st.dmg * st.pelletK)], ["Black hole", "grows up to " + GRV_MASS_MAX + "× its size by hitting · lasts " + GRV_LIFE + "s if it hits nothing"] /* plain words (owner, 2026-10-16: "no one knows what mass 2 means") */]  /* (no "Shields -1 / hit" row: every hit pops one - owner, 2026-10-16: "isn't this just default behaviour? maybe no need to list") */,
  sol: st => [["Crit", Math.round(st.crit * 100) + "%"], ["Crit ×", st.critMul], ["Locks", st.targets],
    ["Beams", st.beams || 1], ...(st.skill ? [["Shields", "−" + st.shieldPop + " / beam"]] : []) /* SOL_SHIELD_POP + SOL_REFRACT_POP */, ...(st.skill ? [["Refract", st.refraction ? (st.refraction === Infinity ? "all" : "+" + st.refraction) + " in a " + (st.cone || SOL_CONE) * 2 + "° cone" : "—"]] : []),
    // short enough for the card's right column (owner, 2026-10-07: "1 × (−1.5 armor, +1% crit) / hit" ran off it)
    [st.skill ? "Breach" : "Bleed", st.bleedArmor ? "−" + dmgUnits(st.bleedArmor) + " armor" + (st.bleedCrit ? ", +" + Math.round(st.bleedCrit * 100) + "% crit" : "") + (st.breach > 1 ? " ×" + st.breach : "") + "/hit" : "—"],
    ...(st.skill ? [["Shrapnel", SHRAP_N + " × armor lost · r" + SHRAP_R]] : []) /* breachShrapnel */, ["Form", rayForm(st)]],
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
