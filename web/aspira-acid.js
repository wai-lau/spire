// /aspira - ACD, the acid tower: its burning LINES and their ramp, Rain's
// chain, and (the skill chart) Seep's PUDDLES. Split from aspira-towers.js at
// its 500-line cap; same global scope, loaded right after it (the simulator too).

// ACD (owner): continuous LINES on enemies whose burn RAMPS EXPONENTIALLY
// while held - doubling every st.double seconds (1s; Catalyst 0.6s), capped at
// st.cap (x64). It starts LOW (3 dmg/s at x1). Damage lands in st.rate ticks a
// second, each a real hit (armor cuts it, a shield eats it). Each line keeps
// its own ramp, which resets when its enemy dies or leaves range.
//   st.targets    lines at once (Pour 3)
//   st.residue    seconds a line keeps burning after its enemy leaves range
//   st.plagueR    each tick also burns everyone within this radius of the
//                 line's enemy (Plague); st.bloom grows it with the ramp
//   st.corrode    armor stripped from everything a tick burns, below zero
//   st.allInRange no lines: every enemy in range burns on its own ramp
// ACD_BASE_MAX 64 -> 32 (overnight phase 3, 2026-10-06): ACD dealt 52-99% of a late team's damage
const ACD_BASE_DOUBLE = 1, ACD_BASE_MAX = 32; // (halved to 16 and restored, 2026-10-08: the boss gap was SOL's, not the cap's - bossvs.mjs)
const acdMulOf = (held, st) => Math.min(st.cap, 2 ** (held / st.double));
const acdFrac = (l, st) => Math.log2(acdMulOf(l.held, st)) / Math.log2(st.cap); // 0 fresh .. 1 full burn
function plagueRadius(l, st) {
  return st.plagueR * (st.bloom ? 1 + (st.bloom - 1) * acdFrac(l, st) : 1);
}
// a new line's FIRST tick lands ACD_FIRST_S in, not a whole tick (owner, 2026-10-13: "start ticking asap", then "make acd wait
// 1/16 s instead of being instant")
const ACD_FIRST_S = 0 /* owner, 2026-10-20: "towers, other than SOL should have 0 windup before shooting their first attack" (was 1/16) */, acdFirstTick = st => Math.max(0, 1 / st.rate - ACD_FIRST_S);
function acdLines(t, st) {
  const r2 = st.range ** 2, inRange = e => !e.dead && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r2;
  // Chain Reaction (st.carry): a line whose enemy DIED hands that share of its ramp to the next new line
  for (const l of t.lines || []) if (l.e.dead && st.carry) t.spare = Math.max(t.spare || 0, l.held * st.carry);
  let lines = (t.lines || []).filter(l => !l.e.dead);
  if (st.allInRange) {
    const had = new Map(lines.map(l => [l.e, l]));
    return G.enemies.filter(e => e.seen && inRange(e)).map(e => had.get(e) || { e, held: 0, tick: acdFirstTick(st) }); // a new line BURNS ACD_FIRST_S in (acdFirstTick)
  }
  // a line whose enemy left range lives on for st.residue seconds (Residue)
  lines = lines.filter(l => {
    if (inRange(l.e)) { l.left = st.residue || 0; return true; }
    if ((l.left ?? 0) > 0) return true;
    if (st.carry) t.spare = Math.max(t.spare || 0, l.held * st.carry); // Flow: an escaped enemy hands its ramp on too (the fast answer)
    return false;
  });
  let live = lines.filter(l => inRange(l.e)).length;
  for (const e of pickTargets(t, st, st.targets + lines.length)) {
    if (live >= st.targets) break;
    if (!lines.some(l => l.e === e)) { lines.push({ e, held: t.spare || 0, tick: acdFirstTick(st), left: st.residue || 0 }); t.spare = 0; live++; } // (ACD_FIRST_S in)
  }
  return lines;
}
// Rain's chain: from the burning enemy, hop to the nearest enemy not yet in it
// within RAIN_HOP, never past the tower's reach, up to st.rainChain hops
const RAIN_HOP = 120;
function rainChain(t, st, from) {
  const out = [], seen = new Set([from]), r2 = st.range ** 2;
  let at = from;
  while (out.length < st.rainChain) {
    let nxt = null, nd = RAIN_HOP * RAIN_HOP;
    for (const o of G.enemies) {
      if (o.dead || !o.seen || seen.has(o) || (o.x - t.x) ** 2 + (o.y - t.y) ** 2 > r2) continue;
      const d = (o.x - at.x) ** 2 + (o.y - at.y) ** 2;
      if (d < nd) { nd = d; nxt = o; }
    }
    if (!nxt) break;
    seen.add(nxt); out.push(nxt); at = nxt;
  }
  return out;
}
function acdTick(t, st, l, every) {
  const d = st.dmg * acdMulOf(l.held, st) * every;
  const burn = o => {
    const dd = shotDamage(t, st, o, d);
    damage(o, dd, t, false, false, st); onHit(o, t, st, dd); o.burnT = 0.4; // burning: no longer Fresh (st: its noFx)
    // (the jets' own slow moved to the POOLS - owner, 2026-10-22: "move slow from jets to pools"; stepPuddles)
    if (st.corrode && !o.dead) corrodeHit(o, st.corrode, t); // Corrosion: st.corrode of the armor a tick (shredPct); corrodeT: dotted ring
  };
  const R = st.plagueR ? plagueRadius(l, st) : 0, center = l.e;
  burn(center);
  if (st.rainChain) l.chain = rainChain(t, st, center).filter(o => { burn(o); return true; });
  if (R) for (const o of G.enemies) if (o !== center && !o.dead && o.seen && Math.hypot(o.x - center.x, o.y - center.y) <= R) burn(o);
}
function stepAcd(t, dt) {
  const st = towerStats(t), every = 1 / st.rate, r2 = st.range ** 2;
  t.lines = acdLines(t, st);
  for (const l of t.lines) {
    if ((l.e.x - t.x) ** 2 + (l.e.y - t.y) ** 2 > r2) l.left -= dt; // Residue's countdown
    l.held += dt; l.tick += dt;
    // every tick spits (owner: Hydralisk sound); aspira-sfx.js caps it at 3
    // at once, each quieter than the last
    while (l.tick >= every && !l.e.dead) { l.tick -= every; acdTick(t, st, l, every); sfx("acd"); }
  }
  if (st.contagion) stepPuddles(t, st, dt); // the chart ACD's puddles (aspira-skills.js)
}

// ---------- ACD's chart (moved from aspira-skills.js at its 500-line cap, 2026-10-07): Catalyst ramp, Pour lines, Seep puddles ----------
// FITTED 2026-10-06 to +25 / +50 / +100% (Spray to +30 / +60 / +120%, since
// its lines can never share an enemy): Corrosion's ramp time, Spray's per-line
// damage, Contagion's puddle heat (tier III's is below II's - its puddles are bigger)
// REFIT 2026-10-06 (overnight phase 2: standard team, waves 20-40, HP scaled so it is pressed - the earlier thin-field fits ran 3-12x over target)
// CORROSION REWORKED 2026-10-07 (owner): a dud axis (111% at 0, 96% at III) - the
// ramp's SPEED never mattered, enemies die or leave before it tops out. Now tier I
// keeps full heat on a new target (it was III's), II / III burn HOTTER at every
// heat (ACD_CORROSION_DMG x the dps, so the top heat rises with it - raising only
// the cap did nothing, the ramp rarely reaches it); the ramp stays ACD_DOUBLE[0]
// Corrosion EATS ARMOR again (owner, 2026-10-10: three towers, every trio must be winnable): the chart rework had
// dropped st.corrode, so the axis no longer touched armor. Each tick strips ACD_CORRODE of its damage (past zero then - negative armor a
// flat bonus on every hit from every tower, bosses too; since the 2026-10-28 armor rework a strip multiplies armor toward 0, shredArmor). The weakest of 1x / 3x / 10x tried
// (scripts/aspira-sim/trios.mjs): ARC+FRZ+ACD 90 -> won (Judgement, Death), ARC+SOL+ACD 96 -> won (Capacitance first)
// THE BOSS FLOOR FOR ALL (owner, 2026-10-22: "boss armor floor to everything", after "no floor" the same day): armor COUNTED no lower than
// minus the wave's armor (armorRefOf) on any enemy - GONE with the 2026-10-28 armor rework (armor never goes below 0, so nothing to floor;
// armorRefOf stays: the strips' and the frost's yardstick). Corrosion eats from the jets only - not the pools (owner,
// 2026-10-13). (No floor 2026-10-13 .. 22: "just get rid of this floor".) (A floor of 0.25-1.25x the
// wave's armor, x16 on bosses, held it 2026-10-12)
const acdArmorRef = new Map(), armorRefOf = n => acdArmorRef.get(n) ?? acdArmorRef.set(n, ENEMIES.armor.armor * ENEMY_HP_MUL * armorGrow(n) * scaleOf(n)).get(n); // (x the LATE SCALE)
// DAMAGE CREDIT (owner, 2026-10-12: "damage caused by debuff from another tower should attribute damage source to
// the debuffing tower"): of a hit's tally (`got`), what BRITTLE added goes to the FRZ that made it brittle (e.brittleBy),
// what LOWER ARMOR added (stripped by Breach / Corrosion - e.strip, by tower id - and frost, e.frostBy) to those towers
// by their shares, and the rest to the hitter. hit(a, A): the hit `a` through armor A, as damage() takes it
// ARMOR IS A CURVE (owner, 2026-10-28: "armor is a percentage / applied non-linearly"; was a flat bite, never below 10% of the hit, and
// negative armor a flat bonus - an on/off: a hit well over the armor walked through, one under it fell to the floor): a hit loses
// R / (R + ARMOR_K x hit) of itself, at most ARMOR_CAP - a hit as big as the armor loses half, smaller ones more, bigger ones less.
// Armor never counts below 0 (shredding multiplies it down - aspira-acid.js)
const ARMOR_CAP = 0.9, ARMOR_K = 1;
const armorTake = (a, R) => (R > 0 && a > 0 ? a * (1 - Math.min(ARMOR_CAP, R / (R + ARMOR_K * a))) : a);
// EVERY ENEMY IS ARMORED (owner, 2026-10-28: "give all units armor, but armor way more"): ARMOR_ALL of an armor unit's armor at that wave,
// the armor type its own (spawnEnemy, aspira-game.js); shredding then works on everything
const ARMOR_ALL = { swarm: 0.1, fast: 0.1, shield: 0.15 };
// SHREDDING MULTIPLIES (owner, 2026-10-28: "armor reduction applies a multiplier to the armor ... no need for it to go negative" /
// "I expect most shedding to be something like 0.9x, especially if many hits are expected"): a strip of `amt` (the old flat amount, in
// armor) cuts amt / the wave's armor reference of the armor, x SHRED_K, at most SHRED_MAX a strip - never below 0. Returns what it cut
let SHRED_K = 1, SHRED_MAX = 0.9; // 0.5 -> 0.9 (owner, 2026-10-28: "Raise SHRED_MAX" / "armor shred should allow approach to 0" - a strip takes at most 90% of what is left, repeated strips multiply on toward 0; swept 0.5/0.75/0.9: the armor columns barely move, armor already near 0 after a few strips) (let: the sims sweep them)
// EVERY STRIP A PERCENT (owner, 2026-10-28: "for armor, all strip should be changed to a % not a flat number"): shredPct takes `p` of the CURRENT armor - repeated strips multiply toward 0, never below; SHRED_MAX
// stays as a safety only (no table reaches it but Nova V's 0.901). Breach, Corrosion and Nova use it; shredArmor (amount / the wave's
// reference) is left for the goo, whose drop is already a fixed share of that reference
function shredPct(e, t, p) {
  const a = e.armor || 0; if (a <= 0 || !(p > 0)) return 0;
  const cut = a * Math.min(SHRED_MAX, p); e.armor = a - cut; stripBy(e, t, cut); return cut;
}
function shredArmor(e, t, amt) {
  const a = e.armor || 0; if (a <= 0 || !(amt > 0)) return 0;
  const cut = a * Math.min(SHRED_MAX, SHRED_K * amt / armorRefOf(e.wave || 1)); e.armor = a - cut; stripBy(e, t, cut); return cut;
}
function stripBy(e, t, amt) { if (t && amt > 0) (e.strip ||= {})[t.id] = (e.strip[t.id] || 0) + amt; }
function damageCredit(e, t, pre, amt, frost, got) {
  const A0 = e.armor0 || 0, hit = armorTake; // (aspira-game.js: the armor curve)
  const base = hit(pre, A0), brit = Math.max(0, hit(amt, A0) - base), full = hit(amt, (e.armor || 0) - frost), arm = Math.max(0, full - base - brit);
  const k = full > 0 ? got / full : 0, give = (id, v) => { const o = id != null && G.towers.find(x => x.id === id); if (o && v > 0) { o.dealt = (o.dealt || 0) + v; return v; } return 0; };
  let mine = got;
  if (brit) mine -= give(e.brittleBy, brit * k);
  if (arm) {
    const parts = Object.entries(e.strip || {}).map(([id, v]) => [Number(id), v]);
    if (frost > 0) parts.push([e.frostBy, frost]);
    const sum = parts.reduce((s, p) => s + p[1], 0);
    if (sum > 0) for (const [id, v] of parts) mine -= give(id, arm * k * v / sum);
  }
  t.dealt = (t.dealt || 0) + mine;
}
function corrodeHit(e, p, t) {
  const cut = shredPct(e, t, p); // a share of the armor a tick (6.18.0; was the tick's damage x ACD_CORRODE over the wave's reference)
  e.corrodeT = 0.4;
  dripAcc(e, DRIP_REAL * cut, t); // eaten armor drips, DRIP_REAL x (owner, 2026-10-13; all of it is real armor since the 2026-10-28 rework - none below zero)
}
// THE DRIP (owner, 2026-10-13: "when armor is removed, it should drip down (green coin like dots without shimmer), this is
// collected by nearby enemies, and they lose X% of the collected drip"): the armor Corrosion eats off ANY enemy, below zero too,
// falls - and what it eats off real armor (above zero) counts DRIP_REAL times ("goo should fly out for any eaten armor, even
// negative; however, triple the amount when the armor is not negative armor") -
// as drops of DRIP_UNIT x the wave's armor reference; a drop lies DRIP_LIFE s, and the first other enemy within DRIP_R of it
// takes it - its armor loses DRIP_TAKE x the drop, credited to the ACD. let: the sims sweep them
let DRIP_TAKE = 2 /* countermx 2026-10-13: 0.5 / 1 / 2 - 2 brought the late armor column down most (ACD 6-13%) */, DRIP_UNIT = 0.3 /* a third as many drops, each 3x - the same goo in all (owner, 2026-10-13: "reduce goo pellet count"; was 0.1) */, DRIP_REAL = 3, DRIP_TIER_K = 0.6; // DRIP_TIER_K: x (1 + it x the dropping ACD's Corrosion tier) - countermx 2026-10-13: 0.6 brings Corrosion builds to 1-6% late armor (0: 6-12%)
const DRIP_LIFE = GOO_MAX_S /* x5 (owner, 2026-10-14: "make corrosion goo last 5x longer"; was 8) */, DRIP_R = 14, DRIP_MAX = 1000 /* (was 300 at the 8 s life) */, DRIP_JIT = 8;
// a drop is FLUNG back up the lane (owner, 2026-10-13: "give them some initial velocity in the direction of the lane (outwards),
// give them a bit of angle jitter"): along the lane behind the enemy, +-DRIP_SPREAD rad, slowing from the start (by DRIP_TAU s)
// and coming to rest DRIP_STOP units out ("it should slow down right away, but stop at 200 units"): launched at DRIP_STOP / DRIP_TAU
// ...ALONG the lane, not straight off it (owner, 2026-10-13: "too much angle jitter on corrosion goo, make it mostly go backwards
// down the lane"; was a straight flight, +-0.45 rad): a drop rides its enemy's lane back up it, drifting sideways by at most
// DRIP_SPREAD of its run
const DRIP_SPREAD = 0.1, DRIP_TAU = 0.6, DRIP_STOP = 200, DRIP_V = DRIP_STOP / DRIP_TAU;
const DRIP_V_JIT = 0.6; // launch speed x(1 +- this), so a drop rests 80-320 units back (owner, 2026-10-13: "add significant speed jitter to goo launch")
// ...and it SEEKS (owner, 2026-10-13: "acid blobs need to gravitate towards other units at 50 units, this should improve as
// corrosion levels up"): a drop homes on the nearest other enemy within its Corrosion tier's ACD_DRIP_PULL, at DRIP_HOME_V
const ACD_DRIP_PULL = [0, 50, 80, 120]; /* (VI: CAPSTONE_NUM, aspira-capstone.js) */
const DRIP_HOME_V = 260;
function dripAcc(e, amt, t) {
  e.drip = (e.drip || 0) + amt; e.dripBy = t;
  const unit = DRIP_UNIT * armorRefOf(e.wave || 1);
  while (e.drip >= unit) { e.drip -= unit; dripDrop(e, unit, t); }
}
// ...and what is left over when the enemy DIES falls too, a smaller drop (owner, 2026-10-13: "sometimes it seems like corrosion
// does damage without launching any goo" - a quick kill never filled a whole drop). kill(), aspira-game.js
function dripFlush(e) { if (e.drip > 0) dripDrop(e, e.drip, e.dripBy); e.drip = 0; }
function dripDrop(e, v, t) {
  if (G.drips.length >= DRIP_MAX) G.drips.shift();
  const a = Math.random() * 6.283, r = DRIP_JIT * Math.sqrt(Math.random()), on = pathAt(e.pi, e.s, e.ang);
  const tier = t && t.skills ? skillOf(t, "corrosion") : 1, pull = ACD_DRIP_PULL[tier] || ACD_DRIP_PULL[1];
  G.drips.push({ x: e.x, y: e.y, vx: 0, vy: 0, lane: { pi: e.pi, ang: e.ang, s: e.s, sv: DRIP_V * (1 - DRIP_V_JIT + 2 * DRIP_V_JIT * Math.random()), lat: 0, lv: DRIP_V * (Math.random() * 2 - 1) * DRIP_SPREAD,
    ox: e.x - on.x + Math.cos(a) * r, oy: e.y - on.y + Math.sin(a) * r }, v: v * (1 + DRIP_TIER_K * TIER_LEVEL[tier]), src: e, by: t, t: 0, pull, sz: 0.5 + Math.random(), ring: Math.random() < DRIP_HOLLOW }); // sz: its drawn size, mixed; ring: drawn HOLLOW (owner, 2026-10-13) // ox, oy: off the lane's line, as its enemy was
}
// a drop riding its lane: back up it (s falling), its sideways drift along the lane's normal there, both slowing by keep
function dripRide(d, dt, keep) {
  const L = d.lane;
  L.s = Math.max(0, L.s - L.sv * dt); L.lat += L.lv * dt; L.sv *= keep; L.lv *= keep;
  const p = pathAt(L.pi, L.s, L.ang), q = pathAt(L.pi, L.s + 4, L.ang), tl = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  d.x = p.x + L.ox - (q.y - p.y) / tl * L.lat; d.y = p.y + L.oy + (q.x - p.x) / tl * L.lat;
}
function stepDrips(dt) {
  if (!G.drips.length) return;
  const keep = Math.exp(-dt / DRIP_TAU), grid = enemyGrid(); // the live enemies in POOL_CELL squares: a drop looks only in its own and the 8 round it (pull <= 120 < POOL_CELL) - up to DRIP_MAX of them a step
  for (const d of G.drips) {
    d.t += dt;
    if (d.lane) dripRide(d, dt, keep); else { d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= keep; d.vy *= keep; }
    let near = null, nd = d.pull * d.pull;
    for (const o of poolNear(grid, { x: d.x, y: d.y, r: POOL_CELL })) {
      if (o.dead || o === d.src) continue; // never its own enemy's (owner, 2026-10-13)
      const dd = (o.x - d.x) ** 2 + (o.y - d.y) ** 2, rr = DRIP_R + ENEMIES[o.type].size * (o.sizeMul || 1);
      if (dd <= rr * rr) { // picked up
        const take = DRIP_TAKE * d.v, by = G.towers.includes(d.by) ? d.by : null;
        shredArmor(o, by, take); o.corrodeT = 0.4;
        fromHit(d, () => damage(o, take, by)); // and it BURNS as much as it strips (owner, 2026-10-13: "goo should also deal damage equal to the amount of armor it strips")
        d.done = true; near = null; break;
      }
      if (dd < nd) { nd = dd; near = o; }
    }
    if (near) { const l = Math.sqrt(nd) || 1; d.lane = null; d.vx = (near.x - d.x) / l * DRIP_HOME_V; d.vy = (near.y - d.y) / l * DRIP_HOME_V; } // homing: off the lane
  }
  G.drips = G.drips.filter(d => !d.done && d.t < DRIP_LIFE);
}
// a drop: a chatsubo dot like a coin, no twinkle - BIG and bright with a dark rim so it reads on the lanes (owner, 2026-10-13:
// "make the corrosion drops much more visible"; was a faint 1.8 dot), each its own size, x0.5-1.5 ("the goo should visually have
// mixed sizes"), fading over its last second
const DRIP_DOT_R = 3.6, DRIP_HOLLOW = 0.35; // HOLLOW: the share drawn as a ring ("some hollow")
function drawDrips() {
  if (!G.drips || !G.drips.length) return;
  ctx.fillStyle = COL.tacd; ctx.strokeStyle = COL.bg; ctx.lineWidth = 1.2;
  for (const d of G.drips) {
    ctx.globalAlpha = Math.min(1, DRIP_LIFE - d.t);
    ctx.beginPath(); ctx.arc(d.x, d.y, DRIP_DOT_R * (d.sz || 1), 0, 6.283);
    if (d.ring) { ctx.strokeStyle = COL.tacd; ctx.lineWidth = 1.6; ctx.stroke(); ctx.strokeStyle = COL.bg; ctx.lineWidth = 1.2; } else { ctx.fill(); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}
const ACD_CORRODE = [0, 0.093, 0.254, 0.443]; /* a SHARE of the armor a tick, 6.18.0 (owner, 2026-10-28: "for armor, all strip should be changed to a % not a flat number"): today's tier III at waves 101-119 (25.4%, stripprobe), the other tiers as stacked shares of the old ladder - 1 - (1 - 0.254)^(old / old III); was 0.1 0.3 0.6 of the tick's damage */ // x2 (2026-10-12: Corrosion is the strip alone now; was .06 .. .3) // x6 (2026-10-11, roles: Corrosion meant as ACD's ARMOR answer - still behind spread in TEAM countermx; was .01 .. .05)
// ROLES REWORK (owner, 2026-10-12: "what is acd weak to now? seems op"): a bare ACD is a tank killer, weak to the FAST
// (no carry: a jet starts cold on every new enemy) and to SHIELDS (acid and pools pop one charge a tick, like any hit).
// Flow buys the fast back: ACD_FLOW_CARRY of a jet's ramp rides on when its enemy dies OR escapes, past 1 = it lands
// hotter (the slow it once added - ACD_FLOW_SLOW - is the POOLS' since the tier redesign: Contagion's ACD_POOL_SLOW). Contagion buys the
// shields back through COVERAGE: bigger, longer pools ticking on more enemies. Corrosion: the strongest acid, eats armor.
const ACD_FLOW_CARRY = [0, 0.3, 0.7, 0.9] /* V and VI no hotter (owner, 2026-10-12: "flow V should not flow faster" - range instead, SKILL_MOVE; was 1.1, VI 1.5) */;
// THE POOLS SLOW, CONTAGION'S (tier redesign, owner 2026-10-24: Contagion I \"Ray leaves slowing pool\"): by Contagion tier 0..V (was Flow's ACD_FLOW_SLOW 0 .05 .11 .17, V .2)
const ACD_POOL_SLOW = [0, 0, 0, 0, 0, 0]; // NO SLOW (owner, 2026-10-29: "Increase ACD pools so that swarm gets caught, no slows (they are good vs fast)"; was 0 .05 .08 .11 .17 .2) - the mark target's ACD x fast
// CORROSION'S DAMAGE MOVED TO THE BASE (owner, 2026-10-12): a bare ACD burns ACD_BASE_DMG_MUL harder; Corrosion is
// now the armor STRIP alone (into negative armor then, a flat bonus on every tower's hits; since the 2026-10-28 rework it multiplies armor toward 0)
// (ACD_BASE_DMG_MUL, ACD_CORROSION_DMG and ACD_SPRAY_MUL - the raw acid - GONE with the tier redesign, 2026-10-24: the stat curve's)
const ACD_DOUBLE = [0.25, 0.195, 0.06, 0.06] /* x0.5 with ACD_BASE_DMG_MUL x0.6: a steeper ramp - better vs armor, worse vs swarm (2026-10-24 marks target) */, ACD_LINES = [2, 3, 6, 8], /* early-game balance 2026-10-06: two lines from the start (was 1/2/3/5); Spray to be re-fitted */ ACD_SPRAY_MUL = [1, 1, 1, 6.744]; /* V x9, VI x36 (steeper late tiers) */  // every jet a full strike (owner, 2026-10-08: never below 1) - Spray's reach (SKILL_MOVE) is the lever
// puddles by Seep tier (index 0 = the DEFAULT drip, owner): one every `every`
// s per line, lasting `life` s, radius r; each burns at ACD_PUDDLE_HEAT of its
// line's heat when it fell, by Seep tier
// index 0 = NO puddles (owner, 2026-10-07: "ACD shouldn't have puddles at level 0"; was a default drip { every: 1.4, life: 1.5, r: 20 })
// pools from the START, large and long (owner, 2026-10-12: "ACD should have pools ... large and last longer from the start";
// Contagion grows them, massive at VI); was null at 0, then life 4 .. 10, r 36 .. 85
// life x~1.8 (owner, 2026-10-12: "just make the pools last even longer with contagion"; was 6 7 8 10 12 14)
const ACD_CONTAGION = [{ every: 0.8, life: 5, r: 137.5 }, { every: 0.8, life: 5, r: 155 }, { every: 0.708, life: 5, r: 220 }, { every: 0.708, life: 5, r: 288.75 }]; /* r x2.5, dropped 1.5x as often (owner, 2026-10-29: "Increase ACD pools so that swarm gets caught"; countermx 9 pts 101-119: ACD -2 0 +1 +1 -> 0 -2 +1 +1, target +1 -3 +1 +1; was every 1.2 1.2 1.062 1.062, r 55 62 88 115.5) */ // BIGGER (x1.3) and LONGER (x1.5) pools that burn LESS (owner, 2026-10-08; were life 2.4 3.1 4.2 5 6.5, r 28 33 42 50 65) // drip 1.24 / 1.18s (owner, 2026-10-08: Contagion under 200% - was 1.2 .. 0.7; V at 643%); size and life keep climbing; // pools bigger (x1.25) and longer (x1.3) at every tier (owner, 2026-10-08); V the top regular tier (VI, the capstone, in aspira-capstone.js)
// a puddle ramps to the OLD x32 ceiling (owner, 2026-10-08: "increase the puddle damage to compensate" for the jets' cap halved to x16)
const ACD_PUDDLE_CAP = 8; // (2026-10-08: x8, was x32 - a pool held the jet's whole ramp)
const ACD_POOL_HEAT = 0.21; /* x2 with the bigger pools (2026-10-29; was 0.105) */ // a pool's burn, x its jet's heat - ONE number since the tier redesign (2026-10-24; was 0.1 0.11 0.741 6.408, V 34.17 - its tier I value) /* V x9, VI x36 (steeper late tiers) */ // 2026-10-12: base pools burn low (they are free now) // 2026-10-11: x1.5 so ACD answers a swarm a little (owner: "FRZ ACD handle swarms a bit better") // 10% of the jet with the bigger, longer pools (owner, 2026-10-08; was 30%): isolation I..V 108 117 133 160 197%, the curve it had (108 123 128 146 197) // flat 30% of the jet (2026-10-08, Contagion under 200%; no tier lowers it) // restored (overnight 2026-10-08): the tier fit cut it to ~15%, and without ARC the pools are the only swarm answer - FRZ+SOL+ACD went 0/6 -> 4/6 with them back
// (the pools' slow moved to Flow's jets, owner 2026-10-12: "these rays could slow instead of contagion" - and BACK to the pools, as
// Flow's slimy pools, owner 2026-10-22: "move slow from jets to pools")
// CONTAGION SPREADS (owner, 2026-10-13: "make acd contagion better vs swarms"): from Contagion I an enemy a POOL kills leaves
// a pool of its own, as hot - a crowd dying in acid carries it down the lane (a full pool since 2026-10-22; was 0.8x wide, half as long).
// At most ACD_SPREAD_MAX pools a tower (the late-game lag)
// (KILL POOLS - a kill under a jet or in a pool leaving a pool, ACD_SPREAD_MAX - GONE with the tier redesign, owner 2026-10-24: "get rid of kill pools")
function acdSkillStats(t, s, b) {
  const c = skillOf(t, "corrosion");
  curveBase(t, s, b); s.dmgCurve = s.dmg; s.rateCurve = s.rate; s.double = ACD_DOUBLE[0]; s.cap = ACD_BASE_MAX; s.plagueR = 0; // the STAT CURVE (tier redesign 2026-10-24)
  // every ACD hands 40% of a dead line's ramp on (early-game balance 2026-10-06;
  // fast waves reset it); from Corrosion I, Etch, ALL of it
  const f = skillOf(t, "spray"); // Flow (id kept: saves)
  s.carry = ACD_FLOW_CARRY[f]; s.burnSlow = ACD_POOL_SLOW[skillOf(t, "contagion")]; s.corrode = ACD_CORRODE[c]; s.targets = ACD_LINES[f]; s.contagion = ACD_CONTAGION[skillOf(t, "contagion")];
  s.contagionHeat = ACD_POOL_HEAT; s.skill = true;
}
// every step (stepAcd): each line drips a puddle every seep.every s; each
// puddle ticks its burn on whatever stands in it, st.rate times a second
function stepPuddles(t, st, dt) {
  const sp = st.contagion;
  const drop = l => (t.puddles ||= []).push({ x: l.e.x, y: l.e.y, r: sp.r, life: Math.min(POOL_MAX_S, sp.life), age: 0, tick: 0, dps: st.dmg * Math.min(ACD_PUDDLE_CAP, 2 ** (l.held / st.double)) * st.contagionHeat });
  for (const l of t.lines) {
    // a KILL under a jet drops a pool where it fell (owner, 2026-10-12) - with Contagion only (owner, 2026-10-22: "at level 0 make kills
    // not leave pools"); an escape drops none
    if (l.e.dead) continue;
    l.drip = (l.drip ?? sp.every) - dt;
    if (l.drip > 0) continue;
    l.drip += sp.every;
    drop(l);
  }
  if (!t.puddles) return;
  const every = 1 / st.rate;
  let grid = null; // grid: built at the first tick that needs it
  const hit = t.puddles.length > POOL_LOD ? POOL_QUIET : null; // a crowd of pools: no flash or number per hit
  for (const p of t.puddles) {
    p.age += dt; p.tick += dt;
    while (p.tick >= every) {
      p.tick -= every;
      for (const e of poolNear(grid ||= enemyGrid(), p)) {
        if (e.dead || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > p.r * p.r) continue;
        const hp0 = e.hp;
        fromHit(p, () => damage(e, p.dps * every, t, false, false, hit)); e.burnT = 0.4; // away from the pool's centre
        if (st.burnSlow && !e.dead) applySlow(e, st.burnSlow, 0.5, t.id); // Flow's SLIMY pools slow (owner, 2026-10-22: the jets' slow moved here)
        if (hit && hp0 > e.hp) (t.poolAcc ||= new Map()).set(e, (t.poolAcc.get(e) || 0) + hp0 - e.hp); /* the WHOLE hit, overkill too (owner, 2026-10-17) */ // a real hit: it pops one shield charge
      }
    }
  }
  t.puddles = t.puddles.filter(p => p.age < p.life);
  // the unseen hits SUMMED: one number an enemy every POOL_SUM_S (owner, 2026-10-12: "instead of hiding damage counts
  // entirely, just show the accumulated damage once per half second")
  t.poolSumT = (t.poolSumT ?? POOL_SUM_S) - dt;
  if (t.poolSumT > 0 || !t.poolAcc) return;
  t.poolSumT += POOL_SUM_S;
  for (const [e, d] of t.poolAcc) dmgSum(e, d, d, dmgInk("acd"), t);
  t.poolAcc.clear();
}
// LATE-GAME LAG (owner, 2026-10-12: "make late game acid pools less laggy"): a capstone Contagion keeps 300+ pools, each of
// which checked EVERY enemy at every tick - now the live enemies are bucketed once a step into POOL_CELL squares and a
// pool looks only in the squares it covers (the same hits, far fewer checks)
const POOL_CELL = 128;
// ...and past POOL_LOD pools their hits land with no flash and no number EACH (hundreds a second were most of the lag) -
// their damage summed into one number an enemy every POOL_SUM_S instead
const POOL_QUIET = { noFx: true }, POOL_SUM_S = 0.5;
function enemyGrid() {
  const g = new Map();
  for (const e of G.enemies) {
    if (e.dead || !e.seen) continue;
    const k = Math.floor(e.x / POOL_CELL) + "," + Math.floor(e.y / POOL_CELL);
    const b = g.get(k); if (b) b.push(e); else g.set(k, [e]);
  }
  return g;
}
function poolNear(g, p) {
  const out = [], x0 = Math.floor((p.x - p.r) / POOL_CELL), x1 = Math.floor((p.x + p.r) / POOL_CELL), y0 = Math.floor((p.y - p.r) / POOL_CELL), y1 = Math.floor((p.y + p.r) / POOL_CELL);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const b = g.get(x + "," + y); if (b) out.push(...b); }
  return out;
}
// UI (drawAcd): a puddle is a cluster of BUBBLES (owner): PUDDLE_BUBBLES at
// once, each at a jittered spot within it, growing to its own jittered max
// size over BUBBLE_T real seconds, then POPPING (a brief widening ring) and
// starting again elsewhere; the whole cluster fades as the puddle dries
const PUDDLE_BUBBLES = 5, BUBBLE_T = 0.6, BUBBLE_POP = 0.15;
// a puddle's bubbles are as INTENSE as its damage (owner, 2026-10-07): brighter and
// bolder the more it burns, 0.6x for a faint puddle up to 1.8x for a deadly one
const puddleGlow = p => Math.max(0.6, Math.min(1.8, 0.6 + 0.3 * Math.log2(1 + (p.dps || 0) / 60)));
// ...and DRAWN within a budget: past POOL_LOD pools a pool is a plain circle (no wobbling rim, no sheen) and the bubbles
// are shared out so all of them together stay near POOL_LOD x PUDDLE_BUBBLES
const POOL_LOD = 24;
function drawPools(t, now) {
  // (always the plain circle: the board is drawn into a texture and warped - the old wobbling 2D rim is gone, 2026-10-18) // 3D: always the plain circle - the board is drawn into a texture and warped, the rim's wobble barely shows and its fills cost (owner, 2026-10-12: pool perf in 3D)
  // a PILE of pools reads as one (owner, 2026-10-14: "late game ACD has too much effects visually" - a Contagion's 100+
  // see-through pools stacked 20 deep into one bright green wash): each is drawn at 1 / the pools over its centre
  const pools = t.puddles || [], deep = poolDepth(pools);
  pools.forEach((p, i) => {
    const crowd = 1 / deep[i], fade = Math.min(1, (1 - p.age / p.life) * puddleGlow(p)) * crowd, seed = p.seed ||= 1 + Math.floor(Math.random() * 1e6);
    // a pool a KILL left (Contagion's spread) is a DASHED ring, no body; the jets' own drips filled: the two read apart (owner, 2026-10-14)
    { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.9 * (0.8 + 0.2 * (1 - p.age / p.life)), 0, 6.283); if (!p.spread) { ctx.globalAlpha = 0.14 * fade; ctx.fill(); } ctx.setLineDash(p.spread ? POOL_DASH : []); ctx.globalAlpha = (p.spread ? 0.7 : 0.4) * fade / Math.sqrt(crowd); ctx.stroke(); return; } // (a crowd's rims fade only by the root of it: the rims tell one pool from the next)
  });
  ctx.setLineDash([]);
}
const POOL_DASH = [18, 12]; // board units: big enough to read as dashes once the 3D view shrinks a pool
// how many pools cover each pool's centre (itself included), the crowd bucketed by POOL_CELL like the enemies
function poolDepth(pools) {
  if (pools.length <= 1) return pools.map(() => 1);
  const g = new Map(), key = (x, y) => x + "," + y;
  for (const q of pools) { const k = key(Math.floor(q.x / POOL_CELL), Math.floor(q.y / POOL_CELL)); const b = g.get(k); if (b) b.push(q); else g.set(k, [q]); }
  const reach = Math.ceil(Math.max(...pools.map(q => q.r)) / POOL_CELL);
  return pools.map(p => {
    const cx = Math.floor(p.x / POOL_CELL), cy = Math.floor(p.y / POOL_CELL); let n = 0;
    for (let x = cx - reach; x <= cx + reach; x++) for (let y = cy - reach; y <= cy + reach; y++) for (const q of g.get(key(x, y)) || []) if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 < (q.r * 0.9) ** 2) n++;
    return Math.max(1, n);
  });
}
function drawPuddles(t) {
  const now = performance.now() / 1000;
  ctx.strokeStyle = ctx.fillStyle = COL.tacd; ctx.lineWidth = 1.2;
  drawPools(t, now);
  const n = (t.puddles || []).length, per = Math.min(2, n > POOL_LOD ? POOL_LOD * PUDDLE_BUBBLES / n : PUDDLE_BUBBLES); // bubbles a pool, on average (3D: 2 at most)
  (t.puddles || []).forEach((p, j) => {
    const I = puddleGlow(p), fade = Math.min(1, (1 - p.age / p.life) * I), seed = p.seed ||= 1 + Math.floor(Math.random() * 1e6);
    ctx.lineWidth = 1.2 * I;
    const nb = Math.floor(per * (j + 1)) - Math.floor(per * j); // spread evenly: some pools get one, some none
    for (let i = 0; i < nb; i++) {
      const ph = now / BUBBLE_T + i / PUDDLE_BUBBLES + (seed % 97) / 97, cyc = Math.floor(ph), f = ph - cyc;
      const h = k => fixedRand(cyc * 13 + i * 3 + k, seed); // this bubble's own jitter, fixed for its life
      const a = h(0) * 6.283, d = Math.sqrt(h(1)) * p.r * 0.8, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      const max = p.r * (0.2 + 0.25 * h(2));
      ctx.beginPath();
      if (f < 1 - BUBBLE_POP) {
        ctx.arc(x, y, max * f / (1 - BUBBLE_POP), 0, 6.283);
        ctx.globalAlpha = Math.min(1, 0.3 * fade); ctx.fill();
        ctx.globalAlpha = Math.min(1, 0.9 * fade); ctx.stroke();
      } else {
        const q = (f - 1 + BUBBLE_POP) / BUBBLE_POP; // the pop: a ring widening and gone
        ctx.arc(x, y, max * (1 + 0.5 * q), 0, 6.283);
        ctx.globalAlpha = 0.6 * (1 - q) * fade; ctx.stroke();
      }
    }
  });
  ctx.globalAlpha = 1;
}
