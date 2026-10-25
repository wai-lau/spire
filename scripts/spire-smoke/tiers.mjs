// /spire TIER CHECKS (tier redesign, plan 2, 2026-10-24): the stat curve and each tower's tier 0 / tier I. Registered into the
// smoke harness; smoke.mjs imports this file before it reports. Its own page env, so the smoke checks' game state never leaks in.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT, boot, check } from "./harness.mjs";

const { run } = boot();
const CURVE_DONE = ["arc", "sol", "car", "frz", "acd", "grv", "ifr"]; // the kinds whose stats run on the curve (each tower task adds its own)

check("curve: by total level alone, rising, slightly steepening, tier 0 below today's bare tower (tier redesign 2026-10-24)", () => {
  const r = run(`(() => { const out = {}; for (const k in STAT_CURVE) { const d = []; for (let L = 0; L <= SKILL_POINTS; L++) d.push(curveAt(k, L).dmg); out[k] = d; } return out; })()`);
  for (const [k, d] of Object.entries(r)) {
    if (!(d[0] < 1)) return k + " tier 0 dmg x" + d[0] + " (expected below 1)";
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
check("curve: range nudges from the axes add at most 20%", () => {
  const r = run(`(() => { let worst = 0; for (const kind in SKILL_MOVE) { const t = { id: 99, kind, x: CX, y: CY, lvl: 14, skills: {} };
    SKILL_TREES[kind].forEach((ax, i) => t.skills[ax.id] = i ? 4 : 5); const s = { range: 1, slide: 1 }; skillMove(t, s); worst = Math.max(worst, s.range); } return worst; })()`);
  if (r > 1.2 + 1e-9) return "a full tower's range nudge x" + r;
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
check("ARC: tier 0 strikes one enemy; Conductivity I chains once; Voltage I forks the strike two ways (tier redesign 2026-10-24)", () => {
  const n = sk => run(`(() => { const { t, es, st } = tierRig("arc", ${JSON.stringify(sk)}, [[60, 0], [60, 30], [60, -30], [90, 20], [30, -20]]);
    fireSkillChain(t, st, es[0]); for (let i = 0; i < 30; i++) stepChains(0.05); return ${hitCount("es")}; })()`);
  const r = [n({}), n({ conductivity: 1 }), n({ voltage: 1 }), n({ capacitance: 1 })];
  if (JSON.stringify(r) !== "[1,2,3,1]") return "enemies hit (tier 0, Cond I, Volt I, Cap I): " + r + " (expected 1, 2, 3, 1)";
});

// ---------- SOL ----------
towerTierChecks("sol", ["reflect", "pass", "scorch", "break"]);
check("SOL: tier 0 stops at its first enemy, no burn, no strip; Focus I passes one more; Reflection I bounces once; Breach I burns and pops (tier redesign 2026-10-24)", () => {
  const shot = sk => run(`(() => { const { t, es, st } = tierRig("sol", ${JSON.stringify(sk)}, [[40, 0], [70, 0], [100, 0], [40, 60], [40, -60]]);
    es[0].armor = es[0].armor0 = 50; es[0].shield = es[0].shieldMax = 3; const sh0 = es[0].shield;
    fireRay(t, st, es[0]); const pops = sh0 - es[0].shield; const h0 = es[0].hp; for (let i = 0; i < 30; i++) step(1 / 60);
    return { line: [es[1].hp < es[1].max, es[2].hp < es[2].max], side: es.slice(3).filter(e => e.hp < e.max).length, burn: !!(es[0].dotT > 0 || es[0].hp < h0), armor: es[0].armor, pops }; })()`);
  const z = shot({}), f = shot({ focus: 1 }), r = shot({ refraction: 1 }), b = shot({ breach: 1 });
  if (z.line[0] || z.side || z.burn || z.armor !== 50) return "tier 0: " + JSON.stringify(z);
  if (!f.line[0] || f.line[1]) return "Focus I line hits " + f.line + " (expected the second, not the third)";
  if (r.side + (r.line[0] ? 1 : 0) !== 1) return "Reflection I hit " + JSON.stringify(r) + " (expected one bounce)";
  if (!b.burn || b.armor !== 50) return "Breach I: " + JSON.stringify(b) + " (expected a burn, armor kept)";
});

// ---------- CRR ----------
towerTierChecks("car", ["tether", "circling", "wingmate"]);
check("CRR: tier 0 one interceptor, no tether, one bolt a volley; Hangar I two, one held; Tether I one tether at most; Armament I two bolts, same volley (tier redesign 2026-10-24)", () => {
  const st = sk => run(`(() => { const s = towerStats({ id: 99, kind: "car", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "car", skills: ${JSON.stringify(sk)} }), skills: ${JSON.stringify(sk)} }, true); return { wing: s.wing, hold: s.hold, tSlow: s.tSlow, tetherN: s.tetherN, bolts: s.bolts }; })()`);
  const z = st({}), h = st({ hangar: 1 }), a = st({ armament: 1 });
  if (z.wing !== 1 || z.tSlow !== 0 || z.bolts !== 1 || z.hold !== 0) return "tier 0 " + JSON.stringify(z);
  if (h.wing !== 2 || h.hold !== 1) return "Hangar I " + JSON.stringify(h);
  if (a.bolts !== 2) return "Armament I " + JSON.stringify(a);
  const n = run(`(() => { const { t } = tierRig("car", { hangar: 3, launch: 1 }, [[200, 0], [-200, 40], [0, 220], [150, 150]]);
    G.started = true; let most = 0, ever = 0, seen = new Set(); const orig = carTether; carTether = (i, ...r) => { seen.add(i); return orig(i, ...r); };
    try { for (let k = 0; k < 600; k++) { seen = new Set(); step(1 / 60); most = Math.max(most, seen.size); ever += seen.size; } } finally { carTether = orig; } return [most, ever]; })()`);
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
towerTierChecks("grv", ["black hole", "aura", "pellet", "strip"]);
check("GRV: tier 0 a nova alone; Void I a hole that strips armor, no slow; Nova I a slowing aura, no hole; Radiation I pellets, no hole (tier redesign 2026-10-24)", () => {
  const go = sk => run(`(() => { const { t, es, st } = tierLane("grv", ${JSON.stringify(sk)}, [40, 60]); const e = es[0]; e.armor = e.armor0 = 500; G.started = true;
    t.grvShots = GRV_BH_EVERY - 1; novaAt(t, st, e); let slowed = false, pel = 0, sph = 0; /* the hole-leaving shot (GRV_BH_EVERY) */ for (let k = 0; k < 90; k++) { step(1 / 60); t.cd = 1e9; if (e.slowT > 0) slowed = true; pel = Math.max(pel, (t.pellets || []).length); if (k === 40) sph = (t.spheres || []).length; }
    const s = towerStats(t); return { dealt: e.max - e.hp, sph, slowed, armor: e.armor, pel, hole: !!s.hole, aura: !!s.auraOn, name: SKILL_TREES.grv[1].name }; })()`);
  const z = go({}), v = go({ void: 1 }), n = go({ supernova: 1 }), r = go({ radiation: 1 });
  if (!(z.dealt > 0) || z.sph || z.slowed || z.pel || z.armor !== 500) return "tier 0: " + JSON.stringify(z) + " (expected the nova's hit, nothing after)";
  if (!v.hole || !(v.armor < 500) || v.slowed) return "Void I: " + JSON.stringify(v);
  if (n.hole || !n.slowed || n.armor !== 500) return "Nova I: " + JSON.stringify(n);
  if (r.hole || !r.pel) return "Radiation I: " + JSON.stringify(r);
  if (z.name !== "Nova") return "GRV's second axis reads " + z.name + " (expected Nova)";
});

// ---------- IFR ----------
towerTierChecks("ifr", ["fan", "fire", "flare", "hellfire"]);
check("IFR: tier 0 a meteor that just hits; Meteor I a fan of two; Hellfire I one fire riding its enemy; Flare I one flare at the impact (tier redesign 2026-10-24)", () => {
  const go = sk => run(`(() => { const { t, es } = tierLane("ifr", ${JSON.stringify(sk)}, [70]); const e = es[0]; G.started = true;
    let spawned = 0, fires = 0, flares = 0, rides = null; const K = Math.min(45, Math.floor(towerStats(t).chargeS * 60)); for (let k = 0; k < K; k++) { step(1 / 60); // one volley (a faster curve rate would launch the next inside 45 frames)
      spawned = Math.max(spawned, (t.ifrBalls || []).filter(b => b.gen).length); fires = Math.max(fires, (t.ifrFires || []).length); flares = Math.max(flares, (t.ifrFlares || []).filter(f => !f.hf).length);
      if (rides == null && (t.ifrFires || []).length) rides = t.ifrFires[0].eid === e.id; if (e.max > e.hp && (t.ifrBalls || []).length === 0 && k > 30) break; }
    return { dealt: e.max - e.hp, spawned, fires, flares, rides }; })()`);
  const z = go({}), m = go({ meteor: 1 }), h = go({ hellfire: 1 }), f = go({ firaga: 1 });
  if (!(z.dealt > 0) || z.spawned || z.fires || z.flares) return "tier 0: " + JSON.stringify(z) + " (expected a hit and nothing else)";
  if (m.spawned !== 2) return "Meteor I fanned " + m.spawned + " (expected 2)";
  if (h.fires !== 1 || !h.rides) return "Hellfire I: " + JSON.stringify(h) + " (expected one fire riding the struck enemy)";
  if (f.flares !== 1 || f.fires) return "Flare I: " + JSON.stringify(f) + " (expected one flare, no fire)";
});

// ---------- names ----------
check("tier I names: every axis's first hint is named (no placeholder), GRV's second axis is Nova (tier redesign 2026-10-24)", () => {
  const want = { conductivity: "Lead", voltage: "Fork", capacitance: "Charge", focus: "Lance", refraction: "Glint", breach: "Singe", hangar: "Escort", launch: "Line", armament: "Twin",
    temp: "Nip", rime: "Rime", moons: "Crescent", corrosion: "Pit", spray: "Drip", contagion: "Seep", void: "Sink", supernova: "Halo", radiation: "Ember", meteor: "Split", hellfire: "Cinder", firaga: "Flicker" };
  const r = run(`(() => { const out = {}; for (const k in SKILL_TREES) for (const ax of SKILL_TREES[k]) out[ax.id] = ax.tiers.map(x => x.name); return { names: out, nova: SKILL_TREES.grv[1].name }; })()`);
  for (const [id, n] of Object.entries(want)) if (!r.names[id] || r.names[id][0] !== n) return id + " tier I is " + (r.names[id] || [])[0] + " (expected " + n + ")";
  for (const [id, ns] of Object.entries(r.names)) if (ns.length !== 5) return id + " has " + ns.length + " tier names";
  if (r.nova !== "Nova") return "GRV axis 2 is " + r.nova;
});

// ---------- final review fixes (plan 2, 2026-10-24) ----------
const rows = (kind, sk) => run(`(() => { const sk = ${JSON.stringify(sk)}, t = { id: 99, kind: "${kind}", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "${kind}", skills: sk }), skills: sk }, st = towerStats(t, true);
  return { st: { bolts: st.bolts }, rows: Object.fromEntries(SPEC.${kind}(st, t)) }; })()`);
check("review: the card's rows show no mechanic the tower lacks - CRR shields by its bolts, IFR's fire / flares / fan only once bought", () => {
  const c0 = rows("car", {}), c1 = rows("car", { armament: 1 });
  if (c0.rows.Shields !== "−1 / shot" || c1.rows.Shields !== "−2 / shot") return "CRR Shields rows " + c0.rows.Shields + " / " + c1.rows.Shields + " (expected −1, −2)";
  const i0 = rows("ifr", {}).rows, ih = rows("ifr", { hellfire: 1 }).rows, ifl = rows("ifr", { firaga: 1 }).rows;
  for (const k of ["Fire", "Fire flares", "Flare", "Flare burn"]) if (i0[k] !== "—") return "IFR tier 0 " + k + " reads " + i0[k];
  if (i0.Meteors !== "1") return "IFR tier 0 Meteors reads " + i0.Meteors;
  if (ih.Fire === "—" || ifl.Flare === "—") return "IFR Hellfire I / Flare I rows blank";
});
check("review: a SOL without Reflection aims no reflection cone (solHeads)", () => {
  const n = run(`(() => { const { t, es, st } = tierRig("sol", {}, [[40, 0], [70, 20]]); return solHeads(t, st, es[0]).length; })()`);
  if (n !== 0) return "tier 0 SOL aims " + n + " reflection heads";
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
check("review: a hole-less GRV sphere never swallows another GRV's Void hole", () => {
  const r = run(`(() => { G = newGame(); G.towers.push({ id: 901, kind: "grv", x: CX - 50, y: CY }, { id: 902, kind: "grv", x: CX + 50, y: CY });
    const [a, b] = G.towers; a.skills = { radiation: 1 }; a.lvl = 2; b.skills = { void: 1 }; b.lvl = 2;
    const mk = (t, ar) => { const sp = { id: G.id++, x: CX, y: CY, vx: 0, vy: 0, ar, age: 1, mass: 1, apm: ar * ar, hit: new Set(), tick: 0, pel: 0, bh: true, open: true, auraSnd: true, hole: !!towerStats(t, true).hole }; (t.spheres ||= []).push(sp); return sp; };
    const big = mk(a, 90), hole = mk(b, 40); grvPull(a, towerStats(a, true), 1 / 60); grvPull(b, towerStats(b, true), 1 / 60);
    return { holeMerged: !!hole.merged, bigMerged: !!big.merged }; })()`);
  if (r.holeMerged || !r.bigMerged) return "merge: " + JSON.stringify(r) + " (expected the hole to take the hole-less sphere in)";
});

// ---------- the left-for-later list (owner, 2026-10-25: "zero" / "fix all the left for later things") ----------
const statsOf = (kind, sk) => run(`(() => { G = newGame(); const sk = ${JSON.stringify(sk)}; const st = towerStats({ id: 99, kind: "${kind}", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "${kind}", skills: sk }), skills: sk }, true);
  return { critMul: st.critMul, scorch: st.dot ? st.dot.frac : 0, brittle: st.brittle, fireHK: st.fireHK, hfK: st.hfK }; })()`);
check("later: tier I adds no extra numbers the spec does not name - SOL Breach I crit as tier 0, FRZ Sublimation I no Brittle", () => {
  const s0 = statsOf("sol", {}), s1 = statsOf("sol", { breach: 1 }), f1 = statsOf("frz", { temp: 1 });
  if (s1.critMul !== s0.critMul) return "SOL Breach I crit x" + s1.critMul + " (tier 0 x" + s0.critMul + ")";
  if (f1.brittle !== 1) return "FRZ Sublimation I Brittle x" + f1.brittle + " (expected 1)";
});
check("later: a factor on the tower's OWN damage is one constant, on from its first tier (SOL crit + scorch, IFR fire hit + Flare's fire boost)", () => {
  const same = (kind, ax, key, from) => { const v = [1, 2, 3, 4, 5].map(n => statsOf(kind, { [ax]: n })[key]); return v.every(x => x === v[0]) && statsOf(kind, {})[key] === from ? "" : kind + " " + ax + " " + key + " " + JSON.stringify(v) + " (tier 0 " + statsOf(kind, {})[key] + ")"; };
  return same("sol", "breach", "critMul", 3) || same("sol", "breach", "scorch", 0) || same("ifr", "hellfire", "fireHK", statsOf("ifr", { hellfire: 1 }).fireHK) || same("ifr", "firaga", "hfK", 1);
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
  if (!/The jet eats armor/.test(d) || !/The jet leaves/.test(d)) return "no singular jet: " + d;
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
check("ARC's sentence in the owner's words (2026-10-25): \"Two bolts of lightning.\" / Conductivity \"chains\" / Voltage \"forks for X% damage every chain\"; FRZ tier 0 \"slows and deals X% damage\"", () => {
  const r = run(`[describeTower("arc", {}), describeTower("arc", { voltage: 1 }), Math.round(ARC_VOLTAGE_FALL[1] * 100), describeTower("arc", { conductivity: 1 }), describeTower("arc", { conductivity: 1, voltage: 1 }), describeTower("frz", {}), Math.round(FRZ_NIP * 100)]`);
  if (r[0] !== "Two bolts of lightning.") return "tier 0: " + r[0];
  if (r[1] !== "Two bolts of lightning that fork for " + r[2] + "% damage every chain.") return "Voltage I: " + r[1];
  if (!/that chain once for \d+% damage after striking\.$/.test(r[3])) return "Conductivity I: " + r[3];
  if (!/that chain once and fork for \d+% damage every chain\.$/.test(r[4])) return "Conductivity I + Voltage I: " + r[4];
  if (!r[5].includes("slows enemies by") || !r[5].endsWith(" and deals " + r[6] + "% damage.")) return "FRZ tier 0: " + r[5];
});
