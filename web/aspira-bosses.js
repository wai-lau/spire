// /aspira — the TEN BOSSES (owner, 2026-10-02): every 10th wave is a boss from
// the Major Arcana (the Fool and the Tower left out). Each keeps the boss
// rules - it comes alone, holds the wave timer, costs its HP% left in lives if it
// gets through (bossLeakLives, below; ended the game until 2026-11-03) - and adds its own trick:
//   12 Star        none: the plain boss that teaches the rules; its fleet a 3 x 10 lattice of fast behind it (FLEET_LATTICE, 2026-11-05)
//   24 Chariot     its speed a smooth gallop, x(1.5 + 0.5 sin) over CHARIOT_EVERY s (chariotPace; a step until 2026-11-07)
//   36 Strength    takes 10% of any slow (BOSS_SLOW_K); at the centre of a 3 x 12 armor lattice (FLEET_LATTICE, 2026-11-05)
//   48 Lovers      a PAIR on opposite lanes, no trick but the core's ease does not slow them, with one armor wave scattered round them
//   60 Empress     broods of swarm at 90 / 70 / 50% of her HP; VEILED (untouchable, faint, slower) while any of a brood lives (bossVeil, 2026-11-07)
//   72 Judgement   comes alone; killed, she rises once at the start of her lane at full HP with 1.2 swarm waves, VEILED while they live
//   84 Justice     no single hit takes more than JUSTICE_CAP of its HP; at the crossing of a 7 x 13 cross of armored, shielded escorts (laid straight)
//   96 Temperance  regenerates TEMPERANCE_REGEN of its HP a second; at the centre of a 3 x 12 shield lattice (2026-11-05)
//  108 Death       a juiced-up Star (owner): no tricks, the most HP but the Chariot; half a wave of each of the four types round her at once (2026-11-05)
//  120 Devil       THE FINAL BOSS: her host first (half a fast + half a swarm wave, devilEscorts), the six once half of it is on screen; comes as SIX
//                  (DEVIL_COPIES), each a full boss on its own copy of the lane, two a lane - each one through costs a sixth of its HP% in lives
// (the order and the tricks: owner, 2026-11-07 22:15 / 22:30 / 22:40; the waves are ARCANA's order x STAR_EVERY)
// Boss HP is ENEMIES.bonus.hp (halved, owner). Loaded after aspira-waves.js
// (the simulator loads it too).
// each with a HINT (owner): a mythic subtitle under its name - its trick told
// sideways, never spelled out - as a HAIKU (owner, 2026-10-05): three lines,
// 5-7-5 syllables, drawn one under another
const ARCANA = [
  // THE ORDER (owner, 2026-11-07 22:15: "chariot goes after star / empress goes after lovers / devil after death / temperence moves after judgement /
  // refit hps and stuff"): 12 Star, 24 Chariot, 36 Strength, 48 Lovers, 60 Empress, 72 Judgement, 84 Justice, 96 Temperance, 108 Death, 120 the Devil
  // (22:40: "swap order of justice and judgement")
  // (was Star, Empress, Strength, Chariot, Lovers, Temperance, Devil, Justice, Judgement, Death)
  // THE HINTS FOR THE NEW TRICKS (2026-11-08): Chariot, Strength, Lovers, Empress, Judgement, Death rewritten (Visual, Leader-relayed); the Devil's is the
  // owner's own, verbatim but the set's capital and full stop ("six faces hunger / three paths, vermillion, and yet / even one, dooms all"); Star, Justice, Temperance kept
  { id: "star", name: "The Star", hint: ["One light in the dark", "crossing the long silent sky", "asks only to meet."] },
  { id: "chariot", name: "The Chariot", hint: ["Like the tide, it comes -", "surging close, then falling back,", "then surging again."] },
  { id: "strength", name: "Strength", hint: ["A mountain that walks,", "plated thick against the storm;", "blows break on her stone."] },
  { id: "lovers", name: "The Lovers", hint: ["Apart, they still come,", "and nearing home, they hasten -", "love will not slow down."] /* new poem (owner, 2026-11-05: "new poem" - two bosses on opposite lanes, an armor wave round them, no trick; was "Two walk as one heart. / Part them, and the one who stays / will never forgive.", the heal-and-run) */ },
  { id: "empress", name: "The Empress", hint: ["Wound her, and she sleeps", "behind a veil of her young;", "slay them, and she wakes."] },
  { id: "judgement", name: "Judgement", hint: ["The trumpet sounds once;", "the fallen rise as its shield -", "none may judge the judge."] },
  { id: "justice", name: "Justice", hint: ["The scales hold steady.", "No blow, however heavy,", "outweighs the balance."] },
  { id: "temperance", name: "Temperance", hint: ["What is poured away", "returns to the cup again;", "the wound fills, and heals."] },
  { id: "death", name: "Death", hint: ["No riddle, no trick,", "only the long road to dark -", "and one more beyond."] },
  { id: "devil", name: "The Devil", hint: ["Six faces hunger", "three paths, vermillion, and yet", "even one, dooms all."] },
];
// EACH BOSS ITS OWN DIE (owner, 2026-11-07: "visually update dice shapes, (keep boss sizes): chariot should use the fast dice shape / strength
// should use the shield shape / lovers armor / empress d20 / ... judgement cube / justice shield / ... temperence armor / death d20 / devil fast"):
// the die a boss is DRAWN as (the 3D solid, its 2D outline, its wave-list icon) - an enemy type's shape, "bonus" the d20; the Star keeps
// its own (the d20). The look only: its type stays "bonus" (size, HP, everything else)
const BOSS_DIE = { chariot: "fast", strength: "shield", lovers: "armor", empress: "bonus", judgement: "swarm", justice: "shield", temperance: "armor", death: "bonus", devil: "fast" };
const dieOf = e => (e.arcana && BOSS_DIE[e.arcana]) || e.type, bossDieAt = n => BOSS_DIE[arcanaOf(n).id] || "bonus";
// fitted 2026-10-05 (scripts/aspira-sim/bossbal.mjs): each boss comes 0.9x as
// near the core as the four waves around it (owner: "just a little closer"),
// on closest approach, against every open slot filled. Was star 4, strength 2,
// lovers 2, temperance 5, justice 1.5, judgement 1.5, death 3. Death's fit
// (1.8) sits on the edge of leaking - a boss leak then ended the game - so 1.6.
// REFIT 2026-10-07 (bossbal.mjs tune, 2 seeds, after the free core, the chart-axis
// refit and the fast refit): Chariot 40 and Temperance 60 breached the reference
// team, Lovers 50 got to 47 of the core (target 168). Was star 3.4, empress 2,
// strength 0.9, chariot 4, lovers 3.1, temperance 3, devil 0.75, justice 4.4,
// judgement 1.7. Death not refitted (the run was stopped for memory): kept 1.6.
// BOSSES CLOSER (owner, 2026-10-13: "make bosses challenging (10-20% closer)"): every boss but the Star x BOSS_HP_K. let: the sims sweep it
// ...and the ones that STILL stopped far out more (owner, 2026-10-13: "make the far away bosses stronger"): waverep x3.5 brought
// the Empress 271 -> 213 and Strength 273 -> 231; Death 346 -> 296 at x2.4, 169 at x3.5 (2 of 36 games lost), so x2.8
const BOSS_FAR = { empress: 3.5, strength: 3.5, death: 8.4 /* x3 (owner, 2026-10-28: "balance the boss to the towers" - after the 6.16.0 tower tops frz+grv+ifr beat Death on 18 tier points, the OLD rule >= 30 of 39, superseded 2026-11-03 by the win-rate rule at BOSS_HP; trioplan beam 3: x2 19, x3 35; acd+grv+crr, the weakest winnable, still wins on 34 at x1, x3, x4) */ };
// DEATH x0.6 of the shared boost (owner, 2026-10-16: "every winnable trio fully upgraded should beat death"): at x1 it ended
// ARC+SOL+ACD and ARC+FRZ+ACD at wave 120; at x0.6 both won 4/4 (triodiag, with GRV_STRIP 2.5)
const BOSS_DEATH_K = 0.6;
// a boss's HP over its wave's bonus HP, before the lane and BOSS_HEFT - ONE formula for its spawn and the wave list's number (2026-10-28:
// the list kept its own, without BOSS_HP_K, BOSS_DEATH_K, BOSS_FAR or BOSS_HEFT, and showed Death ~14x too low)
const bossHpMul = id => (BOSS_HP[id] || 1) * (id === "star" ? 1 : BOSS_HP_K * (id === "death" ? BOSS_DEATH_K : 1)) * (BOSS_FAR[id] || 1);
let BOSS_HP_K = 1.4; // waverep 2026-10-13: x1.4 brings bosses 24-108 in 16% (mean nearest 252 -> 211), x1.8 21%; still 36/36 won
// THE REORDER REFIT (owner, 2026-11-07: "refit hps and stuff"; 100-game bosses-on passes on the new order, 2026-11-08): strength 6.44 -> 39 (exempt from
// the 800% rule, Wai), lovers 35.7 -> 21.4, empress 11.02 -> 5.5, judgement 1.904 -> 5.7, justice 3.2 -> 14, temperance 4.76 -> 2.43, death 0.72 -> 1.79,
// devil 1.277 -> 1.43; chariot held at Wai's x1.2 (31.82). Depth ratios (BF3, 32 of 100 won): Strength 0.92, Lovers 1.13, Empress 1.03, Justice 1.06,
// Temperance 0.85; Judgement 0.28 (her 0.2x veiled walk - HP barely moves her), Death 0.79 with 20% of runs ending there, Devil 0.77
/* BOSSES CLOSER (owner, 2026-10-17: "10% closer than neighbouring waves"): Star x1.8, Empress x1.5, Strength x1.3, Chariot x3, Lovers x2, Temperance x2, Devil x1.5 - the highest every trio still beats (sim bosswave: Star 0.87, Empress 0.97 of the neighbours' closest approach; the rest stay far, a bigger HP loses the weakest trios) */ /* BOSSES CLOSER, 2nd pass (2026-10-18, SLOT_R 148, bosses x2 speed): vs the 2026-10-17 table Empress x0.9, Chariot x2, Lovers x2.5, Temperance x1.5, Devil x2, Justice x2, Judgement x1.6, Death x1.5 - 60/60 games won (bosswave sim); Strength is held by the FRZ trios */ const BOSS_HP = { star: 14.4 /* x1.2 (the boss pass 7.8.0, 2026-11-07) */ /* was 12: /* the duo rule over the WAY SHORTER boss lane (2026-10-27, duo0.mjs: 20 -> 19/21 clean, frz+ifr and grv+ifr leaked the Star; 15 -> 20/21; 12 -> 21/21) */ /* every PAIR of fresh towers beats it (owner, 2026-10-18: CRR+GRV lost to it at 46.08 - solo.mjs: 30 and 35 still beat ARC+ARC, ARC+CRR, CRR+CRR) */ /* was 46.08 * /* x0.8 (owner, 2026-10-15: "any pair of two towers doesn't leak on waves 1-12" - two ARCs broke through at 32) */ /* (owner, 2026-10-12: "require 2 towers or an upgrade to beat the star", SOL and ACD may solo it; solo.mjs; was 5.4) */, empress: 5.5, strength: 39, chariot: 31.82 /* x1.2 of the pre-refit 26.52, not x1.6 (owner, 2026-11-07 22:00: Chariot "still OP", picked A - its play feel over the 1.0x depth target; the gallop unchanged) */, lovers: 21.4, temperance: 2.43, devil: 1.43, justice: 14, judgement: 5.7 /* x0.85 with the count taper (7.3.0), back to x1 with the revive at 30% (7.3.x) */, death: 1.79 } /* THE BOSS PASS 7.8.0 (owner, 2026-11-06: "make sure bosses just get to about 120% of a normal wave"; 2026-11-07 "3D": refit toward 1.0x on 100 games, the rest to the redesign list): Star x1.2 (the duo rule's cap), Chariot x1.6 (was 26.52), Lovers x3.5 (was 10.2), Devil x1.4 (was 0.912). Depth ratio = (1 - the neighbour waves' lane progress) / (1 - the boss's), players3b bosses on, 100 games (blocks 1+2), 7.7.119: Chariot 0.91, Lovers 0.98, Devil 1.08, each ending <= 7% of the runs that reach it; wins 29/97. HP cannot fit the other six - Strength (x10: 0.73), Empress, Temperance, Justice, Judgement, Death stay x1, on the redesign list */ /* THE BOSS PASS (7.2.0, 2026-11-03; was empress 9.18, strength 4.29, chariot 20.4, lovers 12, temperance 3.66, devil 2.28, justice 12.8, judgement 5.44, death 4.8): x1.2 x1.5 x1.3 x0.85 x1.3 x0.4 x0.25 x0.35 x0.15, with BOSS_SHIELD_K 1.2 -> 0.5 and Death's speed 1.4 -> 1.1, under the HP%-lives leak (7.1.30). The rule (Wai, 2026-11-03: "The answer to this is whatever makes the game more fun and engaging"): the bosses-on good model (8 seeds) wins >= 15% and no boss ends more than ~20% of the runs that reach it; "survived but lost lives" 10-30% a boss is a target, not a gate. Measured (players3b bosses on, 224 games): 78 won (35%), ended / survived-but-lost: Devil 6/6, Justice 10/5, Judgement 18/14, Death 10/6, every other boss <= 5% ended (was 7.1.25: 7 won of 112) */; // every one DOUBLED (owner, 2026-10-12: "double each bosses hp"; was 2.7 3.4 1.1 1.7 1.2 0.61 0.38 3.2 1.7 1.6)
// each boss's ARMOR (x the armored enemy's growth curve at its wave, like ENEMIES.armor) and SPEED
// (x the boss base) - owner, 2026-10-08: the bosses ACD is too good against get armor and speed and
// lose HP, so SOL (whose hits strip armor) and ACD (whose ramp wants a long-lived target) boss alike
const BOSS_ARMOR = { star: 0, empress: 0, strength: 0, chariot: 0, lovers: 0, temperance: 0, devil: 0, justice: 0, judgement: 0, death: 0 };
const BOSS_SPEED = { star: 1, empress: 1, strength: 1, chariot: 1.3, lovers: 1.3, temperance: 1.5, devil: 1.3, justice: 1.3, judgement: 1.4, death: 1.1 /* 1.4 -> 1.1 (the boss pass, 7.2.0) */ }; /* 2026-10-18: the far bosses a little quicker (justice was 0.75: slowed 2026-10-12, then it broke through) */
// each boss's SHIELD (hits absorbed, whatever their size) and its REFILL a second - the counter to
// SOL's few huge hits (owner, 2026-10-08): ACD's ticks, ARC's forks and FRZ's aura strip it cheaply
// EVERY boss carries a little SHIELD (owner, 2026-10-12: "SOL feels too good vs bosses - give them all a little bit of
// shields"): BOSS_SHIELD_K of a shield enemy's charges at its wave, on top of its own BOSS_SHIELD
const BOSS_SHIELD_K = 0.5; /* 0.5 -> 1.2 (2026-10-18, bosses closer without more HP) -> 0.5 (the boss pass, 7.2.0: each charge eats a whole hit, so at 1.2 Death carried 434 charges and HP cuts barely moved the late bosses) */
const BOSS_SHIELD = { star: 0, empress: 0, strength: 0, chariot: 0, lovers: 0, temperance: 0, devil: 0, justice: 0, judgement: 0, death: 0 };
const BOSS_SHIELD_REGEN = { star: 0, empress: 0, strength: 0, chariot: 0, lovers: 0, temperance: 0, devil: 0, justice: 0, judgement: 0, death: 0 };
const BOSS_INTRO = 2; /* 20% shorter (owner, 2026-10-12; was 2.5) */ // s between a boss wave starting and its boss arriving (its warning plays)
// THE EMPRESS'S BROOD (owner, 2026-11-05, the boss redesign: "Empress, spawns a wave of swarm on every 3rd of hp"): past 2/3 and past 1/3 of
// her HP, a whole swarm wave of her wave number (typeWaveCount) pours out behind her, streaming like a swarm wave. Was EMPRESS_BROOD 12
// swarmers a fifth (fitted 2026-10-05)
const EMPRESS_GAP = 6; // u between swarmers as they pour out (EMPRESS_STEP 1/3 gone with the 90/70/50 broods)
// AT 90 / 70 / 50% (owner, 2026-11-07 22:30: "release swarm at 90% 70% 50% hp"; was past 2/3 and 1/3) - and VEILED while any of them lives:
// "empress visually reduced in opacity, untargettable and invuln while swarm is up" (e.veiled, bossVeil below)
const EMPRESS_AT = [0.9, 0.7, 0.5];
// HALF A AND HALF C (owner, 2026-11-08: "half A and half C", after the reorder's first pass - Empress 3.5x a wave's depth, Judgement 8.9x): each brood
// EMPRESS_BROOD_K (2/3) of a swarm wave and the veiled Empress walks at 0.75x; Judgement (owner, 2026-11-08: "wait, for judgement, keep 1.2x wave, walk at
// 0.2 speed when veiled") keeps her 1.2 swarm waves and walks at 0.2x while veiled - VEIL_SPD by boss, read by effSpeed (aspira-game.js)
const EMPRESS_BROOD_K = 2 / 3, VEIL_SPD = { empress: 0.75, judgement: 0.2 }; // HP share a brood; u between swarmers as they pour out
// a plain wave of `type` at wave n, as wavePlan would send it (the count taper, never under the wave before): the boss redesign's "a wave"
const typeWaveCount = (type, n) => Math.max(1, Math.round(countK(n) * Math.max(waveCount(type, n), planCount(type, n))));
// A SMOOTH GALLOP (owner, 2026-11-07 22:30: "chariot, change speed from step fn to sinusoidal"): x(1.5 + 0.5 sin) over a CHARIOT_EVERY (1 s) period -
// the same x1.5 average, peaking at the sprint's x2 (CHARIOT_SPD) and easing to x1 between; was 0.5 s at x2, 0.5 s at x1
const chariotPace = t => 1 + (CHARIOT_SPD - 1) / 2 * (1 + Math.sin(2 * Math.PI * t / CHARIOT_EVERY));
const CHARIOT_EVERY = 1, CHARIOT_T = 0.5, CHARIOT_SPD = 2, LOVERS_SPD = 1.5; // THE GALLOP (owner, 2026-11-06: "make chariot speed gallop instead, like 0.5s sprint ever second"): 0.5 s at x2 every second - the same x1.5 average as the old 1 s at x3 every 4 s (was 4, 1, 3)
const DEVIL_TRAIL = 540; // world units between the two Devils on a lane, ~1.5 s at its pace (aspira-step.js stepSpawns)
const TEMPERANCE_REGEN = 0.06, DEVIL_COPIES = 5, DEVIL_LANES = 3, JUSTICE_CAP = 0.02; /* (JUDGEMENT_REVIVE 0.3 GONE 2026-11-05: she rises at full HP at her lane's start - bossRise) */ /* 0.5 -> 0.3 (2026-11-03): its second life was what reached the core (survivors lost ~10 lives each); HP x0.85 moved it 23% -> 22% ended, the revive at 30% (HP x1) 22% -> 13%, with 19% surviving a leak (the felt-threat band) */

// a boss's HP scaled with its lane's length while it rode a different lane each boss wave; it has ONE
// spiral now (owner, 2026-10-08), so the old average factor (1.107 over the boss waves) stands as a constant
const BOSS_LANE_HP = 1.107;
// A BOSS AT THE CORE costs lives = the share of its HP still left, out of 100, rounded up; a Lover costs half that, a Devil copy a
// sixth (owner, 2026-11-03: "lets make bosses make you lose lives equal to the percentage of life left on the boss instead of rhe
// losing the game instantly. ... (Lovers gets /2, devil gets /6 lives lost rounded up, but numbers on the dice still show put of
// 100)"). Was: a boss that got through ended the game outright (owner, 2026-10-02). Each body counts its own hp / max.
const BOSS_LEAK_DIV = { lovers: 2, devil: 6 };
const bossLeakLives = e => Math.max(1, Math.ceil(Math.max(0, e.hp) / (e.max || 1) * 100 / (BOSS_LEAK_DIV[e.arcana] || 1) - 1e-9));
// the game-over title when a BOSS gets through (owner: "overwhelmed by strength")
const BOSS_BREACH = {
  star: "eclipsed by the star", empress: "smothered by the empress", strength: "overwhelmed by strength",
  chariot: "overrun by the chariot", lovers: "undone by the lovers", temperance: "outlasted by temperance",
  devil: "bound by the devil", justice: "sentenced by justice", judgement: "weighed by judgement", death: "silenced by death",
};
const arcanaOf = n => ARCANA[Math.min(ARCANA.length, Math.max(1, Math.round(n / STAR_EVERY))) - 1];
// how many bosses ride a boss wave: the Lovers come as two, the Devil as six,
// one on each of six lane copies
const bossCount = n => (arcanaOf(n).id === "devil" ? 1 + DEVIL_COPIES : arcanaOf(n).id === "lovers" ? 2 : 1);
const bossSplit = n => (arcanaOf(n).id === "devil" ? DEVIL_LANES /* TWO A LANE (owner, 2026-10-27: "put 2 devils per lane, so that there's only 3"; was six lanes) */ : arcanaOf(n).id === "lovers" ? 2 : 1); // the Lovers on TWO lanes, opposite (owner, 2026-10-12; they shared one)
const isA = (e, id) => e.arcana === id;

// BOSSES WEIGHTIER (owner, 2026-10-16: "make the bosses feel more significant, halve the movement speed of them and their fleet,
// but double their hp and their fleet's hp"): every boss and every escort at BOSS_PACE of its speed and BOSS_HEFT x its HP (the
// fleet keeps the boss's pace through m.spd = e.spd x ..., so halving the boss halves it)
const BOSS_PACE = 1 /* x2 (owner, 2026-10-17: "double movement speed of all bosses" - with their lane twice as long; was 0.5) */, BOSS_HEFT = 2;
// from spawnEnemy: name the boss for its wave, and pair up the two of a pair
function bossSpawn(e, n) {
  e.arcana = arcanaOf(n).id;
  e.spd = (e.spd || 1) * (BOSS_SPEED[e.arcana] || 1) * BOSS_PACE;
  const grow = hpPow(eqWave(n)) + eqWave(n) * 4 / 18; // the armored enemy's armor curve (spawnEnemy)
  e.armor = e.armor0 = Math.floor((BOSS_ARMOR[e.arcana] || 0) * Math.pow(grow, ARMOR_EXP) * escale(e)); // (x the LATE SCALE)
  e.baseSpd = e.spd; e.broodI = 0; e.sprintT = 0;
  e.shield = e.shieldMax = (BOSS_SHIELD[e.arcana] || 0) + Math.round(BOSS_SHIELD_K * shieldsOf("shield", n).shield); e.shieldBuf = 0;
  // HP per boss: BOSS_HP (fitted, see there; the Devil's is each of six)
  e.max *= bossHpMul(e.arcana); // (BOSS_HP_K: every boss but the Star; BOSS_FAR: the ones that stayed far - bossHpMul, above)
  // ...and by the DISTANCE its lane makes it travel (owner): a long lane keeps
  // it under fire longer, so it gets proportionally more HP (x0.5 .. x1.6, the
  // average lane x1)
  e.max = Math.floor(e.max * BOSS_LANE_HP * BOSS_HEFT); e.hp = e.max; // whole HP (BOSS_HEFT: see there)
  // each boss a size bigger than the last (owner): Star x1.1 ... Death x2
  e.sizeMul = 1 + 0.1 * (ARCANA.findIndex(a => a.id === e.arcana) + 1);
  const mate = bossCount(n) === 2 && G.enemies.find(o => o !== e && !o.dead && o.arcana === e.arcana && o.n === n && !o.mate);
  if (mate) { mate.mate = e; e.mate = mate; }
  bossFleet(e, n);
}
// each boss comes with a FLEET (owner, 2026-10-09: "each boss should come with a fleet of units, thematically" - then
// "don't reduce boss hps", "don't add a huge fleet, maybe the equivalent of 1 wave"): ONE plain wave's worth of its
// escort's types below (waveCount at that wave, plain HP and bounty), split among the bodies of a pair or the Devil's
// six, ahead of and behind it on its lane, its own kin (the inverted sky holds till they die too). The Chariot's
// outriders sprint when she does (bossStep). The fleet keeps the boss's pace, spaced clear of it (FLEET_GAP)
const FLEET = {
  star: ["fast"], empress: null /* none (the boss redesign, 2026-11-05: her swarm waves are her fleet) */, strength: ["armor"], chariot: ["fast", "armor"], lovers: ["swarm", "fast"], // shooting stars, handmaidens, lions, outriders + guards, couples + runners
  temperance: ["shield", "fast"], devil: null /* her host comes ahead of her (devilEscorts, 2026-11-05) */, justice: ["armor", "fast"], judgement: null /* alone (2026-11-05): her swarm comes when she rises (bossRise) */, death: ["fast", "swarm", "armor", "shield"], // the cup + runners, imps + runners, guards + runners, the risen + runners + guards, four horsemen
};
const FLEET_GAP = 10, FLEET_LAYER = 3 * V_BACK; // clear space between bodies, world units; a shield escort V's layers apart
// x a plain wave, per boss: the fleet's SIZE, the balance lever (owner: "balance by adding to boss fleets") - fitted by
// scripts/aspira-sim/bossfleet.mjs against the regular waves before each boss, which overlap where a boss wave does not
// FLEET_TO_BOSS of every escort's HP moves onto its boss (owner, 2026-10-11: "move some life from boss fleet to boss")
const FLEET_TO_BOSS = 0.2; // 0.2 (2026-10-14: the transfer had been dead inside a comment since 10-11; at 0.3 a saver lost ARC+SOL+ACD to the wave-120 boss, 0.2 keeps every trio winnable)
const FLEET_MUL = { star: 3 /* a pack of 3 waves following it (2026-10-12) */, empress: 1, strength: 1, chariot: 1, lovers: 1, temperance: 1, devil: 1, justice: 0.75 /* Justice slowed (owner, 2026-10-12: "boss 80 nerf by slow" - it broke through in 5 of 36 games) */, judgement: 1, death: 1 };
// the slots ([lat, ahead of the boss]) for a boss's shield and armor escorts; R: the boss's own radius
function fleetForm(e, R) {
  return {
    shield: m => Array.from({ length: m }, (_, i) => {
      // LAYERS OF Vs, five wide at most (owner, 2026-10-11: "for each lane, only 5 sub lanes", "shield escort max at 5
      // too, do layers"): the boss tips the first V with 4 shields fanned back from it; each further layer is a V of 5
      // (a tip on the boss's line, then two pairs) FLEET_LAYER behind the last
      const L = i < 4 ? 0 : 1 + Math.floor((i - 4) / 5), j = i < 4 ? i + 1 : (i - 4) % 5; // j: its place in its V, 0 = tip
      const d = Math.ceil(j / 2), side = j % 2 ? -1 : 1, w = V_LAT * 1.4;
      return [side * d * w, -(R + FLEET_GAP + L * FLEET_LAYER + d * V_BACK)];
    }),
    armor: m => { // a lattice ARMOR_W wide round the boss: the middle row's centre is the boss itself
      const P = Math.max(ARMOR_FLEET_PITCH, R + ENEMIES.armor.size + FLEET_GAP), out = [];
      for (let ring = 0; out.length < m; ring++) for (const row of ring ? [ring, -ring] : [0]) for (let c = 0; c < ARMOR_W && out.length < m; c++) {
        const col = c - (ARMOR_W - 1) / 2;
        if (!row && !col) continue; // the boss's own place
        out.push([col * P, row * P]);
      }
      return out;
    },
  };
}
// THE JUDGEMENT'S FLEET SPREADS: lane copies evenly round the rim, each its own share of the escorts in the same formation
// round where the boss would be. The Judgement's boss rides ONE lane and its swarm TWELVE others ("change judgement boss to have boss arrive
// on one lane and the swarms in 12 different ones"); the Devil's six and the Lovers' two already come from their own lanes
// the LINE escorts (fast, swarms) ride fleetTracks() parallel tracks (3 or 5) FLEET_TRACK_W apart across the boss's own lane, the boss in the middle
// (owner, 2026-10-12: "the escorts should travel on parallel lanes to its own (some already do)" - shields and armor did)
// a TIGHTER fleet packs its line escorts closer along their tracks (owner, 2026-10-12: "tighten the escorts" - the Star's spread
// out at the boss's pace was picked off one by one by a lone single-shot tower): x the gap between bodies on a track
const FLEET_TIGHT = { star: 0.2 };
// ...and a PACK BEHIND: every line escort after the boss, none ahead (owner, 2026-10-12: "the star goes first, escort comes as
// one pack after") - the lone single-shot tower is still on the star when the pack arrives
const FLEET_BEHIND = { star: true };
const FLEET_TRACK_W = 26, fleetTracks = n => (fixedRand(n, 7) < 0.5 ? 3 : 5); // 3 or 5, never 4 (owner, 2026-10-13: "make nothing use 4 lanes exactly"; was 3-5)
const fleetLanes = (e, n) => (isA(e, "judgement") ? { L: 12, off: 0.5 } : { L: 1, off: 0 }); // only the Judgement spreads its escorts (owner, 2026-10-12: "escorts don't spread, only judgement"; every fleet rode 3-5 lanes briefly)
function bossFleet(e, n) {
  if (FLEET_SCATTER[e.arcana]) { e.fleet = []; bossScatter(e, n, ENEMIES.bonus.size * (e.sizeMul || 1)); return; }
  const lat = FLEET_LATTICE[e.arcana], kinds = lat ? [lat.k] : FLEET[e.arcana];
  if (!kinds) { e.fleet = []; e.fleetSpan = 0; G.lastBoss = e; return; } // (no fleet: the next boss body spaces off this one, never a boss before)
  e.fleet = [];
  const bodies = bossCount(n), R = ENEMIES.bonus.size * (e.sizeMul || 1), { L, off } = fleetLanes(e, n), span = [0, 0];
  // FORMATIONS ROUND THE BOSS (owner, 2026-10-11): shield escorts fly a V with the boss as its leader, armor a square
  // lattice ARMOR_W wide with the boss in its middle; fast and swarms keep the line ahead of and behind it
  const form = lat ? { [lat.k]: m => latticeSlots(m, R, ENEMIES[lat.k].size, lat.at === "cross" ? lat : lat.at) } : fleetForm(e, R);
  for (let j = 0; j < L; j++) {
    const ang = ((e.ang || 0) + (j + off) * Math.PI * 2 / L) % (Math.PI * 2), reach = [R, R], T = fleetTracks(n), track = Array.from({ length: T }, () => [R, R]);
    let i = 0;
    for (const k of kinds) {
      const all = lat ? Math.round(lat.n / bodies) : Math.max(1, Math.round(waveCount(k, n) * (FLEET_MUL[e.arcana] ?? 1) / kinds.length / bodies)), count = Math.floor(all / L) + (j < all % L ? 1 : 0);
      const slots = form[k] && count ? form[k](count) : null;
      for (let c = 0; c < count; c++, i++) {
        spawnEnemy(k, n, e.pi, ang);
        const m = G.enemies[G.enemies.length - 1], r = ENEMIES[k].size;
        m.max = Math.floor(m.max * BOSS_HEFT); m.hp = m.max; // an escort twice as tough too (BOSS_HEFT)
        if (lat && lat.shield) { m.shield = m.shieldMax = shieldsOf("shield", n).shield; m.shieldBuf = 0; } // (Justice's cross: armored AND shielded)
        if (slots) { // its place in the formation: across the lane, and ahead (+) or behind (-) the boss's spot
          m.form = true; m.lat = slots[c][0]; m.s = e.s + slots[c][1]; m.ahead = slots[c][1]; m.aheadC = 0; if (lat && lat.at === "cross") m.straight = true;
          reach[0] = Math.max(reach[0], slots[c][1] + r); reach[1] = Math.max(reach[1], -slots[c][1] + r);
        } else {
          // on its TRACK across the lane, spaced so NOTHING OVERLAPS (owner, 2026-10-09): ahead, behind, ahead... of the boss's
          // spot, each clearing the one before it on its track by FLEET_GAP
          const tk = i % T, side = FLEET_BEHIND[e.arcana] ? 1 : Math.floor(i / T) % 2, tr = track[tk], lat = (tk - (T - 1) / 2) * FLEET_TRACK_W;
          tr[side] += FLEET_GAP * (FLEET_TIGHT[e.arcana] ?? 1) + r; const ahead = (side ? -1 : 1) * tr[side]; tr[side] += r;
          m.form = true; m.lat = lat; m.s = e.s + ahead; m.ahead = ahead; m.aheadC = 0;
          reach[0] = Math.max(reach[0], tr[0]); reach[1] = Math.max(reach[1], tr[1]);
        }
        // in FORMATION: at the boss's own pace, so the spacing holds (a fast escort behind would run through it)
        m.spd = (e.spd || 1) * ENEMIES.bonus.speed / ENEMIES[k].speed; m.jit = 0; // (a swarmer's wander would carry it into its neighbours)
        m.bossKin = true; m.fleetSpd = m.spd; e.fleet.push(m); // (its spd is the boss's pace, set above: no half speed for a fleet)
        // not onto Temperance: her regen is a share of her HP (2026-10-11: w60 killed 11 of 32 two-tower openings)
        const moved = isA(e, "temperance") ? 0 : Math.floor(m.max * FLEET_TO_BOSS);
        m.max -= moved; m.hp = m.max; e.max += moved; e.hp = e.max; // (was swallowed by the comment above from 2026-10-11 to 10-14)
      }
    }
    span[0] = Math.max(span[0], reach[0]); span[1] = Math.max(span[1], reach[1]);
  }
  e.fleetSpan = span[0] + span[1]; G.lastBoss = e; // how much lane it takes, ahead + behind (stepSpawns spaces a second boss by it)
  queueFleet(e);
}
// the fleet ENTERS ONE AT A TIME at the lane's mouth like any wave (owner, 2026-10-12: "make boss wave spawn 1 unit at a
// time like the other waves"; it popped in whole, the escorts ahead mid-lane): the formation slid back so its front unit
// starts at the mouth, and every unit still behind the mouth (the boss too) HELD in G.fleetQ, riding on at its own pace
// unseen, till it reaches the mouth (stepFleetQ)
function queueFleet(e) {
  const s0 = entryS(e.pi), all = [e, ...e.fleet], back = Math.max(...all.map(m => m.s)) - s0;
  for (const m of all) {
    m.s -= back;
    if (m.s < s0 - 0.01) { G.enemies.splice(G.enemies.indexOf(m), 1); G.fleetQ.push(m); }
  }
}
function stepFleetQ(dt) {
  if (!G.fleetQ.length) return;
  G.fleetQ = G.fleetQ.filter(m => {
    m.s += effSpeed(m) * waveClock(m.n) * dt; // (at its wave's clock: a queued unit keeps its slot, owner 2026-10-26)
    if (m.s < entryS(m.pi)) return true;
    const p = pathAt(m.pi, m.s, m.ang || 0); m.x = p.x; m.y = p.y; G.enemies.push(m);
    return false;
  });
}
// each step, for a live boss: Empress's brood, the sprint, regeneration
function bossStep(e, dt) {
  const regen = BOSS_SHIELD_REGEN[e.arcana] || 0; // a shield that REFILLS (up to its full ring)
  if (regen && e.shield < e.shieldMax) { e.shieldBuf += regen * dt; const n = Math.floor(e.shieldBuf); if (n) { e.shieldBuf -= n; e.shield = Math.min(e.shieldMax, e.shield + n); } }
  if (isA(e, "empress") && e.broodI < EMPRESS_AT.length && e.hp / e.max <= EMPRESS_AT[e.broodI]) {
    e.broodI++;
    for (let i = 0, N = Math.max(1, Math.round(typeWaveCount("swarm", e.n) * EMPRESS_BROOD_K)); i < N; i++) {
      spawnEnemy("swarm", e.n, e.pi, e.ang || 0);
      const m = G.enemies[G.enemies.length - 1]; m.s = Math.max(0, e.s - EMPRESS_GAP * i);
      m.bossKin = true; // the boss's own: the inverted sky holds till these die too
      (e.veilKin ||= []).push(m);
    }
  }
  if (e.veilKin) bossVeil(e);
  if (isA(e, "chariot")) {
    e.sprintT = (e.sprintT + dt) % CHARIOT_EVERY; const k = chariotPace(e.sprintT);
    e.spd = e.baseSpd * k;
    for (const m of e.fleet || []) if (!m.dead) m.spd = m.fleetSpd * k; // the outriders keep pace
  }
  if (isA(e, "temperance")) { // regen banks fractions and heals in WHOLE points (HP stays a whole number)
    e.regenBuf = (e.regenBuf || 0) + e.max * TEMPERANCE_REGEN * dt;
    const whole = Math.floor(e.regenBuf); e.regenBuf -= whole; e.hp = Math.min(e.max, e.hp + whole);
  }

}
// from applySlow: Strength shrugs slows off
/* the share of a slow each boss still takes (1 = all; Strength 0.4: owner 2026-10-18, no longer immune, which walled ARC+FRZ trios) */
const BOSS_SLOW_K = { strength: 0.1 /* 0.4 -> 0.1 (owner, 2026-11-05: "strength only takes 10% of any slow") */, temperance: 0.5, justice: 0.5, judgement: 0.5, death: 0.5, devil: 0.6 };
const bossSlowMul = e => (BOSS_SLOW_K[e.arcana] ?? 1);
// from damage(): Justice caps any one hit
function bossHitCap(e, amt) {
  return isA(e, "justice") ? Math.min(amt, e.max * JUSTICE_CAP) : amt;
}
// from kill(): Judgement rises once; returns true when it does - AT THE START OF HER LANE, AT FULL HP, with 1.2 swarm waves strewn behind
// her like a swarm (owner, 2026-11-05, the boss redesign: "Judgement spawns alone, when defeated, respawns at the start of lane at 100%,
// except with 1.2 waves worth of swarm in swarm pattern, no respawn at 30%"); her second death is her last. Was: rose where she fell at
// JUDGEMENT_REVIVE (30%) of her HP
const JUDGEMENT_SWARM = 1.2;
// THE VEIL (owner, 2026-11-07 22:30, Empress and Judgement): while any enemy of a swarm she released lives, e.veiled - she takes no damage and no
// tower or effect picks her, by clearing e.seen (every target, area and damage path already skips an unseen enemy - enemySeen); stepEnemies
// does not latch e.seen back while veiled. She still walks, and a veiled boss at the core still costs its lives. Drawn at reduced opacity
// (e.veiled - aspira-enemies.js enemyVis reads !seen as faint already)
function bossVeil(e) {
  const up = e.veilKin.some(m => !m.dead && !m.gone);
  if (up && !e.veiled) { e.veiled = true; e.seen = false; }
  else if (!up && e.veiled) { e.veiled = false; e.veilKin = null; if (enemySeen(e)) { e.seen = true; e.seenAt = performance.now(); } }
}
function bossRise(e) {
  if (e.risen || !isA(e, "judgement")) return false;
  ring(e.x, e.y, 60, "orange", 0.5); // (where she fell)
  e.risen = true; e.dead = false; e.hp = e.max; e.shield = e.shieldMax; e.shieldBuf = 0;
  e.s = entryS(e.pi); const p = pathAt(e.pi, e.s, e.ang || 0); e.x = p.x; e.y = p.y; e.ease0 = null; e.slows = null; e.slowT = 0; e.stunT = 0; e.seen = false;
  const n0 = G.enemies.length, q0 = (G.fleetQ || []).length;
  bossScatter(e, e.n, ENEMIES.bonus.size * (e.sizeMul || 1), [["swarm", JUDGEMENT_SWARM]], true);
  e.veilKin = G.enemies.slice(n0).concat((G.fleetQ || []).slice(q0)).filter(m => m !== e); bossVeil(e); // VEILED while her swarm lives (owner, 2026-11-07 22:30: "judgement invuln and untargettable while swarm is up")
  return true;
}
// from kill(): a Lover left alone heals to full and runs faster
function bossKilled(e) {
  // the LAST boss of its wave down: that wave's corner slot opens (owner: unlocks
  // come AFTER the boss, never during its wave), the slot flashing meanwhile
  // (aspira-waves.js) - or, on a CORE_PICKS wave, a core power is won (aspira-core.js),
  // announced where the boss's name was, with an arrow down at the core (owner)
  if (!G.enemies.some(o => o !== e && !o.dead && o.arcana && o.n === e.n)) {
    grantPowers(e.n); // waves 20 / 40: a core power (aspira-core.js)
    if (CORE_PICKS.includes(e.n)) {
      const given = grantPick();
      if (given) flashPower(given.id); else float(CX, CY - 80, "choose a core power", "white", 28, 4, 1, 3); // no pointer at the core: the button flashes (owner, 2026-10-12)
    }
    CELLS.forEach((c, ci) => {
      if (c.unlock !== e.n || (G.opened ||= {})[ci]) return;
      G.opened[ci] = true;
      float(CX, CY - 80, "new slot unlocked", "white", 28, SLOT_TEXT_S, 1, 3);
      slotFlash = { ci, until: performance.now() + SLOT_FLASH_S * 1000 };
    });
  }
  // (the Lover left alone no longer heals to full and runs LOVERS_SPD x faster: owner, 2026-11-05, "no mechanic, just 2 bosses")
}
// the boss reward drops ONCE a wave: a Devil only pays when it is the last one standing
const bossPays = e => !(isA(e, "devil") && G.enemies.some(o => o !== e && !o.dead && isA(o, "devil")));
// (the inverted sky, its spokes, the Star's tint and skyKeep: aspira-bosssky.js)
