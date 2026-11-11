// /aspira - THE UPDATE: step (one sim tick), spawning and moving the enemies, and how a game ends (winGame, gameOver).
// Split from aspira-game.js at its cap; loaded right after it (the simulator too, sim.mjs FILES).

function stepSpawns(dt) {
  for (const w of G.spawns) {
    // a boss list's next body waits while the first is held for its HP bar (barHold, aspira-bossbar.js: page only), or the Devil's
    // second on a lane spawned during the hold and stood on the first (Visual, 2026-11-03: six bodies in three exact pairs)
    if (w.idx > 0 && ENEMIES[w.list[0]].star && typeof barHolding === "function" && barHolding()) continue;
    if (devilGateShut(w)) continue; // the Devil's six wait for half her host (aspira-bosses.js)
    w.timer -= dt * waveClock(w.n); // a wave not yet reached runs OFF_SCREEN_SPEED x - its releases too, so its gaps in distance hold (waveClock, aspira-formations.js)
    while (w.timer <= 0 && w.idx < w.list.length) {
      const type = w.list[w.idx++];
      // FORMATIONS (aspira-formations.js): fast Vs and armor's lattice spawn as a group; the rest one by one
      const m = (!w.loose && formSpawn(w, type)) || (spawnEnemy(type, w.n, w.lanes[type], w.ang || 0), 1);
      if (w.heft) for (const k of G.enemies.slice(-m)) { k.max = Math.floor(k.max * BOSS_HEFT); k.hp = k.max; k.bossKin = true; } // Death's escort (deathEscorts): as tough as any escort, hers
      if (w.veilOf != null) { const k = G.enemies[G.enemies.length - 1], b = G.enemies.find(o => o.id === w.veilOf && !o.dead); k.bossKin = true; if (b) (b.veilKin ||= []).push(k); } // Judgement's rising swarm: hers as it spawns (aspira-bosses.js)
      if (w.kin) { const k = G.enemies[G.enemies.length - 1]; k.bossKin = true; k.devilEsc = true; if (!k.jit) k.jit = 18 + Math.random() * 45; } // the Devil's host: hers, loose, wandering like swarm
      // spacing is a balance lever: swarms stream evenly and very densely
      // (5x the bodies in the same time as before), trains spread ~60+ apart; a formation waits its members' worth
      w.timer += (1 / plainK(type)) * (w.gaps ? w.gaps[w.idx - 1] : type === "fast" ? FAST_PAIR / (ENEMIES.fast.speed * ENEMY_SPEED * (w.n === 1 ? FIRST_FAST_SPD : 1)) // fast Vs: the next one FAST_PAIR behind (aspira-formations.js; pairs until 2026-10-29)
        : m * (type === "swarm" ? 0.024 : type === "shield" ? SHIELD_POD_GAP : 0.8) / ENEMY_SPEED); // (x 1 / PLAIN_SPEED_K: the same gaps in distance at half speed)
      // a boss's FLEET rides around it: the next boss on the same lane (the Lovers' second) waits till both fleets clear
      const lb = type === "bonus" && G.lastBoss;
      if (lb && lb.fleetSpan) w.timer = Math.max(w.timer, (lb.fleetSpan + FLEET_GAP) / Math.max(1, effSpeed(lb)));
      // the Devil's SECOND on a lane trails the first by DEVIL_TRAIL world units (~1.5 s at its pace), so all six show and reach
      // the core one at a time (owner, 2026-11-03: "devil seems to only have 3 bosses" - the two on a lane rode ~210 apart, 0.6 s)
      if (lb && isA(lb, "devil") && w.idx < w.list.length) w.timer = Math.max(w.timer, DEVIL_TRAIL / Math.max(1, effSpeed(lb)));
    }
  }
  G.spawns = G.spawns.filter(w => w.idx < w.list.length);
}

// THE CORE EASE (owner, 2026-11-03: "Also, gradually slow down the enemies from the moment they are no longer 3x speed to 0.8x when
// they hit the core"): from the moment its wave clock drops to x1 (waveClock, aspira-formations.js; at once for a wave already in
// reach) an enemy remembers the lane left to the core, and its base speed eases linearly with the distance it covers, 1 -> CORE_EASE
// at the core - before slows and stuns (effSpeed). Every enemy, bosses too. The sim runs this same step.
const CORE_EASE = 0.6; // 0.6 at the core (owner, 2026-11-07 18:10: "perfect, increase the ease to 60%"; was 0.8)
function coreEase(e) {
  if (waveClock(e.n) !== 1 || e.arcana === "lovers") return 1; // the Lovers ignore the ease (owner, 2026-11-07 22:30: "lovers speed doesn't get affected by the ease")
  const left = Math.max(0, PATHS[e.pi].len - e.s); if (e.ease0 == null) e.ease0 = Math.max(1, left);
  return 1 - (1 - CORE_EASE) * (1 - Math.min(1, left / e.ease0));
}
// the time to cover the lane left at base speed v under the ease (etaToCore, aspira-ui.js): speed v (CORE_EASE + (1 - CORE_EASE) x / E)
// at x left of E, so t = E / ((1 - CORE_EASE) v) ln((CORE_EASE + (1 - CORE_EASE) D / E) / CORE_EASE); off the x1 clock, D / (3 v)
function coreEaseTime(e, v) {
  const D = Math.max(0, PATHS[e.pi].len - e.s); if (waveClock(e.n) !== 1) return D / (v * waveClock(e.n)); if (e.arcana === "lovers") return D / v; // (no ease)
  const E = Math.max(D, e.ease0 ?? D, 1), k = 1 - CORE_EASE;
  return E / (k * v) * Math.log((CORE_EASE + k * D / E) / CORE_EASE);
}
const JIT_FADE_R = 400; // swarm wander is full beyond this radius, 0 at the core
// enemies turn nose-first along their lane - drawing only, so the headless
// balance simulator switches it off (scripts/aspira-sim)
let FACING = true;
function stepEnemies(dt) { const reach = reachCircles(); // (out of every tower's reach = off screen: aspira-positioning.js)
  if (G.waveTap) for (const n in G.waveTap) { if (G.waveIn && G.waveIn[n]) { delete G.waveTap[n]; continue; } if ((G.waveTap[n] += dt) >= OFF_TAPER_S) { (G.waveIn ||= {})[n] = 1; delete G.waveTap[n]; } } // the x3 taper (waveClock)
  for (const e of G.enemies) {
    if (e.gone) continue; if (!e.seen && !e.veiled && enemySeen(e)) { e.seen = true; devilCount(e); e.seenAt = performance.now(); } // (off-screen: untouchable - enemySeen, aspira-positioning.js)
    if (e.dead) {
      // a GHOST (owner): the dead keep drifting in at their plain pace,
      // untargetable and harmless, and are removed at the core with no life lost
      e.s += ENEMIES[e.type].speed * ENEMY_SPEED * (e.spd || 1) * PATHS[e.pi].pace * dt;
    } else if (!(typeof barHold === "function" && barHold(e))) { // (a boss waiting for its HP bar to slam in - aspira-bossbar.js: page only)
      if (e.stunT > 0) e.stunT -= dt;
      if (e.fractT > 0) e.fractT -= dt; if (e.deepCd > 0) e.deepCd -= dt; // FRZ's Lingering cold and Deep freeze timers (aspira-frz.js)
      if (e.reelT > 0) grvReelStep(e, dt); // Gravity Well V: reeled back toward the void (aspira-grv.js)
      if (e.slows) sumSlows(e, dt);
      if (e.markT > 0) e.markT -= dt; else e.markMul = 1;
      if (e.arcana) bossStep(e, dt); // the bosses' tricks (aspira-bosses.js)
      if (e.biteT > 0) e.biteT -= dt; // Frostbite tint
      if (e.corrodeT > 0) e.corrodeT -= dt; // Corrosion ring
      if (e.corrTakeT > 0) e.corrTakeT -= dt; // Corrosion V's damage-taken mark
      if (e.burnT > 0) e.burnT -= dt; // under an ACD burn (Fresh targeting)
      if (e.marks) sumMarks(e, dt);
      if (e.dotT > 0) { solScorchTick(e, dt); if (e.dead) continue; } // SOL's scorch stacks, popping shields (aspira-sol.js)
      { const m = e.mate && !e.mate.dead && !e.enraged ? e.mate : null; if ((e.seen && inReach(e, reach)) || (m && m.seen && inReach(m, reach))) (G.waveIn ||= {})[e.n] = 1; else if (e.seen && !(G.waveIn && G.waveIn[e.n]) && !(G.waveTap && G.waveTap[e.n] != null) && tapNear(e, reach)) (G.waveTap ||= {})[e.n] = 0; e.s += (m ? Math.min(effSpeed(e) * coreEase(e), effSpeed(m) * coreEase(m)) : effSpeed(e) * coreEase(e)) * waveClock(e.n) * dt; } /* the LOVERS walk in step at the slower one's pace; OFF-SCREEN x3 (owner, 2026-10-18: "triple movement speed of all enemies not on screen") - a WAVE loses it TOGETHER, the moment its first unit reaches a tower's range (owner, 2026-10-26) */
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
      G.lives -= ENEMIES[e.type].star ? bossLeakLives(e) : ENEMIES[e.type].leak || 1; // a boss: its HP% left (bossLeakLives, aspira-bosses.js)
      if (e.type === "bonus") bossGone(e); // A BOSS AT THE CORE STILL PAYS: its drop, and the wave's power / slot (owner, 2026-11-09; aspira-bosses.js)
      sfx("leak"); shakeScreen(); livesLost(); if (typeof threatBounce === "function") threatBounce(e); // (threatBounce: its threat ring bounces out, aspira-ui.js) "X lives left" where the interest pop-up goes (aspira-waves.js)
      ring(e.x, e.y, 40, "pink", 0.17);
      // a boss that gets through ends the game only when its lives run out (owner, 2026-11-03; was outright, 2026-10-02)
      if (ENEMIES[e.type].star && G.lives <= 0) G.breachBy = e.arcana; // the end title names the boss that ended it (BOSS_BREACH)
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
  stepChains(dt); arcBurnStep(dt); // ARC's burns tick (aspira-arc.js)
  for (const t of G.towers) {
    t.spin = (t.spin || 0) + dt; // game-time clock for anything that orbits (FRZ's moons)
    if (AUTO_POS) autoPosition(t, dt); else if (autoMove && best.ascended && !towersFrozen()) autoGlide(t, dt); // the simulator's player jumps; a real tower moves when dragged, or AUTO-MOVE glides it (aspira-positioning.js)
    if (t.kind === "frz" && hasSkills(t)) { frzStep(t, dt); continue; } // the chart FRZ: an aura, every step (aspira-frz.js)
    if (t.kind === "sol") { stepSol(t, dt); continue; }
    if (t.kind === "acd") { stepAcd(t, dt); continue; } if (t.kind === "crr") { stepCar(t, dt); continue; } if (t.kind === "ifr") { stepIfr(t, dt); continue; } if (t.kind === "grv") stepGrv(t, dt); // GRV: its spheres every step, its novas on the cooldown below (aspira-grv.js)
    t.cd -= dt; if (t.echo > 0 && (t.echo -= dt) <= 0) { const st = towerStats(t); for (let i = 0, n = relayMul(t); i < n; i++) fire(t, st); if (--t.burst > 0) t.echo += ARC_ECHO_S; } // ARC's burst (ARC_BURST_N, ARC_ECHO_S apart - aspira-arc.js)
    if (t.cd > 0) continue;
    const st = towerStats(t);
    let fired = false;
    for (let i = 0, n = t.kind === "arc" ? relayMul(t) : 1; i < n; i++) fired = fire(t, st) || fired; // the Orbital Relay: an ARC attacks three times (aspira-core.js)
    if (fired) sfx(t.kind);
    t.cd = fired ? 1 / st.rate : 0.05; if (fired && t.kind === "arc" && ARC_BURST_N > 1) { t.echo = ARC_ECHO_S; t.burst = ARC_BURST_N - 1; } /* (the guard: at ARC_BURST_N 1 the echo used to fire anyway - 2026-11-07) */
  }
  G.enemies = G.enemies.filter(e => !e.gone);
}

// Beams, rings and sparks age in GAME time (they follow the 1/2/3x speed);
const WIN_WAVE = 120; // the 10th boss (a boss every STAR_EVERY 12 since 2026-10-12; was 100)
function winGame() {
  G.over = true; G.won = true; if (typeof sfx === "function") sfx("win"); // (owner, 2026-11-09: "PRescue.wav after beating the game")
  best.ascended = true; // (the title read ASCENDANT from then on until 2026-10-23 - the boss name now, aspira-ui.js)
  if (G.wave > best.wave) best.wave = G.wave;
  if (typeof bestKeep === "function") bestKeep(G.wave, true); // this major's record (aspira-ascend.js)
  try { localStorage.setItem("aspira.best", JSON.stringify(best)); } catch (_e) {}
  if (typeof renderEndStats === "function") renderEndStats();
  showOverlay("ascendant", // the win title (owner, 2026-10-06; was "the core holds")
    "All ten bosses down with " + G.lives + " lives left.", "Play again");
  if (typeof showAscend === "function") showAscend(); // initials for THE ASCENDANTS (aspira-ascend.js)
}
function gameOver() {
  G.over = true;
  sfx("over");
  if (G.wave > best.wave) best.wave = G.wave;
  if (typeof bestKeep === "function") bestKeep(G.wave, false); // this major's record (aspira-ascend.js)
  try { localStorage.setItem("aspira.best", JSON.stringify(best)); } catch (_e) {}
  if (typeof renderEndStats === "function") renderEndStats(); // the end screen's tower + leak stats (aspira-endstats.js)
  if (typeof showAscendants === "function") showAscendants(); // a loss: THE ASCENDANTS board, no entry (aspira-ascend.js)
  showOverlay((G.breachBy && BOSS_BREACH[G.breachBy]) || "core breached", "Reached wave " + G.wave + (G.wave >= bestWave() ? ", your best." : " (best: " + bestWave() + ")."), "Play again");
}
