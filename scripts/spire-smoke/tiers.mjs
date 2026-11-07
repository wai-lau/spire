// /spire TIER CHECKS (tier redesign, plan 2, 2026-10-24): the stat curve and each tower's tier 0 / tier I. Registered into the
// smoke harness; smoke.mjs imports this file before it reports. Its own page env, so the smoke checks' game state never leaks in.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT, boot, check } from "./harness.mjs";

const { run } = boot();
const CURVE_DONE = ["arc", "sol", "crr", "frz", "acd", "grv", "ifr"]; // the kinds whose stats run on the curve (each tower task adds its own)

check("curve: by total level alone, rising, each level's hit BELOW 2x the level before - each tower its OWN growth (owner, 2026-11-01: \"get the early damage even lower and allow the curve to not be exactly 1.5x / just keep it below 2x for any level\" - replaces 2026-10-28's \"slightly steepening\"; \"towers each having their own curve is fine\", 2026-10-28)", () => {
  const r = run(`(() => { const out = {}; for (const k in STAT_CURVE) { const d = []; for (let L = 0; L <= SKILL_POINTS; L++) d.push(curveAt(k, L).dmg); out[k] = d; } return out; })()`);
  // still ABOVE 2x on 7.1.12 (CRR's tier-0 hit x6.45): its own curve is the CRR rework's job - the list may only shrink
  const PENDING = []; // CRR came under 2x with its geometric curve (2026-11-02)
  for (const [k, d] of Object.entries(r)) {
    for (let i = 1; i < d.length; i++) if (!(d[i] > d[i - 1])) return k + " not rising at L" + i;
    if (!PENDING.includes(k)) for (let i = 1; i < d.length; i++) if (!(d[i] < 2 * d[i - 1])) return k + " x" + (d[i] / d[i - 1]).toFixed(2) + " at L" + i;
  }
  if (Object.keys(r).length !== 7) return "STAT_CURVE covers " + Object.keys(r).join(",");
  const same = run(`(() => { const lv = sk => towerLevel({ kind: "arc", skills: sk }); return [lv({ conductivity: 2, voltage: 1 }), lv({ capacitance: 3 }), lv({})]; })()`);
  if (JSON.stringify(same) !== "[3,3,0]") return "towerLevel reads " + same + " (expected every point the same: 3, 3, 0)";
});
check("ACD goo in percentages: strip a share of the picker's CURRENT armor and deal a share of the ACD's td, each <= 8x, each step <= 2x, rising (owner, 2026-11-01, picked \"1\" for the goo; \"Nothing should ever be above like 800%\", \"no level damage steps above 2x\")", () => {
  const [a, b] = run(`[ACD_GOO_STRIP.slice(), ACD_GOO_DMG.slice()]`);
  for (const [n, v] of [["ACD_GOO_STRIP", a], ["ACD_GOO_DMG", b]]) {
    if (v.length !== 6 || v[0] !== 0 || v.some(x => x > 8) || v.some((x, k) => k > 1 && (x < v[k - 1] || x > 2 * v[k - 1]))) return n + " " + JSON.stringify(v);
  }
});
check("IFR Flare: a flare's ticks (its whole burn) never more than 2x the tier before, 0..V (owner, 2026-11-01: \"no level damage steps above 2x\"; live went 2 s -> 6 s at IV)", () => {
  const n = run(`IFR_BURN_S.map((b, i) => Math.floor(Math.min(EFFECT_MAX_S, b) / IFR_TICK_S[i] + 1e-9))`);
  if (n.length !== 6 || n.some((v, k) => k && (v < n[k - 1] || v > 2 * n[k - 1]))) return "ticks a flare by tier " + JSON.stringify(n);
});
check("CRR: at most 30 volleys a sortie and at most 3 bolts a volley (fired at once) at every Armament tier, rising (owner, 2026-11-01: \"volleys per sortie should never go above 30\" / \"My intent with volleys was to describe the number of bolts fired at once ... It should not go above 3\")", () => {
  const [a, b] = run(`[CRR_AMMO.slice(), CRR_BOLTS_BY.slice()]`);
  if (a.length !== 6 || a.some(v => v > 30) || a.some((v, k) => k && v < a[k - 1])) return "CRR_AMMO " + JSON.stringify(a);
  if (b.length !== 6 || b.some(v => v > 3) || b.some((v, k) => k && v < b[k - 1])) return "CRR_BOLTS_BY " + JSON.stringify(b);
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
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/aspira-sim/sim.mjs"), '{"mix":{"arc":1,"crr":1}}', "1", "2"], { encoding: "utf8", timeout: 120000 });
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
    const r = run(`(() => { const b = TOWERS.${kind}, c = curveAt("${kind}", 1), out = [], kd = "${kind}" === "sol" ? SOL_DMG_K : 1, kr = "${kind}" === "sol" ? SOL_RATE_K : 1; /* SOL: fewer, harder shots off its curve (owner, 2026-10-31) */
      for (const ax of SKILL_TREES.${kind}) { const s = towerStats({ id: 99, kind: "${kind}", x: CX, y: CY, lvl: 2, skills: { [ax.id]: 1 } }, true);
        out.push([ax.id, s.dmgCurve / (b.dmg * c.dmg * kd), s.rateCurve / (b.rate * c.rate * kr), s.range / (b.range * RANGE_BONUS * c.range)]); } return out; })()`);
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
check("ARC: tier 0 strikes one enemy and chains once (owner, 2026-10-28); Conductivity I chains twice; Voltage I forks the strike three ways (VOLT_FORK x1.5, axis balance 2026-10-25); Capacitance I chains once too", () => {
  const n = sk => run(`(() => { const { t, es, st } = tierRig("arc", ${JSON.stringify(sk)}, [[60, 0], [60, 30], [60, -30], [90, 20], [30, -20], [100, -40]]); /* [100, -40]: further out, for the fork's second way (jumps go only outward, 2026-11-06) */
    fireSkillChain(t, st, es[0]); for (let i = 0; i < 30; i++) stepChains(0.05); return ${hitCount("es")}; })()`);
  const r = [n({}), n({ conductivity: 1 }), n({ voltage: 1 }), n({ capacitance: 1 })];
  if (r[0] !== 3 || r[1] !== 3 || r[3] !== 3 || !(r[2] > 3)) return "enemies hit (tier 0, Amp I, Volt I, Res I): " + r + " (expected 3, 3, more, 3: owner 2026-10-29 \"ARC 0: one chain (hits 3)\"; Voltage I forks and chains more - Wai, 2026-11-01, the ARC brief: \"ARC remove slow to make worse vs fast / Increase chaining/forking to make good vs swarm\")";
});

check("ARC: every jump goes further out (owner, 2026-11-06: \"for each subsequent arc, it can only choose targets that are radially further from ARC tower vertex that fired it\") - each hop or fork lands on an enemy further from the firing vertex than the one it leaves", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("arc", { voltage: 3, conductivity: 2 }, [[60, 0], [60, 30], [60, -30], [90, 20], [30, -20], [80, -10], [50, 15], [120, 0], [20, 40]]);
    const pairs = [], _h = skillHopTo; let c0 = null; skillHopTo = (c, node, nxt, depth) => { c0 = c; pairs.push([node.e, nxt]); return _h(c, node, nxt, depth); };
    try { fireSkillChain(t, st, es[0]); for (let i = 0; i < 30; i++) stepChains(0.05); } finally { skillHopTo = _h; }
    const d = e => Math.hypot(e.x - c0.vx, e.y - c0.vy); return { n: pairs.length, bad: pairs.filter(([a, b]) => !(d(b) > d(a))).length, inward: es.filter(e => e.hp < e.max && d(e) < d(es[0])).length }; })()`);
  if (!(r.n >= 2) || r.bad || r.inward) return JSON.stringify(r) + " (expected 2+ jumps, none to an enemy no further out, nothing inside the first target hit)";
});

check("ARC Conductivity V GROUNDING (owner, 2026-11-06: \"arc ones are good\"): the last hop of each chain bursts - every enemy within 40 u of it the bolt had not struck takes a hit, none outside does, and tier IV has no burst", () => {
  const r = run(`(() => { const spots = [[60, 0], [100, 0], [100, 30], [100, -30], [110, 10], [90, -20], [60, 40], [400, 0]];
    const once = c => { const { t, es, st } = tierRig("arc", { conductivity: c, voltage: 1 }, spots), snap = [], _g = arcGround;
      arcGround = (cc, node) => { if (cc.st.ground && node.up && !node.grounded) snap.push({ at: node.e, ids: G.enemies.filter(o => !o.dead && !cc.seen.has(o.id) && Math.hypot(o.x - node.e.x, o.y - node.e.y) <= ARC_GROUND_R).map(o => o.id), far: G.enemies.filter(o => Math.hypot(o.x - node.e.x, o.y - node.e.y) > ARC_GROUND_R).map(o => o.id) }); return _g(cc, node); };
      let before; try { fireSkillChain(t, st, es[0]); before = G.enemies.filter(o => o.hp < o.max).map(o => o.id); for (let i = 0; i < 40; i++) stepChains(0.05); } finally { arcGround = _g; }
      const hurt = new Set(G.enemies.filter(o => o.hp < o.max).map(o => o.id));
      return { snaps: snap.length, inMiss: snap.reduce((n, x) => n + x.ids.filter(id => !hurt.has(id)).length, 0), inN: snap.reduce((n, x) => n + x.ids.length, 0), farHit: es[7].hp < es[7].max, hurt: hurt.size }; };
    return { v: once(5), iv: once(4) }; })()`);
  if (!(r.v.snaps >= 1) || !(r.v.inN >= 1)) return "Grounding V: no burst caught an unhit enemy within 40 u (" + JSON.stringify(r.v) + ")";
  if (r.v.inMiss || r.v.farHit) return "Grounding V: an enemy in the burst took no hit, or the one 400 u out did (" + JSON.stringify(r.v) + ")";
  if (r.iv.snaps) return "Conductivity IV bursts (" + JSON.stringify(r.iv) + ")";
});

check("ARC Voltage V STORM (owner, 2026-11-06): every 5th strike a tower throws forks 3 ways at the strike, strikes 1-4 fork 2; Voltage IV never forks 3", () => {
  const r = run(`(() => { const forks = v => { const { t, es, st } = tierRig("arc", { voltage: v }, [[60, 0], [100, 20], [100, -20], [140, 0]]); const out = [];
      for (let i = 0; i < 10; i++) { G.chains = []; fireSkillChain(t, st, es[0], null); out.push(G.chains.filter(p => !p.node.up).length); } return out; };
    return { v: forks(5), iv: forks(4) }; })()`);
  if (JSON.stringify(r.v) !== JSON.stringify([2, 2, 2, 2, 3, 2, 2, 2, 2, 3])) return "Voltage V forks per strike: " + r.v + " (expected 2 2 2 2 3, twice over)";
  if (r.iv.some(n => n !== 2)) return "Voltage IV forks per strike: " + r.iv;
});

check("ARC Shock V (owner, 2026-11-06: \"shock V should apply the dead shocked enemy debuffs from ARC to all nearby enemies, zap goes to all affected\"): a Shocked enemy's death passes the mark to every enemy within the radius (a zap each), none outside; Shock IV passes nothing", () => {
  const r = run(`(() => { const go = z => { const { t, es, st } = tierRig("arc", { capacitance: z }, [[60, 0], [100, 0], [130, 20], [300, 0]]);
      fireSkillChain(t, st, es[0]); for (const e of [es[1], es[2], es[3]]) { e.shockT = 0; e.shockPass = false; e.arcBurn = null; }
      const b0 = fx.length; kill(es[0], t); const zaps = fx.slice(b0).filter(f => f.k === "beam").length;
      return { src: es[0].shockPass === true || z < 5, near: [es[1], es[2]].every(e => e.shockT > 0), far: es[3].shockT > 0, zaps }; };
    return { v: go(5), iv: go(4) }; })()`);
  if (!r.v.src || !r.v.near || r.v.far || r.v.zaps !== 2) return "Shock V: " + JSON.stringify(r.v) + " (expected both near enemies shocked, the 300 u one not, 2 zaps)";
  if (r.iv.near || r.iv.zaps) return "Shock IV passes its mark: " + JSON.stringify(r.iv);
});

check("targeting STRENGTHS (owner, 2026-11-06: \"replace Biggest with Strengths, order enemies by mark tier (try to kill enemies for which the tower's tier with most checks first, and most X last)\"): a tower picks the type its build card marks highest first and its worst-marked type last; within a type the most HP; an old save's \"biggest\" reads the same", () => {
  const r = run(`(() => { const out = []; for (const kind of ["arc", "sol", "acd", "frz"]) {
      const { t, st } = tierRig(kind, {}, []); t.mode = "strengths"; const types = ["swarm", "fast", "shield", "armor"];
      const es = types.flatMap((ty, i) => [0, 1].map(j => { spawnEnemy(ty, 30, 0, 0); const e = G.enemies[G.enemies.length - 1];
        e.x = t.x + 20 + 4 * i; e.y = t.y + 10 * j; e.seen = true; e.stunT = 1e9; e.hp = e.max = 100 + 50 * j; return e; }));
      const order = pickTargets(t, { ...st, range: 1e4 }, es.length), m = e => (VS_MARKS[kind] || {})[e.type] || 0;
      const best = Math.max(...types.map(ty => (VS_MARKS[kind] || {})[ty] || 0)), worst = Math.min(...types.map(ty => (VS_MARKS[kind] || {})[ty] || 0));
      t.mode = "biggest"; const old = pickTargets(t, { ...st, range: 1e4 }, 1)[0];
      out.push({ kind, first: order[0].type, fm: m(order[0]), best, hp: order[0].hp, last: m(order[order.length - 1]), worst, sorted: order.every((e, i) => !i || m(order[i - 1]) >= m(e)), alias: old === order[0] }); } return out; })()`);
  const bad = r.filter(x => x.fm !== x.best || x.last !== x.worst || !x.sorted || x.hp !== 150 || !x.alias);
  if (bad.length) return JSON.stringify(bad);
  const boss = run(`(() => { const { t, st } = tierRig("arc", {}, []); t.mode = "strengths"; const best = ["swarm", "fast", "shield", "armor"].sort((a, b) => ((VS_MARKS.arc || {})[b] || 0) - ((VS_MARKS.arc || {})[a] || 0))[0];
    spawnEnemy(best, 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; e.x = t.x + 20; e.y = t.y; e.seen = true; e.hp = e.max = 1e6;
    spawnEnemy("armor", 30, 0, 0); const b = G.enemies[G.enemies.length - 1]; b.x = t.x + 24; b.y = t.y; b.seen = true; b.hp = b.max = 10; b.arcana = "star";
    return pickTargets(t, { ...st, range: 1e4 }, 1)[0] === b; })()`);
  if (!boss) return "a boss is not first under Strengths (owner, 2026-11-06: \"boss always top prio under strengths\")";
});

check("ARC: no enemy is struck twice by the bolts of one attack (owner, 2026-10-28: \"reduce the number of arc hits\" - one hit set an attack); Capacitance's bursts may re-hit", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("arc", { voltage: 3 }, [[60, 0], [60, 30], [60, -30], [90, 20], [30, -20], [80, -10], [50, 15]]);
    const n = new Map(), _d = damage; damage = (e, ...a) => { n.set(e.id, (n.get(e.id) || 0) + 1); return _d(e, ...a); };
    try { fire(t, st); for (let i = 0; i < 30; i++) stepChains(0.05); } finally { damage = _d; } return { bolts: st.fork ? 2 : 1, most: Math.max(0, ...n.values()), hit: n.size }; })()`);
  if (!(r.bolts > 1)) return "Voltage III makes " + r.bolts + " chain(s) (expected the strike to fork, to test)";
  if (r.hit < 2) return "the attack hit " + r.hit + " enemies (expected several - is damage() still the hit path?)";
  if (r.most !== 1) return "an enemy took " + r.most + " hits from one attack of " + r.bolts + " bolts (expected 1: the bolts share one hit set)";
});

// ---------- SOL ----------
towerTierChecks("sol", ["diffract", "scorch", "break", "prism", "refract", "intensity"]);





check("SOL's scorch stacks burn independently (owner, 2026-10-26): two stacks pop two shield charges in a tick's time, one each", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", { focus: 1 }, [[60, 0]]); const e = es[0]; e.hp = e.max = 1e9; e.shield = e.shieldMax = 50;
    (e.dots ||= []).push({ d: st.dmg * st.dot.k, left: st.dot.n, acc: 0, src: t }); e.dotT = Math.max(e.dotT || 0, st.dot.t); (e.dots ||= []).push({ d: st.dmg * st.dot.k, left: st.dot.n, acc: 0, src: t }); e.dotT = Math.max(e.dotT || 0, st.dot.t); const s0 = e.shield; solScorchTick(e, SOL_SCORCH_Q + 1e-6); return s0 - e.shield; })()`);
  if (r !== 2) return r + " charges popped (expected 2: a stack, a pop)";
});


check("SOL's burns tick IN THE GAME LOOP (a stack once sat untouched: dotT lost, 2026-10-26): one Scorch I burn pops shield charges as the game steps", () => {
  const r = run(`(() => { const { t, es, st } = tierRig("sol", { focus: 1 }, [[60, 0]]); const e = es[0]; e.hp = e.max = 1e9; e.shield = e.shieldMax = 50;
    (e.dots ||= []).push({ d: st.dmg * st.dot.k, left: st.dot.n, acc: 0, src: t }); e.dotT = Math.max(e.dotT || 0, st.dot.t); const s0 = e.shield; for (let i = 0; i < 30; i++) step(1 / 60); return s0 - e.shield; })()`);
  if (!(r >= 4)) return r + " charges popped in 0.5 s (expected about 5)";
});

// ---------- CRR ----------
towerTierChecks("crr", ["tether", "circling", "wingmate"]);
check("CRR: tier 0 ten interceptors, all held in orbit when ready (owner, 2026-11-04: \"needing more interceptors\", x2; \"make CRR ready interceptors wait in orbit around the tower\"; five from 2026-11-04: \"b\" - x0.6 with the stuck-interceptor fix; eight from 2026-11-01: \"Add more interceptors to compensate\" for the slower flight; three before), no tether, one bolt a volley, six volleys a sortie (owner, 2026-10-28); Hangar I seven, some held; Tether I one tether at most; Armament I two bolts, same volley (tier redesign 2026-10-24)", () => {
  const st = sk => run(`(() => { const s = towerStats({ id: 99, kind: "crr", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "crr", skills: ${JSON.stringify(sk)} }), skills: ${JSON.stringify(sk)} }, true); return { wing: s.wing, hold: s.hold, tSlow: s.tSlow, tetherN: s.tetherN, bolts: s.bolts, ammo: s.ammo, dmg: s.dmg / s.dmgCurve }; })()`);
  const z = st({}), h = st({ hangar: 1 }), a = st({ armament: 1 });
  if (z.wing !== 10 || z.tSlow !== 0 || z.bolts !== 1 || z.hold !== z.wing) return "tier 0 " + JSON.stringify(z);
  if (z.ammo !== 8 || a.ammo !== 16) return "volleys a sortie: tier 0 " + z.ammo + ", Armament I " + a.ammo + " (expected 8 and 16 - x2, owner 2026-11-05: \"fire for longer\"; before: 4 and 8, the owner's table with mid tiers 8/12/16 (owner, 2026-11-02: \"Yes\", after the 8-seed good: 58% won, CRR 44%); was 4 and 6, 2026-11-01; was 18 and 23 - owner, 2026-10-29: x3 the bolts at a third the damage; was 6 and 8, 2026-10-28: \"interceptor should start with 6 ammo\")";
  if (h.wing !== 15 /* +1 (2026-11-06; was 14) */ || h.hold !== h.wing) return "Hangar I " + JSON.stringify(h);
  if (a.bolts !== 1 || Math.abs(a.dmg / z.dmg - 2) > 1e-9 /* (1.3 / 0.65 since 2026-11-05) */) return "Armament I " + JSON.stringify(a) + " (expected ONE bolt a volley carrying two bolts' damage - owner, 2026-11-05: \"C10\")";
  const n = run(`(() => { const { t } = tierLane("crr", { hangar: 3, launch: 1 }, [90, 120, 150, 170]); /* held ON the lane (a stepped game re-reads a spot from it) */
    G.started = true; G.nextIn = 1e9; G.spawns = []; /* the rig's enemies alone - no real wave */ let most = 0, ever = 0;
    for (let k = 0; k < 600; k++) { step(1 / 60); const st = towerStats(t), c = t.icp.filter(i => carTethered(t, i, st)).length; most = Math.max(most, c); ever += c; } /* AT ONCE: tethered at a frame's end (a frame runs several steps, and which one rides it moves - 2026-10-26) */ return [most, ever]; })()`);
  if (n[0] !== 1) return "Tether I: " + n[0] + " interceptors tethered at once (expected 1 - " + n[1] + " tether steps in all)"; // at most ONE at a time; which one rides it moves (carTethered, 2026-10-25)
});

check("CRR Hangar V retargets: an interceptor whose target dies with ammo left picks a fresh enemy, at most CRR_RETARGETS (2) times a sortie, then goes home; below Hangar V it goes home at once (owner, 2026-11-06: \"Hangar V, retargets up to 2 times\")", () => {
  const go = hangar => run(`(() => { const { t, es, st } = tierLane("crr", { hangar: ${hangar} }, [90, 110, 130, 150]); G.started = true; G.nextIn = 1e9; G.spawns = []; step(1 / 60);
    const i = t.icp[0], seq = []; i.state = "out"; i.e = es[0]; i.ammo = 99; i.rt = 0; i.hold = false; i.x = es[0].x; i.y = es[0].y; i.orb = true;
    for (let k = 0; k < 400 && i.state === "out"; k++) { if (i.e && !i.e.dead) { if (!seq.includes(i.e)) seq.push(i.e); i.e.dead = true; } stepIcp(i, t, towerStats(t), 1 / 60); }
    return { targets: seq.length, rt: i.rt, state: i.state, retargets: towerStats(t).retargets }; })()`);
  const v = go(5), iv = go(4);
  if (v.retargets !== 2 || v.targets !== 3 || v.rt !== 2 || v.state === "out") return "Hangar V " + JSON.stringify(v) + " (expected 3 targets in a sortie, 2 retargets, then home)";
  if (iv.retargets !== 0 || iv.targets !== 1 || iv.state === "out") return "Hangar IV " + JSON.stringify(iv) + " (expected no retarget: one target, then home)";
});
check("CRR Armament V bursts on EVERY way home: a forced return with ammo left throws CRR_BURST_N pellets, deterministically; below V none (owner, 2026-11-06: \"Arms, explodes into pellets if about to return to base for any reason\")", () => {
  const go = armament => run(`(() => { const { t, es } = tierLane("crr", { armament: ${armament} }, [90]); G.started = true; G.nextIn = 1e9; G.spawns = []; step(1 / 60);
    const i = t.icp[0]; i.state = "out"; i.e = es[0]; i.ammo = 3; i.hold = false; i.x = es[0].x; i.y = es[0].y; i.orb = true; t.carPellets = []; es[0].dead = true;
    stepIcp(i, t, towerStats(t), 1 / 60); return { n: (t.carPellets || []).length, a: (t.carPellets || []).map(p => Math.round(Math.atan2(p.vy, p.vx) * 1e4)), state: i.state, pops: (t.carPops || []).length }; })()`);
  const v = go(5), v2 = go(5), iv = go(4);
  if (v.n !== 10 || v.state !== "home" || v.pops !== 1) return "Armament V " + JSON.stringify(v) + " (expected 10 pellets, a pop, rebuilt at home)";
  if (JSON.stringify(v.a) !== JSON.stringify(v2.a)) return "the pellet angles differ between two identical runs (Math.random crept back)";
  if (iv.n !== 0 || iv.state !== "back") return "Armament IV " + JSON.stringify(iv) + " (expected no pellets, flying home)";
});

// ---------- FRZ ----------
towerTierChecks("frz", ["hurts", "pulse", "moon", "more damage"]);
check("FRZ: tier 0 slows and nips, flat (owner 2026-10-25); Fracture I hurts, more the slower; Permafrost I pulses frost and crack no armor (owner, 2026-10-29); Moons I one moon (tier redesign 2026-10-24)", () => {
  const go = (sk, extra = "") => run(`(() => { const { t, es } = tierLane("frz", ${JSON.stringify(sk)}, [30]); const e = es[0]; e.armor = e.armor0 = 40; G.started = true;
    let slowed = false; for (let k = 0; k < 180; k++) { ${extra} step(1 / 60); if (e.slowT > 0 && e.slowF > 0) slowed = true; }
    return { dealt: e.max - e.hp, slowed, frost: frostShare(e), crack: towerStats(t).rimeCrack || 0, moons: towerStats(t).moonN || 0 }; })()`);
  const z = go({}), s = go({ temp: 1 }), sx = go({ temp: 1 }, `applySlow(e, 0.5, 0.2, "test");`), p = go({ rime: 1 }), m = go({ moons: 1 });
  if (!z.slowed || !(z.dealt > 0)) return "tier 0: " + JSON.stringify(z) + " (expected a slow and a nip)";
  const zx = go({}, `applySlow(e, 0.5, 0.2, "test");`);
  if (zx.dealt > z.dealt * 1.01) return "tier 0 nip: " + zx.dealt + " slowed vs " + z.dealt + " (expected flat - more the slower is Fracture's)";
  if (!(s.dealt > z.dealt * 2)) return "Fracture I: " + s.dealt + " vs the tier 0 nip " + z.dealt + " (expected the full hurt, well past a nip)";
  if (!(s.dealt > 0)) return "Fracture I dealt nothing";
  if (!(sx.dealt > s.dealt)) return "Fracture I: " + sx.dealt + " slowed vs " + s.dealt + " (expected more on the slower)";
  if (z.frost > 0) return "tier 0 frosted " + z.frost;
  if (!(p.frost > 0 && p.crack === 0)) return "Permafrost I: frost " + p.frost + ", crack " + p.crack + " (expected a pulse's frost that cracks NO armor - owner 2026-10-29: FRZ \"no armor reduction effects\")";
  if (m.moons !== 1) return "Moons I: " + m.moons + " moons";
});

// ---------- ACD ----------
towerTierChecks("acd", ["pool", "puddle", "slow", "spread"]);
check("ACD: tier 0 one ray, no pools, kills leave none; Flow I two rays + carry; Spill I a ray-dripped pool that does NOT slow (owner, 2026-10-29: \"no slows\"), no kill pools; Corrosion I eats armor (tier redesign 2026-10-24)", () => {
  const st = sk => run(`(() => { const s = towerStats({ id: 99, kind: "acd", x: CX, y: CY, lvl: 1 + towerLevel({ kind: "acd", skills: ${JSON.stringify(sk)} }), skills: ${JSON.stringify(sk)} }, true); return { lines: s.targets, carry: s.carry, pools: !!s.contagion, slow: s.burnSlow || 0, corrode: s.corrode || 0 }; })()`);
  const pools = (sk, kill) => run(`(() => { const { t, es } = tierLane("acd", ${JSON.stringify(sk)}, [30, 45]); G.started = true; ${kill ? "es[0].hp = es[0].max = 5;" : ""}
    let slowed = false; for (let k = 0; k < 240; k++) { step(1 / 60); if (es[1].slowT > 0) slowed = true; } return { n: (t.puddles || []).length, spread: (t.puddles || []).filter(p => p.spread).length, slowed }; })()`);
  const z = st({}), f = st({ spray: 1 }), c = st({ contagion: 1 }), k = st({ corrosion: 1 });
  if (z.lines !== 1 || z.pools || z.carry || z.slow) return "tier 0 " + JSON.stringify(z);
  if (f.lines !== 2 || !(f.carry > 0)) return "Flow I " + JSON.stringify(f);
  if (!c.pools || c.slow) return "Spill I " + JSON.stringify(c) + " (expected pools, no slow)";
  if (!(k.corrode > 0)) return "Corrosion I " + JSON.stringify(k);
  const z0 = pools({}, true), c1 = pools({ contagion: 1 }, true);
  if (z0.n) return "tier 0 left " + z0.n + " pools";
  if (!c1.n || c1.spread || c1.slowed) return "Spill I pools " + JSON.stringify(c1) + " (expected ray pools that do not slow, none from kills)";
});

// ---------- GRV ----------
towerTierChecks("grv", ["aura", "strip"]); // (its tiny void and the pellets it sheds ARE tier 0 - GRV rework 2026-10-25)
check("GRV rework (owner, 2026-10-25): tier 0 a tiny void that sheds pellets - no nova, aura or strip; Nova I novas that strip armor; Void I a bigger void that sheds pellets; Gravity Well I an aura that slows, pellets too", () => {
  const go = sk => run(`(() => { const { t, es, st } = tierLane("grv", ${JSON.stringify(sk)}, [40, 60]); const e = es[0]; e.armor = e.armor0 = 500; G.started = true;
    novaAt(t, st, e); let slowed = false, pel = 0, sph = 0; /* the hole-leaving shot (GRV_BH_EVERY) */ for (let k = 0; k < 90; k++) { step(1 / 60); t.cd = 1e9; if (e.slowT > 0) slowed = true; pel = Math.max(pel, (t.pellets || []).length); if (k === 40) sph = (t.spheres || []).length; }
    const s = towerStats(t); return { dealt: e.max - e.hp, sph, slowed, armor: e.armor, pel, hole: !!s.hole, aura: !!s.auraOn, voidR: s.auraR, name: SKILL_TREES.grv[1].name, acc: SKILL_TREES.grv[2].name }; })()`);
  const z = go({}), v = go({ void: 1 }), n = go({ supernova: 1 }), r = go({ radiation: 1 });
  if (!(z.dealt > 0) || !z.sph || z.slowed || z.armor !== 500 || !z.pel) return "tier 0: " + JSON.stringify(z) + " (expected a void that crushes and sheds pellets, no slow or strip)";
  if (!(v.voidR > z.voidR) || v.slowed || v.armor !== 500 || !v.pel) return "Void I: " + JSON.stringify(v);
  if (!(n.armor < 500) || n.slowed) return "Nova I: " + JSON.stringify(n);
  if (!r.slowed || !r.aura || !r.pel) return "Gravity Well I: " + JSON.stringify(r);
  if (z.name !== "Nova" || z.acc !== "Gravity Well") return "GRV's axes read " + z.name + " / " + z.acc;
});

// ---------- IFR ----------
towerTierChecks("ifr", ["fan", "flare", "hellfire"]); // ("fire": its wall of fire IS tier 0 - owner, 2026-11-05)
check("IFR: tier 0 a meteor that hits and bursts into 6 (owner, 2026-10-26) and grows the fire's circle, lighting no flares, out the moment it is full (owner, 2026-11-05); Meteor I stores two in orbit, the burst still 6; Hellfire I one fire riding its enemy; Flare I one flare at the impact", () => {
  const go = sk => run(`(() => { const { t, es } = tierLane("ifr", ${JSON.stringify(sk)}, [70]); const e = es[0]; G.started = true;
    let spawned = 0, fires = 0, flares = 0, hf = 0, rides = null, stale = 0; const K = Math.min(45, Math.floor(towerStats(t).chargeS * 60)); for (let k = 0; k < K; k++) { const full = (t.ifrFires || []).filter(f => f.r >= f.R); step(1 / 60); stale += full.filter(f => t.ifrFires.includes(f)).length; // one volley (a faster curve rate would launch the next inside 45 frames)
      spawned = Math.max(spawned, (t.ifrBalls || []).filter(b => b.gen).length); fires = Math.max(fires, (t.ifrFires || []).length); flares = Math.max(flares, (t.ifrFlares || []).filter(f => !f.hf).length); hf = Math.max(hf, (t.ifrFlares || []).filter(f => f.hf).length);
      if (rides == null && (t.ifrFires || []).length) rides = t.ifrFires[0].eid === e.id; if (e.max > e.hp && (t.ifrBalls || []).length === 0 && k > 30) break; }
    return { dealt: e.max - e.hp, spawned, fires, flares, hf, rides, stale }; })()`);
  const z = go({}), m = go({ meteor: 1 }), h = go({ hellfire: 1 }), f = go({ firaga: 1 });
  if (!(z.dealt > 0) || z.spawned !== 6 || z.fires < 1 || !z.rides /* (>= 1: a half-distance shard may light its own fire inside the window, 2026-11-05) */ || z.flares || z.hf || z.stale) return "tier 0: " + JSON.stringify(z) + " (expected a hit, a burst of 6, one fire riding its enemy that lights no flares and is gone the frame after it is full; no Flare flare)";
  if (m.spawned !== 6) return "Meteor I burst " + m.spawned + " (expected 6: Meteor never grows the burst below its capstone)";
  const sto = run(`[towerStats({ kind: "ifr", lvl: 1, skills: {} }).store, towerStats({ kind: "ifr", lvl: 2, skills: { meteor: 1 } }).store]`);
  if (sto[0] !== 1 || sto[1] !== 2) return "IFR stored in orbit " + sto + " (expected 1, 2)";
  if (h.fires < 1 || !h.rides) return "Hellfire I: " + JSON.stringify(h) + " (expected one fire riding the struck enemy)";
  if (f.flares !== 1 || f.hf) return "Flare I: " + JSON.stringify(f) + " (expected one flare, no fire flares)";
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
check("review: the card's rows show no mechanic the tower lacks - no Shields row (any damage pops one charge, unsaid: owner 2026-10-26), IFR's fire flares / flares / fan only once bought (the fire's circle is tier 0 since 2026-11-05)", () => {
  for (const k of ["crr", "sol"]) if ("Shields" in rows(k, {}).rows) return k + " still shows a Shields row";
  const i0 = rows("ifr", {}).rows, ih = rows("ifr", { hellfire: 1 }).rows, ifl = rows("ifr", { firaga: 1 }).rows;
  if (i0.Fire === "—") return "IFR tier 0 Fire row blank (the circle is tier 0, owner 2026-11-05)";
  for (const k of ["Fire flares", "Flare length", "Flare width", "Flare tick", "Flare ticks", "Flare lasts"]) if (i0[k] !== "—") return "IFR tier 0 " + k + " reads " + i0[k];
  if (i0.Burst !== "6 meteors") return "IFR tier 0 Burst reads " + i0.Burst;
  if (ih.Fire === "—" || ifl["Flare length"] === "—") return "IFR Hellfire I / Flare I rows blank";
});
check("ARC's card rows follow the redesign (2026-10-29): no charge or burst rows, Shock's slow and strip read from its tables, the fork counted in Hits", () => {
  const r0 = rows("arc", {}).rows, rv = rows("arc", { voltage: 2 }).rows, rz = rows("arc", { capacitance: 3 }).rows;
  for (const k of ["Bolts", "Charges", "Charge pop", "Pop burst", "Burst slow", "Burst lasts"]) if (k in r0) return "still a " + k + " row";
  const j0 = run("ARC_VOLT_JUMPS[0]"), j2 = run("ARC_VOLT_JUMPS[2]"), sl = run("Math.round(ARC_RES_SLOW[3] * 100)"), sp = run("Math.round(ARC_RES_STRIP[3] * 100)");
  if (r0.Hits !== 1 + j0 + " a bolt" || r0.Forks !== "—" || (r0["Res slow"] ?? "—") !== "—" || r0.Shocked !== "—") return "tier 0: " + JSON.stringify(r0);
  if (rv.Hits !== 1 + 2 * j2 + " a bolt" || rv.Forks !== "once") return "Voltage II: " + JSON.stringify(rv);
  const am = run("Math.round(ARC_SHOCK_AMP[3] * 100)"); /* Res slow / Res lasts show only while Shock slows (none since the ARC brief, 7.1.16) */
  if ((rz["Res slow"] ?? "—") !== (sl ? sl + "%" : "—") || rz["Armor strip"] !== sp + "% of armor" || rz.Shocked !== "+" + am + "% from ARC") return "Shock III: " + JSON.stringify(rz);
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
check("FRZ Fracture V LINGERING COLD (owner, 2026-11-06: \"yes all FRZ\"): an enemy that left the aura still takes the Fracture x 1.9 s later, not 2.1 s later; Fracture IV never lingers", () => {
  const r = run(`(() => { const go = temp => { const { t, es } = tierLane("frz", { temp }, [50]), e = es[0]; e.stunT = 1e9; const x0 = t.x;
      for (let i = 0; i < 4; i++) { frzStep(t, 0.05); stepEnemies(0.05); }
      const inAura = e.slowT > 0; t.x = x0 + 5000; const out = {};
      for (let i = 1; i <= 42; i++) { frzStep(t, 0.05); stepEnemies(0.05); if (i === 38 || i === 42) { const h = e.hp; damage(e, 1000, t, true); out[i] = (h - e.hp) / 1000; } }
      return { inAura, brittle: e.brittle, x38: out[38], x42: out[42] }; };
    return { v: go(5), iv: go(4) }; })()`);
  if (!r.v.inAura || !(r.v.brittle > 1)) return "Lingering cold: the rig's enemy was never fractured (" + JSON.stringify(r.v) + ")";
  if (Math.abs(r.v.x38 - r.v.brittle) > 1e-6 || Math.abs(r.v.x42 - 1) > 1e-6) return "Lingering cold V: x" + r.v.x38 + " at 1.9 s (expected x" + r.v.brittle + "), x" + r.v.x42 + " at 2.1 s (expected x1) " + JSON.stringify(r.v);
  if (Math.abs(r.iv.x38 - 1) > 1e-6) return "Fracture IV lingers: x" + r.iv.x38 + " at 1.9 s";
});
check("FRZ Permafrost V DEEP FREEZE (owner, 2026-11-06: \"yes all FRZ\"): a ring that leaves an enemy at full frost stops it 0.5 s, then it cannot be frozen again within 6 s, then can; Permafrost IV never freezes", () => {
  const r = run(`(() => { const go = rime => { const { t, es } = tierLane("frz", { rime }, [50]), e = es[0]; e.stunT = 0; t.rimeT = 1e9; e.rimeKeep = 0.29; e.seen = true; const out = {};
      const ring = () => (t.pulses ||= []).push({ x: t.x, y: t.y, R: 1e5, v: 0.01, id: "t:rime", age: FRZ_RIME_GROW * 0.9, hit: new Set(), moon: false });
      const run1 = (secs, tag) => { for (let i = 0; i < Math.round(secs / 0.05); i++) { e.s = e.s0 ??= e.s; frzStep(t, 0.05); stepEnemies(0.05); if (tag && i === 0) out[tag + "On"] = e.stunT > 0; } };
      ring(); run1(0.05, "a"); out.stunAfterRing = e.stunT; run1(0.6); out.stunAt065 = e.stunT; ring(); run1(0.05, "b"); run1(5.0); ring(); run1(0.05, "c"); // rings at 0, 0.65, 5.75 s
      run1(0.4); ring(); run1(0.05, "d"); // 6.2 s after the first
      return out; }; return { v: go(5), iv: go(4) }; })()`);
  const v = r.v;
  if (!(v.aOn && v.stunAfterRing > 0.3 && v.stunAfterRing <= 0.5 + 1e-9)) return "Deep freeze V: first full-frost ring did not stop it ~0.5 s " + JSON.stringify(v);
  if (!(v.stunAt065 <= 0)) return "Deep freeze V: still stopped 0.65 s on " + JSON.stringify(v);
  if (v.bOn || v.cOn) return "Deep freeze V: refroze inside the 6 s cooldown " + JSON.stringify(v);
  if (!v.dOn) return "Deep freeze V: no refreeze after the 6 s cooldown " + JSON.stringify(v);
  if (r.iv.aOn) return "Permafrost IV freezes " + JSON.stringify(r.iv);
});
check("later: tier I adds no extra numbers the spec does not name - SOL Breach I crit as tier 0, FRZ Fracture I no damage-taken boost", () => {
  const s0 = statsOf("sol", {}), s1 = statsOf("sol", { breach: 1 }), f1 = statsOf("frz", { temp: 1 });
  if (s1.critMul !== s0.critMul) return "SOL Breach I crit x" + s1.critMul + " (tier 0 x" + s0.critMul + ")";
  if (f1.brittle !== 1) return "FRZ Fracture I damage taken x" + f1.brittle + " (expected 1)";
});
check("later: a factor on the tower's OWN damage is one constant, on from its first tier (SOL crit, IFR fire hit + Flare's fire boost)", () => {
  const same = (kind, ax, key, from) => { const v = [1, 2, 3, 4, 5].map(n => statsOf(kind, { [ax]: n })[key]); return v.every(x => x === v[0]) && statsOf(kind, {})[key] === from ? "" : kind + " " + ax + " " + key + " " + JSON.stringify(v) + " (tier 0 " + statsOf(kind, {})[key] + ")"; };
  return same("sol", "breach", "critMul", 3) /* (SOL scorch left this rule 2026-10-25: Breach "increases ... burn" again) */ || same("ifr", "hellfire", "fireHK", statsOf("ifr", { hellfire: 1 }).fireHK) || same("ifr", "firaga", "hfK", 1);
});
check("later: the card rows read no zero mechanic - ARC Jumps 2 at tier 0 (one chain hitting three, owner 2026-10-29), FRZ Cold bite before Fracture (the nip is flat)", () => {
  const a0 = rows("arc", {}).rows, a1 = rows("arc", { voltage: 1 }).rows, f0 = rows("frz", {}).rows, f1 = rows("frz", { temp: 1 }).rows;
  if (String(a0.Jumps) !== "2") return "ARC tier 0 Jumps reads " + a0.Jumps + " (expected 2: one chain hitting three, owner 2026-10-29)";
  if (String(a1.Jumps) !== String(run("ARC_VOLT_JUMPS[1]")) || !(a1.Jumps > a0.Jumps)) return "ARC Voltage I Jumps reads " + a1.Jumps + " (expected ARC_VOLT_JUMPS[1], above tier 0: Voltage increases chains)";
  if (f0["Cold bite"] !== "—") return "FRZ tier 0 Cold bite reads " + f0["Cold bite"];
  if (f1["Cold bite"] === "—") return "FRZ Fracture I Cold bite blank";
});
check("later: ACD's sentence says the jet, not Jets, when it sprays one", () => {
  const d = run(`describeTower("acd", { corrosion: 1, contagion: 1, flow: 0 })`);
  if (/Jets/.test(d)) return d;
  if (!/The jet dissolves up to \d+% of the armor left/.test(d) || !/The jet leaves/.test(d)) return "no singular jet: " + d;
});
check("later: towerLevel counts only the tower's own axes (a stray key in a save adds nothing)", () => {
  const n = run(`towerLevel({ kind: "arc", skills: { conductivity: 2, void: 3, junk: 9 } })`);
  if (n !== 2) return "towerLevel " + n + " (expected 2)";
});
check("later: CRR's tether rides the first interceptor OUT on a target, not interceptor 0, and only it draws a beam", () => {
  const r = run(`(() => { G = newGame(); const t = { id: 99, kind: "crr", x: CX, y: CY, lvl: 3, skills: { hangar: 1, launch: 1 } }, st = towerStats(t, true), e = { x: CX + 30, y: CY, hp: 1e9, dead: false };
    t.icp = [{ state: "home" }, { state: "out", ve: e }, { state: "out", ve: e }]; return t.icp.map(i => carTethered(t, i, st)); })()`);
  if (JSON.stringify(r) !== "[false,true,false]") return "tethered " + JSON.stringify(r) + " (expected only the first one out)";
});
check("no card sentence names a number over 800% for ANY build, every axis mix 0-V (owner, 2026-10-31; a Void V + Nova V GRV read 2325%, 2026-11-06)", () => {
  const r = run(`(() => { const out = []; for (const kind of Object.keys(SKILL_TREES)) { const ids = SKILL_TREES[kind].map(a => a.id); for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) for (let c = 0; c <= 5; c++) { const d = describeTower(kind, { [ids[0]]: a, [ids[1]]: b, [ids[2]]: c }); for (const m of d.matchAll(/(\\d+)%/g)) if (+m[1] > 800) { out.push(kind + " " + a + b + c + ": " + m[0]); break; } } } return out; })()`);
  if (r.length) return r.length + " over 800%: " + r.slice(0, 6).join("; ");
});
check("no tower card stat row shows a float artefact or more than 2 decimals, every kind at every axis mix 0-V (owner, 2026-11-06: \"wacky decimal places are back\" - GRV Particles 8.399999999999999)", () => {
  const r = run(`(() => { const out = []; for (const kind of Object.keys(SKILL_TREES)) { const ids = SKILL_TREES[kind].map(a => a.id); for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) for (let c = 0; c <= 5; c++) { const sk = { [ids[0]]: a, [ids[1]]: b, [ids[2]]: c }, t = { id: -7, kind, cell: 0, skills: sk, lvl: 1 + a + b + c, x: CELLS[0].x, y: CELLS[0].y }; let h; try { h = cardStats(t, null); } catch (e) { out.push(kind + " " + a + b + c + ": threw " + e.message); continue; } const m = h.replace(/<[^>]*>/g, " ").match(/\\d\\.\\d{3,}/); if (m) out.push(kind + " " + a + b + c + ": " + m[0]); } } return out; })()`);
  if (r.length) return r.length + " bad: " + r.slice(0, 6).join("; ");
});
check("FRZ's chill never bites over 8x td (owner, 2026-10-31: \"Nothing should ever be above like 800%\"; the bite by speed, 2026-11-06): a fully slowed enemy at the fastest regular speed", () => {
  const r = run(`(() => { const sp = Math.max(...["swarm", "fast", "shield", "armor"].map(k => ENEMIES[k].speed)), k = Object.keys(ENEMIES).find(k => ENEMIES[k].speed === sp); return [frzBite({ type: k, slowT: 1, slowF: 1 }), 8 * tdU("frz")]; })()`);
  if (!(r[0] <= r[1] + 1e-9)) return "bite " + r[0] + " > " + r[1];
});
check("no card sentence names a number over 800% (owner, 2026-10-31: \"Nothing should ever be above like 800%\"): every axis of every tower, tiers 0-V", () => {
  const r = run(`(() => { const out = []; for (const kind of Object.keys(SKILL_TREES)) for (const ax of SKILL_TREES[kind]) for (let k = 0; k <= 5; k++) { const d = describeTower(kind, { [ax.id]: k }); for (const m of d.matchAll(/(\\d+)%/g)) if (+m[1] > 800) out.push(kind + " " + ax.id + " " + k + ": " + m[0]); } return out; })()`);
  if (r.length) return r.length + " over 800%: " + r.slice(0, 6).join("; ");
});check("ARC's sentence (the ARC redesign, owner 2026-10-29): one bolt that chains (Voltage), forks once from Voltage II, Conductivity the carry, Shock a slow and an armor break; FRZ tier 0 \"slows and deals X% damage\"", () => {
  const r = run(`[describeTower("arc", {}), describeTower("arc", { voltage: 2 }), describeTower("arc", { conductivity: 2 }), describeTower("arc", { capacitance: 1 }), describeTower("frz", {}), Math.round(FRZ_NIP / (typeof TD_UNIT !== "undefined" ? TD_UNIT.frz : 1) * 100)]`);
  if (r[0] !== "A bolt of lightning that chains twice for 20% less damage every chain. Each jump goes further out from ARC.") return "tier 0: " + r[0]; // (the radial jumps, owner 2026-11-06)
  if (!/^A bolt of lightning that forks once and chains \w+ times for \d+% less damage every chain\. Each jump goes further out from ARC\.$/.test(r[1])) return "Voltage II: " + r[1];
  if (!/that chains twice for full damage every chain\. Each jump goes further out from ARC\.$/.test(r[2])) return "Conductivity II: " + r[2];
  if (!/ Hits (slow by \d+% and )?break \d+% of the armor left\.( Shocked enemies take \d+% more damage from ARC\.)?$/.test(r[3])) return "Shock I: " + r[3]; // no slow since the ARC brief (Wai, 2026-11-01, the ARC brief: "ARC remove slow to make worse vs fast / Increase chaining/forking to make good vs swarm")
  if (!r[4].includes("slows enemies by") || !r[4].includes(" and deals " + r[5] + "%td a second")) return "FRZ tier 0: " + r[4];
});


check("a boss at the core costs its HP% left in lives, a Lover half, a Devil copy a sixth, rounded up, and the game goes on (owner, 2026-11-03: \"lets make bosses make you lose lives equal to the percentage of life left on the boss instead of rhe losing the game instantly\")", () => {
  const r = run(`(() => { G = newGame(); G.lives = 30; const leak = (arcana, hp) => { const e = { type: "bonus", arcana, hp, max: 100, x: CX, y: CY, pi: 0, s: PATHS[0].len + 1, spd: 0, ang: 0 };
    G.enemies.push(e); const before = G.lives; stepEnemies(0.001); return before - G.lives; };
    const a = leak("star", 12), b = leak("lovers", 9), c = leak("devil", 0.5), over = G.over, by = G.breachBy, d = leak("death", 40); return [a, b, c, over, by || null, G.over, G.breachBy]; })()`);
  if (JSON.stringify(r) !== JSON.stringify([12, 5, 1, false, null, true, "death"])) return "lives lost / over / breachBy, then a 40% Death on 12 lives " + JSON.stringify(r) + " (expected [12,5,1,false,null,true,\"death\"])";
});
