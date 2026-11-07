// /spire RULE PINS (2026-11-05): rules shipped without a check of their own. Each one FAILS on the behaviour it replaced (proven by
// putting the old code back on a scratch copy). Registered into the smoke harness; smoke.mjs imports this file before it reports.
// Its own page env, so the smoke checks' game state never leaks in.
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
      out.push({ ct, worst: +worst.toFixed(3) }); }
    return JSON.stringify(out); })()`));
  const bad = r.filter(x => !(x.worst >= 3 - 1e-6));
  if (bad.length) return "a ring's line comes within " + bad.map(x => x.worst + " u (Conductivity " + x.ct + ")").join(", ") + " of the prism's corners; ARC_RING_GAP is 3";
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
