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

check("SOL tracking beam: it lets go when its target dies or leaves range, then locks again", () => {
  const r = run(`(() => { const { t, es, st } = solRig({}, [[60, 0], [70, 30]]); solRun(t, 0.5); const a = t.solB && t.solB.e;
    a.dead = true; solRun(t, 0.5); const b = t.solB && t.solB.e;
    b.x = t.x + st.range * 3; b.y = t.y; solRun(t, 0.5); const c = t.solB;
    return { first: a === es[0] || a === es[1], next: !!b && b !== a, gone: c === null || c === undefined }; })()`);
  if (!r.first) return "nothing held at first";
  if (!r.next) return "after its target died the beam did not lock the other enemy";
  if (!r.gone) return "a target moved out of range is still held (expected the beam to let go, with no one else in range)";
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

check("SOL Scorch: the beam lays TWO burn stacks a second on what it holds (a stack per 1 / (SOL_SCORCH_M x rate) s of beam time, whole ticks), Scorch V twice the ticks at half", () => {
  const r = run(`(() => { const out = []; for (const f of [1, 3, 5]) { const { t, es } = solRig({ focus: f }, [[50, 0]]); const e = es[0]; t.solB = null;
    solRun(t, 1); const n0 = (e.dots || []).length; solRun(t, 4); const st = solTrackSt(t, towerStats(t)), d = e.dots && e.dots[e.dots.length - 1];
    out.push({ f, rate: ((e.dots || []).length - n0) / 4, v: d ? !!d.v : null, n: d ? d.left : 0, base: SOL_SCORCH_N[f] }); } return out; })()`);
  for (const w of r) if (Math.abs(w.rate - 2) > 0.26) return "Scorch " + w.f + ": " + w.rate + " stacks a second (expected 2, the card's \"twice a second\")";
  const v = r.find(w => w.f === 5);
  if (!v.v || v.n < v.base * 2 - 1) return "Scorch V's stack: v " + v.v + ", " + v.n + " ticks left (expected v and about " + 2 * v.base + ")";
});
