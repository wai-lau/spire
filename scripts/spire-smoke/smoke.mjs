#!/usr/bin/env node
// /spire SMOKE TEST (owner, 2026-10-11: "add smoke tests for all basic features as commit hook").
// Loads EVERY script the page loads, in the template's own order, into one node vm with a fake DOM and a
// RECORDING canvas, then drives the real frame loop through the basic features and checks each one actually
// DRAWS - not just that nothing threw. Born of a comment that swallowed render()'s else branch: 2D drew nothing
// and 3D lost its ranges, beams and movement arrows, with no error anywhere. 3D only since 2026-10-18 (dom.mjs fakeGl).
//   node scripts/spire-smoke/smoke.mjs        (exit 1 on any failure; pre-commit runs it when /spire is staged)
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { makeDom } from "./dom.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "api/templates/aspira.html"), "utf8");
const SCRIPTS = [...TEMPLATE.matchAll(/src="\/(aspira[^"?]*\.js)/g)].map(m => m[1]);

function boot(store = {}, view = { w: 390, h: 844 }) { // portrait by default: the lanes turn with the box only from Task 3 on
  const dom = makeDom(TEMPLATE, store, view);
  const ctx = vm.createContext(dom.globals);
  for (const f of SCRIPTS) vm.runInContext(fs.readFileSync(path.join(ROOT, "web", f), "utf8"), ctx, { filename: f });
  return { ctx, dom, run: src => vm.runInContext(src, ctx) };
}

const results = [];
function check(name, fn) {
  try { const why = fn(); results.push([name, why ? "FAIL: " + why : "ok"]); } catch (e) { results.push([name, "FAIL: " + (e.stack || e).toString().split("\n").slice(0, 3).join(" | ")]); }
}
// draw calls on EVERY canvas during fn (3D: the board texture, the moving layer, #asp-ent)
function drawn(env, fn) {
  for (const r of env.dom.recs) { r.n = 0; r.ops = {}; }
  fn();
  return { n: env.dom.recs.reduce((a, r) => a + r.n, 0) };
}
// how often each named game function ran during fn (they are vm globals, so they can be wrapped)
function calls(env, names, fn) {
  const seen = Object.fromEntries(names.map(n => [n, 0])), orig = {};
  for (const n of names) {
    orig[n] = env.ctx[n];
    if (typeof orig[n] !== "function") throw new Error(n + " is not a function");
    env.ctx[n] = function (...a) { seen[n]++; return orig[n].apply(this, a); };
  }
  try { fn(); } finally { for (const n of names) env.ctx[n] = orig[n]; }
  return seen;
}
const frames = (env, n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) env.dom.tick(dt); };

check("play box: portrait is centred, landscape is it turned 90 degrees", () => {
  const p = boot({}, { w: 390, h: 844 }), w = boot({}, { w: 1280, h: 800 });
  const bp = p.run("phoneBox()"), bw = w.run("phoneBox()"), cx = p.run("CX"), cy = p.run("CY");
  if (p.run("BOX_WIDE") || !w.run("BOX_WIDE")) return "BOX_WIDE should follow the window's shape";
  if (Math.abs((cy - bp.y0) - (bp.y1 - cy)) > 1e-9) return "portrait core not centred top-bottom";
  if (Math.abs((bw.x1 - bw.x0) - (bp.y1 - bp.y0)) > 1e-9 || Math.abs((bw.y1 - bw.y0) - (bp.x1 - bp.x0)) > 1e-9) return "landscape box is not the portrait box turned";
  if (Math.abs((bp.y1 - bp.y0) - 2 * p.run("BOX_LONG")) > 1e-9) return "portrait height is not 2 x BOX_LONG";
});

check("lanes: a landscape pick is the portrait pick turned 90 degrees", () => {
  const p = boot({}, { w: 390, h: 844 }), w = boot({}, { w: 1280, h: 800 });
  for (const [pi, k, n] of [[0, 1, 1], [1, 2, 3], [2, 3, 7], [3, 5, 12], [5, 6, 20], [8, 2, 31]]) {
    const a = p.run(`laneBestTurn(${pi}, ${k}, ${n})`), b = w.run(`laneBestTurn(${pi}, ${k}, ${n})`), per = Math.PI * 2 / k;
    const d = (((b - a - Math.PI / 2) % per) + per) % per;
    if (Math.min(d, per - d) > 1e-6) return `pi ${pi} k ${k} n ${n}: portrait ${a.toFixed(4)}, landscape ${b.toFixed(4)}`;
  }
});

const env = boot();
const { run } = env;
check("boots: every script loads, the frame loop is queued", () => (env.dom.rafQueue() ? "" : "no requestAnimationFrame"));
check("frame loop runs 60 frames", () => { frames(env, 60); });
check("3D: WebGL comes up and a frame draws (the board, the moving layer, the entities)", () => {
  frames(env, 2);
  if (!run("typeof warp !== 'undefined' && !!warp.gl")) return "no WebGL context (warpInit failed)";
  const r = drawn(env, () => frames(env, 1));
  return r.n > 50 ? "" : "only " + r.n + " canvas calls in a frame";
});

// a tower of each kind: build through placeTower (the real click path), then draw
for (const kind of ["arc", "frz", "sol", "acd", "grv", "car", "ifr"]) {
  check("build " + kind.toUpperCase() + ": placed, its range + tower + movement arrows draw", () => {
    run(`G = newGame(); G.money = 1e6; refreshPanels(); ui.build = "${kind}";
         { const ci = CELLS.findIndex((c, i) => cellOpen(i) && !G.towers.some(t => t.cell === i)); placeTower(CELLS[ci]); }
         ui.sel = G.towers[0] && G.towers[0].id;`);
    if (run("G.towers.length") !== 1) return "placeTower built nothing";
    const seen = calls(env, ["drawTowerRange", "drawTower", "drawLeash"], () => frames(env, 2));
    const miss = Object.entries(seen).filter(([, v]) => !v).map(([k]) => k);
    return miss.length ? "never called: " + miss.join(", ") : "";
  });
}

check("a wave spawns, towers fire, enemies draw", () => {
  run(`G = newGame(); G.money = 1e6; for (const k of ["arc", "sol", "acd"]) { ui.build = k;
         const ci = CELLS.findIndex((c, i) => cellOpen(i) && !G.towers.some(t => t.cell === i)); placeTower(CELLS[ci]); }
       G.started = true; sendWave(); for (let i = 0; i < 400; i++) step(1 / 30);`);
  if (!run("G.enemies.length + (G.kills || 0)")) return "no enemies spawned";
  const seen = calls(env, ["drawEnemy", "drawAims"], () => frames(env, 2));
  if (!seen.drawEnemy) return "drawEnemy never called with " + run("G.enemies.length") + " enemies";
  return run("G.towers.some(t => (t.dealt || 0) > 0)") ? "" : "no tower dealt damage in 400 steps";
});

check("boss wave: the sky spreads, fills, draws both ways", () => {
  run(`G.wave = STAR_EVERY - 1; sendWave(); for (let i = 0; i < 200; i++) step(1 / 30);`); // the first boss wave, whatever the cycle
  if (!run("G.enemies.some(e => e.arcana)")) return "no boss on the first boss wave";
  run("bossSkyStep(); bossInv.t0 -= 1.5");
  const spreading = drawn(env, () => frames(env, 1)).n;
  run("bossInv.t0 -= 10");
  const full = drawn(env, () => frames(env, 1)).n;
  const sky = run("[bossInv.phase, bossInv.full, skyPal()]");
  if (!sky[1] || !sky[2]) return "sky never filled: " + JSON.stringify(sky);
  return spreading > 50 && full > 50 ? "" : "spreading " + spreading + " / full " + full + " canvas calls";
});
check("boss sky keeps tower colours: ranges drawn under it", () => {
  const seen = calls(env, ["drawTowerRange"], () => frames(env, 1));
  return seen.drawTowerRange ? "" : "no range drawn on the boss sky";
});

check("capstone: one axis to VI, a second refused; every tier table covers VI", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "arc";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0], ids = SKILL_TREES.arc.map(a => a.id);
    for (let k = 0; k < 6; k++) upgradeTower(t, ids[0], true);
    for (let k = 0; k < 6; k++) upgradeTower(t, ids[1], true);
    const out = { a: skillOf(t, ids[0]), b: skillOf(t, ids[1]), opts: skillOptions(t).map(o => o.choice) };
    for (const kind of ["arc", "frz", "sol", "acd", "grv", "car", "ifr"]) for (const ax of SKILL_TREES[kind]) {
      const s = towerStats({ id: 99, kind, x: CX, y: CY, lvl: 7, skills: { [ax.id]: 6 } });
      if (!ax.tiers[5] || Object.values(s).some(v => v === undefined || (typeof v === "number" && isNaN(v)))) out.bad = kind + " " + ax.id;
      if (/undefined/.test(describeTower(kind, { [ax.id]: 6 }))) out.bad = kind + " " + ax.id + " desc";
    }
    return out;
  })()`);
  if (r.a !== 6) return "first axis reached " + r.a + ", not VI";
  if (r.b !== 5) return "second axis reached " + r.b + " (one capstone a tower)";
  if (r.bad) return "tier VI incomplete: " + r.bad;
  return "";
});
// an enemy held still on lane 0 at about `dist` u from tower t (its lane point nearest that distance); shield / hp settable after
run(`function ifrNear(type, t, dist) {
  spawnEnemy(type, 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
  for (let s = entryS(0); s < PATHS[0].len; s += 4) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - dist); if (d < bd) { bd = d; bs = s; } }
  const p = pathAt(0, bs, 0); e.s = bs; e.x = p.x; e.y = p.y; e.stunT = 1e9; e.seen = true; e.hp = e.max = 1e6; e.armor = 0; e.shield = 0; return e;
}`);
check("spacing (owner, 2026-10-20): armor units 2x (72), fast units three times, shield pods half the gap, a shield V 3x", () => {
  const r = run(`(() => {
    G = newGame(); const out = {};
    const a = FORMS.armor.slots(6); out.armorPitch = Math.abs(a[1][0] - a[0][0]); out.armorRow = Math.abs(a[3][1] - a[0][1]);
    const v = FORMS.shield.slots(5); out.vLat = Math.abs(v[1][0] - v[0][0]); out.vBack = Math.abs(v[1][1] - v[0][1]);
    const f = FORMS.fast.slots(2); out.fastSide = Math.abs(f[1][0] - f[0][0]);
    const lanes = { shield: 0, fast: 0 };
    const w = { n: 1, list: ["shield", "shield", "shield", "shield", "shield", "shield", "shield", "shield"], lanes, ang: 0, idx: 0, timer: 0 }; G.spawns = [w];
    stepSpawns(1e-6); out.shieldGap = w.timer * ENEMY_SPEED; out.shieldIdx = w.idx;
    const w2 = { n: 1, list: ["fast", "fast", "fast", "fast"], lanes, ang: 0, idx: 0, timer: 0 }; G.spawns = [w2];
    stepSpawns(1e-6); out.fastBehind = w2.timer * ENEMIES.fast.speed * ENEMY_SPEED;
    return out;
  })()`);
  if (Math.abs(r.armorPitch - 72) > 1e-6 || Math.abs(r.armorRow - 72) > 1e-6) return "armor lattice " + r.armorPitch + " across, " + r.armorRow + " between rows (expected 72 both: back from 216, owner 2026-10-20 - its outer columns walked out of reach)";
  if (Math.abs(r.vLat - 72) > 1e-6 || Math.abs(r.vBack - 84) > 1e-6) return "a shield V steps " + r.vLat + " across, " + r.vBack + " back (expected 72, 84: x3)";
  if (Math.abs(r.fastSide - 78) > 1e-6 || Math.abs(r.fastBehind - 78) > 0.01) return "fast pairs " + r.fastSide + " across, " + r.fastBehind + " behind (expected 78 both, three times 26)";
  if (r.shieldIdx !== 5 || Math.abs(r.shieldGap - 5 * 0.4) > 0.001) return "a pod of " + r.shieldIdx + " shields waits " + r.shieldGap + " (expected 5 x 0.4 = 2, half the old 4)";
  return "";
});
check("IFR's range and movement range stay modest at every stop (owner, 2026-10-20: \"unnecessarily large\")", () => {
  const r = run(`(() => { let rMax = 0, mMax = 0, r0 = 0, m0 = 0; for (const ax of ["", "meteor", "hellfire", "firaga"]) for (const k of [0, 1, 3, 6]) {
    G = newGame(); G.money = 1e9; ui.build = "ifr"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0];
    if (ax) for (let i = 0; i < k; i++) upgradeTower(t, ax, true);
    const st = towerStats(t), m = leashR(t); rMax = Math.max(rMax, st.range); mMax = Math.max(mMax, m); if (!ax) { r0 = st.range; m0 = m; } }
    return { rMax, mMax, r0, m0 }; })()`);
  if (r.r0 > 170 || r.rMax > 220) return "IFR range " + r.r0.toFixed(0) + " base, up to " + r.rMax.toFixed(0) + " (expected about 163, at most 220)";
  if (r.m0 > 130 || r.mMax > 230) return "IFR movement " + r.m0.toFixed(0) + " base, up to " + r.mMax.toFixed(0) + " (expected about 120, at most 230)";
  return "";
});
check("IFR's card shows no long decimals (owner, 2026-10-20)", () => {
  const r = run(`(() => { const bad = []; for (const ax of ["", "meteor", "hellfire", "firaga"]) for (const k of [0, 1, 3, 6]) {
    G = newGame(); G.money = 1e9; ui.build = "ifr"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0];
    if (ax) for (let i = 0; i < k; i++) upgradeTower(t, ax, true);
    for (const [label, v] of SPEC.ifr(towerStats(t))) if (/\\d\\.\\d{3,}/.test(String(v))) bad.push(label + ": " + v); }
    return bad; })()`);
  return r.length ? "long decimals on the IFR card: " + [...new Set(r)].slice(0, 4).join(" | ") : "";
});
check("IFR: each axis scales only its own numbers", () => {
  const r = run(`(() => {
    const F = { meteor: ["chargeS", "ballV", "ballR", "routeK"], hellfire: ["fireR", "fireV", "fireDens"], firaga: ["beamL", "beamW", "burnS", "tickS", "flareK", "triple", "hfK"] };
    const all = [].concat(...Object.values(F));
    const fresh = ax => { G = newGame(); G.money = 1e9; ui.build = "ifr"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0]; if (ax) for (let k = 0; k < 6; k++) upgradeTower(t, ax, true); return t; };
    const pick = st => Object.fromEntries(all.map(k => [k, st[k]]));
    const base = pick(towerStats(fresh())), out = { base, moved: {}, vi: {} };
    for (const ax of Object.keys(F)) { const st = towerStats(fresh(ax)); out.vi[ax] = pick(st); out.moved[ax] = all.filter(k => st[k] !== base[k]); }
    /* a save keeps none of IFR's live state (a 6.4 save's keys included): runClean drops every ifr* key a live tower carries, and the tower rebuilds */
    const old = fresh(); for (let i = 0; i < 90; i++) step(1 / 30); out.live = Object.keys(old).filter(k => /^ifr/.test(k));
    runClean(G); out.kept = Object.keys(old).filter(k => /^ifr/.test(k));
    try { for (let i = 0; i < 30; i++) step(1 / 30); out.oldOk = true; } catch (e) { out.oldOk = String(e); }
    return out;
  })()`);
  const F = { meteor: ["chargeS", "ballV", "ballR", "routeK", "fireR"], hellfire: ["fireR", "fireV", "fireDens"], firaga: ["beamL", "beamW", "burnS", "tickS", "flareK", "triple", "hfK"] };
  for (const ax of Object.keys(F)) { const stray = r.moved[ax].filter(k => !F[ax].includes(k)); if (stray.length) return ax + " moved another axis's numbers: " + stray; if (!r.moved[ax].length) return ax + " moved nothing"; }
  if (Math.abs(r.base.fireR - 16 * r.base.ballR) > 1e-9) return "Hellfire 0: the fire's max " + r.base.fireR + " is not 16x the meteor's size " + r.base.ballR + " (owner, 2026-10-20)";
  if (Math.abs(r.vi.meteor.ballR - 5.4) > 1e-9) return "Meteor VI meteor radius " + r.vi.meteor.ballR + " (expected 5.4: 20% of 27, owner 2026-10-20)";
  if (r.vi.hellfire.fireR !== 180) return "Hellfire VI fire radius " + r.vi.hellfire.fireR + " (expected 180)";
  if (r.base.triple || !r.vi.firaga.triple) return "three flares a meteor is not the Flare capstone's alone";
  if (!r.live.length || r.kept.length) return "a save keeps IFR live keys: " + r.kept + " (live: " + r.live + ")";
  if (r.oldOk !== true) return "a cleaned IFR threw on resume: " + r.oldOk;
  return "";
});
check("IFR: one charge at its centre, launched the moment it is full and a target is in range", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e6; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0], st = towerStats(t), out = { ballR: st.ballR };
    for (let i = 0; i < 90; i++) { for (const e of G.enemies) e.stunT = 1e9; step(1 / 30); } // 3 s: charged (2 s untaken), wave 1 held at the gate, out of range
    out.charge = t.ifrCharge; out.ballsBefore = t.ifrBalls.length;
    ifrNear("armor", t, 100); step(1 / 30);
    const b = t.ifrBalls[0]; out.balls = t.ifrBalls.length; out.chargeAfter = t.ifrCharge;
    if (b) { out.fromCentre = Math.hypot(b.x - b.vx / 30 - t.x, b.y - b.vy / 30 - t.y); out.r = b.r; }
    for (let k = 0; k < 6; k++) upgradeTower(t, "meteor", true); /* mid-flight: the ball keeps its launch-time size */
    step(1 / 30); out.rAfter = t.ifrBalls[0] ? t.ifrBalls[0].r : out.r;
    return out;
  })()`);
  if (r.charge !== 1 || r.ballsBefore) return "after 3 s with no target: charge " + r.charge + ", balls " + r.ballsBefore + " (expected a full charge, held)";
  if (r.balls !== 1 || r.chargeAfter >= 1) return "no single launch at a target in range: balls " + r.balls + ", charge after " + r.chargeAfter;
  if (!(r.fromCentre < 0.5)) return "the meteor left " + r.fromCentre + " u from the tower's centre";
  if (r.r !== r.ballR) return "the meteor's radius " + r.r + " is not the Meteor size " + r.ballR;
  if (r.rAfter !== r.r) return "upgrading mid-flight changed a live meteor's size: " + r.r + " -> " + r.rAfter;
  return "";
});
check("IFR meteors: ONE homes onto its target from any distance; its first hit makes the fire and a 360-degree fan (Meteor's count, bell-curve release round 0.4 s) whose meteors home within 50 u, hit only, fissure at the capstone", () => {
  const r = run(`(() => {
    const fresh = m => { G = newGame(); G.money = 1e9; ui.build = "ifr"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0]; for (let k = 0; k < m; k++) upgradeTower(t, "meteor", true); ifrInit(t); for (const e of G.enemies) e.dead = true; return t; };
    const held = (t, x, y) => { const e = ifrNear("shield", t, 300); e.x = x; e.y = y; e.shield = 50; e.stunT = 1e9; return e; };
    const out = {};
    /* the launch: ONE meteor, homing onto its target however far off its first heading */
    let t = fresh(1), st = towerStats(t); const tgt = held(t, t.x + 120, t.y + 60); egridAt = NaN; t.ifrCharge = 1; ifrLaunch(t, st);
    out.launched = t.ifrBalls.length; const m0 = t.ifrBalls[0]; m0.vx = -Math.abs(m0.vx); m0.vy = -Math.abs(m0.vy); /* turned AWAY: it must home back */
    let n = 0; while (t.ifrFires.length === 0 && n++ < 600) stepIfrBalls(t, st, 1 / 60);
    out.fires1 = t.ifrFires.length; out.fireAt = t.ifrFires[0] ? Math.hypot(t.ifrFires[0].x - tgt.x, t.ifrFires[0].y - tgt.y) : NaN;
    const fan = t.ifrBalls.filter(b => b.gen === 1); out.fan = fan.length; out.want = st.fan; out.fanR = fan.map(b => b.r / st.ballR); out.fanV = fan.map(b => Math.hypot(b.vx, b.vy) / st.ballV);
    const angs = fan.map(b => (Math.atan2(b.vy, b.vx) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b); out.maxGap = Math.max(...angs.map((a, i) => (i ? a - angs[i - 1] : a + 2 * Math.PI - angs[angs.length - 1]))) * 180 / Math.PI;
    const w = Array.from({ length: 2000 }, () => ifrFanDelay(IFR_FAN[0])); const w4 = Array.from({ length: 2000 }, () => ifrFanDelay(4 * IFR_FAN[0])); out.wait4Mean = w4.reduce((a, b) => a + b, 0) / w4.length; out.fanWaits = fan.every(b => b.wait >= 0 && b.wait <= IFR_FAN_MAX_S * Math.sqrt(st.fan / IFR_FAN[0]) + 1e-9); out.waitMean = w.reduce((a, b) => a + b, 0) / w.length; out.waitMin = Math.min(...w); out.waitMax = Math.max(...w);
    tgt.dead = true; for (let i = 0; i < 300 && t.ifrBalls.length; i++) stepIfrBalls(t, st, 1 / 60); out.firesAfter = t.ifrFires.length; /* the fan hits nothing here: no new fire */
    /* the LAUNCHED meteor never goes silently (owner, 2026-10-20: "initial meteor kinda just disappears with nothing happening"): locked, the
       view does not cull it (its seen target may sit where the camera does not reach), and out of time it bursts where it is */
    { for (const b of t.ifrBalls) b.left = 0; t.ifrBalls.length = 0; t.ifrFires.length = 0;
      const v = held(t, t.x + 90, t.y - 40); egridAt = NaN; const ov = ifrOnView; /* (inside IFR's range, 140 since 2026-10-20) */ ifrOnView = () => false; /* the camera sees nothing */
      try { t.ifrCharge = 1; ifrLaunch(t, st); let k = 0; while (!t.ifrFires.length && k++ < 600) stepIfrBalls(t, st, 1 / 60); } finally { ifrOnView = ov; }
      out.culledFire = t.ifrFires.length; v.dead = true; for (const b of t.ifrBalls) b.left = 0; t.ifrBalls.length = 0; t.ifrFires.length = 0;
      ifrMeteor(t, st, t.x, t.y, 0, 0, null); t.ifrBalls[0].left = 0.05; for (let i = 0; i < 10 && !t.ifrFires.length; i++) stepIfrBalls(t, st, 1 / 60);
      out.timeoutFire = t.ifrFires.length; for (const b of t.ifrBalls) b.left = 0; t.ifrBalls.length = 0; t.ifrFires.length = 0; }
    /* its target dies in flight: it flies on to the CORPSE (owner, 2026-10-20: "if target dies, lock on to corpse") and bursts there */
    for (const b of t.ifrBalls) b.left = 0; t.ifrBalls.length = 0; t.ifrFires.length = 0;
    { const v = held(t, t.x + 100, t.y - 40); egridAt = NaN; t.ifrCharge = 1; ifrLaunch(t, st); stepIfrBalls(t, st, 1 / 60); const vx = v.x, vy = v.y; v.dead = true;
      const decoy = held(t, t.x - 120, t.y + 40); egridAt = NaN; /* the nearest live enemy: it must NOT re-lock onto it */
      let k = 0; while (!t.ifrFires.length && k++ < 600) stepIfrBalls(t, st, 1 / 60);
      out.corpseFire = t.ifrFires[0] ? Math.hypot(t.ifrFires[0].x - vx, t.ifrFires[0].y - vy) : NaN; out.decoy = 50 - decoy.shield; decoy.dead = true;
      for (const b of t.ifrBalls) b.left = 0; t.ifrBalls.length = 0; }
    /* a SPAWNED meteor hits nothing for its first IFR_ARM_U (owner, 2026-10-20: "spawned meteors don't hit for min 50u") - then it does */
    { t.ifrFires.length = 0; t.ifrFlares.length = 0; const v = held(t, t.x + 30, t.y); egridAt = NaN;
      t.ifrBalls.push({ x: t.x, y: t.y, vx: st.ballV * IFR_FAN_V, vy: 0, r: st.ballR, gen: 1, skip: null, left: 10, wait: 0 });
      const w = held(t, t.x + 20, t.y + 25); egridAt = NaN; let k = 0, bent = 0; /* w: in homing reach from the start - no turn before 50 u (owner: "no homing for first 50") */
      while (t.ifrBalls.length && Math.hypot(t.ifrBalls[0].x - t.x, t.ifrBalls[0].y - t.y) < 45 && k++ < 600) { stepIfrBalls(t, st, 1 / 60); if (t.ifrBalls[0] && Math.abs(t.ifrBalls[0].vy) > 1e-9) bent++; }
      while (t.ifrBalls.length && (t.ifrBalls[0].flown || 0) < 95 && k++ < 1200) stepIfrBalls(t, st, 1 / 60); /* homing from 50 u, hitting only from 100 u (owner, 2026-10-20) */
      out.armEarly = 50 - v.shield + 50 - w.shield; out.bent = bent; w.dead = true; k = 0; while (t.ifrBalls.length && k++ < 1200) stepIfrBalls(t, st, 1 / 60); out.armLate = 50 - v.shield; v.dead = true; t.ifrBalls.length = 0; t.ifrFlares.length = 0; }
    /* a SPAWNED meteor bursts on its own somewhere round 400 u out (owner, 2026-10-20: "a chance of exploding as it travels ... bell curve
       explosions around 400u away"): no enemy anywhere - it flies, then bursts (a flare) at its fuse distance */
    { for (const e of G.enemies) e.dead = true; t.ifrBalls.length = 0; t.ifrFlares.length = 0; const d = [];
      for (let i = 0; i < 40; i++) { t.ifrBalls.push({ x: CX, y: CY, vx: st.ballV * IFR_FAN_V, vy: 0, r: 2, gen: 1, skip: null, left: 30, wait: 0, fuse: ifrFuse() }); }
      const fs = t.ifrBalls.map(b => b.fuse); let k = 0; const ov = ifrOnView; ifrOnView = () => true;
      try { while (t.ifrBalls.length && k++ < 4000) stepIfrBalls(t, st, 1 / 60); } finally { ifrOnView = ov; }
      out.fuseMean = fs.reduce((a, b) => a + b, 0) / fs.length; out.fuseFlares = t.ifrFlares.length; out.fuseLeft = t.ifrBalls.length;
      out.fuseAt = t.ifrFlares.map(f => Math.hypot(f.x - CX, f.y - CY)); t.ifrFlares.length = 0; }
    /* a fan meteor homes within 50 u (and only then), hits for damage only - no fire */
    t.ifrFires.length = 0; const near = held(t, t.x + 150, t.y + 35), far = held(t, t.x + 250, t.y + 90); egridAt = NaN;
    t.ifrBalls.push({ x: t.x, y: t.y, vx: st.ballV, vy: 0, r: st.ballR, gen: 1, skip: null, left: 10, wait: 0 });
    for (let i = 0; i < 120 && t.ifrBalls.length; i++) stepIfrBalls(t, st, 1 / 60);
    out.homeNear = 50 - near.shield; out.homeFar = 50 - far.shield; out.fanFire = t.ifrFires.length; near.dead = far.dead = true;
    /* the capstone: a fan meteor's hit fissures into two at +-30 degrees, which skip that enemy and do not fissure */
    t = fresh(6); st = towerStats(t); out.fissure = st.fissure; const c = held(t, t.x + 60, t.y); egridAt = NaN;
    t.ifrBalls.push({ x: t.x, y: t.y, vx: st.ballV, vy: 0, r: st.ballR, gen: 1, skip: null, left: 10, wait: 0 });
    for (let i = 0; i < 60 && t.ifrBalls.length === 1; i++) stepIfrBalls(t, st, 1 / 60);
    out.kids = t.ifrBalls.map(k => Math.round(Math.atan2(k.vy, k.vx) * 180 / Math.PI)).sort((x, y) => x - y); out.kidGen = t.ifrBalls.map(k => k.gen);
    stepIfrBalls(t, st, 1 / 60); out.cHits = 50 - c.shield;
    /* off the view: gone, no burst */
    for (const e of G.enemies) e.dead = true; t.ifrBalls.length = 0; t.ifrFires.length = 0; t.ifrBalls.push({ x: t.x, y: t.y, vx: st.ballV, vy: 0, r: st.ballR, gen: 1, skip: null, left: 10, wait: 0 });
    n = 0; while (t.ifrBalls.length && n++ < 2000) stepIfrBalls(t, st, 1 / 60); out.offGone = t.ifrBalls.length === 0; out.offFires = t.ifrFires.length; out.offSteps = n;
    return out;
  })()`);
  if (r.launched !== 1) return "a launch fired " + r.launched + " meteors (expected one)";
  if (r.fires1 !== 1 || !(r.fireAt < 30)) return "the homing meteor: fires " + r.fires1 + ", " + r.fireAt + " u from its target (expected a hit on it, one fire)";
  if (r.fanR.some(k => Math.abs(k - 0.25) > 1e-9)) return "fan meteors are " + r.fanR[0] + " x the launched one's size (expected a quarter, owner 2026-10-20)";
  if (r.fanV.some(v => Math.abs(v - 0.25) > 1e-9)) return "fan meteors fly at " + r.fanV[0] + " x the launch speed (expected a quarter, owner 2026-10-20)";
  if (r.fan !== r.want || r.want !== 7) return "the impact fan at Meteor I: " + r.fan + " meteors (its st.fan " + r.want + ", expected 7)";
  if (!(r.maxGap < 360 / r.want + 0.5)) return "the fan is not even round 360 degrees: largest gap " + r.maxGap.toFixed(1);
  if (Math.abs(r.wait4Mean / r.waitMean - 2) > 0.15) return "a fan 4x as big releases over " + (r.wait4Mean / r.waitMean).toFixed(2) + "x the time (expected 2: the root of the count)";
  if (!r.fanWaits || Math.abs(r.waitMean - 0.4) > 0.05 || r.waitMin < 0 || r.waitMax > 1 || r.waitMax - r.waitMin < 0.3) return "fan release times: mean " + r.waitMean.toFixed(2) + " in [" + r.waitMin.toFixed(2) + ", " + r.waitMax.toFixed(2) + "] (expected a bell round 0.4 s, sd 0.3)";
  if (r.firesAfter !== 1) return "fires after the fan flew: " + r.firesAfter + " (only the first impact makes one)";
  if (r.culledFire !== 1 || r.timeoutFire !== 1) return "the launched meteor went silently: with the view seeing nothing it burst " + r.culledFire + " times, out of time " + r.timeoutFire + " (expected 1, 1)";
  if (!(r.corpseFire < 6) || r.decoy) return "its target died: the burst landed " + r.corpseFire + " u from the corpse, a live decoy took " + r.decoy + " (expected at the corpse, none)";
  if (r.bent) return "a spawned meteor turned (homed) " + r.bent + " steps in its first 45 u (expected straight)";
  if (r.armEarly !== 0 || r.armLate !== 1) return "a spawned meteor 30 u from an enemy hit it " + r.armEarly + " times in its first 45 u (expected 0), " + r.armLate + " after (expected 1)";
  if (!(r.fuseMean > 190 && r.fuseMean < 235) || r.fuseFlares !== 40 || r.fuseLeft || r.fuseAt.some(d => d < 150 - 2 || d > 300 + 2)) return "spawned meteors' fuses: mean " + r.fuseMean.toFixed(0) + " u, " + r.fuseFlares + " burst of 40, " + r.fuseLeft + " still flying, at " + Math.min(...r.fuseAt).toFixed(0) + ".." + Math.max(...r.fuseAt).toFixed(0) + " (expected round 200 u, all between 150 and 300 - owner 2026-10-20)";
  if (r.homeNear !== 1 || r.homeFar !== 0 || r.fanFire) return "a fan meteor: near (35 u) hit " + r.homeNear + ", far (90 u) " + r.homeFar + ", fires " + r.fanFire + " (expected 1, 0, 0)";
  if (!r.fissure || JSON.stringify(r.kids) !== "[-30,30]" || r.kidGen.some(g => g !== 2) || r.cHits !== 1) return "capstone fissure: kids " + JSON.stringify(r.kids) + " gen " + r.kidGen + ", parent's enemy hit " + r.cHits;
  if (!r.offGone || r.offFires || r.offSteps < 5) return "off view: gone " + r.offGone + " after " + r.offSteps + " steps, fires " + r.offFires;
  return "";
});
check("IFR: a flare's burn pops one charge ON a beam, none off it", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let k = 0; k < 3; k++) upgradeTower(t, "firaga", true); // blast r95: room for an enemy 70 u out (no Backdraft)
    ifrInit(t); const st = towerStats(t), out = {}, a60 = Math.PI / 2 /* (a + arm: the beams are on the axes and diagonals since 2026-10-19) */, a30 = Math.PI / 6;
    const held = (x, y) => { const e = ifrNear("shield", t, 300); e.x = x; e.y = y; e.shield = 5; return e; }; // held still, placed by hand
    const fresh = () => { egridAt = NaN; }; // the enemies moved without a step: rebuild the projectile grid
    // the BURN, by hand (no step: a step walks held enemies back onto the lane)
    const cx = CX, cy = CY, on = held(cx + 40 * Math.cos(a60), cy + 40 * Math.sin(a60)), off = held(cx + 120 * Math.cos(a30), cy + 120 * Math.sin(a30)); fresh();
    ifrFlare(t, st, cx, cy); const f = t.ifrFlares[t.ifrFlares.length - 1]; f.L = 80; f.W = 12; f.edges = false;
    stepIfrFlares(t, st, st.tickS); out.lit = 5 - on.shield; stepIfrFlares(t, st, st.tickS); out.on = 5 - on.shield; out.off = 5 - off.shield; /* CATCHING FIRE: the first tick only lights it, the second burns */
    on.dead = off.dead = true; t.ifrFlares.length = 0;
    return out;
  })()`);
  if (r.lit !== 1 || r.on !== 2) return "the enemy on the 90-degree beam lost " + r.lit + " charges at its first tick and " + r.on + " after two (expected 1, 2: no catching fire - owner 2026-10-20: \"don't require lit for either flares\")";
  if (r.off !== 0) return "the enemy off every beam lost " + r.off + " charges";
  return "";
});
check("IFR: the meteor leads a moving target - it lands on it; the flare glow is no wider than its hit band; charge and damage per the owner's 2026-10-20 notes", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; ifrInit(t); const st = towerStats(t), out = { chargeS: st.chargeS, dmg: st.dmg };
    spawnEnemy("fast", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
    for (let s = entryS(0); s < PATHS[0].len; s += 4) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - 0.9 * st.range); if (d < bd) { bd = d; bs = s; } }
    e.s = bs; const p0 = pathAt(0, bs, 0); e.x = p0.x; e.y = p0.y; e.seen = true; e.hp = e.max = 1e9; e.armor = 0; e.shield = 0; e.jit = 0; e.spd = 1;
    for (const x of G.enemies) if (x !== e) x.dead = true; t.ifrCharge = 1; step(1 / 60); const b = t.ifrBalls[0]; if (!b) return { noBall: true };
    const mid = t.ifrBalls.reduce((m, q) => Math.abs(Math.atan2(q.vy, q.vx) - Math.atan2(e.y - q.y, e.x - q.x)) < Math.abs(Math.atan2(m.vy, m.vx) - Math.atan2(e.y - m.y, e.x - m.x)) ? q : m, b);
    out.aimOff = Math.abs(Math.atan2(mid.vy, mid.vx) - Math.atan2(e.y - mid.y, e.x - mid.x)) * 180 / Math.PI; /* degrees off the enemy's spot at launch: led */ let n = 0; while (!t.ifrFires.length && n++ < 600) step(1 / 60); /* to the first impact (the fan flies on after it) */
    out.r = b.r; const f0 = t.ifrFires[0]; out.hit = !!f0 && Math.hypot(f0.x - e.x, f0.y - e.y) < 30; out.miss = f0 ? Math.hypot(f0.x - e.x, f0.y - e.y) : NaN;
    out.glow2d = IFR_GLOW[0][0]; out.glowGl = IFR_GLOW_GL[0][0];
    out.whites = [IFR_RING_GLOW, IFR_GLOW, IFR_GLOW_GL].flat().filter(q => q[2] === "white").length;
    return out;
  })()`);
  if (r.noBall) return "no meteor launched at a charged tower with a target";
  if (!(r.aimOff > 0.05)) return "the meteor was aimed at the enemy's spot now (" + r.aimOff.toFixed(2) + " degrees off), not ahead of it";
  if (!r.hit) return "a led meteor missed its target: landed " + r.miss.toFixed(1) + " u from it (its radius " + r.r + ")";
  if (r.glow2d > 1 || r.glowGl > 0.5) return "the flare glow is wider than its hit band: 2D " + r.glow2d + " x W, GL half-width " + r.glowGl + " x W";
  if (r.whites) return "IFR still draws white: " + r.whites + " glow layers (owner, 2026-10-20: \"no white\")";
  if (r.chargeS !== 1.7 || r.dmg !== 120) return "untaken: charge " + r.chargeS + " s, dmg " + r.dmg + " (expected 1.7 and 120)";
  return "";
});
check("IFR: the fire (Hellfire, no ring - it burns nothing itself) opens at the meteor's size, grows to its max, lights its flares and goes", () => {
  const r = run(`(() => {
    const fresh = h => { G = newGame(); G.money = 1e9; ui.build = "ifr"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0]; for (let k = 0; k < h; k++) upgradeTower(t, "hellfire", true); ifrInit(t); return t; };
    const held = (t, x, y) => { const e = ifrNear("shield", t, 300); e.x = x; e.y = y; e.shield = 50; return e; };
    let t = fresh(0), st = towerStats(t), out = {};
    const q = held(t, CX + 2, CY); ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR }); const f0 = t.ifrFires[0]; out.r0 = f0.r; out.R0 = f0.R; out.ballR = st.ballR;
    t.ifrFlares.length = 0; const ff = t.ifrFlares; t.ifrFlares = { push() {}, length: 0, shift() {}, findIndex() { return -1; }, splice() {} }; /* flares off: the fire alone */
    try { for (let i = 0; i < 60; i++) stepIfrFires(t, st, 1 / 30); } finally { t.ifrFlares = ff; } out.fireHits = 50 - q.shield; q.dead = true;
    t = fresh(6); st = towerStats(t); ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR }); const f = t.ifrFires[t.ifrFires.length - 1]; const r0 = f.r; t.ifrFlares.length = 0;
    const grow = (st.fireR - r0) / st.fireV; let tm = 0; while (f.r < f.R && tm < 10) { stepIfrFires(t, st, 1 / 30); tm += 1 / 30; }
    out.R6 = f.R; out.grow = tm; out.growWant = grow;
    let tl = 0, lastLit = 0; while (t.ifrFires.length && tl < 60) { const q0 = f.flq ? f.flq.length : -1; stepIfrFires(t, st, 1 / 30); tl += 1 / 30; if (f.flq && f.flq.length !== q0) lastLit = tl; }
    out.goneAfter = tl - lastLit; out.drawn = typeof drawIfrFires === "function";
    ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR }); try { G.towers = G.towers.filter(x => x !== t); for (let i = 0; i < 5; i++) step(1 / 30); out.sold = true; } catch (e) { out.sold = String(e); }
    return out;
  })()`);
  if (r.r0 !== r.ballR || Math.abs(r.R0 - 16 * r.ballR) > 1e-9) return "Hellfire 0: the fire opened at " + r.r0 + " and grows to " + r.R0 + " (expected the meteor's " + r.ballR + ", then 16x it)";
  if (r.fireHits) return "the fire itself hit an enemy " + r.fireHits + " times (owner, 2026-10-20: the ring is gone - only its flares burn)";
  if (r.drawn) return "the fire is still drawn (drawIfrFires)";
  if (r.R6 !== 180) return "Hellfire VI fire grows to " + r.R6 + " (expected 180)";
  if (Math.abs(r.grow - r.growWant) > 1 / 30 + 1e-6) return "the fire took " + r.grow.toFixed(3) + " s to grow (expected " + r.growWant.toFixed(3) + ")";
  if (!(r.goneAfter < 0.1)) return "the fire stayed " + r.goneAfter.toFixed(2) + " s after its last flare (it goes with it)";
  if (r.sold !== true) return "selling the tower with a live fire threw: " + r.sold;
  return "";
});
check("IFR: the DAM core power raises every IFR hit; fires stack, uncapped", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; ifrInit(t); const out = {};
    const hitOf = () => { const amts = [], d0 = damage; damage = (e, amt, ...a) => { amts.push(amt); return d0(e, amt, ...a); };
      try { const st = towerStats(t), e = ifrNear("shield", t, 60); e.shield = 0; egridAt = NaN; t.ifrBalls.length = 0;
        t.ifrBalls.push({ x: e.x, y: e.y, vx: 1, vy: 0, left: 10, r: st.ballR, gen: 0, skip: null }); stepIfrBalls(t, st, 1 / 30); e.dead = true; } finally { damage = d0; }
      return amts[0]; };
    out.off = hitOf(); G.power.DAM = 1; out.on = hitOf(); G.power.DAM = 0;
    for (let k = 0; k < 6; k++) upgradeTower(t, "hellfire", true); const st = towerStats(t);
    t.ifrFires.length = 0; for (let i = 0; i < 40; i++) ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR });
    out.fires = t.ifrFires.length;
    return out;
  })()`);
  if (!(Math.abs(r.on / r.off - 1.6) < 1e-6)) return "DAM: the meteor's hit went " + r.off + " -> " + r.on + " (expected x1.6)";
  if (r.fires !== 40) return "40 impacts left " + r.fires + " live fires (owner, 2026-10-20: \"dont cap fire stacks\")";
  return "";
});
check("IFR flares: one where each meteor lands, the first too (three within 10 u at the Flare capstone); a fire lights its flares on a bell round its first second, inside it, near the centre more often, more of them in a wider fire", () => {
  const r = run(`(() => {
    const fresh = (ax, k) => { G = newGame(); G.money = 1e9; ui.build = "ifr"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0]; for (let i = 0; i < k; i++) upgradeTower(t, ax, true); ifrInit(t); for (const e of G.enemies) e.dead = true; return t; };
    const held = (t, x, y) => { const e = ifrNear("shield", t, 300); e.x = x; e.y = y; e.shield = 50; e.stunT = 1e9; return e; };
    const out = {};
    /* the first hit: a fire, no flare */
    let t = fresh("firaga", 0), st = towerStats(t); const a = held(t, t.x + 60, t.y); egridAt = NaN;
    t.ifrBalls.push({ x: t.x, y: t.y, vx: st.ballV, vy: 0, r: st.ballR, gen: 0, skip: null, left: 10, wait: 0 });
    for (let i = 0; i < 60 && !t.ifrFires.length; i++) stepIfrBalls(t, st, 1 / 60);
    out.firstFlares = t.ifrFlares.length; a.dead = true;
    /* a fan meteor's landing: one flare there; at the Flare capstone three, within IFR_TRIPLE_JIT */
    const land = (t, st) => { t.ifrFlares.length = 0; t.ifrBalls.length = 0; const v = held(t, t.x + 150, t.y); egridAt = NaN; /* past IFR_ARM_HIT_U */
      t.ifrBalls.push({ x: t.x, y: t.y, vx: st.ballV, vy: 0, r: st.ballR, gen: 1, skip: null, left: 10, wait: 0 });
      for (let i = 0; i < 300 && t.ifrBalls.length; i++) stepIfrBalls(t, st, 1 / 60); v.dead = true;
      return { n: t.ifrFlares.length, jit: Math.max(...t.ifrFlares.map(f => Math.hypot(f.x - v.x, f.y - v.y))) }; };
    out.land0 = land(t, st); t = fresh("firaga", 6); st = towerStats(t); out.land6 = land(t, st); out.jmax = IFR_TRIPLE_JIT;
    /* the fire's flares, at Hellfire 0 and 6 */
    const fire = h => { const t = fresh("hellfire", h), st = towerStats(t); ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR }); t.ifrFlares.length = 0; const f = t.ifrFires[0];
      const lit = [], of = ifrFlare; let tm = 0; ifrFlare = function (t2, st2, x, y, sz, big, hf) { if (hf) lit.push({ x, y, t: tm }); return of.apply(this, arguments); };
      try { while ((f.left > 0) && tm < 60) { stepIfrFires(t, st, 1 / 60); tm += 1 / 60; } } finally { ifrFlare = of; }
      const d = lit.map(q => Math.hypot(q.x - CX, q.y - CY)), ts = lit.map(q => q.t).sort((a, b) => a - b);
      return { n: lit.length, R: f.R, meanT: ts.reduce((a, b) => a + b, 0) / ts.length, minGap: Math.min(...ts.slice(1).map((v, i) => v - ts[i])), maxD: Math.max(...d), meanD: d.reduce((x, y) => x + y, 0) / d.length, sizes: new Set(t.ifrFlares.filter(q => q.hf).map(q => q.L.toFixed(2))).size, dens: st.fireDens }; };
    out.f0 = fire(0); out.f3 = fire(3); out.f6 = fire(6); out.base = IFR_FIRE_FLARES; out.timeK = IFR_FIRE_TIME_K;
    /* the fire's flares are the UNTAKEN Flare's, whatever Flare's level (owner, 2026-10-20), and not the meteors' brighter kind */
    { const t = fresh("firaga", 6), st = towerStats(t); ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR }); t.ifrFlares.length = 0; const f = t.ifrFires[0];
      for (let i = 0; i < 600 && t.ifrFires.length; i++) stepIfrFires(t, st, 1 / 60); const hf = t.ifrFlares.filter(q => q.hf);
      out.hfN = hf.length; out.hfL = Math.max(...hf.map(q => q.L)); out.hfLmax = IFR_FLARE_K * IFR_BEAM_L[0] + 1e-6; out.hfHit = hf[0] && hf[0].hit; out.hfHitWant = st.dmg * IFR_TICK_K[0] * st.hfK; out.hfK = st.hfK;
      const k0 = Array.from({ length: 2000 }, () => ifrHfS() / IFR_FLARE_K); out.hfShapes = hf.every(q => q.L / (IFR_FLARE_K * IFR_BEAM_L[0]) <= 1 + 1e-9); out.hfKmin = Math.min(...k0); out.hfKmax = Math.max(...k0); out.hfLife = [...new Set(hf.map(q => q.life))]; out.hfTick = [...new Set(hf.map(q => q.tickS))]; out.hfLifeWant = IFR_HF_LIFE; out.tick0 = IFR_TICK_S[0];
      out.iHf = hf[0] ? ifrFlareI(hf[0]) : NaN; ifrFlare(t, st, CX, CY); const m = t.ifrFlares[t.ifrFlares.length - 1]; out.iMain = ifrFlareI({ ...m, hit: hf[0].hit }); }
    /* the Flare capstone: one BIG flare dead centre of the fire, lit after all its flares */
    { const t = fresh("firaga", 6), st = towerStats(t); ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR }); const f = t.ifrFires[0]; let tm = 0, bigAt = -1, lastSmall = 0;
      while (f.left > 0 && tm < 20) { const n0 = t.ifrFlares.length; stepIfrFires(t, st, 1 / 60); tm += 1 / 60; for (let q = n0; q < t.ifrFlares.length; q++) { if (t.ifrFlares[q].big) bigAt = tm; else lastSmall = tm; } }
      const bigs = t.ifrFlares.filter(q => q.big); out.bigN = bigs.length; out.bigAt = bigAt; out.lastSmall = lastSmall;
      out.bigOff = bigs[0] ? Math.hypot(bigs[0].x - CX, bigs[0].y - CY) : NaN; out.bigL = bigs[0] ? bigs[0].L : NaN; out.bigWant = 1260; /* (0.5 x 12 x the old VI length 210) */ /* PINNED (owner, 2026-10-20): the size of a typical Flare-VI flare when IFR_FLARE_K was 12 - "do not change the flare sizes further without asking" */ out.normMax = IFR_FLARE_K * st.beamL; out.beamVI = [st.beamL, st.beamW]; out.beam0 = [IFR_BEAM_L[0], IFR_BEAM_W[0]]; out.mono = [IFR_BEAM_L, IFR_BEAM_W].every(T => T.every((v, i) => !i || v > T[i - 1])); out.bigHit = bigs[0] && bigs[0].hit; out.bigHitWant = st.dmg * st.flareK * IFR_BIG_K; }
    { const t = fresh("firaga", 0), st = towerStats(t); ifrImpact(t, st, { ax: CX, ay: CY, r: st.ballR }); const f = t.ifrFires[0]; let tm = 0; while (f.left > 0 && tm < 20) { stepIfrFires(t, st, 1 / 60); tm += 1 / 60; } out.bigN0 = t.ifrFlares.filter(q => q.big).length; } out.flareT = IFR_FIRE_FLARE_T; { const z = IFR_FIRE_FLARE_T / IFR_FIRE_FLARE_SD, pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); let cdf = 0; for (let x = -8; x < z; x += 0.001) cdf += Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI) * 0.001; out.flareMean = IFR_FIRE_FLARE_T + IFR_FIRE_FLARE_SD * pdf / cdf; } /* the mean of the bell cut at 0 */
    return out;
  })()`);
  if (r.firstFlares !== 1) return "the first hit lit " + r.firstFlares + " flares (expected one - owner 2026-10-20: every meteor, the first too)";
  if (r.land0.n !== 1 || !(r.land0.jit < 30)) return "a fan meteor's landing lit " + r.land0.n + " flares, " + r.land0.jit + " u off (expected 1 there)";
  if (r.land6.n !== 3 || !(r.land6.jit <= r.jmax + 30)) return "at the Flare capstone a landing lit " + r.land6.n + " flares (expected 3, within " + r.jmax + " u)";
  for (const [k, f] of [["Hellfire 0", r.f0], ["Hellfire VI", r.f6]]) {
    if (!(f.n >= r.base)) return k + ": a grown fire lit " + f.n + " flares (" + r.base + " at the least)";
    if (f.n >= 40 && (Math.abs(f.meanT - r.timeK * r.flareMean * Math.sqrt(f.n / r.base)) > 0.32 * r.timeK * Math.sqrt(f.n / r.base) || !(f.minGap < 0.1))) return k + ": " + f.n + " flares lit at mean " + f.meanT.toFixed(2) + " s, closest " + f.minGap.toFixed(3) + " s apart (expected x" + r.timeK + " a bell round " + r.flareT + " s - mean " + (r.timeK * r.flareMean).toFixed(2) + " with the draws under 0 drawn again, some under 0.1 s apart)";
    if (!(f.maxD <= f.R + 1e-6) || (f.n >= 40 && !(f.meanD < 0.5 * f.R))) return k + ": " + f.n + " flares up to " + f.maxD.toFixed(1) + " u out, mean " + f.meanD.toFixed(1) + " (inside R " + f.R + ", nearer the centre)";
    if (f.sizes < 2) return k + ": its flares are all one size";
  }
  if (Math.abs(r.beamVI[0] - 100) > 1e-6 || Math.abs(r.beamVI[1] - 16) > 1e-6 || Math.abs(r.beam0[0] - 2 * 50 * 100 / 210) > 1e-6 || Math.abs(r.beam0[1] - 2 * 10 * 16 / 24) > 1e-6 || !r.mono) return "Flare tables: VI " + r.beamVI + ", untaken " + r.beam0 + ", rising " + r.mono + " (expected VI 100 x 16, untaken doubled to 47.6 x 13.3, the rest between - owner 2026-10-20)";
  if (r.bigN !== 1 || r.bigN0 !== 0 || !(r.bigOff < 1e-6) || !(r.bigAt >= r.lastSmall) || Math.abs(r.bigL - r.bigWant) > 1e-6 || Math.abs(r.bigHit - r.bigHitWant) > 1e-6) return "the Flare capstone's big flare: " + r.bigN + " (untaken " + r.bigN0 + "), " + r.bigOff + " u off centre, lit at " + r.bigAt + " s after the last flare at " + r.lastSmall + ", L " + r.bigL + " (" + r.bigWant + "), hit " + r.bigHit + " (" + r.bigHitWant + ")";
  if (!(r.hfN >= r.base) || !(r.hfL <= r.hfLmax) || Math.abs(r.hfHit - r.hfHitWant) > 1e-6) return "at Flare VI the fire lit " + r.hfN + " flares up to " + r.hfL + " long, hitting " + r.hfHit + " (expected " + r.base + "+ untaken flares: at most " + r.hfLmax + ", hitting " + r.hfHitWant + ")";
  if (!r.hfShapes || !(r.hfKmin >= 0.1 - 1e-9 && r.hfKmin < 0.12 && r.hfKmax <= 1 + 1e-9 && r.hfKmax > 0.98) || JSON.stringify(r.hfLife) !== JSON.stringify([r.hfLifeWant]) || JSON.stringify(r.hfTick) !== JSON.stringify([r.tick0])) return "the fire's flares: sizes " + r.hfKmin.toFixed(2) + ".." + r.hfKmax.toFixed(2) + " of the largest, burn " + r.hfLife + " s, tick " + r.hfTick + " (expected 10-100%, IFR_HF_LIFE " + r.hfLifeWant + " s, on the untaken tick " + r.tick0 + ")";
  if (!(r.hfK > 1.3 && r.hfK < 2)) return "Flare VI raises the fire's flares x" + r.hfK + " (expected slightly - owner 2026-10-20)";
  if (!(r.iMain > r.iHf)) return "a meteor's flare (" + r.iMain + ") is not brighter than a fire's (" + r.iHf + ") at the same hit (owner, 2026-10-20: more opaque and intense)";
  const dens0 = r.f0.n / r.f0.R ** 2, dens3 = r.f3.n / r.f3.R ** 2;
  if (Math.abs(dens3 / dens0 / (r.f3.dens / r.f0.dens) - 1) > 0.15 || !(r.f3.dens > r.f0.dens)) return "flare density: " + r.f0.n + " in r" + r.f0.R + " vs " + r.f3.n + " in r" + r.f3.R + " (3 buys: expected " + r.f3.dens / r.f0.dens + "x denser - owner 2026-10-20: denser as Hellfire levels)";
  return "";
});
check("auto-move: towers and upgrades are free, and a buy made then bars the leaderboard", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 500; ui.build = "ifr"; autoMove = true; G.autoMove = true;
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0];
    upgradeTower(t, "firaga", true); const out = { money: G.money, towers: G.towers.length, lvl: t.lvl, barred: autoBarred(), spent: t.spent };
    autoMove = false; G.autoMove = false; out.paid = upCost(t) > 0; return out;
  })()`);
  if (r.towers !== 1 || r.lvl < 2) return "auto-move: the free tower / upgrade did not happen (towers " + r.towers + ", lvl " + r.lvl + ")";
  if (r.money < 500 || r.spent !== 0) return "auto-move charged " /* (>=: the first tower starts wave 1, which may pay) */ + (500 - r.money) + "c (spent " + r.spent + ")";
  if (!r.barred) return "a buy during auto-move did not bar the leaderboard";
  if (!r.paid) return "prices stayed 0 after auto-move went off";
  return "";
});
check("Temporal Drive: the field draws", () => {
  run(`G = newGame(); G.core = G.core || {}; G.core.freeze = { t: 1, dur: 10 };`);
  const seen = calls(env, ["drawTimeStop"], () => frames(env, 1));
  return seen.drawTimeStop ? "" : "drawTimeStop never ran";
});

check("two fingers move two towers at once", () => {
  run(`G = newGame(); G.money = 1e6; for (const k of ["arc", "frz"]) { ui.build = k;
         const ci = CELLS.findIndex((c, i) => cellOpen(i) && !G.towers.some(t => t.cell === i)); placeTower(CELLS[ci]); }
       ui.build = null; ui.sel = null;`);
  const cvEl = env.dom.byId("asp-cv"), dpr = run("canvasDpr()");
  const at = (t, dx = 0, dy = 0) => ({ clientX: (t.x * run("cam.k") + run("cam.ox")) / dpr + dx, clientY: (t.y * run("cam.k") + run("cam.oy")) / dpr + dy });
  const [a, b] = run("G.towers.map(t => ({ x: t.x, y: t.y }))");
  cvEl.fire("pointerdown", { pointerId: 1, ...at(a) });
  cvEl.fire("pointerdown", { pointerId: 2, ...at(b) });
  for (let s = 1; s <= 6; s++) { cvEl.fire("pointermove", { pointerId: 1, ...at(a, 4 * s, 0) }); cvEl.fire("pointermove", { pointerId: 2, ...at(b, 0, 4 * s) }); }
  const held = run("G.towers.map(t => towerHeld(t))");
  cvEl.fire("pointerup", { pointerId: 1, ...at(a, 24, 0) }); cvEl.fire("pointerup", { pointerId: 2, ...at(b, 0, 24) });
  const [a2, b2] = run("G.towers.map(t => ({ x: t.x, y: t.y }))");
  const moved = [Math.hypot(a2.x - a.x, a2.y - a.y), Math.hypot(b2.x - b.x, b2.y - b.y)];
  if (!held.every(Boolean)) return "not both held: " + JSON.stringify(held);
  return moved.every(m => m > 5) ? "" : "moved only " + moved.map(m => m.toFixed(1)).join(" / ") + " units";
});
check("a flung tower coasts on after release, then stops", () => {
  run(`G = newGame(); G.money = 1e6; ui.build = "acd"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null; ui.sel = null; G.started = false;`);
  const cvEl = env.dom.byId("asp-cv"), dpr = run("canvasDpr()");
  const t0 = run("({ x: G.towers[0].x, y: G.towers[0].y })");
  const at = (dx, dy) => ({ clientX: (t0.x * run("cam.k") + run("cam.ox")) / dpr + dx, clientY: (t0.y * run("cam.k") + run("cam.oy")) / dpr + dy });
  cvEl.fire("pointerdown", { pointerId: 7, ...at(0, 0) });
  for (let s = 1; s <= 5; s++) { frames(env, 1); cvEl.fire("pointermove", { pointerId: 7, ...at(0, -6 * s) }); }
  cvEl.fire("pointerup", { pointerId: 7, ...at(0, -30) });
  const p0 = run("({ x: G.towers[0].x, y: G.towers[0].y, f: !!G.towers[0].fling })");
  if (!p0.f) return "no momentum after a fast drag";
  frames(env, 10);
  const p1 = run("({ x: G.towers[0].x, y: G.towers[0].y })");
  if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 2) return "did not coast";
  frames(env, 240);
  return run("G.towers[0].fling") ? "never came to rest" : "";
});
check("a flung tower bounces off its leash", () => {
  run(`G = newGame(); G.money = 1e6; ui.build = "arc"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null;`);
  run(`{ const t = G.towers[0], c = CELLS[t.cell], dx = c.x - CX, dy = c.y - CY, d = Math.hypot(dx, dy);
         t.fling = { vx: dx / d * 3000, vy: dy / d * 3000 }; globalThis.__out = { x: dx / d, y: dy / d }; }`); // straight OUT, at the rim fast
  let flipped = false;
  for (let i = 0; i < 120 && run("!!G.towers[0].fling"); i++) { frames(env, 1); if (run("G.towers[0].fling && G.towers[0].fling.vx * __out.x + G.towers[0].fling.vy * __out.y < 0")) flipped = true; }
  return flipped ? "" : "never bounced back off the leash";
});
check("a lost life: 'X lives left' replaces the interest line", () => {
  run(`G = newGame(); G.lives = 7; livesLost();`);
  for (const r of env.dom.recs) r.texts.length = 0;
  frames(env, 1);
  const texts = env.dom.recs.flatMap(r => r.texts);
  return texts.some(t => /^7 lives left$/.test(t)) ? "" : "no '7 lives left' among " + texts.length + " texts";
});

check("IFR's look: the charge grows to the meteor, an inner glow from 30% at the outline, flares brighten with their hit", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; ifrInit(t); const st = towerStats(t), out = {};
    const rec = fn => { const A = [], F = [], oa = ctx.arc, of = ctx.fill; ctx.arc = function (x, y, r, ...a) { A.push({ r, a: ctx.globalAlpha }); return oa.call(this, x, y, r, ...a); }; ctx.fill = function (...a) { F.push(ctx.fillStyle); return of.apply(this, a); }; try { fn(); } finally { ctx.arc = oa; ctx.fill = of; } return { A, F }; };
    t.ifrCharge = 0.5; const R = st.ballR * 0.65, c = rec(() => drawIfrTop(t));
    out.outer = Math.max(...c.A.map(q => q.r)); out.R = R;
    const inner = c.A.filter(q => q.r < R - 1e-6); out.innerMin = Math.min(...inner.map(q => q.r)) / R; out.innerA = Math.max(...inner.map(q => q.a)); out.innerN = inner.length;
    out.hfBright = ifrFlareI({ hf: true, hit: TOWERS.ifr.dmg * IFR_TICK_K[0] * IFR_HF_FK[6] }) > ifrFlareI({ hf: true, hit: TOWERS.ifr.dmg * IFR_TICK_K[0] });
    out.coreHf = ifrFlareCol("yellow", { hf: true }) === COL.tifr; out.coreMain = ifrFlareCol("yellow", {}) === COL.white && ifrFlareCol("orange", {}) === COL.yellow; out.haloHf = ifrFlareCol("glow", { hf: true }) === COL.threat; out.mainK = IFR_FLARE_MAIN_K;
    const ref = TOWERS.ifr.dmg * IFR_TICK_K[0]; out.i1 = ifrFlareI({ hit: ref, hf: true }); out.i2 = ifrFlareI({ hit: 2 * ref, hf: true }); out.i0 = ifrFlareI({ hit: ref / 10, hf: true });
    return out;
  })()`);
  if (Math.abs(r.outer - r.R) > 1e-6) return "a half charge's outline is r " + r.outer + " (expected 0.65 x the meteor, " + r.R + ")";
  if (!r.innerN || r.innerMin < 0.7 - 1e-6 || !(r.innerA <= 0.3 + 1e-6 && r.innerA > 0.2)) return "inner glow: " + r.innerN + " rings, deepest at " + r.innerMin + " r, brightest " + r.innerA + " (expected down to 0.7 r, 0.3 at the outline)";
  if (!r.hfBright) return "a fire flare from a higher Flare level is not brighter (owner, 2026-10-20)";
  if (!r.coreHf || !r.coreMain || !r.haloHf || r.mainK !== 3) return "flare colours: the fire's orange core " + r.coreHf + ", red halo " + r.haloHf + ", a meteor's white core (yellow round it) " + r.coreMain + ", meteor flares x" + r.mainK + " (owner, 2026-10-20: red outside, orange inside; meteor flares brighter)";
  if (r.i1 !== 3 || !(r.i2 > r.i1 && r.i2 <= 6) || r.i0 !== 3) return "flare intensity " + [r.i0, r.i1, r.i2] + " (expected 3 at or under the untaken hit - much more visible, owner 2026-10-20 - brighter at twice it, capped at 6)";
  return "";
});
check("IFR: draws its charge, meteors, fires and flares; G clones; selling mid-flight throws nothing", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let i = 0; i < 90; i++) step(1 / 30);
    ifrNear("swarm", t, 90);
    for (let i = 0; i < 30; i++) step(1 / 30); /* 1 s: the meteor has landed, its fire and fan live */
    const out = { live: t.ifrBalls.length + t.ifrFires.length + t.ifrFlares.length };
    const fn = v => typeof v === "function" || (v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) || (v && typeof v === "object" && Object.values(v).some(fn)); // a function or a non-plain object anywhere in G breaks the autosave's structured clone
    out.cloned = !fn({ t: [t.ifrBalls, t.ifrFires, t.ifrFlares] });
    return out;
  })()`);
  if (!r.live) return "burst produced no IFR effects";
  if (r.cloned !== true) return "G does not clone: " + r.cloned;
  const seen = calls(env, ["drawIfr"], () => frames(env, 2));
  if (!seen.drawIfr) return "drawIfr never called";
  if (run("G.towers[0].ifrFlares.length") && run("q3d()") && !calls(env, ["fxGlGlowLine"], () => frames(env, 1)).fxGlGlowLine) return "3D: the flare spokes never reached the GPU (fxGlGlowLine)";
  const n = drawn(env, () => run("drawIfr(); drawIfr(true)")).n; /* both passes: the rings, pellets and spokes, then the balls in skyKeep */
  if (n < 20) return "only " + n + " canvas calls with IFR effects live";
  const sold = run(`(() => { try { const t = G.towers[0]; G.money += sellValue(t); G.towers = G.towers.filter(x => x !== t); ui.sel = null; for (let i = 0; i < 30; i++) step(1 / 30); return "ok"; } catch (e) { return String(e); } })()`); // what the card's sell button does (aspira-sliders.js)
  return sold === "ok" ? "" : "sell threw: " + sold;
});
check("IFR: a shielded enemy in a flare loses one charge a tick; Impact gives a huge meteor", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let k = 0; k < 6; k++) upgradeTower(t, "meteor", true);
    const st = towerStats(t), out = { ballR: st.ballR };
    ifrInit(t); const e = ifrNear("shield", t, 400); e.shield = 9; egridAt = NaN; /* out of the tower's range: no ball, only the flare below touches it */
    out.dist = Math.round(Math.hypot(e.x - t.x, e.y - t.y));
    t.ifrFlares.push({ x: e.x - 40, y: e.y, L: 80, W: 12, life: 3, left: 3, tick: 0, edges: false }); /* 40 u left of it: the 0-degree beam runs through its body */
    for (let i = 0; i < 3; i++) stepIfrFlares(t, st, st.tickS); out.afterTicks = e.shield; /* 3 ticks: the first lights it (CATCHING FIRE), the next two burn */
    return out;
  })()`);
  if (Math.abs(r.ballR - 5.4) > 1e-9) return "Impact gives a meteor of radius " + r.ballR + ", not 5.4";
  if (r.afterTicks !== 6) return "3 burn ticks left " + r.afterTicks + " charges of 9 (expected 6: every tick burns), enemy " + r.dist + " u out";
  return "";
});
check("IFR: no cap on live flares (owner, 2026-10-20: \"actually no cap\"); a frame of 700 fire flares (random tick phases) over 200 enemies stays under 12 ms", () => {
  const n = run(`(() => { G = newGame(); G.money = 1e9; ui.build = "ifr"; { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); }
    const t = G.towers[0]; ifrInit(t); const st = towerStats(t);
    for (let i = 0; i < 200; i++) { spawnEnemy("swarm", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; e.s = entryS(0) + i * 3; const p = pathAt(0, e.s, 0); e.x = p.x; e.y = p.y; e.seen = true; e.stunT = 1e9; e.hp = e.max = 1e9; }
    for (let i = 0; i < 700; i++) { ifrFlare(t, st, CX - 200 + (i % 40) * 10, CY - 150 + Math.floor(i / 40) * 15, ifrHfS(), false, true); t.ifrFlares[t.ifrFlares.length - 1].tick = Math.random() * 0.25; }
    return t.ifrFlares.length; })()`);
  run("{ const t = G.towers[0], st = towerStats(t); for (let i = 0; i < 3; i++) stepIfrFlares(t, st, 1 / 60); }");
  let ms = Infinity;
  for (let i = 0; i < 10; i++) { const t0 = performance.now(); run("{ const t = G.towers[0], st = towerStats(t); for (const f of t.ifrFlares) f.left = 1; stepIfrFlares(t, st, 1 / 60); }"); ms = Math.min(ms, performance.now() - t0); }
  console.log("  700 fire flares, a frame: " + ms.toFixed(1) + " ms");
  if (n !== 700) return "a tower kept " + n + " live flares of 700 lit (expected all: no cap)";
  return ms < 12 ? "" : "a frame of 700 fire flares over 200 enemies took " + ms.toFixed(1) + " ms";
});
check("IFR: 200 enemies and 40 Flare VI flares tick under 16 ms", () => {
  run(`G = newGame(); G.money = 1e9; ui.build = "ifr";
    { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); }
    { const t = G.towers[0]; ifrInit(t); for (let k = 0; k < 6; k++) upgradeTower(t, "firaga", true);
      for (let i = 0; i < 200; i++) { spawnEnemy("swarm", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; e.s = entryS(0) + i * 3; const p = pathAt(0, e.s, 0); e.x = p.x; e.y = p.y; e.seen = true; e.stunT = 1e9; e.hp = e.max = 1e6; } egridAt = NaN;
      for (let i = 0; i < 40; i++) t.ifrFlares.push({ x: CX - 300 + i * 15, y: CY - 200 + i * 10, L: 140, W: 24, life: 10, left: 10, tick: 0, edges: true }); }`);
  run("{ const t = G.towers[0], st = towerStats(t); for (let i = 0; i < 3; i++) stepIfrFlares(t, st, st.tickS); }"); /* warm the JIT first, as a running game is */
  let ms = Infinity; /* the FASTEST of 10 single ticks, on the HOST clock (the vm's performance.now is dom.mjs's fake frame clock): a balance run saturating every core doubled the mean (2026-10-19), the minimum is what the code costs */
  for (let i = 0; i < 10; i++) { const t0 = performance.now(); run("{ const t = G.towers[0], st = towerStats(t); stepIfrFlares(t, st, st.tickS); }"); ms = Math.min(ms, performance.now() - t0); }
  console.log("  hellfire tick " + ms.toFixed(1) + " ms");
  if (!run("G.enemies.some(e => e.hp < 1e6)")) return "Hellfire ticks hit nothing";
  return ms < 16 /* was 8 (owner, 2026-10-20): the droplet now measures 9-18 ms on code that passed - box drift, not a regression; 16 still catches a 2x */ ? "" : "a Hellfire tick took " + ms.toFixed(1) + " ms";
});
check("the slow-log report builds and sends (perfSend - it runs from the frame loop every 3 min: a throw there froze the game, 6.1.1-6.1.7)", () => {
  run(`G = newGame(); { const v = document.querySelector(".asp-ver span"); v.parentNode = document.createElement("div"); } perf.act.playing = [5, 0];`); // (the fake DOM's span has no parent; some play, so it builds the whole report)
  run("perfSend()");
  return "";
});
check("a resumed save is the board at rest: towers on their slots, no enemies, pools or interceptors (runClean)", () => {
  run(`G = newGame(); G.money = 1e6; for (const k of ["acd", "grv", "car"]) { ui.build = k;
         const ci = CELLS.findIndex((c, i) => cellOpen(i) && !G.towers.some(t => t.cell === i)); placeTower(CELLS[ci]); }
       G.towers[0].x += 40; G.started = true; sendWave(); for (let i = 0; i < 300; i++) step(1 / 30);`);
  const r = run(`(() => { const saved = { G: runClean(structuredClone(G)), wave: G.wave, lives: G.lives }; runResume(saved);
    return { off: G.towers.filter(t => t.x !== CELLS[t.cell].x || t.y !== CELLS[t.cell].y).length, enemies: G.enemies.length,
             junk: G.towers.filter(t => t.puddles || t.spheres || t.icp || t.carBolts).length, n: G.towers.length }; })()`);
  if (r.n !== 3) return "lost towers: " + r.n;
  if (r.off || r.enemies || r.junk) return JSON.stringify(r);
  frames(env, 3); // and the game runs on from it
  return "";
});
check("the resume card up: no tower can be built behind it (placeTower stands down)", () => {
  const n = run(`(() => { G = newGame(); G.money = 1e6; runOffer({ wave: 10, lives: 20 }); ui.build = "acd";
    placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); const n = G.towers.length + (G.started ? 100 : 0);
    document.getElementById("asp-resume").remove(); ui.paused = false; return n; })()`);
  return n ? "built behind the card: " + n : "";
});
check("a wave's card: tapping a wave opens its stats - no NaN, no zero rows - on an ordinary wave and a boss wave", () => {
  run(`G = newGame(); G.started = true; G.wave = STAR_EVERY - 2; refreshPanels();`); frames(env, 2);
  const r = run(`(() => { const out = {}; for (const n of [G.wave + 1, G.wave + 2]) { if (!WAVE_PLANS.has(n)) WAVE_PLANS.set(n, wavePlan(n, G.lastType));
      const before = G.enemies.length; openWaveCard(n); const c = document.getElementById("asp-wavecard");
      out[n] = { html: c ? c.innerHTML : "", left: G.enemies.length - before, paused: ui.paused }; closeWaveCard(); } return out; })()`);
  for (const [n, c] of Object.entries(r)) {
    if (!c.html) return "no card for wave " + n;
    if (/NaN|undefined|>0<\/td>/.test(c.html)) return "bad value on wave " + n + ": " + c.html.slice(0, 200);
    if (c.left) return "the sample enemy stayed on the board (wave " + n + ")";
    if (!/speed/.test(c.html)) return "no speed row on wave " + n;
  }
  return "";
});
check("game over shows the overlay and the Ascendants board, no entry", () => {
  run(`G = newGame(); gameOver();`);
  const ov = env.dom.byId("asp-ov"), asc = env.dom.byId("asp-asc");
  if (ov.hidden) return "overlay hidden";
  if (!asc || asc.hidden || !/asp-asc-board/.test(asc.innerHTML)) return "no board on a loss";
  return /asp-asc-in/.test(asc.innerHTML) ? "an initials entry on a loss" : "";
});
check("a game over past wave 10 may post to TOP PLAYERS", () => {
  run(`G = newGame(); G.wave = 15; gameOver();`);
  const asc = env.dom.byId("asp-asc");
  if (!asc || asc.hidden) return "no board";
  if (!/Top players/.test(asc.innerHTML)) return "not titled Top players";
  return /asp-asc-in/.test(asc.innerHTML) ? "" : "no initials entry at wave 15";
});
check("a win shows THE ASCENDANTS entry", () => {
  run(`G = newGame(); G.lives = 30; winGame();`);
  const asc = env.dom.byId("asp-asc");
  if (!asc || asc.hidden) return "no Ascendants box on a win";
  return /asp-asc-in/.test(asc.innerHTML) ? "" : "no initials input";
});
check("play again starts a fresh game", () => {
  env.dom.byId("asp-ov-btn").onclick();
  return run("G.over") ? "still over" : "";
});

check("slots: landscape is portrait turned +90 degrees; switching back restores exactly", () => {
  const e = boot({}, { w: 390, h: 844 });
  const r = e.run(`(() => { const before = CELLS.map(c => [c.x, c.y, c.ang]); setPlayBox(true);
    const turned = CELLS.every((c, i) => Math.abs(c.x - (CX - (before[i][1] - CY))) < 1e-9 && Math.abs(c.y - (CY + (before[i][0] - CX))) < 1e-9 && c.ang === before[i][2]);
    setPlayBox(false); const back = CELLS.every((c, i) => c.x === before[i][0] && c.y === before[i][1]); return { turned, back }; })()`);
  if (!r.turned) return "landscape slots are not the portrait slots turned +90";
  if (!r.back) return "portrait slots not restored exactly";
});
check("a built tower moves with its slot when the box switches", () => {
  const e = boot({}, { w: 390, h: 844 });
  const r = e.run(`(() => { G.money = 1e6; ui.build = "arc"; const c = CELLS[0]; placeTower({ x: c.x, y: c.y }); const t = G.towers[0];
    t.x = c.x + 5; t.y = c.y + 3; t.goal = { x: c.x + 4, y: c.y - 6 };
    const d = (o, k) => [o.x - CELLS[t.cell].x, o.y - CELLS[t.cell].y];
    const err = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    setPlayBox(true); const w = [d(t), d(t.goal)];
    const wideT = err(w[0], [-3, 5]), wideG = err(w[1], [6, 4]);
    setPlayBox(false); const p = [d(t), d(t.goal)];
    return { wideT, wideG, backT: err(p[0], [5, 3]), backG: err(p[1], [4, -6]) }; })()`);
  for (const k in r) if (!(r[k] < 1e-6)) return k + " off by " + r[k];
});

check("lanes: every pick has the smallest copy spread (within slack)", () => {
  const e = boot({}, { w: 390, h: 844 });
  const bad = e.run(`(() => { const out = []; for (let pi = 1; pi < PATHS.length; pi += 2) for (const k of [2, 3, 6]) {
      const sc = laneTurnScores(pi, k), t = laneBestTurn(pi, k, 7), i = Math.round(t / (Math.PI * 2 / LANE_TURNS)) % LANE_TURNS;
      const minS = Math.min(...sc.map(s => s.spread)), maxT = Math.max(...sc.map(s => s.total));
      if (sc[i].spread > minS + LANE_EVEN_SLACK * maxT + 1e-9) out.push(pi + "/" + k); } return out; })()`);
  if (bad.length) return "picks not the most even: " + bad.join(", ");
});
check("landscape: a tower on an open slot meets wave 1 (slots and lane picks agree)", () => {
  const e = boot({}, { w: 1280, h: 800 });
  const r = e.run(`(() => { G = newGame(); G.money = 1e6; ui.build = "arc"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; let near = Infinity; G.started = true; sendWave();
    for (let i = 0; i < 600; i++) { step(1 / 30); for (const en of G.enemies) near = Math.min(near, Math.hypot(en.x - t.x, en.y - t.y)); }
    return { wide: BOX_WIDE, near, range: t.range, dealt: t.dealt || 0 }; })()`);
  if (!r.wide) return "did not boot landscape";
  if (!(r.dealt > 0 || r.near <= r.range)) return "no enemy came within range (nearest " + r.near + ", range " + r.range + ")";
});

const bad = results.filter(r => r[1] !== "ok");
for (const [n, r] of results) console.log((r === "ok" ? "  ok    " : "  FAIL  ") + n + (r === "ok" ? "" : "\n          " + r.slice(6)));
console.log(bad.length ? `\nspire smoke: ${bad.length} of ${results.length} FAILED` : `\nspire smoke: all ${results.length} passed`);
process.exit(bad.length ? 1 : 0);
