// /spire CAPSTONE AND MECHANIC CHECKS (split from tiers.mjs at 545 lines, 2026-11-08; no check changed): GRV's merge, Hypernova, Undertow and Event
// Horizon, FRZ's Zero Point and Ice Age, ACD's Oblivion and Extinction. Registered into the smoke harness; smoke.mjs imports this file before it
// reports. Its own page env.
import { boot, check, tierHelpers } from "./harness.mjs";

const { run } = boot();
tierHelpers(run);

check("GRV merge (owner, 2026-10-25): two voids' caps do not add - the mass past the bigger cap is lost and shed as pellets", () => {
  const r = run(`(() => { G = newGame(); const mk = (m) => ({ id: G.id++, x: CX, y: CY, vx: 0, vy: 0, ar: 40, age: 1, mass: m, cap: 3, apm: 1600, hit: new Set(), tick: 0, pel: 0, bh: true, open: true, auraSnd: true });
    const a = mk(2.5), b = mk(2); grvMerge(a, b); return { mass: a.mass, cap: a.cap, pel: a.pel, per: GRV_PEL_PER_MASS }; })()`);
  if (r.cap !== 3 || Math.abs(r.mass - 3) > 1e-9 || Math.abs(r.pel - r.per * 1.5) > 1e-6) return "merge: " + JSON.stringify(r) + " (expected cap 3, mass 3, 1.5 mass of pellets)";
});

check("GRV Nova V HYPERNOVA (owner, 2026-11-06: \"Nova yes\"): every 4th nova a tower fires rings twice - a second ring at 1.5x the reach, so an enemy only it reaches is hit and one both reach takes both; novas 1-3 ring once; Nova IV never rings twice", () => {
  const r = run(`(() => { const go = nv => { const out = [], hits = [];
      for (let i = 1; i <= 4; i++) { const { t, es, st } = tierRig("grv", { supernova: nv }, [[60, 0], [70, 0], [60, 40]]);
        // (a fresh rig a nova would restart the count: fire the first i-1 on this tower's own counter)
        t.novaFired = i - 1; const R = st.novaR, B = es[2]; B.x = es[0].x + R * 1.25; B.y = es[0].y;
        novaAt(t, st, es[0]); const sp = t.spheres[0]; out.push(sp.nN); const h0 = es.map(e => e.hp);
        for (let k = 0; k < 4000 && sp.age < novaEnd(sp) - 0.003; k++) { t.pellets = []; stepGrv(t, 0.001); } /* (no pellet's hit in the count; to the very end of the sweep: the front reaches the enemy beside its centre last) */
        hits.push(es.map((e, j) => h0[j] - e.hp)); }
      return { nN: out, hits }; };
    return { v: go(5), iv: go(4) }; })()`);
  if (JSON.stringify(r.v.nN) !== "[1,1,1,2]") return "Nova V rings per nova " + JSON.stringify(r.v.nN) + " (expected 1 1 1 2)";
  if (r.iv.nN.some(n => n !== 1)) return "Nova IV rings per nova " + JSON.stringify(r.iv.nN);
  const [a1, , , a4] = r.v.hits;
  const j = a1[0] > 0 ? 0 : 1; /* (the nova lands on one of the pair; the other sits at its centre) */
  if (!(a1[j] > 0) || a1[2] !== 0) return "a single nova hit the 1.25x enemy or missed the first: " + JSON.stringify(a1);
  if (!(a4[2] > 0) || Math.abs(a4[j] / a1[j] - 2) > 0.01) return "the double nova: the enemy beside the centre x" + (a4[j] / a1[j]) + " of one nova (expected 2), the 1.25x enemy " + a4[2];
});
// G.core IS THE BOARD'S POWER STATE (coreState, aspira-core.js), set once a boss hands out a power - 7.7.111's coreXY read it as the core's
// point, so every Well V reel after the first power threw "coreXY is not a function or its return value is not iterable" in the step (Balance, 2026-11-07)
check("GRV Undertow with a core power held (G.core = coreState()): the reel still measures to the board's core and never throws (7.7.111 hotfix)", () => {
  const r = run(`(() => { try { const { t, es, st } = tierRig("grv", { radiation: 5, void: 1 }, [[0, 0]]); coreState().picks = 1;
      const dx = CX - t.x, dy = CY - t.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, near = es[0];
      near.x = t.x + ux * 40; near.y = t.y + uy * 40; near.s = 500; near.hp = near.max = 1e12;
      novaAt(t, st, near); const sp = t.spheres[0]; sp.x = near.x - ux * 30; sp.y = near.y - uy * 30; sp.age = 5; sp.mass = sp.cap; G.clock = 0;
      for (let k = 0; k < 120; k++) { G.clock += 1 / 60; sp.mass = sp.cap; sp.span = 0; stepGrv(t, 1 / 60); if (near.reelT > 0) grvReelStep(near, 1 / 60); }
      const c = coreXY(); return { reeled: 500 - near.s, core: [c[0], c[1]], isObj: !Array.isArray(G.core) };
    } catch (err) { return { err: String(err) }; } })()`);
  if (r.err) return "threw: " + r.err;
  if (!r.isObj) return "the rig's G.core is not the power state (the check proves nothing)";
  if (r.core[0] !== 500 || r.core[1] !== 500) return "coreXY() on the board = " + JSON.stringify(r.core) + " (expected the centre, CX/CY)";
  if (!(r.reeled > 0)) return "no reel with a power held (" + r.reeled + ")";
});

check("GRV Gravity Well V UNDERTOW (owner, 2026-11-06: \"enemies closer to the core than GRV are reeled back into the center of void\"): an enemy in the aura NEARER THE CORE than the tower is reeled back along its lane once, not again inside GRV_REEL_CD; one further out is left alone; Well IV reels nothing", () => {
  const r = run(`(() => { const go = w => { const { t, es, st } = tierRig("grv", { radiation: w, void: 1 }, [[0, 0], [0, 0]]);
      const dx = CX - t.x, dy = CY - t.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, near = es[0], far = es[1];
      near.x = t.x + ux * 40; near.y = t.y + uy * 40; far.x = t.x - ux * 40; far.y = t.y - uy * 40; near.s = far.s = 500; near.hp = near.max = far.hp = far.max = 1e12;
      novaAt(t, st, near); const sp = t.spheres[0]; sp.x = near.x - ux * 30; sp.y = near.y - uy * 30; sp.age = 5; sp.mass = sp.cap; G.clock = 0;
      const dts = 1 / 60, drops = []; let last = near.s;
      for (let k = 0; k < 60 * 6; k++) { G.clock += dts; sp.mass = sp.cap; sp.span = 0; stepGrv(t, dts); if (near.reelT > 0) grvReelStep(near, dts); if (near.s < last - 1e-9) { drops.push(+(G.clock).toFixed(2)); last = near.s; } }
      const ticks = []; for (let k = 0; k < 4; k++) { ticks.push(drops.filter(c => c >= k * 1.5 && c < (k + 1) * 1.5).length); }
      return { total: 500 - near.s, far: 500 - far.s, first: drops[0], at: drops, cd: GRV_REEL_CD }; };
    return { v: go(5), iv: go(4) }; })()`);
  const v = r.v;
  if (!(v.total > 0) || v.far !== 0) return "Undertow V: reeled " + v.total + " back, the enemy further out " + v.far + " (expected the near one only)";
  if (Math.abs(v.total - 2 * 30) > 8) return "Undertow V reeled " + v.total + " u in 6 s (expected two full reels of the 30 u to the void's centre)";
  const first = v.at.filter(c => c < v.first + 0.7).length, again = v.at.filter(c => c > v.first + v.cd).length;
  if (!(first >= 1) || !(again >= 1) || v.at.some(c => c > v.first + 0.7 && c < v.first + v.cd)) return "Undertow V reel times " + JSON.stringify(v.at) + " (expected one reel, then none inside " + v.cd + " s, then another)";
  if (r.iv.total !== 0) return "Gravity Well IV reels (" + r.iv.total + ")";
});
check("GRV Gravity Well V cannot STUNLOCK a boss (owner, 2026-11-06: \"make sure that it cannot stunlock bosses with 3GRVs\"): three GRVs at Void V / Nova V / Well V on a boss's lane - over 20 s it still covers a clear share of the lane it covers with Well IV and with no GRV", () => {
  const r = run(`(() => { const go = (w, n3) => { G = newGame(); G.money = 1e9; G.lives = 1e6; G.started = true; G.wave = 35; spawnEnemy("bonus", 36, 0, 0);
      const e = G.enemies.concat(G.fleetQ).find(x => x.arcana); G.fleetQ = []; G.enemies = [e]; e.fleet = []; e.hp = e.max = 1e15; e.armor = e.armor0 = 0; e.shield = e.shieldMax = 0; e.seen = true;
      const s0 = PATHS[0].len * 0.7 /* (0.55 reeled once by luck of the x3 dash, gone with its taper 2026-11-10; 0.7 reels twice either way) */, p0 = pathAt(0, s0, 0); e.s = s0; e.x = p0.x; e.y = p0.y; e.spd = e.baseSpd = e.spd;
      const open = CELLS.map((c, i) => i).filter(i => cellOpen(i) && canPlace(i)).sort((a, b) => Math.hypot(CELLS[a].x - p0.x, CELLS[a].y - p0.y) - Math.hypot(CELLS[b].x - p0.x, CELLS[b].y - p0.y));
      for (let i = 0; i < n3; i++) { ui.build = "grv"; placeTower(CELLS[open[i]]); const t = G.towers[G.towers.length - 1]; t.skills = { void: 5, supernova: 5, radiation: w }; t.lvl = 1 + towerLevel(t); }
      G.spawnQ = []; let reels = 0; const _r = grvReel; grvReel = (...a) => { const b = a[0].reelAt; _r(...a); if (a[0].reelAt !== b) reels++; }; try { for (let k = 0; k < 20 * 30; k++) { G.wave = 35; step(1 / 30); } } finally { grvReel = _r; } return { d: e.s - s0, reels }; };
    return { none: go(0, 0), iv: go(4, 3), v: go(5, 3) }; })()`);
  if (!(r.none.d > 0)) return "the boss never moved with no GRV: " + JSON.stringify(r);
  if (!(r.v.reels >= 1)) return "the boss was never reeled by 3 GRVs at Well V (the check proves nothing): " + JSON.stringify(r);
  if (!(r.v.d >= 0.5 * r.iv.d) || !(r.v.d >= 0.15 * r.none.d)) return "3 GRVs at Well V held the boss: advanced " + r.v.d.toFixed(1) + " u in 20 s vs " + r.iv.d.toFixed(1) + " at Well IV and " + r.none.d.toFixed(1) + " with none (" + r.v.reels + " reels)";
  console.log("  boss no-stunlock: advance in 20 s - none " + r.none.d.toFixed(1) + " u, Well IV x3 " + r.iv.d.toFixed(1) + " u, Well V x3 " + r.v.d.toFixed(1) + " u (" + r.v.reels + " reels)");
});
check("GRV Void V EVENT HORIZON (owner, 2026-11-06: \"yes to GRV void V\"): each enemy the crush kills grows the void x1.1, stacking to x1.5, and it is back at x1 3 s after the last kill; Void IV never grows; the crush stays under the 800% cap", () => {
  const r = run(`(() => { const go = v => { const { t, es, st } = tierRig("grv", { void: v }, [[60, 0], [60, 0], [60, 0], [60, 0], [60, 0], [60, 0], [60, 0], [60, 0], [60, 0], [60, 0], [60, 0]]);
      novaAt(t, st, es[0]); const sp = t.spheres[0]; sp.age = 5; sp.mass = sp.cap; sp.x = es[0].x; sp.y = es[0].y; sp.apm = grvAuraBase(sp, st) ** 2; sp.auraSnd = true; sp.open = true;
      const ar0 = grvAuraR(sp, st); for (const e of es) { e.x = sp.x + 1; e.y = sp.y; e.hp = e.max = 1e12; } const out = {};
      let mx = 1, mr = 1; const run1 = secs => { for (let k = 0; k < secs * 60; k++) { sp.mass = sp.cap; sp.span = 0; t.pellets = []; stepGrv(t, 1 / 60); mx = Math.max(mx, grvEvK(sp)); mr = Math.max(mr, grvAuraR(sp, st) / ar0); } }; /* (no pellet may take the kill from the crush) */
      es[0].hp = es[0].max = 1; run1(0.3); out.k1 = mx;
      for (let i = 1; i < 4; i++) es[i].hp = es[i].max = 1; run1(0.3); out.k4 = mx;
      for (let i = 4; i < 11; i++) es[i].hp = es[i].max = 1; run1(0.3); out.cap = mx; out.grew = mr;
      for (const e of es) if (!e.dead) e.x = sp.x + 9999; run1(3.2); out.back = grvEvK(sp); out.mass = sp.mass; out.cdmg = st.hdmg * st.innerK; return out; };
    return { v: go(5), iv: go(4) }; })()`);
  const v = r.v;
  if (Math.abs(v.k1 - 1.1) > 0.02) return "one kill grew the void to x" + v.k1 + " (expected 1.1): " + JSON.stringify(v);
  if (!(v.k4 > 1.1 * 1.1 && v.k4 <= 1.5 + 1e-9)) return "after more kills x" + v.k4 + " (expected stacking, under the cap)";
  if (Math.abs(v.cap - 1.5) > 1e-9 || Math.abs(v.grew - 1.5) > 0.05) return "the cap: evK x" + v.cap + ", the aura grew x" + v.grew + " (expected 1.5)";
  if (v.back !== 1) return "3.2 s after the last kill the void is still x" + v.back;
  if (r.iv.cap !== 1) return "Void IV grows (x" + r.iv.cap + ")";
});

// ---------- the left-for-later list (owner, 2026-10-25: "zero" / "fix all the left for later things") ----------
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
check("ACD Corrosion V: a corroded enemy takes x(1+ACD_CORR_TAKE) from a NON-ACD tower, one ACD or two alike, x1 once the corrosion ends, and it multiplies with Fracture", () => {
  const r = run(`(() => {
    const hit = (nAcd, corrosion, wait) => {
      const { t, es } = tierLane("acd", { corrosion }, [30]); const e = es[0]; e.hp = e.max = 1e9; e.armor = e.armor0 = 0; G.started = true; G.nextIn = 1e9; G.spawns = [];
      for (let i = 1; i < nAcd; i++) { const t2 = { ...t, id: t.id + 1, lines: [] }; G.towers.push(t2); }
      for (let k = 0; k < 120; k++) step(1 / 60);
      const probe = (b) => { const before = e.hp; e.brittle = b || 0; e.slowT = b ? 9 : 0; const o = { id: 777, kind: "sol", x: 0, y: 0 }; const h0 = e.hp; damage(e, 1000, o, true); const d = h0 - e.hp; return d; };
      const live = e.corrTakeT > 0, d = probe(0), db = probe(2);
      for (const x of G.towers) x.lines = [], x.cd = 1e9; G.towers.length = 0; e.corrTakeT = 0;
      for (let k = 0; k < wait; k++) step(1 / 60);
      return { live, d, db, after: probe(0) };
    };
    return { one: hit(1, 5, 0), two: hit(2, 5, 0), none: hit(1, 4, 0) };
  })()`);
  const x = 1 + run("ACD_CORR_TAKE");
  for (const k of ["one", "two"]) {
    if (!r[k].live) return k + ": no corrTakeT on a corroded enemy";
    if (Math.abs(r[k].d / r.none.d - x) > 0.02) return k + " ACD: hit x" + (r[k].d / r.none.d).toFixed(3) + " (expected " + x + ")";
    if (Math.abs(r[k].db / r.none.db - x) > 0.02) return k + " ACD: with Fracture x" + (r[k].db / r.none.db).toFixed(3) + " (expected the two to multiply, " + x + ")";
  }
  if (r.none.live || Math.abs(r.one.after / r.none.after - 1) > 0.02) return "after the corrosion ended the hit is still x" + (r.one.after / r.none.after).toFixed(3);
  if (Math.abs(r.one.d - r.two.d) > 0.02 * r.one.d) return "two ACDs stacked: " + r.one.d + " vs " + r.two.d;
});
check("ACD Spill V: overlapping pools are a LAKE and each burns x ACD_LAKE_K; a lone pool and a Spill IV pool burn x1", () => {
  const r = run(`(() => {
    const go = (contagion, apart) => {
      const { t, es } = tierLane("acd", { contagion }, [30]); G.started = true; G.nextIn = 1e9; G.spawns = []; const st = towerStats(t);
      const e = es[0]; e.hp = e.max = 1e9; e.armor = e.armor0 = 0; e.x = 500; e.y = 500; e.seen = true; e.stunT = 1e9;
      t.puddles = []; t.lines = []; t.cd = 1e9;
      const mk = x => ({ x, y: 500, r: 100, life: 9, age: 0, tick: 0, dps: 1000 });
      const a = mk(500), b = mk(500 + apart); t.puddles.push(a); if (st.lake) {} ; t.puddles.push(b); if (st.lake) { mergeLake(t, b); }
      return { lake: [!!a.lake, !!b.lake], st };
    };
    const burn = (contagion, apart) => { const g = go(contagion, apart); const t = G.towers[0], e = G.enemies[0]; const st = g.st; const h0 = e.hp; t.lines = []; stepPuddles(t, st, 1 / st.rate); return { lake: g.lake, d: h0 - e.hp }; };
    return { v2: burn(5, 150), v1: burn(5, 500), iv2: burn(4, 150) };
  })()`);
  const K = run("ACD_LAKE_K");
  if (!r.v2.lake[0] || !r.v2.lake[1]) return "Spill V pools overlapping are not a lake: " + JSON.stringify(r.v2.lake);
  if (r.v1.lake[0] || r.v1.lake[1]) return "pools 500 apart merged";
  if (r.iv2.lake[0]) return "Spill IV merged";
  if (Math.abs(r.v2.d / r.iv2.d - K) > 0.05) return "two overlapping V pools burn x" + (r.v2.d / r.iv2.d).toFixed(3) + " of IV's (expected " + K + ")";
});
