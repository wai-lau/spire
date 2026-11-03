// /spire - THE DEMO SCENES' LAYOUTS (owner, 2026-11-03: "Yes at specific layout per tower, ensure that the demo shows off the upgrade (include
// damage numbers)"; "show moving enemies that get slowed to represent slow, use fast enemies and non-fast to demonstrate extra effect on fast";
// "Add a mechanism to ensure demo scenes are always up to date").
// THE REGISTRY: a layout for every tower's tier 0 (`base`) and for every axis (tiers I..V of it) - the smoke FAILS on a tower or axis with
// none, or a layout naming one that is gone (demo.mjs, the coverage gate). A layout is WHERE its enemies stand or walk, in shares of the
// tower's LIVE range (towerStats - never a number of its own), and `shows`: what the scene must visibly do, each checked by the smoke from
// the scene's tallies (demoShows) - so a mechanic change that stops a scene showing its effect cannot commit (ARCHITECTURE §11).
//   hits     the tower damages an enemy            many    2+ enemies take damage (chains, splits, splash, a wing)
//   strips   an armored enemy loses armor           pops    a shielded enemy loses a shield charge
//   slows    a walker loses 10%+ of its pace         fast    the fast walker loses a bigger share of its pace than the non-fast one (FAST_SLOW_MUL)
// Places: `clump` - a loose knot at `at` x range out; `fan` - spread across the range; `line` - a file away from the tower; `walk` -
// walkers along the lane stretch inside the range, staggered, looping
const DEMO_LAYOUTS = {
  arc: {
    base: { place: "clump", at: 0.55, types: ["swarm", "swarm", "armor", "swarm", "swarm", "swarm"], shows: ["hits", "many"] },
    conductivity: { place: "clump", at: 0.55, types: ["swarm", "swarm", "armor", "swarm", "swarm", "swarm"], shows: ["hits", "many"] },
    voltage: { place: "fan", types: ["swarm", "swarm", "swarm", "armor", "swarm", "swarm", "swarm", "swarm"], shows: ["hits", "many"] },
    capacitance: { place: "clump", at: 0.55, types: ["armor", "swarm", "armor", "swarm", "armor"], shows: ["hits", "many", "strips"] },
  },
  frz: {
    base: { place: "walk", types: ["fast", "swarm"], shows: ["hits", "slows", "fast"] },
    temp: { place: "walk", types: ["fast", "swarm", "armor"], shows: ["hits", "slows", "fast"] },
    rime: { place: "walk", types: ["fast", "swarm", "armor"], shows: ["hits", "slows", "fast"] },
    moons: { place: "walk", types: ["fast", "swarm", "swarm"], shows: ["hits", "slows", "fast"] },
  },
  sol: {
    base: { place: "line", types: ["swarm", "swarm", "swarm", "swarm"], shows: ["hits"] },
    focus: { place: "walk", types: ["fast", "armor"], shows: ["hits", "slows"] }, // (no "fast": a fast walker crosses the beam in fewer scorch ticks - 0.12 of its pace lost vs 0.47, 2026-11-03)
    refraction: { place: "line", types: ["swarm", "swarm", "swarm", "swarm", "swarm", "swarm"], shows: ["hits", "many"] },
    breach: { place: "line", types: ["armor", "swarm", "armor", "swarm"], shows: ["hits", "strips"] },
  },
  acd: {
    base: { place: "fan", types: ["swarm", "armor", "swarm"], shows: ["hits"] },
    corrosion: { place: "fan", types: ["armor", "armor", "swarm"], shows: ["hits", "strips"] },
    spray: { place: "fan", types: ["swarm", "swarm", "armor", "swarm", "swarm"], shows: ["hits", "many"] },
    contagion: { place: "clump", at: 0.5, types: ["swarm", "armor", "swarm", "swarm"], shows: ["hits", "many"] },
  },
  grv: {
    base: { place: "clump", at: 0.5, types: ["swarm", "shield", "swarm", "swarm", "shield", "swarm"], shows: ["hits"] }, // (tier 0's void holds one at a time)
    void: { place: "clump", at: 0.5, types: ["swarm", "shield", "swarm", "swarm", "shield", "swarm"], shows: ["hits", "many"] },
    supernova: { place: "clump", at: 0.5, types: ["armor", "swarm", "armor", "swarm", "shield"], shows: ["hits", "many", "strips"] },
    radiation: { place: "walk", types: ["fast", "swarm"], shows: ["hits", "slows", "fast"] },
  },
  crr: {
    base: { place: "fan", types: ["swarm", "shield", "armor", "swarm"], shows: ["hits", "pops"] },
    hangar: { place: "fan", types: ["swarm", "shield", "swarm", "armor", "swarm"], shows: ["hits", "many", "pops"] },
    launch: { place: "walk", types: ["fast", "swarm"], shows: ["hits", "slows", "fast"] },
    armament: { place: "fan", types: ["shield", "swarm", "shield", "armor"], shows: ["hits", "pops"] },
  },
  ifr: {
    base: { place: "clump", at: 0.6, types: ["swarm", "shield", "swarm", "shield", "swarm"], shows: ["hits", "pops"] },
    meteor: { place: "clump", at: 0.6, types: ["swarm", "shield", "swarm", "shield", "swarm"], shows: ["hits", "many", "pops"] },
    hellfire: { place: "clump", at: 0.6, types: ["swarm", "shield", "swarm", "swarm", "shield", "swarm"], shows: ["hits", "many", "pops"] },
    firaga: { place: "clump", at: 0.6, types: ["swarm", "shield", "swarm", "shield"], shows: ["hits", "pops"] },
  },
};
// the layout a card shows for tower `t` previewed as `pv`: the axis being bought (pv over t), else the tower's highest axis, else its tier 0
const DEMO_NUM_GAP = 1.6;
function demoLayoutKey(t, pv) {
  const axes = SKILL_TREES[t.kind] || [], up = pv ? axes.find(ax => skillOf(pv, ax.id) > skillOf(t, ax.id)) : null;
  const top = axes.reduce((b, ax) => (skillOf(pv || t, ax.id) > (b ? skillOf(pv || t, b.id) : 0) ? ax : b), null);
  return (up || top || { id: "base" }).id;
}
// the enemy list for a scene of `kind` (its stats `st`) on slot `cell`, from layout `L` - every spot in shares of the live range
function demoPlace0(kind, st, cell, L) {
  const c = CELLS[cell], r = st.range || 120, a0 = Math.atan2(CY - c.y, CX - c.x) + 0.5, T = L.types, n = T.length; // (toward the core, a little off)
  const at = (a, d) => ({ x: c.x + Math.cos(a) * d * r, y: c.y + Math.sin(a) * d * r });
  // (a clump starts DEMO_NUM_GAP x the biggest damage number apart - DMG_PX_MIN + DMG_PX_SPAN, aspira-floats.js; demoPlace keeps every pair so)
  if (L.place === "clump") { const m = at(a0, L.at || 0.55), g = DEMO_NUM_GAP * (DMG_PX_MIN + DMG_PX_SPAN); return T.map((type, i) => { const a = i * 2.4, d = g * Math.sqrt(i + 0.5) * 0.75; return { type, x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d }; }); }
  if (L.place === "fan") return T.map((type, i) => ({ type, ...at(a0 - 0.9 + 1.8 * (i + 0.5) / n, 0.45 + 0.35 * ((i * 0.618) % 1)) }));
  if (L.place === "line") return T.map((type, i) => ({ type, ...at(a0, 0.3 + 0.6 * (i + 0.5) / n) }));
  // walk: the longest lane stretch inside 0.85 of the range, from a third of the range before it; the walkers staggered along it
  let best = null;
  PATHS.forEach((P, pi) => { let s0 = null; for (let s = 0; s <= P.len; s += 6) { const p = pathAt(pi, Math.min(s, P.len), 0), inR = Math.hypot(p.x - c.x, p.y - c.y) <= 0.85 * r;
    if (inR && s0 == null) s0 = s; if ((!inR || s + 6 > P.len) && s0 != null) { if (!best || s - s0 > best.s1 - best.s0) best = { pi, s0, s1: s }; s0 = null; } } });
  if (!best) return T.map((type, i) => ({ type, ...at(a0, 0.5) }));
  const s0 = Math.max(0, best.s0 - r / 3);
  return T.map((type, i) => ({ type, pi: best.pi, s0, s1: best.s1, at: i / n }));
}
// ...then, for held dummies, any two closer than the gap pushed apart (a few relaxation passes): every dummy's numbers read on their own
function demoPlace(kind, st, cell, L) {
  const P = demoPlace0(kind, st, cell, L); if (L.place === "walk") return P;
  const g = DEMO_NUM_GAP * (DMG_PX_MIN + DMG_PX_SPAN);
  for (let pass = 0; pass < 12; pass++) for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3;
    if (d >= g) continue; const k = (g - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k;
  }
  return P;
}
// what a scene showed, from its tallies: the `shows` names it passed
function demoShows(S) {
  const E = S.G.enemies.filter(e => e.tally), hit = E.filter(e => e.tally.dmg > 0), out = [];
  if (hit.length) out.push("hits"); if (hit.length >= 2) out.push("many");
  if (E.some(e => e.demo.armor > 0 && e.tally.armor < e.demo.armor)) out.push("strips");
  if (E.some(e => e.demo.shield > 0 && e.tally.shield < e.demo.shield)) out.push("pops");
  const slow = E.filter(e => e.demo.walk && e.tally.slow > 0.1); if (slow.length) out.push("slows");
  // FAST: every slow hits a fast enemy FAST_SLOW_MUL x as hard (applySlow, aspira-game.js), shaped toward fastSlowCap(): the fast walker
  // loses MORE of its pace than the non-fast one, at least min(1.5, 0.75 x FAST_SLOW_MUL) x as much - or as much as one tower's slow can
  // take off a fast enemy at all, slowShape(TOWER_SLOW_MAX, fastSlowCap()) (a strong slow nears both caps: FRZ 0.73 vs 0.70)
  const share = f => Math.max(0, ...E.filter(e => e.demo.walk && f(e) && !(e.demo.shield > 0)).map(e => e.tally.slow));
  const fs = share(e => e.type === "fast"), bs = share(e => e.type !== "fast"), need = Math.min(1.5, 0.75 * FAST_SLOW_MUL);
  if (FAST_SLOW_MUL > 1 && bs > 0.05 && fs > bs && (fs >= need * bs || fs >= slowShape(TOWER_SLOW_MAX, fastSlowCap()) - 0.02)) out.push("fast");
  S.fastShare = [fs, bs]; // (what the smoke prints on a miss)
  return out;
}
