// /aspira - FRZ's CHART: the aura, the Rime pulses, the moons (split from aspira-skills.js
// at its 500-line cap, 2026-10-08). Loaded right after aspira-skills.js (the simulator too):
// towerStats / the game loop call frzSkillStats, frzStep and drawFrzSkill at run time.

// ---------- FRZ's chart: the aura, the Rime pulses, the moons ----------
// numbers by tier (index 0 = untaken); balance later (owner: ideas first)
// FITTED 2026-10-06 to +25 / +50 / +100% DELAY (enemy-seconds of slow bought
// for the other towers; FRZ + L1 ARC + L1 SOL, waves 20-30) - the first
// guesses were 2-4x too strong; range moves little so "colder" reads as colder
// early-game balance 2026-10-06: +0.03 on every tier (FRZ stays a pure SUPPORT tower - owner)
const FRZ_TEMP_SLOW = [0.45, 0.45, 0.45, 0.534] /* BATTERY 6.7.0 (2026-10-20): untaken 0.4 -> 0.45 (and I-V to match) */; /* V +0.094, VI +0.12 (steeper late tiers, tuned 2026-10-17) */ // a small ramp (overnight fit 2026-10-08: even a flat 0.4 overshot - Temp's reach is the next lever) // weakened (owner, 2026-10-08; isolation: Temp V 438% team, leaks 660 -> 56); was .43 .46 .5 .54 .58 // the aura's range is in SKILL_MOVE
// Temp's TEAM hook (owner, 2026-10-07: FRZ's chart was flat, 97-103%): an enemy
// its aura touches turns BRITTLE - while slowed it takes x FRZ_BRITTLE from every
// tower (damage(), which already reads e.brittle; drawStatus shows the crack)
// from tier I (owner, 2026-10-11: slows are SHAPED now - aspira-game.js slowShape - so FRZ's payoff moves from how
// slow to what the slowed suffer; was 1 1 1 1.15 1.2 1.25, from III)
const FRZ_BRITTLE = [1, 1.15, 1.45, 3.5623]; // x damage from every tower while slowed (an armor-taking Brittle was tried 2026-10-12 and reverted the same day - ARCHAEOLOGY.md); was 1.06 .. 1.3 - the no-ARC team 0/9 -> 5/9 with the ARC nerf and fast HP x0.75
// FROST TAKES ARMOR (owner, 2026-10-12: "let rime reduce armor"): an enemy at FULL frost has this x the wave's armor
// reference off its armor (less frost, that share of it), past zero - damage(). Rime is FRZ's armor answer, Temp the
// fast (slow + tick + brittle); a pulse no longer breaks shield charges (it did until 2026-10-12)
/* RIME'S BITE (owner, 2026-10-18: Rime is the weakest FRZ axis): each ring that reaches an enemy hits it for this x a tick (quiet, armor still bites) */
let FRZ_RIME_BITE0 = 2; // a ring's bite, x a tier 0 tick - ONE number since the tier redesign (2026-10-24; was 0 4 45 200, V 300 - its tier I value)
const FRZ_RIME_CRACK = [0, 0.5, 1.43, 2.21]; /* x2 (axis balance, owner 2026-10-25: Rime focus 45% leaked, Temp 9, Moons 6) */
// Moons only add aura sources; their armor crack (FRZ_MOON_CRACK) and the hard-types-skip-brittle table (FRZ_HARD)
// were removed with the effects (2026-10-12; ARCHAEOLOGY.md) - brittle applies to every slowed enemy.
// a tick is QUIET (no flash, no crit) yet ARMOR takes its flat bite like any hit (owner, 2026-10-12: "frz ticks should not
// ignore armor" - damage() now bites every hit); the empty opts the shield-pop call passes
const FRZ_TICK_HIT = {};
const FRZ_RIME = [0, 0.02, 0.3, 0.9]; // HALVED with the period (owner, 2026-10-14: "double pulse rate, half effect and opacity" - was .04 .07 .12 .17 .22; same frost a second, twice the rings); each pulse's permanent stacking slow (a shielded enemy takes none - applySlow refuses it; this was "the SHIELD answer" while pulses shattered shields, until 2026-10-12) (2026-10-11: a slow, tanky shield takes the most pulses; was 0 .024 .035 .054 .064 .068): Rime build leaks 13% of shields, Temp 24, Moons 23
// FRZ's own levers (owner: no generic multipliers): Rime pulses MORE OFTEN each tier, the moons are STRONGER copies each tier
const FRZ_RIME_PERIOD = [0.667, 0.667, 0.257, 0.183] /* /1.5: x1.5 the rings, count first (axis balance 2026-10-25; was 1 1 0.385 0.275) */ /* halved (owner, 2026-10-14; was 2 2 1.7 1.4 1.2 1) */, FRZ_MOON_BY = [0.6, 0.85, 1.5438, 1.5438]; /* stronger moons for the 140 orbit (2026-10-08; were .485 .515 .58 .58 .58 at 70): isolation I..V ~112 125 151 172 ~225% - V overshoots at any strength >= IV's: five moons that far out cover most of the lanes */ // weakened (owner, 2026-10-08; isolation: Moons V 499% team); was .78 .9 .95 1 1 1 // Moons IV / V: four and five full moons
// TEMP CONDUCTS FASTER (owner, 2026-10-11: "make temp conduct faster"): each Temp tier shortens the aura's TICK (s) -
// the same bite each tick, so more damage and more shield pops a second (capstone VI in aspira-capstone.js)
const FRZ_TEMP_TICK = [0.21, 0.204, 0.192, 0.1] /* IV 0.0586 -> 0.1, capstone 0.0495 -> 0.1: no tick under 0.1s (owner, 2026-10-25: "Fastest tick rate should be 0.1/s, on anything") - the same damage a second, a tick's bite scales with it */ /* x0.6 with FRZ_TICK x0.6: more ticks, same damage - better vs shield (2026-10-24 marks target) */ /* BATTERY 6.7.0 (2026-10-20): untaken 0.5 -> 0.35 and I-III to match - a lone L1 FRZ lost 3-10 on waves 1-11 after the 6.5 spacing (armor 2x, fast 3x) */; /* V x1/1.93, VI x1/2.93 (steeper late tiers, tuned 2026-10-17) */
// THE NIP (owner, 2026-10-25, the tier redesign's duo rule: "FRZ chill nips"): tier 0's chill hurts a little - FRZ_NIP x a tier 0 tick,
// enough to finish a 1-HP swarmer and pop an eased early shield; Sublimation I still makes it hurt in full (FRZ+SOL and FRZ+CRR lost
// 5-8 / 2-4 lives on waves 1-12 with a chill that only slowed - scripts/aspira-sim/duo0.mjs). let: the battery's sims set it
let FRZ_NIP = 0.1;
const FRZ_TICK = 0.3 /* x0.6 with FRZ_TEMP_TICK x0.6 (2026-10-24 marks target; was 0.5) - the bare L1 FRZ (b.dmg, b.rate) untouched */, FRZ_RIME_GROW = 2.4; // a Rime ring takes FRZ_RIME_GROW game s to reach the edge (owner: much slower; was 0.6)
const FRZ_AURA_HOLD = 0.06, FRZ_RIM_W = 16; // the frosted rim's width per unit of slow (owner: thicker the colder) // an aura slow outlasts one step only: it is gone the moment the enemy leaves
function frzSkillStats(t, s, b) {
  const f = skillOf(t, "temp"), c = curveBase(t, s, b); s.dmgCurve = s.dmg; s.rateCurve = s.rate; // the STAT CURVE (tier redesign 2026-10-24)
  // the aura's damage a SECOND is the curve's; Sublimation splits it over more ticks (more shield pops, not more damage); tier 0 slows and nips (FRZ_NIP)
  const tick0 = b.dmg * c.dmg * b.rate * FRZ_TICK; s.biteDmg = tick0; // a tier 0 tick's worth: what the Rime ring's bite multiplies
  s.aura = FRZ_TEMP_SLOW[f]; s.brittle = FRZ_BRITTLE[f]; s.dmg = tick0 * (f ? FRZ_TEMP_TICK[f] / FRZ_TEMP_TICK[0] : FRZ_NIP); s.chill = f > 0; s.rate = 1 / FRZ_TEMP_TICK[f]; // dmg / rate: a TICK
  s.rime = FRZ_RIME[skillOf(t, "rime")]; s.rimeCrack = FRZ_RIME_CRACK[skillOf(t, "rime")]; s.rimeBite = skillOf(t, "rime") ? FRZ_RIME_BITE0 : 0; s.rimeEvery = FRZ_RIME_PERIOD[skillOf(t, "rime")]; s.moonN = FRZ_MOON_COUNT[skillOf(t, "moons")]; s.moonK = FRZ_MOON_BY[skillOf(t, "moons")]; s.subN = FRZ_SUBMOON_N[skillOf(t, "moons")]; s.skill = true;
}
// moons and SMALL MOONS by tier (owner, 2026-10-08): 1 / 2 / 3 moons at I-III, then still THREE at IV and V,
// each with 1 (IV) or 3 (V) small moons of its own (was 4 and 5 moons, V's with 2 small moons each)
// CAPPED (owner, 2026-10-20: "max 3 sattelites per moon, max 3 moons, find another way to scale it"): at most 3 moons, 3 moonlets each; the top
// stops scale by FRZ_MOON_HIT instead - the moons' and moonlets' DAMAGE (not their reach or slow), making up the sources they lost
// (V: 24 -> 9, VI: 35 -> 12, weighted by their aura scale: x2.4, x2.75). Were [0, 1, 2, 3, 3, 4] VI 5 and [0, 0, 0, 0, 1, 5] VI 6
const FRZ_MOON_COUNT = [0, 1, 3, 3], FRZ_SUBMOON_N = [0, 0, 0, 2];
// a small moon circles its moon at r, the other way round and faster, an aura at k x its moon's
const FRZ_SUBMOON = { r: 84, k: 0.6, spin: 2 }; // r tripled (owner, 2026-10-08; was 28) // k 0.2: V at 195% (0.1 -> 194, 0.3 -> 203, 0.5 -> 216; five moons alone sit near 190)
// the aura's sources: the tower, then each moon at FRZ_MOON_SCALE of everything, then their small moons
function frzSources(t, st) {
  const out = [{ x: t.x, y: t.y, k: 1, id: t.id }];
  if (!st.moonN) return out;
  const moons = moonSpots(t, { moons: st.moonN });
  moons.forEach((m, i) => out.push({ x: m.x, y: m.y, k: st.moonK, id: t.id + ":moon" + i }));
  if (st.subN) {
    const a0 = -(t.spin || 0) * MOON_SPIN * FRZ_SUBMOON.spin, S = FRZ_SUBMOON, n = st.subN;
    moons.forEach((m, i) => { for (let j = 0; j < n; j++) { const a = a0 + j * 2 * Math.PI / n;
      out.push({ x: m.x + Math.cos(a) * S.r, y: m.y + Math.sin(a) * S.r, k: st.moonK * S.k, id: t.id + ":moon" + i + ":" + j, small: true }); } });
  }
  return out;
}
// every step (aspira-game.js): slow what is inside each aura, tick its damage,
// and grow the Rime pulses
// The per-type bite tables (FRZ_BITE, FRZ_BITE_BY, 2026-10-08..11) were replaced by frzBite below; ARCHAEOLOGY.md.
// THE COLDER, THE HARDER (owner, 2026-10-12: "make frz deal damage relative to slow percentage"; replaced the bite by
// TYPE - "get rid of all enemy based damage multis"; the tables above are dead): a tick hurts x (1 + FRZ_CHILL_K x
// the enemy's slow now, 0..1) - every slow on it counts, so the fast (slowed twice as hard) and anything held by other
// slows take the most. let: the simulator sweeps it
let FRZ_CHILL_K = 6;
const frzBite = e => 1 + FRZ_CHILL_K * (e.slowT > 0 ? e.slowF : 0);
// MAX RIME (owner, 2026-10-11: "if something reaches max rime, it spreads to the nearest unit that is not yet max
// rime"): an enemy its rime alone slows FRZ_RIME_FULL (before the slow's shaping) holds no more - a pulse that reaches it
// passes its rime to the nearest living enemy that can still take it, a frost line between them
const FRZ_RIME_FULL = 0.7, FRZ_SPREAD_FX = 0.35;
// how much frost an enemy holds, 0..1 of FRZ_RIME_FULL - its armor loss and its white outline (rimeK, aspira-enemies.js)
const frostShare = e => (e.rimeKeep == null ? 0 : Math.min(1, (1 - e.rimeKeep) / FRZ_RIME_FULL));
const rimeFull = e => 1 - (e.rimeKeep ?? 1) >= FRZ_RIME_FULL;
function rimeSpread(e) {
  let best = null, bd = Infinity;
  for (const o of G.enemies) {
    if (o.dead || !o.seen || o === e || rimeFull(o)) continue;
    const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function frzStep(t, dt) {
  const st = towerStats(t), srcs = frzSources(t, st);
  t.auraT = (t.auraT || 0) - dt;
  const tick = t.auraT <= 0;
  if (tick) t.auraT = Math.max(0, t.auraT) + 1 / st.rate; // (never a backlog: idle, the timer ran on below zero and an enemy walking in took a tick every step until it caught up)
  let ticked = false;
  for (const s of srcs) {
    const r2 = (st.range * s.k) ** 2;
    for (const e of G.enemies) {
      if (e.dead || !e.seen || (e.x - s.x) ** 2 + (e.y - s.y) ** 2 > r2) continue;
      applySlow(e, st.aura * s.k, FRZ_AURA_HOLD, s.id);
      // BRITTLE: x this from EVERY tower while slowed (damage()) - back to that (owner, 2026-10-12: "brittle should increase damage
      // like before, not reduce armor"; it took armor for an hour). A shield takes no slow, so it holds Brittle off
      if (st.brittle > 1 && st.brittle >= (e.brittle || 1)) { e.brittle = st.brittle; e.brittleBy = t.id; } // brittleBy: its added damage is this FRZ's (damageCredit)
      if (!tick || !(st.dmg > 0)) continue; // (Sublimation 0: a plain slowing circle, no tick - tier redesign 2026-10-24)
      ticked = true;
      // (Moons cracked armor for good here until 2026-10-12 - owner: "moons should not affect armor"; Rime's frost is the armor answer)
      // a tick POPS a shield (owner, 2026-10-06) and is never blunted by armor;
      // otherwise it is quiet (no flash) but shows its NUMBER, sized by what it took
      if (e.shield > 0) { damage(e, st.dmg * s.k * (s.hit || 1), t, false, false, FRZ_TICK_HIT); continue; } // a tick POPS a shield (owner, 2026-10-12: "shields should not absorb ticks")
      const hp = e.hp;
      damage(e, st.dmg * s.k * (s.hit || 1) * (st.chill ? frzBite(e) : 1), t, true); // (the nip: flat - "more the slower" is Sublimation's) // quiet, but armor still bites it (damage())
      if (hp - e.hp > 0) dmgTick(e, hp - e.hp, hp - e.hp, dmgInk("frz"), t, 0, st.rate); // (slow motion splits it - aspira-floats.js)
    }
  }
  if (ticked) sfx("frz"); // a tick that touched anything is HEARD (owner, 2026-10-07; was silent)
  if (st.rime) {
    t.rimeT = (t.rimeT || 0) - dt;
    if (t.rimeT <= 0) {
      t.rimeT += st.rimeEvery;
      for (const s of srcs) (t.pulses ||= []).push({ x: s.x, y: s.y, R: st.range * s.k, v: st.rime * s.k, id: s.id + ":rime", age: 0, hit: new Set(), moon: s !== srcs[0] });
    }
  }
  if (t.pulses) {
    for (const p of t.pulses) {
      p.age += dt;
      const r = p.R * Math.min(1, p.age / FRZ_RIME_GROW);
      for (const e of G.enemies) {
        if (e.dead || !e.seen || p.hit.has(e.id) || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
        p.hit.add(e.id);
        // (Rime shattered shields until 2026-10-12 - owner: "rime should not strip shield")
        const to = rimeFull(e) ? rimeSpread(e) : e;
        if (!to) continue;
        if (to !== e) beam(e, to, TOWERS.frz.color, FRZ_SPREAD_FX, 1.5, 0, true);
        if (applySlow(to, p.v, Infinity, p.id, "stack")) { to.rimeKeep = (to.rimeKeep ?? 1) * (1 - p.v); to.frostArmor = Math.max(to.frostArmor || 0, st.rimeCrack); to.frostBy = t.id; }
        if (st.rimeBite > 0) damage(to, st.biteDmg * st.rimeBite, t, !(to.shield > 0)); /* the ring's own bite - quiet, but a shield loses ONE charge to it (owner, 2026-10-25: "Yes"; it bounced off until then) */ // (a shield takes no slow, so no frost)
      }
    }
    t.pulses = t.pulses.filter(p => p.age < FRZ_RIME_GROW);
  }
}
// UI: the aura discs, the moons and the Rime rings (aspira-effects.js drawTethers)
const MOON_TRI = 11; // a moon's triangle, corner to centre
const FRZ_AURA_A = 0.4, FRZ_RIM_A = 0.25; // the aura's disc and rim, toned down (owner, 2026-10-07; were 0.8 / 0.45)
const MOON_FX = 0.6; /* slightly more visible (owner, 2026-10-13: "increase FRZ moon and satellite aura visibility slightly"; was 0.45) */ // a moon's look against the tower's own (drawFrzSkill, drawTowerRange's orbit)
function drawFrzSkill(t, st) {
  const col = COL[TOWERS.frz.color];
  frzSources(t, st).forEach((s, i) => {
    // a MOON's own aura, rim and rings at MOON_FX of the tower's (owner, 2026-10-12: "reduce intensity of all moon related
    // effects (except main one)") - the tower's own aura stays as it was
    const m = i ? MOON_FX : 1;
    gradDisc(s.x, s.y, st.range * s.k, col, FRZ_AURA_A * m); // fainter (owner, 2026-10-07; was 0.8)
    // Frost (owner): a FROSTED RIM, thicker the colder the aura (its slow)
    // ...as TWO thin rings, not one thick one (owner, 2026-10-12): each a third of the old width, the outer on the edge
    const rw = FRZ_RIM_W * st.aura * s.k;
    ctx.strokeStyle = col; ctx.globalAlpha = FRZ_RIM_A * m; ctx.lineWidth = rw / 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, st.range * s.k, 0, 6.283); ctx.moveTo(s.x + st.range * s.k - rw, s.y); ctx.arc(s.x, s.y, Math.max(1, st.range * s.k - rw), 0, 6.283); ctx.stroke();
    // a MOON (every source after the tower; Moons III's are full strength, so
    // not "k < 1" - owner: they went missing) is a TRIANGLE pointing at the tower
    if (i) { ctx.fillStyle = col; ctx.globalAlpha = 0.95 * MOON_FX; poly(s.x, s.y, s.small ? MOON_TRI * 0.55 : MOON_TRI, 3, Math.atan2(t.y - s.y, t.x - s.x), false); ctx.fill(); }
  });
  // Rime (owner): a THIN expanding ring with a GLOW
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.shadowColor = col; ctx.shadowBlur = 12 * cam.k;
  for (const p of t.pulses || []) {
    const f = Math.min(1, p.age / FRZ_RIME_GROW);
    ctx.globalAlpha = 0.45 /* halved with the doubled rate (owner, 2026-10-14; was 0.9) */ * (1 - f * 0.6) * (p.moon ? MOON_FX : 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.R * f, 0, 6.283); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}
