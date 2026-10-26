// /spire TIER CHECKS (tier redesign, plan 2, 2026-10-24): the stat curve and each tower's tier 0 / tier I. Registered into the
// smoke harness; smoke.mjs imports this file before it reports. Its own page env, so the smoke checks' game state never leaks in.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT, boot, check } from "./harness.mjs";

const { run } = boot();
const CURVE_DONE = ["arc", "sol", "car", "frz", "acd", "grv", "ifr"]; // the kinds whose stats run on the curve (each tower task adds its own)

check("curve: by total level alone, rising, slightly steepening, the SAME growth for every tower (owner, 2026-10-26: \"everything should grow similarly\"; tier 0 may sit above the old bare tower - the trio fit's call, owner 2026-10-26)", () => {
  const r = run(`(() => { const out = {}; for (const k in STAT_CURVE) { const d = []; for (let L = 0; L <= SKILL_POINTS; L++) d.push(curveAt(k, L).dmg); out[k] = d; } return out; })()`);
  for (const [k, d] of Object.entries(r)) {
    if (Math.abs(d[d.length - 1] / d[0] - r.arc[r.arc.length - 1] / r.arc[0]) > 1e-9) return k + " grows x" + d[d.length - 1] / d[0] + ", ARC x" + r.arc[r.arc.length - 1] / r.arc[0] + " (expected one growth for all)";
    for (let i = 1; i < d.length; i++) if (!(d[i] > d[i - 1])) return k + " not rising at L" + i;
    for (let i = 2; i < d.length; i++) if (d[i] - d[i - 1] < d[i - 1] - d[i - 2] - 1e-9) return k + " flattens at L" + i;
  }
  if (Object.keys(r).length !== 7) return "STAT_CURVE covers " + Object.keys(r).join(",");
  const same = run(`(() => { const lv = sk => towerLevel({ kind: "arc", skills: sk }); return [lv({ conductivity: 2, voltage: 1 }), lv({ capacitance: 3 }), lv({})]; })()`);
  if (JSON.stringify(same) !== "[3,3,0]") return "towerLevel reads " + same + " (expected every point the same: 3, 3, 0)";
});
check("curve: SOL's rate is flat (never raise SOL's fire rate)", () => {
  const r = run(`[curveAt("sol", 0).rate, curveAt("sol", SKILL_POINTS).rate]`);
  if (r[0] !== 1 || r[1] !== 1) return "SOL rate " + r;
});
check("curve: no axis moves range or movement (owner, 2026-10-26): every single-axis build at a level has the same range and slide - the curve's", () => {
  const r = run(`(() => { const bad = []; for (const kind in SKILL_TREES) for (const L of [1, 3, 5]) { const seen = new Set();
    for (const ax of SKILL_TREES[kind]) { const sk = { [ax.id]: L }; const s = towerStats({ id: 99, kind, x: CX, y: CY, lvl: 1 + L, skills: sk }, true); seen.add(s.range.toFixed(6) + "/" + s.slide.toFixed(6)); }
    if (seen.size > 1) bad.push(kind + " L" + L + " " + [...seen].join(" | ")); } return bad; })()`);
  if (r.length) return r.slice(0, 3).join(" || ");
});
check("curve: a sim game boots and plays two waves with every web file it needs (sim.mjs FILES)", () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/aspira-sim/sim.mjs"), '{"mix":{"arc":1,"car":1}}', "1", "2"], { encoding: "utf8", timeout: 120000 });
  if (r.status !== 0) return "sim exited " + r.status + ": " + (r.stderr || "").split("\n").filter(Boolean).slice(-2).join(" | ");
  if (!/"wave":3/.test(r.stdout)) return "sim did not reach wave 3: " + r.stdout.slice(0, 120);
});

// ---------- the tower rigs (each tower task's checks use these) ----------
// a fresh game with one `kind` tower bought to `skills`, and enemies held still at tower-relative spots (huge HP, no armor or shield)
run(`function tierRig(kind, skills, spots = []) {
  G = newGame(); G.money = 1e9; ui.build = kind; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
  const t = G.towers[0]; t.skills = { ...skills }; t.lvl = 1 + towerLevel(t);
  const es = spots.map(([dx, dy]) => { spawnEnemy("armor", 30, 0, 0); const e = G.enemies[G.enemies.length - 1];
    e.x = t.x + dx; e.y = t.y + dy; e.stunT = 1e9; e.seen = true; e.hp = e.max = 1e9; e.armor = e.armor0 = 0; e.shield = e.shieldMax = 0; return e; });
  return { t, es, st: towerStats(t) };
}`);
// ...and held ON LANE 0 at about each distance from the tower (a stepped game re-reads an enemy's spot from its lane), like smoke's ifrNear
run(`function tierLane(kind, skills, dists) {
  const r = tierRig(kind, skills), t = r.t;
  r.es = dists.map(dist => { spawnEnemy("armor", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
    for (let s = entryS(0); s < PATHS[0].len; s += 4) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - dist); if (d < bd) { bd = d; bs = s; } }
    const p = pathAt(0, bs, 0); e.s = bs; e.x = p.x; e.y = p.y; e.stunT = 1e9; e.seen = true; e.hp = e.max = 1e9; e.armor = e.armor0 = 0; e.shield = e.shieldMax = 0; return e; });
  return r;
}`);
const hitCount = es => `${es}.filter(e => e.hp < e.max).length`;
// the three checks every tower task shares (plan 2, "Tower tasks: shared shape")
function towerTierChecks(kind, tier0Words) {
  check(kind.toUpperCase() + " on the curve: a tier I build on any one axis has damage, rate and range within x1.2 of the curve at level 1 (tier redesign 2026-10-24)", () => {
    if (!CURVE_DONE.includes(kind)) return kind + " not in CURVE_DONE";
    const r = run(`(() => { const b = TOWERS.${kind}, c = curveAt("${kind}", 1), out = [];
      for (const ax of SKILL_TREES.${kind}) { const s = towerStats({ id: 99, kind: "${kind}", x: CX, y: CY, lvl: 2, skills: { [ax.id]: 1 } }, true);
        out.push([ax.id, s.dmgCurve / (b.dmg * c.dmg), s.rateCurve / (b.rate * c.rate), s.range / (b.range * RANGE_BONUS * c.range)]); } return out; })()`);
    for (const [ax, ...k] of r) for (const [i, v] of k.entries()) if (!(v >= 1 - 1e-9 && v <= 1.2 + 1e-9)) return ax + " " + ["dmg", "rate", "range"][i] + " x" + v + " over the curve";
  });
  check(kind.toUpperCase() + ": the card's stat rows read no NaN / undefined at tier 0 or any single-axis tier I", () => {
    const r = run(`(() => { const bad = []; for (const sk of [{}, ...SKILL_TREES.${kind}.map(ax => ({ [ax.id]: 1 }))]) {
      const t = { id: 99, kind: "${kind}", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "${kind}", skills: sk }), skills: sk }, txt = JSON.stringify(SPEC.${kind}(towerStats(t, true), t));
      if (/NaN|undefined|null/.test(txt)) bad.push(JSON.stringify(sk) + " " + txt.slice(0, 160)); } return bad; })()`);
    if (r.length) return r.join(" || ");
  });
  check(kind.toUpperCase() + ": the tier 0 sentence names no axis mechanic", () => {
    const d = run(`describeTower("${kind}", {})`), hit = tier0Words.filter(w => d.toLowerCase().includes(w));
    if (hit.length) return "tier 0 says " + hit.join(", ") + ": " + d;
  });
}

// ---------- ARC ----------
towerTierChecks("arc", ["fork", "charge", "same place"]);
check("ARC: tier 0 strikes one enemy; Conductivity I chains once; Voltage I forks the strike three ways (tier redesign 2026-10-24; VOLT_FORK x1.5, axis balance 2026-10-25)", () => {
  const n = sk => run(`(() => { const { t, es, st } = tierRig("arc", ${JSON.stringify(sk)}, [[60, 0], [60, 30], [60, -30], [90, 20], [30, -20]]);
    fireSkillChain(t, st, es[0]); for (let i = 0; i < 30; i++) stepChains(0.05); return ${hitCount("es")}; })()`);
  const r = [n({}), n({ conductivity: 1 }), n({ voltage: 1 }), n({ capacitance: 1 })];
  if (JSON.stringify(r) !== "[1,2,4,1]") return "enemies hit (tier 0, Cond I, Volt I, Cap I): " + r + " (expected 1, 2, 4, 1)";
});

// ---------- SOL ----------
towerTierChecks("sol", ["diffract", "scorch", "break"]);
check("SOL (owner, 2026-10-26): tier 0 goes straight through its line AND splits at every hit within the band (owner, 2026-10-26: an expanding rectangle); Scorch I burns and stacks; Diffraction I carries 70%; Breach I strips armor, no burn", () => {
  const shot = (sk, n = 1) => run(`(() => { const { t, es, st } = tierRig("sol", ${JSON.stringify(sk)}, [[40, 0], [70, 0], [100, 0], [230, 30], [40, 80]]);
    es[0].armor = es[0].armor0 = 50; for (const e of es) e.hp = e.max = 1e7;
    for (let i = 0; i < ${n}; i++) fireRay(t, st, es[0]); const stacks = (es[0].dots || []).length; for (let i = 0; i < 30; i++) step(1 / 60);
    return { hit: es.map(e => e.hp < e.max), burn: stacks, armor: es[0].armor, split: st.split, hop: st.hop }; })()`);
  const z = shot({}), f = shot({ focus: 1 }, 2), r = shot({ refraction: 1 }), b = shot({ breach: 1 });
  if (JSON.stringify(z.hit) !== "[true,true,true,true,false]") return "tier 0 hit " + JSON.stringify(z.hit) + " (expected the line, the one off it inside the band, not the one 80 u across - outside the 60 u band)";
  if (z.burn || z.armor !== 50 || z.split !== 1) return "tier 0: " + JSON.stringify(z);
  if (f.burn < 2) return "Scorch I: " + JSON.stringify(f) + " (expected two stacking burns)";
  if (r.split !== 1 || r.hop !== 0.7) return "Diffraction I: splits " + r.split + ", carry " + r.hop + " (expected 1 split at 70% carry - owner, 2026-10-26)";
  if (b.burn || !(b.armor < 50)) return "Breach I: " + JSON.stringify(b) + " (expected armor stripped, no burn)";
});

check("SOL's shot band (owner, 2026-10-26): after the first enemy every hit lies within st.band u of the line tower -> first enemy, ahead of the tower, each farther from SOL than the last", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", {}, [[100, 0], [60, 8], [180, 90], [260, 20]]);
    for (const e of es) e.hp = e.max = 1e7; fireRay(t, st, es[0]); return es.map(e => e.hp < e.max); })()`);
  if (JSON.stringify(r) !== "[true,false,false,true]") return "hit " + JSON.stringify(r) + " (expected the first, not the nearer one in the band, not the one outside it, the farther one inside)";
});

check("SOL's splits have no limit (owner, 2026-10-26: \"bounces have no limit\"): enemies zig-zagging off the line inside the cone, each farther, are ALL struck at Diffraction V's 100% carry: each split takes the next nearest to SOL (2026-10-26)", () => {
  const r = run(`(() => { const pts = [[50, 0]]; for (let k = 1; k < 10; k++) { const x = 50 + 40 * k; pts.push([x, (k % 2 ? 1 : -1) * 0.2 * x]); }
    const { t, es, st } = tierRig("sol", { refraction: 5 }, pts); for (const e of es) e.hp = e.max = 1e7; fireRay(t, st, es[0]); return es.filter(e => e.hp < e.max).length; })()`);
  if (r !== 10) return r + " of 10 struck";
});

check("SOL has no pierce (owner, 2026-10-26: \"Get rid of piercing\" / \"Split, else fly on\"): with no one to split to the beam flies on straight past its enemy to the edge, striking no one on its line", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", {}, [[60, 0], [140, 0]]); st.split = 0; for (const e of es) e.hp = e.max = 1e7; fx.length = 0; fireRay(t, st, es[0]);
    const a0 = Math.atan2(es[0].y - t.y, es[0].x - t.x), segs = fx.filter(f => f.k === "beam" && f.share != null && f.share < 1);
    return { second: es[1].hp < es[1].max, far: segs.some(f => Math.abs(Math.atan2(f.y2 - f.y1, f.x2 - f.x1) - a0) < 1e-6 && Math.hypot(f.x2 - f.x1, f.y2 - f.y1) > 1000) }; })()`);
  if (r.second) return "the enemy on the line behind was struck (a pierce)";
  if (!r.far) return "no straight line on to the edge";
});

check("SOL's mirror (owner, 2026-10-26: \"If there is no diffraction target, then just reflect off the cone\" - the band's walls now): a line leaving the band with no one to split to mirrors off the wall, angle in = angle out", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", {}, [[100, 0], [140, 90]]); es[1].hp = es[1].max = 1e7; es[0].hp = es[0].max = 1e7; solAim = 0; fx.length = 0;
    solSpread(t, st, { x: t.x + 100, y: t.y - 30 }, es[0], st.dmg); // straight across: on from es[0] it reaches the band's wall 60 u over; es[1] lies outside the band, so no one to split to
    const walls = fx.filter(f => f.k === "beam" && f.share != null).map(f => Math.atan2(f.y2 - f.y1, f.x2 - f.x1));
    return { n: walls.length, angs: walls.map(a => +a.toFixed(4)) }; })()`);
  const up = Math.atan2(30, 0); // (the way in, from (100,-30) to (100,0): straight down the screen, +90 degrees)
  if (!r.angs.some(a => Math.abs(a + up) < 1e-3)) return "no mirrored line off the band's wall (expected straight back across, -90 degrees): " + JSON.stringify(r);
});

check("SOL's scorch stacks burn independently (owner, 2026-10-26): two stacks pop two shield charges in a tick's time, one each", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", { focus: 1 }, [[60, 0]]); const e = es[0]; e.hp = e.max = 1e9; e.shield = e.shieldMax = 50;
    solScorch(e, t, st); solScorch(e, t, st); const s0 = e.shield; solScorchTick(e, SOL_SCORCH_Q + 1e-6); return s0 - e.shield; })()`);
  if (r !== 2) return r + " charges popped (expected 2: a stack, a pop)";
});

check("SOL's scorch ROD (owner, 2026-10-26): Scorch I's rod sweeps one burn onto an enemy in the band it never hits, none outside it; a burn is 1x the shot's hit at most", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", { focus: 1 }, [[60, 0], [200, 10], [60, 90]]); st.split = 0; for (const e of es) e.hp = e.max = 1e9; fireRay(t, st, es[0]);
    const d0 = (es[1].dots || []).length; for (let i = 0; i < 4; i++) solRodStep(t, st, 0.05); /* the rod out past 200 u, no burn ticks */
    const d = es[1].dots || []; return { d0, n: d.length, total: d.reduce((a, s) => a + s.d * s.left, 0) / st.dmg, out: (es[2].dots || []).length }; })()`);
  if (r.d0 !== 0) return "a burn before the rod reached it: " + JSON.stringify(r);
  if (r.n !== 1 || Math.abs(r.total - 1) > 1e-6 || r.out) return JSON.stringify(r) + " (expected one 1x burn in the band, none outside it)";
});

check("SOL's burns tick IN THE GAME LOOP (a stack once sat untouched: dotT lost, 2026-10-26): one Scorch I burn pops shield charges as the game steps", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", { focus: 1 }, [[60, 0]]); const e = es[0]; e.hp = e.max = 1e9; e.shield = e.shieldMax = 50;
    solScorch(e, t, st); const s0 = e.shield; for (let i = 0; i < 30; i++) step(1 / 60); return s0 - e.shield; })()`);
  if (!(r >= 4)) return r + " charges popped in 0.5 s (expected about 5)";
});

// ---------- CRR ----------
towerTierChecks("car", ["tether", "circling", "wingmate"]);
check("CRR: tier 0 one interceptor, no tether, one bolt a volley; Hangar I two, one held; Tether I one tether at most; Armament I two bolts, same volley (tier redesign 2026-10-24)", () => {
  const st = sk => run(`(() => { const s = towerStats({ id: 99, kind: "car", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "car", skills: ${JSON.stringify(sk)} }), skills: ${JSON.stringify(sk)} }, true); return { wing: s.wing, hold: s.hold, tSlow: s.tSlow, tetherN: s.tetherN, bolts: s.bolts }; })()`);
  const z = st({}), h = st({ hangar: 1 }), a = st({ armament: 1 });
  if (z.wing !== 1 || z.tSlow !== 0 || z.bolts !== 1 || z.hold !== 0) return "tier 0 " + JSON.stringify(z);
  if (h.wing !== 2 || h.hold !== 1) return "Hangar I " + JSON.stringify(h);
  if (a.bolts !== 2) return "Armament I " + JSON.stringify(a);
  const n = run(`(() => { const { t } = tierLane("car", { hangar: 3, launch: 1 }, [90, 120, 150, 170]); /* held ON the lane (a stepped game re-reads a spot from it) */
    G.started = true; G.nextIn = 1e9; G.spawns = []; /* the rig's enemies alone - no real wave */ let most = 0, ever = 0;
    for (let k = 0; k < 600; k++) { step(1 / 60); const st = towerStats(t), c = t.icp.filter(i => carTethered(t, i, st)).length; most = Math.max(most, c); ever += c; } /* AT ONCE: tethered at a frame's end (a frame runs several steps, and which one rides it moves - 2026-10-26) */ return [most, ever]; })()`);
  if (n[0] !== 1) return "Tether I: " + n[0] + " interceptors tethered at once (expected 1 - " + n[1] + " tether steps in all)"; // at most ONE at a time; which one rides it moves (carTethered, 2026-10-25)
});

// ---------- FRZ ----------
towerTierChecks("frz", ["hurts", "pulse", "moon", "more damage"]);
check("FRZ: tier 0 slows and nips, flat (owner 2026-10-25); Sublimation I hurts, more the slower; Permafrost I pulses crack armor; Moons I one moon (tier redesign 2026-10-24)", () => {
  const go = (sk, extra = "") => run(`(() => { const { t, es } = tierLane("frz", ${JSON.stringify(sk)}, [30]); const e = es[0]; e.armor = e.armor0 = 40; G.started = true;
    let slowed = false; for (let k = 0; k < 180; k++) { ${extra} step(1 / 60); if (e.slowT > 0 && e.slowF > 0) slowed = true; }
    return { dealt: e.max - e.hp, slowed, frost: frostShare(e), crack: towerStats(t).rimeCrack || 0, moons: towerStats(t).moonN || 0 }; })()`);
  const z = go({}), s = go({ temp: 1 }), sx = go({ temp: 1 }, `applySlow(e, 0.5, 0.2, "test");`), p = go({ rime: 1 }), m = go({ moons: 1 });
  if (!z.slowed || !(z.dealt > 0)) return "tier 0: " + JSON.stringify(z) + " (expected a slow and a nip)";
  const zx = go({}, `applySlow(e, 0.5, 0.2, "test");`);
  if (zx.dealt > z.dealt * 1.01) return "tier 0 nip: " + zx.dealt + " slowed vs " + z.dealt + " (expected flat - more the slower is Sublimation's)";
  if (!(s.dealt > z.dealt * 2)) return "Sublimation I: " + s.dealt + " vs the tier 0 nip " + z.dealt + " (expected the full hurt, well past a nip)";
  if (!(s.dealt > 0)) return "Sublimation I dealt nothing";
  if (!(sx.dealt > s.dealt)) return "Sublimation I: " + sx.dealt + " slowed vs " + s.dealt + " (expected more on the slower)";
  if (z.frost > 0) return "tier 0 frosted " + z.frost;
  if (!(p.frost > 0 && p.crack > 0)) return "Permafrost I: frost " + p.frost + ", crack " + p.crack + " (expected a pulse's frost that cracks armor - damage() reads it)";
  if (m.moons !== 1) return "Moons I: " + m.moons + " moons";
});

// ---------- ACD ----------
towerTierChecks("acd", ["pool", "puddle", "slow", "spread"]);
check("ACD: tier 0 one ray, no pools, kills leave none; Flow I two rays + carry; Contagion I a ray-dripped slowing pool, no kill pools; Corrosion I eats armor (tier redesign 2026-10-24)", () => {
  const st = sk => run(`(() => { const s = towerStats({ id: 99, kind: "acd", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "acd", skills: ${JSON.stringify(sk)} }), skills: ${JSON.stringify(sk)} }, true); return { lines: s.targets, carry: s.carry, pools: !!s.contagion, slow: s.burnSlow || 0, corrode: s.corrode || 0 }; })()`);
  const pools = (sk, kill) => run(`(() => { const { t, es } = tierLane("acd", ${JSON.stringify(sk)}, [30, 45]); G.started = true; ${kill ? "es[0].hp = es[0].max = 5;" : ""}
    let slowed = false; for (let k = 0; k < 240; k++) { step(1 / 60); if (es[1].slowT > 0) slowed = true; } return { n: (t.puddles || []).length, spread: (t.puddles || []).filter(p => p.spread).length, slowed }; })()`);
  const z = st({}), f = st({ spray: 1 }), c = st({ contagion: 1 }), k = st({ corrosion: 1 });
  if (z.lines !== 1 || z.pools || z.carry || z.slow) return "tier 0 " + JSON.stringify(z);
  if (f.lines !== 2 || !(f.carry > 0)) return "Flow I " + JSON.stringify(f);
  if (!c.pools || !(c.slow > 0)) return "Contagion I " + JSON.stringify(c);
  if (!(k.corrode > 0)) return "Corrosion I " + JSON.stringify(k);
  const z0 = pools({}, true), c1 = pools({ contagion: 1 }, true);
  if (z0.n) return "tier 0 left " + z0.n + " pools";
  if (!c1.n || c1.spread || !c1.slowed) return "Contagion I pools " + JSON.stringify(c1) + " (expected ray pools that slow, none from kills)";
});

// ---------- GRV ----------
towerTierChecks("grv", ["aura", "strip"]); // (its tiny void and the pellets it sheds ARE tier 0 - GRV rework 2026-10-25)
check("GRV rework (owner, 2026-10-25): tier 0 a tiny void that sheds pellets - no nova, aura or strip; Nova I novas that strip armor; Void I a bigger void that sheds pellets; Acceleration I an aura that slows, pellets too", () => {
  const go = sk => run(`(() => { const { t, es, st } = tierLane("grv", ${JSON.stringify(sk)}, [40, 60]); const e = es[0]; e.armor = e.armor0 = 500; G.started = true;
    novaAt(t, st, e); let slowed = false, pel = 0, sph = 0; /* the hole-leaving shot (GRV_BH_EVERY) */ for (let k = 0; k < 90; k++) { step(1 / 60); t.cd = 1e9; if (e.slowT > 0) slowed = true; pel = Math.max(pel, (t.pellets || []).length); if (k === 40) sph = (t.spheres || []).length; }
    const s = towerStats(t); return { dealt: e.max - e.hp, sph, slowed, armor: e.armor, pel, hole: !!s.hole, aura: !!s.auraOn, voidR: s.auraR, name: SKILL_TREES.grv[1].name, acc: SKILL_TREES.grv[2].name }; })()`);
  const z = go({}), v = go({ void: 1 }), n = go({ supernova: 1 }), r = go({ radiation: 1 });
  if (!(z.dealt > 0) || !z.sph || z.slowed || z.armor !== 500 || !z.pel) return "tier 0: " + JSON.stringify(z) + " (expected a void that crushes and sheds pellets, no slow or strip)";
  if (!(v.voidR > z.voidR) || v.slowed || v.armor !== 500 || !v.pel) return "Void I: " + JSON.stringify(v);
  if (!(n.armor < 500) || n.slowed) return "Nova I: " + JSON.stringify(n);
  if (!r.slowed || !r.aura || !r.pel) return "Acceleration I: " + JSON.stringify(r);
  if (z.name !== "Nova" || z.acc !== "Acceleration") return "GRV's axes read " + z.name + " / " + z.acc;
});

// ---------- IFR ----------
towerTierChecks("ifr", ["fan", "fire", "flare", "hellfire"]);
check("IFR: tier 0 a meteor that hits and bursts into 6 (owner, 2026-10-26); Meteor I stores two in orbit, the burst still 6; Hellfire I one fire riding its enemy; Flare I one flare at the impact", () => {
  const go = sk => run(`(() => { const { t, es } = tierLane("ifr", ${JSON.stringify(sk)}, [70]); const e = es[0]; G.started = true;
    let spawned = 0, fires = 0, flares = 0, rides = null; const K = Math.min(45, Math.floor(towerStats(t).chargeS * 60)); for (let k = 0; k < K; k++) { step(1 / 60); // one volley (a faster curve rate would launch the next inside 45 frames)
      spawned = Math.max(spawned, (t.ifrBalls || []).filter(b => b.gen).length); fires = Math.max(fires, (t.ifrFires || []).length); flares = Math.max(flares, (t.ifrFlares || []).filter(f => !f.hf).length);
      if (rides == null && (t.ifrFires || []).length) rides = t.ifrFires[0].eid === e.id; if (e.max > e.hp && (t.ifrBalls || []).length === 0 && k > 30) break; }
    return { dealt: e.max - e.hp, spawned, fires, flares, rides }; })()`);
  const z = go({}), m = go({ meteor: 1 }), h = go({ hellfire: 1 }), f = go({ firaga: 1 });
  if (!(z.dealt > 0) || z.spawned !== 6 || z.fires || z.flares) return "tier 0: " + JSON.stringify(z) + " (expected a hit and a burst of 6, no fire or flare)";
  if (m.spawned !== 6) return "Meteor I burst " + m.spawned + " (expected 6: Meteor never grows the burst below its capstone)";
  const sto = run(`[towerStats({ kind: "ifr", lvl: 1, skills: {} }).store, towerStats({ kind: "ifr", lvl: 2, skills: { meteor: 1 } }).store]`);
  if (sto[0] !== 1 || sto[1] !== 2) return "IFR stored in orbit " + sto + " (expected 1, 2)";
  if (h.fires !== 1 || !h.rides) return "Hellfire I: " + JSON.stringify(h) + " (expected one fire riding the struck enemy)";
  if (f.flares !== 1 || f.fires) return "Flare I: " + JSON.stringify(f) + " (expected one flare, no fire)";
});

// ---------- names ----------
check("tier I names: every axis's first hint is named (no placeholder), GRV's second axis is Nova (tier redesign 2026-10-24)", () => {
  const want = { conductivity: "Lead", voltage: "Fork", capacitance: "Charge", focus: "Singe", refraction: "Glint", breach: "Crack", hangar: "Escort", launch: "Line", armament: "Twin",
    temp: "Nip", rime: "Rime", moons: "Crescent", corrosion: "Pit", spray: "Drip", contagion: "Seep", void: "Sink", supernova: "Halo", radiation: "Ember", meteor: "Split", hellfire: "Cinder", firaga: "Flicker" };
  const r = run(`(() => { const out = {}; for (const k in SKILL_TREES) for (const ax of SKILL_TREES[k]) out[ax.id] = ax.tiers.map(x => x.name); return { names: out, nova: SKILL_TREES.grv[1].name }; })()`);
  for (const [id, n] of Object.entries(want)) if (!r.names[id] || r.names[id][0] !== n) return id + " tier I is " + (r.names[id] || [])[0] + " (expected " + n + ")";
  for (const [id, ns] of Object.entries(r.names)) if (ns.length !== 5) return id + " has " + ns.length + " tier names";
  if (r.nova !== "Nova") return "GRV axis 2 is " + r.nova;
});

// ---------- final review fixes (plan 2, 2026-10-24) ----------
const rows = (kind, sk) => run(`(() => { const sk = ${JSON.stringify(sk)}, t = { id: 99, kind: "${kind}", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "${kind}", skills: sk }), skills: sk }, st = towerStats(t, true);
  return { st: { bolts: st.bolts }, rows: Object.fromEntries(SPEC.${kind}(st, t)) }; })()`);
check("review: the card's rows show no mechanic the tower lacks - no Shields row (any damage pops one charge, unsaid: owner 2026-10-26), IFR's fire / flares / fan only once bought", () => {
  for (const k of ["car", "sol"]) if ("Shields" in rows(k, {}).rows) return k + " still shows a Shields row";
  const i0 = rows("ifr", {}).rows, ih = rows("ifr", { hellfire: 1 }).rows, ifl = rows("ifr", { firaga: 1 }).rows;
  for (const k of ["Fire", "Fire flares", "Flare", "Flare tick", "Flare ticks", "Flare lasts"]) if (i0[k] !== "—") return "IFR tier 0 " + k + " reads " + i0[k];
  if (i0.Meteors !== "1 + a burst of 6") return "IFR tier 0 Meteors reads " + i0.Meteors;
  if (ih.Fire === "—" || ifl.Flare === "—") return "IFR Hellfire I / Flare I rows blank";
});
check("review: FRZ Rime's bite takes the DAM core power and the Orbital Relay like the tick", () => {
  const r = run(`(() => { const t = { id: 99, kind: "frz", x: CX, y: CY, lvl: 2, skills: { rime: 1 } }; G = newGame(); const a = towerStats(t, true).biteDmg; G.power.DAM = 1; const b = towerStats(t, true).biteDmg; G.power.DAM = 0;
    const s = { dmg: 1, biteDmg: 1, targets: 1 }; relayStats(s, "frz", 3); return [b / a, s.biteDmg]; })()`);
  if (Math.abs(r[0] - 1.6) > 1e-9 || r[1] !== 3) return "bite x" + r[0] + " under DAM, x" + r[1] + " under the Relay (expected 1.6, 3)";
});
check("review: the card-text graph generator runs (docs/spire-descriptions.md is rebuilt from it)", () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/aspira-desc-graph.mjs")], { encoding: "utf8", timeout: 120000 });
  if (r.status !== 0) return "aspira-desc-graph.mjs exited " + r.status + ": " + (r.stderr || "").split("\n").filter(Boolean).slice(0, 2).join(" | ");
});
check("GRV merge (owner, 2026-10-25): two voids' caps do not add - the mass past the bigger cap is lost and shed as pellets", () => {
  const r = run(`(() => { G = newGame(); const mk = (m) => ({ id: G.id++, x: CX, y: CY, vx: 0, vy: 0, ar: 40, age: 1, mass: m, cap: 3, apm: 1600, hit: new Set(), tick: 0, pel: 0, bh: true, open: true, auraSnd: true });
    const a = mk(2.5), b = mk(2); grvMerge(a, b); return { mass: a.mass, cap: a.cap, pel: a.pel, per: GRV_PEL_PER_MASS }; })()`);
  if (r.cap !== 3 || Math.abs(r.mass - 3) > 1e-9 || Math.abs(r.pel - r.per * 1.5) > 1e-6) return "merge: " + JSON.stringify(r) + " (expected cap 3, mass 3, 1.5 mass of pellets)";
});

// ---------- the left-for-later list (owner, 2026-10-25: "zero" / "fix all the left for later things") ----------
const statsOf = (kind, sk) => run(`(() => { G = newGame(); const sk = ${JSON.stringify(sk)}; const st = towerStats({ id: 99, kind: "${kind}", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "${kind}", skills: sk }), skills: sk }, true);
  return { critMul: st.critMul, scorch: st.dot ? st.dot.n : 0, brittle: st.brittle, fireHK: st.fireHK, hfK: st.hfK }; })()`);
check("later: tier I adds no extra numbers the spec does not name - SOL Breach I crit as tier 0, FRZ Sublimation I no Brittle", () => {
  const s0 = statsOf("sol", {}), s1 = statsOf("sol", { breach: 1 }), f1 = statsOf("frz", { temp: 1 });
  if (s1.critMul !== s0.critMul) return "SOL Breach I crit x" + s1.critMul + " (tier 0 x" + s0.critMul + ")";
  if (f1.brittle !== 1) return "FRZ Sublimation I Brittle x" + f1.brittle + " (expected 1)";
});
check("later: a factor on the tower's OWN damage is one constant, on from its first tier (SOL crit, IFR fire hit + Flare's fire boost)", () => {
  const same = (kind, ax, key, from) => { const v = [1, 2, 3, 4, 5].map(n => statsOf(kind, { [ax]: n })[key]); return v.every(x => x === v[0]) && statsOf(kind, {})[key] === from ? "" : kind + " " + ax + " " + key + " " + JSON.stringify(v) + " (tier 0 " + statsOf(kind, {})[key] + ")"; };
  return same("sol", "breach", "critMul", 3) /* (SOL scorch left this rule 2026-10-25: Breach "increases ... burn" again) */ || same("ifr", "hellfire", "fireHK", statsOf("ifr", { hellfire: 1 }).fireHK) || same("ifr", "firaga", "hfK", 1);
});
check("later: the card rows read no zero mechanic - ARC Jumps at tier 0, FRZ Cold bite before Sublimation (the nip is flat)", () => {
  const a0 = rows("arc", {}).rows, a1 = rows("arc", { conductivity: 1 }).rows, f0 = rows("frz", {}).rows, f1 = rows("frz", { temp: 1 }).rows;
  if (a0.Jumps !== "—") return "ARC tier 0 Jumps reads " + a0.Jumps;
  if (!/^1 jump/.test(a1.Jumps)) return "ARC Conductivity I Jumps reads " + a1.Jumps;
  if (f0["Cold bite"] !== "—") return "FRZ tier 0 Cold bite reads " + f0["Cold bite"];
  if (f1["Cold bite"] === "—") return "FRZ Sublimation I Cold bite blank";
});
check("later: ACD's sentence says the jet, not Jets, when it sprays one", () => {
  const d = run(`describeTower("acd", { corrosion: 1, contagion: 1, flow: 0 })`);
  if (/Jets/.test(d)) return d;
  if (!/The jet dissolves armor/.test(d) || !/The jet leaves/.test(d)) return "no singular jet: " + d;
});
check("later: towerLevel counts only the tower's own axes (a stray key in a save adds nothing)", () => {
  const n = run(`towerLevel({ kind: "arc", skills: { conductivity: 2, void: 3, junk: 9 } })`);
  if (n !== 2) return "towerLevel " + n + " (expected 2)";
});
check("later: CRR's tether rides the first interceptor OUT on a target, not interceptor 0, and only it draws a beam", () => {
  const r = run(`(() => { G = newGame(); const t = { id: 99, kind: "car", x: CX, y: CY, lvl: 3, skills: { hangar: 1, launch: 1 } }, st = towerStats(t, true), e = { x: CX + 30, y: CY, hp: 1e9, dead: false };
    t.icp = [{ state: "home" }, { state: "out", ve: e }, { state: "out", ve: e }]; return t.icp.map(i => carTethered(t, i, st)); })()`);
  if (JSON.stringify(r) !== "[false,true,false]") return "tethered " + JSON.stringify(r) + " (expected only the first one out)";
});
check("ARC's sentence in the owner's words (2026-10-25): \"Two bolts of lightning.\" / Conductivity \"chains\" / Voltage \"forks for X% less damage every chain\"; FRZ tier 0 \"slows and deals X% damage\"", () => {
  const r = run(`[describeTower("arc", {}), describeTower("arc", { voltage: 1 }), Math.round(ARC_VOLTAGE_FALL[1] * 100), describeTower("arc", { conductivity: 1 }), describeTower("arc", { conductivity: 1, voltage: 1 }), describeTower("frz", {}), Math.round(FRZ_NIP * 100)]`);
  if (r[0] !== "Three bolts of lightning.") return "tier 0: " + r[0];
  if (r[1] !== "Three bolts of lightning that fork three ways for " + (100 - r[2]) + "% less damage every chain.") return "Voltage I: " + r[1];
  if (!/that chain once for \d+% less damage every chain\.$/.test(r[3])) return "Conductivity I: " + r[3];
  if (!/that chain once and fork three ways for \d+% less damage every chain\.$/.test(r[4])) return "Conductivity I + Voltage I: " + r[4];
  if (!r[5].includes("slows enemies by") || !r[5].includes(" and deals " + r[6] + "%td over ")) return "FRZ tier 0: " + r[5];
});
