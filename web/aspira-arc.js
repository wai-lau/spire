// /spire - ARC's CHART (split out of aspira-skills.js 2026-11-05, the 500-line cap): its numbers by tier, arcSkillStats (towerStats
// calls it), and the chart's firing - the chain as a tree grown a hop a generation, Voltage's carry, the burn, Capacitance's charges
// and their discharge, the hops. Loaded right after aspira-skills.js (the simulator too, sim.mjs FILES).

// ARC's numbers by tier (index 0 = untaken; tiers 0..V since the tier redesign - aspira-capstone.js, aspira-tier01.js).
// Voltage (REWORKED 2026-10-07, owner - raw damage on the strike was a dud axis; its fitted damage history: ARCHAEOLOGY.md)
// is what each JUMP keeps of the hit before it (ARC_FALL 0.5 at 0; III = every jump
// at full damage), on top of its damage step; the `pierce` flag it sets is only
// the white core drawn in its arcs (aspira-draw.js), never a rule
// ARC's HIT, SPREAD over its three axes (owner, 2026-10-15: "spread the damage across the upgrades, but keep it mainly in
// voltage" -> "spread out a bit more" - a build without Voltage hit for 24 whatever it bought): the old Voltage curve's log shared
// 50% Voltage, 25% each Conductivity and Capacitance (ARC_SIDE_DMG); a full ARC (Voltage VI, the others V) x53.5, was x69.9 on Voltage alone - ARC_SIDE_DMG and ARC_VOLTAGE_DMG GONE (tier redesign 2026-10-24): the hit is the stat curve's (aspira-curve.js)
const ARC_VOLTAGE_FALL = [0.8, 1.04, 1.6, 2]; /* x1.6 (axis balance, owner 2026-10-25 "Go": Voltage focus 31% leaked, Capacitance 0) */ // IV / V (2026-10-07): a jump carries MORE than the hit before it // its RANGE is in SKILL_MOVE
// Conductivity's shape by tier (owner): strikes (separate first targets),
// jumps, and forks per jump - 3, 7, 13, then two separate 13-hit attacks -
// and r, how much further each JUMP reaches (owner; Voltage owns the tower's range); q: a fire-rate nudge (x1.2 at most, nudge())
let ARC_CONDUCTIVITY = [{ s: 1, j: 1, f: 1, r: 0.7, v: 0 }, { s: 1, j: 2, f: 1, r: 0.84, v: 0 }, { s: 3, j: 3, f: 1, r: 1.12, q: 1.225, v: 1 }, { s: 6, j: 3, f: 2, r: 1.68, q: 1.155, v: 3 }] /* s + v: the re-strikes became bolts (owner, 2026-10-26: one bolt strikes a unit once - "increase number of bolts if necessary"; s was 2, 3) */ /* the SHIELD POPPER (owner, 2026-10-24, marks target C: "A4 ... seem OK"): reach x0.7, two forks fewer (at least 1), d x0.5 - it no longer clears every crowd; were f 2 2 3 4, r 1 1.2 1.6 2.4, d 1 1 2.02 3.05 */ /* strikes 3 / 4 -> 2 / 3, the lost share split root-wise into q (fire rate) and d, d x1.1 (owner, 2026-10-24: "conductivity hit counts should not go up so fast" / "maybe conductivity increases damage and fire rate"; d was 1.5 / 2.4) */ /* IV / V strikes cut 3 / 4 -> 2 / 3 (owner, 2026-10-11: "nerf arc and boost others") */ /* IV / V: three and four arcs at III's depth and forking (owner, 2026-10-08) */; // IV chains twice, V three arcs (2026-10-07) // owner 2026-10-06: a tier never lowers the hit (d was 1 / .775 / .613 / .394); the tree and the jump reach pay for it
// v: DEAD (unread since 2026-10-26, "one bolt strikes a unit once" - skillHop's max = 1; do not sweep it): once how many times a bolt
// could RETURN to an enemy it already struck
// Capacitance by tier (owner, 2026-10-07): the charge, x the hit that left it, and
// how many times the charged enemy ARCS when next hit (dischargeStatic). The
// charge shares are the old ring's fits (2026-10-06: +25 / +50 / +100%); refit later
// owner, 2026-10-08 (isolation: the weakest ARC axis, 136% team at V): more charge and more arcs (were 1..5 arcs at .22 .. .45)
// BURSTS, NOT ARCS (owner, 2026-10-08: "Capa is too much like Cond now - circle AoE instead of arcs; add multiple
// charges instead of arcing more ... hits add more and more charges as you level up"): an ARC hit leaves `n`
// charges, each worth `frac` of the hit; the next hit from anything sets them ALL off, each a BURST of radius
// ARC_BURST_R round the enemy hitting everything inside (each burst its own hit: armor bites each, each pops a shield)
const ARC_CAPACITANCE = [null, { n: 1, frac: 0.035 }, { n: 4, frac: 0.219 }, { n: 5, frac: 0.186 }]; /* frac x0.25 (axis balance 2026-10-25: Capacitance focus leaked 0%, Voltage 31; was 0.14 0.875 0.745) */ // frac 0.1 -> 0.14 (2026-10-12, chartvalue 30-60: tier III read 96% of the 2/2/2 team and 3/0/3 92% - now 99% / 98%) // a burst hits all round it, so each charge is small: isolation I..V 110 119 150 167 184% (with the slows below)
const ARC_BURST_R = 70, ARC_BURST_A = 0.45;
// each jump hits ARC_FALL as hard and reaches ARC_SHRINK as far as the one before (owner)
const ARC_FALL = 0.5, ARC_SHRINK = 0.7;
// a jump's reach, before Conductivity lengthens it (owner: longer by default). It
// was 1.5 x the tower's range; the range was HALVED (owner, 2026-10-06: "not their
// effects nor reach"), so the jump keeps its old absolute size: 1.5 x the old 156
// range, and Voltage still lengthens it by the old x1.15 / 1.3 / 1.45
// TWO STRIKES (owner, 2026-10-24: "fire 2 strikes in quick succession from the get go at 1/2 damage"): every ARC attack goes off twice,
// ARC_ECHO_S apart, each at ARC_ECHO_K of the hit (t.echo, the tower step in aspira-step.js) - twice the hits pop twice the shields
// THE BURST (owner, 2026-10-26: "I want the attacks to be 0.15s apart, and I want the beam duration to reflect that / So zapzapzap wait
// wait wait zapzapzap"), then "don't change hits per second": ARC_BURST_N strikes ARC_ECHO_S apart, the bursts at ARC_BURST_RATE x the curve's
// 3 attacks/s - 2 a second, a 0.5 s cycle (0.3 s of zaps, 0.2 s rest) - so still 6 strikes a second, each ARC_ECHO_K (0.5) of an attack
// (was 2 strikes 0.12 s apart at 0.5 - the same hits and damage a second)
// ONE STRIKE, HARD (owner, 2026-10-29: "Hits hard, big chain"): a burst of ONE now - every strike the whole attack (was 3 a burst at a third)
const ARC_BURST_N = 1, ARC_ECHO_S = 0.15, ARC_BURST_RATE = 1, ARC_ECHO_K = 1 / (ARC_BURST_N * ARC_BURST_RATE);
const ARC_JUMP_BASE = 234, ARC_VOLTAGE_JUMP = [1, 1.15, 1.45, 1.75];
// VOLTAGE PIERCES ARMOR (owner, 2026-10-11: "make upgrade choices matter" - Voltage was ARC's dead axis, worst on every
// type): its arcs ignore this share of armor - Voltage is ARC's armor answer, Conductivity the shields, Capacitance the fast
// THE ARC REDESIGN (owner, 2026-10-29, verbatim: "Now bad vs swarm, can you believe it / Hits hard, big chain, forks are limited to 1 fork
// per node, doesn't refork after 1 fork, cannot hit same target twice / ARC 0: one chain (hits 3) / Conductivity: increased carry damage /
// Shock: slows and armor breaks, no AoE zap / Voltage: increases chains and chain range / to make ARC not feel like overlapping SOL,
// keep range small, movement large, chain range up, so you get close zap and it conducts to a few units nearby"): ONE strike, a chain of
// ARC_VOLT_JUMPS jumps (tier 0: 2 - three enemies hit), each jump reaching ARC_VOLT_REACH u from the enemy it leaps from (not tied to
// ARC's own small range); from Voltage ARC_FORK_FROM the strike FORKS ONCE into two chains, and nothing forks after (branchFrom). Each
// jump keeps ARC_AMP_FALL x the hit before (Conductivity, id conductivity). Shock (id capacitance): every hit slows (ARC_RES_SLOW, for
// STAT_SLOW_T s - never a shielded enemy, applySlow) and breaks ARC_RES_STRIP of the armor left (shredPct); no
// charges, no bursts. A bolt never strikes a unit twice (skillHop). Numbers 0..V, let: the battery fits them
let ARC_AMP_FALL = [0.8, 0.9, 1, 1.1, 1.25, 1.4], ARC_VOLT_JUMPS = [2, 8, 12, 18, 24, 30] /* x1.5 from Voltage I with ARC_DMG_K (battery 7.7.0, 2026-11-05: ARC less damage, more hits - the 10-29 lever; tier 0 kept at 2 for "ARC 0: one chain (hits 3)"); was 2 5 8 12 16 20 */ /* more chaining, the brief; tier 0 stays one chain hitting three (owner, 2026-10-29) (was 2 3 4 5 6 8) */, ARC_VOLT_REACH = [187.5, 212.5, 237.5, 268.75, 300, 337.5] /* x1.25 with the radial hops (2026-11-06; was 150 170 190 215 240 270): a jump that may only go further out needs the reach - marks distance 10 -> 8 */ /* BACK to the 7.7.13 reach (2026-11-05): halved in 7.7.16 for the marks gap, it took ARC trios to 6/23 won vs 7.6.0's 17/23 over two 50-game screens; the marks pay ARC 2 -> 4, distance 12 -> 14 (reach x0.75 the same) */, ARC_FORK_FROM = 1; /* forks from Voltage I, the brief (was II) */
let ARC_RES_SLOW = [0, 0, 0, 0, 0, 0] /* Shock no longer slows, the brief - worse vs fast (was 0 .15 .25 .38 .47 .58) */ /* 0..V, with ARC's geometric curve (owner, 2026-11-01: "Release the arc change") */, ARC_RES_STRIP = [0, 0.05, 0.1, 0.19, 0.32, 0.48] /* 0..V, with it */;
// ARC_DMG_K (battery 7.7.0, 2026-11-05): every ARC hit x0.3 with the jumps x1.5 - its overkill on light types (0% leak late) traded for reach
const ARC_DMG_K = 0.3; // (x1.15 = 0.345 for 7.7.25 only: a patch for the halved reach, reverted with it)
const ARC_RES_DMG = [1, 1, 1.05, 1.1, 1.15, 1.2]; // Shock's hit factor 0..V
// SHOCKED (owner, 2026-11-01, picked "1": Shock makes shocked enemies take more damage from ARC): each Shock hit marks its target for
// the slow's time (STAT_SLOW_T, refreshed on hit); a marked enemy takes x(1 + ARC_SHOCK_AMP) from ARC's hits (damage(), not the burn)
let ARC_SHOCK_AMP = [0, 0.3, 0.7, 1.6, 1.8, 2]; // +% from ARC on a shocked enemy 0..V (front-loaded at III: band 2026-11-01)
function arcSkillStats(t, s, b) {
  const c = skillOf(t, "conductivity"), v = skillOf(t, "voltage"), z = skillOf(t, "capacitance");
  curveBase(t, s, b); // damage, rate, range: the STAT CURVE by total level (tier redesign 2026-10-24)
  s.dmgCurve = s.dmg; s.rateCurve = s.rate; s.rate *= ARC_BURST_RATE; s.dmg *= ARC_ECHO_K;
  s.arcRange = ARC_VOLT_REACH[v]; s.targets = 1; s.branch = 1; s.fork = v >= ARC_FORK_FROM; s.layers = ARC_VOLT_JUMPS[v]; s.revisit = 0;
  s.carry = 0; s.arcFall = ARC_AMP_FALL[c]; s.arcShrink = ARC_SHRINK; s.charge = null; s.statSlow = 0; s.resSlow = ARC_RES_SLOW[z]; s.resStrip = ARC_RES_STRIP[z]; s.shockAmp = ARC_SHOCK_AMP[z]; s.burn = ARC_BURN; s.skill = true;
  s.ground = c >= CAPSTONE_TIER; s.storm = v >= CAPSTONE_TIER; s.shockPass = z >= CAPSTONE_TIER; // the capstones (ARC_GROUND_R ..)
  s.dmg *= ARC_RES_DMG[z] * ARC_DMG_K; // Shock (id capacitance) hits a little harder by tier, each tier at most 2x the last with the curve's x1.9 (owner, 2026-11-01: "no level damage steps above 2x")
}

// THE THREE CAPSTONES (owner, 2026-11-06, "arc ones are good, except, shock V should apply the dead shocked enemy debuffs from ARC to all
// nearby enemies, zap goes to all affected"): Conductivity V GROUNDING - the last hop of each chain bursts, one hit of that hop's damage on
// every enemy within ARC_GROUND_R u of it that the bolt had not struck; Voltage V STORM - every ARC_STORM_EVERY-th strike a tower throws forks
// ARC_STORM_FORK ways at the strike (its usual fork is 2); Shock V - a Shocked enemy that dies passes its ARC debuffs (the Shocked mark and
// the burn, time refreshed) to every enemy within ARC_SHOCK_PASS_R u, a zap to each. The passes are bounded: ARC_PASS_DEPTH deep, ARC_PASS_FRAME zaps a frame
const ARC_GROUND_R = 40, ARC_STORM_EVERY = 5, ARC_STORM_FORK = 3, ARC_SHOCK_PASS_R = 80, ARC_PASS_DEPTH = 3, ARC_PASS_FRAME = 60;
const ARC_GROUND_FLASH = 0.3, ARC_STORM_LIVE = 0.8, ARC_STORM_TURNS = 3; // looks: the ring's life (s); how long a Storm strike's spin-up lasts (s); turns a second it adds at its peak
let arcPassDepth = 0, arcPassLeft = ARC_PASS_FRAME;
// ---------- ARC's chart firing ----------
// A bolt is a TREE grown a generation per hop: the strike, then every hit
// forks st.branch ways, st.layers jumps deep. A bolt NEVER hits the same
// enemy twice (owner) - so it can never strike more enemies than are in
// reach - and each jump hits ARC_FALL as hard and reaches ARC_SHRINK as far.
// Capacitance (owner, 2026-10-07: "Hits charge the target, charged targets arc
// once when hit by anything"): an ARC hit leaves a CHARGE on the enemy it struck,
// worth st.charge.frac of the hit; charges STACK. The next hit on that enemy from
// ANY tower - the ARC that charged it too (owner: it procs itself) - makes it ARC
// (dischargeStatic: every charge bursts round it) before the
// new charge lands, and the charge is gone; so does its DEATH (owner).
// THE FLICKER KEEPS UP WITH THE RATE (owner, 2026-10-26: "as ARC fire rate increases, the beam duration should also decrease to match and
// maintain flickering"): a beam lasts CHAIN_BEAM_LIFE x the bare ARC's rate over this one's, never longer
const arcBeamLife = st => CHAIN_BEAM_LIFE * Math.min(1, TOWERS.arc.rate * ARC_BURST_RATE / (st.rate || 1));
function fireSkillChain(t, st, e, seen) {
  if (seen && seen.has(e.id)) return; // a second strike never re-hits what the first took
  const col = TOWERS[t.kind].color, d = shotDamage(t, st, e, st.dmg);
  beam(t, e, col, arcBeamLife(st), 1.5, d);
  const root = { e, fx: Object.assign(fx[fx.length - 1], { soft: true, alpha: ARC_A }), up: null, kids: new Set() };
  // Voltage SHOWS (owner): a white-hot core in every arc, and at tier III the
  // strike point throws sparks
  const v = skillOf(t, "voltage");
  if (v) root.fx.pierce = true;
  if (v >= SKILL_TIERS - 1) burst(e.x, e.y, "white", v > SKILL_TIERS - 1 ? 12 : 6); // III sparks, the capstone IV twice as many
  const c = { t, st, col, skill: true, seen: seen || new Set(), hits: new Map() }; // shared by the attack's strikes
  c.forks = 2; // ways the strike forks (branchFrom): a Storm strike (every ARC_STORM_EVERY-th this tower throws) forks ARC_STORM_FORK
  if (st.storm) { t.strikeN = (t.strikeN || 0) + 1; if (t.strikeN % ARC_STORM_EVERY === 0) { c.forks = ARC_STORM_FORK; t.stormT = ARC_STORM_LIVE; } }
  c.seen.add(e.id); c.hits.set(e.id, 1);
  const dx = e.x - t.x, dy = e.y - t.y, dl = Math.hypot(dx, dy) || 1; c.vx = t.x + ARC_VTX_R * dx / dl; c.vy = t.y + ARC_VTX_R * dy / dl; // the firing vertex (arcOut)
  skillHit(c, e, d);
  branchFrom(c, root, 1);
}
// VOLTAGE CARRIES (owner, 2026-10-18: "a kill passes its leftover damage on to the nearest enemy"): a Voltage hit that kills arcs
// what the kill did not need on to the nearest enemy within VOLT_CARRY_R x the jump reach, up to VOLT_CARRY_N hops by tier - its
// single-target hit had nothing to spend on a swarm (countermx N=1: Voltage 71% leaked, Conductivity 35)
const VOLT_CARRY_N = [0, 1, 3, 6, 8], VOLT_CARRY_R = 0.8;
// VOLTAGE FORKS (tier redesign, owner 2026-10-24: "Voltage determines forking, Conductivity determines chaining"): ways each jump
// splits, by Voltage tier 0..V - tier I one fork (two ways); the forks Conductivity held (f 1 1 1 2, V 2) moved here
const VOLT_FORK = [1, 3, 3, 3, 5, 5]; /* x1.5, rounded (axis balance 2026-10-25, count first; was 1 2 2 2 3 3) */
function voltCarry(c, e, left) {
  const seen = new Set([e]);
  for (let k = 0; k < c.st.carry && left > 0; k++) {
    let o = null, bd = (c.st.arcRange * VOLT_CARRY_R) ** 2;
    for (const x of G.enemies) { if (x.dead || !x.seen || seen.has(x) || c.hits.has(x.id)) continue; /* never one its bolt already struck */ const dd = (x.x - e.x) ** 2 + (x.y - e.y) ** 2; if (dd < bd) { bd = dd; o = x; } }
    if (!o) return;
    beam(e, o, TOWERS.arc.color, arcBeamLife(c.st), 1, left); Object.assign(fx[fx.length - 1], { soft: true, alpha: ARC_A }); // a glow like every ARC beam (owner, 2026-10-24)
    const h = o.hp; fromHit(e, () => damage(o, left, c.t, false, false, c.st)); seen.add(o); c.hits.set(o.id, 1);
    if (!o.dead) return; left -= Math.max(0, h); e = o;
  }
}
// THE BURN (owner, 2026-10-30, "Yes all 3": kept for its sparks): every ARC hit burns ARC_BURN of the hit over ARC_BURN_N ticks of
// ARC_BURN_Q s, e.arcBurn { t (s left), k (a tick), id, acc }; a new hit restarts it. It moved no mark (shield leaked 94% with it and without)
const ARC_BURN = 0.2, ARC_BURN_N = 6, ARC_BURN_Q = 0.1; // 0.1 x2 ticks -> 0.2 x6: more, smaller ticks, each a shield pop (owner, 2026-11-01, the ARC brief: "ARC remove slow to make worse vs fast / Increase chaining/forking to make good vs swarm / increase damage and reduce fire rate to make good vs armor"; "yes and yes" to more, smaller burn ticks)
function arcBurnStep(dt) {
  arcPassLeft = ARC_PASS_FRAME; // a frame's budget of Shock V zaps
  for (const t of G.towers) if (t.stormT > 0) { const k = t.stormT / ARC_STORM_LIVE; t.stormPh = (t.stormPh || 0) + ARC_STORM_TURNS * k * dt; t.stormT = Math.max(0, t.stormT - dt); } // Storm's spin-up: the body draw reads stormT / stormPh
  for (const e of G.enemies) {
    if (e.shockT > 0) e.shockT -= dt; // SHOCKED wears off
    const u = e.arcBurn; if (!u || e.dead) continue;
    u.acc += dt; u.t -= dt;
    while (u.acc >= ARC_BURN_Q - 1e-9 && !e.dead) { u.acc -= ARC_BURN_Q; const t = G.towers.find(x => x.id === u.id); if (t) damage(e, u.k, t, true, false); }
    if (u.t <= 1e-9 || e.dead) e.arcBurn = null;
  }
}
function skillHit(c, e, d) {
  const hp0 = e.hp;
  damage(e, d, c.t, false, false, c.st); onHit(e, c.t, c.st, d); // (discharges e's own charges, if any)
  if (c.st.carry && e.dead && hp0 > 0 && d > hp0) voltCarry(c, e, d - hp0);
  if (c.st.resSlow && !e.dead) applySlow(e, c.st.resSlow, STAT_SLOW_T, c.t.id); // Shock (the ARC redesign, 2026-10-29)
  if (c.st.shockAmp && !e.dead) { e.shockAmp = Math.max(e.shockT > 0 && e.shockAmp || 0, c.st.shockAmp); e.shockT = STAT_SLOW_T; if (c.st.shockPass) e.shockPass = true; } // SHOCKED for the slow's time, refreshed on hit
  if (c.st.resStrip && !e.dead) shredPct(e, c.t, c.st.resStrip); // a SHARE of the armor left, as every strip since 6.18.0 (Wai 2026-10-28)
  if (c.st.burn && !e.dead) e.arcBurn = { t: ARC_BURN_N * ARC_BURN_Q, k: d * c.st.burn / ARC_BURN_N, id: c.t.id, acc: 0 }; // THE BURN (arcBurnStep)
  const b = c.st.charge;
  if (!b || e.dead) return;
  const ch = e.charge || (e.charge = { list: [], t: c.t });
  for (let k = 0; k < b.n; k++) ch.list.push(d * b.frac); // n charges a hit (the hit itself set off any it had)
  ch.t = c.t; ch.slow = Math.max(ch.slow || 0, c.st.statSlow || 0);
}
let staticQuiet = false;
// Overload's leaps SLOW what they hit (owner, 2026-10-06, the no-FRZ niche search):
// 30% for STAT_SLOW_T s - a late team without FRZ can answer the fast waves
const ARC_STAT_SLOW = [0, 0.25, 0.35, 0.45] /* from tier I and deeper (2026-10-11, roles: Capacitance is ARC's FAST answer - leaks 0% of fast, Conductivity 4; was 0 0 0 .15 .17 .2) */, STAT_SLOW_T = 0.6; // from III (owner, 2026-10-08: kept at III, not moved to V)
// a DISCHARGE: every charge the enemy holds BURSTS round it (ARC_CAPACITANCE; 2026-10-08, was a chain of
// arcs - too much like Conductivity). Quiet: a burst neither charges nor sets off charges, so there is
// no chain reaction (staticQuiet).
// ARC's LOOK only (owner, 2026-10-08: "overwhelming at high levels" -> "less visible overall, the strike most of all;
// still tied to damage, but less"): the strike draws at ARC_A, a jump at ARC_A x (its share of the strike)^ARC_CORR -
// so under Voltage IV-V, where a jump carries MORE than the strike, the far jumps outshine the shot; widths follow the
// damage at ARC_W_CORR of the usual slope; Capacitance's leaps thin and faint; the glow narrower and dimmer (drawFx, f.soft)
const ARC_A = 0.4, ARC_CORR = 0.5, ARC_W_CORR = 0.5, ARC_LEAP_A = 0.6 * ARC_A, ARC_LEAP_W = 0.6, ARC_GLOW_R = 3, ARC_GLOW_C = 0.35; /* the GLOW: its reach (x the core width, each side) and centre alpha - a falloff, not a layer (owner, 2026-10-23: "Beams should have glow, not semiopaque second layer"; was a 2x-wide layer at 0.16) */ // A and GLOW_A x1.33 (owner, 2026-10-19: "make arc visual effect slightly more intense"; were 0.3 / 0.12)
const ARC_BEAM_W = 0.2; // an ARC beam's glow x this, and its thin opaque core (owner, 2026-10-26: "condense arc beams visually, make them 0.2x current widths" / "I want fully opaque thin core back")
// CAPACITANCE CHAINS from tier CAP_CHAIN_FROM (owner, 2026-10-18: "a charged enemy that dies discharges into its neighbours" - it did,
// but not when a discharge killed it: no chain reaction): a charged enemy a discharge kills joins capQueue and goes off after the
// burst that killed it, once each (its charge is spent as it goes)
const CAP_CHAIN_FROM = 2 /* today's I, tier II since the tier redesign (2026-10-24) */, capQueue = [], CAP_BURST_K = [1, 1.1, 1.35, 1.7, 2]; // CAP_BURST_K: the burst's reach by Capacitance tier
function dischargeStatic(e) {
  const outer = !staticQuiet;
  dischargeOne(e);
  if (outer) while (capQueue.length) { const q = capQueue.shift(); if (q.charge) dischargeOne(q); }
}
function dischargeOne(e) {
  const ch = e.charge;
  e.charge = null;
  staticQuiet = true;
  try {
    // every charge BURSTS round the enemy: everything within ARC_BURST_R (the enemy too) takes it, a ring per charge
    // ONE thin, faint ring for the whole discharge, no glow (owner, 2026-10-08: "reduce intensity, no glow"; was a glowing ring per charge)
    ring(e.x, e.y, ARC_BURST_R, TOWERS.arc.color, 0.18, false); const rf = fx[fx.length - 1]; if (rf && rf.k === "ring") Object.assign(rf, { a: ARC_BURST_A, w: 1.2 }); // (the simulator stubs ring out)
    ch.list.forEach(dmg => {
      for (const o of G.enemies) {
        if (o.dead || !o.seen || Math.hypot(o.x - e.x, o.y - e.y) > ARC_BURST_R * CAP_BURST_K[skillOf(ch.t, "capacitance")]) continue;
        fromHit(e, () => damage(o, dmg, ch.t, false, false, null)); // away from the discharging enemy
        if (ch.slow && !o.dead) applySlow(o, ch.slow, STAT_SLOW_T, ch.t.id + ":stat");
      }
    });
  } finally { staticQuiet = false; }
}
// the nearest enemy this bolt has not hit yet, within this jump's (shrunk) reach
// CHAINS TARGET LIKE THEIR TOWER (owner, 2026-10-07: "chains should use the same targeting
// algorithm as the parent"): of the enemies a jump can reach, the one the tower's own mode
// ranks first (MODE_KEY: Near = closest to the core, Strengths = the best-marked type then most HP, Fresh = undebuffed
// first); ties go to the nearest. Used by ARC's jumps, Capacitance's leaps and SOL's refraction
function chainPick(t, from, r2, skip) {
  const key = MODE_KEY[t.mode] || MODE_KEY.close;
  let best = null, bk = Infinity, bd = Infinity;
  for (const o of G.enemies) {
    if (o.dead || !o.seen || skip(o)) continue;
    const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2;
    if (d > r2) continue;
    const k = key({ e: o, d }, t);
    if (k < bk || (k === bk && d < bd)) { bk = k; bd = d; best = o; }
  }
  return best;
}
// A JUMP REACHES HALF ARC'S RANGE FROM THE ENEMY IT LEAPS FROM, anywhere - not confined to ARC's own range (owner, 2026-10-26: "do not
// restrict ARC jumps to within arc range" / "each chain should be able to jump to an enemy within 1/2 arc range of enemy"; was
// st.arcRange x arcShrink a depth, inside the tower's range - "Confine all targets to within arc range", 2026-10-24)
const ARC_JUMP_K = 1 /* the FULL range (owner, 2026-10-26: "*100% of arc range on chain"; half for an hour) */, arcJumpR = st => (st.skill && st.arcRange) || st.range * ARC_JUMP_K; // the chart's ARC: Voltage's own reach (2026-10-29)
// EVERY JUMP GOES FURTHER OUT (owner, 2026-11-06: "for each subsequent arc, it can only choose targets that are radially further from ARC
// tower vertex that fired it"): a hop or fork takes only an enemy strictly further (floor distance) from the firing vertex than the enemy it
// leaves - the vertex the prism corner toward the first target (ARC_VTX_R u out from the tower's centre, the way the bolt is drawn leaving it)
let ARC_VTX_R = 22;
const arcOut = (c, o) => (o.x - c.vx) ** 2 + (o.y - c.vy) ** 2;
function skillHop(c, node, depth) {
  const r = arcJumpR(c.st);
  // ONE BOLT STRIKES A UNIT ONCE (owner, 2026-10-26: "lightning from the same bolt can never strike the same unit more than once (so a
  // unit can be hit once for each bolt)"; Conductivity III+ let it re-strike, st.revisit, before)
  const max = 1, hit = c.st.dmg, out = arcOut(c, node.e);
  return chainPick(c.t, node.e, r * r, o => o.id === node.e.id || arcOut(c, o) <= out || (c.hits.get(o.id) || 0) >= max || c.seen.has(o.id) || // c.seen: the attack's other bolts' (fire, aspira-towers.js)
    (ARC_JUMP_TOUGH && (o.max || 0) < (node.e.max || 0)) || (ARC_JUMP_MIN > 0 && (o.max || 0) < ARC_JUMP_MIN * hit * escale(o))); // the swarm rules (prototype, OFF)
}
// BAD VS SWARM, A PROTOTYPE (owner, 2026-10-29: ARC "Now bad vs swarm" - a chain clears swarmers whatever its numbers, 1cc1c0c): OFF by
// default (today's ARC). ARC_JUMP_TOUGH: a jump goes only to an enemy at least as tough (max HP) as the one it leaves; ARC_JUMP_MIN > 0:
// a jump skips an enemy whose max HP is under ARC_JUMP_MIN x the hit (x the late scale, as damage() applies it). let: the sims try them
let ARC_JUMP_TOUGH = false, ARC_JUMP_MIN = 0;
function skillHopTo(c, node, nxt, depth) {
  const raw = c.st.dmg * c.st.arcFall ** depth, d = shotDamage(c.t, c.st, nxt, raw);
  node.kids.add(nxt.id); c.seen.add(nxt.id); c.hits.set(nxt.id, (c.hits.get(nxt.id) || 0) + 1);
  beam(node.e, nxt, c.col, arcBeamLife(c.st), 1.5, d);
  Object.assign(fx[fx.length - 1], { soft: true, alpha: Math.min(1, ARC_A * (raw / c.st.dmg) ** ARC_CORR), share: raw / c.st.dmg }); // brighter as its share of the strike grows (ARC_A); share: its width too (arcInt, aspira-arc-body.js)
  if (skillOf(c.t, "voltage")) fx[fx.length - 1].pierce = true; // Voltage's white-hot core
  const child = { e: nxt, fx: fx[fx.length - 1], up: node, kids: new Set(), d };
  keepLit(node, arcBeamLife(c.st));
  fromHit(node.e, () => skillHit(c, nxt, d)); // its number flies on from the enemy the arc jumped from
  return child;
}

// GROUNDING (Conductivity V): a chain's last hop - its final layer, or the last it could make before nothing was in reach - bursts: one hit of
// that hop's damage on every enemy within ARC_GROUND_R of the enemy it struck, bar those its bolt (the attack's seen set) already took
function arcGround(c, node) {
  if (!c.st.ground || !node.up || node.grounded) return; // the strike alone is no hop
  node.grounded = true;
  ring(node.e.x, node.e.y, ARC_GROUND_R, "white", ARC_GROUND_FLASH, true, false); // a white ring flash
  for (const o of G.enemies) {
    if (o.dead || !o.seen || c.seen.has(o.id) || (o.x - node.e.x) ** 2 + (o.y - node.e.y) ** 2 > ARC_GROUND_R * ARC_GROUND_R) continue;
    c.seen.add(o.id); c.hits.set(o.id, 1); fromHit(node.e, () => skillHit(c, o, node.d));
  }
}
// SHOCK V: a Shocked enemy that dies (kill, aspira-game.js) hands its ARC debuffs - the Shocked mark and the burn - to every enemy within
// ARC_SHOCK_PASS_R, their time refreshed whole, and a short ARC zap runs to each. A pass whose debuffs later kill passes on again, but never
// ARC_PASS_DEPTH deep and never more than ARC_PASS_FRAME zaps a frame (arcPassLeft)
function arcShockPass(e) {
  if (!e.shockPass || !(e.shockT > 0) || arcPassDepth >= ARC_PASS_DEPTH) return;
  arcPassDepth++;
  try {
    for (const o of G.enemies) {
      if (o === e || o.dead || !o.seen || arcPassLeft <= 0 || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > ARC_SHOCK_PASS_R * ARC_SHOCK_PASS_R) continue;
      arcPassLeft--;
      o.shockAmp = Math.max(o.shockT > 0 && o.shockAmp || 0, e.shockAmp || 0); o.shockT = STAT_SLOW_T; o.shockPass = true;
      if (e.arcBurn) o.arcBurn = { t: ARC_BURN_N * ARC_BURN_Q, k: e.arcBurn.k, id: e.arcBurn.id, acc: 0 };
      beam(e, o, TOWERS.arc.color, CHAIN_BEAM_LIFE, 1, 0, false, false); Object.assign(fx[fx.length - 1], { soft: true, alpha: ARC_A, pierce: true }); // the zap: a fixed, short ARC bolt (the dead one does not follow)
    }
  } finally { arcPassDepth--; }
}
