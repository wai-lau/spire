// /spire RULE PINS (2026-11-05): rules shipped without a check of their own. Each one FAILS on the behaviour it replaced (proven by
// putting the old code back on a scratch copy). Registered into the smoke harness; smoke.mjs imports this file before it reports.
// Its own page env, so the smoke checks' game state never leaks in.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { boot, check, frames } from "./harness.mjs";
import { makeGame } from "../aspira-sim/sim.mjs";

const env = boot(), { run } = env;
// a fresh game with one CRR bought to `skills` and enemies held ON LANE 0 at about each distance (a stepped game re-reads a spot from its lane)
run(`function pinCrr(skills, dists, hp = 1e9) {
  G = newGame(); G.money = 1e9; ui.build = "crr"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
  const t = G.towers[0]; t.skills = { ...skills }; t.lvl = 1 + towerLevel(t);
  const es = dists.map(dist => { spawnEnemy("armor", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
    for (let s = entryS(0); s < PATHS[0].len; s += 4) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - dist); if (d < bd) { bd = d; bs = s; } }
    const p = pathAt(0, bs, 0); e.s = bs; e.x = p.x; e.y = p.y; e.stunT = 1e9; e.seen = true; e.hp = e.max = hp; e.armor = e.armor0 = 0; e.shield = e.shieldMax = 0; return e; });
  G.started = true; G.nextIn = 1e9; G.spawns = [];
  return { t, es };
}`);

check("CRR: an interceptor fires only once round its target - never on the way out (owner, 2026-11-04: \"interceptors should only start firing once they enter orbit\"; CRR_FIRE_R let it fire on the way)", () => {
  const r = run(`(() => { const { t, es } = pinCrr({}, [150]); const b0 = carBolt; let early = 0, fired = 0;
    carBolt = (i, ...a) => { fired++; if (!i.orb) early++; return b0(i, ...a); };
    try { for (let k = 0; k < 600; k++) step(1 / 60); } finally { carBolt = b0; } return { early, fired }; })()`);
  if (!(r.fired > 0)) return "no bolt fired in 10 s (the rig is broken)";
  if (r.early) return r.early + " of " + r.fired + " bolts left an interceptor not yet round its target (i.orb false)";
});

check("CRR: bolts never slow - only tethers do (owner, 2026-11-04: \"remove bolt slow\"; CRR_SLOW 20% for 0.6 s before)", () => {
  const r = run(`(() => { const { t, es } = pinCrr({ armament: 2 }, [150]); const e = es[0]; e.stunT = 0; let slowed = 0, hits = 0, hp0 = e.hp;
    for (let k = 0; k < 600; k++) { step(1 / 60); if (e.slowT > 0) slowed++; } hits = hp0 - e.hp; return { slowed, hit: hits > 0, tSlow: towerStats(t).tSlow }; })()`);
  if (r.tSlow !== 0) return "the rig has a tether (tSlow " + r.tSlow + ")";
  if (!r.hit) return "the bolts never hit (the rig is broken)";
  if (r.slowed) return "an untethered target was slowed on " + r.slowed + " steps";
});

check("CRR: the longest-held interceptor takes the first target (owner, 2026-11-04: \"launch from orbit first, FIFO\"; i.heldAt)", () => {
  const r = run(`(() => { const { t } = pinCrr({}, []); for (let k = 0; k < 240; k++) step(1 / 60); /* all charged and held */
    const held = t.icp.filter(i => i.state === "home" && i.hold); if (held.length < 3) return { held: held.length };
    held.forEach((i, k) => { i.heldAt = held.length - k; }); /* the LAST in wing order has waited longest: wing order alone would pick icp[0] */
    const oldest = held[held.length - 1];
    spawnEnemy("swarm", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
    for (let s = entryS(0); s < PATHS[0].len; s += 4) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - 120); if (d < bd) { bd = d; bs = s; } }
    const p = pathAt(0, bs, 0); e.s = bs; e.x = p.x; e.y = p.y; e.stunT = 1e9; e.seen = true; e.hp = e.max = 1; e.armor = e.armor0 = 0; e.shield = e.shieldMax = 0; /* one interceptor covers it */
    step(1 / 60); const on = t.icp.filter(i => i.e === e); return { held: held.length, on: on.length, oldest: on.includes(oldest), first: on.map(i => i.heldAt) }; })()`);
  if (r.held < 3) return "only " + r.held + " interceptors held after 4 s (the rig is broken)";
  if (r.on < 1) return "nothing launched at the enemy";
  if (!r.oldest) return "the enemy went to interceptor(s) held at " + JSON.stringify(r.first) + ", not the longest-held (heldAt 1)";
});

check("armor is LATE-SCALED at spawn: the armor type's armor is x scaleOf(wave), and swarm / fast / shield carry their ARMOR_ALL share of it (aspira-game.js armorOf; ARCHAEOLOGY §12.9-bis)", () => {
  const r = run(`(() => { const out = []; for (const n of [90, 110]) { G = newGame(); G.wave = n;
    const raw = Math.floor(ENEMIES.armor.armor * ENEMY_HP_MUL * armorGrow(n) * tune("armor", "armor", n)), sc = scaleOf(n), got = {};
    for (const ty of ["armor", "swarm", "shield"]) { let a = 0; for (let k = 0; k < 4; k++) { spawnEnemy(ty, n, 0, 0); a = Math.max(a, G.enemies[G.enemies.length - 1].armor); } got[ty] = a; }
    out.push({ n, raw, sc, ...got, sw: Math.floor(ARMOR_ALL.swarm * Math.floor(ENEMIES.armor.armor * ENEMY_HP_MUL * armorGrow(n) * sc)), sh: Math.floor(ARMOR_ALL.shield * Math.floor(ENEMIES.armor.armor * ENEMY_HP_MUL * armorGrow(n) * sc)) }); }
    return out; })()`);
  for (const w of r) {
    if (!(w.sc < 0.5)) return "wave " + w.n + ": scaleOf " + w.sc + " (expected well under 1 this late)";
    if (!(w.armor <= w.raw * w.sc + 1 && w.armor >= w.raw * w.sc * 0.9 - 1)) return "wave " + w.n + ": armor type " + w.armor + " (expected about " + Math.round(w.raw * w.sc) + " = " + w.raw + " unscaled x scaleOf " + w.sc.toFixed(3) + ")";
    if (w.swarm !== w.sw || w.shield !== w.sh) return "wave " + w.n + ": swarm " + w.swarm + " / shield " + w.shield + " (expected their ARMOR_ALL share of the scaled armor, " + w.sw + " / " + w.sh + ")";
  }
});

check("the 3D moving layer's plain strokes go to the GPU, not the real canvas (glCtx); the harness's context reads `filter` as \"none\" like a browser's (2026-11-05: it read a function, and every stroke fell back unseen)", () => {
  frames(env, 15); /* (the lane atlas builds a lane a frame first) */
  run(`G = newGame(); G.money = 1e6; ui.build = "crr"; { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); } G.towers[0].skills = { hangar: 2 }; G.towers[0].lvl = 1 + towerLevel(G.towers[0]);
    G.started = true; G.nextIn = 1e9; G.spawns = []; spawnEnemy("armor", 30, 0, 0); { const e = G.enemies[G.enemies.length - 1]; e.hp = e.max = 1e9; e.seen = true; e.stunT = 1e9; }`);
  frames(env, 90); run("for (const k in glcWhyN) delete glcWhyN[k]"); frames(env, 30);
  const why = run("JSON.stringify(glcWhyN)"), ctxF = run("String(warp.cv.getContext('2d').filter)");
  if (ctxF !== "none") return "the harness's 2D context reads filter as " + ctxF.slice(0, 40) + " (expected \"none\", as a browser's)";
  if (/filter/.test(why)) return "strokes fell back to the real canvas for a filter nobody set: " + why;
});

check("the simulator's card sentences match the page's (2026-11-06: TD_UNIT lived in aspira-stats.js, which the sim never loads, so the description graph - docs/spire-descriptions.md, built on the sim - read every ACD, FRZ and GRV share x8, x3, x4 high): describeTower, 7 towers x 3 axes x tiers 0-V", () => {
  const g = makeGame(1), E = `JSON.stringify((() => { const o = []; for (const kind of Object.keys(SKILL_TREES)) for (const ax of SKILL_TREES[kind]) for (let k = 0; k <= 5; k++) o.push([kind + " " + ax.id + " " + k, describeTower(kind, { [ax.id]: k })]); return o; })())`;
  const a = JSON.parse(run(E)), b = JSON.parse(g.run(E)), bad = a.filter(([k, s], i) => !b[i] || b[i][1] !== s).map(([k]) => k);
  return a.length !== b.length ? `page ${a.length} sentences, sim ${b.length}` : bad.length ? bad.length + " differ: " + bad.slice(0, 5).join(", ") : "";
});

check("a die wholly off the canvas draws nothing, one on it still draws (solidOffCanvas, perf 2026-11-06: late waves walk in from r 2400, far off screen, and were filled and stroked every frame)", () => {
  run(`(() => { G = newGame(); G.started = true; G.nextIn = 1e9; G.spawns = []; ui.paused = false;
    const put = s => { spawnEnemy("armor", 30, 0, 0); const e = G.enemies[G.enemies.length - 1], p = pathAt(0, s, 0); e.s = s; e.x = p.x; e.y = p.y; e.seen = true; e.stunT = 1e9; e.hp = e.max = 1e9; return e; };
    put(0); put(PATHS[0].len - 120); })()`);
  frames(env, 3);
  const r = JSON.parse(run(`(() => { const [far, near] = G.enemies, c = warp.ent.getContext("2d"), main = ctx; ctx = c; let n = 0; const f0 = c.fill;
    c.fill = (...a) => { n++; return f0.apply(c, a); };
    const fills = e => { n = 0; warpBand = null; warpSolidWhole(e); return n; };
    try { return JSON.stringify({ far: fills(far), near: fills(near), r: Math.round(Math.hypot(far.x - CX, far.y - CY)) }); } finally { c.fill = f0; ctx = main; } })()`));
  if (!(r.near > 0)) return "the die by the core drew no face (the rig is broken, or the cull culls what shows)";
  if (r.far) return "the die at the lane's start (r " + r.r + ", off the canvas) still drew " + r.far + " faces";
});

check("a tracer wholly off the canvas draws nothing, one on it still draws (drawStarTrail's cull through warp.eF, perf 2026-11-06)", () => {
  run(`(() => { G = newGame(); G.started = true; G.nextIn = 1e9; G.spawns = []; ui.paused = false;
    const put = s => { spawnEnemy("fast", 30, 0, 0); const e = G.enemies[G.enemies.length - 1], p = pathAt(0, s, 0); e.s = s; e.x = p.x; e.y = p.y; e.seen = true; e.stunT = 1e9; e.hp = e.max = 1e9; return e; };
    put(0); put(PATHS[0].len - 200); })()`);
  frames(env, 3);
  const r = JSON.parse(run(`(() => { const [far, near] = G.enemies, c = warp.ent.getContext("2d"), main = ctx; ctx = c; let n = 0; const f0 = c.fill;
    c.fill = (...a) => { n++; return f0.apply(c, a); };
    const fills = e => { n = 0; const F = warpFrame(e.x, e.y, 0); ctx.setTransform(F[0], F[1], F[2], F[3], F[4], F[5]); warp.eF = F; try { drawStarTrail(e, 10); } finally { warp.eF = null; } return n; };
    try { return JSON.stringify({ far: fills(far), near: fills(near) }); } finally { c.fill = f0; ctx = main; } })()`));
  if (!(r.near > 0)) return "the tracer by the core drew nothing (the rig is broken, or the cull culls what shows)";
  if (r.far) return "the tracer at the lane's start (off the canvas) still drew " + r.far + " fills";
});

check("ARC: the Voltage rings never touch the prism at any turn (owner, 2026-11-06: \"dont let arc volt rings clip into tower, size correctly\"; at R x 1.25 a ring's flat edge cut the prism's corners)", () => {
  const r = JSON.parse(run(`(() => { G = newGame(); G.money = 1e9; ui.build = "arc"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); ui.build = null;
    const t = G.towers[0], g = arcGeom(t), s = g.R / 40, out = [];
    const segD = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - ax - u * vx, py - ay - u * vy); };
    for (let ct = 0; ct < ARC_RING_W.length; ct++) { const rr = arcRingR(g, ct, s), half = ARC_RING_W[ct] * s / 2; let worst = Infinity;
      for (let deg = 0; deg <= 60; deg++) { const th = deg * Math.PI / 180;
        for (let k = 0; k < 6; k++) { const a = g.a0 + Math.PI / 3 * k, px = g.R * Math.cos(a), py = g.R * Math.sin(a);
          for (let j = 0; j < 6; j++) { const a1 = g.a0 + Math.PI / 3 * j + th, a2 = a1 + Math.PI / 3; worst = Math.min(worst, segD(px, py, rr * Math.cos(a1), rr * Math.sin(a1), rr * Math.cos(a2), rr * Math.sin(a2)) - half); } } }
      out.push({ ct, worst: +(worst - arcRingGlow(ct, s)).toFixed(3), want: +(ARC_RING_GAP_K * g.R).toFixed(3) }); }
    return JSON.stringify(out); })()`));
  const bad = r.filter(x => !(x.worst >= x.want - 1e-6));
  if (bad.length) return "a ring's glow comes within " + bad.map(x => x.worst + " u (Conductivity " + x.ct + ", want " + x.want + ")").join(", ") + " of the prism's corners (ARC_RING_GAP_K x R; owner, 2026-11-07: \"they should be horizontally further\")";
});

check("ARC: a ring's back edges lie wholly above its centre's screen row and its front edges wholly below, cut at the sides, with nothing lost (owner, 2026-11-07: \"arc rings still clip into the tower\" - an edge across a side went whole to one pass)", () => {
  const r = JSON.parse(run(`(() => { G = newGame(); G.money = 1e9; ui.build = "arc"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); ui.build = null;
    const t = G.towers[0], g = arcGeom(t), rr = arcRingR(g, 5, g.R / 40), cx = 100, cy = 200, bad = []; let worstLen = 0;
    for (const mt of [{ b: 0.1, d: 0.55, f: 7 }, { b: -0.3, d: 0.8, f: -40 }, { b: 0, d: 1, f: 0 }]) for (let deg = 0; deg < 60; deg += 3) {
      const th = deg * Math.PI / 180, cyS = mt.b * cx + mt.d * cy + mt.f, sy = (x, y) => mt.b * x + mt.d * y + mt.f - cyS; let len = 0;
      for (const back of [true, false]) for (const q of arcRingSegs(g, rr, th, back, mt, cx, cy)) { len += Math.hypot(q[2] - q[0], q[3] - q[1]);
        for (const v of [sy(q[0], q[1]), sy(q[2], q[3])]) if (back ? v > 1e-6 : v < -1e-6) bad.push([deg, back, +v.toFixed(3)]); }
      worstLen = Math.max(worstLen, Math.abs(len - 6 * rr)); }
    return JSON.stringify({ bad: bad.slice(0, 4), worstLen }); })()`));
  if (r.bad.length) return "ring segments on the wrong side of the centre row: " + JSON.stringify(r.bad);
  if (r.worstLen > 1e-6) return "the back + front segments miss " + r.worstLen + " u of the ring";
});

check("FRZ: its ice is grown ONCE - a move never regrows it (owner, 2026-11-06: \"FRZ perm and frac get regenerated every time frz moves / it should only be generated once, and follow movement of tower\"; the key was the view at its current spot)", () => {
  const r = JSON.parse(run(`(() => { G = newGame(); G.money = 1e9; ui.build = "frz"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); ui.build = null;
    const t = G.towers[0]; for (let i = 0; i < 3; i++) upgradeTower(t, "rime", true); for (let i = 0; i < 2; i++) upgradeTower(t, "temp", true);
    const np = skillOf(t, "rime"), nf = skillOf(t, "temp"), vA = { sq: 0.55, Hs: 30, rot: 10 }, vB = { sq: 0.62, Hs: 36, rot: 22 };
    let I = frzIceGet(t, vA, np, nf); for (let k = 0; k < 4000 && !(I.scene && I.scene.done); k++) { iceFrameAt = -1; I = frzIceGet(t, vA, np, nf); }
    const sig = I => JSON.stringify(I.scene.back.concat(I.scene.front).map(P => P.topPts));
    const before = { done: !!(I.scene && I.scene.done), n: I.scene ? I.scene.back.length + I.scene.front.length : 0, s: sig(I), M: I.M };
    iceFrameAt = -1; const J = frzIceGet(t, vB, np, nf);
    return JSON.stringify({ done: before.done, n: before.n, same: J === I && J.M === before.M, stillDone: !!(J.scene && J.scene.done), pieces: sig(J) === before.s }); })()`));
  if (!r.done || !r.n) return "the ice never finished growing in the rig (" + r.n + " pieces)";
  if (!r.same) return "a new view (a move) made the tower's ice again";
  if (!r.stillDone || !r.pieces) return "after a move the pieces changed or growth restarted";
});

// HYPERNOVA IN THE CARD BOX (Leader, 2026-11-07; 67540a6): in a demo scene (demoDrawing) a nova's rings scale by one factor so its widest - the
// x GRV_SUPER_R second ring of a double - stays inside the canvas from the nova's centre; a ring that fits is left alone; the board never scales
check("pin: Hypernova's rings stay inside the card demo's canvas (grvNovaFit: one factor, the widest ring fits; 1 on the board and when it fits)", () => {
  const r = run(`(() => { const ctx0 = ctx, d0 = demoDrawing, W = 400, H = 200;
    ctx = { canvas: { width: W, height: H }, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) };
    try { const sp = (x, y, nN) => ({ x, y, nN }), st = { novaR: 230 }, out = {};
      demoDrawing = false; out.board = grvNovaFit(sp(200, 100, 2), st);
      demoDrawing = true; const f = grvNovaFit(sp(200, 100, 2), st); out.widest = 230 * GRV_SUPER_R * GRV_FIT_PAD * f; out.room = 100;
      out.edge = grvNovaFit(sp(30, 100, 2), st) * 230 * GRV_SUPER_R * GRV_FIT_PAD; out.small = grvNovaFit(sp(200, 100, 1), { novaR: 50 });
      return out; } finally { ctx = ctx0; demoDrawing = d0; } })()`);
  if (r.board !== 1) return "the board scaled a nova (x" + r.board + ")";
  if (!(Math.abs(r.widest - r.room) < 1e-6)) return "the widest ring with its pad reaches " + r.widest + " u from the centre, the canvas edge is " + r.room;
  if (!(r.edge <= 30 + 1e-6)) return "a nova 30 from the left edge reaches " + r.edge;
  if (r.small !== 1) return "a ring that fits was scaled (x" + r.small + ")";
});

// THE CAPSTONE CRASH SWEEP (Leader, 2026-11-07, after 7.7.111's coreXY crash: fp and the smoke never ran a late board with core powers AND every
// capstone - G.core, the power state, was set only after a boss). Every tower x every axis at V (the others IV), ON THE BOARD, every core power
// granted, a mixed late wave (four types at wave 100 + one boss) held round the tower, CAPSWEEP_N steps: no throw, and no NaN / undefined in the
// enemies' x, y, hp or the tower's numbers
const CAPSWEEP_N = 300;
check("capstone crash sweep: 7 towers x 3 axes at V on the board, every core power held, a mixed wave-100 field + a boss, " + CAPSWEEP_N + " steps - no throw, no NaN", () => {
  const r = run(`(() => { const bad = [], rnd0 = Math.random; let sd = 4242; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    try { for (const kind of Object.keys(SKILL_TREES)) for (const top of SKILL_TREES[kind]) {
      const tag = kind + " " + top.id + " V";
      try {
        G = newGame(); G.money = 1e9; ui.build = kind; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); ui.build = null;
        const t = G.towers[0], sk = {}; for (const ax of SKILL_TREES[kind]) sk[ax.id] = ax.id === top.id ? SKILL_TIERS : SKILL_TIERS - 1; t.skills = sk; t.lvl = 1 + towerLevel(t);
        for (const [w] of CORE_GRANTS) grantPowers(w); coreState();
        G.started = true; G.wave = 100; G.nextIn = 1e9; G.spawns = [];
        const R = towerStats(t).range || 150, put = (type, n, dist) => { spawnEnemy(type, n, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
          for (let s = entryS(0); s < PATHS[0].len; s += 6) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - dist); if (d < bd) { bd = d; bs = s; } }
          const p = pathAt(0, bs, 0); e.s = bs; e.x = p.x; e.y = p.y; e.seen = true; return e; };
        ["swarm", "fast", "shield", "armor"].forEach((type, i) => { for (let k = 0; k < 4; k++) put(type, 100, R * (0.2 + 0.25 * k) + 9 * i); });
        put("bonus", 96, R * 0.6);
        for (let k = 0; k < ${CAPSWEEP_N}; k++) step(1 / 30);
        const nan = v => typeof v !== "number" || !Number.isFinite(v);
        const eb = G.enemies.filter(e => !e.dead && (nan(e.x) || nan(e.y) || nan(e.hp))).map(e => e.type + " " + [e.x, e.y, e.hp].join("/"));
        const tb = G.towers.flatMap(o => Object.entries(o).filter(([k, v]) => typeof v === "number" && !Number.isFinite(v) && v !== Infinity && v !== -Infinity || v === undefined).map(([k, v]) => k + "=" + v));
        if (eb.length) bad.push(tag + ": enemies " + eb.slice(0, 3).join(", "));
        if (tb.length) bad.push(tag + ": tower " + tb.slice(0, 4).join(", "));
      } catch (err) { bad.push(tag + ": threw " + String(err).slice(0, 160)); }
    } } finally { Math.random = rnd0; }
    return bad.join("; "); })()`);
  return r;
});

// FRZ'S MOONS ARE SOLID DICE (7.12.10; owner, 2026-11-08: "also moons are still fucked up?"): the D12's faces had their normals in the wrong
// orientation - 0 of 12 faces planar. Every face of D12 is a flat pentagon whose normal points away from the die's centre
check("FRZ moons: every D12 face is a flat pentagon facing outward (7.12.10: the face normals were in the wrong orientation)", () => {
  const r = JSON.parse(run(`(() => { const out = []; for (const f of D12.F) {
    const P = f.map(i => D12.V[i]), c = [0, 1, 2].map(k => P.reduce((s, p) => s + p[k], 0) / P.length);
    const a = P[0].map((q, k) => q - c[k]), b = P[1].map((q, k) => q - c[k]), n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], l = Math.hypot(...n) || 1;
    const off = Math.max(...P.map(p => Math.abs((p[0] - c[0]) * n[0] + (p[1] - c[1]) * n[1] + (p[2] - c[2]) * n[2]) / l));
    out.push({ n: P.length, off, outward: (c[0] * n[0] + c[1] * n[1] + c[2] * n[2]) / l }); }
    return JSON.stringify(out); })()`));
  if (r.length !== 12) return r.length + " faces (expected 12)";
  const bad = r.findIndex(f => f.n !== 5 || f.off > 1e-6 || !(f.outward > 0));
  return bad < 0 ? "" : "face " + bad + ": " + JSON.stringify(r[bad]);
});
// FRZ'S PRISM OCCLUDES ITS ICE AT ITS LIFTED HEIGHT (7.12.9; owner, 2026-11-08: "frz tower needs to occlude"): towers stand lifted floor -> h
// since 7.8.11, and the ice bake's occluder took the prism's top alone - half its height - so the ice behind the tower showed through it
check("FRZ ice: the bake's occluder is the prism's FULL lifted height (ice3dProj's sh = (top + warpLift) / Hs; 7.12.9: top alone, half of it)", () => {
  const r = JSON.parse(run(`(() => { const L0 = warpLift; warpLift = 7; try { const p = ice3dProj(CX + 100, CY, 20, 40, 30); return JSON.stringify({ h: p.sh * 30 }); } finally { warpLift = L0; } })()`));
  return Math.abs(r.h - 27) < 1e-9 ? "" : "the occluder stands " + r.h + " units tall (expected top 20 + lift 7)";
});
// FRACTURE ON TOP, NOT THROUGH (7.12.11; owner, 2026-11-08: "place them on top of stuff instead of through stuff"): a shard either stands
// wholly on one Permafrost sheet (its host) or clear of every sheet - never part in, part out
check("FRZ Fracture: every shard is wholly on its host sheet or clear of every sheet (7.12.11: shards poked through the Permafrost)", () => {
  const r = JSON.parse(run(`(() => { G = newGame(); G.money = 1e9; ui.build = "frz"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); ui.build = null;
    const t = G.towers[0]; for (let i = 0; i < 5; i++) upgradeTower(t, "rime", true); for (let i = 0; i < 4; i++) upgradeTower(t, "temp", true);
    const np = skillOf(t, "rime"), nf = skillOf(t, "temp"), v = { sq: 0.55, Hs: 30, rot: 10 };
    let I = frzIceGet(t, v, np, nf); for (let k = 0; k < 6000 && !(I.scene && I.scene.done); k++) { iceFrameAt = -1; I = frzIceGet(t, v, np, nf); }
    const M = I.M, H = M.ST.hexes, S = M.ST.specs, R = M.rot;
    const hexP = H.map(h => [0, 1, 2, 3, 4, 5].map(k => [h.c[0] + h.side * Math.cos((-90 + R + 60 * k) * Math.PI / 180), h.c[1] + h.side * Math.sin((-90 + R + 60 * k) * Math.PI / 180)]));
    const inHex = (P, q) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], c = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); if (Math.abs(c) < 1e-6) continue; if (!s) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } return true; };
    const bad = []; S.forEach((s, i) => { if (s.host >= 0) { if (!s.tri.every(q => inHex(hexP[s.host], q))) bad.push(i + " sticks out of its sheet"); }
      else if (hexP.some(hp => I_polyHit(s.tri, hp))) bad.push(i + " crosses a sheet it does not stand on"); });
    return JSON.stringify({ done: !!(I.scene && I.scene.done), hexes: H.length, shards: S.length, hosted: S.filter(s => s.host >= 0).length, bad }); })()`));
  if (!r.done || !r.shards || !r.hexes) return "the ice never finished in the rig (" + r.hexes + " sheets, " + r.shards + " shards)";
  return r.bad.length ? r.bad.slice(0, 3).join("; ") + " (" + r.bad.length + " of " + r.shards + ")" : "";
});

check("3D stars stay ROUND on screen on the GPU (owner, 2026-10-09: \"stars in bg should not get distorted\"; aspira-glstars.js, 2026-11-09): each star goes up as a screen-space disc of drawStars' own radius at warpStar's spot, laid evenly in x and y - no floor frame", () => {
  const r = run(`(() => {
    if (typeof GLSTARS_VS !== "string") return "aspira-glstars.js not loaded";
    if (!/loc = corner \\* ext/.test(GLSTARS_VS) || /tcam|warpFrame|texCam/.test(GLSTARS_VS)) return "the star quad is not an even screen-space square";
    const sent = []; const nop = () => {}; const gl = new Proxy({}, { get: (o, k) => k === "getExtension" ? () => new Proxy({}, { get: () => nop }) : k === "getProgramParameter" ? () => true : k === "bufferData" ? (t, d) => { if (d && d.length && d.length % 4 === 0 && d.length !== 12) sent.push(Float32Array.from(d)); } : typeof k === "string" && /^[A-Z_]+$/.test(k) ? 1 : () => ({}) });
    const saveA = Object.assign({}, starAt), W = 1200, H = 900; warp.p = warp.p || warpParams(); glStars.gl = null; glStars.broken = false;
    const pn = performance.now; performance.now = () => 5000;
    try { glStarsDraw(gl, W, H); } finally { performance.now = pn; Object.assign(starAt, saveA); }
    const D = sent[sent.length - 1]; if (!D) return "no stars sent";
    for (let k = 0; k < D.length; k += 4) { if (!(D[k + 2] > 0)) return "star " + k / 4 + " radius " + D[k + 2]; }
    return D.length / 4; })()`);
  if (typeof r === "string") return r;
  if (!(r > 50)) return "only " + r + " stars on screen (the rig is broken)";
});

// THE BOSS ARRIVAL (owner, 2026-11-16: "when the triangle expands for bosses, add massive velocity for all coins towards their nearest tower or core
// / then only play the boss sound (like the archon sounds) when the boss spawns"): while the triangle spreads, every coin flies home on real time
// (rushCoins, aspira-floats.js) though the game holds; sending a boss wave says nothing, its first boss's spawn says the line, once a wave
check("boss arrival: the spreading triangle sweeps every coin home, and the boss's line plays once, as its wave is sent (under the opening triangle)", () => {
  return run(`(() => {
    const said = [], seq0 = sfxSeq, inv0 = Object.assign({}, bossInv);
    G = newGame(); G.money = 0; coins = []; sfxSeq = list => { said.push(...list); };
    try {
      creditDot(CX + 500, CY, 37); const n0 = coins.length;
      for (let i = 0; i < 20; i++) stepFloats(0.05); // 1 s with no boss sky: coins hold (COIN_HOLD) - stepFloats alone moves none
      if (coins.length !== n0 || G.money !== 0) return "coins moved without the boss sky (" + coins.length + " of " + n0 + " left, money " + G.money + ")";
      Object.assign(bossInv, { phase: "in", t0: performance.now() / 1000 - BOSS_SPOKE_T - 0.1, full: false });
      for (let i = 0; i < 20; i++) stepFloats(0.05); // 1 s of the spreading triangle
      if (coins.length || Math.round(G.money) !== 37) return "the triangle left " + coins.length + " coin(s) out, money " + G.money + " of 37";
      G.wave = STAR_EVERY - 1; sendWave(); // (2026-11-17, owner: "go back to playing boss sound while triangle is opening up" - the line at the send again)
      if (said.filter(s => /^bossvoice/.test(s)).length !== 1) return "the boss line did not play once as its wave was sent: " + said.join(", ");
      const n = G.wave; spawnEnemy("armor", n, 0, 0); bossSpawn(G.enemies[G.enemies.length - 1], n); spawnEnemy("armor", n, 0, 0); bossSpawn(G.enemies[G.enemies.length - 1], n);
      const lines = said.filter(s => /^bossvoice/.test(s)).length;
      return lines === 1 ? "" : "the boss line played again as the bosses spawned (" + lines + " in all; want once, at the send)";
    } finally { sfxSeq = seq0; Object.assign(bossInv, inv0); coins = []; } })()`);
});

check("Challenge screen: the corner title keeps the boss just beaten in gray with no corner poem, the NEXT boss's poem sits above the button; a click shows the new boss and its poem in the corner (owner, 2026-11-16: \"Show centered poem above challenge button / Hide poem on bottom right during challenge screen / On challenge screen, keep showing old boss name in gray / Upon clicking challenge / Update boss name in corner and show new poem\")", () => {
  const r = run(`(() => {
    G = newGame(); G.started = true; G.wave = STAR_EVERY; G.challenged = 0; G.enemies = []; G.spawns = []; G.fleetQ = []; G.nextIn = 1e9;
    const title = document.querySelector(".asp-title"), corner = $("asp-bosshint"), mid = $("asp-chalpoem"), btn = $("asp-challenge");
    const snap = () => { updateHud(); updateWaveList(); placeChallenge(); return { name: title.textContent, gray: title.classList.contains("asp-title-done"), corner: corner.textContent, mid: mid.textContent, midHidden: mid.hidden, btnHidden: btn.hidden }; };
    if (!afterBoss()) return "the rig is not on the Challenge screen";
    const beaten = arcanaOf(STAR_EVERY), next = arcanaOf(STAR_EVERY * 2), a = snap();
    challengeNext(); const b = snap();
    return { beaten: beaten.name.toLowerCase(), next: next.name.toLowerCase(), hint: next.hint.join("\\n"), a, b };
  })()`);
  if (typeof r === "string") return r;
  const { a, b } = r;
  if (a.name !== r.beaten) return "challenge screen: corner name " + a.name + ", not the beaten boss " + r.beaten;
  if (!a.gray) return "challenge screen: the corner name is not gray (asp-title-done)";
  if (a.corner !== "") return "challenge screen: the corner poem is still shown";
  if (a.midHidden || a.mid !== r.hint) return "challenge screen: the centred poem is not the next boss's hint (" + JSON.stringify(a.mid) + ")";
  if (b.name !== r.next) return "after the click: corner name " + b.name + ", not the new boss " + r.next;
  if (b.gray) return "after the click: the corner name is still gray";
  if (b.corner !== r.hint) return "after the click: the corner poem is not the new boss's hint";
  if (!b.midHidden) return "after the click: the centred poem is still up";
});

check("Challenge screen: the poem and the button sit inside one visible card with an opaque background; after challengeNext() the card is hidden (owner, 2026-11-16: \"Put this on a card / Haiku unreadable on challenge screen\")", () => {
  // the smoke's DOM is a fake (no containment, no computed style), so the markup and the stylesheet are read as text
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const html = fs.readFileSync(path.join(root, "api/templates/aspira.html"), "utf8"), css = fs.readFileSync(path.join(root, "web/aspira.css"), "utf8");
  const card = /<div[^>]*id="asp-chalcard"[^>]*>([\s\S]*?)<\/div>\s*(?:<label[^>]*id="asp-autochal"[\s\S]*?<\/label>\s*)?<div class="asp-spend"/.exec(html); // (the auto-challenge box may follow the card - under it, 2026-11-17)
  if (!card || !card[1].includes('id="asp-chalpoem"') || !card[1].includes('id="asp-challenge"')) return "the poem and the button are not both inside #asp-chalcard in the template";
  const rule = /#asp \.asp-chalcard \{([^}]*)\}/.exec(css);
  if (!rule || !/hsl\(var\(--bg-hsl\)\)/.test(rule[1]) || /background:[^;]*transparent/.test(rule[1])) return "the card's background is not the opaque --bg-hsl base";
  const r = run(`(() => {
    G = newGame(); G.started = true; G.wave = STAR_EVERY; G.challenged = 0; G.enemies = []; G.spawns = []; G.fleetQ = []; G.nextIn = 1e9;
    const card = $("asp-chalcard");
    const snap = () => { updateHud(); updateWaveList(); placeChallenge(); return card.hidden; };
    if (!afterBoss()) return "the rig is not on the Challenge screen";
    const up = snap(); challengeNext(); return { up, after: snap() };
  })()`);
  if (typeof r === "string") return r;
  if (r.up) return "challenge screen: the card is hidden";
  if (!r.after) return "after the click: the card is still shown";
});

// iOS SOUND + THE BOX UNDER THE CARD (owner, 2026-11-17: "Sound buggy/not playing on iOS", "Move auto challenge checkbox under card"): Safari parks
// the audio context "interrupted" after a lock screen or a call and accepts only touchend / click as the gesture - a tap must resume any non-running
// context; the auto-challenge box sits outside the card
check("iOS sound: a tap resumes an interrupted audio context, touchend and click unlock it; the auto-challenge box sits under the card, not on it", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const src = fs.readFileSync(path.join(root, "web/aspira-sfx.js"), "utf8"), tpl = fs.readFileSync(path.join(root, "api/templates/aspira.html"), "utf8");
  if (!/addEventListener\("touchend", audioUnlock/.test(src) || !/addEventListener\("click", audioUnlock/.test(src)) return "audioUnlock is not bound to touchend and click";
  const card = tpl.slice(tpl.indexOf('id="asp-chalcard"'), tpl.indexOf('id="asp-autochal"'));
  if (!card.includes("</div>")) return "the auto-challenge box is still inside the card";
  return run(`(() => { const ac0 = AC, m0 = muted; let resumed = 0;
    try { AC = { state: "interrupted", resume() { resumed++; this.state = "running"; } }; muted = false; audioUnlock();
      return resumed === 1 && AC.state === "running" ? "" : "an interrupted context was not resumed by a tap (resume calls " + resumed + ")"; }
    finally { AC = ac0; muted = m0; } })()`);
});

// QUIET WHILE PAUSED (owner, 2026-11-17: "no sounds should play when the game is paused or idle", narrowed the same day: "no sound unless user clicked
// something, or the game is unpaused"): a board sound is held only while PAUSED, and not when a tap caused it; unpaused - before the start, the
// Challenge screen, the end - nothing is held (the boss death sound was being cut)
check("quiet while paused: board sounds are held while paused unless a tap caused them; nothing is held while the game is unpaused (before the start, the end)", () => {
  return run(`(() => { const p0 = ui.paused, g0 = G, u0 = sfxUserAt;
    try {
      G = newGame(); G.started = true; ui.paused = false; sfxUserAt = -1e9;
      if (sfxHeld("sol")) return "a board sound was held while the game runs";
      ui.paused = true; if (!sfxHeld("sol")) return "a board sound was NOT held while paused";
      if (sfxHeld("click")) return "the click was held while paused (a tap's own feedback)";
      if (sfxHeld("win")) return "the win jingle was held";
      sfxUserAt = performance.now() / 1000; if (sfxHeld("up")) return "an upgrade the player tapped was held while paused"; sfxUserAt = -1e9;
      ui.paused = false; G.started = false; if (sfxHeld("kill")) return "a sound was held before the start (only a pause quiets the board)";
      G.started = true; G.over = true; if (sfxHeld("bossdeath")) return "a sound was held after the end";
      return ""; }
    finally { ui.paused = p0; G = g0; sfxUserAt = u0; } })()`);
});

// SOL'S GHOST SHOT (owner, 2026-11-17: "SOL should not fire a dead targets if there is currently nothing alive to breach/reflect to, or if it doesn't
// have any levels in breach or reflect"): a bare Sol never fires at a dead target's spot; with Reflection it does while someone lives; a bare Sol aims x4
check("Sol's ghost shot: a bare Sol never fires at a dead target's spot (it re-aims, x4 at level 0); with Reflection it does while an enemy lives", () => {
  return run(`(() => { const g0 = G;
    try {
      G = newGame(); G.started = true; spawnEnemy("swarm", 30, 0, 0); spawnEnemy("swarm", 30, 0, 0); const [a, b] = G.enemies; a.seen = b.seen = true;
      const bare = { kind: "sol", skills: {}, x: 0, y: 0, lvl: 1 }, refl = { kind: "sol", skills: { refraction: 1 }, x: 0, y: 0, lvl: 2 };
      a.dead = true; const B = { e: a };
      if (solGhostWorth(bare, solTrackSt(bare, towerStats(bare)), B)) return "a bare Sol would fire at a dead target's spot";
      if (!solGhostWorth(refl, solTrackSt(refl, towerStats(refl)), B)) return "a Sol with Reflection would NOT fire at the spot though an enemy lives";
      b.dead = true; if (solGhostWorth(refl, solTrackSt(refl, towerStats(refl)), B)) return "a Sol with Reflection would fire at the spot with nobody alive";
      if (Math.abs(solAimS(bare) - 4 * SOL_AIM) > 1e-9 || Math.abs(solAimS(refl) - SOL_AIM) > 1e-9) return "the aim: bare " + solAimS(bare) + ", with a path " + solAimS(refl) + " (want 4x / 1x SOL_AIM)";
      return ""; }
    finally { G = g0; } })()`);
});


// THE ARMOR BLURB ON ARMOR CARDS ONLY (owner, 2026-11-17: "only show armor blurb on armor cards"): a wave card's note carries WC_ARMOR_NOTE for an armor wave alone
check("wave cards: the armor sentence shows on an armor wave's card only", () => {
  return run(`(() => { const bad = [];
    for (const type of ["swarm", "fast", "shield", "armor"]) { const has = waveNote({ type }).includes(WC_ARMOR_NOTE); if (has !== (type === "armor")) bad.push(type + (has ? " has it" : " lacks it")); }
    return bad.join(", "); })()`);
});
