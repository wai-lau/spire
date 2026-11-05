// /spire LANE AND WAVE CHECKS (split out of smoke.mjs 2026-10-30, the 500-line cap): the play box and its slots, lane picks,
// lane brightness, formations and spawning. Registered into the smoke harness; smoke.mjs imports this file before it reports.
// Its own page env (the checks that boot their own views still do), so the smoke checks' game state never leaks in.
import { boot, check } from "./harness.mjs";

const { run } = boot();
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

check("spacing (owner, 2026-10-20): armor units 36 apart (halved 2026-10-23), fast pods 78 apart (three times), shield pods half the gap, a V a third (2026-10-21); the swap (2026-10-29): fast fly the Vs, shields a 2x2 lattice 36 apart; wave 1 fast at half speed (2026-10-21)", () => {
  const r = run(`(() => {
    G = newGame(); const out = {};
    const a = FORMS.armor.slots(6); out.armorPitch = Math.abs(a[1][0] - a[0][0]); out.armorRow = Math.abs(a[3][1] - a[0][1]);
    const v = FORMS.fast.slots(5); out.vLat = Math.abs(v[1][0] - v[0][0]); out.vBack = Math.abs(v[1][1] - v[0][1]);
    const q = FORMS.shield.slots(4); out.shPitch = Math.abs(q[1][0] - q[0][0]); out.shRow = Math.abs(q[2][1] - q[0][1]); out.shGroup = FORMS.shield.group(9);
    const lanes = { shield: 0, fast: 0 };
    const w = { n: 1, list: ["shield", "shield", "shield", "shield", "shield", "shield", "shield", "shield"], lanes, ang: 0, idx: 0, timer: 0 }; G.spawns = [w];
    G.fleetQ = []; stepSpawns(1e-6); const lead = G.enemies.find(e => e.ahead > 0); out.shieldLag = SHIELD_PITCH / Math.max(1, effSpeed(lead)) * ENEMY_SPEED; out.shieldGap = (w.timer * ENEMY_SPEED - out.shieldLag) * plainK("shield"); /* (in full-speed time: the gap stretched by 1 / PLAIN_SPEED_K, 2026-10-26) */ out.shieldIdx = w.idx; out.shieldQueued = G.fleetQ.length;
    const w2 = { n: 1, list: ["fast"], lanes, ang: 0, idx: 0, timer: 0 }; G.spawns = [w2]; // a LONE fast (a V of 1, no depth): the gap to the next pod alone
    stepSpawns(1e-6); out.fastBehind = w2.timer * ENEMIES.fast.speed * ENEMY_SPEED * FIRST_FAST_SPD * PLAIN_SPEED_K; // wave 1 runs at FIRST_FAST_SPD, every plain enemy at PLAIN_SPEED_K (2026-10-26)
    G.enemies = []; spawnEnemy("fast", 1, 0, 0); spawnEnemy("fast", 2, 0, 0); out.firstSpd = G.enemies[0].spd / lateK(1, "fast"); out.laterSpd = G.enemies[1].spd / lateK(2, "fast");
    return out;
  })()`);
  if (Math.abs(r.armorPitch - 36) > 1e-6 || Math.abs(r.armorRow - 36) > 1e-6) return "armor lattice " + r.armorPitch + " across, " + r.armorRow + " between rows (expected 36 both: halved, owner 2026-10-23)";
  if (Math.abs(r.vLat - 24) > 1e-6 || Math.abs(r.vBack - 28) > 1e-6) return "a fast V steps " + r.vLat + " across, " + r.vBack + " back (expected 24, 28: a third, owner 2026-10-21; fast fly the Vs since 2026-10-29)";
  if (Math.abs(r.shPitch - 36) > 1e-6 || Math.abs(r.shRow - 36) > 1e-6 || r.shGroup !== 4) return "a shield lattice " + r.shPitch + " across, " + r.shRow + " between rows, groups of " + r.shGroup + " (expected 36, 36, 4: the 2x2 lattice, owner 2026-10-29)";
  if (Math.abs(r.fastBehind - 78) > 0.01) return "fast pods " + r.fastBehind + " apart (expected 78, three times 26)";
  if (Math.abs(r.firstSpd / r.laterSpd - 0.5) > 1e-9) return "wave 1 fast at x" + r.firstSpd + ", wave 2 at x" + r.laterSpd + " (expected wave 1 HALF wave 2 - its speed lever, TYPE_TUNE, sets both: owner 2026-10-21 \"halve the speed of the first fast wave\")";
  if (r.shieldIdx !== 4 || Math.abs(r.shieldGap - 4 * 0.4) > 0.001) return "a pod of " + r.shieldIdx + " shields waits " + r.shieldGap + " (expected a block of 4 x 0.4 = 1.6)";
  if (r.shieldQueued !== 2) return "a 2x2 block: " + r.shieldQueued + " wait off the board (expected 2 - the front row spawns on it)";
  return "";
});
check("a shield's corner points along the lane, in a formation too (owner, 2026-10-26: its heading read toward the lane's centre from an offset slot)", () => {
  const r = run(`(() => {
    G = newGame(); G.enemies = [];
    const w = { n: 30, list: ["shield", "shield", "shield", "shield"], lanes: { shield: 0 }, ang: 0, idx: 1, timer: 0 }; G.fleetQ = []; formSpawn(w, "shield");
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
    const w = { n: 30, list: ["shield", "shield", "shield", "shield"], lanes: { shield: 0 }, ang: 0, idx: 1, timer: 0 }; G.fleetQ = []; formSpawn(w, "shield");
    const all = [...G.enemies, ...G.fleetQ], a = all.find(e => e.ahead > 0), b = all.find(e => !e.ahead), s0 = entryS(a.pi);
    const born = Math.max(...all.map(e => e.s)) - s0; // the front ON the entry: nothing spawns inside the board
    G.money = 1e6; ui.build = "arc"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null;
    for (const e of all) { e.hp = e.max = 1e12; e.armor = 0; e.shield = 0; }
    let i = 0; for (; i < 20000 && !all.every(e => G.enemies.includes(e) && e.seen && inReach(e, reachCircles())); i++) { stepFleetQ(1 / 60); stepEnemies(1 / 60); }
    const inA = inReach(a, reachCircles()), inB = inReach(b, reachCircles());
    return { born, now: a.s - b.s, inA, inB };
  })()`);
  if (Math.abs(r.born) > 1e-6) return "a shield block's front spawned " + r.born + " past the entry (owner, 2026-10-21: no unit pops in)";
  if (!(r.inA && r.inB)) return "the test block never reached the 1x zone";
  if (Math.abs(r.now - 36) > 4 /* a step's drift as the wave drops to 1x: its queued units move that step at the wave's old clock (2026-10-26) */) return "in the 1x zone the shield block's rows are " + r.now.toFixed(1) + " apart (expected SHIELD_PITCH 36)";
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

check("a boss in the threat zone shows its HP left, 0-100, over itself; one further out shows nothing (owner, 2026-11-03)", () => {
  const env = boot(), r = env.run;
  r(`BAR_HOLD = false; G = newGame(); G.money = 1e9; G.started = true; G.nextIn = 1e9; G.waveIn = { 12: 1 }; spawnEnemy("bonus", 12, 0, 0); spawnEnemy("bonus", 12, 1, 0);
     { const [a, b] = G.enemies; a.arcana = b.arcana = "star"; a.hp = a.max * 0.546; b.hp = b.max * 0.3;
       const v = effSpeed(a); a.s = PATHS[0].len - v * 2; const p = pathAt(0, a.s, 0); a.x = p.x; a.y = p.y; a.seen = true;
       b.s = entryS(1) + 5; const q = pathAt(1, b.s, 0); b.x = q.x; b.y = q.y; b.seen = true;}
     window.__said = []; { const t0 = text; text = (s, ...a) => { window.__said.push(String(s)); return t0(s, ...a); }; window.__t0 = t0; }`);
  for (let i = 0; i < 3; i++) env.dom.tick(1000 / 60);
  const eta = r("[etaToCore(G.enemies[0]), etaToCore(G.enemies[1])]"), said = r("const s = window.__said; text = window.__t0; BAR_HOLD = true; s");
  if (!(eta[0] <= 4 && eta[1] > 4)) return "rig: etas " + eta.map(x => x.toFixed(1));
  if (!said.includes("55")) return "no 55 over the near boss (said: " + said.slice(0, 12).join(" ") + ")";
  if (said.includes("30")) return "the far boss (30) shows a number";
});

check("a boss's ETA to the core matches when it gets there, in reach (1x), not (OFF_SCREEN_SPEED), or reached mid-way, with the core ease (2026-11-03)", () => {
  const out = run(`(() => { const bad = [], B0 = BAR_HOLD; BAR_HOLD = false;
    try { for (const reach of [false, true, "flip"]) { // flip: out of reach, into reach after 1 s - the core ease starts there (7.2.2), its ETA read in the zone
      G = newGame(); G.money = 0; G.lives = 999; G.started = true; G.nextIn = 1e9; G.wave = 84; if (reach === true) G.waveIn = { 84: 1 };
      spawnEnemy("bonus", 84, 0, 0); const e = G.enemies[0]; e.seen = true; e.s = PATHS[0].len - effSpeed(e) * (reach === "flip" ? 10 : waveClock(e.n) * 6);
      let eta = reach === "flip" ? null : etaToCore(e), at = 0, t = 0;
      while (G.enemies.includes(e) && !e.gone && t < 30) { if (reach === "flip" && t >= 1) (G.waveIn ||= {})[84] = 1; if (eta === null && t >= 1 && etaToCore(e) <= THREAT_FROM) { eta = etaToCore(e); at = t; } step(1 / 60); t += 1 / 60; }
      if (!(Math.abs(t - at - eta) <= 0.3)) bad.push((reach === "flip" ? "into reach mid-way" : reach ? "in reach" : "out of reach") + ": ETA " + (eta ?? NaN).toFixed(2) + ", came " + (t - at).toFixed(2));
    } } finally { BAR_HOLD = B0; }
    return bad.join("; "); })()`);
  return out;
});

// THE BOSS REDESIGN (owner, 2026-11-05): each boss's fleet as the owner set it - the Star "3 x 10 fast in a lattice as fleet"
const bossRig = n => run(`(() => { G = newGame(); G.wave = ${n} - 1; spawnEnemy("bonus", ${n}, 0, 0); const e = G.enemies.concat(G.fleetQ).find(x => x.arcana);
  const f = e.fleet || [], ty = {}; for (const m of f) ty[m.type] = (ty[m.type] || 0) + 1;
  return { arc: e.arcana, n: f.length, ty, lats: [...new Set(f.map(m => Math.round(m.lat)))].length, ahead: f.filter(m => m.ahead > 0).length, behind: f.filter(m => m.ahead < 0).length,
    rows: [...new Set(f.map(m => Math.round(m.ahead)))].length, shield: f.map(m => m.shield || 0), armor: f.map(m => m.armor || 0) }; })()`);
check("bosses (owner, 2026-11-05): the Star's fleet is a 3 x 10 lattice of fast, behind it", () => {
  const s = bossRig(12);
  if (s.arc !== "star" || s.n !== 30 || s.ty.fast !== 30 || s.lats !== 3 || s.rows !== 10 || s.ahead) return "Star fleet " + JSON.stringify(s);
});
check("bosses (owner, 2026-11-05): Strength at the centre of a 3 x 12 armor lattice, taking 10% of any slow", () => {
  const s = bossRig(36), k = run("bossSlowMul({ arcana: 'strength' })");
  if (s.arc !== "strength" || s.n !== 36 || s.ty.armor !== 36 || s.lats !== 3 || !s.ahead || s.ahead !== s.behind) return "Strength fleet " + JSON.stringify(s);
  if (k !== 0.1) return "Strength takes " + k + " of a slow (expected 0.1)";
});
check("bosses (owner, 2026-11-05): Temperance at the centre of a 3 x 12 shield lattice, her regen kept", () => {
  const s = bossRig(72);
  if (s.arc !== "temperance" || s.n !== 36 || s.ty.shield !== 36 || s.lats !== 3 || s.ahead !== 18 || s.behind !== 18 || !s.shield.every(x => x > 0)) return "Temperance fleet " + JSON.stringify(s).slice(0, 300);
  if (!(run("TEMPERANCE_REGEN") > 0)) return "Temperance lost her regen";
});
check("bosses (owner, 2026-11-05): Justice at the crossing of a 7-across, 13-along cross of armored, shielded escorts", () => {
  const s = bossRig(96);
  if (s.arc !== "justice" || s.n !== 18 || s.ty.armor !== 18 || s.lats !== 7 || s.ahead !== 6 || s.behind !== 6 || !s.shield.every(x => x > 0) || !s.armor.every(x => x > 0)) return "Justice fleet " + JSON.stringify(s).slice(0, 300);
});
check("bosses (owner, 2026-11-05): the Empress comes alone and pours out a whole swarm wave past 2/3 and past 1/3 of her HP", () => {
  const r = run(`(() => { G = newGame(); G.wave = 23; spawnEnemy("bonus", 24, 0, 0); const e = G.enemies.concat(G.fleetQ).find(x => x.arcana); if (!G.enemies.includes(e)) G.enemies.push(e);
    const kin = () => G.enemies.filter(m => m.bossKin && m.type === "swarm").length, out = [e.fleet.length];
    for (const f of [0.9, 0.6, 0.5, 0.3, 0.05]) { e.hp = e.max * f; bossStep(e, 0.01); out.push(kin()); } return { out, want: typeWaveCount("swarm", 24) }; })()`);
  const [fl, a, b, c, d, z] = r.out, w = r.want;
  if (fl || a || b !== w || c !== w || d !== 2 * w || z !== 2 * w || !(w >= 12)) return "Empress fleet, brood after 0.9/0.6/0.5/0.3/0.05: " + r.out + " (a wave = " + w + ")";
});
check("bosses (owner, 2026-11-05): the Lovers bring one armor wave scattered like a swarm (half each), and the one left alone neither heals nor runs", () => {
  const s = bossRig(60), r = run(`(() => { G = newGame(); G.wave = 59; spawnEnemy("bonus", 60, 0, 0); spawnEnemy("bonus", 60, 1, Math.PI);
    const [a, b] = G.enemies.concat(G.fleetQ).filter(x => x.arcana); const jit = a.fleet.every(m => m.jit > 0); b.hp = b.max * 0.4; const hp = b.hp, sp = b.spd;
    a.hp = 0; kill(a); return { jit, mated: a.mate === b, healed: b.hp !== hp, ran: b.spd !== sp, want: typeWaveCount("armor", 60) }; })()`);
  if (s.arc !== "lovers" || s.ty.armor !== Math.round(r.want / 2) || s.n !== s.ty.armor || !r.jit) return "Lovers fleet " + JSON.stringify(s).slice(0, 200) + " jit " + r.jit + " (a wave " + r.want + ")";
  if (r.healed || r.ran) return "Lovers pair " + JSON.stringify(r);
});
check("bosses (owner, 2026-11-05): Judgement comes alone; killed, she rises once at her lane's start at full HP with 1.2 swarm waves behind her, and her second death is her last", () => {
  const r = run(`(() => { G = newGame(); G.wave = 107; spawnEnemy("bonus", 108, 0, 0); const e = G.enemies.concat(G.fleetQ).find(x => x.arcana);
    if (!G.enemies.includes(e)) { G.fleetQ.splice(G.fleetQ.indexOf(e), 1); G.enemies.push(e); } const f0 = e.fleet.length; e.s = PATHS[0].len * 0.7; e.hp = 0; kill(e);
    const a = { f0, dead: e.dead, hp: e.hp / e.max, at: e.s - entryS(0), kin: G.fleetQ.concat(G.enemies).filter(m => m.type === "swarm" && m.bossKin).length, want: Math.round(1.2 * typeWaveCount("swarm", 108)) };
    e.hp = 0; kill(e); a.dead2 = e.dead; return a; })()`);
  if (r.f0 || r.dead || r.hp !== 1 || Math.abs(r.at) > 0.01 || r.kin !== r.want || !r.dead2) return "Judgement " + JSON.stringify(r);
});
