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
check("IFR: charges on its corners, holds one ball at base, launches at a target in range, re-picks its first corner once empty", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e6; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0], out = {};
    for (let i = 0; i < 150; i++) { for (const e of G.enemies) e.stunT = 1e9; step(1 / 30); } // 5 s: one ball charged, a second cannot start (1 slot); wave 1 is held at the gate, out of range
    out.slot0 = t.ifrSlot0; out.corners = ifrSlotCorners(t, 3); // the corner is picked on the tower's first step (ifrInit)
    out.ready = t.ifrReady; out.charge = t.ifrCharge;
    const c = ifrCorner(t, t.ifrSlot0); out.onCorner = Math.abs(Math.hypot(c.x - t.x, c.y - t.y) - CELL_S * TOWER_K) < 1;
    ifrNear("armor", t, 100);
    const rnd = Math.random; Math.random = () => 0.99; try { step(1 / 30); } finally { Math.random = rnd; } /* the launch empties the slots: corner 5 */
    out.readyAfter = t.ifrReady; out.balls = (t.ifrBalls || []).length; out.slot0After = t.ifrSlot0;
    return out;
  })()`);
  if (!(r.slot0 >= 0 && r.slot0 < 6)) return "no corner picked at build: " + r.slot0;
  if (JSON.stringify(r.corners.map(c => (c - r.slot0 + 6) % 6).sort()) !== "[0,2,4]") return "3 slots are not every other corner: " + r.corners;
  if (!r.onCorner) return "the slot is not on the hex corner";
  if (r.ready !== 1 || r.charge !== 0) return "after 5 s: ready " + r.ready + " charge " + r.charge + " (expected 1 ball, the second not charging)";
  if (r.readyAfter !== 0 || r.balls !== 1) return "no launch at a target in range: ready " + r.readyAfter + " balls " + r.balls;
  if (r.slot0After !== 5) return "the empty tower did not re-pick its first corner (Math.random 0.99 -> 5, got " + r.slot0After + ")";
  return "";
});
check("IFR: a ball bursts where it was aimed (its target gone), the ring hits once, pellets fly, a flare burns", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let k = 0; k < 6; k++) upgradeTower(t, "firaga", true); // Backdraft: three flares a pellet
    const hold = () => { for (const x of G.enemies) x.stunT = 1e9; step(1 / 30); }; // wave 1 held at the gate: it walked into range and took the first ball
    for (let i = 0; i < 90; i++) hold(); // a ball charged
    const e = ifrNear("shield", t, 120), f = ifrNear("shield", t, 120); e.shield = 5; f.shield = 5; const ex = e.x, ey = e.y;
    const fp = pathAt(0, e.s + 4, 0); f.s = e.s + 4; f.x = fp.x; f.y = fp.y; // f 4 u down the lane (ifrNear at 125 u picked another lane point)
    hold(); const ball = t.ifrBalls[0]; if (!ball) return { noBall: true };
    const aimedAt = Math.hypot(ball.ax - ex, ball.ay - ey) < 1 || Math.hypot(ball.ax - f.x, ball.ay - f.y) < 1;
    e.dead = true; e.gone = true; // the target dies in flight (f, 4 u down the lane, stays)
    let n = 0; while (t.ifrBalls.length && n++ < 200) hold();
    const out = { aimed: aimedAt, rings: t.ifrRings.length, pellets: t.ifrPellets.length };
    for (let i = 0; i < 120; i++) { hold(); out.rings = Math.max(out.rings, t.ifrRings.length); } // pellets land, the ring opens (last) and passes f, flares tick (120: IFR_PELLET_V 100 since 2026-10-20)
    out.fShield = f.shield; out.flares = t.ifrFlares.length; out.fHits = f.shield < 5;
    return out;
  })()`);
  if (r.noBall) return "no ball launched";
  if (!r.aimed) return "the ball was not aimed at the target's spot at launch";
  if (r.rings < 1) return "no ring where the ball landed (target gone)";
  if (!(r.pellets >= 1 || r.flares >= 1)) return "no pellets / flares after the burst";
  if (!r.fHits) return "the second enemy inside the blast lost no shield charge";
  return "";
});
check("IFR: a flare's burn pops one charge ON a beam, none off it; a plain ring hits once; pellets fly outward in different directions, each stopping by the blast radius", () => {
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
    // a PLAIN ring (k 1) over a held enemy 20 u off its spot, run until fully grown and gone
    const q = held(cx + 20, cy); fresh(); ifrRing(t, cx, cy, st.blastR, 1); t.ifrPellets.length = 0; /* (ifrRing: a ball's own ring waits for its pellets - below) */
    for (let i = 0; i < 60; i++) stepIfrRings(t, st, 1 / 30); /* 60 not 30: the ring is slower (IFR_RING_V 220) and bigger (x1.3), then fades out 0.15 s (owner, 2026-10-19) */
    out.ring = 5 - q.shield; out.ringsLeft = t.ifrRings.length; q.dead = true;
    // PELLETS (owner, 2026-10-19: random directions, enemies there or not): a burst on empty ground - each flies OUT from the
    // spot on its own heading and stops (a flare) no further than the blast radius + a frame
    for (const e of G.enemies) e.dead = true; fresh(); t.ifrFlares.length = 0;
    t.ifrRings.length = 0; ifrBurst(t, st, cx, cy, 1); const ps = t.ifrPellets.slice(); out.ringEarly = t.ifrRings.length;
    out.waitMax = Math.max(...ps.map(p => p.wait)); out.waitSpread = new Set(ps.map(p => p.wait.toFixed(3))).size; out.spreadS = IFR_PELLET_SPREAD_S; for (const p of ps) p.wait = 0; /* launch times spread (owner, 2026-10-20); zeroed so one step moves every pellet */
    out.fired = ps.length; out.want = st.pellets; out.headings = new Set(ps.map(p => Math.atan2(p.vy, p.vx).toFixed(3))).size;
    const d0 = ps.map(p => Math.hypot(p.x - cx, p.y - cy)); stepIfrPellets(t, st, 1 / 30);
    out.outward = ps.every((p, i) => Math.hypot(p.x - cx, p.y - cy) > d0[i]); out.flying = t.ifrPellets.length;
    for (let i = 0; i < 120 /* (IFR_PELLET_V 100 since 2026-10-20) */ && t.ifrPellets.length; i++) stepIfrPellets(t, st, 1 / 30);
    out.left = t.ifrPellets.length; out.flares = t.ifrFlares.length; 
    out.reach = Math.max(...t.ifrFlares.map(f => Math.hypot(f.x - cx, f.y - cy))); out.maxReach = st.blastR * IFR_PELLET_REACH + IFR_PELLET_V / 30;
    return out;
  })()`);
  if (r.lit !== 0 || r.on !== 1) return "the enemy on the 90-degree beam lost " + r.lit + " charges at its first tick (expected 0: it only catches fire) and " + r.on + " after two (expected exactly 1)";
  if (r.off !== 0) return "the enemy off every beam lost " + r.off + " charges";
  if (r.ringEarly !== 1) return "a ball's burst opened " + r.ringEarly + " rings (expected 1, at once: the ring opens on landing since 2026-10-20)";
  if (r.ring !== 1 || r.ringsLeft) return "a plain ring took " + r.ring + " charges (expected exactly 1), rings left " + r.ringsLeft;
  if (r.fired !== r.want) return "an empty burst fired " + r.fired + " pellets (expected " + r.want + ")";
  if (r.headings < 2) return "every pellet flew on the same heading";
  if (r.waitSpread < 2 || !(r.waitMax <= r.spreadS)) return "pellet launch times not spread over " + r.spreadS + " s (distinct " + r.waitSpread + ", max " + r.waitMax + ")";
  if (!r.outward || r.flying < 1) return "the pellets did not fly outward from the burst (outward " + r.outward + ", flying " + r.flying + ")";
  if (r.left || r.flares !== r.fired) return "pellets left " + r.left + ", flares " + r.flares + " of " + r.fired;
  if (!(r.reach <= r.maxReach)) return "a pellet stopped " + Math.round(r.reach) + " u out, past the blast radius x IFR_PELLET_REACH + a frame (" + Math.round(r.maxReach) + ")";
  return "";
});
check("IFR: a pellet passes through, hits a body it rides along again, lands where aimed; Backdraft lands three flares", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; ifrInit(t); const out = {};
    const held = (x, y) => { const e = ifrNear("shield", t, 300); e.x = x; e.y = y; e.shield = 50; return e; };
    const shot = (st, d) => { t.ifrPellets.length = 0; t.ifrFlares.length = 0; t.ifrPellets.push({ x: CX, y: CY, ax: CX + d, ay: CY, vx: IFR_PELLET_V, vy: 0, left: d / IFR_PELLET_V, flown: 0, age: 0, burst: null, hit: {} }); };
    // two held bodies on one pellet's line: it passes through the first, hits the second, lands at its aim
    let st = towerStats(t); const a = held(CX + 40, CY), b = held(CX + 80, CY); egridAt = NaN;
    shot(st, 120); for (let i = 0; i < 60 && t.ifrPellets.length; i++) stepIfrPellets(t, st, 1 / 30);
    out.a = 50 - a.shield; out.b = 50 - b.shield; out.flares = t.ifrFlares.length; out.land = t.ifrFlares[0] ? t.ifrFlares[0].x - CX : NaN;
    a.dead = b.dead = true;
    // RE-HIT: a body moved along with the pellet stays on it - hit more than once
    const c = held(CX + 30, CY); egridAt = NaN; shot(st, 200);
    for (let i = 0; i < 30; i++) { stepIfrPellets(t, st, 1 / 30); if (t.ifrPellets[0]) { c.x = t.ifrPellets[0].x; egridAt = NaN; } }
    out.ride = 50 - c.shield; c.dead = true;
    // Backdraft: three flares per landed pellet, near its aim
    for (let k = 0; k < 6; k++) upgradeTower(t, "firaga", true); st = towerStats(t);
    shot(st, 60); for (let i = 0; i < 60 && t.ifrPellets.length; i++) stepIfrPellets(t, st, 1 / 30);
    out.triple = t.ifrFlares.length; out.jmax = IFR_TRIPLE_JIT; out.jit = Math.max(...t.ifrFlares.map(f => Math.hypot(f.x - CX - 60, f.y - CY)));
    return out;
  })()`);
  if (!(r.a >= 1 && r.b >= 1)) return "a pellet through two bodies popped " + r.a + " and " + r.b + " (expected 1+ each: it passes through)";
  if (r.flares !== 1 || Math.abs(r.land - 120) > 1) return "the pellet did not land one flare at its aim (flares " + r.flares + ", at " + r.land + ")";
  if (!(r.ride >= 2)) return "a body riding along with a pellet was hit " + r.ride + " times (expected 2+)";
  if (r.triple !== 3 || !(r.jit <= r.jmax + 0.01)) return "Backdraft landed " + r.triple + " flares, up to " + r.jit + " u off (expected 3 within " + r.jmax + ")";
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

check("IFR: draws its charge balls, rings and flares; G clones; selling mid-flight throws nothing", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let i = 0; i < 90; i++) step(1 / 30);
    ifrNear("swarm", t, 90);
    for (let i = 0; i < 60; i++) step(1 / 30);
    const out = { live: t.ifrBalls.length + t.ifrRings.length + t.ifrPellets.length + t.ifrFlares.length };
    const fn = v => typeof v === "function" || (v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) || (v && typeof v === "object" && Object.values(v).some(fn)); // a function or a non-plain object anywhere in G breaks the autosave's structured clone
    out.cloned = !fn({ t: [t.ifrBalls, t.ifrRings, t.ifrPellets, t.ifrFlares] });
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
check("IFR: a shielded enemy in a flare catches fire, then loses one charge a tick; the ring pops one; Impact gives six slots", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let k = 0; k < 6; k++) upgradeTower(t, "meteor", true);
    const st = towerStats(t), out = { slots: st.slots };
    ifrInit(t); const e = ifrNear("shield", t, 400); e.shield = 9; egridAt = NaN; /* out of the tower's range: no ball, only the flare below touches it */
    out.dist = Math.round(Math.hypot(e.x - t.x, e.y - t.y));
    t.ifrFlares.push({ x: e.x - 40, y: e.y, L: 80, W: 12, life: 3, left: 3, tick: 0, edges: false }); /* 40 u left of it: the 0-degree beam runs through its body */
    for (let i = 0; i < 3; i++) stepIfrFlares(t, st, st.tickS); out.afterTicks = e.shield; /* 3 ticks: the first lights it (CATCHING FIRE), the next two burn */
    return out;
  })()`);
  if (r.slots !== 6) return "Impact gives " + r.slots + " slots, not 6";
  if (r.afterTicks !== 7) return "3 burn ticks left " + r.afterTicks + " charges of 9 (expected 7: the first tick only lights it), enemy " + r.dist + " u out";
  return "";
});
/* worst case: 40 Hellfire-VI flares tick in the SAME frame (in play each ticks on its own phase); about 2.4 ms of it is damage()/onHit on ~200 hit enemies, which any tower pays - the guard is for the traversal (~3 ms), a regression to all-flares x all-enemies */
check("IFR: 200 enemies and 40 Hellfire flares tick under 16 ms", () => {
  run(`G = newGame(); G.money = 1e9; ui.build = "ifr";
    { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); }
    { const t = G.towers[0]; ifrInit(t); for (let k = 0; k < 6; k++) upgradeTower(t, "hellfire", true);
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
