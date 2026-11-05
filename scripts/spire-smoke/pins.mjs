// /spire RULE PINS (2026-11-05): rules shipped without a check of their own. Each one FAILS on the behaviour it replaced (proven by
// putting the old code back on a scratch copy). Registered into the smoke harness; smoke.mjs imports this file before it reports.
// Its own page env, so the smoke checks' game state never leaks in.
import { boot, check, frames } from "./harness.mjs";

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
