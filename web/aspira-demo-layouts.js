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
    radiation: { place: "walk", types: ["fast", "armor"], shows: ["hits", "slows", "fast"] }, // (armor, not swarm: GRV slows small enemies harder)
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
// The scene's camera centres the tower (demoView3d). Walkers (owner, 2026-11-03: "have the enemies travel right to left to make use of the
// space"): two straight lanes of the scene's own, right to left, above and below the tower (below)
function demoPlace0(kind, st, cell, L) {
  // held dummies stay laid TOWARD THE CORE (a little off): "Near" targeting reads nearness to the core, so SOL's splits run outward
  // along the file and CRR's wing spreads over the fan as in a game (laid screen-wise they did not - 2026-11-03)
  const c = CELLS[cell], r = st.range || 120, a0 = Math.atan2(CY - c.y, CX - c.x) + 0.5, T = L.types, n = T.length;
  const at = (a, d) => ({ x: c.x + Math.cos(a) * d * r, y: c.y + Math.sin(a) * d * r });
  if (L.place === "clump") { const m = at(a0, L.at || 0.55), g = DEMO_NUM_GAP * (DMG_PX_MIN + DMG_PX_SPAN); return T.map((type, i) => { const a = i * 2.4, d = g * Math.sqrt(i + 0.5) * 0.75; return { type, x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d }; }); }
  if (L.place === "fan") return T.map((type, i) => ({ type, ...at(a0 - 0.9 + 1.8 * (i + 0.5) / n, 0.45 + 0.35 * ((i * 0.618) % 1)) }));
  if (L.place === "line") return T.map((type, i) => ({ type, ...at(a0, 0.3 + 0.6 * (i + 0.5) / n) }));
  // TWO LANES OF ITS OWN (owner, 2026-11-03: "for the enemies coming from the side, have two lanes, one above and one below, this way, the enemies
  // don't run into the tower in the demo"): straight, right to left across the whole box, DEMO_LANE_DY x the range above and below the tower
  // (inside its reach for most of the run); the FAST walkers on the upper, the rest on the lower - the same distance, a fair comparison
  const hw = r * Math.cos(warpTilt()) * DEMO_FIT * DEMO_BOX_AR + 30, dy = DEMO_LANE_DY * r, pace = PATHS.slice(0, N_PATHS).reduce((a, P) => a + P.pace, 0) / N_PATHS;
  const lane = y => { const pts = []; for (let x = c.x + hw, s = 0; x >= c.x - hw - 1e-6; x -= 8, s += 8) pts.push({ x, y, s }); return { pts, len: pts[pts.length - 1].s, pace, rim: pts[pts.length - 1], demo: true }; };
  const lanes = [lane(c.y - dy), lane(c.y + dy)], fast = T.filter(t => t === "fast").length, rest = n - fast;
  let iF = 0, iR = 0; const list = T.map(type => type === "fast" ? { type, lane: 0, at: iF++ / Math.max(1, fast) } : { type, lane: 1, at: iR++ / Math.max(1, rest) });
  list.lanes = lanes; return list;
}
const DEMO_LANE_DY = 0.45;
// ...then, for held dummies, any two closer than the gap pushed apart (a few relaxation passes): every dummy's numbers read on their own
function demoPlace(kind, st, cell, L) {
  const P = demoPlace0(kind, st, cell, L); if (L.place === "walk") return P; // (P.cell: a walker scene's own slot - demoScene takes it)
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
