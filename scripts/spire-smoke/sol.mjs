// /spire SOL TRACKING BEAM CHECKS (2026-11-05, with the old shot's deletion): the beam held on its first target, Reflection's splits,
// Breach's strip and carry, the scorch pace. They step stepSolTrack itself, so enemies sit at exact spots (a stepped game re-reads a spot
// from its lane). Registered into the smoke harness; smoke.mjs imports this file before it reports. Its own page env.
import { boot, check } from "./harness.mjs";

const { run } = boot();
// a SOL bought to `skills` and enemies at tower-relative spots (huge HP, no armor or shield unless set), nothing else on the board
run(`function solRig(skills, spots) {
  G = newGame(); G.money = 1e9; ui.build = "sol"; const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
  const t = G.towers[0]; t.skills = { ...skills }; t.lvl = 1 + towerLevel(t); G.enemies.length = 0;
  const es = spots.map(([dx, dy]) => { spawnEnemy("armor", 30, 0, 0); const e = G.enemies[G.enemies.length - 1];
    e.x = t.x + dx; e.y = t.y + dy; e.seen = true; e.hp = e.max = 1e9; e.armor = e.armor0 = 0; e.shield = e.shieldMax = 0; return e; });
  return { t, es, st: towerStats(t) };
}
const solRun = (t, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) stepSolTrack(t, towerStats(t), 1 / 60); };`);

check("SOL tracking beam, tier 0: it holds ONE target and hits only it, while it lives in range (owner, 2026-11-04: \"SOL 0 no pierce\")", () => {
  const r = run(`(() => { const { t, es } = solRig({}, [[60, 0], [90, 0], [60, 40]]); solRun(t, 2);
    return { held: t.solB && es.indexOf(t.solB.e), hit: es.map(e => e.hp < e.max), links: t.solB ? t.solB.links.length : -1 }; })()`);
  if (r.held < 0) return "no enemy held after 2 s";
  const others = r.hit.filter((h, i) => h && i !== r.held).length;
  if (!r.hit[r.held] || others) return "hits " + JSON.stringify(r.hit) + " with enemy " + r.held + " held (expected only the held one)";
  if (r.links !== 0) return "tier 0 made " + r.links + " splits (expected none)";
});

check("SOL tracking beam: it lets go of a dead target once its next shot has fired (owner, 2026-11-13: the lock is kept under the aim), and of one that leaves range at once, then locks again", () => {
  const r = run(`(() => { const { t, es, st } = solRig({}, [[60, 0], [70, 30]]); solRun(t, 0.5); const a = t.solB && t.solB.e;
    a.dead = true; solRun(t, 1 / (st.rate * SOL_PULSE_K) + SOL_AIM + 0.2); const b = t.solB && t.solB.e; /* one pulse gap (the ghost shot) + a new lock's aim */
    b.x = t.x + st.range * 3; b.y = t.y; solRun(t, 0.5); const c = t.solB;
    return { first: a === es[0] || a === es[1], next: !!b && b !== a, gone: c === null || c === undefined }; })()`);
  if (!r.first) return "nothing held at first";
  if (!r.next) return "a pulse gap and an aim after its target died (its next shot fired) the beam did not lock the other enemy";
  if (!r.gone) return "a target moved out of range is still held (expected the beam to let go, with no one else in range)";
});

check("SOL keeps its lock when another tower kills its target under the aim: the next shot fires on schedule from that spot, its reflection hitting the next enemy, and only then a new lock (owner, 2026-11-13: \"SOL should not choose a new target if the target it was aiming at is killed during the aim\")", () => {
  const r = run(`(() => { const { t, es } = solRig({ refraction: 1 }, [[60, 0], [80, 25], [55, 60]]); solRun(t, 0.05); const a = t.solB && t.solB.e;
    if (!a) return { none: true }; a.dead = true; /* another tower's kill, before SOL's first shot */
    let firstHitHeld = null, k = 0; while (k++ < 120) { stepSolTrack(t, towerStats(t), 1 / 60); if (es.some(e => e !== a && e.hp < e.max)) { firstHitHeld = !!t.solB && t.solB.e === a; break; } }
    solRun(t, 0.1); return { hit: firstHitHeld !== null, held: firstHitHeld, after: !!t.solB && t.solB.e !== a }; })()`);
  if (r.none) return "no lock after 0.05 s";
  if (!r.hit) return "no shot landed within 2 s of the target's death";
  if (!r.held) return "SOL dropped its lock when another tower killed the target (expected it to fire on schedule from that spot, its reflection hitting the next enemy)";
  if (!r.after) return "SOL kept the dead target after its shot (expected a new lock)";
});

check("SOL Reflection: each split goes to its OWN enemy, the nearest ones - ANYWHERE (owner, 2026-11-05: \"grant unlimited range to SOL's reflected beams\"; within SOL's range of the held one before)", () => {
  const r = run(`(() => { const { t, es, st } = solRig({ refraction: 4 }, [[40, 0], [40, 50], [40, -60], [40, 0]]); es[3].x = es[0].x + st.range * 1.5; es[3].y = es[0].y;
    t.solB = solTrackStart(t, solTrackSt(t, st), es[0]); /* held by hand: which enemy the targeting picks is not this check's */ solRun(t, 0.3); const B = t.solB, ls = B ? B.links : [];
    return { held: B ? es.indexOf(B.e) : -1, split: st.split, to: ls.map(l => es.indexOf(l.e)), far: ls.some(l => l.e === es[3]),
      inRange: ls.every(l => Math.hypot(l.e.x - B.e.x, l.e.y - B.e.y) <= st.range + 1e-6) }; })()`);
  if (r.held !== 0) return "the beam let go of the enemy held by hand (" + r.held + ")";
  if (r.to.length !== Math.min(r.split, 3)) return "splits to " + JSON.stringify(r.to) + " (Reflection IV: " + r.split + " splits, 3 other enemies - one far off, reached anyway)";
  if (new Set(r.to).size !== r.to.length) return "two splits share an enemy: " + JSON.stringify(r.to);
  if (!r.far) return "no split reached the far enemy (unlimited range, 2026-11-05)";
});

check("SOL Reflection: a split pierces every enemy on its line out to the play box's edge, losing Breach's carry at each (SOL_TRACK_HOP)", () => {
  const r = run(`(() => { const { t, es, st } = solRig({ refraction: 1, breach: 2 }, [[40, 0], [40, 40], [40, 80], [40, 130], [80, 40]]);
    t.solB = solTrackStart(t, solTrackSt(t, st), es[0]); solRun(t, 0.05); const B = t.solB; if (!B || B.e !== es[0] || !B.links.length) return { bad: "held " + (B && es.indexOf(B.e)) + ", links " + (B && B.links.length) };
    const l = B.links[0], ux = (l.e.x - B.e.x), uy = (l.e.y - B.e.y), d = Math.hypot(ux, uy);
    return { own: es.indexOf(l.e), on: l.hits.map(h => es.indexOf(h.e)), ks: l.hits.map(h => +h.k.toFixed(4)), hop: solTrackSt(t, st).hop,
      L: l.L, want: solOutLen(B.e.x, B.e.y, ux / d, uy / d), off: l.hits.some(h => h.e === es[4]) }; })()`);
  if (r.bad) return r.bad;
  if (r.own !== 1) return "the split went to enemy " + r.own + " (expected the nearest, 1)";
  if (JSON.stringify(r.on) !== "[1,2,3]") return "the split crossed " + JSON.stringify(r.on) + " (expected its own enemy then the two beyond it on its line: [1,2,3])";
  if (r.off) return "the split hit an enemy off its line";
  const want = [r.hop, r.hop * r.hop, r.hop ** 3].map(k => +k.toFixed(4));
  if (JSON.stringify(r.ks) !== JSON.stringify(want)) return "carry " + JSON.stringify(r.ks) + " (expected x" + r.hop + " compounding: " + JSON.stringify(want) + ")";
  if (Math.abs(r.L - r.want) > 1e-6) return "the line runs " + r.L + " u (expected to the play box's edge, " + r.want + ")";
});

check("SOL Reflection: a split ends when its own enemy dies, the held beam goes on", () => {
  const r = run(`(() => { const { t, es, st } = solRig({ refraction: 1 }, [[40, 0], [40, 40]]); t.solB = solTrackStart(t, solTrackSt(t, st), es[0]); solRun(t, 0.3); const n0 = t.solB ? t.solB.links.length : -1;
    es[1].dead = true; solRun(t, 0.3); return { n0, n1: t.solB ? t.solB.links.length : -1, held: t.solB && t.solB.e === es[0] }; })()`);
  if (r.n0 !== 1) return "no split before (" + r.n0 + ")";
  if (r.n1 !== 0 || !r.held) return "after its enemy died: " + r.n1 + " splits, held beam " + (r.held ? "on" : "gone") + " (expected 0 splits, beam on)";
});

check("SOL Breach: every pulse strips its tier's share of the armor left (SOL_BREACH_ARMOR), none at tier 0", () => {
  const r = run(`(() => { const out = []; for (const b of [0, 1, 3]) { const { t, es } = solRig({ breach: b }, [[50, 0]]); const e = es[0]; e.armor = e.armor0 = 1000;
    t.solB = null; solRun(t, SOL_AIM + 0.05); /* the first pulse: after the new lock's aim (2026-11-05) */ out.push({ b, left: e.armor / 1000, want: 1 - SOL_BREACH_ARMOR[b] }); } return out; })()`);
  for (const w of r) if (Math.abs(w.left - w.want) > 0.02) return "Breach " + w.b + ": one pulse left " + (w.left * 100).toFixed(1) + "% of the armor (expected " + (w.want * 100).toFixed(1) + "%)";
});

check("SOL Scorch: each shot lays round(SOL_SCORCH_M / SOL_PULSE_K) burn stacks on what it holds - the card's \"scorches what it hits N times\" (two since 2026-11-13, owner \"1A\"; four before) - so the stacks a second are the shots a second x that, Scorch V twice the ticks at half", () => {
  const r = run(`(() => { const out = []; for (const f of [1, 3, 5]) { const { t, es } = solRig({ focus: f }, [[50, 0]]); const e = es[0]; t.solB = null;
    solRun(t, 1); const n0 = (e.dots || []).length; solRun(t, 24); const st = solTrackSt(t, towerStats(t)), d = e.dots && e.dots[e.dots.length - 1];
    out.push({ f, rate: ((e.dots || []).length - n0) / 24, want: towerStats(t).rate * SOL_PULSE_K * Math.max(1, Math.round(SOL_SCORCH_M / SOL_PULSE_K)), v: d ? !!d.v : null, n: d ? d.left : 0, base: SOL_SCORCH_N[f] }); } return out; })()`);
  for (const w of r) if (Math.abs(w.rate - w.want) > 0.15 * w.want) return "Scorch " + w.f + ": " + w.rate.toFixed(2) + " stacks a second (expected " + w.want.toFixed(2) + ": the shots a second x the stacks a shot)";
  const v = r.find(w => w.f === 5);
  if (!v.v || v.n < v.base * 2 - 1) return "Scorch V's stack: v " + v.v + ", " + v.n + " ticks left (expected v and about " + 2 * v.base + ")";
});

check("SOL Scorch V: a shot's FIRST hit leaves ONE SOL flare that burns what it touches, at most SOL_FLARE_MAX live (owner, 2026-11-06: \"don't require death, just first enemy hit, leave SOL colored IFR flare\")", () => {
  const r = run(`(() => { const { t, es } = solRig({ focus: 5 }, [[60, 0], [95, 0], [400, 400]]); es[2].x = t.x + 1e4; es[2].y = t.y; /* (far: nothing held but the first two) */
    solRun(t, 0.4); const early = (t.solFlares || []).length, held = t.solB && es.indexOf(t.solB.e), other = held === 0 ? 1 : 0; let peak = 0;
    let f = null; for (let i = 0; i < 600; i++) { solRun(t, 1 / 60); peak = Math.max(peak, (t.solFlares || []).length); if (!f && t.solFlares && t.solFlares[0]) f = { sol: t.solFlares[0].sol, hit: t.solFlares[0].hit }; }
    const s0 = solRig({ focus: 4 }, [[60, 0]]); solRun(s0.t, 3);
    return { early, peak, max: SOL_FLARE_MAX, sol: f ? f.sol : null, hit: f ? f.hit : 0, held, otherHurt: es[other].hp < es[other].max, ivi: (s0.t.solFlares || []).length, shots: 600 / 60 / (1 / (towerStats(t).rate * SOL_PULSE_K)) }; })()`);
  if (r.held == null || r.held < 0) return "nothing held";
  if (r.peak < 1) return "no flare ever left (Scorch V)";
  if (r.peak > r.max) return r.peak + " flares live (cap " + r.max + ")";
  if (!r.sol || !(r.hit > 0)) return "the flare is not a SOL flare with a hit";
  if (r.ivi) return "Scorch IV left a flare (only the capstone does)";
  if (!r.otherHurt) return "the flare burned nothing on its spokes";
});

check("SOL Reflection V: its splits split no further - more splits than Reflection IV, no sub-splits (owner, 2026-11-13: \"either 2 subsplits with tighter restrictions or none at all\" - none, \"1A\"; was 2 each, 2026-11-06)", () => {
  const r = run(`(() => { const spots = []; for (let i = 0; i < 14; i++) spots.push([40 + (i % 5) * 25, -80 + i * 14]); const { t, es, st } = solRig({ refraction: 5, breach: 2 }, spots);
    t.solB = solTrackStart(t, solTrackSt(t, st), es[0]); solRun(t, 0.05); const B = t.solB; if (!B) return { bad: "no lock" }; const tr = solTrackSt(t, st);
    const v = solRig({ refraction: 4, breach: 2 }, spots); v.t.solB = solTrackStart(v.t, solTrackSt(v.t, v.st), v.es[0]); solRun(v.t, 0.05);
    return { split: tr.split, splitIV: solTrackSt(v.t, v.st).split, links: B.links.length, subs: B.links.filter(l => l.par).length, sub: SOL_SUB_SPLIT }; })()`);
  if (r.bad) return r.bad;
  if (r.sub !== 0 || r.subs) return r.subs + " sub-splits (SOL_SUB_SPLIT " + r.sub + "; expected none)";
  if (r.links !== r.split) return r.links + " beams for " + r.split + " splits (expected one a split)";
  if (!(r.split > r.splitIV)) return "Reflection V splits to " + r.split + ", IV to " + r.splitIV + " (the capstone should split to more)";
});

check("SOL's main beam is never thinner than a child beam - Reflection + Breach, every tier mix (owner, 2026-11-08: \"SOLs primary beam should never be thinner than any of the child beams\")", () => {
  const r = run(`(() => { const bad = []; for (const rf of [1, 3, 5]) for (const bk of [0, 3, 5]) for (const fo of [0, 4]) {
      const { t, es, st } = solRig({ refraction: rf, breach: bk, focus: fo }, [[40, 0], [70, 40], [70, -40], [100, 0], [110, 60], [110, -60], [140, 0]]);
      t.solB = solTrackStart(t, solTrackSt(t, st), es[0]); solRun(t, 2); t.solB.fl = 0; const segs = solTrackBeams() || [];
      const core = f => beamWidth(f.d || 0) * (f.thin || 1), main = segs.filter(f => f.a === t).map(core), kids = segs.filter(f => f.a !== t).map(core);
      if (main.length && kids.length && Math.max(...kids) > Math.min(...main) + 1e-9) bad.push("R" + rf + " B" + bk + " F" + fo + ": main " + Math.min(...main).toFixed(3) + " < child " + Math.max(...kids).toFixed(3)); }
    return bad; })()`);
  if (r.length) return r.slice(0, 4).join("; ");
});
