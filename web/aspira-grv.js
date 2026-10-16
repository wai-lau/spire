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
const GRV_PELLETS = [2, 2.6, 3.2, 3.8, 4.4, 5]; // Radiation: pellets a second at starting mass (x mass) - few: a pellet pops a shield charge
const GRV_PELLET_K = [0.25, 0.32, 0.4, 0.48, 0.56, 0.65]; // Radiation: a pellet's hit, x the tower's damage
let GRV_AURA_K = 0.6; // (was 0.35 - solo.mjs; let: the simulator sweeps it) // the aura's damage a second on each enemy in it, x the tower's damage (x mass)
const GRV_LIFE = 5; // s: an unfed sphere's life - it loses 1 / GRV_LIFE of its STARTING mass a second, linearly
const GRV_MASS_MAX = 3, GRV_GAIN = 0.12; // mass gained per one tower-hit of damage dealt (nova, aura, pellets)
const GRV_STRIP = 0.5; // armor stripped, x the aura's damage dealt - POSITIVE armor only (it stops at zero)
const GRV_SLOW_MAX = 0.6, GRV_HORIZON_SLOW = 0.9; // Void VI (Event Horizon): a full-grown sphere's slow
const GRV_HYPER_STRIP = 0.5, GRV_HYPER_MASS = 2; // Supernova VI (Hypernova): the nova takes half the positive armor; spheres start heavier
const GRV_HAWKING_N = 12; // Radiation VI (Hawking): a spent sphere's last burst of pellets
const GRV_TICK = 0.25, GRV_FRONT_T = 0.2; // the nova's collapse, s (0.12 outward, then inward: a touch longer to read)
const GRV_NOVA_END = GRV_FRONT_T; // the nova GONE (collapsed into its centre) - only then the centre and aura (owner: "finish exploding before growing the circle")
// the nova's front: from its reach INWARD, ACCELERATING (owner, 2026-10-15: "explode inwards instead of outwards, accelerating")
const grvNovaR = (sp, st) => st.novaR * (1 - Math.min(1, sp.age / GRV_FRONT_T) ** 2); // s: the aura's tick; the yellow front's time to its reach
const GRV_PELLET_REACH = 1.4, GRV_PELLET_V = 320, GRV_PELLET_HIT = 3; // a pellet flies this x the aura's radius, at V a second; touches an enemy within its size + HIT
const GRV_AURA_ST = { noFx: true }; // an aura tick: no flash, no number (its own numbers drift INWARD - grvFloat)

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
const grvMassK = sp => Math.max(0, Math.min(GRV_MASS_MAX, sp.mass));
const grvAuraR = (sp, st) => st.auraR * Math.sqrt(grvMassK(sp));
// the aura's reach right now: nothing until the nova has FULLY exploded (owner, 2026-10-15: "make the nova fully explode before
// the aura and center"), then blown out from the centre at the nova front's speed until its size
const grvAuraNow = (sp, st) => Math.min(grvAuraR(sp, st), st.novaR / GRV_FRONT_T * Math.max(0, sp.age - GRV_NOVA_END));

// fire(): a nova on the target - the sphere is born where it stands
function novaAt(t, st, e) {
  (t.spheres ||= []).push({ id: G.id++, x: e.x, y: e.y, age: 0, mass: st.hyper ? GRV_HYPER_MASS : 1, hit: new Set(), tick: 0, pel: 0, lost: 1 / GRV_LIFE });
  return true;
}
// one hit from a sphere: the damage it really dealt feeds its mass
function grvHit(sp, t, st, e, amt, opt) {
  const hp0 = e.hp;
  damage(e, amt, t, false, false, opt);
  const dealt = Math.max(0, hp0 - Math.max(0, e.hp));
  if (dealt > 0) sp.mass = Math.min(GRV_MASS_MAX, sp.mass + GRV_GAIN * dealt / Math.max(1e-6, st.dmg));
  return dealt;
}
function stepGrv(t, dt) {
  const st = towerStats(t);
  stepPellets(t, st, dt);
  if (!t.spheres || !t.spheres.length) return;
  for (const sp of t.spheres) stepSphere(sp, t, st, dt);
  t.spheres = t.spheres.filter(sp => sp.mass > 0);
}
function stepSphere(sp, t, st, dt) {
  sp.age += dt;
  // the NOVA: the yellow front sweeps out; each enemy it reaches takes the hit once
  if (sp.age <= GRV_FRONT_T + dt) {
    const r = grvNovaR(sp, st); // it IMPLODES: an enemy is hit as the front sweeps past it, inward (all within reach by the end)
    for (const e of G.enemies) {
      const d2 = (e.x - sp.x) ** 2 + (e.y - sp.y) ** 2;
      if (e.dead || sp.hit.has(e.id) || d2 > st.novaR * st.novaR || d2 < r * r) continue;
      sp.hit.add(e.id);
      if (st.hyper && e.armor > 0) e.armor -= e.armor * GRV_HYPER_STRIP; // Hypernova: half the real armor, at once
      grvHit(sp, t, st, e, st.dmg * st.novaMul);
    }
  }
  const k = grvMassK(sp), ar = grvAuraNow(sp, st);
  // the AURA: burn, strip positive armor, slow the unshielded
  sp.tick += dt;
  while (sp.tick >= GRV_TICK) {
    sp.tick -= GRV_TICK;
    const slow = st.horizon && k >= GRV_MASS_MAX ? GRV_HORIZON_SLOW : Math.min(GRV_SLOW_MAX, st.slow * k);
    for (const e of G.enemies) {
      if (e.dead || (e.x - sp.x) ** 2 + (e.y - sp.y) ** 2 > ar * ar) continue;
      const dealt = grvHit(sp, t, st, e, st.dmg * GRV_AURA_K * k * GRV_TICK, GRV_AURA_ST);
      if (dealt > 0 && e.armor > 0) e.armor -= Math.min(e.armor, dealt * GRV_STRIP);
      if (dealt > 0) grvFloat(sp, e, dealt);
      // the shielded are never slowed (applySlow refuses them); a fast enemy NOT doubled like other slows - GRV is weak to fast
      if (!e.dead) applySlow(e, e.type === "fast" ? slow / FAST_SLOW_MUL : slow, GRV_TICK * 1.5, "grv:" + t.id);
    }
  }
  // RADIATION: pellets, more the heavier the sphere
  sp.pel += st.pellets * k * dt;
  while (sp.pel >= 1) { sp.pel -= 1; grvPellet(sp, t, st, grvAuraR(sp, st) * GRV_PELLET_REACH); }
  // the linear shrink; Hawking: a last burst as it goes
  sp.mass -= sp.lost * dt;
  if (sp.mass <= 0 && st.hawking) for (let i = 0; i < GRV_HAWKING_N; i++) grvPellet(sp, t, st, st.auraR * GRV_PELLET_REACH * 1.5);
}
// a PELLET is a projectile (owner, 2026-10-15: "I want pellets to be able to miss, not beams"): out from the sphere in a random
// direction at GRV_PELLET_V, hitting the FIRST enemy it touches - or nothing, fading at `reach`
function grvPellet(sp, t, st, reach) {
  const a = Math.random() * 6.283;
  (t.pellets ||= []).push({ sp, x: sp.x, y: sp.y, vx: Math.cos(a) * GRV_PELLET_V, vy: Math.sin(a) * GRV_PELLET_V, left: reach / GRV_PELLET_V, dmg: st.dmg * st.pelletK });
}
function stepPellets(t, st, dt) {
  if (!t.pellets || !t.pellets.length) return;
  for (const p of t.pellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + GRV_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      if (p.sp.mass > 0) grvHit(p.sp, t, st, e, p.dmg); else damage(e, p.dmg, t); // (its sphere gone: no mass to feed)
      p.left = 0; break;
    }
  }
  t.pellets = t.pellets.filter(p => p.left > 0);
}

// ---------- the PELLETS, drawn: a short coral streak along each one's flight ----------
const GRV_PELLET_TAIL = 0.03, GRV_PELLET_PX = 2.2; // s of flight the streak spans; its width
function drawGrvPellets() {
  ctx.strokeStyle = COL.bhcoral; ctx.lineCap = "round"; ctx.lineWidth = GRV_PELLET_PX; ctx.globalAlpha = 1;
  for (const t of G.towers) for (const p of t.pellets || []) { ctx.beginPath(); ctx.moveTo(p.x - p.vx * GRV_PELLET_TAIL, p.y - p.vy * GRV_PELLET_TAIL); ctx.lineTo(p.x, p.y); ctx.stroke(); }
}

// ---------- the aura's damage numbers drift INWARD, toward the sphere (owner) ----------
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
  drawGrvFloats(now);
  ctx.globalAlpha = 1;
}
function drawSphere(sp, st) {
  const k = grvMassK(sp), ar = grvAuraNow(sp, st);
  if (ar > 1) { // the aura: clear at the sphere, 30% at mid-radius, clear at the edge
    const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, ar);
    g.addColorStop(0, "transparent"); for (const [f, k] of GRV_BANDS) g.addColorStop(f, COL[k]); g.addColorStop(1, "transparent");
    ctx.globalAlpha = GRV_AURA_A; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp.x, sp.y, ar, 0, 6.283); ctx.fill();
  }
  if (sp.age < GRV_NOVA_END) { // the NOVA: a thick ring collapsing INWARD, accelerating, GRV purple slowly turning white (owner)
    const p = Math.min(1, sp.age / GRV_FRONT_T), r = grvNovaR(sp, st), w = Math.min(r, st.novaR * GRV_NOVA_W);
    if (r > 0.5) {
      ctx.globalAlpha = GRV_NOVA_A; ctx.strokeStyle = mixRgb(COL.violet, COL.bhwhite, GRV_NOVA_WHITE * p ** 2); ctx.lineWidth = w; // (a solid stroke: the 3D board takes no gradient stroke)
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r - w / 2, 0, 6.283); ctx.stroke();
    }
  }


  if (!(typeof q3d === "function" && q3d())) drawGrvCore(sp, st); // 3D: over the damage numbers instead (drawGrvCores, aspira-warp.js)
}
// the CENTRE and its ACCRETION DISK - black in a yellow ring and a thin pink rim (the image's core), as big as its aura is (it
// grows and shrinks with it). ABOVE the damage numbers (owner, 2026-10-15): in 2D the board draws them first; in 3D the pop-up
// pass calls drawGrvCores after them, `at` placing each at its spot like a number
function drawGrvCore(sp, st) {
  if (sp.age < GRV_NOVA_END) return; // (the nova first - the centre appears once it is gone)
  const r = Math.max(2, grvAuraNow(sp, st) * 0.16 + 2 * Math.sqrt(grvMassK(sp)));
  ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.strokeStyle = COL.yellow; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = COL.bhpink; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sp.x, sp.y, r + 2, 0, 6.283); ctx.stroke();
}
function drawGrvCores(at) {
  for (const t of G.towers) {
    if (t.kind !== "grv" || !t.spheres) continue;
    const st = towerStats(t, true);
    for (const sp of t.spheres) at(sp.x, sp.y, () => drawGrvCore(sp, st));
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
