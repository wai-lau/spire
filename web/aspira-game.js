// /aspira — game state and simulation: waves, economy, targeting, combat, fx.

let fx = [];
let best = { score: 0, wave: 0 };
try { best = JSON.parse(localStorage.getItem("aspira.best")) || best; } catch (_e) {}

// TESTING: the owner asked to start rich while designing; the real start is 100
const START_MONEY = 120; // owner, 2026-10-02 (was 100; the 10000 playtest start is gone)

function newGame() {
  // NULLIFY moved the slots out; a new game puts them home (aspira-core.js
  // loads after this file, so the very first call finds no pushCells yet)
  if (typeof pushCells === "function") pushCells(0); if (typeof bossInv === "object") Object.assign(bossInv, { phase: "off", full: false, r: 0 }); // (no boss sky carried over)
  return {
    money: START_MONEY, drips: [], lives: 18, score: 0, wave: 0, interest: 0.02, // 18 = two full shield rings (owner); interest 2% (owner, 2026-10-14: "balance the money" - at 3% uncapped, 97% of a run's money was interest, ~350k banked by wave 91; was 0.03)
    towers: [], enemies: [], spawns: [], fleetQ: [], chains: [], nextIn: 0, started: false, over: false,
    power: { SCR: 0, RNG: 0, MNY: 0, DAM: 0 }, charge: 0,
    nextLifeAt: 50000, id: 1,
  };
}

let G = newGame();

// Enemies appear where their lane first crosses SPAWN_R from the core (owner:
// every spawn the same distance from the centre, whatever the screen shape or
// lane rotation - a rotated copy crosses the circle at the same s).
const SPAWN_R = 600;
const ENTRY_S = new WeakMap(); // a lane's answer, kept with the lane (perf: the queued boss fleet asked every member, every step - 9% of a sim game)
function entryS(pi) { const P = PATHS[pi]; let s = ENTRY_S.get(P); if (s === undefined) { const p = P.pts.find(q => Math.hypot(q.x - CX, q.y - CY) <= SPAWN_R); ENTRY_S.set(P, (s = p ? p.s : 0)); } return s; }

// gentler late ramp (owner, 2026-10-02): HP x1.10 a wave (was 1.15, which
// quadrupled every 10 waves and walled every build by ~70), armor with the
// curve's 0.4 power (was 0.5); shields keep the old 1.15 curve (owner)
// x1.13 a wave through wave 20 (owner, 2026-10-09: "1.13 1-20 good, then 1.11"; was 1.10) - every wave
// from 20 on x1.67 the 2026-10-08 build. Sim (e13): random players 0 / 100 won, death p10 35 p50 60;
// the curve's scripted players 44 -> 29 of 80 (SOL-SOL openings first leak on wave 4)
let HP_GROWTH = 1.13; const ARMOR_EXP = 0.4, SHIELD_EXP = 0.29 /* FEWER shield charges (owner, 2026-10-12: "shields need nerf, less shield stacks overall"; was 0.335 - wave 80: 72 not 128), the HP side of hpMul still makes up for some */; // let: the simulator sweeps it
// HARDER AFTER WAVE 20 (owner, 2026-10-08: "make the difficulty ramp harder after wave 20"): x HP_LATE a wave
// past HP_KNEE (HP_GROWTH before). Sim on the 2026-10-08 build: random players won 11% -> 5%, the curve's
// scripted players 61 -> 48 of 80 (x1.12 cut them to 30 / 80)
let HP_LATE = 1.13 /* 2026-10-11: the axis roles made the towers stronger - waverep x3 36/36, late lives 16.5 (1.115: 2.9; was 1.11) */; const HP_KNEE = 20; // let: the simulator sweeps it
// THE END GAME EASES (owner, 2026-10-11: "for waves that make lives go fix them"): towers are fully built by about
// wave 80, so HP growing x HP_LATE on past it made waves 80-100 a wall (47 of 48 lives lost there); x HP_END past HP_END_KNEE
let HP_END = 1.07 /* "make it harder" (owner, 2026-10-14; was 1.06) */, HP_END_KNEE = 80; // let: the simulator sweeps both. waverep x3: 1.115 won 9/36, 1.08 33, 1.06 35 (36 with FAST_LATE_MUL)
let HP_PLAIN_END = 1.02; const plainEnd = n => Math.pow(HP_PLAIN_END, Math.max(0, n - HP_END_KNEE)); // LATE SCALING (owner, 2026-10-18): plain enemies (not bosses) grow x HP_PLAIN_END a wave extra past HP_END_KNEE
const hpPow = n => Math.pow(HP_GROWTH, Math.min(n, HP_KNEE) - 1) * Math.pow(HP_LATE, Math.max(0, Math.min(n, HP_END_KNEE) - HP_KNEE)) * Math.pow(HP_END, Math.max(0, n - HP_END_KNEE)); // one enemy's HP on wave n (before a boss's own multiplier); the wave list shows it too
// shields GROW SLOWER (owner, 2026-10-06): to the SHIELD_EXP power of the old
// steeper curve (was 0.4) - the same early (8 on wave 3, 11 on 10), about HALF
// late (244 on 80, was 503) - and a shielded enemy's HP rises by old / new, so
// it takes about as long to kill (x1.2 on 20, x2 on 80). Normalised so shields
// start at exactly their base on their first wave (3).
const sCurve = n => Math.pow(1.15, n - 1) + n * 4 / 18;
function shieldsOf(type, n) {
  const b = ENEMIES[type].shield, ez = n <= EASE_TO ? EASE_SH : 1; n = eqWave(n); // (the 10-cycle equivalent - aspira-defs.js) // ez: the tier 0 ease (aspira-waves.js)
  if (!b) return { shield: 0, hpMul: 1 };
  const r = sCurve(n) / sCurve(3), old = Math.max(b, b * Math.pow(r, 0.4)), shield = Math.max(b, Math.round(b * Math.pow(r, SHIELD_EXP)));
  // HP made up for the charges as they were at 0.335, not for the ones taken away now: the nerf is a real nerf (2026-10-12)
  return { shield: Math.round(shield * ez), hpMul: old / Math.max(b, Math.round(b * Math.pow(r, 0.335))) };
}
// EARLY SHIELDS SOFTER (owner, 2026-10-12: "early game shield too hard" - rounded up to fill 3- and 5-Vs, wave 2 brings 9
// not 5): x SHIELD_EARLY HP to wave 20, easing to full by wave 30
// ...and EARLY ARMOR HARDER (owner, 2026-10-12: "armor feels too easy early"): x ARMOR_EARLY to wave 20, easing to x1 by 30
const SHIELD_EARLY = 0.6, ARMOR_EARLY = 2 /* owner, 2026-10-12: "make early armor stronger" (was 1.6) */, early = (k, n) => k + (1 - k) * Math.min(1, Math.max(0, (n - 20) / 10));
const SWARM_HP_X = 1.5; // a swarm wave's whole HP x1.5 (owner, 2026-10-12), spread by the jitter (spawnEnemy)
const enemyHpRaw = (type, n0, n = eqWave(n0)) => tune(type, "hp", n0) * earlyHpX(type, n0) * (9 * hpPow(n) + n * 2) * ENEMIES[type].hp * 2 * (ENEMIES[type].star ? 1 : plainHpMul(n0) * plainHpGrow(n0) * plainEnd(n)) * shieldsOf(type, n0).hpMul * (type === "shield" ? early(SHIELD_EARLY, n) : type === "armor" ? early(ARMOR_EARLY, n) : type === "swarm" ? SWARM_HP_X : 1); // x2: half as many enemies (owner); 9 / 2 (2026-10-08: all HP halved, was 18 / 4)
function spawnEnemy(type, n, pi, ang = 0) {
  const d = ENEMIES[type], s0 = entryS(pi), p0 = pathAt(pi, s0, ang);
  // a SWARMER's HP - and its SIZE - jitter 30-300% of the average, which is SWARM_HP_X the wave's (owner, 2026-10-12: "increase
  // swarm hp (and size jitter) to 30-300%", "total hp increased by 1.5x"; was 50-200% at x1): 0.3 + 2.7 u^2.857 averages 1
  const jit = type === "swarm" ? 0.5 + 2.5 * Math.random() ** 4 : 1; // 50-300%, averaging 1 (owner, 2026-10-12: "change both to 50% to 300%"; was 30-300%)
  const hp = Math.max(1, Math.floor(enemyHp(type, n) * jit)); // never 0 (2026-10-11: x0.225 HP left the early swarms at 0 - spawned dead, never drawn) // WHOLE numbers (owner, 2026-10-08): HP, armor and every hit round down
  // DEFENCES KEEP PACE WITH HP (overnight simulator, 2026-10-02): with flat
  // armor/shields, late waves were pure dps and ARC spam won. Armor grows with
  // the curve to ARMOR_EXP (0.4; was the square root), shields with its 0.4 power - normalised so
  // shields still start at exactly their base (8) on their first wave (3).
  const armorOf = t => Math.floor(ENEMIES[t].armor * ENEMY_HP_MUL * armorGrow(n) * scaleOf(n)); /* x the LATE SCALE (aspira-waves.js) */ // (armorGrow: aspira-defs.js) // x ENEMY_HP_MUL like the HP (2026-10-11: left out of the HP cut, armor ate 4.4x more of each hit)
  const shield = type === "swarm" ? Math.round(tune("swarm", "shield", n) * shieldsOf("shield", n).shield) : Math.round(type === "shield" ? monoUp("sh|" + "shield", n, m => shieldsOf("shield", m).shield * tune("shield", "shield", m)) : shieldsOf(type, n).shield * tune(type, "shield", n)); // NO DROPS on the charges too (a late lever under the one before holds the level till the curve passes it) // the shield levers (TYPE_TUNE, aspira-waves.js): a late swarm carries a share of a shield unit's charges
  const armor = d.armor ? Math.floor(armorOf(type) * tune(type, "armor", n)) : type === "fast" ? Math.floor(tune("fast", "armor", n) * armorOf("armor")) : 0; // the armor levers: a late fast carries a share of an armor unit's armor
  G.enemies.push({
    armor, armor0: armor, shield, shieldMax: shield, wave: n, aug: type === "swarm" && shield > 0 ? "shield" : type === "fast" && armor > 0 ? "armor" : null, /* aug: its late HYBRID trait - its outline wears that type's colour (owner, 2026-10-13) */ // armor0: as spawned (damageCredit) // the wave it CAME from (the end screen's leaks)
    // swarm members wander widely off the lane, each at its own speed (+-50%, its own roll - never tied to its size)
    // and its own wobble rate, so a clump churns as it moves
    jit: type === "swarm" ? 18 + Math.random() * 45 : 0, /* x1.5 wider (owner, 2026-10-12: "swarm units spread wider across lane"; was 12 + 30) */ ph: Math.random() * 6.283, // owner: tripled, halved twice, doubled 2026-10-08
    spd: (type === "swarm" ? 0.5 + Math.random() /* +-50% (owner, 2026-10-14: "increase their speed jitter significantly, not correlated to size" - a swarm strings out instead of arriving as one clump; was 0.8 + 0.4) */ : type === "fast" ? lateK(n, "fast") * (n === 1 ? FIRST_FAST_SPD : 1) : 1) * speedRamp(n) * (ENEMIES[type].star ? 1 : speedGrow(n) * tune(type, "speed", n) * PLAIN_SPEED_K), /* (aspira-defs.js; PLAIN_SPEED_K: half speed, owner 2026-10-26 - a boss's fleet takes it back, bossFleet) */ phr: 0.6 + Math.random(),
    id: G.id++, type, n, hp, max: hp, pi, ang, s: s0, x: p0.x, y: p0.y, rot: Math.random() * 6,
    // fractional, so a cheap swarmer really pays its share (owner: halved
    // swarm bounty must hold; money is shown rounded down)
    bounty: bountyBase(eqWave(n)) * d.bounty * (d.star ? 1 : earlyN(n) / tune(type, "count", n)), /* the count lever splits the wave's pay */ // (aspira-waves.js) slowF: 0, slowT: 0, stunT: 0, markT: 0, markMul: 1,
  });
  G.enemies[G.enemies.length - 1].sizeMul = (1 + SIZE_LOG * Math.log10(enemyHp(type, n) / earlyHpX(type, n) / (enemyHp(type, 1) / earlyHpX(type, 1)))) * (type === "swarm" ? jit : 1); if (type === "swarm") G.enemies[G.enemies.length - 1].drawJit = swarmDrawJit(jit); // GROWS WITH LOG HP (owner, 2026-10-13: "initial unit size should scale logarithmically with unit hp"): x1 on wave 1, about x2 by 119; a swarmer x its HP share too, 50-300% (owner, 2026-10-12)
  if (type === "bonus") bossSpawn(G.enemies[G.enemies.length - 1], n); // which boss (aspira-bosses.js)
}

// ---------- combat ----------
// Global enemy pace (owner: everything at half speed). Spawn gaps are divided
// by it too, so enemies stay the same DISTANCE apart on the lane — that
// spacing is a balance lever for chain reach.
const OFF_SCREEN_SPEED = 3, effSpeed = e => ENEMIES[e.type].speed * ENEMY_SPEED * (e.spd || 1) * PATHS[e.pi].pace * (e.stunT > 0 ? 0 : 1 - (e.slowT > 0 ? e.slowF : 0));

// FRESH (owner): an enemy carrying NO debuff - slowed, stunned, bleeding,
// burning, corroded, frostbitten, shredded, poisoned or charged
const debuffed = e => e.slowT > 0 || e.stunT > 0 || e.bleedCrit > 0 || e.breachN > 0 || e.burnT > 0 || e.corrodeT > 0 ||
  e.biteT > 0 || e.shredT > 0 || e.dotT > 0 || !!e.charged || !!e.charge;
const coreD2 = e => (e.x - CX) ** 2 + (e.y - CY) ** 2;
const MODE_KEY = {
  // close = closest to the CORE (owner), not to the tower: the most urgent enemy
  close: a => coreD2(a.e),
  // fresh: undebuffed first (nearest the core among them), then the rest
  fresh: a => (debuffed(a.e) ? 1e9 : 0) + coreD2(a.e),
  biggest: a => (a.e.arcana ? -1e15 : 0) - a.e.hp, // the most HP left (owner) - a BOSS always counts biggest, whatever its HP (owner, 2026-10-12)
};

function pickTargets(t, st, count) {
  const r2 = st.range * st.range, c = [];
  for (const e of G.enemies) {
    if (e.dead || !e.seen) continue;
    const d = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
    if (d <= r2) c.push({ e, d });
  }
  const key = MODE_KEY[t.mode];
  // ties go to whoever is furthest along the spiral
  c.sort((a, b) => key(a) - key(b) || b.e.s - a.e.s);
  return c.slice(0, count).map(a => a.e);
}

// quiet: no flash or number (poison ticks, splash), so they do not spam
// crit: draw this hit's number PINK instead of a separate CRIT label (owner)
// st (optional): the hitting tower's stats - st.noFx, st.from
const BLEED_CRIT_MUL = 2;
function damage(e, amt, t, quiet = false, crit = false, st = null) {
  if (e.dead || !e.seen) return; // OFF-SCREEN: untouchable (enemySeen)
  amt *= escale(e); // the LATE SCALE: a raw tower hit, x its target's wave scale (aspira-waves.js)
  if (e.charge && !staticQuiet && t) dischargeStatic(e); // ARC Static: ANY tower's hit sets the charges off, the charging ARC's too (aspira-skills.js)
  // a shield eats one whole HIT, whatever its size - ANY damage pops ONE charge, quiet hits too, never more
  // (owner, 2026-10-26: "anything that deals damage should pop a shield charge"; splash/poison once bounced, Ion pierced, shieldPop took more)
  if (e.shield > 0) {
    e.shield -= 1;
    if (e.shield < SHIELD_BREAK_N && (!(st && st.noFx) || e.shield <= 0)) shieldBreak(e); // its last charges BREAK, loudly (aspira-floats.js) - a crowd of pools (noFx) only the LAST one (owner, 2026-10-14: ACD too much late)
    if (!(st && st.noFx)) hitFlash(e, 18, 1, "cyan", 0.07);
    // all of it soaked: a "0" in SHIELD blue, as BIG as the hit it swallowed (owner)
    dmgNumber(e, "0", amt, "cyan", (st && st.from) || hitFrom || t); // EVERY pop its own 0, even a quiet hit's - never summed (owner, 2026-10-21: "every shield pop should show a 0, that's the exception to the rule"); from: where it flies AWAY from (aspira-car.js)
    return;
  }
  // BLEED (SOL's Impale): every OTHER tower may crit a bleeding enemy too, for
  // x BLEED_CRIT_MUL (SOL rolls the bleed into its own crit, rayHit)
  if (!quiet && !crit && e.bleedCrit > 0 && !(t && t.kind === "sol") && Math.random() < e.bleedCrit) { crit = true; amt *= BLEED_CRIT_MUL; }
  if (e.shredT > 0) amt *= e.shredMul;
  const pre = amt; // before Brittle - damageCredit splits what the debuffs added
  if (e.slowT > 0 && e.brittle) amt *= e.brittle;
  // (SOL Refraction x the FAST here until 2026-10-12 - owner: no extra damage by enemy type)
  // armor takes a flat bite out of every hit (never below 10% of it)
  const raw = amt;
  // (SOL ignored armor until 2026-10-07; owner: "SOL should no longer ignore armor" - its damage rose x1.3 to match, solarmor.mjs)
  // (FROST CRACKED ARMOR here while slowed until 2026-10-11, then Moons did until 2026-10-12; both gone - the frost below is Rime's)
  // FRZ's FROST (Permafrost) takes a FLAT share of the wave's armor reference (armorRefOf, aspira-acid.js), as much as the
  // frost it holds - STACKING with Corrosion, below zero like it (owner, 2026-10-12: "let rime reduce armor"; Brittle did it
  // for an hour, "brittle should stack with corrosion (both should allow negative)")
  const frost = e.frostArmor ? frostShare(e) * e.frostArmor * armorRefOf(e.wave || 1) : 0;
  const arm = Math.trunc(Math.max((e.armor || 0) - frost, -armorRefOf(e.wave || 1))); // whole armor, rounded toward zero (Breach/Corrosion strip it in fractions); EVERY enemy no lower than minus its wave's armor - the boss floor for all (owner, 2026-10-22: "boss armor floor to everything"; bosses only since 2026-10-13)
  if (arm > 0) // EVERY hit, quiet ones too - FRZ ticks, splash, damage over time, Nova (owner, 2026-10-12; quiet hits skipped armor until then)
    amt = Math.max(amt * 0.1, amt - arm);
  // NEGATIVE armor (ACD's Corrosion, owner) is a flat bonus on every hit - quiet ones too (owner, 2026-10-12: "allow
  // negative armor to apply to everything also"; FRZ ticks, splash, damage over time and Nova skipped it until then)
  else if (arm < 0) amt -= arm;
  const blunted = amt < raw;
  // per-tower tally: damage counts only up to the HP the enemy had left
  if (t) damageCredit(e, t, pre, amt, frost, Math.min(amt, Math.max(0, e.hp))); // the debuffers' shares to THEM (aspira-acid.js)
  amt = bossHitCap(e, amt); // Justice / Death cap a single hit (aspira-bosses.js)
  { const c = escale(e); if (c < 1) { const v = Math.max(1, Math.floor(amt / c)) * c + (e.bank || 0); amt = Math.max(1, Math.floor(v)); e.bank = v - amt; } else amt = Math.max(1, Math.floor(amt)); } // a hit is a WHOLE number, rounded down - but one that lands always takes 1 (owner, 2026-10-08); under the LATE SCALE the rounding is the RAW hit's, its fraction (a debt too) banked on the enemy, so it plays as before (2026-10-22)
  e.hp -= amt;
  if (!quiet && !(st && st.noFx) && !(typeof farFx === "function" && farFx(e))) { // noFx: unseen (crowded pools - aspira-acid.js); farFx: 3D's far ring (aspira-quality.js)
    // impact flash sized and lit by the damage; big hits also throw sparks
    const m = dmgMag(amt), col = t ? TOWERS[t.kind].color : "orange";
    hitFlash(e, 5 + 8 * m, m, col, 0.05 + 0.027 * m);
    if (m > 1.2) burst(e.x, e.y, col, Math.round(m * 3));
    // damage number, jittered so rapid hits don't stack
    // armor-blunted hits read GREYER the more armor took off them (owner, 2026-10-09: "greyness of damage popups should be
    // correlated to the percentage of damage mitigated by armor" - was all-or-nothing grey), white to the graticule's Silver
    // sized by the hit BEFORE armor (owner): a big hit blunted to little still reads big, in grey
    if (!(st && st.noNum)) dmgTick(e, amt, raw, crit ? "white" : t ? dmgInk(t.kind) : "white" /* its TOWER'S colour, a crit white (owner, 2026-10-16: "color the damage numbers based on the tower that dealt it") */, (st && st.from) || hitFrom || t, crit || !blunted ? 0 : 1 - amt / raw, t && (t.kind === "acd" || t.kind === "frz") && st ? st.rate : 0); // (aspira-floats.js)
  }
  if (e.hp <= 0) kill(e, t);
}

// Side effects of a landed hit, from the tower's upgrade mods.
function onHit(e, t, st, amt) {
  if (st.shred) applyMark(e, st.shred.mul, st.shred.t, t ? t.id : "x");
  if (st.dot) solScorch(e, t, st); // SOL's burn stacks (aspira-sol.js)
  if (st.stun && Math.random() < st.stun.p) e.stunT = Math.max(e.stunT, st.stun.t);
  if (st.hitSlow) applySlow(e, st.hitSlow.f, st.hitSlow.t, t ? t.id : "x");
  // Melt (ARC): every hit strips armor for good, past zero (owner: every armor
  // reduction is permanent and may go negative), so later hits land harder
  if (st.armorShred) e.armor = (e.armor || 0) - st.armorShred * escale(e);
  if (st.splash) {
    // a FILLED blast that lingers 0.3s, so the splash actually reads (owner)
    fx.push({ k: "blast", x: e.x, y: e.y, r: st.splash.r, color: TOWERS[t.kind].color, t: 0, life: 0.3 });
    for (const o of G.enemies) {
      if (o === e || o.dead || !o.seen) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) <= st.splash.r) damage(o, amt * st.splash.frac, t, true);
    }
  }
}

// how long a Slower's slow lasts (owner: 5x the old 2.5s)
const SLOW_TIME = 125 / 48; // ~2.6 real seconds (owner: 10x the old ~4.2s, then 1/4, then 1/4)

// DEBUFF SHAPES (owner, 2026-10-05). Every slow and every damage mark is held
// PER SOURCE (a tower's id, a blast, ...) and has a SHAPE that decides what a
// re-hit from the SAME source does:
//   "refresh"  one per source, TIMES OUT; a re-hit resets its timer (the default)
//   "once"     one per source, PERMANENT; a re-hit does nothing (Permafrost)
//   "stack"    every hit adds a PERMANENT stack of its own
// Different sources always stack, MULTIPLICATIVELY (owner): speed x (1 - s1) x
// (1 - s2)..., so two 30% slows leave 49%; damage taken x m1 x m2 ... That total
// is then SHAPED (owner, 2026-10-11: "waves don't take as long to kill" - "shape the
// slow so they are still meaningful but don't make the game a slog"): up to
// SLOW_KNEE it counts in full, past it every extra slow counts less and less,
// bending toward SLOW_CAP and never reaching it - so an enemy keeps at least
// 1 - SLOW_CAP of its speed, stacked or single (was a 0.9 stacked cap a single stronger
// slow could pass, Fast up to 0.96). EVERY slow hits Fast enemies twice as hard (owner; global, reconfirmed 2026-10-12):
// double the slow, shaped toward fastSlowCap() - set so a fully slowed Fast enemy
// (1.5x speed) moves no slower than any other fully slowed one: 1.5 x (1 - 0.8) = 1 - 0.7
// (2026-10-11: at SLOW_CAP the no-ARC trio FRZ+SOL+ACD lost every game to Fast leaks).
const FAST_SLOW_MUL = 2;
let SLOW_KNEE = 0.4, SLOW_CAP = 0.8; /* 0.7 -> 0.8 (owner, 2026-10-24): an enemy keeps 20% of its speed */ // let: the simulator sweeps them
const TOWER_SLOW_MAX = 0.95; // one tower slow's ceiling before shaping (applySlow)
// DERIVED from fast's speed (owner, 2026-10-12: "fast enemies look like they get frozen in place by frz" - a fixed 0.88 was
// set for 1.5x speed; at 1.91x a fully slowed fast enemy crawled at 0.23 of base, below everyone's 0.3): a fully slowed
// fast enemy moves exactly as fast as a fully slowed base-speed one, whatever fast's speed
const fastSlowCap = () => 1 - (1 - SLOW_CAP) * ENEMY_BASE_SPEED / ENEMIES.fast.speed;
const slowShape = (s, cap = SLOW_CAP) => (s <= SLOW_KNEE ? s : SLOW_KNEE + (cap - SLOW_KNEE) * (1 - Math.exp(-(s - SLOW_KNEE) / (cap - SLOW_KNEE))));
let debuffSeq = 0;
function addDebuff(map, src, v, dur, shape) {
  if (shape === "stack") { map[src + "#" + ++debuffSeq] = { v, t: Infinity }; return; }
  const d = map[src];
  if (shape === "once") { if (!d) map[src] = { v, t: Infinity }; return; }
  if (d) { d.v = d.t > 0 ? Math.max(d.v, v) : v; d.t = d.t === Infinity ? Infinity : dur; } else map[src] = { v, t: dur }; // (refreshed IN PLACE: the aura refreshes every step - perf)
}
// A SHIELD HOLDS OFF EVERY SLOW (owner, 2026-10-12: "shielded units cannot be slowed while they have shields") - FRZ's
// weakness to shields, by mechanics: no slow, so no chill (frzBite) and no brittle. Temporal Drive ("core:") still stops it
function applySlow(e, f, dur, src = "x", shape = "refresh") {
  if (!e.seen) return false; // (off-screen: immune - enemySeen)
  const core = typeof src === "string" && src.startsWith("core:"); // (a number - a tower's id - never is: no String() a call, perf)
  if (e.shield > 0 && !core) return false;
  if (e.arcana && !(core && isA(e, "strength"))) { f *= bossSlowMul(e); if (f <= 0) return true; } // BOSS_SLOW_K (aspira-bosses.js) - but Temporal Drive stops Strength DEAD (owner, 2026-10-21: "temporal drive should work on strength")
  if (e.type === "fast") f *= FAST_SLOW_MUL;
  // only Temporal Drive ("core:") is a FULL stop: a tower's slow stays under 1, so it is always shaped by the cap (owner,
  // 2026-10-12, a recording: two fast enemies stopped dead - capstone Temp's 0.55 doubled on the fast made 1.1, read as a stop)
  if (!core) f = Math.min(f, TOWER_SLOW_MAX);
  addDebuff(e.slows ||= {}, src, f, dur, shape);
  sumSlows(e);
  return true;
}
// age every slow by dt, drop the spent ones, and fold the rest into e.slowF /
// e.slowT (what effSpeed, Brittle, Shatter and the drawing read)
function sumSlows(e, dt = 0) {
  let keep = 1, t = 0;
  for (const k in e.slows) {
    const s = e.slows[k];
    s.t -= dt;
    if (!(s.t > 0)) { delete e.slows[k]; continue; }
    keep *= 1 - Math.min(1, s.v); t = Math.max(t, s.t);
  }
  // a FULL stop (Temporal Drive's 100%) is never shaped: the shaping caps tower slows, and had capped the freeze at 70% too
  e.slowF = keep <= 0 ? 1 : slowShape(1 - keep, e.type === "fast" ? fastSlowCap() : SLOW_CAP);
  e.slowT = t;
}
// a damage-taken MARK (SOL's shred, ARC's Static): the same shapes, x mul each
function applyMark(e, mul, dur, src = "x", shape = "refresh") {
  addDebuff(e.marks ||= {}, src, mul, dur, shape);
  sumMarks(e);
}
function sumMarks(e, dt = 0) {
  let m = 1, t = 0;
  for (const k in e.marks) {
    const d = e.marks[k];
    d.t -= dt;
    if (!(d.t > 0)) { delete e.marks[k]; continue; }
    m *= d.v; t = Math.max(t, d.t);
  }
  e.shredMul = m; e.shredT = t; // what damage() and debuffed() read
}

// damage for one shot at one enemy: EMP's armored bonus and the every-Nth-shot charge
function shotDamage(t, st, e, base) {
  let d = base;
  if (st.armorMul && e.armor) d *= st.armorMul;
  if (st.everyN && t.shots % st.everyN.n === 0) d *= st.everyN.mul;
  return d;
}

function kill(e, t) {
  if (bossRise(e)) return; // Judgement / Death rise once (aspira-bosses.js)
  e.dead = true; if (e.breached && typeof breachShrapnel === "function") breachShrapnel(e); if (e.drip > 0) dripFlush(e); // a breached enemy bursts (aspira-skills.js); its last goo falls (aspira-acid.js)
  if (t) t.kills = (t.kills || 0) + 1;
  const mul = (e.markT > 0 ? e.markMul : 1) * (G.power.MNY > 0 ? 2 : 1) * (e.slowT > 0 && e.siphon ? e.siphon : 1);
  const b = e.wave >= WIN_WAVE ? 0 : e.bounty * mul; // DEATH's wave PAYS NOTHING - no credits, score or drop (owner, 2026-10-17: "death should not give any rewards")
  sfxFor("kill", e.type); // each enemy type its own death sound where one is mapped ("kill.fast" ..., owner 2026-10-16), else the shared one
  creditDot(e.x, e.y, b); // the credits FLY to the core and land there (aspira-floats.js)
  if (b > 0) addScore(Math.round(b * 10));
  G.charge = Math.min(POWER_FULL, G.charge + 1);
  burst(e.x, e.y, ENEMIES[e.type].color, 14);
  if (e.type === "bonus") { if (bossPays(e) && e.wave < WIN_WAVE) bonusDrop(e); bossKilled(e); } // the last Devil pays; a Lover's mate enrages (aspira-bosses.js)
  if (e.shatter && e.slowT > 0 && !shattering) shatterAt(e); // FRZ's Shatter
  if (e.charged) staticDischarge(e); // ARC's Static (the old path)
  // the chart ARC's Static: a charged enemy that DIES lets its charges go too
  // (owner) - unless a Static blast killed it (no chain reaction)
  if (e.charge && !staticQuiet) dischargeStatic(e); else if (e.charge && e.charge.t && skillOf(e.charge.t, "capacitance") >= CAP_CHAIN_FROM) capQueue.push(e); // a discharge killed it: it goes off next (CAP_CHAIN_FROM, aspira-skills.js)
}

// LIVES come in multiples of LIFE_STEP 6 - a ring's first side count (owner, 2026-10-04)
const LIFE_STEP = 6;
// a boss drops +6 LIVES or +0.5% INTEREST, fixed per boss wave; ONCE a boss wave (2026-10-15: two-lane bosses paid twice)
function bonusDrop(e) {
  if ((G.bossPaid ||= {})[e.n]) return;
  G.bossPaid[e.n] = true;
  if (fixedRand(e.n, 4) < 0.5) { G.lives += LIFE_STEP; float(e.x, e.y - 18, "+" + LIFE_STEP + " lives", "cyan"); } // +6 (owner, 2026-10-11: "reduce life rewards to 6"; was +12)
  else { G.interest += 0.005; float(e.x, e.y - 18, "+0.5% interest", "cyan"); } // owner, 2026-10-26: "Reduce interest / To 0.5% drops" (players banked 2-4M by Death); was +1%, +5% before that
}

function addScore(n) {
  G.score += n * (G.power.SCR > 0 ? 2 : 1);
  // ...EARNED here, PAID when the wave's last boss falls (owner, 2026-10-14: "all rewards should come after boss levels never
  // on the 10" - the 100k marks paid mid-wave): G.lifeOwed, bossKilled (aspira-bosses.js)
  while (G.score >= G.nextLifeAt) {
    G.lifeOwed = (G.lifeOwed || 0) + LIFE_STEP;
    G.nextLifeAt = G.nextLifeAt < 100000 ? 100000 : G.nextLifeAt + 100000;
  }
}

// ---------- fx ----------
// Effect magnitude from damage: ~0.9 for a 4-damage tick, ~2.3 for an 80
// hit, capped at 3 (a big crit). 0 for no damage (the Slower's beam).
const dmgMag = d => (d > 0 ? Math.min(3, 0.5 + Math.sqrt(d * VIS_DMG) / 5) : 0); // VIS_DMG: sized as before the halving
// slim: RPR's beam - half the width, brighter glow (owner).
// follow: the beam keeps hold of its two endpoint objects (tower, enemy) and
// is redrawn between them every frame while it lasts, so it tracks a moving
// target; follow = false draws a fixed line between the start points.
// EVERY beam's thickness follows the damage of its hit (owner): beamWidth()
// scales with sqrt(hit / biggest hit seen), the curve damage numbers size on
// beam thickness is ABSOLUTE (owner, 2026-10-05): it depends on the hit's own
// damage alone, never on the biggest hit so far (that is the damage numbers'
// rule). Damage runs from ~5 to 100k+ over a game, so it is LOGARITHMIC:
// 10 -> 2.0, 100 -> 3.6, 1k -> 5.2, 10k -> 6.8, 100k -> 8.4, capped at BEAM_MAX
const BEAM_MIN = 0.4, BEAM_PER_DECADE = 1.6, BEAM_MAX = 10;
const beamWidth = d => Math.min(BEAM_MAX, BEAM_MIN + BEAM_PER_DECADE * Math.log10(1 + Math.max(0, d * VIS_DMG)));
// every beam lasts BEAM_LIFE_MUL x its asked life and draws BEAM_BRIGHT x as
// bright (owner, 2026-10-06: "twice as long and twice as bright"; drawFx)
const BEAM_LIFE_MUL = 2, BEAM_BRIGHT = 2;
function beam(a, b, color, life, w = 1.5, dmg = 0, slim = false, follow = true) {
  fx.push({ k: "beam", x1: a.x, y1: a.y, x2: b.x, y2: b.y, color, t: 0, life: life * BEAM_LIFE_MUL, w, d: dmg, m: dmgMag(dmg), slim,
    a: follow ? a : null, b: follow ? b : null });
}
function ring(x, y, r, color, life = 0.12, grad = false, outline = true) { fx.push({ k: "ring", x, y, r, color, t: 0, life, grad, outline }); }

// ---------- update ----------
function stepSpawns(dt) {
  for (const w of G.spawns) {
    w.timer -= dt * waveClock(w.n); // a wave not yet reached runs OFF_SCREEN_SPEED x - its releases too, so its gaps in distance hold (waveClock, aspira-formations.js)
    while (w.timer <= 0 && w.idx < w.list.length) {
      const type = w.list[w.idx++];
      // FORMATIONS (aspira-formations.js): fast Vs and armor's lattice spawn as a group; the rest one by one
      const m = formSpawn(w, type) || (spawnEnemy(type, w.n, w.lanes[type], w.ang || 0), 1);
      // spacing is a balance lever: swarms stream evenly and very densely
      // (5x the bodies in the same time as before), trains spread ~60+ apart; a formation waits its members' worth
      w.timer += (ENEMIES[type].star ? 1 : 1 / PLAIN_SPEED_K) * (w.gaps ? w.gaps[w.idx - 1] : type === "fast" ? FAST_PAIR / (ENEMIES.fast.speed * ENEMY_SPEED * (w.n === 1 ? FIRST_FAST_SPD : 1)) // fast pairs: the next one FAST_PAIR behind (aspira-formations.js)
        : m * (type === "swarm" ? 0.024 : type === "shield" ? SHIELD_POD_GAP : 0.8) / ENEMY_SPEED); // (x 1 / PLAIN_SPEED_K: the same gaps in distance at half speed)
      // a boss's FLEET rides around it: the next boss on the same lane (the Lovers' second) waits till both fleets clear
      const lb = type === "bonus" && G.lastBoss;
      if (lb && lb.fleetSpan) w.timer = Math.max(w.timer, (lb.fleetSpan + FLEET_GAP) / Math.max(1, effSpeed(lb)));
    }
  }
  G.spawns = G.spawns.filter(w => w.idx < w.list.length);
}

const JIT_FADE_R = 400; // swarm wander is full beyond this radius, 0 at the core
// enemies turn nose-first along their lane - drawing only, so the headless
// balance simulator switches it off (scripts/aspira-sim)
let FACING = true;
function stepEnemies(dt) { const reach = reachCircles(); // (out of every tower's reach = off screen: aspira-positioning.js)
  for (const e of G.enemies) {
    if (e.gone) continue; if (!e.seen && enemySeen(e)) { e.seen = true; e.seenAt = performance.now(); } // (off-screen: untouchable - enemySeen, aspira-positioning.js)
    if (e.dead) {
      // a GHOST (owner): the dead keep drifting in at their plain pace,
      // untargetable and harmless, and are removed at the core with no life lost
      e.s += ENEMIES[e.type].speed * ENEMY_SPEED * (e.spd || 1) * PATHS[e.pi].pace * dt;
    } else {
      if (e.stunT > 0) e.stunT -= dt;
      if (e.slows) sumSlows(e, dt);
      if (e.markT > 0) e.markT -= dt; else e.markMul = 1;
      if (e.arcana) bossStep(e, dt); // the bosses' tricks (aspira-bosses.js)
      if (e.biteT > 0) e.biteT -= dt; // Frostbite tint
      if (e.corrodeT > 0) e.corrodeT -= dt; // Corrosion ring
      if (e.burnT > 0) e.burnT -= dt; // under an ACD burn (Fresh targeting)
      if (e.marks) sumMarks(e, dt);
      if (e.dotT > 0) { solScorchTick(e, dt); if (e.dead) continue; } // SOL's scorch stacks, popping shields (aspira-sol.js)
      { const m = e.mate && !e.mate.dead && !e.enraged ? e.mate : null; if ((e.seen && inReach(e, reach)) || (m && m.seen && inReach(m, reach))) (G.waveIn ||= {})[e.n] = 1; e.s += (m ? Math.min(effSpeed(e), effSpeed(m)) : effSpeed(e)) * waveClock(e.n) * dt; } /* the LOVERS walk in step at the slower one's pace; OFF-SCREEN x3 (owner, 2026-10-18: "triple movement speed of all enemies not on screen") - a WAVE loses it TOGETHER, the moment its first unit reaches a tower's range (owner, 2026-10-26) */
    }
    const p = e.form ? ENEMY_AT : pathAtInto(e.pi, e.s, e.ang, ENEMY_AT); // (a scratch point, read at once - aspira-formations.js)
    if (e.form) formOffset(e, p); // its place in a formation (aspira-formations.js) - which sets p whole, so no pathAt first (perf)
    const pl = e.pull ? grvPullStep(e, dt) : null; e.x = p.x + (pl ? pl[0] : 0); e.y = p.y + (pl ? pl[1] : 0); // + GRV's sideways pull (aspira-grv.js)
    // no free spin: one corner points along the lane, nose first
    if (FACING) {
      const ahead = e.form ? null : pathAtInto(e.pi, e.s + 3, e.ang, FORM_Q); // a formation unit: the lane's heading at its own spot (formOffset's e.faceA - it read the lane's centre ahead, sideways corners; owner, 2026-10-26)
      if (e.form) e.rot = e.faceA; else if (ahead.x !== p.x || ahead.y !== p.y) e.rot = Math.atan2(ahead.y - p.y, ahead.x - p.x);
    }
    // wobble rate cut to 1/3 (owner) when the wander tripled, so it drifts, not buzzes
    if (e.jit) {
      e.ph += dt * 2.2 * (e.phr || 1) * (e.stunT > 0 ? 0 : 1 - (e.slowT > 0 ? e.slowF : 0)); // at its current PACE: Temporal Drive's stop freezes the wander too (owner, 2026-10-16: "temporal drive should stop all enemy movement, even jitter")
      // the wander fades to nothing approaching the core (owner), so the swarm
      // funnels into a clean line instead of piling over the centre
      const j = e.jit * Math.min(1, Math.hypot(e.x - CX, e.y - CY) / JIT_FADE_R) ** 2; // squared: gone well before the core
      // ACROSS the lane only, never back and forth along it (owner, 2026-10-12: "swarm should never jitter back and forth")
      const q = pathAt(e.pi, e.s + 3, e.ang), tx = q.x - e.x, ty = q.y - e.y, tl = Math.hypot(tx, ty) || 1, w = Math.sin(e.ph) * j;
      e.x += -ty / tl * w; e.y += tx / tl * w;
    }
    if (e.s >= PATHS[e.pi].len) {
      e.gone = true;
      if (e.dead) continue; // a ghost just fades out at the core
      e.dead = true;
      const before = G.lives;
      G.lives -= ENEMIES[e.type].leak || 1;
      sfx("leak"); shakeScreen(); livesLost(); if (typeof threatBounce === "function") threatBounce(e); // (threatBounce: its threat ring bounces out, aspira-ui.js) "X lives left" where the interest pop-up goes (aspira-waves.js)
      ring(e.x, e.y, 40, "pink", 0.17);
      // a BOSS that gets through ends the game outright (owner, 2026-10-02)
      if (ENEMIES[e.type].star) { G.lives = 0; G.breachBy = e.arcana; } // the end title names the boss (BOSS_BREACH)
      const lw = e.wave || G.wave; // lives lost per wave it CAME from (owner), for the end screen
      (G.leaks ||= {})[lw] = (G.leaks[lw] || 0) + before - Math.max(0, G.lives);
      if (G.lives <= 0) { G.lives = 0; gameOver(); return; }
    }
  }
  G.enemies = G.enemies.filter(e => !e.gone);
}

function step(dt) {
  if (G.over || !G.started) return;
  G.clock = (G.clock || 0) + dt; // game time (aspira-positioning.js paces its predictions on it)
  for (const k in G.power) if (G.power[k] > 0) G.power[k] = Math.max(0, G.power[k] - dt);
  stepCoins(dt); stepDrips(dt); /* Corrosion's drops (aspira-acid.js) */ // the credits flying home bank on arrival (aspira-floats.js) - game time, so the simulator banks them too
  stepCore(dt); // the core's powers: cooldowns, Temporal's ring, Fortifications' copy firing (aspira-core.js)
  // the next wave goes when its timer runs out, or the moment the field
  // clears (owner): nothing alive, nothing still queued to spawn
  // ...except the BOSS holds the timer (owner): nothing new comes until it
  // is dead (or through), then the field is clear and the next wave goes
  // ...and a TIME STOP holds everything (owner, 2026-10-08: "stop spawning during the effect, don't speed up
  // the next wave either"): no countdown, no early send on a clear field, nothing spawns
  const stopped = timeStopped();
  if (!bossUp() && !stopped) G.nextIn -= dt;
  // the game is WON when the 10th boss (wave WIN_WAVE) falls (owner)
  // (no wave after it: the field plays out, then the clear wins)
  if (G.wave >= WIN_WAVE) { if (waveClear()) { winGame(); return; } }
  // ...and not while the boss's inverted sky is still CLOSING (owner, 2026-10-09: "wait until boss inversion circle closes
  // before sending in next wave"; bossInv runs in the UI's render, so the simulator never waits)
  else if (!stopped && bossInv.phase !== "out" && !afterBoss() && ((G.nextIn <= 0 && !bossNext()) || waveClear())) { sendWave(); return; } // a BOSS wave never comes on the timer, only on a clear field (owner, 2026-10-09: "no time for boss waves")
  if (!stopped) { stepSpawns(dt); stepFleetQ(dt); } // a boss fleet still riding in (aspira-bosses.js)
  stepEnemies(dt);
  if (G.over) return;
  stepChains(dt);
  for (const t of G.towers) {
    t.spin = (t.spin || 0) + dt; // game-time clock for anything that orbits (FRZ's moons)
    if (AUTO_POS) autoPosition(t, dt); else if (autoMove && best.ascended && !towersFrozen()) autoGlide(t, dt); // the simulator's player jumps; a real tower moves when dragged, or AUTO-MOVE glides it (aspira-positioning.js)
    if (t.kind === "frz" && hasSkills(t)) { frzStep(t, dt); continue; } // the chart FRZ: an aura, every step (aspira-skills.js)
    if (t.kind === "sol") { stepSol(t, dt); continue; }
    if (t.kind === "acd") { stepAcd(t, dt); continue; } if (t.kind === "car") { stepCar(t, dt); continue; } if (t.kind === "ifr") { stepIfr(t, dt); continue; } if (t.kind === "grv") stepGrv(t, dt); // GRV: its spheres every step, its novas on the cooldown below (aspira-grv.js)
    t.cd -= dt; if (t.echo > 0 && (t.echo -= dt) <= 0) { const st = towerStats(t); for (let i = 0, n = relayMul(t); i < n; i++) fire(t, st); if (--t.burst > 0) t.echo += ARC_ECHO_S; } // ARC's burst (ARC_BURST_N, ARC_ECHO_S apart - aspira-skills.js)
    if (t.cd > 0) continue;
    const st = towerStats(t);
    let fired = false;
    for (let i = 0, n = t.kind === "arc" ? relayMul(t) : 1; i < n; i++) fired = fire(t, st) || fired; // the Orbital Relay: an ARC attacks three times (aspira-core.js)
    if (fired) sfx(t.kind);
    t.cd = fired ? 1 / st.rate : 0.05; if (fired && t.kind === "arc") { t.echo = ARC_ECHO_S; t.burst = ARC_BURST_N - 1; }
  }
  G.enemies = G.enemies.filter(e => !e.gone);
}

// Beams, rings and sparks age in GAME time (they follow the 1/2/3x speed);
const WIN_WAVE = 120; // the 10th boss (a boss every STAR_EVERY 12 since 2026-10-12; was 100)
function winGame() {
  G.over = true; G.won = true;
  best.ascended = true; // (the title read ASCENDANT from then on until 2026-10-23 - the boss name now, aspira-ui.js)
  addScore(G.lives * 1000);
  if (G.score > best.score) best.score = G.score;
  if (G.wave > best.wave) best.wave = G.wave;
  try { localStorage.setItem("aspira.best", JSON.stringify(best)); } catch (_e) {}
  if (typeof renderEndStats === "function") renderEndStats();
  showOverlay("ascendant", // the win title (owner, 2026-10-06; was "the core holds")
    "All ten bosses down with " + G.lives + " lives left.", "Play again");
  if (typeof showAscend === "function") showAscend(); // initials for THE ASCENDANTS (aspira-ascend.js)
}
function gameOver() {
  G.over = true;
  sfx("over");
  if (G.score > best.score) best.score = G.score;
  if (G.wave > best.wave) best.wave = G.wave;
  try { localStorage.setItem("aspira.best", JSON.stringify(best)); } catch (_e) {}
  if (typeof renderEndStats === "function") renderEndStats(); // the end screen's tower + leak stats (aspira-endstats.js)
  if (typeof showAscendants === "function") showAscendants(); // a loss: THE ASCENDANTS board, no entry (aspira-ascend.js)
  showOverlay((G.breachBy && BOSS_BREACH[G.breachBy]) || "core breached", "Reached wave " + G.wave + (G.wave >= bestWave() ? ", your best." : " (best: " + bestWave() + ")."), "Play again");
}
