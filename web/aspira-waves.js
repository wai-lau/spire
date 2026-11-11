// /aspira — the WAVES: which enemy type each wave is, how many, how it is split
// over rotated copies of its lane, the timer that sends it, its pay (the lanes
// themselves: aspira-wavelanes.js). Split out of aspira-game.js (500-line
// cap); same global scope, loaded right after it (the simulator loads it too).

// ---------- waves ----------
// Waves go on a FIXED TIMER (owner, 2026-10-02), fast enough that 2+ waves are
// usually on screen, and still at once whenever the field clears.
const WAVE_TIMER = 6.4; // 20% shorter (owner, 2026-10-12: "make wave timers 20% shorter across the board"; was 8) - halved (owner, 2026-10-12: "halve all wave timers"; was 16) // owner: 10 -> 13 -> 16s to thin the field
// clear = nothing ALIVE on the board (ghosts of the dead may still be drifting in)
// the boss (the star) or ANY of its fleet is alive, riding in (G.fleetQ) or still queued to spawn - no wave warps in
// till the whole fleet is down (owner, 2026-10-12: "still want warps to stop until boss + fleet is defeated"; the fleet
// held unseen in G.fleetQ, and escorts left after their boss, used to let the timer run)
const bossUp = () => G.enemies.some(e => !e.dead && (ENEMIES[e.type].star || e.bossKin)) || G.fleetQ.length > 0 ||
  G.spawns.some(w => w.list.slice(w.idx).some(t => ENEMIES[t].star));
const waveClear = () => !G.enemies.some(e => !e.dead) && G.spawns.length === 0 && !G.fleetQ.length;
// the NEXT wave is a boss's: it waits for a clear field, no timer (aspira-step.js step, the wave list)
const bossNext = () => (G.wave + 1) % STAR_EVERY === 0;
// AFTER A BOSS the next wave WAITS for the player (owner, 2026-10-12: "after each boss, don't warp in next wave immediately -
// where the warping in... 4s is now, a button that says challenge the X where X is the next boss name; on click starts next
// wave"): held until challengeNext(). Only on a real page - the simulator (no document.getElementById) plays straight on
const afterBoss = () => typeof document.getElementById === "function" && G.started && !G.over && G.wave > 0 &&
  G.wave % STAR_EVERY === 0 && G.wave < WIN_WAVE && G.challenged !== G.wave && !bossUp();
function challengeNext() { if (!afterBoss()) return; G.challenged = G.wave; sendWave(); refreshPanels(); }
// ONE enemy type per wave (owner, 2026-10-02, back from the 1-5 type mix):
// a random unlocked type, never the same as the wave before. Types unlock in
// order: swarm w1, shield w2, armor w3, fast w4 (fixed). makeWave returns the spawn
// lists (one, kept a list so the lane split below stays generic). Every
// STAR_EVERY-th wave is the boss alone (wavePlan).
// Normal enemies were REMOVED (owner, 2026-10-02): every type now has a counter
// the first four waves are FIXED (owner, 2026-10-02): swarm, shield, armor,
// fast - one of each, to meet them in turn; from wave 5 a random type, never
// the one before
// the FIRST fast wave (wave 1) at half speed (owner, 2026-10-21: "halve the speed of the first fast wave"); its pairs keep
// their FAST_PAIR spacing (the spawn timer stretches with it, aspira-game.js)
const FIRST_FAST_SPD = 0.5;
const UNLOCK = ["fast", "shield", "armor", "swarm"]; // FAST opens (owner, 2026-10-17: "Replace the first wave with an equivalent fast wave"); swarm moved to wave 4, the slot fast had - each keeps its type balance (TYPE_COUNT_MUL); was swarm, shield, armor, fast
const STAR_EVERY = 12; // a boss every 12 waves (owner, 2026-10-12: "add 2 waves before each boss"; was 10) - the star rides waves 10, 20, 30... (owner, 2026-10-02; was every wave from 3)
// Waves are the SAME every game (owner, 2026-10-02): type, lane split, star
// slot and star drop all come from fixedRand(wave, salt), a hash, never
// Math.random. Only crits, swarm jitter and stun chance stay random.
function fixedRand(n, salt) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d); h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// what wave n will be, given the type of the wave before it - pure, so the
// HUD can preview the next wave (owner) without touching the game
// enemy COUNTS per TYPE (owner, 2026-10-04: the types balanced against each
// other at the same wave, the rise across waves kept; scripts/aspira-sim/wavebal.mjs
// types). WAVE_TYPE_FORCE is the simulator's way to try a type at a wave - empty in play.
// fitted 2026-10-04 (typebal.mjs, 2 seeds, waves 3-29 vs one L1 of each
// tower, on ENEMY-SECONDS - the first fit, on closest approach, piled on slow
// armor and shields); used for EVERY wave (owner: no upgrades in the test)
const TYPE_COUNT_MUL = { swarm: 0.1625 /* HALF the bodies (owner, 2026-10-14: "halving swarm counts, and balancing with hp and speed" - fewer dice to draw; each one x2 bounty and leak, x1.15 HP); 0.325: x1.25 bodies, each /1.25 HP (owner, 2026-10-12: "a little more swarmy"; was 0.26) */ /* 2026-10-08 owner: half as many, double hp (was 0.52) */, shield: 0.495 /* HALVED (owner, 2026-10-23, the charges doubled; was 0.99) */, armor: 1.07, fast: 2 /* 2026-10-07: the early fit wanted 1.99 (was 1.47) - fast put the least early pressure of any type */ }, WAVE_TYPE_FORCE = {};
TYPE_COUNT_MUL.armor *= 1.5; // x1.5 armor bodies, the bounty split to match (owner, 2026-10-15: "armor waves seem a bit too strong now"; was x2, owner 2026-10-14 "double quantity of armor waves (split bounty into 2)") - waverep: x2 armor waves came to 134 / 164 core units mid-game (other types 100-160), x1.5 157 / 182, 36/36 won
TYPE_COUNT_MUL.swarm *= 0.8; // x0.8 swarm bodies, no HP back (owner, 2026-10-14: "just to make it easier for humans")
for (const k in TYPE_COUNT_MUL) TYPE_COUNT_MUL[k] *= 0.9; // 2026-10-11: a tenth fewer of each, with the faster short-lane mix (aspira-defs.js)
// DOUBLE the swarms past SWARM_X2_FROM, each at its own HP (owner, 2026-10-12: "dont triple swarms, just double"; then
// not before wave 11 - SOL openers died at wave 6 to wave 1's doubled swarm, SOL being weak to it)
const SWARM_X2_FROM = 11, SWARM_WAVE_MIN = 12;
// FEWER, TOUGHER EARLY ENEMIES (owner, 2026-10-15: "make it so that arc doesn't one shot everything in the first waves" ->
// "target should be 0, adjust counts alongside hp to make it work"): through wave EARLY_TO a plain enemy has x EARLY_X the HP,
// a wave brings /EARLY_X the bodies (waveCount) and each pays x EARLY_X (spawnEnemy), easing to x1 by EARLY_END. Bosses keep
// theirs. A wave the formations round back UP (one V of shields can't shrink) gets that much less HP each, so no early wave
// carries more HP than it did - solo.mjs: every lone L1 tower lost 2-7 lives on waves 1-11 before, x4 0-3
const EARLY_X = 4, EARLY_TO = 24, EARLY_END = 36;
const earlyX = n => (n <= EARLY_TO ? EARLY_X : n >= EARLY_END ? 1 : EARLY_X ** ((EARLY_END - n) / (EARLY_END - EARLY_TO)));
const earlyHpMemo = new Map();
const EARLY_SWARM_HP = 0.8, EARLY_SWARM_TO = 12; // waves 1-12 swarmers x0.8 HP (owner, 2026-10-15: "any pair of two towers doesn't leak on waves 1-12" - two ACDs lost 2 to wave 7 in 1 game of 8; 0 of 8 at x0.8)
function earlyHpX(type, n0) { // enemyHp (aspira-game.js)
  if (type === "swarm" && n0 <= EARLY_SWARM_TO) return EARLY_SWARM_HP * earlyHpXBase(type, n0);
  return earlyHpXBase(type, n0);
}
// TIER 0 EASE (tier redesign, spec "Calls for the build": "the duo rule wins a conflict: waves 1 to 12 ease (every type alike,
// so types stay equally hard) until any two tier 0 towers clear them"): waves 1..EASE_TO bring /EASE_N the bodies at the SAME HP
// each, and each pays x EASE_N (the wave pays the same). A COUNT cut, not HP: a tier-0 beam one-shots an early body, so its
// limit is bodies a second (scripts/aspira-sim/duo0.mjs: half the HP moved SOL+IFR from 56 lives lost to 51)
// SHIELDS too, and first: a shield takes one charge a hit (one pop per tick), so a tier-0 single beam's limit on a shield wave is hits a
// second, whatever its damage - x EASE_SH the charges (shieldsOf, aspira-game.js; duo0.mjs: every losing tier-0 duo lost on shield waves)
// MORE BODIES, NONE ONE-SHOT (owner, 2026-10-30: "no tower (other than SOL) 1-shots anything from wave 1-12" / the first levels "look way too
// easy"; "excellent excellent" to the package): EASE_N 4 -> 0.7 (under 1: MORE bodies than the plain count, each at the early HP - waves
// 1-12 go 45 -> 64 bodies; 0.5 let FRZ + IFR, two tier-0 towers, lose the Star, duo0.mjs) and EARLY_FLOOR, every non-boss body there
// at least that HP (spawnEnemy, aspira-game.js; over the biggest non-SOL tier-0 hit, ACD 38). ARC and CRR's tier-0 hits went down with it (aspira-curve.js)
let EASE_N = 0.7 /* was 4 */, EARLY_FLOOR = 45, EASE_SH = 0.1, EASE_TO = 12; // let: the battery's sims set them. x0.1: one charge, at most (duo0.mjs, 2026-10-25: every duo clean, 2 seeds x every slot pair)
const earlyN = n => earlyX(n) * (n <= EASE_TO ? EASE_N : 1); // the count divisor (waveCount)
// THE EARLY PAY, apart from the count (2026-10-30): it was earlyN, so EASE_N 4 -> 0.7 cut waves 1-12's pay 2134 -> 513 gold and the good
// model's wins 112 -> 52 of 200 (8 seeds; interest compounds it). EASE_PAY 2.912 = 0.7 x 4.16 pays waves 1-12 the old 2133 over the new bodies
let EASE_PAY = 2.912;
const earlyPay = n => earlyX(n) * (n <= EASE_TO ? EASE_PAY : 1); // the pay multiplier (spawnEnemy)
function earlyHpXBase(type, n0) {
  if (earlyX(n0) === 1 || ENEMIES[type].star) return 1;
  const key = type + n0;
  if (!earlyHpMemo.has(key)) { const raw = waveCount(type, n0), k = formSplit(type, waveCount(type, n0, false), n0), cnt = Math.max(type === "swarm" ? Math.round(SWARM_WAVE_MIN / earlyN(n0)) : k, laneCount(type, raw, k)); earlyHpMemo.set(key, earlyX(n0) * Math.min(1, raw / cnt)); } // (as wavePlan counts it: one a lane at least)
  return earlyHpMemo.get(key);
}
// swarms are DOUBLED on waves 11-60 and x1.5 after (owner, 2026-10-06): a
// SOL-heavy build must find a swarm answer; x2 past 60 cost ARC+SOL+FRZ teams 20 waves
const SWARM_MID_MUL = 2, SWARM_MID = [11, 60], SWARM_LATE_MUL = 1.5;
const swarmMul = n => (n < SWARM_MID[0] ? 1 : n <= SWARM_MID[1] ? SWARM_MID_MUL : SWARM_LATE_MUL);
let COUNT_SLOPE = 0.5, COUNT_CAP = Infinity; // a plain wave's base count: 10 + slope x n, uncapped (owner, 2026-10-11: the R10 battery, cap 28 left the late game easy)
const WAVE_COUNT_MUL = { [UNLOCK.indexOf("shield") + 1]: 0.5, 1: 0.75, 3: 0.67, 4: 0.75, 6: 0.67, 7: 0.75, 10: 0.5, 11: 0.5 }; /* waves 1-11 a lone L1 tower can clear (owner, 2026-10-12; scripts/aspira-sim/solo.mjs) */ /* the FIRST shield wave at half (owner, 2026-10-12) */ // (wave 1 was DOUBLED from 2026-10-09; dropped 2026-10-12 - owner: "make sure that the first swarm wave is weaker than the second")
// (FEWER LATE FAST, 2026-10-11 - FAST_LATE_MUL - fast x0.65 the bodies past wave 80 - is GONE: owner, 2026-10-22, "types should never get weaker along any axis" / "remove count drop yes")
// how many of `type` a plain wave n brings (before the split onto lane copies) - wavePlan, and a boss's fleet (aspira-bosses.js)
// THE TYPE LEVERS (owner, 2026-10-22: "tune types using these levers ONLY"): each ordinary type is tuned per SECTION (ARCHITECTURE.md 5.6:
// waves 1-24, 25-60, 61-96, 97-120) by its own levers alone, x the curves - swarm: count, speed, and from 61 shield (a share of a shield
// unit's charges); fast: HP, speed, and from 61 armor (a share of an armor unit's armor); armor: armor, count, and from 61 speed; shield:
// shield, count, and from 61 speed. The late hybrids (swarm + shield, fast + armor from 97) are replaced by the after-61 levers. A count
// lever splits the wave's bounty over its bodies (the wave pays the same). let: the sims tune it. An after-60 lever is fixed before 61
const TUNE_SECTIONS = [24, 60, 96], TUNE_LATE = 2; // the sections' last waves; TUNE_LATE: the first section with the after-60 levers
// TUNED (autotune.mjs, 2026-10-22, the core twist, count first to x1.5): sections 1-2 (waves 1-60) matched to each one's hardest type by
// break point - shield set section 1 (x5.81 speed), fast section 2 (x3.62); 3-4 hold section 2's values until the late-scale rebuild is
// tuned (never weaker - the after-60 shares at 0 till then)
let TYPE_TUNE = {
  swarm: { count: [1.5, 1.5, 1.5, 1.5], speed: [1.509, 2.307, 2.307, 2.307], shield: [0, 0, 0, 0] },
  fast: { hp: [1.27, 1.27, 1.27, 1.016 /* x0.8 (armor rework 2026-10-28, owner rule: a type beating >= 4 towers is nerfed - fast beat FRZ SOL GRV IFR at 111-119) */], speed: [1.747, 1.747, 1.747, 1.747], armor: [0, 0, 0, 0] },
  armor: { armor: [1, 4.321, 4.321, 4.321], count: [1.418, 1.5, 1.5, 1.5], speed: [1, 1, 1, 1] },
  shield: { shield: [1, 1.377, 0.6, 0.4], count: [1, 1.5, 0.75, 0.75], speed: [1, 1, 1, 1] }, // 61+ eased (owner, 2026-10-23: "reduce the shield counts later on"): counts floor at 12 (NO DROPS), charges x0.6 / x0.4 held till the curve passes - REWIND=0 typecal 13 -> 55/70 won (swarm 48, armor 53, fast 58)
};
const TUNE_AFTER = { swarm: "shield", fast: "armor", armor: "speed", shield: "speed" }, TUNE_SHARE = { swarm: 1, fast: 1 }; // TUNE_SHARE: the after-60 lever is a share (0 = none), not a factor
const tuneSection = n => { let i = 0; while (i < TUNE_SECTIONS.length && n > TUNE_SECTIONS[i]) i++; return i; };
function tune(type, lever, n) { // the lever's value at wave n: a factor, or a share for swarm shield / fast armor; 1 (0 for a share) if the type has no such lever
  const row = TYPE_TUNE[type] && TYPE_TUNE[type][lever], share = TUNE_AFTER[type] === lever && TUNE_SHARE[type];
  if (!row) return 1;
  const i = tuneSection(n);
  return TUNE_AFTER[type] === lever && i < TUNE_LATE ? (share ? 0 : 1) : row[i];
}
function waveCount(type, n0, cut = true) { // cut false: without the early thinning (the lanes are chosen from that)
  const n = eqWave(n0); // (the 10-cycle equivalent - aspira-defs.js; WAVE_COUNT_MUL keys stay real waves)
  const base = Math.min(10 + Math.floor(n * COUNT_SLOPE), COUNT_CAP); // let: the simulator sweeps both (owner, 2026-10-11: "enemy counts increase as the game progresses")
  // swarms: 3x the bodies (owner); split k ways onto rotated lane copies
  // HALF the bodies at TWICE the health (owner, 2026-10-02)
  // x WAVE_COUNT_MUL[n]: waves 1-30 tuned so each comes about as close to the
  // core against one L1 tower of each kind (owner; scripts/aspira-sim/wavebal.mjs)
  const c = (type === "swarm" ? base * 6 : base) / 2 / (cut ? earlyN(n0) : 1) * (WAVE_COUNT_MUL[n0] ?? 1) * (TYPE_COUNT_MUL[type] ?? 1) * (type === "swarm" ? swarmMul(n) * (n >= SWARM_X2_FROM ? 2 : 1) * lateK(n0, "swarm") : 1) * tune(type, "count", n0); // swarms 6x (owner: doubled from 3x) // tune: the count lever (TYPE_TUNE)
  // SYMMETRICAL FORMATIONS (owner, 2026-10-11: "2n+1 for fast, 3n for armor"): whole Vs and full lattice rows
  const unit = FORM_UNIT[type] || 1;
  return Math.max(unit, Math.round(c / unit) * unit);
}
// NO DROPS (owner, 2026-10-22: "types should never get weaker along any axis" / "yes remove all drops"): an ordinary type's COUNT and HP never
// fall from one of its waves to the next - each is the most it has been up to that wave (boss waves skipped). The early thinning, the HP traded
// for speed, the late swarm and fast cuts all used to dip them; a dip now holds the level before it. Memoised per game (the levers are set
// before it starts; a swept HP is in the key)
const monoMemo = new Map();
function monoUp(key, n, f) { let a = monoMemo.get(key); if (!a) monoMemo.set(key, a = [0]); for (let m = a.length; m <= n; m++) a[m] = Math.max(a[m - 1], m % STAR_EVERY ? f(m) : 0); return a[n]; }
// THE LATE SCALE (owner, 2026-10-22: "rebuild to new ceiling" - no hit past 9999; docs/superpowers/specs/2026-10-22-late-scale-rebuild-
// design.md): past SCALE_FROM every enemy's HP and armor, and every hit and armor strip ON it, is x scaleOf(its wave) - so a hit and what it
// hits shrink TOGETHER and the game plays the same; the armor enemy's HP grows as its raw HP ^ SCALE_A past wave 60 (3.4k there -> ~10k at
// 120, was 400k). escale(e): an enemy's own. Tower numbers (st.dmg, tables) stay raw - the scale is applied where they meet an enemy
const SCALE_FROM = 60, SCALE_A = 0.23, scaleMemo = new Map();
const scaleOf = n => (n <= SCALE_FROM ? 1 : scaleMemo.get(n) ?? scaleMemo.set(n, Math.pow(enemyHpRaw("armor", n) / enemyHpRaw("armor", SCALE_FROM), SCALE_A - 1)).get(n));
const escale = e => scaleOf(e.wave || 1);
// ENEMY_HP_X: every enemy's health, bosses too, x1.4 with the 0.6x core ease (owner, 2026-11-07: keep the ease, raise enemy health until wins
// are back near the 0.8-era 26 of 50; sweep paired on 50 games: x1 32, x1.2 29, x1.4 26 wins; early lives lost 0 -> 0.22). Armor, bounty and size unchanged.
// x1 through wave ENEMY_HP_FROM (12: the duo window, the Star too - flat x1.4 broke the duo rule, grv+ifr 18/21), easing to x1.4 by wave 20
// TEAM_HPK: the simulator's per-type health scale for the team path test (scripts/aspira-sim/teamsurf.mjs, hpk.json); 1 in play
let TEAM_HPK = 1;
const ENEMY_HP_X = 1.4, ENEMY_HP_FROM = 12, ENEMY_HP_RAMP = 8, hpX = n => TEAM_HPK * (1 + (ENEMY_HP_X - 1) * Math.min(1, Math.max(0, (n - ENEMY_HP_FROM) / ENEMY_HP_RAMP)));
const enemyHp = (type, n0) => (ENEMIES[type].star || !TYPE_TUNE[type] ? enemyHpRaw(type, n0) : monoUp("hp|" + type + "|" + ENEMIES[type].hp, n0, m => enemyHpRaw(type, m))) * scaleOf(n0) * hpX(n0);
function planCountOwn(type, n) { // a wave's count as its own curves make it (before NO DROPS)
  const split = formSplit(type, waveCount(type, n, false), n), count = laneCount(type, waveCount(type, n), split);
  return type === "swarm" ? Math.max(Math.round(SWARM_WAVE_MIN / earlyN(n)), count) : Math.max(split, count);
}
function planCount(type, n) { // ...and as sent: at least the count SENT the wave before (whole lane-fulls rounded up past it) - memoised a type
  let a = monoMemo.get("c|" + type); if (!a) monoMemo.set("c|" + type, a = [0]);
  for (let m = a.length; m <= n; m++) {
    if (!(m % STAR_EVERY)) { a[m] = a[m - 1]; continue; }
    const own = planCountOwn(type, m), least = a[m - 1], split = formSplit(type, waveCount(type, m, false), m);
    let c = own; for (let i = 0; c < least && i < 256; i++) c = laneCount(type, least + i, split);
    a[m] = Math.max(own, c);
  }
  return a[n];
}
function wavePlan(n, prev) {
  // every STAR_EVERY-th wave is the boss, ALONE (owner, 2026-10-02)
  if (n % STAR_EVERY === 0) return { type: "bonus", count: bossCount(n), split: bossSplit(n), star: true }; // the Lovers and Death come as two, the Devil as six (aspira-bosses.js)
  const choices = UNLOCK.filter(t => t !== prev);
  const type = WAVE_TYPE_FORCE[n] || (n <= UNLOCK.length ? UNLOCK[n - 1] : choices[Math.floor(fixedRand(n, 1) * choices.length)]);
  const raw = waveCount(type, n);
  // split k ways, ROUNDED DOWN so every lane copy gets the same number (owner)
  // FORMATIONS stay whole (aspira-formations.js): shields split only into whole Vs, armor into whole rows
  const split = formSplit(type, waveCount(type, n, false), n); // LANES from the uncut count: the early cut thins each lane, never takes one (owner, 2026-10-15)
  const count = laneCount(type, raw, split);
  // a swarm wave is never under SWARM_WAVE_MIN bodies, AFTER the lane rounding (owner, 2026-10-14: "make sure swarm waves have at least 12 units");
  // and no lane copy of any OTHER type is empty (owner, 2026-10-15: "min 1 enemy per lane also ... except swarm")
  return { type, count: Math.round(countK(n) * Math.max(type === "swarm" ? Math.max(Math.round(SWARM_WAVE_MIN / earlyN(n)), count) : Math.max(split, count), planCount(type, n))), split, star: n % STAR_EVERY === 0 }; // (planCount: NO DROPS; countK: the COUNT TAPER, below makeWave)
}
function makeWave(n) {
  const { type, count } = wavePlan(n, G.lastType);
  if (type !== "bonus") G.lastType = type; // the boss wave does not break the alternation
  (G.planLog ||= {})[n] = { type, count }; // what wave n was, for the wave list once it is under way
  const list = Array(count).fill(type);
  return [list];
}
// THE COUNT TAPER (owner, 2026-11-03: "Can you increase enemy counts to raise difficulty?" / "And _mildly_ increase hp" / "No, just
// divide current bounty" / "No speedup1"): every plain wave's bodies x3 in waves 11-30 and x2 in 31-40, x1 from 41 (the late waves
// keep today's count, so the phone peak stays where it is); each of those bodies pays bounty / countK (a wave pays what it did) and
// has x COUNT_HP its HP (spawnEnemy, aspira-game.js). Measured (players3b bosses on, 8 seeds, 7.2.2): wins 41% -> 34%, the first
// upgrade wave 24 -> 22 (p25 23 -> 16), banked at 41 7.5k -> 5.7k, early lives lost 0.30 -> 0.04 at 21-30 - busier, earlier buys,
// not deadlier; peak alive at 31-40 68 -> 126 (under the ~135 phone line), late peaks unchanged
const COUNT_TAPER = [[11, 30, 3], [31, 40, 2]], COUNT_HP = 1.1;
const countK = n => { for (const [a, b, k] of COUNT_TAPER) if (n >= a && n <= b) return k; return 1; };

// Interest is paid on what you hold at the moment a wave is sent, so saving
// beats spending early. Sending before the countdown ends pays the seconds left.
const INTEREST_PER_WAVE = 20; // the game no longer caps interest (2026-10-12); kept as the simulator's "smart" saver target (sim.mjs: hold what earns this x the wave)
// Kill bounty = bountyBase(wave) x the type's bounty: +BOUNTY_SLOPE credits a wave,
// x BOUNTY_EARLY on waves 1-BOUNTY_EARLY_TO (owner, 2026-10-06: "slight bounty
// increase waves 1-30"), growing only BOUNTY_SLOPE_LATE a wave past BOUNTY_KNEE
// ("slightly slower growth after 60": wave 80 pays 27 not 30, wave 100 31 not 37;
// money run 'phase 7' - a spender was only fully built at wave ~91 already)
const BOUNTY_BASE = 2, BOUNTY_SLOPE = 0.35, BOUNTY_KNEE = 30 /* (owner, 2026-10-12: "reduce money gain ramping from wave 30 onwards"; was 60) */, BOUNTY_SLOPE_LATE = 0.1 /* was 0.2: wave 80 pays 17.5 not 27, wave 100 19.5 not 31 */, BOUNTY_EARLY = 1.1, BOUNTY_EARLY_TO = 30;
// SCARCE EARLY (owner, 2026-10-28: "make the whole game harder, especially at the beginning so that money is more scarce, because you
// need to buy upgrades"; 2026-10-29 "let's try the mild econ"): x BOUNTY_SCARCE to eq wave 40, back to full by 50
const BOUNTY_SCARCE = 0.8, econEarly = n => (n <= 40 ? BOUNTY_SCARCE : n >= 50 ? 1 : BOUNTY_SCARCE + (1 - BOUNTY_SCARCE) * (n - 40) / 10);
const bountyBase = n => econEarly(n) * (BOUNTY_BASE + BOUNTY_SLOPE * Math.min(n, BOUNTY_KNEE) + BOUNTY_SLOPE_LATE * Math.max(0, n - BOUNTY_KNEE)) * (1 + (BOUNTY_EARLY - 1) * Math.min(1, Math.max(0, (BOUNTY_EARLY_TO - n) / 10))); // full to wave 20, easing off by 30 (no drop at 31)
// THREE MAIN LANES, 80% of a swarm on a bell (swarmLanes, aspira-formations.js): list split over k3 lane copies of wave n's swarm lane;
// extra rides on every spawn
function swarmMainSpawns(n, list, lanes, k3, extra = null) {
  const ls = swarmLanes(lanes.swarm, k3, n), sz = swarmParts(list.length, k3), gap = 0.024 / ENEMY_SPEED;
  for (let j = 0, at = 0; j < k3; j++) {
    const part = list.slice(at, at + sz[j]); at += sz[j]; if (!part.length) continue;
    G.spawns.push({ n, list: part, lanes, ang: ls[j].ang, idx: 0, timer: 0, gaps: ls[j].main ? bellGaps(part.length, gap) : null, ...extra });
    const key = laneKey(lanes.swarm, ls[j].ang); (G.laneTotals ||= {})[key] = (G.laneTotals[key] || 0) + part.length;
  }
}
function sendWave() {
  if (G.over) return;
  if (G.nextIn > 0 && waveClear() && typeof carCutShort === "function") carCutShort(G.nextIn); // a cleared field cut the wait short: ATC still gets that time's interceptors (aspira-crr.js)
  // the payout is CAPPED at INTEREST_PER_WAVE x the wave being sent (owner, 2026-10-06, "late money is way
  // too much"): the core's 9 powers cost up to 20000, so a saver's 5-8% was out-earning the whole field
  const gain = Math.floor(G.money * G.interest); // NO CAP (owner, 2026-10-12: "no interest cap pls"; INTEREST_PER_WAVE x the wave until then)
  if (gain > 0) { G.money += gain; creditsFx = { gain, pct: G.interest * 100, t0: performance.now() / 1000 }; }
  G.wave++;
  if (typeof tickPowerCooldowns === "function") tickPowerCooldowns(); // core power cooldowns count waves (aspira-core.js)
  // the boss is named in its HP BAR under the speed row (owner), not mid-screen
  // a boss is announced (owner): the advisor's double beep, then the Archon
  // (each boss has its own line, "bossvoice.<arcana>", else the shared one)
  if (G.wave % STAR_EVERY === 0) sfxSeq([bossVoice(arcanaOf(G.wave).id)]); // (no "bosswarn" double beep first - owner, 2026-10-12)
  sfx("wave");
  const lanes = laneMap(G.wave);
  // each type's group is SPLIT k ways (k = 1..6, owner) and each part rides a
  // copy of the lane rotated 360/k degrees on from the last, all at once
  makeWave(G.wave).forEach(list => {
    // the lane split comes from the wave number; even parts (wavePlan rounded the count down to fit)
    // (a boss wave takes its split from the boss: the Devil's six come from
    // six directions, one per rotated copy of the lane)
    const boss = !!ENEMIES[list[0]].star; // (the boss LIST, not the wave number: typepower.mjs plays an ordinary wave in a boss's place)
    // FORMATIONS stay whole (aspira-formations.js): shields split only into whole Vs, armor into whole rows
    const want = boss ? bossSplit(G.wave) : firstOne(G.wave) ? 1 : formSplit(list[0], list.length, G.wave);
    const k = Math.min(list.length, want), per = Math.floor(list.length / k), share = list[0] === "swarm"; // swarm: the remainder SHARED out, one more on the first lanes
    const k3 = k - k % SWARM_MAIN; // (a short swarm: its lanes down to a multiple of three, so the main three sit on the grid)
    if (share && !boss && k3 > SWARM_MAIN) { swarmMainSpawns(G.wave, list, lanes, k3); return; } // THREE MAIN LANES (swarmMainSpawns)
    for (let j = 0, at = 0; j < k; j++) {
      const len = share ? per + (j < list.length - per * k ? 1 : 0) : per, part = list.slice(at, at + len); at += len;
      if (!part.length) continue;
      const ang = (laneBestTurn(lanes[list[0]], k, G.wave, list[0]) + (j / k) * Math.PI * 2) % (Math.PI * 2); // laneBestTurn: the most even copies, then the most lane, then nearest the usual turn; then the split
      // a boss arrives BOSS_INTRO s into its wave, after its warning (owner)
      G.spawns.push({ n: G.wave, list: part, lanes, ang, idx: 0, timer: boss ? BOSS_INTRO : 0, gate: boss && arcanaOf(G.wave).id === "devil" }); // (gate: the Devil's wait for her host - devilGateShut)
      // each lane copy remembers how many it was sent, for its brightness
      for (const type of part) { const key = laneKey(lanes[type], ang); (G.laneTotals ||= {})[key] = (G.laneTotals[key] || 0) + 1; }
    }
  });
  if (G.wave % STAR_EVERY === 0 && arcanaOf(G.wave).id === "devil") devilEscorts(lanes, G.wave); // her host, ahead of her (aspira-bosses.js)
  if (G.wave % STAR_EVERY === 0 && arcanaOf(G.wave).id === "death") deathEscorts(lanes, G.wave); // her escort, a lane a type, unlit (aspira-bossfleet.js)
  G.nextIn = WAVE_TIMER;
  G.started = true;
}


// a newly opened corner slot flashes white for SLOT_FLASH_S real seconds (owner:
// 3x as long as its notice, SLOT_TEXT_S, stays up)
const SLOT_TEXT_S = 4, SLOT_FLASH_S = 12;
let slotFlash = null;
function drawSlotFlash() {
  if (!slotFlash || performance.now() > slotFlash.until) { slotFlash = null; return; }
  const on = blinkWave() > 0.5; // the one blink (2026-10-08; was 2 a second)
  cellPath(CELLS[slotFlash.ci], 0.94);
  ctx.strokeStyle = COL.white; ctx.lineWidth = 4; ctx.globalAlpha = on ? 1 : 0.35; ctx.stroke(); ctx.globalAlpha = 1;
}

// ---------- the credits over the core (UI only; aspira-draw.js calls it) ----------
// the count is drawn over the core (owner), just the number "12,345"; for
// CREDITS_FX_T s after an interest payout "+Xc (+r%)" shows just under the rings
const CREDITS_FX_T = 2.5;
let creditsFx = null;
// 1.5x larger (owner, 2026-10-11: "3x larger", then "too large, like half that size"; were 14 / 15 / 8)
const POP_PX = 21, CRED_PX = 23, CRED_SUB_PX = 12;
const popY = (px = POP_PX) => CY + CORE_R + LIFE_GAP * LIFE_RINGS + 9 + px / 2; // just under the rings (was +16 at 14px)
const INT_POP_PX = POP_PX; // the INTEREST pop-up: "interest: +XXc (%)" (owner, 2026-10-19), back at POP_PX ("reduce the font size back to what it was previously"; 1.5x for 6.1.11)
// a LOST LIFE puts "X lives left" in the same spot for as long (owner, 2026-10-11), over an interest pop-up older than it
let livesFx = null;
function livesLost() { livesFx = { t0: performance.now() / 1000 }; }
// part: "count" the number alone, "pop" the interest pop-up alone (3D draws the pop-up over everything, warpEntities)
function drawCredits(part) {
  const fxOn = creditsFx && performance.now() / 1000 - creditsFx.t0 < CREDITS_FX_T;
  // just the NUMBER, centred on the core (owner: the CREDITS word is gone),
  // full with separators - counts run past 10k (owner)
  const n = Math.floor(fxOn ? G.money - creditsFx.gain : G.money).toLocaleString("en-US");
  // a little "CRED" UNDER it (owner, 2026-10-06; was a "c", first after it on the same line)
  if (part !== "pop") {
    // while a leak's ring BOUNCES out (threatBounces, aspira-threat.js) the core shows the LIVES left, in pink (owner, 2026-10-13)
    const hurt = typeof threatBounces !== "undefined" && threatBounces.length > 0;
    if (hurt) { // the number alone, as large as fits inside the core's hexagon ("font as large as would fit in the hexagon")
      const L = String(G.lives), inR = CORE_R * CORE_DRAW_K * Math.cos(Math.PI / 6); // the hex's inner radius
      ctx.font = "100px " + CANVAS_FONT;
      const px = Math.floor(Math.min(1.45 * inR, 1.8 * inR * 100 / ctx.measureText(L).width));
      ctx.font = "bold " + px + "px " + CANVAS_FONT; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      const m = ctx.measureText(L), y = CY + ((m.actualBoundingBoxAscent || px * 0.7) - (m.actualBoundingBoxDescent || 0)) / 2; // the DIGITS' ink centred (owner, 2026-10-13: "vertically centered"; "middle" sat it high)
      ctx.strokeStyle = COL.bg; ctx.lineWidth = px * 0.14; ctx.lineJoin = "round"; ctx.strokeText(L, CX, y); // a crisp OUTLINE, no shadow (owner, 2026-10-13)
      ctx.fillStyle = COL.pink; ctx.fillText(L, CX, y);
    }
    else { text(n, CX, CY - 5, CRED_PX, "bg", "white"); text("CRED", CX, CY + 13, CRED_SUB_PX, "bg", "white"); } // BLACK with a white halo (owner)
  }
  if (part === "count" || G.enemies.some(e => e.arcana && !e.dead)) return; // a boss's name takes this spot (drawBossBar)
  const livesOn = livesFx && performance.now() / 1000 - livesFx.t0 < CREDITS_FX_T && (!fxOn || livesFx.t0 >= creditsFx.t0);
  if (livesOn) { text(G.lives + (G.lives === 1 ? " life left" : " lives left"), CX, popY(), POP_PX, "pink", true); return; }
  if (!fxOn) return;
  const parts = [["interest: +" + creditsFx.gain + "c", "green"], [" (+" + creditsFx.pct.toFixed(1) + "%)", "green"]];
  ctx.font = INT_POP_PX + "px " + CANVAS_FONT; // the interest pop-up
  const ws = parts.map(p => ctx.measureText(p[0]).width);
  let x = CX - ws.reduce((a, w) => a + w, 0) / 2;
  parts.forEach((p, i) => { text(p[0], x + ws[i] / 2, popY(INT_POP_PX), INT_POP_PX, p[1], true); x += ws[i]; });
}
