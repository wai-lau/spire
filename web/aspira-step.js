// /aspira - THE UPDATE: step (one sim tick), spawning and moving the enemies, and how a game ends (winGame, gameOver).
// Split from aspira-game.js at its cap; loaded right after it (the simulator too, sim.mjs FILES).

function stepSpawns(dt) {
  for (const w of G.spawns) {
    w.timer -= dt * waveClock(w.n); // a wave not yet reached runs OFF_SCREEN_SPEED x - its releases too, so its gaps in distance hold (waveClock, aspira-formations.js)
    while (w.timer <= 0 && w.idx < w.list.length) {
      const type = w.list[w.idx++];
      // FORMATIONS (aspira-formations.js): fast Vs and armor's lattice spawn as a group; the rest one by one
      const m = formSpawn(w, type) || (spawnEnemy(type, w.n, w.lanes[type], w.ang || 0), 1);
      // spacing is a balance lever: swarms stream evenly and very densely
      // (5x the bodies in the same time as before), trains spread ~60+ apart; a formation waits its members' worth
      w.timer += (1 / plainK(type)) * (w.gaps ? w.gaps[w.idx - 1] : type === "fast" ? FAST_PAIR / (ENEMIES.fast.speed * ENEMY_SPEED * (w.n === 1 ? FIRST_FAST_SPD : 1)) // fast Vs: the next one FAST_PAIR behind (aspira-formations.js; pairs until 2026-10-29)
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
    } else if (!(typeof barHold === "function" && barHold(e))) { // (a boss waiting for its HP bar to slam in - aspira-bossbar.js: page only)
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
    if (t.kind === "acd") { stepAcd(t, dt); continue; } if (t.kind === "crr") { stepCar(t, dt); continue; } if (t.kind === "ifr") { stepIfr(t, dt); continue; } if (t.kind === "grv") stepGrv(t, dt); // GRV: its spheres every step, its novas on the cooldown below (aspira-grv.js)
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
  if (G.wave > best.wave) best.wave = G.wave;
  try { localStorage.setItem("aspira.best", JSON.stringify(best)); } catch (_e) {}
  if (typeof renderEndStats === "function") renderEndStats(); // the end screen's tower + leak stats (aspira-endstats.js)
  if (typeof showAscendants === "function") showAscendants(); // a loss: THE ASCENDANTS board, no entry (aspira-ascend.js)
  showOverlay((G.breachBy && BOSS_BREACH[G.breachBy]) || "core breached", "Reached wave " + G.wave + (G.wave >= bestWave() ? ", your best." : " (best: " + bestWave() + ")."), "Play again");
}
