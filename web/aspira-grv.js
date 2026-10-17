// /spire - GRV, the GRAVITY tower (owner's design, 2026-10-15; spec ARCHITECTURE.md 4.6b): strong against swarm + armor,
// weak to fast + shield, mid reach. A NOVA comes into being on its target (no projectile): a yellow front sweeps out and hits
// what it reaches, and leaves a black SPHERE whose purple AURA is blown out at the same speed. The sphere's MASS drives it all
// - its size, the aura's radius, slow and damage, its pellet rate (x GRV_MASS_MAX at most): it GAINS mass from the damage it
// deals and LOSES a linear share of its starting mass a second. The aura burns, slows (never the shielded) and strips
// POSITIVE armor like Corrosion; every sphere RADIATES pellets, more the bigger it is. Loaded after aspira-frz.js (the
// simulator too); towerStats calls grvSkillStats, the tower loop stepGrv, fire() novaAt, drawScene drawGrv.

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const GRV_AURA_R = [68, 78, 88, 99, 109, 122]; // Void: the aura's radius at starting mass (x1.7, owner 2026-10-15: "use bigger nova and aura" once pellets could miss; was 40 .. 72)
const GRV_SLOW = [0.12, 0.15, 0.18, 0.21, 0.24, 0.27]; // Void: the aura's slow at starting mass (x mass, to GRV_SLOW_MAX)
const GRV_NOVA_R = [71, 85, 99, 112, 126, 139]; // Supernova: the nova's reach (x1.7 with the aura; was 42 .. 82)
const GRV_NOVA_MUL = [1, 1.3, 1.6, 2, 2.4, 2.8]; // Supernova: the nova's hit, x the tower's damage
const GRV_PELLETS = [6, 7.8, 9.6, 11.4, 13.2, 15]; // Radiation: pellets a second at starting mass (x mass) - x3 (owner, 2026-10-15: "3x as many pellets to start"; they can miss now; was 2 .. 5)
const GRV_PELLET_K = [0.25, 0.32, 0.4, 0.48, 0.56, 0.65]; // Radiation: a pellet's hit, x the tower's damage
let GRV_AURA_K = 0.6; // the aura's armor STRIP a second (x GRV_STRIP, x mass), in tower damage - it deals no damage since 2026-10-15 (let: the simulator sweeps it)
const GRV_LIFE = 5; // s: an unfed BASE sphere's life (one bare hit's aura, starting mass 1)
// EVAPORATION by the CIRCUMFERENCE (owner, 2026-10-16: "bh should evaporate faster the bigger it is, so, update bh size reduction
// and evaporation rate based on circle curcumference"): a sphere's AREA is its mass (aura radius = root of mass x its area-per-mass,
// set as its aura opens), and it loses mass at GRV_EVAP x its radius in base auras a second - so it SHRINKS all its life, and a big
// one (a fat nova, a merge) burns out faster. dm/dt = -E root(m) gives the base sphere 2 / E s: GRV_LIFE (was: a linear 1 / GRV_LIFE
// of the starting mass a second, whatever its size, and a shrink only in its last 0.8 s)
const GRV_R_MAX = 3; // a hole's radius at most, in base auras (its MASS may go on: radiation, strip and slow scale by it)
const GRV_EVAP = 2 / GRV_LIFE, GRV_RAD_LIFE = 1.6; /* x0.32 of the linear sphere's pace (countermx 61-69 spread: 5 0/0/0/0, 2 1/10/7/2, 1.25 2/19/8/20; 4.6.15 was 2/27/13/7) */ // RAD_LIFE: the pellets a unit of mass gives off stay the linear 5 s sphere's (radiation is not the life)
const GRV_MASS_MAX = 3, GRV_GAIN = 0.12; // mass gained per one tower-hit of damage dealt (nova, aura, pellets)
const GRV_STRIP = 2.5 /* (was 1.5) swap test 2026-10-16: ARC+FRZ+GRV bled 106 lives to armor, GRV its only armor answer */, GRV_STRIP_IN = 1.5, GRV_STRIP_OUT = 0.5; // (x3, 2026-10-15: GRV leaked 16% of armor, its own type) armor stripped, x the aura's damage dealt - POSITIVE armor only (it stops at zero)
// the slow in TWO RINGS (owner, 2026-10-15: "two tiers, much bigger slow close to the center"): the CORE (inner GRV_CORE_FRAC of
// the radius - the hot bands) slows GRV_CORE_MUL x the outer ring; each capped
const GRV_SLOW_MAX = 0.45, GRV_CORE_FRAC = 0.47, GRV_CORE_MUL = 2.5, GRV_CORE_MAX = 0.8, GRV_HORIZON_SLOW = 0.9; // Void VI (Event Horizon): a full-grown core
// the aura's SIZE comes from the NOVA's damage (owner, 2026-10-15: "make the max aura size depend on supernova damage"): x the
// square root of what the nova really dealt, in tower hits (one enemy taking a bare nova = x1), between these (a nova the
// shields swallowed leaves a small aura)
const GRV_GROW_MIN = 1, GRV_GROW_MAX = 2.5; /* MIN 0.5 -> 1 (owner, 2026-10-16: "GRV should have a min default size, so even if nothing is caught by the nova, it should still have some mass"): an empty nova leaves the hole one bare hit would */
const GRV_HYPER_STRIP = 0.5, GRV_HYPER_MASS = 2; // Supernova VI (Hypernova): the nova takes half the positive armor; spheres start heavier
const GRV_HAWKING_N = 12; // Radiation VI (Hawking): a spent sphere's last burst of pellets
const GRV_TICK = 0.25, GRV_FRONT_T = 0.2; // the nova's collapse, s (0.12 outward, then inward: a touch longer to read)
const GRV_NOVA_END = GRV_FRONT_T; // the nova GONE (collapsed into its centre) - only then the centre and aura (owner: "finish exploding before growing the circle")
// the nova's front: from its reach INWARD, ACCELERATING (owner, 2026-10-15: "explode inwards instead of outwards, accelerating")
const grvNovaR = (sp, st) => st.novaR * (1 - Math.min(1, sp.age / GRV_FRONT_T) ** 2); // s: the aura's tick; the yellow front's time to its reach
const GRV_PELLET_REACH = 1.4, GRV_PELLET_V = 320, GRV_PELLET_HIT = 3; // a pellet flies this x the aura's radius, at V a second; touches an enemy within its size + HIT
const GRV_PEL_ST = { noNum: true }; // a pellet hit: its flash, but its number goes to grvFloat (into the hole)
const GRV_AURA_ST = { noFx: true }; // a nova hit: no flash, no number (its numbers drift INWARD - grvFloat)

SKILL_TREES.grv = [
  { id: "void", name: "Void", tiers: [{ name: "Well" }, { name: "Sink" }, { name: "Abyss" }, { name: "Maw" }, { name: "Void" }] },
  { id: "supernova", name: "Supernova", tiers: [{ name: "Flare" }, { name: "Burst" }, { name: "Nova" }, { name: "Blaze" }, { name: "Supernova" }] },
  { id: "radiation", name: "Radiation", tiers: [{ name: "Glow" }, { name: "Ember" }, { name: "Spray" }, { name: "Storm" }, { name: "Radiance" }] },
];
SKILL_MOVE.grv = { void: [[1, 1], [1.02, 1], [1.04, 1], [1.06, 1], [1.08, 1], [1.1, 1]], supernova: [[1, 1], [1.04, 1], [1.08, 1], [1.12, 1], [1.16, 1], [1.2, 1]], radiation: [[1, 1], [1, 1.2], [1, 1.4], [1, 1.6], [1, 1.8], [1, 2]] };

function grvSkillStats(t, s, b) {
  const v = skillOf(t, "void"), n = skillOf(t, "supernova"), r = skillOf(t, "radiation");
  s.dmg = b.dmg; s.range = b.range * RANGE_BONUS; s.rate = b.rate; s.targets = 1;
  s.auraR = GRV_AURA_R[v]; s.slow = GRV_SLOW[v]; s.horizon = v >= CAPSTONE_TIER;
  s.novaR = GRV_NOVA_R[n]; s.novaMul = GRV_NOVA_MUL[n]; s.hyper = n >= CAPSTONE_TIER;
  s.pellets = GRV_PELLETS[r]; s.pelletK = GRV_PELLET_K[r]; s.hawking = r >= CAPSTONE_TIER; s.skill = true;
}

// a sphere's scale from its mass: the aura's RADIUS grows as its square root (its area as the mass), the rest as the mass
const grvMassK = sp => Math.max(0, Math.min(sp.cap || GRV_MASS_MAX, sp.mass));
const grvAuraBase = (sp, st) => st.auraR * Math.min(GRV_GROW_MAX, Math.max(GRV_GROW_MIN, Math.sqrt((sp.novaDealt || 0) / Math.max(1e-6, st.dmg))));
function grvAuraR(sp, st) {
  if (!sp.apm) return grvAuraBase(sp, st); // (the nova still sweeping: its size is still being decided)
  const r = Math.min(st.auraR * GRV_R_MAX, Math.sqrt(sp.apm * Math.max(0, sp.mass))); // capped (owner, 2026-10-16: "Perf issues as inversion circle gets very large / Limit size?" - merged areas added without end)
  return sp.mergeAt != null && sp.age - sp.mergeAt < GRV_MERGE_S ? sp.mergeFrom + (r - sp.mergeFrom) * (sp.age - sp.mergeAt) / GRV_MERGE_S : r; // a MERGE eases out to its summed area
}
// the aura's reach right now: nothing until the nova has FULLY exploded (owner, 2026-10-15: "make the nova fully explode before
// the aura and center"), then blown out from the centre at the nova front's speed until its size
const grvAuraNow = (sp, st) => Math.min(grvAuraR(sp, st), st.novaR / GRV_FRONT_T * Math.max(0, sp.age - GRV_NOVA_END));
// (the LOOK shrank to nothing over its last 0.8 s here - owner, 2026-10-16: "black holes centers + aura from grv should
// shrink to 0 size to disappear"; they popped out at full size) - drawn only: the slow keeps its reach to the end
// shrink to 0 size to disappear" - until its size became its mass, above, and it shrinks all its life)

// fire(): a nova on the target - the sphere is born where it stands
// LEADS its target (owner, 2026-10-16: "grv should shoot slightly ahead of the enemy to account for explosion time"): the nova
// lands where the enemy will be GRV_LEAD_S on along its lane at its pace now (slows and stuns counted) - past the collapse and the
// aura's opening, so it WALKS INTO the hole (owner, 2026-10-16: "grv should be shooting slightly ahead of enemies": the collapse's
// 0.2 s alone put it ~25u ahead, on the enemy to the eye); still well inside the nova's reach (71u+)
const GRV_LEAD_S = 0.5;
function novaAt(t, st, e) {
  const p0 = pathAt(e.pi, e.s, e.ang || 0), p1 = pathAt(e.pi, e.s + effSpeed(e) * GRV_LEAD_S, e.ang || 0);
  (t.spheres ||= []).push({ id: G.id++, x: e.x + p1.x - p0.x, y: e.y + p1.y - p0.y, vx: 0, vy: 0, ar: 0, age: 0, mass: st.hyper ? GRV_HYPER_MASS : 1, hit: new Set(), tick: 0, pel: 0 });
  return true;
}
// one hit from a sphere: the damage it really dealt feeds its mass
function grvHit(sp, t, st, e, amt, opt) {
  const hp0 = e.hp;
  damage(e, amt, t, false, false, opt);
  const dealt = Math.max(0, hp0 - Math.max(0, e.hp));
  if (dealt > 0) sp.mass = Math.min(sp.cap || GRV_MASS_MAX, sp.mass + GRV_GAIN * dealt / Math.max(1e-6, st.dmg));
  return dealt;
}
function stepGrv(t, dt) {
  const st = towerStats(t);
  stepPellets(t, st, dt);
  if (!t.spheres || !t.spheres.length) return;
  for (const sp of t.spheres) stepSphere(sp, t, st, dt);
  grvPull(t, st, dt);
  t.spheres = t.spheres.filter(sp => sp.mass > 0 && !sp.merged);
}
// BLACK HOLES PULL AND MERGE (owner, 2026-10-16: "black holes should have a slow acceleration towards other nearby ones / when they
// overlap enough, merge them into a bigger one with higher radiation (calculate bh size as the additive component of currently
// linearly reducing parts)"): any two open spheres (any GRV's) within GRV_PULL_K x their summed auras accelerate toward each
// other - each by the OTHER's mass over the distance squared, so a light one falls into a heavy one; once their black centres touch (grvCoreR) the bigger takes the other in - every
// part that ADDS: mass, its cap, its linear loss a second (so it still dies when its parts would have, together), the nova damage
// behind it, and the aura's AREA (radius = root of the summed squares). Its mass - its radiation, strip and slow - can pass
// GRV_MASS_MAX: the cap is the parts' summed
const GRV_PULL_A = 45, GRV_PULL_D = 60, GRV_PULL_V = 110, GRV_PULL_K = 1.6, GRV_MERGE_S = 0.35; // u/s2 a unit of the other's mass at GRV_PULL_D u or closer (1 / d2 past it); u/s at most; reach; s to ease out
let grvAll = [];
function grvPull(t, st, dt) {
  grvAll = [];
  for (const o of G.towers) if (o.kind === "grv" && o.spheres) for (const sp of o.spheres) if (!sp.merged && sp.mass > 0 && sp.open) grvAll.push(sp);
  for (const a of t.spheres) {
    if (a.merged || a.mass <= 0 || !a.open) continue;
    for (const b of grvAll) {
      if (b === a || b.merged) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, reach = a.ar + b.ar;
      if (d > reach * GRV_PULL_K) continue;
      /* merged once their black CENTRES touch (owner, 2026-10-16: "require black hole spheres to actually touch before merging"; was 0.45 x the summed auras) */
      if (d <= grvCoreR(a.ar) + grvCoreR(b.ar)) { grvMerge(a.ar >= b.ar ? a : b, a.ar >= b.ar ? b : a); if (a.merged) break; continue; }
      const f = GRV_PULL_A * dt * Math.max(0, b.mass) * (GRV_PULL_D / Math.max(d, GRV_PULL_D)) ** 2; // a's pull toward b: b's MASS over the distance squared (owner, 2026-10-16: "bh acceleration should be dependent on mass"; was a fixed 45 shared by mass)
      a.vx = (a.vx || 0) + dx / d * f; a.vy = (a.vy || 0) + dy / d * f;
    }
    const v = Math.hypot(a.vx || 0, a.vy || 0);
    if (v > GRV_PULL_V) { a.vx *= GRV_PULL_V / v; a.vy *= GRV_PULL_V / v; }
    a.x += (a.vx || 0) * dt; a.y += (a.vy || 0) * dt;
  }
}
function grvMerge(big, small) {
  const m = big.mass + small.mass, w = small.mass / Math.max(1e-6, m);
  big.x += (small.x - big.x) * w; big.y += (small.y - big.y) * w; // to the pair's centre of mass, momentum kept
  big.vx = (big.vx || 0) * (1 - w) + (small.vx || 0) * w; big.vy = (big.vy || 0) * (1 - w) + (small.vy || 0) * w;
  const area = big.apm * big.mass + small.apm * small.mass; // the AREAS add (each is its area-per-mass x its mass)
  big.mergeFrom = big.ar; big.mergeAt = big.age;
  big.mass = m; big.apm = area / Math.max(1e-6, m); big.cap = (big.cap || GRV_MASS_MAX) + (small.cap || GRV_MASS_MAX);
  big.novaDealt = (big.novaDealt || 0) + (small.novaDealt || 0);
  small.merged = true; small.mass = 0;
  if (typeof sfx === "function") sfx("grvaura");
}
function stepSphere(sp, t, st, dt) {
  if (sp.merged) return; // taken in by a bigger one (grvPull): no Hawking burst, nothing
  sp.age += dt;
  if (!sp.auraSnd && sp.age >= GRV_NOVA_END) { sp.auraSnd = true; sfx("grvaura"); sp.apm = grvAuraBase(sp, st) ** 2 / Math.max(1e-6, sp.mass); } // its AREA per mass, fixed as it opens // the AURA's own sound as it opens (owner, 2026-10-16; the nova is "grv")
  // the NOVA: the yellow front sweeps out; each enemy it reaches takes the hit once
  if (sp.age <= GRV_FRONT_T + dt) {
    const r = grvNovaR(sp, st); // it IMPLODES: an enemy is hit as the front sweeps past it, inward (all within reach by the end)
    for (const e of G.enemies) {
      const d2 = (e.x - sp.x) ** 2 + (e.y - sp.y) ** 2;
      if (e.dead || sp.hit.has(e.id) || d2 > st.novaR * st.novaR || d2 < r * r) continue;
      sp.hit.add(e.id);
      if (st.hyper && e.armor > 0) e.armor -= e.armor * GRV_HYPER_STRIP; // Hypernova: half the real armor, at once
      const amt = st.dmg * st.novaMul, dealt = grvHit(sp, t, st, e, amt, GRV_AURA_ST); // (no number of its own: it flies into the centre)
      sp.novaDealt = (sp.novaDealt || 0) + (e.dead ? amt : dealt); // (sets the aura's size: a KILL counts the whole hit - overkill on a
      // weak enemy is not a weak nova; a hit a shield swallowed counts nothing)
      if (dealt > 0) grvFloat(sp, e, dealt); // the nova's numbers fly INTO the centre (owner, 2026-10-15)
    }
  }
  const k = grvMassK(sp), ar = grvAuraNow(sp, st);
  sp.ar = ar; sp.open ||= ar >= grvAuraR(sp, st) - 0.5; // (grvPull reads them: only a fully OPENED aura pulls or merges)
  // the AURA: NO damage (owner, 2026-10-15: "make the aura not do damage") - it strips positive armor and slows the unshielded,
  // in two rings: the core far harder
  sp.tick += dt;
  while (sp.tick >= GRV_TICK) {
    sp.tick -= GRV_TICK;
    const outer = Math.min(GRV_SLOW_MAX, st.slow * k), core = st.horizon && k >= GRV_MASS_MAX ? GRV_HORIZON_SLOW : Math.min(GRV_CORE_MAX, outer * GRV_CORE_MUL);
    for (const e of G.enemies) {
      const d2 = (e.x - sp.x) ** 2 + (e.y - sp.y) ** 2;
      if (e.dead || d2 > ar * ar) continue;
      if (e.armor > 0) e.armor -= Math.min(e.armor, st.dmg * GRV_AURA_K * k * GRV_TICK * GRV_STRIP * (GRV_STRIP_IN - (GRV_STRIP_IN - GRV_STRIP_OUT) * Math.sqrt(d2) / Math.max(1, ar))); // MORE the closer (owner, 2026-10-16: "The aura strip armor and slows more the closer they are"): x1.5 at the centre to x0.5 at the edge
      const slow = d2 <= (ar * GRV_CORE_FRAC) ** 2 ? core : outer;
      // the shielded are never slowed (applySlow refuses them); a fast enemy NOT doubled like other slows - GRV is weak to fast
      applySlow(e, e.type === "fast" ? slow / FAST_SLOW_MUL : slow, GRV_TICK * 1.5, "grv:" + t.id);
    }
  }
  // EVAPORATION, by its circumference - and RADIATION paced by it (owner, 2026-10-16: "make sure the pellet output is the same, just
  // faster"): the old pellet rate x mass, x how much faster than the old linear life (1 / GRV_RAD_LIFE a second) it loses mass - a
  // sphere gives off what the linear one did over its life, a big one sooner (radiating only what it lost - pellets x 2.5 a unit
  // of mass - starved a FED sphere, which the old one kept near its cap: countermx 61-69 2/27/13/7 -> 48/89/87/76)
  const lost = Math.min(sp.mass, GRV_EVAP * grvAuraR(sp, st) / st.auraR * dt);
  sp.mass -= lost;
  sp.pel += st.pellets * k * GRV_RAD_LIFE * lost; // the OLD rate (x mass) sped up by how much faster than the old linear 1 / 5 s it loses mass
  const w = Math.max(1, ((t.pellets ? t.pellets.length : 0) / GRV_PEL_SOFT) ** 2); // BUNDLED past GRV_PEL_SOFT in flight (perf): one pellet carrying w pellets' hit, w times fewer
  while (sp.pel >= w) { sp.pel -= w; grvPellet(sp, t, st, grvAuraR(sp, st) * GRV_PELLET_REACH, w); }
  // Hawking: a last burst as it goes
  if (sp.mass <= 0 && st.hawking) for (let i = 0; i < GRV_HAWKING_N; i++) grvPellet(sp, t, st, st.auraR * GRV_PELLET_REACH * 1.5);
}
// a PELLET is a projectile (owner, 2026-10-15: "I want pellets to be able to miss, not beams"): out from the sphere in a random
// direction at GRV_PELLET_V, hitting the FIRST enemy it touches - or nothing, fading at `reach`
// past GRV_PEL_SOFT of a tower's in flight, pellets are BUNDLED (perf, 2026-10-16: two Radiation V GRVs at wave 95 had 2851 in the air,
// 10 ms a frame to draw): each new one carries w pellets' hit and w times fewer are sent - every pellet hits or misses on its own
// flight, so the damage EXPECTED is the same, only lumpier
const GRV_PEL_SOFT = 80; // w = (in flight / this) squared past it: ~200 a tower at most (linear, 150: still ~500)
function grvPellet(sp, t, st, reach, w = 1) {
  const a = Math.random() * 6.283;
  (t.pellets ||= []).push({ sp, x: sp.x, y: sp.y, vx: Math.cos(a) * GRV_PELLET_V, vy: Math.sin(a) * GRV_PELLET_V, left: reach / GRV_PELLET_V, dmg: st.dmg * st.pelletK * w });
}
// the PROJECTILE GRID (perf, owner 2026-10-16: "do some perf work on the new towers" - at wave 89 three GRVs' ~360 pellets each tested
// every enemy, every step: 3.2 ms a frame): each living enemy listed in every GRID_S cell its body (+ GRID_PAD) touches, built
// once a step (G.clock) and shared - a projectile tests only its own cell's, in G.enemies order, so the FIRST it touches is the same
const GRID_S = 64, GRID_PAD = 4, GRID_NONE = [], GRID_OFF = 8, GRID_N = 32;
let egrid = null, egridAt = NaN;
/* perf (2026-10-16): the cells of the play field (and a margin round it) are a flat array of reused lists, not Map lookups; only a body or a projectile far outside the margin falls back to the Map */
function projGrid() { // (NOT enemyGrid: aspira-acid.js's pools have their own by that name, and a second global of it replaced theirs - its numeric keys left every pool and drip hitting NOTHING from 5.1.7; found 2026-10-16)
  if (egrid && egrid.G === G && egridAt === G.clock) return egrid;
  if (!egrid) egrid = { G: null, a: new Array(GRID_N * GRID_N).fill(null), used: [], m: new Map() };
  for (const i of egrid.used) egrid.a[i].length = 0;
  egrid.used.length = 0; egrid.m.clear(); egrid.G = G; egridAt = G.clock; // (no clock: NaN, never equal - rebuilt every call)
  const A = egrid.a, used = egrid.used, M = egrid.m;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const r = ENEMIES[e.type].size * (e.sizeMul || 1) + GRID_PAD;
    for (let x = Math.floor((e.x - r) / GRID_S), x1 = Math.floor((e.x + r) / GRID_S); x <= x1; x++)
      for (let y = Math.floor((e.y - r) / GRID_S), y1 = Math.floor((e.y + r) / GRID_S); y <= y1; y++) {
        const ix = x + GRID_OFF, iy = y + GRID_OFF;
        if (ix >= 0 && ix < GRID_N && iy >= 0 && iy < GRID_N) {
          const k = ix * GRID_N + iy; let c = A[k];
          if (!c) c = A[k] = [];
          if (!c.length) used.push(k);
          c.push(e);
        } else {
          const k = x * 65536 + y, c = M.get(k);
          if (c) c.push(e); else M.set(k, [e]);
        }
      }
  }
  return egrid;
}
const enemiesNear = (x, y, g = projGrid()) => {
  const cx = Math.floor(x / GRID_S), cy = Math.floor(y / GRID_S), ix = cx + GRID_OFF, iy = cy + GRID_OFF;
  if (ix >= 0 && ix < GRID_N && iy >= 0 && iy < GRID_N) { const c = g.a[ix * GRID_N + iy]; return c && c.length ? c : GRID_NONE; }
  return g.m.get(cx * 65536 + cy) || GRID_NONE;
};
function stepPellets(t, st, dt) {
  if (!t.pellets || !t.pellets.length) return;
  const g = projGrid();
  for (const p of t.pellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt;
    for (const e of enemiesNear(p.x, p.y, g)) {
      if (e.dead) continue; // (a pellet POPS shield charges - owner, 2026-10-15; only the aura's slow skips the shielded)
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + GRV_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      const h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT; // the number on the pellet's way (HIT_AT, aspira-floats.js)
      const hp0 = e.hp;
      try { if (p.sp.mass > 0) grvHit(p.sp, t, st, e, p.dmg, GRV_PEL_ST); else damage(e, p.dmg, t, false, false, GRV_PEL_ST); } finally { hitFrom = h0; } // (its sphere gone: no mass to feed)
      if (e.hp < hp0) grvFloat(p.sp, e, hp0 - Math.max(0, e.hp)); // its number flies INTO its hole, like the nova's (owner, 2026-10-16: "all damage numbers from bh should fly into the bh")
      p.left = 0; break;
    }
  }
  keepLive(t.pellets);
}

// ---------- the PELLETS, drawn: a short coral streak along each one's flight ----------
const GRV_PELLET_TAIL = 0.03, GRV_PELLET_PX = 2.2; // s of flight the streak spans; its width
function drawGrvPellets() {
  ctx.strokeStyle = COL.violet; ctx.lineCap = "round"; ctx.lineWidth = GRV_PELLET_PX; /* GRV purple (owner, 2026-10-15) */ ctx.globalAlpha = 1;
  ctx.beginPath(); // ONE path, one stroke for them all (perf: a stroke each was most of drawGrv's 4 ms a frame at wave 89)
  for (const t of G.towers) for (const p of t.pellets || []) { ctx.moveTo(p.x - p.vx * GRV_PELLET_TAIL, p.y - p.vy * GRV_PELLET_TAIL); ctx.lineTo(p.x, p.y); }
  ctx.stroke();
}

// ---------- the nova's damage numbers fly INWARD, toward the sphere (owner) ----------
// the aura's BANDS, the sphere outward, in the black-hole image's colours and shares (owner, 2026-10-15): white-hot 2, yellow 6,
// coral 13, pink 13, plum 18, deep purple 17 - each stop where its band starts, clear inside the first and past the last
const GRV_BANDS = [[0.15, "bhwhite"], [0.19, "yellow"], [0.3, "bhcoral"], [0.47, "bhpink"], [0.66, "bhplum"], [0.86, "bhdeep"]];
// the NOVA: a thick ring (GRV_NOVA_W of its reach), GRV purple turning white as it collapses (owner, 2026-10-15; it was a red /
// orange / yellow ring going OUT for an hour)
const GRV_NOVA_A = 0.9, GRV_NOVA_W = 0.08, GRV_NOVA_WHITE = 0.2; // a THIN line, only 20% of the way to white (owner, 2026-10-15; was 0.45 thick, all the way)
// a colour between two "rgb(r, g, b)" palette strings, f 0..1
function mixRgb(a, b, f) {
  const p = s => (String(s).match(/\d+(\.\d+)?/g) || [0, 0, 0]).map(Number), A = p(a), B = p(b);
  return "rgb(" + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * f)).join(", ") + ")";
}
const GRV_RING_S = 1.2; // s between the aura's range rings (drawSphere)
const GRV_FLOAT_S = 0.6, GRV_FLOAT_MAX = 60, GRV_FLOAT_PX = 11, GRV_AURA_A = 0.3; // GRV_AURA_A: the band's peak, mid-radius (owner: "clear, 30%, clear")
let grvFloats = [];
function grvFloat(sp, e, amt) {
  if (typeof INSTANT_COINS !== "undefined" && INSTANT_COINS) return; // (the simulator draws nothing)
  if (grvFloats.length >= GRV_FLOAT_MAX) grvFloats.shift();
  grvFloats.push({ x: e.x, y: e.y, sp, t: 0, text: String(dmgUnits(amt)) });
}

// ---------- the look: yellow front, the aura's gradient band, the black sphere, the inward numbers ----------
function drawGrv() {
  const now = performance.now() / 1000;
  for (const t of G.towers) {
    if (t.kind !== "grv" || !t.spheres) continue;
    const st = towerStats(t, true);
    for (const sp of t.spheres) drawSphere(sp, st);
  }
  if (!(typeof q3d === "function" && q3d())) drawGrvCores((x, y, fn) => fn()); // the centres, over every aura (3D: over the damage numbers instead - drawGrvCores, aspira-warp.js)
  drawGrvFloats(now);
  ctx.globalAlpha = 1;
}
function drawSphere(sp, st) {
  const k = grvMassK(sp), ar = grvAuraNow(sp, st);
  if (ar > 1) { // the aura: clear at the sphere, 30% at mid-radius, clear at the edge
    const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, ar);
    g.addColorStop(0, "transparent"); for (const [f, k] of GRV_BANDS) g.addColorStop(f, COL[k]); g.addColorStop(1, "transparent");
    ctx.globalAlpha = GRV_AURA_A; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp.x, sp.y, ar, 0, 6.283); ctx.fill();
    // its REACH, shown like Permafrost's rings (owner, 2026-10-16: "for bh aura, show range of aura using a range indicator similar to
    // permafrost"): a thin glowing ring out from the centre to the edge every GRV_RING_S, fading as it goes
    const f = (sp.age % GRV_RING_S) / GRV_RING_S;
    ctx.strokeStyle = COL.violet; ctx.lineWidth = 1.5; ctx.shadowColor = COL.violet; ctx.shadowBlur = 12 * cam.k;
    ctx.globalAlpha = 0.45 * (1 - f * 0.6); ctx.beginPath(); ctx.arc(sp.x, sp.y, ar * f, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0;
  }
  if (sp.age < GRV_NOVA_END) { // the NOVA: a thick ring collapsing INWARD, accelerating, GRV purple slowly turning white (owner)
    const p = Math.min(1, sp.age / GRV_FRONT_T), r = grvNovaR(sp, st), w = Math.min(r, st.novaR * GRV_NOVA_W);
    if (r > 0.5) {
      ctx.globalAlpha = GRV_NOVA_A; ctx.strokeStyle = mixRgb(COL.violet, COL.bhwhite, GRV_NOVA_WHITE * p ** 2); ctx.lineWidth = w; // (a solid stroke: the 3D board takes no gradient stroke)
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r - w / 2, 0, 6.283); ctx.stroke();
    }
  }


}
// the CENTRE and its ACCRETION DISK - black in a yellow ring and a thin pink rim (the image's core), as big as its aura is (it
// grows and shrinks with it). ABOVE the damage numbers (owner, 2026-10-15): in 2D the board draws them first; in 3D the pop-up
// pass calls drawGrvCores after them, `at` placing each at its spot like a number
const GRV_CORE_PX = 11.7, GRV_CORE_A = 34; // a base aura (68u) keeps its 13u centre; x2 the aura 19u (linear: 24), x4 26u (linear: 46)
const grvCoreR = ar => GRV_CORE_PX * Math.log(1 + ar / GRV_CORE_A); // the black centre's radius for an aura's
// pass: 0 the pink rim, 1 the yellow ring, 2 the BLACK - each pass for EVERY sphere before the next (drawGrvCores), so two disks that
// overlap join into one, the dark of each over all the rings (owner, 2026-10-16: "accretion disks should connect, not be drawn over
// another black hole", "the dark part needs to be drawn over all accretion disk layers")
function drawGrvCore(sp, st, pass) {
  if (sp.age < GRV_NOVA_END) return; // (the nova first - the centre appears once it is gone)
  const r = grvCoreR(grvAuraNow(sp, st)); // LOGARITHMIC in its aura (owner, 2026-10-16: "make the center sphere of a bh increase logarithmically visually instead of linearly"; was 0.16 x the aura + 2 root mass); shrinks with its mass, to nothing
  if (r < 0.3) return;
  ctx.globalAlpha = 1; ctx.beginPath();
  if (pass === 0) { ctx.strokeStyle = COL.bhpink; ctx.lineWidth = 1; ctx.arc(sp.x, sp.y, r + Math.min(2, r), 0, 6.283); ctx.stroke(); }
  else if (pass === 1) { ctx.strokeStyle = COL.yellow; ctx.lineWidth = 2; ctx.arc(sp.x, sp.y, r, 0, 6.283); ctx.stroke(); }
  else { ctx.fillStyle = "#000"; ctx.arc(sp.x, sp.y, Math.max(0, r - 1), 0, 6.283); ctx.fill(); } /* r - 1: the yellow ring's outer half stays */
}
function drawGrvCores(at) {
  for (let pass = 0; pass < 3; pass++) for (const t of G.towers) {
    if (t.kind !== "grv" || !t.spheres) continue;
    const st = towerStats(t, true);
    for (const sp of t.spheres) at(sp.x, sp.y, () => drawGrvCore(sp, st, pass));
  }
}
function drawGrvFloats(now) {
  const dt = drawGrvFloats.last ? Math.min(0.1, now - drawGrvFloats.last) : 0;
  drawGrvFloats.last = now;
  drawGrvPellets();
  for (const f of grvFloats) {
    f.t += dt;
    const p = Math.min(1, f.t / GRV_FLOAT_S), x = f.x + (f.sp.x - f.x) * p, y = f.y + (f.sp.y - f.y) * p;
    ctx.globalAlpha = 1 - p; text(f.text, x, y, GRV_FLOAT_PX, "violet", true, true);
  }
  grvFloats = grvFloats.filter(f => f.t < GRV_FLOAT_S);
}
