// /aspira — how each tower fires: Chain's lightning tree, the Slower's pulse
// and tethers, the Reaper's locked charge and beam, and the fire() dispatcher
// the sim step calls. Shared combat rules (damage, onHit, shotDamage,
// applySlow, kill) stay in aspira-game.js; this file loads right after it.

// Chain lightning is a TREE (owner): the tower strikes one hub, the hub arcs
// to st.branch enemies, each of those to as many more, st.layers deep. Base
// is 1-2 (3 hits) at every level; the L2 PATH reshapes it (owner): Storm
// 1-3-9, Ion a line 1-1-1-1. Every arc
// reaches from its own parent (arcRange) to the nearest enemy and deals the
// strike's damage x arcFall. Arcs may BOUNCE BACK to an enemy this shot
// already hit (owner) - just not to their own parent, nor to one a sibling
// arc from the same parent already took. Every arc lands hopDelay(st) after
// its parent was hit - kills included (owner): no arc ever skips the delay.
// Pending arcs step in stepChains on game time, so the delay scales with speed.
// RPR fires a bright flash that is gone almost at once (owner); its reload
// is shown by a separate charge-up line instead (stepSol / drawAims)
// the arc delay is a QUARTER of the tower's shot interval (owner), so it
// follows fire-rate upgrades: 1.5 shots/s -> 0.17s per layer
// beam lives (x BEAM_LIFE_MUL; look only - owner, 2026-10-08: SOL longer, ARC slightly shorter; were 0.2 / 0.083)
const CHAIN_BEAM_LIFE = 0.04 /* a FLICKER: each of the burst's strikes flashes, a clear gap before the next (ARC_ECHO_S 0.15) and between bursts (owner, 2026-10-26: "Lightning beams should visually be much shorter lived in order to show flickering, and distinct gaps between bursts"; was 0.15, one burst gap) */, RAY_BEAM_LIFE = 0.15 /* SOL's beams, x2 (owner, 2026-10-26: "Make the beams last 2x as long visually"; halved to 0.075 earlier that day) */, CHAIN_HOP_FRAC = 0.25;
const hopDelay = st => CHAIN_HOP_FRAC / st.rate;
// arcs only land on enemies within the REACH, measured from the TOWER (owner;
// drawn as a dashed outer ring): CHAIN_LEASH x range for the base 1-layer
// tree, and a longer chain reaches further (owner, 2026-10-02) - +0.5 x range
// per layer: Storm (2) 2x, Ion (3) 2.5x, Rail (6) 4x, Railgun (10) 6x
const CHAIN_LEASH = 1.5, LEASH_PER_LAYER = 0.5;
const chainReach = st => (st.skill ? st.range + st.arcRange * (1 - st.arcShrink ** st.layers) / (1 - st.arcShrink) // a chart ARC: its jumps, each shorter
  : st.range * (CHAIN_LEASH + LEASH_PER_LAYER * (st.layers - 1)));

// The tree is built of NODES (an enemy can appear in several once arcs
// bounce back): node = { e, fx: the beam that reached it, up: parent node,
// kids: Set of enemy ids its arcs already took }.
// from: where the strike comes from - the tower, or (Static) the spot where a
// charged enemy died; relay: this shot was fired by Static (its hits charge
// enemies only at L4, Thunderhead, so kills cannot chain-react below that)
function fireChain(t, st, e, from = t, relay = false, seen = null) {
  if (st.skill) { fireSkillChain(t, st, e, seen); return; } // the skill-chart ARC (aspira-skills.js)
  const col = TOWERS[t.kind].color, dmg = shotDamage(t, st, e, st.dmg);
  beam(from, e, col, CHAIN_BEAM_LIFE, 1.5, dmg); const root = { e, fx: fx[fx.length - 1], up: null, kids: new Set() };
  if (st.ignoreShield) root.fx.pierce = true; // Ion: a white core - it pierces (owner)
  const c = { t, st, col, dmg: st.dmg * st.arcFall, seen: new Set([e.id]), relay };
  fromHit(from, () => chainHit(c, e, dmg));
  branchFrom(c, root, 1);
}
// one ARC hit; Static charges the enemy (Marigold border) so its death fires a shot
function chainHit(c, e, d) {
  damage(e, d, c.t, false, false, c.st); onHit(e, c.t, c.st, d);
  if (c.st.static && !e.dead && (!c.relay || c.st.static > 1)) e.charged = c.t;
}
// Static: a charged enemy that dies fires a full ARC shot from where it died,
// at the nearest live enemy within the tower's range of that spot
function staticDischarge(e) {
  const t = e.charged;
  if (!G.towers.includes(t)) return;
  const st = towerStats(t);
  let nxt = null, nd = st.range * st.range;
  for (const o of G.enemies) {
    if (o.dead || !o.seen || o === e) continue;
    const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
    if (d < nd) { nd = d; nxt = o; }
  }
  if (nxt) fireChain(t, st, nxt, { x: e.x, y: e.y }, true);
}
// keep this node's beam, and every beam above it, lit for `left` more
// seconds: a parent's beam outlives all its children's (the deepest keep
// CHAIN_BEAM_LIFE)
function keepLit(node, left) {
  for (let n = node; n; n = n.up) n.fx.life = Math.max(n.fx.life, n.fx.t + left * BEAM_LIFE_MUL); // beams last longer (owner), the tree with them
}
// queue st.branch pending arcs out of `node`, one tree layer deeper
// (ARMOR GROUNDED THE ARC 2026-10-08 .. 2026-10-26 - a chain stopped at any armored enemy; removed, owner: "Remove grounding" - its
// armor weakness is now its small hits' loss to flat armor alone)
function branchFrom(c, node, depth) {
  if (depth > c.st.layers) return;
  keepLit(node, hopDelay(c.st) + 0.05); // stay lit until the children land
  for (let i = 0; i < c.st.branch; i++) (G.chains ||= []).push({ c, node, depth, wait: hopDelay(c.st) });
}
function stepChains(dt) {
  if (!G.chains || !G.chains.length) return;
  const pending = G.chains; G.chains = [];
  for (const p of pending) {
    p.wait -= dt;
    if (p.wait > 0) { G.chains.push(p); continue; }
    const nxt = p.c.skill ? skillHop(p.c, p.node, p.depth) : nextHop(p.c, p.node);
    if (!nxt) continue; // nothing left in reach: this arc fizzles
    branchFrom(p.c, (p.c.skill ? skillHopTo : hopTo)(p.c, p.node, nxt, p.depth), p.depth + 1);
  }
}

// the nearest enemy within arc reach of the node's enemy (and the tower's
// leash) that is NOT AN ANCESTOR of this node (owner: every ARC hop, not just
// back to its own parent) - an arc never runs back up its own branch
function nextHop(c, node) {
  const from = node.e, leash = c.st.range ** 2, anc = new Set(); // inside ARC's own range (owner, 2026-10-24: "Confine all targets to within arc range"; was chainReach)
  for (let n = node; n; n = n.up) anc.add(n.e.id);
  let nxt = null, nd = c.st.arcRange * c.st.arcRange;
  for (const o of G.enemies) {
    if (o.dead || !o.seen || anc.has(o.id) || node.kids.has(o.id)) continue;
    if (c.st.noRevisit && c.seen.has(o.id)) continue; // Ion: a line runs ON, never back
    if ((o.x - c.t.x) ** 2 + (o.y - c.t.y) ** 2 > leash) continue;
    const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2;
    if (d < nd) { nd = d; nxt = o; }
  }
  return nxt;
}
// Crescendo (st.hopGain): each layer deeper hits that much harder than the last
function hopTo(c, node, nxt, depth) {
  const { t, st, col } = c, d = shotDamage(t, st, nxt, c.dmg * (st.hopGain || 1) ** (depth - 1));
  // Crescendo / Fortissimo: each hop LOOKS heavier too (owner) - a thicker
  // beam, a growing ring and more sparks the deeper it goes
  const up = st.hopGain ? depth - 1 : 0;
  node.kids.add(nxt.id); c.seen.add(nxt.id); beam(node.e, nxt, col, CHAIN_BEAM_LIFE, 1.5 * (1 + 0.6 * up), d);
  if (c.st.ignoreShield) fx[fx.length - 1].pierce = true;
  // the beam's opacity is the share of the FIRST strike's damage this hop still carries (owner)
  fx[fx.length - 1].alpha = Math.min(1, c.dmg * (st.hopGain || 1) ** (depth - 1) / st.dmg);
  if (up) { ring(nxt.x, nxt.y, 14 + 9 * up, col, 0.18 + 0.05 * up); burst(nxt.x, nxt.y, col, 3 * up); }
  const child = { e: nxt, fx: fx[fx.length - 1], up: node, kids: new Set() };
  keepLit(node, CHAIN_BEAM_LIFE); // the parent's beam outlasts this one
  fromHit(node.e, () => chainHit(c, nxt, d)); // its number flies on from the enemy the arc jumped from
  return child;
}

// Moons / Desolation (were Whiteout / Blizzard; owner, 2026-10-02): st.moons
// MOONS orbit the tower at MOON_ORBIT, evenly spaced, and EACH MOON IS A
// STASIS FRZ of its own - the tower's range, slow, nick and target count, all
// measured from the moon, with its own tether. Desolation: a third moon and
// +10% slow (owner).
const MOON_SPIN = 2 / 3, MOON_ORBIT = 126; // rad/s (owner: 4 -> 2 -> 2/3); orbit radius tripled (owner, 2026-10-05; was 80, then 42)
// a chart FRZ's moons orbit CLOSER, and closer with every Moons tier (owner,
// 2026-10-06: after the range halving 126 put them far outside the aura)
const MOON_ORBIT_BY_N = [MOON_ORBIT, 140, 140, 140]; // TWICE as far (owner, 2026-10-08: "twice as far as they are now"; was 70 at every tier, before that 70 58 46 46 46)
// a chart FRZ's moons fly ELLIPTICAL orbits (owner, 2026-10-08): Keplerian, the tower at a focus, the
// orbit's size its old radius, eccentricity MOON_ECC - the near end (periapsis) toward the core, so a moon
// swings far out over the lanes (210) and back in close (70), fastest near the tower; the moons are evenly
// spaced in TIME (mean anomaly), so they bunch on the far side like real ones
const MOON_ECC = 0; // back to CIRCLES (owner, same day; 0.5 swung 70..210) - 0 makes the orbit a circle round the tower
// the orbit itself, for drawing: centre (a x e from the focus, away from periapsis), semi-axes, tilt
function moonOrbit(t, n) {
  const a = MOON_ORBIT_BY_N[Math.min(n, MOON_ORBIT_BY_N.length - 1)], phi = Math.atan2(CY - t.y, CX - t.x);
  return { x: t.x - Math.cos(phi) * a * MOON_ECC, y: t.y - Math.sin(phi) * a * MOON_ECC, a, b: a * Math.sqrt(1 - MOON_ECC * MOON_ECC), phi };
}
function moonSpots(t, st) {
  const a = (t.spin || 0) * MOON_SPIN, n = st.moons || 1;
  const kep = hasSkills(t), phi = Math.atan2(CY - t.y, CX - t.x), cp = Math.cos(phi), sp = Math.sin(phi), b = Math.sqrt(1 - MOON_ECC * MOON_ECC);
  return Array.from({ length: n }, (_, i) => {
    const m = a + i * 2 * Math.PI / n;
    const r = kep ? MOON_ORBIT_BY_N[Math.min(n, MOON_ORBIT_BY_N.length - 1)] : MOON_ORBIT;
    if (!kep) return { x: t.x + Math.cos(m) * r, y: t.y + Math.sin(m) * r };
    let E = m; for (let k = 0; k < 5; k++) E -= (E - MOON_ECC * Math.sin(E) - m) / (1 - MOON_ECC * Math.cos(E)); // Kepler's equation
    const px = r * (Math.cos(E) - MOON_ECC), py = r * b * Math.sin(E); // from the focus, periapsis on +x
    return { x: t.x + px * cp - py * sp, y: t.y + px * sp + py * cp };
  });
}
// each moon's pick, like a Stasis FRZ standing where the moon is; t.moonLinks
// remembers which moon holds which enemy, for the tethers
function moonTargets(t, st) {
  const out = [], taken = new Set();
  t.moonLinks = [];
  moonSpots(t, st).forEach((m, i) => {
    const mine = pickTargets({ ...t, x: m.x, y: m.y }, st, 9999).filter(e => !taken.has(e))
      .sort((a, b) => (a.slowT > 0) - (b.slowT > 0)).slice(0, st.targets);
    for (const e of mine) { taken.add(e); out.push(e); t.moonLinks.push({ i, e }); }
  });
  return out;
}
function fireFrz(t, st) {
  // unslowed enemies first, so three towers do not all chill the same three
  const cands = st.moons ? moonTargets(t, st)
    : pickTargets(t, st, 9999).sort((a, b) => (a.slowT > 0) - (b.slowT > 0)).slice(0, st.targets);
  // SLW draws CONTINUOUS tethers to the enemies it last pulsed (drawTethers),
  // not per-pulse beams; the slow and nick still land once per pulse
  t.links = cands;
  for (const e of cands) {
    const fresh = !(e.slowT > 0);
    if (!applySlow(e, st.slow, st.permafrost ? Infinity : SLOW_TIME, t.id, st.permafrost ? "once" : "refresh")) continue; // Permafrost: once, forever
    if (st.shatter) e.shatter = { t, st };
    // Deep Freeze: a near-freeze (95% slow), never a stun - no stunlocking (owner)
    if (st.chillStop && fresh) applySlow(e, 0.95, st.chillStop, t.id + ":chill");
    if (st.brittle) e.brittle = Math.max(e.brittle || 1, st.brittle);
    if (st.siphon) e.siphon = Math.max(e.siphon || 1, st.siphon);
    // each pulse also nicks: st.dmg (+ Sap's % max HP); it is a real hit, so
    // it pops one shield charge per enemy touched (owner)
    const nick = st.dmg + (st.sap ? e.max * st.sap / escale(e) : 0); // (e.max is scaled already - damage() scales it again)
    if (nick > 0) damage(e, nick, t);
  }
  return cands.length > 0;
}

// Shatter (FRZ): an enemy that dies while slowed, after a Shatter FRZ chilled
// it, explodes for st.shatter.mul x that tower's hit on everyone within r;
// Frostbite slows what the blast hits. Blast kills never shatter in turn
// (no chain reactions; owner).
let shattering = false;
function shatterAt(e) {
  const { t, st } = e.shatter, r = st.shatter.r, d = st.dmg * st.shatter.mul;
  ring(e.x, e.y, r, "tfrz", 0.25, true); // gradient-filled (owner); FRZ's own hue
  shattering = true;
  for (const o of G.enemies) {
    if (o === e || o.dead || !o.seen || Math.hypot(o.x - e.x, o.y - e.y) > r) continue;
    fromHit(e, () => damage(o, d, t)); // away from the shattered enemy
    if (st.frostbite && !o.dead) { applySlow(o, st.slow, st.frostbite, t.id); o.biteT = st.frostbite; } // biteT: frost tint
  }
  shattering = false;
}

// A Reaper CHARGES at each locked target (t.locks: st.targets of them, 1 at base) for its whole reload
// (t.period), drawn as a fading-in line by drawAims, then fires at it.
// Owner's rules: if the target dies mid-charge the charge starts over on a
// new one; if it only leaves range the Reaper re-targets but keeps its charge;
// with no target at all it sits uncharged, so every shot is telegraphed.
const aimAt = (t, e) => Math.atan2(e.y - t.y, e.x - t.x);
// e within SOL's band (st.band u either side of the line from the tower along a, ahead of it)
const inSolCone = (t, st, a, e) => solInBand(t, st, e, a, t);
function stepSol(t, dt) {
  const st = towerStats(t);
  t.period = 1 / st.rate; solRodStep(t, st, dt); // (the scorch rods in flight - aspira-sol.js)
  // a lock can only START inside st.range (pickTargets); once charging it HOLDS its target WHEREVER it goes and fires,
  // but a target outside st.range when it fires is let go - no new charge on it until it is back in range (owner, 2026-10-26:
  // "if a target were to exit SOL's range as it is charging, it can keep charging and fire, but it cannot start charging again
  // until it enters SOLs range again"; it held out to SOL_HOLD x the range before). It holds up
  // to st.targets locks - 1 at base; more are PARKED for a Reaper upgrade
  // (owner: a `targets` mod) - EACH WITH ITS OWN CHARGE TIMER (owner):
  // a new lock charges from empty, fires its own ray when full and charges
  // again; a lock whose target dies or slips away is dropped, and the slot
  // refills with a fresh lock.
  // CHARGE CONSERVATION (owner, 2026-10-08): a lost lock hands its charge on only to a new
  // target inside the Refraction cone (st.cone either side) of the lost one's direction from
  // the tower; anywhere else the new lock charges from empty
  const lost = [];
  t.locks = (t.locks || []).filter(l => { const ok = !l.e.dead; if (!ok) lost.push({ a: aimAt(t, l.e), cd: l.cd }); return ok; });
  if (t.locks.length < st.targets) {
    for (const e of pickTargets(t, st, st.targets + t.locks.length)) {
      if (t.locks.length >= st.targets) break;
      if (t.locks.some(l => l.e === e)) continue;
      const k = lost.findIndex(o => inSolCone(t, st, o.a, e));
      t.locks.push({ e, cd: k >= 0 ? lost.splice(k, 1)[0].cd : t.period });
    }
  }
  let fired = false;
  for (const l of t.locks) {
    l.cd -= dt;
    if (l.cd > 0) continue;
    // a full charge RE-AIMS by the targeting before it fires (owner: Fresh kept
    // hitting the enemy it had already bled): the best enemy in range that no
    // other lock holds - inside the Refraction cone of its target, since only
    // there does the charge carry over (owner, 2026-10-08); else it fires where it was
    const a0 = aimAt(t, l.e), pick = pickTargets(t, st, st.targets + t.locks.length).find(e => e === l.e || (!t.locks.some(o => o.e === e) && inSolCone(t, st, a0, e)));
    if (pick) l.e = pick;
    fireRay(t, st, l.e); l.cd = t.period; fired = true; l.out = Math.hypot(l.e.x - t.x, l.e.y - t.y) > st.range; // out of range now: let go once it has fired
    t.shots = (t.shots || 0) + 1;
  }
  if (fired) { sfx(t.kind); t.locks = t.locks.filter(l => !l.out); }
}


// SOL's shot (owner, 2026-10-03). One crit roll per target, its chance the
// tower's own plus the target's BLEED, times st.critScale (Pinpoint). Forms:
//   st.bleedArmor / st.bleedCrit  each hit bleeds the enemy (Impale): armor
//                 down for good (multiplied toward 0), crit chance up for every tower
//   st.ricochet   the shot chains at full damage to this many more enemies
//   st.beams      converging beams, each a FULL hit (Focus 2 / 3 / 4) - so each pops
//                 its own shield charge
//   st.smash      a kill bursts for frac x the shot within r (Nova)
const BOUNCE_R = 120, BLEED_CRIT_CAP = 1; // Ricochet hop at 75%, with every range (owner)
function bleed(e, st, t) {
  if (!st.bleedArmor || e.dead) return;
  const k = st.breach || 1; // the chart SOL: Breach stacks per hit (aspira-skills.js)
  const per = st.bleedArmor;
  shredPct(e, t, 1 - (1 - per) ** k); // per: a share of the armor a hit (6.18.0), k stacks multiply (aspira-acid.js); its share of the damage it adds is SOL's (damageCredit)
  e.bleedCrit = Math.min(BLEED_CRIT_CAP, (e.bleedCrit || 0) + st.bleedCrit * k); e.breachN = (e.breachN || 0) + k; // stacks, for the spokes
  e.breached = (e.breached || 0) + per * k; e.breachBy = t; // (it fed the breach SHRAPNEL until the SOL rework, 2026-10-22 - SCORCH now; game.js's typeof guard skips the gone breachShrapnel)
}
function rayHit(t, st, e, base, from) {
  const crit = Math.random() < ((st.crit || 0) + (e.bleedCrit || 0)) * (st.critScale || 1);
  const m = crit ? st.critMul : 1, d = shotDamage(t, st, e, base) * m;
  const n = st.beams || 1, part = d; // every beam is a FULL hit (owner, 2026-10-06; was a fitted share of the shot)
  beam(from, e, TOWERS[t.kind].color, RAY_BEAM_LIFE, SOL_BEAM_THIN, d / m, true, false); /* a CRIT draws no wider: the beam's width reads the plain hit, 3 wide (owner, 2026-10-26: "don't thicken beams on crit"; was 5 wide and the crit's hit) */ // a SOL beam is FIXED where it struck at EVERY tier (owner, 2026-10-26: "neither visual should track the enemy"; it followed with st.pierce off, which no tier had until the plain tier 0 of 2026-10-28) // a chart SOL's beams THIN (owner, 2026-10-22)
  if (n > 1 && from === t) fx[fx.length - 1].beams = n; // n converging beams from the tower; a Refract hop past the first enemy is ONE thick beam (owner)
  // OPACITY = THE SHARE (owner, 2026-10-23: "the section of beam should reflect the % of damage it carries compared to the initial beam" /
  // "Opacity"): a SOL reflection's beam at base / st.dmg (its st.hop^k), the pass-through on from it x st.hop an enemy (solSpread) - drawn at
  // share^2, past BEAM_BRIGHT's cap (owner: "These 3 lines basically look the same / Exaggerate diff / Make beams way thinner each")
  const share = base / (st.dmg || 1); Object.assign(fx[fx.length - 1], { share, thin: SOL_THIN }); // every tier (a plain SOL drew 3 wide, unshared, for a morning - 2026-10-28)
  dmgBatch(() => { for (let i = 0; i < n && !e.dead; i++) { fromHit(from, () => damage(e, part, t, false, crit, st)); onHit(e, t, st, part); bleed(e, st, t); } }); // ONE number for the volley (dmgBatch, aspira-floats.js); a crit PINK (owner); st: its shieldPop
  solSpread(t, st, from, e, base, share); // (every tier, kill or not: a plain SOL only flies on, Diffraction splits - aspira-sol.js) - the RAW hit x the carry, as a reflection carries it (owner, 2026-10-26: "both carry amounts based on carryover"; was the hit after armor and crit)
  if (e.dead && st.smash && !e.smashed) {
    // Nova / Supernova: the kill bursts (a filled blast that lingers, owner)
    e.smashed = true;
    fx.push({ k: "blast", x: e.x, y: e.y, r: st.smash.r, color: TOWERS[t.kind].color, t: 0, life: 0.35 });
    for (const o of G.enemies) {
      if (o !== e && (!o.dead && o.seen) && Math.hypot(o.x - e.x, o.y - e.y) <= st.smash.r) damage(o, d * st.smash.frac, t, true);
    }
  }
}
function fireRay(t, st, e) {
  const a = Math.atan2(e.y - t.y, e.x - t.x); solAim = st.pierce ? a : null; rayHit(t, st, e, st.dmg, t); // SOL: the shot's band axis - Diffraction's; a plain SOL has none (aspira-sol.js)
  if (t.kind === "sol" && st.par) solParallel(t, st, a); // Breach's parallel beams (aspira-sol.js)
  if (t.kind === "sol" && st.dot) solRodFire(t, st, a); // the scorch ROD slides out along the shot (aspira-sol.js) - Scorch's, band mechanic or not (2026-10-28; it rode solAim); the prism itself persists and fades on its own (drawAims)
  if (!st.ricochet) return;
  // Ricochet / Shredder: hop to the nearest enemy not yet hit, at full damage
  const hit = new Set([e]);
  let prev = e;
  for (let k = 0; k < st.ricochet; k++) {
    let nxt = null, nd = BOUNCE_R * BOUNCE_R;
    for (const o of G.enemies) {
      if (o.dead || !o.seen || hit.has(o)) continue;
      const dd = (o.x - prev.x) ** 2 + (o.y - prev.y) ** 2;
      if (dd < nd) { nd = dd; nxt = o; }
    }
    if (!nxt) break;
    rayHit(t, st, nxt, st.dmg, prev); hit.add(nxt); prev = nxt;
  }
}

function fire(t, st) {
  if (t.kind === "frz") { const hit = fireFrz(t, st); if (!hit) t.links = []; return hit; }
  const targets = pickTargets(t, st, st.targets);
  if (!targets.length) return false;
  t.shots = (t.shots || 0) + 1;
  // one chain per target: st.targets > 1 (Ion's Fork) starts several lines on
  // DIFFERENT enemies (pickTargets never repeats one)
  // (a chart ARC's two strikes are two SEPARATE attacks - owner: each its own tree)
  // ONE HIT SET AN ATTACK (owner, 2026-10-28: "reduce the number of arc hits" / "no-rehit same enemy"): the bolts share it, so no enemy is
  // struck by two bolts of one attack (each bolt struck a unit once already; Capacitance's bursts still re-hit - "capacitance should re-hit")
  if (t.kind === "arc") { const seen = new Set(); for (const e of targets) fireChain(t, st, e, t, false, seen); return true; }
  if (t.kind === "sol") { fireRay(t, st, targets[0]); return true; }
  if (t.kind === "grv") return novaAt(t, st, targets[0]); // a nova on it, no projectile (aspira-grv.js)
  const col = TOWERS[t.kind].color;
  for (const e of targets) {
    const d = shotDamage(t, st, e, st.dmg);
    beam(t, e, col, 0.02, 1.5, d, false, false); damage(e, d, t); onHit(e, t, st, d);
  }
  return true;
}

function usePower(code) {
  if (G.charge < POWER_FULL || G.over) return;
  G.charge = 0;
  if (code === "FRZ") {
    for (const e of G.enemies) if (e.seen) e.stunT = Math.max(e.stunT, 4 / 3);
    banner("freeze");
  } else if (code === "BOM") {
    for (const e of G.enemies) { burst(e.x, e.y, "orange", 6); damage(e, e.max * 0.45 / escale(e), null); }
    ring(CX, CY, 480, "orange", 0.6); banner("blast");
  } else {
    G.power[code] = POWER_TIME;
    banner(POWERS.find(p => p[0] === code)[1].toLowerCase());
  }
}
// towers MOVE (the leash, moveTower) and the tower's own marks: aspira-move.js
