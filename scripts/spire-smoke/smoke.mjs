#!/usr/bin/env node
// /spire SMOKE TEST (owner, 2026-10-11: "add smoke tests for all basic features as commit hook").
// Loads EVERY script the page loads, in the template's own order, into one node vm with a fake DOM and a
// RECORDING canvas, then drives the real frame loop through the basic features and checks each one actually
// DRAWS - not just that nothing threw. Born of a comment that swallowed render()'s else branch: 2D drew nothing
// and 3D lost its ranges, beams and movement arrows, with no error anywhere. 3D only since 2026-10-18 (dom.mjs fakeGl).
//   node scripts/spire-smoke/smoke.mjs        (exit 1 on any failure; pre-commit runs it when /spire is staged)
import fs from "node:fs";
import path from "node:path";
import { ROOT, TEMPLATE, SCRIPTS, boot, results, check, drawn, calls, frames, report, ifrHelpers } from "./harness.mjs";
import "./tiers.mjs"; // the tier redesign's tower checks (2026-10-24)
import "./ifr.mjs"; // the IFR checks (split out 2026-10-28): registered first, reported with the rest

check("play box: portrait is centred, landscape is it turned 90 degrees", () => {
  const p = boot({}, { w: 390, h: 844 }), w = boot({}, { w: 1280, h: 800 });
  const bp = p.run("phoneBox()"), bw = w.run("phoneBox()"), cx = p.run("CX"), cy = p.run("CY");
  if (p.run("BOX_WIDE") || !w.run("BOX_WIDE")) return "BOX_WIDE should follow the window's shape";
  if (Math.abs((cy - bp.y0) - (bp.y1 - cy)) > 1e-9) return "portrait core not centred top-bottom";
  if (Math.abs((bw.x1 - bw.x0) - (bp.y1 - bp.y0)) > 1e-9 || Math.abs((bw.y1 - bw.y0) - (bp.x1 - bp.x0)) > 1e-9) return "landscape box is not the portrait box turned";
  if (Math.abs((bp.y1 - bp.y0) - 2 * p.run("BOX_LONG")) > 1e-9) return "portrait height is not 2 x BOX_LONG";
});

check("lanes: a landscape pick is the portrait pick turned 90 degrees - one pick, turned with the board (owner, 2026-10-22)", () => {
  const p = boot({}, { w: 390, h: 844 }), w = boot({}, { w: 1280, h: 800 });
  for (const [pi, k, n, t] of [[0, 1, 2], [1, 2, 3], [2, 3, 7], [3, 5, 12], [5, 6, 20], [8, 2, 31], [1, 2, 13, "armor"], [4, 2, 26, "armor"]]) { // (not wave 1 alone: it turns to the build hint - next check)
    const a = p.run(`laneBestTurn(${pi}, ${k}, ${n}, "${t}")`), b = w.run(`laneBestTurn(${pi}, ${k}, ${n}, "${t}")`), per = Math.PI * 2 / k;
    const d = (((b - a - Math.PI / 2) % per) + per) % per;
    if (Math.min(d, per - d) > 1e-6) return `pi ${pi} k ${k} n ${n}: portrait ${a.toFixed(4)}, landscape ${b.toFixed(4)}`;
  }
});

check("armor comes on screen down the box's long axis: portrait top/bottom, landscape the sides (owner, 2026-10-22)", () => {
  for (const view of [{ w: 430, h: 932 }, { w: 1280, h: 800 }]) {
    const e = boot({}, view);
    const r = e.run(`(() => { const bad = [];
      for (const n of [2, 5, 13, 26, 41]) { G = newGame(); G.started = true; G.wave = n - 1; WAVE_TYPE_FORCE[n] = "armor"; sendWave();
        for (const s of G.spawns) { const p = PATHS[s.lanes.armor].pts.map(q => rotAbout(q, s.ang)).find(q => phoneInside(q.x, q.y)); if (!p) continue;
          const v = Math.abs(p.y - CY) > Math.abs(p.x - CX); if (v === !!BOX_WIDE) bad.push(n + (v ? " top/bottom" : " side")); } }
      return bad.join(", "); })()`);
    if (r) return view.w + "px: armor wave " + r;
  }
  return "";
});

check("a lane stays FULL while its formations walk in - no dip at every group's spawn (owner, 2026-10-26: 'same wave's lanes brightness is like low high low high')", () => {
  // no towers, so nothing dies: every lane of a fast (V) and an armor (lattice) wave must read a=1 from send till its last unit is on the board
  const r = boot({}, { w: 390, h: 844 }).run(`(() => { const out = {}; for (const type of ["fast", "armor"]) { let n = 10; while (n < 80 && wavePlan(n, null).type !== type) n++;
      G = newGame(); G.started = true; G.wave = n - 1; G.lastType = "swarm"; G.nextIn = 0; let lo = 1, at = -1, frames = 0;
      for (let i = 0; i < 1800; i++) { step(1 / 60); if (G.wave !== n) continue; frames++; for (const u of activeLanes().values()) if (u.n === n && !u.star && u.a < lo) { lo = u.a; at = i; }
        if (!G.spawns.length && !G.fleetQ.length && frames > 10) break; }
      out[type] = { n, lo: +lo.toFixed(3), at, frames }; } return out; })()`);
  for (const t of ["fast", "armor"]) if (r[t].lo < 0.999) return t + " wave " + r[t].n + ": a lane dipped to " + r[t].lo + " at frame " + r[t].at + " with nothing dead";
  return "";
});

check("wave 1 rides ONE lane past the build hint's slot: onto the screen from the top in portrait, the left in landscape (owner, 2026-10-21/22)", () => {
  for (const [view, want] of [[{ w: 390, h: 844 }, "top"], [{ w: 1280, h: 800 }, "left"]]) {
    const r = boot({}, view).run(`(() => { G = newGame(); G.started = true; sendWave(); const s = G.spawns, pi = s[0].lanes[s[0].list[0]];
      const pts = PATHS[pi].pts.map(q => rotAbout(q, s[0].ang)), i = pts.findIndex(q => phoneInside(q.x, q.y));
      return { copies: new Set(s.map(w => w.ang.toFixed(4))).size, from: i > 0 ? screenSide(pts[i - 1]) : "none" }; })()`);
    if (r.copies !== 1) return view.w + "px: wave 1 on " + r.copies + " lane copies (expected 1)";
    if (r.from !== want) return view.w + "px: wave 1 comes onto the screen from the " + r.from + " (expected " + want + ")";
  }
  return "";
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

check("capstone: a capstone value never runs against its table (no tier lowers a stat - GRV_SLOW and CRR_AMMO V fell below IV when their tables were scaled, 2026-10-24)", () => {
  const bad = run(`CAPSTONE_NUM.filter(([t]) => Array.isArray(t) && typeof t[5] === "number").map(([t], i) => ({ i, t: t.slice() }))
    .filter(({ t }) => { const d1 = Math.sign(t[4] - t[3]), d2 = Math.sign(t[5] - t[4]); return d1 && d2 && d1 !== d2; }).map(({ i, t }) => i + ": " + t.join(" "))`);
  if (bad.length) return "CAPSTONE_NUM rows whose V turns back: " + bad.join(" | ");
});
check("capstone: one axis to V, a second stops at IV; every tier table covers V (tier redesign 2026-10-24)", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "arc";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0], ids = SKILL_TREES.arc.map(a => a.id);
    for (let k = 0; k < 7; k++) upgradeTower(t, ids[0], true);
    for (let k = 0; k < 7; k++) upgradeTower(t, ids[1], true);
    const out = { a: skillOf(t, ids[0]), b: skillOf(t, ids[1]), opts: skillOptions(t).map(o => o.choice) };
    for (const kind of ["arc", "frz", "sol", "acd", "grv", "car", "ifr"]) for (const ax of SKILL_TREES[kind]) {
      const s = towerStats({ id: 99, kind, x: CX, y: CY, lvl: 6, skills: { [ax.id]: 5 } });
      if (!ax.tiers[4] || Object.values(s).some(v => v === undefined || (typeof v === "number" && isNaN(v)))) out.bad = kind + " " + ax.id;
      if (/undefined/.test(describeTower(kind, { [ax.id]: 5 }))) out.bad = kind + " " + ax.id + " desc";
    }
    return out;
  })()`);
  if (r.a !== 5) return "first axis reached " + r.a + ", not V";
  if (r.b !== 4) return "second axis reached " + r.b + ", not IV (one capstone a tower)";
  if (r.bad) return "tier V incomplete: " + r.bad;
  return "";
});
check("tiers are purchases (owner, 2026-10-23): five slots in every per-tier table, TIER_STEPS ladder steps a buy, an old save read once", () => {
  const r = run(`(() => {
    const out = { len: [], price: [] };
    for (const kind of ["arc", "frz", "sol", "acd", "grv", "car", "ifr"]) for (const ax of SKILL_TREES[kind]) out.len.push(ax.tiers.length);
    for (const T of [ARC_CONDUCTIVITY, VOLT_FORK, ARC_CAPACITANCE, SOL_SPLIT, SOL_BREACH_ARMOR, SOL_SCORCH_N, ACD_LINES, ACD_CONTAGION, FRZ_MOON_COUNT, GRV_AURA_R, CRR_HANGAR, IFR_STORE, IFR_METEOR_RATE, IFR_BEAM_L, IFR_BEAM_W, VOLT_CARRY_N, CAP_BURST_K]) out.len.push(T.length);
    G = newGame(); G.money = 1e9; ui.build = "sol"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); const t = G.towers[0]; G.money = 1e9;
    for (let k = 0; k < 5; k++) { const lvl = t.lvl, m = G.money; upgradeTower(t, "focus", true); out.price.push([skillOf(t, "focus"), t.lvl - lvl, Math.round(m - G.money) === skillPointsCost({ ...t, lvl }, t.lvl - lvl)]); }
    for (let k = 0; k < 4; k++) { upgradeTower(t, "refraction", true); upgradeTower(t, "breach", true); } out.full = [t.lvl, nextBuy(t)];
    const g = { towers: [{ skills: { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 } }] }; skillScaleFix(g); out.once = JSON.stringify(g.towers[0].skills); skillScaleFix(g); out.twice = JSON.stringify(g.towers[0].skills); const g2 = { skillScale: 2, towers: [{ skills: { a: 0, b: 1, c: 2, d: 3, e: 4 } }] }; skillScaleFix(g2); out.s2 = JSON.stringify(g2.towers[0].skills); skillScaleFix(g2); out.s2twice = JSON.stringify(g2.towers[0].skills); const g3 = { skillScale: 2, towers: [{ kind: "arc", lvl: 18, skills: { conductivity: 4, voltage: 3, capacitance: 3 } }] }; skillScaleFix(g3); out.s3 = [g3.towers[0].lvl, nextBuy(g3.towers[0])];
    return out;
  })()`);
  if (r.len.some(n => n < 4 || n > 6)) return "a per-tier table or name list out of range: " + r.len; // (exact lengths: "tier I sits between ...")
  if (JSON.stringify(r.price) !== JSON.stringify([[1, 1, true], [2, 1, true], [3, 1, true], [4, 1, true], [5, 1, true]])) return "a buy's tier / ladder steps / price: " + JSON.stringify(r.price) + " (expected tiers 1..5, one step each)";
  if (JSON.stringify(r.full) !== "[14,null]") return "a full tower (5 + 4 + 4 buys) reads lvl / next buy " + JSON.stringify(r.full) + " (expected 14, none)";
  if (r.once !== '{"a":0,"b":2,"c":2,"d":3,"e":3,"f":4,"g":5}') return "a pre-2026-10-23 save's levels read " + r.once + " (expected 0 2 2 3 3 4 5: old slots to tiers, then one up - tier redesign 2026-10-24)";
  if (r.s2 !== '{"a":0,"b":2,"c":3,"d":4,"e":5}') return "a 6.15 save (tiers 0..IV) reads " + r.s2 + " (expected 0 2 3 4 5: every bought tier one up)";
  if (r.s2twice !== r.s2) return "a 6.15 save is read twice: " + r.s2twice;
  if (JSON.stringify(r.s3) !== "[14,null]") return "a 6.15 full ARC (IV / III / III, lvl 18) resumes at lvl / next buy " + JSON.stringify(r.s3) + " (expected 14, none: lvl = 1 + purchases on the new ladder)";
  if (r.twice !== r.once) return "a save is read twice: " + r.twice;
  return "";
});
check("tier I sits between tier 0 and tier II in every table (tier redesign 2026-10-24)", () => {
  const r = run(`(() => {
    const bad = [];
    const num = (v0, v1, v2, at) => { if (typeof v1 !== "number" || isNaN(v1) || v1 < Math.min(v0, v2) - 1e-9 || v1 > Math.max(v0, v2) + 1e-9) bad.push(at); };
    const walk = (a, b, c, at) => typeof a === "number" ? num(a, b, c, at) : a && typeof a === "object" ? Object.keys(a).forEach(k => walk(a[k], b && b[k], c && c[k], at + "." + k)) : 0;
    CAPSTONE_NUM.forEach(([T], i) => { if (!Array.isArray(T)) return; if (T.length !== 6) bad.push("len " + i); else walk(T[0], T[1], T[2], "table " + i); });
    FULL_TIER_TABLES.forEach((T, i) => { if (T.length !== 6) bad.push("full len " + i); else walk(T[0], T[1], T[2], "full table " + i); }); // (tables written with their capstone in)
    for (const kind in SKILL_TREES) for (const ax of SKILL_TREES[kind]) if (ax.tiers.length !== 5) bad.push(kind + "." + ax.id + " names");
    return bad;
  })()`);
  return r.length ? "tier I out of place: " + r.slice(0, 6).join(", ") : "";
});
check("the build card reads tiers I..V (tier redesign 2026-10-24)", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "sol"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); const t = G.towers[0];
    for (let k = 0; k < 5; k++) upgradeTower(t, "focus", true);
    const out = { focus: skillOf(t, "focus"), offered: skillOptions(t).map(o => o.choice), txt: tierTxt(5), bad: [] };
    for (const kind of ["arc", "frz", "sol", "acd", "grv", "car", "ifr"]) for (const ax of SKILL_TREES[kind]) for (let k = 0; k <= 5; k++) {
      const d = describeTower(kind, { [ax.id]: k }); if (/undefined|NaN/.test(d)) out.bad.push(kind + " " + ax.id + " " + k);
    }
    return out;
  })()`);
  if (r.focus !== 5 || r.offered.includes("focus")) return "focus at " + r.focus + ", still offered: " + r.offered;
  if (r.txt !== "V") return "tier 5 reads " + r.txt + " on the sliders";
  return r.bad.length ? "a sentence reads undefined / NaN: " + r.bad.slice(0, 5).join(", ") : "";
});
check("tier I is no more than today's I: whole counts on the card, from-tier switches at II (tier redesign 2026-10-24, review)", () => {
  const r = run(`(() => {
    const frac = []; for (const kind of ["arc", "frz", "sol", "acd", "grv", "car", "ifr"]) for (const ax of SKILL_TREES[kind]) { const d = describeTower(kind, { [ax.id]: 1 }); if (/\\d\\.5 at a time/.test(d)) frac.push(kind + " " + ax.id); }
    const tch = k => towerStats({ id: 99, kind: "car", x: CX, y: CY, lvl: 1 + k, skills: { launch: k } }).tChain;
    return { frac, cap: CAP_CHAIN_FROM, chain: [tch(1), tch(2)] };
  })()`);
  if (r.frac.length) return "a half count on the card at tier I: " + r.frac.join(", ");
  if (r.cap !== 2) return "Capacitance chains from tier " + r.cap + " (expected II: today's I moved up)";
  if (JSON.stringify(r.chain) !== "[false,true]") return "Tether chains at tiers I / II: " + r.chain + " (expected false, true)";
  return "";
});
ifrHelpers(run); // ifrAll / ifrNear (harness.mjs) - a check below and ifr.mjs use them
check("spacing (owner, 2026-10-20): armor units 36 apart (halved 2026-10-23), fast units three times, shield pods half the gap, a shield V a third (2026-10-21); wave 1 fast at half speed (2026-10-21)", () => {
  const r = run(`(() => {
    G = newGame(); const out = {};
    const a = FORMS.armor.slots(6); out.armorPitch = Math.abs(a[1][0] - a[0][0]); out.armorRow = Math.abs(a[3][1] - a[0][1]);
    const v = FORMS.shield.slots(5); out.vLat = Math.abs(v[1][0] - v[0][0]); out.vBack = Math.abs(v[1][1] - v[0][1]);
    const f = FORMS.fast.slots(2); out.fastSide = Math.abs(f[1][0] - f[0][0]);
    const lanes = { shield: 0, fast: 0 };
    const w = { n: 1, list: ["shield", "shield", "shield", "shield", "shield", "shield", "shield", "shield"], lanes, ang: 0, idx: 0, timer: 0 }; G.spawns = [w];
    G.fleetQ = []; stepSpawns(1e-6); const lead = G.enemies.find(e => e.ahead > 0); out.shieldLag = 2 * V_BACK / Math.max(1, effSpeed(lead)) * ENEMY_SPEED; out.shieldGap = (w.timer * ENEMY_SPEED - out.shieldLag) * plainK("shield"); /* (in full-speed time: the gap stretched by 1 / PLAIN_SPEED_K, 2026-10-26) */ out.shieldIdx = w.idx; out.shieldQueued = G.fleetQ.length;
    const w2 = { n: 1, list: ["fast", "fast", "fast", "fast"], lanes, ang: 0, idx: 0, timer: 0 }; G.spawns = [w2];
    stepSpawns(1e-6); out.fastBehind = w2.timer * ENEMIES.fast.speed * ENEMY_SPEED * FIRST_FAST_SPD * PLAIN_SPEED_K; // wave 1 runs at FIRST_FAST_SPD, every plain enemy at PLAIN_SPEED_K (2026-10-26)
    G.enemies = []; spawnEnemy("fast", 1, 0, 0); spawnEnemy("fast", 2, 0, 0); out.firstSpd = G.enemies[0].spd / lateK(1, "fast"); out.laterSpd = G.enemies[1].spd / lateK(2, "fast");
    return out;
  })()`);
  if (Math.abs(r.armorPitch - 36) > 1e-6 || Math.abs(r.armorRow - 36) > 1e-6) return "armor lattice " + r.armorPitch + " across, " + r.armorRow + " between rows (expected 36 both: halved, owner 2026-10-23)";
  if (Math.abs(r.vLat - 24) > 1e-6 || Math.abs(r.vBack - 28) > 1e-6) return "a shield V steps " + r.vLat + " across, " + r.vBack + " back (expected 24, 28: a third, owner 2026-10-21)";
  if (Math.abs(r.fastSide - 78) > 1e-6 || Math.abs(r.fastBehind - 78) > 0.01) return "fast pairs " + r.fastSide + " across, " + r.fastBehind + " behind (expected 78 both, three times 26)";
  if (Math.abs(r.firstSpd / r.laterSpd - 0.5) > 1e-9) return "wave 1 fast at x" + r.firstSpd + ", wave 2 at x" + r.laterSpd + " (expected wave 1 HALF wave 2 - its speed lever, TYPE_TUNE, sets both: owner 2026-10-21 \"halve the speed of the first fast wave\")";
  if (r.shieldIdx !== 5 || Math.abs(r.shieldGap - 5 * 0.4) > 0.001) return "a pod of " + r.shieldIdx + " shields waits " + r.shieldGap + " (expected 5 x 0.4 = 2, half the old 4)";
  if (r.shieldQueued !== 4) return "a V of 5: " + r.shieldQueued + " wingmates wait off the board (expected 4 - only the leader spawns on it)";
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
check("towers but SOL attack in their first frame - no wind-up (owner, 2026-10-20)", () => {
  const r = run(`(() => { const out = {};
    for (const kind of ["arc", "acd", "grv", "car", "ifr"]) {
      G = newGame(); G.money = 1e9; ui.build = kind; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0];
      for (const e of G.enemies) e.dead = true;
      const e = ifrNear("shield", t, 50); e.shield = 0; e.hp = e.max = 1e9; egridAt = NaN; const hp0 = e.hp;
      step(1 / 60);
      out[kind] = { cd: t.cd, hit: e.hp < hp0, balls: (t.ifrBalls || []).length, out: (t.icp || []).some(i => i.state !== "home"), spheres: (t.spheres || []).length };
    }
    return out; })()`);
  const bad = [];
  if (!(r.arc.cd > 0 || r.arc.hit)) bad.push("ARC");
  if (!r.acd.hit) bad.push("ACD (no hit)");
  if (!(r.grv.cd > 0.06 || r.grv.spheres)) bad.push("GRV");
  if (!r.car.out) bad.push("CRR (nothing launched)");
  if (!r.ifr.balls) bad.push("IFR (no meteor)");
  return bad.length ? "no attack in the first frame: " + bad.join(", ") : "";
});
check("FRZ moons: at most 3 moons, at most 3 moonlets each, at every stop (owner, 2026-10-20; their harder top hit went with the stat curve, tier redesign 2026-10-24)", () => {
  const r = run(`(() => { const out = []; for (const k of [0, 1, 3, 6]) { G = newGame(); G.money = 1e9; ui.build = "frz"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0];
    for (let i = 0; i < k; i++) upgradeTower(t, "moons", true); const st = towerStats(t); out.push({ n: st.moonN, sub: st.subN, srcs: frzSources(t, st).length }); } return out; })()`);
  for (const q of r) if (q.n > 3 || q.sub > 3) return "FRZ moons: " + q.n + " moons, " + q.sub + " moonlets each (max 3 and 3)";
  return "";
});
check("free builds (own box, owner 2026-10-21): towers and upgrades are free, a buy made then bars the leaderboard; auto-move alone charges", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 500; ui.build = "ifr"; freeMode = true; G.freeMode = true;
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); const t = G.towers[0];
    upgradeTower(t, "firaga", true); const out = { money: G.money, towers: G.towers.length, lvl: t.lvl, barred: autoBarred(), spent: t.spent };
    freeMode = false; G.freeMode = false; out.paid = upCost(t) > 0;
    autoMove = true; out.moveFree = upCost(t) === 0; autoMove = false;
    out.boxes = !!document.getElementById("asp-automove") && !!document.getElementById("asp-freebuild"); return out;
  })()`);
  if (r.towers !== 1 || r.lvl < 2) return "free builds: the free tower / upgrade did not happen (towers " + r.towers + ", lvl " + r.lvl + ")";
  if (r.money < 500 || r.spent !== 0) return "free builds charged " /* (>=: the first tower starts wave 1, which may pay) */ + (500 - r.money) + "c (spent " + r.spent + ")";
  if (!r.barred) return "a buy during free builds did not bar the leaderboard";
  if (!r.paid) return "prices stayed 0 after free builds went off";
  if (r.moveFree) return "auto-move alone still made builds free (split, owner 2026-10-21)";
  if (!r.boxes) return "the auto-move and free-build boxes are not both there";
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
check("Temporal Drive stops Strength dead; a tower's slow still takes 40% on her (owner, 2026-10-21)", () => {
  const r = run(`(() => {
    G = newGame(); spawnEnemy("bonus", 36, 0, 0); const e = G.enemies[0]; e.arcana = "strength"; e.seen = true; e.shield = 0;
    applySlow(e, 1, 5, "core:time"); const core = e.slowF; e.slows = {}; sumSlows(e);
    applySlow(e, 0.5, 5, 7); return { core, tower: e.slowF };
  })()`);
  if (!(r.core >= 1 - 1e-9)) return "Temporal Drive slowed Strength to " + r.core + " (expected a full stop, 1)";
  if (!(r.tower < 0.5 * 0.4 + 1e-9)) return "a tower's 0.5 slow on Strength came to " + r.tower + " (expected at most 0.2)";
  return "";
});
check("a shield's corner points along the lane, in a formation too (owner, 2026-10-26: its heading read toward the lane's centre from an offset slot)", () => {
  const r = run(`(() => {
    G = newGame(); G.enemies = [];
    const w = { n: 30, list: ["shield", "shield", "shield"], lanes: { shield: 0 }, ang: 0, idx: 1, timer: 0 }; G.fleetQ = []; formSpawn(w, "shield");
    for (let i = 0; i < 180 && !G.enemies.some(e => e.form); i++) { stepFleetQ(1 / 60); stepEnemies(1 / 60); } for (let i = 0; i < 30; i++) { stepFleetQ(1 / 60); stepEnemies(1 / 60); }
    let worst = 0, n = 0;
    for (const e of G.enemies) { if (e.dead || !e.form) continue; // the lane at the unit's own spot: formOffset's along-lane place (its spin)
      const spin = e.bossKin ? 0 : FORM_SPIN[e.type], c = e.s - (e.ahead || 0) + (e.aheadC || 0), phi = spin ? c / spin : 0, a0 = (e.ahead || 0) - (e.aheadC || 0), along = a0 * Math.cos(phi) - e.lat * Math.sin(phi);
      const a = pathAt(e.pi, c + along, e.ang), b = pathAt(e.pi, c + along + 3, e.ang), h = Math.atan2(b.y - a.y, b.x - a.x);
      worst = Math.max(worst, Math.abs(((e.rot - h + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)); n++; }
    return { n, worst };
  })()`);
  if (!r.n) return "no formation shields on the board";
  if (r.worst > 0.05) return "a formation shield faces " + (r.worst * 180 / Math.PI).toFixed(1) + " degrees off its lane";
});
check("formations reach their spacing in the 1x zone (owner, 2026-10-21: \"they get compressed as they slow down\")", () => {
  const r = run(`(() => {
    G = newGame(); G.enemies = [];
    const w = { n: 30, list: ["shield", "shield", "shield"], lanes: { shield: 0 }, ang: 0, idx: 1, timer: 0 }; G.fleetQ = []; formSpawn(w, "shield");
    const all = [...G.enemies, ...G.fleetQ], a = all.find(e => e.ahead > 0), b = all.find(e => !e.ahead), s0 = entryS(a.pi);
    const born = Math.max(...all.map(e => e.s)) - s0; // the front ON the entry: nothing spawns inside the board
    G.money = 1e6; ui.build = "arc"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null;
    for (const e of all) { e.hp = e.max = 1e12; e.armor = 0; e.shield = 0; }
    let i = 0; for (; i < 20000 && !all.every(e => G.enemies.includes(e) && e.seen && inReach(e, reachCircles())); i++) { stepFleetQ(1 / 60); stepEnemies(1 / 60); }
    const inA = inReach(a, reachCircles()), inB = inReach(b, reachCircles());
    return { born, now: a.s - b.s, inA, inB };
  })()`);
  if (Math.abs(r.born) > 1e-6) return "a V's front spawned " + r.born + " past the entry (owner, 2026-10-21: no unit pops in)";
  if (!(r.inA && r.inB)) return "the test V never reached the 1x zone";
  if (Math.abs(r.now - 28) > 4 /* a step's drift as the wave drops to 1x: its queued units move that step at the wave's old clock (2026-10-26) */) return "in the 1x zone the V's rows are " + r.now.toFixed(1) + " apart (expected V_BACK 28)";
  return "";
});
check("no unit pops in: every enemy of every wave type and every boss fleet first appears at the entry, within a step (owner, 2026-10-21)", () => {
  const r = run(`(() => {
    const bad = [];
    // full-size formations of every type (early waves send one a lane: no lattice), then every boss wave with its fleet
    const tries = [...["armor", "shield", "fast", "swarm"].map(t => [t, 60]), ...[12, 24, 36, 48, 60, 72, 84, 96, 108, 120].map(n => ["boss", n])];
    for (const [type, n] of tries) {
      G = newGame(); G.started = true; G.fleetQ = []; const known = new Set();
      if (type === "boss") { G.wave = n - 1; sendWave(); } else G.spawns = [{ n, list: Array(12).fill(type), lanes: { [type]: 0 }, ang: 0, idx: 0, timer: 0 }];
      for (let i = 0; i < 4000 && (G.spawns.length || G.fleetQ.length); i++) {
        stepSpawns(1 / 60); stepFleetQ(1 / 60);
        for (const e of G.enemies) { if (known.has(e.id)) continue; known.add(e.id); const over = e.s - entryS(e.pi); if (over > 5 * OFF_SCREEN_SPEED /* a step at the wave's clock (2026-10-26) */) bad.push(e.type + "@w" + n + " +" + Math.round(over)); }
      }
    }
    return bad.slice(0, 6);
  })()`);
  return r.length ? "units spawned past the entry: " + r.join(", ") : "";
});
check("GRV support (owner, 2026-10-21): the aura slows harder past the hole, and draws enemies across toward the lane's centre", () => {
  const r = run(`(() => {
    G = newGame(); const s0 = entryS(0) + 300, at = pathAt(0, s0, 0);
    const mk = ds => { spawnEnemy("armor", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; e.s = s0 + ds; const p = pathAt(0, e.s, 0); e.x = p.x; e.y = p.y; e.seen = true; e.shield = 0; return e; };
    const sp = { x: at.x, y: at.y }, behind = mk(-20), past = mk(20);
    // the pull: an enemy 40 u off its lane's centre glides back across toward it, never past
    const l0 = grvLane(behind, sp); behind.x += l0.nx * 40; behind.y += l0.ny * 40;
    const bx = behind.x, by = behind.y; let moved = 0; for (let i = 0; i < 120; i++) { if (i % 15 === 0) grvPullTo(behind, grvLane(behind, sp)); const p = grvPullStep(behind, 1 / 60); behind.x = bx + p[0]; behind.y = by + p[1]; moved = Math.hypot(p[0], p[1]); }
    const back = grvLane(behind, sp).across;
    return { aheadB: grvLane(mk(-20), sp).ahead, aheadP: grvLane(past, sp).ahead, moved, back };
  })()`);
  if (r.aheadB || !r.aheadP) return "past-the-hole reads wrong (behind " + r.aheadB + ", past " + r.aheadP + ")";
  if (!(r.moved > 30 && r.moved <= 40 + 1e-6)) return "the pull moved it " + r.moved.toFixed(1) + " u toward a lane centre 40 u across (expected most of the way, never past)";
  if (!(Math.abs(r.back) < 10)) return "after the pull it sits " + r.back.toFixed(1) + " u off the lane's centre";
  return "";
});
check("GRV: the aura slows smaller enemies more (owner, 2026-10-21)", () => {
  const r = run(`(() => { const k = t => grvSizeK({ type: t }); return { swarm: k("swarm"), fast: k("fast"), armor: k("armor"), boss: grvSizeK({ type: "bonus", sizeMul: 2 }) }; })()`);
  if (!(r.swarm === 2 && r.fast === 1 && r.armor < 1 && r.boss === 0.5)) return "size factors " + JSON.stringify(r) + " (expected swarm 2, fast 1, armor < 1, boss 0.5)";
  return "";
});
check("GRV: a void every shot, at its starting mass, novas before it only from Nova I (owner, 2026-10-25: \"0: void only, atk speed 1/3\")", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "grv"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null; const t = G.towers[0];
    spawnEnemy("armor", 30, 0, 0); const e = G.enemies[0]; e.seen = true; e.hp = e.max = 1e12; e.armor = 0;
    const out = {}; for (const [k, sk] of [["z", {}], ["n", { supernova: 1 }]]) { t.skills = sk; t.lvl = 2; t.spheres = []; const st = towerStats(t); novaAt(t, st, e); novaAt(t, st, e);
      out[k] = { n: t.spheres.length, mass: t.spheres[0].mass, nN: t.spheres[0].nN || 0 }; }
    return out; })()`);
  if (r.z.n !== 2 || r.z.mass !== 3 || r.z.nN) return "tier 0: " + JSON.stringify(r.z) + " (expected a void a shot, mass 3, no nova)";
  if (r.n.nN !== 3) return "Nova I: " + JSON.stringify(r.n) + " (expected three novas)";
  return "";
});
check("SOL: a volley of beams shows ONE number, their sum (owner, 2026-10-21)", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e6; ui.build = "sol"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null; const t = G.towers[0];
    spawnEnemy("armor", 20, 0, 0); const e = G.enemies[0]; e.seen = true; e.hp = e.max = 1e12; e.armor = 0; e.shield = 0;
    dmgLive = []; dmgSums.clear(); const st = { ...towerStats(t), beams: 3, crit: 0, pierce: 0, smash: null }; const hp0 = e.hp;
    rayHit(t, st, e, st.dmg, t); const nums = dmgLive.map(f => f.text);
    return { nums, dealt: hp0 - e.hp, want: String(dmgUnits(hp0 - e.hp)) };
  })()`);
  if (r.nums.length !== 1) return "3 beams showed " + r.nums.length + " numbers (" + r.nums.join(", ") + "; expected one)";
  return r.nums[0] === r.want ? "" : "the volley's number " + r.nums[0] + " (expected its sum " + r.want + ")";
});
check("every shield pop shows its own 0 at once, quiet hits too (owner, 2026-10-21)", () => {
  const r = run(`(() => {
    G = newGame(); dmgLive = []; dmgSums.clear(); spawnEnemy("shield", 20, 0, 0); const e = G.enemies[0]; e.seen = true; e.shield = 5;
    const t = { x: 0, y: 0, id: 1, kind: "ifr" }; for (let i = 0; i < 3; i++) damage(e, 10, t, false, false, IFR_BURN_ST);
    return { zeros: dmgLive.filter(f => f.text === "0").length, left: e.shield };
  })()`);
  if (r.left !== 2) return "3 quiet hits left " + r.left + " charges (expected 2)";
  return r.zeros === 3 ? "" : "3 shield pops showed " + r.zeros + " zeros (expected 3)";
});
check("damage numbers (owner, 2026-10-21): a lone hit shows at once; more within 0.5 s sum into one number at the window's end", () => {
  const r = run(`(() => {
    G = newGame(); dmgLive = []; dmgSums.clear(); spawnEnemy("armor", 5, 0, 0); const e = G.enemies[0], t = { x: 0, y: 0, id: 1 };
    dmgTick(e, 7, 7, "white", t, 0); const first = dmgLive.length;
    dmgTick(e, 5, 5, "white", t, 0); dmgTick(e, 6, 6, "white", t, 0); const held = dmgLive.length;
    for (const b of dmgSums.values()) b.until = 0; drainTicks(); const after = dmgLive.length, label = fx[fx.length - 1].text;
    for (const b of dmgSums.values()) b.until = 0; drainTicks(); return { first, held, after, label, left: dmgSums.size };
  })()`);
  if (r.first !== 1) return "the first hit showed " + r.first + " numbers (expected 1, at once)";
  if (r.held !== 1) return "hits inside the window showed at once (" + r.held + " numbers)";
  if (r.after !== 2 || String(r.label) !== "11") return "the window's sum: " + r.after + " numbers, last " + r.label + " (expected 2, \"11\")";
  if (r.left !== 0) return "a quiet window did not end the run";
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

check("swarm (owner, 2026-10-26): three MAIN lanes 120 degrees apart carry about 80% of a swarm, on a bell - dense mid-stream; the rest on the other lanes", () => {
  const r = run(`(() => { G = newGame(); let n = 41; while (wavePlan(n, null).type !== "swarm" || n % STAR_EVERY === 0) n++; G.wave = n - 1; G.lastType = null; G.spawns = []; G.started = true; sendWave();
    const sw = G.spawns.filter(w => w.list[0] === "swarm"), main = sw.filter(w => w.gaps), tot = sw.reduce((a, w) => a + w.list.length, 0), mt = main.reduce((a, w) => a + w.list.length, 0);
    const angs = main.map(w => w.ang).sort((a, b) => a - b), g = main[0] ? main[0].gaps : [];
    return { m: g.length, lanes: sw.length, n: main.length, share: mt / tot, d1: angs[1] - angs[0], d2: angs[2] - angs[1], mid: g[Math.floor(g.length / 2)], edge: g[0] }; })()`);
  if (r.n !== 3 || r.lanes <= 3) return "main lanes " + r.n + " of " + r.lanes;
  if (Math.abs(r.share - 0.8) > 0.05) return "main share " + r.share.toFixed(3) + " (expected about 0.8)";
  if (Math.abs(r.d1 - 2 * Math.PI / 3) > 1e-6 || Math.abs(r.d2 - 2 * Math.PI / 3) > 1e-6) return "main lanes not 120 degrees apart: " + r.d1 + ", " + r.d2;
  if (!(r.m >= 6 && r.mid < r.edge)) return "no bell: " + r.m + " on a main lane, mid-stream gap " + r.mid + " vs the head's " + r.edge;
});
check("wave list: every boss's shown HP is the HP it spawns with (bossHpMul both sides, before its escorts' 20% - 6.17.1: the list read Death ~14x low)", () => {
  const r = run(`(() => { const bf = bossFleet, out = []; bossFleet = function (e, n) { e.__pre = e.max; return bf(e, n); };
    try { ARCANA.forEach((a, i) => { const n = STAR_EVERY * (i + 1); G = newGame(); G.wave = n - 1; spawnEnemy("bonus", n, 0, 0);
      const e = G.enemies.concat(G.fleetQ).find(x => x.arcana === a.id); if (!e) { out.push(a.id + " did not spawn"); return; } // (a boss enters with its fleet, through G.fleetQ)
      const shown = waveHp({ type: "bonus" }, n), k = bossHpMul(a.id) * BOSS_LANE_HP * BOSS_HEFT; // the spawn floors the base HP before multiplying: up to one base point x k apart
      if (!(e.__pre <= shown + 1 && e.__pre >= shown - k - 1)) out.push(a.id + " list " + Math.round(shown) + " vs spawned " + e.__pre); }); }
    finally { bossFleet = bf; } return out; })()`);
  return r.length ? r.join("; ") : "";
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

report();
