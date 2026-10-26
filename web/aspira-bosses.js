// /aspira — the TEN BOSSES (owner, 2026-10-02): every 10th wave is a boss from
// the Major Arcana (the Fool and the Tower left out). Each keeps the boss
// rules - it comes alone, holds the wave timer, ends the game if it gets
// through - and adds its own trick:
//   10 Star        none: the plain boss that teaches the rules
//   20 Empress     sheds EMPRESS_BROOD swarmers each time it loses a fifth of its HP (owner: 10x, then x0.75 -> 30; fitted -> 12)
//   30 Strength    no slow or freeze touches it
//   40 Chariot     every CHARIOT_EVERY s it sprints at CHARIOT_SPD x for CHARIOT_T s
//   50 Lovers      a PAIR; when one dies the other heals to full and runs LOVERS_SPD x faster
//   60 Temperance  regenerates TEMPERANCE_REGEN of its HP a second (owner: tripled to 6%, and x5 HP)
//   70 Devil       comes as SIX (DEVIL_COPIES), each a full boss on its own copy of the
//                  lane - any one that gets through ends the game (owner; replaced the Moon)
//   80 Justice     no single hit takes more than JUSTICE_CAP of its HP
//   90 Judgement   rises once at JUDGEMENT_REVIVE of its HP
//  100 Death       a juiced-up Star (owner): no tricks, the most HP but the Chariot
// Boss HP is ENEMIES.bonus.hp (halved, owner). Loaded after aspira-waves.js
// (the simulator loads it too).
// each with a HINT (owner): a mythic subtitle under its name - its trick told
// sideways, never spelled out - as a HAIKU (owner, 2026-10-05): three lines,
// 5-7-5 syllables, drawn one under another
const ARCANA = [
  { id: "star", name: "The Star", hint: ["One light in the dark", "crossing the long silent sky", "asks only to meet."] },
  { id: "empress", name: "The Empress", hint: ["Strike the mother once", "and the field fills with her young:", "her children answer."] },
  { id: "strength", name: "Strength", hint: ["No frost can bind her,", "no chain will shorten her stride.", "She walks through the cold."] },
  { id: "chariot", name: "The Chariot", hint: ["The reins slip loose now", "and the horses break and run,", "faster than your aim."] },
  { id: "lovers", name: "The Lovers", hint: ["Two walk as one heart.", "Part them, and the one who stays", "will never forgive."] },
  { id: "temperance", name: "Temperance", hint: ["What is poured away", "returns to the cup again;", "the wound fills, and heals."] },
  { id: "devil", name: "The Devil", hint: ["Six faces, one want,", "six roads leading to your door.", "Let not one get through."] },
  { id: "justice", name: "Justice", hint: ["The scales hold steady.", "No blow, however heavy,", "outweighs the balance."] },
  { id: "judgement", name: "Judgement", hint: ["The trumpet sounds once;", "what has fallen hears its name", "and rises again."] },
  { id: "death", name: "Death", hint: ["No riddle, no trick,", "only the long road to dark,", "only, now, the end."] },
];
// fitted 2026-10-05 (scripts/aspira-sim/bossbal.mjs): each boss comes 0.9x as
// near the core as the four waves around it (owner: "just a little closer"),
// on closest approach, against every open slot filled. Was star 4, strength 2,
// lovers 2, temperance 5, justice 1.5, judgement 1.5, death 3. Death's fit
// (1.8) sits on the edge of leaking - a boss leak ends the game - so 1.6.
// REFIT 2026-10-07 (bossbal.mjs tune, 2 seeds, after the free core, the chart-axis
// refit and the fast refit): Chariot 40 and Temperance 60 breached the reference
// team, Lovers 50 got to 47 of the core (target 168). Was star 3.4, empress 2,
// strength 0.9, chariot 4, lovers 3.1, temperance 3, devil 0.75, justice 4.4,
// judgement 1.7. Death not refitted (the run was stopped for memory): kept 1.6.
// BOSSES CLOSER (owner, 2026-10-13: "make bosses challenging (10-20% closer)"): every boss but the Star x BOSS_HP_K. let: the sims sweep it
// ...and the ones that STILL stopped far out more (owner, 2026-10-13: "make the far away bosses stronger"): waverep x3.5 brought
// the Empress 271 -> 213 and Strength 273 -> 231; Death 346 -> 296 at x2.4, 169 at x3.5 (2 of 36 games lost), so x2.8
const BOSS_FAR = { empress: 3.5, strength: 3.5, death: 2.8 };
// DEATH x0.6 of the shared boost (owner, 2026-10-16: "every winnable trio fully upgraded should beat death"): at x1 it ended
// ARC+SOL+ACD and ARC+FRZ+ACD at wave 120; at x0.6 both won 4/4 (triodiag, with GRV_STRIP 2.5)
const BOSS_DEATH_K = 0.6;
let BOSS_HP_K = 1.4; // waverep 2026-10-13: x1.4 brings bosses 24-108 in 16% (mean nearest 252 -> 211), x1.8 21%; still 36/36 won
/* BOSSES CLOSER (owner, 2026-10-17: "10% closer than neighbouring waves"): Star x1.8, Empress x1.5, Strength x1.3, Chariot x3, Lovers x2, Temperance x2, Devil x1.5 - the highest every trio still beats (sim bosswave: Star 0.87, Empress 0.97 of the neighbours' closest approach; the rest stay far, a bigger HP loses the weakest trios) */ /* BOSSES CLOSER, 2nd pass (2026-10-18, SLOT_R 148, bosses x2 speed): vs the 2026-10-17 table Empress x0.9, Chariot x2, Lovers x2.5, Temperance x1.5, Devil x2, Justice x2, Judgement x1.6, Death x1.5 - 60/60 games won (bosswave sim); Strength is held by the FRZ trios */ const BOSS_HP = { star: 20 /* every PAIR of fresh towers beats it (owner, 2026-10-18: CRR+GRV lost to it at 46.08 - solo.mjs: 30 and 35 still beat ARC+ARC, ARC+CRR, CRR+CRR) */ /* was 46.08 * /* x0.8 (owner, 2026-10-15: "any pair of two towers doesn't leak on waves 1-12" - two ARCs broke through at 32) */ /* (owner, 2026-10-12: "require 2 towers or an upgrade to beat the star", SOL and ACD may solo it; solo.mjs; was 5.4) */, empress: 9.18, strength: 4.29, chariot: 20.4, lovers: 12, temperance: 3.66, devil: 2.28, justice: 12.8, judgement: 5.44, death: 4.8 }; // every one DOUBLED (owner, 2026-10-12: "double each bosses hp"; was 2.7 3.4 1.1 1.7 1.2 0.61 0.38 3.2 1.7 1.6)
// each boss's ARMOR (x the armored enemy's growth curve at its wave, like ENEMIES.armor) and SPEED
// (x the boss base) - owner, 2026-10-08: the bosses ACD is too good against get armor and speed and
// lose HP, so SOL (whose hits strip armor) and ACD (whose ramp wants a long-lived target) boss alike
const BOSS_ARMOR = { star: 0, empress: 0, strength: 0, chariot: 0, lovers: 0, temperance: 0, devil: 0, justice: 0, judgement: 0, death: 0 };
const BOSS_SPEED = { star: 1, empress: 1, strength: 1, chariot: 1.3, lovers: 1.3, temperance: 1.5, devil: 1.3, justice: 1.3, judgement: 1.4, death: 1.4 }; /* 2026-10-18: the far bosses a little quicker (justice was 0.75: slowed 2026-10-12, then it broke through) */
// each boss's SHIELD (hits absorbed, whatever their size) and its REFILL a second - the counter to
// SOL's few huge hits (owner, 2026-10-08): ACD's ticks, ARC's forks and FRZ's aura strip it cheaply
// EVERY boss carries a little SHIELD (owner, 2026-10-12: "SOL feels too good vs bosses - give them all a little bit of
// shields"): BOSS_SHIELD_K of a shield enemy's charges at its wave, on top of its own BOSS_SHIELD
const BOSS_SHIELD_K = 1.2; /* 0.5 -> 1.2 (2026-10-18, bosses closer without more HP) */
const BOSS_SHIELD = { star: 0, empress: 0, strength: 0, chariot: 0, lovers: 0, temperance: 0, devil: 0, justice: 0, judgement: 0, death: 0 };
const BOSS_SHIELD_REGEN = { star: 0, empress: 0, strength: 0, chariot: 0, lovers: 0, temperance: 0, devil: 0, justice: 0, judgement: 0, death: 0 };
const BOSS_INTRO = 2; /* 20% shorter (owner, 2026-10-12; was 2.5) */ // s between a boss wave starting and its boss arriving (its warning plays)
let EMPRESS_BROOD = 12; // fitted 2026-10-05 (was 30): her HP was never the lever, her brood is; let: the boss balance test (scripts/aspira-sim/bossbal.mjs, BB_BROOD) tries other broods
const CHARIOT_EVERY = 4, CHARIOT_T = 1, CHARIOT_SPD = 3, LOVERS_SPD = 1.5;
const TEMPERANCE_REGEN = 0.06, DEVIL_COPIES = 5, JUSTICE_CAP = 0.02, JUDGEMENT_REVIVE = 0.5;

// a boss's HP scaled with its lane's length while it rode a different lane each boss wave; it has ONE
// spiral now (owner, 2026-10-08), so the old average factor (1.107 over the boss waves) stands as a constant
const BOSS_LANE_HP = 1.107;
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
const bossSplit = n => (arcanaOf(n).id === "devil" ? 1 + DEVIL_COPIES : arcanaOf(n).id === "lovers" ? 2 : 1); // the Lovers on TWO lanes, opposite (owner, 2026-10-12; they shared one)
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
  e.baseSpd = e.spd; e.broodAt = 0.8; e.sprintT = CHARIOT_EVERY;
  e.shield = e.shieldMax = (BOSS_SHIELD[e.arcana] || 0) + Math.round(BOSS_SHIELD_K * shieldsOf("shield", n).shield); e.shieldBuf = 0;
  // HP per boss: BOSS_HP (fitted, see there; the Devil's is each of six)
  e.max *= (BOSS_HP[e.arcana] || 1) * (e.arcana === "star" ? 1 : BOSS_HP_K * (e.arcana === "death" ? BOSS_DEATH_K : 1)) * (BOSS_FAR[e.arcana] || 1); // (BOSS_HP_K: every boss but the Star; BOSS_FAR: the ones that stayed far)
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
  star: ["fast"], empress: ["shield"], strength: ["armor"], chariot: ["fast", "armor"], lovers: ["swarm", "fast"], // shooting stars, handmaidens, lions, outriders + guards, couples + runners
  temperance: ["shield", "fast"], devil: ["swarm", "fast"], justice: ["armor", "fast"], judgement: ["swarm", "fast", "armor"], death: ["fast", "swarm", "armor", "shield"], // the cup + runners, imps + runners, guards + runners, the risen + runners + guards, four horsemen
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
// the LINE escorts (fast, swarms) ride FLEET_TRACKS parallel tracks across the boss's own lane, 3-5, the boss in the middle
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
  const kinds = FLEET[e.arcana];
  if (!kinds) return;
  e.fleet = [];
  const bodies = bossCount(n), R = ENEMIES.bonus.size * (e.sizeMul || 1), { L, off } = fleetLanes(e, n), span = [0, 0];
  // FORMATIONS ROUND THE BOSS (owner, 2026-10-11): shield escorts fly a V with the boss as its leader, armor a square
  // lattice ARMOR_W wide with the boss in its middle; fast and swarms keep the line ahead of and behind it
  const form = fleetForm(e, R);
  for (let j = 0; j < L; j++) {
    const ang = ((e.ang || 0) + (j + off) * Math.PI * 2 / L) % (Math.PI * 2), reach = [R, R], T = fleetTracks(n), track = Array.from({ length: T }, () => [R, R]);
    let i = 0;
    for (const k of kinds) {
      const all = Math.max(1, Math.round(waveCount(k, n) * (FLEET_MUL[e.arcana] ?? 1) / kinds.length / bodies)), count = Math.floor(all / L) + (j < all % L ? 1 : 0);
      const slots = form[k] && count ? form[k](count) : null;
      for (let c = 0; c < count; c++, i++) {
        spawnEnemy(k, n, e.pi, ang);
        const m = G.enemies[G.enemies.length - 1], r = ENEMIES[k].size;
        m.max = Math.floor(m.max * BOSS_HEFT); m.hp = m.max; // an escort twice as tough too (BOSS_HEFT)
        if (slots) { // its place in the formation: across the lane, and ahead (+) or behind (-) the boss's spot
          m.form = true; m.lat = slots[c][0]; m.s = e.s + slots[c][1]; m.ahead = slots[c][1]; m.aheadC = 0;
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
  if (isA(e, "empress") && e.hp / e.max <= e.broodAt) {
    e.broodAt -= 0.2;
    for (let i = 0; i < EMPRESS_BROOD; i++) {
      spawnEnemy("swarm", e.n, e.pi, e.ang || 0);
      const m = G.enemies[G.enemies.length - 1]; m.s = Math.max(0, e.s - 8 * i);
      m.bossKin = true; // the boss's own: the inverted sky holds till these die too
    }
  }
  if (isA(e, "chariot")) {
    e.sprintT -= dt;
    if (e.sprintT <= -CHARIOT_T) e.sprintT += CHARIOT_EVERY;
    e.spd = e.baseSpd * (e.sprintT <= 0 ? CHARIOT_SPD : 1);
    for (const m of e.fleet || []) if (!m.dead) m.spd = m.fleetSpd * (e.sprintT <= 0 ? CHARIOT_SPD : 1); // the outriders keep pace
  }
  if (isA(e, "temperance")) { // regen banks fractions and heals in WHOLE points (HP stays a whole number)
    e.regenBuf = (e.regenBuf || 0) + e.max * TEMPERANCE_REGEN * dt;
    const whole = Math.floor(e.regenBuf); e.regenBuf -= whole; e.hp = Math.min(e.max, e.hp + whole);
  }

}
// from applySlow: Strength shrugs slows off
/* the share of a slow each boss still takes (1 = all; Strength 0.4: owner 2026-10-18, no longer immune, which walled ARC+FRZ trios) */
const BOSS_SLOW_K = { strength: 0.4, temperance: 0.5, justice: 0.5, judgement: 0.5, death: 0.5, devil: 0.6 };
const bossSlowMul = e => (BOSS_SLOW_K[e.arcana] ?? 1);
// from damage(): Justice caps any one hit
function bossHitCap(e, amt) {
  return isA(e, "justice") ? Math.min(amt, e.max * JUSTICE_CAP) : amt;
}
// from kill(): Judgement rises once; returns true when it does
function bossRise(e) {
  if (e.risen || !isA(e, "judgement")) return false;
  e.risen = true; e.dead = false;
  e.hp = Math.floor(e.max * JUDGEMENT_REVIVE);
  ring(e.x, e.y, 60, "orange", 0.5);
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
    if (G.lifeOwed > 0 && G.wave < WIN_WAVE) { G.lives += G.lifeOwed; sfx("life"); banner("+" + G.lifeOwed + " lives"); G.lifeOwed = 0; } // the score's lives, earned since the last boss (addScore)
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
  const m = e.mate;
  if (!m || m.dead) return;
  m.hp = m.max; m.enraged = true; m.spd = (m.baseSpd || 1) * LOVERS_SPD;
  ring(m.x, m.y, 60, "pink", 0.5);
}
// the boss reward drops ONCE a wave: a Devil only pays when it is the last one standing
const bossPays = e => !(isA(e, "devil") && G.enemies.some(o => o !== e && !o.dead && isA(o, "devil")));

// ---------- the inverted sky (UI only; render() in aspira-draw.js draws it) ----------
// owner: when a boss appears, colour INVERSION spreads as a circle from the
// core, filling the screen over BOSS_INV_T s; when the last boss dies, it
// collapses over the same time back onto the core. This only keeps the STATE
// (phase, radius r, full); render() draws the inverted frame (withPalette).
// The HTML over the board flips by CSS once the circle covers the screen
// (bossInv.full -> #asp.asp-boss).
const BOSS_INV_T = 3;
const bossInv = { phase: "off", t0: 0, x: 0, y: 0, full: false, r: 0 };
// the game HOLDS while the sky turns over, both ways (owner, 2026-10-12: "maybe we should pause the game while inverting"):
// BOSS_INV_T of real time with nothing moving, so the flip is watched, not fought through
const skyTurning = () => (bossInv.phase === "in" && !bossInv.full) || bossInv.phase === "out";
function bossSkyStep() {
  // the sky stays inverted while ANY boss-related enemy lives - the boss and its
  // brood (owner) - and only then collapses
  // ...and from the moment the boss WAVE is sent, before anything spawns (owner, 2026-10-12: "finish inversion before spawning
  // first units"): the game holds while it turns (skyTurning), so the boss's intro timer only starts once the sky is over
  const now = performance.now() / 1000, pending = G.spawns.some(w => w.n % STAR_EVERY === 0 && w.idx < w.list.length);
  const alive = pending || G.enemies.some(e => (e.arcana || e.bossKin) && !e.dead);
  if (alive && (bossInv.phase === "off" || bossInv.phase === "out")) {
    Object.assign(bossInv, { phase: "in", t0: now, x: CX, y: CY }); // spreads from the CORE (owner: was the boss)
  } else if (!alive && bossInv.phase === "in") {
    Object.assign(bossInv, { phase: "out", t0: now, x: CX, y: CY }); // collapses onto the CORE too (owner)
  }
  if (bossInv.phase === "out" && now - bossInv.t0 >= BOSS_INV_T) { bossInv.phase = "off"; bossInv.offAt = now; } // offAt: the Challenge button waits on it (CHALLENGE_DELAY)
  if (bossInv.phase === "off") { bossInv.full = false; bossInv.r = 0; return; }
  // the circle must reach the canvas corner furthest from its centre
  const corners = [[0, 0], [cv.width, 0], [0, cv.height], [cv.width, cv.height]].map(([px, py]) => ({ x: (px - cam.ox) / cam.k, y: (py - cam.oy) / cam.k }));
  const R = Math.max(...corners.map(c => Math.hypot(c.x - bossInv.x, c.y - bossInv.y))) * 1.05;
  const p = Math.min(1, (now - bossInv.t0) / BOSS_INV_T), ease = p * p * (3 - 2 * p);
  bossInv.r = bossInv.phase === "in" ? R * ease : R * (1 - ease); // the boss's HP line grows and shrinks with this edge (drawBossBar)
  bossInv.full = bossInv.phase === "in" && p >= 1;
}

// the STARS redden ahead of a boss (owner): over the wave before it they drift
// from white to red, stay red while it is queued or alive, and drift back to
// white over STAR_FADE_T s once it is dead
const STAR_FADE_T = 3;
const starTint = { k: 0, at: 0 };
function starRed() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (starTint.at || now));
  starTint.at = now;
  const before = G.started && G.wave % STAR_EVERY === STAR_EVERY - 1 && !G.over;
  if (G.started && !G.over && bossUp()) starTint.k = 1;
  else if (before) starTint.k = Math.max(starTint.k, 1 - Math.max(0, G.nextIn) / WAVE_TIMER);
  else starTint.k = Math.max(0, starTint.k - dt / STAR_FADE_T);
  return starTint.k;
}

// ---------- the boss's HP, on the board (UI only; aspira-draw.js calls it) ----------
// a THICK line in the boss's colour (owner) - along its lane since 2026-10-26 (drawBossBar below). Drawn before the inversion, so cyan reads red.
const BOSS_BAR_W = 2.2, BOSS_BAR_TRACK = 0.3; // as thin as a lit lane's opaque core, LIT_LINE_SOFT's last (owner, 2026-10-26: "a lot thinner"; was 21); the track = full HP, translucent
const BOSS_BAR_MARKS = [0.8, 0.6, 0.4, 0.2, 0.1, 0.05], BOSS_MARK_U = 14; // %HP ticks across the lane (owner, 2026-10-26: "add markers at 80 60 40 20 10 and 5% hp along the lane"), BOSS_MARK_U long
// THE BOSS SHOWN under the powers (owner, 2026-10-23: "Game should start by saying The Star / Get rid of \"The Source\" / Then just have the
// boss name and poem on the right"): the live boss (or its fleet), else the one on its way this wave, else the NEXT boss
const bossShownN = () => {
  const b = G.enemies.find(e => (e.arcana || e.bossKin) && !e.dead); if (b) return b.n;
  if (G.wave > 0 && G.wave % STAR_EVERY === 0 && bossUp()) return G.wave;
  return Math.min(WIN_WAVE, (Math.floor(G.wave / STAR_EVERY) + 1) * STAR_EVERY);
};
// the shown boss's haiku for the HTML above the title (updateHud)
const bossHint = () => arcanaOf(bossShownN()).hint.join("\n");
// (the boss's NAME is the page title while it is out now - updateHud, aspira-ui.js; drawBossTitle drew it on the board)
// THE BOSS'S HP ALONG ITS LANE (owner, 2026-10-26: "show the boss HPs along their lane, this way we can tell if we need to step our
// game up" / "it should stay in place" / "hp removal should come from outside in, not inside out / it should make the lane white
// instead of red"): the bar lies STILL on the lane, anchored at the CORE and reaching out toward the mouth by the HP left as a share
// of the whole lane - so it shrinks from the mouth end as the boss is hurt - over a translucent track of the whole lane (full HP);
// the boss rides in along it. Once the boss is INSIDE the bar (its HP share at or past the lane it has left) the bar turns WHITE:
// it arrives with HP to spare at this pace; before that it is the boss's own colour. One bar a boss (the Lovers two, the Devil
// six); on the board, so 3D warps it onto the floor (a line along the horizon through the core, 2026-10-09 .. 10-26)
const BOSS_LANE_STEP = 10;
function drawBossBar() {
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const P = PATHS[e.pi], s0 = entryS(e.pi), hpStart = P.len - (P.len - s0) * Math.max(0, e.hp) / e.max, inside = e.s >= hpStart;
    const trace = (a, b) => { ctx.beginPath(); for (let s = a, k = 0; ; s += BOSS_LANE_STEP, k++) { const q = pathAt(e.pi, Math.min(s, b), e.ang || 0); if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); if (s >= b) break; } ctx.stroke(); };
    ctx.lineWidth = BOSS_BAR_W; ctx.lineCap = "butt"; ctx.lineJoin = "round";
    ctx.strokeStyle = COL[ENEMIES.bonus.color]; ctx.globalAlpha = BOSS_BAR_TRACK; trace(s0, P.len); // the ORIGINAL HP as a translucent track (owner), the HP left solid over it
    ctx.strokeStyle = COL[inside ? "white" : ENEMIES.bonus.color]; ctx.globalAlpha = 1; if (hpStart < P.len - 1) trace(hpStart, P.len);
  }
  ctx.globalAlpha = 1;
}
// THE %HP MARKS AND THEIR LABELS (owner, 2026-10-26: "label the boss lane hp markers, ensure that the inversion doesn't affect the orange
// color / when the hp is below marker, make the label grey"): a tick across the lane and its "80%" beside it, orange (the threat colour)
// while the boss's HP is still at or above that share, grey once under it; drawn through skyKeep (drawSceneTop) so the boss sky's
// inversion leaves the orange alone
const BOSS_LABEL_PX = 9, BOSS_LABEL_OFF = 13;
function drawBossMarks() {
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const P = PATHS[e.pi], s0 = entryS(e.pi), hp = Math.max(0, e.hp) / e.max;
    ctx.lineWidth = BOSS_BAR_W; ctx.lineCap = "butt"; ctx.globalAlpha = 0.9;
    for (const f of BOSS_BAR_MARKS) {
      const s = P.len - (P.len - s0) * f /* f of the lane out from the core, where the bar's mouth end sits at f HP */, col = hp >= f ? "threat" : "grid", a = pathAt(e.pi, s - 2, e.ang || 0), b = pathAt(e.pi, s + 2, e.ang || 0), q = pathAt(e.pi, s, e.ang || 0);
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
      ctx.strokeStyle = COL[col]; ctx.beginPath(); ctx.moveTo(q.x - nx * BOSS_MARK_U / 2, q.y - ny * BOSS_MARK_U / 2); ctx.lineTo(q.x + nx * BOSS_MARK_U / 2, q.y + ny * BOSS_MARK_U / 2); ctx.stroke();
      text(Math.round(f * 100) + "%", q.x + nx * (BOSS_MARK_U / 2 + BOSS_LABEL_OFF), q.y + ny * (BOSS_MARK_U / 2 + BOSS_LABEL_OFF), BOSS_LABEL_PX, col, true);
    }
  }
  ctx.globalAlpha = 1;
}

// THE SKY'S FLIP (owner, 2026-10-09: "make inversion animation way less laggy, need like 10x improvement"): the frame is
// drawn ONCE and the sky's circle (the whole canvas once full, or at once on low quality) turned over with a single
// `difference` fill of white - the same colours the inverted palette gave (inverting a blend = blending the inverted
// colours), where the old way drew the whole scene twice while the sky spread and kept a second set of lane layers
const skyOn = () => bossInv.phase !== "off" && (bossInv.full || bossInv.r > 1);
const skyAll = () => bossInv.full;
// once the sky covers it all, NO flip of any kind (owner, 2026-10-11: "invert has huge cost" - a full-canvas `difference`
// fill made the GPU copy the whole canvas, ~5 ms a frame, and the CSS invert that replaced it in 2D was a full-screen
// filter pass every frame): the frame is simply DRAWN in the inverted palette (render, warpEntities), towers in their own
const skyPal = () => skyOn() && skyAll();
// the TOWERS keep their own colours on the sky (owner): inside the circle they are drawn in the INVERTED palette (with
// ownColours disarmed), so the flip turns them back; outside it, as they are
function skyKeep(fn) {
  if (!skyOn()) { ownColours(fn); return; }
  const flipped = () => withPalette(() => { inverted = false; try { fn(); } finally { inverted = true; } });
  if (skyAll()) { flipped(); return; } // (3D: the bell's picture stays plain and its shader turns it over - warpDraw)
  const circle = () => { ctx.beginPath(); ctx.arc(bossInv.x, bossInv.y, bossInv.r, 0, 6.283); };
  ctx.save(); circle(); ctx.rect(CX - 4000, CY - 4000, 8000, 8000); ctx.clip("evenodd"); fn(); ctx.restore();
  ctx.save(); circle(); ctx.clip(); flipped(); ctx.restore();
}
