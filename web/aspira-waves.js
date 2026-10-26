// /aspira — the WAVES: which enemy type each wave is, how many, how it is split
// over rotated copies of its lane, the timer that sends it, and the lane
// bookkeeping the lane drawing reads. Split out of aspira-game.js (500-line
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
// the NEXT wave is a boss's: it waits for a clear field, no timer (aspira-game.js step, the wave list)
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
let EASE_N = 4, EASE_SH = 0.1, EASE_TO = 12; // let: the battery's sims set them. x0.1: one charge, at most (duo0.mjs, 2026-10-25: every duo clean, 2 seeds x every slot pair)
const earlyN = n => earlyX(n) * (n <= EASE_TO ? EASE_N : 1); // the count divisor (waveCount) and the pay multiplier (spawnEnemy)
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
// FEWER LATE FAST (owner, 2026-10-11: "for waves that make lives go fix them"): fast cost 14 lives a wave past 80, every
// other type under 2 - x FAST_LATE_MUL past FAST_LATE_FROM. waverep x3 with HP_END 1.06: 0.8 6.8 a wave, 0.65 2.6, 0.5 1.3
// (FAST_LATE_MUL - fast x0.65 the bodies past wave 80 - is GONE: owner, 2026-10-22, "types should never get weaker along any axis" / "remove count drop yes")
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
  fast: { hp: [1.27, 1.27, 1.27, 1.27], speed: [1.747, 1.747, 1.747, 1.747], armor: [0, 0, 0, 0] },
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
const enemyHp = (type, n0) => (ENEMIES[type].star || !TYPE_TUNE[type] ? enemyHpRaw(type, n0) : monoUp("hp|" + type + "|" + ENEMIES[type].hp, n0, m => enemyHpRaw(type, m))) * scaleOf(n0);
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
  return { type, count: Math.max(type === "swarm" ? Math.max(Math.round(SWARM_WAVE_MIN / earlyN(n)), count) : Math.max(split, count), planCount(type, n)), split, star: n % STAR_EVERY === 0 }; // (planCount: NO DROPS)
}
function makeWave(n) {
  const { type, count } = wavePlan(n, G.lastType);
  if (type !== "bonus") G.lastType = type; // the boss wave does not break the alternation
  (G.planLog ||= {})[n] = { type, count }; // what wave n was, for the wave list once it is under way
  const list = Array(count).fill(type);
  return [list];
}

// Interest is paid on what you hold at the moment a wave is sent, so saving
// beats spending early. Sending before the countdown ends pays the seconds left.
const INTEREST_PER_WAVE = 20; // the game no longer caps interest (2026-10-12); kept as the simulator's "smart" saver target (sim.mjs: hold what earns this x the wave)
// Kill bounty = bountyBase(wave) x the type's bounty: +BOUNTY_SLOPE credits a wave,
// x BOUNTY_EARLY on waves 1-BOUNTY_EARLY_TO (owner, 2026-10-06: "slight bounty
// increase waves 1-30"), growing only BOUNTY_SLOPE_LATE a wave past BOUNTY_KNEE
// ("slightly slower growth after 60": wave 80 pays 27 not 30, wave 100 31 not 37;
// money run 'phase 7' - a spender was only fully built at wave ~91 already)
const BOUNTY_BASE = 2, BOUNTY_SLOPE = 0.35, BOUNTY_KNEE = 30 /* (owner, 2026-10-12: "reduce money gain ramping from wave 30 onwards"; was 60) */, BOUNTY_SLOPE_LATE = 0.1 /* was 0.2: wave 80 pays 17.5 not 27, wave 100 19.5 not 31 */, BOUNTY_EARLY = 1.1, BOUNTY_EARLY_TO = 30;
const bountyBase = n => (BOUNTY_BASE + BOUNTY_SLOPE * Math.min(n, BOUNTY_KNEE) + BOUNTY_SLOPE_LATE * Math.max(0, n - BOUNTY_KNEE)) * (1 + (BOUNTY_EARLY - 1) * Math.min(1, Math.max(0, (BOUNTY_EARLY_TO - n) / 10))); // full to wave 20, easing off by 30 (no drop at 31)
function sendWave() {
  if (G.over) return;
  if (G.nextIn > 0 && waveClear() && typeof carCutShort === "function") carCutShort(G.nextIn); // a cleared field cut the wait short: ATC still gets that time's interceptors (aspira-car.js)
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
    if (share && !boss && k3 > SWARM_MAIN) { // THREE MAIN LANES, 80% of the swarm on a bell (swarmLanes, aspira-formations.js)
      const ls = swarmLanes(lanes.swarm, k3, G.wave), sz = swarmParts(list.length, k3), gap = 0.024 / ENEMY_SPEED;
      for (let j = 0, at = 0; j < k3; j++) {
        const part = list.slice(at, at + sz[j]); at += sz[j]; if (!part.length) continue;
        G.spawns.push({ n: G.wave, list: part, lanes, ang: ls[j].ang, idx: 0, timer: 0, gaps: ls[j].main ? bellGaps(part.length, gap) : null });
        const key = laneKey(lanes.swarm, ls[j].ang); (G.laneTotals ||= {})[key] = (G.laneTotals[key] || 0) + part.length;
      }
      return;
    }
    for (let j = 0, at = 0; j < k; j++) {
      const len = share ? per + (j < list.length - per * k ? 1 : 0) : per, part = list.slice(at, at + len); at += len;
      if (!part.length) continue;
      const ang = (laneBestTurn(lanes[list[0]], k, G.wave, list[0]) + (j / k) * Math.PI * 2) % (Math.PI * 2); // laneBestTurn: the most even copies, then the most lane, then nearest the usual turn; then the split
      // a boss arrives BOSS_INTRO s into its wave, after its warning (owner)
      G.spawns.push({ n: G.wave, list: part, lanes, ang, idx: 0, timer: boss ? BOSS_INTRO : 0 });
      // each lane copy remembers how many it was sent, for its brightness
      for (const type of part) { const key = laneKey(lanes[type], ang); (G.laneTotals ||= {})[key] = (G.laneTotals[key] || 0) + 1; }
    }
  });
  G.nextIn = WAVE_TIMER;
  G.started = true;
}


// Each enemy TYPE rides ITS OWN spiral pair (owner, 2026-10-08: one speed for all, the
// spiral sets the pace - fast takes the most direct; turns solved per type, PAIR_TURNS
// in aspira-defs.js), always the pair's CLOCKWISE twin (EVERYTHING rides clockwise,
// owner 2026-10-05: the odd lane of a pair). So the entry still moves round the rim,
// each wave turns the whole set laneTurn(n) about the core (5 slots a wave, as the
// old (n*5 + k*7) % 12 rotation did) - the parts of a split group ride copies turned on from there.
// (Was: type k of wave n took lane (n*5 + k*7) % 12, each type at its own speed.)
const TYPE_PAIR = { fast: 4, bonus: 1, swarm: 2, shield: 3, armor: 0 }; // fast and armor SWAPPED (owner, 2026-10-12: "make fast use more windy paths, make armor use more direct paths"; fast took pair 0, the most direct, armor pair 4, the windiest)
const TYPE_ORDER = Object.keys(ENEMIES);
const isCcw = pi => pi % 2 === 0;
const laneTurn = n => ((n * 5) % N_PATHS) * 2 * Math.PI / N_PATHS;
function laneMap() {
  const out = {};
  for (const type of TYPE_ORDER) out[type] = 2 * TYPE_PAIR[type] + 1;
  return out;
}

// Lanes in use right now (a live enemy on them), keyed by
// lane + rotation ("pi:ang"): { pi, ang, color, n, star, a } with the riding
// type's colour and its wave number; feeds the lane highlight and the
// wave:track labels in aspira-lanes.js. ang 0 is the lane itself, else a
// rotated copy. Brightness a = ALIVE / SENT on that lane (owner, 2026-10-02,
// replacing a timed fade): it fills in as the group spawns and drains as it
// dies, and the lane's count is forgotten once nothing is alive or queued.
const laneKey = (pi, ang) => pi + ":" + ang.toFixed(3);
// LANES BEFORE THEIR ENEMIES (owner, 2026-10-19: "show lanes a few seconds before the enemy spawns" / "except for bosses" / "don't
// delay the waves, just show the lanes early"): the last LANE_LEAD s of the countdown light the NEXT ordinary wave's lanes, fading
// in (laneSoon - the same lanes and turns sendWave will pick: wavePlan, formSplit and laneBestTurn are all fixed by the wave number)
const LANE_LEAD = 3;
function laneSoon() {
  const n = G.wave + 1;
  if (!G.started || G.over || !(G.nextIn > 0 && G.nextIn <= LANE_LEAD) || n % STAR_EVERY === 0 || G.wave % STAR_EVERY === 0 /* the wave after a boss: no early lanes (owner, 2026-10-24: "after boss wave, no need to show lanes early") */ || (typeof bossUp === "function" && bossUp())) return [];
  const p = wavePlan(n, G.lastType), pi = laneMap(n)[p.type], k = firstOne(n) ? 1 : Math.min(p.count, formSplit(p.type, p.count, n)), a = 1 - G.nextIn / LANE_LEAD;
  if (p.type === "swarm" && k - k % SWARM_MAIN > SWARM_MAIN) { const k3 = k - k % SWARM_MAIN, sz = swarmParts(p.count, k3); return swarmLanes(pi, k3, n).map((l, i) => ({ pi, ang: l.ang, color: ENEMIES.swarm.color, n, star: false, swarm: true, alive: 0, a, sent: sz[i] })).filter(u => u.sent > 0); } // (a lane that gets no one is no preview) // (the same three main lanes + the rest, each with its share of the swarm: sendWave)
  return Array.from({ length: k }, (_, j) => ({ pi, ang: (laneBestTurn(pi, k, n, p.type) + (j / k) * Math.PI * 2) % (Math.PI * 2), color: ENEMIES[p.type].color, n, star: false, swarm: p.type === "swarm", alive: 0, a }));
}
function activeLanes() {
  const out = new Map(), totals = G.laneTotals || {};
  for (const e of G.enemies) {
    if (e.dead) continue;
    const key = laneKey(e.pi, e.ang || 0), u = out.get(key);
    if (u) { u.alive++; if (ENEMIES[e.type].star && !u.star) Object.assign(u, { star: true, color: ENEMIES[e.type].color }); } // a boss lane whichever rider comes first
    else out.set(key, { pi: e.pi, ang: e.ang || 0, color: ENEMIES[e.type].color, n: e.n, star: !!ENEMIES[e.type].star, swarm: e.type === "swarm", alive: 1 });
  }
  // A LANE IS LIT FROM THE MOMENT ITS WAVE IS SENT (owner, 2026-10-26: "lane previews disappear before lane appears, should just use those as
  // the lanes instead of spawning a second set"): its units still queued count as on it, so the preview (laneSoon) hands straight over at
  // full brightness and the lane drains as they die - not dark till the first unit is out, then 1/N (a boss's lane still waits for its sky)
  const queued = new Map();
  for (const w of G.spawns) for (let i = w.idx; i < w.list.length; i++) {
    const t = w.list[i], key = laneKey(w.lanes[t], w.ang || 0); queued.set(key, (queued.get(key) || 0) + 1);
    if (!out.has(key) && !ENEMIES[t].star) out.set(key, { pi: w.lanes[t], ang: w.ang || 0, color: ENEMIES[t].color, n: w.n, star: false, swarm: t === "swarm", alive: 0 });
  }
  for (const key in totals) if (!out.has(key) && !queued.has(key)) delete totals[key];
  for (const [key, u] of out) { const q = queued.get(key) || 0; u.sent = totals[key] || u.alive + q; u.a = Math.min(1, (u.alive + q) / u.sent); } // sent: a swarm lane's share of the swarm (litLanes)
  for (const u of laneSoon()) { const key = laneKey(u.pi, u.ang); if (!out.has(key)) out.set(key, u); } // the next wave's lanes, early
  return out;
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
// EVERY LANE TURNED TO THE SCREEN (owner, 2026-10-14: bosses first - "rotate them so that they stay on screen for as long as
// possible" - then "rotate all paths to maximize time on screen"), AND ITS COPIES EVENED OUT (landscape box): of LANE_TURNS
// turns of a group's lane (its k split copies with it), keep those whose copies' on-screen lengths differ least (spread =
// longest - shortest, within LANE_EVEN_SLACK of the biggest total); of those, the ones keeping within LANE_TURN_SLACK of the
// most lane on the screen (total) - and of those, the nearest the wave's usual turn, so the waves still come round from new
// directions. k = 1 has no spread, so it is just the old most-on-screen rule. Scores cached per lane and split.
// ONE PICK FOR BOTH VIEWS (owner, 2026-10-22: "all lanes should be the same orientation between the two views / just rotate them
// alongside the board"): scored on the PORTRAIT box in world units (BOX_SHORT x BOX_LONG round the core), never the screen - so the
// pick is the same on every device and view, and the landscape box gets it turned the box's quarter turn (laneBestTurn).
// The simulator (no screen) keeps laneTurn
const LANE_TURNS = 72, LANE_TURN_SLACK = 0.005, LANE_EVEN_SLACK = 0.02, laneTurnCache = new Map(); /* finer (owner, 2026-10-18: "the lanes are rotated about the core such that as much of it is visible as possible"): 5-degree turns, within 0.5% of the best (was 24 turns, 2%) */
const laneTurnKey = (pi, k) => pi + "|" + k, inPortraitBox = p => Math.abs(p.x - CX) <= BOX_SHORT && Math.abs(p.y - CY) <= BOX_LONG;
function laneTurnScores(pi, k) {
  const pts = PATHS[pi].pts, key = laneTurnKey(pi, k);
  let sc = laneTurnCache.get(key);
  if (sc) return sc;
  sc = [];
  for (let i = 0; i < LANE_TURNS; i++) {
    let total = 0, lo = Infinity, hi = 0, axis = null;
    for (let j = 0; j < k; j++) {
      const a = i / LANE_TURNS * Math.PI * 2 + (j / k) * Math.PI * 2;
      let prev = null, len = 0, entry = null;
      for (let q = 0; q < pts.length; q += 6) { const p = rotAbout(pts[q], a), on = inPortraitBox(p); if (on && !entry) entry = p; if (on && prev) len += Math.hypot(p.x - prev.x, p.y - prev.y); prev = on ? p : null; }
      total += len; lo = Math.min(lo, len); hi = Math.max(hi, len);
      const ax = !entry ? "" : Math.abs(entry.y - CY) > Math.abs(entry.x - CX) ? "v" : "h"; axis = axis === null || axis === ax ? ax : ""; // the side every copy comes on screen from: v top/bottom, h left/right, "" mixed
    }
    sc.push({ spread: hi - lo, total, axis });
  }
  laneTurnCache.set(key, sc);
  return sc;
}
/* PRE-WARMED (perf, 2026-10-16: each of the first waves scored 3-6 new lane / split pairs on the spot, ~10 ms each - a 60 ms hitch as a wave starts; 12 lanes x 6 splits in all): once the 3D view is up, a quiet timer scores the missing pairs a few ms at a time (the same pure scores, only earlier; it re-checks after a resize) */
(function laneTurnWarm() {
  if (typeof setTimeout !== "function" || typeof document === "undefined" || (typeof INSTANT_COINS !== "undefined" && INSTANT_COINS)) return;
  const tick = () => {
    if (typeof warp === "undefined" || !warp.p || document.hidden || typeof phoneInside !== "function") return setTimeout(tick, 1000); /* (warp: a later script's - looked up when the timer runs) */
    const t0 = performance.now();
    for (let pi = 0; pi < PATHS.length; pi++) for (let k = 1; k <= 6; k++) {
      if (laneTurnCache.has(laneTurnKey(pi, k))) continue;
      laneTurnScores(pi, k);
      if (performance.now() - t0 > 4) return setTimeout(tick, 150);
    }
    setTimeout(tick, 2000);
  };
  setTimeout(tick, 2000);
})();
// the game turns lanes to the screen (not the simulator's player, unless SIM_REAL_LANES - REAL_LANES=1)
const realLanes = () => !((typeof AUTO_POS !== "undefined" && AUTO_POS && !(typeof SIM_REAL_LANES !== "undefined" && SIM_REAL_LANES)) || typeof phoneInside !== "function");
// THE FIRST WAVE MEETS THE BUILD HINT (owner, 2026-10-21: "have the first fast wave come from the side that spends the most time within the
// tower with the build hint"): wave 1 rides ONE lane copy, turned so the most of it lies within the towers' mean reach of the hint's slot
// (the top-left open one - drawSlotArrow, aspira-chooser.js), among the turns that come onto the SCREEN through its TOP in portrait and
// its LEFT in landscape (owner, 2026-10-22: "in portrait from top / landscape from left" - wave 1 alone is not turned with the board)
const firstOne = n => n === 1 && realLanes(), firstTurnCache = new Map();
function hintCell() { let c = null; CELLS.forEach((cell, ci) => { if (cellOpen(ci) && (!c || cell.y < c.y - 1 || (Math.abs(cell.y - c.y) <= 1 && cell.x < c.x))) c = cell; }); return c; }
function screenSide(p) { // the screen edge a point just off the screen lies past (3D: in the view's pixels; past the horizon is the top)
  const side = (b, x, y) => { const dx = x < b.x0 ? b.x0 - x : x > b.x1 ? x - b.x1 : 0, dy = y < b.y0 ? b.y0 - y : y > b.y1 ? y - b.y1 : 0; return dy >= dx ? (y < b.y0 ? "top" : "bottom") : x < b.x0 ? "left" : "right"; };
  if (!phoneOn3d()) return side(phoneBox(), p.x, p.y);
  return fitView(() => viewCam(() => { const s = warpProject(p.x, p.y, 0); return s.s > 0 ? side(phoneRect3d(), s.x, s.y) : "top"; }));
}
function firstTurn(pi) {
  const c = hintCell(); if (!c) return null;
  const want = typeof BOX_WIDE !== "undefined" && BOX_WIDE ? "left" : "top", key = pi + "|" + want + "|" + innerWidth + "x" + innerHeight + "|" + c.x + "," + c.y;
  if (firstTurnCache.has(key)) return firstTurnCache.get(key); // (laneSoon asks every frame of the lead)
  const ks = Object.keys(TOWERS), R = ks.reduce((a, k) => a + TOWERS[k].range, 0) / ks.length * RANGE_BONUS, pts = PATHS[pi].pts;
  let best = null, bl = -1, any = 0, al = -1;
  for (let i = 0; i < LANE_TURNS; i++) {
    const a = i / LANE_TURNS * Math.PI * 2; let prev = null, len = 0, from = null, last = null;
    for (let q = 0; q < pts.length; q += 3) {
      const p = rotAbout(pts[q], a), on = Math.hypot(p.x - c.x, p.y - c.y) <= R;
      if (!from && phoneInside(p.x, p.y)) from = last ? screenSide(last) : "top"; last = p;
      if (on && prev) len += Math.hypot(p.x - prev.x, p.y - prev.y); prev = on ? p : null;
    }
    if (len > al) { al = len; any = a; }
    if (from === want && len > bl) { bl = len; best = a; }
  }
  firstTurnCache.set(key, best ?? any);
  return best ?? any;
}
// ARMOR DOWN THE LONG AXIS (owner, 2026-10-22: "for vertical screen, armour should come from top + bottom / for horizontal, sides"): an
// armor wave's turns are only those whose copies all come into the portrait box from its top/bottom (turned with the box, the sides in
// landscape); the rules above pick among them. Any turn when none qualifies
function laneBestTurn(pi, k, n, type) {
  const wide = typeof BOX_WIDE !== "undefined" && BOX_WIDE ? Math.PI / 2 : 0, base = laneTurn(n); // landscape = the portrait pick turned the box's quarter turn (rotAbout sense)
  if (!realLanes() || !PATHS[pi]) return base + wide;
  if (n === 1 && k === 1) { const f = firstTurn(pi); if (f !== null) return f; } // (the screen's own turn: not turned with the board)
  // THE SAME LANES AGAIN while they are still lit (owner, 2026-10-26: "lane previews disappear before lane appears, should just use those
  // as the lanes instead of spawning a second set"): two waves of one type in a row took turns 150 degrees apart, so the next wave's k
  // copies previewed BETWEEN the last wave's k still-lit ones - the same colour, alternating bright and faint round the board. If this
  // lane's k lit copies are up (the last wave's, k-fold), the next wave rides them
  { const lit = Object.keys(G.laneTotals || {}).filter(key => key.startsWith(pi + ":")).map(key => +key.split(":")[1]), per = Math.PI * 2 / k;
    if (lit.length === k && lit.every(a => Math.abs((((a - lit[0]) % per) + per) % per) < 1e-3 || Math.abs((((a - lit[0]) % per) + per) % per - per) < 1e-3)) return lit[0]; } // (the angle holds the box's quarter turn already)
  const all = laneTurnScores(pi, k), step = Math.PI * 2 / LANE_TURNS;
  const sc = type === "armor" && all.some(s => s.axis === "v") ? all.map(s => (s.axis === "v" ? s : { spread: Infinity, total: 0 })) : all; // (index = turn: the others kept as never-picks)
  const flat = Math.min(...sc.map(s => s.spread)) + LANE_EVEN_SLACK * Math.max(...sc.map(s => s.total)), even = sc.filter(s => s.spread <= flat);
  const best = Math.max(...even.map(s => s.total));
  let pick = base, gap = Infinity;
  sc.forEach((s, i) => { if (s.spread > flat || s.total < best * (1 - LANE_TURN_SLACK)) return; const t = i * step, d = Math.abs(((t - base) % (Math.PI * 2) + 3 * Math.PI) % (Math.PI * 2) - Math.PI); if (d < gap) { gap = d; pick = t; } });
  return pick + wide;
}
